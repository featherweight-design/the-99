import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { page } from "./gen/page.mjs";
const still = `<style>*,*::before,*::after{animation:none!important;transition:none!important}img{opacity:1!important}.anim-sheet-up,.anim-menu-in,.anim-backdrop-in{opacity:1!important;transform:none!important}</style>`;
const [, , theme = "amonkhet", ...names] = process.argv;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const raw of names) {
  const [name, at] = raw.split("@");
  const phone = name.endsWith("-p");
  writeFileSync(`hero/w-${theme}-${name}.html`, page(still + readFileSync(`hero/${name}.html`, "utf8").replaceAll("\"/mana/", "\"mana/").replaceAll("(/mana/", "(mana/"), theme));
  const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1280, height: 800 }, deviceScaleFactor: 2, hasTouch: phone });
  await p.goto("file://" + process.cwd() + `/hero/w-${theme}-${name}.html`); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(250);
  if (at === "end") await p.evaluate(() => document.querySelectorAll("[data-scroll]").forEach((e) => (e.scrollTop = e.scrollHeight)));
  const m = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, broken: [...document.images].filter(i => !i.naturalWidth).map(i => i.src) }));
  await p.screenshot({ path: `shots/${theme}-${name}${at ? "-" + at : ""}.png`, fullPage: true });
  console.log(theme, name, JSON.stringify(m)); await p.close();
}
await b.close();
