import { describe, expect, it, vi } from "vitest";

import { db } from "../../db";
import {
  type RevealedPrinting,
  MAX_FACE_COMMANDERS,
  leadingBlock,
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
  imageUri: null,
  backImageUri: null,
  collectorNumber: "1",
  scryfallId: "s-1",
  isVariant: false,
  ...over,
});

describe("isLegendaryCreature", () => {
  it("keeps legendary creatures, an enchantment creature included", () => {
    expect(isLegendaryCreature("Legendary Creature — Human Doctor")).toBe(true);
    expect(isLegendaryCreature("Legendary Enchantment Creature — God")).toBe(true);
    expect(isLegendaryCreature("Legendary Artifact Creature — Robot")).toBe(true);
  });

  it("reads the front face only, so a back face never makes a card a commander", () => {
    expect(isLegendaryCreature("Land // Legendary Creature — Demon")).toBe(false);
    expect(isLegendaryCreature("Legendary Creature — Human // Legendary Planeswalker — Ajani")).toBe(true);
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
    expect(out.trc).toEqual([{ oracleId: "chapel", name: "Christine Chapel", colorIdentity: [], imageUriSmall: "s78", imageUri: null, backImageUri: null, collectorNumber: "78", scryfallId: "s-1" }]);
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
    for (const col of [`"cards"."name"`, `"cards"."color_identity"`, `"cards"."type_line"`, `"printings"."image_uri_small"`, `"printings"."image_uri"`, `"printings"."collector_number"`, `"printings"."is_variant"`]) {
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
    const rows = [{ setCode: "trc", oracleId: "a", name: "A", colorIdentity: ["W"], typeLine: "Legendary Creature — Human", imageUriSmall: null, imageUri: "big", collectorNumber: "1", isVariant: false }];
    const chain = { from: () => chain, innerJoin: () => chain, where: async () => rows };
    const out = await loadRevealedCommanders(["trc"], { select: () => chain } as never);
    expect(out.trc[0].imageUriSmall).toBe("big");
    expect(out.trc[0].imageUri).toBe("big");
  });

  it("carries the normal render beside the small one, for the tile art and the hover preview", async () => {
    const rows = [{ setCode: "trc", oracleId: "a", name: "A", colorIdentity: ["W"], typeLine: "Legendary Creature — Human", imageUriSmall: "small", imageUri: "normal", collectorNumber: "1", isVariant: false }];
    const chain = { from: () => chain, innerJoin: () => chain, where: async () => rows };
    const out = await loadRevealedCommanders(["trc"], { select: () => chain } as never);
    expect(out.trc[0]).toMatchObject({ imageUriSmall: "small", imageUri: "normal" });
  });
});

describe("the leading block (Star Trek Commander: faces at 1-8, a legend again at 9)", () => {
  const trc = (n: string, id: string, over: Partial<RevealedPrinting> = {}) =>
    p({ oracleId: id, name: id, collectorNumber: n, ...over });
  // 1-4 the faces, 5-8 their alternate arts (all variants), then the rest of the set, legends among it.
  const set = () => [
    ...["1", "2", "3", "4"].map((n, i) => trc(n, `face${i}`, { isVariant: true })),
    ...["5", "6", "7", "8"].map((n, i) => trc(n, `face${i}`, { isVariant: true })),
    trc("9", "k-ehleyr"),
    trc("22", "korok"),
    trc("40", "spell", { typeLine: "Instant" }),
  ];

  it("keeps the four faces once each, not every legend in the set", () => {
    expect(revealedCommanders(set()).trc.map((c) => c.oracleId)).toEqual(["face0", "face1", "face2", "face3"]);
  });

  it("is the same whatever order the read gives", () => {
    expect(revealedCommanders([...set()].reverse()).trc.map((c) => c.oracleId)).toEqual(["face0", "face1", "face2", "face3"]);
  });

  it("opens on a plain frame: the block is the leading legendary creatures (Final Fantasy)", () => {
    const rows = [
      ...["1", "2", "3"].map((n) => trc(n, `leg${n}`)),
      trc("4", "gear", { typeLine: "Artifact" }),
      trc("5", "later-legend"),
    ];
    expect(leadingBlock(rows).map((r) => r.oracleId)).toEqual(["leg1", "leg2", "leg3"]);
    expect(revealedCommanders(rows).trc.map((c) => c.oracleId)).toEqual(["leg1", "leg2", "leg3"]);
  });

  it("leaves a legendary non-creature in the variant run out (Edge of Eternities' Spacecraft, a known gap)", () => {
    const rows = [
      trc("1", "ship", { isVariant: true, typeLine: "Legendary Artifact — Spacecraft" }),
      trc("2", "kilo", { isVariant: true }),
      trc("3", "plain"),
    ];
    expect(revealedCommanders(rows).trc.map((c) => c.oracleId)).toEqual(["kilo"]);
  });

  it("shows nothing, and logs, when the block is too big to be face commanders", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows = Array.from({ length: MAX_FACE_COMMANDERS + 1 }, (_, i) => trc(String(i + 1), `leg${i}`));
    expect(revealedCommanders(rows)).toEqual({});
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("shows nothing for a set that opens on a non-commander", () => {
    expect(revealedCommanders([trc("1", "land", { typeLine: "Basic Land — Forest" }), trc("2", "legend")])).toEqual({});
  });
});
