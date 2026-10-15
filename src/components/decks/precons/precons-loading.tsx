// What `/decks/precons` draws while it loads (small-polish handoff §4): the page's own shape in tiles (or rows, when the
// reader's stored view is rows), not the crown screen. The header is real, since its back link and title never change;
// the count line, the chassis and the year heading are still shapes of their real height. Six tiles at 390 (the first
// screen and one row past it), two rows from `md` on the list's own grid class, so the column count is the page's.
//
// Served by the list route's own `loading.tsx` (`(list)/loading.tsx`), so the open precon, which sits outside that
// route group, keeps the shared decks screen. A server component: no hooks, nothing interactive.

import Link from "next/link";
import { preconsCopy } from "../../../lib/copy/precons";
import { preconsLoadingCopy } from "../../../lib/copy/shell";
import { PendingReporter } from "../../shell/pending-reporter";
import { RowSkeleton, TileSkeleton } from "../../ui/tile-skeleton";
import { PRECON_ROWS_CLASS, PRECON_TILES_COLUMNS } from "./precon-grid";

const copy = preconsCopy.list;
const SHAPE = "rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]";

/** The page's own columns with the row gap taken off the grid and put on each tile as a margin: the extra tiles sit in
 *  zero-height implicit rows (`grid-auto-rows: 0`), and a row GAP would keep adding space for each of them inside the clip.
 *  Three rows show at 390 and two from `md`, whatever the column count the page's class gives; the rest overflow their zero
 *  tracks below the box and `overflow-hidden` cuts them. 24 tiles cover a 12-column grid. */
const TILES_CLASS = `${PRECON_TILES_COLUMNS} gap-x-[10px] md:gap-x-[12px] grid-rows-[repeat(3,auto)] md:grid-rows-[repeat(2,auto)] [grid-auto-rows:0] overflow-hidden [&>li]:mb-[10px] md:[&>li]:mb-[12px]`;
const TILE_COUNT = 24;

export function PreconsLoading({ view }: { view: "tiles" | "rows" }) {
  return (
    <div className="pb-[96px]">
      <span role="status" className="sr-only">{preconsLoadingCopy.status}</span>
      <header className="flex flex-col gap-[4px] border-b-[1px] border-solid border-x-0 border-t-0 border-b-[color:var(--border)] p-[12px_16px_12px] md:p-[16px_22px_16px]">
        <Link href="/decks" className="font-mono text-[11px] text-[color:var(--fg-faint)] no-underline">
          {copy.back}
          <PendingReporter href="/decks" />
        </Link>
        <h1 className="m-0 font-display text-[24px] font-normal text-[color:var(--fg)]">{copy.title}</h1>
        <span aria-hidden className="flex h-[16px] items-center anim-skeleton"><span className="block h-[11px] w-[55%] max-w-[420px] rounded-[3px] bg-[color:var(--elevated)]" /></span>
      </header>
      <div aria-hidden className="anim-skeleton">
        {/* The chassis at its measured height (390: a 50px search row, 8px apart, then 126; 1300: 120): search or pips and sort,
            the chips line, the result line. */}
        <div className="px-[16px] pt-[12px] md:px-[22px]">
          <div className="mb-[8px] flex h-[50px] items-center gap-[8px] px-[0px] md:hidden">
            <span className={`${SHAPE} h-[44px] min-w-0 flex-1`} />
            <span className={`${SHAPE} h-[44px] w-[76px] flex-none`} />
          </div>
          <div className="flex h-[126px] flex-col gap-[10px] pt-[12px] md:h-[120px]">
            <div className="flex items-center gap-[8px]">
              <span className={`${SHAPE} hidden h-[38px] min-w-0 flex-1 md:block`} />
              <span className={`${SHAPE} h-[44px] w-[160px] flex-none md:h-[38px] md:w-[200px]`} />
              <span className={`${SHAPE} ml-auto h-[44px] w-[96px] flex-none md:h-[38px]`} />
            </div>
            <span className={`${SHAPE} h-[22px] w-[140px]`} />
            <span className={`${SHAPE} h-[17px] w-[200px]`} />
          </div>
        </div>
        <div className="flex flex-col gap-[10px] p-[16px_16px_24px] md:p-[18px_22px_8px]">
          <span className="flex h-[34px] items-start pt-[2px]"><span className="block h-[17px] w-[64px] rounded-[3px] bg-[color:var(--elevated)]" /></span>
          {view === "tiles" ? (
            <ul className={TILES_CLASS}>
              {Array.from({ length: TILE_COUNT }, (_, i) => <TileSkeleton key={i} index={i} />)}
            </ul>
          ) : (
            <ul className={PRECON_ROWS_CLASS}>
              {Array.from({ length: 6 }, (_, i) => <RowSkeleton key={i} index={i} />)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
