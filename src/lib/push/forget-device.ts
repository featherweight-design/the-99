"use client";

import { unsubscribeDevice } from "../../app/settings/push-actions";

/**
 * Sign-out takes this browser's push subscription with it (handoff G7): the device row leaves the server and the
 * browser drops the subscription, so the next account to sign in here starts from "not on yet". It runs BEFORE the
 * session ends (the action needs it), is bounded, and never throws: signing out must not wait on, or fail for, push.
 */
const LIMIT_MS = 3000;

async function forget(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || typeof window === "undefined" || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  await unsubscribeDevice(subscription.endpoint);
  await subscription.unsubscribe();
}

export async function forgetThisDevice(): Promise<void> {
  await Promise.race([forget().catch(() => undefined), new Promise<void>((done) => setTimeout(done, LIMIT_MS))]);
}
