import { describe, expect, it } from "vitest";

import { buildPhraseIndex, matchWords, phraseKey } from "./match";

const themes = [
  { slug: "dinosaurs", label: "Dinosaurs" },
  { slug: "plus-1-plus-1-counters", label: "+1/+1 Counters" },
  { slug: "seasons", label: "Seasons" },
  { slug: "landfall", label: "Landfall" },
];
const cards = [
  { oracleId: "ds", name: "Doubling Season" },
  { oracleId: "fog", name: "Fog" },
  { oracleId: "sol", name: "Sol Ring" },
  { oracleId: "fi", name: "Fire // Ice" },
  { oracleId: "lf", name: "Landfall" },
  { oracleId: "lfl", name: "Landfall Lotus" },
  { oracleId: "aether", name: "Æther Vial" },
  { oracleId: "kenrith", name: "Kenrith, the Returned King" },
];
const index = buildPhraseIndex(themes, cards);
const match = (text: string) => matchWords(text, index);

describe("the free match", () => {
  it("reads a theme by its label or a singular form, case-insensitively", () => {
    expect(match("I want a dinosaur deck").chips).toEqual([{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }]);
    expect(match("DINOSAURS please").chips).toEqual([{ kind: "theme", slug: "dinosaurs", label: "Dinosaurs" }]);
  });

  it("takes the longest phrase, so a card name beats a theme at its start", () => {
    // `landfall` alone is a theme, so a shortest-first scan would stop there.
    expect(match("something with landfall lotus").chips).toEqual([{ kind: "card", oracleId: "lfl", name: "Landfall Lotus" }]);
  });

  it("gives a phrase that names both a theme and a card to the theme", () => {
    // Capitalised, so the one-word card is eligible and only the theme-first rule decides.
    expect(match("Landfall").chips).toEqual([{ kind: "theme", slug: "landfall", label: "Landfall" }]);
  });

  it("matches a one-word card name only when typed with a capital", () => {
    expect(match("a fog of a deck").chips).toEqual([]);
    expect(match("a fog of a deck").leftover).toEqual(["fog"]);
    expect(match("built around Fog").chips).toEqual([{ kind: "card", oracleId: "fog", name: "Fog" }]);
  });

  it("matches a longer name in any case, and ignores punctuation and accents", () => {
    expect(match("sol ring").chips).toEqual([{ kind: "card", oracleId: "sol", name: "Sol Ring" }]);
    expect(match("kenrith the returned king").chips).toEqual([{ kind: "card", oracleId: "kenrith", name: "Kenrith, the Returned King" }]);
    expect(match("aether vial").chips).toEqual([{ kind: "card", oracleId: "aether", name: "Æther Vial" }]);
  });

  it("answers to one face of a two-faced card", () => {
    expect(match("Fire and more").chips).toEqual([{ kind: "card", oracleId: "fi", name: "Fire // Ice" }]);
  });

  it("reads dollar figures as the budget, in whole dollars", () => {
    expect(match("under $200").chips).toEqual([{ kind: "budget", dollars: 200 }]);
    expect(match("$1,500 max").chips).toEqual([{ kind: "budget", dollars: 1500 }]);
    expect(match("about 150 bucks").chips).toEqual([{ kind: "budget", dollars: 150 }]);
    expect(match("300 dollars").chips).toEqual([{ kind: "budget", dollars: 300 }]);
    expect(match("$49.99").chips).toEqual([{ kind: "budget", dollars: 50 }]);
  });

  it("refuses a budget under a dollar, and leaves it for the player to see", () => {
    expect(match("$0").chips).toEqual([]);
    expect(match("$0.60").chips).toEqual([]);
    expect(match("$0").leftover).toEqual(["0"]);
  });

  it("reads bracket N for 1 to 5 only", () => {
    expect(match("bracket 3").chips).toEqual([{ kind: "bracket", bracket: 3 }]);
    expect(match("Bracket #2").chips).toEqual([{ kind: "bracket", bracket: 2 }]);
    expect(match("bracket 7").chips).toEqual([]);
  });

  it("keeps chips in the order typed, each once, and drops stop words from the leftover", () => {
    const r = match("I'd love a Dinosaurs deck with Doubling Season, dinosaurs, $100 and big stompy energy");
    expect(r.chips.map((c) => c.kind)).toEqual(["theme", "card", "budget"]);
    expect(r.leftover).toEqual(["big", "stompy", "energy"]);
  });

  it("puts nothing in the leftover when every word is a stop word or matched", () => {
    expect(match("I want to build a deck with the dinosaurs").leftover).toEqual([]);
  });

  it("keys a label carrying symbols by its words", () => {
    expect(phraseKey("+1/+1 Counters")).toBe("1 1 counters");
    expect(match("+1/+1 counters").chips).toEqual([{ kind: "theme", slug: "plus-1-plus-1-counters", label: "+1/+1 Counters" }]);
  });
});
