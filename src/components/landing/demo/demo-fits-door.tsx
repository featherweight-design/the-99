// Find a deck for it, as the demo's card details draw it (addendum A2 section 5): the shipped door (`cards/fits-door.tsx`) shown
// DISABLED, to entice. It is its own props-only drawing rather than a variant of the shipped door: that one reaches the moments
// and targets providers (per-user, in `src/app`), which the public surface may not import. Glyph outline and words in
// `--fg-locked`, no underline, no arrow, the shipped `Lock` after the words, and one line under it saying who it is for. It is
// `aria-disabled` and described by that line; it has no hover change and nothing to select.

import { useId } from "react";
import { landingCopy } from "../../../lib/copy/landing";
import { swapToolsCopy } from "../../../lib/copy/swap-tools";
import { Lock } from "../../ui/lock";

export function DemoFitsDoor({ cardName, layout }: { cardName: string; layout: "row" | "column" }) {
  const note = useId();
  return (
    <span data-testid="demo-fits-door" className="inline-flex flex-col items-start gap-[2px] self-start">
      <button
        type="button"
        aria-disabled="true"
        aria-describedby={note}
        aria-label={swapToolsCopy.fits.calloutAria(cardName)}
        // Nothing happens: no handler, no hover change, the default cursor.
        className={`inline-flex cursor-default items-center gap-[8px] self-start whitespace-nowrap border-0 bg-transparent p-0 font-medium text-[color:var(--fg-locked)] ${layout === "column" ? "min-h-[44px] text-[14px]" : "text-[13.5px]"}`}
      >
        <span aria-hidden="true" className="flex gap-[3px]">
          {[0, 1].map((i) => (
            <span key={i} className="h-[6px] w-[6px] rotate-45 border-[1.5px] border-solid border-[color:var(--fg-locked)]" />
          ))}
        </span>
        <span>{swapToolsCopy.fits.callout}</span>
        <Lock size="md" />
      </button>
      <span id={note} data-testid="demo-fits-door-note" className="font-mono text-[10.5px] text-[color:var(--fg-muted)]">
        {landingCopy.demo.fitsLocked}
      </span>
    </span>
  );
}
