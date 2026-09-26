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

// The ramp kinds. A stand-in keeps `ramp` only when its kind matches.
//
// `burstMana` is d9's ruling of 2026-09-25, and it closed a gap this gold set
// found by hand. Generator Servant -- `{T}, Sacrifice this creature: Add {C}{C}`
// -- is not `tapsForMana` (gone after one use), not `fetchesLand`, and not
// `makesTreasure` (no token is created; the mana is added directly). `Blood Pet`,
// the Eldrazi Scion tokens and every sacrifice-for-mana land are the same shape,
// so the class is large rather than a curiosity. Folding it into `makesTreasure`
// would have recreated the Warg-vs-Runadi false match, both being "one-time
// mana" -- and would have lost the Treasure's leftover artifact, which sacrifice
// outlets and artifact counts care about. It matches only itself.
export const RAMP_KINDS = [
  "tapsForMana",    // a dork or a rock: mana every turn from a permanent's tap ability
  "fetchesLand",    // a search putting a land onto the battlefield or into hand
  "makesTreasure",  // a Treasure token, one-time or conditional; the Warg's
  "burstMana",      // one-time mana from a consumed source; Generator Servant
];

// `null` remains legal and now means a NEW gap: a ramp none of the four kinds
// fits. It is kept rather than removed because the last gap was found by hand
// labelling and would have been silently forced otherwise. A null in the gold
// set is a finding to report, not a label to leave -- `validateGold` counts them.

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

/**
 * The comparison a threshold may use. Unvalidated before, and `label-cards-score.mts`
 * compares thresholds by concatenating `op` -- so a model answering `"atLeast"`
 * passed validation and was then scored wrong on a limit whose format was never
 * specified, charging the model for the prompt's omission.
 */
export const THRESHOLD_OPS = [">=", "<=", ">", "<", "=="];

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
  // A model can return `null` or a string in the jobs array. The collector's
  // contract is to DROP and RECORD a malformed job, which it cannot do if reading
  // `job.space` throws first -- one bad item would abort the whole collection.
  if (job === null || typeof job !== "object" || Array.isArray(job)) {
    return [`not an object: ${JSON.stringify(job)}`];
  }
  if (!SPACES.includes(job.space)) bad.push(`space "${job.space}"`);
  const vocab = job.space === "role" ? ROLES : THEMES;
  if (!vocab.includes(job.kind)) bad.push(`kind "${job.kind}" is not in ${job.space}`);
  if (job.kind === "ramp" && job.space === "role") {
    // null is permitted and meaningful; undefined is an omission.
    if (job.rampKind !== null && !RAMP_KINDS.includes(job.rampKind)) bad.push(`rampKind "${job.rampKind}"`);
  } else if (job.rampKind !== undefined && job.rampKind !== null) {
    // An explicit `rampKind: null` on a non-ramp job is ACCEPTED as equivalent to
    // omitting it. Rejecting it meant the collector dropped the whole job, which
    // then read as a missed job in recall -- charging a model for answering `null`
    // where the prompt says "omit", a formatting choice rather than a wrong label.
    bad.push(`rampKind on a non-ramp job`);
  }
  if (!TRIGGERS.includes(job.trigger)) bad.push(`trigger "${job.trigger}"`);
  if (!RECURRENCE.includes(job.recurrence)) bad.push(`recurrence "${job.recurrence}"`);
  if (job.restrictedTo !== null && typeof job.restrictedTo !== "string") bad.push(`restrictedTo`);
  if (typeof job.modal !== "boolean") bad.push(`modal`);
  // `undefined` is NOT equivalent to `null` here. The prompt requires the key, and
  // `limitValue` renders a missing threshold as "none" -- the default -- so letting
  // it through credits an incomplete answer with the commonest correct value.
  if (job.threshold === undefined) {
    bad.push("threshold is missing; it must be an object or null");
  } else if (job.threshold !== null) {
    if (!THRESHOLD_STATS.includes(job.threshold.stat)) bad.push(`threshold.stat "${job.threshold?.stat}"`);
    if (!THRESHOLD_OPS.includes(job.threshold.op)) bad.push(`threshold.op "${job.threshold?.op}"`);
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
