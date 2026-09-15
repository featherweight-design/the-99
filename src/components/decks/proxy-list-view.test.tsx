import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProxyListView } from "./proxy-list-view";
import { proxyCopy } from "../../lib/copy/proxies";
import type { ProxyRow } from "../../lib/decks/proxy-list";

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(),
  clearCardArtPreference: vi.fn(),
}));

const row = (over: Partial<ProxyRow> = {}): ProxyRow => ({
  oracleId: "o1", name: "The Ozolith", typeLine: "Legendary Artifact",
  manaCost: "{1}", cmc: 1, imageUri: null, setCode: "CMR", rarity: "rare",
  decks: [{ id: "d1", name: "HD Gods" }], commander: false, priceCents: 4200, ...over,
});

describe("the proxy list", () => {
  it("names each card's decks, and links them", () => {
    render(<ProxyListView rows={[row()]} hasDecks hasCollection />);
    expect(screen.getByText("The Ozolith")).toBeTruthy();
    const deck = screen.getByRole("link", { name: proxyCopy.row.deckAria("HD Gods") });
    expect(deck.getAttribute("href")).toBe("/decks/d1");
  });

  it("draws a bare figure, never a buy tag", () => {
    // `isShoppingCard` has just removed every one of these from every Shopping
    // list. Drawing the tag they were removed from would put two surfaces in
    // direct disagreement about the same card.
    render(<ProxyListView rows={[row()]} hasDecks hasCollection />);
    // Twice over: the row's own figure and the strip's total, which on a
    // one-card list are the same number.
    expect(screen.getAllByText("$42.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/^buy/i)).toBeNull();
  });

  it("says no stock rather than a zero", () => {
    // A card nobody is selling is not a free card.
    render(<ProxyListView rows={[row({ priceCents: null })]} hasDecks hasCollection />);
    expect(screen.getByText(proxyCopy.row.noStock)).toBeTruthy();
    expect(screen.queryByText("$0.00")).toBeNull();
  });

  it("states the cost strip's own gap", () => {
    render(
      <ProxyListView
        rows={[row(), row({ oracleId: "o2", name: "Mana Crypt", priceCents: null })]}
        hasDecks hasCollection
      />,
    );
    expect(screen.getByText(proxyCopy.cost.line(1, 2))).toBeTruthy();
  });

  it("names the printing, which tells two same-named cards apart", () => {
    render(<ProxyListView rows={[row()]} hasDecks hasCollection />);
    expect(screen.getByText(/CMR/)).toBeTruthy();
  });

  it("says why the figure covers fewer cards than the list", () => {
    // A total covering 7 of 9 has to say what the other two are. "Never stocked"
    // is the one this list can stand behind — telling it from "sold out" needs
    // provenance the loader does not read.
    render(
      <ProxyListView
        rows={[row(), row({ oracleId: "o2", name: "Mana Crypt", priceCents: null })]}
        hasDecks hasCollection
      />,
    );
    expect(screen.getByText(proxyCopy.cost.unpriced(1))).toBeTruthy();
  });

  it("marks a commander, which is otherwise invisible in this list", () => {
    render(<ProxyListView rows={[row({ commander: true })]} hasDecks hasCollection />);
    expect(screen.getByText(proxyCopy.row.commander)).toBeTruthy();
  });

  it("drops the collection clause for a player who has none", () => {
    render(<ProxyListView rows={[row()]} hasDecks hasCollection={false} />);
    expect(screen.getByText(proxyCopy.page.subtitle(1, 1))).toBeTruthy();
    // No upload prompt, no banner: this route works perfectly well without one.
    expect(screen.queryByText(/upload/i)).toBeNull();
  });

  it("names the right precondition when there is nothing to show", () => {
    const { rerender } = render(<ProxyListView rows={[]} hasDecks hasCollection />);
    expect(screen.getByText(proxyCopy.empty.heading)).toBeTruthy();

    // A different fact, so a different heading — and the only branch with a
    // filled button, because here there genuinely is one next act.
    rerender(<ProxyListView rows={[]} hasDecks={false} hasCollection />);
    expect(screen.getByText(proxyCopy.empty.noDecksHeading)).toBeTruthy();
    expect(screen.getByText(proxyCopy.empty.noDecksAction)).toBeTruthy();
  });

  it("offers no way to unmark from here", () => {
    // Read-only by ruling: a row belongs to several decks and the control is per
    // deck, so unmarking happens where the decision was made.
    render(<ProxyListView rows={[row()]} hasDecks hasCollection />);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: /unmark|remove/i })).toBeNull();
  });
});
