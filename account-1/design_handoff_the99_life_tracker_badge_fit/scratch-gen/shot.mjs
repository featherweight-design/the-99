// node shot.mjs <tree> <specs.json> [filter]
import { chromium } from "playwright"; import { writeFileSync, mkdirSync, readFileSync } from "node:fs"; import { page } from "./page.mjs"; import * as F from "./fix.mjs";
const [tree, specFile, filt] = process.argv.slice(2); const only = filt ? new RegExp(filt) : null;
const specs = JSON.parse(readFileSync(specFile, "utf8")); const G = process.cwd(); mkdirSync(G + "/out/shots", { recursive: true });
import { existsSync, readFileSync as rf } from "node:fs";
const MIME = { html: "text/html", js: "text/javascript", css: "text/css", svg: "image/svg+xml", jpg: "image/jpeg", webp: "image/webp", png: "image/png", woff2: "font/woff2" };
const serveLocal = (p) => p.route("http://app.local/**", (r) => { const path = "/home/user/work/out" + decodeURIComponent(new URL(r.request().url()).pathname); if (!existsSync(path)) return r.fulfill({ status: 404, body: "" }); r.fulfill({ status: 200, contentType: MIME[path.split(".").pop()] ?? "application/octet-stream", body: rf(path) }); });
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const report = {};
for (const s of specs) {
  if (only && !only.test(s.id)) continue;
  const seats = s.seats.map((k) => F.SEATS[k]);
  const fix = { seats, log: F.heavy(seats.filter((x) => x.seat !== 0).map((x) => x.seat), s.ends ?? 2), layout: s.layout };
  writeFileSync(`${G}/out/${tree}-${s.id}.html`, page({ fix, css: tree + ".css", js: tree + ".js" }));
  const p = await b.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale ?? 2, reducedMotion: "reduce", hasTouch: s.touch ?? true });
  await serveLocal(p); p.on("pageerror", (e) => console.log("ERR", s.id, e.message));
  await p.goto(`http://app.local/${tree}-${s.id}.html`); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click()); await p.waitForTimeout(400);
  await p.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
  if (s.click) { await p.locator(s.click).first().click({ force: true }); await p.waitForTimeout(500); }
  // Which badges of seat 0 are clipped by their row?
  report[s.id] = await p.evaluate(() => { const panel = document.querySelector('[data-testid=tracker-panel][data-seat="0"]'); const row = panel?.querySelector("[data-testid=panel-badges]"); if (!row) return null; const R = row.getBoundingClientRect();
    const all = [...row.querySelectorAll(":scope > [data-testid=panel-badge], :scope > [data-testid=panel-badge-more]")]; const vis = all.filter((e) => { const r = e.getBoundingClientRect(); return r.right <= R.right + 1 && r.bottom <= R.bottom + 1 && r.left >= R.left - 1 && r.top >= R.top - 1; });
    return { total: all.length, shown: vis.length, hidden: all.filter((e) => !vis.includes(e)).map((e) => e.textContent) }; });
  await p.screenshot({ path: `${G}/out/shots/${tree}-${s.id}.png` });
  if (!s.click) { const box = await p.evaluate(() => { const panel = document.querySelector('[data-testid=tracker-panel][data-seat="0"]'); const el = panel; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; });
    const pad = 4; const clip = { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.width + pad * 2, height: box.height + pad * 2 };
    clip.width = Math.min(clip.width, s.w - clip.x); clip.height = Math.min(clip.height, s.h - clip.y);
    await p.screenshot({ path: `${G}/out/shots/${tree}-${s.id}-zoom.png`, clip }); }
  await p.close();
}
console.log(JSON.stringify(report, null, 1)); await b.close();
