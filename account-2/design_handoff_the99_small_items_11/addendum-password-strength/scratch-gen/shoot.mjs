import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { page } from "./page.mjs";
const still = `<style>*,*::before,*::after{animation:none!important;transition:none!important}</style>`;
const [, , theme = "amonkhet", ...names] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const n of names) {
  const [name, dev] = n.split("@");
  writeFileSync(`hero/w-${theme}-${name}.html`, page(still + readFileSync(`hero/${name}.html`, "utf8"), theme));
  const phone = dev === "p";
  const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: 2, hasTouch: phone });
  await p.goto("file://" + process.cwd() + `/hero/w-${theme}-${name}.html`); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(200);
  const m = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth }));
  await p.screenshot({ path: `shots/${theme}-${name}-${phone ? "p" : "d"}.png`, fullPage: true });
  console.log(theme, name, dev, JSON.stringify(m)); await p.close();
}
await b.close();
