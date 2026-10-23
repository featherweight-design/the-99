// Settings' push column (push handoff R1 calls 1 to 4 and 8, `STATES-push.md`; plan `2026-10-22-push.md` PR 4): the
// column only while push is available and the device can push, each device state's line and box, the browser's
// prompt asked only inside a push tick's press (never on mount), a kind's tick saved before the prompt, the outcomes,
// and the silent re-subscribe on a visit.
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  refresh: vi.fn(),
  saveFeed: vi.fn(),
  savePush: vi.fn(),
  subscribeDevice: vi.fn(),
  unsubscribeDevice: vi.fn(),
  readDeviceFacts: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: m.refresh, push: vi.fn() }), usePathname: () => "/settings" }));
vi.mock("../../app/settings/feed-actions", () => ({ saveFeedKinds: m.saveFeed }));
vi.mock("../../app/settings/push-actions", () => ({ savePushKinds: m.savePush, subscribeDevice: m.subscribeDevice, unsubscribeDevice: m.unsubscribeDevice }));
vi.mock("../../lib/push/device-browser", () => ({ readDeviceFacts: m.readDeviceFacts }));

import { NewsSection, type PushSettings } from "./news-section";
import { feedCopy } from "../../lib/copy/feed";
import { pushSettingsCopy } from "../../lib/copy/push-settings";
import type { DeviceFacts } from "../../lib/push/device";
import type { NewsSetting } from "../../lib/feed/prefs";

const C = feedCopy.news;
const P = pushSettingsCopy;
const KINDS: NewsSetting[] = [
  { kind: "new-set", on: false },
  { kind: "price-drop", on: true },
  { kind: "spare-request", on: true },
];
const OFFERED = ["new-set", "price-drop", "spare-request"];
// A real P-256 public key's shape is not needed here: the subscribe call is mocked.
const PUSH: PushSettings = { publicKey: "BAAA", on: ["spare-request"] };
const SUB_JSON = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "P", auth: "A" } };

const desktop: DeviceFacts = { ios: null, standalone: false, phone: false, pushApi: true, registration: true, permission: "default", subscribed: false };

let requestPermission: ReturnType<typeof vi.fn>;
let subscribe: ReturnType<typeof vi.fn>;
let existing: { endpoint: string; toJSON: () => unknown; unsubscribe: ReturnType<typeof vi.fn> } | null;

function fakeSubscription() {
  return { endpoint: SUB_JSON.endpoint, toJSON: () => SUB_JSON, unsubscribe: vi.fn().mockResolvedValue(true) };
}

/** The device as the browser reports it; `existing` is this browser's subscription when `subscribed`. */
function deviceIs(facts: Partial<DeviceFacts>) {
  const f = { ...desktop, ...facts };
  existing = f.subscribed ? fakeSubscription() : null;
  m.readDeviceFacts.mockResolvedValue({
    facts: f,
    registration: f.registration ? { pushManager: { subscribe } } : null,
    subscription: existing,
  });
}

async function draw(push: PushSettings | null = PUSH) {
  const r = render(<NewsSection kinds={KINDS} push={push} />);
  await act(async () => {});
  return r;
}

const deviceRow = () => document.querySelector("[data-push-device]") as HTMLElement;
const deviceBox = () => within(deviceRow()).queryByRole("checkbox") as HTMLInputElement | null;
const pushBox = (kind: keyof typeof C.kinds) => screen.getByRole("checkbox", { name: P.kindAria(kind) }) as HTMLInputElement;
const homeBox = (kind: keyof typeof C.kinds) => screen.getByRole("checkbox", { name: new RegExp(`^${C.kinds[kind].name}`) }) as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
  requestPermission = vi.fn();
  subscribe = vi.fn().mockResolvedValue(fakeSubscription());
  vi.stubGlobal("Notification", { permission: "default", requestPermission });
  m.savePush.mockResolvedValue({ ok: true, changed: true });
  m.subscribeDevice.mockResolvedValue({ ok: true });
  m.unsubscribeDevice.mockResolvedValue({ ok: true });
  deviceIs({});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("push unavailable", () => {
  it("draws the section exactly as shipped: no Push head, no device row, no push boxes, today's foot, the device never read", async () => {
    await draw(null);
    expect(screen.queryByText(P.head)).toBeNull();
    expect(deviceRow()).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(KINDS.length);
    expect(screen.getByText(C.foot)).toBeTruthy();
    expect(m.readDeviceFacts).not.toHaveBeenCalled();
  });
});

describe("the column", () => {
  it("heads a 44px column with Push, gives each kind its own push box beside the Home box, and the foot gains its push clause", async () => {
    await draw();
    expect(screen.getByRole("heading", { name: C.head }).textContent).toBe(C.head + P.head);
    expect(pushBox("spare-request").checked).toBe(true);
    expect(pushBox("new-set").checked).toBe(false);
    expect(homeBox("price-drop").checked).toBe(true);
    expect(screen.getAllByRole("checkbox")).toHaveLength(KINDS.length * 2 + 1);
    expect(screen.queryByText(C.foot)).toBeNull();
    const foot = document.querySelector("section > p")!;
    expect(foot.textContent).toBe(P.foot.home + P.foot.push + P.foot.rest);
    expect(foot.querySelector("b")!.textContent).toBe(P.foot.push);
  });

  it("saves the push ticks as the whole checked set, apart from Home's", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    await draw();
    await act(async () => fireEvent.click(pushBox("price-drop")));
    expect(m.savePush).toHaveBeenCalledWith(["price-drop", "spare-request"], OFFERED);
    expect(m.saveFeed).not.toHaveBeenCalled();
    expect(pushBox("price-drop").checked).toBe(true);
  });

  it("puts a failed push save back and says so in the shared toast", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    m.savePush.mockResolvedValue({ ok: false, reason: "invalid" });
    await draw();
    await act(async () => fireEvent.click(pushBox("new-set")));
    expect(pushBox("new-set").checked).toBe(false);
    expect(screen.getByRole("alert").textContent).toContain(C.failed);
  });

  it("holds every box in both columns while either column's save is in flight", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    let finish!: (v: unknown) => void;
    m.savePush.mockReturnValue(new Promise((r) => (finish = r)));
    await draw();
    await act(async () => fireEvent.click(pushBox("new-set")));
    expect(homeBox("new-set").disabled).toBe(true);
    expect(pushBox("price-drop").disabled).toBe(true);
    await act(async () => finish({ ok: true, changed: true }));
    expect(homeBox("new-set").disabled).toBe(false);
  });
});

describe("the device row's states", () => {
  const cases: [string, Partial<DeviceFacts>, string, "unticked" | "ticked" | "disabled" | "none"][] = [
    ["Not on yet", {}, P.device.notOn("browser"), "unticked"],
    ["On", { permission: "granted", subscribed: true }, P.device.on, "ticked"],
    ["Off here", { permission: "granted" }, P.device.offHere, "unticked"],
    ["Blocked", { permission: "denied" }, `${P.device.blocked.browser.lead} ${P.device.blocked.browser.rest}`, "disabled"],
    ["Blocked, installed iPhone", { permission: "denied", ios: [17, 0], standalone: true }, P.device.blocked.iPhone.lead, "disabled"],
    ["Not on yet, installed iPhone", { ios: [17, 0], standalone: true }, P.device.notOn("iPhone"), "unticked"],
    ["Needs Home Screen", { ios: [17, 0], pushApi: false, registration: false }, `${P.device.homeScreen} ${P.device.how}`, "unticked"],
    ["Can't", { pushApi: false }, P.device.cant, "none"],
    ["Can't, old iOS", { ios: [16, 3] }, P.device.oldIos, "none"],
  ];
  for (const [name, facts, line, box] of cases) {
    it(`${name}: its line and its box`, async () => {
      deviceIs(facts);
      await draw();
      expect(deviceRow().textContent).toContain(line);
      const b = deviceBox();
      if (box === "none") {
        expect(b).toBeNull();
      } else {
        expect(b!.checked).toBe(box === "ticked");
        expect(b!.disabled).toBe(box === "disabled");
      }
    });
  }

  it("names the device: this phone, this browser, this iPhone", async () => {
    deviceIs({ phone: true });
    const r = await draw();
    expect(within(deviceRow()).getByText(P.device.title("phone"))).toBeTruthy();
    r.unmount();
    deviceIs({});
    const r2 = await draw();
    expect(within(deviceRow()).getByText(P.device.title("browser"))).toBeTruthy();
    r2.unmount();
    deviceIs({ ios: [17, 0], standalone: true });
    await draw();
    expect(within(deviceRow()).getByText(P.device.title("iPhone"))).toBeTruthy();
  });

  it("Can't: no column at all, the Home column and the foot as shipped", async () => {
    deviceIs({ pushApi: false });
    await draw();
    expect(screen.queryByText(P.head)).toBeNull();
    expect(screen.queryByRole("checkbox", { name: P.kindAria("new-set") })).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(KINDS.length);
    expect(screen.getByText(C.foot)).toBeTruthy();
  });
});

describe("the ask", () => {
  it("never asks on mount, nor from a Home box", async () => {
    m.saveFeed.mockResolvedValue({ ok: true, changed: true });
    await draw();
    expect(deviceRow().textContent).toContain(P.device.notOn("browser"));
    await act(async () => fireEvent.click(homeBox("new-set")));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    expect(m.subscribeDevice).not.toHaveBeenCalled();
  });

  it("asks inside the device box's press; Allow subscribes with the public key and the row reads On", async () => {
    requestPermission.mockResolvedValue("granted");
    await draw();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) }));
    expect(m.subscribeDevice).toHaveBeenCalledWith(expect.objectContaining({ endpoint: SUB_JSON.endpoint, p256dh: "P", auth: "A", timeZone: expect.any(String) }));
    expect(deviceRow().textContent).toContain(P.device.on);
    expect(deviceBox()!.checked).toBe(true);
  });

  it("a kind's tick is saved before the browser asks, in the same press", async () => {
    requestPermission.mockResolvedValue("granted");
    await draw();
    await act(async () => fireEvent.click(pushBox("new-set")));
    expect(m.savePush).toHaveBeenCalledWith(["new-set", "spare-request"], OFFERED);
    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(m.savePush.mock.invocationCallOrder[0]).toBeLessThan(requestPermission.mock.invocationCallOrder[0]);
    expect(deviceRow().textContent).toContain(P.device.on);
  });

  it("an untick of a kind never asks", async () => {
    await draw();
    await act(async () => fireEvent.click(pushBox("spare-request")));
    expect(m.savePush).toHaveBeenCalledWith([], OFFERED);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("Block: the row reads Blocked, its box held, and the ticks are kept", async () => {
    requestPermission.mockResolvedValue("denied");
    await draw();
    await act(async () => fireEvent.click(pushBox("price-drop")));
    expect(deviceRow().textContent).toContain(P.device.blocked.browser.lead);
    expect(deviceBox()!.disabled).toBe(true);
    expect(pushBox("price-drop").checked).toBe(true);
    expect(pushBox("spare-request").checked).toBe(true);
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("Block from the device box: the kind ticks the account holds stay ticked, and nothing is saved", async () => {
    requestPermission.mockResolvedValue("denied");
    await draw();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(deviceRow().textContent).toContain(P.device.blocked.browser.lead);
    expect(pushBox("spare-request").checked).toBe(true);
    expect(m.savePush).not.toHaveBeenCalled();
  });

  it("closed without a choice: still Not on yet, and the next tick asks again", async () => {
    requestPermission.mockResolvedValue("default");
    await draw();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(deviceRow().textContent).toContain(P.device.notOn("browser"));
    await act(async () => fireEvent.click(deviceBox()!));
    expect(requestPermission).toHaveBeenCalledTimes(2);
  });

  it("a subscribe that fails after Allow: the shared toast, and the row stays Not on yet", async () => {
    requestPermission.mockResolvedValue("granted");
    subscribe.mockRejectedValue(new Error("push service down"));
    await draw();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
    expect(deviceRow().textContent).toContain(P.device.notOn("browser"));
    expect(m.subscribeDevice).not.toHaveBeenCalled();
  });

  it("a server that refuses the device: the browser's subscription is dropped too, with the toast", async () => {
    requestPermission.mockResolvedValue("granted");
    const sub = fakeSubscription();
    subscribe.mockResolvedValue(sub);
    m.subscribeDevice.mockResolvedValue({ ok: false, reason: "invalid" });
    await draw();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(sub.unsubscribe).toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain(P.failed);
    expect(deviceRow().textContent).toContain(P.device.notOn("browser"));
  });
});

describe("on and off on this device", () => {
  it("unticking the row unsubscribes this browser and the server's row, and reads Off here", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    await draw();
    m.subscribeDevice.mockClear();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(existing!.unsubscribe).toHaveBeenCalled();
    expect(m.unsubscribeDevice).toHaveBeenCalledWith(SUB_JSON.endpoint);
    expect(deviceRow().textContent).toContain(P.device.offHere);
    expect(pushBox("spare-request").checked).toBe(true);
  });

  it("re-ticking Off here subscribes with no prompt", async () => {
    deviceIs({ permission: "granted" });
    await draw();
    await act(async () => fireEvent.click(deviceBox()!));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).toHaveBeenCalled();
    expect(deviceRow().textContent).toContain(P.device.on);
  });

  it("a kind ticked while On saves and does nothing else", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    await draw();
    m.subscribeDevice.mockClear();
    await act(async () => fireEvent.click(pushBox("new-set")));
    expect(m.savePush).toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
    expect(m.subscribeDevice).not.toHaveBeenCalled();
  });
});

describe("the heartbeat", () => {
  it("a visit with permission granted and a live subscription re-saves it once, with no prompt", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    await draw();
    expect(m.subscribeDevice).toHaveBeenCalledTimes(1);
    expect(m.subscribeDevice).toHaveBeenCalledWith(expect.objectContaining({ endpoint: SUB_JSON.endpoint, timeZone: expect.any(String) }));
    expect(requestPermission).not.toHaveBeenCalled();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("no subscription, no heartbeat", async () => {
    deviceIs({ permission: "granted" });
    await draw();
    expect(m.subscribeDevice).not.toHaveBeenCalled();
  });
});

describe("iPhone in Safari", () => {
  const safari = { ios: [17, 4] as const, pushApi: false, registration: false };

  it("How ›, the device box and a push tick each open the guidance sheet; the tick is saved and nothing asks", async () => {
    deviceIs(safari);
    await draw();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: P.device.how })));
    expect(screen.getByRole("dialog", { name: P.sheet.title })).toBeTruthy();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: P.sheet.close })));
    expect(screen.queryByRole("dialog")).toBeNull();

    await act(async () => fireEvent.click(deviceBox()!));
    expect(screen.getByRole("dialog", { name: P.sheet.title })).toBeTruthy();
    expect(deviceBox()!.checked).toBe(false);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: P.sheet.close })));

    await act(async () => fireEvent.click(pushBox("new-set")));
    expect(m.savePush).toHaveBeenCalledWith(["new-set", "spare-request"], OFFERED);
    const sheet = screen.getByRole("dialog", { name: P.sheet.title });
    expect(sheet.textContent).toContain(P.sheet.line);
    expect(sheet.textContent).toContain(P.sheet.steps[1].strong);
    expect(requestPermission).not.toHaveBeenCalled();
  });
});
