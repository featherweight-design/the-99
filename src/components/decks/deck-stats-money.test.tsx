import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { manaCurve, typeCurve } from "../../lib/decks/stats";
import type { MoneyStats } from "../../lib/decks/stats-money";
import { DeckStatsView } from "./deck-stats-view";

const money = (over: Partial<MoneyStats> = {}): MoneyStats => ({
  total: 100,
  basics: 12,
  owned: { copies: 76, cents: 41230, pricedCopies: 76 },
  toBuy: { copies: 12, cents: 7415, pricedCopies: 12 },
  value: { cents: 48645, pricedCopies: 88, copies: 88 },
  priciest: [
    { oracleId: "a", name: "The Great Henge", cents: 3820, qualifier: null, toBuy: true },
    { oracleId: "b", name: "Doubling Season", cents: 2960, qualifier: null, toBuy: false },
  ],
  ...over,
});
const draw = (m: MoneyStats, onShop?: () => void) =>
  render(<DeckStatsView data={{ curve: manaCurve([]), types: typeCurve([]), money: m }} onShop={onShop} />);
const card = () => screen.getByRole("figure", { name: /^Money and ownership/ });

describe("DeckStatsView money card", () => {
  it("names its denominator and draws the three figures", () => {
    draw(money());
    expect(screen.getByRole("figure", { name: "Money and ownership, 100 cards" })).toBeInTheDocument();
    expect(card()).toHaveTextContent("$486.45");
    expect(card()).toHaveTextContent("76 copies, plus 12 basics");
    expect(card()).toHaveTextContent("$74.15");
    expect(card()).toHaveTextContent("12 copies, after the ones you own");
  });

  it("draws one square per card, owned then basics then to buy", () => {
    const { container } = draw(money());
    const kinds = [...container.querySelectorAll("[data-money-square]")].map((e) => e.getAttribute("data-money-square"));
    expect(kinds).toHaveLength(100);
    expect(kinds.indexOf("basic")).toBe(76);
    expect(kinds.indexOf("toBuy")).toBe(88);
  });

  it("links to Shopping with the count, and presses through", () => {
    const onShop = vi.fn();
    draw(money(), onShop);
    fireEvent.click(screen.getByRole("button", { name: /See the 12 in Shopping/ }));
    expect(onShop).toHaveBeenCalledTimes(1);
  });

  it("says Nothing when everything is owned, and drops the To buy legend and the link", () => {
    draw(money({ toBuy: { copies: 0, cents: 0, pricedCopies: 0 }, owned: { copies: 88, cents: 48645, pricedCopies: 88 } }), vi.fn());
    expect(card()).toHaveTextContent("Nothing");
    expect(card()).toHaveTextContent("every copy is in your collection");
    expect(within(card()).queryByText("To buy")).toBeNull();
    expect(within(card()).queryByRole("button")).toBeNull();
    expect(card()).not.toHaveTextContent("$0.00");
  });

  it("says no price, never $0.00, and how many copies it priced", () => {
    draw(
      money({
        total: 12,
        basics: 3,
        owned: { copies: 8, cents: 2930, pricedCopies: 8 },
        toBuy: { copies: 1, cents: 0, pricedCopies: 0 },
        value: { cents: 2930, pricedCopies: 8, copies: 9 },
        priciest: [{ oracleId: "x", name: "Ophiomancer", cents: null, qualifier: null, toBuy: true }],
      }),
    );
    expect(card()).toHaveTextContent("8 of 9 copies priced");
    expect(card()).toHaveTextContent("1 copy");
    expect(card()).toHaveTextContent("no price from ManaPool for this one");
    expect(card()).toHaveTextContent("no price");
    expect(card()).not.toHaveTextContent("$0.00");
  });

  it("states a foil-only price with its qualifier", () => {
    draw(money({ priciest: [{ oracleId: "f", name: "Foily", cents: 940, qualifier: "foil", toBuy: false }] }));
    expect(card()).toHaveTextContent("$9.40 foil");
  });

  it("says how many copies a part-priced group priced, so a part-total never reads as the whole", () => {
    draw(
      money({
        owned: { copies: 5, cents: 1000, pricedCopies: 4 },
        toBuy: { copies: 12, cents: 900, pricedCopies: 3 },
      }),
    );
    expect(card()).toHaveTextContent("3 of 12 copies priced, after the ones you own");
    expect(card()).toHaveTextContent("4 of 5 copies priced, plus 12 basics");
  });
});
