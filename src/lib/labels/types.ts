/**
 * The stored card label: what a card DOES, and the limits on each of those jobs.
 *
 * Nothing writes this yet. It is written per card by the label build (Task 2 of
 * `docs/superpowers/plans/2026-09-25-card-labels-run.md`, not yet shipped) and read by
 * the stand-in matcher; `card_labels` exists ahead of both so the storage can be
 * reviewed on its own.
 *
 * **Why the vocabulary is in two files, and why a guard rather than one source.** The
 * runtime validator the model's output is checked against is
 * `scripts/lib/card-labels-schema.mjs`, and the single-source fix — import these
 * constants from it, or make it `.mts` and import them from here — does not work today
 * in either direction. A literal union cannot be derived from a plain `.js` array
 * without restating the literals in JSDoc, which is the same duplication; and the
 * module cannot become `.mts`, because `label-cards-collect.mjs` and
 * `card-labels-gold.mjs` import it and are invoked with `pnpm node`, which cannot load
 * a TypeScript module at all (measured: `ERR_MODULE_NOT_FOUND`). Converting it means
 * converting those and re-pointing their documented invocations, which is Task 2's job.
 *
 * So `types.test.ts` holds the two together until then, and PR 2 of that plan retires
 * BOTH the duplicate and the guard — a guard over one source is a tautology and should
 * be deleted rather than left asserting nothing.
 */

import type { Role } from "../recs/roles";
import type { Theme } from "../recs/themes";

/**
 * The five job kinds in `role` space, tied to `Role` in src/lib/recs/roles.ts by
 * `satisfies` — so a role added there and not here is a compile error rather than a
 * silent third copy. The `.mjs` copy cannot have that tie; the test is what covers it.
 */
export const ROLES = ["ramp", "draw", "removal", "wipes", "land"] as const satisfies readonly Role[];

/**
 * `Theme` in src/lib/recs/themes.ts, in THEME_ORDER order. `tribal` last, as there, and
 * `satisfies` ties the membership — `THEME_ORDER` is derived from `RULES`, so a rule
 * added there would otherwise leave this a stale third copy with nothing failing.
 */
export const THEMES = [
  "counters", "pump", "haste", "evasion", "etbDraw", "draw", "tokens", "treasure",
  "protection", "recursion", "blink", "finisher", "castFree", "mill", "sacOutlet",
  "deathTrigger", "lifegain", "drain", "spellslinger", "landfall", "tribal",
] as const satisfies readonly Theme[];

export const SPACES = ["role", "theme"] as const;

/**
 * The ramp kinds. A stand-in keeps `ramp` only when its kind MATCHES — each kind
 * matches only itself (d9, 2026-09-25), which is the rule that stops a Treasure maker
 * standing in for a mana dork.
 */
export const RAMP_KINDS = ["tapsForMana", "fetchesLand", "makesTreasure", "burstMana"] as const;

export const TRIGGERS = [
  "none", "etb", "combatDamage", "attacks", "cast", "dies", "activated", "upkeep", "landfall", "other",
] as const;

export const RECURRENCE = ["oneShot", "repeatable"] as const;

export const THRESHOLD_OPS = [">=", "<=", ">", "<", "=="] as const;

export const THRESHOLD_STATS = [
  "mv", "power", "counters", "cardsInGraveyard", "artifacts", "creatures", "life", "other",
] as const;

export type Space = (typeof SPACES)[number];
export type RampKind = (typeof RAMP_KINDS)[number];
export type Trigger = (typeof TRIGGERS)[number];
export type Recurrence = (typeof RECURRENCE)[number];
export type ThresholdOp = (typeof THRESHOLD_OPS)[number];
export type ThresholdStat = (typeof THRESHOLD_STATS)[number];

export type Threshold = { stat: ThresholdStat; op: ThresholdOp; value: number };

/**
 * ONE JOB a card does.
 *
 * **Every field but `rampKind` is REQUIRED**, and that is `validateJob`'s rule rather
 * than a preference: it rejects `undefined` for `trigger`, `recurrence`, `restrictedTo`,
 * `modal` and `threshold` alike, so `{space, kind}` alone is scored malformed on five
 * counts. Where a limit does not apply the value is NULL, not absent — `threshold`
 * specifically pushes "threshold is missing; it must be an object or null", because a
 * missing one renders as the default and a model that forgot the field would be read as
 * having answered it.
 *
 * `rampKind` alone is optional: it is absent on a non-ramp job, and an explicit `null`
 * is accepted there as equivalent.
 *
 * `modal` is true when this job is one option AMONG ALTERNATIVES rather than something
 * the card also does. Anything summing a card's jobs must not credit both halves of a
 * modal pair.
 */
export type Job = {
  space: Space;
  kind: Role | Theme;
  rampKind?: RampKind | null;
  restrictedTo: string | null;
  trigger: Trigger;
  recurrence: Recurrence;
  threshold: Threshold | null;
  modal: boolean;
};
