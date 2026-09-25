// probe:analysis-load-order — how the Analysis tab's first paint arrives, at 1300x900 and 390x844,
// on a deck with versions, a stored analysis and a written overview (Hugh's staging walk,
// 2026-09-25). Three rulings, each a fact about what paints WHEN, which jsdom cannot see:
//
//   a/c. Nothing pops in. The tab holds its loader until the verdict, the overview, Suggested
//        changes and the credit lines are ALL ready, and then paints them together: no part of the
//        tab appears after another part has painted, least of all above it. Read by a
//        MutationObserver installed before the tab is pressed, which stamps each part's first
//        visible frame and where it sat.
//   d.   The tab row stays one line with Analysis selected, on a deck with versions.
//
// It WRITES, on the deck it walks: pressing Analyze stores a reading and an overview (the stub
// answers, so nothing is spent upstream), and the About gate row in `user_prefs`. Point
// PROBE_TARGET_URL at a scratch branch or local-dev, never staging or production.
//
//   PROBE_TARGET_URL=<scratch> PROBE_EMAIL=<+clerk_test account> PROBE_DECK="HD - Avatar Aang" \
//     PROBE_BASE=http://localhost:3250 node scripts/probe-analysis-load-order.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
// Its own variables, read AFTER `env.mjs`: that loads `.env` with override, so a `DATABASE_URL`
// or an email set on the command line would be replaced by the file's.
const TARGET = process.env.PROBE_TARGET_URL;
const EMAIL = process.env.PROBE_EMAIL ?? E2E_AUDIT_USER_EMAIL;
const DECK = process.env.PROBE_DECK ?? "HD - Avatar Aang";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!TARGET) throw new Error("Set PROBE_TARGET_URL to a scratch branch or local-dev.");
if (!EMAIL.includes("+clerk_test")) throw new Error("PROBE_EMAIL must be a +clerk_test account.");
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const sql = neon(TARGET);

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const s = window.Clerk.client.signIn;
      let a = await s.create({ identifier: email });
      if (a.status === "needs_first_factor" || a.status === "needs_client_trust") {
        const f = a.supportedFirstFactors?.find((x) => x.strategy === "email_code");
        await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f.emailAddressId });
        a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (a.status !== "complete") return `sign-in status: ${a.status}`;
      await window.Clerk.setActive({ session: a.createdSessionId });
      return null;
    } catch (e) {
      return e?.errors?.[0]?.longMessage ?? String(e);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  const userId = await page.evaluate(() => window.Clerk.user.id);
  const { version } = JSON.parse(readFileSync(new URL("../src/lib/copy/about.version.json", import.meta.url), "utf8"));
  await sql`
    insert into user_prefs (user_id, about_version_seen) values (${userId}, ${version})
    on conflict (user_id) do update set about_version_seen = greatest(user_prefs.about_version_seen, ${version})`;
  await clearAboutSheet(page, userId);
  return userId;
}

// Stamps, from before the tab is pressed, each part's first VISIBLE frame and its top edge.
const OBSERVE = () => {
  const parts = {
    loader: "[data-opening-loader='drawn']",
    verdict: "[data-testid='verdict-cell']",
    overview: "[data-testid='synopsis-overview']",
    empty: "[data-testid='analysis-empty']",
    pressNote: "[data-testid='press-note']",
    tuning: "section[aria-labelledby='tuning-heading']",
  };
  const seen = {};
  window.__parts = seen;
  const t0 = performance.now();
  const look = () => {
    const panel = document.querySelector("#panel-analysis");
    if (!panel) return;
    for (const [name, sel] of Object.entries(parts)) {
      if (seen[name]) continue;
      const el = [...panel.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
      if (el) seen[name] = { at: Math.round(performance.now() - t0), top: Math.round(el.getBoundingClientRect().top + window.scrollY) };
    }
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
  look();
};

async function deckFor(userId) {
  const [row] = await sql`select id from decks where user_id = ${userId} and name = ${DECK} limit 1`;
  if (!row) throw new Error(`The account owns no deck named ${DECK}.`);
  const [{ versions }] = await sql`select count(*)::int as versions from deck_versions where deck_id = ${row.id}`;
  return { id: row.id, versions };
}

async function pressTab(page, name) {
  await page.locator(`${PAGE} [role='tab']:visible`, { hasText: name }).first().click();
}

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:analysis-load-order refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      const userId = await signIn(page);
      const deck = await deckFor(userId);
      const at = (s) => `${s} @ ${width}`;

      // The fixture: a stored reading and a written overview. Pressed into being once, through the
      // tab itself, if the deck lacks either.
      const [{ profiled }] = await sql`select exists(select 1 from deck_profiles where deck_id = ${deck.id}) as profiled`;
      if (!profiled) {
        await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
        await pressTab(page, "Analysis");
        await page.locator(`${PAGE} button:visible`, { hasText: /^Analyze/ }).first().click();
        await page.locator(`${PAGE} [data-testid='verdict-cell']`).first().waitFor({ timeout: 120_000 });
        await page.waitForTimeout(8_000);
      }

      // a/c: the opening, from a fresh document so nothing is held client-side.
      await page.addInitScript(OBSERVE);
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
      await page.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().waitFor();
      await page.waitForTimeout(1_500); // the deck page settles; the observer starts clean below
      await page.evaluate(() => { for (const k of Object.keys(window.__parts)) delete window.__parts[k]; });
      await pressTab(page, "Analysis");
      await page.locator(`${PAGE} [data-testid='verdict-cell']`).first().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(6_000); // every late part has had time to arrive
      const parts = await page.evaluate(() => window.__parts);
      const content = Object.entries(parts).filter(([n]) => n !== "loader");
      const first = Math.min(...content.map(([, p]) => p.at));
      const late = content.filter(([, p]) => p.at - first > 50);
      const above = late.filter(([, p]) => content.some(([, q]) => q.at < p.at - 50 && q.top >= p.top));
      report(at("the tab's parts paint together, once the loader lets go"), content.length >= 3 && late.length === 0,
        JSON.stringify(parts));
      report(at("nothing paints above a part already on screen"), above.length === 0,
        above.length ? above.map(([n]) => n).join(", ") : "none");
      report(at("the overview is among them, written"), Boolean(parts.overview), JSON.stringify(parts.overview ?? null));

      // a, before any reading: the empty state and the credit note beside Analyze paint together.
      // A deck never analyzed, so nothing is stored and only the overview's read is waited on.
      const [bare] = await sql`
        select d.id from decks d where d.user_id = ${userId}
          and not exists (select 1 from deck_profiles p where p.deck_id = d.id)
          and (select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id) >= 98
        order by d.name limit 1`;
      if (!bare) throw new Error("No unanalyzed whole deck to open.");
      const empty = await context.newPage();
      await empty.addInitScript(OBSERVE);
      await empty.goto(`${BASE}/decks/${bare.id}`, { waitUntil: "domcontentloaded" });
      await empty.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().waitFor();
      await empty.waitForTimeout(1_500);
      await empty.evaluate(() => { for (const k of Object.keys(window.__parts)) delete window.__parts[k]; });
      await pressTab(empty, "Analysis");
      await empty.locator(`${PAGE} [data-testid='analysis-empty']`).first().waitFor({ timeout: 60_000 });
      await empty.waitForTimeout(4_000);
      const bareParts = await empty.evaluate(() => window.__parts);
      report(at("before a reading, the credit note arrives with the empty state"),
        Boolean(bareParts.empty && bareParts.pressNote) && Math.abs(bareParts.pressNote.at - bareParts.empty.at) <= 50,
        JSON.stringify(bareParts));
      await empty.close();

      // d: one line of tabs with Analysis selected, on a deck with versions.
      const tops = await page.evaluate((scope) =>
        [...document.querySelectorAll(`${scope} [role='tablist'] [role='tab']`)]
          .filter((t) => t.getClientRects().length > 0)
          .map((t) => ({ text: t.textContent, top: Math.round(t.getBoundingClientRect().top), h: Math.round(t.getBoundingClientRect().height) })), PAGE);
      // Five tabs can be wider than a phone: the row may scroll sideways, but the PAGE may not, and
      // a tab past the edge must be reachable by scrolling the row rather than cut off.
      const fits = await page.evaluate((scope) => {
        const list = document.querySelector(`${scope} [role='tablist']`);
        return {
          pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
          listOverflow: list.scrollWidth - list.clientWidth,
          scrolls: ["auto", "scroll"].includes(getComputedStyle(list).overflowX),
        };
      }, PAGE);
      report(at("the page never scrolls sideways, and a tab past the edge is reachable"),
        fits.pageOverflow <= 0 && (fits.listOverflow <= 0 || fits.scrolls), JSON.stringify(fits));
      report(at(`the tab row is one line on a deck with ${deck.versions} version(s)`),
        deck.versions > 0 && tops.length >= 3 && tops.every((t) => t.top === tops[0].top && t.h === tops[0].h), JSON.stringify(tops));

      await context.close();
    }
  } finally {
    await browser.close();
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
