// The deck page's loading skeleton, pressed (handoff design_handoff_the99_deck_flip_skeleton): flipping to a deck and opening one
// by its address draw the page's own shape (the real `‹ All decks` strip link, the tab row in words) before the deck lands, not
// the crown screen. Also measures, per run, the time from the press to the skeleton and to the landed deck, on a throttled
// connection and unthrottled, and whether a fast (unthrottled) flip flashes the skeleton.
//
// Read-only: it signs in, presses, writes nothing. Needs an account with 3+ decks. Dev server cold-compiles the first visit, so
// each route is visited once before the timed runs.
//   PROBE_BASE=http://localhost:3799 node scripts/probe-deck-open-skeleton.mjs
// Point it at local-dev or a scratch branch, NEVER production. PROBE_RUNS=<n> sets timed runs per profile (default 3).
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, E2E_AUDIT_USER_PASSWORD: PASSWORD } = requireEnv([
  "E2E_AUDIT_USER_EMAIL", "E2E_AUDIT_USER_PASSWORD", "CLERK_SECRET_KEY",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const RUNS = Number(process.env.PROBE_RUNS ?? 3);
// Slow 4G, the one throttle profile for every run (latency 400ms, 400 kbps down, 400 kbps up).
const SLOW = { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 };
const FAST = { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 };
let failed = 0;
const check = (width, label, ok, saw) => {
  if (!ok) failed++;
  console.log(`${ok ? "  ok  " : " FAIL "} [${width}] ${label} — ${saw}`);
};
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async ([email, password]) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email, password });
      if (a.status === "needs_client_trust" || a.status === "needs_first_factor") {
        const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
        await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f?.emailAddressId });
        a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) { return e?.errors?.[0]?.longMessage ?? String(e); }
  }, [EMAIL, PASSWORD]);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const SIZES = { phone: { width: 390, height: 844, touch: true }, desktop: { width: 1300, height: 900, touch: false } };

// Installed before the press: stamps when the skeleton first draws, whether it is the strip-bearing one, and when the deck's
// own strip (data-flip-strip) lands, so a run reports both times and a flash (skeleton shown, then gone within a few frames).
const WATCH = () => {
  window.__open = { path0: location.pathname, t0: performance.now(), skeletonAt: null, skeletonHasLink: false, skeletonGoneAt: null, landedAt: null, crown: false };
  const tick = () => {
    const o = window.__open;
    const sk = document.querySelector("[data-loading-screen]");
    if (sk && o.skeletonAt === null) {
      o.skeletonAt = performance.now() - o.t0;
      o.skeletonHasLink = Boolean(sk.querySelector('a[href="/decks"]')) && /Your deck/.test(sk.textContent ?? "");
      o.crown = /Shuffling up/.test(sk.textContent ?? "");
    }
    if (!sk && o.skeletonAt !== null && o.skeletonGoneAt === null) o.skeletonGoneAt = performance.now() - o.t0;
    if (location.pathname !== o.path0 && !sk && document.querySelector("[data-flip-strip]") && o.landedAt === null) o.landedAt = performance.now() - o.t0;
    if (o.landedAt === null) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function timedFlip(page, name, cdp, profile, trigger) {
  await cdp.send("Network.emulateNetworkConditions", profile);
  await page.evaluate(`(${WATCH.toString()})()`);
  await trigger();
  await page.waitForFunction(() => window.__open?.landedAt !== null, null, { timeout: 90_000 });
  const o = await page.evaluate(() => window.__open);
  await cdp.send("Network.emulateNetworkConditions", FAST);
  return o;
}

async function run(browser, name, { width, height, touch }) {
  const ctx = await browser.newContext({ viewport: { width, height }, hasTouch: touch, isMobile: touch, serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(180_000);
  const cdp = await ctx.newCDPSession(page);
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
    const tiles = page.locator('main a[href^="/decks/"][aria-label]:not([href="/decks/new"]):visible');
    await tiles.first().waitFor({ timeout: 30_000 });
    const hrefs = await tiles.evaluateAll((els) => els.map((e) => e.getAttribute("href")).filter((h) => /^\/decks\/[0-9a-f-]{36}$/.test(h)));
    check(name, "the list has 3+ decks", hrefs.length >= 3, `n=${hrefs.length}`);
    if (hrefs.length < 3) return;
    const strip = () => page.locator(`[data-flip-strip="${name}"]`);
    const next = () => strip().locator("a[aria-label^='Next deck']");
    // Warm every route the timed runs touch (a dev server compiles on first visit).
    for (const h of hrefs.slice(0, 3)) { await page.goto(`${BASE}${h}`, { waitUntil: "domcontentloaded" }); await strip().waitFor({ state: "visible", timeout: 90_000 }); }

    for (const [label, profile] of [["slow 4G", SLOW], ["unthrottled", FAST]]) {
      const times = { skeleton: [], landed: [] };
      let sawFacts = 0, flashes = 0, crowns = 0;
      for (let i = 0; i < RUNS; i++) {
        // FLIP: open a deck from the list (press its tile), then press Next on its strip.
        await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
        await tiles.nth(0).waitFor({ timeout: 30_000 });
        await tiles.nth(0).click();
        await page.waitForURL(/\/decks\/[0-9a-f-]{36}/);
        await strip().waitFor({ state: "visible", timeout: 90_000 });
        await next().waitFor({ state: "visible" });
        const o = await timedFlip(page, name, cdp, profile, () => next().click());
        if (o.skeletonAt !== null) times.skeleton.push(o.skeletonAt);
        times.landed.push(o.landedAt);
        if (o.skeletonHasLink) sawFacts++;
        if (o.crown) crowns++;
        if (o.skeletonAt !== null && o.skeletonGoneAt !== null && o.skeletonGoneAt - o.skeletonAt < 50) flashes++;
      }
      const m = (xs) => (xs.length ? `${Math.round(median(xs))}ms` : "never");
      console.log(`  ..   [${name}] flip, ${label}: skeleton ${m(times.skeleton)} (${times.skeleton.length}/${RUNS} runs drew one), landed ${m(times.landed)}`);
      if (profile === SLOW) {
        check(name, "slow 4G: a flip draws the deck-shaped skeleton (the strip's All decks link and the tab words), not the crown", sawFacts === RUNS && crowns === 0, `shaped ${sawFacts}/${RUNS}, crown ${crowns}/${RUNS}`);
      } else {
        // A prefetched flip lands without a skeleton frame, or with one held long enough to read: never a one-frame flash.
        check(name, "unthrottled: a flip never flashes the skeleton for under 50ms", flashes === 0, `flashes ${flashes}/${RUNS}`);
      }
    }

    // OPEN by address (no facts in hand): the skeleton before the deck, on slow 4G.
    await page.goto("about:blank");
    await cdp.send("Network.emulateNetworkConditions", SLOW);
    await page.addInitScript(`(${WATCH.toString()})()`);
    await page.goto(`${BASE}${hrefs[1]}`, { waitUntil: "commit" });
    await page.waitForFunction(() => window.__open?.skeletonAt !== null || document.querySelector("[data-flip-strip]"), null, { timeout: 90_000 }).catch(() => {});
    const open = await page.evaluate(() => window.__open ?? null);
    await cdp.send("Network.emulateNetworkConditions", FAST);
    check(name, "slow 4G: opening by address draws the deck-shaped skeleton", Boolean(open?.skeletonHasLink) && !open.crown, JSON.stringify({ at: open?.skeletonAt, link: open?.skeletonHasLink, crown: open?.crown }));
    if (process.env.PROBE_SHOTS && open?.skeletonAt !== null) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/open-skeleton-${name}.png` });
  } finally {
    await ctx.close();
  }
}

await clerkSetup();
const browser = await chromium.launch();
try {
  for (const [name, size] of Object.entries(SIZES)) await run(browser, name, size);
} finally {
  await browser.close();
}
console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) FAILED`);
process.exit(failed === 0 ? 0 : 1);
