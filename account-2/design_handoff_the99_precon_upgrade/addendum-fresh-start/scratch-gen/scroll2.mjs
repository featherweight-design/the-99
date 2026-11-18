import { chromium } from "playwright";
// args: name:dev:y[:label] ...
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const a of process.argv.slice(2)) {
  const [n, dev, y, tab] = a.split(":");
  const phone = dev === "p";
  const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1300, height: 860 }, deviceScaleFactor: 2, hasTouch: phone });
  await p.goto("file://" + process.cwd() + `/hero/w-${n}-${dev}.html`); await p.evaluate("document.fonts.ready");
  if (tab === "cut") await p.evaluate(() => { document.querySelectorAll('[data-sc-side]').forEach((s) => { const cut = s.getAttribute("data-sc-side") === "cut"; s.classList.toggle("hidden", !cut); s.classList.toggle("flex", cut); }); const t = [...document.querySelectorAll('[role=tab]')]; t.forEach((x) => x.setAttribute("aria-selected", "false")); });
  await p.evaluate((y) => { const el = [...document.querySelectorAll("div")].find((d) => d.className.includes("overflow-y-auto")); el.scrollTop = +y; }, y);
  await p.waitForTimeout(200); await p.screenshot({ path: `shots/${n}-${dev}-${y}${tab ? "-" + tab : ""}.png` }); await p.close();
}
await b.close(); console.log("ok");
