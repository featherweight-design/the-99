"use client";

// What `/decks/precons` draws while it loads (small-polish handoff §4): the page's own shape in tiles (or rows, when the
// address or the reader's stored view says rows), not the crown screen. The header is real, since its title never changes
// and its back link follows `?from=new` as the list's does; the count line, the chassis and the year heading are still
// shapes of their real height. Six tiles at 390 (the first
// screen and one row past it), two rows from `md` on the list's own grid class, so the column count is the page's.
//
// Served by the list route's own `loading.tsx` (`(list)/loading.tsx`), so the open precon, which sits outside that
// route group, keeps the shared decks screen. A client component for `useSearchParams`: the loaded list lets `?view=` beat
// the stored view and `?from=new` change its back link, so the skeleton reads the same address. It carries `StallWatch`
// and `data-loading-screen` as `LoadingScreen` does, so a list stuck in it is reported like any other loading screen.

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { preconsCopy } from "../../../lib/copy/precons";
import { preconsLoadingCopy } from "../../../lib/copy/shell";
import { parsePreconParams } from "../../../lib/precons/list";
import { PICK_ENTRY_HREF, PICK_PARAM, PICK_VALUE, pickEntry } from "../../../lib/precons/pick";
import { StallWatch } from "../../shell/nav-stall";
import { PendingReporter } from "../../shell/pending-reporter";
import { BAR, RowSkeleton, TileSkeleton } from "../../ui/tile-skeleton";
import { PRECON_ROWS_CLASS, PRECON_TILES_COLUMNS } from "./precon-grid";
import { TOUCH_HIT } from "../../ui/touch-hit";

const copy = preconsCopy.list;
const pickCopy = preconsCopy.pick;
const SHAPE = "rounded-[8px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]";

/** The page's own columns with the row gap taken off the grid and put on each tile as a margin: the extra tiles sit in
 *  zero-height implicit rows (`grid-auto-rows: 0`), and a row GAP would keep adding space for each of them inside the clip.
 *  Three rows show at 390 and two from `md`, whatever the column count the page's class gives; the rest overflow their zero
 *  tracks below the box and `overflow-hidden` cuts them. 24 tiles cover a 12-column grid. */
const TILES_CLASS = `${PRECON_TILES_COLUMNS} gap-x-[10px] md:gap-x-[12px] grid-rows-[repeat(3,auto)] md:grid-rows-[repeat(2,auto)] [grid-auto-rows:0] overflow-hidden [&>li]:mb-[10px] md:[&>li]:mb-[12px]`;
const TILE_COUNT = 24;

/** `storedView` is the cookie's view where the server could read it (the route's own `loading.tsx`); an explicit `?view=` wins,
 *  as in the list. */
export function PreconsLoading({ storedView = null }: { storedView?: "tiles" | "rows" | null }) {
  const params = useSearchParams();
  // `?pick=own` is a different page (Precons I own, `PreconPickView`): its own frame, not the list's.
  if (params.get(PICK_PARAM) === PICK_VALUE) return <PreconPickLoading entry={pickEntry(params.get("from"))} />;
  const view = parsePreconParams(new URLSearchParams(params.toString())).view ?? storedView ?? "tiles";
  const fromNew = params.get("from") === "new";
  const back = fromNew ? "/decks/new" : "/decks";
  return (
    <div data-loading-screen className="pb-[96px]">
      <span role="status" className="sr-only">{preconsLoadingCopy.status}</span>
      <StallWatch />
      <header className="flex flex-col gap-[4px] border-b-[1px] border-solid border-x-0 border-t-0 border-b-[color:var(--border)] p-[12px_16px_12px] md:p-[16px_22px_16px]">
        <Link href={back} className={`${TOUCH_HIT} self-start font-mono text-[11px] text-[color:var(--fg-faint)] no-underline`}>
          {fromNew ? copy.backNew : copy.back}
          <PendingReporter href={back} />
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

const PICK_ROWS = 14;
const PICK_NAME = [62, 74, 55, 80, 68, 58, 77];

/** What `?pick=own` draws while it loads: the pick view's own frame (its header with the real title and lead, the search and
 *  colour line, the result line, a year heading, rows at the real rows' 56px (52 from `md`), and the sticky foot), so the
 *  page does not change shape when the list lands. The header and the foot's place are real; the rest are shapes. */
function PreconPickLoading({ entry }: { entry: "home" | "collection" }) {
  const back = PICK_ENTRY_HREF[entry];
  return (
    <div data-loading-screen className="flex min-w-0 flex-1 flex-col">
      <span role="status" className="sr-only">{preconsLoadingCopy.status}</span>
      <StallWatch />
      <header className="flex flex-col gap-[4px] p-[12px_16px_0] md:mx-auto md:w-full md:max-w-[900px] md:p-[22px_0_0]">
        <Link href={back} className="flex min-h-[32px] items-center self-start text-[13px] text-[color:var(--fg-muted)] no-underline md:text-[12.5px]">
          {entry === "collection" ? pickCopy.backCollection : pickCopy.backHome}
          <PendingReporter href={back} />
        </Link>
        <h1 className="m-0 font-display text-[22px] font-normal text-[color:var(--fg)] md:text-[26px]">{pickCopy.title}</h1>
        <p className="m-0 text-[13px] leading-[1.5] text-[color:var(--fg-muted)] md:hidden">{pickCopy.subPhone}</p>
        <p className="m-0 hidden max-w-[720px] text-[13.5px] leading-[1.55] text-[color:var(--fg-muted)] md:block">{pickCopy.sub}</p>
      </header>
      <div aria-hidden className="anim-skeleton flex flex-1 flex-col">
        <div className="p-[12px_16px_0] md:mx-auto md:w-full md:max-w-[900px] md:p-[16px_0_0]">
          <div className="flex flex-col gap-[10px] md:flex-row md:items-center">
            <span className={`${SHAPE} h-[44px] min-w-0 md:flex-1`} />
            <span className={`${SHAPE} h-[22px] w-[134px] flex-none pointer-coarse:h-[44px] pointer-coarse:w-[264px]`} />
          </div>
          <span className="m-[10px_0_0] flex h-[16px] items-center md:h-[17px]"><span className={`${BAR} h-[10px] w-[180px]`} /></span>
        </div>
        <div className="flex flex-1 flex-col gap-[18px] overflow-hidden p-[8px_16px_24px] md:mx-auto md:w-full md:max-w-[900px] md:px-0">
          <section className="flex flex-col">
            <span className="flex h-[34px] items-start border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)] pb-[7px]">
              <span className={`${BAR} h-[17px] w-[64px]`} />
            </span>
            <ul className="m-0 list-none p-0">
              {Array.from({ length: PICK_ROWS }, (_, i) => (
                <li key={i} data-testid="pick-row-skeleton" className="flex flex-col border-x-0 border-t-0 border-b-[1px] border-solid border-b-[color:var(--border)]">
                  <span className="flex min-h-[56px] items-center gap-[12px] px-[4px] md:min-h-[52px] md:gap-[14px] md:px-[10px]">
                    <span className="h-[18px] w-[18px] flex-none rounded-[4px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-sunken)]" />
                    <span className="h-[48px] w-[34px] flex-none rounded-[4px] bg-[color:var(--surface-sunken)]" />
                    <span className="flex w-[52px] flex-none gap-[3px] md:w-[57px]">
                      <span className="h-[8px] w-[8px] rounded-full bg-[color:var(--surface-raised)] md:h-[9px] md:w-[9px]" />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-[3px] md:gap-[2px]">
                      <span className={`${BAR} h-[14px]`} style={{ width: `${PICK_NAME[i % PICK_NAME.length]}%`, maxWidth: 280 }} />
                      <span className={`${BAR} h-[10px] w-[96px] bg-[color:var(--surface-raised)]`} />
                    </span>
                    <span className={`${BAR} h-[11px] w-[28px] flex-none bg-[color:var(--surface-raised)] md:w-[64px]`} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      <div
        aria-hidden
        className="sticky bottom-[var(--tabbar-h)] z-20 border-x-0 border-b-0 border-t-[1px] border-solid border-t-[color:var(--border)] bg-[color:var(--bg)] p-[10px_16px_12px] md:bottom-0 md:bg-[color:var(--surface-rail)] md:p-0"
      >
        <div className="flex flex-col gap-[8px] md:mx-auto md:h-[68px] md:max-w-[900px] md:flex-row md:items-center md:gap-[12px]">
          <span className="flex h-[13px] items-center justify-center md:flex-1 md:justify-start"><span className={`${BAR} h-[10px] w-[160px]`} /></span>
          <span className={`${SHAPE} hidden h-[40px] w-[78px] md:block`} />
          <span className={`${SHAPE} h-[48px] w-full rounded-[10px] md:h-[40px] md:w-[110px] md:rounded-[8px]`} />
        </div>
      </div>
    </div>
  );
}
