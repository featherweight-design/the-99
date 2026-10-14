import { describe, expect, it, vi } from "vitest";

import { db } from "../../db";
import {
  type RevealedPrinting,
  compareCollectorNumbers,
  isLegendaryCreature,
  loadRevealedCommanders,
  revealedCommanders,
  revealedPrintingsQuery,
} from "./revealed";

const p = (over: Partial<RevealedPrinting>): RevealedPrinting => ({
  setCode: "trc",
  oracleId: "o-1",
  name: "Card",
  colorIdentity: [],
  typeLine: "Legendary Creature — Human",
  imageUriSmall: null,
  collectorNumber: "1",
  ...over,
});

describe("isLegendaryCreature", () => {
  it("keeps legendary creatures, an enchantment creature included", () => {
    expect(isLegendaryCreature("Legendary Creature — Human Doctor")).toBe(true);
    expect(isLegendaryCreature("Legendary Enchantment Creature — God")).toBe(true);
    expect(isLegendaryCreature("Legendary Artifact Creature — Robot")).toBe(true);
  });

  it("drops a legendary non-creature and a creature that is not legendary", () => {
    expect(isLegendaryCreature("Legendary Artifact — Equipment")).toBe(false);
    expect(isLegendaryCreature("Legendary Planeswalker — Spock")).toBe(false);
    expect(isLegendaryCreature("Creature — Human Soldier")).toBe(false);
    expect(isLegendaryCreature("Instant")).toBe(false);
  });
});

describe("compareCollectorNumbers", () => {
  it("compares the leading digits as numbers, then as strings", () => {
    expect(compareCollectorNumbers("78", "300")).toBeLessThan(0);
    expect(compareCollectorNumbers("300", "78")).toBeGreaterThan(0);
    expect(compareCollectorNumbers("78", "78a")).toBeLessThan(0);
    expect(compareCollectorNumbers("9", "10")).toBeLessThan(0);
    expect(compareCollectorNumbers("78", "78")).toBe(0);
  });

  it("puts a number with no leading digit last", () => {
    expect(compareCollectorNumbers("★1", "300")).toBeGreaterThan(0);
    expect(compareCollectorNumbers("300", "★1")).toBeLessThan(0);
  });
});

describe("revealedCommanders", () => {
  it("keeps one entry per card, at its lowest collector number (Christine Chapel at 78 and 300)", () => {
    const out = revealedCommanders([
      p({ oracleId: "chapel", name: "Christine Chapel", collectorNumber: "300", imageUriSmall: "s300" }),
      p({ oracleId: "chapel", name: "Christine Chapel", collectorNumber: "78", imageUriSmall: "s78" }),
    ]);
    expect(out.trc).toEqual([{ oracleId: "chapel", name: "Christine Chapel", colorIdentity: [], imageUriSmall: "s78", collectorNumber: "78" }]);
  });

  it("keeps 78 over 78a and over a later 300, whatever order the read gives", () => {
    const out = revealedCommanders([
      p({ oracleId: "a", collectorNumber: "78a" }),
      p({ oracleId: "a", collectorNumber: "78" }),
      p({ oracleId: "a", collectorNumber: "300" }),
    ]);
    expect(out.trc.map((c) => c.collectorNumber)).toEqual(["78"]);
  });

  it("orders a set's commanders by collector number, numerically", () => {
    const out = revealedCommanders([
      p({ oracleId: "c", collectorNumber: "300" }),
      p({ oracleId: "a", collectorNumber: "78" }),
      p({ oracleId: "b", collectorNumber: "9" }),
    ]);
    expect(out.trc.map((c) => c.oracleId)).toEqual(["b", "a", "c"]);
  });

  it("drops what is not a legendary creature, and a set left with none has no key", () => {
    const out = revealedCommanders([
      p({ setCode: "trc", oracleId: "x", typeLine: "Legendary Artifact" }),
      p({ setCode: "trc", oracleId: "y", typeLine: "Creature — Elf" }),
      p({ setCode: "drc", oracleId: "z", typeLine: "Legendary Enchantment Creature — God" }),
    ]);
    expect(Object.keys(out)).toEqual(["drc"]);
    expect(out.drc.map((c) => c.oracleId)).toEqual(["z"]);
  });

  it("keeps sets apart: one card in two sets is an entry in each", () => {
    const out = revealedCommanders([
      p({ setCode: "trc", oracleId: "k", collectorNumber: "5" }),
      p({ setCode: "drc", oracleId: "k", collectorNumber: "2" }),
    ]);
    expect(out.trc.map((c) => c.collectorNumber)).toEqual(["5"]);
    expect(out.drc.map((c) => c.collectorNumber)).toEqual(["2"]);
  });
});

describe("revealedPrintingsQuery", () => {
  const { sql, params } = revealedPrintingsQuery(["trc", "drc"], db).toSQL();

  it("reads printings in those sets, joined to their cards", () => {
    expect(sql).toContain(`inner join "cards" on "cards"."oracle_id" = "printings"."oracle_id"`);
    expect(sql).toContain(`where "printings"."set_code" in ($1, $2)`);
    expect(params).toEqual(["trc", "drc"]);
  });

  it("takes the card's name, identity and type line, and the printing's art and number", () => {
    for (const col of [`"cards"."name"`, `"cards"."color_identity"`, `"cards"."type_line"`, `"printings"."image_uri_small"`, `"printings"."image_uri"`, `"printings"."collector_number"`]) {
      expect(sql).toContain(col);
    }
  });
});

describe("loadRevealedCommanders", () => {
  it("asks nothing for no codes", async () => {
    const select = vi.spyOn(db, "select");
    expect(await loadRevealedCommanders([])).toEqual({});
    expect(select).not.toHaveBeenCalled();
    select.mockRestore();
  });

  it("falls back to the full image when a printing has no small one", async () => {
    const rows = [{ setCode: "trc", oracleId: "a", name: "A", colorIdentity: ["W"], typeLine: "Legendary Creature — Human", imageUriSmall: null, imageUri: "big", collectorNumber: "1" }];
    const chain = { from: () => chain, innerJoin: () => chain, where: async () => rows };
    const out = await loadRevealedCommanders(["trc"], { select: () => chain } as never);
    expect(out.trc[0].imageUriSmall).toBe("big");
  });
});
