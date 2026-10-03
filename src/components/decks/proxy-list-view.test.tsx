import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProxyListView } from "./proxy-list-view";
import { proxyCopy } from "../../lib/copy/proxies";
import type { ProxyRow } from "../../lib/decks/proxy-list";

/** One run, shared by every row: `priceState` compares each row's own `asOf`
 *  against this to tell a live figure from a frozen one. */
// Relative to the clock, like OLD below: the view judges freshness against
// \`new Date()\`, so a pinned date reads as fresh only until the calendar passes it.
const NEWEST = new Date(Date.now() - 24 * 60 * 60 * 1000);

vi.mock("../../app/collection/actions", () => ({
  setCardArtPreference: vi.fn(),
  clearCardArtPreference: vi.fn(),
}));

const row = (over: Partial<ProxyRow> = {}): ProxyRow => ({
  oracleId: "o1", name: "The Ozolith", typeLine: "Legendary Artifact",
  manaCost: "{1}", cmc: 1, imageUri: null, setCode: "CMR", rarity: "rare",
  decks: [{ id: "d1", name: "HD Gods" }], commander: false,
  price: { cents: 4200, asOf: NEWEST, foilOnly: false } as unknown as ProxyRow["price"], ...over,
});

describe("the proxy list", () => {
  it("names each card's decks, and links them", () => {
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    expect(screen.getByText("The Ozolith")).toBeTruthy();
    const deck = screen.getByRole("link", { name: proxyCopy.row.deckAria("HD Gods") });
    expect(deck.getAttribute("href")).toBe("/decks/d1");
  });

  it("draws a bare figure, never a buy tag", () => {
    // `isShoppingCard` has just removed every one of these from every Shopping
    // list. Drawing the tag they were removed from would put two surfaces in
    // direct disagreement about the same card.
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    // Twice over: the row's own figure and the strip's total, which on a
    // one-card list are the same number.
    expect(screen.getAllByText("$42.00").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/^buy/i)).toBeNull();
  });

  it("says no stock rather than a zero", () => {
    // A card nobody is selling is not a free card.
    render(<ProxyListView newestAsOf={NEWEST} rows={[row({ price: null })]} hasDecks hasCollection />);
    expect(screen.getByText(proxyCopy.row.noStock)).toBeTruthy();
    expect(screen.queryByText("$0.00")).toBeNull();
  });

  it("states the cost strip's own gap", () => {
    render(
      <ProxyListView
        newestAsOf={NEWEST}
        rows={[row(), row({ oracleId: "o2", name: "Mana Crypt", price: null })]}
        hasDecks hasCollection
      />,
    );
    expect(screen.getByText(proxyCopy.cost.line(1, 2))).toBeTruthy();
  });

  it("names the printing, which tells two same-named cards apart", () => {
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    expect(screen.getByText(/CMR/)).toBeTruthy();
  });

  it("says why the figure covers fewer cards than the list", () => {
    // A total covering 7 of 9 has to say what the other two are. "Never stocked"
    // is the one this list can stand behind — telling it from "sold out" needs
    // provenance the loader does not read.
    render(
      <ProxyListView
        newestAsOf={NEWEST}
        rows={[row(), row({ oracleId: "o2", name: "Mana Crypt", price: null })]}
        hasDecks hasCollection
      />,
    );
    expect(screen.getByText(proxyCopy.cost.unpriced(1))).toBeTruthy();
  });

  it("marks a commander, which is otherwise invisible in this list", () => {
    render(<ProxyListView newestAsOf={NEWEST} rows={[row({ commander: true })]} hasDecks hasCollection />);
    expect(screen.getByText(proxyCopy.row.commander)).toBeTruthy();
  });

  it("drops the collection clause for a player who has none", () => {
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection={false} />);
    expect(screen.getByText(proxyCopy.page.subtitle(1, 1))).toBeTruthy();
    // No upload prompt, no banner: this route works perfectly well without one.
    expect(screen.queryByText(/upload/i)).toBeNull();
  });

  it("names the right precondition when there is nothing to show", () => {
    const { rerender } = render(<ProxyListView newestAsOf={NEWEST} rows={[]} hasDecks hasCollection />);
    expect(screen.getByText(proxyCopy.empty.heading)).toBeTruthy();

    // A different fact, so a different heading — and the only branch with a
    // filled button, because here there genuinely is one next act.
    rerender(<ProxyListView newestAsOf={NEWEST} rows={[]} hasDecks={false} hasCollection />);
    expect(screen.getByText(proxyCopy.empty.noDecksHeading)).toBeTruthy();
    expect(screen.getByText(proxyCopy.empty.noDecksAction)).toBeTruthy();
  });

  it("links back to the collection from its breadcrumb (H19)", () => {
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    const back = screen.getByRole("link", { name: proxyCopy.page.breadcrumb });
    expect(back.getAttribute("href")).toBe("/collection");
  });

  it("stretches the card's button over the whole row, under the deck links (H20)", () => {
    // jsdom lays nothing out, so this pins the structure the press depends on: the
    // row is the positioned ancestor the stretch fills, and each deck link sits on
    // a layer above it so a press on a deck name still reaches the deck.
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    const trigger = screen.getByRole("button", { name: proxyCopy.row.cardAria("The Ozolith") });
    expect(trigger.className).toMatch(/after:absolute/);
    expect(trigger.className).toMatch(/after:inset-0/);
    expect(trigger.closest("li")!.className).toMatch(/\brelative\b/);
    const deck = screen.getByRole("link", { name: proxyCopy.row.deckAria("HD Gods") });
    expect(deck.className).toMatch(/\brelative\b/);
    expect(deck.className).toMatch(/z-\[1\]/);
  });

  it("offers no way to unmark from here", () => {
    // Read-only by ruling: a row belongs to several decks and the control is per
    // deck, so unmarking happens where the decision was made.
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    expect(screen.queryByRole("switch")).toBeNull();
    expect(screen.queryByRole("button", { name: /unmark|remove/i })).toBeNull();
  });
});

describe("the route's landmark", () => {
  it("does not nest a second main inside the shell's", () => {
    // The shell renders one around every route. Two main landmarks is invalid
    // and exposes an ambiguous main region to a screen reader.
    const { container } = render(
      <ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />,
    );
    expect(container.querySelector("main")).toBeNull();
  });
});

describe("what the money says about itself", () => {
  const OLD = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);

  it("counts a foil-only card as costable, not as never stocked", () => {
    // `costToComplete`'s shared rule: a foil-only card is genuinely for sale and
    // contributes at its foil price. Dropped from the total, it was also being
    // counted in the "never stocked" caveat — twice wrong about one card.
    const foil = row({
      oracleId: "o3",
      price: { cents: null, foilCents: 900, asOf: NEWEST } as unknown as ProxyRow["price"],
    });
    render(<ProxyListView newestAsOf={NEWEST} rows={[foil]} hasDecks hasCollection />);
    expect(screen.queryByText(proxyCopy.cost.unpriced(1))).toBeNull();
  });

  it("discloses a stale feed once, beside the total", () => {
    // Row-to-row comparison cannot see this: every figure is current relative to
    // the others and out of date against the shop.
    render(<ProxyListView newestAsOf={OLD} rows={[row()]} hasDecks hasCollection />);
    expect(screen.getByText(/prices as of/)).toBeTruthy();
  });

  it("says nothing about provenance when the feed is fresh", () => {
    render(<ProxyListView newestAsOf={NEWEST} rows={[row()]} hasDecks hasCollection />);
    expect(screen.queryByText(/prices as of/)).toBeNull();
  });
});

describe("the row and the strip agree about one card", () => {
  it("shows a foil-only card's figure in its row, not `no stock`", () => {
    // The strip counted its foil price while the row said nobody stocks it —
    // one screen disagreeing with itself about one card.
    const foil = row({
      oracleId: "o4",
      price: { cents: null, foilCents: 1250, asOf: NEWEST } as unknown as ProxyRow["price"],
    });
    render(<ProxyListView newestAsOf={NEWEST} rows={[foil]} hasDecks hasCollection />);
    expect(screen.queryByText(proxyCopy.row.noStock)).toBeNull();
    expect(screen.getAllByText("$12.50").length).toBeGreaterThanOrEqual(1);
  });

  it("does not call a live row with no figure `never stocked`", () => {
    // `priceState` returns `absent` both for no row at all and for a live row
    // whose three price columns are null. Only the first was never stocked.
    const nullish = row({
      oracleId: "o5",
      price: { cents: null, asOf: NEWEST } as unknown as ProxyRow["price"],
    });
    render(<ProxyListView newestAsOf={NEWEST} rows={[nullish]} hasDecks hasCollection />);
    expect(screen.queryByText(proxyCopy.cost.unpriced(1))).toBeNull();
  });
});

// The sheet stands in for the card you play with, so it prints every cost the
// card prints — the one surface where that differs from a row.
describe("ProxyListView — a card that prints two costs", () => {
  it("draws both halves and the mark between them", () => {
    render(
      <ProxyListView
        newestAsOf={NEWEST}
        rows={[row({ manaCost: "{G/U}{G/U} // {1}{G}{U}" })]}
        hasDecks
        hasCollection
      />,
    );

    const pips = document.querySelectorAll("span.rounded-full");
    expect(pips.length).toBeGreaterThanOrEqual(5);
    expect(document.body.textContent).toContain("//");
  });

  // A land front with a spell back prints a cost this sheet must still show,
  // where a row deliberately shows nothing for it.
  it("draws a back face's cost when the front has none", () => {
    render(
      <ProxyListView newestAsOf={NEWEST} rows={[row({ manaCost: " // {3}{R}" })]} hasDecks hasCollection />,
    );

    expect(document.querySelectorAll("span.rounded-full").length).toBeGreaterThanOrEqual(2);
  });
});

// The pips are aria-hidden and the row's card trigger is labelled with the name
// alone, so without this the sheet's costs reach nobody using a screen reader.
it("speaks every cost it prints", () => {
  render(
    <ProxyListView
      newestAsOf={NEWEST}
      rows={[row({ manaCost: "{G/U}{G/U} // {1}{G}{U}" })]}
      hasDecks
      hasCollection
    />,
  );

  const spoken = [...document.querySelectorAll(".sr-only")].map((el) => el.textContent);
  expect(spoken.join(" ")).toContain("second cost 1 green blue");
});
