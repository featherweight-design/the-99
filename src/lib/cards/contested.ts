// The contested-card shapes (moved from `src/lib/collection/summary-read.ts`, split 5j): plain types, so the pure allocation
// arithmetic in `allocate.ts` does not depend on a per-user module. `summary-read.ts` re-exports them.

/** One committed deck's place in a contested card's queue. */
export type ContestedClaimant = {
  deckId: string;
  deckName: string;
  /** This deck's whole ask, commander copies included. */
  quantity: number;
  /** How many of that ask is a commander or partner — never reservable. */
  commanderCopies: number;
  /** Copies reserved to this deck by the player, as the claim model granted them. */
  granted: number;
  /** `deck_version_cards.since`, epoch millis. The order this list is in, and the stamp it draws. */
  since: number | null;
  versionNumber: number | null;
  /**
   * A brew (no committed version), which can be given a copy since 2026-10-11 but otherwise
   * claims softly. Absent or false for a committed deck. Carried rather than read off a null
   * `since`, because `since` is optional on a claim and its absence is not brewness.
   */
  brew?: boolean;
  /** How many copies this deck gets under the allocation as it currently stands. */
  allocated: number;
};

export type ContestedCard = {
  oracleId: string;
  cardName: string;
  /**
   * Copies this import brought. Frozen — it is a fact about the import, not about now.
   *
   * On a surface with no import behind it this is the supply instead, and `fromImport` is what
   * tells the row which it is holding. The two cannot share a word: `1 new copy` on a deck's own
   * review page tells the reader their collection turned up this morning.
   */
  arrived: number;
  /** True when `arrived` really is an arrival. False on the `/decks/[id]/changes` door. */
  fromImport: boolean;
  /** Copies held before it. Frozen too, and what `keeps it` is allowed to be said about. */
  ownedBefore: number;
  /** Copies the collection holds now. Live. */
  owned: number;
  claimants: ContestedClaimant[];
};
