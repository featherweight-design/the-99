"use client";

// The draw fields `/collection`'s page withheld (list payload plan, PR 4): the art, the facts and
// the combo partners ship for the URL's first window only, and the rest arrive from
// `/api/collection-fields` through the shared loop in `ui/use-withheld-fields.ts`, which holds the
// rules. Keyed by oracle id. A fetched field sits UNDER the row's own, so a printing the reader
// picked keeps its art over the one the batch brought.
import { useMemo } from "react";
import type { BrowseListCard } from "../../lib/collection/browse";
import { MAX_COLLECTION_FIELDS_BATCH } from "../../lib/collection/fields-batch";
import { isCollectionDrawn, type CollectionRow } from "../../lib/collection/list-wire";
import { useWithheldFields, type FieldsSource } from "../ui/use-withheld-fields";


/**
 * `served` is the list the page decoded, and the fields are held against IT: the rows the browser
 * windows are that list with the reader's printing picks laid over, a new array on every pick,
 * and keying the store on those would drop every fetched field at each one.
 */
export function useCollectionFields(
  served: CollectionRow[],
  wanted: CollectionRow[],
  onStale?: () => void,
  version?: string,
) {
  // Every batch names the version of the list the page served, so the route can refuse one it
  // would have to answer from a list rebuilt since, rather than mix two versions in one row.
  const source = useMemo<FieldsSource<CollectionRow>>(
    () => ({
      keyOf: (row) => row.oracleId,
      isDrawn: isCollectionDrawn,
      maxBatch: MAX_COLLECTION_FIELDS_BATCH,
      url: (ids) =>
        `/api/collection-fields?ids=${ids.map(encodeURIComponent).join(",")}${version ? `&v=${encodeURIComponent(version)}` : ""}`,
    }),
    [version],
  );
  return useWithheldFields<CollectionRow, BrowseListCard>(source, served, wanted, onStale);
}
