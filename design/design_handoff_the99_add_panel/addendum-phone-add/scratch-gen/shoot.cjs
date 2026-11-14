const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of fs.readdirSync(".").filter((f) => /^p3\d\d-qa-.*\.html$/.test(f))) {
  const w = +f.slice(1, 4);
  const p = await b.newPage({ viewport: { width: w, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  await p.screenshot({ path: "shots/" + f.replace(".html", ".png") }); await p.close(); }
 await b.close(); })();
