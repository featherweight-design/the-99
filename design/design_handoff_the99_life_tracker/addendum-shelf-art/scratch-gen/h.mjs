import { chromium } from "playwright"; import { readFileSync, writeFileSync } from "node:fs";
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
for (const n of ["Main", "Phone"]) {
  let h = readFileSync(`/home/user/work/out/shelfrepo/${n}.dc.html`, "utf8").replace(/<script[\s\S]*?<\/script>/g, "").replace(/<\/?(x-dc|helmet)>/g, "");
  writeFileSync(`/home/user/work/out/shelfrepo/_${n}.html`, h);
  await p.goto(`file:///home/user/work/out/shelfrepo/_${n}.html`); await p.waitForTimeout(1200);
  console.log(n, await p.evaluate(() => { const d = document.querySelector("body > div"); return [d.scrollWidth, Math.ceil(d.lastElementChild.getBoundingClientRect().bottom + 64)]; }));
  if (n === "Main") await p.screenshot({ path: "/home/user/work/out/shelf-main.png", fullPage: true });
}
await b.close();
