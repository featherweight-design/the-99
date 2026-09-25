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
const read = (r: ReadResponse, controls = none) => validateRead({ reply: r, index, controls });

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
  it("lists the vocabulary and puts the player's words last, on one line", () => {
    const { system, user } = buildReadPrompt("big dumb lizards\nand lots of lands", ["Dinosaurs", "Landfall"]);
    expect(system).toMatch(/Never suggest a commander/);
    expect(user).toContain("Dinosaurs | Landfall");
    expect(user.split("\n").at(-1)).toBe("The player's words, verbatim after the colon: big dumb lizards and lots of lands");
  });
});
