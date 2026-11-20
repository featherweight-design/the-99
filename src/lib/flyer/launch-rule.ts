/**
 * The launch email's batch ceiling, in a module with no database import so the admin card and the server share it.
 * 25 a batch: under the free plan's 100 a day with room for the day's invites and codes, and short enough that a batch whose
 * every send times out (25 × (8s timeout + 0.6s gap), about 215s) still ends inside the action's 300s.
 */
export const LAUNCH_BATCH_MAX = 25;
