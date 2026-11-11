// node shoot.cjs variant theme themeName width dpr out
const { chromium } = require("playwright"); const path = require("path");
(async () => { const jobs = JSON.parse(process.argv[2]); const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const j of jobs) { const p = await b.newPage({ viewport: { width: j.w, height: 900 }, deviceScaleFactor: j.dpr || 2 });
  await p.goto("file://" + path.resolve(`hero/p-${j.v}-${j.t}.html`)); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(1800);
  const m = await p.evaluate((name) => {
    const sw = [...document.querySelectorAll('[role=radio]')]; const keys = ["amonkhet","kamigawa","ixalan","phyrexia","eldraine","kaldheim"];
    const i = keys.indexOf(document.documentElement.dataset.theme); sw.forEach((s, k) => { s.setAttribute("aria-checked", k === i); if (k === i) s.firstElementChild.className += " shadow-[0_0_0_2px_var(--bg),0_0_0_4px_var(--fg)]"; });
    document.querySelector('[role=status]').textContent = name;
    const main = document.querySelector("section"); const ph = document.querySelector('[data-testid=landing-phone]'); const r = ph.getBoundingClientRect(); const sec = document.querySelector("section").getBoundingClientRect();
    // how much of the phone frame is inside the section's visible box (the section clips x from md to xl)
    const vis = Math.max(0, Math.min(r.right, sec.right, innerWidth) - Math.max(r.left, sec.left)) / r.width;
    return { h: Math.ceil(main.getBoundingClientRect().bottom), sw: document.documentElement.scrollWidth, phoneW: Math.round(r.width), vis: Math.round(vis * 100) };
  }, j.name);
  await p.setViewportSize({ width: j.w, height: m.h }); await p.waitForTimeout(300);
  await p.screenshot({ path: j.out, clip: { x: 0, y: 0, width: j.w, height: m.h } }); console.log(j.out, JSON.stringify(m)); await p.close(); }
 await b.close(); })();
