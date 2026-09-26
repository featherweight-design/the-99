/**
 * The stored card label: what a card DOES, and the limits on each of those jobs.
 *
 * Written once per card by `db:build:labels` and read by the stand-in matcher. The
 * vocabulary here is CANONICAL — `scripts/lib/card-labels-schema.mjs` holds the runtime
 * validator the model's output is checked against, and `types.test.ts` fails when the
 * two disagree. Two copies exist because the validator has to run in a plain `.mjs`
 * script and the column needs a TypeScript type; the guard is what keeps them one
 * vocabulary rather than two that drift.
 */

/** The five job kinds in `role` space. `Role` in src/lib/swaps, same five. */
export const ROLES = ["ramp", "draw", "removal", "wipes", "land"] as const;

/** `Theme` in src/lib/recs/themes.ts, in THEME_ORDER. `tribal` last, as there. */
export const THEMES = [
  "counters", "pump", "haste", "evasion", "etbDraw", "draw", "tokens", "treasure",
  "protection", "recursion", "blink", "finisher", "castFree", "mill", "sacOutlet",
  "deathTrigger", "lifegain", "drain", "spellslinger", "landfall", "tribal",
] as const;

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

export type Role = (typeof ROLES)[number];
export type Theme = (typeof THEMES)[number];
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
 * Optional fields are ABSENT rather than null on the wire where they do not apply — the
 * full run is ~32k cards and every key is paid for once per card. `restrictedTo` is the
 * exception: null is meaningful there and means unrestricted.
 *
 * `modal` is true when this job is one option AMONG ALTERNATIVES rather than something
 * the card also does. Anything summing a card's jobs must not credit both halves of a
 * modal pair.
 */
export type Job = {
  space: Space;
  kind: Role | Theme;
  rampKind?: RampKind | null;
  restrictedTo?: string | null;
  trigger?: Trigger;
  recurrence?: Recurrence;
  threshold?: Threshold | null;
  modal?: boolean;
};
