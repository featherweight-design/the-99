const { chromium } = require("/tmp/claude-0/-home-user/1d85b514-212d-5f8e-8642-ce28e64f4018/scratchpad/app/node_modules/playwright");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of process.argv.slice(2)) { const p = await b.newPage({ viewport: { width: 4000, height: 1000 } });
  await p.goto("file://" + f); await p.waitForTimeout(300);
  const r = await p.evaluate(() => { const x = document.querySelector(".board"); return [x.scrollWidth, (x.style.minHeight="0px", x.getBoundingClientRect().height), Math.max(...[...x.querySelectorAll("*")].map(e => e.getBoundingClientRect().right))]; });
  console.log(f.split("/").pop(), r); await p.close(); }
 await b.close(); })();
