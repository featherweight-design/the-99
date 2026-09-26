import { describe, expect, it } from "vitest";

import { buildPhraseIndex, matchWords, phraseKey } from "./match";

const themes = [
  { slug: "dinosaurs", label: "Dinosaurs" },
  { slug: "plus-1-plus-1-counters", label: "+1/+1 Counters" },
  { slug: "seasons", label: "Seasons" },
  { slug: "landfall", label: "Landfall" },
  { slug: "orcs", label: "Orcs" },
  { slug: "elves", label: "Elves" },
  { slug: "dwarves", label: "Dwarves" },
  { slug: "wizards", label: "Wizards" },
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

describe("the leftover phrases", () => {
  it("keeps each unmatched run verbatim, split at a match, a figure and a clause break", () => {
    expect(match("I want Dinosaurs that stomp, lots of little tokens under $200 and Big Energy").phrases)
      .toEqual(["stomp", "little tokens", "Big Energy"]);
  });

  it("keeps a stop word inside a phrase and trims those at its ends", () => {
    expect(match("the art of war with Dinosaurs").phrases).toEqual(["art of war"]);
  });

  it("splits at a clause mark inside a token, and leaves out a token that holds a match", () => {
    expect(match("big lizards (wide) and stomp,roar").phrases).toEqual(["big lizards", "wide", "stomp", "roar"]);
    expect(match("Dinosaurs-stomp with wings").phrases).toEqual(["wings"]);
    // The mark sits inside a token here, so the stop word after it is trimmed from its own clause.
    expect(match("big lizards,and stomp").phrases).toEqual(["big lizards", "stomp"]);
  });

  it("gives no phrase for words that are all stop words", () => {
    expect(match("I want a deck with Dinosaurs").phrases).toEqual([]);
  });
});

describe("the themes' join (three-answers addendum §1)", () => {
  it("reads Hugh's tribes, joined by or, as any of", () => {
    const m = match("I want a deck from the HOB or HOC sets. Tribal options are Orcs, Elves, Dwarves, or Wizards.");
    expect(m.chips.filter((c) => c.kind === "theme").map((c) => c.kind === "theme" && c.slug)).toEqual(["orcs", "elves", "dwarves", "wizards"]);
    expect(m.themeJoin).toBe("any");
  });

  it("reads commas and and as all of", () => {
    expect(match("orcs, elves and wizards").themeJoin).toBe("all");
    expect(match("orcs elves").themeJoin).toBe("all");
  });

  it("reads or as any of only between two themes in one phrase", () => {
    expect(match("elves or wizards").themeJoin).toBe("any");
    // A sentence break, or a word that says something, ends the phrase.
    expect(match("elves. Or wizards").themeJoin).toBe("all");
    expect(match("elves or big wizards").themeJoin).toBe("all");
    // An or with a single theme joins nothing.
    expect(match("elves or something").themeJoin).toBe("all");
  });
});

describe("sets (three-answers addendum §2)", () => {
  const withSets = buildPhraseIndex(themes, cards, [
    { code: "hob", name: "The Hobbit" },
    { code: "hoc", name: "The Hobbit Commander" },
    { code: "big", name: "The Big Score" },
    { code: "all", name: "Alliances" },
  ]);
  const m = (text: string) => matchWords(text, withSets);
  const sets = (text: string) => m(text).chips.flatMap((c) => (c.kind === "set" ? [c.code] : []));

  it("reads Hugh's codes, in capitals beside sets, and uses the word sets", () => {
    const r = m("I want a deck from the HOB or HOC sets using cards I own.");
    expect(sets("I want a deck from the HOB or HOC sets using cards I own.")).toEqual(["hob", "hoc"]);
    expect(r.leftover).not.toContain("sets");
  });

  it("never reads a lower-case code on its own as a set", () => {
    expect(sets("a big deck with all the wizards")).toEqual([]);
  });

  it("never reads a letters-only code in lower case, even beside set or sets", () => {
    expect(sets("a commander from all sets")).toEqual([]);
    expect(sets("cards from the big set")).toEqual([]);
    expect(sets("hob and hoc sets")).toEqual([]);
  });

  it("reads a lower-case code with a digit beside set or sets", () => {
    const digits = buildPhraseIndex(themes, cards, [{ code: "m21", name: "Core Set 2021" }]);
    expect(matchWords("from the m21 set", digits).chips).toEqual([{ kind: "set", code: "m21", name: "Core Set 2021" }]);
  });

  it("reads a set by name, the longest first, and only with a capital on one of its words", () => {
    expect(sets("something from the Hobbit Commander set")).toEqual(["hoc"]);
    expect(sets("Alliances please")).toEqual(["all"]);
    expect(sets("alliances please")).toEqual([]);
    // A two-word name is words as often as a set: `the big score` is no set.
    expect(sets("go for the big score")).toEqual([]);
    expect(sets("The Big Score cards")).toEqual(["big"]);
  });

  it("keeps a theme over a set sharing its words", () => {
    const clash = buildPhraseIndex([{ slug: "dinosaurs", label: "Dinosaurs" }], [], [{ code: "dno", name: "Dinosaurs" }]);
    expect(matchWords("Dinosaurs", clash).chips.map((c) => c.kind)).toEqual(["theme"]);
  });
});
