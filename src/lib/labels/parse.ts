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
 *
 * Names are compared FOLDED (`foldName`), because a model retypes a name rather than copying
 * its code points: asked for `Ratonhnhaké꞉ton` (U+A789, a modifier-letter colon), it answered
 * `Ratonhnhaké:ton` (U+003A), and the card's batch came back under the publish floor on every
 * run (the v8 relabel, 2026-10-04). The fold only decides which asked name is meant; the
 * name returned is always the asked one.
 */
export function faceResolver(asked: readonly string[]): (returned: unknown) => string | null {
  const exact = new Map(asked.map((name) => [foldName(name), name]));
  // Each FACE of a two-faced name maps back to the joined name. Built once per batch
  // rather than per returned card: the batch is 12 cards and the model may return more.
  const faceOf = new Map<string, string>();
  for (const name of asked) {
    if (!name.includes(" // ")) continue;
    // An exact asked-for name always wins over being some other card's face — the
    // returned lambda checks `exact` before `faceOf`, so that precedence is in the lookup
    // rather than in this loop. A `continue` here for a face that is also a whole name
    // would be unreachable by effect, which is what an earlier version had.
    for (const face of name.split(" // ")) faceOf.set(foldName(face), name);
  }
  // `returned` is model output: a non-string name is recorded as unexpected, never folded.
  return (returned: unknown) => {
    if (typeof returned !== "string") return null;
    const key = foldName(returned);
    return exact.get(key) ?? faceOf.get(key) ?? null;
  };
}

/** Compatibility-normalized (NFKC), with the modifier-letter colon read as a colon. */
export function foldName(name: string): string {
  return name.normalize("NFKC").replace(/\uA789/g, ":");
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
 * One card's returned jobs, screened as the stored labels are: each is normalized (`normalizeJob`
 * strips a misplaced `to` or `method`, and a threshold with no number or an unknown stat), then
 * validated, and a job that still fails is dropped and returned with its problems. The build and
 * the sample collector both screen through this, so a sample scores the same screen the labels
 * are written through.
 */
export function screenJobs(jobs: readonly unknown[]): {
  kept: Job[]; rejected: { kind: unknown; problems: string[] }[];
} {
  const kept: Job[] = [];
  const rejected: { kind: unknown; problems: string[] }[] = [];
  for (const raw of jobs) {
    const j = normalizeJob(raw);
    const problems = validateJob(j);
    if (problems.length) rejected.push({ kind: (j as { kind?: unknown } | null)?.kind, problems });
    else kept.push(j as Job);
  }
  return { kept, rejected };
}

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
    const screened = screenJobs(card.jobs);
    for (const r of screened.rejected) rejected.push(`${name}: ${r.problems.join(", ")}`);
    const kept = screened.kept;
    // Two faces of one card come back as two entries and resolve to one name, so they merge.
    byName.set(name, withoutRepeats([...(byName.get(name) ?? []), ...kept]));
  }
  return { byName, rejected };
}

/** One card a request asked about, in its key order: what a keyed reply is matched against. `name` is
 *  the name the request sent, or undefined when it is not known (the card moved since), which skips
 *  the name check for that card. */
export type AskedCard = { oracleId: string; name: string | undefined };

/** A key as the model wrote it: `"3"`, `3`, or `"key: 3"`. Null for anything else. */
function readKey(raw: unknown): string | null {
  if (typeof raw === "number") return Number.isInteger(raw) ? String(raw) : null;
  if (typeof raw !== "string") return null;
  const key = raw.trim().replace(/^key:\s*/i, "");
  return key === "" ? null : key;
}

/**
 * One reply's text, read into the jobs it gives each card BY ORACLE ID, matched on the `"key"` each
 * object echoes (prompt version 9, `cardKey`): `asked[i]` was sent under key `i + 1`. Null when the
 * reply is not a JSON array at all, which the build records as unparseable.
 *
 * Matched by key rather than by name because two oracle rows can share a name, and a name cannot
 * say which of them an answer is for. Every refusal below is recorded, never guessed: the card comes
 * back short, and the batch's floor judges the shortfall as it judges any other.
 * - An object with NO key, or a key the request never sent, is refused.
 * - The name is READ as a check, not a lookup: a name that resolves (by face, as `readReply`
 *   resolves it) to anything other than the keyed card is two answers crossed, and refused. A name
 *   that is absent, null or not a string is no name, and is not checked. Nor is a card whose `name`
 *   is unknown (it moved since it was asked, and is judged moved by the caller).
 * - A SECOND object under one key merges only as two FACES of a two-faced card: the asked name has
 *   " // ", and each object names a different one of its faces. Anything else under a repeated key
 *   (a single-faced card answered twice, the joined name twice, a nameless repeat) is refused.
 *
 * Screening is `readReply`'s: each job normalized and validated, a missing or non-array `jobs`
 * recorded rather than read as `[]`.
 */
export function readKeyedReply(text: string, asked: readonly AskedCard[]): {
  byId: Map<string, Job[]>; rejected: string[];
} | null {
  const parsed = parseReply(text);
  if (!Array.isArray(parsed)) return null;
  const resolveName = faceResolver(asked.flatMap((a) => (a.name === undefined ? [] : [a.name])));
  const byId = new Map<string, Job[]>();
  /** Per key: the folded names its accepted objects gave, to tell two faces from one answer twice. */
  const named = new Map<string, string[]>();
  const rejected: string[] = [];
  for (const card of parsed as { key?: unknown; name?: unknown; jobs?: unknown }[]) {
    if (card === null || typeof card !== "object") { rejected.push("an answer that is not an object"); continue; }
    const name = typeof card.name === "string" ? card.name : undefined;
    const label = name ?? "none";
    const key = readKey(card.key);
    if (key === null) { rejected.push(`missing key (name ${label})`); continue; }
    const index = /^[1-9][0-9]*$/.test(key) ? Number(key) - 1 : -1;
    const target = index >= 0 && index < asked.length ? asked[index] : undefined;
    if (target === undefined) { rejected.push(`unknown key ${key} (name ${label})`); continue; }
    if (name !== undefined && target.name !== undefined && resolveName(name) !== target.name) {
      rejected.push(`key ${key} is ${target.name}, but its answer names ${name}`);
      continue;
    }
    const before = named.get(key);
    if (before !== undefined) {
      const faces = target.name?.includes(" // ") ? target.name.split(" // ").map(foldName) : [];
      const face = name === undefined ? undefined : foldName(name);
      const distinctFaces = face !== undefined && faces.includes(face) && !before.includes(face)
        && before.every((b) => faces.includes(b));
      if (!distinctFaces) { rejected.push(`key ${key} answered twice (name ${label})`); continue; }
    }
    if (!Array.isArray(card.jobs)) { rejected.push(`key ${key}: jobs is not an array`); continue; }
    named.set(key, [...(before ?? []), name === undefined ? "" : foldName(name)]);
    const screened = screenJobs(card.jobs);
    for (const r of screened.rejected) rejected.push(`key ${key}: ${r.problems.join(", ")}`);
    byId.set(target.oracleId, withoutRepeats([...(byId.get(target.oracleId) ?? []), ...screened.kept]));
  }
  return { byId, rejected };
}
