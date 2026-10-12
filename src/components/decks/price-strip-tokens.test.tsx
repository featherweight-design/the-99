// The buy box with joined tokens (plan PR 5): the figure is what the link BUYS, the split line keeps the deck's
// own cost apart from the tokens', and the link carries the token lines. Without tokens the box is exactly itself.
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { PriceStrip } from "./price-strip";
import type { ProvenanceForm } from "../../lib/decks/price";
import type { TokenShopping } from "../../lib/tokens/shopping";

const fresh: ProvenanceForm = { behind: false, when: "Monday" };
const cards = [{ name: "Sol Ring", quantity: 1 }, { name: "Cultivate", quantity: 2 }];
const tokens = (over: Partial<TokenShopping> = {}): TokenShopping => ({
  rows: [{ oracleId: "a" }, { oracleId: "b" }] as never,
  priced: 2,
  cents: 40,
  lines: [
    { name: "Soldier // Eldrazi", quantity: 1, printing: { setCode: "tonc", collectorNumber: "1-17" } },
    { name: "Monk", quantity: 1 },
  ],
  ...over,
});
const href = (c: HTMLElement) => c.querySelector("a")?.getAttribute("href") ?? "";
const decoded = (c: HTMLElement) => {
  const deck = new URL(href(c)).searchParams.get("deck")!;
  return Buffer.from(deck, "base64").toString("utf8");
};
afterEach(cleanup);

describe("PriceStrip with tokens joined", () => {
  it("sums the deck's cards and the tokens in the one figure, and splits them beneath it", () => {
    const { container } = render(
      <PriceStrip summary={{ totalCents: 27048, pricedCopies: 3, totalCopies: 3 }} provenance={fresh} shoppingCards={cards} tokens={tokens()} />,
    );
    expect(container.textContent).toContain("$270.88");
    expect(container.textContent).toContain("3 cards · $270.48  ·  2 tokens · $0.40");
  });

  it("sends the token lines with set and number beside the card lines, and says so", () => {
    const { container } = render(
      <PriceStrip summary={{ totalCents: 100, pricedCopies: 3, totalCopies: 3 }} provenance={fresh} shoppingCards={cards} tokens={tokens()} />,
    );
    expect(decoded(container)).toBe("1 Sol Ring\n2 Cultivate\n1 Soldier // Eldrazi [TONC] 1-17\n1 Monk");
    expect(container.textContent).toContain("Opens Mana Pool with 2 card lines and 2 token lines. Cards send names and quantities; tokens send set and number.");
  });

  it("still draws, for a deck with nothing left to buy but a joined token", () => {
    const { container } = render(
      <PriceStrip summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 0 }} provenance={fresh} shoppingCards={[]} tokens={tokens({ priced: 1, cents: 30 })} />,
    );
    expect(container.textContent).toContain("$0.30");
    expect(container.textContent).toContain("2 tokens · nothing for the deck");
    expect(decoded(container)).toBe("1 Soldier // Eldrazi [TONC] 1-17\n1 Monk");
    expect(container.textContent).toContain("Opens Mana Pool with 2 token lines, each with its set and number");
  });

  it("leaves a sold-out or unpriced token out of the sum, and counts it against the priced clause", () => {
    const { container } = render(
      <PriceStrip summary={{ totalCents: 200, pricedCopies: 3, totalCopies: 3 }} provenance={fresh} shoppingCards={cards} tokens={tokens({ priced: 0, cents: 0 })} />,
    );
    expect(container.textContent).toContain("$2.00");
    expect(container.textContent).toContain("3 of 5 priced");
    // No token cost where there is none to name.
    expect(container.textContent).toContain("3 cards · $2.00  ·  2 tokens");
    expect(container.textContent).not.toContain("2 tokens · $");
  });

  it("is exactly itself without tokens: no split line, no sends line, the card figure and link alone", () => {
    const { container } = render(
      <PriceStrip summary={{ totalCents: 200, pricedCopies: 3, totalCopies: 3 }} provenance={fresh} shoppingCards={cards} />,
    );
    expect(container.textContent).toContain("$2.00");
    expect(container.textContent).not.toContain("token");
    expect(decoded(container)).toBe("1 Sol Ring\n2 Cultivate");
  });

  it("still draws nothing for a deck with nothing to buy and no token", () => {
    const { container } = render(
      <PriceStrip summary={{ totalCents: 0, pricedCopies: 0, totalCopies: 0 }} provenance={fresh} shoppingCards={[]} tokens={null} />,
    );
    expect(container.innerHTML).toBe("");
  });
});
