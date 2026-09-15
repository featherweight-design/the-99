// What the draft changed, and what each change will cost.
//
// Pure by design: this is the function the whole feature's correctness rests
// on, and the claim model it reasons about is raw SQL that cannot be unit
// tested in this repository. Keeping the arithmetic here, with no database in
// the way, is what makes any of it provable.

export type CardQty = { oracleId: string; quantity: number };

/** One card whose count differs between the draft and the newest version. */
export type DraftChange = { oracleId: string; from: number; to: number };

export type DraftDiff = { adds: DraftChange[]; removes: DraftChange[] };

/**
 * The draft against the version it will replace.
 *
 * A quantity change is ONE change, filed by its direction. A deck going from
 * one copy to three has bought two; reporting that as a remove of one and an
 * add of three would put the card on the pull list and the buy list at once,
 * and the player would pull a card they are about to sleeve again.
 */
export function draftDiff(draft: CardQty[], version: CardQty[]): DraftDiff {
  const before = new Map(version.map((c) => [c.oracleId, c.quantity]));
  const after = new Map(draft.map((c) => [c.oracleId, c.quantity]));
  const adds: DraftChange[] = [];
  const removes: DraftChange[] = [];
  // Sorted, because both inputs come from selects with no `order by`: without
  // this the two lists come back in whatever order the rows happened to arrive
  // in, and a receipt the player reads twice reads differently each time.
  const oracleIds = [...new Set([...before.keys(), ...after.keys()])].sort();
  for (const oracleId of oracleIds) {
    const from = before.get(oracleId) ?? 0;
    const to = after.get(oracleId) ?? 0;
    if (to > from) adds.push({ oracleId, from, to });
    else if (to < from) removes.push({ oracleId, from, to });
  }
  return { adds, removes };
}

/** Which answer an added card gets. */
export type AddBucket = "free" | "claimed" | "unowned" | "proxied";

export type BucketedAdd = {
  oracleId: string;
  /** The DELTA the draft added, never the draft's whole ask. */
  needed: number;
  /**
   * Copies the player must actually obtain: the delta less whatever is free.
   * This — not `needed` — is what a price total multiplies. One free copy
   * against an ask of five is a purchase of four, and charging for five would
   * quote a card the player already has on the table.
   */
  shortfall: number;
  bucket: AddBucket;
  /**
   * The decks the caller passed as claimants. Empty unless `claimed`.
   *
   * Whose claims those are is the caller's choice and it decides this bucket:
   * every caller here passes `pullSources`, so a card held only by decks a pull
   * could not relieve the shortfall from is `unowned` rather than `claimed`.
   * Passing `hardDecks` instead would offer a pull that empties another deck's
   * slot and leaves the figure where it was.
   */
  heldBy: { id: string; name: string }[];
};

/**
 * Split the adds three ways: covered by free copies, owned but sleeved in a
 * named deck, or on the player's own hook for the shortfall.
 *
 * `unowned` is the last of those, and it does NOT mean zero copies owned: a
 * player with one copy adding four is short three with nobody to ask, which is
 * the same errand as owning none. Read it as "nothing to offer here", never as
 * a count, and do not write copy that tells the player they own none.
 *
 * The middle bucket is the whole point. A card owned but spoken for is the one
 * case where there is something to offer — a named deck and a pull — and
 * collapsing it into "buy this" is exactly what the manual workaround does.
 *
 * A partially covered add is `claimed`, not `free`: one free copy against an
 * ask of five still sends the player shopping, and calling it free would hide
 * a purchase behind a satisfied-looking row.
 *
 * `basics` is answered before the map is consulted at all, and that order is the
 * point. A basic land is never asked about, so it has no entry — and an add with
 * no entry is `unowned`, which would put ten Forests on a shopping list. The
 * whole application already treats a basic as unlimited; saying so here makes it
 * a free add on every surface that reads a bucket, including the one surface
 * where the claim read FAILED. A failed read states nothing about a Swamp.
 */
export function bucketAdds(
  adds: DraftChange[],
  availability: Map<string, { free: number; claims: { id: string; name: string }[] }>,
  basics: ReadonlySet<string> = new Set(),
  /**
   * The cards this deck prints, answered BEFORE the map like `basics` is, and
   * for a sharper version of the same reason: a proxied add usually has no
   * availability entry at all, so it would fall through to `unowned` and be
   * priced.
   *
   * It is not `free` either, and that distinction is the whole bucket. `free`
   * means the collection has a spare copy for this; saying that about a printed
   * card asserts a copy in a box, on the one surface whose job is telling a
   * player what a commit will cost them.
   */
  proxied: ReadonlySet<string> = new Set(),
): BucketedAdd[] {
  return adds.map((change) => {
    const needed = change.to - change.from;
    if (proxied.has(change.oracleId)) {
      return {
        oracleId: change.oracleId, needed, shortfall: 0,
        bucket: "proxied" as const, heldBy: [],
      };
    }
    if (basics.has(change.oracleId)) {
      return {
        oracleId: change.oracleId, needed, shortfall: 0,
        bucket: "free" as const, heldBy: [],
      };
    }
    const entry = availability.get(change.oracleId);
    if (!entry) {
      return {
        oracleId: change.oracleId, needed, shortfall: needed,
        bucket: "unowned" as const, heldBy: [],
      };
    }
    // `free >= 0`, not `free >= needed`. `free` is this deck's SURPLUS with its
    // whole draft ask — this change included — already subtracted, so a
    // non-negative figure means the collection covers the add and every other
    // copy this list wants. Testing it against `needed` would subtract the delta
    // a second time and call a covered add short.
    if (entry.free >= 0) {
      return {
        oracleId: change.oracleId, needed, shortfall: 0,
        bucket: "free" as const, heldBy: [],
      };
    }
    // Capped at `needed`, because the deficit is over the whole ask while this
    // receipt is about this change. A deck going 1 → 2 whose single copy is
    // sleeved senior elsewhere is two copies short in total and one copy short
    // BY THIS EDIT, and the copy its version already owed is not this commit's
    // purchase to quote.
    return {
      oracleId: change.oracleId,
      needed,
      shortfall: Math.min(needed, -entry.free),
      bucket: entry.claims.length > 0 ? ("claimed" as const) : ("unowned" as const),
      heldBy: entry.claims,
    };
  });
}
