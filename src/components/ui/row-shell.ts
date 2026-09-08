// The card row shell, from card-rows call 4.
//
// Five components draw a row standing for a card, and they had five hand-typed
// copies of the same radius and the same gap — which is how the decklist came
// to round to 6px on the phone while the synergy list rounded to 8px at every
// width. What every row shares is declared here once.
//
// The search result row is deliberately not one of them: it is a 9px plate
// carrying a thumbnail and two stacked lines, a different object that happens
// to also be a list item.
//
// Padding and height are deliberately NOT here. They differ by what the row
// carries: the decklist's ✕ supplies its own hit box, the diff row's Keep
// button sets its height, and the collection row is a grid with its own column
// rhythm. A shared constant covering those would be a constant with an
// exception per caller, which is six copies again with extra steps.

/** Phone 9px, desktop 10px. */
export const ROW_GAP = "gap-[9px] md:gap-[10px]";

/** 7px at both widths. A row is a list item, not a card. */
export const ROW_RADIUS = "rounded-[7px]";

/** The flex rows: decklist, unresolved, and all four diff shapes. */
export const ROW_SHELL = `flex items-center ${ROW_GAP} ${ROW_RADIUS}`;

/** The one grid row (`/collection`), which sets its own wider column gap. */
export const ROW_SHELL_GRID = `grid items-center ${ROW_RADIUS}`;

/** For `synergy-row`, which draws its shell in inline style rather than classes. */
export const ROW_RADIUS_PX = 7;
export const ROW_GAP_PX = { phone: 9, desktop: 10 } as const;
