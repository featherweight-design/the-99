/**
 * Whether the public card and commander pages answer (launch epic F3, PR 2). A `plumbing` switch: the visitor has no
 * account, so the page decides it from the app-wide answer alone (`resolveSwitchEnv(null)`), and every visitor gets the
 * same page. Off, the routes answer 404, never a redirect to sign-in.
 *
 * `'true'` on staging; unset on production until Hugh says otherwise (plan ruling 3).
 */
export function publicPagesEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PUBLIC_PAGES_ENABLED === "true";
}
