// Settings' push column (push handoff R1 calls 1 to 4 and 8, `STATES-push.md`; plan `2026-10-22-push.md` PR 4; drawn
// in the announcements handoff's R1b-1 columns): the Push column and its head only while push is available and the
// device can push, the device band above the column heads, each device state's line and box, the browser's
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
const homeBox = (kind: keyof typeof C.kinds) => screen.getByRole("checkbox", { name: C.inAppAria(C.kinds[kind].name) }) as HTMLInputElement;
const heads = () => [...document.querySelector("[data-column-heads]")!.children].map((h) => h.textContent);
const foot = () => document.querySelector("section > p") as HTMLElement;
const noPushFoot = `${C.inApp}${C.foot.home}${C.foot.email}`;

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
  it("draws In app alone: no Push head, no device band, no push boxes, the foot without its push clause, the device never read", async () => {
    await draw(null);
    expect(heads()).toEqual([C.inApp]);
    expect(screen.queryByText(P.head)).toBeNull();
    expect(deviceRow()).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(KINDS.length);
    expect(foot().textContent).toBe(noPushFoot);
    expect(m.readDeviceFacts).not.toHaveBeenCalled();
  });
});

describe("the column", () => {
  it("heads two 52px columns, In app then Push, gives each kind its push box after its in-app box, and the foot gains its push clause", async () => {
    await draw();
    expect(screen.getByRole("heading", { name: C.head }).textContent).toBe(C.head);
    expect(heads()).toEqual([C.inApp, P.head]);
    expect(pushBox("spare-request").checked).toBe(true);
    expect(pushBox("new-set").checked).toBe(false);
    expect(homeBox("price-drop").checked).toBe(true);
    expect(screen.getAllByRole("checkbox")).toHaveLength(KINDS.length * 2 + 1);
    const row = pushBox("new-set").closest("li")!;
    const cells = [...row.querySelectorAll("label")];
    expect(cells.map((l) => l.querySelector("input")!.getAttribute("aria-label"))).toEqual([C.inAppAria(C.kinds["new-set"].name), P.kindAria("new-set")]);
    for (const cell of cells) expect(cell.className).toContain("w-[52px]");
    expect(foot().textContent).toBe(`${C.inApp}${C.foot.home} ${P.head}${P.foot}${C.foot.email}`);
    expect(foot().textContent).toBe("In app: a count on Home and the list. Push: only to devices you turn on, never 9pm to 9am. No email, ever.");
    expect([...foot().querySelectorAll("b")].map((b) => b.textContent)).toEqual([C.inApp, P.head]);
  });

  // R1b-1: the device row is about this device, not a kind, so it leaves the list for its own band above the heads.
  it("draws the device in its own band above the column heads, outside the list of kinds", async () => {
    await draw();
    const band = deviceRow();
    expect(band.closest("ul")).toBeNull();
    const headRow = document.querySelector("[data-column-heads]")!;
    expect(band.compareDocumentPosition(headRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(band.className).toContain("bg-[color:var(--surface-sunken)]");
    expect(document.querySelectorAll("ul > li")).toHaveLength(KINDS.length);
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

  // With no cell on the band's right, its line would run to the border: the band pads its right as its left.
  it("Can't: the band pads its right 12px, as its left, since no box holds that side", async () => {
    deviceIs({ pushApi: false });
    await draw();
    const classes = deviceRow().className.split(/\s+/);
    expect(classes).toEqual(expect.arrayContaining(["pl-[12px]", "pr-[12px]"]));
    expect(deviceRow().querySelector("label")).toBeNull();
  });

  it("a band with its box pads no right of its own: the 52px cell is that side", async () => {
    await draw();
    expect(deviceRow().className.split(/\s+/)).not.toContain("pr-[12px]");
    expect(deviceRow().querySelector("label")).not.toBeNull();
  });

  it("Can't: the Push column and its head leave, In app keeps its head, and the foot loses its push clause", async () => {
    deviceIs({ pushApi: false });
    await draw();
    expect(heads()).toEqual([C.inApp]);
    expect(screen.queryByText(P.head)).toBeNull();
    expect(screen.queryByRole("checkbox", { name: P.kindAria("new-set") })).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(KINDS.length);
    expect(foot().textContent).toBe(noPushFoot);
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

  it("a server delete that fails after the browser left still reads Off here, with no toast", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    await draw();
    m.unsubscribeDevice.mockRejectedValueOnce(new Error("network"));
    await act(async () => fireEvent.click(deviceBox()!));
    expect(existing!.unsubscribe).toHaveBeenCalled();
    expect(deviceRow().textContent).toContain(P.device.offHere);
    expect(document.body.textContent).not.toContain(P.failed ?? "We couldn't save that");
  });

  it("reads the device again when the reader comes back to the page (allowed in the browser's settings), never prompting", async () => {
    deviceIs({ permission: "denied" });
    await draw();
    expect(deviceRow().textContent).toContain(P.device.blocked.browser.lead);
    deviceIs({ permission: "granted", subscribed: false });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(deviceRow().textContent).toContain(P.device.offHere);
    expect(requestPermission).not.toHaveBeenCalled();
  });

  it("a read that started before a press finished never overwrites what the press did", async () => {
    deviceIs({ permission: "granted", subscribed: true });
    await draw();
    // A slow read (the reader refocused the window) that still sees the old subscription...
    let late!: (v: unknown) => void;
    m.readDeviceFacts.mockImplementationOnce(() => new Promise((done) => { late = done; }));
    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    // ...while the reader unticks the row.
    await act(async () => fireEvent.click(deviceBox()!));
    expect(deviceRow().textContent).toContain(P.device.offHere);
    await act(async () => late({ facts: { ...desktop, permission: "granted", subscribed: true }, registration: { pushManager: { subscribe } }, subscription: existing }));
    expect(deviceRow().textContent).toContain(P.device.offHere);
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

describe("the heartbeat lives in the shell now (PushHeartbeat)", () => {
  it("Settings never re-saves the subscription itself", async () => {
    deviceIs({ permission: "granted", subscribed: true });
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
