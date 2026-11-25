import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "../admin/access";
import { adminEnvironment } from "../admin/environment";
import { STAGING_HOST } from "./staging-host";

/**
 * Who may use the on-page copy editor: an admin, on staging. Three independent checks, all server-side, and any one
 * failing is a 404 (the editor does not exist for anyone else, and a refusal would say it does):
 *  1. the signed-in user is on the admin allowlist (`isAdmin`),
 *  2. the environment label reads `staging` (`ADMIN_ENV_LABEL`),
 *  3. the deployment belongs to the staging Vercel project: `VERCEL_PROJECT_PRODUCTION_URL` (a system variable Vercel sets
 *     per project) is exactly `staging.the-99.dev`. An allowlist, not "not production": staging's own deployment reports
 *     `VERCEL_ENV=production`, and the production project (`the-99.dev`) or an unset value can never match, even
 *     mislabelled. A local dev server sets it by hand to the same value (the probe header says how).
 * Every route and action of the editor calls this; the page-side door only hides a button.
 */
export function copyEditorOpen(userId: string | null | undefined, project: string | undefined = process.env.VERCEL_PROJECT_PRODUCTION_URL): boolean {
  return isAdmin(userId) && adminEnvironment() === "staging" && project === STAGING_HOST;
}

/** The signed-in admin's id, or null (answer 404). */
export async function copyEditorUser(): Promise<string | null> {
  const { userId } = await auth();
  return userId && copyEditorOpen(userId) ? userId : null;
}
