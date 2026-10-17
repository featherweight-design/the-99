// Opening a deck lands at the top of its page (Hugh, 2026-10-17: once, on Android in production, Deck Details landed at
// the bottom, near the tokens, after a scroll to the bottom of /decks). PARKED as can't-reproduce: every path below landed at
// y=0 in Chromium and WebKit, at full speed and under Slow 4G with a 4x CPU throttle. Kept so the next report can be run
// against at once.
//
// On deployed staging, READ-ONLY: it signs in with a minted Clerk ticket (as `measure:load` does, which writes nothing),
// loads each start page at a phone width, scrolls it to the bottom, presses a deck and samples `scrollY` every 100ms until
// the page settles; then goes Back and opens a different deck from the restored position. It also opens the deck a phone
// prefetches in full (/decks' first tile, Home's first resume deck), which commits with no loading screen: that is the path
// on which Next's own scroll-to-top is the only thing moving the page. Exits 1 if any landing settles anywhere but 0.
//
//   pnpm probe:deck-scroll                     # 390x844, Chromium and WebKit, /decks and Home
//   PROBE_ENGINES=chromium PROBE_STARTS="/decks?folder=<id>" PROBE_SIZE=412x915 pnpm probe:deck-scroll
//   PROBE_SLOW=1 pnpm probe:deck-scroll        # Chromium only: Slow 4G (562.5ms, 180,000 bytes/s) and a 4x CPU throttle
import { chromium, webkit } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { lookupUserId, mintSignInToken } from "./lib/measure-deployed.mjs";
import { onPage } from "./lib/surface.mjs";

const BASE = "https://staging.the-99.dev";
const env = requireEnv(["THE_99_CLERK_SECRET_KEY_STAGING", "THE_99_E2E_AUDIT_USER_EMAIL"]);
const [W, H] = (process.env.PROBE_SIZE ?? "390x844").split("x").map(Number);
const ENGINES = (process.env.PROBE_ENGINES ?? "chromium,webkit").split(",");
const STARTS = (process.env.PROBE_STARTS ?? "/decks,/").split(",");
const SLOW = process.env.PROBE_SLOW === "1";
const DECK = /^\/decks\/[0-9a-f-]{36}$/;
const DECK_LINKS = 'a[href^="/decks/"]';

async function signIn(browser) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const userId = await lookupUserId(env.THE_99_CLERK_SECRET_KEY_STAGING, env.THE_99_E2E_AUDIT_USER_EMAIL);
  const ticket = await mintSignInToken(env.THE_99_CLERK_SECRET_KEY_STAGING, userId);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const got = await page.evaluate(async (t) => {
    const a = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    await window.Clerk.setActive({ session: a.createdSessionId });
    return window.Clerk.user.id;
  }, ticket);
  if (got !== userId) throw new Error("signed in as the wrong account");
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

/** Deck hrefs in page content, in document order, and whether each is visible now. */
async function deckLinks(page) {
  const links = onPage(page, DECK_LINKS);
  const out = [];
  for (let i = 0; i < (await links.count()); i++) {
    const l = links.nth(i);
    const href = await l.getAttribute("href");
    if (!DECK.test(href ?? "")) continue;
    // In the viewport, not merely rendered: Playwright's isVisible() is true for a link scrolled off-screen, and tap()
    // would then scroll it into view first, moving the position the press is made from.
    const box = (await l.isVisible()) ? await l.boundingBox() : null;
    const vh = await page.evaluate(() => window.innerHeight);
    out.push({ href, link: l, visible: box !== null && box.y + box.height > 0 && box.y < vh });
  }
  return out;
}

/** A deck page that has drawn its content: a deck's path, no loading screen, and a page taller than two screens. */
const DECK_READY = () =>
  /^\/decks\/[0-9a-f-]{36}$/.test(location.pathname) &&
  document.querySelector("[data-loading-screen]") === null &&
  document.documentElement.scrollHeight > 2 * window.innerHeight;
/** A list page back with its decks drawn. */
const LIST_READY = () =>
  !/^\/decks\/[0-9a-f-]{36}$/.test(location.pathname) &&
  [...document.querySelectorAll('main a[href^="/decks/"]')].some((a) => /^\/decks\/[0-9a-f-]{36}$/.test(a.getAttribute("href")));

/**
 * Runs `act`, waits for `ready` (or throws), then samples scrollY until the page has held still for 3s, and returns the
 * trace and the landing. A loading screen can already sit at the destination's URL at y=0, so stillness alone proves
 * nothing until the content it is waiting for has arrived.
 */
async function landing(page, act, ready) {
  await page.evaluate(() => {
    // One sampler per run: a run's timer stops once a later run replaces it, so a trace never mixes two clocks.
    const run = (window.__scrollRun = (window.__scrollRun ?? 0) + 1);
    const samples = (window.__scroll = []);
    const t0 = performance.now();
    const tick = () => {
      if (window.__scrollRun !== run) return;
      samples.push([Math.round(performance.now() - t0), Math.round(window.scrollY), location.pathname, document.documentElement.scrollHeight]);
      if (samples.length < 400) setTimeout(tick, 100);
    };
    tick();
  });
  await act();
  await page.waitForFunction(ready, null, { timeout: 90_000 });
  let last = "", still = 0;
  for (let i = 0; i < 400 && still < 30; i++) {
    await page.waitForTimeout(100);
    const now = await page.evaluate(() => `${window.scrollY} ${document.documentElement.scrollHeight} ${location.pathname}`).catch(() => "");
    still = now === last ? still + 1 : 0;
    last = now;
  }
  if (still < 30) throw new Error("the page never held still for 3s");
  const trace = await page.evaluate(() => window.__scroll).catch(() => []);
  const end = await page.evaluate(() => ({ y: Math.round(window.scrollY), h: document.documentElement.scrollHeight, path: location.pathname }));
  return { trace, end };
}

const failures = [];
const browserTypes = { chromium, webkit };
for (const name of ENGINES) {
  if (SLOW && name !== "chromium") continue;
  const browser = await browserTypes[name].launch();
  const state = await signIn(browser);
  for (const start of STARTS) {
    const ctx = await browser.newContext({ storageState: state, viewport: { width: W, height: H }, hasTouch: true, isMobile: name === "chromium" });
    const page = await ctx.newPage();
    if (SLOW) {
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 562.5, downloadThroughput: 180_000, uploadThroughput: 84_375 });
      await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    }
    await page.goto(`${BASE}${start}`, { waitUntil: "load", timeout: 120_000 });
    await page.waitForFunction((sel) => [...document.querySelectorAll(`main ${sel}`)].some((a) => /^\/decks\/[0-9a-f-]{36}$/.test(a.getAttribute("href"))), DECK_LINKS, { timeout: 90_000 });
    // Idle long enough for a phone's in-view full prefetch of the first deck to finish.
    await page.waitForTimeout(8_000);
    const first = (await deckLinks(page))[0].href;
    const cases = [
      ["the deck at the bottom", async () => (await deckLinks(page)).filter((d) => d.visible).at(-1)],
      ["Back, then another deck", null],
      ["the fully prefetched deck", async () => (await deckLinks(page)).find((d) => d.href === first)],
    ];
    let opened = null;
    for (const [label, pick] of cases) {
      if (pick === null) {
        await landing(page, () => page.goBack(), LIST_READY);
      } else {
        await page.goto(`${BASE}${start}`, { waitUntil: "load", timeout: 120_000 }).catch(() => {});
        await page.waitForTimeout(label.includes("prefetched") ? 8_000 : 2_000);
      }
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      await page.waitForTimeout(800);
      const from = await page.evaluate(() => Math.round(window.scrollY));
      const target = pick ? await pick() : (await deckLinks(page)).filter((d) => d.visible && d.href !== opened).at(-1);
      // A case with nothing to press is a failure: a run that skipped a path has not verified it.
      if (!target) { console.log(`FAIL ${name} ${start} · ${label}: no deck to press`); failures.push(`${name} ${start} · ${label} (no deck to press)`); continue; }
      // A link scrolled out of view is pressed by dispatching the click, as a tap on it would arrive.
      const { end, trace } = await landing(page, () => (target.visible ? target.link.tap() : target.link.dispatchEvent("click")), DECK_READY);
      opened = target.href;
      const ok = DECK.test(end.path) && end.y === 0;
      const steps = trace.filter((r, i) => i === 0 || r[1] !== trace[i - 1][1] || r[2] !== trace[i - 1][2]).map((r) => `${r[0]}ms y=${r[1]}`).join(", ");
      console.log(`${ok ? "ok  " : "FAIL"} ${name} ${start} · ${label}: from y=${from}, landed y=${end.y} of ${end.h} on ${end.path} (${steps})`);
      if (!ok) failures.push(`${name} ${start} · ${label}`);
    }
    await ctx.close();
  }
  await browser.close();
}
if (failures.length) {
  console.error(`\n${failures.length} landing(s) not at the top:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("\nevery deck landed at the top");
