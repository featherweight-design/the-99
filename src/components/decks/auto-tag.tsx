"use client";

// AutoTag — the auto marker on a filled deck row. At rest it reads "auto";
// on hover and focus it swaps to "keep ✓" and lets the player commit to the
// card. Activating it calls keepAutoCard, which clears auto=false for that row.
//
// Geometry is BuyTag's exactly, hueless: mono 9.5px --fg-locked on --elevated,
// radius 4px, padding 1px 5px. Hover/focus take label --accent, border 1px
// --accent-shadow. On phone the row already provides 44px height, so this tag
// pads out to the full hit box without growing its own visual box.

import { useState } from "react";
import { keepAutoCard } from "../../app/decks/actions";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { useKeepOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

interface AutoTagProps {
  deckId: string;
  oracleId: string;
  name: string;
}

export function AutoTag({ deckId, oracleId, name }: AutoTagProps) {
  const [active, setActive] = useState(false);
  const { isPending, run } = useDeckMutation(false, "");
  const keepOptimisticCard = useKeepOptimisticCard();

  function handleKeep() {
    // The prediction goes inside the transition, where the deck-wide list can
    // drop the auto flag in the same pass the tag commits. Without it the
    // provenance line, the auto counter and "Clear auto" all keep counting this
    // card as the fill's until revalidation — and a sweep in that window would
    // take the card the player has just kept.
    run(
      () => keepAutoCard(deckId, oracleId),
      () => keepOptimisticCard(oracleId),
    );
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
      className={
        "flex-none font-mono rounded-[4px] px-[5px] py-[1px]" +
        " text-[9px] md:text-[9.5px] leading-none" +
        // Phone gets the 44px target from min-height, not padding, so the tag's
        // visual box stays 1px 5px while the hit area fills the row.
        " self-center min-h-[44px] md:min-h-0" +
        " cursor-pointer border" +
        (active
          ? " text-accent border-accent-shadow bg-elevated"
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
