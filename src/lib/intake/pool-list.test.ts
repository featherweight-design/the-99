import { describe, expect, it } from "vitest";

import { colorsKey, creatureTypes, formatPoolList, leadingThemes } from "./pool-list";

const tag = (label: string, count: number) => ({ slug: label.toLowerCase(), label, count });

describe("the commander list", () => {
  const rows = [
    { oracleId: "z", name: "Zur the Enchanter", colorIdentity: ["U", "W", "B"], typeLine: "Legendary Creature — Human Wizard", tags: [tag("Enchantress", 9), tag("Auras", 4)] },
    { oracleId: "a", name: "Atraxa, Praetors' Voice", colorIdentity: ["G", "W", "U", "B"], typeLine: "Legendary Creature — Phyrexian Angel Horror", tags: [tag("Counters", 3), tag("Superfriends", 8), tag("Infect", 5), tag("Proliferate", 1)] },
  ];

  it("orders by name and keys each line by its place, mapping both ways", () => {
    const list = formatPoolList(rows, "g");
    expect(list.text).toBe([
      "1|Atraxa, Praetors' Voice|WUBG|Phyrexian Angel Horror|Superfriends, Infect, Counters",
      "2|Zur the Enchanter|WUB|Human Wizard|Enchantress, Auras",
    ].join("\n"));
    expect(list.idOf.get(1)).toBe("a");
    expect(list.keyOf.get("z")).toBe(2);
  });

  it("is the same bytes whatever order the rows arrive in, so the cached prefix is shared", () => {
    expect(formatPoolList([...rows].reverse(), "g").text).toBe(formatPoolList(rows, "g").text);
  });

  it("reads creature types only from a face that can bear them", () => {
    expect(creatureTypes("Legendary Enchantment Creature — God // Legendary Artifact")).toEqual(["God"]);
    expect(creatureTypes("Legendary Planeswalker — Jace")).toEqual([]);
    expect(creatureTypes(null)).toEqual([]);
  });

  it("writes colors in WUBRG order, and C for none", () => {
    expect(colorsKey(["G", "R", "W"])).toBe("WRG");
    expect(colorsKey([])).toBe("C");
  });

  it("leads with the themes most decks carry, EDHREC's order breaking ties", () => {
    expect(leadingThemes([tag("A", 1), tag("B", 5), tag("C", 5), tag("D", 2)], 3)).toEqual(["B", "C", "D"]);
  });
});
