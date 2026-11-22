import { chromium } from "playwright"; import { writeFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs"; import { SEATS, LOG } from "./fix.mjs";
const G = process.cwd(); mkdirSync(G + "/out/m5", { recursive: true });
const fix = { seats: [SEATS.you, SEATS.colin, SEATS.peter, SEATS.max], log: LOG, layout: "tablet-4" };
writeFileSync(`${G}/out/m-seq.html`, page({ fix, css: "app2.css", js: "app2.js" }));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1180, height: 820 }, screen: { width: 1180, height: 820 }, deviceScaleFactor: 1, reducedMotion: "no-preference", hasTouch: true });
await p.addInitScript(() => { crypto.getRandomValues = (a) => { a[0] = 13; return a; }; });
await p.goto(`file://${G}/out/m-seq.html`); await p.waitForTimeout(700);
await p.locator('[data-testid="strip-dice"]').click(); await p.waitForTimeout(3000);
await p.locator('[data-testid="dice-menu"] button').filter({ hasText: "20" }).first().click();
const t0 = Date.now(); const out = [];
while (Date.now() - t0 < 2600) { const t = Date.now() - t0; const f = `${G}/out/m5/seq-${String(t).padStart(4, "0")}.png`; await p.screenshot({ path: f, type: "png" }); out.push(t); }
console.log(out.join(",")); await b.close();
