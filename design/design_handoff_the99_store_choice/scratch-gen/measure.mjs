import { chromium } from "playwright"; import { readFileSync } from "node:fs";
const c = JSON.parse(readFileSync("repo-out/canvas.json"));
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const n of c.order) {
  const p = await b.newPage({ viewport: { width: c.boards[n].w, height: 800 } });
  await p.goto("file://" + process.cwd() + "/repo-out/" + n); await p.waitForTimeout(800);
  const r = await p.evaluate(() => { const d = document.querySelector("x-dc > div") || document.body.querySelector("div"); const imgs=[...document.images]; const last=d.lastElementChild.getBoundingClientRect(); const rows=[...d.querySelectorAll("figure")].map(f=>f.getBoundingClientRect().right); return { need: Math.ceil(last.bottom+64), maxRight: Math.ceil(Math.max(0,...rows)), h: Math.ceil(d.scrollHeight), w: Math.ceil(d.scrollWidth), broken: imgs.filter(i=>!i.naturalWidth).length, imgs: imgs.length }; });
  console.log(n, c.boards[n].w, c.boards[n].h, JSON.stringify(r));
  await p.screenshot({ path: `gen/${n}.png`, fullPage: true });
  await p.close();
}
await b.close();
