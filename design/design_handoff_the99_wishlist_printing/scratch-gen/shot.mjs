import { chromium } from "playwright"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs";
// usage: node dz/shot.mjs id phone|desk [height] [prefixHtml] [suffixHtml]
const frames = JSON.parse(readFileSync(process.argv[2], "utf8")); mkdirSync("out/shots", { recursive: true });
const only = process.argv[3] ? new RegExp(process.argv[3]) : null; const scale = +(process.env.SCALE ?? 2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const f of frames) {
  if (only && !only.test(f.id)) continue;
  const oid = f.out ?? f.id;
  writeFileSync(`out/${oid}.html`, page((f.bg ? `<div aria-hidden style="position:fixed;inset:0;background:url(art/${f.dev === "phone" ? "bg-wl-phone" : "bg-wl-desk"}.png) top left/${f.dev === "phone" ? 390 : 1300}px auto no-repeat"></div>` : "") + (f.pre ?? "") + readFileSync(`dz/frames/${f.id}.html`, "utf8") + (f.post ?? ""), f.theme ?? "amonkhet"));
  const w = f.dev === "phone" ? 390 : 1300;
  const p = await b.newPage({ viewport: { width: w, height: f.vh ?? 844 }, deviceScaleFactor: scale, reducedMotion: "reduce" });
  await p.goto("file://" + process.cwd() + `/out/${oid}.html`); await p.waitForTimeout(400);
  if (f.js) await p.evaluate(f.js);
  if (f.scrollTo) await p.evaluate((id) => {
    const t = [...document.querySelectorAll(`[data-testid="${id}"]`)].find((el) => el.getClientRects().length > 0);
    if (!t) return;
    let sc = t.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 4 && /(auto|scroll)/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (!sc) return;
    const r = t.getBoundingClientRect(), sr = sc.getBoundingClientRect();
    sc.scrollTop += (r.bottom - sr.bottom) + 24;
  }, f.scrollTo);
  await p.waitForTimeout(100);
  await p.screenshot({ path: `out/shots/${oid}.png`, fullPage: !!f.full }); await p.close(); console.log(f.id);
}
await b.close();
