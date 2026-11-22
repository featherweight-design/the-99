import { describe, expect, it } from "vitest";
import { deckNeedByCard } from "./deck-need";

const row = (deckId: string, oracleId: string, quantity = 1) => ({ deckId, oracleId, quantity });
const slots = [
  { id: "d1", commander: "cmd", partner: null },
  { id: "d2", commander: null, partner: "par" },
];

describe("deckNeedByCard", () => {
  it("counts distinct decks per card", () => {
    expect(deckNeedByCard([row("d1", "a"), row("d2", "a", 3), row("d1", "b")], slots)).toEqual({ a: 2, b: 1 });
  });
  it("leaves a deck's commander and partner out, and rows it does not own", () => {
    expect(deckNeedByCard([row("d1", "cmd"), row("d2", "par"), row("d2", "cmd"), row("gone", "x")], slots)).toEqual({ cmd: 1 });
  });
  it("ignores a row with nothing to buy", () => {
    expect(deckNeedByCard([row("d1", "a", 0)], slots)).toEqual({});
  });
});
