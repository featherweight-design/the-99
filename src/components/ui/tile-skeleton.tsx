// The shapes a list of tiles (or rows) draws while it loads (small-polish handoff §4): a tile's own shell, its 63:88 art
// box and three caption bars, built from the constants the real tile is, so the page does not change size when it lands.
// Still shapes only; the caller breathes them (`anim-skeleton`) and says one line for a screen reader.
//
// `TileSkeleton` is the tile and `RowSkeleton` the row view's. Nothing here is interactive or announces itself:
// every shape is `aria-hidden`.

import { TILE_ART_CLIP, TILE_ART_RATIO, TILE_SHELL } from "./card-tile-caption";

const BAR = "rounded-[3px] bg-[color:var(--elevated)]";

/** The owned line (42 to 46%), the name (60 to 90%) and the identity dots, varied by position so a grid is not a wall. */
const OWNED = [44, 42, 46, 43, 45, 42];
const NAME = [78, 62, 88, 70, 84, 60, 90, 74];

export function TileSkeleton({ index = 0 }: { index?: number }) {
  return (
    <li
      aria-hidden
      data-testid="tile-skeleton"
      className={`${TILE_SHELL} relative min-w-0 border border-solid border-[color:var(--border)] bg-[color:var(--surface)]`}
    >
      <div
        className={`relative w-full overflow-hidden bg-[color:var(--surface-sunken)] ${TILE_ART_CLIP}`}
        style={{ aspectRatio: TILE_ART_RATIO }}
      />
      <div className="flex flex-col gap-[7px] p-[9px_10px_11px]">
        <span className={`${BAR} h-[9px] bg-[color:var(--surface-raised)]`} style={{ width: `${OWNED[index % OWNED.length]}%` }} />
        <span className={`${BAR} h-[12px]`} style={{ width: `${NAME[index % NAME.length]}%` }} />
        <span className="mt-[2px] flex gap-[3px]">
          {Array.from({ length: 2 + (index % 2) }, (_, i) => (
            <span key={i} className="h-[8px] w-[8px] rounded-full bg-[color:var(--surface-raised)]" />
          ))}
        </span>
      </div>
    </li>
  );
}

export function RowSkeleton({ index = 0 }: { index?: number }) {
  return (
    <li
      aria-hidden
      data-testid="row-skeleton"
      className="flex min-h-[44px] items-center gap-[11px] rounded-[10px] border border-solid border-[color:var(--border)] bg-[color:var(--surface-rail)] p-[10px_8px_10px_12px] md:gap-[14px] md:rounded-[11px]"
    >
      <span className="h-[56px] w-[40px] flex-none rounded-[5px] bg-[color:var(--surface-sunken)]" />
      <span className="flex min-w-0 flex-1 flex-col gap-[7px]">
        <span className={`${BAR} h-[12px]`} style={{ width: `${NAME[index % NAME.length]}%` }} />
        <span className={`${BAR} h-[9px] bg-[color:var(--surface-raised)]`} style={{ width: `${OWNED[index % OWNED.length]}%` }} />
      </span>
    </li>
  );
}
