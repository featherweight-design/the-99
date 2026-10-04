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
  AFFECTS, DESTINATIONS, METHOD_KINDS, METHODS, RAMP_KINDS, TO_KINDS, RECURRENCE, ROLES, SPACES, THEMES, THRESHOLD_OPS,
  THRESHOLD_STATS, TRIGGERS, type Job,
} from "./types";

/**
 * The wire key order, which the prompt emits and the collector reads back. Not the same
 * thing as `Job`'s optionality — `types.test.ts` ties the two together.
 */
export const JOB_FIELDS = [
  "space", "kind", "rampKind", "restrictedTo", "affects", "to", "method",
  "trigger", "recurrence", "threshold", "modal",
] as const;

/** A model's answer, before validation says whether it is a `Job`. */
type Unchecked = Record<string, unknown>;

/**
 * Validates ONE job. Returns a list of complaints, empty when it is well formed.
 *
 * Never repairs: a repaired label stores the repair rather than the model's answer, and
 * the next re-score then measures the repair. The one sanctioned repair is `normalizeJob`,
 * below, and it runs BEFORE this rather than inside it, so this stays the strict contract.
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
  // REQUIRED, null where they do not apply, like `restrictedTo`: an omitted key is an unanswered
  // question, and reading it as null would credit a model that forgot the field with the commonest
  // answer. The consumer gates on `affects` and `to`, so the difference is a wrong stand-in.
  const nullableOf = (field: string, list: readonly string[]) => {
    const v = j[field];
    if (v === undefined) bad.push(`${field} is missing; it must be one of ${list.join(", ")} or null`);
    else if (v !== null && !has(list, v)) bad.push(`${field} "${String(v)}"`);
  };
  nullableOf("affects", AFFECTS);
  nullableOf("to", DESTINATIONS);
  nullableOf("method", METHODS);
  // `to` and `method` belong to particular jobs, as `rampKind` belongs to ramp: the consumer GATES on
  // `to`, so a destination a model put on a draw job would refuse a stand-in for a reason the card
  // does not have.
  if (j.to != null && !(typeof j.kind === "string" && TO_KINDS.includes(j.kind))) bad.push(`to on a ${String(j.kind)} job`);
  if (j.method != null && !(typeof j.kind === "string" && METHOD_KINDS.includes(j.kind))) bad.push(`method on a ${String(j.kind)} job`);

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

/**
 * The repairs the collector makes before validating, and the only ones: a `to` on a kind outside
 * `TO_KINDS`, or a `method` on a kind outside `METHOD_KINDS`, is set to null, and so is a
 * `threshold` whose value is not a number or whose stat is not in `THRESHOLD_STATS`. Anything else
 * comes back unchanged, and a value that is not an object comes back as it is, for `validateJob`
 * to refuse.
 *
 * Sanctioned because the field is MEANINGLESS there rather than wrong. The consumer gates on `to`
 * and `method` only for the kinds that take them, so on any other kind the field says nothing a
 * reader acts on, while the rest of the job is a real answer. Rejecting it threw that answer away:
 * a ramp job carrying `to: "battlefield"` (Rampant Growth, Sakura-Tribe Elder) cost the card its
 * only job, and 83 cards were stored as `[]` for this defect and no other (Hugh, 2026-10-04).
 *
 * The threshold is the same case. A cap the card states as a variable ("power X or less") has no
 * number to record, and the gold set's own ruling is that such a cap is no threshold: Killing
 * Glare, Dominate and Forced March came back with `value: "X"`, Vedalken Shackles with `null`,
 * Misers' Cage and Scroll of Origins with a stat (`cardsInHand`) the vocabulary does not have.
 * Each lost its only job over the gate, which is the least of what the job says (v8 trial,
 * 2026-10-04: 9 jobs on 392 cards). A threshold with a bad `op` alone is still refused.
 *
 * A shallow copy, never the input mutated: the caller still holds the model's answer as given.
 */
export function normalizeJob(job: unknown): unknown {
  if (job === null || typeof job !== "object" || Array.isArray(job)) return job;
  const j = job as Unchecked;
  const takes = (list: readonly string[]) => typeof j.kind === "string" && list.includes(j.kind);
  const stripTo = j.to != null && !takes(TO_KINDS);
  const stripMethod = j.method != null && !takes(METHOD_KINDS);
  const t = j.threshold as Unchecked | null | undefined;
  const stripThreshold = t != null && typeof t === "object" && !Array.isArray(t)
    && (typeof t.value !== "number" || !(typeof t.stat === "string" && (THRESHOLD_STATS as readonly string[]).includes(t.stat)));
  if (!stripTo && !stripMethod && !stripThreshold) return job;
  return {
    ...j,
    ...(stripTo ? { to: null } : {}),
    ...(stripMethod ? { method: null } : {}),
    ...(stripThreshold ? { threshold: null } : {}),
  };
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
    job.restrictedTo ?? null, job.affects ?? null, job.to ?? null, job.method ?? null,
    job.trigger, job.recurrence,
    job.threshold ? [job.threshold.stat, job.threshold.op, job.threshold.value] : null,
    job.modal,
  ]);
}
