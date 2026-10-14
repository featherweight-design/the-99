import type { TokenOwnership } from "./ownership";

/** What tells two tokens of one name apart on screen: the colors and the stats, never a suffix or a number. */
export type TokenFace = { name: string; colors: string[]; power: string | null; toughness: string | null };

/**
 * The key two tokens share when a reader could not tell them apart by name, pips and P/T (design
 * table, X6/X7). Colors are sorted so `["R","G"]` and `["G","R"]` are one face.
 */
export function tokenKey(t: TokenFace): string {
  return [t.name, [...t.colors].sort().join(""), t.power ?? "", t.toughness ?? ""].join("|");
}

/** Whether two tokens would read identically on a row: the same name, colors and P/T. */
export function sameFace(a: TokenFace, b: TokenFace): boolean {
  return tokenKey(a) === tokenKey(b);
}

/**
 * The oracle ids of the tokens that need their rules text shown because another token in the SAME
 * deck wears the same face (two red 1/1 Goblins, G4/X7). A token alone with its face never shows it.
 */
export function collidingTokenIds(tokens: (TokenFace & { oracleId: string })[]): Set<string> {
  const byKey = new Map<string, string[]>();
  for (const t of tokens) {
    const k = tokenKey(t);
    byKey.set(k, [...(byKey.get(k) ?? []), t.oracleId]);
  }
  const out = new Set<string>();
  for (const ids of byKey.values()) if (ids.length > 1) for (const id of ids) out.add(id);
  return out;
}

/**
 * What holds a token: an upload row, the player's own mark, or a precon added to the collection
 * (`syncPreconTokens`), which Revert of that add takes back.
 */
export type TokenSource = "upload" | "manual" | "precon";

/**
 * The state of one token for one reader: held (and by what) first, then whether the account has been
 * read at all. A hand mark is `owned` whether or not any upload has run; "not owned" needs a read.
 */
export function tokenState(
  held: TokenSource | null,
  read: boolean,
): { state: TokenOwnership; source: TokenSource | null } {
  if (held) return { state: "owned", source: held };
  return { state: read ? "not" : "unknown", source: null };
}

/** Makers A to Z, case-insensitively, then by id so two cards of one name keep a stable order. */
export function sortMakers<T extends { name: string; oracleId: string }>(makers: T[]): T[] {
  return [...makers].sort((a, b) =>
    a.name.localeCompare(b.name, "en", { sensitivity: "base" }) || a.oracleId.localeCompare(b.oracleId));
}
