"use client";
// No results state per property table §No Results State.
// Distinct from empty-collection (shell owns that). CardFan mark from marks.tsx.

import { CardFan } from "../marks";

export function NoResults({
  query,
  totalCount,
  onClearAll,
  onKeepSearch,
}: {
  query: string;
  totalCount: number;
  onClearAll: () => void;
  onKeepSearch: () => void;
}) {
  const q = query.trim();
  return (
    // §No Results Container: flex-1, column, centered, padding 36px mobile / 48px desktop
    <div className="flex-1 flex flex-col items-center justify-center text-center p-[36px] md:p-[48px]">
      {/* CardFan mark — 96×104 mobile / 112×120 desktop, opacity 0.9 */}
      <div className="opacity-90 mb-[22px] md:mb-[24px]">
        <CardFan variant="mobile" className="md:hidden" />
        <CardFan variant="desktop" className="hidden md:block" />
      </div>

      {/* Heading — §No Results Heading: Cinzel 700, 21/26px, #EDE6D8 (--fg) */}
      <h2
        className="font-display font-bold text-[21px] md:text-[26px] m-0"
        style={{ color: "var(--fg)" }}
      >
        Nothing matches that
      </h2>

      {/* Body — §No Results Body Copy: 13.5/15px, #C6B79A (--fg-body), line-height 1.55/1.6, max-w 440px desktop */}
      <p
        className="mt-[10px] md:mt-[12px] text-[13.5px] md:text-[15px] md:max-w-[440px]"
        style={{ color: "var(--fg-body)", lineHeight: 1.6 }}
      >
        <span className="md:hidden">
          {q
            ? `No cards named "${q}" in your collection. Loosen a filter, or check the spelling.`
            : "No cards match those filters. Loosen a filter, or clear all."}
        </span>
        <span className="hidden md:inline">
          {q
            ? `No cards named "${q}" in your collection. Loosen a filter or check the spelling — you own ${totalCount.toLocaleString()} cards, just not this one.`
            : `No cards match those filters — you own ${totalCount.toLocaleString()} cards. Loosen a filter or clear all.`}
        </span>
      </p>

      {/* CTAs — §No Results CTA Container / §"Clear all filters" Button / §"Keep only search" Button */}
      <div className="mt-[22px] md:mt-[26px] flex flex-col md:flex-row gap-[12px]">
        <button
          type="button"
          onClick={onClearAll}
          className="rounded-lg font-sans font-semibold text-[13px] md:text-[14px] px-[20px] md:px-[22px] py-[11px] md:py-[12px] cursor-pointer hover:bg-[color:var(--brass-hover)]"
          style={{ color: "var(--bg)", background: "var(--brass)", border: "none" }}
        >
          Clear all filters
        </button>
        {q && (
          <button
            type="button"
            onClick={onKeepSearch}
            className="hidden md:inline-block rounded-lg font-sans font-semibold text-[14px] px-[22px] py-[12px] cursor-pointer hover:[border:1px_solid_var(--brass)]"
            style={{ color: "var(--fg)", background: "transparent", border: "1px solid var(--border-strong)" }}
          >
            Keep only search
          </button>
        )}
      </div>
    </div>
  );
}
