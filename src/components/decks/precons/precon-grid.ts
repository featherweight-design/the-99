// The precon list's two grids, shared by the list and by its loading skeleton so the skeleton's column count is the
// page's. No "use client": the skeleton is a server component, and a value imported from a client module arrives as a
// client reference rather than the string (`ui/card-tile-caption.ts` records the same failure).

// Tiles: 2-up to 480px (174px at 390, gap 10); a 150px floor from 480 to `md`; from `md` a 178px floor (the deck grid's
// and /collection's), 4-up at 900 (gap 12). The widest tile any width draws is ~241px (three tracks just under 792px),
// where the shell's 10px radius and a partner card's 5px (of ~159px) both clear the 3.1% matte rule; a fixed column
// count grew tiles past it (329px at 700). Each tile stretches to its row so the art and the caption line up and only
// the foot differs (R4 §5).
export const PRECON_TILES_COLUMNS =
  "m-0 grid list-none grid-cols-2 items-stretch p-0 min-[480px]:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(178px,1fr))]";
export const PRECON_TILES_CLASS = `${PRECON_TILES_COLUMNS} gap-[10px] md:gap-[12px]`;
export const PRECON_ROWS_CLASS = "m-0 flex list-none flex-col gap-[8px] p-0";
