"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "../../lib/auth";
import { availableFeedKinds } from "../../lib/feed/flag";
import { parseChosenKinds } from "../../lib/feed/prefs";
import { pushAvailable } from "../../lib/push/available";
import { isPushEndpoint, parseDevice } from "../../lib/push/endpoint";
import { setPushKinds } from "../../lib/push/prefs";
import { removeDevice, saveDevice } from "../../lib/push/subscriptions";
import { requestSwitchEnv } from "../../lib/switches/request";

export type SavePushKindsResult = { ok: true; changed: boolean } | { ok: false; reason: "off" | "invalid" };

/**
 * Settings' push column: which kinds the reader gets pushed. The same contract as `saveFeedKinds`: `on` and `offered`
 * are known kinds available to this reader, every checked kind was offered, or nothing is written; a kind the form did
 * not offer keeps what it had. Refused while push is unavailable (the switch or the keys), because a tick saved then
 * would promise a push that cannot come. Writes and revalidates `/settings` only on a change.
 */
export async function savePushKinds(on: unknown, offered: unknown): Promise<SavePushKindsResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!pushAvailable(env)) return { ok: false, reason: "off" };
  const scope = parseChosenKinds(offered, availableFeedKinds(env));
  const kinds = scope && parseChosenKinds(on, scope);
  if (!scope || !kinds) return { ok: false, reason: "invalid" };
  const changed = await setPushKinds(userId, kinds, new Date(), scope);
  if (changed) revalidatePath("/settings");
  return { ok: true, changed };
}

export type DeviceResult = { ok: true } | { ok: false; reason: "off" | "invalid" };

/** This browser's subscription, from the device row's tick or a kind's. Untrusted: checked by `parseDevice` before anything is stored. */
export async function subscribeDevice(raw: unknown): Promise<DeviceResult> {
  const userId = await requireUserId();
  const env = await requestSwitchEnv(userId);
  if (!pushAvailable(env)) return { ok: false, reason: "off" };
  const device = parseDevice(raw);
  if (!device) return { ok: false, reason: "invalid" };
  await saveDevice(userId, device);
  return { ok: true };
}

/**
 * This browser's subscription leaves: the device row unticked, or a sign-out. Never refused by a switch: a reader whose
 * push was switched off must still be able to take a device out. Only the reader's own row is ever deleted.
 */
export async function unsubscribeDevice(endpoint: unknown): Promise<DeviceResult> {
  const userId = await requireUserId();
  if (!isPushEndpoint(endpoint)) return { ok: false, reason: "invalid" };
  await removeDevice(userId, endpoint);
  return { ok: true };
}
