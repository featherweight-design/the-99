"use client";

// AutoTag — the auto marker on a filled deck row. At rest it reads "auto";
// on hover and focus it swaps to "keep ✓" and lets the player commit to the
// card. Activating it calls keepAutoCard, which clears auto=false for that row.
//
// Geometry is BuyTag's exactly, hueless: mono 9.5px --fg-locked on --elevated,
// radius 4px, padding 1px 5px. Hover/focus take label --brass, border 1px
// --brass-shadow. On phone the row already provides 44px height, so this tag
// pads out to the full hit box without growing its own visual box.

import { useState } from "react";
import { keepAutoCard } from "../../app/decks/actions";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { useDeckMutation } from "./use-deck-mutation";

interface AutoTagProps {
  deckId: string;
  oracleId: string;
  name: string;
}

export function AutoTag({ deckId, oracleId, name }: AutoTagProps) {
  const [active, setActive] = useState(false);
  const { isPending, run } = useDeckMutation(false, "");

  function handleKeep() {
    run(() => keepAutoCard(deckId, oracleId));
  }

  return (
    <button
      type="button"
      onClick={handleKeep}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
      disabled={isPending}
      aria-label={recommendationsCopy.auto.keepAria(name)}
      aria-busy={isPending || undefined}
      // Phone: 44×44 hit box via negative margin + padding, row provides the
      // height so no visual growth. Desktop: inline, no extra hit box needed.
      className={
        "flex-none font-mono rounded-[4px] px-[5px] py-[1px]" +
        " text-[9px] md:text-[9.5px] leading-none" +
        // Phone hit-box expansion without changing the row height — the row
        // itself is min-h-[44px] and the button expands inward.
        " self-center py-[1px] md:py-[1px]" +
        " min-h-[44px] md:min-h-0" +
        " cursor-pointer border" +
        (active
          ? " text-brass border-brass-shadow bg-elevated"
          : " text-fg-locked border-transparent bg-elevated") +
        " disabled:opacity-50 disabled:cursor-default"
      }
    >
      {active
        ? recommendationsCopy.auto.keep
        : recommendationsCopy.auto.tag}
    </button>
  );
}
