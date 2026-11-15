import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
for (const [n, dev, y] of [["open-open", "p", 470], ["deck-open-open", "p", 470], ["open-open", "d", 300], ["rejected", "p", 470], ["rejected", "d", 300], ["deck-rejected", "d", 300]]) {
  const phone = dev === "p";
  const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1300, height: 860 }, deviceScaleFactor: 2, hasTouch: phone });
  await p.goto("file://" + process.cwd() + `/hero/w-${n}-${dev}.html`); await p.evaluate("document.fonts.ready");
  await p.evaluate((y) => { const el = [...document.querySelectorAll("div")].find((d) => d.className.includes("overflow-y-auto")); el.scrollTop = y; }, y);
  await p.waitForTimeout(200); await p.screenshot({ path: `shots/${n}-${dev}-scrolled.png` }); await p.close();
}
await b.close(); console.log("ok");
