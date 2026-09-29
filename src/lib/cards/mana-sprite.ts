/**
 * One file holding every mana symbol, so the app asks for them ONCE and early.
 *
 * Each pip used to be its own file, drawn as a CSS background, so the browser only began to fetch a
 * symbol when a pip carrying it painted, and every pip showed an empty box first (Hugh, 2026-09-28:
 * "pips pop in"). Now the root layout preloads this one file and every pip addresses its symbol by a
 * fragment. The fragment names an SVG `<view>`, which shows one symbol's own box out of the sheet,
 * so the CSS that draws a pip is unchanged apart from its URL.
 *
 * Built from the committed per-symbol files by `pnpm build:mana-sprite`, which `pnpm fetch:mana` runs
 * after it writes them. Pure, so the test can build it from fixtures.
 */

export const MANA_SPRITE_PATH = "/mana/sprite.svg";

/** An XML id cannot start with a digit, and `2W` and `1000000` are real slugs. */
export function manaSpriteId(slug: string): string {
  return `m-${slug}`;
}

export function manaSpriteHref(slug: string): string {
  return `${MANA_SPRITE_PATH}#${manaSpriteId(slug)}`;
}

/** The cells sit this far apart, so a view's edge can never take a pixel of its neighbour. */
const GAP = 10;

export function buildManaSprite(symbols: readonly { slug: string; svg: string }[]): string {
  let x = 0;
  let height = 0;
  const parts: string[] = [];
  for (const { slug, svg } of [...symbols].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const open = svg.match(/<svg\b[^>]*>/);
    const box = open?.[0].match(/viewBox=['"]([^'"]+)['"]/)?.[1];
    const close = svg.lastIndexOf("</svg>");
    if (!open || !box || close < 0) throw new Error(`mana sprite: ${slug} is not an svg with a viewBox`);
    // A reference would resolve against the whole sheet once merged, possibly to another symbol's
    // element. None of the committed files carries one; refuse rather than draw the wrong thing.
    if (/url\(#|href=['"]#/.test(svg)) throw new Error(`mana sprite: ${slug} references an id`);
    const [, , w, h] = box.trim().split(/[\s,]+/).map(Number);
    if (!(w > 0 && h > 0)) throw new Error(`mana sprite: ${slug} has an unusable viewBox "${box}"`);
    // Unreferenced ids (Scryfall's exporter labels paths `Shape`) are dropped, so the sheet holds each
    // id once: its views'.
    const inner = svg.slice((open.index ?? 0) + open[0].length, close).replace(/\s+id=(['"])[^'"]*\1/g, "");
    parts.push(
      `<view id="${manaSpriteId(slug)}" viewBox="${x} 0 ${w} ${h}"/>`,
      `<svg x="${x}" y="0" width="${w}" height="${h}" viewBox="${box}">${inner}</svg>`,
    );
    x += w + GAP;
    height = Math.max(height, h);
  }
  const width = Math.max(0, x - GAP);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${parts.join("")}</svg>\n`;
}
