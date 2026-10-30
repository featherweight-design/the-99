import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import { SYNOPSIS_CONTRACT_VERSION_STAGES } from "./limits";
import { stagesSchemaFor, landKeepNumber, type StagesReply } from "./stages";
import { applyStagesShape, repairNote, settleStages, stagesPromptOption, stagesRepairTargets } from "./stages-run";
import { stubReply } from "./stub";
import { validateSynopsisV8 } from "./validate-v8";

// Contract 13's pure rules (`stages-run.ts`): each is shown holding on a reply built to pass, then
// broken one way and shown failing, so a rule that always answers clean cannot hide here.

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
    { oracleId: "t", name: "Sakura-Tribe Elder", typeLine: "Creature", quantity: 1, categories: [], oracleText: "Sacrifice: search for a basic land.", manaValue: 2 },
    { oracleId: "l", name: "Sylvan Library", typeLine: "Enchantment", quantity: 1, categories: [], oracleText: "Draw a card at your draw step.", manaValue: 2 },
  ],
  stats: { ramp: 10, commanderCastTurn: 4, interaction: { total: 8, instantSpeed: 3, cheap: 4, cheapInstant: 2, wipes: 1 } },
};
// Refs follow the cards' order: c1 Meren, c2 Satyr, c3 Seer, c4 Titan, c5 Witness, c6 Frog, c7 Forest, c8 Sakura-Tribe Elder, c9 Sylvan Library.

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

const CATALOG = new Map([["rest in peace", { oracleId: "rip", name: "Rest in Peace" }]]);
const LAND = landKeepNumber(FACTS).lands;
const landLine = (text: string, evidence: string[] = []) => ({ text, evidence });

function reply(f: (r: StagesReply) => void = () => undefined): StagesReply {
  const r = { ...goodReply(), landKeep: landLine(`Keep ${LAND} lands: the curve is middling.`, ["c7"]) };
  f(r);
  return r;
}
const checked = (r: StagesReply) => validateSynopsisV8(r, FACTS, CATALOG);
const status = (c: ReturnType<typeof checked>, section: string) => c.verdicts.find((v) => v.section === section);

describe("the land line", () => {
  it("is stored with its evidence when it states the deck's number with a reason", () => {
    const r = reply();
    const c = applyStagesShape(checked(r), r, FACTS);
    expect(c.landKeep).toBe(`Keep ${LAND} lands: the curve is middling.`);
    expect(c.evidence?.landKeep).toEqual(["f"]);
    expect(c.alternate).toBeUndefined();
  });

  it("is left out, and the row keeps the fixed range, when it states another number", () => {
    const r = reply((x) => { x.landKeep = landLine(`Keep ${LAND + 1} lands: the curve is middling.`); });
    const c = applyStagesShape(checked(r), r, FACTS);
    expect(c.landKeep).toBeUndefined();
    expect(c.evidence?.landKeep).toBeUndefined();
  });

  it("is left out when it cites a ref the deck does not have, or marks a card it does not hold", () => {
    const badRef = reply((x) => { x.landKeep = landLine(`Keep ${LAND} lands: the curve is middling.`, ["c99"]); });
    expect(applyStagesShape(checked(badRef), badRef, FACTS).landKeep).toBeUndefined();
    const badMark = reply((x) => { x.landKeep = landLine(`Keep ${LAND} lands, or [[Sol Ring]]: the curve is middling.`); });
    expect(applyStagesShape(checked(badMark), badMark, FACTS).landKeep).toBeUndefined();
  });
});

describe("the alternate line (a precon's)", () => {
  const ALTS = ["Spore Frog"];
  const alt = (text: string, evidence: string[] = ["c6"]) => ({ text, evidence });
  const withAlt = (a: { text: string; evidence: string[] } | undefined) => reply((x) => { if (a) x.alternate = a; });

  it("is stored with its marked cards and evidence when the box has alternates and the line names one", () => {
    const r = withAlt(alt("Lead with [[Spore Frog]] and the plan turns to fogging."));
    const c = applyStagesShape(checked(r), r, FACTS, ALTS);
    expect(c.alternate).toBe("Lead with [[Spore Frog]] and the plan turns to fogging.");
    expect(c.evidence?.alternate).toEqual(["k"]);
    expect(c.cards["spore frog"]).toEqual({ oracleId: "k", name: "Spore Frog" });
    expect(c.landKeep).toBeDefined();
  });

  it("is left out when it names none of the alternates, marks a card the deck lacks, or cites a bad ref", () => {
    const wrong = withAlt(alt("Lead with [[Viscera Seer]] instead."));
    expect(applyStagesShape(checked(wrong), wrong, FACTS, ALTS).alternate).toBeUndefined();
    const absent = withAlt(alt("Lead with [[Spore Frog]] or [[Sol Ring]] instead."));
    expect(applyStagesShape(checked(absent), absent, FACTS, ALTS).alternate).toBeUndefined();
    const badRef = withAlt(alt("Lead with [[Spore Frog]] instead.", ["c99"]));
    expect(applyStagesShape(checked(badRef), badRef, FACTS, ALTS).alternate).toBeUndefined();
  });

  it("is never stored for a deck whose box has no alternates, whatever the reply carries", () => {
    const r = withAlt(alt("Lead with [[Spore Frog]] instead."));
    expect(applyStagesShape(checked(r), r, FACTS).alternate).toBeUndefined();
    expect(applyStagesShape(checked(r), r, FACTS, []).alternate).toBeUndefined();
  });

  it("reaches the prompt option and the repair targets only for a precon", () => {
    expect(stagesPromptOption(FACTS).alternates).toEqual([]);
    expect(stagesPromptOption(FACTS, ALTS).alternates).toEqual(ALTS);
    const r = withAlt(undefined);
    const forPlayer = stagesRepairTargets(checked(r), r, FACTS);
    const forPrecon = stagesRepairTargets(checked(r), r, FACTS, { alternates: ALTS });
    expect(forPlayer.reasons.join(" ")).not.toMatch(/alternate/);
    expect(forPrecon.sections).toEqual(expect.any(Array));
  });
});

describe("the Primer's counts", () => {
  it("refuses the Primer with wrong_count unless it has three stage lines and two tips", () => {
    const four = reply((x) => { x.primer.strategy.push({ text: "Win with [[Grave Titan]].", evidence: ["c4"] }); });
    const c = applyStagesShape(checked(four), four, FACTS);
    expect(status(c, "primer")).toMatchObject({ status: "refused", reason: "wrong_count" });
    expect(c.primer).toBeNull();
    expect(c.evidence?.strategy).toEqual([]);
    const ok = reply();
    expect(status(applyStagesShape(checked(ok), ok, FACTS), "primer")?.status).toBe("ok");
  });
});

describe("the explained-once pass on what is stored", () => {
  // goodReply names Satyr Wayfinder, Viscera Seer and Spore Frog in the stages AND as Key cards.
  it("drops the Key cards a stage explains and refuses the section left under its minimum", () => {
    const r = reply();
    const c = applyStagesShape(checked(r), r, FACTS);
    expect(c.keyCards).toHaveLength(5);
    const settled = settleStages(c, FACTS);
    expect(settled.keyCards).toBeNull();
    expect(status(settled, "keyCards")).toMatchObject({ status: "refused", reason: "wrong_count" });
    expect(settled.evidence?.keyCards).toEqual([]);
    // Everything else is untouched.
    expect(settled.primer).toEqual(c.primer);
    expect(settled.landKeep).toBe(c.landKeep);
  });

  it("targets the Key cards for the one repair, with the reason", () => {
    const r = reply();
    const c = applyStagesShape(checked(r), r, FACTS);
    const t = stagesRepairTargets(c, r, FACTS);
    expect(t.sections).toContain("keyCards");
    expect(t.reasons.length).toBeGreaterThan(0);
    expect(repairNote(t.reasons)).toContain("each card is explained in one section only");
  });

  it("leaves a kept Key cards section alone when only the Primer was retried", () => {
    const r = reply();
    const c = applyStagesShape(checked(r), r, FACTS);
    const settled = settleStages(c, FACTS, ["primer"]);
    expect(settled.keyCards).toEqual(c.keyCards);
    expect(status(settled, "keyCards")).toEqual(status(c, "keyCards"));
  });

  it("drops the mark, the listed card and the evidence of a tip card a stage already explains", () => {
    const r = reply((x) => {
      x.primer.tips[0] = { text: "[[Satyr Wayfinder]] pairs with [[Sakura-Tribe Elder]] and [[Sylvan Library]] to smooth every draw.", evidence: ["c2", "c8", "c9"] };
    });
    const c = applyStagesShape(checked(r), r, FACTS);
    expect(c.primer?.tips[0].cards).toContain("Satyr Wayfinder");
    expect(c.evidence?.tips[0]).toContain("s");
    const settled = settleStages(c, FACTS);
    expect(settled.primer?.tips[0].text).not.toContain("[[Satyr Wayfinder]]");
    expect(settled.primer?.tips[0].cards).not.toContain("Satyr Wayfinder");
    expect(settled.evidence?.tips[0]).not.toContain("s");
    expect(settled.evidence?.tips[0]).toEqual(["t", "l"]);
  });

  it("is idempotent, so a section retry can run it over sections it kept", () => {
    const r = reply();
    const once = settleStages(applyStagesShape(checked(r), r, FACTS), FACTS);
    expect(settleStages(once, FACTS)).toEqual(once);
  });
});

describe("the prompt option and the stub", () => {
  it("is the iteration-3 shape with no alternates and the deck's own land number", () => {
    expect(stagesPromptOption(FACTS)).toMatchObject({ alternates: [], shape: 3, landKeep: { lands: LAND } });
  });

  it("writes a contract-13 reply that fits the schema and passes the contract-8 validator", () => {
    const out = stubReply(FACTS, "survived", false, true, true);
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(stagesSchemaFor(3, []).safeParse(out.value).success).toBe(true);
    expect((out.value as StagesReply).landKeep?.text).toContain(`${LAND} lands`);
    expect(SYNOPSIS_CONTRACT_VERSION_STAGES).toBe(13);
  });
});
