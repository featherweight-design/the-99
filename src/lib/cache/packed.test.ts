import { describe, expect, it } from "vitest";

import { packJson, unpackJson } from "./packed";

describe("packJson", () => {
  it("round-trips a list exactly, including null, nested arrays and non-ASCII", () => {
    const list = [
      { oracleId: "a", name: "Æther Vial", printedName: null, setCounts: [["m21", 2]], price: 80 },
      { oracleId: "b", name: "Jötun Grunt", printedName: "Jötun", setCounts: [], price: null },
    ];
    expect(unpackJson(packJson(list))).toEqual(list);
  });

  // What the data cache sees is this string, and it refuses an entry over 2 MB. A list this size is
  // 7,500 cards at ~400 B (2.9 MB plain, over the ceiling): packed it must come in far under it.
  it("holds a list over the data cache's ceiling well under it", () => {
    const card = (i: number) => ({
      oracleId: `0000${i}-aaaa-bbbb-cccc-${String(i).padStart(12, "0")}`,
      name: `Card number ${i}`,
      typeLine: "Creature — Elf Warrior",
      manaCost: "{1}{G}",
      rarity: "common",
      colorIdentity: ["G"],
      setCounts: [["m21", 1]],
      imageUri: `https://cards.scryfall.io/normal/front/a/b/0000${i}-aaaa.jpg?15${i}`,
      quantity: 1,
      price: i % 500,
    });
    const list = Array.from({ length: 7500 }, (_, i) => card(i));
    expect(JSON.stringify(list).length).toBeGreaterThan(2 * 1024 * 1024);
    expect(JSON.stringify(packJson(list)).length).toBeLessThan(1024 * 1024);
  });
});
