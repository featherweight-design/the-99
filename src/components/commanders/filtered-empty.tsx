"use client";
// Empty State — Filtered to Zero (§Empty State — Filtered to Zero), as
// re-skinned by the richness pass (Surfaces v2 §Commanders).
// Contains: the quiet crown, dimmed WUBRG pips of the active filter, a Cinzel
// heading, body copy, the "Showing 0 of N" diagnostic, "Clear color filter".
// Mobile breakpoint: sm:640px (project uses sm: prefix, table breakpoint is 640px).

import { WUBRG_HEX } from "../../lib/collection/browse";
import { guildLabel, colorWords } from "../../lib/copy/color-labels";
import { commandersCopy } from "../../lib/copy/commanders";
import { Crown } from "../ui/crown";
import { GhostButton } from "../ui/button";

type FilteredEmptyProps = {
  colors: string[];
  total: number;
  onClear: () => void;
};

export function FilteredEmpty({ colors, total, onClear }: FilteredEmptyProps) {
  const label = guildLabel(colors);

  return (
    // Vignette per Surfaces v2 — brass at 7%, existing token, no new hex.
    <div className="flex flex-1 flex-col items-center justify-center text-center p-[24px_30px] sm:p-[40px] bg-[radial-gradient(420px_240px_at_50%_76%,rgba(201,162,75,0.07),transparent_70%)]">
      <Crown tone="quiet" className="mb-[14px]" />

      {/* The dimmed pips stay: they were beside the crab, not part of it, and
          they are the only place the active filter is visible. */}
      <div className="flex items-center gap-[16px]">
        <div className="flex gap-[6px]" aria-hidden="true">
          {colors.map((c) => (
            <span
              key={c}
              className="block rounded-full"
              style={{
                width: 16,
                height: 16,
                background: WUBRG_HEX[c] ?? "#8E8269",
                opacity: 0.5,
                boxShadow: "0 0 0 2px var(--brass)",
              }}
            />
          ))}
        </div>

      </div>

      {/* Heading */}
      <h2
        className="font-display m-0 mt-[16px] text-[20px] sm:text-[24px]"
        style={{ fontWeight: 700, color: "var(--fg)" }}
      >
        {commandersCopy.filteredEmpty.heading(label)}
      </h2>

      {/* Body */}
      <p
        className="m-0 text-[13px] sm:text-[14px]"
        style={{
          color: "var(--fg-body)",
          lineHeight: 1.6,
          marginTop: 8,
          maxWidth: 380,
        }}
      >
        {commandersCopy.filteredEmpty.caption(colorWords(colors), total)}
      </p>

      {/* "Showing 0 of N" count — amber, and now below the caption: the
          character leads, the diagnostic follows. It is the only place the
          user learns the filter matched nothing rather than the list being
          empty, so it stays. */}
      <p
        className="m-0 font-mono text-[10.5px] sm:text-[11px]"
        style={{ color: "var(--warning)", marginTop: 12 }}
      >
        {commandersCopy.filteredEmpty.count(total)}
      </p>

      {/* Clear color filter button */}
      <GhostButton
        onClick={onClear}
        // brand focus-visible outline treatment inherited from globals.css
        className="text-[13px] p-[11px_20px] sm:p-[10px_20px] mt-[16px]"
      >
        {commandersCopy.filteredEmpty.cta}
      </GhostButton>
    </div>
  );
}
