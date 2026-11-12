const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 const only = process.argv[2];
 for (const f of fs.readdirSync(".").filter((f) => f.startsWith("p-") && f.endsWith(".html") && (!only || f.includes(only)))) {
  const phone = f.startsWith("p-phone"); const w = phone ? 390 : 1300, h = phone ? 844 : 860;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(400);
  await p.screenshot({ path: "shots/" + f.replace(".html", ".png") }); await p.close(); }
 await b.close(); })();
