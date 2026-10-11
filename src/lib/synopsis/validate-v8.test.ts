import { describe, expect, it } from "vitest";

import type { SynopsisFacts } from "./facts";
import type { SynopsisResponseV8 } from "./response-schema";
import { ASSESSMENT_TOPICS } from "./types";
import { checklistComplete, normalizeV8, validateSynopsisV8, weaknessLines } from "./validate-v8";

const card = (name: string, extra: Partial<SynopsisFacts["cards"][number]> = {}) => ({
  oracleId: `id-${name}`, name, typeLine: "Creature", quantity: 1, categories: [], oracleText: null, ...extra,
});

// c1 Kratos, c2 Sol Ring, c3 Rhystic Study, c4 Chaos Warp, c5 Goblin Bombardment, c6 Impact Tremors,
// c7 Shard of the Void Dragon, c8 Ayara, c9 Blasphemous Act
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
    card("Kratos", { categories: ["commander"], oracleText: "Haste" }),
    card("Sol Ring", { categories: ["ramp"] }),
    card("Rhystic Study", { categories: ["draw"] }),
    card("Chaos Warp", { categories: ["removal"] }),
    card("Goblin Bombardment", { oracleText: "Sacrifice a creature: Goblin Bombardment deals 1 damage to any target." }),
    card("Impact Tremors", { oracleText: "Whenever a creature enters the battlefield under your control, Impact Tremors deals 1 damage to each opponent." }),
    card("Shard of the Void Dragon", { oracleText: "Flying\nSpear of the Void Dragon — Whenever this creature attacks, each opponent sacrifices a nonland permanent of their choice.\nMatter Absorption — Whenever an artifact is put into a graveyard from the battlefield or is put into exile from the battlefield, put two +1/+1 counters on this creature." }),
    card("Ayara, First of Locthwain", { oracleText: "Whenever Ayara or another black creature you control enters, each opponent loses 1 life and you gain 1 life.\n{T}, Sacrifice another black creature: Draw a card." }),
    card("Blasphemous Act", { categories: ["wipes"] }),
  ],
};

const CATALOG = new Map([["rest in peace", { oracleId: "id-rip", name: "Rest in Peace" }]]);

type Assess = SynopsisResponseV8["assessment"][number];
const assessAll = (over: Partial<Record<(typeof ASSESSMENT_TOPICS)[number], Partial<Assess>>> = {}): Assess[] =>
  ASSESSMENT_TOPICS.map((topic) => ({ topic, verdict: "not_a_weakness" as const, evidence: [], ...over[topic] }));

function good(): SynopsisResponseV8 {
  return {
    plans: { primary: "Kratos turns every spell into damage.", backups: [] },
    overview: "[[Kratos]] turns every spell into damage, and [[Impact Tremors]] finishes the table.",
    primer: {
      strategy: [
        { text: "Play [[Sol Ring]] early.", evidence: ["c2"] },
        { text: "Land [[Impact Tremors]] before the big turn.", evidence: ["c6"] },
        { text: "Cast [[Blasphemous Act]] and swing.", evidence: ["c9"] },
      ],
      mulligan: {
        keep: [{ text: "A hand with [[Sol Ring]] gets you ahead early.", evidence: ["c2"] }],
        sendBack: [{ text: "A hand with no ramp falls behind the table.", evidence: [] }],
      },
      tips: [
        { text: "Sacrifice tokens to [[Goblin Bombardment]] after [[Impact Tremors]] triggers.", evidence: ["c5", "c6"] },
        { text: "Cast [[Chaos Warp]] with [[Kratos]] out to double the damage.", evidence: ["c4", "c1"] },
      ],
    },
    keyCards: [
      { card: "Kratos", claims: ["commander"], job: "Leads the deck.", evidence: ["c1"] },
      { card: "Sol Ring", claims: ["ramp"], job: "Ramps you a turn ahead.", evidence: ["c2"] },
      { card: "Rhystic Study", claims: ["draw"], job: "Draws you cards all game.", evidence: ["c3"] },
      { card: "Chaos Warp", claims: ["removal"], job: "Answers any permanent.", evidence: ["c4"] },
      { card: "Impact Tremors", claims: [], job: "Turns every creature into damage.", evidence: ["c6"] },
    ],
    assessment: assessAll({
      graveyard_or_zone_hate: { verdict: "weakness", tier: "critical", line: "[[Rest in Peace]] shuts off the recursion.", evidence: [] },
      interaction_speed: { verdict: "weakness", tier: "moderate", line: "Few cheap answers on the stack.", evidence: ["c4"] },
    }),
  };
}

const verdictOf = (r: ReturnType<typeof validateSynopsisV8>, s: string) => r.verdicts.find((v) => v.section === s)!;

describe("validateSynopsisV8", () => {
  it("passes a good reply, ranks the weaknesses and stores the evidence as oracle ids", () => {
    const r = validateSynopsisV8(good(), FACTS, CATALOG);
    expect(r.verdicts.map((v) => v.status)).toEqual(["ok", "ok", "ok", "ok"]);
    expect(r.weaknesses).toEqual(["Critical: [[Rest in Peace]] shuts off the recursion.", "Moderate: Few cheap answers on the stack."]);
    expect(r.evidence?.tips).toEqual([["id-Goblin Bombardment", "id-Impact Tremors"], ["id-Chaos Warp", "id-Kratos"]]);
    expect(r.evidence?.weaknesses).toEqual([[], ["id-Chaos Warp"]]);
    expect(r.evidence?.keep).toEqual([["id-Sol Ring"]]);
    expect(r.evidence?.sendBack).toEqual([[]]);
    expect(r.assessment).toHaveLength(ASSESSMENT_TOPICS.length);
    expect(r.cards["rest in peace"]?.name).toBe("Rest in Peace");
  });

  it("renders only weakness verdicts, critical first, and cuts past the maximum", () => {
    const reply = good();
    reply.assessment = assessAll({
      win_path: { verdict: "weakness", tier: "minor", line: "Only one real finisher." },
      interaction_speed: { verdict: "weakness", tier: "critical", line: "Few cheap answers on the stack." },
      commander_dependence: { verdict: "weakness", tier: "moderate", line: "Leans on [[Kratos]] to start." },
      combo_vulnerability: { verdict: "weakness", tier: "minor", line: "Removal in response breaks the turn." },
      mana_and_colors: { verdict: "unknown" },
    });
    const r = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(r.weaknesses).toEqual([
      "Critical: Few cheap answers on the stack.",
      "Moderate: Leans on [[Kratos]] to start.",
      "Minor: Only one real finisher.",
    ]);
  });

  it("refuses the Weaknesses when the checklist misses a topic or repeats one", () => {
    const missing = good();
    missing.assessment = missing.assessment.slice(1);
    expect(checklistComplete(missing)).toBe(false);
    expect(verdictOf(validateSynopsisV8(missing, FACTS, CATALOG), "weaknesses")).toMatchObject({ status: "refused", reason: "checklist_incomplete" });
    expect(validateSynopsisV8(missing, FACTS, CATALOG).weaknesses).toBeNull();

    const repeated = good();
    repeated.assessment = [...repeated.assessment.slice(1), repeated.assessment[1]!];
    expect(verdictOf(validateSynopsisV8(repeated, FACTS, CATALOG), "weaknesses")).toMatchObject({ reason: "checklist_incomplete" });
  });

  it("refuses the Weaknesses when a weakness verdict has no tier or no line, naming the checklist", () => {
    const reply = good();
    reply.assessment = assessAll({ win_path: { verdict: "weakness", line: "No tier given." }, mana_and_colors: { verdict: "weakness", tier: "minor" } });
    expect(checklistComplete(reply)).toBe(false);
    expect(verdictOf(validateSynopsisV8(reply, FACTS, CATALOG), "weaknesses")).toMatchObject({ status: "refused", reason: "checklist_incomplete" });
  });

  it("refuses the Weaknesses when nothing is a weakness", () => {
    const reply = good();
    reply.assessment = assessAll();
    expect(weaknessLines(reply)).toEqual([]);
    expect(verdictOf(validateSynopsisV8(reply, FACTS, CATALOG), "weaknesses")).toMatchObject({ status: "refused", reason: "wrong_count" });
  });

  it("stores a surviving line's own evidence when an equal line before it was dropped", () => {
    const reply = good();
    reply.primer.mulligan.keep = [
      { text: "A hand with [[Sol Ring]] gets you ahead early.", evidence: ["c99"] },
      { text: "A hand with [[Sol Ring]] gets you ahead early.", evidence: ["c2"] },
    ];
    const r = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(r.primer?.mulligan.keep).toHaveLength(1);
    expect(r.evidence?.keep).toEqual([["id-Sol Ring"]]);
  });

  it("drops the mono-color color-flexibility weakness and keeps the rest (the Imotekh sentence)", () => {
    const reply = good();
    reply.assessment = assessAll({
      mana_and_colors: { verdict: "weakness", tier: "critical", line: "Mana base is entirely Swamps and black-only rocks, limiting color flexibility." },
      interaction_speed: { verdict: "weakness", tier: "moderate", line: "Few cheap answers on the stack." },
    });
    const r = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(r.weaknesses).toEqual(["Moderate: Few cheap answers on the stack."]);
    expect(r.evidence?.weaknesses).toEqual([[]]);

    reply.assessment = assessAll({ mana_and_colors: { verdict: "weakness", tier: "critical", line: "Mana base is entirely Swamps, limiting color flexibility." } });
    expect(verdictOf(validateSynopsisV8(reply, FACTS, CATALOG), "weaknesses")).toMatchObject({ status: "refused", reason: "non_weakness" });
  });

  it("applies the color guard to the mana_and_colors topic only", () => {
    const reply = good();
    reply.assessment = assessAll({ interaction_speed: { verdict: "weakness", tier: "moderate", line: "Little fixing for cheap answers on the stack." } });
    expect(validateSynopsisV8(reply, FACTS, CATALOG).weaknesses).toEqual(["Moderate: Little fixing for cheap answers on the stack."]);
  });

  it("drops a tip with no evidence or an unknown ref, and keeps the evidence aligned with what survives", () => {
    const reply = good();
    reply.primer.tips = [
      { text: "Sacrifice tokens to [[Goblin Bombardment]] after [[Impact Tremors]] triggers.", evidence: ["c5", "c99"] },
      { text: "Cast [[Chaos Warp]] with [[Kratos]] out to double the damage.", evidence: ["c4", "c1"] },
      { text: "Pair [[Sol Ring]] with [[Rhystic Study]] for a fast start.", evidence: ["c2", "c3"] },
    ];
    const r = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(verdictOf(r, "primer").status).toBe("ok");
    expect(r.primer?.tips.map((t) => t.cards)).toEqual([["Chaos Warp", "Kratos"], ["Sol Ring", "Rhystic Study"]]);
    expect(r.evidence?.tips).toEqual([["id-Chaos Warp", "id-Kratos"], ["id-Sol Ring", "id-Rhystic Study"]]);

    reply.primer.tips = [{ text: "Cast [[Chaos Warp]] with [[Kratos]] out.", evidence: [] }, reply.primer.tips[1]!];
    expect(verdictOf(validateSynopsisV8(reply, FACTS, CATALOG), "primer")).toMatchObject({ status: "refused", reason: "evidence_not_in_deck" });
  });

  it("requires a tip's evidence to be the cards its prose marks", () => {
    const reply = good();
    reply.primer.tips[0] = { text: "Sacrifice tokens to [[Goblin Bombardment]] after [[Impact Tremors]] triggers.", evidence: ["c5", "c2"] };
    reply.primer.tips.push({ text: "Pair [[Sol Ring]] with [[Rhystic Study]] for a fast start.", evidence: ["c2", "c3"] });
    const r = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(r.primer?.tips.map((t) => t.cards)).toEqual([["Chaos Warp", "Kratos"], ["Sol Ring", "Rhystic Study"]]);
  });

  it("drops a Key card with no evidence, a keyword it lacks, and the edict-as-entry tip", () => {
    const reply = good();
    reply.keyCards.push({ card: "Blasphemous Act", claims: ["wipes"], job: "Resets a lost board.", evidence: ["c9"] });
    reply.keyCards[1] = { card: "Sol Ring", claims: ["ramp"], job: "Ramps you a turn ahead.", evidence: [] };
    const kept = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(kept.keyCards?.map((k) => k.card)).toEqual(["Kratos", "Rhystic Study", "Chaos Warp", "Impact Tremors", "Blasphemous Act"]);
    expect(kept.evidence?.keyCards).toEqual([["id-Kratos"], ["id-Rhystic Study"], ["id-Chaos Warp"], ["id-Impact Tremors"], ["id-Blasphemous Act"]]);

    const keyword = good();
    keyword.primer.strategy[1] = { text: "Attack with [[Impact Tremors]] to cascade into the finish.", evidence: ["c6"] };
    expect(verdictOf(validateSynopsisV8(keyword, FACTS, CATALOG), "primer")).toMatchObject({ status: "refused", reason: "keyword_not_on_card" });

    const edict = good();
    edict.primer.tips.push({
      text: "Black creatures entering from [[Shard of the Void Dragon]]'s forced sacrifices still trigger [[Ayara, First of Locthwain]]'s drain.",
      evidence: ["c7", "c8"],
    });
    const r = validateSynopsisV8(edict, FACTS, CATALOG);
    expect(r.primer?.tips).toHaveLength(2);
    expect(r.evidence?.tips).toHaveLength(2);
  });

  it("drops a Key card whose evidence omits the card itself", () => {
    const reply = good();
    reply.keyCards.push({ card: "Blasphemous Act", claims: ["wipes"], job: "Resets a lost board.", evidence: ["c9"] });
    reply.keyCards[1] = { card: "Sol Ring", claims: ["ramp"], job: "Ramps you a turn ahead.", evidence: ["c3"] };
    expect(validateSynopsisV8(reply, FACTS, CATALOG).keyCards?.map((k) => k.card)).not.toContain("Sol Ring");
  });

  it("resolves marks only for the weaknesses that render, not the candidates cut past the maximum", () => {
    const reply = good();
    reply.assessment = assessAll({
      win_path: { verdict: "weakness", tier: "critical", line: "Only one finisher." },
      interaction_speed: { verdict: "weakness", tier: "critical", line: "Few cheap answers on the stack." },
      commander_dependence: { verdict: "weakness", tier: "moderate", line: "Leans on [[Kratos]] to start." },
      graveyard_or_zone_hate: { verdict: "weakness", tier: "minor", line: "[[Rest in Peace]] shuts off the recursion." },
    });
    const r = validateSynopsisV8(reply, FACTS, CATALOG);
    expect(r.weaknesses).toHaveLength(3);
    expect(r.cards["rest in peace"]).toBeUndefined();
  });

  it("refuses an overview that gives a card a keyword it lacks, and passes one it has", () => {
    const bad = good();
    bad.overview = "Attack with [[Impact Tremors]] to cascade into the finish, with [[Kratos]] close behind.";
    expect(verdictOf(validateSynopsisV8(bad, FACTS, CATALOG), "overview")).toMatchObject({ reason: "keyword_not_on_card" });
    const ok = good();
    ok.overview = "[[Kratos]] has haste and swings first, so [[Impact Tremors]] finishes the table.";
    expect(verdictOf(validateSynopsisV8(ok, FACTS, CATALOG), "overview").status).toBe("ok");
  });

  it("still runs every contract-7 rule on a v8 line", () => {
    const reply = good();
    reply.primer.mulligan.keep[0] = { text: "A hand with [[Sol Ring]] and 3 lands gets you ahead.", evidence: ["c2"] };
    expect(verdictOf(validateSynopsisV8(reply, FACTS, CATALOG), "primer")).toMatchObject({ status: "refused" });
  });
});

describe("normalizeV8: the closed words off the wire", () => {
  const entry = (topic: string, verdict: string, tier?: string) => ({ topic, verdict, ...(tier === undefined ? {} : { tier }), line: "A line.", evidence: [] as string[] });
  const wire = (assessment: ReturnType<typeof entry>[]) => ({ plans: { primary: "", backups: [] }, overview: "", primer: { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] }, keyCards: [], assessment });

  it("folds case, spaces and hyphens", () => {
    const [a] = normalizeV8(wire([entry("Win Path", "Not-A-Weakness", "Critical")])).assessment;
    expect(a).toMatchObject({ topic: "win_path", verdict: "not_a_weakness", tier: "critical" });
  });

  it("turns a stray verdict into unknown, which renders nothing, instead of refusing the answer", () => {
    const out = normalizeV8(wire(ASSESSMENT_TOPICS.map((t, i) => entry(t, i === 0 ? "n/a" : "unknown"))));
    expect(out.assessment[0]!.verdict).toBe("unknown");
    expect(checklistComplete(out)).toBe(true);
    expect(weaknessLines(out)).toEqual([]);
  });

  it("drops an unreadable tier, which leaves a weakness without one and the checklist incomplete", () => {
    const out = normalizeV8(wire(ASSESSMENT_TOPICS.map((t, i) => entry(t, i === 0 ? "weakness" : "unknown", i === 0 ? "severe" : undefined))));
    expect(out.assessment[0]).not.toHaveProperty("tier");
    expect(checklistComplete(out)).toBe(false);
  });

  it("keeps an unknown topic as written, so the every-topic-once rule catches it", () => {
    const out = normalizeV8(wire(ASSESSMENT_TOPICS.map((t, i) => entry(i === 0 ? "vibes" : t, "unknown"))));
    expect(checklistComplete(out)).toBe(false);
  });
});
