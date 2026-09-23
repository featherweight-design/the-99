import { REAPER_CUTOFF_MS } from "./limits";

/**
 * A pending run older than this was abandoned — the process that owned it is gone. The
 * read-time reaper fails it as `interrupted` (and refunds its unit) so the deck can run again;
 * the abandoned process, if it somehow returns, finds zero rows under its own
 * `where status = 'pending'` guard and discards its result.
 */
export function reapCutoff(now: Date): Date {
  return new Date(now.getTime() - REAPER_CUTOFF_MS);
}
