"use client";

import { unsubscribeDevice } from "../../app/settings/push-actions";

/**
 * Sign-out takes this browser's push subscription with it (handoff G7): the device row leaves the server and the
 * browser drops the subscription, so the next account to sign in here starts from "not on yet". It runs BEFORE the
 * session ends (the action needs it), is bounded, and never throws: signing out must not wait on, or fail for, push.
 */
const LIMIT_MS = 3000;

/** One sign-out's cleanup. `expired` flips at the deadline; a lookup that resolves after it starts nothing, so a late answer can never remove a LATER account's subscription from this browser. */
async function forget(state: { expired: boolean }): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator) || typeof window === "undefined" || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (state.expired) return;
  const subscription = await registration?.pushManager.getSubscription();
  if (state.expired || !subscription) return;
  // Both start at once and neither waits on the other: a stalled or failed server removal must not keep the browser
  // subscribed (the push service then answers 404 or 410 and the sender deletes the row), and the reverse.
  await Promise.allSettled([unsubscribeDevice(subscription.endpoint), subscription.unsubscribe()]);
}

export async function forgetThisDevice(): Promise<void> {
  const state = { expired: false };
  const deadline = new Promise<void>((done) => setTimeout(() => { state.expired = true; done(); }, LIMIT_MS));
  await Promise.race([forget(state).catch(() => undefined), deadline]);
}
