// The deck header's own type, one place, so the page and its loading screen (`deck-open-loading`) cannot drift apart: the
// title's face, weight, size and line height, and the size of the commander line under it, per width. Phone is the band under
// 768px (`spine-mobile`), desktop the band from there (`spine-desktop`).
import type { CSSProperties } from "react";

/** The title's face and weight; the size and line height come from `DECK_TITLE` for the width. */
export const DECK_TITLE_CLASS = "font-display font-[700]";

export const DECK_TITLE: Record<"phone" | "desktop", Pick<CSSProperties, "fontSize" | "lineHeight">> = {
  phone: { fontSize: 20, lineHeight: 1.25 },
  desktop: { fontSize: 21, lineHeight: 1.2 },
};

/** The commander line's size (mono); its colour is the band's own. */
export const DECK_COMMANDER_SIZE = { phone: 10, desktop: 11 } as const;

/** The phone label block's inset from the band's sides; its ramp (`BlockScrim`) reaches back out across it. */
export const PHONE_BLOCK_INSET_X = 18;

/**
 * The phone label block's geometry, one place for the loaded header (`spine-mobile`) and its loading screen
 * (`deck-open-loading`): left-aligned, foot on the band's bottom with a 12px inset as padding (so its own height is what the
 * ramp is keyed to), 40px reserved on the right for the card-details control, `isolation` keeping the ramp under the ink.
 */
export const PHONE_BLOCK_CLASS = "press-through absolute flex flex-col items-start";
export function phoneBlockStyle(gap: number): CSSProperties {
  return { left: PHONE_BLOCK_INSET_X, right: PHONE_BLOCK_INSET_X, bottom: 0, paddingBottom: 12, paddingRight: 40, isolation: "isolate", gap };
}
