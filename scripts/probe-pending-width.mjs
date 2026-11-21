// A button that swaps to a shorter label while it works must not shrink (SteadyLabel). Loads the signed-out landing's launch panel
// (the email form), holds its server-action POST open, presses the button and measures the button's width before and while pending
// at 390 and 1300. On main the width drops by the difference between "Send"-style and "Sending…"-style labels; with SteadyLabel it
// does not move. `PROBE_BASE=http://localhost:3210 node scripts/probe-pending-width.mjs`. Needs a browser; never production.
// Exits 1 if any width moved by more than 0.5px.
import { chromium } from "playwright";

const BASE = process.env.PROBE_BASE ?? "http://localhost:3002";
const WINDOWS = [{ name: "phone", width: 390, height: 844 }, { name: "desktop", width: 1300, height: 900 }];
let failed = false;
const browser = await chromium.launch();
for (const w of WINDOWS) {
  const page = await (await browser.newContext({ viewport: { width: w.width, height: w.height } })).newPage();
  let release;
  const held = new Promise((r) => (release = r));
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST") await held;
    await route.continue();
  });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  const panel = page.getByTestId("launch-panel");
  await panel.waitFor({ timeout: 30_000 });
  const button = panel.locator("button[type=submit]");
  const input = panel.locator("input");
  await input.fill("width-probe@example.com");
  const before = (await button.boundingBox()).width;
  await button.click();
  await page.waitForFunction((el) => el?.disabled === true, await button.elementHandle(), { timeout: 10_000 });
  const during = (await button.boundingBox()).width;
  const moved = Math.abs(before - during);
  console.log(`${w.name} ${w.width}: before ${before.toFixed(1)} pending ${during.toFixed(1)} moved ${moved.toFixed(1)}`);
  if (moved > 0.5) failed = true;
  release();
  await page.close();
}
await browser.close();
if (failed) {
  console.error("FAIL: the button changed width while pending");
  process.exit(1);
}
console.log("ok: width held while pending");
