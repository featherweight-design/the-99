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
