const { chromium } = require("playwright"); const { readFileSync, writeFileSync, mkdirSync } = require("node:fs");
(async()=>{ const { page } = await import("./page.mjs");
const frames = JSON.parse(readFileSync("dz/frames-" + (process.env.MODE||"after") + ".json", "utf8")); mkdirSync("out/shots", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox"] });
for (const f of frames) {
  writeFileSync(`out/${f.id}.html`, page(readFileSync(`dz/frames/${f.id}.html`, "utf8"), "amonkhet"));
  const w = f.dev === "phone" ? 390 : 1280;
  const p = await b.newPage({ viewport: { width: w, height: f.vh ?? 844 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
  await p.goto("file://" + process.cwd() + `/out/${f.id}.html`); await p.waitForTimeout(400);
  await p.screenshot({ path: `out/shots/${f.id}.png` }); await p.close(); console.log(f.id);
}
await b.close();
})();
