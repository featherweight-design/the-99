import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { gotItCopy } from "../../../lib/copy/i-got-it";

const { loadPrintingChoices, markBoughtForDecks } = vi.hoisted(() => ({
  loadPrintingChoices: vi.fn(),
  markBoughtForDecks: vi.fn(),
}));
vi.mock("../../../app/collection/edit-actions", () => ({ loadPrintingChoices }));
vi.mock("../../../app/decks/mark-bought-actions", () => ({ markBoughtForDecks, readCartChooser: vi.fn(async () => null), markBought: vi.fn() }));
vi.mock("../../../app/decks/assignment-actions", () => ({ assignCopy: vi.fn() }));
vi.mock("../../../app/collection/history-actions", () => ({ previewRevert: vi.fn(), revertCollectionEntry: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
// A card-details trigger needs the provider the cart view mounts around its list: this stand-in throws without one,
// so a view that forgot the provider fails here instead of in the browser.
vi.mock("../../cards/card-detail-provider", async () => {
  const React = await import("react");
  const Mounted = React.createContext(false);
  return {
    CardDetailProvider: ({ children }: { children: React.ReactNode }) => <Mounted.Provider value>{children}</Mounted.Provider>,
    CardDetailTrigger: ({ children, name }: { children: React.ReactNode; name: string }) => {
      if (!React.useContext(Mounted)) throw new Error("useCardDetail must be used inside a CardDetailProvider");
      return <button type="button" aria-label={name}>{children}</button>;
    },
    // The spares-only modal's chrome registers itself with the provider; the same mount check holds for it.
    useCardDetail: () => {
      if (!React.useContext(Mounted)) throw new Error("useCardDetail must be used inside a CardDetailProvider");
      return { registerSheet: () => () => {}, openOracleId: null, revealing: false, close: () => {} };
    },
  };
});

const { CartView } = await import("./cart-view");
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { exportLinkOutCopy } from "../../../lib/copy/decks-builder";
import { priceCopy } from "../../../lib/copy/price";
import type { CartPayload } from "../../../lib/decks/cart";
import { spareCopy } from "../../../lib/copy/social";

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const NOW = "2026-10-11T00:00:00.000Z";
const provenance = { behind: false, when: "Saturday" };
const lineOf = (oracleId: string, name: string, cents: number | null, deckIds: string[], extra: Partial<CartPayload["lines"][number]> = {}) => ({
  oracleId, name, commander: false, owned: 0, heldElsewhere: 0, heldBy: [],
  rows: deckIds.map((deckId) => ({ deckId, quantity: 1, cents, state: (cents === null ? "soldOut" : "priced") as "priced", commander: false, held: 0, finish: null })),
  ...extra,
});

// Four cards across three decks: Sol Ring is in two, so it leads By card; Mox is unpriced.
function cart(): CartPayload {
  return {
    totalDecks: 9, priced: true, newestAsOf: NOW, holders: [],
    decks: [
      { id: "gishath", name: "HD - Gishath", brew: false, copies: 3, cents: 520, pricedCopies: 3 },
      { id: "omnath", name: "HD - Omnath", brew: false, copies: 2, cents: 90, pricedCopies: 1 },
      { id: "kratos", name: "HD - Kratos", brew: false, copies: 1, cents: 900, pricedCopies: 1 },
    ],
    lines: [
      lineOf("sol", "Sol Ring", 150, ["gishath", "omnath"]),
      lineOf("boots", "Swiftfoot Boots", 370, ["gishath"]),
      lineOf("mox", "Mox Amber", null, ["omnath"]),
      lineOf("tithe", "Smothering Tithe", 900, ["kratos"]),
    ],
  };
}

const cardNames = () => within(screen.getByRole("region", { name: copy.list.regionAria })).getAllByRole("listitem")
  .map((li) => li.textContent?.match(/Sol Ring|Swiftfoot Boots|Mox Amber|Smothering Tithe/)?.[0]);
const resultLine = (container: HTMLElement) => container.querySelector("[data-chassis-row='result'] p")?.textContent;
const search = () => screen.getByRole("searchbox", { name: copy.filters.search });
const live = () => window.location.search;

function renderWide(ui: React.ReactElement) {
  Object.defineProperty(window, "matchMedia", {
    writable: true, configurable: true,
    value: (query: string) => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
  return render(ui);
}
function phone() {
  Object.defineProperty(window, "matchMedia", {
    writable: true, configurable: true,
    value: (query: string) => ({ matches: false, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false }),
  });
}

beforeEach(() => { window.history.replaceState(null, "", "/decks/shopping"); phone(); });
afterEach(() => phone());

describe("the cart's chassis (v2 PR 8)", () => {
  it("replaces the list head with the chassis: search, a sort, no filters on, and the cart's sentence", () => {
    const { container } = render(<CartView cart={cart()} provenance={provenance} />);
    expect(container.querySelector("[data-chassis-form='compact']")).toBeTruthy();
    expect(search()).toBeTruthy();
    expect(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byCard.decks) })).toBeTruthy();
    expect(screen.getByText("No filters on")).toBeTruthy();
    expect(resultLine(container)).toBe(copy.result.byCardNoSpare(4));
    // The old heading's words are gone.
    expect(screen.queryByText(/commanders first, then most decks/)).toBeNull();
  });

  it("searches every view, shows the term as a chip, and mirrors ?q", () => {
    const { container } = render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.change(search(), { target: { value: "sol" } });
    expect(cardNames()).toEqual(["Sol Ring"]);
    expect(resultLine(container)).toBe(copy.result.filtered(1, 4));
    expect(screen.getByText(copy.filters.chipSearch("sol"))).toBeTruthy();
    expect(live()).toBe("?q=sol");
    // The same search narrows By deck: only the decks it leaves a card of.
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byDeck }));
    expect(screen.getAllByRole("region", { name: /HD - / }).map((r) => r.textContent?.match(/HD - [A-Za-z]+/)?.[0])).toEqual(["HD - Gishath", "HD - Omnath"]);
    expect(live()).toBe("?q=sol&view=deck");
    // Clear all drops it, and the address with it.
    fireEvent.click(screen.getByRole("button", { name: "Clear all filters. The sort is unchanged." }));
    expect(live()).toBe("?view=deck");
    expect(screen.getAllByRole("region", { name: /HD - / })).toHaveLength(3);
  });

  it("opens on a ?q arrival and holds a search that leaves nothing to a no-match block with the one fix", () => {
    render(<CartView cart={cart()} provenance={provenance} initialQuery="zzz" />);
    expect((search() as HTMLInputElement).value).toBe("zzz");
    expect(screen.getByText(copy.noMatch.title)).toBeTruthy();
    expect(screen.getByText(copy.noMatch.body("zzz", 4))).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.noMatch.drop("zzz") }));
    expect(screen.queryByText(copy.noMatch.title)).toBeNull();
    expect(cardNames()).toHaveLength(4);
  });

  it("sorts By card from the phone sheet, keeps the choice per view, and mirrors ?sort for the view on screen", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    expect(cardNames()).toEqual(["Sol Ring", "Mox Amber", "Smothering Tithe", "Swiftfoot Boots"]);
    fireEvent.click(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byCard.decks) }));
    const sheet = screen.getByRole("menu", { name: copy.sort.sheetAria });
    expect(within(sheet).getAllByRole("menuitemradio").map((r) => r.textContent)).toEqual(Object.values(copy.sort.byCard).map((l) => `${l}${l === copy.sort.byCard.decks ? "✓" : ""}`));
    fireEvent.click(within(sheet).getByRole("menuitemradio", { name: copy.sort.byCard["price-high"] }));
    // Closed on a pick; an unpriced line goes last.
    expect(screen.queryByRole("menu", { name: copy.sort.sheetAria })).toBeNull();
    expect(cardNames()).toEqual(["Smothering Tithe", "Swiftfoot Boots", "Sol Ring", "Mox Amber"]);
    expect(live()).toBe("?sort=price-high");
    // Low first keeps the unpriced line last too.
    fireEvent.click(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byCard["price-high"]) }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: copy.sort.byCard["price-low"] }));
    expect(cardNames()).toEqual(["Sol Ring", "Swiftfoot Boots", "Smothering Tithe", "Mox Amber"]);
    // By deck has its own sort, and the address names it, not the card's.
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byDeck }));
    expect(live()).toBe("?view=deck");
    fireEvent.click(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byDeck.largest) }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: copy.sort.byDeck.cost }));
    expect(screen.getAllByRole("region", { name: /HD - / }).map((r) => r.textContent?.match(/HD - [A-Za-z]+/)?.[0])).toEqual(["HD - Kratos", "HD - Gishath", "HD - Omnath"]);
    expect(live()).toBe("?view=deck&sort=cost");
    // Back on By card, its own sort is still there.
    fireEvent.click(screen.getByRole("radio", { name: copy.view.byCard }));
    expect(live()).toBe("?sort=price-low");
    expect(cardNames()[0]).toBe("Sol Ring");
  });

  it("reads a ?sort from another view as that view's default and strips it from the address (A15)", () => {
    window.history.replaceState(null, "", "/decks/shopping?sort=cost&q=sol&utm=x");
    render(<CartView cart={cart()} provenance={provenance} initialSort="cost" initialQuery="sol" />);
    expect(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byCard.decks) })).toBeTruthy();
    // The stranger's `sort` goes, what the page does not own stays, the search stays.
    expect(live()).toBe("?q=sol&utm=x");
  });

  it("moves between the sheet's orders with the arrows and keeps one Tab stop", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byCard.decks) }));
    const radios = within(screen.getByRole("menu", { name: copy.sort.sheetAria })).getAllByRole("menuitemradio");
    expect(radios.map((r) => r.tabIndex)).toEqual([0, -1, -1, -1, -1]);
    fireEvent.keyDown(radios[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(radios[1]);
    // The Tab stop follows the focus, so Shift+Tab from here leaves the group instead of returning to the checked order.
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1, -1]);
    fireEvent.keyDown(radios[1], { key: "ArrowUp" });
    fireEvent.keyDown(radios[0], { key: "ArrowUp" });
    expect(document.activeElement).toBe(radios[4]);
  });

  it("holds a pasted search to the same cap as an arrival, in the field and the address", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.change(search(), { target: { value: `sol${" ".repeat(120)}` } });
    expect((search() as HTMLInputElement).value).toHaveLength(80);
    expect(new URLSearchParams(live()).get("q")).toHaveLength(80);
  });

  it("cuts a long search for the chip's eye and speaks it whole", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    const term = "a".repeat(60);
    fireEvent.change(search(), { target: { value: term } });
    expect(screen.getByText(copy.filters.chipSearch(`${"a".repeat(24)}…`))).toBeTruthy();
    const chip = document.querySelector("[data-chassis-row='chips']") as HTMLElement;
    expect(within(chip).getByRole("button", { name: new RegExp(term) })).toBeTruthy();
  });

  it("draws the desktop sort as the labelled menu past the hairline", () => {
    const { container } = renderWide(<CartView cart={cart()} provenance={provenance} />);
    expect(container.querySelector("[data-chassis-form='wide']")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: copy.sort.trigger(copy.sort.byCard.decks) }));
    const menu = screen.getByRole("menu", { name: copy.sort.sheetAria });
    expect(within(menu).getAllByRole("menuitemradio").map((r) => r.textContent)).toEqual(Object.values(copy.sort.byCard));
    fireEvent.click(within(menu).getByRole("menuitemradio", { name: copy.sort.byCard.name }));
    expect(cardNames()).toEqual(["Mox Amber", "Smothering Tithe", "Sol Ring", "Swiftfoot Boots"]);
    expect(live()).toBe("?sort=name");
  });
});
