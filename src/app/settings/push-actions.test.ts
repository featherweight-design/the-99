// The push actions' gates: what they refuse before anything is written (plan 2026-10-22-push.md, PR 2).
import { createECDH } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ available: true, kinds: [] as string[], set: vi.fn(), save: vi.fn(), remove: vi.fn(), revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: m.revalidatePath }));
vi.mock("../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: async () => ({}) }));
vi.mock("../../lib/push/available", () => ({ pushAvailable: () => m.available }));
vi.mock("../../lib/feed/flag", () => ({ availableFeedKinds: () => m.kinds }));
vi.mock("../../lib/push/prefs", () => ({ setPushKinds: m.set }));
vi.mock("../../lib/push/subscriptions", () => ({ saveDevice: m.save, removeDevice: m.remove }));

import { savePushKinds, subscribeDevice, unsubscribeDevice } from "./push-actions";

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const point = ecdh.getPublicKey().toString("base64url");
const device = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", p256dh: point, auth: Buffer.alloc(16, 9).toString("base64url"), userAgent: "Chrome", timeZone: "UTC" };

beforeEach(() => {
  vi.clearAllMocks();
  m.available = true;
  m.kinds = ["new-set", "combo", "spare-request"];
  m.set.mockResolvedValue(true);
});

describe("savePushKinds", () => {
  it("scopes the write to the offered kinds and revalidates Settings only on a change", async () => {
    expect(await savePushKinds(["combo"], ["new-set", "combo"])).toEqual({ ok: true, changed: true });
    expect(m.set).toHaveBeenCalledWith("u1", ["combo"], expect.any(Date), ["new-set", "combo"]);
    expect(m.revalidatePath).toHaveBeenCalledWith("/settings");
    m.revalidatePath.mockClear();
    m.set.mockResolvedValue(false);
    await savePushKinds(["combo"], ["combo"]);
    expect(m.revalidatePath).not.toHaveBeenCalled();
  });

  it("writes nothing while push is unavailable, or for a kind that was not offered", async () => {
    m.available = false;
    expect(await savePushKinds(["combo"], ["combo"])).toEqual({ ok: false, reason: "off" });
    m.available = true;
    expect(await savePushKinds(["price-drop"], ["new-set", "combo"])).toEqual({ ok: false, reason: "invalid" });
    expect(m.set).not.toHaveBeenCalled();
  });
});

describe("subscribeDevice", () => {
  it("stores a good device under the session's reader", async () => {
    expect(await subscribeDevice(device)).toEqual({ ok: true });
    expect(m.save).toHaveBeenCalledWith("u1", device);
  });

  it("stores nothing while push is unavailable or for an endpoint off the push services", async () => {
    m.available = false;
    expect(await subscribeDevice(device)).toEqual({ ok: false, reason: "off" });
    m.available = true;
    expect(await subscribeDevice({ ...device, endpoint: "https://evil.example.com/x" })).toEqual({ ok: false, reason: "invalid" });
    const offCurve = Buffer.concat([Buffer.from([4]), Buffer.alloc(64, 7)]).toString("base64url");
    expect(await subscribeDevice({ ...device, p256dh: offCurve })).toEqual({ ok: false, reason: "invalid" });
    expect(m.save).not.toHaveBeenCalled();
  });
});

describe("unsubscribeDevice", () => {
  it("removes the session reader's own row, even while push is unavailable", async () => {
    m.available = false;
    expect(await unsubscribeDevice(device.endpoint)).toEqual({ ok: true });
    expect(m.remove).toHaveBeenCalledWith("u1", device.endpoint);
  });

  it("refuses a value that is not a push endpoint", async () => {
    expect(await unsubscribeDevice("https://evil.example.com/x")).toEqual({ ok: false, reason: "invalid" });
    expect(await unsubscribeDevice(7)).toEqual({ ok: false, reason: "invalid" });
    expect(m.remove).not.toHaveBeenCalled();
  });
});
