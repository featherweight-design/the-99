import { describe, expect, it } from "vitest";
import { firstDeckPerCard } from "./committed";

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
