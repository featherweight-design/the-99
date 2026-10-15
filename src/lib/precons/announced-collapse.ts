// How a large reveal folds in the Announced group (design addendum A1, `addendum-announced-collapse`). Pure, so the
// rule and the first-paint CSS are tested without a browser.

/** A set collapses to its first row when its tiles number more than this many rows of the grid's columns. */
export const COLLAPSE_ROWS = 2;

/** Collapse only when the tiles number more than twice the columns; nothing collapses while a filter is on. */
export function collapsible(tiles: number, columns: number, filtering: boolean): boolean {
  return !filtering && columns > 0 && tiles > COLLAPSE_ROWS * columns;
}

// The grid's column floors (`PRECON_TILES_COLUMNS`): 150px from 480 to `md`, 178px from `md`, each with its gap (10 and
// 12). `k` columns need `k * (floor + gap) - gap` of width, so a grid `W` wide lays `floor((W + gap) / (floor + gap))`.
const STEPS = [
  { media: "(min-width: 480px) and (max-width: 767.98px)", floor: 150, gap: 10 },
  { media: "(min-width: 768px)", floor: 178, gap: 12 },
] as const;

/** The least grid width that lays `k` columns at a floor. */
const widthFor = (k: number, floor: number, gap: number) => k * (floor + gap) - gap;

/**
 * The CSS that hides a collapsing set's tiles past its first row on the SERVER's paint, before the browser can read
 * the column count: below 480px the grid is two columns; above it the columns follow the container's width at each
 * floor. A tile `i` of `n` is hidden while the grid is narrower than the one that would lay `min(i, ceil(n / 2))`
 * columns, since a set stays whole once its columns reach half its tiles. Switched off (`data-measured`) when the
 * client has measured the real columns and draws the collapse itself. Empty for a set that never collapses (4 or
 * fewer: two columns at 390 is the fewest any width lays).
 */
export function firstPaintCss(code: string, tiles: number): string {
  if (tiles <= COLLAPSE_ROWS * 2) return "";
  const scope = `[data-collapse="${code}"]:not([data-measured])`;
  const m = Math.ceil(tiles / COLLAPSE_ROWS);
  const rules = [`@media (max-width: 479.98px) { ${scope} > li:nth-child(n+3) { display: none; } }`];
  for (const { media, floor, gap } of STEPS) {
    const inner: string[] = [];
    for (let k = 2; k <= m; k++) {
      inner.push(`@container (max-width: ${widthFor(k, floor, gap) - 0.02}px) { ${scope} > li:nth-child(n+${k}) { display: none; } }`);
    }
    rules.push(`@media ${media} { ${inner.join(" ")} }`);
  }
  return rules.join("\n");
}
