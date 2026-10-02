/**
 * The stand-ins comparison read off LABELS (the run plan's Task 5, amended 2026-10-02). Pure: every rule
 * here is unit-tested with no database. `rankStandIns` calls it only for a pair where BOTH cards carry a
 * fresh label (Q1); every other pair is compared by text, exactly as before.
 */
import type { DeckLens } from "../swaps/honest";
import { ROLES, type Job, type LabelKey, type Method } from "./types";

/** A job's identity for sharing: ramp by its kind (E1), every other job by its name. */
export function keyOf(job: Job): LabelKey | "land" | null {
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
  return alternatives(r).some((a) => relevantTo(a, deck, isCreatureType));
}

/**
 * A creature type, including one of more than one word ("Time Lord"): the catalog's type list is read off
 * the type line word by word (`loadCreatureTypes`), so a multi-word type is known by its words.
 */
const isCreatureTypeName = (w: string, isCreatureType: (w: string) => boolean) =>
  typeWords(w).every((t) => isCreatureType(t));

/**
 * A type's words in the catalog's case: the catalog prints "Goblin", while the scorer, like the gate, reads
 * a restriction without case, so a "goblin" the model wrote is the same restriction.
 */
const typeWords = (w: string) => w.trim().split(/\s+/).map((t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());

/**
 * A restriction's alternatives: the prompt joins two types with "or" ("Dwarf or Vehicle"), and the
 * job reaches either, so each is read on its own.
 */
const alternatives = (r: string) => r.split(/\s+or\s+/i).map((a) => a.trim()).filter(Boolean);

function relevantTo(r: string, deck: DeckLens | null, isCreatureType: (w: string) => boolean): boolean {
  if (CARD_TYPES.has(cardType(r))) return deck !== null && deck.heldTypes.has(cardType(r));
  // A deck's key type is read word by word too (`keyCreatureType`), so "Time Lord" is the key of a deck
  // keyed on either of its words.
  if (isCreatureTypeName(r, isCreatureType)) return deck !== null && deck.keyType !== null && typeWords(r).includes(deck.keyType);
  if (deck !== null && deck.isSubtype(r)) return deck.held.has(r);
  return true;
}

/**
 * A job's place for sharing: its SPACE and its key. The space is part of it because `draw` is both a role
 * (it draws you cards) and a theme (it rewards drawing), and the two are different jobs; keyed by the bare
 * name they merge, and a role draw is filed and worded as the theme.
 */
export type JobRef = { space: "role" | "theme"; key: LabelKey };
const refOf = (id: string): JobRef => {
  const at = id.indexOf(":");
  return { space: id.slice(0, at) as JobRef["space"], key: id.slice(at + 1) as LabelKey };
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

/**
 * Which restrictions are BROADER than which: a stand-in's target may be broader than or equal to the
 * original's, never narrower (#1146). Each entry says what one broad value covers besides itself. A
 * permanent covers every permanent type and every subtype; a creature covers its creature types; a
 * spell covers everything but a player. A player is its own branch, covering only itself. Any other
 * value covers only itself.
 */
const NOT_PERMANENT = new Set(["player", "spell", "instant", "sorcery"]);
const COVERS: Record<string, (narrow: string, isCreatureType: (w: string) => boolean) => boolean> = {
  permanent: (n) => !NOT_PERMANENT.has(cardType(n)),
  creature: (n, isCreatureType) => isCreatureTypeName(n, isCreatureType),
  spell: (n) => cardType(n) !== "player",
};

/** Whether a restriction alternative `broad` reaches everything `narrow` does. */
export function covers(broad: string, narrow: string, isCreatureType: (w: string) => boolean): boolean {
  const b = cardType(broad), n = cardType(narrow);
  // `narrow` goes to the entry as written: a creature type is read with its own case ("Time Lord").
  return b === n || (COVERS[b]?.(narrow.trim(), isCreatureType) ?? false);
}

/** The GATES: a mismatch means the candidate's job does not keep the original's. */
function passes(orig: Job, cand: Job, isCreatureType: (w: string) => boolean): boolean {
  if ((orig.affects ?? null) !== (cand.affects ?? null)) return false;
  if (orig.to !== null && cand.to !== null && orig.to !== cand.to) return false;
  if (pointsAtOpponents(orig) && cand.restrictedTo !== null) {
    // Never narrower: every alternative the original reaches, some alternative of the stand-in covers.
    const reach = alternatives(cand.restrictedTo);
    if (orig.restrictedTo === null
      || !alternatives(orig.restrictedTo).every((n) => reach.some((b) => covers(b, n, isCreatureType)))) return false;
  }
  return true;
}

/** The answers that leave the permanent gone for good: a stand-in that keeps the removal but not one of these names it (Q3). */
const PERMANENT_ANSWERS: readonly Method[] = ["destroy", "exile", "sacrifice", "bottom"];

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
    // EVERY pair that passes the gates, not one best pair: a key can carry several jobs (a card that both
    // destroys and exiles), and the row has to say what the candidate keeps across all of them.
    const pairs = origJobs.flatMap((o) => (cand.get(key) ?? []).filter((c) => passes(o, c, isCreatureType)).map((c) => ({ o, c })));
    if (pairs.length === 0) { missing.push(refOf(key)); continue; }
    shared.push(refOf(key));
    // A permanent answer the original gives is lost when no kept candidate job gives the same one. A candidate
    // with no method keeps no permanent answer either: null is a loss, never a match.
    const kept = new Set(pairs.map((p) => p.c.method));
    const lost = [...new Set(pairs.map((p) => p.o.method))]
      .filter((m): m is Method => m !== null && PERMANENT_ANSWERS.includes(m) && !kept.has(m));
    for (const m of lost) if (!lostMethods.includes(m)) lostMethods.push(m);
    const timing = Math.min(...pairs.map((p) => Number(p.o.trigger !== p.c.trigger || p.o.recurrence !== p.c.recurrence)));
    advisory += timing + Number(lost.length > 0);
    // Kept plainly if ANY passing candidate job is not a modal alternative, whatever order they are listed in.
    if (pairs.some((p) => !p.c.modal)) plain += 1; else modal += 1;
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
