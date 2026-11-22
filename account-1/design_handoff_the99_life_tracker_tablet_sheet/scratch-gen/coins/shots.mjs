// node coins/shots.mjs  (from gen/). Studio stills of each option, then each option in place on the tablet table.
import { chromium } from "playwright"; import { writeFileSync } from "node:fs"; import { face, OPTIONS } from "./faces.mjs";
const G = process.cwd(), O = G + "/coins/out";
const F = "file:///home/user/the-99/.worktrees/design-tracker-tablet-sheet/src/app/fonts/";
const fonts = `@font-face{font-family:Cinzel;src:url(${F}cinzel-variable.woff2) format("woff2");font-weight:400 900}`;
const coin = (opt, size, t, tf, showSide) => `<div style="position:relative;width:${size}px;height:${size}px;perspective:900px">
<button class="coin" style="position:absolute;inset:0;border-radius:50%;border:0;padding:0;background:none;--t:${t}px;transform:${tf}">
${[-3,-2,-1,0,1,2,3].map(i=>`<span class="coin-rim" style="--z:${i/7}"></span>`).join("")}
<span class="coin-face coin-face-front">${face(opt,"heads")}</span><span class="coin-face coin-face-back">${face(opt,"tails")}</span></button></div>`;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files"] });
for (const opt of Object.keys(OPTIONS)) {
  const html = `<!doctype html><html data-theme="amonkhet"><head><meta charset="utf-8"><link rel="stylesheet" href="../../out/app2.css"><style>${fonts}body{margin:0;background:var(--bg)}.row{display:flex;gap:56px;align-items:center;padding:40px 48px}</style></head><body><div class="row" id="r">
${coin(opt,260,14,"rotateX(0deg)")}${coin(opt,260,14,"rotateX(180deg)")}${coin(opt,200,12,"rotateZ(-18deg) rotateX(58deg)")}${coin(opt,200,12,"rotateZ(24deg) rotateX(122deg)")}</div></body></html>`;
  writeFileSync(`${O}/studio-${opt}.html`, html);
  const p = await b.newPage({ viewport: { width: 1180, height: 340 }, deviceScaleFactor: 2 });
  await p.goto(`file://${O}/studio-${opt}.html`); await p.waitForTimeout(400);
  const bad = await p.evaluate(() => [...document.images, ...document.querySelectorAll("image")].filter(i => i.complete === false).length);
  await p.locator("#r").screenshot({ path: `${O}/studio-${opt}.png` }); console.log(opt, "studio", bad); await p.close();
}
await b.close();
