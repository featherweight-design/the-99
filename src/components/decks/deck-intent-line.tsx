"use client";

import { COVER_INK_SHADOW } from "../ui/art-wash";

/**
 * The tagline: what this deck is for, SECOND in the deck header, under the name, above the
 * commander line (STATES-deck-description.md §2). Read-only (H35) — editing moved to the pencil
 * on the deck name, which edits the name and the description together
 * (`use-deck-header-edit.ts`, rendered by `spine-desktop.tsx` / `spine-mobile.tsx`). A deck with
 * no description draws no row at all, and the commander line moves up.
 *
 * No dashed rule, no disc, no chip: the seeded-sentence machinery (ProvenanceDisc, the "from the
 * build" chip) is gone with the seeding it announced (ruling 3, DESCRIPTION-where-it-lives.md).
 *
 * On a phone (`width="phone"`) it clamps to two lines with an ellipsis and sits on the deck's
 * art, taking the cover's ink shadow like the name above it. Desktop never clamps.
 */
export function DeckIntentLine({
  intent,
  width,
}: {
  intent: string | null;
  width: "desktop" | "phone";
}) {
  if (intent === null) return null;
  const desktop = width === "desktop";
  return (
    <p
      data-deck-intent
      className={
        desktop
          ? "mt-[4px] min-w-0 text-[14px] leading-[1.45] [overflow-wrap:anywhere]"
          : "-mt-px min-w-0 text-[12.5px] leading-[1.5] [overflow-wrap:anywhere] line-clamp-2"
      }
      style={{ color: "var(--fg-body)", textShadow: desktop ? undefined : COVER_INK_SHADOW }}
    >
      {intent}
    </p>
  );
}
