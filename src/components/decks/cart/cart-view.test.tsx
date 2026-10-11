import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { CartView } from "./cart-view";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { exportLinkOutCopy } from "../../../lib/copy/decks-builder";
import { priceCopy } from "../../../lib/copy/price";
import type { CartPayload } from "../../../lib/decks/cart";

vi.mock("next/link", () => ({
  useLinkStatus: () => ({ pending: false }),
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a>,
}));

const NOW = "2026-10-11T00:00:00.000Z";
const provenance = { behind: false, when: "Saturday" };

// The Sol Ring case on three brews, plus Omnath (committed) with its unowned commander.
function cart(over: Partial<CartPayload> = {}): CartPayload {
  return {
    totalDecks: 21,
    priced: true,
    newestAsOf: NOW,
    decks: [
      { id: "gishath", name: "HD - Gishath", brew: true, copies: 2, cents: 180, pricedCopies: 2 },
      { id: "omnath", name: "HD - Omnath", brew: false, copies: 1, cents: 400, pricedCopies: 1 },
      { id: "kratos", name: "HD - Kratos", brew: true, copies: 1, cents: 150, pricedCopies: 1 },
    ],
    lines: [
      { oracleId: "omn", name: "Omnath, Locus of All", commander: true, owned: 0, heldElsewhere: 0,
        rows: [{ deckId: "omnath", quantity: 1, cents: 400, state: "priced", commander: true, held: 0 }] },
      { oracleId: "sol", name: "Sol Ring", commander: false, owned: 17, heldElsewhere: 17,
        rows: [
          { deckId: "gishath", quantity: 1, cents: 150, state: "priced", commander: false, held: 0 },
          { deckId: "kratos", quantity: 1, cents: 150, state: "priced", commander: false, held: 0 },
        ] },
      { oracleId: "tower", name: "Command Tower", commander: false, owned: 0, heldElsewhere: 0,
        rows: [{ deckId: "gishath", quantity: 1, cents: 30, state: "priced", commander: false, held: 0 }] },
    ],
    ...over,
  };
}

const list = () => within(screen.getByRole("region", { name: copy.list.regionAria }));

describe("CartView", () => {
  it("starts with every deck selected and the whole cart (A2)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeTruthy();
    expect(screen.getByText(`${copy.page.sub(3, 21)} · ${copy.page.brews}`)).toBeTruthy();
    expect(screen.getByText("$7.30")).toBeTruthy();
    expect(screen.getByText(copy.checkout.copiesLine(4, 3))).toBeTruthy();
    expect(screen.getByText(copy.checkout.sends(3))).toBeTruthy();
    expect(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeTruthy();
    expect(screen.getAllByText(copy.selections.unselectAll).length).toBeGreaterThan(0);
  });

  it("leads with the commander, then the line most decks need, with full deck names", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    const items = list().getAllByRole("listitem");
    expect(items.map((li) => li.textContent?.split(" ")[0])).toEqual(["Omnath,", "Sol", "Command"]);
    expect(within(items[1]).getByText(copy.list.decks(2, ["HD - Gishath", "HD - Kratos"]))).toBeTruthy();
    expect(within(items[1]).getByText(copy.list.owned(17))).toBeTruthy();
    expect(within(items[2]).queryByText(/you own/)).toBeNull();
  });

  it("reads the cart again when a deck is unselected, and writes nothing (A3)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getByRole("checkbox", { name: copy.selections.aria("HD - Gishath", true) }));
    const items = list().getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[1]).getByText(copy.list.decks(1, ["HD - Kratos"]))).toBeTruthy();
    expect(screen.getByText("$5.50")).toBeTruthy();
    expect(screen.getByText(copy.checkout.copiesLine(2, 2))).toBeTruthy();
    expect(screen.getAllByText(copy.selections.selectAll).length).toBeGreaterThan(0);
  });

  it("holds the way back when every deck is unselected, with no figure and no link (A4)", () => {
    render(<CartView cart={cart()} provenance={provenance} />);
    fireEvent.click(screen.getAllByText(copy.selections.unselectAll)[0]);
    expect(screen.getByText(copy.none.title)).toBeTruthy();
    expect(screen.getByText(copy.checkout.noneSelected)).toBeTruthy();
    expect(screen.queryByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: copy.none.action(3) }));
    expect(screen.getByText(copy.checkout.copiesLine(4, 3))).toBeTruthy();
  });

  it("keeps its rows and its link when the prices could not be read (T2)", () => {
    const unpriced = cart({
      priced: false,
      newestAsOf: null,
      decks: cart().decks.map((d) => ({ ...d, cents: 0, pricedCopies: 0 })),
      lines: cart().lines.map((l) => ({ ...l, rows: l.rows.map((r) => ({ ...r, cents: null, state: null })) })),
    });
    render(<CartView cart={unpriced} provenance={null} />);
    expect(screen.queryByText(/\$\d/)).toBeNull();
    expect(screen.getByText(copy.checkout.unread)).toBeTruthy();
    expect(screen.getByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) })).toBeTruthy();
    expect(list().getAllByRole("listitem")).toHaveLength(3);
  });

  it("says how many copies a sold-out line leaves unpriced (T1)", () => {
    const soldOut = cart();
    soldOut.lines[2].rows = [{ deckId: "gishath", quantity: 1, cents: null, state: "soldOut", commander: false, held: 0 }];
    soldOut.decks[0] = { ...soldOut.decks[0], cents: 150, pricedCopies: 1 };
    render(<CartView cart={soldOut} provenance={provenance} />);
    expect(screen.getByText(priceCopy.strip.pricedClause(3, 4))).toBeTruthy();
  });

  it("has nothing to select between with one deck (E1)", () => {
    const one = cart({ decks: [cart().decks[1]], lines: [cart().lines[0]] });
    render(<CartView cart={one} provenance={provenance} />);
    expect(screen.queryByText(copy.selections.unselectAll)).toBeNull();
    expect(screen.getByText(copy.page.sub(1, 21))).toBeTruthy();
  });

  it("draws the empty state when no deck is missing a card (E3)", () => {
    render(<CartView cart={cart({ decks: [], lines: [] })} provenance={provenance} />);
    expect(screen.getByText(copy.empty.title)).toBeTruthy();
    expect(screen.getByText(copy.page.subNone(21))).toBeTruthy();
    expect(screen.getByRole("link", { name: copy.empty.back }).getAttribute("href")).toBe("/decks");
  });

  it("splits a cart too long for one link into named parts (K3)", () => {
    const long = (id: string) => ({
      oracleId: id, name: `${id} ${"x".repeat(13_000)}`, commander: false, owned: 0, heldElsewhere: 0,
      rows: [{ deckId: "omnath", quantity: 1, cents: 100, state: "priced" as const, commander: false, held: 0 }],
    });
    render(<CartView cart={cart({ lines: [long("a"), long("b"), long("c")] })} provenance={provenance} />);
    const links = screen.getAllByRole("link", { name: new RegExp(exportLinkOutCopy.shopping) });
    expect(links.length).toBeGreaterThan(1);
    expect(links[0].textContent).toContain(copy.checkout.part(1, links.length, 1));
  });
});
