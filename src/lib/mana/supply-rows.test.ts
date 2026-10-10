import { describe, expect, it } from "vitest";
import { manaSupplyRows } from "./supply-rows";

const card = (oracleId: string, typeLine: string, quantity = 1, manaCost: string | null = null) => ({ oracleId, name: oracleId, typeLine, manaCost, quantity });

describe("manaSupplyRows", () => {
  it("takes a land's colors from the read, a source's from the sources, and flags only sources as ramp", () => {
    const rows = manaSupplyRows(
      [card("dual", "Land", 1), card("rock", "Artifact", 1, "{2}"), card("bear", "Creature", 2, "{1}{G}")],
      [],
      { dual: ["G", "U"] },
      { rock: ["C"] },
      ["G", "U"],
    );
    expect(rows).toEqual([
      { id: "dual", typeLine: "Land", manaCost: null, quantity: 1, produces: ["G", "U"], ramp: false },
      { id: "rock", typeLine: "Artifact", manaCost: "{2}", quantity: 1, produces: ["C"], ramp: true },
      { id: "bear", typeLine: "Creature", manaCost: "{1}{G}", quantity: 2, produces: [], ramp: false },
    ]);
  });

  it("carries Scryfall's mana value onto a card's row and leaves a commander's out", () => {
    const rows = manaSupplyRows([{ ...card("bear", "Creature", 1, "{1}{G}"), cmc: 2 }], [{ typeLine: "Legendary Creature", manaCost: "{3}{G}" }], {}, {}, []);
    expect(rows[0]).toMatchObject({ id: "bear", cmc: 2 });
    expect(rows[1]).not.toHaveProperty("cmc");
  });

  it("reads a land the page had no text for from its type line alone", () => {
    const [row] = manaSupplyRows([card("added", "Basic Land — Island")], [], {}, {}, ["U"]);
    expect(row.produces).toEqual(["U"]);
  });

  it("adds each commander as a row with no colors, so its pips are demand and it is never a source", () => {
    const rows = manaSupplyRows([], [{ typeLine: "Legendary Creature", manaCost: "{R}{G}" }, { typeLine: "Legendary Creature", manaCost: "{W}" }], {}, {}, []);
    expect(rows).toEqual([
      { id: "commander:0", typeLine: "Legendary Creature", manaCost: "{R}{G}", quantity: 1 },
      { id: "commander:1", typeLine: "Legendary Creature", manaCost: "{W}", quantity: 1 },
    ]);
  });
});
