"use client";
// The app's one filtered-empty state: a list the reader narrowed to nothing,
// under a filter chassis that is still on screen. Both commanders lanes and
// /collection draw it (small items 2, item 6a: the commanders geometry won).
// Each surface keeps its own words; this owns only the shape.
//
// Not `EmptyState` (./empty-state.tsx): that is the token-only shell for a
// page with nothing in it at all (an empty collection, a set page, the error
// notice), whose surfaces size their own type. This one fixes its geometry, because
// sharing that geometry is the point.

import type { ReactNode } from "react";

/** Three hairline diamonds, the same rotated square the end-of-ranking rule
    draws on /commanders, so every full-stop there is furniture of one family.
    Decorative: the heading below says the same thing in words. */
function DiamondRule() {
  return (
    <div className="flex gap-[7px]" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="block h-[10px] w-[10px] rotate-45 border border-solid border-[color:var(--border-strong)]"
        />
      ))}
    </div>
  );
}

/** The shared shape: rule, heading, one sentence, and at most two affordances.
    The buttons stack full-width at 48px on the phone and sit side by side at
    32px from `sm:` up — one element per button with responsive classes, so each
    sentence and each label exists exactly once in the document. */
export function ZeroState({
  heading,
  body,
  primary,
  secondary,
}: {
  heading: string;
  body: ReactNode;
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    // `flex-1` + centred: the state grows into whatever the viewport left after
    // the rack, so it sits in the middle of a tall screen rather than clinging
    // to the controls with the page empty below it.
    <div className="flex flex-1 flex-col items-center justify-center gap-[12px] px-[22px] pt-[40px] pb-[40px] text-center sm:pt-[34px] sm:pb-[38px]">
      <DiamondRule />
      <h2 className="font-display m-0 text-[19px] font-semibold text-[color:var(--fg)]">
        {heading}
      </h2>
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--fg-muted)] sm:max-w-[520px]">
        {body}
      </p>
      {primary || secondary ? (
        <div className="mt-[6px] flex w-full flex-col gap-[9px] self-stretch sm:mt-[4px] sm:w-auto sm:flex-row sm:self-auto">
          {primary}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}

/** Shared button geometry: 48px full-width on the phone, 32px hugging its label
    from `sm:` up. The primitives own fill, border and type family; height,
    padding and size are the caller's, which is what these two constants are. */
export const ZERO_PRIMARY =
  "inline-flex items-center justify-center h-[48px] rounded-[10px] text-[14px] " +
  "sm:h-[32px] sm:rounded-[8px] sm:px-[14px] sm:text-[12.5px]";
export const ZERO_SECONDARY =
  "inline-flex items-center justify-center h-[48px] rounded-[10px] text-[14px] " +
  "sm:h-[32px] sm:rounded-[8px] sm:px-[13px] sm:text-[12.5px]";
