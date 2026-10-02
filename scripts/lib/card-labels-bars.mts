// THE GATE the re-sample is held to before any full run (the vocabulary plan's Task 4; Hugh, 2026-09-28).
//
// An aggregate precision hides exactly the new jobs the vocabulary was widened for, so every job and every
// consumer-read field value carries its OWN bar, and any one under it stops the run: the prompt goes back
// for that job before anything is spent on the catalog.
//
//   - `tutor` >= 0.9 on precision AND recall: its errors reach past stand-ins, into bracket reach.
//   - every other job >= 0.8.
//   - `affects` >= 0.9 per value: the only field that silently DISQUALIFIES an honest stand-in when wrong,
//     so it is held to the strictest bar ruled. `to` and `method` >= 0.8 per value.
//
// A job or value with NO gold cases fails as unmeasured. A bar nothing can be scored against would pass by
// being unmeasurable, which is the one way a bar is worse than no bar.
import { AFFECTS, DESTINATIONS, METHODS, RAMP_KINDS, ROLES, THEMES } from "../../src/lib/labels/types.js";

export type Tally = { tp: number; fp: number; fn: number };

export const JOB_BAR = 0.8;
export const TUTOR_BAR = 0.9;
// `rampKind` is matching's gate 1 (a ramp job is kept only in its own kind), so it is barred like the
// other consumer-read fields; at 0.8, the bar every job but tutor carries.
export const FIELD_BARS = { affects: 0.9, to: 0.8, method: 0.8, rampKind: 0.8 } as const;
export type Field = keyof typeof FIELD_BARS;

/** Every job the vocabulary names, by the scorer's key (`space:kind`). */
export const VOCABULARY_KEYS: readonly string[] = [...ROLES.map((r) => `role:${r}`), ...THEMES.map((t) => `theme:${t}`)];
/**
 * Every value of each consumer-read field that the gold set answers, `null` scored as the value "none".
 * A null `affects` (a job pointing at no player) and a null ramp kind ("no kind fits") have no bar: under
 * the prompt's by-job rule the gold set never answers either, and a bar with no cases stops every run. A
 * model's stray null is still charged, as a miss against the gold value.
 */
export const FIELD_VALUES: Record<Field, readonly string[]> = {
  affects: AFFECTS, to: [...DESTINATIONS, "none"], method: [...METHODS, "none"], rampKind: RAMP_KINDS,
};

export type Bar = { key: string; bar: number; precision: number | null; recall: number | null; cases: number; pass: boolean };

const ratio = (a: number, b: number) => (b ? +(a / b).toFixed(3) : null);

function bar(key: string, need: number, t: Tally | undefined): Bar {
  const tally = t ?? { tp: 0, fp: 0, fn: 0 };
  const precision = ratio(tally.tp, tally.tp + tally.fp);
  const recall = ratio(tally.tp, tally.tp + tally.fn);
  const cases = tally.tp + tally.fn;
  const pass = cases > 0 && precision !== null && recall !== null && precision >= need && recall >= need;
  return { key, bar: need, precision, recall, cases, pass };
}

/** One bar per vocabulary job, whether or not the model or the gold set mentioned it. */
export function jobBars(perKind: Record<string, Tally>): Bar[] {
  return VOCABULARY_KEYS.map((k) => bar(k, k === "role:tutor" ? TUTOR_BAR : JOB_BAR, perKind[k]));
}

/**
 * One bar per value of each field, over the matched jobs that carry the field: a pair whose gold value is
 * `g` and predicted value is `p` is a true positive for `g` when they agree, else a miss for `g` and a false
 * positive for `p`.
 */
export function fieldBars(pairs: Record<Field, [gold: string, predicted: string][]>): Bar[] {
  const out: Bar[] = [];
  for (const f of Object.keys(FIELD_BARS) as Field[]) {
    const tallies: Record<string, Tally> = {};
    for (const [g, p] of pairs[f]) {
      tallies[g] ??= { tp: 0, fp: 0, fn: 0 };
      tallies[p] ??= { tp: 0, fp: 0, fn: 0 };
      if (g === p) tallies[g].tp++;
      else { tallies[g].fn++; tallies[p].fp++; }
    }
    for (const v of FIELD_VALUES[f]) out.push(bar(`${f}=${v}`, FIELD_BARS[f], tallies[v]));
  }
  return out;
}

/** What stops the run: every bar under its figure or unmeasured, named. Empty means the gate is met. */
export const stops = (bars: readonly Bar[]) => bars.filter((b) => !b.pass).map((b) =>
  b.cases === 0
    ? `${b.key}: no gold cases, so unmeasured`
    : `${b.key}: precision ${b.precision ?? "-"} recall ${b.recall ?? "-"} under ${b.bar} (${b.cases} cases)`);
