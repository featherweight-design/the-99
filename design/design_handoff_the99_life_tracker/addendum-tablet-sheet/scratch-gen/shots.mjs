import { chromium } from "playwright"; import { writeFileSync, mkdirSync, readFileSync } from "node:fs"; import { page } from "./page.mjs"; import * as F from "./fix.mjs";
// node shots.mjs specs.json [filter]
const specs = JSON.parse(readFileSync(process.argv[2], "utf8")); const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const G = process.cwd(); mkdirSync(G + "/out/shots", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const s of specs) {
  if (only && !only.test(s.id)) continue;
  const v = s.v ?? 2;
  const fix = { seats: s.seats.map((k) => F.SEATS[k]), log: F[s.log ?? "LOG"], layout: s.layout ?? "tablet-4" };
  writeFileSync(`${G}/out/${s.id}.html`, page({ fix, css: v === 1 ? "app.css" : "app2.css", js: v === 1 ? "app.js" : "app2.js" }));
  const p = await b.newPage({ viewport: { width: s.w, height: s.h }, screen: { width: s.sw ?? s.w, height: s.sh ?? s.h }, deviceScaleFactor: s.scale ?? 2, reducedMotion: s.motion ?? "reduce", hasTouch: true });
  p.on("pageerror", (e) => console.log("ERR", s.id, e.message));
  await p.goto(`file://${G}/out/${s.id}.html`); await p.waitForTimeout(800);
  if (s.open !== undefined) {
    await p.locator('[data-testid="panel-sheet"]').nth(s.open).click(); await p.waitForTimeout(350);
    if (s.tab && s.tab !== "damage") { await p.locator(`#sheet-tab-${s.tab}`).click(); await p.waitForTimeout(250); }
  }
  if (s.js) { await p.evaluate(s.js); }
  await p.waitForTimeout(s.wait ?? 150);
  await p.screenshot({ path: `${G}/out/shots/${s.id}.png`, clip: s.clip }); await p.close(); console.log(s.id);
}
await b.close();
