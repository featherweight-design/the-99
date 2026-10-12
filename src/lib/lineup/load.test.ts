import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
import { sharedCards } from "./load";

const row = (deckId: string, oracleId: string, quantity = 1) => ({ deckId, oracleId, name: oracleId, typeLine: "Artifact", quantity });

describe("sharedCards", () => {
  it("keeps only nonbasic cards two decks play, with the claim model's holdings, and a proxied row never short", () => {
    const lists = [row("a", "sol"), row("b", "sol"), row("c", "sol"), row("a", "one"), { ...row("a", "plains"), typeLine: "Basic Land — Plains" }, { ...row("b", "plains"), typeLine: "Basic Land — Plains" }];
    const availability = new Map([["sol", {
      owned: 1,
      claims: [
        { id: "a", name: "A", quantity: 1, mature: true, pending: false, commander: false, since: 1 },
        { id: "b", name: "B", quantity: 1, mature: true, pending: false, commander: false, since: 2 },
      ],
    }]]) as never;
    const out = sharedCards(lists, availability, new Set(["c|sol"]));
    expect(out.map((c) => c.oracleId)).toEqual(["sol"]);
    expect(out[0].decks).toEqual([{ id: "a", wants: 1, held: 1 }, { id: "b", wants: 1, held: 0 }, { id: "c", wants: 1, held: 1 }]);
  });
});
