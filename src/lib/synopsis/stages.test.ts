import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import { buildSynopsisPrompt } from "./prompt";
import { synopsisResponseSchemaV8Wire } from "./response-schema";
import {
  alternateCommanders,
  checkCardsInList,
  checkExplainedOnce,
  checkNoCardTwice,
  dedupeSections,
  stagesSchemaFor,
  checkLength,
  checkShape,
  checkStageFit,
  checkStagesNameCards,
  checkTurnNumbers,
  checkDeckKind,
  checkLandKeep,
  checkMulliganSpecific,
  allChecksPass,
  curveFacts,
  docShownNew,
  landKeepNumber,
  landKeepTable,
  sectionsOf,
  stagesChecks,
  stagesResponseSchemaWireV3,
  statedLandNumbers,
  inexactLandCounts,
  figuresInContext,
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
    expect(turnNumbers("[[Sigil Captain]] turns 1/1s into 3/3s; it turns +1/+1 counters and X/X tokens.")).toEqual([]);
  });
  it("never reads the verb turn followed by a count as a game turn", () => {
    expect(turnNumbers("It turns two tokens into threats.")).toEqual([]);
    expect(turnNumbers("[[Ixidron]] turns 3 creatures face up.")).toEqual([]);
    expect(turnNumbers("Turn two creatures face up with the commander.")).toEqual([]);
    expect(turnNumbers("Flip it and turn 3 tokens sideways.")).toEqual([]);
  });
  it("reads game turns after a preposition, joined by a hyphen, as a plural range, or closing a clause", () => {
    expect(turnNumbers("Cast it on turn 3.")).toEqual([3]);
    expect(turnNumbers("Land it around turn 4, by turn five at the latest.")).toEqual([4, 5]);
    expect(turnNumbers("Ramp on turns 2 and 3.")).toEqual([2, 3]);
    expect(turnNumbers("Turns 1-3 set up the board.")).toEqual([1, 3]);
    expect(turnNumbers("Turns two to four build the engine.")).toEqual([2, 4]);
    expect(turnNumbers("A turn-three [[Meren of Clan Nel Toth]] wins.")).toEqual([3]);
    expect(turnNumbers("Turn 3: attack.")).toEqual([3]);
    expect(turnNumbers("It should be out by the end of turn 6")).toEqual([6]);
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
  it("passes three stages, a Wins by line, exactly 2 tips and no alternate when the facts carry none", () => {
    expect(checkShape(doc(), [])).toEqual({ pass: true, offenders: [] });
  });
  it("wants the alternate line exactly when the facts carry one, naming one of them", () => {
    expect(checkShape(doc(), ["Grave Titan"]).offenders).toEqual(["no alternate line though the facts carry one"]);
    const withAlt = (text: string) => edit((r) => { r.alternate = { text, evidence: ["c4"] }; });
    expect(checkShape(withAlt("Lead with [[Grave Titan]] for a faster board."), ["Grave Titan"]).pass).toBe(true);
    expect(checkShape(withAlt("Lead with something else."), ["Grave Titan"]).offenders).toEqual(["the alternate line names none of the alternate commanders"]);
    expect(checkShape(withAlt("Lead with [[Grave Titan]]."), []).offenders).toEqual(["an alternate line with no alternate commander in the facts"]);
  });
  it("fails an empty or blank plans.primary: there is no Wins by line", () => {
    expect(checkShape(edit((r) => { r.plans.primary = ""; }), []).offenders).toEqual(["no Wins by line"]);
    expect(checkShape(edit((r) => { r.plans.primary = "   "; }), []).offenders).toEqual(["no Wins by line"]);
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
  // Hashed from origin/main's prompt.ts (c5c41998f) before the stages option existed, for these FACTS:
  // any word of the shipped contract-8 prompt that moves fails this, not only a branch disagreement.
  it("leaves the shipped contract-8 prompt byte for byte unchanged: sha256 pinned from main", () => {
    const sha = (t: string) => createHash("sha256").update(t).digest("hex");
    const shipped = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true });
    expect(sha(shipped.system)).toBe("38bc173f6696ee61d78f898647afc870332110332f4a3592bbaf7ea0b69b38df");
    expect(sha(shipped.user)).toBe("6698fa06439b7937fb985ccb02df2508c634969320aeed05abd511420147abde");
    expect(shipped.system).not.toContain("EXACTLY 3 lines");
    expect(shipped.system).toContain("2 to 4 tips");
  });
  // Iteration 2's stages prompt, hashed before iteration 3 existed (16bcca2a5): iteration 3 is a new
  // shape beside it, so iteration 2 stays runnable byte for byte.
  it("leaves iteration 2's stages prompt byte for byte unchanged: sha256 pinned from 16bcca2a5", () => {
    const sha = (t: string) => createHash("sha256").update(t).digest("hex");
    const two = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true, stages: { alternates: ["Grave Titan"], maxChars: 1834 } });
    expect(sha(two.system)).toBe("5278d7d1a69adb7dfe32d88acbf0110cd3048e5ea419ce27360dd685efb65d83");
    expect(sha(two.user)).toBe("191268ba044b05977ee67af1de29428778d82c04776a4a79dd09f57bea51af9b");
  });
  it("asks for three labeled stages, Wins by, exactly 2 tips, the cast turn alone and no alternate for a player's deck", () => {
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
  it("places a combo in ONE section under stages, and leaves the shipped combo rules as they are", () => {
    const { system } = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true, stages: { alternates: [] } });
    expect(system).toContain("its cards other than the commander are named in ONE place only: the Close line");
    expect(system).toContain("The one line that names a listed combo names every card of the combo.");
    expect(system).not.toContain("otherwise the overview and the strategy name it as a backup");
    expect(system).not.toContain("Whenever the overview or a strategy step names a listed combo");
    const shipped = buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true }).system;
    expect(shipped).toContain("otherwise the overview and the strategy name it as a backup");
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

// ---------------------------------------------------------------------------------------------
// Iteration 3.

/** FACTS with each nonland, non-commander card's mana value replaced, in card order (Satyr, Seer, Titan, Witness, Frog). */
const withCurve = (mvs: number[], extra: Partial<SynopsisFacts> = {}): SynopsisFacts => {
  let i = 0;
  return { ...FACTS, ...extra, cards: FACTS.cards.map((c) => (c.oracleId === "m" || c.oracleId === "f" ? c : { ...c, manaValue: mvs[i++] })) };
};

describe("iteration 3: the deck's own land number", () => {
  it("keeps a transforming card with a land back on the curve, and leaves a modal land off it", () => {
    const extra = (c: Partial<SynopsisFacts["cards"][number]>) => ({ ...FACTS, cards: [...FACTS.cards, { oracleId: "x", name: "X", quantity: 1, categories: [], oracleText: null, ...c } as SynopsisFacts["cards"][number]] });
    const ojer = curveFacts(extra({ typeLine: "Legendary Creature \u2014 God // Legendary Land", layout: "transform", manaValue: 6 }));
    expect(ojer.nonland).toBe(6);
    expect(ojer.fivePlus).toBe(2);
    const modal = curveFacts(extra({ typeLine: "Sorcery // Land", layout: "modal_dfc", manaValue: 3 }));
    expect(modal.nonland).toBe(5);
    // Facts stored before layout was carried still read a land on either face as a land drop.
    expect(curveFacts(extra({ typeLine: "Sorcery // Land", manaValue: 3 })).nonland).toBe(5);
  });
  it("reads the curve off nonland, non-commander cards by quantity", () => {
    const c = curveFacts(FACTS);
    expect(c).toEqual({ lands: 37, ramp: 10, nonland: 5, averageManaValue: 2.6, fivePlus: 1, twoOrLess: 3, commanderManaValue: 4, expectedLandsInSeven: 2.62 });
  });
  it("says 2 for a low curve, 3 for a middling one, 4 for a top-heavy one, and gives the reason", () => {
    const low = landKeepNumber(FACTS);
    expect(low.lands).toBe(2);
    expect(low.reasons).toEqual(["low curve"]);
    expect(low.why).toContain("a low curve");
    const mid = landKeepNumber(withCurve([2, 3, 4, 3, 3]));
    expect(mid.lands).toBe(3);
    expect(mid.reasons).toEqual([]);
    expect(mid.why).toContain("a middling curve");
    const heavy = landKeepNumber(withCurve([3, 4, 6, 5, 2]));
    expect(heavy.lands).toBe(4);
    expect(heavy.reasons).toEqual(["top-heavy"]);
    expect(heavy.why).toContain("average 4 mana value");
    expect(landKeepNumber({ ...withCurve([2, 3, 4, 3, 3]), commanderManaValues: [7] }).lands).toBe(4);
  });
  it("adds one at 40 lands, takes one at 32, and holds the number inside the keepable range and 2 to 4", () => {
    expect(landKeepNumber(withCurve([2, 3, 4, 3, 3], { lands: 41, keep: { low: 2, high: 4 } })).lands).toBe(4);
    expect(landKeepNumber(withCurve([2, 3, 4, 3, 3], { lands: 31 })).lands).toBe(2);
    const held = landKeepNumber(withCurve([3, 4, 6, 5, 2], { lands: 41, keep: { low: 2, high: 4 } }));
    expect(held.lands).toBe(4);
    expect(held.reasons).toEqual(["top-heavy", "many lands", "held to the keepable range"]);
    expect(landKeepNumber({ ...FACTS, keep: { low: 3, high: 5 } }).lands).toBe(3);
  });
  it("keeps the rule's 2 to 4 when the keepable range lies above it (85 lands or more: 5 to 5)", () => {
    const flood = withCurve([3, 4, 6, 5, 2], { lands: 90, keep: { low: 5, high: 5 } });
    const n = landKeepNumber(flood);
    expect(n.lands).toBe(4);
    const line = (text: string) => { const r = goodReply(); r.landKeep = { text, evidence: [] }; return docFromStagesReply(r, 3); };
    expect(checkLandKeep(line("Keep 5 lands: the curve is high."), FACTS, n).pass).toBe(false);
    expect(checkLandKeep(line("Keep 4 lands: the curve is high."), FACTS, n).offenders).toEqual([]);
  });
  it("reads the land counts a line states, outside card marks", () => {
    expect(statedLandNumbers("Keep 4 lands: the curve is high.")).toEqual([4]);
    expect(statedLandNumbers("A four-land hand.")).toEqual([4]);
    // "an N-land deck" is the deck total, never a hand count (CounterIntelligence_EOC, the i3 fix run).
    expect(statedLandNumbers("4 lands fits a 40-land deck with 11 spells costing five or more.")).toEqual([4]);
    expect(statedLandNumbers("Keep 3 lands in a 36 land deck.")).toEqual([3]);
    expect(statedLandNumbers("Three or four lands.")).toEqual([3, 4]);
    expect(statedLandNumbers("[[Two Lands]] and a creature.")).toEqual([]);
  });
  it("skips the deck's own land total, which is a reason and not a hand count", () => {
    expect(statedLandNumbers("Keep 3 lands: a middling curve on 37 lands.")).toEqual([3]);
    expect(statedLandNumbers("Keep 4 lands: it plays 40 lands.")).toEqual([4]);
    expect(statedLandNumbers("Keep 3 of its 37 lands.")).toEqual([3]);
    expect(statedLandNumbers("Keep 5 lands on 37 lands.")).toEqual([5]);
    expect(statedLandNumbers("Keep 3 lands; the deck plays only 32 lands.")).toEqual([3]);
    expect(statedLandNumbers("Keep 3 lands with 37 lands in the deck.")).toEqual([3]);
    expect(statedLandNumbers("Keep 4 lands: a top-heavy deck with 41 lands.")).toEqual([4]);
    expect(statedLandNumbers("Keep 3 of the 37 lands.")).toEqual([3]);
  });
  it("tells the deck's total from a hand count by the words, not the number", () => {
    // A deck whose total equals the hand count still states the hand count.
    expect(statedLandNumbers("Keep 2 lands: the curve is low.")).toEqual([2]);
    expect(statedLandNumbers("A hand with 3 lands and [[Satyr Wayfinder]].")).toEqual([3]);
    expect(statedLandNumbers("A four-land hand.")).toEqual([4]);
    expect(statedLandNumbers("Two lands in hand and a creature.")).toEqual([2]);
  });
  it("reads both ends of a dashed range, and finds every range or open-ended count", () => {
    expect(statedLandNumbers("Keep 2\u20134 lands.")).toEqual([2, 4]);
    expect(statedLandNumbers("Keep 2-4 lands.")).toEqual([2, 4]);
    for (const t of ["Keep 2\u20134 lands.", "Keep 2-4 lands.", "Keep 2 to 4 lands.", "Keep three or four lands.", "Keep 4 or more lands.", "Keep 4 or fewer lands.", "Keep at least 4 lands.", "Keep 4 lands or more.", "Keep 4+ lands."]) {
      expect(inexactLandCounts(t), t).not.toEqual([]);
    }
    expect(inexactLandCounts("Keep 4 lands: a four-land hand on 37 lands.")).toEqual([]);
  });
});

describe("iteration 3: the land line check", () => {
  const land = landKeepNumber(withCurve([3, 4, 6, 5, 2])); // 4, top-heavy; figures include 2 (five or more), 1 (two or less), 37, 10, 4, 7
  const withLine = (text: string) => edit((r) => { (r as StagesReply).landKeep = { text, evidence: [] }; });
  const asShape3 = (text: string) => { const r = goodReply(); r.landKeep = { text, evidence: [] }; return docFromStagesReply(r, 3); };
  it("passes the deck's number with a reason, and records the curve behind it", () => {
    const res = checkLandKeep(asShape3("Keep 4 lands: the deck is top-heavy and [[Meren of Clan Nel Toth]] costs 4."), FACTS, land);
    expect(res.offenders).toEqual([]);
    expect(res.pass).toBe(true);
    expect(res.stated).toBe(4);
    expect(res.target).toBe(4);
    expect(res.curve.averageManaValue).toBe(4);
  });
  it("fails another number, a range, a figure the app did not give, a decimal, no reason, and no line", () => {
    expect(checkLandKeep(asShape3("Keep 3 lands because the curve is high."), FACTS, land).offenders).toEqual(["states 3 lands, not the deck's 4", "states a figure the app did not give: 3"]);
    expect(checkLandKeep(asShape3("Keep 3 or 4 lands since the curve is high."), FACTS, land).offenders).toContain("states more than one land count (3, 4)");
    expect(checkLandKeep(asShape3("Keep 4 lands: 12 spells cost five or more."), FACTS, land).offenders).toEqual(["states a figure the app did not give: 12"]);
    expect(checkLandKeep(asShape3("Keep 4 lands: spells average 4.0 mana."), FACTS, land).offenders).toContain("states a decimal (the average is a reason, never a figure)");
    expect(checkLandKeep(asShape3("Keep 4 lands in your opening hand."), FACTS, land).offenders).toEqual(["gives no reason for the number"]);
    expect(checkLandKeep(withLine("Keep 4 lands."), FACTS, land).offenders).toEqual(["no land line"]);
  });
  it("passes a line citing the deck's land total, and still fails a wrong hand count beside it", () => {
    expect(checkLandKeep(asShape3("Keep 4 lands: top-heavy on 37 lands."), FACTS, land).offenders).toEqual([]);
    expect(checkLandKeep(asShape3("Keep 4 of its 37 lands: the curve is high."), FACTS, land).offenders).toEqual([]);
    expect(checkLandKeep(asShape3("Keep 3 lands: top-heavy on 37 lands."), FACTS, land).offenders).toEqual(["states 3 lands, not the deck's 4", "states a figure the app did not give: 3"]);
    // A deck whose land total equals its land number: the hand count is still read.
    const low = landKeepNumber(FACTS);
    const tiny = { ...low, curve: { ...low.curve, lands: 2 } };
    expect(checkLandKeep(asShape3("Keep 2 lands: the curve is low."), FACTS, tiny).offenders).toEqual([]);
  });
  it("fails a range or an open-ended count that includes the deck's number", () => {
    for (const t of ["Keep 2\u20134 lands: the curve is high.", "Keep 4 or more lands: the curve is high.", "Keep at least 4 lands: the curve is high.", "Keep 4 or fewer lands: the curve is high."]) {
      expect(checkLandKeep(asShape3(t), FACTS, land).pass, t).toBe(false);
      expect(checkLandKeep(asShape3(t), FACTS, land).offenders.some((o) => o.startsWith("states a range or an open-ended count")), t).toBe(true);
    }
  });
  it("tables the numbers stated, and says whether they differ across decks and each deck states its own", () => {
    const row = (id: string, target: number, stated: number | null) => ({ id, name: id, kind: "precon" as const, target, stated, why: "", curve: land.curve });
    const t = landKeepTable([row("a", 4, 4), row("b", 3, 3), row("c", 3, 3)]);
    expect(t).toMatchObject({ distinctStated: [3, 4], distinctTargets: [3, 4], everyStatedIsTheDecks: true, differs: true });
    const same = landKeepTable([row("a", 4, 3), row("b", 3, 3)]);
    expect(same).toMatchObject({ distinctStated: [3], differs: false, everyStatedIsTheDecks: false });
  });
});

describe("iteration 3: no generic mulligan line", () => {
  it("passes lines naming a deck card or a deck-specific number, and flags a line true of any deck", () => {
    const d = edit((r) => {
      r.primer.mulligan.keep = [{ text: "[[Satyr Wayfinder]] with a way to sacrifice it.", evidence: ["c2"] }];
      r.primer.mulligan.sendBack = [{ text: "A hand with no early plays.", evidence: [] }, { text: "Fewer than 10 ramp pieces in sight.", evidence: [] }];
    });
    const res = checkMulliganSpecific(d, FACTS, landKeepNumber(FACTS));
    expect(res.pass).toBe(false);
    expect(res.offenders).toEqual([{ where: "sendBack[0]", text: "A hand with no early plays." }]);
  });
  it("does not count a bare number that only equals a figure; counts it tied to a land or curve figure", () => {
    // 4 is the commander's mana value in FACTS, so equality alone used to pass this.
    const bare = edit((r) => { r.primer.mulligan.keep = [{ text: "A hand with four spells.", evidence: [] }]; r.primer.mulligan.sendBack = [{ text: "A hand of 4 creatures and no plan.", evidence: [] }]; });
    expect(checkMulliganSpecific(bare, FACTS, landKeepNumber(FACTS)).offenders.map((o) => o.where)).toEqual(["keep[0]", "sendBack[0]"]);
    const tied = edit((r) => { r.primer.mulligan.keep = [{ text: "Two of the deck's 10 ramp pieces.", evidence: [] }]; r.primer.mulligan.sendBack = [{ text: "A hand whose cheapest spell costs 4.", evidence: [] }]; });
    expect(checkMulliganSpecific(tied, FACTS, landKeepNumber(FACTS)).offenders).toEqual([]);
    expect(figuresInContext("A hand with four spells.")).toEqual([]);
    // A later unit word does not tie the number to it: only a number-and-unit phrase counts.
    expect(figuresInContext("A hand with four spells and no ramp.")).toEqual([]);
    expect(figuresInContext("A hand of 4 creatures that cost too much mana.")).toEqual([]);
    expect(figuresInContext("Two of the deck's 10 ramp pieces.")).toEqual([10]);
    expect(figuresInContext("Keep 4 lands and a 2 drop.")).toEqual([4, 2]);
    expect(figuresInContext("Keep 3 lands and some 2-drops; [[Meren]] costs 4.")).toEqual([3, 2, 4]);
  });
  it("reads today's lines against the same figures as the new ones", () => {
    const reply = goodReply();
    reply.landKeep = { text: "Keep 2 lands: the curve is low.", evidence: [] };
    reply.primer.mulligan.keep = [{ text: "[[Satyr Wayfinder]] early.", evidence: ["c2"] }];
    reply.primer.mulligan.sendBack = [{ text: "[[Viscera Seer]] with no fodder.", evidence: ["c3"] }];
    const oldDoc = { ...docFromChecked(OLD), keep: [{ text: "A hand with 2 lands." }], sendBack: [] };
    const c = stagesChecks({ reply, shownNew: docShownNew(OLD, reply, 3), oldDoc, facts: FACTS, alternates: [], shape: 3, kind: "player deck" });
    // 2 is the land number, a figure only the land rule gives: today's line is read against it too.
    expect(c.mulliganSpecificToday?.offenders).toEqual([]);
  });
  it("does not count the hand's 7 as specific", () => {
    const d = edit((r) => { r.primer.mulligan.keep = [{ text: "A 7-card hand with early plays.", evidence: [] }]; });
    expect(checkMulliganSpecific(d, FACTS, landKeepNumber(FACTS)).offenders.map((o) => o.where)).toContain("keep[0]");
  });
});

describe("iteration 3: Key cards skip what a stage explained", () => {
  it("exempts the commander repeated in the overview and Early, but never the commander as a Key card", () => {
    const M = "Meren of Clan Nel Toth";
    const base = { overview: [], strategy: [], stages: [], winsBy: [], alternate: [], landKeep: [], keep: [], sendBack: [], tips: [], keyCards: [], weaknesses: [] };
    const early = { ...base, overview: [{ text: `A deck led by [[${M}]].` }], stages: [{ text: `[[${M}]] lands early.` }] };
    const exempt = checkExplainedOnce(early, FACTS, { keyCardNames: true });
    expect(exempt.pass).toBe(false);
    expect(exempt.passExceptCommanders).toBe(true);
    const asKey = { ...early, keyCards: [{ card: M, job: { text: "Returns creatures." } }] };
    const res = checkExplainedOnce(asKey, FACTS, { keyCardNames: true });
    expect(res.offenders).toEqual([{ card: M, sections: ["overview", "stages", "keyCardJobs"], commander: true }]);
    expect(res.passExceptCommanders).toBe(false);
    // Iteration 2's reading is unchanged: the row's own name is not a mention, so the exemption holds.
    expect(checkExplainedOnce(asKey, FACTS).passExceptCommanders).toBe(true);
  });
  it("counts a Key card's own name as a mention, so a stage card that is a Key card is a repeat", () => {
    const res = checkExplainedOnce(doc(), FACTS, { keyCardNames: true });
    expect(res.offenders).toEqual(expect.arrayContaining([
      { card: "Satyr Wayfinder", sections: ["stages", "keyCardJobs"], commander: false },
      { card: "Viscera Seer", sections: ["stages", "keyCardJobs"], commander: false },
      { card: "Spore Frog", sections: ["stages", "keyCardJobs"], commander: false },
      { card: "Eternal Witness", sections: ["tips", "keyCardJobs"], commander: false },
    ]));
    expect(res.passExceptCommanders).toBe(false);
    // Iteration 2's reading is unchanged: the row's own name is not a mention.
    expect(checkExplainedOnce(doc(), FACTS).offenders.some((o) => o.card === "Viscera Seer")).toBe(false);
  });
  it("does not count a job naming its own card as a second section", () => {
    const r = goodReply();
    r.keyCards = [{ card: "Grave Titan", claims: [], job: "[[Grave Titan]] floods the board.", evidence: ["c4"] }];
    r.plans.primary = "Grinds value.";
    const res = checkExplainedOnce(docFromStagesReply(r, 3), FACTS, { keyCardNames: true });
    expect(res.offenders.some((o) => o.card === "Grave Titan")).toBe(false);
  });
});

describe("iteration 3: the shape", () => {
  const shape3 = (f: (r: StagesReply) => void = () => {}) => { const r = goodReply(); r.landKeep = { text: "Keep 2 lands: the curve is low.", evidence: [] }; f(r); return r; };
  it("drops Wins by from the doc and carries the land line", () => {
    const d = docFromStagesReply(shape3(), 3);
    expect(d.winsBy).toEqual([]);
    expect(d.landKeep).toEqual([{ text: "Keep 2 lands: the curve is low.", refs: [] }]);
    expect(docFromStagesReply(shape3(), 2).landKeep).toEqual([]);
  });
  it("passes one land line and no Wins by; fails a missing or long land line", () => {
    expect(checkShape(docFromStagesReply(shape3(), 3), [], 3).offenders).toEqual([]);
    expect(checkShape(docFromStagesReply(shape3((r) => { delete r.landKeep; }), 3), [], 3).offenders).toEqual(["0 land lines, not 1"]);
    expect(checkShape(docFromStagesReply(shape3((r) => { r.landKeep!.text = "x".repeat(130); }), 3), [], 3).offenders).toEqual(["the land line is 130 characters"]);
  });
  it("requires the land line in iteration 3's schema and leaves iteration 2's without it", () => {
    expect(stagesResponseSchemaWireV3.safeParse(goodReply()).success).toBe(false);
    expect(stagesResponseSchemaWireV3.safeParse(shape3()).success).toBe(true);
    expect(stagesResponseSchemaWire.safeParse(goodReply()).success).toBe(true);
    expect(Object.keys(stagesResponseSchemaWire.shape)).not.toContain("landKeep");
  });
  it("shows the land line and no Wins by on the new side", () => {
    const shown = docShownNew(OLD, shape3(), 3);
    expect(shown.winsBy).toEqual([]);
    expect(shown.landKeep).toEqual([{ text: "Keep 2 lands: the curve is low." }]);
    expect(docShownNew(OLD, shape3(), 2).winsBy.length).toBe(1);
  });
  it("runs every iteration-3 check through stagesChecks, and none of them for iteration 2", () => {
    const reply = shape3();
    const shown = docShownNew(OLD, reply, 3);
    const c3 = stagesChecks({ reply, shownNew: shown, oldDoc: docFromChecked(OLD), facts: FACTS, alternates: [], shape: 3, kind: "player deck" });
    expect(c3.landKeep?.pass).toBe(true);
    expect(c3.mulliganSpecific?.pass).toBe(false);
    expect(c3.mulliganSpecificToday?.pass).toBe(false);
    expect(c3.deckKind?.pass).toBe(true);
    expect(allChecksPass(c3, true)).toBe(false);
    const c2 = stagesChecks({ reply, shownNew: docShownNew(OLD, reply), oldDoc: docFromChecked(OLD), facts: FACTS, alternates: [] });
    expect(c2.landKeep).toBeUndefined();
    expect(c2.deckKind).toBeUndefined();
  });
});

describe("iteration 3: sections only a precon has", () => {
  it("marks the alternate line precon only and every other section for every deck", () => {
    const s = sectionsOf(docFromStagesReply({ ...goodReply(), alternate: { text: "Lead with [[Grave Titan]].", evidence: ["c4"] } }, 3));
    expect(s.filter((x) => x.scope === "precon only").map((x) => x.section)).toEqual(["alternate"]);
    expect(s.find((x) => x.section === "alternate")?.lines).toBe(1);
  });
  it("passes a player's deck with no precon-only section, and fails one showing it or talking about a box", () => {
    expect(checkDeckKind(docFromStagesReply(goodReply(), 3), "player deck").pass).toBe(true);
    const alt = docFromStagesReply({ ...goodReply(), alternate: { text: "Lead with [[Grave Titan]].", evidence: ["c4"] } }, 3);
    expect(checkDeckKind(alt, "player deck").offenders).toEqual(["shows the precon-only alternate section"]);
    expect(checkDeckKind(alt, "precon").pass).toBe(true);
    const box = edit((r) => { r.overview = "Straight out of the box, [[Meren of Clan Nel Toth]] grinds."; });
    expect(checkDeckKind(box, "player deck").offenders[0]).toMatch(/^overview\[0\] reads as a precon's/);
  });
});

describe("iteration 3: the prompt", () => {
  const land = landKeepNumber(withCurve([3, 4, 6, 5, 2]));
  const opts = (alternates: string[] = []) => ({ v2: true, contract8: true, stages: { alternates, maxChars: 1834, shape: 3 as const, landKeep: land } });
  it("drops Wins by, asks for the land line at the deck's number, deck-card mulligan lines, and Key cards the stages leave out", () => {
    const { system, user } = buildSynopsisPrompt(FACTS, undefined, opts());
    expect(system).not.toContain("Wins by");
    expect(system).toContain("The plans are never shown to the reader");
    expect(system).toContain("- landKeep: ONE { text, evidence }, at most 120 characters");
    expect(system).toContain("holds 4 lands (write the number as the digit 4, never a range)");
    expect(system).toContain("EVERY line names a card of this decklist as [[Name]]");
    expect(system).toContain("A Key card is NEVER a card that the overview, a stage line or the alternate line names");
    expect(system).toContain("EXACTLY 2 tips");
    expect(system).toContain("A tip names NO card that a stage line, a Key card (the card or its job) or the alternate line names");
    expect(system).toContain("the stage lines first, then the Key cards from the cards the stages leave out, then the tips");
    expect(system).toContain("named in ONE place only: the Close line, never also");
    expect(system).toContain("- alternate: leave it out.");
    expect(user).toContain("Keep-line land number");
    expect(user).toContain("- Lands in a keepable seven: 4");
    expect(user).toContain("- Why 4: top-heavy:");
    expect(user).not.toContain("Shown by the app, not to be restated");
  });
  it("asks for the alternate line only when the box carries one", () => {
    expect(buildSynopsisPrompt(FACTS, undefined, opts(["Grave Titan"])).system).toContain("- alternate: REQUIRED for this deck");
  });
  it("refuses iteration 3 without the land number", () => {
    expect(() => buildSynopsisPrompt(FACTS, undefined, { v2: true, contract8: true, stages: { alternates: [], shape: 3 } })).toThrow(/needs landKeep/);
  });
});

describe("iteration 3: the explained-once post-pass and the no-card-twice check", () => {
  // Mirrors CounterIntelligence_EOC (i3): Satyr Wayfinder stands for Hangarback Walker (a stage, then a
  // tip), Grave Titan for Kappa Cannoneer (a stage, then a Key card).
  const counterIntelligence = (): StagesReply => {
    const r = goodReply();
    r.landKeep = { text: "Keep 3 lands: the curve is low.", evidence: [] };
    r.primer.strategy = [
      { text: "Around turn 4, [[Meren of Clan Nel Toth]] lands while [[Satyr Wayfinder]] fills the yard.", evidence: ["c1", "c2"] },
      { text: "[[Viscera Seer]] turns each death into experience.", evidence: ["c3"] },
      { text: "[[Grave Titan]] closes while its tokens feed the engine.", evidence: ["c4"] },
    ];
    r.keyCards = [
      { card: "Grave Titan", claims: [], job: "Floods the board with bodies.", evidence: ["c4"] },
      { card: "Spore Frog", claims: [], job: "Fogs a big attack, then returns.", evidence: ["c6"] },
    ];
    r.primer.tips = [
      { text: "[[Eternal Witness]] returns [[Satyr Wayfinder]] to refill the yard.", evidence: ["c5", "c2"] },
      { text: "[[Eternal Witness]] returns a [[Forest]] when you are short of lands.", evidence: ["c5", "c7"] },
    ];
    return r;
  };
  // Mirrors ScrappySurvivors_PIP (i3): Spore Frog stands for Mantle of the Ancients (a Key card, then a tip).
  const scrappy = (): StagesReply => {
    const r = counterIntelligence();
    r.keyCards = [{ card: "Spore Frog", claims: [], job: "Fogs a big attack, then returns.", evidence: ["c6"] }];
    r.primer.tips = [
      { text: "[[Eternal Witness]] returns [[Spore Frog]] or a [[Forest]] after it is sacrificed.", evidence: ["c5", "c6", "c7"] },
      { text: "[[Eternal Witness]] returns a [[Forest]] when you are short of lands.", evidence: ["c5", "c7"] },
    ];
    return r;
  };

  it("fails a non-commander card in two sections, as both i3 failures did", () => {
    expect(checkNoCardTwice(docFromStagesReply(counterIntelligence(), 3), FACTS).offenders).toEqual([
      { card: "Satyr Wayfinder", sections: ["stages", "tips"] },
      { card: "Grave Titan", sections: ["stages", "keyCardJobs"] },
    ]);
    expect(checkNoCardTwice(docFromStagesReply(scrappy(), 3), FACTS).offenders).toEqual([{ card: "Spore Frog", sections: ["tips", "keyCardJobs"] }]);
  });
  it("never counts the commander, which checkExplainedOnce reports apart", () => {
    const d = docFromStagesReply(counterIntelligence(), 3);
    const twice = { ...d, overview: [{ text: "A deck led by [[Meren of Clan Nel Toth]]." }] };
    expect(checkNoCardTwice(twice, FACTS).offenders.some((o) => o.card === "Meren of Clan Nel Toth")).toBe(false);
    expect(checkExplainedOnce(twice, FACTS, { keyCardNames: true }).offenders.some((o) => o.card === "Meren of Clan Nel Toth")).toBe(true);
  });
  it("drops a Key card a stage explained, and leaves a tip that would mark one card as written, for a repair", () => {
    const { doc: out, report } = dedupeSections(docFromStagesReply(counterIntelligence(), 3), FACTS);
    expect(out.keyCards.map((k) => k.card)).toEqual(["Spore Frog"]);
    expect(out.tips).toHaveLength(2);
    // Unmarking Satyr Wayfinder would leave one marked card, under TIP_MIN_CARDS (tip_too_few_cards).
    expect(out.tips[0]).toEqual({ text: "[[Eternal Witness]] returns [[Satyr Wayfinder]] to refill the yard.", refs: ["c5", "c2"] });
    expect(report).toEqual({
      droppedKeyCards: [{ card: "Grave Titan", explainedIn: "stages" }],
      unmarked: [],
      tipsWithoutSubject: [{ tip: 0, text: "[[Eternal Witness]] returns [[Satyr Wayfinder]] to refill the yard.", cards: ["Eternal Witness", "Satyr Wayfinder"] }],
    });
    expect(checkNoCardTwice(out, FACTS)).toEqual({ pass: false, offenders: [{ card: "Satyr Wayfinder", sections: ["stages", "tips"] }] });
  });
  it("unmarks a stage card in a tip that still marks two cards, keeping the tip whole", () => {
    const r = counterIntelligence();
    r.primer.tips[0] = { text: "[[Eternal Witness]] returns [[Satyr Wayfinder]] or [[Spore Frog]].", evidence: ["c5", "c2", "c6"] };
    r.keyCards = [{ card: "Grave Titan", claims: [], job: "Floods the board with bodies.", evidence: ["c4"] }];
    const { doc: out, report } = dedupeSections(docFromStagesReply(r, 3), FACTS);
    expect(out.tips[0]).toEqual({ text: "[[Eternal Witness]] returns Satyr Wayfinder or [[Spore Frog]].", refs: ["c5", "c6"] });
    expect(report.unmarked).toEqual([{ where: "tips[0]", card: "Satyr Wayfinder", explainedIn: "stages" }]);
    expect(report.tipsWithoutSubject).toEqual([]);
    expect(checkNoCardTwice(out, FACTS)).toEqual({ pass: true, offenders: [] });
  });
  it("fails the shape when the post-pass leaves the Key cards under their minimum, and never refills them", () => {
    const r = counterIntelligence();
    r.primer.strategy = [
      { text: "Around turn 4, [[Meren of Clan Nel Toth]] lands and creatures start to die.", evidence: ["c1"] },
      { text: "Each death becomes experience, and a creature returns each end step.", evidence: [] },
      { text: "[[Grave Titan]] closes while its tokens feed the engine.", evidence: ["c4"] },
    ];
    r.keyCards = goodReply().keyCards; // exactly five, and only Grave Titan is one a stage explains
    r.primer.tips = [
      { text: "[[Meren of Clan Nel Toth]] returns a [[Forest]] creature land each turn.", evidence: ["c1", "c7"] },
      { text: "Sacrifice a [[Forest]] creature land with [[Meren of Clan Nel Toth]] out.", evidence: ["c7", "c1"] },
    ];
    const before = docFromStagesReply(r, 3);
    expect(checkShape(before, [], 3).offenders.some((o) => o.includes("Key cards"))).toBe(false);
    const { doc: out, report } = dedupeSections(before, FACTS);
    expect(out.keyCards).toHaveLength(4);
    expect(report.droppedKeyCards).toEqual([{ card: "Grave Titan", explainedIn: "stages" }]);
    expect(checkShape(out, [], 3)).toEqual({ pass: false, offenders: ["4 Key cards, not 5 to 8"] });
    const input = { reply: r, shownNew: docShownNew(OLD, r, 3), oldDoc: docFromChecked(OLD), facts: FACTS, alternates: [], shape: 3 as const, kind: "precon" as const, postPass: true };
    const checks = stagesChecks(input);
    expect(checks.shape.pass).toBe(false);
    expect(allChecksPass(checks, true)).toBe(false);
  });
  it("lets a Key card keep its card over a later tip", () => {
    const { doc: out, report } = dedupeSections(docFromStagesReply(scrappy(), 3), FACTS);
    expect(out.keyCards.map((k) => k.card)).toEqual(["Spore Frog"]);
    expect(out.tips[0].text).toBe("[[Eternal Witness]] returns Spore Frog or a [[Forest]] after it is sacrificed.");
    expect(report.unmarked).toEqual([{ where: "tips[0]", card: "Spore Frog", explainedIn: "keyCards" }]);
    expect(checkNoCardTwice(out, FACTS).pass).toBe(true);
  });
  it("leaves a tip that would lose its only subject as written, reports it, and still fails the check", () => {
    const r = counterIntelligence();
    r.primer.tips[0] = { text: "[[Satyr Wayfinder]] and [[Spore Frog]] loop through the yard.", evidence: ["c2", "c6"] };
    const { doc: out, report } = dedupeSections(docFromStagesReply(r, 3), FACTS);
    expect(out.tips[0].text).toBe("[[Satyr Wayfinder]] and [[Spore Frog]] loop through the yard.");
    expect(out.tips).toHaveLength(2);
    expect(report.tipsWithoutSubject).toEqual([{ tip: 0, text: "[[Satyr Wayfinder]] and [[Spore Frog]] loop through the yard.", cards: ["Satyr Wayfinder", "Spore Frog"] }]);
    expect(checkNoCardTwice(out, FACTS).pass).toBe(false);
  });
  it("never touches the commander, and leaves a clean reply as it was", () => {
    const r = counterIntelligence();
    r.keyCards = [{ card: "Spore Frog", claims: [], job: "Fogs a big attack, then returns.", evidence: ["c6"] }];
    r.primer.tips = [
      { text: "[[Meren of Clan Nel Toth]] returns [[Eternal Witness]] each end step.", evidence: ["c1", "c5"] },
      { text: "[[Eternal Witness]] returns a [[Forest]] when you are short of lands.", evidence: ["c5", "c7"] },
    ];
    const before = docFromStagesReply(r, 3);
    const { doc: out, report } = dedupeSections(before, FACTS);
    expect(out).toEqual(before);
    expect(report).toEqual({ droppedKeyCards: [], unmarked: [], tipsWithoutSubject: [] });
  });
  it("runs through stagesChecks only when the caller ran the post-pass on what it shows", () => {
    const reply = counterIntelligence();
    reply.primer.tips[0] = { text: "[[Eternal Witness]] returns [[Satyr Wayfinder]] or a [[Forest]].", evidence: ["c5", "c2", "c7"] };
    const input = { reply, shownNew: docShownNew(OLD, reply, 3), oldDoc: docFromChecked(OLD), facts: FACTS, alternates: [], shape: 3 as const, kind: "precon" as const };
    const raw = stagesChecks(input);
    expect(raw.noCardTwice?.pass).toBe(false);
    expect(raw.dedupe).toBeUndefined();
    expect(allChecksPass(raw, true)).toBe(false);
    const passed = stagesChecks({ ...input, postPass: true });
    expect(passed.noCardTwice?.pass).toBe(true);
    expect(passed.dedupe?.droppedKeyCards).toEqual([{ card: "Grave Titan", explainedIn: "stages" }]);
    expect(passed.explainedOnce.passExceptCommanders).toBe(true);
    // Iteration 2 never runs it.
    expect(stagesChecks({ ...input, shape: 2, postPass: true }).noCardTwice).toBeUndefined();
  });
});

describe("iteration 3: the alternate line is required by the schema when the box carries one", () => {
  const reply = () => ({ ...goodReply(), landKeep: { text: "Keep 3 lands: the curve is low.", evidence: [] } });
  it("rejects a reply with no alternate line for a precon with an alternate, as CounterIntelligence_EOC's was", () => {
    expect(stagesSchemaFor(3, ["Grave Titan"]).safeParse(reply()).success).toBe(false);
    expect(stagesSchemaFor(3, ["Grave Titan"]).safeParse({ ...reply(), alternate: { text: "Lead with [[Grave Titan]].", evidence: ["c4"] } }).success).toBe(true);
  });
  it("leaves the field optional with no alternate, and iteration 2's schema unchanged", () => {
    expect(stagesSchemaFor(3).safeParse(reply()).success).toBe(true);
    expect(stagesSchemaFor(3, [])).toBe(stagesResponseSchemaWireV3);
    expect(stagesSchemaFor(2, ["Grave Titan"])).toBe(stagesResponseSchemaWire);
  });
});
