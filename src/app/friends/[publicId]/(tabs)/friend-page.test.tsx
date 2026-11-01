// A friend's page (Social R2 P2, P3; G9, decision 10; menu and Home PR 7): not found unless the id is a current friend
// (each tab too); the head with the
// row's … menu; the wishlist as tiles
// reading `wants N`, never an owned count; the empty state; and a removal from here leaves for `/friends`.
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  loadFriend: vi.fn(),
  loadFriendWishlist: vi.fn(),
  loadFriendSpareList: vi.fn(),
  loadFriendDecks: vi.fn(),
  pathname: "/friends/00000000-0000-4000-8000-000000000002",
  unfriendAction: vi.fn(),
  replace: vi.fn(),
  openCard: vi.fn(),
  catalogCardName: vi.fn(),
  loadPrices: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  usePathname: () => m.pathname,
  notFound: () => { throw new Error("NOT_FOUND"); },
  redirect: (url: string) => { throw new Error(`REDIRECT ${url}`); },
  useRouter: () => ({ replace: m.replace, push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../../../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../../../lib/social/access", () => ({ loadFriend: m.loadFriend }));
vi.mock("../../../../lib/social/wishlist", () => ({ loadFriendWishlist: m.loadFriendWishlist }));
vi.mock("../../../../lib/social/spares", () => ({ loadFriendSpareList: m.loadFriendSpareList }));
vi.mock("../../../../lib/social/friend-page-data", async (orig) => ({
  ...(await orig<typeof import("../../../../lib/social/friend-page-data")>()), catalogCardName: m.catalogCardName,
}));
vi.mock("../../../../lib/decks/price-query", () => ({ loadPrices: m.loadPrices }));
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
import FriendDecksPage from "./page";
import FriendWishlistPage from "./wishlist/page";
import FriendSparesPage from "./spares/page";
import FriendDecksMoved from "./decks/page";
import { FriendHead } from "../../../../components/social/friend-head";
import { FriendWishlist } from "../../../../components/social/friend-wishlist";
import { socialCopy } from "../../../../lib/copy/social";
import { named } from "../../../../lib/person-name/mint";
import { plain } from "../../../../lib/person-name/testing";

const p = socialCopy.friendPage;
const COLIN = {
  publicId: "00000000-0000-4000-8000-000000000002", displayName: named("Colin"), since: new Date("2026-10-02T12:00:00Z"),
  commander: { oracleId: "00000000-0000-4000-8000-0000000000aa", name: "Sai, Master Thopterist", artCropUri: null },
};
const LINE = {
  oracleId: "00000000-0000-4000-8000-0000000000b1", quantity: 2, name: "Rhystic Study",
  imageUri: "https://cards.example/rhystic.jpg", layout: "normal", backImageUri: null,
};
const params = (publicId = COLIN.publicId) => Promise.resolve({ publicId });

beforeEach(() => {
  m.requireUserId.mockResolvedValue("user_viewer");
  m.pathname = `/friends/${COLIN.publicId}`;
  m.loadFriend.mockResolvedValue(COLIN);
  m.loadFriendWishlist.mockResolvedValue([LINE]);
  m.unfriendAction.mockReset();
  m.replace.mockReset();
});
afterEach(cleanup);

const DECK = { id: null as string | null, name: named("Thopter Factory"), commanderName: "Sai, Master Thopterist", partnerName: null, colorIdentity: ["U"], artCropUri: null, status: "To buy", built: 99, bodySize: 99, toBuy: 8 };
const SPARE = { oracleId: "00000000-0000-4000-8000-0000000000c1", name: "Ghalta, Primal Hunger", imageUri: null, spare: 2, onWishlist: true };

describe("a friend's page group", () => {
  beforeEach(() => {
    m.loadFriendSpareList.mockResolvedValue({ pods: ["Thursday pod"], lines: [SPARE, { ...SPARE, oracleId: "00000000-0000-4000-8000-0000000000c2", name: "Sol Ring", spare: 1, onWishlist: false }], wishlist: true });
    m.loadFriendDecks.mockResolvedValue([DECK]);
    // The Spares tab always offers Ask now (SPARE_REQUESTS_ENABLED is retired), so it prices its cards.
    m.loadPrices.mockResolvedValue({ prices: new Map(), newestAsOf: null });
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
    expect(html).toContain(`href="/friends/${COLIN.publicId}/spares"`);
    expect(html).toMatch(/data-testid="friend-tab-spares-count"[^>]*>2</);
    expect(html).toMatch(/data-testid="friend-tab-wishlist-count"[^>]*>1</);
    expect(html).toMatch(/data-testid="friend-tab-decks-count"[^>]*>1</);
    expect(html).toContain("<p>tab</p>");
    // The read is the open kind for every reader, so the layout and the tab share one cached read.
    expect(m.loadFriendDecks).toHaveBeenCalledWith("user_viewer", COLIN.publicId, true);
  });

  it("draws the Wishlist tab through the friend's wishlist read", async () => {
    m.loadFriendWishlist.mockClear();
    const html = renderToString(await FriendPageLayout({ children: null, params: params() }));
    expect(html).toContain(`href="/friends/${COLIN.publicId}/wishlist"`);
    expect(m.loadFriendWishlist).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });

  it("marks the tab the path names", async () => {
    m.pathname = `/friends/${COLIN.publicId}/spares`;
    try {
      const html = renderToString(await FriendPageLayout({ children: null, params: params() }));
      expect(html).toMatch(/aria-current="page"[^>]*data-testid="friend-tab-spares"/);
    } finally {
      m.pathname = `/friends/${COLIN.publicId}`;
    }
  });

  // Hugh, 2026-10-30: the page opens on Decks, and the strip reads Decks, Wishlist, Spares.
  it("opens on Decks: the bare page marks Decks and the strip runs Decks, Wishlist, Spares", async () => {
    const html = renderToString(await FriendPageLayout({ children: null, params: params() }));
    expect(html).toMatch(/aria-current="page"[^>]*data-testid="friend-tab-decks"/);
    const order = ["decks", "wishlist", "spares"].map((t) => html.indexOf(`data-testid="friend-tab-${t}"`));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(html).toContain(`href="/friends/${COLIN.publicId}"`);
    expect(html).toContain(`href="/friends/${COLIN.publicId}/spares"`);
    expect(html).not.toContain(`href="/friends/${COLIN.publicId}/decks"`);
  });

  it("hands a `?spare=` landing on the bare page to the Spares tab, whole and before any read", async () => {
    m.requireUserId.mockClear();
    m.loadFriendDecks.mockClear();
    await expect(FriendDecksPage({ params: params(), searchParams: Promise.resolve({ spare: SPARE.oracleId }) }))
      .rejects.toThrow(`REDIRECT /friends/${COLIN.publicId}/spares?spare=${SPARE.oracleId}`);
    expect(m.requireUserId).not.toHaveBeenCalled();
    expect(m.loadFriendDecks).not.toHaveBeenCalled();
  });

  it("sends the old Decks address to the page, which opens on Decks", async () => {
    await expect(FriendDecksMoved({ params: params() })).rejects.toThrow(new RegExp(`^REDIRECT /friends/${COLIN.publicId}$`));
  });

  it("draws the wishlist tab through the friend's wishlist", async () => {
    const page = await FriendWishlistPage({ params: params() });
    expect(renderToString(page)).toContain("Rhystic Study");
    expect(m.loadFriendWishlist).toHaveBeenCalledWith("user_viewer", COLIN.publicId);
  });

  it("draws the spares tab: wishlist cards marked and first, each with its count", async () => {
    const html = renderToString(await FriendSparesPage({ params: params() }));
    expect(html).toContain(plain(p.spares.line([named("Thursday pod")], true)));
    expect(m.loadFriendSpareList).toHaveBeenCalledWith("user_viewer", COLIN.publicId, true);
    expect(html.indexOf("Ghalta, Primal Hunger")).toBeLessThan(html.indexOf("Sol Ring"));
    expect(html).toContain("2 spares");
    expect(html).toContain("1 spare");
    expect(html.match(/data-testid="spare-on-wishlist"/g)).toHaveLength(1);
    // Neither fixture card has art, so each names itself in the card's place.
    expect(html.match(/data-testid="spare-name"[^>]*>Ghalta, Primal Hunger</g)).toHaveLength(1);
  });

  // The reader's wishlist always rides the spares read now its switch is retired.
  it("reads the spares with the reader's wishlist", async () => {
    m.loadFriendSpareList.mockClear();
    await FriendSparesPage({ params: params() });
    renderToString(await FriendPageLayout({ children: null, params: params() }));
    expect(m.loadFriendSpareList).toHaveBeenCalledWith("user_viewer", COLIN.publicId, true);
    expect(m.loadFriendSpareList).not.toHaveBeenCalledWith("user_viewer", COLIN.publicId, false);
  });

  it("says a friend who shares nothing with the reader is not sharing, and an empty share is empty", async () => {
    m.loadFriendSpareList.mockResolvedValue(null);
    expect(renderToString(await FriendSparesPage({ params: params() }))).toContain(plain(p.spares.noneTitle("Colin")));
    m.loadFriendSpareList.mockResolvedValue({ pods: ["Thursday pod"], lines: [] });
    expect(renderToString(await FriendSparesPage({ params: params() }))).toContain(plain(p.spares.emptyTitle("Colin")));
  });

  it("draws a deck as a name, a commander, a status and a count, with no link and no card list", async () => {
    const html = renderToString(await FriendDecksPage({ params: params() }));
    expect(html).toContain('<span class="ph-no-capture">Thopter Factory</span>');
    expect(html).toContain("Sai, Master Thopterist");
    expect(html).toContain("To buy");
    expect(html).toContain("99 / 99 · 8 cards");
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
  });

  // The board's pill on this surface only (d9, 2026-10-22): no hairline edge, and Building in --fg-body.
  it("draws the board's pill: no edge, Building in --fg-body, the other statuses in the app's own ink", async () => {
    m.loadFriendDecks.mockResolvedValue([{ ...DECK, status: "Building", built: 40 }, { ...DECK, name: named("Big Dinos"), status: "Complete" }]);
    render(await FriendDecksPage({ params: params() }));
    const [building, complete] = screen.getAllByTestId("friend-deck").map((t) => within(t).getByText(/^(Building|Complete)$/));
    expect(building.style.color).toBe("var(--fg-body)");
    expect(building.style.borderStyle).toBe("none");
    expect(complete.style.color).toBe("var(--success)");
    expect(complete.style.borderStyle).toBe("none");
  });

  it("keeps the app's edge on a status the board does not draw, where the edge carries it (Over's red, Draft's dash)", async () => {
    m.loadFriendDecks.mockResolvedValue([{ ...DECK, status: "Over", built: 101 }, { ...DECK, name: named("Big Dinos"), status: "Draft" }]);
    render(await FriendDecksPage({ params: params() }));
    const [over, draft] = screen.getAllByTestId("friend-deck").map((t) => within(t).getByText(/^(Over|Draft)/));
    expect(over.style.borderStyle).not.toBe("none");
    expect(draft.style.borderStyle).not.toBe("none");
  });

  describe("the open tiles (friend decks call 6)", () => {
    const ID = "11111111-1111-4111-8111-111111111111";

    it("draws the read-only /decks tile: the art band's identity, the count alone, no status, the whole tile a press", async () => {
      m.loadFriendDecks.mockResolvedValue([{ ...DECK, id: ID }]);
      render(await FriendDecksPage({ params: params() }));
      const tile = screen.getByTestId("friend-deck");
      const press = within(tile).getByRole("link");
      expect(press.getAttribute("href")).toBe(`/friends/${COLIN.publicId}/decks/${ID}`);
      expect(press.getAttribute("aria-label")).toBe("Thopter Factory, Sai, Master Thopterist, Blue, 99 cards");
      expect(press.className).toContain("ph-no-capture");
      expect(within(tile).getByRole("heading", { level: 3, hidden: true }).querySelector(".ph-no-capture")?.textContent).toBe("Thopter Factory");
      expect(tile.textContent).toContain("99 cards");
      expect(tile.textContent).not.toMatch(/To buy|99 \/ 99/);
      expect(screen.getByText(p.decks.lineOpen)).toBeTruthy();
    });

    it("keeps the colour alone when the deck is named for its commander", async () => {
      m.loadFriendDecks.mockResolvedValue([{ ...DECK, id: ID, name: named("Sai") }]);
      render(await FriendDecksPage({ params: params() }));
      const tile = screen.getByTestId("friend-deck");
      expect(tile.textContent).not.toContain("Sai, Master Thopterist");
      expect(within(tile).getByRole("link").getAttribute("aria-label")).toBe("Sai, Blue, 99 cards");
      expect(within(tile).getByRole("link").className).toContain("ph-no-capture");
    });

    // Close-out: the owner's switch off leaves the read with no ids. The tab is then as it shipped, rather than open tiles
    // with no press under a line that says to open one.
    it("draws the tab as it shipped when the owner's read carried no ids: the status, no press, no Open one", async () => {
      m.loadFriendDecks.mockResolvedValue([DECK]);
      render(await FriendDecksPage({ params: params() }));
      expect(m.loadFriendDecks).toHaveBeenCalledWith("user_viewer", COLIN.publicId, true);
      const tile = screen.getByTestId("friend-deck");
      expect(within(tile).queryByRole("link")).toBeNull();
      expect(tile.textContent).toContain("To buy");
      expect(screen.queryByText(p.decks.lineOpen)).toBeNull();
      expect(screen.getByText(plain(p.decks.line(named("Colin")))).closest(".ph-no-capture")).not.toBeNull();
    });

    it("defers the art of every tile after the first four", async () => {
      m.loadFriendDecks.mockResolvedValue(Array.from({ length: 6 }, (_, i) => ({ ...DECK, id: `${ID.slice(0, -1)}${i}`, name: named(`Deck ${i}`), artCropUri: `https://crop/${i}.jpg` })));
      const html = renderToString(await FriendDecksPage({ params: params() }));
      for (let i = 0; i < 4; i++) expect(html).toContain(`https://crop/${i}.jpg`);
      for (let i = 4; i < 6; i++) expect(html).not.toContain(`https://crop/${i}.jpg`);
    });

    it("rewords the empty tab's body: a deck shared shows with its whole list", async () => {
      m.loadFriendDecks.mockResolvedValue([]);
      expect(renderToString(await FriendDecksPage({ params: params() }))).toContain(plain(p.decks.emptyBodyOpen(named("Colin"))));
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
    expect(screen.getByRole("button", { name: plain(socialCopy.friends.menuAria(named("Colin"))) }).classList.contains("ph-no-capture")).toBe(true);
  });

  it("heads the wishlist with its count and view only, and captions a tile `wants N`, never an owned count", () => {
    draw();
    const head = screen.getByRole("heading", { level: 2 });
    expect(head.textContent).toBe(`${plain(p.head(named("Colin")))}1${p.viewOnly}`);
    expect(head.querySelector(".ph-no-capture")).not.toBeNull();
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
    expect(screen.getByText(plain(p.emptyTitle(named("Colin")))).closest(".ph-no-capture")).not.toBeNull();
    expect(screen.getByText(plain(p.emptyBody(named("Colin")))).closest(".ph-no-capture")).not.toBeNull();
    expect(screen.queryByRole("listitem")).toBeNull();
    expect(screen.getByRole("heading", { level: 2 }).textContent).toContain("0");
  });

  it("leaves for /friends once the removal lands", async () => {
    m.unfriendAction.mockResolvedValue({ ok: true });
    draw();
    fireEvent.click(screen.getByRole("button", { name: plain(socialCopy.friends.menuAria(named("Colin"))) }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: socialCopy.friends.removeConfirm }).at(-1)!); });
    expect(m.unfriendAction).toHaveBeenCalledWith(COLIN.publicId);
    expect(m.replace).toHaveBeenCalledWith("/friends");
  });

  it("stays, with the list's toast, when the removal fails", async () => {
    m.unfriendAction.mockResolvedValue({ ok: false, reason: "off" });
    draw();
    fireEvent.click(screen.getByRole("button", { name: plain(socialCopy.friends.menuAria(named("Colin"))) }));
    fireEvent.click(screen.getByRole("button", { name: socialCopy.friends.remove }));
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: socialCopy.friends.removeConfirm }).at(-1)!); });
    expect(m.replace).not.toHaveBeenCalled();
    expect(screen.getByText(socialCopy.friends.removeFailed)).toBeTruthy();
  });

  it("opens an offered card from a ?spare= written in upper case, never calling it gone", async () => {
    m.loadPrices.mockResolvedValue({ prices: new Map(), newestAsOf: null });
    m.catalogCardName.mockReset();
    const page = await FriendSparesPage({ params: params(), searchParams: Promise.resolve({ spare: SPARE.oracleId.toUpperCase() }) });
    expect(m.catalogCardName).not.toHaveBeenCalled();
    expect((page as { props: { asks: { spare: string } } }).props.asks.spare).toBe(SPARE.oracleId);
  });
});
