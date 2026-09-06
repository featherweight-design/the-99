// Throwaway: does ?deck=<base64> actually populate Mana Pool's Mass Entry in a
// real browser, or only at the HTTP level? Loads the URL, reads the textarea's
// value, and reports what the right-hand panel says.
//
// Run by hand: `node scripts/probe-manapool-add-deck.mjs`. Not part of `pnpm test`
// — it needs a browser and reaches Mana Pool over the network.
import { chromium } from "playwright";

const cards = [
  { name: "Ovika, Enigma Goliath", quantity: 1 },
  { name: "Sol Ring", quantity: 1 },
  { name: "Fire // Ice", quantity: 1 },
  { name: "Æther Vial", quantity: 2 },
];

const text = cards.map((c) => `${c.quantity} ${c.name}`).join("\n");
const b64 = Buffer.from(text, "utf8").toString("base64");
const url = `https://manapool.com/add-deck?deck=${encodeURIComponent(b64)}`;

console.log("base64:", b64);
console.log("url:", url, "\n");

const browser = await chromium.launch();
try {
  await run(browser);
} finally {
  // Without this, a throw anywhere above orphans a Chromium process.
  await browser.close();
}

async function run(browser) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
  await page.waitForTimeout(3000);

  const textarea = await page.locator("textarea").first().inputValue().catch(() => "<no textarea>");
  console.log("textarea value:\n" + textarea + "\n");

  // Mana Pool renders `Æther Vial` as `Aether Vial`, so a literal comparison would
  // report a false negative on exactly the names this probe exists to test.
  const fold = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036F]/g, "")
      .replace(/æ/gi, "ae")
      .toLowerCase();

  const body = fold(await page.locator("body").innerText());
  console.log("empty-state present:", body.includes(fold("Your decklist is empty")));
  for (const c of cards) {
    console.log(`  panel names ${c.name}:`, body.includes(fold(c.name)));
  }

  await page.screenshot({ path: "/tmp/manapool-add-deck.png", fullPage: false });
  console.log("\nscreenshot: /tmp/manapool-add-deck.png");
}
