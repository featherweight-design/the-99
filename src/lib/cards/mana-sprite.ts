/**
 * One file holding every mana symbol, so the app asks for them ONCE and early.
 *
 * Each pip used to be its own file, drawn as a CSS background, so the browser only began to fetch a
 * symbol when a pip carrying it painted, and every pip showed an empty box first (Hugh, 2026-09-28:
 * "pips pop in"). Now the root layout preloads this one file and every pip draws a window onto it.
 *
 * A CLASSIC CSS SPRITE, not SVG `<view>` fragments. A fragment changes what the image shows but not
 * its intrinsic size, so `contain` scaled the whole sheet into the box and every pip drew as a thin
 * strip, in Chromium and WebKit alike (`probe:pip-preload` found it). Here every symbol sits in its
 * own square cell of one row, and a pip picks its cell with `background-size` and
 * `background-position` in percentages, which hold at any box size.
 *
 * Built from the committed per-symbol files by `pnpm build:mana-sprite`, which `pnpm fetch:mana` runs
 * after it writes them. Pure, so the test can build it from fixtures.
 */
import { MANA_SYMBOL_SLUGS } from "./mana-symbol-slugs";

export const MANA_SPRITE_PATH = "/mana/sprite.svg";

/** Each cell is this square; a symbol of another shape is fitted and centered inside it. */
const CELL = 100;
/** Cells sit this far apart, so a scaled pip can never take a pixel of its neighbour. */
const GAP = 10;
const STRIDE = CELL + GAP;

/** Plain code-unit order, the same in Node and every browser, which `localeCompare` is not. */
function byCode(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** A sheet's cell order: its slugs, sorted by code unit. The build and the reader share the rule. */
export function spriteOrder(slugs: Iterable<string>): string[] {
  return [...slugs].sort(byCode);
}

/** The reader's cell order: the manifest's slugs. The committed sheet is built from the same files. */
export const MANA_SPRITE_ORDER: readonly string[] = spriteOrder(MANA_SYMBOL_SLUGS);

const INDEX = new Map(MANA_SPRITE_ORDER.map((slug, i) => [slug, i]));

/**
 * The style that draws one symbol out of the sheet: the four `background` longhands. Longhands
 * rather than the shorthand because jsdom's parser drops a position from the shorthand, so a test
 * reading the shorthand back sees the same value for every cell.
 */
export type ManaSpriteStyle = {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
  backgroundRepeat: string;
};

/**
 * One symbol's window onto the sheet, or null for a slug it does not hold. Sized in percentages of
 * the pip's own box, so a 12px dot and a 26px pip read the same value.
 */
export function manaSpriteBackground(
  slug: string,
  order: readonly string[] = MANA_SPRITE_ORDER,
): ManaSpriteStyle | null {
  const i = order === MANA_SPRITE_ORDER ? INDEX.get(slug) : order.indexOf(slug);
  if (i === undefined || i < 0) return null;
  const width = order.length * STRIDE - GAP;
  const size = (width / CELL) * 100;
  // Percentage positions align the same fraction of image and box: the offset that puts cell i at
  // the box's left edge is i·STRIDE over the sheet's overhang, width − CELL.
  const x = order.length > 1 ? ((i * STRIDE) / (width - CELL)) * 100 : 0;
  return {
    backgroundImage: `url(${MANA_SPRITE_PATH})`,
    backgroundPosition: `${round(x)}% 0%`,
    backgroundSize: `${round(size)}% 100%`,
    backgroundRepeat: "no-repeat",
  };
}

function round(n: number): string {
  return String(Math.round(n * 10000) / 10000);
}

export function buildManaSprite(
  symbols: readonly { slug: string; svg: string }[],
  order: readonly string[] = MANA_SPRITE_ORDER,
): string {
  const bySlug = new Map(symbols.map((s) => [s.slug, s.svg]));
  const parts: string[] = [];
  order.forEach((slug, i) => {
    const svg = bySlug.get(slug);
    if (svg === undefined) throw new Error(`mana sprite: no file for ${slug}`);
    const open = svg.match(/<svg\b[^>]*>/);
    const box = open?.[0].match(/viewBox=['"]([^'"]+)['"]/)?.[1];
    const close = svg.lastIndexOf("</svg>");
    if (!open || !box || close < 0) throw new Error(`mana sprite: ${slug} is not an svg with a viewBox`);
    // A reference would resolve against the whole sheet once merged, possibly to another symbol's
    // element. None of the committed files carries one; refuse rather than draw the wrong thing.
    // Any quoting or spacing: `url(#g)`, `url('#g')`, `href="#g"`, `xlink:href = '#g'`.
    if (/url\(\s*['"]?\s*#|href\s*=\s*['"]\s*#/i.test(svg)) {
      throw new Error(`mana sprite: ${slug} references an id`);
    }
    // Unreferenced ids (Scryfall's exporter labels paths `Shape`) are dropped, so none repeats.
    const inner = svg.slice((open.index ?? 0) + open[0].length, close).replace(/\s+id=(['"])[^'"]*\1/g, "");
    // A nested svg fits its own viewBox into the cell, centered, which is what `contain` did for
    // the single file.
    parts.push(`<svg x="${i * STRIDE}" y="0" width="${CELL}" height="${CELL}" viewBox="${box}">${inner}</svg>`);
  });
  const width = order.length * STRIDE - GAP;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${CELL}" viewBox="0 0 ${width} ${CELL}">${parts.join("")}</svg>\n`;
}
