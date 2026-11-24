import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "../admin/access";
import { adminEnvironment } from "../admin/environment";

/**
 * Who may use the on-page copy editor: an admin, on staging. Three independent checks, all server-side, and any one
 * failing is a 404 (the editor does not exist for anyone else, and a refusal would say it does):
 *  1. the signed-in user is on the admin allowlist (`isAdmin`),
 *  2. the environment label reads `staging` (`ADMIN_ENV_LABEL`),
 *  3. the deployment is not Vercel's production one (`VERCEL_ENV`), so a mislabelled production project is still shut.
 * Every route and action of the editor calls this; the page-side door only hides a button.
 */
export function copyEditorOpen(userId: string | null | undefined, vercelEnv: string | undefined = process.env.VERCEL_ENV): boolean {
  return isAdmin(userId) && adminEnvironment() === "staging" && vercelEnv !== "production";
}

/** The signed-in admin's id, or null (answer 404). */
export async function copyEditorUser(): Promise<string | null> {
  const { userId } = await auth();
  return userId && copyEditorOpen(userId) ? userId : null;
}
