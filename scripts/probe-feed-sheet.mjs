// Presses What's new's Show all on Home (tool-discovery F, G17/G20): at 1300 and 1180 What's new tops the right rail, and
// Show all opens a dialog (kind chips, day groups, a fixed foot with Clear all) instead of stretching the list in place;
// at 390 it opens the same dialog full screen. Needs a reader whose feed holds more than five items (the local-dev fixture
// account with every feed kind on). Read-only: it presses Show all, a chip and the close control, never Clear all.
// Fails on main (no dialog; the list expands in place; What's new sits in the main column).
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-feed-sheet.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [label, width, height] of [["phone", 390, 844], ["ipad landscape", 1180, 820], ["desktop", 1300, 900], ["ipad portrait", 820, 1180]]) {
    console.log(`\n## ${label} ${width}x${height}`);
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const section = page.locator("[data-whats-new]").first();
    await section.waitFor({ timeout: 20_000 });
    const box = await section.boundingBox();
    if (width >= 1180) check("What's new sits in the right rail, right of the main column", box.x > width * 0.6, `x=${Math.round(box.x)} w=${Math.round(box.width)}`);
    else check("below 1180 What's new is full width under the lead", box.width > width - 120, `w=${Math.round(box.width)}`);
    const rows = await section.locator("li").count();
    check("the rail keeps five rows", rows <= 5, `rows=${rows}`);
    const showAll = section.getByRole("button", { name: /^Show all \d+/ });
    check("Show all is drawn (the reader holds more than five)", (await showAll.count()) === 1);
    await showAll.click();
    const dialog = page.getByRole("dialog", { name: /What.s new/ });
    await dialog.waitFor({ timeout: 5_000 }).catch(() => {});
    check("Show all opens a dialog", (await dialog.count()) === 1);
    if ((await dialog.count()) === 1) {
      const d = await dialog.boundingBox();
      check(width >= 820 ? "the sheet is 460px, flush right, full height" : "the sheet fills the screen",
        width >= 820 ? Math.abs(d.width - 460) < 2 && Math.abs(d.x + d.width - width) < 2 && d.height >= height - 2 : d.width >= width - 2 && d.height >= height - 2,
        `x=${Math.round(d.x)} w=${Math.round(d.width)} h=${Math.round(d.height)}`);
      const chips = dialog.locator("[data-feed-chip]");
      check("an All chip and at least one kind chip", (await chips.count()) >= 2, (await chips.allInnerTexts()).join(" | "));
      check("the foot holds Choose notifications and Clear all", (await dialog.getByText("Choose notifications").count()) === 1 && (await dialog.getByRole("button", { name: /Clear all/ }).count()) === 1);
      const all = await dialog.locator("li").count();
      if ((await chips.count()) >= 2) {
        await chips.nth(1).click();
        const narrowed = await dialog.locator("li").count();
        check("a kind chip narrows the list", narrowed > 0 && narrowed <= all, `${all} -> ${narrowed}`);
        await chips.nth(0).click();
        check("All brings the list back", (await dialog.locator("li").count()) === all);
      }
      await page.keyboard.press("Escape");
      check("Esc closes it", (await dialog.count()) === 0);
      check("focus returns to Show all", await page.evaluate(() => /^Show all/.test(document.activeElement?.textContent ?? "")));
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
