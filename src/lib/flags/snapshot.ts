import { neon } from "@neondatabase/serverless";
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

async function readSnapshot(): Promise<SwitchSnapshot | null> {
  try {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    http ??= neon(url);
    const [row] = (await http.query(SNAPSHOT_SQL)) as { overrides: OverrideRow[]; members: { userId: string; groupId: string }[] }[];
    const overrides = row.overrides.filter((r) => isOverrideName(r.switchName));
    return { overrides, groupOf: new Map(row.members.map((m) => [m.userId, m.groupId])) };
  } catch (error) {
    // not a fallback: a cached page keys on the switches this resolves to, so a page drawn from the compiled
    // fallbacks is stored under the fallbacks' bits and is true for them.
    console.error("switch overrides could not be read; serving each switch's fallback", error);
    return null;
  }
}

export function switchSnapshot(now = Date.now()): Promise<SwitchSnapshot | null> {
  if (held && now - held.at < SNAPSHOT_TTL_MS) return Promise.resolve(held.snapshot);
  if (held && now - held.at < SNAPSHOT_MAX_STALE_MS) {
    keepAlive(refresh(now));
    return Promise.resolve(held.snapshot);
  }
  return refresh(now);
}

/** One read at a time per instance; a good one is held from the moment it was asked for. */
function refresh(now: number): Promise<SwitchSnapshot | null> {
  if (inflight) return inflight;
  const asked = generation;
  const read = readSnapshot().then((snapshot) => {
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
    // outside a request scope
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

/** Called by an admin write, after its transaction commits, so its own instance reads it at once. */
export function clearSwitchSnapshot(): void {
  held = null;
  inflight = null;
  generation++;
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
