import { chromium } from "playwright"; import { writeFileSync, mkdirSync, readFileSync } from "node:fs"; import { page } from "./page.mjs"; import * as F from "./fix.mjs";
const specs = JSON.parse(readFileSync(process.argv[2], "utf8")); const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const G = process.cwd(); mkdirSync(G + "/out/shots", { recursive: true });
const extra = readFileSync(G + "/overlay.html", "utf8");
const b = await chromium.launch({ args: ["--no-sandbox", "--allow-file-access-from-files"] });
for (const s of specs) {
  if (only && !only.test(s.id)) continue;
  const fix = { seats: s.seats.map((k) => F.SEATS[k]), log: F[s.log ?? "LOG"], layout: s.layout ?? "tablet-4", first: s.first };
  writeFileSync(`${G}/out/${s.id}.html`, page({ fix, extra }));
  const p = await b.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: s.scale ?? 2, reducedMotion: "reduce", hasTouch: true });
  p.on("pageerror", (e) => console.log("ERR", s.id, e.message)); p.on("console", (m) => console.log("CON", m.text()));
  await p.goto(`file://${G}/out/${s.id}.html`); await p.waitForTimeout(900);
  if (s.menu) { await p.locator('[data-testid="strip-menu"]').click(); await p.waitForTimeout(300); if (s.menuJs) await p.evaluate(s.menuJs); }
  if (s.js) { await p.evaluate(s.js); await p.waitForTimeout(150); }
  if (s.legend) { await p.evaluate((o) => window.WW(o), s.legend); await p.waitForTimeout(200); }
  await p.screenshot({ path: `${G}/out/shots/${s.id}.png` }); await p.close(); console.log(s.id);
}
await b.close();
