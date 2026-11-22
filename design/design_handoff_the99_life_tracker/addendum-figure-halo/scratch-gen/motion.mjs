// node motion.mjs <tree> -> out/shots/<tree>-M-in-<t>.png, -M-out-<t>.png, -M-rm-*.png (crops round seat 0's figure)
import { chromium } from "playwright"; import { writeFileSync } from "node:fs"; import { page } from "./page.mjs"; import * as F from "./fix.mjs";
const tree = process.argv[2]; const G = process.cwd();
const fix = { seats: ["whiteYou", "colin", "peter", "saiDee"].map((k) => F.SEATS[k]), log: F.LOG, layout: "tablet-4-around" };
writeFileSync(`${G}/out/${tree}-M.html`, page({ fix, css: tree + ".css", js: tree + ".js" }));
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
async function open(rm) {
  const p = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, reducedMotion: rm ? "reduce" : "no-preference", hasTouch: true });
  await p.goto(`file://${G}/out/${tree}-M.html`); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click()); await p.waitForTimeout(rm ? 300 : 2600);
  await p.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
  return p;
}
const panelOf = (p) => p.locator('[data-testid=tracker-panel][data-seat="0"]');
const clipOf = async (p) => { const r = await panelOf(p).getByTestId("life-number").boundingBox(); return { x: r.x + r.width - 40, y: r.y - 30, width: 150, height: 90 }; };
const shot = async (p, name, clip) => { await p.screenshot({ path: `${G}/out/shots/${tree}-M-${name}.png`, clip }); console.log(name); };
const pauseAt = (p, name, t) => p.evaluate(({ name, t }) => { for (const a of document.getAnimations()) { if (!name || a.animationName === name) { a.pause(); a.currentTime = t; } } }, { name, t });
// Fade in: first step of a run.
for (const t of [0, 50, 100, 150]) {
  const p = await open(false); const clip = await clipOf(p);
  await p.evaluate(() => { window.__st = window.setTimeout; window.setTimeout = (f, ms, ...a) => (ms === 2000 ? 0 : window.__st(f, ms, ...a)); });
  const h = panelOf(p).getByTestId("half-minus"); await h.click({ force: true, delay: 10 }); await h.click({ force: true, delay: 10 }); await h.click({ force: true, delay: 10 });
  await pauseAt(p, null, t); await p.waitForTimeout(50); await shot(p, `in-${String(t).padStart(3, "0")}`, clip); await p.close();
}
// Fade out at the save.
for (const t of [0, 100, 200, 300, 400]) {
  const p = await open(false); const clip = await clipOf(p);
  const h = panelOf(p).getByTestId("half-minus"); for (let k = 0; k < 3; k++) await h.click({ force: true, delay: 10 });
  await p.waitForFunction(() => !!document.querySelector("[data-testid=life-pending-fade]"), null, { timeout: 4000 });
  await pauseAt(p, "life-pending-out", t); await p.waitForTimeout(50); await shot(p, `out-${String(t).padStart(3, "0")}`, clip); await p.close();
}
// Reduced motion: pending shows at once, clears at the save.
{ const p = await open(true); const clip = await clipOf(p); const h = panelOf(p).getByTestId("half-minus");
  await h.click({ force: true, delay: 10 }); await p.waitForTimeout(16); await shot(p, "rm-tap", clip);
  for (let k = 0; k < 2; k++) await h.click({ force: true, delay: 10 }); await p.waitForTimeout(100); await shot(p, "rm-pending", clip);
  await p.waitForFunction(() => !document.querySelector("[data-testid=life-pending]"), null, { timeout: 4000 }); await p.waitForTimeout(16); await shot(p, "rm-saved", clip); await p.close(); }
await b.close();
