// `/friends` and `/friend/[token]` (Social R1 PR B): not found with the switch off for a signed-in reader
// (E18); the friend link's signed-out card drawn whatever the switches say, reading nothing (E8); and the
// already-friends spend run once after mount, only for an open link from a friend, never by the render (G4).
import { cleanup, render, screen } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: vi.fn(),
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  readInvite: vi.fn(),
  spendFriendLinkAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@clerk/nextjs/server", () => ({ auth: m.auth }));
vi.mock("@clerk/nextjs", () => ({ SignInButton: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../lib/social/friends", () => ({ readInvite: m.readInvite }));
vi.mock("./actions", () => ({ spendFriendLinkAction: m.spendFriendLinkAction }));

import FriendsPage from "./page";
import FriendLinkPage from "../friend/[token]/page";
import { socialCopy } from "../../lib/copy/social";
import { SpendFriendLink } from "../../components/social/spend-friend-link";

const ON = { SOCIAL_FRIENDS_ENABLED: "true" };
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
});
afterEach(cleanup);

describe("/friends", () => {
  it("is not found while the switch is off for the reader", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    await expect(FriendsPage()).rejects.toThrow("NOT_FOUND");
    expect(m.requestSwitchEnv).toHaveBeenCalledWith("user_1");
  });

  it("draws with it on", async () => {
    render(await FriendsPage());
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.page.title);
  });
});

describe("/friend/[token]", () => {
  it("draws a signed-out reader the signed-out card, whatever the switches, and reads nothing", async () => {
    m.auth.mockResolvedValue({ userId: null });
    m.requestSwitchEnv.mockResolvedValue({});
    render(await FriendLinkPage({ params: params() }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(socialCopy.landing.signedOutTitle);
    expect(screen.getByRole("button", { name: socialCopy.landing.signIn })).toBeTruthy();
    expect(m.requestSwitchEnv).not.toHaveBeenCalled();
    expect(m.readInvite).not.toHaveBeenCalled();
  });

  it("is not found for a signed-in reader whose switch is off, before the link is read", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    await expect(FriendLinkPage({ params: params() })).rejects.toThrow("NOT_FOUND");
    expect(m.readInvite).not.toHaveBeenCalled();
  });

  it("spends an open link from a friend after mount, and the render itself spends nothing", async () => {
    m.readInvite.mockResolvedValue(open({ alreadyFriends: true }));
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

  it("reads nothing for a malformed token", async () => {
    render(await FriendLinkPage({ params: params("not-a-token") }));
    expect(m.readInvite).not.toHaveBeenCalled();
  });
});

describe("SpendFriendLink", () => {
  it("spends the link once, under Strict Mode and across re-renders", () => {
    const { rerender } = render(<StrictMode><SpendFriendLink token="t" /></StrictMode>);
    rerender(<StrictMode><SpendFriendLink token="t" /></StrictMode>);
    expect(m.spendFriendLinkAction).toHaveBeenCalledTimes(1);
    expect(m.spendFriendLinkAction).toHaveBeenCalledWith("t");
  });
});
