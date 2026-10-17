// `/friends` and `/friend/[token]` (Social R1 PR B): not found with the switch off for a signed-in reader
// (E18); the friend link's signed-out card drawn whatever the switches say, reading nothing (E8); and the
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
  listOpenInvites: vi.fn(),
  listFriends: vi.fn(),
  listPods: vi.fn(),
  listSharedPods: vi.fn(),
  redeemInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
  takeReceipt: vi.fn(),
  pendingReceipt: vi.fn(),
  spendInviteOnSignUp: vi.fn(),
  friendPublicId: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
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
  readInvite: m.readInvite, ensureProfile: m.ensureProfile, friendPublicId: m.friendPublicId,
  loadFriendsAndLinks: async (userId: string, now: Date) => ({ friends: await m.listFriends(userId), links: await m.listOpenInvites(userId, now) }),
}));
vi.mock("../../lib/invites/spend", async (orig) => ({
  ...(await orig<typeof import("../../lib/invites/spend")>()),
  takeReceipt: m.takeReceipt,
  pendingReceipt: m.pendingReceipt,
  spendInviteOnSignUp: m.spendInviteOnSignUp,
}));
vi.mock("../../lib/social/access", () => ({ listFriends: m.listFriends, listPods: m.listPods }));
vi.mock("../../lib/social/spares", () => ({ listSharedPods: m.listSharedPods }));
vi.mock("./actions", () => ({
  spendFriendLinkAction: m.spendFriendLinkAction,
  redeemInviteAction: m.redeemInviteAction,
  declineInviteAction: m.declineInviteAction,
}));

import FriendsPage from "./page";
import FriendLinkPage from "../friend/[token]/page";
import { socialCopy } from "../../lib/copy/social";
import { SpendFriendLink } from "../../components/social/spend-friend-link";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" };
const PUB = "00000000-0000-4000-8000-000000000001";
const DAVE = { publicId: "00000000-0000-4000-8000-000000000002", displayName: "Dave", since: new Date("2026-10-02T12:00:00Z"), commander: null };
const query = (q: Record<string, string> = {}) => Promise.resolve(q);
const TOKEN = "AbCdEfGhIjKlMnOpQrStUv";
const params = (token = TOKEN) => Promise.resolve({ token });
const open = (over: Record<string, unknown> = {}) => ({
  state: "open", inviterName: "Ana", commander: null, self: false, alreadyFriends: false, friendsSince: null, ...over,
});

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_1");
  m.auth.mockResolvedValue({ userId: "user_1" });
  m.requestSwitchEnv.mockResolvedValue(ON);
  m.spendFriendLinkAction.mockResolvedValue({ ok: true, spent: true });
  m.currentUser.mockResolvedValue({ firstName: "Hugh" });
  m.ensureProfile.mockResolvedValue({ publicId: PUB, displayName: "Hugh", commander: null });
  m.listOpenInvites.mockResolvedValue([]);
  m.listFriends.mockResolvedValue([DAVE]);
  m.listPods.mockResolvedValue([]);
  m.listSharedPods.mockResolvedValue([]);
  m.takeReceipt.mockResolvedValue(null);
  m.pendingReceipt.mockResolvedValue(null);
  m.spendInviteOnSignUp.mockResolvedValue({ spent: false, reason: "unknown" });
  m.friendPublicId.mockResolvedValue(null);
});
afterEach(cleanup);

describe("/friends", () => {
  it("is not found while the switch is off for the reader", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    await expect(FriendsPage({ searchParams: query() })).rejects.toThrow("NOT_FOUND");
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect(m.ensureProfile).not.toHaveBeenCalled();
  });

  it("draws with it on, starting a first visit's name from the Clerk first name", async () => {
    render(await FriendsPage({ searchParams: query() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    expect(m.ensureProfile).toHaveBeenCalledWith("user_1", "Hugh");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("draws the receipt after Accept for a friend the reader has, by public id (E10)", async () => {
    render(await FriendsPage({ searchParams: query({ accepted: DAVE.publicId }) }));
    expect(screen.getByRole("status").textContent).toContain(socialCopy.page.accepted("Dave"));
  });

  it("draws no receipt for an id that is not the reader's friend", async () => {
    render(await FriendsPage({ searchParams: query({ accepted: "00000000-0000-4000-8000-000000000009" }) }));
    expect(screen.queryByText(socialCopy.page.accepted("Dave"))).toBeNull();
  });

  describe("a newcomer's first arrival (invites R8, ruling D)", () => {
    const RES = "0b3f2c9e-6a41-4d8e-9c53-1f0a7e2d4b68";

    it("runs the spend when the account's own invitation names a reservation, with its first name", async () => {
      m.currentUser.mockResolvedValue({ firstName: "Ana", publicMetadata: { inviteReservation: RES } });
      await FriendsPage({ searchParams: query() });
      expect(m.spendInviteOnSignUp).toHaveBeenCalledWith("user_1", RES, "Ana");
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
      expect(screen.getByRole("status").textContent).toContain(socialCopy.page.accepted("Dave"));
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
  it("draws a signed-out reader the signed-out card, whatever the switches, and reads nothing", async () => {
    m.auth.mockResolvedValue({ userId: null });
    m.requestSwitchEnv.mockResolvedValue({});
    render(await FriendLinkPage({ params: params() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.landing.signedOutTitle);
    expect(screen.getByRole("button", { name: socialCopy.landing.signIn })).toBeTruthy();
    expect(screen.getByText(socialCopy.landing.signedOutFine)).toBeTruthy();
    // L1 as the board draws it: --fg-muted, 1.6 leading, 4px under the buttons (measured on the rendered board).
    expect(screen.getByText(socialCopy.landing.signedOutFine).className).toContain("text-[color:var(--fg-muted)]");
    expect(screen.getByText(socialCopy.landing.signedOutFine).className).toContain("-mt-[4px]"); // the section's 8px gap, offset to the board's 4px
    // Face down and naming nobody: the back alone, and no Create an account (G3).
    expect(screen.getByTestId("friend-card-back")).toBeTruthy();
    // Signed out, the shell draws no <main>, so the page is its own.
    expect(screen.getByRole("main")).toBeTruthy();
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    expect(screen.queryByText(/create an account/i)).toBeNull();
    // Signing in comes back to this link, so the card turns over for them.
    expect(screen.getByTestId("sign-in").dataset.return).toBe(`/friend/${TOKEN}`);
    expect(m.requestSwitchEnv).not.toHaveBeenCalled();
    expect(m.readInvite).not.toHaveBeenCalled();
  });

  it("is not found for a signed-in reader whose switch is off, before the link is read", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    await expect(FriendLinkPage({ params: params() })).rejects.toThrow("NOT_FOUND");
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
    ["an open link", open(), L.openTitle("Ana")],
    ["your own link", open({ self: true }), L.selfTitle],
    ["a friend's link", open({ alreadyFriends: true, friendsSince: new Date("2026-10-02T12:00:00Z") }), L.alreadyTitle("Ana")],
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
