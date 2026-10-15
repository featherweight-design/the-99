import { neon } from "@neondatabase/serverless";
import { isOverrideName } from "./registry";
import { resolveEnv, type OverrideRow, type SwitchSnapshot } from "./resolve";

/**
 * Every override and every group membership, held for 30 seconds per server instance (admin plan,
 * "Per-user overrides on every request"; brief, locked rule 7). The tables are small and change
 * only when the admin writes, so in steady state a request costs no query. An admin write clears
 * the memo on its own instance; every other instance catches up within the window, and the
 * Switches UI says so rather than promising instant.
 *
 * A read that fails resolves to the environment alone, and is not held, so the next request asks
 * again. A switch the database names and this build does not know (a row written by a newer build)
 * is skipped rather than trusted.
 */
export const SNAPSHOT_TTL_MS = 30_000;

let memo: { at: number; snapshot: Promise<SwitchSnapshot | null>; settled: boolean } | null = null;

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
    // not a fallback: a cached page keys on the switches this resolves to, so a page drawn from the
    // environment alone is stored under the environment's bits and is true for them.
    console.error("switch overrides could not be read; serving the environment alone", error);
    return null;
  }
}

export function switchSnapshot(now = Date.now()): Promise<SwitchSnapshot | null> {
  if (memo && now - memo.at < SNAPSHOT_TTL_MS) return memo.snapshot;
  const snapshot = readSnapshot();
  const entry = { at: now, snapshot, settled: false };
  memo = entry;
  // A failed read is not held: the next request asks again.
  void snapshot.then((s) => {
    entry.settled = true;
    if (s === null && memo === entry) memo = null;
  });
  return snapshot;
}

/**
 * How a read now would be answered, for the proxy's `[perf]` line: `hit` from a settled memo (no
 * query), `pending` by waiting on another request's read still in flight, `miss` by a read of its own.
 */
export function switchSnapshotState(now = Date.now()): "hit" | "pending" | "miss" {
  if (memo === null || now - memo.at >= SNAPSHOT_TTL_MS) return "miss";
  return memo.settled ? "hit" : "pending";
}

/** Called by an admin write, after its transaction commits, so its own instance reads it at once. */
export function clearSwitchSnapshot(): void {
  memo = null;
}

/** One reader's resolved switches, env-shaped. Resolve ONCE per page, action or route, and pass it down. */
export async function resolveSwitchEnv(userId: string | null, base: NodeJS.ProcessEnv = process.env): Promise<NodeJS.ProcessEnv> {
  return resolveEnv(base, await switchSnapshot(), userId);
}
