// Throwaway: can we reach the all-printings grid without guessing a name slug?
// Tries search URL shapes, and checks whether a single-printing page links back
// to the grid.
import { chromium } from "playwright";

const names = ["Ovika, Enigma Goliath", "Atraxa, Praetors' Voice", "Fire // Ice", "Æther Vial", "Jötun Grunt"];
const shapes = [
  (n) => `https://manapool.com/search?q=${encodeURIComponent(n)}`,
  (n) => `https://manapool.com/cards?q=${encodeURIComponent(n)}`,
  (n) => `https://manapool.com/search/${encodeURIComponent(n)}`,
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });

console.log("== search URL shapes, one card");
for (const shape of shapes) {
  const url = shape(names[0]);
  const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch((e) => e);
  console.log(`  ${res?.status?.() ?? "ERR"}  ${url}\n        final: ${page.url()}`);
}

console.log("\n== does a single-printing page link to the grid?");
await page.goto("https://manapool.com/card/unh/116/ach-hans-run", { waitUntil: "networkidle", timeout: 60_000 });
await page.waitForTimeout(2000);
const hrefs = await page.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")).filter(Boolean));
console.log("  card links on page:", [...new Set(hrefs.filter((h) => h.includes("/card")))].slice(0, 10));

console.log("\n== the working search shape, every awkward name");
for (const n of names) {
  const url = `https://manapool.com/cards?q=${encodeURIComponent(n)}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const body = await page.locator("body").innerText().catch(() => "");
  const bare = n.split(/[,/]/)[0].trim();
  console.log(`  ${n}\n      names it: ${body.includes(bare)}   final: ${page.url()}`);
}

await page.screenshot({ path: "/tmp/mp-search.png" });
await browser.close();
