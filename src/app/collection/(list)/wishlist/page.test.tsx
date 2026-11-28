import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// /collection/wishlist: the view gets plain props (ISO dates) and a friends line only when the reader has a friend.
const m = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
  loadWishlistTiles: vi.fn(),
  loadCollectedNotices: vi.fn(),
  listFriends: vi.fn(),
  readerStoreForPage: vi.fn(),
  loadWishlistTabExtras: vi.fn(),
}));
vi.mock("next/navigation", () => ({ notFound: m.notFound }));
vi.mock("../../../../lib/auth", () => ({ requireUserId: async () => "u1" }));
vi.mock("../../../../lib/flags/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestFlags: async () => ENV_VIEW };
});
vi.mock("../../../../lib/wishlist/wishlist", () => ({ loadWishlistTiles: m.loadWishlistTiles }));
vi.mock("../../../../lib/wishlist/collected", () => ({ loadCollectedNotices: m.loadCollectedNotices }));
vi.mock("../../../../lib/social/access", () => ({ listFriends: m.listFriends }));
vi.mock("../../../../lib/stores/preference", () => ({ readerStoreForPage: m.readerStoreForPage }));
vi.mock("../../../../lib/wishlist/offer", () => ({ loadWishlistTabExtras: m.loadWishlistTabExtras }));
vi.mock("../../../../components/wishlist/wishlist-view", () => ({ WishlistView: () => null }));

import WishlistPage from "./page";

const CARD = "11111111-1111-4111-8111-111111111111";
const AT = "2026-10-15T12:00:00.000Z";

beforeEach(() => {
  vi.clearAllMocks();
  m.loadWishlistTiles.mockResolvedValue({
    tiles: [{ oracleId: CARD, quantity: 2, owned: 1, addedAt: new Date(AT), name: "Sol Ring", imageUri: "https://img", layout: "normal", backImageUri: null, price: null }],
    newestAsOf: null,
  });
  m.loadCollectedNotices.mockResolvedValue([{ oracleId: CARD, name: "Sol Ring", quantity: 2, collectedAt: new Date(AT) }]);
  m.listFriends.mockResolvedValue([{ publicId: "p1" }]);
  m.readerStoreForPage.mockResolvedValue("manapool");
  m.loadWishlistTabExtras.mockResolvedValue({ decks: null, offer: 0 });
});
afterEach(() => vi.unstubAllEnvs());

const page = (query: Record<string, string> = {}) => WishlistPage({ searchParams: Promise.resolve(query) });
// The page draws the landing's mount beside the view (discovery R2·3): the view is the fragment's last child.
const view = async (query: Record<string, string> = {}) => {
  const children = ((await page(query)) as ReactElement<{ children: ReactElement<Record<string, unknown>>[] }>).props.children;
  return children[children.length - 1];
};
const props = async () => (await view()).props;

describe("/collection/wishlist", () => {
  it("prices the tiles in the reader's store", async () => {
    m.readerStoreForPage.mockResolvedValueOnce("cardkingdom");
    await props();
    expect(m.loadWishlistTiles).toHaveBeenCalledWith("u1", "cardkingdom");
  });

  it("hands the view plain props, with dates as ISO strings", async () => {
    expect(await props()).toEqual({
      tiles: [{ oracleId: CARD, name: "Sol Ring", imageUri: "https://img", want: 2, have: 1, addedAt: AT, line: null, price: null }],
      notices: [{ oracleId: CARD, name: "Sol Ring", collectedAt: AT }],
      hasFriend: true,
      newestAsOf: null,
      decks: null,
      offer: 0,
    });
  });

  it("says no friend without one", async () => {
    m.listFriends.mockResolvedValue([]);
    expect((await props()).hasFriend).toBe(false);
    expect(m.listFriends).toHaveBeenCalledWith("u1");
  });

  it("says no friend when the friends read fails, and still draws the list", async () => {
    m.listFriends.mockRejectedValue(new Error("down"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const got = await props();
    warn.mockRestore();
    expect(got.hasFriend).toBe(false);
    expect(got.tiles).toHaveLength(1);
  });
});
