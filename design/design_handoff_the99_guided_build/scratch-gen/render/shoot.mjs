// node shoot.mjs name:dev:tab:height[:full] ...   reads out/<name>.html (fragment) -> shots/<name>-<dev>.png
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { page, shell } from "./page.mjs";
mkdirSync("shots", { recursive: true });
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const spec of process.argv.slice(2)) {
  const [name, dev, tab, hs, mode] = spec.split(":");
  const phone = dev === "p"; const w = phone ? 390 : 1300; const h = +hs || (phone ? 844 : 900);
  const frag = readFileSync(`out/${name}.html`, "utf8");
  const body = tab === "none" ? frag : shell(dev, tab, frag, mode === "full");
  writeFileSync(`w-${name}-${dev}.html`, page(body));
  const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: phone });
  await p.goto("file://" + process.cwd() + `/w-${name}-${dev}.html`); await p.evaluate("document.fonts.ready"); await p.waitForTimeout(300);
  await p.screenshot({ path: `shots/${name}-${dev}.png`, fullPage: mode === "full" }); await p.close();
  console.log(spec);
}
await b.close();
