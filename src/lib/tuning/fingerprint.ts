import { createHash } from "node:crypto";

/**
 * Whether anything THE PLAYER did has changed since the last successful run. SERVER-ONLY:
 * `node:crypto`, as `src/lib/profile/fingerprint.ts`.
 *
 * Only the player's own changes are in the hash (Hugh, 2026-09-23): the list, the games and
 * their notes, the intent, and the collection. NO VERSION is in it. `PROMPT_VERSION` and
 * `PROFILE_VERSION` are stored on each run as their own columns, and a bump reopens the gate
 * under its own reason rather than telling a player their deck changed when it did not.
 *
 * The list half is `listFingerprint`'s answer, not a second hash of the decklist, so "the deck
 * changed" has one definition. The catalog generation is out, as it is from the profile's: a
 * weekly refresh that moves the staples does not reopen the gate on its own.
 */
export type FingerprintInput = {
  /** `listFingerprint(head)` — the player's list. */
  list: string;
  games: readonly {
    id: string;
    result: string;
    podSize: number;
    worked: readonly string[];
    hurt: readonly string[];
    note: string | null;
  }[];
  intent: string | null;
  /** The newest confirmed collection upload's `confirmed_at` (ISO), or null. `import.ts` is
   *  the only writer of `collection_items`, and the app's replace — `confirmUpload` — stamps
   *  it. The developer seed script (`pnpm db:seed:collection`) replaces without an upload row,
   *  so a seeded collection does not move this; a fixture account is the only reader of that. */
  collection: string | null;
  /**
   * The newest `collection_history.seq` for the reader: it moves on EVERY collection write, which
   * `collection` (an upload's `confirmed_at`) does not. Joins the hash for an owned-only deck alone,
   * because only its answer depends on which cards the player owns; every other deck hashes as before.
   */
  collectionSeq?: number | null;
  /**
   * The deck's live locks (Locked, D6): locking a card on an unchanged list reopens the gate, since
   * it changes what a run may suggest. Joins the hash ONLY when non-empty, so a deck with no locks
   * hashes exactly as before and no gate in production reopens for a feature switched off there.
   */
  locks?: readonly string[];
  /**
   * "Kept for this deck" (H35, PR 2): a limit change must reopen the gate, same as an edit to the
   * list does — a run against the old cap/sets/owned-only answers a question the player no
   * longer asked. Unconditional, like `intent` and `collection`: every deck gets this field the
   * day it ships, so every gate reopens once on deploy — the same one-time "changed" a
   * `PROMPT_VERSION` bump already causes deliberately, not a bug to guard against.
   */
  limits: { capCents: number | null; sets: readonly string[]; ownedOnly: boolean };
};

const byteOrder = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function tuningFingerprint(input: FingerprintInput): string {
  // Byte order, as listFingerprint sorts, so the two hash the same on every runtime.
  const games = [...input.games]
    .sort((a, b) => byteOrder(a.id, b.id))
    .map((g) => [
      g.id, g.result, g.podSize,
      [...g.worked].sort(byteOrder).join(","), [...g.hurt].sort(byteOrder).join(","),
      g.note ?? "",
    ]);
  return createHash("sha256")
    .update(JSON.stringify({
      list: input.list,
      games,
      intent: input.intent ?? "",
      collection: input.collection ?? "",
      ...(input.locks && input.locks.length > 0 ? { locks: [...input.locks].sort(byteOrder) } : {}),
      limits: {
        capCents: input.limits.capCents,
        sets: [...input.limits.sets].sort(byteOrder),
        ownedOnly: input.limits.ownedOnly,
      },
      // The owned shortlist (a run's prompt shows an owned-only run the cards it owns, 2026-10-11)
      // changes what an owned-only deck's answer is, and `PROMPT_VERSION` would reopen EVERY deck's
      // gate for a prompt only these send. So it joins the hash for them alone: an owned-only deck
      // reads as changed once, and every other deck hashes exactly as before.
      ...(input.limits.ownedOnly ? { ownedShortlist: 1, collectionSeq: input.collectionSeq ?? null } : {}),
    }))
    .digest("hex");
}
