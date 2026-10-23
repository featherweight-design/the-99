"use client";
/**
 * The browser's half of the device row: the facts `deviceState` (`./device.ts`) decides over, with the registration and
 * the subscription the press handlers act on. The one module of the push column that touches `window`.
 */
import { iosVersion, type DeviceFacts, type Permission } from "./device";

/** How long to wait for a worker the shell registers after `load` (production only) before calling this device Can't. */
const READY_MS = 3000;

/** The browser's half: the facts, the registration and the subscription. The one function here that touches `window`. */
export async function readDeviceFacts(): Promise<{ facts: DeviceFacts; registration: ServiceWorkerRegistration | null; subscription: PushSubscription | null }> {
  const ua = navigator.userAgent;
  const nav: Navigator & { standalone?: boolean } = navigator;
  const pushApi = "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
  let registration: ServiceWorkerRegistration | null = null;
  let subscription: PushSubscription | null = null;
  if (pushApi) {
    try {
      registration = (await navigator.serviceWorker.getRegistration()) ?? null;
      // None yet, or one whose first worker is still installing: `subscribe` would fail until it is active, so wait for
      // `ready` (bounded; the section reads again when it does become ready).
      if (!registration?.active) {
        registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((done) => setTimeout(() => done(null), READY_MS)),
        ]);
      }
      subscription = (await registration?.pushManager.getSubscription()) ?? null;
    } catch {
      registration = null;
    }
  }
  const facts: DeviceFacts = {
    ios: iosVersion(ua, navigator.maxTouchPoints ?? 0),
    standalone: window.matchMedia?.("(display-mode: standalone)").matches === true || nav.standalone === true,
    phone: window.matchMedia?.("(pointer: coarse)").matches === true && Math.min(window.screen.width, window.screen.height) < 600,
    pushApi,
    registration: registration !== null,
    permission: pushApi ? (Notification.permission as Permission) : "default",
    subscribed: subscription !== null,
  };
  return { facts, registration, subscription };
}
