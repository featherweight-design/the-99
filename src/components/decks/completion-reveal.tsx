"use client";

// The 99/99 completion reveal — the app's ONE loud crown
// (design/design_handoff_the99_themes/README.md decision 6: the accent at its
// loudest is reserved for this surface). Fires once per deck, the first time it
// reads Complete.
//
// Two deliberate narrowings of the mock, both flagged for design review:
//
// 1. BAND, NOT FULL SURFACE. The mock captions this "full-surface moment …
//    then dissolves to the builder". A fixed overlay on the route the user
//    reached by adding their 99th card would hide the deck they just finished
//    and needs a focus trap, a scroll lock and an escape hatch, none of which
//    the mock specifies. A 420px/380px band at the top of the builder keeps the
//    reveal above the fold at both breakpoints while the deck stays reachable.
//
// 2. DISMISSIBLE ONLY — no ~4s auto-dismiss. The mock says "~4s or
//    dismissible"; a timer racing a reader is worse than a button, and "Back to
//    the deck" is already the mock's own dismiss affordance.
//
import { Crown } from "../ui/crown";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { decksBuilderCopy } from "../../lib/copy/decks-builder";

const CTA_SIZING = "text-[13px] px-[20px] py-[10px]";

export function CompletionReveal({
  commanderShortName,
  onDismiss,
  onExport,
}: {
  /** Already shortened to the first comma — the mock says "Korvold has a full
   *  deck", not "Korvold, Fae-Cursed King has a full deck". */
  commanderShortName: string;
  onDismiss: () => void;
  onExport: () => void;
}) {
  return (
    <section
      aria-labelledby="completion-reveal-heading"
      // shrink-0: the band is a fixed-height child of the builder's flex
      // column, where the default flex-shrink would squash it.
      className="relative shrink-0 overflow-hidden h-[420px] md:h-[380px] bg-[color:var(--surface-sunken)]"
    >
      {/* Text block */}
      <div className="anim-rise absolute top-[32px] left-[24px] right-[24px] md:top-[56px] md:left-[40px] md:right-auto md:max-w-[330px]">
        <Crown tone="loud" className="mb-[14px]" />
        <h2
          id="completion-reveal-heading"
          className="font-display font-extrabold m-0 text-[24px] md:text-[32px] text-[color:var(--fg)]"
        >
          {decksBuilderCopy.completion.heading}
        </h2>
        <p className="text-[14px] md:text-[15px] mt-[10px] mb-0 leading-[1.6] text-[color:var(--fg-body)]">
          {decksBuilderCopy.completion.caption(commanderShortName)}
        </p>
        <div className="flex flex-wrap gap-[12px] mt-[18px]">
          <PrimaryButton onClick={onExport} className={CTA_SIZING}>
            {decksBuilderCopy.completion.primaryCta}
          </PrimaryButton>
          <GhostButton onClick={onDismiss} className={CTA_SIZING}>
            {decksBuilderCopy.completion.secondaryCta}
          </GhostButton>
        </div>
      </div>
    </section>
  );
}
