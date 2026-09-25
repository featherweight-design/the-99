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
   * The deck's live locks (Locked, D6): locking a card on an unchanged list reopens the gate, since
   * it changes what a run may suggest. Joins the hash ONLY when non-empty, so a deck with no locks
   * hashes exactly as before and no gate in production reopens for a feature switched off there.
   */
  locks?: readonly string[];
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
    }))
    .digest("hex");
}
