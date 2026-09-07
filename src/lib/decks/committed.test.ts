import { describe, expect, it } from "vitest";
import { committedSupport, firstDeckPerCard, type CommittedDeck } from "./committed";

const deck = (id: string, name: string): CommittedDeck => ({ id, name });

describe("firstDeckPerCard", () => {
  // The rows arrive in the deck list's order, so "first" is decided by the
  // query, not re-derived here — this is the half of the rule the caller keeps.
  it("names the earliest deck for a card that sits in two", () => {
    const map = firstDeckPerCard([
      { oracleId: "sol-ring", deckId: "d1", deckName: "atraxa" },
      { oracleId: "sol-ring", deckId: "d2", deckName: "krenko" },
    ]);
    expect(map.get("sol-ring")).toEqual(deck("d1", "atraxa"));
  });

  it("keeps every card, not only the repeated ones", () => {
    const map = firstDeckPerCard([
      { oracleId: "sol-ring", deckId: "d1", deckName: "atraxa" },
      { oracleId: "cultivate", deckId: "d1", deckName: "atraxa" },
    ]);
    expect([...map]).toEqual([
      ["sol-ring", deck("d1", "atraxa")],
      ["cultivate", deck("d1", "atraxa")],
    ]);
  });

  it("is empty when the player has built nothing", () => {
    expect(firstDeckPerCard([]).size).toBe(0);
  });
});

describe("committedSupport", () => {
  // The read hands back its rows in deck order, so the map is in deck order too.
  const byCard = new Map([
    ["cultivate", deck("d1", "Atraxa")],
    ["sol-ring", deck("d2", "Krenko")],
    ["swords", deck("d2", "Krenko")],
  ]);

  // The regression this function exists to prevent: "Atraxa" sorts first, so the old
  // rule named it on every commander page regardless of how little of that commander's
  // support it actually held.
  it("names the deck holding the most support, not the earliest one", () => {
    expect(committedSupport(["cultivate", "sol-ring", "swords"], byCard).topDeck).toBe("Krenko");
  });

  // The order the ids arrive in is EDHREC's, and it must not reach the answer.
  it("names the same deck whatever order the ids arrive in", () => {
    expect(committedSupport(["swords", "cultivate", "sol-ring"], byCard).topDeck).toBe("Krenko");
  });

  it("counts the named deck's cards, not every committed card", () => {
    expect(committedSupport(["cultivate", "sol-ring", "swords"], byCard).count).toBe(2);
  });

  it("ignores ids the player has not committed anywhere", () => {
    expect(committedSupport(["sol-ring", "rhystic", "swords"], byCard)).toEqual({
      count: 2,
      topDeck: "Krenko",
    });
  });

  // Two names a case-insensitive sort cannot separate. The read broke that tie on
  // `decks.id` before the map was built, so reading the map's order keeps its answer
  // instead of guessing at one.
  it("keeps the read's tiebreak between two decks named the same but for case", () => {
    const tied = new Map([
      ["sol-ring", deck("d1", "atraxa")],
      ["cultivate", deck("d2", "Atraxa")],
    ]);
    expect(committedSupport(["cultivate", "sol-ring"], tied).topDeck).toBe("atraxa");
  });

  // `decks.name` carries no unique constraint, so two lists really can share a
  // name. Grouping on the name would report one deck holding four cards that no
  // single deck holds, and the player would go looking for a list that has half
  // of them.
  it("keeps two decks with the same name apart", () => {
    const twins = new Map([
      ["sol-ring", deck("d1", "Krenko")],
      ["cultivate", deck("d2", "Krenko")],
      ["swords", deck("d2", "Krenko")],
    ]);
    expect(committedSupport(["sol-ring", "cultivate", "swords"], twins)).toEqual({
      count: 2,
      topDeck: "Krenko",
    });
  });

  it("has no deck to name when none of the cards are committed", () => {
    expect(committedSupport(["rhystic"], byCard)).toEqual({ count: 0, topDeck: null });
  });
});
