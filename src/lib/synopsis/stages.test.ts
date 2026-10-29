import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import { buildSynopsisPrompt } from "./prompt";
import { synopsisResponseSchemaV8Wire } from "./response-schema";
import {
  alternateCommanders,
  checkCardsInList,
  checkExplainedOnce,
  checkLength,
  checkShape,
  checkStageFit,
  checkStagesNameCards,
  checkTurnNumbers,
  docFromChecked,
  docFromStagesReply,
  earlyMaxManaValue,
  stagesResponseSchemaWire,
  turnNumbers,
  type StagesReply,
} from "./stages";
import type { CheckedSynopsis } from "./types";
import { validateSynopsisV8 } from "./validate-v8";

// Each check is shown passing on a reply built to pass, then BROKEN one way and shown failing, so a
// check that always answers clean cannot hide here.

const FACTS: SynopsisFacts = {
  commanders: ["Meren of Clan Nel Toth"],
  identity: ["B", "G"],
  unproducible: [],
  lands: 37,
  ramp: 10,
  keep: { low: 2, high: 4 },
  sendBack: { none: 0, under: 1, over: 5 },
  commanderManaValues: [4],
  figures: [0, 1, 2, 4, 5, 7, 10, 37],
  cards: [
    { oracleId: "m", name: "Meren of Clan Nel Toth", typeLine: "Legendary Creature", quantity: 1, categories: ["commander"], oracleText: "Whenever another creature you control dies, you get an experience counter.", manaValue: 4 },
    { oracleId: "s", name: "Satyr Wayfinder", typeLine: "Creature", quantity: 1, categories: [], oracleText: "When this enters, reveal the top four cards.", manaValue: 2 },
    { oracleId: "v", name: "Viscera Seer", typeLine: "Creature", quantity: 1, categories: [], oracleText: "Sacrifice a creature: Scry 1.", manaValue: 1 },
    { oracleId: "g", name: "Grave Titan", typeLine: "Creature", quantity: 1, categories: [], oracleText: "Deathtouch.", manaValue: 6 },
    { oracleId: "e", name: "Eternal Witness", typeLine: "Creature", quantity: 1, categories: [], oracleText: "Return a card.", manaValue: 3 },
    { oracleId: "k", name: "Spore Frog", typeLine: "Creature", quantity: 1, categories: [], oracleText: "Sacrifice: prevent damage.", manaValue: 1 },
    { oracleId: "f", name: "Forest", typeLine: "Basic Land", quantity: 18, categories: ["land"], oracleText: null },
  ],
  stats: { ramp: 10, commanderCastTurn: 4, interaction: { total: 8, instantSpeed: 3, cheap: 4, cheapInstant: 2, wipes: 1 } },
};
// Refs follow the cards' order: c1 Meren, c2 Satyr, c3 Seer, c4 Titan, c5 Witness, c6 Frog, c7 Forest.

const assessment = ["graveyard_or_zone_hate", "artifact_enchantment_removal", "interaction_speed", "commander_dependence", "win_path", "combo_vulnerability", "mana_and_colors"]
  .map((topic) => (topic === "graveyard_or_zone_hate"
    ? { topic, verdict: "weakness", tier: "moderate", line: "Graveyard hate such as [[Rest in Peace]] shuts off the recursion.", evidence: ["c1"] }
    : { topic, verdict: "not_a_weakness", evidence: [] }));

function goodReply(): StagesReply {
  return {
    plans: { primary: "Grinds value from creatures dying until [[Grave Titan]] takes over the board.", backups: [] },
    overview: "A Golgari recursion deck led by [[Meren of Clan Nel Toth]] that wins by grinding.",
    primer: {
      strategy: [
        { text: "Fill the yard with [[Satyr Wayfinder]] and land [[Meren of Clan Nel Toth]] around turn 4.", evidence: ["c2", "c1"] },
        { text: "Sacrifice to [[Viscera Seer]] each turn so creatures return at your end step.", evidence: ["c3"] },
        { text: "Keep [[Spore Frog]] back to blank an attack while the board grows.", evidence: ["c6"] },
      ],
      mulligan: {
        keep: [{ text: "A cheap creature that feeds the yard early.", evidence: [] }],
        sendBack: [{ text: "Hands with no early creature to sacrifice.", evidence: [] }],
      },
      tips: [
        { text: "[[Eternal Witness]] returns [[Forest]] when you are short of lands.", evidence: ["c5", "c7"] },
        { text: "Hold [[Eternal Witness]] back until a [[Forest]] is destroyed.", evidence: ["c5", "c7"] },
      ],
    },
    keyCards: [
      { card: "Satyr Wayfinder", claims: [], job: "Fills the graveyard for later.", evidence: ["c2"] },
      { card: "Viscera Seer", claims: [], job: "A free outlet for the engine.", evidence: ["c3"] },
      { card: "Spore Frog", claims: [], job: "Fogs a big attack, then returns.", evidence: ["c6"] },
      { card: "Grave Titan", claims: [], job: "Floods the board with bodies.", evidence: ["c4"] },
      { card: "Eternal Witness", claims: [], job: "Returns the best spent card.", evidence: ["c5"] },
    ],
    assessment,
  };
}

const OLD: CheckedSynopsis = {
  verdicts: [],
  overview: "A Golgari recursion deck led by [[Meren of Clan Nel Toth]] that wins by grinding out value, returning creatures every turn until the board is too big to stop.",
  primer: {
    strategy: ["Fill the graveyard early.", "Land [[Meren of Clan Nel Toth]].", "Sacrifice creatures for experience.", "Return the best creature each end step."],
    mulligan: { keep: ["A cheap creature that feeds the yard early."], sendBack: ["Hands with no early creature to sacrifice."] },
    tips: [
      { cards: ["Eternal Witness", "Forest"], text: "[[Eternal Witness]] returns [[Forest]] when you are short of lands, and loops with [[Meren of Clan Nel Toth]]." },
      { cards: ["Grave Titan", "Viscera Seer"], text: "Sacrifice [[Grave Titan]]'s tokens to [[Viscera Seer]] to grow experience fast." },
      { cards: ["Spore Frog", "Viscera Seer"], text: "Loop [[Spore Frog]] through [[Viscera Seer]] to fog every turn." },
    ],
  },
  keyCards: [
    { card: "Satyr Wayfinder", claims: [], job: "Fills the graveyard for later." },
    { card: "Viscera Seer", claims: [], job: "A free outlet for the engine." },
    { card: "Spore Frog", claims: [], job: "Fogs a big attack, then returns." },
    { card: "Grave Titan", claims: [], job: "Floods the board with bodies." },
    { card: "Eternal Witness", claims: [], job: "Returns the best spent card." },
  ],
  weaknesses: ["Moderate: Graveyard hate such as [[Rest in Peace]] shuts off the recursion."],
  cards: {},
};

const doc = (r: StagesReply = goodReply()) => docFromStagesReply(r);
const edit = (f: (r: StagesReply) => void) => { const r = goodReply(); f(r); return docFromStagesReply(r); };

describe("the stages reply", () => {
  it("is the contract-8 reply plus an optional alternate line, so the contract-8 validator still reads it", () => {
    const r = goodReply();
    expect(stagesResponseSchemaWire.parse(r)).toEqual(r);
    expect(stagesResponseSchemaWire.parse({ ...r, alternate: { text: "x.", evidence: [] } }).alternate).toEqual({ text: "x.", evidence: [] });
    expect(synopsisResponseSchemaV8Wire.safeParse(r).success).toBe(true);
    const checked = validateSynopsisV8(r, FACTS, new Map([["rest in peace", { oracleId: "rip", name: "Rest in Peace" }]]));
    expect(checked.verdicts.filter((v) => v.status !== "ok")).toEqual([]);
  });
});

describe("zero cards not in the list", () => {
  it("passes marks and refs that resolve, and lets a weakness name a card the deck lacks", () => {
    expect(checkCardsInList(doc(), FACTS)).toEqual({ pass: true, offenders: [] });
  });
  it("fails a marked card outside the deck, a bad ref and a Key card outside the deck", () => {
    const d = edit((r) => {
      r.primer.strategy[1].text = "Sacrifice to [[Ashnod's Altar]] for value.";
      r.primer.tips[0].evidence = ["c99"];
      r.keyCards[0].card = "Sol Ring";
    });
    const res = checkCardsInList(d, FACTS);
    expect(res.pass).toBe(false);
    expect(res.offenders).toEqual(expect.arrayContaining([
      { where: "stages[1]", name: "Ashnod's Altar", kind: "mark" },
      { where: "tips[0]", name: "c99", kind: "ref" },
      { where: "keyCards[0]", name: "Sol Ring", kind: "keyCard" },
    ]));
  });
});

describe("zero turn numbers but the cast turn", () => {
  it("reads every way a turn is written, never a card's name", () => {
    expect(turnNumbers("Cast it on turn 3, then turns two to four, by turn-five, the third turn, or T6.")).toEqual([3, 2, 4, 5, 3, 6]);
    expect(turnNumbers("[[Turn to Frog]] each turn, an extra turn.")).toEqual([]);
  });
  it("allows the cast turn and fails any other", () => {
    expect(checkTurnNumbers(doc(), 4).pass).toBe(true);
    const res = checkTurnNumbers(edit((r) => { r.primer.strategy[1].text = "By turn 6 the engine runs."; }), 4);
    expect(res.pass).toBe(false);
    expect(res.offenders.map((o) => [o.where, o.turn])).toEqual([["stages[1]", 6]]);
    expect(checkTurnNumbers(doc(), null).pass).toBe(false);
  });
});

describe("zero cards explained twice", () => {
  it("passes when only the commander repeats, and says so apart", () => {
    const res = checkExplainedOnce(doc(), FACTS);
    expect(res.offenders).toEqual([{ card: "Meren of Clan Nel Toth", sections: ["overview", "stages"], commander: true }]);
    expect(res.pass).toBe(false);
    expect(res.passExceptCommanders).toBe(true);
  });
  it("reports each card named in two sections, and ignores a Key card's own name", () => {
    const d = edit((r) => {
      r.primer.tips[0].text = "[[Satyr Wayfinder]] finds [[Eternal Witness]].";
      r.keyCards[1].job = "Pairs with [[Grave Titan]].";
    });
    const res = checkExplainedOnce(d, FACTS);
    expect(res.passExceptCommanders).toBe(false);
    expect(res.offenders).toEqual(expect.arrayContaining([
      { card: "Satyr Wayfinder", sections: ["stages", "tips"], commander: false },
      { card: "Grave Titan", sections: ["winsBy", "keyCardJobs"], commander: false },
    ]));
    // Viscera Seer is a Key card AND a stage card: the row's own name is not a mention.
    expect(res.offenders.some((o) => o.card === "Viscera Seer")).toBe(false);
  });
});

describe("stage cards fit their stage", () => {
  it("allows Early cards up to the cast turn plus one, and the commander whatever it costs", () => {
    expect(earlyMaxManaValue(4)).toBe(5);
    expect(earlyMaxManaValue(null)).toBe(4);
    expect(checkStageFit(doc(), FACTS, 4).pass).toBe(true);
  });
  it("fails a dear card in the Early line, whether named or only cited", () => {
    const named = checkStageFit(edit((r) => { r.primer.strategy[0].text = "Ramp into [[Grave Titan]] early."; r.primer.strategy[0].evidence = []; }), FACTS, 4);
    expect(named.offenders).toEqual([{ card: "Grave Titan", manaValue: 6, max: 5 }]);
    const cited = checkStageFit(edit((r) => { r.primer.strategy[0].evidence = ["c4"]; }), FACTS, 4);
    expect(cited.pass).toBe(false);
  });
});

describe("every stage line names a deck card", () => {
  it("passes three lines that each name and cite a deck card", () => {
    expect(checkStagesNameCards(doc(), FACTS).pass).toBe(true);
  });
  it("fails a generic line, an uncited line and a missing stage", () => {
    const res = checkStagesNameCards(edit((r) => {
      r.primer.strategy[1] = { text: "Draw cards and build the board.", evidence: ["c3"] };
      r.primer.strategy[2].evidence = [];
    }), FACTS);
    expect(res.offenders).toEqual([{ stage: "Mid", why: "names no deck card" }, { stage: "Close", why: "cites no deck card" }]);
    expect(checkStagesNameCards(edit((r) => { r.primer.strategy.pop(); }), FACTS).offenders[0]).toEqual({ stage: "all", why: "2 stage lines, not 3" });
  });
});

describe("total length no longer than today's", () => {
  it("counts what renders, marks as their names, Key card names included", () => {
    const old = docFromChecked(OLD);
    const res = checkLength(doc(), old);
    expect(res.pass).toBe(true);
    expect(res.newChars).toBeLessThanOrEqual(res.oldChars);
  });
  it("fails a new shape that shows more", () => {
    const long = edit((r) => { r.overview = `${r.overview} ${"More words here. ".repeat(30)}`; });
    expect(checkLength(long, docFromChecked(OLD)).pass).toBe(false);
  });
});

describe("the shape's own counts and budgets", () => {
  it("passes three stages, a Wins by line, 2-3 tips and no alternate when the facts carry none", () => {
    expect(checkShape(doc(), [])).toEqual({ pass: true, offenders: [] });
  });
  it("wants the alternate line exactly when the facts carry one, naming one of them", () => {
    expect(checkShape(doc(), ["Grave Titan"]).offenders).toEqual(["no alternate line though the facts carry one"]);
    const withAlt = (text: string) => edit((r) => { r.alternate = { text, evidence: ["c4"] }; });
    expect(checkShape(withAlt("Lead with [[Grave Titan]] for a faster board."), ["Grave Titan"]).pass).toBe(true);
    expect(checkShape(withAlt("Lead with something else."), ["Grave Titan"]).offenders).toEqual(["the alternate line names none of the alternate commanders"]);
    expect(checkShape(withAlt("Lead with [[Grave Titan]]."), []).offenders).toEqual(["an alternate line with no alternate commander in the facts"]);
  });
  it("fails three tips: the shape holds exactly two", () => {
    expect(checkShape(edit((r) => { r.primer.tips.push(r.primer.tips[0]); }), []).offenders).toEqual(["3 tips"]);
  });
  it("fails four tips, a long stage and a long Wins by line", () => {
    const res = checkShape(edit((r) => {
      r.primer.tips.push(r.primer.tips[0], r.primer.tips[1]);
      r.primer.strategy[0].text = "x".repeat(145);
      r.plans.primary = "y".repeat(145);
    }), []);
    expect(res.offenders).toEqual(["Early is 145 characters", "Wins by is 145 characters", "4 tips"]);
  });
});

describe("alternate commanders from an MTGJSON deck file", () => {
  it("takes the foil main-board cards that can lead a deck, never the face commander or displayCommander", () => {
    const file = { data: {
      commander: [{ name: "The Ur-Dragon", isFoil: true, leadershipSkills: { commander: true } }],
      displayCommander: [{ name: "The Ur-Dragon" }],
      mainBoard: [
        { name: "O-Kagachi, Vengeful Kami", isFoil: true, leadershipSkills: { commander: true } },
        { name: "Ramos, Dragon Engine", isFoil: true, leadershipSkills: { commander: true } },
        { name: "Atarka, World Render", isFoil: false, leadershipSkills: { commander: true } },
        { name: "Command Tower", isFoil: true },
      ],
    } };
    expect(alternateCommanders(file)).toEqual(["O-Kagachi, Vengeful Kami", "Ramos, Dragon Engine"]);
    expect(alternateCommanders({ data: { commander: [], mainBoard: [] } })).toEqual([]);
  });
});

describe("the stages prompt variant", () => {
  it("leaves the shipped contract-8 prompt byte for byte unchanged", () => {
    const shipped = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true });
    const again = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true });
    expect(again).toEqual(shipped);
    expect(shipped.system).not.toContain("EXACTLY 3 lines");
    expect(shipped.system).toContain("2 to 4 tips");
  });
  it("asks for three labeled stages, Wins by, 2-3 tips, the cast turn alone and no alternate for a player's deck", () => {
    const { system, user } = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true, stages: { alternates: [] } });
    expect(system).toContain("EXACTLY 3 lines");
    expect(system).toContain("each costing at most 5 mana");
    expect(system).toContain('"around turn 4"');
    expect(system).toContain('"Wins by" line, so it is AT MOST 144 CHARACTERS');
    expect(system).toContain("names NO card that any stage line names");
    expect(system).toContain("EXACTLY 2 tips");
    expect(system).toContain('A tip names NO card that a stage line, the "Wins by" line or the alternate line names');
    expect(system).not.toContain("2 to 4 tips");
    expect(system).toContain("NO LONGER than today's Overview of this deck. Trim the overview paragraph first");
    expect(system).toContain("EACH CARD IS EXPLAINED ONCE");
    expect(system).toContain("- alternate: leave it out.");
    expect(user).not.toContain("Alternate commanders");
  });
  it("names the alternate commanders and asks for one line when the facts carry them", () => {
    const { system, user } = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true, stages: { alternates: ["Grave Titan"] } });
    expect(user).toContain("Alternate commanders (in this decklist");
    expect(user).toContain("- Grave Titan");
    expect(system).toContain('- alternate: REQUIRED for this deck. The facts list alternate commanders (Grave Titan), so the reply MUST include "alternate"');
    expect(system).toContain('This deck carries alternate commanders: the reply MUST include the "alternate" line.');
  });
  it("states today's length as the whole budget when it is known", () => {
    const { system } = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true, stages: { alternates: [], maxChars: 1834 } });
    expect(system).toContain("NO LONGER than today's Overview of this deck (1834 characters as rendered). Trim the overview paragraph first");
    expect(system).not.toContain("the reply MUST include the \"alternate\" line");
  });
  it("states no turn at all when the cast turn is unknown", () => {
    const { system } = buildSynopsisPrompt({ ...FACTS, stats: { ...FACTS.stats!, commanderCastTurn: null } }, undefined, { v2: true, contract8: true, stages: { alternates: [] } });
    expect(system).toContain("State no turn number anywhere");
    expect(system).not.toContain("around turn 4");
  });
  it("refuses the stages variant without contract 8", () => {
    expect(() => buildSynopsisPrompt(FACTS, undefined, { v2: true, stages: { alternates: [] } })).toThrow(/needs v2 and contract8/);
  });
});

describe("the reply after the app's one repair", () => {
  it("takes only the repaired sections from the repair, and Wins by and the alternate from the first", async () => {
    const { mergeStagesReply } = await import("./stages");
    const first = { ...goodReply(), alternate: { text: "A.", evidence: [] } };
    const repair = { ...goodReply(), overview: "Repaired.", plans: { primary: "Other.", backups: [] }, keyCards: [] };
    const merged = mergeStagesReply(first, repair, ["overview"]);
    expect(merged.overview).toBe("Repaired.");
    expect(merged.keyCards).toEqual(first.keyCards);
    expect(merged.plans).toEqual(first.plans);
    expect(merged.alternate).toEqual(first.alternate);
    expect(mergeStagesReply(first, null, ["overview"])).toBe(first);
  });
});
