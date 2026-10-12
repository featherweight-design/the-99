import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
const { stillOpen } = await import("./fits-read-load");

describe("stillOpen: loadFits' open predicate, re-applied to the rows the prompt carries", () => {
  const listed = ["d1", "d2", "d3", "d4", "d5"].map((id) => ({ id }));
  const decks = [
    { id: "d1", commander_oracle_id: "red", partner_oracle_id: null },
    { id: "d2", commander_oracle_id: "red", partner_oracle_id: null },
    // d3 was deleted in between.
    { id: "d4", commander_oracle_id: "subject", partner_oracle_id: null },
    { id: "d5", commander_oracle_id: "blue", partner_oracle_id: "white" },
  ];
  const lists = [{ deck_id: "d1", oracle_id: "other" }, { deck_id: "d2", oracle_id: "subject" }];
  const identityOf = new Map([["red", ["R"]], ["blue", ["U"]], ["white", ["W"]], ["subject", ["R"]]]);

  it("drops a deck that came to hold the card, was deleted, is now led by it, or lost its colors", () => {
    expect(stillOpen(listed, decks, lists, { oracleId: "subject", colorIdentity: ["R"] }, identityOf).map((c) => c.id)).toEqual(["d1"]);
  });

  it("reads a pair's identity as both commanders'", () => {
    expect(stillOpen(listed, decks, lists, { oracleId: "card", colorIdentity: ["U", "W"] }, identityOf).map((c) => c.id)).toEqual(["d5"]);
  });
});
