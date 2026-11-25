// Collection quick filters, PR 2: the chip strip pressed for real at phone, tablet and desktop widths.
//
// Run by hand against a dev server: `PROBE_BASE=http://localhost:3107 node scripts/probe-quick-filters.mjs`.
// Presses every chip the account's list draws and asserts what a press does: aria-pressed, the URL, one chip at a
// time, Clear all, a 44px hit area, the phone strip's reach and no sideways page scroll. It fails on main, where
// there is no strip to press. Not part of `pnpm test`: it needs a browser and a signed-in session.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;

const VIEWPORTS = [
  { label: "phone 390x844", width: 390, height: 844, form: "phone" },
  { label: "tablet 820x1180", width: 820, height: 1180, form: "phone" },
  { label: "tablet 1180x820", width: 1180, height: 820, form: "wide" },
  { label: "desktop 1300x900", width: 1300, height: 900, form: "wide" },
];

const failures = [];
const check = (ok, what) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}`);
  if (!ok) failures.push(what);
};

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
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
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const chipKeys = (page) => page.locator("[data-quick-strip]:visible [data-quick-chip]").evaluateAll((n) => n.map((b) => b.dataset.quickChip));
const chip = (page, key) => page.locator(`[data-quick-strip]:visible [data-quick-chip="${key}"]`);
const urlParam = (page, name) => new URL(page.url()).searchParams.get(name);

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const vp of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/collection`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-quick-strip]:visible").first().waitFor({ timeout: 30_000 });
    const keys = await chipKeys(page);
    console.log(`\n== ${vp.label}: chips ${keys.join(", ")}`);
    check(keys.length > 0, `${vp.label}: the strip draws chips`);
    check(
      await page.locator(`[data-quick-strip="${vp.form}"]:visible`).count() === 1,
      `${vp.label}: the ${vp.form} strip is the one drawn`,
    );
    check(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      `${vp.label}: no sideways page scroll`,
    );

    for (const key of keys) {
      const button = chip(page, key);
      await button.scrollIntoViewIfNeeded();
      const hit = await button.evaluate((b) => {
        const box = b.getBoundingClientRect();
        const after = getComputedStyle(b, "::after");
        return { h: Math.max(box.height, parseFloat(after.height) || 0), w: Math.max(box.width, parseFloat(after.minWidth) || 0) };
      });
      check(hit.h >= 44 && hit.w >= 44, `${vp.label}: ${key} hit area ${hit.w}x${hit.h} is 44px`);
      check((await button.getAttribute("aria-pressed")) === "false", `${vp.label}: ${key} starts unpressed`);

      await button.click();
      await page.waitForTimeout(400);
      check((await chip(page, key).getAttribute("aria-pressed")) === "true", `${vp.label}: ${key} pressed after a click`);
      const param = key === "free" ? urlParam(page, "avail") : urlParam(page, "quick");
      check(param === (key === "free" ? "free" : key), `${vp.label}: ${key} writes its URL param (${param})`);
      const pressedNow = await page.locator("[data-quick-strip]:visible [aria-pressed=true]").count();
      check(pressedNow === 1, `${vp.label}: ${key} is the only pressed chip`);
      // A pressed chip is never also an active-filter chip.
      const doubled = await page.locator("[data-chassis-row=chips] [aria-label^='Remove'], [data-collection-chip-shelf] [aria-label^='Remove']").count();
      check(doubled === 0, `${vp.label}: ${key} pressed draws no active-filter chip (${doubled})`);

      // Switching: pressing the next chip takes this one back.
      const other = keys.find((k) => k !== key);
      if (other) {
        await chip(page, other).click();
        await page.waitForTimeout(400);
        // The replaced chip may leave the strip altogether: its count is taken under the new selection, and a chip
        // with no cards is not drawn.
        const keyAfter = await chip(page, key).count() === 0 ? "false" : await chip(page, key).getAttribute("aria-pressed");
        check(
          (await chip(page, other).getAttribute("aria-pressed")) === "true" && keyAfter === "false",
          `${vp.label}: pressing ${other} replaces ${key}`,
        );
        await chip(page, other).click();
        await page.waitForTimeout(400);
      } else {
        await chip(page, key).click();
        await page.waitForTimeout(400);
      }
      check((await chip(page, key).count()) > 0 && (await chip(page, key).getAttribute("aria-pressed")) === "false", `${vp.label}: ${key} off again`);
      check(urlParam(page, "quick") === null && urlParam(page, "avail") === null, `${vp.label}: ${key} off clears the URL`);
    }

    // Clear all stays live on a quick-only state and clears it.
    const first = keys[0];
    if (first) {
      await chip(page, first).click();
      await page.waitForTimeout(400);
      if (vp.form === "phone") {
        // The phone's Clear all lives on the active-chip shelf, which a quick-only state does not open (the chip's own
        // x is its way out), so give it an active chip to sit beside.
        await page.locator('input[placeholder^="Search"]:visible').first().fill("a");
        await page.waitForTimeout(600);
      }
      const clear = page.getByRole("button", { name: /clear all filters/i }).locator("visible=true").first();
      check(await clear.isEnabled(), `${vp.label}: Clear all is live on a quick-only state`);
      await clear.click();
      await page.waitForTimeout(400);
      check((await chip(page, first).getAttribute("aria-pressed")) === "false", `${vp.label}: Clear all takes the quick chip back`);
    }

    // Keyboard focus brings a cut-off chip into view on the phone strip.
    if (vp.form === "phone" && keys.length > 0) {
      const last = chip(page, keys[keys.length - 1]);
      await last.focus();
      await page.waitForTimeout(300);
      const inView = await last.evaluate((b) => {
        const r = b.getBoundingClientRect();
        return r.left >= 0 && r.right <= window.innerWidth + 1;
      });
      check(inView, `${vp.label}: focusing the last chip scrolls it into view`);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures.length > 0) {
  console.log(`\n${failures.length} failure(s)`);
  process.exit(1);
}
console.log("\nall ok");
