"use client";
// Empty State — Filtered to Zero (§Empty State — Filtered to Zero), as
// re-skinned by the richness pass (Surfaces v2 §Commanders).
// Contains: the quiet crown, dimmed WUBRG pips of the active filter, a Cinzel
// heading, body copy, the "Showing 0 of N" diagnostic, "Clear color filter".
// Mobile breakpoint: sm:640px (project uses sm: prefix, table breakpoint is 640px).

import { WUBRG_COLOR } from "../../lib/collection/browse";
import { guildLabel, colorWords } from "../../lib/copy/color-labels";
import { commandersCopy } from "../../lib/copy/commanders";
import { Crown } from "../ui/crown";
import { GhostButton } from "../ui/button";

type FilteredEmptyProps = {
  colors: string[];
  total: number;
  onClear: () => void;
  /** Discovery's wording for the same shape. The owned scope passes none of
      these and renders byte-identically to what shipped: discovery is asking a
      narrower question of the same list, not showing a different state. */
  heading?: string;
  body?: string;
  cta?: string;
  /** One extra sentence after the body, and one affordance after the button.
      Both are discovery's alone — the owned scope has no second scope to send
      the reader to, and no built decks to explain the absence with. */
  extraClause?: string;
  secondary?: React.ReactNode;
};

export function FilteredEmpty({
  colors,
  total,
  onClear,
  heading,
  body,
  cta,
  extraClause,
  secondary,
}: FilteredEmptyProps) {
  const label = guildLabel(colors);

  return (
    // Vignette per Surfaces v2 — accent at 7%, existing token, no new hex.
    <div className="flex flex-1 flex-col items-center justify-center text-center p-[24px_30px] sm:p-[40px] bg-[radial-gradient(420px_240px_at_50%_76%,color-mix(in_oklab,var(--accent)_7%,transparent),transparent_70%)]">
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
                background: WUBRG_COLOR[c] ?? "var(--fg-faint)",
                opacity: 0.5,
                boxShadow: "0 0 0 2px var(--accent)",
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
        {heading ?? commandersCopy.filteredEmpty.heading(label)}
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
        {body ?? commandersCopy.filteredEmpty.caption(colorWords(colors), total)}
        {/* The clause is a second sentence rather than a second paragraph: it
            gives the reason the first sentence is true, and a break would read
            as a change of subject. Emphasised whole, unlike the other two
            empties' one marked phrase — the clause IS the new reason here, so
            there is nothing inside it to lift above the rest. */}
        {extraClause ? (
          <>
            {" "}
            <strong className="font-semibold text-[color:var(--fg)]">{extraClause}</strong>
          </>
        ) : null}
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

      {/* Clear color filter button. Under discovery it gains a second
          affordance beside it, so the two sit in a wrapping group; the owned
          scope has nothing to put there and keeps the bare button it shipped
          with. `flex-wrap` because no phone frame was drawn for this state and
          a 40px button plus a mono note does not fit 390px on one line. The
          group's `10px` matches the floor empty's identical CTA-plus-note
          pairing: M-9 resolves the canvas's 12px here as drafting drift. */}
      {secondary ? (
        <span className="mt-[16px] inline-flex flex-wrap items-center justify-center gap-[10px]">
          <GhostButton
            onClick={onClear}
            className="inline-flex items-center h-[40px] px-[18px] text-[13.5px] [border:1px_solid_var(--accent)] text-[color:var(--accent)]"
          >
            {cta ?? commandersCopy.filteredEmpty.cta}
          </GhostButton>
          {secondary}
        </span>
      ) : (
        <GhostButton
          onClick={onClear}
          // brand focus-visible outline treatment inherited from globals.css
          className="text-[13px] p-[11px_20px] sm:p-[10px_20px] mt-[16px]"
        >
          {commandersCopy.filteredEmpty.cta}
        </GhostButton>
      )}
    </div>
  );
}
