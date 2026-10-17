// /friends with invites (invites PR 4): off, Add a friend makes a link on the press as shipped; on, it opens the
// chooser, never held, with the count line under it, and card 1's link opens as the chooser's path 1.
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({
  setDisplayNameAction: vi.fn(),
  setCommanderAction: vi.fn(),
  createInviteAction: vi.fn(),
  revokeInviteAction: vi.fn(),
  unfriendAction: vi.fn(),
  listDeckCommandersAction: vi.fn(),
  searchFaceCommandersAction: vi.fn(),
}));
const inv = vi.hoisted(() => ({ sendEmailInviteAction: vi.fn(), showInviteQrAction: vi.fn() }));
vi.mock("../../app/friends/actions", () => a);
vi.mock("../../app/friends/invite-actions", () => inv);
const nav = vi.hoisted(() => ({ refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => nav }));

import { FriendsView } from "./friends-view";
import { socialCopy } from "../../lib/copy/social";
import { inviteCopy } from "../../lib/copy/invites";

const NOW = new Date("2026-10-15T21:41:00Z");
const TOKEN = "t".repeat(22);
const link = (i: number) => ({ token: `tok${String(i).padStart(19, "0")}`, createdAt: NOW, expiresAt: new Date("2026-10-22T21:41:00Z") });

function draw(over: Partial<Parameters<typeof FriendsView>[0]> = {}) {
  return render(
    <FriendsView
      profile={{ publicId: "p-me", displayName: "Hugh", commander: null }}
      friends={[]}
      links={[]}
      accepted={null}
      origin="https://the-99.dev"
      nowMs={NOW.getTime()}
      maxLinks={10}
      {...over}
    />,
  );
}
const press = () => screen.getByRole("button", { name: socialCopy.page.invite });

beforeEach(() => {
  vi.resetAllMocks();
  a.createInviteAction.mockResolvedValue({ ok: true, token: TOKEN, url: `https://the-99.dev/friend/${TOKEN}`, expiresAt: new Date("2026-10-22T21:41:00Z") });
});
afterEach(cleanup);

describe("Add a friend, invites off", () => {
  it("makes a link on the press and opens the shipped dialog, with no count and no chooser", async () => {
    draw();
    expect(document.querySelector("[data-invite-count]")).toBeNull();
    await act(async () => fireEvent.click(press()));
    expect(a.createInviteAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(inviteCopy.chooser.onTitle)).toBeNull();
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
  });
});

describe("Add a friend, invites on", () => {
  const invites = { left: 2, waiting: 1, liveQr: false, qrUntil: null, out: false };

  it("draws the count under the press and opens the chooser, making nothing", () => {
    draw({ invites });
    expect(document.querySelector("[data-invite-count]")?.textContent).toBe("2 invites left · 1 waiting");
    fireEvent.click(press());
    expect(a.createInviteAction).not.toHaveBeenCalled();
    expect(screen.getByText(inviteCopy.chooser.onTitle)).toBeTruthy();
    expect(screen.getByText(inviteCopy.chooser.newTitle)).toBeTruthy();
  });

  it("opens card 1's link as path 1, with ‹ back to the chooser", async () => {
    draw({ invites });
    fireEvent.click(press());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.onTitle) })));
    expect(a.createInviteAction).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(screen.getByRole("img", { name: socialCopy.dialog.qrAria })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: inviteCopy.chooser.back }));
    expect(screen.getByText(inviteCopy.chooser.onTitle)).toBeTruthy();
  });

  it("never holds the press at ten links: the hold sentence stays under it, and card 1 is held", () => {
    draw({ invites, links: Array.from({ length: 10 }, (_, i) => link(i)) });
    expect(press().getAttribute("aria-disabled")).toBeNull();
    expect(screen.getByText(socialCopy.page.held)).toBeTruthy();
    fireEvent.click(press());
    expect(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.onTitle) }).getAttribute("aria-disabled")).toBe("true");
  });

  it("toasts a link that could not be made from card 1, with Try again", async () => {
    a.createInviteAction.mockResolvedValue({ ok: false, reason: "failed" });
    draw({ invites });
    fireEvent.click(press());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.onTitle) })));
    expect(screen.getByRole("alert").textContent).toContain(socialCopy.invites.createFailed);
  });
});

describe("Add a friend, invites on, answers that land after the reader moved on", () => {
  const invites = { left: 2, waiting: 1, liveQr: false, qrUntil: null, out: false };
  const close = () => fireEvent.click(screen.getByRole("button", { name: socialCopy.dialog.close }));

  it("draws nothing for card 1's link when the reader went to path 2 first: closing opens no friend-link dialog", async () => {
    let answer: (v: unknown) => void = () => {};
    a.createInviteAction.mockReturnValue(new Promise((r) => { answer = r; }));
    draw({ invites });
    fireEvent.click(press());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.onTitle) }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.newTitle) }));
    await act(async () => answer({ ok: true, token: TOKEN, url: `https://the-99.dev/friend/${TOKEN}`, expiresAt: new Date("2026-10-22T21:41:00Z") }));
    expect(screen.getByRole("button", { name: inviteCopy.path.showQr })).toBeTruthy();
    close();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("draws a failure's Try again inside the open sheet, where Tab can reach it", async () => {
    a.createInviteAction.mockResolvedValue({ ok: false, reason: "failed" });
    draw({ invites });
    fireEvent.click(press());
    await act(async () => fireEvent.click(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.onTitle) })));
    const retry = screen.getByRole("button", { name: socialCopy.invites.retry });
    expect(screen.getByRole("dialog").contains(retry)).toBe(true);
    expect(screen.getByRole("dialog").contains(screen.getByRole("alert"))).toBe(true);
    retry.focus();
    expect(document.activeElement).toBe(retry);
  });

  it("keeps the sheet closed when Close is pressed before Show an invite QR answers", async () => {
    let answer: (v: unknown) => void = () => {};
    inv.showInviteQrAction.mockReturnValue(new Promise((r) => { answer = r; }));
    draw({ invites });
    fireEvent.click(press());
    fireEvent.click(screen.getByRole("button", { name: new RegExp(inviteCopy.chooser.newTitle) }));
    fireEvent.click(screen.getByRole("button", { name: inviteCopy.path.showQr }));
    close();
    await act(async () => answer({ ok: true, token: TOKEN, url: `https://the-99.dev/join/${TOKEN}`, expiresAt: new Date(Date.now() + 900_000) }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("a live QR's expiry with the sheet closed (state C4)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("redraws the page just after the QR expires, so the count line returns to N invites left", () => {
    vi.useFakeTimers();
    const qrUntil = new Date(NOW.getTime() + 60_000);
    draw({ invites: { left: 2, waiting: 0, liveQr: true, qrUntil, out: false } });
    nav.refresh.mockClear();
    act(() => vi.advanceTimersByTime(60_000));
    expect(nav.refresh).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(600));
    expect(nav.refresh).toHaveBeenCalledTimes(1);
  });

  it("schedules nothing with no live QR", () => {
    vi.useFakeTimers();
    draw({ invites: { left: 2, waiting: 0, liveQr: false, qrUntil: null, out: false } });
    nav.refresh.mockClear();
    act(() => vi.advanceTimersByTime(20 * 60_000));
    expect(nav.refresh).not.toHaveBeenCalled();
  });
});
