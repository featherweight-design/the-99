import { neon } from "@neondatabase/serverless";
import { revalidateTag, unstable_cache } from "next/cache";
import { after } from "next/server";
import { isOverrideName } from "./registry";
import { resolveEnv, type OverrideRow, type SwitchSnapshot } from "./resolve";

/**
 * Every override and every group membership, held per server instance and served stale while it refreshes (admin plan,
 * "Per-user overrides on every request"; brief, locked rule 7; SWR, Hugh 2026-11-22). The tables are small and change
 * only when the admin writes, so in steady state a request costs no query:
 * - Within `SNAPSHOT_TTL_MS` of the last good read, the held snapshot is served.
 * - Past it, the held snapshot is STILL served at once, and one read refreshes it behind the response (`after()`). So a
 *   flip or a kill reaches an instance one request after its window ends, not on that request: the tradeoff Hugh took
 *   for taking the read off the request's path (cold instances paid it at p50 442ms on GET /).
 * - Past `SNAPSHOT_MAX_STALE_MS` (an instance quiet for five minutes) the held snapshot is too old to decide a kill
 *   with, so the request waits on the read as a first read does, and a failed read there falls back as below.
 * - Otherwise only an instance's first read, or the first after an admin write clears it, makes a request wait.
 * An admin write clears the memo on its own instance; every other instance catches up a refresh after the window, and
 * the Switches UI says so rather than promising instant.
 *
 * Each refresh reads the SHARED data cache, not Neon (`readSharedSnapshot`): the snapshot is the same for every reader,
 * so one entry serves every instance, and a cold instance's first read is a cache lookup (p50 ~46ms) rather than a
 * Neon round trip (p50 442ms on GET /). The entry is tagged `SNAPSHOT_TAG`, and every write to the overrides or the
 * memberships retires it through `clearSwitchSnapshot`, so a flip reaches the other instances a refresh after their
 * window, as before. A write that does not pass through the app (the seed, a purge's cascade, a hand-run statement)
 * is caught by the entry's own ceiling, `SNAPSHOT_CACHE_SECONDS`.
 *
 * A read that fails is never held. With nothing held it resolves every switch to its compiled fallback
 * (`switchFallbackOn`; the model-call switch's variable still stops it), and the next request asks again. With a snapshot
 * held, a failed refresh keeps serving it until it is `SNAPSHOT_MAX_STALE_MS` old (the last state the admin wrote beats
 * the fallbacks for a blip) and the next request past the window asks again; past that a failed read answers the
 * fallbacks, as with nothing held, so a long outage ends where it did before the stale memo. A switch the database names and this build does not know (a row written by a newer build) is
 * skipped rather than trusted.
 */
export const SNAPSHOT_TTL_MS = 30_000;
/** How old a held snapshot may be and still be served without waiting: ten windows. */
export const SNAPSHOT_MAX_STALE_MS = 5 * 60_000;
/** The data cache's tag for the snapshot: `clearSwitchSnapshot` retires it. */
export const SNAPSHOT_TAG = "flag-snapshot";
/** How long the shared entry stands without a write retiring it, for writes made outside the app. */
export const SNAPSHOT_CACHE_SECONDS = 60;

/** The last good read and when it was asked for. Never a failed one. */
let held: { at: number; snapshot: SwitchSnapshot } | null = null;
/** The read in flight, if any, so concurrent requests share one. */
let inflight: Promise<SwitchSnapshot | null> | null = null;
/** Bumped by an admin write's clear, so a read begun before the write cannot land after it. */
let generation = 0;

/**
 * Both tables in ONE statement, so one snapshot: an admin moving an account between groups and
 * changing an override commits both at once, and two separate reads could pair one's old rows with
 * the other's new ones, a combination that never existed, and hold it for the whole window. One
 * statement is one snapshot without a transaction, and over Neon's HTTP driver it is one HTTPS round
 * trip: the proxy pays it on every memo miss, and the transaction it replaced (begin, two selects and
 * commit over the websocket pool) measured 153ms at p50 and 174ms at p95 on staging (2026-10-13).
 * `snapshot.test.ts` pins this shape.
 */
export const SNAPSHOT_SQL = `select
  coalesce((select json_agg(json_build_object(
    'switchName', o."switch", 'scope', o.scope, 'groupId', o.group_id, 'userId', o.user_id, 'value', o.value
  )) from flag_overrides o), '[]'::json) as overrides,
  coalesce((select json_agg(json_build_object(
    'userId', m.user_id, 'groupId', m.group_id
  )) from flag_group_members m), '[]'::json) as members`;

let http: ReturnType<typeof neon> | null = null;

/**
 * Every override and membership, read now and never memoized: what the admin's pages read, so a page
 * drawn after the admin's own write shows that write (the 30-second window is the players', not the
 * admin's). Null when the read fails.
 */
export async function readSwitchSnapshot(): Promise<SwitchSnapshot | null> {
  return readSnapshot();
}

/** The statement's one row, as JSON: what the data cache stores (a `Map` would not survive it). */
type SnapshotRows = { overrides: OverrideRow[]; members: { userId: string; groupId: string }[] };

async function queryRows(): Promise<SnapshotRows> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  http ??= neon(url);
  const [row] = (await http.query(SNAPSHOT_SQL)) as SnapshotRows[];
  return row;
}

function toSnapshot(rows: SnapshotRows): SwitchSnapshot {
  const overrides = rows.overrides.filter((r) => isOverrideName(r.switchName));
  return { overrides, groupOf: new Map(rows.members.map((m) => [m.userId, m.groupId])) };
}

function readFailed(error: unknown): null {
  // not a fallback: a cached page keys on the switches this resolves to, so a page drawn from the compiled
  // fallbacks is stored under the fallbacks' bits and is true for them.
  console.error("switch overrides could not be read; serving each switch's fallback", error);
  return null;
}

async function readSnapshot(): Promise<SwitchSnapshot | null> {
  try {
    return toSnapshot(await queryRows());
  } catch (error) {
    // not a fallback: readFailed says why the compiled fallbacks are true for a page cached under them.
    return readFailed(error);
  }
}

/** Thrown inside the cached read so a failed query is never stored, and told apart from the cache itself failing. */
class SnapshotReadFailed extends Error {}

/** Built on first use, not at module scope: `unstable_cache` runs where it is called (see `catalog-generation.ts`). */
let shared: (() => Promise<SnapshotRows>) | null = null;
/** Set by a write on this instance: its next refresh reads Neon, not the entry the write is retiring. */
let wroteHere = false;
let warnedNoCache = false;

/**
 * The database's host, in the entry's key: two environments that share a data-cache namespace (previews, a branch
 * swap) never read each other's switches. The host only, never the credentials.
 */
function databaseKey(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host;
  } catch {
    // not a fallback: an unparsable URL fails the read itself; the key only needs to be stable.
    return "unknown";
  }
}

/**
 * The memo's refresh: the shared entry, filled from Neon on a miss. Where Next has no data cache to give (outside a
 * request, a script), the database is read directly, as before. Under `next dev` it always is: the probes write
 * `flag_overrides` with plain SQL, which no tag hears, and a second stale layer under the memo would make each of them
 * wait out the entry's ceiling as well (`scripts/lib/switch-memo.mjs`).
 */
async function readSharedSnapshot(): Promise<SwitchSnapshot | null> {
  if (process.env.NODE_ENV === "development") return readSnapshot();
  let rows: SnapshotRows;
  try {
    shared ??= unstable_cache(
      async () => {
        try {
          return await queryRows();
        } catch (error) {
          // not a fallback: rethrown, so the cache stores nothing and the caller answers below.
          throw new SnapshotReadFailed("switch overrides could not be read", { cause: error });
        }
      },
      [SNAPSHOT_TAG, databaseKey()],
      { tags: [SNAPSHOT_TAG], revalidate: SNAPSHOT_CACHE_SECONDS },
    );
    rows = await shared();
  } catch (error) {
    if (error instanceof SnapshotReadFailed) return readFailed(error.cause);
    // not a fallback: no data cache in this scope, so the database answers, exactly as it did before the cache.
    if (!warnedNoCache && process.env.NODE_ENV === "production") {
      warnedNoCache = true; // once per instance: a script has no cache by design, a deployment should
      console.warn("switch snapshot: no data cache here, reading the database", error);
    }
    return readSnapshot();
  }
  return toSnapshot(rows);
}

export function switchSnapshot(now = Date.now()): Promise<SwitchSnapshot | null> {
  if (held && now - held.at < SNAPSHOT_TTL_MS) return Promise.resolve(held.snapshot);
  if (held && now - held.at < SNAPSHOT_MAX_STALE_MS) {
    if (!inflight) keepAlive(refresh(now));
    return Promise.resolve(held.snapshot);
  }
  return refresh(now);
}

/** One read at a time per instance; a good one is held from the moment it was asked for. */
function refresh(now: number): Promise<SwitchSnapshot | null> {
  if (inflight) return inflight;
  const asked = generation;
  // The first read after a write on this instance goes to Neon: the shared entry is retired only once the response is
  // sent, and a redirect straight back here must not draw from it.
  const fresh = wroteHere;
  wroteHere = false;
  const read = (fresh ? readSnapshot() : readSharedSnapshot()).then((snapshot) => {
    if (asked === generation) {
      if (snapshot) held = { at: now, snapshot };
      inflight = null;
    }
    return snapshot;
  });
  inflight = read;
  return read;
}

/**
 * A refresh behind the response must outlive it: `after()` holds the invocation open until the read lands, or a
 * serverless instance could freeze mid-read. The read is already running; this only keeps it alive. Outside a request
 * (a script, a test) `after` throws and there is nothing to keep alive.
 */
function keepAlive(read: Promise<unknown>): void {
  try {
    after(() => read);
  } catch {
    // not a fallback: outside a request scope there is no response to outlive, and the read runs either way; nothing a
    // page draws changes.
  }
}

/**
 * How a read now would be answered, for the proxy's `[perf]` line: `hit` from a held snapshot inside its window (no
 * query), `stale` from one past it while a read refreshes it behind the response (no wait), `pending` by waiting on
 * another request's waited read still in flight, `miss` by a waited read of its own (a first read, or one
 * past `SNAPSHOT_MAX_STALE_MS`).
 */
export function switchSnapshotState(now = Date.now()): "hit" | "stale" | "pending" | "miss" {
  const age = held ? now - held.at : Infinity;
  if (age < SNAPSHOT_TTL_MS) return "hit";
  if (age < SNAPSHOT_MAX_STALE_MS) return "stale";
  return inflight ? "pending" : "miss";
}

/**
 * Called after any write to the overrides or the memberships commits: an admin write, or a flyer sign-up joining its
 * group. Its own instance reads at once, and the shared entry is retired so every other instance's next refresh reads
 * the write rather than the entry. A read already in flight is dropped from the memo (it may carry the pre-write rows),
 * though the requests already waiting on it still get its answer: they began before the write.
 */
export function clearSwitchSnapshot(): void {
  held = null;
  inflight = null;
  generation++;
  wroteHere = true;
  retireSharedSnapshot();
}

/**
 * `expire: 0`, so the next read after a write is a miss rather than the stale entry served while it refreshes. Always
 * once the response is sent, in `after()`: Next refuses `revalidateTag` while a page renders (the `/friends` flyer
 * spend runs in one), and in a Server Action it would ship the caller's page again. Its own instance does not wait on
 * it (`wroteHere`). Outside a request there is no data cache to retire; an error inside the task reaches Next's log.
 */
function retireSharedSnapshot(): void {
  try {
    after(() => revalidateTag(SNAPSHOT_TAG, { expire: 0 }));
  } catch {
    // not a fallback: outside a request there is no shared entry to retire, and the memo is already cleared.
  }
}

/** One reader's resolved switches, env-shaped. Resolve ONCE per page, action or route, and pass it down. */
export async function resolveFlags(userId: string | null, base: NodeJS.ProcessEnv = process.env): Promise<NodeJS.ProcessEnv> {
  return resolveEnv(base, await switchSnapshot(), userId);
}

/**
 * The same, for a WRITE that must not be decided from the fallbacks alone: a fresh read, and a failed one THROWS
 * instead of serving them. A caller that turns a switch's answer into "write nothing" (the welcome
 * grant) would otherwise treat a transient read failure as "off" and never be asked again.
 */
export async function resolveFlagsStrict(userId: string | null, base: NodeJS.ProcessEnv = process.env): Promise<NodeJS.ProcessEnv> {
  const snapshot = await readSnapshot();
  if (snapshot === null) throw new Error("switch overrides could not be read");
  return resolveEnv(base, snapshot, userId);
}
