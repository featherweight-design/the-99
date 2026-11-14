const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of fs.readdirSync(".").filter((f) => /^(p3\d\d|d)-ri-.*\.html$/.test(f))) {
  const d = f.startsWith("d-"); const w = d ? 1100 : +f.slice(1, 4);
  const p = await b.newPage(d ? { viewport: { width: w, height: 700 }, deviceScaleFactor: 2 } : { viewport: { width: w, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  const m = await p.evaluate(() => [...document.querySelectorAll('[role=option]')].map(li => { const r = li.getBoundingClientRect(); const g = [...li.querySelectorAll('span[aria-hidden]')].filter(s => s.offsetParent && /Use|↵/.test(s.textContent)).map(s => { const q = s.getBoundingClientRect(); return `${s.textContent.trim()} ${Math.round(q.width)}x${Math.round(q.height)}`; }); return `${Math.round(r.width)}x${Math.round(r.height)} | ${g.join(" ; ")}`; }));
  console.log(f, JSON.stringify(m), await p.evaluate(() => document.documentElement.scrollHeight));
  await p.screenshot({ path: "shots/" + f.replace(".html", ".png"), fullPage: true }); await p.close(); }
 await b.close(); })();
