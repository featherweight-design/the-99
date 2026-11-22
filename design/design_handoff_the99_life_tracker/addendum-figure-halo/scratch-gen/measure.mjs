// node measure.mjs <tree> <specs.json> [filter]  -> prints contrast per seat, writes out/shots/<tree>-<id>.png
import { chromium } from "playwright"; import { writeFileSync, mkdirSync, readFileSync } from "node:fs"; import { page } from "./page.mjs"; import * as F from "./fix.mjs";
const [tree, specFile, filt] = process.argv.slice(2); const only = filt ? new RegExp(filt) : null;
const specs = JSON.parse(readFileSync(specFile, "utf8")); const G = process.cwd(); mkdirSync(G + "/out/shots", { recursive: true });
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
const results = {};
const score = ({ png, ink }) => new Promise((res) => { const img = new Image(); img.onload = () => { const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0); const d = x.getImageData(0, 0, img.width, img.height).data;
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; const L = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); const iL = L(...ink); const r = [];
  for (let i = 0; i < d.length; i += 4) { const l = L(d[i], d[i + 1], d[i + 2]); r.push((Math.max(l, iL) + 0.05) / (Math.min(l, iL) + 0.05)); }
  r.sort((a, b) => a - b); const at = (p) => r[Math.min(r.length - 1, Math.floor(p * r.length))]; res({ min: +r[0].toFixed(2), p5: +at(.05).toFixed(2), med: +at(.5).toFixed(2), under3: +(r.filter((v) => v < 3).length / r.length).toFixed(3) }); }; img.src = "data:image/png;base64," + png; });
const rgb = (css) => css.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
for (const s of specs) {
  if (only && !only.test(s.id)) continue;
  const fix = { seats: s.seats.map((k) => F.SEATS[k]), log: F.LOG, layout: s.layout };
  writeFileSync(`${G}/out/${tree}-${s.id}.html`, page({ fix, css: tree + ".css", js: tree + ".js" }) );
  const p = await b.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale ?? 2, reducedMotion: "reduce", hasTouch: true });
  await p.addInitScript(() => { const st = window.setTimeout; window.setTimeout = (f, ms, ...a) => (ms === 2000 ? 0 : st(f, ms, ...a)); });
  p.on("pageerror", (e) => console.log("ERR", s.id, e.message));
  await p.goto(`file://${G}/out/${tree}-${s.id}.html`); await p.waitForTimeout(700);
  await p.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click()); await p.waitForTimeout(300);
  await p.addStyleTag({ content: "[data-seat-notice-stack]{display:none !important}" });
  if (s.theme) await p.evaluate((t) => document.documentElement.setAttribute("data-theme", t), s.theme);
  const panels = p.getByTestId("tracker-panel"); const n = await panels.count();
  for (let i = 0; i < n; i++) { const sign = ((s.signs ? s.signs[i] : s.sign) ?? -1) < 0 ? "half-minus" : "half-plus"; const h = panels.nth(i).getByTestId(sign); if (((s.signs ? s.signs[i] : 1) ?? 1) === 0) continue; for (let k = 0; k < (s.taps ?? 3); k++) await h.click({ force: true, delay: 20 }); }
  await p.waitForTimeout(250);
  if (s.css) await p.addStyleTag({ content: s.css });
  await p.waitForTimeout(50);
  await p.screenshot({ path: `${G}/out/shots/${tree}-${s.id}.png` });
  if (s.scale2) { const p2 = p; await p2.setViewportSize({ width: s.w, height: s.h }); }
  const rows = [];
  for (let i = 0; i < n; i++) {
    const panel = panels.nth(i); const seatNo = await panel.getAttribute("data-seat");
    for (const [tid, inkVar] of [["life-pending", null], ["life-number", "--fg"]]) {
      const el = panel.getByTestId(tid); if (!(await el.count())) continue;
      const info = await el.evaluate((e, v) => { const r = e.getBoundingClientRect(); const probe = document.createElement("i"); if (v) { probe.style.color = `var(${v})`; e.append(probe); } const c = getComputedStyle(v ? probe : e).color; probe.remove(); return { c, r: { x: r.x, y: r.y, width: r.width, height: r.height } }; }, inkVar);
      // Hide the glyphs only (colour transparent keeps any halo or text-shadow), and the ±N when measuring the number.
      const tag = await p.addStyleTag({ content: tid === "life-pending" ? "[data-testid=life-pending]{color:transparent !important}" : "[data-testid=life-number]>span:first-child{color:transparent !important}[data-testid=life-pending]{visibility:hidden !important}" });
      const png = (await p.screenshot({ clip: { x: Math.max(0, info.r.x), y: Math.max(0, info.r.y), width: Math.max(1, info.r.width), height: Math.max(1, info.r.height) } })).toString("base64");
      await tag.evaluate((e) => e.remove());
      const st = await p.evaluate(score, { png, ink: rgb(info.c) }); rows.push({ seat: +seatNo, what: tid === "life-pending" ? "±N" : "life", rect: info.r, ink: info.c, ...st });
    }
  }
  results[s.id] = rows; const tagx = 0; console.log(s.id, JSON.stringify(rows)); await p.close();
}
writeFileSync(process.env.OUTJ ?? `${G}/out/measure-${tree}.json`, JSON.stringify(results, null, 1)); await b.close();
