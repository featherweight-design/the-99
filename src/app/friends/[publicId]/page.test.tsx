// A friend's page (Social R2 P2, P3; G9, decision 10): not found unless BOTH the friends and the wishlist switches are
// on for the reader and the id is a current friend; Round 1's head with the row's … menu; the wishlist as tiles
// reading `wants N`, never an owned count; the empty state; and a removal from here leaves for `/friends`.
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  loadFriend: vi.fn(),
  loadFriendWishlist: vi.fn(),
  unfriendAction: vi.fn(),
  replace: vi.fn(),
  openCard: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ replace: m.replace, push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../lib/social/access", () => ({ loadFriend: m.loadFriend }));
vi.mock("../../../lib/social/wishlist", () => ({ loadFriendWishlist: m.loadFriendWishlist }));
vi.mock("../actions", () => ({ unfriendAction: m.unfriendAction }));
// Card details is its own surface, tested on its own: here a tile only has to be the press that opens it, for its card.
vi.mock("../../../components/cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  CardDetailTrigger: ({ oracleId, name, siblings, children }: { oracleId: string; name: string; siblings: unknown; children: React.ReactNode }) => (
    <button type="button" aria-label={name} onClick={() => m.openCard(oracleId, siblings)}>
      {children}
    </button>
  ),
}));

import FriendWishlistPage from "./page";
import { FriendPage } from "../../../components/social/friend-page";
import { socialCopy } from "../../../lib/copy/social";

const p = socialCopy.friendPage;
const BOTH = { SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" };
const COLIN = {
  publicId: "00000000-0000-4000-8000-000000000002", displayName: "Colin", since: new Date("2026-10-02T12:00:00Z"),
  commander: { oracleId: "00000000-0000-4000-8000-0000000000aa", name: "Sai, Master Thopterist", artCropUri: null },
};
const LINE = {
  oracleId: "00000000-0000-4000-8000-0000000000b1", quantity: 2, name: "Rhystic Study",
  imageUri: "https://cards.example/rhystic.jpg", layout: "normal", backImageUri: null,
};
const params = (publicId = COLIN.publicId) => Promise.resolve({ publicId });

beforeEach(() => {
  m.requireUserId.mockResolvedValue("user_viewer");
  m.requestSwitchEnv.mockResolvedValue(BOTH);
  m.loadFriend.mockResolvedValue(COLIN);
  m.loadFriendWishlist.mockResolvedValue([LINE]);
  m.unfriendAction.mockReset();
  m.replace.mockReset();
});
afterEach(cleanup);

describe("/friends/[publicId]", () => {
  it.each([
    ["the friends switch is off", { SOCIAL_WISHLIST_ENABLED: "true" }],
    ["the wishlist switch is off", { SOCIAL_FRIENDS_ENABLED: "true" }],
  ])("is not found when %s, reading nothing", async (_label, env) => {
    m.requestSwitchEnv.mockResolvedValue(env);
    await expect(FriendWishlistPage({ params: params() })).rejects.toThrow("NOT_FOUND");
    expect(m.loadFriend).not.toHaveBeenCalled();
    expect(m.loadFriendWishlist).not.toHaveBeenCalled();
  });

  it("is not found for anyone who is not the reader's friend (decision 10)", async () => {
    m.loadFriend.mockResolvedValue(null);
    await expect(FriendWishlistPage({ params: params() })).rejects.toThrow("NOT_FOUND");
    expect(m.loadFriend).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });

  it("reads the friend and their wishlist through the reader's own id", async () => {
    const page = await FriendWishlistPage({ params: params() });
    expect(renderToString(page)).toContain("Rhystic Study");
    expect(m.loadFriendWishlist).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });
});

describe("FriendPage", () => {
  const draw = (lines = [LINE]) => render(<FriendPage friend={COLIN} lines={lines} nowMs={Date.parse("2026-10-15T12:00:00Z")} />);

  it("draws Round 1's head: back link, name, since and their commander", () => {
    draw();
    expect(screen.getByRole("link", { name: p.back }).getAttribute("href")).toBe("/friends");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Colin");
    expect(screen.getByText("Friend since Oct 2 · Sai, Master Thopterist")).toBeTruthy();
    expect(screen.getByRole("button", { name: socialCopy.friends.menuAria("Colin") })).toBeTruthy();
  });

  it("heads the wishlist with its count and view only, and captions a tile `wants N`, never an owned count", () => {
    draw();
    const head = screen.getByRole("heading", { level: 2 });
    expect(head.textContent).toBe(`${p.head("Colin")}1${p.viewOnly}`);
    const tile = screen.getByRole("listitem");
    expect(within(tile).getByText("Rhystic Study")).toBeTruthy();
    expect(within(tile).getByTestId("wishlist-tile-caption").textContent).toBe("wants 2");
    expect(tile.textContent).not.toMatch(/have|owned|collected/);
  });

  it("opens card details from a press on a tile, view only with no stepper", () => {
    draw();
    const tile = screen.getByRole("listitem");
    fireEvent.click(within(tile).getByRole("button", { name: "Rhystic Study" }));
    expect(m.openCard).toHaveBeenCalledWith(LINE.oracleId, [{ oracleId: LINE.oracleId, name: "Rhystic Study", imageUri: LINE.imageUri }]);
    // The Wishlist tab's own face, and nothing to change a count with.
    expect(within(tile).queryByRole("button", { name: /want one/i })).toBeNull();
    expect(within(tile).getAllByRole("button")).toHaveLength(1);
  });

  it("draws the empty state with no tiles", () => {
    draw([]);
    expect(screen.getByText(p.emptyTitle("Colin"))).toBeTruthy();
    expect(screen.getByText(p.emptyBody("Colin"))).toBeTruthy();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("0");
  });

  it("leaves for /friends once the removal lands", async () => {
    m.unfriendAction.mockResolvedValue({ ok: true });
    draw();
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.menuAria("Colin") }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: socialCopy.friends.removeConfirm }).at(-1)!); });
    expect(m.unfriendAction).toHaveBeenCalledWith(COLIN.publicId);
    expect(m.replace).toHaveBeenCalledWith("/friends");
  });

  it("stays, with the list's toast, when the removal fails", async () => {
    m.unfriendAction.mockResolvedValue({ ok: false, reason: "off" });
    draw();
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.menuAria("Colin") }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: socialCopy.friends.removeConfirm }).at(-1)!); });
    expect(m.replace).not.toHaveBeenCalled();
    expect(screen.getByText(socialCopy.friends.removeFailed)).toBeTruthy();
  });
});
