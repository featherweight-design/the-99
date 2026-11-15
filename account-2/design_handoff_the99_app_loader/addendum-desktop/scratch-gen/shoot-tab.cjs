const { chromium } = require("playwright");
(async () => { const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
  const p = await b.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto("file://" + process.cwd() + "/q-home.html");
  await p.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important}"});
  await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  const m = await p.evaluate(() => { const s = document.querySelector('aside svg[aria-label="The 99"]'); const r=s.getBoundingClientRect(); const pol=[...s.querySelectorAll('path,rect,polygon')].map(e=>e.getBoundingClientRect().toJSON()); return {hover: matchMedia('(hover: none)').matches, svg:r.toJSON(), mid:pol[1], aside: document.querySelector('aside').getBoundingClientRect().width, sw: document.documentElement.scrollWidth}; });
  console.log(JSON.stringify(m));
  await p.screenshot({ path: `../shots/home-amonkhet-tab.png` }); await b.close(); })();
