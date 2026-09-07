import { describe, expect, it } from "vitest";
import { committedSupport, firstDeckPerCard } from "./committed";

describe("firstDeckPerCard", () => {
  // The rows arrive in the deck list's order, so "first" is decided by the
  // query, not re-derived here — this is the half of the rule the caller keeps.
  it("names the earliest deck for a card that sits in two", () => {
    const map = firstDeckPerCard([
      { oracleId: "sol-ring", deckName: "atraxa" },
      { oracleId: "sol-ring", deckName: "krenko" },
    ]);
    expect(map.get("sol-ring")).toBe("atraxa");
  });

  it("keeps every card, not only the repeated ones", () => {
    const map = firstDeckPerCard([
      { oracleId: "sol-ring", deckName: "atraxa" },
      { oracleId: "cultivate", deckName: "atraxa" },
    ]);
    expect([...map]).toEqual([
      ["sol-ring", "atraxa"],
      ["cultivate", "atraxa"],
    ]);
  });

  it("is empty when the player has built nothing", () => {
    expect(firstDeckPerCard([]).size).toBe(0);
  });
});

describe("committedSupport", () => {
  // The read hands back its rows in deck order, so the map is in deck order too.
  const byCard = new Map([
    ["cultivate", "Atraxa"],
    ["sol-ring", "Krenko"],
    ["swords", "Krenko"],
  ]);

  it("counts only the ids the player has already spent", () => {
    expect(committedSupport(["sol-ring", "rhystic", "cultivate"], byCard).count).toBe(2);
  });

  // Whichever card came first in EDHREC's order, the sentence names the same deck the
  // committed marks below it point at.
  it("names the first deck by the ordering the committed read imposes", () => {
    expect(committedSupport(["sol-ring", "cultivate"], byCard).firstDeck).toBe("Atraxa");
    expect(committedSupport(["cultivate", "sol-ring"], byCard).firstDeck).toBe("Atraxa");
  });

  // Two names a case-insensitive sort cannot separate. The read broke that tie on
  // `decks.id` before the map was built, so reading the map's order keeps its answer
  // instead of guessing at one.
  it("keeps the read's tiebreak between two decks named the same but for case", () => {
    const tied = new Map([
      ["sol-ring", "atraxa"],
      ["cultivate", "Atraxa"],
    ]);
    expect(committedSupport(["cultivate", "sol-ring"], tied).firstDeck).toBe("atraxa");
  });

  it("has no deck to name when none of the cards are committed", () => {
    expect(committedSupport(["rhystic"], byCard)).toEqual({ count: 0, firstDeck: null });
  });
});
