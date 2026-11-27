// Presses a combo row inside What's new's Show all sheet, at phone and desktop width (issue #3371, then the way back). The card modal a combo row opens
// mounts inside <main>; the sheet used to portal to <body>, which made <main> an inert sibling, so the modal drew but took
// no press and the whole app read as frozen. Needs a reader whose feed holds a combo item beyond the first five rows
// (the local-dev fixture account with every feed kind on). Read-only: it presses a row and the modal's close control.
// The sheet gives way to the combo (it opens in its place). Fails on main (the modal sits under an inert <main>: nothing in it takes a press).
// Closing the combo returns to the sheet: open again, the list at the scroll it had, focus on the pressed row, one scroll lock (the page
// scrolls and is not inert once the sheet is closed after). Fails when the return is reverted.
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
const MODAL = '[role="dialog"][aria-modal="true"]:not([data-feed-sheet])';
try {
  for (const vp of [
    { name: "phone", viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    { name: "desktop", viewport: { width: 1280, height: 800 }, hasTouch: false, isMobile: false },
  ]) {
    const L = (label) => `${vp.name}: ${label}`;
    const context = await browser.newContext({ viewport: vp.viewport, hasTouch: vp.hasTouch, isMobile: vp.isMobile });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    const section = page.locator("[data-whats-new]").first();
    await section.waitFor({ timeout: 20_000 });
    await section.getByRole("button", { name: /^Show all \d+/ }).first().click();
    const sheet = page.locator("[data-feed-sheet]");
    await sheet.waitFor({ timeout: 5_000 });
    const row = sheet.locator("li:has([data-feed-combo])").first();
    check(L("the fixture feed holds a combo row in the sheet"), (await row.count()) === 1);
    if ((await row.count()) !== 1) { await context.close(); continue; }
    const key = await row.getAttribute("data-feed-key");
    // Scroll the list down as far as it goes (the combo row is scrolled off the top), so the return has a place to restore and focus must not scroll it back. The press is a DOM click
    // (Playwright's own scroll-into-view before a click would move the list and blur the number we compare).
    const before = await sheet.locator("[data-feed-sheet-body]").evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return el.scrollTop;
    });
    check(L("the list is scrolled before the press"), before > 0, `scrollTop ${before}`);
    await row.locator("[data-feed-press]").first().evaluate((el) => el.click());
    const modal = page.locator(MODAL).first();
    await modal.waitFor({ timeout: 8_000 }).catch(() => {});
    check(L("the combo opens a card modal"), (await modal.count()) === 1);
    if ((await modal.count()) !== 1) { await context.close(); continue; }
    check(L("the modal is not inside an inert ancestor"), !(await modal.evaluate((el) => el.closest("[inert]") !== null)));
    await sheet.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    check(L("the sheet gave way to the combo"), (await sheet.count()) === 0);
    await page.waitForTimeout(700); // the modal slides in; a press mid-slide lands on its scrim
    const focus = await page.evaluate((sel) => {
      const el = document.activeElement;
      return { inside: !!el?.closest(sel), what: el ? `${el.tagName}${el.getAttribute("aria-label") ? ":" + el.getAttribute("aria-label") : ""}` : "none" };
    }, MODAL);
    check(L("focus is inside the combo view, not back on the Show all trigger behind it"), focus.inside, focus.what);
    const box = await modal.boundingBox();
    const hit = await page.evaluate(({ x, y, sel }) => !!document.elementFromPoint(x, y)?.closest(sel), { x: box.x + box.width / 2, y: box.y + box.height / 2, sel: MODAL });
    check(L("a press at the modal's centre lands on the modal"), hit);
    const closeBtn = modal.getByRole("button", { name: /^Close/ }).first();
    await (vp.hasTouch ? closeBtn.tap({ timeout: 5_000 }) : closeBtn.click({ timeout: 5_000 })).catch(() => {});
    check(L("the modal's Close takes the press and closes it"), (await page.locator(MODAL).count()) === 0);
    // The way back: the sheet is open again, where it was left.
    await sheet.waitFor({ timeout: 5_000 }).catch(() => {});
    check(L("closing the combo opens the Show all sheet again"), (await sheet.count()) === 1);
    check(L("one dialog at a time: the combo is gone while the sheet is up"), (await page.locator(MODAL).count()) === 0);
    await page.waitForTimeout(900); // the sheet slides in
    const back = await page.evaluate((k) => {
      const body = document.querySelector("[data-feed-sheet-body]");
      const el = document.activeElement;
      return { scroll: body?.scrollTop ?? -1, focusKey: el?.closest("[data-feed-key]")?.getAttribute("data-feed-key") ?? null, isPress: el?.hasAttribute("data-feed-press") ?? false, k };
    }, key);
    check(L("the list is at the scroll it had"), Math.abs(back.scroll - before) <= 2, `before ${before}, after ${back.scroll}`);
    check(L("focus is on the combo row that was pressed"), back.focusKey === key && back.isPress, `focus on ${back.focusKey}`);
    await page.screenshot({ path: process.env.PROBE_SHOT ? `${process.env.PROBE_SHOT}-${vp.name}.png` : undefined }).catch(() => {});
    if ((await sheet.count()) === 1) await page.locator("[data-feed-sheet-close]").click();
    await sheet.waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});
    check(L("closing the sheet afterwards closes it"), (await sheet.count()) === 0);
    const free = await page.evaluate(() => {
      const main = document.querySelector("main");
      return { locked: getComputedStyle(document.body).overflow === "hidden" || getComputedStyle(document.documentElement).overflow === "hidden", inert: !!main?.closest("[inert]") };
    });
    check(L("no stuck scroll lock or inert page after the final close"), !free.locked && !free.inert, JSON.stringify(free));
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
