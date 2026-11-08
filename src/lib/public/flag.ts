/**
 * Whether the public card and commander pages answer (launch epic F3, PR 2). A `plumbing` switch: the visitor has no
 * account, so the page decides it from the app-wide answer alone (`resolveFlags(null)`), and every visitor gets the
 * same page. Off, the routes answer 404, never a redirect to sign-in.
 *
 * `'true'` on staging; unset on production until Hugh says otherwise (plan ruling 3).
 */
export function publicPagesEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PUBLIC_PAGES_ENABLED === "true";
}

/**
 * Whether the signed-out home page draws the landing instead of the short sign-in page. A `plumbing` switch like
 * `publicPagesEnabled`: a stranger has no account, so the page decides it from the app-wide answer alone
 * (`resolveFlags(null)`) and every visitor gets the same page. Unset reads as off.
 */
export function publicLandingEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.PUBLIC_LANDING_ENABLED === "true";
}
