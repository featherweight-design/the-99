// probe:card-prefetch — the card modal reads ahead on INTENT, never through the server-action queue,
// and a press is never slower for it.
//
// At 1300x900 and 390x844 on a deck page, reading the network rather than the markup:
//
//   1. A pointer passing over names reads nothing; the one it comes to rest on is read, and it is
//      THAT card, the one pressed afterwards (1300 only: a phone has no pointer to rest).
//   2. A trigger rested on (focused, at 390: a keyboard reader, since a tap never focuses first)
//      is read ONCE, as `GET /api/card-detail`, and the press that follows paints from that read.
//   3. A press is slower than the action alone by at most the provider's `PREFETCH_WAIT_MS`. A
//      prefetch reads `GET /api/card-detail`, which on Vercel runs in a function the page never
//      warmed; a press whose card is being prefetched waits that long on it, then reads through
//      the action in the page's own function. With card reads held 900ms (a cold route), a hover
//      and a press 100ms later must open within the action alone plus that wait.
//   4. A server action pressed while a prefetch is still reading starts at once. Next runs a page's
//      actions one at a time, so a prefetch that was an action would sit ahead of it in the queue.
//      The card reads are held for 4s here, so the prefetch is provably in flight at the press.
//      The action is the Versions tab's diff read (`getVersionDiff`), which writes nothing. This
//      holds only GETs, so it cannot see a prefetch turned back into an action (whose POST would
//      not be held); check 2's "no prefetch is a server action" is the one that catches that.
//   5. No prefetch is ever a server action.
//   6. Read-ahead (carousel, H23): a mid-list card, once open, reads both of its neighbors as
//      GETs, and at 1300 a press of Next paints from that read within 300ms.
//
// Makes no writes but the account's About row (every entry marked seen, so no sheet covers the
// page), captured first and put back in a `finally`. Refused on production and staging. Point it at `next start` on local-dev or a scratch
// branch holding a `pull:staging` copy; the deck is the account's largest by card rows with two or more versions and twelve or more
// rows.
//
//   PROBE_BASE=http://localhost:3061 pnpm probe:card-prefetch

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { captureAboutSeen, markEveryEntrySeen, restoreAboutSeen, sheetCookie } from "./lib/about-clear.mjs";
import { onPage } from "./lib/surface.mjs";
import { readFileSync } from "node:fs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
// The press's bounded wait on a prefetch, read from the provider so the two cannot drift.
const PREFETCH_WAIT_MS = Number(
  readFileSync(new URL("../src/components/cards/card-detail-provider.tsx", import.meta.url), "utf8")
    .match(/export const PREFETCH_WAIT_MS = (\d+);/)?.[1] ?? NaN,
);
if (!Number.isFinite(PREFETCH_WAIT_MS)) throw new Error("PREFETCH_WAIT_MS not found in card-detail-provider.tsx");
const DIALOG = '[role="dialog"][aria-labelledby="card-modal-title"]';
const TRIGGER = '[aria-label^="View details for "]';
const WIDTHS = [
  { label: "1300", viewport: { width: 1300, height: 900 } },
  { label: "390", viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];

let failures = 0;
function report(label, ok, detail = "") {
  if (!ok) failures += 1;
  console.log(`${ok ? " ok  " : " FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
}

/** The account's About columns as found, put back in `main`'s `finally`. Set before the first write. */
let aboutCapture = null;

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
  aboutCapture = await captureAboutSeen(userId);
  await markEveryEntrySeen(userId);
  await context.addCookies([sheetCookie(userId, page.url())]);
  const state = await context.storageState();
  await context.close();
  return { userId, state };
}

/** Every request the page makes, stamped on this clock. */
function recorder(page) {
  const seen = [];
  const byRequest = new Map();
  page.on("request", (r) => {
    const url = new URL(r.url());
    const entry = {
      at: Date.now(),
      done: null,
      method: r.method(),
      detail: url.pathname === "/api/card-detail" ? url.searchParams.get("id") : null,
      action: Boolean(r.headers()["next-action"]),
    };
    seen.push(entry);
    byRequest.set(r, entry);
  });
  const finish = (r) => { const e = byRequest.get(r); if (e) e.done = Date.now(); };
  // The card a read answered with, by name, so a check can say WHICH card was read.
  page.on("response", async (res) => {
    const e = byRequest.get(res.request());
    if (!e?.detail) return;
    try { e.name = JSON.parse(await res.text())?.name ?? null; } catch { e.name = null; }
  });
  page.on("requestfinished", finish);
  page.on("requestfailed", finish);
  return {
    /** Card reads started before `t` and not finished by it. */
    inFlightAt: (t) => seen.filter((r) => r.detail && r.at <= t && (r.done == null || r.done > t)),
    since: (t) => seen.filter((r) => r.at >= t),
    reads: (t) => seen.filter((r) => r.at >= t && r.detail),
  };
}

const settle = (page, ms) => page.waitForTimeout(ms);

/**
 * Wait until no card read is in flight. An opened card READS ITS NEIGHBORS AHEAD (carousel, H23),
 * so a read left over from the last press would otherwise be counted by the next check as the
 * intent read it is looking for, and a check that a prefetch "was still reading" would pass with
 * the intent prefetch removed.
 */
async function quiet(page, net, since = 0) {
  for (let i = 0; i < 100; i += 1) {
    if (net.inFlightAt(Date.now()).filter((r) => r.at >= since).length === 0) return;
    await settle(page, 100);
  }
  throw new Error("card reads never went quiet");
}

/**
 * Arms an in-page timer: from the first pointerdown or click on the page to the first frame the
 * card dialog paints. Measured INSIDE the page, because while a route is held Playwright's own
 * visibility polling runs late: with card reads held 900ms it reported a dialog ~460ms after the
 * page had painted it, which read as the press waiting out the held read when it had not.
 */
async function armOpenTimer(page) {
  await page.evaluate(() => {
    globalThis.__open = { start: null, end: null };
    const mark = () => { globalThis.__open.start ??= performance.now(); };
    document.addEventListener("pointerdown", mark, { capture: true, once: true });
    document.addEventListener("click", mark, { capture: true, once: true });
    const tick = () => {
      const d = document.querySelector('[role="dialog"][aria-labelledby="card-modal-title"]');
      const r = d?.getBoundingClientRect();
      if (globalThis.__open.start != null && r && r.width > 0 && r.height > 0) {
        globalThis.__open.end = performance.now();
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
const openTime = (page) => page.evaluate(() => Math.round(globalThis.__open.end - globalThis.__open.start));

async function closeDialog(page) {
  await page.keyboard.press("Escape");
  await page.locator(DIALOG).waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
}

async function walk(browser, state, width, deckId) {
  console.log(`\n── ${width.label}`);
  const context = await browser.newContext({ viewport: width.viewport, isMobile: width.isMobile, hasTouch: width.hasTouch, storageState: state });
  const page = await context.newPage();
  const net = recorder(page);
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});
  const triggers = onPage(page, TRIGGER).filter({ visible: true });
  await triggers.first().waitFor({ state: "visible", timeout: 30_000 });
  const count = await triggers.count();
  if (count < 12) throw new Error(`the deck draws ${count} card triggers; the walk needs 12`);
  const desktop = !width.isMobile;
  // Intent: a resting pointer on desktop, focus at 390 (a keyboard reader; a tap never focuses first).
  // Keyboard focus only: the provider prefetches on :focus-visible, which Chrome grants to
  // programmatic focus only once the last interaction was a key. Shift sets that and types nothing.
  const intend = async (i) => {
    if (desktop) return triggers.nth(i).hover();
    await page.keyboard.press("Shift");
    return triggers.nth(i).focus();
  };

  // 1. A pass over five names reads nothing; the name it stops on is read.
  if (desktop) {
    const boxes = [];
    for (let i = 0; i < 5; i += 1) boxes.push(await triggers.nth(i).boundingBox());
    const t = Date.now();
    for (const b of boxes) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 2 });
    await settle(page, 400);
    const reads = net.reads(t);
    // Which card: with no delay the FIRST name crossed would be read and the rest would wait behind
    // it, which is also one read. The answer's name against the label of the name it stopped on.
    for (let i = 0; i < 40 && reads[0] && reads[0].name === undefined; i += 1) await settle(page, 100);
    const restedOn = (await triggers.nth(4).getAttribute("aria-label"))?.replace(/^View details for /, "") ?? "";
    const readName = reads[0]?.name ?? null;
    report(`${width.label} · a pointer passing over four names reads none of them`, reads.length <= 1, `${reads.length} read(s)`);
    report(`${width.label} · the one it rests on is read, and it is that card`,
      reads.length === 1 && readName !== null && restedOn.startsWith(readName),
      `${reads.length} read(s): ${readName ?? "none"}; rested on ${restedOn}`);
    await page.mouse.move(0, 0);
    await settle(page, 200);
  }

  // 2. Intent reads once, as a GET; the press paints before any new read answers.
  await quiet(page, net);
  let t = Date.now();
  await intend(6);
  await settle(page, 400);
  const prefetched = net.reads(t);
  report(`${width.label} · intent reads the card once`, prefetched.length === 1, `${prefetched.length} read(s)`);
  report(`${width.label} · the read is a GET to /api/card-detail`, prefetched.every((r) => r.method === "GET"));
  const guessedActions = net.since(t).filter((r) => r.action).length;
  report(`${width.label} · no prefetch is a server action`, guessedActions === 0, `${guessedActions} action(s)`);
  t = Date.now();
  await triggers.nth(6).click();
  await page.locator(DIALOG).waitFor({ state: "visible", timeout: 10_000 });
  const painted = Date.now() - t;
  report(`${width.label} · the press paints from the prefetch`, painted < 120, `${painted}ms to the dialog`);
  await closeDialog(page);
  await settle(page, 400);

  // 3. A cold route: every card read held 900ms. The action alone first, pressed with no
  // pointerdown or focus so nothing is prefetched; then a card rested on and pressed 100ms into
  // its prefetch, which must open no slower.
  const cold = "**/api/card-detail**";
  await page.route(cold, async (route) => {
    await new Promise((r) => setTimeout(r, 900));
    await route.continue().catch(() => {});
  });
  await armOpenTimer(page);
  await triggers.nth(8).evaluate((el) => el.click());
  await page.locator(DIALOG).waitFor({ state: "visible", timeout: 10_000 });
  const alone = await openTime(page);
  await closeDialog(page);
  await settle(page, 1200);
  await quiet(page, net);
  await intend(10);
  await settle(page, desktop ? 200 : 100);
  t = Date.now();
  const racing = net.inFlightAt(t).length;
  await armOpenTimer(page);
  await triggers.nth(10).click();
  await page.locator(DIALOG).waitFor({ state: "visible", timeout: 10_000 });
  const raced = await openTime(page);
  await closeDialog(page);
  await page.unroute(cold);
  await settle(page, 1200);
  report(`${width.label} · a cold prefetch was still reading at the press`, racing > 0, `${racing} in flight`);
  // Bounded: the press waits at most PREFETCH_WAIT_MS on the cold prefetch, then reads for itself.
  report(`${width.label} · the press costs at most the wait over the action alone`, raced <= alone + PREFETCH_WAIT_MS + 80,
    `${raced}ms against ${alone}ms, wait ${PREFETCH_WAIT_MS}ms`);

  // 4. A card read held in flight, and an action pressed during it.
  await quiet(page, net);
  await page.route("**/api/card-detail**", async (route) => {
    await new Promise((r) => setTimeout(r, 4000));
    await route.continue().catch(() => {});
  });
  // Card 2: no earlier step has read it. Card 9 was read AHEAD as a neighbor of the cards section
  // 3 opened, so resting on it reads nothing, and this section would measure no prefetch at all.
  await intend(2);
  await settle(page, 200);
  await onPage(page, "#tab-versions").click();
  const rows = onPage(page, 'button[aria-expanded="false"]').filter({ hasText: /v\d/i });
  await rows.first().waitFor({ state: "visible", timeout: 3_000 });
  t = Date.now();
  const held = net.inFlightAt(t).length;
  await rows.first().click();
  let action = null;
  for (let i = 0; i < 60 && !action; i += 1) {
    action = net.since(t).find((r) => r.action) ?? null;
    if (!action) await settle(page, 25);
  }
  const waited = action ? action.at - t : null;
  report(`${width.label} · a prefetch was still reading when the action was pressed`, held > 0, `${held} in flight`);
  report(`${width.label} · the action starts at once regardless`, waited !== null && waited < 80, waited === null ? "no action seen" : `${waited}ms from press to request`);
  await page.unroute("**/api/card-detail**");
  // A read held across the reload is abandoned with the page and never reports finishing.
  const reloaded = Date.now();
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "load" });
  await page.waitForLoadState("networkidle").catch(() => {});

  // 5. READ AHEAD (carousel, H23): a mid-list card, once open, reads both neighbors as GETs, and
  // a press of Next then paints from that read. Pressed without intent (a programmatic click), so
  // every GET after it is the read-ahead and nothing else.
  const list = onPage(page, TRIGGER).filter({ visible: true });
  await list.nth(5).waitFor({ state: "visible", timeout: 30_000 });
  // Park the pointer off the list, so no rest starts an intent read inside the count.
  if (desktop) await page.mouse.move(0, 0);
  await quiet(page, net, reloaded);
  t = Date.now();
  await list.nth(5).evaluate((el) => el.click());
  await page.locator(DIALOG).waitFor({ state: "visible", timeout: 10_000 });
  let ahead = [];
  for (let i = 0; i < 60; i += 1) {
    ahead = net.reads(t).filter((r) => r.method === "GET");
    if (ahead.length >= 2 && ahead.every((r) => r.done != null && r.name !== undefined)) break;
    await settle(page, 100);
  }
  const ids = new Set(ahead.map((r) => r.detail));
  report(`${width.label} · an opened card reads both neighbors ahead`, ahead.length === 2 && ids.size === 2,
    `${ahead.length} read(s): ${ahead.map((r) => r.name ?? r.detail).join(", ") || "none"}`);
  report(`${width.label} · no read-ahead is a server action`,
    net.since(t).filter((r) => r.action).length <= 1, `${net.since(t).filter((r) => r.action).length} action(s), the press's own included`);
  const nextName = ahead[0]?.name ?? null;
  const next = page.locator(DIALOG).getByRole("button", { name: "Next card" });
  if (desktop && nextName) {
    // Desktop draws the footer's Next; the phone pages from the sheet that PR 3 adds.
    const before = Date.now();
    await next.click();
    await page.locator(`${DIALOG}`).filter({ hasText: nextName }).first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    const pagedIn = Date.now() - before;
    const title = await page.locator("#card-modal-title").first().textContent();
    report(`${width.label} · the first read is the NEXT card, and Next paints from it`,
      title?.includes(nextName) && pagedIn < 300, `title ${title}; read ${nextName}; ${pagedIn}ms`);
  }
  await closeDialog(page);
  await context.close();
}

async function main() {
  const [{ branch }] = await neon(DATABASE_URL)`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`refusing branch ${branch ?? "(unknown)"}`);
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    const { userId, state } = await signIn(browser);
    const [deck] = await neon(DATABASE_URL)`
      select d.id from decks d
      where d.user_id = ${userId}
        and (select count(*) from deck_versions v where v.deck_id = d.id) >= 2
        and (select count(*) from deck_cards c where c.deck_id = d.id) >= 12
      -- ROWS, not summed quantity: a fixture padded to 99 with one stack of Wastes sums to 99 and
      -- draws a handful of triggers, and the walk needs twelve.
      order by (select count(*) from deck_cards c where c.deck_id = d.id) desc, d.id
      limit 1`;
    if (!deck) throw new Error("The account has no deck with two versions and twelve card rows; pull:staging one onto a scratch branch.");
    for (const width of WIDTHS) await walk(browser, state, width, deck.id);
  } finally {
    await browser.close();
    if (aboutCapture) await restoreAboutSeen(aboutCapture);
  }
  console.log(failures ? `\n${failures} check(s) failed.` : "\nAll checks passed.");
  process.exitCode = failures ? 1 : 0;
}

await main();
