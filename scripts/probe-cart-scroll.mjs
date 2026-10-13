// Shopping for all decks scrolls as one page on the phone (bug batch D item 3, Hugh 2026-10-13), walked in a
// real browser at 390x844 and 1300x900.
//
// The phone used to give the card list its own small scroll box under the price card, the deck picker and
// the switch, so about two and a half rows showed. Now the page scrolls as one: the checkout and the picker
// scroll away, the switch and the list heading stay pinned at the top, and the cards use the screen. Desktop
// keeps its one-screen page with the list in its own box. JSDOM has no layout, so the unit test pins the
// classes and this reads the boxes.
//
//   PROBE_BASE=http://localhost:3000 node scripts/probe-cart-scroll.mjs
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");

const WIDTHS = [
  { name: "phone", width: 390, height: 844 },
  { name: "desktop", width: 1300, height: 900 },
];

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
          if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
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

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};

const READ = () => {
  const region = document.querySelector('main [role="region"]');
  const controls = document.querySelector("main [data-cart-controls]");
  if (!region || !controls) return null;
  const rows = [...region.querySelectorAll("li")];
  const vh = window.innerHeight;
  const visible = rows.filter((r) => {
    const b = r.getBoundingClientRect();
    return b.height > 0 && b.top >= controls.getBoundingClientRect().bottom - 1 && b.bottom <= vh;
  });
  return {
    docScrolls: document.documentElement.scrollHeight - vh,
    regionOverflowY: getComputedStyle(region).overflowY,
    regionScrolls: region.scrollHeight - region.clientHeight,
    controlsTop: controls.getBoundingClientRect().top,
    controlsPosition: getComputedStyle(controls).position,
    rows: rows.length,
    visibleRows: visible.length,
  };
};

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: w.width, height: w.height },
      hasTouch: w.name === "phone",
      isMobile: w.name === "phone",
    });
    const page = await context.newPage();
    await signIn(page);
    await page.goto(`${BASE}/decks/shopping`, { waitUntil: "domcontentloaded" });
    await onPage(page, "[data-cart-controls]").first().waitFor({ timeout: 30_000 });
    await onPage(page, '[role="region"] li').first().waitFor({ timeout: 30_000 });
    const first = await page.evaluate(READ);
    check(first.rows >= 8, `${w.name}: the cart holds enough lines to measure`, `${first.rows} rows`);
    if (w.name === "phone") {
      check(first.docScrolls > 0, "phone: the document scrolls", `${first.docScrolls}px beyond the screen`);
      check(first.regionOverflowY === "visible" && first.regionScrolls <= 0, "phone: the list is not its own scroll box", `overflow-y ${first.regionOverflowY}, ${first.regionScrolls}px of inner scroll`);
      await page.evaluate(() => window.scrollBy(0, 700));
      await page.waitForTimeout(250);
      const after = await page.evaluate(READ);
      check(after.controlsPosition === "sticky" && Math.abs(after.controlsTop) <= 1, "phone: the switch and heading stay pinned at the top after scrolling", `top ${after.controlsTop.toFixed(1)}px, ${after.controlsPosition}`);
      check(after.visibleRows >= 5, "phone: at least five cards show under the pinned controls", `${after.visibleRows} rows`);
    } else {
      check(first.docScrolls <= 1, "desktop: the page fits the screen", `${first.docScrolls}px beyond it`);
      check(first.regionOverflowY === "auto" && first.regionScrolls > 0, "desktop: the list scrolls in its own box", `overflow-y ${first.regionOverflowY}, ${first.regionScrolls}px of inner scroll`);
      check(first.controlsPosition === "static", "desktop: the controls are not pinned (the box scrolls under them)", first.controlsPosition);
    }
    await context.close();
  }
} finally {
  await browser.close();
}
if (failures > 0) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
