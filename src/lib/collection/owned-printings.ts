// The printing the player owns, for any surface that draws a card they hold.
//
// `cards.image_uri` and `cards.art_crop_uri` are ORACLE-LEVEL — one arbitrary printing per
// card — so every surface reading them alone draws art that may not be on the card in the
// player's box. This is the one place that answers "which printing is theirs", for the deck
// surfaces and the commander lists alike.
import { aggregateCollection, resolvedPrinting, selectCollectionRows } from "./browse";

/** One printing as the player owns it — the art and the name that belong together. */
export type OwnedPrinting = {
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
  const resolved = new Map<string, OwnedPrinting>();
  // Never an empty `inArray`: a SQL error in some drivers and a full scan in others.
  const ids = [...new Set(oracleIds)];
  if (ids.length === 0) return resolved;
  const owned = await selectCollectionRows(userId, ids)
    .then(aggregateCollection)
    .catch(() => []);
  for (const c of owned) {
    const p = resolvedPrinting(c);
    if (p) {
      resolved.set(c.oracleId, {
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
 * The name to caption a commander with: the one printed on the copy the player owns
 * where they own a renamed printing, the oracle name otherwise.
 *
 * `printedNameOf` in the collection reader is the same rule for a `BrowseCard`, whose
 * `printedName` is a required field. Every deck surface carries it OPTIONALLY — the
 * fixtures across the suite build commander literals that never touch the catalog — so
 * this is the one place that absence is read as null, rather than at nine call sites.
 */
export function commanderDisplayName(c: { name: string; printedName?: string | null }): string {
  return c.printedName ?? c.name;
}
