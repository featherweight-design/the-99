// The friend request card (Social R1 PR D): the arrival turn, Accept and Decline with every answer they can get
// (E12: a refusal redraws as what the link now is), the failure toast with Try again (E15), the own link's Copy
// link, and the card's one label (README 23).
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  redeem: vi.fn(),
  decline: vi.fn(),
  reduced: false,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: m.push, refresh: m.refresh }) }));
vi.mock("../../app/friends/actions", () => ({ redeemInviteAction: m.redeem, declineInviteAction: m.decline }));
vi.mock("../../lib/ui/motion", () => ({ prefersReducedMotion: () => m.reduced }));

import { FriendLanding } from "./friend-landing";
import { landingView, friendsSinceLabel } from "../../lib/social/landing";
import { socialCopy } from "../../lib/copy/social";

const L = socialCopy.landing;
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const SOL = { oracleId: "o1", name: "Sol Ring Commander", artCropUri: "https://cards.scryfall.io/art_crop/x.jpg" };
const OPEN = { kind: "open" as const, name: "Ana", commander: SOL };
const FRIEND = { publicId: "00000000-0000-4000-8000-000000000002", displayName: "Ana" };

/** Lets the arrival's two animation frames run. */
const arrive = () => act(() => { vi.advanceTimersByTime(40); });
const turn = () => screen.getByTestId("friend-card").firstElementChild as HTMLElement;
const title = () => screen.getByRole("heading", { level: 1 }).textContent;
const press = async (name: string) => {
  await act(async () => { fireEvent.click(screen.getByRole("button", { name })); });
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame"] });
  vi.resetAllMocks();
  m.reduced = false;
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the arrival", () => {
  it("draws a named card face down, then turns it face up once, as one labelled image", () => {
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    expect(turn().dataset.up).toBe("false");
    expect(turn().dataset.arrival).toBe("true");
    // Face down, the front is not there to read.
    expect(screen.queryByRole("img", { name: L.cardAria("Ana", SOL.name, L.typeRequest) })).toBeNull();
    arrive();
    expect(turn().dataset.up).toBe("true");
    expect(screen.getByRole("img", { name: L.cardAria("Ana", SOL.name, L.typeRequest) })).toBeTruthy();
    expect(screen.getByTestId("friend-card-back").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByTestId("friend-card-front").dataset.frame).toBe("art");
    expect(screen.getByText(L.credit(SOL.name))).toBeTruthy();
    expect(screen.getByText(L.openRules("Ana"))).toBeTruthy();
  });

  it("draws a sender with no commander by their initials in the grey frame (L2b)", () => {
    render(<FriendLanding token={TOKEN} view={{ kind: "open", name: "Jo Bloggs", commander: null }} />);
    arrive();
    expect(screen.getByTestId("friend-card-front").dataset.frame).toBe("grey");
    expect(screen.getByTestId("friend-card-initials").textContent).toBe("JB");
    expect(screen.getByText(L.noCommander)).toBeTruthy();
    expect(screen.getByRole("img", { name: L.cardAria("Jo Bloggs", null, L.typeRequest) })).toBeTruthy();
  });

  it.each([
    ["expired", { kind: "expired" as const }, L.expiredTitle, true],
    ["ended", { kind: "ended" as const }, L.endedTitle, false],
  ])("never turns an %s card, and names nobody", (_n, view, heading, dim) => {
    render(<FriendLanding token={TOKEN} view={view} />);
    arrive();
    expect(turn().dataset.up).toBe("false");
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    expect(title()).toBe(heading);
    expect(screen.getByTestId("friend-card-back").className.includes("grayscale")).toBe(dim);
    expect(screen.getByRole("link", { name: L.toFriends }).getAttribute("href")).toBe("/friends");
  });

  it("turns a friend's card face up with the day you became friends", () => {
    render(<FriendLanding token={TOKEN} view={{ kind: "friends", name: "Ana", commander: SOL, since: "Oct 2" }} />);
    arrive();
    expect(screen.getByRole("img", { name: L.cardAria("Ana", SOL.name, L.typeFriend("Oct 2")) })).toBeTruthy();
    expect(title()).toBe(L.alreadyTitle("Ana"));
    expect(screen.getByText(L.alreadyBody)).toBeTruthy();
    expect(screen.queryByRole("button", { name: L.accept })).toBeNull();
  });
});

describe("Accept", () => {
  it("leaves for /friends with the new friend's receipt, and does not turn the card", async () => {
    m.redeem.mockResolvedValue({ ok: true, friend: FRIEND, alreadyFriends: false });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(m.redeem).toHaveBeenCalledWith(TOKEN);
    expect(m.push).toHaveBeenCalledWith(`/friends?accepted=${FRIEND.publicId}`);
    expect(turn().dataset.up).toBe("true");
  });

  it.each([["ended"], ["notFound"]])("redraws a refusal as %s, a link that no longer works", async (reason) => {
    m.redeem.mockResolvedValue({ ok: false, reason });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(title()).toBe(L.endedTitle);
    expect(turn().dataset.up).toBe("false");
    expect(m.push).not.toHaveBeenCalled();
  });

  it("redraws your own link as your own card", async () => {
    m.redeem.mockResolvedValue({ ok: false, reason: "self" });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(title()).toBe(L.selfTitle);
    expect(screen.getByRole("img", { name: L.cardAria("Ana", SOL.name, L.typeOwn) })).toBeTruthy();
  });

  it("refreshes into not found when the switch went off", async () => {
    m.redeem.mockResolvedValue({ ok: false, reason: "off" });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    await press(L.accept);
    expect(m.refresh).toHaveBeenCalled();
  });

  it("keeps the card up and offers Try again when the write throws (L8)", async () => {
    m.redeem.mockRejectedValueOnce(new Error("down")).mockResolvedValue({ ok: true, friend: FRIEND, alreadyFriends: false });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(screen.getByRole("alert").textContent).toContain(L.acceptFailed);
    expect(turn().dataset.up).toBe("true");
    expect(title()).toBe(L.openTitle("Ana"));
    await press(L.retry);
    expect(m.redeem).toHaveBeenCalledTimes(2);
    expect(m.push).toHaveBeenCalled();
  });

  it("holds both buttons while it is in flight", async () => {
    let answer: (v: unknown) => void = () => {};
    m.redeem.mockReturnValue(new Promise((r) => { answer = r; }));
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    await press(L.accept);
    expect((screen.getByRole("button", { name: L.accept }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: L.decline }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => answer({ ok: false, reason: "ended" }));
  });
});

describe("Decline", () => {
  it("turns the card back first, then says the request is declined, by the name it kept", async () => {
    m.decline.mockResolvedValue({ ok: true });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.decline);
    expect(turn().dataset.up).toBe("false");
    // A decline's turn starts at once, with no arrival beat.
    expect(turn().dataset.arrival).toBe("false");
    act(() => { vi.advanceTimersByTime(519); });
    expect(title()).toBe(L.openTitle("Ana"));
    act(() => { vi.advanceTimersByTime(1); });
    expect(title()).toBe(L.declinedTitle);
    expect(screen.getByText(L.declinedBody("Ana"))).toBeTruthy();
    expect(screen.getByRole("link", { name: L.toHome }).getAttribute("href")).toBe("/");
  });

  it("waits only the 120ms cross-fade under reduced motion", async () => {
    m.reduced = true;
    m.decline.mockResolvedValue({ ok: true });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.decline);
    act(() => { vi.advanceTimersByTime(119); });
    expect(title()).toBe(L.openTitle("Ana"));
    act(() => { vi.advanceTimersByTime(1); });
    expect(title()).toBe(L.declinedTitle);
  });

  it.each([
    ["ended", L.endedTitle],
    ["self", L.selfTitle],
  ])("redraws a refusal (%s) as what the link now is, never as declined", async (reason, heading) => {
    m.decline.mockResolvedValue({ ok: false, reason });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.decline);
    act(() => { vi.advanceTimersByTime(1000); });
    expect(title()).toBe(heading);
  });

  it.each([
    ["answers failed", () => m.decline.mockResolvedValueOnce({ ok: false, reason: "failed" })],
    ["throws", () => m.decline.mockRejectedValueOnce(new Error("down"))],
  ])("shows the decline toast with Try again when it %s", async (_n, arrange) => {
    arrange();
    m.decline.mockResolvedValue({ ok: true });
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    arrive();
    await press(L.decline);
    expect(screen.getByRole("alert").textContent).toContain(L.declineFailed);
    expect(turn().dataset.up).toBe("true");
    await press(L.retry);
    expect(m.decline).toHaveBeenCalledTimes(2);
  });
});

describe("your own link", () => {
  it("copies the link at this page's own origin, and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<FriendLanding token={TOKEN} view={{ kind: "self", name: "Hugh", commander: null }} />);
    arrive();
    expect(screen.getByText(L.selfBody)).toBeTruthy();
    await press(L.copyLink);
    expect(writeText).toHaveBeenCalledWith(`${location.origin}/friend/${TOKEN}`);
    expect(screen.getByRole("button", { name: L.copied })).toBeTruthy();
    act(() => { vi.advanceTimersByTime(1500); });
    expect(screen.getByRole("button", { name: L.copyLink })).toBeTruthy();
  });

  it("says when the copy failed", async () => {
    Object.defineProperty(navigator, "clipboard", { value: { writeText: vi.fn().mockRejectedValue(new Error("no")) }, configurable: true });
    render(<FriendLanding token={TOKEN} view={{ kind: "self", name: "Hugh", commander: null }} />);
    await press(L.copyLink);
    expect(screen.getByRole("alert").textContent).toContain(L.copyFailed);
  });
});

describe("landingView", () => {
  const open = (over = {}) => ({
    state: "open" as const, inviterName: "Ana", commander: SOL, self: false, alreadyFriends: false, friendsSince: null, ...over,
  });
  it("maps every answer readInvite can give", () => {
    expect(landingView(null)).toEqual({ kind: "ended" });
    expect(landingView({ state: "expired" })).toEqual({ kind: "expired" });
    for (const state of ["redeemed", "declined", "revoked"] as const) expect(landingView({ state })).toEqual({ kind: "ended" });
    expect(landingView(open())).toEqual(OPEN);
    expect(landingView(open({ self: true, alreadyFriends: true }))).toEqual({ kind: "self", name: "Ana", commander: SOL });
    expect(landingView(open({ alreadyFriends: true, friendsSince: new Date("2026-10-02T23:30:00Z") })))
      .toEqual({ kind: "friends", name: "Ana", commander: SOL, since: "Oct 2" });
  });
  it("names the day in UTC", () => {
    expect(friendsSinceLabel(new Date("2026-10-02T00:30:00Z"))).toBe("Oct 2");
  });
});

describe("the column", () => {
  it("lands its heading and buttons with a card that turns, and draws an unturned card's at once", () => {
    render(<FriendLanding token={TOKEN} view={OPEN} />);
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("friend-land-in");
    expect(screen.getByRole("button", { name: L.accept }).parentElement?.className).toContain("friend-land-in");
    cleanup();
    render(<FriendLanding token={TOKEN} view={{ kind: "ended" }} />);
    expect(screen.getByRole("heading", { level: 1 }).className).not.toContain("friend-land-in");
  });
});
