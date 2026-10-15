"use client";

import type { ButtonHTMLAttributes } from "react";
import { usePreviewRow } from "../decks/hover-preview";
import type { FoilFinish } from "../../lib/collection/browse";

/**
 * A button that IS a card's row (a collection row, a fits picker's combo piece): it draws the hover preview of
 * `imageUri` from the surrounding `HoverPreviewProvider` as well as taking its own press, because every card row has
 * both (Hugh, 2026-10-12). A tile has no hover preview, so no tile uses this. A hook per row cannot live in a `.map`,
 * so the row is this component. A no-op with no provider or no `imageUri`.
 */
export function PreviewButton({
  imageUri, foil, ...props
}: {
  imageUri: string | null | undefined;
  /** The finish of the copy `imageUri` draws, for the preview's foil film (foil handoff R2). Absent draws none. */
  foil?: FoilFinish;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const preview = usePreviewRow(imageUri, foil);
  return <button {...preview} {...props} />;
}
