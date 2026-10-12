import { db } from "../../db";
import { flagGroupMembers, flagOverrides } from "../../db/schema";
import { isSwitchName } from "./registry";
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

let memo: { at: number; snapshot: Promise<SwitchSnapshot | null> } | null = null;

async function readSnapshot(): Promise<SwitchSnapshot | null> {
  try {
    const [rows, members] = await Promise.all([
      db.select({
        switchName: flagOverrides.switchName,
        scope: flagOverrides.scope,
        groupId: flagOverrides.groupId,
        userId: flagOverrides.userId,
        value: flagOverrides.value,
      }).from(flagOverrides),
      db.select({ userId: flagGroupMembers.userId, groupId: flagGroupMembers.groupId }).from(flagGroupMembers),
    ]);
    const overrides = rows.filter((r) => isSwitchName(r.switchName)) as OverrideRow[];
    return { overrides, groupOf: new Map(members.map((m) => [m.userId, m.groupId])) };
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
  const entry = { at: now, snapshot };
  memo = entry;
  // A failed read is not held: the next request asks again.
  void snapshot.then((s) => {
    if (s === null && memo === entry) memo = null;
  });
  return snapshot;
}

/** Called by an admin write, after its transaction commits, so its own instance reads it at once. */
export function clearSwitchSnapshot(): void {
  memo = null;
}

/** One reader's resolved switches, env-shaped. Resolve ONCE per page, action or route, and pass it down. */
export async function resolveSwitchEnv(userId: string | null, base: NodeJS.ProcessEnv = process.env): Promise<NodeJS.ProcessEnv> {
  return resolveEnv(base, await switchSnapshot(), userId);
}
