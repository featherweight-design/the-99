import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ subscribeDevice: vi.fn(async () => ({ ok: true })) }));
vi.mock("../../app/settings/push-actions", () => ({ subscribeDevice: m.subscribeDevice }));

import { PushHeartbeat } from "./push-heartbeat";

const SUB = { endpoint: "https://fcm.googleapis.com/fcm/send/x", keys: { p256dh: "p", auth: "a" } };
let getSubscription: ReturnType<typeof vi.fn>;

function browser({ permission = "granted", subscribed = true, worker = true }: { permission?: string; subscribed?: boolean; worker?: boolean } = {}) {
  const requestPermission = vi.fn();
  vi.stubGlobal("Notification", { permission, requestPermission });
  getSubscription = vi.fn(async () => (subscribed ? { toJSON: () => SUB } : null));
  const sw = worker ? { getRegistration: vi.fn(async () => ({ pushManager: { getSubscription } })) } : undefined;
  Object.defineProperty(navigator, "serviceWorker", { value: sw, configurable: true });
  if (!worker) delete (navigator as { serviceWorker?: unknown }).serviceWorker;
  return { requestPermission };
}

const mount = async () => {
  render(<PushHeartbeat />);
  await act(async () => {});
};

describe("PushHeartbeat (G1, on every visit)", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.unstubAllGlobals());

  it("re-saves a live subscription once, with this device's zone, and never prompts", async () => {
    const { requestPermission } = browser();
    await mount();
    expect(m.subscribeDevice).toHaveBeenCalledTimes(1);
    expect(m.subscribeDevice).toHaveBeenCalledWith(expect.objectContaining({ endpoint: SUB.endpoint, timeZone: expect.any(String) }));
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("does nothing without a subscription, without permission, or without a service worker", async () => {
    browser({ subscribed: false });
    await mount();
    browser({ permission: "default" });
    await mount();
    browser({ worker: false });
    await mount();
    expect(m.subscribeDevice).not.toHaveBeenCalled();
  });

  it("swallows a failed save: a heartbeat never breaks the page", async () => {
    browser();
    m.subscribeDevice.mockRejectedValueOnce(new Error("network"));
    await expect(mount()).resolves.toBeUndefined();
  });
});
