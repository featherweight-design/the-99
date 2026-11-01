// Add a friend with invites on (invites PR 4): the chooser (A1 to A3, R13), path 2's email (E1 to E6) and its hold
// out of invites (R4), and the invite QR's screen (Q1 to Q5).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const a = vi.hoisted(() => ({ sendEmailInviteAction: vi.fn(), showInviteQrAction: vi.fn() }));
vi.mock("../../app/friends/invite-actions", () => a);

import { InviteSheet, type InviteScreen } from "./invite-sheet";
import { mmss } from "./invite-qr";
import { inviteCopy } from "../../lib/copy/invites";
import { socialCopy } from "../../lib/copy/social";
import type { InviteCount } from "../../lib/invites/rules";
import { WATCH_MS } from "./use-invite-watch";

const ch = inviteCopy.chooser;
const t = inviteCopy.path;
const q = inviteCopy.qr;
const NOW = new Date("2026-10-16T12:00:00Z");
const TOKEN = "B".repeat(43);
const count = (over: Partial<InviteCount> = {}): InviteCount => ({ left: 3, waiting: 0, liveQr: false, qrUntil: null, out: false, ...over });
const fetchMock = vi.fn();

type Props = Parameters<typeof InviteSheet>[0];
function Harness({ start = "choose", ...over }: Partial<Props> & { start?: InviteScreen }) {
  // The screen is the caller's; the harness holds it as FriendsView does.
  const [screen, setScreen] = useState(start);
  return (
    <InviteSheet
      screen={screen}
      onScreen={setScreen}
      count={count()}
      linkHeld={false}
      linkPending={false}
      onFriendLink={() => {}}
      link={null}
      onClose={() => {}}
      say={say}
      onRefresh={refresh}
      {...over}
    />
  );
}
const say = vi.fn();
const refresh = vi.fn();
const flush = () => act(async () => {});

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: false });
  vi.setSystemTime(NOW);
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "live", secondsLeft: 900 }) });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const card = (name: string | RegExp) => screen.getByRole("button", { name });

describe("the chooser", () => {
  it("draws both cards under Add a friend, card 2 with its count", () => {
    render(<Harness />);
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
    expect(screen.getByText(ch.sub)).toBeTruthy();
    expect(card(new RegExp(ch.onTitle)).getAttribute("aria-disabled")).toBeNull();
    const two = card(new RegExp(ch.newTitle));
    expect(two.getAttribute("aria-disabled")).toBeNull();
    expect(two.textContent).toContain("3 invites left");
    expect(two.querySelector("[data-fan]")?.getAttribute("data-fan")).toBe("3");
  });

  it("holds card 2 out of invites with no live QR, its fan one empty slot", () => {
    const onScreen = vi.fn();
    render(<InviteSheet screen="choose" onScreen={onScreen} count={count({ left: 0, out: true })} linkHeld={false} linkPending={false} onFriendLink={() => {}} link={null} onClose={() => {}} say={say} onRefresh={refresh} />);
    const two = card(new RegExp(ch.newTitle));
    expect(two.getAttribute("aria-disabled")).toBe("true");
    expect(two.textContent).toContain(inviteCopy.count.out);
    expect(two.querySelector("[data-fan-slot]")).toBeTruthy();
    fireEvent.click(two);
    expect(onScreen).not.toHaveBeenCalled();
    expect(card(new RegExp(ch.onTitle)).getAttribute("aria-disabled")).toBeNull();
  });

  it("keeps card 2 open out of invites while a QR is live (it shows that QR again)", () => {
    render(<Harness count={count({ left: 0, out: true, liveQr: true })} />);
    expect(card(new RegExp(ch.newTitle)).getAttribute("aria-disabled")).toBeNull();
  });

  it("holds card 1 at ten links, with the shipped hold sentence as its reason; card 2 stays live", () => {
    const onFriendLink = vi.fn();
    render(<Harness linkHeld onFriendLink={onFriendLink} />);
    const one = card(new RegExp(ch.onTitle));
    expect(one.getAttribute("aria-disabled")).toBe("true");
    expect(one.textContent).toContain(socialCopy.page.held);
    fireEvent.click(one);
    expect(onFriendLink).not.toHaveBeenCalled();
    expect(card(new RegExp(ch.newTitle)).getAttribute("aria-disabled")).toBeNull();
  });

  it("reads Making a link… on card 1 while its link is made", () => {
    render(<Harness linkPending />);
    expect(card(new RegExp(ch.onPending)).getAttribute("aria-disabled")).toBe("true");
  });

  it("opens path 2 from card 2, and ‹ back returns to the chooser", () => {
    render(<Harness />);
    fireEvent.click(card(new RegExp(ch.newTitle)));
    expect(screen.getByRole("dialog", { name: t.title })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: ch.back }));
    expect(screen.getByRole("dialog", { name: socialCopy.dialog.title })).toBeTruthy();
  });
});

describe("path 2, by email", () => {
  const field = () => screen.getByLabelText(t.emailLabel) as HTMLInputElement;
  const send = () => screen.getByRole("button", { name: /Send invitation|Sending…/ });

  it("refuses a bad address on Send with no call (E1), and checks it again as they type", () => {
    render(<Harness start="new" />);
    fireEvent.change(field(), { target: { value: "hugh@" } });
    fireEvent.click(send());
    expect(a.sendEmailInviteAction).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe(t.notAnEmail);
    expect(field().className).toContain("--danger");
    fireEvent.change(field(), { target: { value: "hugh@example.com" } });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("fills Send once the shape holds (E2)", () => {
    render(<Harness start="new" />);
    expect(send().className).toContain("--border-strong");
    fireEvent.change(field(), { target: { value: "hugh@example.com" } });
    expect(send().className).toContain("bg-[color:var(--accent)]");
  });

  it("locks the field and holds the QR press in flight (E3), then shows the sent box with Invite someone else (E4)", async () => {
    let answer: (v: unknown) => void = () => {};
    a.sendEmailInviteAction.mockReturnValue(new Promise((r) => { answer = r; }));
    render(<Harness start="new" />);
    fireEvent.change(field(), { target: { value: "jo@example.com" } });
    fireEvent.keyDown(field(), { key: "Enter" });
    fireEvent.submit(field().closest("form")!);
    expect(a.sendEmailInviteAction).toHaveBeenCalledWith("jo@example.com");
    expect(send().textContent).toBe(t.sending);
    expect(field().readOnly).toBe(true);
    expect(screen.getByRole("button", { name: t.showQr }).getAttribute("aria-disabled")).toBe("true");
    await act(async () => answer({ ok: true }));
    const box = screen.getByRole("status");
    expect(box.textContent).toContain(t.sent);
    expect(box.textContent).not.toContain(t.lastOne);
    fireEvent.click(screen.getByRole("button", { name: t.again }));
    expect(field().value).toBe("");
  });

  it("says that was the last invite, with no Invite someone else (E5)", async () => {
    a.sendEmailInviteAction.mockResolvedValue({ ok: true });
    render(<Harness start="new" count={count({ left: 1 })} />);
    fireEvent.change(field(), { target: { value: "jo@example.com" } });
    await act(async () => fireEvent.submit(field().closest("form")!));
    expect(screen.getByRole("status").textContent).toContain(t.lastOne);
    expect(screen.queryByRole("button", { name: t.again })).toBeNull();
  });

  it.each([[{ ok: false, reason: "failed" }], [new Error("network")]])(
    "toasts %j with Try again, keeping the typed address (E6)",
    async (outcome) => {
      if (outcome instanceof Error) a.sendEmailInviteAction.mockRejectedValue(outcome);
      else a.sendEmailInviteAction.mockResolvedValue(outcome);
      render(<Harness start="new" />);
      fireEvent.change(field(), { target: { value: "jo@example.com" } });
      await act(async () => fireEvent.submit(field().closest("form")!));
      expect(say).toHaveBeenCalledWith(t.sendFailed, expect.objectContaining({ label: t.retry }));
      expect(field().value).toBe("jo@example.com");
    },
  );

  it("sends once from an old Try again while a new send is in flight, and puts that toast away", async () => {
    const clearToast = vi.fn();
    a.sendEmailInviteAction.mockResolvedValueOnce({ ok: false, reason: "failed" });
    render(<Harness start="new" clearToast={clearToast} />);
    fireEvent.change(field(), { target: { value: "jo@example.com" } });
    await act(async () => fireEvent.submit(field().closest("form")!));
    const oldRetry = say.mock.calls[0][1].run as () => void;
    a.sendEmailInviteAction.mockReturnValue(new Promise(() => {}));
    await act(async () => fireEvent.submit(field().closest("form")!));
    expect(clearToast).toHaveBeenCalled();
    await act(async () => oldRetry());
    expect(a.sendEmailInviteAction).toHaveBeenCalledTimes(2);
  });

  it("redraws the page on an out race", async () => {
    a.sendEmailInviteAction.mockResolvedValue({ ok: false, reason: "out" });
    render(<Harness start="new" />);
    fireEvent.change(field(), { target: { value: "jo@example.com" } });
    await act(async () => fireEvent.submit(field().closest("form")!));
    expect(refresh).toHaveBeenCalled();
    expect(say).not.toHaveBeenCalled();
  });

  it("holds the email half out of invites with a live QR, and leaves Show an invite QR live (R4)", () => {
    render(<Harness start="new" count={count({ left: 0, out: true, liveQr: true })} />);
    expect(screen.getByText(/Out of invites/).textContent).toBe("Out of invites · 1 held by this QR");
    expect(field().disabled).toBe(true);
    expect(send().getAttribute("aria-disabled")).toBe("true");
    expect(screen.getByRole("button", { name: t.showQr }).getAttribute("aria-disabled")).toBeNull();
  });

  it("holds the QR press too out of invites with no live QR", () => {
    render(<Harness start="new" count={count({ left: 0, out: true })} />);
    expect(screen.getByRole("button", { name: t.showQr }).getAttribute("aria-disabled")).toBe("true");
  });
});

describe("the invite QR", () => {
  const live = (secondsLeft = 900) => ({ ok: true, token: TOKEN, url: `https://the-99.dev/join/${TOKEN}`, expiresAt: new Date(Date.now() + secondsLeft * 1000) });
  async function openQr(secondsLeft = 900, over: Partial<Props> = {}) {
    a.showInviteQrAction.mockResolvedValue(live(secondsLeft));
    render(<Harness start="new" {...over} />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.showQr })));
  }
  const time = () => document.querySelector("[data-qr-time]") as HTMLElement;

  it("formats the timer as m:ss", () => {
    expect(mmss(900)).toBe("15:00");
    expect(mmss(61)).toBe("1:01");
    expect(mmss(9)).toBe("0:09");
    expect(mmss(-3)).toBe("0:00");
  });

  it("shows the live QR with a ticking timer, and ‹ back to path 2", async () => {
    await openQr();
    expect(screen.getByRole("dialog", { name: t.title })).toBeTruthy();
    expect(screen.getByRole("img", { name: q.aria })).toBeTruthy();
    expect(screen.getByRole("timer").textContent).toContain("15:00");
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(time().textContent).toBe("14:58");
    expect(time().className).not.toContain("--warning");
    fireEvent.click(screen.getByRole("button", { name: ch.back }));
    expect(screen.getByRole("button", { name: t.showQr })).toBeTruthy();
  });

  it("turns the time and the ring --warning under a minute (Q2)", async () => {
    await openQr(61);
    expect(time().className).not.toContain("--warning");
    await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
    expect(time().textContent).toBe("0:59");
    expect(time().className).toContain("--warning");
    expect(document.querySelector("[data-qr-ring]")?.hasAttribute("data-warn")).toBe(true);
  });

  it("turns into Invitation sent when the watch finds it claimed (Q3), and redraws the page", async () => {
    await openQr();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "claimed" }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_MS); });
    expect(screen.getByRole("status").textContent).toContain(t.sent);
    expect(screen.getByText(q.claimedBody)).toBeTruthy();
    expect(screen.queryByRole("img", { name: q.aria })).toBeNull();
    expect(refresh).toHaveBeenCalled();
  });

  it("greys the plate under EXPIRED when the watch says so (Q4), and Make a new QR runs the action again (Q5)", async () => {
    await openQr();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "expired" }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_MS); });
    expect(screen.getByRole("img", { name: q.expiredAria })).toBeTruthy();
    expect(screen.getByText(q.expiredBody)).toBeTruthy();
    expect(screen.queryByRole("timer")).toBeNull();
    expect(refresh).toHaveBeenCalled();
    const next = "C".repeat(43);
    a.showInviteQrAction.mockResolvedValue({ ...live(), token: next, url: `https://the-99.dev/join/${next}` });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: q.makeNew })));
    expect(a.showInviteQrAction).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("timer").textContent).toContain("15:00");
  });

  it("expires when the client's clock reaches zero and the server, asked then, says so", async () => {
    await openQr(3);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "expired" }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await flush();
    expect(screen.getByRole("img", { name: q.expiredAria })).toBeTruthy();
  });

  it("keeps a QR the server still holds live when the device clock reaches zero first, re-based to its time left", async () => {
    // The device clock runs ahead: its countdown reaches zero while the server has two minutes left.
    await openQr(3);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "live", secondsLeft: 120 }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await flush();
    expect(screen.queryByRole("img", { name: q.expiredAria })).toBeNull();
    expect(time().textContent).toBe("2:00");
    const asked = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_MS); });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(asked);
    expect(screen.getByRole("timer")).toBeTruthy();
    // A failed ask at zero settles nothing either: the watch's next answer decides.
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({}) });
    await act(async () => { await vi.advanceTimersByTimeAsync(120_000); });
    await flush();
    expect(screen.queryByRole("img", { name: q.expiredAria })).toBeNull();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "expired" }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_MS); });
    expect(screen.getByRole("img", { name: q.expiredAria })).toBeTruthy();
  });

  it("takes the server's claim when the client's clock reaches zero, never expired", async () => {
    await openQr(3);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "claimed" }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(3000); });
    await flush();
    expect(screen.getByRole("status").textContent).toContain(t.sent);
    expect(screen.queryByRole("img", { name: q.expiredAria })).toBeNull();
  });

  it("stays on path 2 when ‹ back is pressed before Make a new QR answers", async () => {
    await openQr();
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ state: "expired" }) });
    await act(async () => { await vi.advanceTimersByTimeAsync(WATCH_MS); });
    let answer: (v: unknown) => void = () => {};
    a.showInviteQrAction.mockReturnValue(new Promise((r) => { answer = r; }));
    fireEvent.click(screen.getByRole("button", { name: q.makeNew }));
    fireEvent.click(screen.getByRole("button", { name: ch.back }));
    const next = "C".repeat(43);
    await act(async () => answer({ ...live(), token: next, url: `https://the-99.dev/join/${next}` }));
    expect(screen.getByRole("button", { name: t.showQr })).toBeTruthy();
    expect(screen.queryByRole("img", { name: q.aria })).toBeNull();
  });

  it("re-shows the live QR it already holds with no second call", async () => {
    await openQr();
    fireEvent.click(screen.getByRole("button", { name: ch.back }));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.showQr })));
    expect(a.showInviteQrAction).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("img", { name: q.aria })).toBeTruthy();
  });

  it.each([[{ ok: false, reason: "unconfigured" }], [{ ok: false, reason: "noOrigin" }], [new Error("down")]])(
    "toasts %j with Try again", async (outcome) => {
      if (outcome instanceof Error) a.showInviteQrAction.mockRejectedValue(outcome);
      else a.showInviteQrAction.mockResolvedValue(outcome);
      render(<Harness start="new" />);
      await act(async () => fireEvent.click(screen.getByRole("button", { name: t.showQr })));
      expect(say).toHaveBeenCalledWith(q.createFailed, expect.objectContaining({ label: t.retry }));
      expect(screen.getByRole("button", { name: t.showQr })).toBeTruthy();
    },
  );

  it("redraws and stays on path 2 on an out race", async () => {
    a.showInviteQrAction.mockResolvedValue({ ok: false, reason: "out" });
    render(<Harness start="new" />);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: t.showQr })));
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: t.showQr })).toBeTruthy();
    await flush();
  });
});
