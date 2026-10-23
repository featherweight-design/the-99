// A push's landing on Home (push PR 5): the card a price drop or combo push names opens through the feed's own opener,
// the address loses both parameters through `mirrorUrl`, and every delivered notification closes (D4). Every browser API
// it touches may be missing.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";

const h = vi.hoisted(() => ({
  open: vi.fn(),
  detail: true,
  mirrored: [] as string[],
}));
vi.mock("../../lib/url/mirror", () => ({ mirrorUrl: (u: URL | string) => { h.mirrored.push(String(u)); } }));
vi.mock("../cards/card-detail-provider", () => ({ useCardDetailIfAny: () => (h.detail ? { open: h.open } : null) }));
import { closeDeliveredNotifications, PushLanding } from "./push-landing";

const ID = "2d8a1a3c-5b0e-4f5e-9a51-0d7c6b3e9f10";
const original = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

function worker(value: unknown) {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value });
}

function delivered(n: number) {
  const shown = Array.from({ length: n }, () => ({ close: vi.fn() }));
  const getNotifications = vi.fn(async () => shown);
  worker({ getRegistration: vi.fn(async () => ({ getNotifications })) });
  return { shown, getNotifications };
}

beforeEach(() => {
  h.open.mockReset();
  h.detail = true;
  h.mirrored.length = 0;
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  if (original) Object.defineProperty(navigator, "serviceWorker", original);
  else delete (navigator as { serviceWorker?: unknown }).serviceWorker;
});

let visits = 0;
const nextVisit = () => `visit-${++visits}`;

describe("opening the landing's card", () => {
  it("opens the card push-card names through the feed's opener, not for its combo", () => {
    delivered(0);
    window.history.replaceState(null, "", `/?push-card=${ID}`);
    render(<PushLanding visit={nextVisit()} />);
    expect(h.open).toHaveBeenCalledTimes(1);
    expect(h.open).toHaveBeenCalledWith(ID, undefined, undefined, undefined);
  });

  it("opens it for its combo with push-combo=1, as the feed's See the combo does", () => {
    delivered(0);
    window.history.replaceState(null, "", `/?push-card=${ID}&push-combo=1`);
    render(<PushLanding visit={nextVisit()} />);
    expect(h.open).toHaveBeenCalledWith(ID, undefined, undefined, { combo: true });
  });

  it("opens nothing for a value that is not an oracle id, and still strips it", () => {
    delivered(0);
    window.history.replaceState(null, "", "/?push-card=%3Cscript%3E&push-combo=1");
    render(<PushLanding visit={nextVisit()} />);
    expect(h.open).not.toHaveBeenCalled();
    expect(h.mirrored).toHaveLength(1);
    expect(new URL(h.mirrored[0]).search).toBe("");
  });

  it("opens nothing with no provider (a first-run Home) and still strips the address", () => {
    delivered(0);
    h.detail = false;
    window.history.replaceState(null, "", `/?push-card=${ID}`);
    render(<PushLanding visit={nextVisit()} />);
    expect(h.open).not.toHaveBeenCalled();
    expect(h.mirrored).toHaveLength(1);
  });
});

describe("stripping the address", () => {
  it("removes both parameters through mirrorUrl and keeps the rest", () => {
    delivered(0);
    window.history.replaceState(null, "", `/?tour=1&push-card=${ID}&push-combo=1`);
    render(<PushLanding visit={nextVisit()} />);
    expect(h.mirrored).toHaveLength(1);
    const url = new URL(h.mirrored[0]);
    expect(url.pathname).toBe("/");
    expect(url.searchParams.has("push-card")).toBe(false);
    expect(url.searchParams.has("push-combo")).toBe(false);
    expect(url.searchParams.get("tour")).toBe("1");
  });

  it("writes nothing on a Home visit that did not come from a push", () => {
    delivered(0);
    window.history.replaceState(null, "", "/?tour=1");
    render(<PushLanding visit={nextVisit()} />);
    expect(h.mirrored).toHaveLength(0);
    expect(h.open).not.toHaveBeenCalled();
  });
});

describe("closing what was delivered (D4)", () => {
  it("closes every delivered notification on mount, a landing or not", async () => {
    const { shown, getNotifications } = delivered(3);
    render(<PushLanding visit={nextVisit()} />);
    await waitFor(() => expect(getNotifications).toHaveBeenCalledTimes(1));
    await waitFor(() => shown.forEach((n) => expect(n.close).toHaveBeenCalledTimes(1)));
  });

  it("a Home restored by Back (the same server visit) closes nothing: a notification that came meanwhile stays", async () => {
    const visit = nextVisit();
    const first = delivered(1);
    const { unmount } = render(<PushLanding visit={visit} />);
    await waitFor(() => expect(first.shown[0]!.close).toHaveBeenCalledTimes(1));
    unmount();
    // Away from Home, a new notification arrives; Back restores Home's payload with the same token, no server read.
    const later = delivered(1);
    render(<PushLanding visit={visit} />);
    await new Promise((done) => setTimeout(done, 20));
    expect(later.getNotifications).not.toHaveBeenCalled();
    expect(later.shown[0]!.close).not.toHaveBeenCalled();
    // A fresh visit (a new token) closes it.
    render(<PushLanding visit={nextVisit()} />);
    await waitFor(() => expect(later.shown[0]!.close).toHaveBeenCalledTimes(1));
  });

  it("does nothing and throws nothing without a service worker, a registration or getNotifications", async () => {
    worker(undefined);
    await expect(closeDeliveredNotifications()).resolves.toBeUndefined();
    worker({});
    await expect(closeDeliveredNotifications()).resolves.toBeUndefined();
    worker({ getRegistration: async () => undefined });
    await expect(closeDeliveredNotifications()).resolves.toBeUndefined();
    worker({ getRegistration: async () => ({}) });
    await expect(closeDeliveredNotifications()).resolves.toBeUndefined();
    worker({ getRegistration: async () => { throw new Error("SecurityError"); } });
    await expect(closeDeliveredNotifications()).resolves.toBeUndefined();
    worker({ getRegistration: async () => ({ getNotifications: async () => { throw new Error("denied"); } }) });
    await expect(closeDeliveredNotifications()).resolves.toBeUndefined();
    // And mounted with none of it, the landing still opens its card.
    worker(undefined);
    window.history.replaceState(null, "", `/?push-card=${ID}`);
    expect(() => render(<PushLanding visit={nextVisit()} />)).not.toThrow();
    expect(h.open).toHaveBeenCalledTimes(1);
  });
});
