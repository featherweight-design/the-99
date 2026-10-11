import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import type { SynopsisResponse } from "./response-schema";
import { figuresIn, jobSupported, marksIn, rendered, strengthClaim, unmarkedNames, validateSynopsis } from "./validate";

const card = (name: string, categories: SynopsisFacts["cards"][number]["categories"] = []) => ({
  oracleId: `id-${name}`, name, typeLine: "Creature", quantity: 1, categories, oracleText: null,
});

const FACTS: SynopsisFacts = {
  commanders: ["Kratos"],
  identity: ["R"],
  unproducible: [],
  lands: 36,
  ramp: 10,
  keep: { low: 2, high: 4 },
  sendBack: { none: 0, under: 1, over: 5 },
  commanderManaValues: [],
  figures: [2, 4, 7, 10, 36],
  cards: [
    card("Kratos", ["commander"]),
    card("Sol Ring", ["ramp"]),
    card("Rhystic Study", ["draw"]),
    card("Chaos Warp", ["removal"]),
    card("Blasphemous Act", ["wipes"]),
    card("Gamble", ["tutor"]),
    card("Fire // Ice", ["removal"]),
    card("Goblin Bombardment"),
    card("Impact Tremors"),
  ],
};

const CATALOG = new Map([["rest in peace", { oracleId: "id-rip", name: "Rest in Peace" }]]);

function good(): SynopsisResponse {
  return {
    overview: "[[Kratos]] turns every spell into damage, and [[Impact Tremors]] finishes the table.",
    primer: {
      strategy: [
        "Play [[Sol Ring]] early.",
        "Land [[Impact Tremors]] before the big turn.",
        "Cast [[Blasphemous Act]] and swing.",
      ],
      mulligan: {
        keep: ["A hand with [[Sol Ring]] gets you ahead early."],
        sendBack: ["A hand with no ramp falls behind the table."],
      },
      tips: [
        { cards: ["Goblin Bombardment", "Impact Tremors"], text: "Sacrifice tokens to [[Goblin Bombardment]] after [[Impact Tremors]] triggers." },
        { cards: ["Kratos", "Fire"], text: "Cast [[Fire]] with [[Kratos]] out to double the damage." },
      ],
    },
    keyCards: [
      { card: "Kratos", claims: ["commander"], job: "Leads the deck." },
      { card: "Sol Ring", claims: ["ramp"], job: "Ramps you a turn ahead." },
      { card: "Rhystic Study", claims: ["draw"], job: "Draws you cards all game." },
      { card: "Chaos Warp", claims: ["removal"], job: "Answers any permanent." },
      { card: "Impact Tremors", claims: [], job: "Turns every creature into damage." },
    ],
    weaknesses: ["[[Rest in Peace]] shuts off the recursion.", "Slow starts leave you exposed."],
  };
}

const verdictOf = (r: ReturnType<typeof validateSynopsis>, s: string) => r.verdicts.find((v) => v.section === s)!;

describe("validateSynopsis", () => {
  it("passes a reply that keeps every rule, and resolves every mark", () => {
    const r = validateSynopsis(good(), FACTS, CATALOG);
    expect(r.verdicts.map((v) => v.status)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(r.overview).toBe(good().overview);
    expect(r.cards["fire"]).toEqual({ oracleId: "id-Fire // Ice", name: "Fire // Ice" });
    expect(r.cards["rest in peace"]?.name).toBe("Rest in Peace");
  });

  it("refuses a mark outside the deck with its count, and withholds the section's content", () => {
    const reply = good();
    reply.overview = "[[Kratos]] and [[Craterhoof Behemoth]] win.";
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "overview")).toEqual({ section: "overview", status: "refused", reason: "unknown_card", failed: 1, total: 2 });
    expect(r.overview).toBeNull();
    expect(verdictOf(r, "primer").status).toBe("ok");
  });

  it("lets Weaknesses name a catalog card the deck lacks, and no other section", () => {
    const reply = good();
    reply.overview = "[[Rest in Peace]] hurts.";
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "overview").status).toBe("refused");
    expect(verdictOf(r, "weaknesses").status).toBe("ok");
  });

  it("refuses a Weaknesses mark the catalog does not hold", () => {
    const reply = good();
    reply.weaknesses = ["[[Not A Card]] beats it."];
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "weaknesses")).toMatchObject({ reason: "unknown_card", failed: 1 });
  });

  it("refuses a tip naming one card", () => {
    const reply = good();
    reply.primer.tips[0] = { cards: ["Sol Ring"], text: "Play [[Sol Ring]] first." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer")).toMatchObject({ reason: "tip_too_few_cards" });
  });

  it("refuses a tip whose card is not in the deck", () => {
    const reply = good();
    reply.primer.tips[0] = { cards: ["Sol Ring", "Mana Crypt"], text: "Play [[Sol Ring]] and [[Mana Crypt]]." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer")).toMatchObject({ reason: "tip_not_in_deck", failed: 1 });
  });

  it("matches a tip's list to its prose by card, so a face and its full name agree", () => {
    const reply = good();
    reply.primer.tips[1] = { cards: ["Kratos", "Fire // Ice"], text: "Cast [[Fire]] with [[Kratos]] out to double the damage." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer").status).toBe("ok");
  });

  it("counts a listed name the prose never marks", () => {
    const reply = good();
    reply.primer.tips[0] = { cards: ["Sol Ring", "Gamble", "Mana Crypt"], text: "Use [[Gamble]] to find [[Sol Ring]]." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer")).toMatchObject({ reason: "tip_not_in_deck", failed: 1 });
  });

  it("refuses a tip whose prose names a card its list does not", () => {
    const reply = good();
    reply.primer.tips[0] = { cards: ["Sol Ring", "Gamble"], text: "Use [[Gamble]] to find [[Sol Ring]] and [[Chaos Warp]]." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer")).toMatchObject({ reason: "tip_not_in_deck" });
  });

  it("refuses a Key card claiming a category the app does not hold", () => {
    const reply = good();
    reply.keyCards[4] = { card: "Impact Tremors", claims: ["draw"], job: "Keeps you ahead." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "keyCards")).toMatchObject({ reason: "job_unsupported" });
  });

  it("refuses a Key card whose job describes an unheld category in words", () => {
    const reply = good();
    reply.keyCards[4] = { card: "Impact Tremors", claims: [], job: "Draws a card for every creature." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "keyCards")).toMatchObject({ reason: "job_unsupported" });
  });

  it("refuses the same Key card twice", () => {
    const reply = good();
    reply.keyCards[4] = { card: "Sol Ring", claims: [], job: "Taps for two." };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "keyCards")).toMatchObject({ reason: "wrong_count" });
  });

  it("refuses a Mulligan figure the app did not compute, in digits or in words", () => {
    for (const line of ["Keep a hand with 3 ramp pieces.", "Keep a hand with three ramp pieces."]) {
      const reply = good();
      reply.primer.mulligan.keep[0] = line;
      expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer")).toMatchObject({ reason: "uncomputed_figure" });
    }
  });

  it("refuses strength talk anywhere, and allows a game fact", () => {
    const reply = good();
    reply.weaknesses = ["It is a strong deck that struggles against graveyard hate."];
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "weaknesses")).toMatchObject({ reason: "strength_claim" });
    const fact = good();
    fact.overview = "[[Kratos]] deals 16 damage in one turn.";
    expect(verdictOf(validateSynopsis(fact, FACTS, CATALOG), "overview").status).toBe("ok");
  });

  it("refuses a count out of range", () => {
    const reply = good();
    reply.primer.strategy = reply.primer.strategy.slice(0, 2);
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "primer")).toMatchObject({ reason: "wrong_count" });
    const many = good();
    many.weaknesses = ["A.", "B.", "C.", "D."];
    expect(verdictOf(validateSynopsis(many, FACTS, CATALOG), "weaknesses")).toMatchObject({ reason: "wrong_count" });
  });

  it("refuses an item over its budget, counted as rendered", () => {
    const reply = good();
    reply.keyCards[4] = { card: "Impact Tremors", claims: [], job: `${"x".repeat(60)}.` };
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "keyCards")).toMatchObject({ reason: "over_budget" });
    const marked = good();
    // 59 rendered characters: the brackets do not count.
    marked.keyCards[4] = { card: "Impact Tremors", claims: [], job: `[[Kratos]] ${"x".repeat(51)}.` };
    expect(verdictOf(validateSynopsis(marked, FACTS, CATALOG), "keyCards").status).toBe("ok");
  });

  it("refuses a partial sentence", () => {
    const reply = good();
    reply.overview = "[[Kratos]] turns every spell into";
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "overview")).toMatchObject({ reason: "partial_sentence" });
  });
});

describe("a card's name is not a claim the prose makes", () => {
  const facts: SynopsisFacts = {
    ...FACTS,
    cards: [...FACTS.cards, card("Brutal Hordechief"), card("Three Visits", ["ramp"]), card("Room 101"), card("Wrath of God", ["wipes"])],
  };

  it("reads no strength word in a card's name", () => {
    const reply = good();
    reply.weaknesses = ["Losing [[Brutal Hordechief]] early slows the clock."];
    expect(verdictOf(validateSynopsis(reply, facts, CATALOG), "weaknesses").status).toBe("ok");
  });

  it("reads no figure in a card's name", () => {
    const reply = good();
    reply.primer.mulligan.keep[0] = "A hand with [[Three Visits]] is fine.";
    expect(verdictOf(validateSynopsis(reply, facts, CATALOG), "primer").status).toBe("ok");
    const digits = good();
    digits.primer.mulligan.keep[0] = "A hand with [[Room 101]] is fine.";
    expect(verdictOf(validateSynopsis(digits, facts, CATALOG), "primer").status).toBe("ok");
  });

  it("reads no category in another card's name inside a job", () => {
    const reply = good();
    reply.keyCards[4] = { card: "Impact Tremors", claims: [], job: "Survives your own [[Wrath of God]]." };
    expect(verdictOf(validateSynopsis(reply, facts, CATALOG), "keyCards").status).toBe("ok");
  });
});

describe("every deck name is marked", () => {
  it("refuses a deck card named without its mark", () => {
    const reply = good();
    reply.overview = "Play Sol Ring early, then [[Impact Tremors]].";
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "overview"))
      .toEqual({ section: "overview", status: "refused", reason: "unmarked_card", failed: 1, total: 2 });
  });

  it("refuses the commander named without its mark, however short its name", () => {
    const reply = good();
    reply.overview = "Kratos swings, and [[Impact Tremors]] finishes the table.";
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "overview")).toMatchObject({ reason: "unmarked_card", failed: 1 });
  });

  it("does not read a one-word name, a lowercase phrase or a marked name as unmarked", () => {
    expect(unmarkedNames("Cast [[Sol Ring]], then chaos warp nothing, then Opt.", ["Sol Ring", "Chaos Warp", "Opt"])).toEqual([]);
    // A commander's name is checked whatever its length.
    expect(unmarkedNames("Then Kratos swings.", ["Kratos"], ["Kratos"])).toEqual(["Kratos"]);
    expect(unmarkedNames("Sol Ring's mana matters.", ["Sol Ring"])).toEqual(["Sol Ring"]);
  });
});

describe("a refused section still counts every name in it", () => {
  it("counts the names after the first broken rule, and keeps that rule as the reason", () => {
    const reply = good();
    reply.overview = `[[Kratos]] and [[Craterhoof Behemoth]] ${"win ".repeat(200)}.`;
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "overview"))
      .toEqual({ section: "overview", status: "refused", reason: "over_budget", failed: 1, total: 2 });
  });

  it("counts a tip's names once", () => {
    const r = validateSynopsis(good(), FACTS, CATALOG);
    // strategy 3 + keep 1 + tips 4.
    expect(verdictOf(r, "primer").total).toBe(8);
  });
});

describe("the contract's helpers", () => {
  it("reads marks and renders them as names", () => {
    expect(marksIn("Play [[Sol Ring]] and [[Fire]].")).toEqual(["Sol Ring", "Fire"]);
    expect(rendered("Play [[Sol Ring]].")).toBe("Play Sol Ring.");
  });

  it("reads figures in digits and words, past ten", () => {
    expect(figuresIn("Keep 2 to four lands.")).toEqual([2, 4]);
    expect(figuresIn("Keep eleven lands, or a dozen.")).toEqual([11, 12]);
  });

  it("does not read a creature's power as strength talk", () => {
    expect(strengthClaim("A creature with power 4 or greater.")).toBe(false);
    expect(strengthClaim("A high-power table.")).toBe(true);
    expect(strengthClaim("Rates a 7/10.")).toBe(true);
    expect(strengthClaim("Seven out of ten.")).toBe(true);
    expect(strengthClaim("Above most power levels.")).toBe(true);
  });

  it("holds a job to the categories the card has", () => {
    expect(jobSupported({ claims: [], job: "Ramps you." }, new Set(["ramp"]))).toBe(true);
    expect(jobSupported({ claims: ["ramp"], job: "Taps for mana." }, new Set())).toBe(false);
  });

  it("gives a land or a commander job no words it could be refused for", () => {
    expect(jobSupported({ claims: [], job: "A land that enters untapped and taps for two colors." }, new Set())).toBe(true);
    expect(jobSupported({ claims: ["commander"], job: "Leads the deck from the command zone." }, new Set(["commander"]))).toBe(true);
  });
});

// Contract A (Hugh, 2026-09-24): a list drops the failing line; prose fails whole.
describe("validateSynopsis — drop the line, not the section", () => {
  it("drops a failing Key card and renders the rest when the minimum survives", () => {
    const reply = good();
    reply.keyCards.push({ card: "Gamble", claims: ["ramp"], job: "Ramps you out." });
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "keyCards")).toEqual({ section: "keyCards", status: "ok", failed: 0, total: 6 });
    expect(r.keyCards!.map((k) => k.card)).toEqual(["Kratos", "Sol Ring", "Rhystic Study", "Chaos Warp", "Impact Tremors"]);
  });

  it("refuses a list whose survivors fall under its minimum, with the failing line's reason", () => {
    const reply = good();
    reply.keyCards[1] = { card: "Sol Ring", claims: ["ramp"], job: "Ramps you a turn ahead of every other player at the table, all game long." };
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "keyCards")).toMatchObject({ status: "refused", reason: "over_budget" });
    expect(r.keyCards).toBeNull();
  });

  it("refuses a list past its maximum whole, even when every line passes", () => {
    const reply = good();
    reply.weaknesses = ["One gap shows.", "Two gaps show.", "Three gaps show.", "Four gaps show."];
    expect(verdictOf(validateSynopsis(reply, FACTS, CATALOG), "weaknesses")).toMatchObject({ status: "refused", reason: "wrong_count" });
  });

  it("keeps the first Key card that checks out for a card named twice", () => {
    const reply = good();
    reply.keyCards.push({ card: "Sol Ring", claims: ["ramp"], job: "Ramps again." });
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "keyCards").status).toBe("ok");
    expect(r.keyCards!.filter((k) => k.card === "Sol Ring").map((k) => k.job)).toEqual(["Ramps you a turn ahead."]);
  });

  it("drops a failing tip and a failing mulligan line inside a passing primer", () => {
    const reply = good();
    reply.primer.tips.push({ cards: ["Gamble"], text: "Find [[Gamble]] early." });
    reply.primer.mulligan.keep.push("Keep a hand with 9 lands.");
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "primer").status).toBe("ok");
    expect(r.primer!.tips).toEqual(good().primer.tips);
    expect(r.primer!.mulligan.keep).toEqual(good().primer.mulligan.keep);
    // A dropped line's marks never reach the card map the renderer reads.
    expect(r.cards["gamble"]).toBeUndefined();
  });

  it("refuses the primer whole on a failing strategy step, whatever its lists do", () => {
    const reply = good();
    reply.primer.strategy.push("Play [[Craterhoof Behemoth]] last.");
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(verdictOf(r, "primer")).toMatchObject({ status: "refused", reason: "unknown_card" });
    expect(r.primer).toBeNull();
  });

  it("drops a failing weakness and keeps one that checks out", () => {
    const reply = good();
    reply.weaknesses = ["A powerful deck in the wrong hands.", "Slow starts leave you exposed."];
    const r = validateSynopsis(reply, FACTS, CATALOG);
    expect(r.weaknesses).toEqual(["Slow starts leave you exposed."]);
  });
});

// Hugh's rating, 2026-09-24.
describe("validateSynopsis — universal staples and mana letters", () => {
  it("drops a Key card that is a universal staple, and renders the rest", () => {
    const facts = { ...FACTS, cards: FACTS.cards.map((c) => (c.name === "Sol Ring" ? { ...c, universalStaple: true } : c)) };
    const reply = good();
    reply.keyCards.push({ card: "Gamble", claims: ["tutor"], job: "Finds the missing piece." });
    const r = validateSynopsis(reply, facts, CATALOG);
    expect(verdictOf(r, "keyCards").status).toBe("ok");
    expect(r.keyCards!.map((k) => k.card)).not.toContain("Sol Ring");
  });

  it("refuses a Key card list left short by a universal staple, naming the reason", () => {
    const facts = { ...FACTS, cards: FACTS.cards.map((c) => (c.name === "Sol Ring" ? { ...c, universalStaple: true } : c)) };
    expect(verdictOf(validateSynopsis(good(), facts, CATALOG), "keyCards")).toMatchObject({ status: "refused", reason: "universal_staple" });
  });

  it("drops a mulligan line that names a universal staple, keeping the others", () => {
    const facts = { ...FACTS, cards: FACTS.cards.map((c) => (c.name === "Sol Ring" ? { ...c, universalStaple: true } : c)) };
    const reply = good();
    reply.primer.mulligan.keep.push("A hand with [[Goblin Bombardment]] has an outlet.");
    // Contract 8 (the weaknesses-truncating call) drops it.
    const r = validateSynopsis(reply, facts, CATALOG, {}, true);
    expect(r.primer!.mulligan.keep).toEqual(["A hand with [[Goblin Bombardment]] has an outlet."]);
    // Contract 7's prompt still teaches a Sol Ring line, so its replies keep it.
    expect(validateSynopsis(reply, facts, CATALOG).primer!.mulligan.keep).toHaveLength(2);
    // Without the mark the same line is kept.
    expect(validateSynopsis(good(), FACTS, CATALOG, {}, true).primer!.mulligan.keep).toEqual(good().primer.mulligan.keep);
  });

  const IZZET = { ...FACTS, identity: ["U", "R"] };
  it("refuses the overview when it names the deck's colors in mana letters", () => {
    const reply = good();
    reply.overview = "This UR deck lets [[Kratos]] turn every spell into damage.";
    expect(verdictOf(validateSynopsis(reply, IZZET, CATALOG), "overview")).toMatchObject({ status: "refused", reason: "mana_letters" });
  });

  it("reads letters beside an apostrophe as prose, not as a quotation", () => {
    const reply = good();
    reply.overview = "This UR deck's plan lets [[Kratos]] turn every spell into damage.";
    expect(verdictOf(validateSynopsis(reply, IZZET, CATALOG), "overview")).toMatchObject({ status: "refused", reason: "mana_letters" });
  });

  it("drops a weakness that uses the letters, keeping the others", () => {
    const reply = good();
    reply.weaknesses = ["The RU mana base stumbles on a slow start.", "Slow starts leave you exposed."];
    expect(validateSynopsis(reply, IZZET, CATALOG).weaknesses).toEqual(["Slow starts leave you exposed."]);
  });

  // The-99-d9's condition: prose that must PASS.
  it.each([
    ["a run inside a word", "[[Kratos]] turns every spell into damage, and URZA would approve."],
    ["lowercase letters", "[[Kratos]] turns every ur spell into damage."],
    ["letters that are not the deck's colors", "[[Kratos]] turns every spell into damage, like a WR aggro list."],
    ["a quotation", "[[Kratos]] reads \"UR\" on the card and turns spells into damage."],
    ["a single-quoted run", "[[Kratos]] is no 'UR' deck, and turns spells into damage."],
    ["a curly single-quoted run", "[[Kratos]] is no \u2018UR\u2019 deck, and turns spells into damage."],
    ["a quotation before a dash", "[[Kratos]] is no \u2018UR\u2019\u2014style deck, and turns spells into damage."],
    ["a quotation before a slash", "[[Kratos]] is no 'UR'/tempo deck, and turns spells into damage."],
    ["a quotation after a dash", "[[Kratos]] turns spells into damage\u2014no 'UR' deck."],
    ["a card mark", "[[Kratos]] turns every spell into damage, and [[UR]] helps."],
  ])("passes %s", (_label, overview) => {
    const reply = good();
    reply.overview = overview;
    const facts = { ...IZZET, cards: [...IZZET.cards, { ...IZZET.cards[0], oracleId: "id-UR", name: "UR", categories: [] }] };
    expect(verdictOf(validateSynopsis(reply, facts, CATALOG), "overview").status).toBe("ok");
  });
});

// Hugh's rating, 2026-09-24: the Mulligan.
describe("validateSynopsis — the Mulligan", () => {
  const withKeep = (line: string) => {
    const reply = good();
    reply.primer.mulligan.keep = [line, "A hand with [[Sol Ring]] gets you ahead early."];
    return validateSynopsis(reply, FACTS, CATALOG);
  };

  it.each([
    ["a land range", "A hand with 2 to 4 lands and early ramp is fine.", "land_count"],
    ["a single land count", "A hand with only one land falls behind.", "land_count"],
    ["no lands", "A hand with no lands goes back.", "land_count"],
    ["an all-spell hand", "All-spell hands stall badly.", "land_count"],
    ["the commander in hand", "A hand with [[Kratos]] and a ramp piece is ideal.", "commander_in_hand"],
    ["the commander in the opening hand", "Having [[Kratos]] in your opening hand is ideal.", "commander_in_hand"],
    ["the heading's word", "Keep a hand with [[Gamble]] early.", "heading_prefix"],
    ["a hyphenated count", "A one-land hand falls behind the table.", "land_count"],
    ["a hyphenated figure", "A 2-land hand needs early ramp.", "land_count"],
    ["a landless hand", "A landless hand stalls badly.", "land_count"],
    ["the commander later in the hand", "A hand with [[Sol Ring]] and [[Kratos]] is ideal.", "commander_in_hand"],
  ])("drops a line stating %s", (_label, line, reason) => {
    const r = withKeep(line);
    expect(verdictOf(r, "primer").status).toBe("ok");
    expect(r.primer!.mulligan.keep).toEqual(["A hand with [[Sol Ring]] gets you ahead early."]);
    const alone = good();
    alone.primer.mulligan.keep = [line];
    expect(verdictOf(validateSynopsis(alone, FACTS, CATALOG), "primer")).toMatchObject({ status: "refused", reason });
  });

  // The-99-d9's condition: the two good lines that NAME the commander as a thing to cast.
  it.each([
    ["the Kratos line's shape", "A hand that can develop mana toward [[Kratos]]'s attacks is ideal."],
    ["the Yuriko line's shape", "A hand that can cast [[Kratos]] via ninjutsu soon is ideal."],
  ])("keeps a line naming the commander to cast (%s)", (_label, line) => {
    expect(withKeep(line).primer!.mulligan.keep).toContain(line);
  });

  it("carries the land range from the facts, for the fixed line", () => {
    expect(validateSynopsis(good(), FACTS, CATALOG).lands).toEqual({ keep: FACTS.keep, sendBack: FACTS.sendBack });
  });
});
