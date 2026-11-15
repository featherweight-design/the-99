const { chromium } = require("playwright"); const fs = require("fs");
(async () => { const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
 for (const f of fs.readdirSync(".").filter((f) => f.startsWith("q-"))) {
  const phone = f.includes("phone"), alone = f.includes("row-alone");
  const w = alone ? 390 : phone ? 390 : 1300, h = alone ? 100 : phone ? 844 : 900;
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await p.goto("file://" + process.cwd() + "/" + f); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(250);
  const m = await p.evaluate((phone) => {
    const t = document.querySelector("[data-install-row]") || document.querySelector("#first-run-step-3-title")?.closest("[role=group]");
    if (phone && t) { const r = t.getBoundingClientRect(); window.scrollTo(0, window.scrollY + r.top - 330); }
    const row = document.querySelector("[data-install-row]");
    return { sh: document.documentElement.scrollHeight, sw: document.documentElement.scrollWidth, row: row ? row.getBoundingClientRect().toJSON() : null };
  }, phone);
  const name = f.slice(2).replace(".html", "");
  await p.screenshot({ path: `../shots/${name}.png`, fullPage: !phone && !alone });
  if (f === "q-home-safari-phone.html" || f === "q-home-none-phone.html") { await p.evaluate(() => window.scrollTo(0, 0)); await p.screenshot({ path: `../shots/${name}-full.png`, fullPage: true }); }
  console.log(name, JSON.stringify(m)); await p.close(); }
 await b.close(); })();
