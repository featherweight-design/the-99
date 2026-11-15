import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const f of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 2600, height: 1200 } });
  const t = f.replace(".dc.html", ".tmp.html"); writeFileSync(t, readFileSync(f, "utf8").replace("<x-dc>", "").replace("</x-dc>", "").replace("<helmet>", "").replace("</helmet>", "").replace(/<script[\s\S]*?<\/script>/g, "")); await p.goto("file://" + t); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const x = document.querySelector(".board"); const bb = x.getBoundingClientRect(); return { w: Math.ceil(x.scrollWidth), h: Math.ceil(bb.height), right: Math.max(...[...x.querySelectorAll("*")].map(e => e.getBoundingClientRect().right)), broken: [...document.images].filter(i => !i.naturalWidth).map(i => i.src) }; });
  let s = readFileSync(f, "utf8"); s = s.replace("WIDTH", r.w).replace("HEIGHT", r.h).replace(/class="board" style="width: (\d+)px"/, `class="board" style="width: $1px; min-height: ${r.h}px"`); writeFileSync(f, s);
  await p.screenshot({ path: f.replace(".dc.html", ".png"), fullPage: true });
  console.log(f.split("/").pop(), JSON.stringify(r)); await p.close();
}
await b.close();
