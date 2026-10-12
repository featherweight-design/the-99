import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: {} }));
import { sharedCards } from "./load";

const row = (deckId: string, oracleId: string, quantity = 1) => ({ deckId, oracleId, name: oracleId, typeLine: "Artifact", quantity, imageUri: null });

describe("sharedCards", () => {
  it("keeps only nonbasic cards two decks play, holding what Shopping does not bill", () => {
    const lists = [row("a", "sol"), row("b", "sol"), row("c", "rats", 4), row("d", "rats", 2), row("a", "one"), { ...row("a", "plains"), typeLine: "Basic Land — Plains" }, { ...row("b", "plains"), typeLine: "Basic Land — Plains" }];
    const availability = new Map([["sol", { owned: 1 }], ["rats", { owned: 3 }]]);
    // b buys its Sol Ring; c buys three of its four Rats; d buys none (Shopping bills no proxied or free copy).
    const out = sharedCards(lists, availability, [{ deckId: "b", oracleId: "sol", quantity: 1 }, { deckId: "c", oracleId: "rats", quantity: 3 }], new Set(["a", "b", "c", "d"]));
    expect(out.map((c) => c.oracleId)).toEqual(["sol", "rats"]);
    expect(out[0]).toMatchObject({ owned: 1, decks: [{ id: "a", wants: 1, held: 1 }, { id: "b", wants: 1, held: 0 }] });
    expect(out[1].decks).toEqual([{ id: "c", wants: 4, held: 1 }, { id: "d", wants: 2, held: 2 }]);
  });

  it("leaves out the decks with no card in their list, commanders included, as Shopping bills them nothing", () => {
    const lists = [row("e", "kraum"), row("f", "kraum"), row("a", "kraum")];
    expect(sharedCards(lists, new Map(), [], new Set(["a"]))).toEqual([]);
    expect(sharedCards(lists, new Map(), [], new Set(["a", "e"]))[0].decks.map((d) => d.id)).toEqual(["e", "a"]);
  });
});
