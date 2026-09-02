"use client";
import { PrimaryButton, GhostButton } from "../ui/button";
import { Crown } from "../ui/crown";
import { collectionBrowseCopy, colorLabelFor } from "../../lib/copy/collection-browse";
// No results state per property table §No Results State, as re-skinned by the
// richness pass (Surfaces v2 §Collection). The v1 "?" card fan is gone, and
// so is the crab: the quiet crown is the mark for this state now.

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
  const colorLabel = colorLabelFor(colors);
  return (
    // §No Results Container: flex-1, column, centered, padding 36px mobile / 48px desktop.
    // Vignette per Surfaces v2 — accent at 7%, existing token, no new hex.
    <div className="flex-1 flex flex-col items-center justify-center text-center p-[36px] md:p-[48px] bg-[radial-gradient(440px_260px_at_50%_78%,rgba(201,162,75,0.07),transparent_70%)]">
      <Crown tone="quiet" className="mb-[14px]" />

      {/* Heading — §No Results Heading: Cinzel 700, 21/26px, #EDE6D8 (--fg) */}
      <h2
        className="font-display font-bold text-[21px] md:text-[26px] m-0"
        style={{ color: "var(--fg)" }}
      >
        {collectionBrowseCopy.noResults.heading(query, colorLabel)}
      </h2>

      {/* Body — §No Results Body Copy: 13.5/15px, #C6B79A (--fg-body), line-height 1.55/1.6 */}
      <p
        className="mt-[10px] md:mt-[12px] text-[13.5px] md:text-[15px] md:max-w-[360px] leading-[1.55] md:leading-[1.6]"
        style={{ color: "var(--fg-body)" }}
      >
        {collectionBrowseCopy.noResults.caption}
      </p>

      {/* CTAs — §No Results CTA Container / §"Clear filters" Button / §"Keep only search" Button */}
      <div className="mt-[22px] md:mt-[26px] flex flex-col md:flex-row gap-[12px]">
        <PrimaryButton
          type="button"
          onClick={onClearAll}
          className="text-[13px] md:text-[14px] px-[20px] md:px-[22px] py-[11px] md:py-[12px]"
        >
          {collectionBrowseCopy.noResults.cta}
        </PrimaryButton>
        {q && (
          <GhostButton
            type="button"
            onClick={onKeepSearch}
            className="hidden md:inline-block text-[14px] px-[22px] py-[12px]"
          >
            Keep only search
          </GhostButton>
        )}
      </div>
    </div>
  );
}
