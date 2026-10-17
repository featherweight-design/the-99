/**
 * The send floor (plan `2026-10-16-invites.md`, R5): the email path answers "Invitation sent" in the same TIME
 * whatever happened, so a reply's speed cannot tell a sender whether an address has an account (Clerk refuses it
 * fast) or was mailed. SERVER-ONLY.
 *
 * Measured 2026-10-16 against staging's Clerk instance, read-only (40 user lookups and 40 invitation lists, from a
 * developer machine): p50 65ms, p90 76ms, p99 621ms. A create was NOT measured, because measuring it would write to
 * staging; it also queues Clerk's email, so it is expected to be slower than a read. 1500ms is that read p99 times
 * about 2.4, a margin chosen rather than measured: a create slower than it answers late, and only that once.
 */
export const SEND_FLOOR_MS = 1500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `work`, then answers no sooner than `floorMs` after it started, whether it returned or threw. */
export async function atFloor<T>(work: () => Promise<T>, floorMs: number = SEND_FLOOR_MS): Promise<T> {
  const started = Date.now();
  try {
    return await work();
  } finally {
    const rest = floorMs - (Date.now() - started);
    if (rest > 0) await wait(rest);
  }
}
