import { describe, expect, it } from "vitest";

import type { V2Line } from "./engine";
import { asksWhy, britishSpelling, buildWhyPrompt, checkPhrase, checkWhy, WHY_LINE_MAX } from "./why";

const row = (card: string, side: "add" | "cut" = "add"): V2Line => ({
  addOracleId: side === "add" ? `id-${card}` : null, cutOracleId: side === "cut" ? `id-${card}` : null,
  rationale: "r", rationaleShort: `${card} short`, evidence: [], position: 0, bracketAfter: null, card,
});
const adds = ["Swords to Plowshares", "Path to Exile", "Rhystic Study", "Phyrexian Arena", "Sol Ring"].map((c) => row(c));
const cuts = ["Lure", "Fog", "Mithril Coat"].map((c) => row(c, "cut"));
const reply = (over: object = {}) => ({
  lead: "Cheaper answers and steadier draw, for less of the slow stuff.",
  add: [
    { phrase: "are answers at one or two mana", cards: ["Swords to Plowshares", "Path to Exile"], like: "Path to Exile" },
    { phrase: "keep cards coming", cards: ["Rhystic Study", "Phyrexian Arena"] },
  ],
  cut: [{ phrase: "do nothing on their own", cards: ["Lure", "Fog", "Mithril Coat"], like: "Fog" }],
  ...over,
});

describe("asksWhy", () => {
  it("asks at N >= 6 with both lists and the cuts in", () => {
    expect(asksWhy({ n: 6, adds: 6, cuts: 6, cutsFailed: false })).toBe(true);
    expect(asksWhy({ n: 5, adds: 6, cuts: 6, cutsFailed: false })).toBe(false);
    expect(asksWhy({ n: 6, adds: 6, cuts: 0, cutsFailed: false })).toBe(false);
    expect(asksWhy({ n: 6, adds: 6, cuts: 6, cutsFailed: true })).toBe(false);
  });
});

describe("buildWhyPrompt", () => {
  it("shows the commander, the rows with their short reasons, and the request as player text", () => {
    const { system, user } = buildWhyPrompt({ commanders: ["Aang"], request: "more removal", adds, cuts });
    expect(user).toContain("Commander: Aang");
    expect(user).toContain("- Swords to Plowshares: Swords to Plowshares short");
    expect(user).toContain("- Lure: Lure short");
    expect(user).toContain("<<<PLAYER_TEXT>>>\nmore removal\n<<<END_PLAYER_TEXT>>>");
    expect(system).toContain("US English");
    expect(buildWhyPrompt({ commanders: ["Aang"], request: null, adds, cuts }).user).not.toContain("PLAYER_TEXT");
  });
});

describe("checkWhy", () => {
  it("counts each group's kept rows, writes the words, and links the named card", () => {
    expect(checkWhy(reply(), adds, cuts)).toEqual({
      lead: "Cheaper answers and steadier draw, for less of the slow stuff.",
      add: [
        { text: "Two are answers at one or two mana, like " }, { card: "Path to Exile", oracleId: "id-Path to Exile" },
        { text: "; two keep cards coming, like " }, { card: "Rhystic Study", oracleId: "id-Rhystic Study" }, { text: "." },
      ],
      cut: [{ text: "Three do nothing on their own, like " }, { card: "Fog", oracleId: "id-Fog" }, { text: "." }],
    });
  });

  it("ignores names that are not kept rows, counts a row once, and drops a group left under two", () => {
    const r = checkWhy(reply({
      add: [
        { phrase: "are answers", cards: ["Swords to Plowshares", "Lightning Bolt", "swords to plowshares", "Path to Exile"] },
        { phrase: "make mana", cards: ["Path to Exile", "Sol Ring"] },
      ],
    }), adds, cuts)!;
    expect(r.add).toEqual([{ text: "Two are answers, like " }, { card: "Swords to Plowshares", oracleId: "id-Swords to Plowshares" }, { text: "." }]);
  });

  it("drops groups from the end past the line's length, and a side with none left", () => {
    const long = "are cards that do a great many useful things for the deck";
    const r = checkWhy(reply({
      add: [
        { phrase: long, cards: ["Swords to Plowshares", "Path to Exile"] },
        { phrase: long, cards: ["Rhystic Study", "Phyrexian Arena"] },
        { phrase: long, cards: ["Sol Ring", "Swords to Plowshares", "Path to Exile"] },
      ],
      cut: [{ phrase: "are slow", cards: ["Lure"] }],
    }), adds, cuts)!;
    const text = r.add!.map((p) => ("text" in p ? p.text : p.card)).join("");
    expect(text.length).toBeLessThanOrEqual(WHY_LINE_MAX);
    expect(text).toMatch(/^Two are cards/);
    expect(r.cut).toBeNull();
  });

  it("drops the whole why on a lead that fails, is too long, or the reply's shape", () => {
    expect(checkWhy(reply({ lead: "" }), adds, cuts)).toBeNull();
    expect(checkWhy(reply({ lead: "x".repeat(121) }), adds, cuts)).toBeNull();
    expect(checkWhy(reply({ lead: "Better colour fixing." }), adds, cuts)).toBeNull();
    expect(checkWhy(reply({ lead: "These changes will win more games." }), adds, cuts)).toBeNull();
    expect(checkWhy({ lead: "Fine." }, adds, cuts)).toBeNull();
  });
});

describe("checkPhrase", () => {
  it("drops a count of its own, British spelling, and a game result; keeps a number in what the cards do", () => {
    expect(checkPhrase("five are answers", [])).toBeNull();
    expect(checkPhrase("are 3 of the cuts", [])).toBeNull();
    expect(checkPhrase("fix your colours", [])).toBeNull();
    expect(checkPhrase("will win more games", [])).toBeNull();
    expect(checkPhrase("are answers at one or two mana.", [])).toBe("are answers at one or two mana");
  });
});

describe("britishSpelling", () => {
  it("catches the British forms and passes the US ones", () => {
    for (const w of ["colour", "colourless", "favoured", "defence", "optimise", "prioritising", "grey", "travelled"]) expect(britishSpelling(w)).toBe(true);
    for (const w of ["color", "colorless", "favored", "defense", "optimize", "emphasis", "realism", "gray"]) expect(britishSpelling(w)).toBe(false);
  });
});
