"use client";
import { GhostButton, PrimaryButton } from "../ui/button";
import { ZERO_PRIMARY, ZERO_SECONDARY, ZeroState } from "../ui/zero-state";
import { collectionBrowseCopy, colorLabelFor } from "../../lib/copy/collection-browse";
// /collection filtered to nothing, drawn in the shared `ZeroState` (small
// items 2, item 6a): collection keeps its own words, the commanders geometry
// draws them. The crown and the accent vignette retired with that call.
//
// With a query on, the one fix leads at both widths: Keep only search drops
// every filter but the query. Clear all filters follows. Without a query there
// is no single fix to name, so Clear all filters stands alone, as it does on
// /commanders when no one control would bring a row back.

export function NoResults({
  query,
  colors,
  onClearAll,
  onKeepSearch,
}: {
  query: string;
  colors: string[];
  /** Retained for the caller's contract even though the v2 copy no longer
   *  renders the owned-card total — see the plan's Task 13 note. */
  totalCount: number;
  onClearAll: () => void;
  onKeepSearch: () => void;
}) {
  const q = query.trim();
  const copy = collectionBrowseCopy.noResults;
  return (
    <ZeroState
      heading={copy.heading(query, colorLabelFor(colors))}
      body={copy.caption}
      primary={
        q ? (
          <PrimaryButton type="button" onClick={onKeepSearch} className={ZERO_PRIMARY}>
            {copy.keepSearch}
          </PrimaryButton>
        ) : undefined
      }
      secondary={
        <GhostButton type="button" onClick={onClearAll} className={ZERO_SECONDARY}>
          {copy.cta}
        </GhostButton>
      }
    />
  );
}
