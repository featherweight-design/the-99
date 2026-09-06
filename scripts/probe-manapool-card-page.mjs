// Throwaway: what does a set-and-number card URL (buy_url's shape) show versus
// a bare name-slug URL? Specifically — does either list every printing, or does
// the set/number one pin you to one?
import { chromium } from "playwright";

const urls = [
  ["slug", "https://manapool.com/card/ovika-enigma-goliath"],
  ["set/number", "https://manapool.com/card/vow/238/ovika-enigma-goliath"],
  ["buy_url sample", "https://manapool.com/card/unh/116/ach-hans-run"],
  ["multi-printing slug", "https://manapool.com/card/sol-ring"],
];

const browser = await chromium.launch();
for (const [label, url] of urls) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1200 } });
  const res = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 }).catch((e) => e);
  const status = res?.status?.() ?? `ERR ${res}`;
  await page.waitForTimeout(2000);
  const body = await page.locator("body").innerText().catch(() => "");
  console.log(`\n=== ${label}  ${url}\n    status: ${status}`);
  console.log(`    final url: ${page.url()}`);
  for (const probe of ["Printings", "printing", "Other versions", "All versions", "Set", "Condition", "Add to cart", "in stock"]) {
    if (body.toLowerCase().includes(probe.toLowerCase())) console.log(`    mentions: ${probe}`);
  }
  await page.screenshot({ path: `/tmp/mp-${label.replace(/\W+/g, "-")}.png`, fullPage: false });
  await page.close();
}
await browser.close();
