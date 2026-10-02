/**
 * The stand-ins comparison read off LABELS (the run plan's Task 5, amended 2026-10-02). Pure: every rule
 * here is unit-tested with no database. `rankStandIns` calls it only for a pair where BOTH cards carry a
 * fresh label (Q1); every other pair is compared by text, exactly as before.
 */
import type { DeckLens } from "../swaps/honest";
import { ROLES, type Job, type Method } from "./types";

/** A job's identity for sharing: ramp by its kind (E1), every other job by its name. */
export function keyOf(job: Job): string | null {
  if (job.space === "role" && job.kind === "ramp") return job.rampKind ?? null;
  return job.kind;
}

/** The card types a `restrictedTo` may name (`prompt.ts`'s "artifact", "land", "creature"…). */
const CARD_TYPES = new Set(["artifact", "battle", "creature", "enchantment", "instant", "kindred", "land", "planeswalker", "sorcery"]);
/** A card type by its current name: `Tribal` was renamed `Kindred`, and older type lines still print it. */
const cardType = (word: string) => {
  const w = word.toLowerCase();
  return w === "tribal" ? "kindred" : w;
};

/** The card types a deck's cards carry (`DeckLens.heldTypes`), read off the type line's front, before any dash. */
export function heldCardTypes(typeLines: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const line of typeLines) {
    for (const face of line.split("//")) {
      for (const w of face.split(/[—-]/)[0].split(/\s+/).map(cardType)) if (CARD_TYPES.has(w)) out.add(w);
    }
  }
  return out;
}

const pointsAtOpponents = (j: Job) => j.affects === "opponents" || j.affects === "each";

/**
 * Whether a job does anything for THIS deck. A job on the player's own cards (`affects` self or null)
 * limited to a creature type counts only when it is the deck's key type; to a noncreature subtype, only
 * when the deck holds or makes one; to a card type, only when the deck holds another card of it. A
 * restriction none of those reads is KEPT: an unreadable limit must not cost the reader a job. A job
 * aimed at opponents' cards is never dropped for its restriction, which names the TARGET there.
 */
export function relevant(job: Job, deck: DeckLens | null, isCreatureType: (w: string) => boolean): boolean {
  const r = job.restrictedTo;
  if (r === null || pointsAtOpponents(job)) return true;
  if (CARD_TYPES.has(cardType(r))) return deck !== null && deck.heldTypes.has(cardType(r));
  if (isCreatureType(r)) return deck !== null && deck.keyType === r;
  if (deck !== null && deck.isSubtype(r)) return deck.held.has(r);
  return true;
}

/**
 * A job's place for sharing: its SPACE and its key. The space is part of it because `draw` is both a role
 * (it draws you cards) and a theme (it rewards drawing), and the two are different jobs; keyed by the bare
 * name they merge, and a role draw is filed and worded as the theme.
 */
export type JobRef = { space: "role" | "theme"; key: string };
const refOf = (id: string): JobRef => {
  const at = id.indexOf(":");
  return { space: id.slice(0, at) as JobRef["space"], key: id.slice(at + 1) };
};

/** A card's jobs for this deck, by `space:key`. A Treasure maker's `treasure` theme is its ramp kind, named once. */
function jobsByKey(jobs: readonly Job[], deck: DeckLens | null, isCreatureType: (w: string) => boolean): Map<string, Job[]> {
  const out = new Map<string, Job[]>();
  for (const j of jobs) {
    if (!relevant(j, deck, isCreatureType)) continue;
    const k = keyOf(j);
    if (k === null || k === "land") continue;
    const id = `${j.space}:${k}`;
    out.set(id, [...(out.get(id) ?? []), j]);
  }
  if (out.has("role:makesTreasure")) out.delete("theme:treasure");
  return out;
}

/** The GATES: a mismatch means the candidate's job does not keep the original's. */
function passes(orig: Job, cand: Job): boolean {
  if ((orig.affects ?? null) !== (cand.affects ?? null)) return false;
  if (orig.to !== null && cand.to !== null && orig.to !== cand.to) return false;
  if (pointsAtOpponents(orig) && cand.restrictedTo !== null
    && cand.restrictedTo.toLowerCase() !== (orig.restrictedTo ?? "").toLowerCase()) return false;
  return true;
}

const PERMANENT_ANSWERS: readonly Method[] = ["destroy", "exile"];

export type LabelMatch = {
  /** The original's jobs the candidate keeps. */
  shared: JobRef[];
  /** The candidate's jobs the original does not have. */
  extra: JobRef[];
  /** The original's jobs the candidate does not keep. */
  missing: JobRef[];
  /** Methods the original removes by that the candidate does not (Q3): the row's `loses`. */
  lostMethods: Method[];
  /** Advisory mismatches among the kept jobs (trigger, recurrence, method): ranks lower, never drops. */
  advisory: number;
  /** What the kept jobs are worth in the sort: two kept only through modal alternatives count once. */
  credit: number;
};

export function matchLabels(
  original: readonly Job[],
  candidate: readonly Job[],
  deck: DeckLens | null,
  isCreatureType: (w: string) => boolean,
): LabelMatch {
  const orig = jobsByKey(original, deck, isCreatureType);
  const cand = jobsByKey(candidate, deck, isCreatureType);
  const shared: JobRef[] = [];
  const missing: JobRef[] = [];
  const lostMethods: Method[] = [];
  let advisory = 0;
  let plain = 0;
  let modal = 0;
  for (const [key, origJobs] of orig) {
    let best: { o: Job; c: Job; cost: number } | null = null;
    for (const o of origJobs) {
      for (const c of cand.get(key) ?? []) {
        if (!passes(o, c)) continue;
        // A candidate with no method keeps no permanent answer either: null is a loss, never a match.
        const methodLost = o.method !== null && PERMANENT_ANSWERS.includes(o.method) && c.method !== o.method;
        const cost = Number(o.trigger !== c.trigger || o.recurrence !== c.recurrence) + Number(methodLost);
        if (!best || cost < best.cost) best = { o, c, cost };
      }
    }
    if (!best) { missing.push(refOf(key)); continue; }
    shared.push(refOf(key));
    advisory += best.cost;
    if (best.o.method !== null && PERMANENT_ANSWERS.includes(best.o.method) && best.c.method !== best.o.method
      && !lostMethods.includes(best.o.method)) lostMethods.push(best.o.method);
    if (best.c.modal) modal += 1; else plain += 1;
  }
  const extra = [...cand.keys()].filter((k) => !orig.has(k)).map(refOf);
  return { shared, extra, missing, lostMethods, advisory, credit: plain + Math.min(1, modal) };
}

/** A labelled card's job keys for this deck, in label order: roles and ramp kinds then themes, as the header names them. */
export function labelledKeys(jobs: readonly Job[], deck: DeckLens | null, isCreatureType: (w: string) => boolean): JobRef[] {
  return [...jobsByKey(jobs, deck, isCreatureType).keys()].map(refOf);
}

/**
 * The `card_labels.labels @>` patterns that admit a stand-in for any of these jobs (the pool's label
 * slice): one per key, a ramp job by its kind. A superset of what matches, deliberately: the deck's
 * relevance and the gates are `matchLabels`'s, on the rows the pool returns.
 */
export function labelPatterns(jobs: readonly Job[], deck: DeckLens | null, isCreatureType: (w: string) => boolean): string[] {
  // From the SAME set `matchLabels` compares: only jobs relevant to this deck, Treasure named once. A key
  // matching would discard has no business spending the slice's rows.
  return [...jobsByKey(jobs, deck, isCreatureType).keys()].map((id) => {
    const { space, key } = refOf(id);
    const ramp = space === "role" && !ROLE_KINDS.has(key);
    return JSON.stringify([ramp ? { space: "role", kind: "ramp", rampKind: key } : { space, kind: key }]);
  });
}

/** The role kinds by name; a role key that is not one of them is a ramp kind. */
const ROLE_KINDS: ReadonlySet<string> = new Set(ROLES);

/** Whether a labelled card has any job a stand-in could keep for this deck (for an original whose text names none). */
export function hasLabelledJob(jobs: readonly Job[], deck: DeckLens | null, isCreatureType: (w: string) => boolean): boolean {
  return jobsByKey(jobs, deck, isCreatureType).size > 0;
}
