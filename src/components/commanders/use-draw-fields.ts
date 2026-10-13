"use client";

// The draw fields `/discover`'s page withheld (list payload plan, PR 3): the art, the sentence, the
// gap line and the fit parts ship for the URL's first window only, and the rest arrive from
// `/api/discovery-fields` through the shared loop in `ui/use-withheld-fields.ts`, which holds the
// rules. Keyed by slug; the ranking's sort AND role basis ride in the request, because `rank` and
// the fit figures belong to a ranking. The basis is the one the page's payload was counted by, never
// re-resolved by the route: an app-wide flip of LABEL_ROLE_COUNTS_ENABLED between the render and a
// batch would otherwise merge the other basis's figures into this ranking (admin PR 6d-2).
import { useMemo } from "react";
import { isDrawn, type DiscoveryRow } from "../../lib/discovery/encode";
import { MAX_FIELDS_BATCH } from "../../lib/discovery/fields-batch";
import type { DiscoveryItem } from "../../lib/discovery/list";
import type { RoleBasis } from "../../lib/profile/build";
import { useWithheldFields, type FieldsSource } from "../ui/use-withheld-fields";

type Sort = "fit" | "new";

export function useDrawFields(
  ranking: { sort: Sort; basis: RoleBasis },
  all: DiscoveryRow[],
  wanted: DiscoveryRow[],
  onStale: () => void = () => {},
) {
  const { sort, basis } = ranking;
  const source = useMemo<FieldsSource<DiscoveryRow>>(
    () => ({
      keyOf: (row) => row.slug,
      isDrawn,
      maxBatch: MAX_FIELDS_BATCH,
      url: (keys) => `/api/discovery-fields?sort=${sort}&b=${basis}&s=${keys.map(encodeURIComponent).join(",")}`,
    }),
    [sort, basis],
  );
  return useWithheldFields<DiscoveryRow, DiscoveryItem>(source, all, wanted, onStale);
}
