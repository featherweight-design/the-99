const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of fs.readdirSync(".").filter((f) => f.startsWith("q-"))) {
  const phone = f.includes("phone");
  const p = await b.newPage({ viewport: { width: phone ? 390 : 1300, height: phone ? 844 : 900 }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(250);
  if (f.startsWith("q-tour")) await p.evaluate(fs.readFileSync("post.js", "utf8"));
  const m = await p.evaluate(() => { const s = document.querySelector("[data-install-slot]"); return { sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, slot: s ? s.getBoundingClientRect().toJSON() : null }; });
  const name = f.slice(2).replace(".html", "");
  await p.screenshot({ path: `../shots2/${name}.png`, fullPage: !phone });
  console.log(name, JSON.stringify(m)); await p.close(); }
 await b.close(); })();
