// node coins/spine.mjs (from gen/): the spine's day/night button today (SunIcon/MoonIcon) and with Magic's markers.
import { chromium } from "playwright"; import { readFileSync, writeFileSync } from "node:fs"; import { page } from "../page.mjs"; import { SEATS, LOG } from "../fix.mjs";
const G = process.cwd(), O = G + "/coins/spine";
const P = new URL("../../dl/mana/package/svg/", import.meta.url);
const glyph = (n) => `<svg width="19" height="19" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" style="margin:auto"><path d="${readFileSync(new URL(n + ".svg", P), "utf8").match(/ d="([^"]+)"/)[1]}"/></svg>`;
const MAGIC = { day: glyph("dfc-day"), night: glyph("dfc-night") };
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files"] });
for (const [dev, W, H, layout] of [["tablet", 1180, 820, "tablet-4"], ["phone", 390, 844, "phone-4-sides"]]) {
  const fix = { seats: [SEATS.you, SEATS.colin, SEATS.peter, SEATS.max], log: LOG, layout };
  writeFileSync(`${G}/out/m-spine-${dev}.html`, page({ fix, css: "app2.css", js: "app2.js" }));
  for (const [state, clicks] of [["off", 0], ["day", 1], ["night", 2]]) for (const variant of ["now", "magic"]) {
    const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 3, hasTouch: true, reducedMotion: "reduce" });
    await p.goto(`file://${G}/out/m-spine-${dev}.html`); await p.waitForTimeout(700);
    const btn = p.locator('[data-testid="strip-day"]');
    for (let i = 0; i < clicks; i++) { await btn.click(); await p.waitForTimeout(250); }
    const label = await btn.getAttribute("aria-label");
    if (variant === "magic") await p.evaluate((svg) => { document.querySelector('[data-testid="strip-day-icon"]').innerHTML = svg; }, state === "night" ? MAGIC.night : MAGIC.day);
    await p.waitForTimeout(100);
    const box = await btn.evaluate((el) => { const r = el.parentElement.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const pad = 10, horiz = box.w > box.h;
    const clip = horiz ? { x: Math.max(0, box.x - pad), y: box.y - pad, width: Math.min(W, box.w + 2 * pad), height: box.h + 2 * pad } : { x: box.x - pad, y: Math.max(0, box.y - pad), width: box.w + 2 * pad, height: Math.min(H, box.h + 2 * pad) };
    await p.screenshot({ path: `${O}/${dev}-${state}-${variant}.png`, clip });
    console.log(dev, state, variant, label, JSON.stringify(clip)); await p.close();
  }
}
await b.close();
