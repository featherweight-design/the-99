// The printing the player owns, for any surface that draws a card they hold.
//
// `cards.image_uri` and `cards.art_crop_uri` are ORACLE-LEVEL — one arbitrary printing per
// card — so every surface reading them alone draws art that may not be on the card in the
// player's box. This is the one place that answers "which printing is theirs", for the deck
// surfaces and the commander lists alike.
import { aggregateCollection, resolvedPrinting } from "./browse";
import { selectCollectionRows } from "./browse-read";
import { recordSoftFailure } from "../cache/soft-failure";

/** One printing as the player owns it — the art and the name that belong together. */
export type OwnedPrinting = {
  /** Copies owned across EVERY printing of the card, not this one's. */
  quantity: number;
  printedName: string | null;
  imageUri: string | null;
  artCropUri: string | null;
  setCode: string;
  collectorNumber: string;
};

/**
 * The printing the player actually owns for each of these oracle ids, keyed by id.
 *
 * Reusing the collection reader rather than joining `printings` here is deliberate — the
 * art must follow the SAME printing the art preference picks, and `aggregateCollection`
 * is where that precedence lives. A card the player does not own is simply absent from
 * the map, since `selectCollectionRows` is rooted in `collection_items`.
 *
 * Swallowed, like the availability rollup beside its callers: the deck is the deck. A
 * failed lookup leaves every figure on its oracle-level value, which is exactly the
 * rendering that shipped before this existed.
 */
export async function resolveOwnedPrintings(
  userId: string,
  oracleIds: string[],
): Promise<Map<string, OwnedPrinting>> {
  return readOwnedPrintings(userId, oracleIds).catch(() => {
    recordSoftFailure();
    return new Map<string, OwnedPrinting>();
  });
}

/**
 * The same read, and it THROWS on a failed read rather than answering "owns nothing".
 *
 * For a caller that states ownership itself: the version diff's rows (H31) draw a "not owned"
 * dot and a buy tag from `quantity`, so an empty map there would claim the reader owns none of
 * the cards rather than fall back to oracle-level art. That caller lets the failure reach its
 * own unavailable state instead.
 */
export async function readOwnedPrintings(
  userId: string,
  oracleIds: string[],
): Promise<Map<string, OwnedPrinting>> {
  const resolved = new Map<string, OwnedPrinting>();
  // Never an empty `inArray`: a SQL error in some drivers and a full scan in others.
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return resolved;
  const owned = aggregateCollection(await selectCollectionRows(userId, ids));
  for (const c of owned) {
    const p = resolvedPrinting(c);
    if (p) {
      resolved.set(c.oracleId, {
        quantity: c.quantity,
        printedName: c.printedName,
        imageUri: p.imageUri,
        // `?? null` rather than left optional: `BrowsePrinting.artCropUri` is optional so
        // the suite's fixtures need not carry it, and absent means what null does — fall
        // back to the oracle-level crop.
        artCropUri: p.artCropUri ?? null,
        setCode: p.setCode,
        collectorNumber: p.collectorNumber,
      });
    }
  }
  return resolved;
}

/**
 * The same rows back, each drawn from the copy the player owns.
 *
 * AN EXPLICIT STEP AT THE DRAW, never inside a shared loader. `getRankedList` has five
 * callers and only two of them draw a card: the others resolve a slug, count a zero state,
 * or feed a ranking. Putting this inside it made all five pay a
 * `collection_items × printings × sets` join over every commander candidate — measured at
 * 56-104ms warm and 718ms cold for 243 ids on the reference account — so Home paid for 243
 * rows to draw nine. That is the same defect `includeCommanderArt` exists to prevent on
 * `listDecksWithStats`, and it was caught here by review rather than by measurement.
 *
 * Call it with the rows about to be RENDERED, which on Home is the ready slice and not the
 * whole ranking.
 *
 * Fail-soft through `resolveOwnedPrintings`: a failed lookup returns an empty map and every
 * row keeps the oracle-level art it arrived with.
 */
export async function withOwnedCardArt<
  T extends {
    oracleId: string;
    imageUri: string | null;
    artCropUri: string | null;
    printedName?: string | null;
  },
>(userId: string, rows: T[]): Promise<T[]> {
  if (rows.length === 0) return rows;
  const owned = await resolveOwnedPrintings(userId, rows.map((r) => r.oracleId));
  if (owned.size === 0) return rows;
  return rows.map((r) => {
    const own = owned.get(r.oracleId);
    if (!own) return r;
    return {
      ...r,
      imageUri: own.imageUri ?? r.imageUri,
      artCropUri: own.artCropUri ?? r.artCropUri,
      printedName: own.printedName,
    };
  });
}
