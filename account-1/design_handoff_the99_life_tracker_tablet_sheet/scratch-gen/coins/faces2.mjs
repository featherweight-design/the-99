// Coin face options R3 (account 1, 2026-11-22). Hugh on R2: centre the emblems, give HEADS/TAILS room below the ring,
// make day/night Magic's own, and the mana face colourless and larger. Glyphs are Magic's symbols as drawn by the
// mana-font package (svg/, MIT/OFL; symbols (c) Wizards of the Coast), the same set the app's public/mana comes from.
import { readFileSync } from "node:fs";
const SVG = new URL("../../dl/mana/package/svg/", import.meta.url);
const d = (n) => readFileSync(new URL(`${n}.svg`, SVG), "utf8").match(/ d="([^"]+)"/)[1];
const SHADE = "color-mix(in oklab, var(--accent) 34%, black)";
const LIGHT = "color-mix(in oklab, var(--accent) 45%, white)";
const METAL = "color-mix(in oklab, var(--accent) 88%, white)";
const engrave = (g) => `<g transform="translate(.6 .7)" opacity=".55">${g(LIGHT)}</g>${g(SHADE)}`;
// A 32-unit glyph centred on (cx, cy) at size s.
const glyph = (n, cx, cy, s, c) => `<path d="${d(n)}" fill="${c}" transform="translate(${cx - s / 2} ${cy - s / 2}) scale(${s / 32})"/>`;
const one = (n, s) => () => engrave((c) => glyph(n, 50, 50, s, c));
// Struck pip: a disc cut into the coin with the symbol left standing in the metal.
const pip = (n, cx, cy, r, k = 0.68) => `<circle cx="${cx + .5}" cy="${cy + .6}" r="${r}" fill="${LIGHT}" opacity=".5"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="${SHADE}"/>${glyph(n, cx, cy, 2 * r * k, METAL)}`;
const ring5 = (draw) => ["w", "u", "b", "r", "g"].map((m, i) => { const a = (-90 + i * 72) * Math.PI / 180; return draw(m, 50 + 19.5 * Math.cos(a), 50 + 19.5 * Math.sin(a)); }).join("");
const EMBLEM = {
  daynight: { heads: one("dfc-day", 50), tails: one("dfc-night", 50) },
  spark: { heads: one("dfc-spark", 50), tails: one("dfc-ignite", 50) },
  pips: { heads: () => ring5((m, x, y) => pip(m, x, y, 11.6)), tails: () => pip("c", 50, 50, 25, 0.66) },
  bare: { heads: () => engrave((c) => ring5((m, x, y) => glyph(m, x, y, 21, c))), tails: one("c", 46) },
};
export const OPTIONS = { daynight: "Day and night", spark: "Spark and planeswalker", pips: "Mana, struck pips", bare: "Mana, bare symbols" };
export function face(opt, side) {
  const word = side === "heads" ? "HEADS" : "TAILS", id = `arc-${opt}-${side}`;
  // Baseline on r 43; the caps reach to about r 38.4, clear of the inner ring at r 35.
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style="position:absolute;inset:0;overflow:visible">
<circle cx="50" cy="50" r="47.6" fill="none" stroke="${SHADE}" stroke-width="2.8" stroke-dasharray=".7 1.3" opacity=".75"/>
<circle cx="50" cy="50" r="45.8" fill="none" stroke="${SHADE}" stroke-width=".9"/>
<circle cx="50" cy="50" r="35" fill="none" stroke="${SHADE}" stroke-width=".7" opacity=".8"/>
<path id="${id}" d="M 7 50 A 43 43 0 0 0 93 50" fill="none"/>
<text font-family="Cinzel" font-weight="700" font-size="6.4" letter-spacing="2" fill="${SHADE}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${word}</textPath></text>
${EMBLEM[opt][side]()}
</svg>`;
}
