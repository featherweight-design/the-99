import { REAPER_CUTOFF_MS, V2_REAPER_CUTOFF_MS } from "./limits";

/**
 * A pending run older than this was abandoned — the process that owned it is gone. The
 * read-time reaper fails it as `interrupted` (and refunds its unit) so the deck can run again;
 * the abandoned process, if it somehow returns, finds zero rows under its own
 * `where status = 'pending'` guard and discards its result. A Suggested changes v2 run (`requested_count` set) has its
 * own, longer window (`V2_REAPER_CUTOFF_MS`, past the deck page's 600s limit); every other run keeps five minutes.
 */
export function reapCutoff(now: Date, v2 = false): Date {
  return new Date(now.getTime() - (v2 ? V2_REAPER_CUTOFF_MS : REAPER_CUTOFF_MS));
}
