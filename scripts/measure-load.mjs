// measure:load — how long each page and a card-details press take, in a real browser at
// 1300x900 and 390x844 (the performance lane, PR 1). Every later performance PR puts this
// script's before/after table in its body.
//
// What it reads, per route (Home, /decks, a deck, /collection, /commanders, /discover):
//   - COLD: a fresh browser context with an empty HTTP cache; WARM: the same route loaded again in
//     that context; SOFT: a client navigation to it from Home, first visit and a revisit.
//   - ttfb (the document's headers), content (the first frame <main> holds content rather than the
//     route's LoadingScreen), streamEnd (the server finished streaming), and the first card image
//     loaded.
//   - EVICTED: the route once more after only the HTTP cache is cleared, as a returning reader whose
//     browser evicted it finds it. A service worker's cache survives that; nothing else does.
//   - the card-details press on the deck page: a cold card, the same card again, and another cold
//     card, each to the dialog and to its art.
// Times come from CDP, never Resource Timing: Scryfall's CDN sends no `Timing-Allow-Origin`.
// Each figure is the MEDIAN of MEASURE_RUNS runs (default 7: at 3, one outlier moved a median by
// over 300ms on deployed staging).
//
// Before the first run, every route is loaded once at every width and the figure thrown away, in
// the startup pass too, which also warms the routes the startup pass navigates to. The
// first request a route gets after an idle spell pays the server's own warm-up (a cold function, an
// empty data cache), and without this pass it landed on whichever width ran first: /discover read as
// a warm-load regression at 1300 that moved to 390 when 390 ran first (2026-10-12).
//
// Two optional readings, each only as good as its source:
//   - MEASURE_SERVER_LOG=<file>: the stdout of the server under test, started with PERF_TIMING=1.
//     The `[perf]` lines `src/lib/perf/timing.ts` writes after each warm load are attached to that
//     route, so a before/after says WHICH read moved.
//   - MEASURE_DB_URL + MEASURE_DB_BRANCH: the database's own execution time per warm load, from
//     `pg_stat_statements` (created if missing, and RESET before each load). Refused unless the
//     URL reports the branch named, and always refused on production and staging: the reset is a
//     write, and the figure means nothing on a database other readers are using.
//
// Two switches for the slow-network lane (plans/2026-09-28-list-payload-shrink.md):
//   - MEASURE_PROFILE=slow: every page runs under Chrome's own Slow 4G (562.5ms latency, 180,000
//     bytes/s down, 84,375 up) plus a 4x CPU throttle, through CDP. That is the profile the
//     navigation-pending brief measured, so its table and this one can be read side by side.
//   - MEASURE_ROUTES=collection,discover: only the routes named (by label), since a slow run of all
//     six at two widths and seven runs takes a long time. The card press needs `deck`.
//   - MEASURE_WIDTHS=390: only the widths named (1300, 390).
//   - MEASURE_LOADS=0: skip each route's cold and warm loads (and with them the card press, which
//     runs on the deck's loaded page) and run only the client navigation pass. The table then
//     prints the soft figures alone. With MEASURE_ROUTES=discover,home that pass goes Home, /discover, Home, so Home's soft
//     first visit is the one a /discover list is still mounted under.
//   - MEASURE_PRESS_AT=<ms>: the startup pass, instead of every other figure. Each route loads
//     cold, and at a FIXED time after the navigation starts (or at hydration, if that is later) a
//     navigation to MEASURE_PRESS_TO (default /decks, or / from /decks) is pushed and timed to its
//     content. A press "N seconds after ready" lands at a different moment on builds that load in
//     different times, so it cannot compare them; a fixed time can. Ready is HYDRATION, read as a
//     React fiber on <main>: `window.next.router` exists before the app router's first render, and
//     a push then throws E668 and never navigates (a push still refused just after hydration is
//     retried until the router takes it). It also prints the kilobytes that LANDED before
//     hydration and during the navigation, by owner (the app's own JS, Clerk's hosted bundles,
//     fonts, CSS, images, the document, RSC fetches), and the six largest downloads with the
//     script or document that asked for each. Hydration is read to the poll's 16ms resolution.
// The table also prints, per route, the card images a cold load ASKED for and the kilobytes that
// landed, because an image is not in any RSC figure and can still be most of what a page costs.
//
// DEPLOYED MODE (MEASURE_DEPLOYED=1, Hugh 2026-10-12: a local server skews the figures). Staging
// only (`lib/measure-deployed.mjs` refuses every other host), and the harness itself writes nothing to
// any database (the pages it loads write what any reader's visit writes, on the measurement account):
//   - sign-in is a Clerk sign-in token minted with THE_99_CLERK_SECRET_KEY_STAGING for the account
//     THE_99_E2E_AUDIT_USER_EMAIL names, redeemed on the app's origin; testing tokens exist only on a
//     development instance;
//   - the deck is MEASURE_DECK_ID (no database lookup); About is settled by one signed-in document
//     load, on which the proxy sets its own sheet cookie;
//   - the `[perf]` spans come from Vercel's runtime logs of MEASURE_VERCEL_PROJECT (default
//     the-99-staging, which needs PERF_TIMING=1 set), read after each run and matched to the measured
//     request by its `x-vercel-id`, never by time;
//   - MEASURE_PGSTAT_URL (staging only) gives database time as the delta between two
//     `pg_stat_statements` snapshots around each warm load, never a reset. Other readers'
//     statements in that window count too, so it is an upper bound.
// MEASURE_SERVER_LOG and MEASURE_DB_URL are refused in this mode.
//
//   MEASURE_DEPLOYED=1 MEASURE_BASE=https://staging.the-99.dev \
//     MEASURE_DECK_ID=<uuid> MEASURE_PGSTAT_URL=<staging, read-only> pnpm measure:load
//
// Where to point it locally: a `next start` (never `next dev`, whose compile times swamp everything) on a
// scratch Neon branch holding a `pull:staging` copy, signed in as E2E_AUDIT_USER_EMAIL. The
// worktree's `.env` DATABASE_URL must name THAT server's database: `env.mjs` loads `.env` over the
// shell, so a DATABASE_URL given on the command line is discarded, and the About write and the deck
// lookup below would land on whatever `.env` names instead. It writes
// the account's About row (every entry marked seen) so no sheet covers a page, and nothing else;
// that write is refused on production and staging too.
//
//   PERF_TIMING=1 pnpm start -p 3060 > /tmp/server.log &
//   MEASURE_BASE=http://localhost:3060 MEASURE_DECK="HD - Avatar Aang" \
//     MEASURE_SERVER_LOG=/tmp/server.log MEASURE_DB_URL=<scratch> MEASURE_DB_BRANCH=br-… \
//     pnpm measure:load

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { execFileSync } from "node:child_process";
import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { markEveryEntrySeen, sheetCookie } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";
import {
  assertDeployedBase,
  lookupUserId,
  mintSignInToken,
  perfLinesFromVercel,
  spansForRequest,
  statDelta,
  vercelRequestId,
} from "./lib/measure-deployed.mjs";

// MEASURE_DEPLOYED=1 measures a deployed app (staging only); the harness itself writes to no database:
// see `lib/measure-deployed.mjs`. Local mode keeps every rule below exactly as it was.
const DEPLOYED = process.env.MEASURE_DEPLOYED === "1";
const BASE = process.env.MEASURE_BASE;
if (!BASE) throw new Error("Set MEASURE_BASE to the server under test, e.g. http://localhost:3060.");
if (DEPLOYED) assertDeployedBase(BASE);
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = DEPLOYED
  ? {}
  : requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const DEPLOYED_ENV = DEPLOYED
  ? requireEnv(["THE_99_CLERK_SECRET_KEY_STAGING", "THE_99_E2E_AUDIT_USER_EMAIL", "MEASURE_DECK_ID"])
  : null;
// Where the deployed function's `[perf]` lines are read back from (PERF_TIMING=1 on that project).
const VERCEL_PROJECT = process.env.MEASURE_VERCEL_PROJECT ?? "the-99-staging";
// Read-only `pg_stat_statements` deltas on staging, taken around each warm load. No reset.
const PGSTAT_URL = process.env.MEASURE_PGSTAT_URL ?? null;
const RUNS = Math.max(1, Number(process.env.MEASURE_RUNS ?? 7));
const OUT = process.env.MEASURE_OUT ?? path.join(os.tmpdir(), `measure-load-${Date.now()}.json`);
const SERVER_LOG = process.env.MEASURE_SERVER_LOG ?? null;
const DB_URL = process.env.MEASURE_DB_URL ?? null;
const DB_BRANCH = process.env.MEASURE_DB_BRANCH ?? null;
if (DEPLOYED && (SERVER_LOG || DB_URL)) {
  throw new Error("MEASURE_DEPLOYED reads Vercel's logs and MEASURE_PGSTAT_URL; MEASURE_SERVER_LOG and MEASURE_DB_URL are local-only.");
}
if (PGSTAT_URL && !DEPLOYED) throw new Error("MEASURE_PGSTAT_URL is deployed-only; a local run takes MEASURE_DB_URL.");

const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
const WIDTHS = [
  { label: "1300", viewport: { width: 1300, height: 900 } },
  { label: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const IMAGE_HOSTS = /(^|\.)scryfall\.io\//;
const PROFILE = process.env.MEASURE_PROFILE ?? "fast";
const LOAD_CAP_MS = 90_000;
if (PROFILE !== "fast" && PROFILE !== "slow") throw new Error(`MEASURE_PROFILE is fast or slow, not ${PROFILE}.`);
const ONLY_WIDTHS = process.env.MEASURE_WIDTHS ? new Set(process.env.MEASURE_WIDTHS.split(",").map((w) => w.trim())) : null;
const MEASURED_WIDTHS = ONLY_WIDTHS ? WIDTHS.filter((w) => ONLY_WIDTHS.has(w.label)) : WIDTHS;
if (ONLY_WIDTHS && MEASURED_WIDTHS.length !== ONLY_WIDTHS.size) throw new Error(`MEASURE_WIDTHS takes ${WIDTHS.map((w) => w.label).join(", ")}.`);
const LOADS_ENV = process.env.MEASURE_LOADS ?? "1";
if (LOADS_ENV !== "0" && LOADS_ENV !== "1") throw new Error(`MEASURE_LOADS is 0 or 1, not ${LOADS_ENV}.`);
const LOADS = LOADS_ENV === "1";
const PRESS_AT = process.env.MEASURE_PRESS_AT == null ? null : Number(process.env.MEASURE_PRESS_AT);
if (PRESS_AT != null && !(PRESS_AT >= 0)) throw new Error(`MEASURE_PRESS_AT is a number of milliseconds, not ${process.env.MEASURE_PRESS_AT}.`);
const PRESS_TO = process.env.MEASURE_PRESS_TO ?? "/decks";
const ONLY = process.env.MEASURE_ROUTES ? new Set(process.env.MEASURE_ROUTES.split(",").map((r) => r.trim())) : null;

/** Chrome DevTools' own Slow 4G preset, and the 4x CPU throttle the brief paired it with. */
async function throttle(cdp) {
  if (PROFILE !== "slow") return;
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 562.5,
    downloadThroughput: 180_000,
    uploadThroughput: 84_375,
  });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}

/** Refuses a database other readers use: the branch it reports, never its URL. */
async function refuseShared(url, expected) {
  const [{ branch }] = await neon(url)`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === PRODUCTION || branch === STAGING || process.env.VERCEL_ENV === "production") {
    throw new Error(`measure:load writes and refuses branch ${branch ?? "(unknown)"}; point it at a scratch branch.`);
  }
  if (expected && branch !== expected) throw new Error(`Expected branch ${expected}, the database reports ${branch}.`);
  return branch;
}

// Stamps the first frame where <main> holds content and not the route's LoadingScreen.
const CONTENT_PROBE = () => {
  const tick = () => {
    const main = document.querySelector("main");
    const loading = main?.querySelector('[role="status"][class*="min-h-[420px]"]');
    if (main && !loading && main.innerText.trim().length > 40) { window.__contentAt = performance.now(); return; }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

/** Deployed sign-in: a Backend-API sign-in token, redeemed on the app's own origin. Writes nothing. */
async function signInDeployed(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const secret = DEPLOYED_ENV.THE_99_CLERK_SECRET_KEY_STAGING;
  const expected = await lookupUserId(secret, DEPLOYED_ENV.THE_99_E2E_AUDIT_USER_EMAIL);
  const ticket = await mintSignInToken(secret, expected);
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const userId = await page.evaluate(async (t) => {
    const a = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: t });
    if (a.status !== "complete") throw new Error(`sign-in status ${a.status}`);
    await window.Clerk.setActive({ session: a.createdSessionId });
    return window.Clerk.user.id;
  }, ticket);
  if (userId !== expected) throw new Error(`Signed in as ${userId}, not the measurement account.`);
  // One full document load, signed in, so the proxy decides the About sheet and sets its own
  // cookie (keyed to the switched entries this deployment draws). Every measured context carries
  // it through `storageState`. Never `markEveryEntrySeen`: that is a database write.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const state = await context.storageState();
  await context.close();
  return { userId, state };
}

async function signIn(browser) {
  if (DEPLOYED) return signInDeployed(browser);
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
  // The session carries over; the Clerk testing route does NOT, which matters: Playwright turns the
  // HTTP cache off for a context with a route, so a "warm" load there would refetch every script.
  const state = await context.storageState();
  await context.close();
  return { userId, state };
}

/** CDP network capture on one page. */
async function capture(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await throttle(cdp);
  const reqs = new Map();
  cdp.on("Network.requestWillBeSent", (e) => {
    if (!reqs.has(e.requestId)) reqs.set(e.requestId, { url: e.request.url, type: e.type, method: e.request.method, start: e.timestamp });
  });
  cdp.on("Network.responseReceived", (e) => {
    const r = reqs.get(e.requestId);
    if (r) {
      r.headersAt = e.timestamp;
      r.cached = Boolean(e.response.fromDiskCache || e.response.fromMemoryCache);
      // The id Vercel logs this request under, so a deployed run can read back ITS `[perf]` line.
      const h = e.response.headers ?? {};
      r.vercelId = vercelRequestId(h["x-vercel-id"] ?? h["X-Vercel-Id"]);
    }
  });
  cdp.on("Network.dataReceived", (e) => { const r = reqs.get(e.requestId); if (r) r.decoded = (r.decoded ?? 0) + e.dataLength; });
  cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.transferred = e.encodedDataLength; } });
  return { cdp, reset: () => reqs.clear(), all: () => [...reqs.values()] };
}

const ms = (t, t0) => (t == null || t0 == null ? null : Math.round((t - t0) * 1000));

function network(reqs, t0) {
  const doc = reqs.find((r) => r.type === "Document");
  const asked = reqs.filter((r) => IMAGE_HOSTS.test(r.url));
  const images = asked.filter((r) => r.end != null);
  const scripts = reqs.filter((r) => r.type === "Script");
  const kb = (n) => Math.round(n / 1024);
  return {
    ttfb: doc ? ms(doc.headersAt, t0) : null,
    streamEnd: doc ? ms(doc.end, t0) : null,
    firstImage: images.length ? Math.min(...images.map((r) => ms(r.end, t0))) : null,
    imagesAsked: asked.length,
    imageKb: Math.round(images.reduce((n, r) => n + (r.transferred ?? 0), 0) / 1024),
    docKb: doc ? kb(doc.transferred ?? 0) : null,
    jsKb: kb(scripts.reduce((n, r) => n + (r.transferred ?? 0), 0)),
    docId: doc?.vercelId ?? null,
    actionId: reqs.find((r) => r.url.startsWith(BASE) && r.method === "POST")?.vercelId ?? null,
    prefetchId: reqs.find((r) => r.url.startsWith(BASE) && new URL(r.url).pathname === "/api/card-detail")?.vercelId ?? null,
    // The card-detail reads, kept apart: the press's own read is a server action (a POST to the
    // page), and a prefetch is `GET /api/card-detail`. A press can make either or both, so one
    // column for "the read" would time whichever happened to start first.
    actionMs: (() => {
      const a = reqs.find((r) => r.url.startsWith(BASE) && r.method === "POST");
      return a ? ms(a.headersAt, a.start) : null;
    })(),
    prefetchMs: (() => {
      const a = reqs.find((r) => r.url.startsWith(BASE) && new URL(r.url).pathname === "/api/card-detail");
      return a ? ms(a.headersAt, a.start) : null;
    })(),
  };
}

/**
 * The `[perf]` line for `pattern` the server logged since `from` (a byte offset into its log), or
 * null. Filtered by the route PATTERN because a page's `<Link>` prefetches and a card press's own
 * reads can log in the same window, and another route's spans are not this load's breakdown. The
 * first match is the measured request's: it was asked for first and the window closes with it.
 */
function serverSpans(from, pattern) {
  if (!SERVER_LOG) return null;
  // `from` is a byte offset, so the slice is taken on the bytes before decoding: a string
  // slice counts UTF-16 units and lands mid-line after any non-ASCII output.
  const text = readFileSync(SERVER_LOG).subarray(from).toString("utf8");
  const line = text.split("\n").find((l) => l.startsWith(`[perf] ${pattern} `));
  return line ? line.slice(7) : null;
}
const logSize = () => (SERVER_LOG ? statSync(SERVER_LOG).size : 0);

/** Where a local load's spans start: a byte offset into the server log. */
const mark = () => logSize();

/**
 * A load's spans. Locally, `ref` is a byte offset into the server log and the line is read now.
 * Deployed, `ref` is the request id Vercel logged the request under (`x-vercel-id`), and the line
 * is read once the run ends, when Vercel's logs have caught up (`resolveDeployedSpans`).
 */
const spansFor = (ref, pattern) =>
  DEPLOYED ? { deferred: { id: ref, pattern } } : serverSpans(ref, pattern);

/**
 * Replaces every deferred span in `node` with the `[perf]` line its own request logged. One
 * `vercel logs --request-id` call per request: a time-range fetch is truncated (it returned 50
 * entries for a run of several minutes whatever `-n` asked, and 24 with a `perf` filter), so
 * fetching by range silently drops most of a run's lines.
 */
async function resolveDeployedSpans(node, since) {
  if (!DEPLOYED) return;
  const deferred = [];
  const collect = (n) => {
    if (!n || typeof n !== "object") return;
    for (const [k, v] of Object.entries(n)) {
      if (v && typeof v === "object" && v.deferred) deferred.push({ parent: n, key: k, ...v.deferred });
      else collect(v);
    }
  };
  collect(node);
  // Runtime logs reach the API some seconds after the request; 20s is generous.
  await new Promise((r) => setTimeout(r, 20_000));
  const byId = new Map();
  let failed = 0;
  for (const id of new Set(deferred.map((d) => d.id).filter(Boolean))) {
    try {
      const out = execFileSync(
        "vercel",
        ["logs", "-p", VERCEL_PROJECT, "--environment", "production", "--no-branch",
          "--since", new Date(since - 60_000).toISOString(), "--request-id", id, "-j"],
        { encoding: "utf8", maxBuffer: 16 * 1024 * 1024, cwd: os.tmpdir(), stdio: ["ignore", "pipe", "ignore"] },
      );
      for (const [k, lines] of perfLinesFromVercel(out)) byId.set(k, lines);
    } catch {
      failed += 1;
    }
  }
  if (failed) console.warn(`vercel logs failed for ${failed} request(s); their spans are null`);
  for (const d of deferred) d.parent[d.key] = spansForRequest(byId, d.id, d.pattern);
}

/**
 * Who a startup request belongs to, for the startup pass's breakdown. `clerk` is what Clerk serves
 * from its own host (clerk-js, its UI bundles, its API calls); the @clerk/nextjs code compiled into
 * the app's chunks is `app js`, since a chunk cannot be split by module without source maps.
 */
function ownerOf(url, type) {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return "other";
  }
  if (/clerk/i.test(host)) return "clerk";
  if (type === "Font" || /\.woff2?(\?|$)/.test(url)) return "fonts";
  if (IMAGE_HOSTS.test(url) || type === "Image") return "images";
  if (type === "Stylesheet") return "css";
  if (type === "Document") return "document";
  if (url.includes("_rsc=")) return "rsc";
  if (url.startsWith(BASE) && type === "Script") return "app js";
  return type === "Script" ? "other js" : "other";
}

/**
 * The startup pass for one route (MEASURE_PRESS_AT): cold load, hydration, a push at the fixed
 * time, the arrival, and what the page was downloading. Times are page time (ms from the
 * navigation's start): CDP's monotonic timestamps map onto it through a request's `wallTime` and
 * the page's `performance.timeOrigin`.
 *
 * Bytes are counted by WHEN they arrived, not by when their request started. Each request's wire
 * size (loadingFinished's encodedDataLength) is spread over its decoded `dataReceived` chunks in
 * proportion, since a chunk's own encodedDataLength is often reported as 0; a request that never
 * finished is counted at its decoded size. So "before hydration" is the bytes that had landed by
 * hydration, and "during the navigation" is the bytes that landed between the press and the
 * arrival: what the navigation's own fetch competed with.
 */
async function pressRun(browser, state, width, route) {
  const context = await browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, storageState: state });
  try {
    await context.addInitScript(CONTENT_PROBE);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.clearBrowserCache");
    await throttle(cdp);
    const reqs = new Map();
    let wallOffset = null;
    cdp.on("Network.requestWillBeSent", (e) => {
      if (wallOffset == null && e.wallTime) wallOffset = e.wallTime - e.timestamp;
      const known = reqs.get(e.requestId);
      // A redirect hop reuses the request id and reports the completed hop on the NEXT
      // requestWillBeSent, with no loadingFinished of its own. It is kept as its own record, closed
      // here with its response's size, and the id starts over for the hop that follows.
      if (known && e.redirectResponse) {
        reqs.set(`${e.requestId}#${known.start}`, { ...known, end: e.timestamp, wire: e.redirectResponse.encodedDataLength ?? 0 });
        reqs.set(e.requestId, { url: e.request.url, type: e.type, start: e.timestamp, by: known.by, chunks: [] });
        return;
      }
      if (known) return;
      const by = e.initiator?.url ?? e.initiator?.stack?.callFrames?.[0]?.url ?? e.initiator?.type ?? null;
      reqs.set(e.requestId, { url: e.request.url, type: e.type, start: e.timestamp, by, chunks: [] });
    });
    cdp.on("Network.dataReceived", (e) => reqs.get(e.requestId)?.chunks.push([e.timestamp, e.dataLength]));
    cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.wire = e.encodedDataLength; } });
    cdp.on("Network.loadingFailed", (e) => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.failed = true; } });

    const target = route.path === PRESS_TO ? (PRESS_TO === "/" ? "/decks" : "/") : PRESS_TO;
    await page.goto(`${BASE}${route.path}`, { waitUntil: "commit", timeout: 120_000 });
    const hydrated = await page
      .waitForFunction(() => {
        const main = document.querySelector("main");
        return main && Object.keys(main).some((k) => k.startsWith("__reactFiber$")) ? performance.now() : null;
      }, null, { timeout: 120_000, polling: 16 })
      .then((h) => h.jsonValue(), () => null);
    const timeOrigin = await page.evaluate(() => performance.timeOrigin);
    const pageMs = (t) => (t == null || wallOffset == null ? null : (t + wallOffset) * 1000 - timeOrigin);

    let pressedAt = null;
    let arrived = null;
    if (hydrated != null) {
      const at = Math.max(PRESS_AT, hydrated);
      const now = await page.evaluate(() => performance.now());
      if (at > now) await page.waitForTimeout(at - now);
      // The fiber is written during hydration's render, before the commit that initializes the
      // router's action queue, so a push that lands in between throws E668 and navigates nowhere.
      // It is retried until the router takes it, and the press is timed from the push that took.
      pressedAt = await page.evaluate(async (u) => {
        for (let i = 0; i < 600; i += 1) {
          const t = performance.now();
          try {
            window.next.router.push(u);
            return t;
          } catch {
            await new Promise((r) => setTimeout(r, 16));
          }
        }
        return null;
      }, target);
      if (pressedAt != null) {
        arrived = await page
          .waitForFunction((to) => {
            // The whole destination, query included: a target that differs from the page only in
            // its query would otherwise read as arrived before its own state rendered.
            const want = new URL(to, location.origin);
            const here = new URLSearchParams(location.search);
            const sameQuery = [...want.searchParams].every(([k, v]) => here.getAll(k).includes(v));
            const main = document.querySelector("main");
            return location.pathname === want.pathname && sameQuery && main && !main.querySelector('[role="status"][class*="min-h-[420px]"]') && main.innerText.trim().length > 40
              ? performance.now()
              : null;
          }, target, { timeout: 120_000, polling: 16 })
          .then((h) => h.jsonValue(), () => null);
      }
    }

    // Wire bytes a request had received by page time `t` (and after `from`, when given).
    const wireBetween = (r, from, to) => {
      // A response with no body chunks (a redirect hop, a 304) lands whole when it finishes.
      if (!r.chunks.length) {
        const at = pageMs(r.end);
        return r.wire && at != null && at > from && at <= to ? r.wire : 0;
      }
      const decoded = r.chunks.reduce((n, [, len]) => n + len, 0);
      const scale = r.wire && decoded ? r.wire / decoded : 1;
      return r.chunks.reduce((n, [ts, len]) => {
        const at = pageMs(ts);
        return at != null && at > from && at <= to ? n + len * scale : n;
      }, 0);
    };
    const all = [...reqs.values()].map((r) => ({ ...r, owner: ownerOf(r.url, r.type) }));
    const byOwner = (from, to) => {
      const out = {};
      for (const r of all) {
        const kb = wireBetween(r, from, to) / 1024;
        if (kb > 0) out[r.owner] = (out[r.owner] ?? 0) + kb;
      }
      return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, Math.round(v)]));
    };
    return {
      hydrated: hydrated == null ? null : Math.round(hydrated),
      pressedAt: pressedAt == null ? null : Math.round(pressedAt),
      arrival: arrived == null || pressedAt == null ? null : Math.round(arrived - pressedAt),
      beforeHydrationKb: hydrated == null ? null : byOwner(-Infinity, hydrated),
      duringNavigationKb: arrived == null ? null : byOwner(pressedAt, arrived),
      largest: hydrated == null
        ? []
        : all
            .map((r) => ({ kb: Math.round(wireBetween(r, -Infinity, hydrated) / 1024), owner: r.owner, url: r.url.replace(BASE, ""), by: r.by?.replace(BASE, "") ?? null, failed: r.failed ?? false }))
            .filter((r) => r.kb > 0)
            .sort((x, y) => y.kb - x.kb)
            .slice(0, 12),
    };
  } finally {
    await context.close();
  }
}

function pressTable(runs, routes) {
  const lines = [];
  for (const width of MEASURED_WIDTHS) {
    const per = runs.map((r) => r[width.label]);
    lines.push(`\n**${width.label}**, press at ${PRESS_AT}ms or hydration, whichever is later\n`);
    lines.push("| Route | Runs | Hydrated | Pressed | Arrival after press | KB landed before hydration, by owner | KB landed during the navigation, by owner |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const route of routes) {
      // Every figure in a row is a median over the SAME runs: those that hydrated and arrived.
      const ok = per.map((p) => p[route.label]).filter((r) => r?.hydrated != null && r?.arrival != null);
      const m = (f) => median(ok.map(f));
      const owners = [...new Set(ok.flatMap((r) => Object.keys({ ...r.beforeHydrationKb, ...r.duringNavigationKb })))].sort();
      const kb = (key) => owners.map((o) => [o, m((r) => r[key][o] ?? 0)]).filter(([, v]) => v).map(([o, v]) => `${o} ${v}`).join(" · ") || "none";
      lines.push(`| ${route.label} | ${ok.length} of ${per.length} | ${m((r) => r.hydrated)} | ${m((r) => r.pressedAt)} | ${m((r) => r.arrival)} | ${ok.length ? kb("beforeHydrationKb") : "—"} | ${ok.length ? kb("duringNavigationKb") : "—"} |`);
    }
    // Who asked for the biggest downloads: the first run that hydrated, since a median of URLs means
    // nothing. The raw JSON holds every run's list.
    for (const route of routes) {
      const first = per.map((p) => p[route.label]).find((r) => r?.largest?.length);
      if (!first) continue;
      lines.push(`\n${route.label}, largest before hydration (first run): ${first.largest.slice(0, 6).map((r) => `${r.kb}KB ${r.owner} ${r.url.slice(0, 60)} ← ${(r.by ?? "?").slice(0, 50)}`).join(" | ")}`);
    }
  }
  return lines.join("\n");
}

async function load(page, cap, url) {
  cap.reset();
  let t0 = null;
  const first = (e) => { if (t0 == null) t0 = e.timestamp; };
  cap.cdp.on("Network.requestWillBeSent", first);
  // The LOAD EVENT waits on every image the document asked for. On the slow profile a page that
  // asks for 200 card images never reaches it inside any sane timeout, which is the finding rather
  // than a harness failure: the load is recorded as null past LOAD_CAP_MS and the run goes on.
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
  const loaded = await page.waitForLoadState("load", { timeout: LOAD_CAP_MS }).then(() => true, () => false);
  await page.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
  cap.cdp.off("Network.requestWillBeSent", first);
  const content = await page.evaluate(() => (window.__contentAt == null ? null : Math.round(window.__contentAt)));
  const loadEvent = loaded
    ? await page.evaluate(() => Math.round(performance.getEntriesByType("navigation")[0]?.loadEventStart ?? 0) || null)
    : null;
  return { content, loadEvent, ...network(cap.all(), t0) };
}

async function dbExec(sql, run) {
  await sql`select pg_stat_statements_reset()`;
  await run();
  const rows = await sql`select calls, total_exec_time as ms, left(regexp_replace(query, '\\s+', ' ', 'g'), 90) as q
    from pg_stat_statements where query not ilike '%pg_stat_statements%'
      and dbid = (select oid from pg_database where datname = current_database())
    order by total_exec_time desc`;
  return {
    ms: Math.round(rows.reduce((n, r) => n + Number(r.ms), 0)),
    calls: rows.reduce((n, r) => n + Number(r.calls), 0),
    top: rows.slice(0, 5).map((r) => `${Math.round(Number(r.ms))}ms ×${r.calls} ${r.q}`),
  };
}

/**
 * Deployed: database execution time over one warm load as the difference between two
 * `pg_stat_statements` snapshots, never a reset. Other readers' statements in the same window are
 * counted too, so this is an upper bound; staging carries little traffic.
 */
async function dbDelta(sql, run) {
  const snap = async () =>
    (await sql`select coalesce(sum(total_exec_time), 0) as ms, coalesce(sum(calls), 0) as calls
      from pg_stat_statements where query not ilike '%pg_stat_statements%'
        and dbid = (select oid from pg_database where datname = current_database())`)[0];
  const before = await snap();
  await run();
  return { ...statDelta(before, await snap()), top: [] };
}

/** Both card-detail reads' `[perf]` lines: the press's action and a prefetch's route, apart. */
const cardSpans = (from, net) => ({
  action: spansFor(DEPLOYED ? net.actionId : from, "getCardDetail"),
  prefetch: spansFor(DEPLOYED ? net.prefetchId : from, "/api/card-detail"),
});

async function cardPress(page, cap, width) {
  const triggers = onPage(page, '[aria-label^="View details for "]').filter({ visible: true });
  await triggers.first().waitFor({ state: "visible", timeout: 30_000 });
  const dialog = page.locator('[role="dialog"][aria-labelledby="card-modal-title"]');
  const out = {};
  // `intent` rests on the card first (a pointer on desktop, focus at 390: a keyboard reader, since a
  // tap never focuses first) and then presses,
  // which is where a prefetch-on-intent build answers from what it already read.
  for (const [key, index] of [["cold", 0], ["warm", 0], ["coldOther", 3], ["intent", 5]]) {
    cap.reset();
    const from = mark();
    if (key === "intent") {
      // Keyboard focus at 390: the provider prefetches on :focus-visible, which Chrome grants to
      // programmatic focus only after a key. Shift sets that and types nothing.
      if (width.isMobile) { await page.keyboard.press("Shift"); await triggers.nth(index).focus(); }
      else await triggers.nth(index).hover();
      await page.waitForTimeout(400);
    }
    const pressed = Date.now();
    await triggers.nth(index).click();
    await dialog.waitFor({ state: "visible", timeout: 30_000 });
    const dialogMs = Date.now() - pressed;
    const art = await page.waitForFunction(() => {
      const d = document.querySelector('[role="dialog"][aria-labelledby="card-modal-title"]');
      return Boolean(d && [...d.querySelectorAll("*")].some((el) => /scryfall/.test(getComputedStyle(el).backgroundImage)));
    }, null, { timeout: 30_000, polling: 16 }).then(() => Date.now() - pressed, () => null);
    await page.waitForTimeout(400);
    // The read logs its spans in `after()`, once it has answered; the 400ms above covers that.
    const net = network(cap.all(), 0);
    out[key] = { dialog: dialogMs, art, action: net.actionMs, prefetch: net.prefetchMs, spans: cardSpans(from, net) };
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }
  return out;
}

/**
 * The deck page's Analysis tab, pressed three ways on a fresh load each: `early` straight after the load
 * event (a build that loads the Tuning tools on demand may still be fetching them), `idle` after the
 * page has sat for IDLE_WAIT_MS (they are warmed by then), and `intent` after a pointer rested on the tab
 * (focus at 390) for 400ms. Each reads press to the tab's panel no longer busy, which is when it has
 * drawn its landing; the unchanged server reads are in every figure, so only the difference between
 * builds means anything.
 */
const IDLE_WAIT_MS = 8000;
async function tabPress(page, cap, width, url) {
  const out = {};
  for (const key of ["early", "idle", "intent"]) {
    cap.reset();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForLoadState("load", { timeout: LOAD_CAP_MS }).catch(() => {});
    const tab = page.locator("#tab-analysis");
    await tab.waitFor({ state: "visible", timeout: 30_000 });
    if (key === "idle") await page.waitForTimeout(IDLE_WAIT_MS);
    if (key === "intent") {
      if (width.isMobile) { await page.keyboard.press("Shift"); await tab.focus(); }
      else await tab.hover();
      await page.waitForTimeout(400);
    }
    const pressed = Date.now();
    await tab.click();
    const drawn = await page
      .waitForFunction(() => {
        const panel = document.getElementById("panel-analysis");
        return Boolean(panel && !panel.hasAttribute("aria-busy") && panel.innerText.trim().length > 40);
      }, null, { timeout: 60_000, polling: 16 })
      .then(() => Date.now() - pressed, () => null);
    out[key] = drawn;
  }
  return out;
}

async function one(browser, state, width, routes, sql) {
  const result = { routes: {}, soft: {}, card: null, tab: null };
  const ctx = () => browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, storageState: state });
  for (const route of LOADS ? routes : []) {
    const context = await ctx();
    await context.addInitScript(CONTENT_PROBE);
    const page = await context.newPage();
    const cap = await capture(page);
    await cap.cdp.send("Network.clearBrowserCache");
    // The cold load's spans too: worth having, and locally its own log offset keeps the warm
    // read from taking the cold request's line.
    const coldFrom = mark();
    const cold = await load(page, cap, `${BASE}${route.path}`);
    const coldSpans = route.pattern ? spansFor(DEPLOYED ? cold.docId : coldFrom, route.pattern) : null;
    // A service worker registers after the cold load's `load` event and claims the page when it
    // activates. The warm load is what fills its cache, so it waits (up to 5s) for the worker to
    // control the page; a build with no worker waits the 5s and measures exactly as before.
    await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return;
      for (let i = 0; i < 50 && !navigator.serviceWorker.controller; i += 1) await new Promise((r) => setTimeout(r, 100));
    });
    const from = mark();
    const warm = await load(page, cap, `${BASE}${route.path}`);
    const spans = route.pattern ? spansFor(DEPLOYED ? warm.docId : from, route.pattern) : null;
    const db = sql
      ? await (DEPLOYED ? dbDelta : dbExec)(sql, () => load(page, cap, `${BASE}${route.path}`))
      : null;
    // A RETURNING reader whose browser has evicted its HTTP cache since: the context keeps what a
    // service worker stored, and only the HTTP cache is cleared. Without a worker this is a cold
    // load with the session and the page's own state already in place.
    await cap.cdp.send("Network.clearBrowserCache");
    const evicted = await load(page, cap, `${BASE}${route.path}`);
    result.routes[route.label] = { cold, warm, evicted, coldSpans, spans, db };
    if (route.label === "deck") result.card = await cardPress(page, cap, width);
    if (route.label === "deck") result.tab = await tabPress(page, cap, width, `${BASE}${route.path}`);
    await context.close();
  }
  // Client navigation from Home, a first visit and then a revisit.
  const context = await ctx();
  const page = await context.newPage();
  await throttle(await context.newCDPSession(page));
  // DOM content, not the load event, with a long timeout: under the slow profile Home's own art
  // can hold its load event past Playwright's 30s default, which would abort the whole run.
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.waitForLoadState("load", { timeout: LOAD_CAP_MS }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  for (const pass of ["first", "revisit"]) {
    // Home last, and only when it is being measured (MEASURE_ROUTES can leave it out).
    for (const route of [...routes.filter((r) => r.path !== "/"), routes.find((r) => r.path === "/")].filter(Boolean)) {
      const pressed = Date.now();
      await page.evaluate((u) => window.next.router.push(u), route.path);
      await page.waitForURL((u) => u.pathname === route.path.split("?")[0], { timeout: 60_000 });
      // A route that never leaves its loading screen records null, never the 60s it waited.
      const drew = await page.waitForFunction(() => {
        const main = document.querySelector("main");
        return main && !main.querySelector('[role="status"][class*="min-h-[420px]"]') && main.innerText.trim().length > 40;
      }, null, { timeout: 60_000, polling: 16 }).then(() => true, () => false);
      (result.soft[route.label] ??= {})[pass] = drew ? Date.now() - pressed : null;
      if (!drew) console.warn(`soft ${pass} ${route.path}: no content frame within 60s`);
      await page.waitForLoadState("networkidle").catch(() => {});
    }
  }
  await context.close();
  // THE TILE PASS: a deck opened the way a reader opens it, from its tile, with the intent a reader
  // gives first (a pointer resting on it at 1300, a tap at 390, whose touchstart precedes its click
  // by nothing). `router.push` above starts no prefetch, so only this pass sees one that starts on
  // intent. From `/decks` always, and from Home when the deck is one of its resume rows.
  const deckRoute = routes.find((r) => r.label === "deck");
  if (deckRoute) {
    result.tile = {};
    for (const from of ["/decks", "/"]) {
      const context = await ctx();
      const page = await context.newPage();
      await throttle(await context.newCDPSession(page));
      await page.goto(`${BASE}${from}`, { waitUntil: "domcontentloaded", timeout: 120_000 });
      await page.waitForLoadState("networkidle", { timeout: 60_000 }).catch(() => {});
      const tile = onPage(page, `a[href="${deckRoute.path}"]`).filter({ visible: true }).first();
      if ((await tile.count()) === 0) {
        result.tile[from] = null;
        await context.close();
        continue;
      }
      // Timed from the click or the tap, which is when a reader starts waiting; the 300ms a pointer
      // rests first is the head start a prefetch on intent gets.
      let pressed;
      if (width.isMobile) {
        // Scrolled first, as the hover branch is: a tap scrolls an off-screen tile into view itself,
        // and that is not the navigation being timed.
        await tile.scrollIntoViewIfNeeded();
        pressed = Date.now();
        await tile.tap();
      } else {
        await tile.hover();
        await page.waitForTimeout(300);
        pressed = Date.now();
        await tile.click();
      }
      await page.waitForURL((u) => u.pathname === deckRoute.path, { timeout: 60_000 });
      const drew = await page.waitForFunction(() => {
        const main = document.querySelector("main");
        return main && !main.querySelector('[role="status"][class*="min-h-[420px]"]') && main.innerText.trim().length > 40;
      }, null, { timeout: 60_000, polling: 16 }).then(() => true, () => false);
      result.tile[from] = drew ? Date.now() - pressed : null;
      await context.close();
    }
  }
  return result;
}

const median = (xs) => {
  const v = xs.filter((x) => x != null).sort((a, b) => a - b);
  return v.length ? v[Math.floor((v.length - 1) / 2)] : null;
};

function table(runs, routes) {
  const lines = [];
  for (const width of MEASURED_WIDTHS) {
    const per = runs.map((r) => r[width.label]);
    const m = (f) => median(per.map(f));
    lines.push(`\n**${width.label}** (median of ${runs.length})\n`);
    if (!LOADS) {
      // MEASURE_LOADS=0 ran no page loads and no card press, so only the soft figures exist.
      lines.push("| Route | Soft first / revisit |");
      lines.push("|---|---|");
      for (const route of routes) lines.push(`| ${route.label} | ${m((p) => p.soft[route.label]?.first)} / ${m((p) => p.soft[route.label]?.revisit)} |`);
      continue;
    }
    lines.push("| Route | TTFB cold / warm | Content cold / warm | Stream end warm | First image cold / warm | Soft first / revisit | DB exec warm |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const route of routes) {
      const r = (k) => (p) => p.routes[route.label]?.[k];
      const db = m((p) => p.routes[route.label]?.db?.ms);
      lines.push(`| ${route.label} | ${m((p) => r("cold")(p)?.ttfb)} / ${m((p) => r("warm")(p)?.ttfb)} | ${m((p) => r("cold")(p)?.content)} / ${m((p) => r("warm")(p)?.content)} | ${m((p) => r("warm")(p)?.streamEnd)} | ${m((p) => r("cold")(p)?.firstImage)} / ${m((p) => r("warm")(p)?.firstImage)} | ${m((p) => p.soft[route.label]?.first)} / ${m((p) => p.soft[route.label]?.revisit)} | ${db == null ? "—" : `${db}ms`} |`);
    }
    lines.push(`\nImages a cold load asked for, and what landed: ${routes.map((route) => `${route.label} ${m((p) => p.routes[route.label]?.cold?.imagesAsked)} / ${m((p) => p.routes[route.label]?.cold?.imageKb)}KB`).join(" · ")}.`);
    lines.push(`\nEvicted return, HTTP cache cleared and anything a service worker kept still there, content / load event: ${routes.map((route) => `${route.label} ${m((p) => p.routes[route.label]?.evicted?.content)} / ${m((p) => p.routes[route.label]?.evicted?.loadEvent)}`).join(" · ")}.`);
    lines.push(`\nLoad event cold / warm (null: not within ${LOAD_CAP_MS / 1000}s): ${routes.map((route) => `${route.label} ${m((p) => p.routes[route.label]?.cold?.loadEvent)} / ${m((p) => p.routes[route.label]?.warm?.loadEvent)}`).join(" · ")}.`);
    if (routes.some((r) => r.label === "deck")) lines.push(`\nDeck from its tile, click or tap to content (a 300ms hover first at 1300, a bare tap at 390): from /decks ${m((p) => p.tile?.["/decks"])}ms, from Home ${m((p) => p.tile?.["/"])}ms (null: not a resume row there).`);
    if (routes.some((r) => r.label === "deck")) lines.push(`\nCard press: cold ${m((p) => p.card?.cold.dialog)}ms to dialog, ${m((p) => p.card?.cold.art)}ms to art; warm ${m((p) => p.card?.warm.dialog)}ms; another cold card ${m((p) => p.card?.coldOther.dialog)}ms; after intent ${m((p) => p.card?.intent?.dialog)}ms.`);
    if (routes.some((r) => r.label === "deck")) lines.push(`\nAnalysis tab, press to drawn (a fresh load each): early ${m((p) => p.tab?.early)}ms, idle ${m((p) => p.tab?.idle)}ms, after intent ${m((p) => p.tab?.intent)}ms.`);
  }
  return lines.join("\n");
}

async function main() {
  if (DEPLOYED) return mainDeployed();
  const serverBranch = await refuseShared(DATABASE_URL, null);
  const sql = DB_URL ? neon(DB_URL) : null;
  if (sql) {
    if (!DB_BRANCH) throw new Error("MEASURE_DB_URL needs MEASURE_DB_BRANCH naming the scratch branch it is expected to be.");
    // The statements counted must be the server's own, so the two URLs have to name one branch.
    if (DB_BRANCH !== serverBranch) {
      throw new Error(`MEASURE_DB_BRANCH is ${DB_BRANCH}, but DATABASE_URL (the server's database) reports ${serverBranch}.`);
    }
    await refuseShared(DB_URL, DB_BRANCH);
    await sql`create extension if not exists pg_stat_statements`;
  }
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const { userId, state } = await signIn(browser);
    const deckName = process.env.MEASURE_DECK ?? null;
    const [deck] = deckName
      ? await neon(DATABASE_URL)`select id from decks where user_id = ${userId} and name = ${deckName}`
      : await neon(DATABASE_URL)`
          select d.id from decks d where d.user_id = ${userId}
          order by (select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id) desc, d.id limit 1`;
    if (!deck) throw new Error(deckName ? `The account has no deck named ${deckName}.` : "The account has no decks.");
    await runAll(browser, state, routesFor(deck.id), sql);
  } finally {
    await browser.close();
  }
}

/** One load of every route at this width, discarded: the server's warm-up, kept out of the runs. */
async function warmUp(browser, state, width, routes) {
  for (const route of routes) {
    const context = await browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, storageState: state });
    await context.addInitScript(CONTENT_PROBE);
    const page = await context.newPage();
    await load(page, await capture(page), `${BASE}${route.path}`);
    await context.close();
  }
}

/** Deployed: staging only, no write from the harness, the deck named by id, spans from Vercel's logs. */
async function mainDeployed() {
  const sql = PGSTAT_URL ? neon(PGSTAT_URL) : null;
  if (sql) {
    const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
    if (branch !== STAGING) throw new Error(`MEASURE_PGSTAT_URL must be staging (${STAGING}); it reports ${branch}.`);
  }
  const browser = await chromium.launch();
  try {
    const { state } = await signIn(browser);
    await runAll(browser, state, routesFor(DEPLOYED_ENV.MEASURE_DECK_ID), sql);
  } finally {
    await browser.close();
  }
}

function routesFor(deckId) {
  const routes = [
    // `pattern` is the name the page's `perfRoute` logs under; a route with none logs no spans.
    { label: "home", path: "/", pattern: "/" },
    { label: "decks", path: "/decks", pattern: "/decks" },
    { label: "deck", path: `/decks/${deckId}`, pattern: "/decks/[id]" },
    { label: "collection", path: "/collection" },
    { label: "commanders", path: "/commanders" },
    { label: "discover", path: "/discover" },
  ];
  if (ONLY) {
    const unknown = [...ONLY].filter((l) => !routes.some((r) => r.label === l));
    if (unknown.length) throw new Error(`MEASURE_ROUTES names no route: ${unknown.join(", ")}.`);
    routes.splice(0, routes.length, ...routes.filter((r) => ONLY.has(r.label)));
  }
  return routes;
}

async function runAll(browser, state, routes, sql) {
  console.error(`profile ${PROFILE}, routes ${routes.map((r) => r.label).join(", ")}${PRESS_AT == null ? "" : `, startup pass: press at ${PRESS_AT}ms to ${PRESS_TO}`}`);
  // The startup pass also navigates to MEASURE_PRESS_TO (or `/` from it), which may not be among the
  // routes measured, so those are warmed too.
  const pressTargets = PRESS_AT == null ? [] : [PRESS_TO, PRESS_TO === "/" ? "/decks" : "/"];
  const warmed = [...routes, ...pressTargets.filter((p) => !routes.some((r) => r.path === p)).map((path) => ({ path }))];
  for (const width of MEASURED_WIDTHS) await warmUp(browser, state, width, warmed);
  const runs = [];
  for (let i = 0; i < RUNS; i += 1) {
    const run = {};
    const runStarted = Date.now();
    for (const width of MEASURED_WIDTHS) {
      if (PRESS_AT == null) run[width.label] = await one(browser, state, width, routes, sql);
      else {
        run[width.label] = {};
        for (const route of routes) run[width.label][route.label] = await pressRun(browser, state, width, route);
      }
    }
    await resolveDeployedSpans(run, runStarted);
    runs.push(run);
    // Written after EVERY run, not once at the end: a slow-profile run of seven takes over an
    // hour, and a run stopped part-way (to hand a shared machine back) used to lose the raw
    // figures of every run it had finished. Only the raw JSON survives a stop; the median table
    // below prints only once the loop ends. Written to a temporary file and renamed over OUT,
    // so a stop that lands mid-write leaves the previous run's file whole rather than truncated.
    writeFileSync(`${OUT}.tmp`, JSON.stringify({ base: BASE, at: new Date().toISOString(), complete: i + 1 === RUNS, runs }, null, 2));
    renameSync(`${OUT}.tmp`, OUT);
    console.error(`run ${i + 1} of ${RUNS} done — ${OUT}`);
  }
  console.log(PRESS_AT == null ? table(runs, routes) : pressTable(runs, routes));
  console.log(`\nRaw figures, server spans and the top statements: ${OUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
