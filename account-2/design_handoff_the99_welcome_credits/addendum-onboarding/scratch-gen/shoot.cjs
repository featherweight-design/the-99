const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 const only = process.argv[2] || "";
 for (const f of fs.readdirSync(".").filter((f) => f.startsWith("q-") && f.includes(only))) {
  const w = f.includes("phone") ? 390 : 1300, h = f.includes("phone") ? 844 : 860;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(250);
  if (fs.existsSync("post.js")) await p.evaluate(fs.readFileSync("post.js", "utf8"));
  const m = await p.evaluate(() => ({ sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth }));
  await p.screenshot({ path: `../shots/${f.slice(2).replace(".html", "")}.png`, fullPage: false });
  console.log(f, JSON.stringify(m)); await p.close(); }
 await b.close(); })();
