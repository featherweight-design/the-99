"use client";

// The draw fields `/collection`'s page withheld (list payload plan, PR 4): the art, the facts and
// the combo partners ship for the URL's first window only, and the rest arrive from
// `/api/collection-fields` through the shared loop in `ui/use-withheld-fields.ts`, which holds the
// rules. Keyed by oracle id. A fetched field sits UNDER the row's own, so a printing the reader
// picked keeps its art over the one the batch brought.
import { useCallback } from "react";
import type { BrowseListCard } from "../../lib/collection/browse";
import { MAX_COLLECTION_FIELDS_BATCH } from "../../lib/collection/fields-batch";
import { isCollectionDrawn, type CollectionDrawFields, type CollectionRow } from "../../lib/collection/list-wire";
import { useWithheldFields, type FieldsSource } from "../ui/use-withheld-fields";

const SOURCE: FieldsSource<CollectionRow> = {
  keyOf: (row) => row.oracleId,
  isDrawn: isCollectionDrawn,
  maxBatch: MAX_COLLECTION_FIELDS_BATCH,
  url: (ids) => `/api/collection-fields?ids=${ids.map(encodeURIComponent).join(",")}`,
  // A batch whose caption differs from the row's: the printing was picked again since the page was
  // read, on another device, so the row's printed name and set code, which search and the sorts
  // read, are out of date, and the page is read once more. A row holding its own art holds the
  // caption of a pick made here, which the batch read off the same printing.
  disagrees: (row, fields) => {
    const art = (fields as CollectionDrawFields).art;
    return (
      art !== undefined &&
      !Object.hasOwn(row, "imageUri") &&
      (art.printedName !== row.printedName || art.primarySetCode !== row.primarySetCode || art.foil !== row.foil)
    );
  },
};

/**
 * `served` is the list the page decoded, and the fields are held against IT: the rows the browser
 * windows are that list with the reader's printing picks laid over, a new array on every pick,
 * and keying the store on those would drop every fetched field at each one.
 */
export function useCollectionFields(served: CollectionRow[], wanted: CollectionRow[], onStale?: () => void) {
  const { resolve: under } = useWithheldFields<CollectionRow, BrowseListCard & Pick<CollectionDrawFields, "art">>(
    SOURCE,
    served,
    wanted,
    onStale,
  );
  // The art and its caption are drawn from ONE read. A withheld row's art comes from the batch,
  // so its printed name and set code do too, which the batch read off the same printing; the
  // page's copies may describe a printing picked away since, on another device. A row that holds
  // its own art (a pick made here, which lays all three over the row) keeps its own caption.
  const resolve = useCallback(
    (row: CollectionRow): BrowseListCard | null => {
      const card = under(row);
      if (!card || !("art" in card)) return card;
      const { art, ...rest } = card;
      // `foil` named outright: the batch omits it when there is no film, and a spread would keep the
      // page's stale one over the batch's art.
      return Object.hasOwn(row, "imageUri") || !art ? rest : { ...rest, ...art, foil: art.foil };
    },
    [under],
  );
  return { resolve };
}
