// Coin face options (tablet addendum R2, account 1, 2026-11-22). Each face is one SVG on a 100x100 box laid over the
// shipped .coin-face metal: a reeded rim, an inner ring, an engraved emblem, and HEADS / TAILS curved along the bottom.
const MANA = "file:///home/user/the-99/.worktrees/design-tracker-tablet-sheet/public/mana/";
const SHADE = "color-mix(in oklab, var(--accent) 34%, black)";
const LIGHT = "color-mix(in oklab, var(--accent) 45%, white)";
// Engraved: the emblem cut in the shade, with the light catching its lower lip.
const engrave = (g) => `<g transform="translate(.7 .8)" opacity=".55">${g(LIGHT)}</g>${g(SHADE)}`;

const sun = (c) => `<g transform="translate(26 18) scale(2)" fill="none" stroke="${c}" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="4.2" fill="${c}"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></g>`;
const moon = (c) => `<g transform="translate(26 18) scale(2)" fill="${c}" stroke="${c}" stroke-width="1.4" stroke-linejoin="round"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></g><g fill="${c}"><path d="M70 22l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1z"/><path d="M76 36l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z"/></g>`;
// The crowned numeral: the brand sheet's 8/11 diamonds (CrownDiamonds) over a Cinzel 900 "99".
const diamond = (cx, cy, s, c) => `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" transform="rotate(45 ${cx} ${cy})" fill="${c}"/>`;
const crowned = (c) => `${diamond(38.6, 24, 5.6, c)}${diamond(50, 22.6, 7.6, c)}${diamond(61.4, 24, 5.6, c)}<text x="50" y="60" text-anchor="middle" font-family="Cinzel" font-weight="900" font-size="34" letter-spacing="-1" fill="${c}">99</text>`;
const xcix = (c) => `<rect x="22" y="22" width="56" height="40" rx="11" fill="none" stroke="${c}" stroke-width="2.6"/><text x="50" y="50.5" text-anchor="middle" font-family="Cinzel" font-weight="700" font-size="17" letter-spacing=".6" fill="${c}">XCIX</text>`;
// Mana: the shipped symbols as enamel inlays, set in the metal with a shade ring.
const pip = (sym, cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r + 1.1}" fill="${SHADE}"/><image href="${MANA}${sym}.svg" x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}"/>`;
const five = () => {
  const syms = ["W", "U", "B", "R", "G"]; let s = "";
  syms.forEach((m, i) => { const a = (-90 + i * 72) * Math.PI / 180; s += pip(m, 50 + 17 * Math.cos(a), 42 + 17 * Math.sin(a), 7.4); });
  return s;
};
const colorless = () => pip("C", 50, 42, 18);

const EMBLEM = {
  daynight: { heads: () => engrave(sun), tails: () => engrave(moon) },
  crowned: { heads: () => engrave(crowned), tails: () => engrave(xcix) },
  mana: { heads: five, tails: colorless },
};
export const OPTIONS = { daynight: "Day and night", crowned: "The crowned 99", mana: "Mana" };

export function face(opt, side) {
  const word = side === "heads" ? "HEADS" : "TAILS";
  const id = `arc-${opt}-${side}`;
  return `<svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style="position:absolute;inset:0;overflow:visible">
<circle cx="50" cy="50" r="47.6" fill="none" stroke="${SHADE}" stroke-width="2.8" stroke-dasharray=".7 1.3" opacity=".75"/>
<circle cx="50" cy="50" r="45.6" fill="none" stroke="${SHADE}" stroke-width=".9"/>
<circle cx="50" cy="50" r="36.4" fill="none" stroke="${SHADE}" stroke-width=".7" opacity=".8"/>
<path id="${id}" d="M 9.5 50 A 40.5 40.5 0 0 0 90.5 50" fill="none"/>
<text font-family="Cinzel" font-weight="700" font-size="7" letter-spacing="2.2" fill="${SHADE}"><textPath href="#${id}" startOffset="50%" text-anchor="middle">${word}</textPath></text>
<g transform="translate(50 50) scale(.86) translate(-50 -50)">${EMBLEM[opt][side]()}</g>
</svg>`;
}
