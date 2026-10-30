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
import { landingView } from "../../lib/social/landing";
import { socialCopy } from "../../lib/copy/social";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const L = socialCopy.landing;
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const NOW = new Date("2026-10-15T21:41:00Z").getTime();
const ANA = named("Ana");
const JO_BLOGGS = named("Jo Bloggs");
const SOL = { oracleId: "o1", name: "Sol Ring Commander", artCropUri: "https://cards.scryfall.io/art_crop/x.jpg" };
const OPEN = { kind: "open" as const, name: ANA, commander: SOL };
const FRIEND = { publicId: "00000000-0000-4000-8000-000000000002" };

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
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    expect(turn().dataset.up).toBe("false");
    expect(turn().dataset.arrival).toBe("true");
    // Arriving moves no focus.
    expect(document.activeElement).toBe(document.body);
    // Face down, the front is not there to read.
    expect(screen.queryByRole("img", { name: plain(L.cardAria(ANA, SOL.name, L.typeRequest)) })).toBeNull();
    arrive();
    expect(turn().dataset.up).toBe("true");
    expect(screen.getByRole("img", { name: plain(L.cardAria(ANA, SOL.name, L.typeRequest)) })).toBeTruthy();
    expect(screen.getByTestId("friend-card-back").getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByTestId("friend-card-front").dataset.frame).toBe("art");
    expect(screen.getByText(L.credit(SOL.name))).toBeTruthy();
    expect(screen.getByText(plain(L.openRules(ANA)))).toBeTruthy();
    // What accepting shares is the image's description, read after its label.
    expect(screen.getByRole("img").getAttribute("aria-describedby")).toBe(screen.getByText(plain(L.openRules(ANA))).closest("p")!.id);
  });

  it("draws a sender with no commander by their initials in the grey frame (L2b)", () => {
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "open", name: JO_BLOGGS, commander: null }} />);
    arrive();
    expect(screen.getByTestId("friend-card-front").dataset.frame).toBe("grey");
    expect(screen.getByTestId("friend-card-initials").textContent).toBe("JB");
    expect(screen.getByText(L.noCommander)).toBeTruthy();
    expect(screen.getByRole("img", { name: plain(L.cardAria(JO_BLOGGS, null, L.typeRequest)) })).toBeTruthy();
  });

  it("names the face a signature card with the switch on: each card's rules and an empty credit", () => {
    render(<FriendLanding token={TOKEN} nowMs={NOW} signature view={{ kind: "open", name: JO_BLOGGS, commander: null }} />);
    arrive();
    expect(screen.getByText(plain(L.openRulesSignature(JO_BLOGGS)))).toBeTruthy();
    expect(screen.getByText(L.noSignature)).toBeTruthy();
    expect(screen.queryByText(L.noCommander)).toBeNull();
    cleanup();
    render(<FriendLanding token={TOKEN} nowMs={NOW} signature view={{ kind: "self", name: named("Jo"), commander: SOL }} />);
    arrive();
    expect(screen.getByText(L.ownRulesSignature)).toBeTruthy();
  });

  it.each([
    ["expired", { kind: "expired" as const }, L.expiredTitle, true],
    ["ended", { kind: "ended" as const }, L.endedTitle, false],
  ])("never turns an %s card, and names nobody", (_n, view, heading, dim) => {
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={view} />);
    arrive();
    expect(turn().dataset.up).toBe("false");
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    expect(title()).toBe(heading);
    expect(screen.getByTestId("friend-card-back").className.includes("grayscale")).toBe(dim);
    expect(screen.getByRole("link", { name: L.toFriends }).getAttribute("href")).toBe("/friends");
  });

  it("turns a friend's card face up with the day you became friends, as /friends names it", () => {
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "friends", name: ANA, commander: SOL, since: new Date("2026-10-02T12:00:00Z") }} />);
    arrive();
    expect(screen.getByRole("img", { name: plain(L.cardAria(ANA, SOL.name, L.typeFriend("Oct 2"))) })).toBeTruthy();
    expect(title()).toBe(plain(L.alreadyTitle(ANA)));
    expect(screen.getByText(L.alreadyBody)).toBeTruthy();
    expect(screen.queryByRole("button", { name: L.accept })).toBeNull();
  });

  it("names a friendship made today or yesterday the way /friends does", () => {
    const { unmount } = render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "friends", name: ANA, commander: SOL, since: new Date(NOW - 3_600_000) }} />);
    arrive();
    expect(screen.getByRole("img", { name: plain(L.cardAria(ANA, SOL.name, L.typeFriend(socialCopy.friends.today))) })).toBeTruthy();
    unmount();
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "friends", name: ANA, commander: SOL, since: new Date(NOW - 86_400_000) }} />);
    arrive();
    expect(screen.getByRole("img", { name: plain(L.cardAria(ANA, SOL.name, L.typeFriend(socialCopy.friends.yesterday))) })).toBeTruthy();
  });
});

describe("Accept", () => {
  it("leaves for /friends with the new friend's receipt, and does not turn the card", async () => {
    m.redeem.mockResolvedValue({ ok: true, friend: FRIEND, alreadyFriends: false });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(m.redeem).toHaveBeenCalledWith(TOKEN);
    expect(m.push).toHaveBeenCalledWith(`/friends?accepted=${FRIEND.publicId}`);
    expect(turn().dataset.up).toBe("true");
  });

  it.each([["ended"], ["notFound"]])("redraws a refusal as %s, a link that no longer works", async (reason) => {
    m.redeem.mockResolvedValue({ ok: false, reason });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(title()).toBe(L.endedTitle);
    expect(turn().dataset.up).toBe("false");
    expect(m.push).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
  });

  it("redraws your own link as your own card", async () => {
    m.redeem.mockResolvedValue({ ok: false, reason: "self" });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(title()).toBe(L.selfTitle);
    expect(screen.getByRole("img", { name: plain(L.cardAria(ANA, SOL.name, L.typeOwn)) })).toBeTruthy();
  });

  it("refreshes into not found when the switch went off", async () => {
    m.redeem.mockResolvedValue({ ok: false, reason: "off" });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    await press(L.accept);
    expect(m.refresh).toHaveBeenCalled();
  });

  it("keeps the card up and offers Try again when the write throws (L8)", async () => {
    m.redeem.mockRejectedValueOnce(new Error("down")).mockResolvedValue({ ok: true, friend: FRIEND, alreadyFriends: false });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(screen.getByRole("alert").textContent).toContain(L.acceptFailed);
    expect(turn().dataset.up).toBe("true");
    expect(title()).toBe(plain(L.openTitle(ANA)));
    await press(L.retry);
    expect(m.redeem).toHaveBeenCalledTimes(2);
    expect(m.push).toHaveBeenCalled();
  });

  it("holds both buttons while it is in flight", async () => {
    let answer: (v: unknown) => void = () => {};
    m.redeem.mockReturnValue(new Promise((r) => { answer = r; }));
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    await press(L.accept);
    expect((screen.getByRole("button", { name: L.accept }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: L.decline }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => answer({ ok: false, reason: "ended" }));
  });
});

describe("a press while a failure toast stands", () => {
  it("retires the toast and its Try again, so the failed press cannot run beside the new one", async () => {
    m.redeem.mockRejectedValueOnce(new Error("down"));
    let answer: (v: unknown) => void = () => {};
    m.decline.mockReturnValue(new Promise((r) => { answer = r; }));
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.accept);
    expect(screen.getByRole("button", { name: L.retry })).toBeTruthy();
    await press(L.decline);
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("button", { name: L.retry })).toBeNull();
    expect(m.redeem).toHaveBeenCalledTimes(1);
    await act(async () => answer({ ok: true }));
    act(() => { vi.advanceTimersByTime(520); });
    expect(title()).toBe(L.declinedTitle);
  });
});

describe("Decline", () => {
  it("turns the card back first, then says the request is declined, by the name it kept", async () => {
    m.decline.mockResolvedValue({ ok: true });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.decline);
    expect(turn().dataset.up).toBe("false");
    // A decline's turn starts at once, with no arrival beat.
    expect(turn().dataset.arrival).toBe("false");
    act(() => { vi.advanceTimersByTime(519); });
    expect(title()).toBe(plain(L.openTitle(ANA)));
    act(() => { vi.advanceTimersByTime(1); });
    expect(title()).toBe(L.declinedTitle);
    expect(screen.getByText(plain(L.declinedBody(ANA)))).toBeTruthy();
    // The Decline the reader was on is gone: focus is on the heading that says what happened.
    expect(document.activeElement).toBe(screen.getByRole("heading", { level: 1 }));
    expect(screen.getByRole("link", { name: L.toHome }).getAttribute("href")).toBe("/");
  });

  it("waits only the 120ms cross-fade under reduced motion", async () => {
    m.reduced = true;
    m.decline.mockResolvedValue({ ok: true });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    arrive();
    await press(L.decline);
    act(() => { vi.advanceTimersByTime(119); });
    expect(title()).toBe(plain(L.openTitle(ANA)));
    act(() => { vi.advanceTimersByTime(1); });
    expect(title()).toBe(L.declinedTitle);
  });

  it.each([
    ["ended", L.endedTitle],
    ["self", L.selfTitle],
  ])("redraws a refusal (%s) as what the link now is, never as declined", async (reason, heading) => {
    m.decline.mockResolvedValue({ ok: false, reason });
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
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
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
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
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "self", name: named("Hugh"), commander: null }} />);
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
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "self", name: named("Hugh"), commander: null }} />);
    await press(L.copyLink);
    expect(screen.getByRole("alert").textContent).toContain(L.copyFailed);
  });
});

describe("a long name", () => {
  it("breaks anywhere in the column, so 30 characters with no space stay inside it", () => {
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "open", name: named("W".repeat(30)), commander: null }} />);
    expect(screen.getByRole("region").className).toContain("[overflow-wrap:anywhere]");
    arrive();
    expect(screen.getByText(plain(L.openRules(named("W".repeat(30))))).closest("p")!.className).toContain("[overflow-wrap:anywhere]");
  });
});

describe("landingView", () => {
  const open = (over = {}) => ({
    state: "open" as const, inviterName: ANA, commander: SOL, self: false, alreadyFriends: false, friendsSince: null, ...over,
  });
  it("maps every answer readInvite can give", () => {
    expect(landingView(null)).toEqual({ kind: "ended" });
    expect(landingView({ state: "expired" })).toEqual({ kind: "expired" });
    for (const state of ["redeemed", "declined", "revoked"] as const) expect(landingView({ state })).toEqual({ kind: "ended" });
    expect(landingView(open())).toEqual(OPEN);
    expect(landingView(open({ self: true, alreadyFriends: true }))).toEqual({ kind: "self", name: ANA, commander: SOL });
    expect(landingView(open({ alreadyFriends: true, friendsSince: new Date("2026-10-02T23:30:00Z") })))
      .toEqual({ kind: "friends", name: ANA, commander: SOL, since: new Date("2026-10-02T23:30:00Z") });
  });
});

describe("the column", () => {
  it("lands its heading and buttons with a card that turns, and draws an unturned card's at once", () => {
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={OPEN} />);
    // Held while the card waits face down, however late the page hydrates; timed from the turn's own render.
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("friend-land-wait");
    expect(screen.getByRole("heading", { level: 1 }).className).not.toContain("friend-land-in");
    act(() => { vi.advanceTimersByTime(16); });
    expect(turn().dataset.up).toBe("false");
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("friend-land-wait");
    arrive();
    expect(turn().dataset.up).toBe("true");
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("friend-land-in");
    expect(screen.getByRole("button", { name: L.accept }).parentElement?.className).toContain("friend-land-in");
    cleanup();
    render(<FriendLanding token={TOKEN} nowMs={NOW} view={{ kind: "ended" }} />);
    expect(screen.getByRole("heading", { level: 1 }).className).not.toContain("friend-land-in");
  });
});
