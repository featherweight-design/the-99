import { describe, expect, it } from "vitest";

import { keyCreatureType } from "../recs/themes";
import { heldSubtypes } from "../swaps/honest";
import { deckLens } from "./lens";
import { heldCardTypes } from "./match";

const NONCREATURE = new Set(["Treasure", "Equipment", "Gate", "Food"]);
const row = (oracleId: string, typeLine: string, oracleText: string | null = null, quantity = 1) =>
  ({ oracleId, typeLine, oracleText, quantity });

describe("deckLens", () => {
  it("counts the key creature type by copies, off the draft", () => {
    const draft = [row("a", "Creature — Elf Druid", null, 3), row("b", "Creature — Elf Warrior", null, 2), row("c", "Creature — Dinosaur", null, 4)];
    const lens = (d: typeof draft) => deckLens({ draft: d, commanderTypeLines: [], holding: d, leaving: null, noncreatureSubtypes: NONCREATURE });
    expect(lens(draft).keyType).toBe("Elf");
    expect(lens(draft.slice(2)).keyType).toBeNull();
  });

  it("lets a commander's own type break a near tie", () => {
    const draft = [row("s", "Creature — Soldier", null, 25), row("h", "Creature — Human", null, 24)];
    const l = deckLens({ draft, commanderTypeLines: ["Legendary Creature — Human Knight"], holding: [], leaving: null, noncreatureSubtypes: NONCREATURE });
    expect(l.keyType).toBe("Human");
  });

  it("reads held subtypes and card types off the holding rows, a commander's token text included", () => {
    const l = deckLens({
      draft: [],
      commanderTypeLines: ["Legendary Creature — Dinosaur"],
      holding: [
        row("cmdr", "Legendary Creature — Dinosaur", "Whenever this attacks, create a Treasure token."),
        row("gate", "Land — Gate"),
      ],
      leaving: null,
      noncreatureSubtypes: NONCREATURE,
    });
    expect([...l.held].sort()).toEqual(["Dinosaur", "Gate", "Treasure"]);
    expect([...l.heldTypes].sort()).toEqual(["creature", "land"]);
    expect(l.isSubtype("Treasure")).toBe(true);
    expect(l.isSubtype("Elf")).toBe(false);
  });

  it("leaves the leaving card out of what is held, and still counts it toward the key type", () => {
    const draft = [
      row("elves", "Creature — Elf", null, 4),
      row("cut", "Artifact Creature — Elf", "When this enters, create a Food token."),
    ];
    const l = deckLens({ draft, commanderTypeLines: [], holding: draft, leaving: "cut", noncreatureSubtypes: NONCREATURE });
    expect(l.keyType).toBe("Elf");
    expect(l.held.has("Food")).toBe(false);
    expect(l.heldTypes.has("artifact")).toBe(false);
    const kept = deckLens({ draft, commanderTypeLines: [], holding: draft, leaving: null, noncreatureSubtypes: NONCREATURE });
    expect(kept.held.has("Food")).toBe(true);
    expect(kept.heldTypes.has("artifact")).toBe(true);
  });

  it("is the stand-ins sheet's former inline lens, field for field", () => {
    const draftRows = [
      { oracle_id: "a", type_line: "Creature — Elf Druid", oracle_text: "Create a Treasure token.", quantity: 6 },
      { oracle_id: "cut", type_line: "Artifact — Equipment", oracle_text: null, quantity: 1 },
    ];
    const cmdrRows = [{ oracle_id: "cmdr", type_line: "Legendary Creature — Elf Noble", oracle_text: "Create a Food token." }];
    const cutOracleId = "cut";
    // gather.ts before the extraction, verbatim.
    const others = [...draftRows, ...cmdrRows].filter((r) => r.oracle_id !== cutOracleId);
    const before = {
      keyType: keyCreatureType(draftRows.map((r) => ({ typeLine: r.type_line, quantity: Number(r.quantity) })), cmdrRows.map((r) => r.type_line)),
      held: heldSubtypes(others.map((r) => ({ typeLine: r.type_line, oracleText: r.oracle_text }))),
      heldTypes: heldCardTypes(others.map((r) => r.type_line)),
    };
    const after = deckLens({
      draft: draftRows.map((r) => ({ typeLine: r.type_line, quantity: r.quantity })),
      commanderTypeLines: cmdrRows.map((r) => r.type_line),
      holding: [...draftRows, ...cmdrRows].map((r) => ({ oracleId: r.oracle_id, typeLine: r.type_line, oracleText: r.oracle_text })),
      leaving: cutOracleId,
      noncreatureSubtypes: NONCREATURE,
    });
    expect({ keyType: after.keyType, held: after.held, heldTypes: after.heldTypes }).toEqual(before);
    expect(after.held.has("Equipment")).toBe(false);
  });
});
