const { chromium } = require("playwright");
(async () => { const b = await chromium.launch({executablePath:"/opt/pw-browsers/chromium"});
 for (const [w,h,t] of [[1280,800,"amonkhet"],[1920,1080,"amonkhet"],[1280,800,"eldraine"],[1280,800,"kamigawa"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/q-home.html");
  await p.evaluate((t)=>document.documentElement.setAttribute("data-theme",t), t);
  await p.addStyleTag({content:"*,*::before,*::after{animation:none!important;transition:none!important}"});
  await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  const m = await p.evaluate(() => { const s = document.querySelector('aside svg[aria-label="The 99"]'); const r=s.getBoundingClientRect(); const pol=[...s.querySelectorAll('rect,polygon,path')].map(e=>e.getBoundingClientRect().toJSON()); return {svg:r.toJSON(), parts:pol.slice(0,3), main: document.querySelector('main').getBoundingClientRect().toJSON(), sw: document.documentElement.scrollWidth}; });
  console.log(w,h,t,JSON.stringify(m));
  await p.screenshot({ path: `../shots/home-${t}-${w}.png` }); await p.close(); }
 await b.close(); })();
