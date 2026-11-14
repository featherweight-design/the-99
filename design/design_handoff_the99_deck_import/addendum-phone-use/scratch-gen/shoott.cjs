const { chromium } = require("playwright");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of ["d-ri-shipped", "d-ri-p1"]) {
  const p = await b.newPage({ viewport: { width: 1024, height: 600 }, deviceScaleFactor: 2, hasTouch: true });
  await p.goto("file://" + process.cwd() + "/" + f + ".html"); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  console.log(f, await p.evaluate(() => matchMedia("(pointer:coarse)").matches), await p.evaluate(() => [...document.querySelectorAll('[role=option] span[aria-hidden]')].filter(s => s.offsetParent && /Use|↵/.test(s.textContent)).map(s => s.textContent + " " + Math.round(s.getBoundingClientRect().height))));
  const el = await p.$("#unresolved-group"); await el.screenshot({ path: "shots/t1024-" + f.slice(2) + ".png" }); await p.close(); }
 await b.close(); })();
