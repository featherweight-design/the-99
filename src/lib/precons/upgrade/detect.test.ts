import { describe, expect, it } from "vitest";

import { MIN_BACKING } from "./constants";
import { detectStrategies, type DeckCardFact } from "./detect";

let n = 0;
const card = (over: Partial<DeckCardFact> = {}): DeckCardFact => ({ oracleId: `id${++n}`, name: `Card ${n}`, typeLine: "Creature — Human", oracleText: "", isCommander: false, ...over });
const many = (k: number, over: Partial<DeckCardFact>) => Array.from({ length: k }, () => card(over));
const tag = (slug: string, count: number) => ({ slug, label: slug, count });

describe("detectStrategies", () => {
  it("offers a tag the deck backs with at least MIN_BACKING of its own cards, most-counted first", () => {
    const deck = [...many(MIN_BACKING, { typeLine: "Artifact", oracleText: "" }), ...many(MIN_BACKING, { typeLine: "Creature — Dragon" })];
    const out = detectStrategies({ tags: [tag("dragons", 100), tag("artifacts", 500)], deck });
    expect(out.map((s) => s.key)).toEqual(["artifacts", "dragons"]);
    expect(out[0]!.backingIds).toHaveLength(MIN_BACKING);
    expect(out[0]!.source).toBe("edhrec");
  });

  it("drops a strategy one card short of MIN_BACKING, and one with no card test", () => {
    const deck = many(MIN_BACKING - 1, { typeLine: "Artifact" });
    expect(detectStrategies({ tags: [tag("artifacts", 9)], deck })).toEqual([]);
    expect(detectStrategies({ tags: [tag("vibes", 9)], deck: many(9, {}) })).toEqual([]);
  });

  it("skips generic archetype tags, the commander and basic lands", () => {
    const deck = [...many(MIN_BACKING, { typeLine: "Basic Land — Island", oracleText: "{T}: Add {U}. artifacts" }), card({ typeLine: "Legendary Artifact Creature", isCommander: true })];
    expect(detectStrategies({ tags: [tag("combo", 9), tag("artifacts", 8)], deck })).toEqual([]);
  });

  it("matches a tribal slug by creature type after the dash, not by a word in the text", () => {
    const deck = [...many(MIN_BACKING, { typeLine: "Creature — Elf Druid" }), ...many(2, { typeLine: "Creature — Human", oracleText: "Elf" })];
    const [s] = detectStrategies({ tags: [tag("elves", 7)], deck });
    expect(s?.backingIds).toHaveLength(MIN_BACKING);
  });

  it("caps at three strategies and never shows two that are one (same label or mostly the same cards)", () => {
    const shared = many(MIN_BACKING, { typeLine: "Artifact Creature — Thopter", oracleText: "flying" });
    const deck = [...shared, ...many(MIN_BACKING, { oracleText: "Create a Treasure token." }), ...many(MIN_BACKING, { oracleText: "gain 2 life" }), ...many(MIN_BACKING, { oracleText: "Sacrifice a creature." })];
    const tags = [tag("artifacts", 90), tag("thopters", 80), tag("counters", 1), tag("treasure", 70), tag("lifegain", 60), tag("sacrifice", 50)];
    const out = detectStrategies({ tags, deck });
    expect(out.length).toBeLessThanOrEqual(3);
    // thopters repeats artifacts' cards, so only one of the two is shown
    expect(out.filter((s) => s.key === "artifacts" || s.key === "thopters")).toHaveLength(1);
  });

  it("adds an Overview plan the deck backs, drops one that repeats an offered strategy, and ignores cards not in the deck", () => {
    const art = many(MIN_BACKING, { typeLine: "Artifact" });
    const plan = many(MIN_BACKING, { oracleText: "Cast a historic spell." });
    const out = detectStrategies({
      tags: [tag("artifacts", 9)],
      deck: [...art, ...plan],
      overview: [
        { label: "Historic", blurb: "Cast historic spells.", cardIds: [...plan.map((c) => c.oracleId), "not-in-deck"] },
        { label: "Same again", blurb: "x", cardIds: art.map((c) => c.oracleId) },
        { label: "Thin", blurb: "x", cardIds: plan.slice(0, 2).map((c) => c.oracleId) },
      ],
    });
    expect(out.map((s) => s.key)).toEqual(["artifacts", "overview:0"]);
    expect(out[1]!.backingIds).toHaveLength(MIN_BACKING);
  });

  it("offers nothing for a precon with no tags and no Overview plan", () => {
    expect(detectStrategies({ tags: [], deck: many(40, {}) })).toEqual([]);
  });
});
