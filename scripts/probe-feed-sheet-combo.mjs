// Presses a combo row inside What's new's Show all sheet at phone width (issue #3371). The card modal a combo row opens
// mounts inside <main>; the sheet used to portal to <body>, which made <main> an inert sibling, so the modal drew but took
// no press and the whole app read as frozen. Needs a reader whose feed holds a combo item beyond the first five rows
// (the local-dev fixture account with every feed kind on). Read-only: it presses a row and the modal's close control.
// The sheet gives way to the combo (it opens in its place). Fails on main (the modal sits under an inert <main>: nothing in it takes a press).
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-feed-sheet-combo.mjs
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
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await signIn(page);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const section = page.locator("[data-whats-new]").first();
  await section.waitFor({ timeout: 20_000 });
  await section.getByRole("button", { name: /^Show all \d+/ }).click();
  const sheet = page.locator("[data-feed-sheet]");
  await sheet.waitFor({ timeout: 5_000 });
  const row = sheet.locator("li:has([data-feed-combo])").first();
  check("the fixture feed holds a combo row in the sheet", (await row.count()) === 1);
  if ((await row.count()) === 1) {
    await row.locator("[data-feed-press]").first().click();
    const modal = page.locator('[role="dialog"][aria-modal="true"]:not([data-feed-sheet])').first();
    await modal.waitFor({ timeout: 8_000 }).catch(() => {});
    check("the combo opens a card modal", (await modal.count()) === 1);
    if ((await modal.count()) === 1) {
      const held = await modal.evaluate((el) => el.closest("[inert]") !== null);
      check("the modal is not inside an inert ancestor", !held);
      await sheet.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
      check("the sheet gave way to the combo", (await sheet.count()) === 0);
      await page.waitForTimeout(700); // the modal slides in; a press mid-slide lands on its scrim
      const focus = await page.evaluate(() => {
        const el = document.activeElement;
        return { inside: !!el?.closest('[role="dialog"][aria-modal="true"]:not([data-feed-sheet])'), what: el ? `${el.tagName}${el.getAttribute("aria-label") ? ":" + el.getAttribute("aria-label") : ""}` : "none" };
      });
      check("focus is inside the combo view, not back on the Show all trigger behind it", focus.inside, focus.what);
      const box = await modal.boundingBox();
      const hit = await page.evaluate(({ x, y }) => {
        const el = document.elementFromPoint(x, y);
        return !!el?.closest('[role="dialog"][aria-modal="true"]:not([data-feed-sheet])');
      }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
      check("a press at the modal's centre lands on the modal", hit);
      await modal.getByRole("button", { name: /^Close/ }).first().tap({ timeout: 5_000 }).catch(() => {});
      check("the modal's Close takes the press and closes it", (await page.locator('[role="dialog"][aria-modal="true"]:not([data-feed-sheet])').count()) === 0);
    }
  }
  await context.close();
} finally {
  await browser.close();
}
if (failed) {
  console.log(`\n${failed} check(s) FAILED`);
  process.exit(1);
}
console.log("\nall checks passed");
