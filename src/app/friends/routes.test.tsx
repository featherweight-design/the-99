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
  redeemInviteAction: vi.fn(),
  declineInviteAction: vi.fn(),
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
  readInvite: m.readInvite, ensureProfile: m.ensureProfile, listOpenInvites: m.listOpenInvites,
}));
vi.mock("../../lib/social/access", () => ({ listFriends: m.listFriends }));
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
});
afterEach(cleanup);

describe("/friends", () => {
  it("is not found while the switch is off for the reader", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    await expect(FriendsPage()).rejects.toThrow("NOT_FOUND");
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_1");
    expect(m.ensureProfile).not.toHaveBeenCalled();
  });

  it("draws with it on, starting a first visit's name from the Clerk first name", async () => {
    render(await FriendsPage());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
    expect(m.ensureProfile).toHaveBeenCalledWith("user_1", "Hugh");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("lets a read that throws reach the error boundary (E16)", async () => {
    m.ensureProfile.mockRejectedValue(new Error("db down"));
    await expect(FriendsPage()).rejects.toThrow("db down");
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
    // Face down and naming nobody: the back alone, and no Create an account (G3).
    expect(screen.getByTestId("friend-card-back")).toBeTruthy();
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

  it("names nobody on a link that has ended", async () => {
    m.readInvite.mockResolvedValue({ state: "revoked" });
    render(await FriendLinkPage({ params: params() }));
    expect(screen.queryByTestId("friend-card-front")).toBeNull();
    expect(screen.queryByText(/Ana/)).toBeNull();
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
