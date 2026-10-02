/**
 * The stored card label: what a card DOES, and the limits on each of those jobs.
 *
 * Written per card by the label build (`scripts/build-card-labels.ts`, published by
 * `publish.ts`) and read by the stand-in matcher, whose rules are the run plan's Task 5
 * (`docs/superpowers/plans/2026-09-25-card-labels-run.md`). Every field here is one that
 * consumer reads, or one existing rows already carry (`threshold`).
 *
 * The vocabulary is CANONICAL here, and `schema.ts` beside it is the validator that
 * enforces it. There is one copy: `scripts/lib/card-labels-schema.mjs` held a second for
 * one PR, because the sample's collector ran under bare `node` and could not load
 * TypeScript, and a parity test held the two together. That whole graph is `.mts` now and
 * the duplicate is deleted, so nothing here needs a guard.
 *
 * THE VOCABULARY IS LABEL-OWNED (Hugh, 2026-09-28), tied to the app's `Role` and `Theme` in
 * ONE direction: every app role and theme must be labelable (an exhaustiveness assertion
 * below fails to compile, naming the member, when one is missing), while a label may name a
 * job the app has no union member for. That is what lets the vocabulary grow (`tutor`,
 * `counterspell`) without widening `Role`, which is a database change with Role Coverage
 * consequences and its own plan. `LabelRole` and `LabelTheme` are the label's own types.
 */

import type { Role } from "../recs/roles";
import type { Theme } from "../recs/themes";

// Re-exported because a label's `kind` IS one of these, so any consumer typing a job needs
// them — and importing them from two places would invite a third copy, which is the whole
// thing this module exists to prevent.
export type { Role, Theme };

/**
 * The job kinds in `role` space. LABEL-OWNED: it holds every `Role` in src/lib/recs/roles.ts
 * and may hold more (`tutor` and `counterspell` arrive with the vocabulary plan's Task 3).
 *
 * The ONE tie to `Role` is the exhaustiveness check below (`_EveryRoleIsListed`): it resolves
 * to `never` only when every `Role` is present, so a role added upstream is a compile error
 * here, naming it. There is deliberately no `satisfies readonly Role[]`, which would forbid a
 * label-only member. Verified by revert (2026-10-02): adding `"fog"` to `Theme` failed with
 * `labels/types.ts(67,35): error TS2344: Type '"fog"' does not satisfy the constraint 'never'`,
 * and adding `"tutor"` to this array compiled.
 */
export const ROLES = ["ramp", "draw", "removal", "wipes", "land"] as const;

/**
 * The job kinds in `theme` space: every `Theme` in src/lib/recs/themes.ts, in THEME_ORDER
 * order with `tribal` last, as there. Label-owned like `ROLES`: tied to `Theme` only by the
 * exhaustiveness check below, so a theme added to `RULES` is a compile error here while a
 * label-only theme is allowed.
 */
export const THEMES = [
  "counters", "pump", "haste", "evasion", "etbDraw", "draw", "tokens", "treasure",
  "protection", "recursion", "blink", "finisher", "castFree", "mill", "sacOutlet",
  "deathTrigger", "lifegain", "drain", "spellslinger", "landfall", "tribal",
] as const;

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

/**
 * WHAT THE EFFECT POINTS AT, by player (the vocabulary plan's Task 2; Hugh's Q2, 2026-09-28). A
 * match gate in the stand-ins consumer: self-mill is never kept for opponent-mill. `self` for a job on
 * the controller's own cards, library, life or mana (a mana rock, counters on your own creatures,
 * as the prompt's Bejeweled Warg example labels both); `null` only when the job names no player at
 * all ("destroy target creature", which can hit anyone's).
 */
export const AFFECTS = ["self", "opponents", "each"] as const;

/** WHERE a tutor or a recursion job puts the card. A match gate where both cards carry one: a
 *  reanimation is not a regrowth. `null` on every other job, which `validateJob` enforces
 *  (`TO_KINDS`). */
export const DESTINATIONS = ["hand", "battlefield", "top"] as const;

/** HOW a removal or wipe job removes. Not a gate (Hugh's Q3): a bounce is kept for an exile, and
 *  the stand-in row names the method it loses. `null` on every other job, which `validateJob`
 *  enforces (`METHOD_KINDS`). */
export const METHODS = ["destroy", "exile", "bounce", "shrink"] as const;

/** The kinds that may carry a `to`. `tutor` is listed ahead of its arrival in `ROLES` (Task 3),
 *  so neither the rule nor `Job` needs an edit then; until then no job can carry it. */
const TO_KIND_LIST = ["recursion", "tutor"] as const;
export const TO_KINDS: readonly string[] = TO_KIND_LIST;

/** The kinds that may carry a `method`. */
const METHOD_KIND_LIST = ["removal", "wipes"] as const;
export const METHOD_KINDS: readonly string[] = METHOD_KIND_LIST;

export type LabelRole = (typeof ROLES)[number];
export type LabelTheme = (typeof THEMES)[number];
export type Affects = (typeof AFFECTS)[number];
export type Destination = (typeof DESTINATIONS)[number];
export type Method = (typeof METHODS)[number];
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
 * `affects`, `to`, `method`, `modal` and `threshold` alike, so `{space, kind}` alone is
 * scored malformed on eight counts. Where a limit does not apply the value is NULL, not absent — `threshold`
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
  affects: Affects | null;
  trigger: Trigger;
  recurrence: Recurrence;
  threshold: Threshold | null;
  modal: boolean;
};

/**
 * One arm per kind, so `to` and `method` follow the kind as `validateJob` does: a value only on a kind in
 * `TO_KINDS` / `METHOD_KINDS`, and `null` on every other. The same rule as `rampKind`, one field over: a
 * ramp job carrying `method: "exile"` is a shape the wire contract calls invalid.
 */
type Arm<S extends Space, K extends string> = K extends unknown
  ? Limits & {
    space: S;
    kind: K;
    to: K extends (typeof TO_KIND_LIST)[number] ? Destination | null : null;
    method: K extends (typeof METHOD_KIND_LIST)[number] ? Method | null : null;
  }
  : never;

export type Job =
  | (Arm<"role", "ramp"> & { rampKind: RampKind | null })
  | (Arm<"role", Exclude<LabelRole, "ramp">> & { rampKind?: null })
  | (Arm<"theme", LabelTheme> & { rampKind?: null });
