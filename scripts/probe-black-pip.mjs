// Does the --b pip carry its --bg glyph in all six themes? Renders the shipped
// mana-pip markup against each theme's real canvas and reports the painted
// disc, the painted glyph, and the contrast between them — then screenshots the
// row, which is the half `contract.test.ts` cannot judge.
//
// Run by hand, and not part of `pnpm test` — it needs a browser and a running
// dev server. No sign-in: the landing page loads globals.css, which is all this
// measures.
//
//   PROBE_BASE=http://localhost:3007 node scripts/probe-black-pip.mjs

import { readFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOT_DIR ?? "/tmp/black-pip";
const THEMES = [
  ...new Set(
    [...readFileSync("src/app/globals.css", "utf8").matchAll(/\[data-theme="([a-z]+)"\]/g)].map(
      (m) => m[1],
    ),
  ),
];
if (THEMES.length < 6) throw new Error(`Read ${THEMES.length} themes, expected 6.`);

function lum(rgb) {
  const [r, g, b] = rgb.match(/\d+/g).slice(0, 3).map((n) => {
    const c = Number(n) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

await mkdir(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 520, height: 220 } });
// The public landing page is enough: it loads globals.css, which is the only
// thing under test. The pip markup is injected so the probe does not depend on
// a signed-in fixture happening to own a black card.
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.evaluate(() => {
  const host = document.createElement("div");
  host.id = "pip-probe";
  host.style.cssText =
    "position:fixed;inset:0;z-index:99999;display:flex;align-items:center;" +
    "justify-content:center;gap:14px;background:var(--bg)";
  // Verbatim from mana-pips.tsx: design palette background, --bg glyph.
  for (const sym of ["W", "U", "B", "R", "G"]) {
    const pip = document.createElement("span");
    pip.dataset.sym = sym;
    pip.textContent = sym;
    pip.style.cssText =
      "display:inline-flex;align-items:center;justify-content:center;" +
      "border-radius:9999px;font-family:monospace;font-size:13px;font-weight:600;" +
      `width:26px;height:26px;color:var(--bg);background:var(--${sym.toLowerCase()})`;
    host.appendChild(pip);
  }
  document.body.appendChild(host);
});

let failures = 0;
for (const theme of THEMES) {
  await page.evaluate((t) => {
    document.documentElement.dataset.theme = t;
  }, theme);
  const read = await page.evaluate(() =>
    [...document.querySelectorAll("#pip-probe span")].map((el) => {
      const s = getComputedStyle(el);
      return { sym: el.dataset.sym, disc: s.backgroundColor, glyph: s.color };
    }),
  );
  const canvas = await page.evaluate(
    () => getComputedStyle(document.getElementById("pip-probe")).backgroundColor,
  );
  const line = read.map((r) => {
    const ratio = contrast(r.disc, r.glyph);
    if (r.sym === "B" && ratio < 4.5) failures++;
    return `${r.sym} ${r.disc.replace(/\s/g, "")} glyph ${ratio.toFixed(2)}:1 canvas ${contrast(r.disc, canvas).toFixed(2)}:1`;
  });
  console.log(`\n${theme}`);
  for (const l of line) console.log(`  ${l}`);
  await page.screenshot({ path: `${SHOTS}/${theme}.png` });
}

await browser.close();
console.log(
  failures === 0
    ? "\nBlack pip clears 4.5:1 for its glyph in every theme."
    : `\n${failures} theme(s) fail the black pip glyph floor.`,
);
process.exit(failures === 0 ? 0 : 1);
