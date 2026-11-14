const { chromium } = require("playwright");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of ["d-qa-p1-s", "d-qa-shipped-s"]) {
  const p = await b.newPage({ viewport: { width: 1300, height: 560 }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/" + f + ".html"); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  await p.screenshot({ path: "shots/" + f + ".png" }); await p.close(); }
 await b.close(); })();
