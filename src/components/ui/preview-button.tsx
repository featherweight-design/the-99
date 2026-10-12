"use client";

import type { ButtonHTMLAttributes } from "react";
import { usePreviewRow } from "../decks/hover-preview";

/**
 * A button that IS a card's row or tile (a collection row, a set-grid cell): it draws the hover preview of
 * `imageUri` from the surrounding `HoverPreviewProvider` as well as taking its own press, because every card row has
 * both (Hugh, 2026-10-12). A hook per row cannot live in a `.map`, so the row is this component. A no-op with no
 * provider or no `imageUri`.
 */
export function PreviewButton({
  imageUri, ...props
}: { imageUri: string | null | undefined } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const preview = usePreviewRow(imageUri);
  return <button {...preview} {...props} />;
}
