"use client";
// G1's silent re-subscribe (push handoff): on every visit, not only Settings, a device whose permission is still granted
// and which holds a live subscription re-saves it, refreshing its time zone (the held hours follow it when the reader
// travels), its last seen, and restoring a row the sender deleted on a 404 or 410. Never a prompt, once per page load
// (the shell stays mounted across in-app navigation). Mounted by the shell only while the reader's push switch is on.

import { useEffect } from "react";
import { subscribeDevice } from "../../app/settings/push-actions";
import { devicePayload, deviceTimeZone } from "../../lib/push/device";

export function PushHeartbeat() {
  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    if (!("serviceWorker" in navigator)) return;
    let live = true;
    void (async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager?.getSubscription();
      if (!live || !subscription) return;
      await subscribeDevice(devicePayload(subscription.toJSON(), navigator.userAgent, deviceTimeZone()));
    })().catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return null;
}
