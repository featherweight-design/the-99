import { describe, it, expect } from "vitest";
import { proxyCopy } from "./proxies";

// The contract-bearing branches, pinned the way `availability.test.ts` and
// `deck-versioning.test.ts` pin theirs. Every string below can regress while a
// component test that renders it stays green, because the component asserts the
// copy constant rather than its words.

/**
 * Every shipped string, INCLUDING the interpolated ones.
 *
 * `JSON.stringify(proxyCopy)` was the first version of this and it silently
 * dropped every function-valued leaf — which is most of the module — so the
 * three guards below scanned the literals only and a regression in
 * `control.marked`, `announceMarked` or either subtitle passed them untouched.
 * A guard that skips what it claims to cover is worse than no guard.
 *
 * Numeric branches are materialised at 1 AND 2, because the singular arm is
 * separately authored and can regress on its own.
 */
const everyString = (): string => [
  JSON.stringify(proxyCopy),
  proxyCopy.tag.pair("Tymna"),
  proxyCopy.tag.pairTitle("Tymna"),
  proxyCopy.tag.pairAria("Tymna Weaver"),
  proxyCopy.control.label("HD Gods"),
  proxyCopy.control.marked("HD Gods"),
  proxyCopy.control.refused("The Ozolith"),
  proxyCopy.control.announceMarked("The Ozolith", "HD Gods"),
  proxyCopy.control.announceUnmarked("The Ozolith", "HD Gods"),
  proxyCopy.receipt.note(1),
  proxyCopy.receipt.note(2),
  proxyCopy.receipt.deckLinkAria("HD Gods"),
  proxyCopy.deckHeader.line(1),
  proxyCopy.deckHeader.line(2),
  proxyCopy.deckCard.line(1),
  proxyCopy.deckCard.line(2),
  proxyCopy.review.a11y("The Ozolith"),
  proxyCopy.page.subtitle(1, 1),
  proxyCopy.page.subtitle(2, 3),
  proxyCopy.page.subtitleWithCollection(1, 1),
  proxyCopy.page.subtitleWithCollection(2, 3),
  proxyCopy.page.tail(1),
  proxyCopy.page.tail(2),
  proxyCopy.cost.line(1, 1),
  proxyCopy.cost.line(7, 9),
  proxyCopy.cost.unpriced(1),
  proxyCopy.cost.unpriced(2),
  proxyCopy.cost.soldOut(1),
  proxyCopy.cost.soldOut(2),
  proxyCopy.cost.stale("14 September"),
  proxyCopy.row.cardAria("The Ozolith"),
  proxyCopy.row.deckAria("HD Gods"),
  proxyCopy.row.deckCount(1),
  proxyCopy.row.deckCount(2),
].join(" \n ");

describe("nothing here may be read as ownership", () => {
  const every = everyString();

  it("never says the player has or owns the card", () => {
    // The one rule this feature can break. `availability.ts`'s header states it:
    // we describe LISTS, never boxes, binders or sleeves.
    expect(every).not.toMatch(/you (have|own) it/i);
    expect(every).not.toMatch(/in your collection now/i);
  });

  it("never carries a quantity of proxies", () => {
    // Ruling 5: a proxy covers the deck's whole ask and has no quantity, so
    // there is no copy in this file that counts proxies OF ONE CARD.
    expect(every).not.toMatch(/×\d/);
    expect(every).not.toMatch(/prints \d/);
  });

  it("uses no em dash in a shipped string", () => {
    // Rule 4 applies in this repository since the 2026-09-13 sweep.
    expect(every).not.toContain("—");
  });
});

describe("the marked state says what did not happen", () => {
  it("names the slot and the collection in one breath", () => {
    // "Covered" alone is true and incomplete: the second clause is what stops a
    // reader inferring a purchase.
    const marked = proxyCopy.control.marked("HD Gods");
    expect(marked).toContain("slot is filled");
    expect(marked.toLowerCase()).toContain("no copy in your collection is used");
    // Named, because a sheet paged through with Prev/Next is easy to lose your
    // place in.
    expect(marked).toContain("HD Gods");
  });

  it("states ruling 2 without a confirm", () => {
    expect(proxyCopy.control.note).toContain("Takes effect at once");
    expect(proxyCopy.control.note).not.toContain("—");
  });
});

describe("counts have singular arms", () => {
  it("counts cards and decks", () => {
    expect(proxyCopy.page.subtitle(1, 1)).toContain("1 card");
    expect(proxyCopy.page.subtitle(1, 1)).toContain("1 deck");
    expect(proxyCopy.page.subtitle(2, 3)).toContain("2 cards");
    expect(proxyCopy.page.subtitle(2, 3)).toContain("3 decks");
  });

  it("drops the collection clause for a player who has none", () => {
    // The clause reassures a reader who HAS a collection that this page did not
    // move anything in it. To a reader with none it explains nothing.
    expect(proxyCopy.page.subtitleWithCollection(2, 1).length)
      .toBeGreaterThan(proxyCopy.page.subtitle(2, 1).length);
    expect(proxyCopy.page.subtitle(2, 1)).not.toContain("collection");
  });

  it("names the tail and the deck count singly", () => {
    expect(proxyCopy.page.tail(1)).toContain("1 more card");
    expect(proxyCopy.page.tail(4)).toContain("4 more cards");
    expect(proxyCopy.row.deckCount(1)).toBe("1 deck");
    expect(proxyCopy.row.deckCount(2)).toBe("2 decks");
  });
});

describe("the cost strip always states its own gap", () => {
  it("says what the figure covers", () => {
    expect(proxyCopy.cost.line(7, 9)).toBe("over 7 of the 9");
  });

  it("stands something in for a figure nobody can quote", () => {
    // A zero would read as a list that costs nothing to own, rather than one
    // nobody is selling.
    expect(proxyCopy.cost.noneCostable).not.toContain("0");
  });
});

describe("the two empty branches name different preconditions", () => {
  it("does not send a deckless player to their decks", () => {
    expect(proxyCopy.empty.heading).not.toBe(proxyCopy.empty.noDecksHeading);
    expect(proxyCopy.empty.noDecksAction).not.toBe(proxyCopy.empty.action);
  });
});
