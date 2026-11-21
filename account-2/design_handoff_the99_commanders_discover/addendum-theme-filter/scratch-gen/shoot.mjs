import { chromium } from "playwright"; import { readFileSync, writeFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs";
const frames = JSON.parse(readFileSync("dz/frames.json", "utf8")); mkdirSync("out/shots", { recursive: true });
const only = process.argv[2] ? new RegExp(process.argv[2]) : null; const scale = +(process.env.SCALE ?? 2);
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const f of frames) {
  if (only && !only.test(f.id)) continue;
  writeFileSync(`out/${f.id}.html`, page(readFileSync(`dz/frames/${f.id}.html`, "utf8"), "kaldheim"));
  const w = f.dev === "phone" ? 390 : 1300;
  const p = await b.newPage({ viewport: { width: w, height: f.vh }, deviceScaleFactor: scale, reducedMotion: "reduce" });
  await p.goto(`http://127.0.0.1:8765/${f.id}.html`); await p.waitForTimeout(500);
  await p.screenshot({ path: `out/shots/${f.id}.png` }); await p.close(); console.log(f.id);
}
await b.close();
