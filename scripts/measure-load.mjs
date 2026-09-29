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
//   - the card-details press on the deck page: a cold card, the same card again, and another cold
//     card, each to the dialog and to its art.
// Times come from CDP, never Resource Timing: Scryfall's CDN sends no `Timing-Allow-Origin`.
// Each figure is the MEDIAN of MEASURE_RUNS runs (default 3).
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
//     six at two widths and three runs takes a long time. The card press needs `deck`.
//   - MEASURE_WIDTHS=390: only the widths named (1300, 390).
//   - MEASURE_LOADS=0: skip each route's cold and warm loads and run only the client navigation
//     pass. With MEASURE_ROUTES=discover,home that pass goes Home, /discover, Home, so Home's soft
//     first visit is the one a /discover list is still mounted under.
// The table also prints, per route, the card images a cold load ASKED for and the kilobytes that
// landed, because an image is not in any RSC figure and can still be most of what a page costs.
//
// Where to point it: a `next start` (never `next dev`, whose compile times swamp everything) on a
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
import { readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { markEveryEntrySeen, sheetCookie } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.MEASURE_BASE;
if (!BASE) throw new Error("Set MEASURE_BASE to the server under test, e.g. http://localhost:3060.");
const RUNS = Math.max(1, Number(process.env.MEASURE_RUNS ?? 3));
const OUT = process.env.MEASURE_OUT ?? path.join(os.tmpdir(), `measure-load-${Date.now()}.json`);
const SERVER_LOG = process.env.MEASURE_SERVER_LOG ?? null;
const DB_URL = process.env.MEASURE_DB_URL ?? null;
const DB_BRANCH = process.env.MEASURE_DB_BRANCH ?? null;

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
const LOADS = process.env.MEASURE_LOADS !== "0";
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
    if (r) { r.headersAt = e.timestamp; r.cached = Boolean(e.response.fromDiskCache || e.response.fromMemoryCache); }
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

/** Both card-detail reads' `[perf]` lines: the press's action and a prefetch's route, apart. */
const cardSpans = (from) => ({ action: serverSpans(from, "getCardDetail"), prefetch: serverSpans(from, "/api/card-detail") });

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
    const from = logSize();
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
    out[key] = { dialog: dialogMs, art, action: net.actionMs, prefetch: net.prefetchMs, spans: cardSpans(from) };
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  }
  return out;
}

async function one(browser, state, width, routes, sql) {
  const result = { routes: {}, soft: {}, card: null };
  const ctx = () => browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, storageState: state });
  for (const route of LOADS ? routes : []) {
    const context = await ctx();
    await context.addInitScript(CONTENT_PROBE);
    const page = await context.newPage();
    const cap = await capture(page);
    await cap.cdp.send("Network.clearBrowserCache");
    const cold = await load(page, cap, `${BASE}${route.path}`);
    const from = logSize();
    const warm = await load(page, cap, `${BASE}${route.path}`);
    const spans = route.pattern ? serverSpans(from, route.pattern) : null;
    const db = sql ? await dbExec(sql, () => load(page, cap, `${BASE}${route.path}`)) : null;
    result.routes[route.label] = { cold, warm, spans, db };
    if (route.label === "deck") result.card = await cardPress(page, cap, width);
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
    lines.push("| Route | TTFB cold / warm | Content cold / warm | Stream end warm | First image cold / warm | Soft first / revisit | DB exec warm |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const route of routes) {
      const r = (k) => (p) => p.routes[route.label]?.[k];
      const db = m((p) => p.routes[route.label]?.db?.ms);
      lines.push(`| ${route.label} | ${m((p) => r("cold")(p)?.ttfb)} / ${m((p) => r("warm")(p)?.ttfb)} | ${m((p) => r("cold")(p)?.content)} / ${m((p) => r("warm")(p)?.content)} | ${m((p) => r("warm")(p)?.streamEnd)} | ${m((p) => r("cold")(p)?.firstImage)} / ${m((p) => r("warm")(p)?.firstImage)} | ${m((p) => p.soft[route.label]?.first)} / ${m((p) => p.soft[route.label]?.revisit)} | ${db == null ? "—" : `${db}ms`} |`);
    }
    lines.push(`\nImages a cold load asked for, and what landed: ${routes.map((route) => `${route.label} ${m((p) => p.routes[route.label]?.cold?.imagesAsked)} / ${m((p) => p.routes[route.label]?.cold?.imageKb)}KB`).join(" · ")}.`);
    lines.push(`\nLoad event cold / warm (null: not within ${LOAD_CAP_MS / 1000}s): ${routes.map((route) => `${route.label} ${m((p) => p.routes[route.label]?.cold?.loadEvent)} / ${m((p) => p.routes[route.label]?.warm?.loadEvent)}`).join(" · ")}.`);
    if (routes.some((r) => r.label === "deck")) lines.push(`\nCard press: cold ${m((p) => p.card?.cold.dialog)}ms to dialog, ${m((p) => p.card?.cold.art)}ms to art; warm ${m((p) => p.card?.warm.dialog)}ms; another cold card ${m((p) => p.card?.coldOther.dialog)}ms; after intent ${m((p) => p.card?.intent?.dialog)}ms.`);
  }
  return lines.join("\n");
}

async function main() {
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
    const routes = [
      // `pattern` is the name the page's `perfRoute` logs under; a route with none logs no spans.
      { label: "home", path: "/", pattern: "/" },
      { label: "decks", path: "/decks", pattern: "/decks" },
      { label: "deck", path: `/decks/${deck.id}`, pattern: "/decks/[id]" },
      { label: "collection", path: "/collection" },
      { label: "commanders", path: "/commanders" },
      { label: "discover", path: "/discover" },
    ];
    if (ONLY) {
      const unknown = [...ONLY].filter((l) => !routes.some((r) => r.label === l));
      if (unknown.length) throw new Error(`MEASURE_ROUTES names no route: ${unknown.join(", ")}.`);
      routes.splice(0, routes.length, ...routes.filter((r) => ONLY.has(r.label)));
    }
    console.error(`profile ${PROFILE}, routes ${routes.map((r) => r.label).join(", ")}`);
    const runs = [];
    for (let i = 0; i < RUNS; i += 1) {
      const run = {};
      for (const width of MEASURED_WIDTHS) run[width.label] = await one(browser, state, width, routes, sql);
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
    console.log(table(runs, routes));
    console.log(`\nRaw figures, server spans and the top statements: ${OUT}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
