// jobs: {k,t,w,out,mode:"col"|"view", anchor?:{row,y}|scroll?:"col"}
const { chromium } = require("playwright"); const path = require("path");
(async () => { const jobs = JSON.parse(require("fs").readFileSync(process.argv[2],"utf8")); const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 const res = {};
 for (const j of jobs) { const p = await b.newPage({ viewport: { width: j.w, height: j.vh || 900 }, deviceScaleFactor: 2 });
  await p.emulateMedia({ reducedMotion: "reduce" });
  await p.goto("file://" + path.resolve(`tips/p-${j.k}-${j.t}.html`)); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(700);
  const m = await p.evaluate((j) => {
    const lists = document.querySelectorAll("ul"); const tipsUl = [...lists].find(u => u.querySelector("[aria-expanded]"));
    const col = tipsUl.parentElement; const sec = document.querySelector("[data-testid=landing-credits]");
    const r = (e) => { const x = e.getBoundingClientRect(); return { top: x.top + scrollY, bottom: x.bottom + scrollY, left: x.left, right: x.right }; };
    const rows = [...tipsUl.children].map(li => r(li)); const tip = document.querySelector("[role=tooltip]");
    const rowsY = [...tipsUl.children].map(li => r(li.querySelector("button")).top);
    return { col: r(col), sec: r(sec), rows, rowsY, tip: tip ? r(tip) : null, docH: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth };
  }, j);
  res[j.out] = m;
  if (j.mode === "view") {
    await p.setViewportSize({ width: j.w, height: j.vh }); await p.evaluate((y) => { document.documentElement.style.scrollBehavior = "auto"; scrollTo(0, y); }, j.scroll);
    await p.waitForTimeout(200); await p.screenshot({ path: j.out });
  } else {
    await p.setViewportSize({ width: j.w, height: m.docH }); await p.waitForTimeout(200);
    const top = Math.max(0, Math.round(j.top !== undefined ? j.top : m.col.top - 28)); const bot = Math.min(m.docH, Math.round(j.bottom !== undefined ? j.bottom : m.sec.bottom + 150));
    m.clip = { top, h: bot - top };
    await p.screenshot({ path: j.out, clip: { x: 0, y: top, width: j.w, height: bot - top } });
  }
  console.log(j.out, JSON.stringify({ clip: m.clip, tip: m.tip, col: m.col, sw: m.sw })); await p.close(); }
 require("fs").writeFileSync("tips/measure.json", JSON.stringify(res, null, 1));
 await b.close(); })();
