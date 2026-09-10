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
  for (const oracleId of new Set([...before.keys(), ...after.keys()])) {
    const from = before.get(oracleId) ?? 0;
    const to = after.get(oracleId) ?? 0;
    if (to > from) adds.push({ oracleId, from, to });
    else if (to < from) removes.push({ oracleId, from, to });
  }
  return { adds, removes };
}

/** Which of the three answers an added card gets. */
export type AddBucket = "free" | "claimed" | "unowned";

export type BucketedAdd = {
  oracleId: string;
  /** The DELTA, never the whole ask — this figure feeds a price total. */
  needed: number;
  bucket: AddBucket;
  /** Decks whose committed version holds a copy. Empty unless `claimed`. */
  heldBy: { id: string; name: string }[];
};

/**
 * Split the adds three ways: have it free, have it but another deck has it
 * sleeved, do not have it at all.
 *
 * The middle bucket is the whole point. A card owned but spoken for is the one
 * case where there is something to offer — a named deck and a pull — and
 * collapsing it into "buy this" is exactly what the manual workaround does.
 *
 * A partially covered add is `claimed`, not `free`: one free copy against an
 * ask of five still sends the player shopping, and calling it free would hide
 * a purchase behind a satisfied-looking row.
 */
export function bucketAdds(
  adds: DraftChange[],
  availability: Map<string, { free: number; claims: { id: string; name: string }[] }>,
): BucketedAdd[] {
  return adds.map((change) => {
    const needed = change.to - change.from;
    const entry = availability.get(change.oracleId);
    if (!entry) {
      return { oracleId: change.oracleId, needed, bucket: "unowned" as const, heldBy: [] };
    }
    if (entry.free >= needed) {
      return { oracleId: change.oracleId, needed, bucket: "free" as const, heldBy: [] };
    }
    return {
      oracleId: change.oracleId,
      needed,
      bucket: entry.claims.length > 0 ? ("claimed" as const) : ("unowned" as const),
      heldBy: entry.claims,
    };
  });
}
