import { createHash } from "node:crypto";

/**
 * A list's fingerprint, apart from the deck profile (`profile/fingerprint.ts`, which builds its cache key from the same
 * body) so a module that may not reach `src/lib/profile/` (the public loaders, `check:public-reads`) can compare a stored
 * precon Overview's `list_fingerprint` to the list it holds now. Pure: a hash of what it is handed, no table, no reader.
 */

/**
 * The player's LIST alone — both commander columns and the (oracleId, quantity) pairs — with
 * no version in it.
 *
 * `profileFingerprint` is a CACHE KEY, and a cache key must move when the code computing the
 * cached thing changes, so it carries PROFILE_VERSION. That makes it the wrong answer to "has
 * the player changed this deck": a deploy that bumps the version (1 → 3 over 2026-09-20/21)
 * reads as an edit on every deck. Hugh ruled on 2026-09-23 that only the player's own edits
 * count as drift. A drift question should read this one, and compare a version bump as its
 * own stored column where it needs to know about one. `deck_profiles.fingerprint` stores it
 * (analysis tab C1), with the version kept as its own column, so a bump rebuilds a stored reading
 * quietly rather than making it stale.
 *
 * A separate function rather than a flag on the other, so no caller can pass the wrong
 * argument. Same input shape, so a `ProfileHead` passes to either. SERVER-ONLY, like the
 * other.
 */
export function listFingerprint(input: ListInput): string {
  return hash(listBody(input));
}

export type ListInput = {
  commanderOracleId: string;
  partnerOracleId: string | null;
  cards: readonly { oracleId: string; quantity: number }[];
};

export function listBody(input: ListInput) {
  // Sorted, so row order out of the database cannot move the hash. Two decks with the same
  // contents must fingerprint the same however Postgres happened to return them.
  const rows = [...input.cards]
    .sort((a, b) => (a.oracleId < b.oracleId ? -1 : a.oracleId > b.oracleId ? 1 : 0))
    .map((c) => [c.oracleId, c.quantity] as const);
  return { commander: input.commanderOracleId, partner: input.partnerOracleId, cards: rows };
}

export function hash(body: object): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}
