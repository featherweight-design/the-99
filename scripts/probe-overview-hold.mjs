// probe:overview-hold — a first Analyze that also writes the overview, at 1300x900 and 390x844
// (Hugh's ruling, 2026-09-26; the overview-loading addendum).
//
// The press holds the empty state's loader through the write, its heading stepping from reading the
// deck to writing the overview, and lets go once, onto the verdict, the written overview and
// Suggested changes together. Nothing may move afterwards. Past `OVERVIEW_HOLD_MS` it lets go onto
// the verdict with the slot's status line instead, and the overview grows in place when it lands.
//
// Which path is walked is the server's to decide, by how long its stub takes: run the dev server
// with SYNOPSIS_STUB_DELAY_MS=3000 and PROBE_HOLD=held, then with SYNOPSIS_STUB_DELAY_MS=30000 and
// PROBE_HOLD=fallback. The stub spends nothing. The press writes a reading and an overview onto a
// deck that had neither; both are deleted again in a `finally`, with the overview's ledger unit, so
// the account keeps its credits. Point PROBE_TARGET_URL at a scratch branch or local-dev, never
// production.
//
//   PROBE_TARGET_URL=<local-dev> PROBE_EMAIL=<+clerk_test account> PROBE_HOLD=held \
//     PROBE_BASE=http://localhost:3260 node scripts/probe-overview-hold.mjs

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY"]);
const TARGET = process.env.PROBE_TARGET_URL;
const EMAIL = process.env.PROBE_EMAIL ?? E2E_AUDIT_USER_EMAIL;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const MODE = process.env.PROBE_HOLD;
if (!TARGET) throw new Error("Set PROBE_TARGET_URL to a scratch branch or local-dev.");
if (!EMAIL.includes("+clerk_test")) throw new Error("PROBE_EMAIL must be a +clerk_test account.");
if (MODE !== "held" && MODE !== "fallback") throw new Error("Set PROBE_HOLD to held or fallback, matching the server's SYNOPSIS_STUB_DELAY_MS.");
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const HOLD_MS = 25_000;
const READING = "Reading your deck…";
const WRITING = "Writing the overview…";
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

// Stamps each part's first visible frame and top, every heading the loader shows, and every top the
// verdict and the overview take afterwards, so a move after the first paint is seen.
const OBSERVE = () => {
  const parts = {
    verdict: "[data-testid='verdict-cell']",
    overview: "[data-testid='synopsis-overview']",
    written: "[data-testid='synopsis-overview'] p[class*='text-[var(--fg-body)]']",
    writing: "[data-testid='overview-writing']",
    tuning: "section[aria-labelledby='tuning-heading']",
  };
  const w = { seen: {}, headings: [], tops: { verdict: new Set(), overview: new Set() }, said: [] };
  window.__hold = w;
  const t0 = performance.now();
  const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  const look = () => {
    const panel = document.querySelector("#panel-analysis");
    if (!panel) return;
    const now = Math.round(performance.now() - t0);
    for (const [name, sel] of Object.entries(parts)) {
      if (w.seen[name]) continue;
      const el = [...panel.querySelectorAll(sel)].find(visible);
      if (el) w.seen[name] = { at: now, top: Math.round(el.getBoundingClientRect().top + window.scrollY) };
    }
    const h = panel.querySelector("[data-testid='analysis-empty'] h2");
    if (h && w.headings.at(-1)?.text !== h.textContent) w.headings.push({ at: now, text: h.textContent });
    for (const name of ["verdict", "overview"]) {
      const el = [...panel.querySelectorAll(parts[name])].find(visible);
      if (el) w.tops[name].add(Math.round(el.getBoundingClientRect().top + window.scrollY));
    }
    // Each announcement once, in the order it was first said: two regions can hold text at once.
    for (const s of panel.querySelectorAll("p.sr-only[role='status']")) {
      if (s.textContent && !w.said.includes(s.textContent)) w.said.push(s.textContent);
    }
  };
  new MutationObserver(look).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
  const tick = () => { look(); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:overview-hold refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  // Filled BEFORE the press each one covers: the deck, and the overview rows it held already.
  const created = new Map();
  try {
    for (const width of [1300, 390]) {
      const at = (s) => `${s} @ ${width}`;
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      const userId = await signIn(page);
      // A whole deck with no reading and no overview: the press is a first press that writes.
      const [deck] = await sql`
        select d.id, d.name from decks d where d.user_id = ${userId}
          and not exists (select 1 from deck_profiles p where p.deck_id = d.id)
          and not exists (select 1 from deck_synopses s where s.deck_id = d.id)
          and (select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id) >= 98
        order by d.name limit 1`;
      if (!deck) throw new Error("The account has no whole deck without a reading and an overview.");
      created.set(deck.id, (await sql`select id from deck_synopses where deck_id = ${deck.id}`).map((r) => r.id));

      await page.addInitScript(OBSERVE);
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
      await page.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().click();
      const empty = page.locator(`${PAGE} [data-testid='analysis-empty']`).first();
      await empty.waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
      const note = await page.locator(`${PAGE} [data-testid='analysis-empty'] [data-testid='press-note']`).first().textContent().catch(() => null);
      if (!report(at(`the press on ${deck.name} writes the overview`), /overview/.test(note ?? "") && !/Reads the bracket only/.test(note ?? ""), JSON.stringify(note))) {
        await context.close();
        continue;
      }
      await page.evaluate(() => { const w = window.__hold; w.seen = {}; w.headings = []; w.tops.verdict.clear(); w.tops.overview.clear(); w.said = []; });
      await empty.getByRole("button", { name: "Analyze" }).click();
      await page.locator(`${PAGE} [data-testid='verdict-cell']`).first().waitFor({ timeout: 90_000 });
      if (MODE === "fallback") {
        await page.locator(`${PAGE} [data-testid='synopsis-overview'] button`, { hasText: "View full overview" }).first().waitFor({ timeout: 90_000 });
      }
      // Long enough for anything that would move after the paint to have moved.
      await page.waitForTimeout(2_500);
      const w = await page.evaluate(() => {
        const x = window.__hold;
        return { seen: x.seen, headings: x.headings, tops: { verdict: [...x.tops.verdict], overview: [...x.tops.overview] }, said: x.said };
      });

      const heads = w.headings.map((h) => h.text);
      report(at("the loader steps from reading the deck to writing the overview"),
        heads.indexOf(READING) >= 0 && heads.indexOf(WRITING) > heads.indexOf(READING), JSON.stringify(w.headings));
      const writingAt = w.headings.find((h) => h.text === WRITING)?.at ?? null;
      const released = w.seen.verdict?.at ?? null;
      if (MODE === "held") {
        report(at("the verdict and Suggested changes paint in one frame"),
          released !== null && w.seen.tuning?.at === released, JSON.stringify({ verdict: w.seen.verdict, tuning: w.seen.tuning }));
        report(at("the written overview paints with them, never the status line"),
          w.seen.written?.at === released && !w.seen.writing, JSON.stringify({ written: w.seen.written, writing: w.seen.writing ?? null }));
        report(at("nothing moves after the first paint"),
          w.tops.verdict.length === 1 && w.tops.overview.length === 1, JSON.stringify(w.tops));
        report(at("announced once, together"),
          w.said.length === 1 && /^Analysis ready\..*Overview ready\.$/.test(w.said[0]), JSON.stringify(w.said));
      } else {
        const held = writingAt !== null && released !== null ? released - writingAt : null;
        report(at(`the hold lets go near its ${HOLD_MS / 1000}s limit, not at the write`),
          held !== null && held >= HOLD_MS - 1_000 && held <= HOLD_MS + 3_000, `${held}ms from "${WRITING}" to the verdict`);
        report(at("the slot shows the status line with the verdict"),
          w.seen.writing?.at === released, JSON.stringify({ writing: w.seen.writing ?? null, verdict: w.seen.verdict }));
        report(at("the overview lands after, in its slot"),
          (w.seen.written?.at ?? 0) > released, JSON.stringify(w.seen.written ?? null));
        // Next runs a page's server actions one at a time, so Suggested changes' read waits behind
        // the write and lands with the overview, below everything else: it moves nothing above it.
        report(at("Suggested changes lands with the overview, at the foot"),
          w.seen.tuning && w.seen.written && w.seen.tuning.at >= released && w.seen.tuning.at <= w.seen.written.at + 1_000
            && w.seen.tuning.top > w.seen.verdict.top,
          JSON.stringify({ tuning: w.seen.tuning ?? null, written: w.seen.written ?? null }));
        // The one-time growth Hugh accepted for a slow run: measured, not failed.
        console.log(`  info  ${at("the verdict's tops after the paint")} — ${JSON.stringify(w.tops.verdict)}`);
        report(at("said twice: the verdict, then the overview"),
          w.said.length === 2 && /^Analysis ready\.[^]*[^.]\.$/.test(w.said[0]) && !/Overview ready/.test(w.said[0]) && w.said[1] === "Overview ready.",
          JSON.stringify(w.said));
      }
      await context.close();
    }
  } finally {
    await browser.close();
    // Each step on its own, so one failing cannot skip the rest.
    for (const [id, before] of created) {
      try {
        const calls = (await sql`
          delete from deck_synopses where deck_id = ${id} and not (id = any(${before}::uuid[]))
          returning model_call_id`).map((r) => r.model_call_id).filter(Boolean);
        if (calls.length > 0) await sql`delete from model_calls where id = any(${calls}::uuid[])`;
      } catch (error) {
        console.error(`cleanup: the overview on ${id} was left behind:`, error.message);
      }
      try {
        await sql`delete from deck_profiles where deck_id = ${id}`;
      } catch (error) {
        console.error(`cleanup: the reading on ${id} was left behind:`, error.message);
      }
    }
    console.log(`cleaned up ${created.size} deck(s)`);
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
