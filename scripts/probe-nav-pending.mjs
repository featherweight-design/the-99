// probe:nav-pending — navigation pending and its escalation to the full screen, in a real browser
// at 1300x900 and 390x844, on Chromium's "Slow 4G" profile (the navigation-pending handoff and its
// escalation addendum). Every check here is a fact about time or paint, which jsdom has neither of.
//
//   1. A DIRECT load of /collection streams its loading screen inside the shell's <main>: the page
//      segment's own loading.tsx is gone, and the shell's Suspense fallback is what draws it now.
//   2. Home to /commanders by the nav slot: the pip paints at 120ms or later and never before; the
//      escalation screen is up by ~550ms and not before 400ms; `aria-busy` is on the shell's <main>
//      alone; a press under the screen lands on the screen; and after the commit the screen lets
//      pointer events through and is gone within a few frames.
//   3. Home's "Update collection" ghost link: its track paints, and at DPR 1 it is 2px tall (a
//      1.5px strip has no whole device pixel there). A screenshot of the button is saved.
//   4. A kept route (a deck page, from /decks): its own screen shows and the escalation never does.
//
// Mutations it is built to fail: the shell's <Suspense> removed (check 1 reads no screen), and the
// 400ms gate set to 0 (check 2 reads the screen before the pip).
//
// Point it at a `next start` on local-dev or a scratch branch, signed in as E2E_AUDIT_USER_EMAIL.
// It writes that account's About row (every entry seen) so no sheet covers a page, and nothing
// else. Never production.
//
//   PROBE_BASE=http://localhost:3061 pnpm probe:nav-pending
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { markEveryEntrySeen, sheetCookie } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS ?? path.join(os.tmpdir(), "probe-nav-pending");
mkdirSync(SHOTS, { recursive: true });

// Chromium's own "Slow 4G" figures, as `measure:load`'s slow profile uses them.
const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: (1.6 * 1e6) / 8 * 0.9, uploadThroughput: (750 * 1e3) / 8 * 0.9 };
const WIDTHS = [
  { label: "1300", viewport: { width: 1300, height: 900 } },
  { label: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const userId = await page.evaluate(async (email) => {
    const s = window.Clerk.client.signIn;
    let a = await s.create({ identifier: email });
    if (a.status !== "complete") {
      const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
      await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
      a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    }
    if (a.status !== "complete") throw new Error(`sign-in status ${a.status}`);
    await window.Clerk.setActive({ session: a.createdSessionId });
    return window.Clerk.user.id;
  }, EMAIL);
  await markEveryEntrySeen(userId);
  await context.addCookies([sheetCookie(userId, page.url())]);
  const state = await context.storageState();
  await context.close();
  return state;
}

// Stamps, from the moment it is armed, the first frame each pending signal is PAINTED: the pip or
// track at non-zero opacity, the escalation screen at non-zero opacity, and the frame it is gone.
const WATCH = () => {
  window.__navArm = () => {
    const t0 = performance.now();
    const seen = (window.__nav = { t0, mark: null, overlay: null, overlayGone: null, busy: [], hit: null });
    const tick = () => {
      const now = performance.now() - t0;
      const mark = document.querySelector("[data-pending]");
      if (seen.mark == null && mark && Number(getComputedStyle(mark).opacity) > 0) seen.mark = now;
      const overlay = document.querySelector('[data-testid="pending-overlay"]');
      if (seen.overlay == null && overlay && Number(getComputedStyle(overlay).opacity) > 0) {
        seen.overlay = now;
        seen.busy = [...document.querySelectorAll("[aria-busy]")].map((e) => e.tagName.toLowerCase());
        seen.overlayInsideMain = [...document.querySelectorAll("main")].some((m) => m.contains(overlay));
        const r = overlay.getBoundingClientRect();
        const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        seen.hit = overlay.contains(at);
      }
      if (seen.overlay != null && seen.overlayGone == null && !overlay) seen.overlayGone = now;
      if (now < 30_000) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
};

async function slowPage(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  return { page, throttle: (on) => cdp.send("Network.emulateNetworkConditions", on ? SLOW_4G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }) };
}

async function run(browser, state, width) {
  console.log(`\n${width.label}px`);
  const context = await browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, deviceScaleFactor: 1, storageState: state });
  await context.addInitScript(WATCH);

  // 1. Direct load: the shell's fallback streams the route's screen.
  {
    const { page, throttle } = await slowPage(context);
    await throttle(true);
    await page.addInitScript(() => {
      const look = () => {
        const status = document.querySelector("main [role=status] h1");
        if (status && !window.__screen) window.__screen = status.textContent;
        if (!window.__screen) requestAnimationFrame(look);
      };
      requestAnimationFrame(look);
    });
    await page.goto(`${BASE}/collection`, { waitUntil: "load", timeout: 120_000 });
    const screen = await page.evaluate(() => window.__screen ?? null);
    report(screen === "Reading your collection", "direct load of /collection streams its screen", screen ?? "no screen");
    await page.close();
  }

  // 2. Home to /commanders by the nav slot.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
    await throttle(true);
    const slot = page.locator(width.label === "390" ? 'nav[aria-label="Primary"].fixed a[href="/commanders"]' : 'aside nav[aria-label="Primary"] a[href="/commanders"]');
    await page.evaluate(() => window.__navArm());
    await slot.click();
    await page.waitForURL((u) => u.pathname === "/commanders", { timeout: 120_000 });
    await page.waitForFunction(() => window.__nav.overlayGone != null || performance.now() - window.__nav.t0 > 60_000, null, { timeout: 120_000, polling: 50 });
    const nav = await page.evaluate(() => window.__nav);
    report(nav.mark != null && nav.mark >= 110, "the pip paints at 120ms, never before", `pip at ${Math.round(nav.mark)}ms`);
    report(nav.overlay != null && nav.overlay >= 390 && nav.overlay <= 700, "the screen is up by ~550ms and not before 400ms", `screen at ${nav.overlay == null ? "never" : `${Math.round(nav.overlay)}ms`}`);
    report(nav.overlay == null || nav.mark < nav.overlay, "the pip paints before the screen", "");
    report(nav.busy.length === 1 && nav.busy[0] === "main", "aria-busy is on the shell's <main> alone", nav.busy.join(",") || "none");
    report(nav.overlayInsideMain === false, "the screen is a sibling of <main>, never inside it", "");
    report(nav.hit === true, "a press under the screen lands on the screen", "");
    report(nav.overlayGone != null, "the screen is gone after the commit", nav.overlayGone == null ? "still up" : `gone at ${Math.round(nav.overlayGone)}ms`);
    const busyAfter = await page.evaluate(() => document.querySelectorAll("[aria-busy]").length);
    report(busyAfter === 0, "nothing is left busy after the commit", `${busyAfter}`);
    await throttle(false);
    await page.close();
  }

  // 3. The ghost link's track, at DPR 1.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 120_000 });
    await throttle(true);
    const link = page.locator('main a[href="/collection/replace"]').first();
    await link.click();
    const track = link.locator("[data-pending]");
    await track.waitFor({ state: "attached", timeout: 10_000 });
    await page.waitForTimeout(400);
    const h = await track.evaluate((el) => el.getBoundingClientRect().height).catch(() => null);
    report(h === 2, "the track is 2px at DPR 1", `${h}px`);
    const shot = path.join(SHOTS, `track-${width.label}.png`);
    await link.screenshot({ path: shot }).catch(() => {});
    console.log(`       screenshot: ${shot}`);
    await page.waitForURL((u) => u.pathname === "/collection/replace", { timeout: 120_000 });
    await throttle(false);
    await page.close();
  }

  // 4. A kept route: its own screen, never the escalation.
  {
    const { page, throttle } = await slowPage(context);
    await page.goto(`${BASE}/decks`, { waitUntil: "networkidle", timeout: 120_000 });
    const deck = page.locator('main a[href^="/decks/"]:not([href="/decks/new"]):not([href="/decks/import"])').first();
    const href = await deck.getAttribute("href");
    await throttle(true);
    await page.evaluate(() => window.__navArm());
    await deck.click();
    await page.waitForURL((u) => u.pathname === href, { timeout: 120_000 });
    await page.waitForFunction(() => !document.querySelector("main [role=status]"), null, { timeout: 120_000, polling: 50 }).catch(() => {});
    const nav = await page.evaluate(() => window.__nav);
    report(nav.overlay == null, `a kept route (${href}) never escalates`, nav.overlay == null ? "" : `screen at ${Math.round(nav.overlay)}ms`);
    await throttle(false);
    await page.close();
  }

  await context.close();
}

await clerkSetup();
const browser = await chromium.launch();
try {
  const state = await signIn(browser);
  for (const width of WIDTHS) await run(browser, state, width);
} finally {
  await browser.close();
}
console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
process.exitCode = failures ? 1 : 0;
