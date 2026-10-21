"use client";

// AutoTag — the auto marker on a filled deck row. At rest it reads "auto";
// on hover and focus it swaps to "keep ✓" and lets the player commit to the
// card. Activating it calls keepAutoCard, which clears auto=false for that row.
//
// Geometry is BuyTag's exactly, hueless: mono 9.5px --fg-locked on --elevated,
// radius 4px, padding 1px 5px. Hover/focus take label --accent, border 1px
// --accent-shadow. A coarse pointer's 44px hit is drawn past the button
// (TOUCH_HIT), so the one-line row keeps its 34px height.

import { TOUCH_HIT } from "../ui/touch-hit";
import { useState } from "react";
import { keepAutoCard } from "../../app/decks/actions";
import { recommendationsCopy } from "../../lib/copy/recommendations";
import { MutationError } from "./mutation-error";
import { useKeepOptimisticCard } from "./optimistic-deck";
import { useDeckMutation } from "./use-deck-mutation";

interface AutoTagProps {
  deckId: string;
  oracleId: string;
  name: string;
}

export function AutoTag({ deckId, oracleId, name }: AutoTagProps) {
  const [active, setActive] = useState(false);
  const { isPending, error, run } = useDeckMutation(
    false,
    recommendationsCopy.auto.keepFailed,
  );
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

  // The refusal stacks under the tag rather than beside it: the row's own error
  // slot belongs to the remove button, and a keep that failed has to say so
  // where the player clicked. At rest the wrapper is exactly the tag's box.
  return (
    <span className="flex-none flex flex-col items-end">
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
        // A coarse pointer gets the 44px target from TOUCH_HIT, drawn past the
        // button, so the one-line row stays 34px. The button carries no plate: the row marks an
        // over-committed card with an inset ring, and an inset shadow paints
        // beneath its children, so a background stretched to the full row height
        // erases the ring across the tag's width.
        className={
          "flex-none self-center " + TOUCH_HIT +
          " flex items-center bg-transparent border-none p-0" +
          " cursor-pointer disabled:opacity-50 disabled:cursor-default"
        }
      >
        {/* The plate — 1px 5px around its own text, and no taller. */}
        <span
          className={
            "font-mono rounded-[4px] px-[5px] py-[1px]" +
            " text-[9.5px] leading-none" +
            " border bg-elevated" +
            (active
              ? " text-accent-text border-accent-shadow"
              : " text-fg-locked border-transparent")
          }
        >
          {active
            ? recommendationsCopy.auto.keep
            : recommendationsCopy.auto.tag}
        </span>
      </button>
      {error && <MutationError message={error} />}
    </span>
  );
}
