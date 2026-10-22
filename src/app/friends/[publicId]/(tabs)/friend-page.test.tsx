// A friend's page (Social R2 P2, P3; G9, decision 10; menu and Home PR 7): not found unless the friends switch is on for
// the reader and the id is a current friend (the Wishlist tab alone follows the wishlist switch); the head with the
// row's … menu; the wishlist as tiles
// reading `wants N`, never an owned count; the empty state; and a removal from here leaves for `/friends`.
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  loadFriend: vi.fn(),
  loadFriendWishlist: vi.fn(),
  loadFriendSpareList: vi.fn(),
  loadFriendDecks: vi.fn(),
  pathname: "/friends/00000000-0000-4000-8000-000000000002",
  unfriendAction: vi.fn(),
  replace: vi.fn(),
  openCard: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => m.pathname,
  notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ replace: m.replace, push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../../../lib/social/access", () => ({ loadFriend: m.loadFriend }));
vi.mock("../../../../lib/social/wishlist", () => ({ loadFriendWishlist: m.loadFriendWishlist }));
vi.mock("../../../../lib/social/spares", () => ({ loadFriendSpareList: m.loadFriendSpareList }));
vi.mock("../../../../lib/social/decks", () => ({ loadFriendDecks: m.loadFriendDecks }));
vi.mock("../../../../components/shell/pending-reporter", () => ({ PendingReporter: () => null }));
vi.mock("../../actions", () => ({ unfriendAction: m.unfriendAction }));
// Card details is its own surface, tested on its own: here a tile only has to be the press that opens it, for its card.
vi.mock("../../../../components/cards/card-detail-provider", () => ({
  CardDetailProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  cardDetailCopy: { triggerAria: (name: string) => `View details for ${name}` },
  CardDetailTrigger: ({ oracleId, name, ariaLabel, siblings, children }: { oracleId: string; name: string; ariaLabel?: string; siblings: unknown; children: React.ReactNode }) => (
    <button type="button" aria-label={ariaLabel ?? name} onClick={() => m.openCard(oracleId, siblings)}>
      {children}
    </button>
  ),
}));

import FriendPageLayout from "./layout";
import FriendSparesPage from "./page";
import FriendWishlistPage from "./wishlist/page";
import FriendDecksPage from "./decks/page";
import { FriendHead } from "../../../../components/social/friend-head";
import { FriendWishlist } from "../../../../components/social/friend-wishlist";
import { socialCopy } from "../../../../lib/copy/social";

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
  m.pathname = `/friends/${COLIN.publicId}`;
  m.loadFriend.mockResolvedValue(COLIN);
  m.loadFriendWishlist.mockResolvedValue([LINE]);
  m.unfriendAction.mockReset();
  m.replace.mockReset();
});
afterEach(cleanup);

const DECK = { id: null as string | null, name: "Thopter Factory", commanderName: "Sai, Master Thopterist", partnerName: null, colorIdentity: ["U"], artCropUri: null, status: "To buy", built: 99, bodySize: 99, toBuy: 8 };
const SPARE = { oracleId: "00000000-0000-4000-8000-0000000000c1", name: "Ghalta, Primal Hunger", imageUri: null, spare: 2, onWishlist: true };

describe("a friend's page group", () => {
  beforeEach(() => {
    m.loadFriendSpareList.mockResolvedValue({ pods: ["Thursday pod"], lines: [SPARE, { ...SPARE, oracleId: "00000000-0000-4000-8000-0000000000c2", name: "Sol Ring", spare: 1, onWishlist: false }], wishlist: true });
    m.loadFriendDecks.mockResolvedValue([DECK]);
  });

  it.each([
    ["the friends switch is off", { SOCIAL_WISHLIST_ENABLED: "true" }],
  ])("is not found when %s, reading nothing", async (_label, env) => {
    m.requestSwitchEnv.mockResolvedValue(env);
    await expect(FriendPageLayout({ children: null, params: params() })).rejects.toThrow("NOT_FOUND");
    expect(m.loadFriend).not.toHaveBeenCalled();
    expect(m.loadFriendSpareList).not.toHaveBeenCalled();
    expect(m.loadFriendDecks).not.toHaveBeenCalled();
  });

  // A tab press reuses the mounted layout, which does not run again: each tab answers the switch and the friend itself.
  it.each([
    ["Spares", () => FriendSparesPage({ params: params() })],
    ["Wishlist", () => FriendWishlistPage({ params: params() })],
    ["Decks", () => FriendDecksPage({ params: params() })],
  ])("the %s tab is not found on its own with the friends switch off, reading nothing", async (_tab, page) => {
    m.requestSwitchEnv.mockResolvedValue({ SOCIAL_WISHLIST_ENABLED: "true" });
    await expect(page()).rejects.toThrow("NOT_FOUND");
    expect(m.loadFriend).not.toHaveBeenCalled();
    expect(m.loadFriendSpareList).not.toHaveBeenCalled();
    expect(m.loadFriendWishlist).not.toHaveBeenCalled();
    expect(m.loadFriendDecks).not.toHaveBeenCalled();
  });

  it("the Spares tab is not found on its own for a former friend, never the not-sharing state", async () => {
    m.loadFriend.mockResolvedValue(null);
    m.loadFriendSpareList.mockResolvedValue(null);
    await expect(FriendSparesPage({ params: params() })).rejects.toThrow("NOT_FOUND");
  });

  it("is not found for anyone who is not the reader's friend (decision 10)", async () => {
    m.loadFriend.mockResolvedValue(null);
    await expect(FriendPageLayout({ children: null, params: params() })).rejects.toThrow("NOT_FOUND");
    expect(m.loadFriend).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });

  it("draws the head and the strip with each tab's figure, through the reader's own id", async () => {
    const html = renderToString(await FriendPageLayout({ children: <p>tab</p>, params: params() }));
    expect(html).toContain("Colin");
    expect(html).toContain(`href="/friends/${COLIN.publicId}"`);
    expect(html).toContain(`href="/friends/${COLIN.publicId}/wishlist"`);
    expect(html).toContain(`href="/friends/${COLIN.publicId}/decks"`);
    expect(html).toMatch(/data-testid="friend-tab-spares-count"[^>]*>2</);
    expect(html).toMatch(/data-testid="friend-tab-wishlist-count"[^>]*>1</);
    expect(html).toMatch(/data-testid="friend-tab-decks-count"[^>]*>1</);
    expect(html).toContain("<p>tab</p>");
    expect(m.loadFriendDecks).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });

  it("leaves the Wishlist tab out, and never reads it, while its switch is off", async () => {
    m.requestSwitchEnv.mockResolvedValue({ SOCIAL_FRIENDS_ENABLED: "true" });
    m.loadFriendWishlist.mockClear();
    const html = renderToString(await FriendPageLayout({ children: null, params: params() }));
    expect(html).not.toContain("/wishlist");
    expect(m.loadFriendWishlist).not.toHaveBeenCalled();
    await expect(FriendWishlistPage({ params: params() })).rejects.toThrow("NOT_FOUND");
  });

  it("marks the tab the path names", async () => {
    m.pathname = `/friends/${COLIN.publicId}/decks`;
    try {
      const html = renderToString(await FriendPageLayout({ children: null, params: params() }));
      expect(html).toMatch(/aria-current="page"[^>]*data-testid="friend-tab-decks"/);
    } finally {
      m.pathname = `/friends/${COLIN.publicId}`;
    }
  });

  it("draws the wishlist tab through the friend's wishlist", async () => {
    const page = await FriendWishlistPage({ params: params() });
    expect(renderToString(page)).toContain("Rhystic Study");
    expect(m.loadFriendWishlist).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });

  it("draws the spares tab: wishlist cards marked and first, each with its count", async () => {
    const html = renderToString(await FriendSparesPage({ params: params() }));
    expect(html).toContain(p.spares.line(["Thursday pod"], true));
    expect(m.loadFriendSpareList).toHaveBeenCalledWith("user_viewer", COLIN.publicId, true);
    expect(html.indexOf("Ghalta, Primal Hunger")).toBeLessThan(html.indexOf("Sol Ring"));
    expect(html).toContain("2 spares");
    expect(html).toContain("1 spare");
    expect(html.match(/data-testid="spare-on-wishlist"/g)).toHaveLength(1);
    // Neither fixture card has art, so each names itself in the card's place.
    expect(html.match(/data-testid="spare-name"[^>]*>Ghalta, Primal Hunger</g)).toHaveLength(1);
  });

  // The reader's own wishlist switch, never the friend's: off, the loader reads no wishlist and the line says nothing of it.
  it("reads the spares without the reader's wishlist, and says nothing of it, while the reader's wishlist switch is off", async () => {
    m.requestSwitchEnv.mockResolvedValue({ SOCIAL_FRIENDS_ENABLED: "true" });
    m.loadFriendSpareList.mockClear().mockResolvedValue({ pods: ["Thursday pod"], lines: [{ ...SPARE, onWishlist: false }], wishlist: false });
    const html = renderToString(await FriendSparesPage({ params: params() }));
    expect(m.loadFriendSpareList).toHaveBeenCalledWith("user_viewer", COLIN.publicId, false);
    expect(html).toContain(p.spares.line(["Thursday pod"], false));
    expect(html).not.toContain("on your wishlist");
    renderToString(await FriendPageLayout({ children: null, params: params() }));
    expect(m.loadFriendSpareList).not.toHaveBeenCalledWith("user_viewer", COLIN.publicId, true);
  });

  it("says a friend who shares nothing with the reader is not sharing, and an empty share is empty", async () => {
    m.loadFriendSpareList.mockResolvedValue(null);
    expect(renderToString(await FriendSparesPage({ params: params() }))).toContain(p.spares.noneTitle("Colin"));
    m.loadFriendSpareList.mockResolvedValue({ pods: ["Thursday pod"], lines: [] });
    expect(renderToString(await FriendSparesPage({ params: params() }))).toContain(p.spares.emptyTitle("Colin"));
  });

  it("draws a deck as a name, a commander, a status and a count, with no link and no card list", async () => {
    const html = renderToString(await FriendDecksPage({ params: params() }));
    expect(html).toContain("Thopter Factory");
    expect(html).toContain("Sai, Master Thopterist");
    expect(html).toContain("To buy");
    expect(html).toContain("99 / 99 · 8 cards");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });

  // The board's pill on this surface only (d9, 2026-10-22): no hairline edge, and Building in --fg-body.
  it("draws the board's pill: no edge, Building in --fg-body, the other statuses in the app's own ink", async () => {
    m.loadFriendDecks.mockResolvedValue([{ ...DECK, status: "Building", built: 40 }, { ...DECK, name: "Big Dinos", status: "Complete" }]);
    render(await FriendDecksPage({ params: params() }));
    const [building, complete] = screen.getAllByTestId("friend-deck").map((t) => within(t).getByText(/^(Building|Complete)$/));
    expect(building.style.color).toBe("var(--fg-body)");
    expect(building.style.borderStyle).toBe("none");
    expect(complete.style.color).toBe("var(--success)");
    expect(complete.style.borderStyle).toBe("none");
  });

  it("keeps the app's edge on a status the board does not draw, where the edge carries it (Over's red, Draft's dash)", async () => {
    m.loadFriendDecks.mockResolvedValue([{ ...DECK, status: "Over", built: 101 }, { ...DECK, name: "Big Dinos", status: "Draft" }]);
    render(await FriendDecksPage({ params: params() }));
    const [over, draft] = screen.getAllByTestId("friend-deck").map((t) => within(t).getByText(/^(Over|Draft)/));
    expect(over.style.borderStyle).not.toBe("none");
    expect(draft.style.borderStyle).not.toBe("none");
  });

  describe("with FRIEND_DECKS_ENABLED on for the reader (friend decks call 6)", () => {
    const OPEN = { ...BOTH, FRIEND_DECKS_ENABLED: "true" };
    const ID = "11111111-1111-4111-8111-111111111111";

    it("draws the read-only /decks tile: the art band's identity, the count alone, no status, the whole tile a press", async () => {
      m.requestSwitchEnv.mockResolvedValue(OPEN);
      m.loadFriendDecks.mockResolvedValue([{ ...DECK, id: ID }]);
      render(await FriendDecksPage({ params: params() }));
      const tile = screen.getByTestId("friend-deck");
      const press = within(tile).getByRole("link");
      expect(press.getAttribute("href")).toBe(`/friends/${COLIN.publicId}/decks/${ID}`);
      expect(press.getAttribute("aria-label")).toBe("Thopter Factory, Sai, Master Thopterist, Blue, 99 cards");
      expect(tile.textContent).toContain("99 cards");
      expect(tile.textContent).not.toMatch(/To buy|99 \/ 99/);
      expect(screen.getByText(p.decks.lineOpen("Colin"))).toBeTruthy();
    });

    it("keeps the colour alone when the deck is named for its commander", async () => {
      m.requestSwitchEnv.mockResolvedValue(OPEN);
      m.loadFriendDecks.mockResolvedValue([{ ...DECK, id: ID, name: "Sai" }]);
      render(await FriendDecksPage({ params: params() }));
      const tile = screen.getByTestId("friend-deck");
      expect(tile.textContent).not.toContain("Sai, Master Thopterist");
      expect(within(tile).getByRole("link").getAttribute("aria-label")).toBe("Sai, Blue, 99 cards");
    });

    it("draws no press for a deck the owner's read carried no id for", async () => {
      m.requestSwitchEnv.mockResolvedValue(OPEN);
      m.loadFriendDecks.mockResolvedValue([DECK]);
      render(await FriendDecksPage({ params: params() }));
      expect(within(screen.getByTestId("friend-deck")).queryByRole("link")).toBeNull();
    });

    it("rewords the empty tab's body: a deck shared shows with its whole list", async () => {
      m.requestSwitchEnv.mockResolvedValue(OPEN);
      m.loadFriendDecks.mockResolvedValue([]);
      expect(renderToString(await FriendDecksPage({ params: params() }))).toContain(p.decks.emptyBodyOpen("Colin"));
    });
  });

  it("is not found for a friend whose decks cannot be read for the reader", async () => {
    m.loadFriendDecks.mockResolvedValue(null);
    await expect(FriendDecksPage({ params: params() })).rejects.toThrow("NOT_FOUND");
  });
});

describe("FriendHead and the wishlist tab", () => {
  const draw = (lines = [LINE]) => render(
    <>
      <FriendHead friend={COLIN} nowMs={Date.parse("2026-10-15T12:00:00Z")} />
      <FriendWishlist name={COLIN.displayName} lines={lines} />
    </>,
  );

  it("draws the board's head: back link, name and since, with no commander in the line (the face carries it)", () => {
    draw();
    expect(screen.getByRole("link", { name: p.back }).getAttribute("href")).toBe("/friends");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Colin");
    expect(screen.getByText("Friend since Oct 2")).toBeTruthy();
    expect(screen.queryByText(/Sai, Master Thopterist/)).toBeNull();
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
    fireEvent.click(within(tile).getByRole("button", { name: "View details for Rhystic Study, wants 2" }));
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
