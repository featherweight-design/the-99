import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { page } from "./page.mjs";
const still = `<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>`;
const names = process.argv.slice(2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const n of names) for (const dev of ["p", "d"]) {
  const phone = dev === "p"; const [w, h] = phone ? [390, 844] : [1300, 860];
  const bg = `<div style="position:fixed;inset:0;background:url(bg-${phone ? "phone" : "desk"}.png) 0 0/${w}px ${h}px no-repeat"></div>`;
  writeFileSync(`hero/w-${n}-${dev}.html`, page(still + bg + readFileSync(`hero/${n}.html`, "utf8"), "amonkhet"));
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: phone });
  await p.goto("file://" + process.cwd() + `/hero/w-${n}-${dev}.html`); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(250);
  await p.screenshot({ path: `shots/${n}-${dev}.png` }); await p.close();
}
await b.close(); console.log("ok");
