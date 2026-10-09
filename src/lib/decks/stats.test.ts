import { describe, expect, it } from "vitest";
import {
  CURVE_MAX,
  colourSpread,
  emptyRecord,
  recordFromCounts,
  cardTypeOf,
  CARD_TYPES,
  manaCurve,
  playRecord,
  typeCurve,
  sumColourSpreads,
  sumPlayRecords,
} from "./stats";

const spreadCard = (colorIdentity: string[], quantity = 1) => ({ colorIdentity, quantity });
const curveCard = (cmc: number, typeLine = "Creature — Human", quantity = 1) => ({
  cmc,
  typeLine,
  quantity,
});

describe("playRecord", () => {
  it("is all zeroes for no games", () => {
    expect(playRecord([])).toEqual({ wins: 0, losses: 0, draws: 0, played: 0 });
  });

  it("tallies each result and counts games played", () => {
    const record = playRecord([
      { result: "win" },
      { result: "win" },
      { result: "loss" },
      { result: "draw" },
    ]);
    expect(record).toEqual({ wins: 2, losses: 1, draws: 1, played: 4 });
  });

  it("keeps played equal to the three buckets", () => {
    const record = playRecord([{ result: "draw" }, { result: "loss" }]);
    expect(record.wins + record.losses + record.draws).toBe(record.played);
  });
});

describe("recordFromCounts", () => {
  it("tallies grouped counts without expanding them", () => {
    expect(
      recordFromCounts([
        { result: "win", games: 12 },
        { result: "loss", games: 3 },
        { result: "draw", games: 1 },
      ]),
    ).toEqual({ wins: 12, losses: 3, draws: 1, played: 16 });
  });

  it("is empty over no rows", () => {
    expect(recordFromCounts([])).toEqual({ wins: 0, losses: 0, draws: 0, played: 0 });
  });

  it("agrees with playRecord over the same games", () => {
    const expanded = playRecord([
      { result: "win" },
      { result: "win" },
      { result: "draw" },
    ]);
    expect(recordFromCounts([{ result: "win", games: 2 }, { result: "draw", games: 1 }]))
      .toEqual(expanded);
  });
});

describe("emptyRecord", () => {
  it("hands back a fresh object each call, so two decks cannot share one", () => {
    const a = emptyRecord();
    const b = emptyRecord();
    a.wins += 1;
    expect(b.wins).toBe(0);
  });
});

describe("sumPlayRecords", () => {
  it("adds records without touching its inputs", () => {
    const a = playRecord([{ result: "win" }]);
    const b = playRecord([{ result: "loss" }, { result: "draw" }]);
    expect(sumPlayRecords([a, b])).toEqual({ wins: 1, losses: 1, draws: 1, played: 3 });
    expect(a).toEqual({ wins: 1, losses: 0, draws: 0, played: 1 });
  });

  it("is zero over nothing", () => {
    expect(sumPlayRecords([])).toEqual({ wins: 0, losses: 0, draws: 0, played: 0 });
  });
});

describe("colourSpread", () => {
  it("counts a mono-colour card once", () => {
    const s = colourSpread([spreadCard(["B"])]);
    expect(s.B).toBe(1);
    expect(s.copies).toBe(1);
    expect(s.colourless).toBe(0);
  });

  it("counts a multi-colour card once in EACH of its colours, not fractionally", () => {
    const s = colourSpread([spreadCard(["B", "G"])]);
    expect(s.B).toBe(1);
    expect(s.G).toBe(1);
    // One card, so the colour figures deliberately sum to more than `copies`.
    expect(s.copies).toBe(1);
  });

  it("counts an empty identity as colourless and never into a colour", () => {
    const s = colourSpread([spreadCard([])]);
    expect(s.colourless).toBe(1);
    expect(s.W + s.U + s.B + s.R + s.G).toBe(0);
    expect(s.copies).toBe(1);
  });

  it("weights by quantity", () => {
    const s = colourSpread([spreadCard(["G"], 12), spreadCard(["G", "W"], 2)]);
    expect(s.G).toBe(14);
    expect(s.W).toBe(2);
    expect(s.copies).toBe(14);
  });

  it("ignores identity letters outside WUBRG", () => {
    const s = colourSpread([spreadCard(["C"])]);
    expect(s.colourless).toBe(1);
    expect(s.copies).toBe(1);
  });

  it("counts lands, which the curve excludes", () => {
    const s = colourSpread([spreadCard(["R"], 30)]);
    expect(s.R).toBe(30);
  });

  it("is all zeroes for an empty deck", () => {
    expect(colourSpread([])).toEqual({
      W: 0, U: 0, B: 0, R: 0, G: 0, colourless: 0, copies: 0,
    });
  });
});

describe("sumColourSpreads", () => {
  it("adds every field, colourless and copies included", () => {
    const a = colourSpread([spreadCard(["W"], 3), spreadCard([], 1)]);
    const b = colourSpread([spreadCard(["W", "U"], 2)]);
    const total = sumColourSpreads([a, b]);
    expect(total.W).toBe(5);
    expect(total.U).toBe(2);
    expect(total.colourless).toBe(1);
    expect(total.copies).toBe(6);
  });
});

describe("manaCurve", () => {
  it("returns every bucket from 0 to CURVE_MAX, in order, even when empty", () => {
    const curve = manaCurve([]);
    expect(curve.buckets.map((b) => b.cmc)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(curve.buckets.every((b) => b.copies === 0)).toBe(true);
  });

  it("has no average at zero non-land copies, rather than an average of zero", () => {
    expect(manaCurve([]).average).toBeNull();
    expect(manaCurve([curveCard(0, "Basic Land — Forest", 30)]).average).toBeNull();
  });

  it("buckets by mana value and weights by quantity", () => {
    const curve = manaCurve([curveCard(2), curveCard(2, "Instant", 3), curveCard(5)]);
    expect(curve.buckets[2].copies).toBe(4);
    expect(curve.buckets[5].copies).toBe(1);
    expect(curve.copies).toBe(5);
  });

  it("piles everything at or above CURVE_MAX into the last bucket", () => {
    const curve = manaCurve([curveCard(7), curveCard(9), curveCard(15)]);
    expect(curve.buckets[CURVE_MAX].copies).toBe(3);
  });

  it("excludes lands from the buckets, the copies and the average, and reports them", () => {
    const curve = manaCurve([
      curveCard(0, "Basic Land — Island", 30),
      curveCard(4, "Land — Artifact Land"),
      curveCard(2, "Creature — Bird"),
    ]);
    expect(curve.lands).toBe(31);
    expect(curve.copies).toBe(1);
    expect(curve.buckets[0].copies).toBe(0);
    expect(curve.buckets[4].copies).toBe(0);
    expect(curve.average).toBe(2);
  });

  it("excludes a land creature, which is played as a land and never cast", () => {
    const curve = manaCurve([curveCard(0, "Land Creature — Forest Dryad")]);
    expect(curve.lands).toBe(1);
    expect(curve.copies).toBe(0);
    expect(curve.buckets[0].copies).toBe(0);
  });

  it("keeps a card whose BACK face is a land, because only the front is cast", () => {
    const curve = manaCurve([curveCard(3, "Creature — Elf // Land")]);
    expect(curve.lands).toBe(0);
    expect(curve.buckets[3].copies).toBe(1);
  });

  it("rounds a fractional mana value into a whole bucket but averages unrounded", () => {
    const curve = manaCurve([curveCard(1.5), curveCard(0.5)]);
    expect(curve.buckets[2].copies).toBe(1);
    expect(curve.buckets[1].copies).toBe(1);
    expect(curve.average).toBe(1);
  });

  it("averages over copies, not over rows", () => {
    const curve = manaCurve([curveCard(1, "Creature — Bird", 3), curveCard(5)]);
    expect(curve.copies).toBe(4);
    expect(curve.average).toBe(2);
  });
});

describe("cardTypeOf", () => {
  it.each([
    ["Legendary Creature — Elf Druid", "creature"],
    ["Instant", "instant"],
    ["Sorcery", "sorcery"],
    ["Artifact — Equipment", "artifact"],
    ["Enchantment — Aura", "enchantment"],
    ["Legendary Planeswalker — Jace", "planeswalker"],
    ["Battle — Siege", "battle"],
  ])("reads %s as %s", (line, type) => {
    expect(cardTypeOf(line)).toBe(type);
  });

  it("gives a multi-type card its first type by precedence", () => {
    expect(cardTypeOf("Artifact Creature — Golem")).toBe("creature");
    expect(cardTypeOf("Enchantment Creature — Nymph")).toBe("creature");
    expect(cardTypeOf("Kindred Instant — Elf")).toBe("instant");
    expect(cardTypeOf("Enchantment Artifact")).toBe("artifact");
  });

  it("reads the front face of a double-faced card", () => {
    expect(cardTypeOf("Sorcery // Land")).toBe("sorcery");
    expect(cardTypeOf("Creature — Human // Enchantment")).toBe("creature");
  });

  it("is null for a type line none of the seven match", () => {
    expect(cardTypeOf("Conspiracy")).toBeNull();
  });
});

describe("typeCurve", () => {
  it("returns eight buckets and a total for every type, even when empty", () => {
    const t = typeCurve([]);
    expect(t.buckets).toHaveLength(8);
    expect(Object.keys(t.totals)).toEqual([...CARD_TYPES]);
    expect(Object.values(t.totals).every((n) => n === 0)).toBe(true);
  });

  it("buckets by mana value and weights by quantity", () => {
    const t = typeCurve([curveCard(2), curveCard(2, "Instant", 3), curveCard(5, "Sorcery")]);
    expect(t.buckets[2].creature).toBe(1);
    expect(t.buckets[2].instant).toBe(3);
    expect(t.buckets[5].sorcery).toBe(1);
    expect(t.totals.instant).toBe(3);
  });

  it("piles everything at or above CURVE_MAX into the last bucket", () => {
    const t = typeCurve([curveCard(7), curveCard(9, "Artifact"), curveCard(15, "Sorcery")]);
    expect(t.buckets[7].creature + t.buckets[7].artifact + t.buckets[7].sorcery).toBe(3);
  });

  it("agrees with manaCurve on every bucket", () => {
    const cards = [curveCard(1), curveCard(3, "Artifact", 2), curveCard(8, "Sorcery"), curveCard(2.5, "Instant")];
    const sum = (b: Record<string, number>) => Object.values(b).reduce((a, n) => a + n, 0);
    expect(typeCurve(cards).buckets.map(sum)).toEqual(manaCurve(cards).buckets.map((b) => b.copies));
  });

  it("skips lands, including a land creature, as manaCurve does", () => {
    const t = typeCurve([curveCard(0, "Basic Land — Forest", 30), curveCard(0, "Land Creature — Forest Dryad"), curveCard(2)]);
    expect(t.totals.creature).toBe(1);
  });
});
