const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of fs.readdirSync(".").filter((f) => f.startsWith("q-lp-"))) for (const w of [390, 1300]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  const m = await p.evaluate(() => ({ h: Math.ceil(document.documentElement.scrollHeight), sw: document.documentElement.scrollWidth }));
  await p.setViewportSize({ width: w, height: m.h }); await p.screenshot({ path: `shots/${f.replace(".html", "")}-${w}.png` }); console.log(f, w, JSON.stringify(m)); await p.close(); }
 await b.close(); })();
