// probe:analysis-load-order — how the Analysis tab's first paint arrives, at 1300x900 and 390x844,
// on a deck with versions, a stored analysis and a written overview (Hugh's staging walk,
// 2026-09-25). Three rulings, each a fact about what paints WHEN, which jsdom cannot see:
//
//   a/c. Nothing pops in. The tab holds its loader until the verdict, the overview, Suggested
//        changes and the credit lines are ALL ready, and then paints them together: no part of the
//        tab appears after another part has painted, least of all above it. Read by a
//        sampler installed before the tab is pressed, which stamps each part's first visible frame
//        and where it sat.
//        A deck NEVER analyzed is the exception, by #1465: its empty state draws at once and the
//        credit note beside Analyze follows when its own read (`fetchSynopsis`) lands, about 0.7 to
//        2s measured. Two loads prove it. On the first, that read's response is HELD by the probe,
//        and the empty state must paint while it is held: it does not wait for the note. A frame
//        comparison cannot prove that, since a fast response lands in the empty state's own frame on
//        a correct build. On a second, unheld load the note must arrive within 2.5s of the empty state.
//        On the held load the Tuning hub under the empty state must not move, from its first frame
//        through the note's landing (PROBE_HUB=on, the default): the note's frame is reserved.
//   d.   The tab row stays one line with Analysis selected, on a deck with versions.
//
// It WRITES, on the deck it walks, only what the deck lacked: a reading (Analyze) and an overview
// (Write one; the stub answers, so nothing is spent upstream). Both are DELETED again in a
// `finally`, the overview's ledger units with it, so a run leaves the deck as it found it; a deck
// that already had either keeps it untouched. The About gate row in `user_prefs` is left set, as
// every probe that clears the gate leaves it. Point PROBE_TARGET_URL at a scratch branch or
// local-dev, never staging or production.
//
//   PROBE_TARGET_URL=<scratch> PROBE_EMAIL=<+clerk_test account> PROBE_DECK="HD - Avatar Aang" \
//     PROBE_BASE=http://localhost:3250 node scripts/probe-analysis-load-order.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertModelStandIn, pageGet } from "./lib/model-stand-in.mjs";
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
// How long after a never-analyzed deck's empty state its credit note may land (#1465: measured at
// about 0.7 to 2s, the note's own read).
const NOTE_BOUND_MS = 2_500;
// Whether the server has the Tuning hub on (two or more of TUNING_ENABLED, MANA_BALANCE_ENABLED and
// PROPOSED_CUTS_ENABLED, Mana Balance among them, so it draws on a deck with no reading). On by default:
// the hub must then stay put while the credit note lands. PROBE_HUB=off skips that one check, saying so.
const HUB = process.env.PROBE_HUB ?? "on";
if (HUB !== "on" && HUB !== "off") throw new Error("Set PROBE_HUB to on or off, matching the server's Tuning switches.");

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

// Stamps, from before the tab is pressed, each part's first VISIBLE frame and its top edge. Sampled in
// requestAnimationFrame, every part in one pass with the frame's own timestamp and a frame counter, so two
// parts are "different frames" only when they were drawn in different painted frames. A MutationObserver
// stamping each part with its own `performance.now()` could split one frame into two times.
const OBSERVE = () => {
  const parts = {
    loader: "[data-opening-loader='drawn']",
    verdict: "[data-testid='verdict-cell']",
    overview: "[data-testid='synopsis-overview']",
    empty: "[data-testid='analysis-empty']",
    pressNote: "[data-testid='press-note']",
    // Suggested changes: the Tuning hub when two or more of its tools are on (the hub stands where the
    // tool's own section stood, and the opening holds on it), the tool's section otherwise.
    tuning: "section[data-tuning-hub], section[aria-labelledby='tuning-heading']",
  };
  const seen = {};
  window.__parts = seen;
  // Every top the Tuning hub takes, from its first visible frame (a move of more than half a pixel).
  const hubTops = [];
  window.__hubTops = hubTops;
  const t0 = performance.now();
  let frame = 0;
  const sample = (ts) => {
    frame += 1;
    const panel = document.querySelector("#panel-analysis");
    if (panel) {
      const hub = panel.querySelector("section[data-tuning-hub]");
      if (hub && hub.getClientRects().length > 0) {
        const top = Math.round((hub.getBoundingClientRect().top + window.scrollY) * 10) / 10;
        if (hubTops.length === 0 || Math.abs(hubTops.at(-1).top - top) > 0.5) hubTops.push({ at: Math.round(ts - t0), frame, top });
      }
      for (const [name, sel] of Object.entries(parts)) {
        if (seen[name]) continue;
        const el = [...panel.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
        if (el) seen[name] = { at: Math.round(ts - t0), frame, top: Math.round(el.getBoundingClientRect().top + window.scrollY) };
      }
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
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
  // What this run created, deleted in the `finally`: filled BEFORE the write each one covers.
  // `synopses`: deck id to the overview rows it held before any press, so the cleanup deletes only
  // rows this run wrote, whatever their status. A pending or refused row is not a shown overview,
  // and a "Write one" over it writes a new row.
  const created = { profiles: new Set(), synopses: new Map() };
  try {
    for (const width of [1300, 390]) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      const userId = await signIn(page);
      // THE SPEND GUARD, before any press: Analyze and Write one may write the overview.
      await assertModelStandIn(BASE, ["synopsis"], { get: pageGet(page) });
      const deck = await deckFor(userId);
      const at = (s) => `${s} @ ${width}`;

      // The fixture: a stored reading and a written overview. Pressed into being once, through the
      // tab itself, if the deck lacks either.
      // What the deck had BEFORE any press: an Analyze press may write the overview as well as the
      // reading, so both are read here, ahead of every write, and not after the one that made them.
      const [{ profiled }] = await sql`select exists(select 1 from deck_profiles where deck_id = ${deck.id}) as profiled`;
      if (!created.synopses.has(deck.id)) {
        const before = (await sql`select id from deck_synopses where deck_id = ${deck.id}`).map((r) => r.id);
        created.synopses.set(deck.id, before);
      }
      if (!profiled) {
        created.profiles.add(deck.id);
        await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
        await pressTab(page, "Analysis");
        await page.locator(`${PAGE} button:visible`, { hasText: /^Analyze/ }).first().click();
        await page.locator(`${PAGE} [data-testid='verdict-cell']`).first().waitFor({ timeout: 120_000 });
        await page.waitForTimeout(3_000);
      }
      // A WRITTEN overview, not merely a reading: the Analyze press writes one only when its note
      // said it would, so the fixture writes it through the overview's own "Write one".
      const [{ written: hasOverview }] = await sql`select exists(select 1 from deck_synopses where deck_id = ${deck.id} and status = 'done') as written`;
      if (!hasOverview) {
        await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
        await pressTab(page, "Analysis");
        await page.locator(`${PAGE} [data-testid='synopsis-overview'] button:visible`, { hasText: "Write one" }).first().click();
        await page.locator(`${PAGE} [data-testid='synopsis-overview'] button:visible`, { hasText: "View full overview" }).first().waitFor({ timeout: 120_000 });
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
      // WRITTEN, not merely its slot: the slot also draws the "write one" row on a deck with none,
      // so the check reads the written overview's own entry link.
      const written = await page.evaluate((scope) => {
        const slot = document.querySelector(`${scope} [data-testid='synopsis-overview']`);
        return Boolean(slot && [...slot.querySelectorAll("button")].some((b) => b.textContent.includes("View full overview")));
      }, PAGE);
      report(at("the overview is among them, written"), Boolean(parts.overview) && written, JSON.stringify({ painted: parts.overview ?? null, written }));

      // a, before any reading: the empty state first, then the credit note beside Analyze within
      // NOTE_BOUND_MS of it (#1465: the empty state no longer waits on the note's read). A deck
      // never analyzed, so nothing is stored.
      const [bare] = await sql`
        select d.id from decks d where d.user_id = ${userId}
          and not exists (select 1 from deck_profiles p where p.deck_id = d.id)
          and (select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id) >= 98
        order by d.name limit 1`;
      if (!bare) throw new Error("No unanalyzed whole deck to open.");
      // The BOUND first, on a load with nothing held, so no hold can move it. It also names the synopsis
      // read: Next sends a server action as a POST carrying its hashed id in `next-action`, and the one
      // whose reply is a synopsis state (`fetchSynopsis`, recognised by its `wouldSpend` field) is the
      // read the credit note waits on.
      const empty = await context.newPage();
      await empty.addInitScript(OBSERVE);
      const synopsisIds = new Set();
      empty.on("response", async (res) => {
        const id = res.request().headers()["next-action"];
        if (!id || res.request().method() !== "POST") return;
        const body = await res.text().catch(() => "");
        if (body.includes('"wouldSpend"')) synopsisIds.add(id);
      });
      await empty.goto(`${BASE}/decks/${bare.id}`, { waitUntil: "domcontentloaded" });
      await empty.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().waitFor();
      await empty.waitForTimeout(1_500);
      await empty.evaluate(() => { for (const k of Object.keys(window.__parts)) delete window.__parts[k]; });
      await pressTab(empty, "Analysis");
      await empty.locator(`${PAGE} [data-testid='analysis-empty']`).first().waitFor({ timeout: 60_000 });
      await empty.waitForTimeout(4_000);
      const bareParts = await empty.evaluate(() => window.__parts);
      const noteLag = bareParts.empty && bareParts.pressNote ? bareParts.pressNote.at - bareParts.empty.at : null;
      report(at(`before a reading, the credit note follows the empty state within ${NOTE_BOUND_MS / 1000}s`),
        noteLag !== null && noteLag >= 0 && noteLag <= NOTE_BOUND_MS, `${noteLag ?? "no note"}ms after the empty state ${JSON.stringify(bareParts)}`);
      await empty.close();

      // The ORDER, on a second load whose synopsis read is HELD: its reply is kept from the page until the
      // empty state has been read. The empty state must paint while it is held, the note must not, and the
      // note must arrive once it is released. A frame comparison cannot prove this: a fast reply lands in
      // the empty state's own frame on a correct build.
      const held = await context.newPage();
      await held.addInitScript(OBSERVE);
      let release;
      const gate = new Promise((r) => { release = r; });
      const caught = { held: 0 };
      await held.route("**/*", async (route) => {
        const req = route.request();
        if (req.method() !== "POST" || !synopsisIds.has(req.headers()["next-action"])) return route.fallback();
        caught.held += 1;
        const response = await route.fetch();
        const body = await response.text();
        await gate;
        await route.fulfill({ response, body }).catch(() => {});
      });
      await held.goto(`${BASE}/decks/${bare.id}`, { waitUntil: "domcontentloaded" });
      await held.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().waitFor();
      await held.waitForTimeout(1_500);
      await held.evaluate(() => { for (const k of Object.keys(window.__parts)) delete window.__parts[k]; });
      await pressTab(held, "Analysis");
      const paintedHeld = await held.waitForFunction(() => Boolean(window.__parts.empty), null, { timeout: 30_000 })
        .then(() => true, () => false);
      // Long enough for the read to have been asked for and answered, were it not held.
      await held.waitForTimeout(3_000);
      const whileHeld = await held.evaluate(() => ({ ...window.__parts }));
      report(at("the empty state paints while the credit note's read is held"),
        synopsisIds.size > 0 && caught.held > 0 && paintedHeld && !whileHeld.pressNote,
        JSON.stringify({ synopsisActions: synopsisIds.size, readsHeld: caught.held, parts: whileHeld }));
      release();
      const noteAfter = await held.waitForFunction(() => Boolean(window.__parts.pressNote), null, { timeout: 30_000 })
        .then(() => true, () => false);
      report(at("and the credit note arrives once the read is released"), noteAfter, noteAfter ? "drawn" : "never drawn");
      // THE HUB DOES NOT MOVE WHEN IT LANDS (Hugh, 2026-10-15): the empty state holds the note's frame from
      // its first frame. Before, the note pushed the hub down once, 56px at 1300 and 35px at 390. The held
      // read makes the landing late, well after the hub's first frame, so a move cannot hide in one frame.
      await held.waitForTimeout(1_000);
      const hubTops = await held.evaluate(() => window.__hubTops);
      if (HUB === "on") {
        const first = hubTops[0]?.top ?? null;
        report(at("the Tuning hub stays put from its first frame through the credit note's landing"),
          first !== null && noteAfter && hubTops.every((t) => Math.abs(t.top - first) <= 1),
          JSON.stringify({ tops: hubTops, noteAt: (await held.evaluate(() => window.__parts.pressNote ?? null)) }));
      } else {
        console.log(`  info  ${at("PROBE_HUB=off: the hub's stillness is not checked")} — ${JSON.stringify(hubTops)}`);
      }
      await held.unrouteAll({ behavior: "ignoreErrors" });
      await held.close();

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
    // Each step on its own, so one failing cannot skip the rest.
    let overviews = 0;
    for (const [id, before] of created.synopses) {
      try {
        const calls = (await sql`
          delete from deck_synopses where deck_id = ${id} and not (id = any(${before}::uuid[]))
          returning model_call_id`).map((r) => r.model_call_id);
        overviews += calls.length;
        if (calls.length > 0) await sql`delete from model_calls where id = any(${calls}::uuid[])`;
      } catch (error) {
        console.error(`cleanup: the overview on ${id} was left behind:`, error.message);
      }
    }
    for (const id of created.profiles) {
      try {
        await sql`delete from deck_profiles where deck_id = ${id}`;
      } catch (error) {
        console.error(`cleanup: the reading on ${id} was left behind:`, error.message);
      }
    }
    console.log(`cleaned up ${created.profiles.size} reading(s) and ${overviews} overview(s) this run wrote`);
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
