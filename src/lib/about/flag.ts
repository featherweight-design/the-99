/**
 * Whether this deployment shows the one-time About sheet instead of redirecting to `/about`
 * (About R6; brief `2026-09-25-about-rethink.md`, ruling 1).
 *
 * Same contract as `analysisTabEnabled`: server-side, read per request, and it needs a
 * redeploy to change because Vercel binds variables to a deployment. DEFAULTS OFF — absent,
 * empty or anything but `'true'` keeps today's redirect exactly, so production moves only
 * when the variable is set deliberately (the Releases ruling: on in staging, off in
 * production until Hugh has walked it).
 */
export function aboutSheetEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.ABOUT_SHEET_ENABLED === "true";
}
