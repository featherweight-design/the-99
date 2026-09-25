// THE LABEL SCHEMA for the card-label sample: what a card's jobs are, and what
// LIMITS each job carries.
//
// The whole question this lane answers is whether a model can supply the limits,
// because the job alone is what the text rules already give and what produced
// the false matches. Bejeweled Warg and Runadi share the job `counters` and the
// job `ramp`, and a stand-in matched them on both. They agree on neither limit:
//
//   Warg    counters  restricted to Wolf, triggered on combat damage, MODAL
//           ramp      makes Treasure, one-shot, triggered, MODAL
//   Runadi  counters  restricted to nothing, on cast, threshold MV >= 5
//           ramp      taps for mana, repeatable, untriggered
//
// So `limits` is the deliverable and `kind` is the control.
//
// THE VOCABULARY IS NOT OURS. Roles and themes are 2b's, confirmed 2026-09-25 as
// "those two files as they stand on main, and nothing else": `Role` in
// src/lib/recs/roles.ts and `Theme` in src/lib/recs/themes.ts. The three ramp
// kinds are the shape d9 ruled and 2b is building to in E1. Nothing here invents
// a job, and a model that returns one is scored as wrong rather than accommodated.

/** `Role` in src/lib/recs/roles.ts. Stand-ins use this minus `land` (`SpellRole`). */
export const ROLES = ["ramp", "draw", "removal", "wipes", "land"];

/** `Theme` in src/lib/recs/themes.ts, in THEME_ORDER. `tribal` last, as there. */
export const THEMES = [
  "counters", "pump", "haste", "evasion", "etbDraw", "draw", "tokens", "treasure",
  "protection", "recursion", "blink", "finisher", "castFree", "mill", "sacOutlet",
  "deathTrigger", "lifegain", "drain", "spellslinger", "landfall", "tribal",
];

// `draw` is in BOTH lists and means nearly the same thing in each, so a flat
// vocabulary would silently merge a role with a theme and make the score
// unreadable -- there would be no way to say which classifier a hit belonged to.
// Every job therefore carries the space it came from.
export const SPACES = ["role", "theme"];

/** E1's three kinds. A stand-in keeps `ramp` only when its kind matches. */
export const RAMP_KINDS = [
  "tapsForMana",    // a dork or a rock: mana every turn from a permanent's tap ability
  "fetchesLand",    // a search putting a land onto the battlefield or into hand
  "makesTreasure",  // one-time or conditional; the Warg's combat-damage Treasure
];

// What has to be true for the job to happen at all. `none` is the honest default
// and is NOT the same as `activated`: an activated ability the controller can use
// at will is available, where a triggered one waits on an event they may never get.
export const TRIGGERS = [
  "none",          // static, or the card just does it on resolution
  "etb",           // when this or another permanent enters
  "combatDamage",  // Bejeweled Warg
  "attacks",
  "cast",          // Runadi's counters
  "dies",
  "activated",     // a cost the controller pays when they choose to
  "upkeep",        // a turn-based trigger
  "landfall",
  "other",
];

/** Whether the job can be had again. Generator Servant's mana is `oneShot`. */
export const RECURRENCE = ["oneShot", "repeatable"];

export const THRESHOLD_STATS = ["mv", "power", "counters", "cardsInGraveyard", "artifacts", "creatures", "life", "other"];

/**
 * ONE JOB.
 *
 * {
 *   space:        "role" | "theme"
 *   kind:         a member of ROLES or THEMES, per `space`
 *   rampKind:     one of RAMP_KINDS, when kind === "ramp"; otherwise absent
 *   restrictedTo: the creature type or card type the effect is limited to
 *                 ("Wolf", "Dinosaur", "artifact"), or null for unrestricted.
 *                 A SINGLE string, because every case in the gold set restricts
 *                 to one thing; a card restricting to two would be a schema
 *                 finding rather than something to average away.
 *   trigger:      a member of TRIGGERS
 *   recurrence:   "oneShot" | "repeatable"
 *   threshold:    { stat, op, value } or null -- Runadi's MV >= 5
 *   modal:        true when this job is ONE OPTION AMONG ALTERNATIVES rather
 *                 than something the card also does. The Warg's two jobs are
 *                 both modal: it never does both. A consumer that sums modal
 *                 jobs credits a card with more than it can do.
 * }
 *
 * Compact JSON on the wire: keys stay short and absent rather than null where a
 * field does not apply, because the full run is ~32k cards and every key is paid
 * for once per card.
 */
export const JOB_FIELDS = ["space", "kind", "rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal"];

/** Validates ONE job. Returns a list of complaints, empty when it is well formed. */
export function validateJob(job) {
  const bad = [];
  if (!SPACES.includes(job.space)) bad.push(`space "${job.space}"`);
  const vocab = job.space === "role" ? ROLES : THEMES;
  if (!vocab.includes(job.kind)) bad.push(`kind "${job.kind}" is not in ${job.space}`);
  if (job.kind === "ramp" && job.space === "role") {
    if (!RAMP_KINDS.includes(job.rampKind)) bad.push(`rampKind "${job.rampKind}"`);
  } else if (job.rampKind !== undefined) {
    bad.push(`rampKind on a non-ramp job`);
  }
  if (!TRIGGERS.includes(job.trigger)) bad.push(`trigger "${job.trigger}"`);
  if (!RECURRENCE.includes(job.recurrence)) bad.push(`recurrence "${job.recurrence}"`);
  if (job.restrictedTo !== null && typeof job.restrictedTo !== "string") bad.push(`restrictedTo`);
  if (typeof job.modal !== "boolean") bad.push(`modal`);
  if (job.threshold !== null && job.threshold !== undefined) {
    if (!THRESHOLD_STATS.includes(job.threshold.stat)) bad.push(`threshold.stat "${job.threshold?.stat}"`);
    if (typeof job.threshold.value !== "number") bad.push(`threshold.value`);
  }
  return bad;
}

/** The identity two jobs must share for a stand-in to be a real match. */
export function jobKey(job) {
  return [
    job.space, job.kind, job.rampKind ?? "-",
    job.restrictedTo ?? "-", job.trigger, job.recurrence,
    job.threshold ? `${job.threshold.stat}${job.threshold.op}${job.threshold.value}` : "-",
    job.modal ? "modal" : "-",
  ].join("|");
}
