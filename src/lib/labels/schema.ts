/**
 * The runtime contract for one stored label: what `validateJob` accepts, and the key two
 * labels are compared by.
 *
 * **This is the ONE definition, and that is the point of this module existing.** The
 * vocabulary lived here in a `scripts/` `.mjs` copy and in `types.ts` at the same time,
 * held together by a parity test, because the sample's collector ran under bare `node`
 * and could not load TypeScript. Every script in that graph is `.mts` now, so the copy
 * and its guard are gone: the reader's type and the writer's validator are the same
 * source, which is what the plan's PR 2 is for.
 *
 * Kept as a hand-written validator rather than a schema library: its job is to DROP and
 * RECORD a malformed job from a model's answer, one complaint per problem, and every
 * rule below is a decision the sample paid for in a measurement. A library would give
 * better errors for a caller that is not a language model and worse ones for this.
 */

import {
  RAMP_KINDS, RECURRENCE, ROLES, SPACES, THEMES, THRESHOLD_OPS, THRESHOLD_STATS, TRIGGERS,
  type Job,
} from "./types";

/**
 * The wire key order, which the prompt emits and the collector reads back. Not the same
 * thing as `Job`'s optionality — `types.test.ts` ties the two together.
 */
export const JOB_FIELDS = [
  "space", "kind", "rampKind", "restrictedTo", "trigger", "recurrence", "threshold", "modal",
] as const;

/** A model's answer, before validation says whether it is a `Job`. */
type Unchecked = Record<string, unknown>;

/**
 * Validates ONE job. Returns a list of complaints, empty when it is well formed.
 *
 * Never repairs: a repaired label stores the repair rather than the model's answer, and
 * the next re-score then measures the repair.
 */
export function validateJob(job: unknown): string[] {
  const bad: string[] = [];
  // A model can return `null` or a string in the jobs array. The contract is to DROP and
  // RECORD a malformed job, which is impossible if reading `job.space` throws first --
  // one bad item would abort the whole collection.
  if (job === null || typeof job !== "object" || Array.isArray(job)) {
    return [`not an object: ${JSON.stringify(job)}`];
  }
  const j = job as Unchecked;
  const has = (list: readonly string[], v: unknown) => typeof v === "string" && list.includes(v);

  if (!has(SPACES, j.space)) bad.push(`space "${String(j.space)}"`);
  const vocab: readonly string[] = j.space === "role" ? ROLES : THEMES;
  if (!has(vocab, j.kind)) bad.push(`kind "${String(j.kind)}" is not in ${String(j.space)}`);

  if (j.kind === "ramp" && j.space === "role") {
    // null is permitted and meaningful; undefined is an omission.
    if (j.rampKind !== null && !has(RAMP_KINDS, j.rampKind)) bad.push(`rampKind "${String(j.rampKind)}"`);
  } else if (j.rampKind !== undefined && j.rampKind !== null) {
    // An explicit `rampKind: null` on a non-ramp job is ACCEPTED as equivalent to
    // omitting it. Rejecting it meant the collector dropped the whole job, which was
    // then read as a missed job in recall -- charging a model for answering `null`
    // where the prompt says "omit", a formatting choice rather than a wrong label.
    bad.push(`rampKind on a non-ramp job`);
  }

  if (!has(TRIGGERS, j.trigger)) bad.push(`trigger "${String(j.trigger)}"`);
  if (!has(RECURRENCE, j.recurrence)) bad.push(`recurrence "${String(j.recurrence)}"`);
  if (j.restrictedTo !== null && typeof j.restrictedTo !== "string") bad.push(`restrictedTo`);
  if (typeof j.modal !== "boolean") bad.push(`modal`);

  // `undefined` is NOT equivalent to `null` here. The prompt requires the key, and
  // `limitValue` renders a missing threshold as "none" -- the default -- so letting it
  // through credits an incomplete answer with the commonest correct value.
  if (j.threshold === undefined) {
    bad.push("threshold is missing; it must be an object or null");
  } else if (j.threshold !== null) {
    const t = j.threshold as Unchecked;
    if (!has(THRESHOLD_STATS, t?.stat)) bad.push(`threshold.stat "${String(t?.stat)}"`);
    if (!has(THRESHOLD_OPS, t?.op)) bad.push(`threshold.op "${String(t?.op)}"`);
    if (typeof t?.value !== "number") bad.push(`threshold.value`);
  }
  return bad;
}

/** True when `validateJob` accepts the value, narrowing it for the caller. */
export const isJob = (job: unknown): job is Job => validateJob(job).length === 0;

/**
 * How two labels are compared for equality — every field, so a match on `kind` alone is
 * never mistaken for agreement. The limits are what the pass is bought for, so a key that
 * omitted one would report two different labels as the same.
 *
 * **JSON-encoded rather than joined on a separator, because the joined form was not
 * injective.** `restrictedTo: null` and the literal string `"-"` both rendered as `-`, and
 * any value containing the `|` separator could shift the field boundaries — so two
 * different labels could produce one key and be reported as agreeing. Nothing in the gold
 * set collides (27 distinct restrictions, none `-`, none containing `|`) and this function
 * has no caller outside its own test today, so the fix moves no published figure; it is
 * here so the matcher that will use it cannot inherit the bug.
 *
 * `null` and `undefined` are folded together deliberately: an absent `rampKind` and an
 * explicit null are the same label, which is the rule `validateJob` applies too.
 *
 * **The serialized STRING is not compatible with the joined form, and nothing may persist
 * it.** Only the equality relation carries over — measured over all 20,910 pairs of
 * accepted gold jobs, the old key agrees exactly when this one does. So a stored key from
 * before this change cannot be compared against one produced after it; a caller that wants
 * durable identity needs its own field rather than this function's output.
 */
export function jobKey(job: Job): string {
  return JSON.stringify([
    job.space, job.kind, job.rampKind ?? null,
    job.restrictedTo ?? null, job.trigger, job.recurrence,
    job.threshold ? [job.threshold.stat, job.threshold.op, job.threshold.value] : null,
    job.modal,
  ]);
}
