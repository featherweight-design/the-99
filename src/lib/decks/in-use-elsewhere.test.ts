import { describe, expect, it } from "vitest";
import { inUseElsewhereByDeck } from "./in-use-elsewhere";
import type { Availability, DeckClaim } from "./availability";

function claim(id: string, mature: boolean): DeckClaim {
  return { id, name: id, quantity: 1, mature, pending: false, commander: false };
}

function card(over: Partial<Availability> = {}): Availability {
  return { owned: 1, hard: 1, soft: 0, free: 0, claims: [], ...over };
}

describe("inUseElsewhereByDeck", () => {
  it("counts a card a different finished deck has sleeved", () => {
    const counts = inUseElsewhereByDeck([
      card({ claims: [claim("a", false), claim("b", true)] }),
    ]);
    expect(counts.get("a")).toBe(1);
  });

  it("counts the finished deck too — its card is spoken for by the other one", () => {
    const counts = inUseElsewhereByDeck([
      card({ claims: [claim("a", true), claim("b", true)] }),
    ]);
    expect(counts.get("a")).toBe(1);
    expect(counts.get("b")).toBe(1);
  });

  it("never counts a deck against its own claim", () => {
    const counts = inUseElsewhereByDeck([card({ claims: [claim("a", true)] })]);
    expect(counts.has("a")).toBe(false);
  });

  it("ignores a claim only an unfinished brew holds", () => {
    const counts = inUseElsewhereByDeck([
      card({ claims: [claim("a", false), claim("b", false)] }),
    ]);
    expect(counts.size).toBe(0);
  });

  it("ignores a card there are still spare copies of", () => {
    const counts = inUseElsewhereByDeck([
      card({ owned: 3, hard: 1, free: 2, claims: [claim("a", false), claim("b", true)] }),
    ]);
    expect(counts.size).toBe(0);
  });

  it("counts an over-committed card, which is the worse case of the same fact", () => {
    const counts = inUseElsewhereByDeck([
      card({ owned: 1, hard: 2, free: -1, claims: [claim("a", true), claim("b", true)] }),
    ]);
    expect(counts.get("a")).toBe(1);
  });

  it("ignores a card the player does not own", () => {
    const counts = inUseElsewhereByDeck([
      card({ owned: 0, free: 0, claims: [claim("a", true), claim("b", true)] }),
    ]);
    expect(counts.size).toBe(0);
  });

  it("counts every claimant once two finished decks are in play", () => {
    const counts = inUseElsewhereByDeck([
      card({ claims: [claim("a", false), claim("b", true), claim("c", true)] }),
    ]);
    expect(counts.get("a")).toBe(1);
    expect(counts.get("b")).toBe(1);
    expect(counts.get("c")).toBe(1);
  });

  it("sums across cards", () => {
    const counts = inUseElsewhereByDeck([
      card({ claims: [claim("a", false), claim("b", true)] }),
      card({ claims: [claim("a", false), claim("c", true)] }),
    ]);
    expect(counts.get("a")).toBe(2);
  });
});
