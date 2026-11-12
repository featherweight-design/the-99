const { chromium } = require("playwright"); const fs = require("fs"); const path = require("path");
(async () => {
  const { page } = await import(path.resolve("dz/page.mjs"));
  const frames = JSON.parse(fs.readFileSync("dz/frames.json", "utf8")); const only = process.argv[2];
  fs.mkdirSync("out/shots", { recursive: true });
  const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const f of frames.filter((f) => !only || f.id.includes(only))) {
    const body = fs.readFileSync(`dz/frames/${f.id}.html`, "utf8");
    fs.writeFileSync(`out/p-${f.id}.html`, page(body, "amonkhet"));
    const w = f.dev === "phone" ? 390 : 1300, h = f.vh || (f.dev === "phone" ? 844 : 860);
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
    await p.emulateMedia({ reducedMotion: "reduce" });
    await p.goto("file://" + path.resolve(`out/p-${f.id}.html`)); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
    const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }));
    await p.screenshot({ path: `out/shots/${f.id}.png` });
    console.log(f.id, w, h, JSON.stringify(m)); await p.close();
  }
  await b.close();
})();
