// `/friends` and `/friend/[token]` (Social R1 PR B): the friend link's signed-out card, reading nothing (E8); and the
// already-friends spend run once after mount, only for an open link from a friend, never by the render (G4).
import { renderToString } from "react-dom/server";
import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  readInvite: vi.fn(),
  spendFriendLinkAction: vi.fn(),
  currentUser: vi.fn(),
  ensureProfile: vi.fn(),
  profileAgeMs: vi.fn(),
  listOpenInvites: vi.fn(),
  listFriends: vi.fn(),
  listPods: vi.fn(),
  listSharedPods: vi.fn(),
  redeemInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
  takeReceipt: vi.fn(),
  pendingReceipt: vi.fn(),
  spendInviteOnSignUp: vi.fn(),
  spendFlyerOnSignUp: vi.fn(),
  resolveSwitchEnv: vi.fn(),
  friendPublicId: vi.fn(),
  after: vi.fn((_fn: () => unknown) => {}),
  loadWaitingOnYou: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => []),
  loadYourRequests: vi.fn(async (..._args: unknown[]): Promise<unknown[]> => []),
  noticeTradeMatches: vi.fn(async (..._args: unknown[]) => 0),
  markFriendsSeen: vi.fn(async (..._args: unknown[]) => false),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: (to: string) => { throw new Error(`REDIRECT:${to}`); },
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth, currentUser: m.currentUser }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: "localhost:3313" }) }));
vi.mock("@clerk/nextjs", () => ({
  SignInButton: ({ children, forceRedirectUrl }: { children: React.ReactNode; forceRedirectUrl?: string }) => (
    <span data-testid="sign-in" data-return={forceRedirectUrl}>{children}</span>
  ),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../lib/social/friends", () => ({
  readInvite: m.readInvite, ensureProfile: m.ensureProfile, profileAgeMs: m.profileAgeMs, friendPublicId: m.friendPublicId,
  loadFriendsAndLinks: async (userId: string, now: Date) => ({ friends: await m.listFriends(userId), links: await m.listOpenInvites(userId, now) }),
}));
vi.mock("../../lib/invites/spend", async (orig) => ({
  ...(await orig<typeof import("../../lib/invites/spend")>()),
  takeReceipt: m.takeReceipt,
  pendingReceipt: m.pendingReceipt,
  spendInviteOnSignUp: m.spendInviteOnSignUp,
}));
vi.mock("../../lib/flyer/spend", () => ({ spendFlyerOnSignUp: m.spendFlyerOnSignUp }));
vi.mock("../../lib/switches/snapshot", () => ({ clearSwitchSnapshot: () => {}, resolveSwitchEnvStrict: m.resolveSwitchEnv }));
vi.mock("../../lib/social/deck-visibility", () => ({ loadFriendDeckPrefs: async () => ({ seeDecks: true, seeUnfinished: false }) }));
vi.mock("../../lib/social/access", () => ({ listFriends: m.listFriends, listPods: m.listPods }));
vi.mock("../../lib/social/spares", () => ({ listSharedPods: m.listSharedPods }));
// Every render reads the invite count.
vi.mock("../../lib/invites/read", async (orig) => ({ ...(await orig<typeof import("../../lib/invites/read")>()), loadInviteCount: async () => null }));
// Every render reads the Rule 0 tables.
vi.mock("../../lib/social/rule-zero", async (orig) => ({ ...(await orig<typeof import("../../lib/social/rule-zero")>()), openTablesFor: async () => [] }));
// Waiting on you and its after() work have their own tests (`waiting.test.ts`, `waiting-on-you.test.tsx`).
vi.mock("../../lib/social/waiting", () => ({ loadWaitingOnYou: m.loadWaitingOnYou }));
vi.mock("../../lib/social/your-requests", () => ({ loadYourRequests: m.loadYourRequests }));
vi.mock("../../lib/social/trade-match", () => ({ noticeTradeMatches: m.noticeTradeMatches }));
vi.mock("../../lib/feed/prefs", () => ({ markFriendsSeen: m.markFriendsSeen }));
vi.mock("next/server", () => ({ after: m.after }));
vi.mock("./actions", () => ({
  spendFriendLinkAction: m.spendFriendLinkAction,
  redeemInviteAction: m.redeemInviteAction,
  declineInviteAction: m.declineInviteAction,
}));

import FriendsPage from "./page";
import FriendLinkPage from "../friend/[token]/page";
import { socialCopy, spareCopy } from "../../lib/copy/social";
import { SpendFriendLink } from "../../components/social/spend-friend-link";
import { named } from "../../lib/person-name/mint";
import { plain } from "../../lib/person-name/testing";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" };
const PUB = "00000000-0000-4000-8000-000000000001";
const DAVE = { publicId: "00000000-0000-4000-8000-000000000002", displayName: named("Dave"), since: new Date("2026-10-02T12:00:00Z"), commander: null };
const query = (q: Record<string, string> = {}) => Promise.resolve(q);
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const params = (token = TOKEN) => Promise.resolve({ token });
const open = (over: Record<string, unknown> = {}) => ({
  state: "open", inviterName: named("Ana"), commander: null, self: false, alreadyFriends: false, friendsSince: null, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_1");
  m.auth.mockResolvedValue({ userId: "user_1" });
  m.requestSwitchEnv.mockResolvedValue(ON);
  m.spendFriendLinkAction.mockResolvedValue({ ok: true, spent: true });
  m.currentUser.mockResolvedValue({ firstName: "Hugh" });
  m.ensureProfile.mockResolvedValue({ publicId: PUB, displayName: "Hugh", commander: null });
  // No profile yet unless a test says otherwise: the page asks Clerk, as it always did.
  m.profileAgeMs.mockResolvedValue(null);
  m.listOpenInvites.mockResolvedValue([]);
  m.listFriends.mockResolvedValue([DAVE]);
  m.listPods.mockResolvedValue([]);
  m.listSharedPods.mockResolvedValue([]);
  m.takeReceipt.mockResolvedValue(null);
  m.pendingReceipt.mockResolvedValue(null);
  m.spendInviteOnSignUp.mockResolvedValue({ spent: false, reason: "unknown" });
  m.spendFlyerOnSignUp.mockResolvedValue({ spent: false, reason: "unknown" });
  m.resolveSwitchEnv.mockResolvedValue(ON);
  m.friendPublicId.mockResolvedValue(null);
});
afterEach(cleanup);

describe("/friends", () => {
  it("draws, starting a first visit's name from the Clerk first name", async () => {
    render(await FriendsPage({ searchParams: query() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    expect(m.ensureProfile).toHaveBeenCalledWith("user_1", "Hugh");
    expect(screen.queryByRole("status")).toBeNull();
  });

  // The Friends badge clears on a visit, AFTER the response, up to the instant the page drew: a trade match noticed
  // in the same after() is newer than that instant and stays unseen for the next render.
  it("reads Waiting on you, then after the response notices trade matches and marks Friends seen at the render's instant", async () => {
    m.after.mockClear();
    m.noticeTradeMatches.mockClear();
    m.markFriendsSeen.mockClear();
    render(await FriendsPage({ searchParams: query() }));
    const [, env, now] = m.loadWaitingOnYou.mock.calls.at(-1)!;
    expect(m.markFriendsSeen).not.toHaveBeenCalled();
    expect(m.after).toHaveBeenCalledTimes(1);
    await m.after.mock.calls[0][0]();
    expect(m.noticeTradeMatches).toHaveBeenCalledWith("user_1", env);
    expect(m.markFriendsSeen).toHaveBeenCalledWith("user_1", env, now);
    expect(m.noticeTradeMatches.mock.invocationCallOrder[0]).toBeLessThan(m.markFriendsSeen.mock.invocationCallOrder[0]);
  });

  // Spare requests PR 3d: one ask seen from both accounts. The holder (Sam) answers it in Waiting on you; the asker
  // (Peter) follows it in Your requests, under Waiting on you; each read is the reader's own, with their own switches.
  it("draws the holder's Waiting on you row and the asker's Your requests, each on their own page", async () => {
    const at = new Date("2026-10-22T10:00:00Z");
    const card = { name: "Lathliss, Dragon Queen", imageUri: null };
    m.requireUserId.mockResolvedValue("user_sam");
    m.loadWaitingOnYou.mockResolvedValue([{
      key: "req-1", kind: "spare-request", createdAt: at, unseen: true,
      ask: { id: "req-1", oracleId: "lathliss", card, copies: 1, deckName: "Dragons of Tarkir", spare: 2,
        asker: { publicId: "pub-peter", displayName: "Peter", commander: null }, createdAt: at, daysLeft: 13 },
    }]);
    m.loadYourRequests.mockResolvedValue([]);
    const sam = render(await FriendsPage({ searchParams: query() }));
    expect(m.loadWaitingOnYou).toHaveBeenLastCalledWith("user_sam", ON, expect.any(Date));
    expect(m.loadYourRequests).toHaveBeenLastCalledWith("user_sam", ON, expect.any(Date));
    expect(screen.getByTestId("waiting-on-you")).toBeTruthy();
    expect(screen.getByRole("button", { name: plain(spareCopy.request.yesAria("Peter", card.name)) })).toBeTruthy();
    expect(screen.queryByTestId("your-requests")).toBeNull();
    sam.unmount();

    m.requireUserId.mockResolvedValue("user_peter");
    m.loadWaitingOnYou.mockResolvedValue([]);
    m.loadYourRequests.mockResolvedValue([{
      id: "req-1", oracleId: "lathliss", card, copies: 1, deckName: "Dragons of Tarkir", deckId: "deck-1",
      holder: { publicId: "pub-sam", displayName: "Sam", commander: null }, state: "open", daysLeft: 13,
      createdAt: at, answeredAt: null, unseen: false, othersWithSpare: [],
    }]);
    render(await FriendsPage({ searchParams: query() }));
    expect(m.loadYourRequests).toHaveBeenLastCalledWith("user_peter", ON, expect.any(Date));
    expect(screen.queryByTestId("waiting-on-you")).toBeNull();
    const mine = screen.getByTestId("your-requests");
    expect(mine.textContent).toContain(plain(spareCopy.request.mine.asked("Sam", card.name)));
    expect(mine.textContent).toContain("For Dragons of Tarkir · 13 days left");
  });

  it("draws the receipt after Accept for a friend the reader has, by public id (E10)", async () => {
    render(await FriendsPage({ searchParams: query({ accepted: DAVE.publicId }) }));
    expect(screen.getByRole("status").textContent).toContain(plain(socialCopy.page.accepted("Dave")));
  });

  it("draws no receipt for an id that is not the reader's friend", async () => {
    render(await FriendsPage({ searchParams: query({ accepted: "00000000-0000-4000-8000-000000000009" }) }));
    expect(screen.queryByText(plain(socialCopy.page.accepted("Dave")))).toBeNull();
  });

  describe("a newcomer's first arrival (invites R8, ruling D)", () => {
    const RES = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

    it("runs the spend when the account's own invitation names a reservation, with its first name", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      await FriendsPage({ searchParams: query() });
      expect(m.spendInviteOnSignUp).toHaveBeenCalledWith("user_1", RES, "Ana");
    });

    it("falls back to the flyer spend for an id the personal spend does not know, and not for one it does", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      await FriendsPage({ searchParams: query() });
      expect(m.spendFlyerOnSignUp).toHaveBeenCalledWith("user_1", RES, "Ana");
      m.spendFlyerOnSignUp.mockClear();
      m.spendInviteOnSignUp.mockResolvedValue({ spent: true });
      await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("REDIRECT:/friends");
      expect(m.spendFlyerOnSignUp).not.toHaveBeenCalled();
    });

    it("recovers a flyer sign-up, reads the switches again, and redirects so the shell re-snapshots", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      m.spendFlyerOnSignUp.mockResolvedValue({ spent: true });
      await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("REDIRECT:/friends");
      expect(m.resolveSwitchEnv).toHaveBeenCalledWith("user_1");
    });

    it("reads the switches again when the recovery reports already (a webhook committed the group), without a redirect", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      m.spendFlyerOnSignUp.mockResolvedValue({ spent: false, reason: "already" });
      render(await FriendsPage({ searchParams: query() }));
      expect(m.resolveSwitchEnv).toHaveBeenCalledWith("user_1");
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    });

    it("does not render Friends when the fresh switch read fails after a recovery (no fall back to environment defaults)", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      m.spendFlyerOnSignUp.mockResolvedValue({ spent: false, reason: "already" });
      m.resolveSwitchEnv.mockRejectedValue(new Error("switch read failed"));
      await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("switch read failed");
    });

    it("draws without reading the switches again when the recovery spent nothing", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      render(await FriendsPage({ searchParams: query() }));
      expect(m.resolveSwitchEnv).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    });

    it("a MISSING or YOUNG profile still asks Clerk and still runs the invite spend", async () => {
      for (const age of [null, 0, 5 * 60_000, 14 * 60_000]) {
        m.currentUser.mockClear();
        m.spendInviteOnSignUp.mockClear();
        m.profileAgeMs.mockResolvedValue(age);
        m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
        await FriendsPage({ searchParams: query() });
        expect(m.currentUser, `age ${age}`).toHaveBeenCalledTimes(1);
        expect(m.spendInviteOnSignUp, `age ${age}`).toHaveBeenCalledWith("user_1", RES, "Ana");
        expect(m.ensureProfile).toHaveBeenLastCalledWith("user_1", "Ana");
      }
    });

    it("a profile older than the newcomer window skips the Clerk Backend call, and with it the spend", async () => {
      m.profileAgeMs.mockResolvedValue(16 * 60_000);
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      render(await FriendsPage({ searchParams: query() }));
      expect(m.currentUser).not.toHaveBeenCalled();
      expect(m.spendInviteOnSignUp).not.toHaveBeenCalled();
      expect(m.spendFlyerOnSignUp).not.toHaveBeenCalled();
      // The stored profile is read as always; no name is offered because none is needed.
      expect(m.ensureProfile).toHaveBeenCalledWith("user_1", undefined);
      expect(screen.getByText(plain(DAVE.displayName))).toBeTruthy();
    });

    it("spends nothing for an account with no reservation, or a forged-looking one", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: "not-a-uuid" } });
      await FriendsPage({ searchParams: query() });
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: {} });
      await FriendsPage({ searchParams: query() });
      expect(m.spendInviteOnSignUp).not.toHaveBeenCalled();
    });

    it("draws the receipt naming the inviter from the edge, with no ?accepted= in the URL", async () => {
      m.pendingReceipt.mockResolvedValue("user_inviter");
      m.takeReceipt.mockResolvedValue("user_inviter");
      m.friendPublicId.mockResolvedValue(DAVE.publicId);
      render(await FriendsPage({ searchParams: query() }));
      expect(m.friendPublicId).toHaveBeenCalledWith("user_1", "user_inviter");
      expect(m.takeReceipt).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("status").textContent).toContain(plain(socialCopy.page.accepted("Dave")));
    });

    it("does not consume the receipt when a read the page needs throws, so the retry still draws it", async () => {
      m.listFriends.mockRejectedValue(new Error("db down"));
      await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("db down");
      expect(m.takeReceipt).not.toHaveBeenCalled();
    });

    it("draws no band when another render consumed the receipt first (takeReceipt answers null)", async () => {
      m.pendingReceipt.mockResolvedValue("user_inviter");
      m.takeReceipt.mockResolvedValue(null);
      m.friendPublicId.mockResolvedValue(DAVE.publicId);
      render(await FriendsPage({ searchParams: query() }));
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("does not consume the receipt when the inviter lookup itself throws, so the retry still draws it", async () => {
      m.pendingReceipt.mockResolvedValue("user_inviter");
      m.friendPublicId.mockRejectedValue(new Error("db down"));
      await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("db down");
      expect(m.takeReceipt).not.toHaveBeenCalled();
    });

    it("draws no receipt once the edge has shown it (nothing pending)", async () => {
      render(await FriendsPage({ searchParams: query() }));
      expect(m.friendPublicId).not.toHaveBeenCalled();
      expect(screen.queryByRole("status")).toBeNull();
    });
  });

  it("lets a read that throws reach the error boundary (E16)", async () => {
    m.listFriends.mockRejectedValue(new Error("db down"));
    await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("db down");
  });
});

describe("/friend/[token]", () => {
  it("draws a signed-out reader the signed-out card, and reads nothing", async () => {
    m.auth.mockResolvedValue({ userId: null });
    render(await FriendLinkPage({ params: params() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.landing.signedOutTitle);
    expect(screen.getByRole("button", { name: socialCopy.landing.signIn })).toBeTruthy();
    expect(screen.getByText(socialCopy.landing.signedOutFine)).toBeTruthy();
    // L1 as the board draws it: --fg-muted, 1.6 leading, and `.fine`'s margin 4px 0 0 ON TOP of `.col`'s gap (8px phone,
    // 10px desktop), since the fine line is a flex child of the column.
    expect(screen.getByText(socialCopy.landing.signedOutFine).className).toContain("text-[color:var(--fg-muted)]");
    expect(screen.getByText(socialCopy.landing.signedOutFine).className).toMatch(/(^|\s)mt-\[4px\]/);
    // Face down and naming nobody: the back alone, and no Create an account (G3).
    expect(screen.getByTestId("friend-card-back")).toBeTruthy();
    // Signed out, the shell draws no <main>, so the page is its own.
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    expect(screen.queryByText(/create an account/i)).toBeNull();
    // Signing in comes back to this link, so the card turns over for them.
    expect(screen.getByTestId("sign-in").dataset.return).toBe(`/friend/${TOKEN}`);
    expect(m.readInvite).not.toHaveBeenCalled();
  });

  it("spends an open link from a friend after mount, and the render itself spends nothing", async () => {
    m.readInvite.mockResolvedValue(open({ alreadyFriends: true, friendsSince: new Date("2026-10-02T12:00:00Z") }));
    const page = await FriendLinkPage({ params: params() });
    expect(m.spendFriendLinkAction).not.toHaveBeenCalled();
    render(page);
    expect(m.readInvite).toHaveBeenCalledWith("user_1", TOKEN);
    expect(m.spendFriendLinkAction).toHaveBeenCalledWith(TOKEN);
  });

  it.each([
    ["a stranger's open link", open()],
    ["your own link", open({ self: true, alreadyFriends: true })],
    ["an ended link", { state: "declined" }],
    ["no link", null],
  ])("mounts no spend for %s", async (_n, view) => {
    m.readInvite.mockResolvedValue(view);
    render(await FriendLinkPage({ params: params() }));
    expect(m.spendFriendLinkAction).not.toHaveBeenCalled();
  });

  it("reads nothing for a malformed token, and draws it as a link that no longer works", async () => {
    render(await FriendLinkPage({ params: params("not-a-token") }));
    expect(m.readInvite).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.landing.endedTitle);
  });

  const L = socialCopy.landing;
  it.each([
    ["an open link", open(), plain(L.openTitle(named("Ana")))],
    ["your own link", open({ self: true }), L.selfTitle],
    ["a friend's link", open({ alreadyFriends: true, friendsSince: new Date("2026-10-02T12:00:00Z") }), plain(L.alreadyTitle(named("Ana")))],
    ["an expired link", { state: "expired" }, L.expiredTitle],
    ["a redeemed link", { state: "redeemed" }, L.endedTitle],
    ["a declined link", { state: "declined" }, L.endedTitle],
    ["a revoked link", { state: "revoked" }, L.endedTitle],
    ["no link", null, L.endedTitle],
  ])("draws %s as its own card", async (_n, view, title) => {
    m.readInvite.mockResolvedValue(view);
    render(await FriendLinkPage({ params: params() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(title);
  });

  // The name is stripped before it reaches the page (`shapeInvite`, tested in friends.test.ts); this holds the card.
  it("draws a link that has ended face down, with no front to turn", async () => {
    m.readInvite.mockResolvedValue({ state: "revoked" });
    render(await FriendLinkPage({ params: params() }));
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
  });
});

describe("SpendFriendLink", () => {
  it("spends nothing from a render: renderToString runs the render and no effect", () => {
    renderToString(<SpendFriendLink token="t" />);
    expect(m.spendFriendLinkAction).not.toHaveBeenCalled();
  });

  it("spends the link once, under Strict Mode and across re-renders", () => {
    const { rerender } = render(<StrictMode><SpendFriendLink token="t" /></StrictMode>);
    rerender(<StrictMode><SpendFriendLink token="t" /></StrictMode>);
    expect(m.spendFriendLinkAction).toHaveBeenCalledTimes(1);
    expect(m.spendFriendLinkAction).toHaveBeenCalledWith("t");
  });
});
