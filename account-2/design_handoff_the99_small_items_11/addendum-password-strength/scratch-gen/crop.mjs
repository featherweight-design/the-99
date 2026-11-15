import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { page } from "./page.mjs";
const still = `<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>`;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const theme of ["amonkhet","kamigawa","ixalan","phyrexia","eldraine","kaldheim"]) for (const s of ["empty","weak","good","strong","q4"]) {
  writeFileSync(`hero/c-${theme}-${s}.html`, page(still + readFileSync(`hero/k5-${s}.html`, "utf8"), theme));
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + `/hero/c-${theme}-${s}.html`); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(150);
  const r = await p.evaluate(() => { const f = document.querySelector("form").getBoundingClientRect(); return { x: 0, y: f.top - 16, width: 390, height: f.height + 32 }; });
  await p.screenshot({ path: `shots/crop-${theme}-${s}.png`, clip: r }); await p.close();
}
await b.close(); console.log("ok");
