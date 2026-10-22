// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ unsubscribeDevice: vi.fn() }));
vi.mock("../../app/settings/push-actions", () => ({ unsubscribeDevice: m.unsubscribeDevice }));

import { forgetThisDevice } from "./forget-device";

const browserUnsubscribe = vi.fn();
const subscription = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", unsubscribe: browserUnsubscribe };

function setup(sub: typeof subscription | null) {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => sub } }) } });
  Object.defineProperty(window, "PushManager", { configurable: true, value: class {} });
}

beforeEach(() => {
  vi.clearAllMocks();
  m.unsubscribeDevice.mockResolvedValue({ ok: true });
  browserUnsubscribe.mockResolvedValue(true);
});

afterEach(() => {
  vi.useRealTimers();
  Reflect.deleteProperty(window, "PushManager");
});

describe("forgetThisDevice", () => {
  it("removes the row and unsubscribes the browser", async () => {
    setup(subscription);
    await forgetThisDevice();
    expect(m.unsubscribeDevice).toHaveBeenCalledWith(subscription.endpoint);
    expect(browserUnsubscribe).toHaveBeenCalledOnce();
  });

  it("does nothing when this browser has no subscription", async () => {
    setup(null);
    await forgetThisDevice();
    expect(m.unsubscribeDevice).not.toHaveBeenCalled();
  });

  it("still unsubscribes the browser when the server removal rejects, and never throws", async () => {
    setup(subscription);
    m.unsubscribeDevice.mockRejectedValue(new Error("network"));
    await expect(forgetThisDevice()).resolves.toBeUndefined();
    expect(browserUnsubscribe).toHaveBeenCalledOnce();
  });

  it("unsubscribes the browser even when the server removal stalls, and gives up at its limit", async () => {
    vi.useFakeTimers();
    setup(subscription);
    m.unsubscribeDevice.mockReturnValue(new Promise(() => {}));
    let done = false;
    void forgetThisDevice().then(() => { done = true; });
    await vi.advanceTimersByTimeAsync(10);
    expect(browserUnsubscribe).toHaveBeenCalledOnce(); // started at once, not behind the stalled request
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(3000);
    expect(done).toBe(true);
  });

  it("does nothing in a browser without push", async () => {
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { getRegistration: vi.fn() } });
    await forgetThisDevice();
    expect(m.unsubscribeDevice).not.toHaveBeenCalled();
  });
});
