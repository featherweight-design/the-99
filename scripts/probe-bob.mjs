// Why the crab and kaiju "stepped" instead of floating, and the check that they
// no longer do. Reads the real keyframes out of globals.css, runs them in
// Chromium, and reports peak per-frame velocity.
//
// The threshold: a display can only render motion as continuous if the element
// covers a pixel in a handful of frames. At the mock's 5px/4.5s the bob peaked
// at 0.034px/frame — one pixel per ~29 frames — so it visibly held, then
// jumped. Compositing was never the problem.
//
// Run by hand: `node scripts/probe-bob.mjs`. Not part of `pnpm test` (needs a
// browser); kept because the next person to touch these numbers needs the
// measurement, not the anecdote.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(resolve(HERE, "../src/app/globals.css"), "utf8");

// Tailwind's @import can't resolve here, so lift only the rules under test.
const rules = [...css.matchAll(/@keyframes (?:bob|breathe)\s*\{[\s\S]*?\n\}/g)].map((m) => m[0]);
const classes = [...css.matchAll(/\.anim-(?:bob|breathe)\s*\{[\s\S]*?\n\}/g)].map((m) => m[0]);
if (rules.length !== 2 || classes.length !== 2) {
  throw new Error(`Expected 2 keyframes and 2 classes, got ${rules.length} and ${classes.length}`);
}

const PEAK_FLOOR = 0.06; // px/frame — below this the motion reads as stepping.

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 600, height: 800 } });
await page.setContent(
  // Sizes match the real call sites, because breathe scales: the same scale
  // factor moves the kaiju's edge far more than it would a crab-sized box.
  `<!doctype html><style>
    body { margin: 0; background: #14110E; }
    div { background: #C9A24B; }
    #bob { width: 96px; height: 66px; }
    #breathe { width: 440px; height: 348px; }
    ${rules.join("\n")}
    ${classes.join("\n")}
  </style>
  <div class="anim-bob" id="bob"></div>
  <div class="anim-breathe" id="breathe"></div>`,
);

const profile = await page.evaluate(async () => {
  const out = { bob: [], breathe: [] };
  const start = performance.now();
  return await new Promise((done) => {
    function tick() {
      for (const id of Object.keys(out)) {
        const r = document.getElementById(id).getBoundingClientRect();
        // breathe scales as well as translates, so track both edges.
        out[id].push(r.y + r.height);
      }
      if (performance.now() - start > 1600) return done(out);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  });
});
await browser.close();

let failed = false;
for (const [id, samples] of Object.entries(profile)) {
  const deltas = samples.slice(1).map((v, i) => Math.abs(v - samples[i]));
  const peak = Math.max(...deltas);
  const ok = peak >= PEAK_FLOOR;
  if (!ok) failed = true;
  console.log(
    `${ok ? "ok  " : "SLOW"} ${id.padEnd(8)} peak ${peak.toFixed(3)} px/frame — ` +
      `1px every ${Math.round(1 / peak)} frames (floor: ${PEAK_FLOOR})`,
  );
}
process.exit(failed ? 1 : 0);
