/**
 * The launch email's batch ceiling, in a module with no database import so the admin card and the server share it.
 * 25 a batch: under the free plan's 100 a day with room for the day's invites and codes. Each address also waits on a Clerk
 * lookup (up to 5s), so 25 slow lookups and timed-out sends could pass the action's 300s: `LAUNCH_BATCH_BUDGET_MS` stops a
 * batch before that, and the rest wait for the next one.
 */
export const LAUNCH_BATCH_MAX = 25;

/** How long a batch may run before it stops claiming: the slowest address after it (a 5s lookup, an 8s send, a 0.6s gap) still ends inside the action's 300s. */
export const LAUNCH_BATCH_BUDGET_MS = 240_000;

/** How many account holders one batch may skip on top of the mails it sends, so a list of mostly members cannot run lookups without end. */
export const LAUNCH_SKIPS_MAX = 100;
