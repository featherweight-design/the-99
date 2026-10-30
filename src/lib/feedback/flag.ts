/**
 * `FEEDBACK_ENABLED` (Hugh, 2026-10-30): in-app feedback: Report a problem (the About row and the error screens), the
 * check-in on Home and the /admin Feedback tab. Off, none of them is drawn and nothing is stored. Exactly `'true'`
 * turns it on.
 */
export function feedbackEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.FEEDBACK_ENABLED === "true";
}
