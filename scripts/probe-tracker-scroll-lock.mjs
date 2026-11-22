// probe:tracker-scroll-lock — during a game the life tracker's /play does not scroll (Hugh's ruling, 2026-11-22), at
// phone (390x844) and tablet (1180x820) width on the fixture's four-seat S4 table. It starts a game, scrolls as far as
// the page allows and reloads (a browser restores the old scroll on reload, which is how the top seat slid off screen),
// then checks the page reads scrollY 0, is exactly one screen tall, and stays at 0 after a mouse wheel, a touch swipe
// (CDP's synthesized scroll gesture) and `window.scrollTo`. The Fan Content notice is gone during the game and still
// follows setup and the table page (the controls). On main the page is 147px (phone) or 129px (tablet) taller than the
// screen, so the reload lands scrolled and the first check fails. Writes only the device's saved game (localStorage),
// so it may run against local-dev with the fixture seeded.
//
//   PROBE_BASE=http://localhost:3393 node scripts/probe-tracker-scroll-lock.mjs
// Optional: SHOTS=<dir> keeps a photograph of each width after the swipe.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(BASE)) throw new Error("PROBE_BASE must be a local dev server");
const SHOTS = process.env.SHOTS;
const S4 = "7a0e0000-0000-4000-8000-000000000013";
const DEVICES = [
  { label: "phone", viewport: { width: 390, height: 844 } },
  { label: "tablet", viewport: { width: 1180, height: 820 } },
];

let failed = 0;
const check = (label, ok, detail = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
};

// As `probe-tracker-menu.mjs`: the audit account's fixed 424242 code through `window.Clerk` on the app's origin.
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

const metrics = (page) =>
  page.evaluate(() => ({
    sy: Math.round(window.scrollY),
    sh: document.documentElement.scrollHeight,
    ih: window.innerHeight,
    notice: (() => {
      const f = document.querySelector("footer[data-fan-content-notice]");
      return !!f && getComputedStyle(f).display !== "none" && f.getBoundingClientRect().height > 0;
    })(),
  }));

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const { label, viewport } of DEVICES) {
    const context = await browser.newContext({ viewport, hasTouch: true });
    const page = await context.newPage();
    const L = (s) => `${label}: ${s}`;
    try {
      await signIn(page);
      // The table page polls its seats, so it never goes network-idle: wait for the notice itself.
      await page.goto(`${BASE}/friends/table/${S4}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await page.locator("footer[data-fan-content-notice]").waitFor({ timeout: 60_000 }).catch(() => {});
      check(L("control: the table page draws the notice"), (await metrics(page)).notice);

      // Setup keeps the notice: the exemption is the game, not the route.
      await page.goto(`${BASE}/friends/table/${S4}/play`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await page.evaluate((k) => localStorage.removeItem(k), `the99.tracker.${S4}`);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: "Start", exact: true }).waitFor({ timeout: 60_000 });
      check(L("control: setup still draws the notice"), (await metrics(page)).notice);
      await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove()));
      await page.getByRole("button", { name: "Start", exact: true }).evaluate((el) => el.click());
      await page.getByTestId("tracker-play").waitFor({ timeout: 15_000 });
      await page.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click());
      await page.getByTestId("first-roll").waitFor({ state: "detached", timeout: 5_000 }).catch(() => {});

      // Scroll as far as the page lets, then reload: the browser restores whatever scroll was possible.
      await page.evaluate(() => window.scrollTo(0, 10_000));
      await page.waitForTimeout(200);
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.getByTestId("tracker-play").waitFor({ timeout: 30_000 });
      await page.evaluate(() => document.querySelector("[data-testid=first-roll] > button")?.click());
      await page.waitForTimeout(800);
      const after = await metrics(page);
      check(L("after a reload the page reads scrollY 0"), after.sy === 0, JSON.stringify(after));
      check(L("the page is exactly one screen tall"), after.sh <= after.ih, `scrollHeight ${after.sh}, viewport ${after.ih}`);
      check(L("the notice is gone during the game"), !after.notice);

      const { width: w, height: h } = viewport;
      await page.mouse.move(w / 2, h / 2);
      await page.mouse.wheel(0, 600);
      await page.waitForTimeout(400);
      const wheel = await metrics(page);
      check(L("a mouse wheel does not scroll it"), wheel.sy === 0, `scrollY ${wheel.sy}`);

      const cdp = await context.newCDPSession(page);
      await cdp.send("Input.synthesizeScrollGesture", { x: Math.round(w / 2), y: Math.round(h * 0.7), yDistance: -500, gestureSourceType: "touch", speed: 2000 });
      await page.waitForTimeout(400);
      const swipe = await metrics(page);
      check(L("a touch swipe does not scroll it"), swipe.sy === 0, `scrollY ${swipe.sy}`);

      await page.evaluate(() => {
        window.scrollTo(0, 500);
        document.scrollingElement.scrollTop = 500;
      });
      await page.waitForTimeout(200);
      const scripted = await metrics(page);
      check(L("window.scrollTo does not scroll it"), scripted.sy === 0, `scrollY ${scripted.sy}`);
      if (SHOTS) {
        // The fixture's seat notices stack over the board; clear them so the photograph shows the seats.
        await page.evaluate(() => document.querySelectorAll("[data-seat-notice-stack], nextjs-portal").forEach((n) => n.remove()));
        await page.screenshot({ path: `${SHOTS}/scroll-lock-${label}.png` });
      }

      // Leaving the game for the table brings the notice and the scroll back.
      await page.goto(`${BASE}/friends/table/${S4}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await page.locator("footer[data-fan-content-notice]").waitFor({ timeout: 60_000 }).catch(() => {});
      const back = await metrics(page);
      check(L("control: the table page draws the notice again after the game"), back.notice);
    } catch (error) {
      check(L("the walk stopped"), false, String(error?.message ?? error).split("\n")[0]);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/scroll-lock-stopped-${label}.png` }).catch(() => {});
    } finally {
      await page.evaluate((k) => localStorage.removeItem(k), `the99.tracker.${S4}`).catch(() => {});
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
