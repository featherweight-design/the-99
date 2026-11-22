import { createRequire } from "node:module"; const { chromium } = createRequire("/")("playwright"); import { writeFileSync, readFileSync, mkdirSync } from "node:fs"; import { page } from "./page.mjs";
const specs = JSON.parse(readFileSync(process.argv[2], "utf8")); const only = process.argv[3] ? new RegExp(process.argv[3]) : null;
const G = process.cwd(); mkdirSync(G + "/out/shots", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium", args: ["--no-sandbox", "--allow-file-access-from-files"] });
for (const s of specs) {
  if (only && !only.test(s.id)) continue;
  writeFileSync(`${G}/out/${s.id}.html`, page(s.fix));
  const phone = s.dev === "phone";
  const p = await b.newPage({ viewport: { width: s.w ?? (phone ? 390 : 1300), height: s.h ?? (phone ? 844 : 900) }, deviceScaleFactor: s.scale ?? 2, reducedMotion: "reduce", hasTouch: phone });
  p.on("pageerror", (e) => console.log("ERR", s.id, e.message));
  await p.goto(`file://${G}/out/${s.id}.html`); await p.waitForTimeout(600);
  for (const st of s.steps ?? []) {
    if (st.click) await p.locator(st.click).first().click();
    if (st.type) await p.keyboard.type(st.type, { delay: 20 });
    if (st.js) await p.evaluate(st.js);
    if (st.scroll) await p.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: "center" }), st.scroll);
    await p.waitForTimeout(st.wait ?? 450);
  }
  await p.screenshot({ path: `${G}/out/shots/${s.id}.png`, fullPage: !!s.full }); await p.close(); console.log(s.id);
}
await b.close();
