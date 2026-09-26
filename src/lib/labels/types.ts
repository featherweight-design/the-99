/**
 * The stored card label: what a card DOES, and the limits on each of those jobs.
 *
 * Nothing writes this yet. It is written per card by the label build (Task 2 of
 * `docs/superpowers/plans/2026-09-25-card-labels-run.md`, not yet shipped) and read by
 * the stand-in matcher; `card_labels` exists ahead of both so the storage can be
 * reviewed on its own.
 *
 * The vocabulary is CANONICAL here, and `schema.ts` beside it is the validator that
 * enforces it. There is one copy: `scripts/lib/card-labels-schema.mjs` held a second for
 * one PR, because the sample's collector ran under bare `node` and could not load
 * TypeScript, and a parity test held the two together. That whole graph is `.mts` now and
 * the duplicate is deleted, so nothing here needs a guard.
 *
 * `Role` and `Theme` come from `src/lib/recs`, tied by `satisfies` AND by an exhaustiveness
 * assertion — `satisfies` alone rejects a member that is not a `Role` and says nothing
 * about one that is missing.
 */

import type { Role } from "../recs/roles";
import type { Theme } from "../recs/themes";

// Re-exported because a label's `kind` IS one of these, so any consumer typing a job needs
// them — and importing them from two places would invite a third copy, which is the whole
// thing this module exists to prevent.
export type { Role, Theme };

/**
 * The five job kinds in `role` space, tied to `Role` in src/lib/recs/roles.ts.
 *
 * **`satisfies` alone is NOT enough, and the first version of this claimed otherwise.**
 * It rejects a member that is not a `Role` and says nothing about a `Role` that is
 * missing — so a role added to `roles.ts` would have left this array stale, the parity
 * test would still have passed (both copies omitting it), and the validator would simply
 * never accept the new role. `Missing` below is the other half: it resolves to `never`
 * only when every `Role` is present, so an addition upstream is a compile error here.
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

/**
 * EXHAUSTIVENESS, which `satisfies` does not give. Each of these is `never` when the
 * local list covers its upstream union, and a union of the missing members otherwise —
 * so adding a theme to `RULES` in src/lib/recs/themes.ts fails to compile here, naming
 * the theme in the error rather than leaving a stale array nothing checks.
 *
 * The CONSTRAINT is what does the work, and the first version got this wrong: it declared
 * `const _: Missing[] = []`, and an empty array is assignable to any array type, so
 * adding a role upstream compiled cleanly. Passing the union through a parameter bounded
 * by `never` is what actually fails. Proved by adding a role and watching it error.
 */
type Covers<Missing extends never> = Missing;
type _EveryRoleIsListed = Covers<Exclude<Role, (typeof ROLES)[number]>>;
type _EveryThemeIsListed = Covers<Exclude<Theme, (typeof THEMES)[number]>>;

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
 *
 * **Discriminated on `space`**, because `kind: Role | Theme` did not encode the
 * relationship the validator enforces: it accepted `{space: "role", kind: "tribal"}` and
 * `{space: "theme", kind: "land"}`, both of which `validateJob` rejects — it picks the
 * vocabulary BY space. A storage type that can represent what the wire contract calls
 * invalid is a trap for the first writer to use it, and `rampKind` is the same rule one
 * level down: it belongs to the ramp ROLE, so the theme arm forbids it outright.
 */
type Limits = {
  restrictedTo: string | null;
  trigger: Trigger;
  recurrence: Recurrence;
  threshold: Threshold | null;
  modal: boolean;
};

export type Job =
  | (Limits & { space: "role"; kind: "ramp"; rampKind: RampKind | null })
  | (Limits & { space: "role"; kind: Exclude<Role, "ramp">; rampKind?: null })
  | (Limits & { space: "theme"; kind: Theme; rampKind?: null });
