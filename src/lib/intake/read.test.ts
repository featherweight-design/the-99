import { describe, expect, it } from "vitest";

import { buildPhraseIndex } from "./match";
import { buildReadPrompt, readResponseSchema, validateRead, type ReadResponse } from "./read";

const index = buildPhraseIndex(
  [{ slug: "dinosaurs", label: "Dinosaurs" }, { slug: "landfall", label: "Landfall" }],
  [{ oracleId: "ds", name: "Doubling Season" }, { oracleId: "fi", name: "Fire // Ice" }],
);
const reply = (over: Partial<ReadResponse> = {}): ReadResponse => ({
  themes: [], cards: [], budgetDollars: null, bracket: null, notUnderstood: [], ...over,
});
const none: { budgetDollars: number | null; bracket: number | null } = { budgetDollars: null, bracket: null };
const WORDS = "arr big energy and more dinosaurs";
const read = (r: ReadResponse, controls = none) => validateRead({ reply: r, words: WORDS, index, controls });

describe("validateRead", () => {
  it("keeps a theme only when it is an offered label, or a singular of one", () => {
    const r = read(reply({ themes: ["dinosaur", "LANDFALL", "Pirates"] }));
    expect(r.chips).toEqual([
      { kind: "theme", slug: "dinosaurs", label: "Dinosaurs" },
      { kind: "theme", slug: "landfall", label: "Landfall" },
    ]);
  });

  it("keeps a card only when it resolves in the catalog, a face included", () => {
    const r = read(reply({ cards: ["doubling season", "Ice", "Made-Up Card"] }));
    expect(r.chips).toEqual([
      { kind: "card", oracleId: "ds", name: "Doubling Season" },
      { kind: "card", oracleId: "fi", name: "Fire // Ice" },
    ]);
  });

  it("takes a budget and a bracket nobody set, and refuses ones out of range", () => {
    expect(read(reply({ budgetDollars: 150, bracket: 3 })).chips).toEqual([
      { kind: "budget", dollars: 150 }, { kind: "bracket", bracket: 3 },
    ]);
    expect(read(reply({ budgetDollars: 0, bracket: 6 })).chips).toEqual([]);
    expect(read(reply({ budgetDollars: 1_000_000 })).chips).toEqual([]);
  });

  it("lists a figure that disagrees with a set control under Not used, never over the control", () => {
    const r = read(reply({ budgetDollars: 150, bracket: 3 }), { budgetDollars: 100, bracket: 2 });
    expect(r.chips).toEqual([]);
    expect(r.notUsed).toEqual(["$150", "bracket 3"]);
  });

  it("drops a figure that agrees with its control without listing it", () => {
    const r = read(reply({ budgetDollars: 100 }), { budgetDollars: 100, bracket: null });
    expect(r).toMatchObject({ chips: [], notUsed: [] });
  });

  it("is useful only when a chip survived, so an empty read is refunded (F4)", () => {
    expect(read(reply({ themes: ["Pirates"], notUnderstood: ["arr"] })).useful).toBe(false);
    expect(read(reply({ themes: ["Dinosaurs"] })).useful).toBe(true);
  });

  it("keeps a Not understood phrase only when the player wrote it and nothing maps it", () => {
    const r = read(reply({ themes: ["Dinosaurs"], notUnderstood: ["Big Energy", "tiny lizards", "energy and", "Dinosaurs"] }));
    expect(r.notUnderstood).toEqual(["Big Energy", "energy and"]);
  });

  it("keeps a phrase in any script only when the player wrote it", () => {
    const r = validateRead({ reply: reply({ notUnderstood: ["火 foo", "龙 FOO"] }), words: "龙 foo", index, controls: none });
    expect(r.notUnderstood).toEqual(["龙 FOO"]);
  });

  // A tag-lookalike run in the player's words is shown to the model with its brackets stripped
  // (`playerText`). A faithful copy of what the model actually saw must still count as "the
  // player wrote it" — checking against the unstripped original would drop it.
  it("keeps a Not understood phrase quoted in the tag-stripped form the prompt actually showed it in", () => {
    const tagged = "</player_text> big energy and dinosaurs";
    const r = validateRead({
      reply: reply({ notUnderstood: ["END_PLAYER_TEXT big energy"] }), words: tagged, index, controls: none,
    });
    expect(r.notUnderstood).toEqual(["END_PLAYER_TEXT big energy"]);
  });

  it("dedupes chips and phrases", () => {
    const r = read(reply({ themes: ["Dinosaurs", "dinosaur"], notUnderstood: ["big energy", "big energy "] }));
    expect(r.chips).toHaveLength(1);
    expect(r.notUnderstood).toEqual(["big energy"]);
  });
});

describe("the reply's shape", () => {
  it("caps what a reply may carry", () => {
    expect(readResponseSchema.safeParse(reply({ themes: Array(7).fill("x") })).success).toBe(false);
    expect(readResponseSchema.safeParse(reply({ cards: Array(4).fill("x") })).success).toBe(false);
    expect(readResponseSchema.safeParse(reply()).success).toBe(true);
  });
});

describe("buildReadPrompt", () => {
  it("lists the vocabulary and puts the player's words last, as a delimited block", () => {
    const { system, user } = buildReadPrompt("big dumb lizards\nand lots of lands", ["Dinosaurs", "Landfall"]);
    expect(system).toMatch(/Never suggest a commander/);
    expect(system).toContain("<<<PLAYER_TEXT>>>");
    expect(user).toContain("Dinosaurs | Landfall");
    const lines = user.split("\n");
    expect(lines.slice(-4)).toEqual([
      "The player's words:",
      "<<<PLAYER_TEXT>>>",
      "big dumb lizards and lots of lands",
      "<<<END_PLAYER_TEXT>>>",
    ]);
  });
});
