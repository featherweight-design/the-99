"use server";

import { requireUserId } from "../lib/auth";
import { markInstalled } from "../lib/pwa/installed";

/**
 * Stamps `user_prefs.installed_at` from the installed app's first signed-in launch on a phone (install onboarding
 * call 7): `InstallSlot` calls it once per launch, and only while the shell reads the stamp as unset. A forged call
 * only hides the caller's own Install button, so the signed-in check is the whole guard. Revalidates nothing: the
 * write's stamp move already retires Home's and `/decks`' cached payloads, and the slot this launch draws nothing.
 */
export async function markInstalledAction(): Promise<void> {
  const userId = await requireUserId();
  await markInstalled(userId);
}
