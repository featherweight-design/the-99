// Throwaway: can we reach the all-printings grid without guessing a name slug?
// Tries search URL shapes, and checks whether a single-printing page links back
// to the grid.
//
// Run by hand: `node scripts/probe-manapool-search.mjs`. Not part of `pnpm test`
// — it needs a browser and reaches Mana Pool over the network.
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
const unique = [...new Set(hrefs)];
// `/cards` is the grid and `/card/…` a single printing, and the question here is
// whether the page offers the former — so a substring match on `/card` would
// answer it by conflating the two.
console.log("  grid links:", unique.filter((h) => /\/cards(\?|$)/.test(h)).slice(0, 10));
console.log("  printing links:", unique.filter((h) => h.includes("/card/")).slice(0, 10));

// Mana Pool renders `Æther Vial` as `Aether Vial` and `Jötun` as `Jotun`, so a
// literal comparison would report a false negative on exactly the names this
// probe exists to test.
const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036F]/g, "")
    .replace(/æ/gi, "ae")
    .toLowerCase();

console.log("\n== the working search shape, every awkward name");
for (const n of names) {
  const url = `https://manapool.com/cards?q=${encodeURIComponent(n)}`;
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch((e) => e);
  const ok = typeof res?.status === "function";
  const status = ok ? res.status() : `NAV FAILED: ${res?.message ?? "unknown"}`;
  if (!ok) {
    console.log(`  ${n}\n      ${status}`);
    continue;
  }
  await page.waitForTimeout(2500);
  const body = fold(await page.locator("body").innerText().catch(() => ""));
  // Every segment must appear, so `Fire // Ice` cannot pass on the word `Fire` alone.
  const parts = n.split("//").map((p) => fold(p.trim()));
  const namesIt = parts.every((p) => body.includes(p));
  console.log(`  ${n}\n      ${status}  names it: ${namesIt}   final: ${page.url()}`);
}

await page.screenshot({ path: "/tmp/mp-search.png" });
await browser.close();
