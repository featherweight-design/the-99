import { chromium } from "playwright"; import { readFileSync } from "node:fs";
const dir = process.argv[2]; const c = JSON.parse(readFileSync(dir + "/canvas.json"));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const n of c.order) {
  const p = await b.newPage({ viewport: { width: c.boards[n].w, height: 800 } });
  await p.goto("file://" + dir + "/" + n); await p.waitForTimeout(1200);
  const r = await p.evaluate(() => { const d = document.querySelector(".xdc > div") || document.body.querySelector("div"); const imgs=[...document.images]; return { h: Math.ceil(d.scrollHeight), w: Math.ceil(d.scrollWidth), broken: imgs.filter(i=>!i.naturalWidth).length, imgs: imgs.length }; });
  console.log(n, c.boards[n].w, c.boards[n].h, JSON.stringify(r));
  await p.screenshot({ path: `/tmp/claude-0/measure/${n}.png`, fullPage: true });
  await p.close();
}
await b.close();
