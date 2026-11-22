import { chromium } from "playwright"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs";
// node dz/shot.mjs specs.json [regex]. spec: {id, dev: phone|desk, vh, theme, js, clip:{sel,pad}, out}
const frames = JSON.parse(readFileSync(process.argv[2], "utf8")); mkdirSync("out/shots", { recursive: true });
const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const f of frames) {
  if (only && !only.test(f.out ?? f.id)) continue;
  const oid = f.out ?? f.id;
  writeFileSync(`out/${oid}.html`, page((f.pre ?? "") + readFileSync(`dz/frames/${f.id}.html`, "utf8") + (f.post ?? ""), f.theme ?? "amonkhet"));
  const w = f.w ?? (f.dev === "phone" ? 390 : 1300);
  const ctx = await b.newContext({ viewport: { width: w, height: f.vh ?? (f.dev === "phone" ? 844 : 900) }, deviceScaleFactor: 2, reducedMotion: "reduce", hasTouch: f.dev === "phone", isMobile: false });
  const p = await ctx.newPage();
  await p.goto("file://" + process.cwd() + `/out/${oid}.html`); await p.waitForTimeout(300);
  if (f.js) await p.evaluate(f.js);
  await p.waitForTimeout(f.js ? 900 : 100);
  if (f.clip) {
    const r = await p.evaluate(([sel, pad]) => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad + scrollY), width: b.width + 2 * pad, height: b.height + 2 * pad }; }, [f.clip.sel, f.clip.pad ?? 12]);
    if (!r) { console.log("MISSING", oid, f.clip.sel); await ctx.close(); continue; }
    await p.screenshot({ path: `out/shots/${oid}.png`, clip: r, fullPage: true });
  } else await p.screenshot({ path: `out/shots/${oid}.png`, fullPage: !!f.full });
  await ctx.close(); console.log(oid);
}
await b.close();
