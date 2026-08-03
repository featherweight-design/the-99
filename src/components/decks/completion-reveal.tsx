"use client";

// The 99/99 completion reveal — the app's ONE kaiju appearance
// (design/design_handoff_the99_richness/README.md: the kaiju is reserved for
// rare wins). Fires once per deck, the first time it reads Complete.
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
// The mobile composition is DERIVED, not mocked: kaiju.svg is a 480×380
// landscape viewBox that does not fold into portrait, so it is anchored
// bottom-right and bled off both edges to preserve the "larger than frame"
// read rather than shrinking into a full-body figure.

import { Crab } from "../character/crab";
import { Kaiju } from "../character/kaiju";
import { PrimaryButton, GhostButton } from "@/components/ui/button";
import { decksBuilderCopy } from "../../lib/copy/decks-builder";

const CTA_SIZING = "text-[13px] px-[20px] py-[10px]";

export function CompletionReveal({
  commanderShortName,
  onDismiss,
  onExport,
}: {
  /** Already shortened to the first comma — the mock says "Korvold is fed",
   *  not "Korvold, Fae-Cursed King is fed". */
  commanderShortName: string;
  onDismiss: () => void;
  onExport: () => void;
}) {
  return (
    <section
      aria-labelledby="completion-reveal-heading"
      // shrink-0: the band is a fixed-height child of the builder's flex
      // column, where the default flex-shrink would squash it.
      className="relative shrink-0 overflow-hidden h-[420px] md:h-[380px] bg-[linear-gradient(180deg,var(--celebrate-top),var(--celebrate-bottom))]"
    >
      {/* Kaiju — looming from the right, bleeding off frame at both breakpoints.
          Two sizes rather than one scaled instance: the mobile anchor differs. */}
      <div
        className="absolute right-[-70px] bottom-[-8px] md:right-[-60px] md:bottom-[-12px] opacity-[0.94] [filter:drop-shadow(0_0_46px_rgba(0,0,0,0.6))]"
        aria-hidden
      >
        <Kaiju size={300} className="block md:hidden" breathe />
        <Kaiju size={440} className="hidden md:block" breathe />
      </div>

      {/* Brass horizon */}
      <div
        className="absolute left-0 right-0 h-px bottom-[44px] md:bottom-[52px] bg-[linear-gradient(90deg,transparent,rgba(201,162,75,0.4),transparent)]"
        aria-hidden
      />

      {/* Crab — hard left on mobile so the kaiju's gaze still crosses the frame */}
      <Crab size={64} bobSeconds={3} className="absolute left-[24px] bottom-[28px] md:hidden" />
      <Crab
        size={84}
        bobSeconds={3}
        className="absolute hidden md:block md:left-[46%] md:bottom-[32px]"
      />

      {/* Text block */}
      <div className="anim-rise absolute top-[32px] left-[24px] right-[24px] md:top-[56px] md:left-[40px] md:right-auto md:max-w-[330px]">
        {/* Crown motif — three brass diamonds */}
        <div className="inline-flex items-center gap-[7px] mb-[12px]" aria-hidden>
          <span className="block w-[9px] h-[9px] rotate-45 bg-[color:var(--brass)]" />
          <span className="block w-[13px] h-[13px] rotate-45 bg-[color:var(--brass)]" />
          <span className="block w-[9px] h-[9px] rotate-45 bg-[color:var(--brass)]" />
        </div>
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
