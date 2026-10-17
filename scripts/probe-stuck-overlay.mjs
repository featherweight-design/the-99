// probe:stuck-overlay — the navigation overlay must never outlive its navigation (stuck-loader, 2026-10-18).
//
// Hugh (reported 2026-10-17/18): a loading screen sticks "all over the app" and a refresh is the only way out. On staging, pressing
// "What uses credits?" on /credits (to /about#credits) left it up with the address still on /credits. This
// presses real links in a real browser, with the app's own background work in flight, and samples the page
// every 500ms for 15s after each press: the pathname, the pending overlay and its data-leaving, whether
// <main> is inert, whether a nav-stall beacon was sent, and whether the page still answers. A press that
// ends with the overlay up and NO beacon is the bug: an up overlay with nothing watching it.
//
// A history hook records every push/replace with its stack, and a long-task observer records main-thread
// blocks, so a hang and a drop tell apart.
//
// Needs `next start` with NAV_STALL_LOG_ENABLED=true and MOMENTS_ENABLED=true, on local-dev or a scratch branch
// (it writes the audit account's About row, put back at the end). Never production, never staging.
//
//   PROBE_BASE=http://localhost:3917 pnpm probe:stuck-overlay
//   PROBE_QUICK=1   skips the 70s wait that lets background actions run (the control)
//   PROBE_SLOW=1    Chromium's Slow 4G, so a press stays pending past the 400ms gate
//   PROBE_CHECKOUT=1 loads /credits as the return from Stripe (?checkout=done&session_id=), so the return band polls
//   PROBE_HIDDEN=1  backgrounds the tab (visibilityState hidden) for the wait, then brings it back before the press
//   PROBE_REFRESH=1 calls the router's refresh() twice while the press is pending, the way a revalidating
//                   action, the Checkout-return poll or credits-view's onAdded does
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { neon } from "@neondatabase/serverless";
import { captureAboutSeen, clearAboutSheet, restoreAboutSeen } from "./lib/about-clear.mjs";
import { PRODUCTION_BRANCH, STAGING_BRANCH } from "./lib/scratch-branch.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(BASE)) throw new Error("Set PROBE_BASE to a local server.");
const QUICK = process.env.PROBE_QUICK === "1";
const WAIT_MS = QUICK ? 1_500 : 70_000;
const SAMPLE_MS = 500;
const SAMPLES = 30;
const SLOW = process.env.PROBE_SLOW === "1";
const CHECKOUT = process.env.PROBE_CHECKOUT === "1";
const HIDDEN = process.env.PROBE_HIDDEN === "1";
const REFRESH = process.env.PROBE_REFRESH === "1";
const SLOW_4G = { offline: false, latency: 562.5, downloadThroughput: ((1.6 * 1e6) / 8) * 0.9, uploadThroughput: ((750 * 1e3) / 8) * 0.9 };

let failures = 0;
function report(ok, label, detail) {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok " : " FAIL "} ${label}${detail ? ` — ${detail}` : ""}`);
}

const INIT = () => {
  window.__probe = { history: [], longtasks: [], beacons: [] };
  for (const name of ["pushState", "replaceState"]) {
    const original = history[name];
    history[name] = function (state, unused, url) {
      window.__probe.history.push({ name, url: String(url ?? ""), t: Math.round(performance.now()), stack: new Error().stack?.split("\n").slice(2, 5).join(" | ") });
      return original.apply(this, arguments);
    };
  }
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__probe.longtasks.push({ t: Math.round(e.startTime), ms: Math.round(e.duration) });
    }).observe({ type: "longtask", buffered: true });
  } catch {
    // No long-task support.
  }
  const beacon = navigator.sendBeacon?.bind(navigator);
  if (beacon) {
    navigator.sendBeacon = (url, data) => {
      if (String(url).includes("/api/nav-stall")) window.__probe.beacons.push({ t: Math.round(performance.now()) });
      return beacon(url, data);
    };
  }
};

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
  const aboutRow = await captureAboutSeen(userId);
  await clearAboutSheet(page, userId);
  const state = await context.storageState();
  await context.close();
  return { state, userId, aboutRow };
}

async function snapshot(page) {
  const answered = await Promise.race([
    page.evaluate(() => {
      const overlay = document.querySelector('[data-testid="pending-overlay"]');
      const main = document.querySelector("main");
      return {
        path: location.pathname + location.hash,
        overlay: overlay !== null,
        leaving: overlay?.hasAttribute("data-leaving") ?? false,
        inert: [...document.querySelectorAll("main")].some((m) => m.inert),
        busy: document.querySelector("[aria-busy=true]") !== null,
        beacons: window.__probe.beacons.length,
      };
    }),
    new Promise((resolve) => setTimeout(() => resolve(null), 3_000)),
  ]);
  return answered;
}

// Presses `press`, then samples. Returns the verdict for the run.
let throttle = null;

// The wait before a press: a long sit, optionally with the tab backgrounded, so timers and focus handlers that
// fire on a hidden tab (token refresh, the visit clock) have fired when the reader comes back.
async function away(page) {
  const setVisibility = (state) =>
    page.evaluate((v) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => v });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => v === "hidden" });
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event(v === "hidden" ? "blur" : "focus"));
    }, state);
  if (HIDDEN) await setVisibility("hidden");
  await page.waitForTimeout(WAIT_MS);
  if (HIDDEN) await setVisibility("visible");
  await page.waitForTimeout(500);
}
async function run(page, label, press) {
  await page.evaluate(() => {
    window.__probe.history.length = 0;
    window.__probe.beacons.length = 0;
    window.__probe.longtasks.length = 0;
  });
  const startPath = new URL(page.url()).pathname;
  await throttle?.(true);
  await press();
  const samples = [];
  if (REFRESH) {
    for (const delay of [450, 1_500]) {
      setTimeout(() => page.evaluate(() => window.next?.router?.refresh?.()).catch(() => {}), delay);
    }
  }
  for (let i = 0; i < SAMPLES; i++) {
    await page.waitForTimeout(SAMPLE_MS);
    samples.push(await snapshot(page));
  }
  await throttle?.(false);
  const last = samples.at(-1);
  const everUp = samples.some((s) => s?.overlay);
  const answers = samples.every((s) => s !== null);
  const trace = samples.map((s) => (s === null ? "X" : s.overlay ? (s.leaving ? "l" : "O") : ".")).join("");
  // Host-side deadline: a renderer that stopped answering leaves an evaluate pending, not rejected.
  const extra = await Promise.race([
    page.evaluate(() => ({ history: window.__probe.history, longtasks: window.__probe.longtasks.filter((l) => l.ms > 200) })).catch(() => null),
    new Promise((resolve) => setTimeout(() => resolve(null), 3_000)),
  ]).then((v) => v ?? { history: [], longtasks: [] });
  console.log(`   ${label}: from ${startPath}; samples ${trace}; end path ${last?.path}; beacons ${last?.beacons}; history ${extra.history.length}; long tasks ${extra.longtasks.length}`);
  for (const h of extra.history.slice(0, 4)) console.log(`      ${h.name} ${h.url} @${h.t} ${h.stack}`);
  report(answers, `${label}: the page answers throughout`);
  // The bug: an overlay still up at the end that nothing reported and nothing will take down.
  const stuck = last?.overlay && !last.leaving;
  report(!stuck, `${label}: the overlay is not left up after 15s`, stuck ? `up with ${last.beacons} nav-stall report(s); main inert ${last.inert}` : everUp ? "it showed, then left" : "it never showed");
  if (stuck) report(last.beacons > 0, `${label}: an overlay that IS up was reported to /api/nav-stall`);
  // The provider now takes an orphaned overlay down at once, so "not stuck" no longer proves there was none: its
  // trace is a nav-stall report (kind=orphan) on a press that landed in well under the 8s a pending report needs.
  report(last?.beacons === 0, `${label}: no nav-stall report was sent for a press that landed`, last?.beacons ? `${last.beacons} report(s): an orphan or a stall` : undefined);
  return { stuck, everUp };
}

// The probe writes the audit account's About row (put back below): never production, never staging, never a
// database that cannot say which branch it is.
const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION_BRANCH || branch === STAGING_BRANCH) throw new Error(`refusing branch ${branch ?? "(unknown)"}`);
await clerkSetup();
const browser = await chromium.launch();
const { state, aboutRow } = await signIn(browser);
try {
  for (const [name, viewport, mobile] of [["1300", { width: 1300, height: 900 }, false], ["390", { width: 390, height: 844 }, true]]) {
    const context = await browser.newContext({ storageState: state, viewport, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(INIT);
    const page = await context.newPage();
    if (SLOW) {
      const cdp = await context.newCDPSession(page);
      await cdp.send("Network.enable");
      throttle = (on) => cdp.send("Network.emulateNetworkConditions", on ? SLOW_4G : { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    }

    // A: /credits, wait for background work (moments spend, polls), then the "What uses credits?" link.
    await page.goto(`${BASE}/credits${CHECKOUT ? "?checkout=done&session_id=cs_test_probe" : ""}`, { waitUntil: "load" });
    await away(page);
    const creditsLink = page.locator('main a[href="/about#credits"]').first();
    if ((await creditsLink.count()) > 0) {
      await run(page, `${name} /credits -> /about#credits (${QUICK ? "no wait" : "after 70s"})`, () => creditsLink.click());
    } else {
      console.log(`   ${name}: no What uses credits? link on /credits for this account; skipped`);
    }

    // B: Home to the first deck, then /decks to /collection, with the same wait first.
    await page.goto(`${BASE}/`, { waitUntil: "load" });
    await away(page);
    const deck = page.locator('main a[href^="/decks/"]').first();
    if ((await deck.count()) > 0) await run(page, `${name} Home -> deck (${QUICK ? "no wait" : "after 70s"})`, () => deck.click());

    await page.goto(`${BASE}/decks`, { waitUntil: "load" });
    await away(page);
    const nav = page.locator('nav a[href="/collection"]:visible').first();
    if ((await nav.count()) > 0) await run(page, `${name} /decks -> /collection (${QUICK ? "no wait" : "after 70s"})`, () => nav.click());
    await context.close();
  }
} finally {
  await restoreAboutSeen(aboutRow).catch((error) => report(false, "the audit account's About row was put back", error instanceof Error ? error.message : String(error)));
  await browser.close();
}
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
