import type { CheckedSynopsis, SectionVerdict } from "../../../src/lib/synopsis/types";
import { loadCorpus, scoreCase, type CorpusCase, type Reply, type Score } from "./corpus.mjs";

/**
 * The Overview accuracy GATE (plan 2026-10-10-overview-accuracy.md, 7 and 11): does contract 8 render
 * as much as contract 7 does, once the one repair a reader's write gets has run, and is it more
 * accurate for it. Everything here is pure over stored answer rows, so `pnpm eval:corpus gate` costs
 * nothing and a number in a report can be reproduced from the committed files.
 *
 * WHAT IS SCORED IS WHAT RENDERS. A row stores the first write's verdicts and the checked content
 * AFTER the repair (`rendered`, merged by the app's own `applyRepair`). A section the repair did not
 * fix is empty here as it is empty on the page, so a refusal costs recall instead of vanishing from
 * the denominator. A row without `rendered` (the raw answers of the first baseline) cannot be gated
 * and is refused, not scored as if it had been repaired.
 */

export type GateRow = {
  id: string;
  prompt?: string;
  usd?: number;
  repairUsd?: number;
  /** The first write's verdicts, before the repair. */
  firstVerdicts?: SectionVerdict[];
  /** The content a reader is shown: the first write with the repair merged in. */
  rendered?: CheckedSynopsis;
};

/** The scorer's reply, from what the app renders: a refused section is empty, as it is on the page. */
export function fromChecked(c: CheckedSynopsis): Reply {
  return {
    overview: c.overview ?? "",
    primer: c.primer ?? { strategy: [], mulligan: { keep: [], sendBack: [] }, tips: [] },
    keyCards: (c.keyCards ?? []).map((k) => ({ card: k.card, claims: k.claims, job: k.job })),
    weaknesses: c.weaknesses ?? [],
  };
}

export type ArmStats = {
  label: string;
  answers: number;
  sections: number;
  /** Sections that passed the first write. */
  firstOk: number;
  /** Sections that render after the repair. */
  finalOk: number;
  /** Answers whose four sections all render (the credit rule's `survived`). */
  allFour: number;
  repaired: number;
  /** Refusals left after the repair, by reason. */
  leftBy: Record<string, number>;
  /** First-write refusals, by reason. */
  firstBy: Record<string, number>;
  usd: number;
  combos: { named: number; gold: number };
  keyCards: { named: number; gold: number };
  weaknesses: { covered: number; gold: number };
  mulligan: { tied: number; applicable: number };
  wrong: number;
  wrongIds: string[];
  /** One line per answer for the spread across samples. */
  perAnswer: { id: string; sample: number; rendered: number; combos: string; keyCards: string; weaknesses: string; mulligan: string; wrong: number }[];
};

const bump = (m: Record<string, number>, k: string) => { m[k] = (m[k] ?? 0) + 1; };

/** `samples` is one list of rows per sample file; every row must carry `rendered` and `firstVerdicts`. */
export function armStats(label: string, samples: GateRow[][], cases: CorpusCase[], pinned = true): ArmStats {
  const s: ArmStats = {
    label, answers: 0, sections: 0, firstOk: 0, finalOk: 0, allFour: 0, repaired: 0, leftBy: {}, firstBy: {}, usd: 0,
    combos: { named: 0, gold: 0 }, keyCards: { named: 0, gold: 0 }, weaknesses: { covered: 0, gold: 0 }, mulligan: { tied: 0, applicable: 0 },
    wrong: 0, wrongIds: [], perAnswer: [],
  };
  samples.forEach((rows, sample) => {
    for (const r of rows) {
      if (!r.rendered || !r.firstVerdicts) throw new Error(`gate: ${r.id} (sample ${sample + 1}) has no rendered content and first-write verdicts; it was recorded before the repair path existed and cannot be gated`);
      const c = cases.find((x) => x.id === r.id);
      if (!c) throw new Error(`gate: no corpus case ${r.id}`);
      if (pinned && c.deck.listFingerprint === null) continue;
      s.answers += 1;
      s.usd += (r.usd ?? 0) + (r.repairUsd ?? 0);
      const final = r.rendered.verdicts;
      s.sections += final.length;
      s.firstOk += r.firstVerdicts.filter((v) => v.status === "ok").length;
      s.finalOk += final.filter((v) => v.status === "ok").length;
      if (final.every((v) => v.status === "ok")) s.allFour += 1;
      if (r.repairUsd !== undefined) s.repaired += 1;
      for (const v of r.firstVerdicts) if (v.status === "refused") bump(s.firstBy, `${v.section}:${v.reason}`);
      for (const v of final) if (v.status === "refused") bump(s.leftBy, `${v.section}:${v.reason}`);
      const sc: Score = scoreCase(c, fromChecked(r.rendered));
      s.combos.named += sc.combos.named; s.combos.gold += sc.combos.gold;
      s.keyCards.named += sc.keyCards.named; s.keyCards.gold += sc.keyCards.gold;
      s.weaknesses.covered += sc.weaknesses.covered; s.weaknesses.gold += sc.weaknesses.gold;
      if (sc.mulliganTied !== null) { s.mulligan.applicable += 1; if (sc.mulliganTied) s.mulligan.tied += 1; }
      s.wrong += sc.claims.wrong;
      s.wrongIds.push(...sc.wrongIds);
      s.perAnswer.push({
        id: r.id, sample: sample + 1, rendered: final.filter((v) => v.status === "ok").length,
        combos: `${sc.combos.named}/${sc.combos.gold}`, keyCards: `${sc.keyCards.named}/${sc.keyCards.gold}`, weaknesses: `${sc.weaknesses.covered}/${sc.weaknesses.gold}`,
        mulligan: sc.mulliganTied === null ? "n/a" : sc.mulliganTied ? "yes" : "no", wrong: sc.claims.wrong,
      });
    }
  });
  return s;
}

/** An absolute floor under the rendered rate, whatever contract 7 happened to score on this run. */
export const RENDERED_FLOOR = 0.9;
/** Contract 7's rate in production WITH repair (plan 1, measured on the stored synopsis rows). */
export const PRODUCTION_V7_RATE = 0.96;

export type Check = { name: string; pass: boolean; detail: string };

const rate = (n: number, d: number) => (d === 0 ? 0 : n / d);
const pc = (n: number, d: number) => (d === 0 ? "n/a" : `${(100 * n / d).toFixed(1)}%`);

/**
 * The gate: B (contract 8) against A (contract 7) on the same decks, both after repair.
 * It passes when B renders no less than A (give or take one section in 32), clears the floor, claims
 * nothing the corpus lists as wrong that A did not, and no recall headline sits below A's.
 * Pooled counts over few answers are noisy; the per-answer spread printed beside them is how to read a pass.
 */
export function gateChecks(a: ArmStats, b: ArmStats): Check[] {
  const ra = rate(a.finalOk, a.sections);
  const rb = rate(b.finalOk, b.sections);
  const below = (name: string, x: { named?: number; covered?: number; tied?: number }, xd: number, y: { named?: number; covered?: number; tied?: number }, yd: number): Check => {
    const xv = x.named ?? x.covered ?? x.tied ?? 0, yv = y.named ?? y.covered ?? y.tied ?? 0;
    // Compared as rates, because a mulligan has a different denominator when a deck's gold lists none.
    return { name: `${name} no lower than contract 7`, pass: rate(yv, yd) >= rate(xv, xd), detail: `${a.label} ${xv}/${xd}, ${b.label} ${yv}/${yd}` };
  };
  return [
    { name: "rendered after repair within one section in 32 of contract 7", pass: rb >= ra - 1 / 32, detail: `${a.label} ${pc(a.finalOk, a.sections)}, ${b.label} ${pc(b.finalOk, b.sections)} (production contract 7: ${(PRODUCTION_V7_RATE * 100).toFixed(0)}%)` },
    { name: `rendered after repair at least ${RENDERED_FLOOR * 100}%`, pass: rb >= RENDERED_FLOOR, detail: pc(b.finalOk, b.sections) },
    { name: "wrong claims no more than contract 7", pass: b.wrong <= a.wrong, detail: `${a.label} ${a.wrong}, ${b.label} ${b.wrong}` },
    below("combo recall", a.combos, a.combos.gold, b.combos, b.combos.gold),
    below("key-card recall", a.keyCards, a.keyCards.gold, b.keyCards, b.keyCards.gold),
    below("weakness recall", a.weaknesses, a.weaknesses.gold, b.weaknesses, b.weaknesses.gold),
    below("engine-tied mulligans", a.mulligan, a.mulligan.applicable, b.mulligan, b.mulligan.applicable),
  ];
}

const reasons = (m: Record<string, number>) => Object.entries(m).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${k} x${n}`).join(", ") || "none";

export function renderGate(arms: ArmStats[], checks: Check[], samples: number): string {
  const row = (s: ArmStats) => `| ${s.label} | ${s.answers} | ${pc(s.firstOk, s.sections)} (${s.firstOk}/${s.sections}) | **${pc(s.finalOk, s.sections)}** (${s.finalOk}/${s.sections}) | ${s.allFour}/${s.answers} | ${s.combos.named}/${s.combos.gold} | ${s.keyCards.named}/${s.keyCards.gold} | ${s.weaknesses.covered}/${s.weaknesses.gold} | ${s.mulligan.tied}/${s.mulligan.applicable} | ${s.wrong} | $${s.usd.toFixed(3)} |`;
  const lines = [
    "# Overview accuracy: the gate", "",
    `Generated by \`pnpm eval:corpus gate\`. ${samples} sample(s) per deck on the staging corpus decks, every answer taken through the app's own one repair (\`repairPrompt\`, \`applyRepair\`) and scored on what RENDERS: a section that stays refused is empty, so it costs recall. Counts are pooled over answers; the per-answer table shows the spread, because a single answer per deck moves by itself.`, "",
    "| arm | answers | sections rendered, first write | sections rendered, after repair | all four render | combo recall | key cards | weaknesses | engine-tied mulligans | wrong claims | spend |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
    ...arms.map(row), "",
    ...arms.map((s) => `- **${s.label}** refusals on the first write: ${reasons(s.firstBy)}. Left after repair: ${reasons(s.leftBy)}.`), "",
    "## Checks", "",
    ...checks.map((c) => `- ${c.pass ? "PASS" : "FAIL"}: ${c.name} (${c.detail})`), "",
    `**Gate: ${checks.every((c) => c.pass) ? "PASS" : "FAIL"}.**`, "",
    "## Per answer", "",
    "| arm | deck | sample | sections rendered | combos | key cards | weaknesses | mulligan tied | wrong |",
    "|---|---|---|---|---|---|---|---|---|",
    ...arms.flatMap((s) => s.perAnswer.map((p) => `| ${s.label} | ${p.id} | ${p.sample} | ${p.rendered}/4 | ${p.combos} | ${p.keyCards} | ${p.weaknesses} | ${p.mulligan} | ${p.wrong} |`)),
  ];
  return `${lines.join("\n")}\n`;
}

export { loadCorpus };
