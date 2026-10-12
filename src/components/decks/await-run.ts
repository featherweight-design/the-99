/**
 * Waits for a run the server is finishing after its response (`after()`), by reading until the run
 * this press started is no longer pending. The run action returns as soon as the run is reserved,
 * so the answer is read, never awaited: leaving the page leaves the run going, and this loop is
 * only the visit that stayed.
 *
 * Returns the last read. It gives up quietly at `maxMs` (past the model's 110s deadline and
 * short of the reaper's 5 minutes), with the run still pending in that read: the panel's watch for a pending run
 * then carries on, exactly as it does for a run begun in another tab. A read that fails or shows
 * the run gone ends the wait, since there is nothing left to wait for.
 */
export const AWAIT_RUN_POLL_MS = 2000;
export const AWAIT_RUN_MAX_MS = 130_000;

export async function awaitRunSettled<S extends { run?: { id: string; status: string } | null }>(
  read: () => Promise<S | null>,
  runId: string,
  opts: { aborted?: () => boolean; pollMs?: number; maxMs?: number; now?: () => number } = {},
): Promise<S | null> {
  const { aborted = () => false, pollMs = AWAIT_RUN_POLL_MS, maxMs = AWAIT_RUN_MAX_MS, now = Date.now } = opts;
  const startedAt = now();
  let last: S | null = null;
  for (;;) {
    last = await read().catch(() => null);
    if (aborted() || last === null) return last;
    const seen = last.run?.id === runId ? last.run : null;
    if (seen === null || seen.status !== "pending") return last;
    if (now() - startedAt >= maxMs) return last;
    await new Promise((r) => setTimeout(r, pollMs));
    // Left during the wait: no read for a visit that has gone.
    if (aborted()) return last;
  }
}
