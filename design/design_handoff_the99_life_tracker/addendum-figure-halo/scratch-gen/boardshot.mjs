import { chromium } from "playwright";
const b = await chromium.launch({ args: ["--allow-file-access-from-files"] });
for (const n of process.argv.slice(2)) {
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 0.5 });
  p.on("pageerror", (e) => console.log("ERR", e.message));
  await p.goto(`file:///home/user/work/view/b/${n}.dc.html`); await p.waitForTimeout(2500);
  const h = await p.evaluate(() => Math.max(...[...document.querySelectorAll("*")].map((e) => e.getBoundingClientRect().bottom)));
  const broken = await p.evaluate(() => [...document.querySelectorAll("img")].filter((i) => !i.naturalWidth).map((i) => i.src).slice(0, 5));
  console.log(n, Math.ceil(h), broken.length, broken.join(" "));
  await p.screenshot({ path: `/home/user/work/out/board-${n}.png`, fullPage: true }); await p.close();
}
await b.close();
