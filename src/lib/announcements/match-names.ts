/**
 * Maps card names read from a post onto catalog ids, given a name → id index the caller builds.
 *
 * Normalization reuses the repo's own two: `normalizeName` (case, curly apostrophes and quotes,
 * runs of space) and `normalizeCardName` (every `/`, `//`, `///` face separator, spaced or not, to
 * ` // `). On top, diacritics are folded on BOTH sides (`Dandân`, `Éowyn`, `Clavileño` as printed
 * in a post may meet a catalog spelled either way), and `æ` reads as `ae`.
 *
 * Lookup order for each name:
 * 1. the whole name;
 * 2. the catalog's front faces: `Brightclimb Pathway` finds `Brightclimb Pathway // Grimclimb
 *    Pathway`. Only a front face is indexed, never a back face, and a full name always wins over a
 *    front face that collides with it;
 * 3. the post name's own front face, for a post that spells the faces differently from the catalog;
 * 4. the name without a trailing parenthetical: posts tag duplicate copies by printing
 *    (`Sol Ring (Villains)`, `Ransom Note (Clues)`). Tried last, so a card whose real name ends in
 *    parentheses still matches whole.
 */
import { normalizeCardName } from "../collection/match";
import { normalizeName } from "../synopsis/facts";

export function nameKey(name: string): string {
  return normalizeCardName(normalizeName(name))
    .replace(/æ/g, "ae")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

export type NameMatch<Id> = { name: string; id: Id };
export type NameMatchResult<Id> = { matched: NameMatch<Id>[]; unmatched: string[] };

/**
 * Builds the lookup from catalog names. When two catalog names fold to one key, the first given
 * wins for a full name; a front face never displaces a full name.
 */
export function buildNameIndex<Id>(entries: Iterable<readonly [string, Id]>): Map<string, Id> {
  const full = new Map<string, Id>();
  const fronts: [string, Id][] = [];
  for (const [name, id] of entries) {
    const key = nameKey(name);
    if (!full.has(key)) full.set(key, id);
    const front = key.split(" // ")[0];
    if (front !== key) fronts.push([front, id]);
  }
  for (const [front, id] of fronts) if (!full.has(front)) full.set(front, id);
  return full;
}

export function matchCardName<Id>(name: string, index: ReadonlyMap<string, Id>): Id | null {
  const key = nameKey(name);
  const tries = [key, key.split(" // ")[0]];
  const bare = key.replace(/\s*\([^()]*\)$/, "");
  if (bare !== key && bare) tries.push(bare, bare.split(" // ")[0]);
  for (const k of tries) {
    const id = index.get(k);
    if (id !== undefined) return id;
  }
  return null;
}

/** Resolves every name, in order. Unmatched names are reported once each, as written in the post. */
export function matchCardNames<Id>(names: readonly string[], index: ReadonlyMap<string, Id>): NameMatchResult<Id> {
  const matched: NameMatch<Id>[] = [];
  const unmatched: string[] = [];
  const missed = new Set<string>();
  for (const name of names) {
    const id = matchCardName(name, index);
    if (id !== null) matched.push({ name, id });
    else if (!missed.has(name)) {
      missed.add(name);
      unmatched.push(name);
    }
  }
  return { matched, unmatched };
}
