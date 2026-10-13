/**
 * Whether request counting is on (payments scope PR S). A `plumbing` switch: no reader sees a
 * difference, so only the app-wide override applies. On means OBSERVE: each guarded route counts
 * its caller's hits and logs what a limit would have refused, and nothing is refused. Enforcing is
 * a separate, later change. Off, nothing is counted or written.
 *
 * `'true'` on staging and unset on production until the logs have been read there.
 */
export function rateLimitEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.RATE_LIMIT_ENABLED === "true";
}
