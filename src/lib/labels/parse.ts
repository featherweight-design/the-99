/**
 * Reconciling what a model RETURNED against what a batch ASKED for.
 *
 * Two facts make this more than a lookup, and both were measured in the sample rather
 * than anticipated.
 *
 * **A two-faced card's name comes back split.** The catalog name is
 * `Soulcipher Board // Cipherbound Spirit`; Sonnet returned `Soulcipher Board` and
 * `Cipherbound Spirit` as separate entries while Haiku kept it joined. Left alone that
 * loses the card from the score entirely — it reads as "not returned" while the model
 * answered it. Reconciled by FACE, never by fuzzy match: a face is an exact segment of a
 * name this batch asked for, so nothing is guessed.
 *
 * **A name that is neither asked for nor a face of one is REFUSED.** An invented name
 * accepted here enters the label set, and `label-cards-agree` iterates one model's keys —
 * so a hallucination returned by both models would count as an agreeing card and move the
 * agreement denominator. Refusing keeps the denominator honest.
 */

import { normalizeJob, validateJob } from "./schema";
import type { Job } from "./types";

/**
 * A card's jobs with exact repeats dropped. Two abilities can earn one job with the same limits (two
 * clauses each giving tribal Elf), and two faces of one card are merged into one list; either way the
 * second copy says nothing the first did not, and a scorer would count it as a false positive. Jobs that
 * differ in ANY field are kept, so two abilities of one kind stay two jobs.
 */
export function withoutRepeats<T>(jobs: readonly T[]): T[] {
  const seen = new Set<string>();
  // A field written null and one left out say the same thing (`validateJob` accepts both for an optional
  // field such as `rampKind`), so neither enters the key; every other difference does.
  const sorted = (v: unknown): unknown =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort()
        .filter((k) => (v as Record<string, unknown>)[k] != null)
        .map((k) => [k, sorted((v as Record<string, unknown>)[k])]))
      : v;
  return jobs.filter((j) => {
    const key = JSON.stringify(sorted(j));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Resolves returned names to the catalog names a batch asked for.
 *
 * Returns `null` for a name the batch does not cover, which the caller records as
 * unexpected rather than inserting.
 */
export function faceResolver(asked: readonly string[]): (returned: string) => string | null {
  const exact = new Set(asked);
  // Each FACE of a two-faced name maps back to the joined name. Built once per batch
  // rather than per returned card: the batch is 12 cards and the model may return more.
  const faceOf = new Map<string, string>();
  for (const name of asked) {
    if (!name.includes(" // ")) continue;
    // An exact asked-for name always wins over being some other card's face — the
    // returned lambda checks `exact` before `faceOf`, so that precedence is in the lookup
    // rather than in this loop. A `continue` here for a face that is also a whole name
    // would be unreachable by effect, which is what an earlier version had.
    for (const face of name.split(" // ")) faceOf.set(face, name);
  }
  return (returned: string) => (exact.has(returned) ? returned : faceOf.get(returned) ?? null);
}

/** A model reply is data, not code: it may fence its JSON however it likes. */
export const parseReply = (text: string): unknown => {
  const t = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch { /* fall through to the bracket scan */ }
  const a = t.indexOf("["), b = t.lastIndexOf("]");
  if (a < 0 || b < a) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch { return null; }
};

/**
 * One reply's text, read into the jobs it gives each card it was asked about: parsed, each name
 * resolved by face against `asked`, each job repaired by `normalizeJob` and then validated. Null
 * when the reply is not a JSON array at all.
 *
 * Here rather than inside the build because it is pure: every rule it applies to a paid reply is
 * unit tested without a database or a provider.
 *
 * A missing or non-array `jobs` is NOT an empty answer, and is recorded rather than read as `[]`:
 * the gold set has hard negatives where `[]` is correct, so coercing malformed output to `[]`
 * credits it as right on exactly the cards designed to catch over-labelling. A rejected job is
 * dropped and recorded, one complaint per job.
 */
export function readReply(text: string, asked: readonly string[]): {
  byName: Map<string, Job[]>; rejected: string[];
} | null {
  const parsed = parseReply(text);
  if (!Array.isArray(parsed)) return null;
  const resolve = faceResolver(asked);
  const byName = new Map<string, Job[]>();
  const rejected: string[] = [];
  for (const card of parsed as { name?: string; jobs?: unknown }[]) {
    if (!card?.name) continue;
    const name = resolve(card.name);
    if (name === null) { rejected.push(`unexpected name ${card.name}`); continue; }
    if (!Array.isArray(card.jobs)) { rejected.push(`${name}: jobs is not an array`); continue; }
    const kept: Job[] = [];
    for (const raw of card.jobs) {
      const j = normalizeJob(raw);
      const bad = validateJob(j);
      if (bad.length) rejected.push(`${name}: ${bad.join(", ")}`);
      else kept.push(j as Job);
    }
    // Two faces of one card come back as two entries and resolve to one name, so they merge.
    byName.set(name, withoutRepeats([...(byName.get(name) ?? []), ...kept]));
  }
  return { byName, rejected };
}
