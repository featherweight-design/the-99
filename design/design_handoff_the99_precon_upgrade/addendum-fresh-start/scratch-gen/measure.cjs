const { chromium } = require(process.env.PW); const fs = require("fs"); const path = require("path");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }); const dir = process.argv[2]; const out = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".dc.html"))) {
  let s = fs.readFileSync(path.join(dir, f), "utf8").replace('<script src="./support.js"></script>', "").replace(/<script type="text\/x-dc"[\s\S]*?<\/script>/, "").replace(/<\/?x-dc>/g, "").replace(/<\/?helmet>/g, "");
  fs.writeFileSync(path.join(dir, "_m.html"), s); const p = await b.newPage({ viewport: { width: 3000, height: 800 }, deviceScaleFactor: 1 });
  await p.goto("file://" + path.join(dir, "_m.html")); await p.waitForTimeout(300);
  out[f] = await p.evaluate(() => { const r = document.querySelector(".board").getBoundingClientRect(); return [Math.ceil(r.width), Math.ceil(r.height)]; });
  if (process.argv[3]) await p.screenshot({ path: path.join(process.argv[3], f + ".png"), fullPage: true }); await p.close(); }
fs.unlinkSync(path.join(dir, "_m.html")); console.log(JSON.stringify(out)); await b.close(); })();
