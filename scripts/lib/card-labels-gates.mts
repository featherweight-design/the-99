// The re-sample's FREE gates (the vocabulary plan's Task 5): readings over the labels a sample already
// bought, none of which costs a model call. Each is a finding to explain before the full run, not a
// pass/fail on its own: two independent classifiers disagreeing says one of them is wrong, and which one
// is a reading, never a rule.
import type { Job } from "../../src/lib/labels/types.js";

/** A card's labels, or `null` where the collector recorded no answer (failed, malformed or not returned). */
export type Labels = Record<string, Job[] | null>;
export type Flags = { tutor: boolean; massLandDenial: boolean; extraTurn: boolean };

const has = (jobs: Job[] | null, space: Job["space"], kind: string) => !!jobs?.some((j) => j.space === space && j.kind === kind);
/** The cards the model answered: an unanswered card is no evidence for or against any gate. */
const answered = (labels: Labels) => Object.entries(labels).filter((e): e is [string, Job[]] => Array.isArray(e[1]));

/**
 * Agreement with `card_bracket_flags`, the bracket system's own classifiers, on the cards both read.
 * `stax` and `finisher` are WIDER than mass land denial and extra turns, so their `labelOnly` lists are
 * expected to be long; `flagOnly` is the direction that matters there (a flagged card the label missed).
 * Tutor is the same concept on both sides, so both directions count.
 */
export function flagAgreement(labels: Labels, flags: Record<string, Flags>) {
  const pairs = [
    { name: "tutor", flag: (f: Flags) => f.tutor, label: (j: Job[]) => has(j, "role", "tutor") },
    { name: "massLandDenial~stax", flag: (f: Flags) => f.massLandDenial, label: (j: Job[]) => has(j, "theme", "stax") },
    { name: "extraTurn~finisher", flag: (f: Flags) => f.extraTurn, label: (j: Job[]) => has(j, "theme", "finisher") },
  ];
  return Object.fromEntries(pairs.map((p) => {
    const both: string[] = [], flagOnly: string[] = [], labelOnly: string[] = [];
    for (const [name, jobs] of answered(labels)) {
      const f = flags[name];
      const flagged = f ? p.flag(f) : false, labelled = p.label(jobs);
      if (flagged && labelled) both.push(name);
      else if (flagged) flagOnly.push(name);
      else if (labelled) labelOnly.push(name);
    }
    return [p.name, { both: both.length, flagOnly, labelOnly }];
  }));
}

// A TAPPER keeps a permanent from acting without taking it away. A card whose text also removes (destroys,
// exiles, deals damage, shrinks, returns, sacrifices or takes control) is not only a tapper, so it is left out.
// Any number between the verb and its target, in one sentence ("tap target", "tap up to two target"); `\btap`
// does not match inside "untap".
const TAPS = /\btap\b[^.]*\btargets?\b|\bdoesn't untap\b|\bdon't untap\b/i;
const REMOVES = /\bdestroys?\b|\bexiles?\b|\bdamage\b|[-−]\d+\/[-−]\d+|\breturns?\b[^.]*\bowner'?s hand\b|\bsacrifices?\b|\bgain control\b/i;

/**
 * Task 3 took counterspells, tappers and hand attack OUT of `removal`. A card labelled removal beside a
 * counterspell or discard job, or one whose only interaction is tapping, is the definition leaking back.
 */
export function removalLeaks(labels: Labels, text: Record<string, string>) {
  const out = { counterspell: [] as string[], discard: [] as string[], tapper: [] as string[] };
  for (const [name, jobs] of answered(labels)) {
    if (!has(jobs, "role", "removal")) continue;
    if (has(jobs, "role", "counterspell")) out.counterspell.push(name);
    if (has(jobs, "theme", "discard")) out.discard.push(name);
    const t = text[name] ?? "";
    if (TAPS.test(t) && !REMOVES.test(t)) out.tapper.push(name);
  }
  return out;
}

/** Task 3 took tutors out of `draw`: a card labelled both is listed to be read, since a few do both. */
export const tutorsInDraw = (labels: Labels) =>
  answered(labels).filter(([, j]) => has(j, "role", "tutor") && has(j, "role", "draw")).map(([n]) => n);

/** The first backfill's empty rate on staging (d9, 2026-09-28): 464 of 3,792 collected cards. */
export const EMPTY_BASELINE = 464 / 3792;

/** The share of the RANDOM set answered with no job, against the baseline. Gold and strata are chosen, not drawn. */
export function emptyRate(labels: Labels, random: readonly string[]) {
  const returned = random.filter((n) => Array.isArray(labels[n]));
  const empty = returned.filter((n) => labels[n]!.length === 0).length;
  const rate = returned.length ? empty / returned.length : null;
  return { random: random.length, returned: returned.length, empty, rate, baseline: EMPTY_BASELINE,
    deltaPoints: rate === null ? null : +((rate - EMPTY_BASELINE) * 100).toFixed(1) };
}
