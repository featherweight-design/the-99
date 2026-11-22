"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { requestFlags } from "../../lib/flags/request";
import { storePreferenceEnabled } from "../../lib/stores/flag";
import { parseStore, setPreferredStore } from "../../lib/stores/preference";

export type SavePreferredStoreResult = { ok: true; changed: boolean } | { ok: false; reason: "off" | "invalid" };

/**
 * Settings' Store choice, the first-run row and Change store (store preference, design #3200): saves the store the
 * reader's prices come from. Refused while `STORE_PREFERENCE_ENABLED` is off for them at the request (every read
 * checks the switch again, so a switch turned off meanwhile still prices them at Mana Pool), and for anything but a
 * store the app quotes.
 *
 * It writes `user_prefs.preferred_store` alone. The wishlist's price-drop baselines follow on the next price run
 * (PR 3b), which re-baselines each line whose `price_store` is not the reader's store, so a switch never fires a drop
 * (READINESS, plan conflicts (b)). Revalidates `/settings` only on a change, as the feed choice does.
 */
export async function savePreferredStore(store: unknown): Promise<SavePreferredStoreResult> {
  const userId = await requireUserId();
  const env = await requestFlags(userId);
  if (!storePreferenceEnabled(env)) return { ok: false, reason: "off" };
  const chosen = parseStore(store);
  if (!chosen) return { ok: false, reason: "invalid" };
  const changed = await setPreferredStore(userId, chosen);
  if (changed) revalidatePath("/settings");
  return { ok: true, changed };
}
