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
// legal, whole deck with no overview; both are deleted again in a `finally`, with the overview's
// ledger unit, so the account keeps its credits. A reading the deck ALREADY had is held on disk
// first (`profile-hold.mjs`) and put back in that `finally`: the only legal whole decks the
// local-dev fixture account holds have one. Point PROBE_TARGET_URL at a scratch branch or local-dev, never
// production.
//
// The Tuning hub is always on: it stands from the tab's first frame (#1809), so the check is the hub
// staying put, as the same node, from its first frame (the credit note landing under the empty state
// included) through the press to the frame the verdict lands. See `hubStaysPut`. Mana Balance is what
// lets the hub draw on a deck with no reading yet (`drawn` in builder-shell.tsx).
//
//   PROBE_TARGET_URL=<local-dev> PROBE_EMAIL=<+clerk_test account> PROBE_HOLD=held \
//     PROBE_BASE=http://localhost:3260 node scripts/probe-overview-hold.mjs

import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertModelStandIn, pageGet } from "./lib/model-stand-in.mjs";
import { PAGE } from "./lib/surface.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";
import { holdProfile } from "./lib/profile-hold.mjs";
import { judgeHubMove, NOTE_SHAPE } from "./lib/note-variant.mjs";

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
const READING = "Working out your bracket…";
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
// verdict and the overview take afterwards, so a move after the first paint is seen. The geometry is
// SAMPLED in requestAnimationFrame, every part and the hub in one pass with the frame's own timestamp
// and a frame counter, so two stamps share a frame exactly when they were drawn in the same painted
// frame. Only the announcements are also read on mutations: a status line can change between frames.
const OBSERVE = () => {
  const parts = {
    verdict: "[data-testid='verdict-cell']",
    overview: "[data-testid='synopsis-overview']",
    written: "[data-testid='synopsis-overview'] p[class*='text-[var(--fg-body)]']",
    writing: "[data-testid='overview-writing']",
    tuning: "section[aria-labelledby='tuning-heading']",
  };
  // The Tuning hub, sampled every frame from the panel's first: when it first drew, every top it took
  // (with the frame it moved on), frames it was missing once drawn, and whether its node was replaced.
  // `noteAt`: the credit note's first frame, which lands after the empty state (#1465).
  const hub = { panelAt: null, at: null, noteAt: null, node: null, replaced: false, missing: 0, tops: [] };
  const t0 = performance.now();
  const w = { t0, seen: {}, headings: [], tops: { verdict: new Set(), overview: new Set() }, said: [], hub };
  window.__hold = w;
  const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden";
  let frame = 0;
  const sample = (ts) => {
    frame += 1;
    const panel = document.querySelector("#panel-analysis");
    if (!panel) {
      // Once drawn, a hub whose whole panel is gone is a missing hub.
      if (hub.node !== null) hub.missing += 1;
      return;
    }
    const now = Math.round(ts - t0);
    if (hub.panelAt === null && visible(panel)) hub.panelAt = now;
    const h0 = panel.querySelector("section[data-tuning-hub]");
    if (h0 && visible(h0)) {
      if (hub.node === null) { hub.node = h0; hub.at = now; } else if (hub.node !== h0) hub.replaced = true;
      const top = Math.round((h0.getBoundingClientRect().top + window.scrollY) * 10) / 10;
      if (hub.tops.length === 0 || Math.abs(hub.tops.at(-1).top - top) > 0.5) hub.tops.push({ at: now, frame, top });
    } else if (hub.node !== null) hub.missing += 1;
    if (hub.noteAt === null && [...panel.querySelectorAll("[data-testid='press-note']")].some(visible)) hub.noteAt = now;
    for (const [name, sel] of Object.entries(parts)) {
      if (w.seen[name]) continue;
      const el = [...panel.querySelectorAll(sel)].find(visible);
      if (el) w.seen[name] = { at: now, frame, top: Math.round(el.getBoundingClientRect().top + window.scrollY) };
    }
    const h = panel.querySelector("[data-testid='analysis-empty'] h2");
    if (h && w.headings.at(-1)?.text !== h.textContent) w.headings.push({ at: now, text: h.textContent });
    for (const name of ["verdict", "overview"]) {
      const el = [...panel.querySelectorAll(parts[name])].find(visible);
      if (el) w.tops[name].add(Math.round(el.getBoundingClientRect().top + window.scrollY));
    }
    listen();
  };
  // Each announcement once, in the order it was first said: two regions can hold text at once.
  const listen = () => {
    for (const s of document.querySelectorAll("#panel-analysis p.sr-only[role='status']")) {
      if (s.textContent && !w.said.includes(s.textContent)) w.said.push(s.textContent);
    }
  };
  new MutationObserver(listen).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
  const tick = (ts) => { sample(ts); requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};

// Deletes what a press wrote onto the deck, the overview's ledger unit with it, each step on its
// own so one failing cannot skip the rest. Run after each width, so both widths press the same deck
// from the same state, and again in the `finally`.
async function reset(id, before) {
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

// The Tuning hub (#1809, tuning-hub-stays-put): drawn from the tab's first frame, the
// same node throughout, never missing once drawn, and its top still (within 1px) from the press, through
// the hold, to the frame the verdict lands. At that frame the reading is drawn ABOVE the hub, so the hub
// moves down by the reading's height by design (#1809's own probe asserts the same); what is held there
// is that it moves only on a landing frame: the verdict's, and on the fallback the overview's too. Frames
// are the sampler's own counter, so "the landing frame" is the painted frame the verdict appeared in.
//
// AND BEFORE THE PRESS, from the hub's first frame (Hugh, 2026-10-15). The credit note lands under the
// empty state about 0.7 to 2s after it (#1465), and until its frame was reserved it pushed the hub down
// once, 56px at 1300 and 35px at 390. The empty state now holds two of the note's lines from its first
// frame, so a note of up to two lines (the credit, free and check notes) must move nothing; a longer one
// (used up, owner share) may move it by its extra lines and no more, and is named in the line. A
// note the probe does not recognise fails (`scripts/lib/note-variant.mjs`).
function hubStaysPut(at, hub, pressAt, released, landings, shape) {
  report(at("the Tuning hub is drawn from the tab's first frame"),
    // Both are stamped by the same frame sampler, so a hub mounted with its panel shares its frame exactly.
    hub.at !== null && hub.panelAt !== null && hub.at === hub.panelAt,
    JSON.stringify({ panel: hub.panelAt, hub: hub.at }));
  report(at("it is one node, never missing once drawn"), hub.at !== null && !hub.replaced && hub.missing === 0,
    JSON.stringify({ replaced: hub.replaced, missingFrames: hub.missing }));
  const idle = hub.tops.filter((t) => t.at <= pressAt);
  const judged = judgeHubMove(idle.map((t) => t.top), shape);
  report(at(judged.strict
    ? `its top stays put from its first frame to the press, the ${judged.variant} note's landing included`
    : `its top moves by at most the ${judged.variant} note's lines past the reserved two, before the press`),
    hub.noteAt !== null && judged.ok,
    JSON.stringify({ variant: judged.variant, moved: judged.moved, allowed: judged.allowed, lines: shape?.lines ?? null, tops: idle, creditNoteAt: hub.noteAt, pressAt }));
  const settled = idle.at(-1)?.top ?? null;
  // `released` and `landings` are sampler FRAMES; `pressAt` is a time, stamped by the click itself.
  const held = hub.tops.filter((t) => t.at > pressAt && (released === null || t.frame < released));
  report(at("its top stays put from the press to the analysis landing"),
    settled !== null && released !== null && held.every((t) => Math.abs(t.top - settled) <= 1),
    JSON.stringify({ settled, moves: held, landingFrame: released }));
  const after = hub.tops.filter((t) => released !== null && t.frame >= released);
  report(at("and after, moves only on a landing frame"),
    released !== null && after.every((t) => landings.includes(t.frame)),
    JSON.stringify({ landings, moves: after }));
}

async function run() {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  if (!branch || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`probe:overview-hold refuses branch ${branch ?? "(unknown)"}; point PROBE_TARGET_URL at local-dev or a scratch branch.`);
  }
  await clerkSetup();
  const browser = await chromium.launch();
  // Filled BEFORE the press each one covers: the deck, and the overview rows it held already.
  const created = new Map();
  let deck = null;
  // Set once the deck's own reading is held on disk; called last in the `finally`.
  let restoreProfile = null;
  try {
    // 1024, 900 and 800 are the desktop layout narrower than 1300 (PR #1844, round 1). At 800 Analyze, the
    // 20px gap and the note's 340px do not fit one row (measured: the row is 440px), so the note wraps under
    // the button; before its frame took the note's width as well, the empty frame fit beside the button and
    // the hub dropped 46px when the note landed. 1024 and 900 keep the note beside the button. PROBE_WIDTHS
    // narrows the list.
    const widths = (process.env.PROBE_WIDTHS ?? "1300,1024,900,800,390").split(",").map(Number);
    for (const width of widths) {
      const at = (s) => `${s} @ ${width}`;
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 } });
      const page = await context.newPage();
      const userId = await signIn(page);
      // THE SPEND GUARD, before any press: the first Analyze writes the overview.
      await assertModelStandIn(BASE, ["synopsis"], { get: pageGet(page) });
      // A legal, whole deck with no overview: the press is a first press that writes, once its reading
      // is held and cleared below. Chosen once, and reset after each width, so both widths measure the
      // same deck.
      if (!deck) [deck] = await sql`
        select d.id, d.name from decks d where d.user_id = ${userId}
          and not exists (select 1 from deck_synopses s where s.deck_id = d.id)
          -- WHOLE, exactly (\`deckLegality\`): 99 for a single commander, 98 for a pair. \`>= 98\` let a
          -- single at 98 through, and the analysis reads such a deck as bracket-only.
          and (select coalesce(sum(quantity), 0) from deck_cards c where c.deck_id = d.id)
            = case when d.partner_oracle_id is null then 99 else 98 end
          -- And LEGAL: no card the format bans or the commanders' identity excludes, the COMMANDERS
          -- included. The first version picked "Version fixture - reads differently, single", led
          -- by "Brims" Barone, which is not Commander-legal, so the analysis read it bracket-only.
          and not exists (
            select 1 from cards cm
            where cm.oracle_id in (d.commander_oracle_id, d.partner_oracle_id) and not cm.commander_legal
          )
          and not exists (
            select 1 from deck_cards c join cards k on k.oracle_id = c.oracle_id
            where c.deck_id = d.id
              and (not k.commander_legal or not (k.color_identity <@ (
                select coalesce(array_agg(distinct ci), '{}') from cards cm, unnest(cm.color_identity) ci
                where cm.oracle_id in (d.commander_oracle_id, d.partner_oracle_id)
              )))
          )
        order by d.name limit 1`;
      if (!deck) throw new Error("The account has no legal, whole deck without an overview.");
      if (!restoreProfile) {
        restoreProfile = await holdProfile(sql, deck.id);
        await sql`delete from deck_profiles where deck_id = ${deck.id}`;
      }
      if (!created.has(deck.id)) created.set(deck.id, (await sql`select id from deck_synopses where deck_id = ${deck.id}`).map((r) => r.id));

      await page.addInitScript(OBSERVE);
      await page.goto(`${BASE}/decks/${deck.id}`, { waitUntil: "domcontentloaded" });
      await page.locator(`${PAGE} [role='tab']:visible`, { hasText: "Analysis" }).first().click();
      const empty = page.locator(`${PAGE} [data-testid='analysis-empty']`).first();
      await empty.waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1_500);
      const note = await page.locator(`${PAGE} [data-testid='analysis-empty'] [data-testid='press-note']`).first().textContent().catch(() => null);
      if (!report(at(`the press on ${deck.name} writes the overview`), /overview/.test(note ?? "") && !/Reads the bracket only/.test(note ?? ""), JSON.stringify(note))) {
        await context.close();
        await reset(deck.id, created.get(deck.id));
        continue;
      }
      await page.evaluate(() => { const w = window.__hold; w.seen = {}; w.headings = []; w.tops.verdict.clear(); w.tops.overview.clear(); w.said = []; });
      // The boundary is the click itself, not the moment before Playwright's actionability wait: the sampler
      // must already hold the credit note's frame (the hub must not move when it lands, #1465), and the
      // press time is stamped in the page by the click's own event.
      await page.waitForFunction(() => window.__hold.hub.noteAt !== null, null, { timeout: 30_000 });
      const shape = await page.evaluate(NOTE_SHAPE, PAGE);
      await page.evaluate(() => {
        const w = window.__hold;
        w.pressAt = null;
        document.addEventListener("click", () => { w.pressAt ??= Math.round(performance.now() - w.t0); }, { capture: true, once: true });
      });
      await empty.getByRole("button", { name: "Analyze" }).click();
      const pressAt = await page.evaluate(() => window.__hold.pressAt);
      await page.locator(`${PAGE} [data-testid='verdict-cell']`).first().waitFor({ timeout: 90_000 });
      if (MODE === "fallback") {
        await page.locator(`${PAGE} [data-testid='synopsis-overview'] button`, { hasText: "View full overview" }).first().waitFor({ timeout: 90_000 });
      }
      // Long enough for anything that would move after the paint to have moved.
      await page.waitForTimeout(2_500);
      const w = await page.evaluate(() => {
        const x = window.__hold;
        // Every field but the node itself, which cannot leave the page.
        const hub = { panelAt: x.hub.panelAt, at: x.hub.at, noteAt: x.hub.noteAt, replaced: x.hub.replaced, missing: x.hub.missing, tops: x.hub.tops };
        return { seen: x.seen, headings: x.headings, tops: { verdict: [...x.tops.verdict], overview: [...x.tops.overview] }, said: x.said, hub };
      });

      const heads = w.headings.map((h) => h.text);
      report(at("the loader steps from reading the deck to writing the overview"),
        heads.indexOf(READING) >= 0 && heads.indexOf(WRITING) > heads.indexOf(READING), JSON.stringify(w.headings));
      const writingAt = w.headings.find((h) => h.text === WRITING)?.at ?? null;
      const released = w.seen.verdict?.at ?? null;
      // On the fallback the overview also grows in place when it lands (the growth Hugh accepted), so
      // the hub may move on that frame too.
      const landed = w.seen.verdict?.frame ?? null;
      const landings = MODE === "fallback" && w.seen.written ? [landed, w.seen.written.frame] : [landed];
      hubStaysPut(at, w.hub, pressAt, landed, landings, shape);
      if (MODE === "held") {
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
        // The one-time growth Hugh accepted for a slow run: measured, not failed.
        console.log(`  info  ${at("the verdict's tops after the paint")} — ${JSON.stringify(w.tops.verdict)}`);
        report(at("said twice: the verdict, then the overview"),
          w.said.length === 2 && /^Analysis ready\.[^]*[^.]\.$/.test(w.said[0]) && !/Overview ready/.test(w.said[0]) && w.said[1] === "Overview ready.",
          JSON.stringify(w.said));
      }
      await context.close();
      await reset(deck.id, created.get(deck.id));
    }
  } finally {
    await browser.close();
    // Each step on its own, so one failing cannot skip the rest.
    for (const [id, before] of created) await reset(id, before);
    console.log(`cleaned up ${created.size} deck(s)`);
    // After the reset, which deletes whatever reading the run left: this puts the deck's own back.
    if (restoreProfile) {
      try {
        await restoreProfile();
      } catch (error) {
        // Counted as a failure, not only an exit code: the line below sets the code from `failures`,
        // and a restore that failed has left the reader's saved analysis missing.
        console.error(`cleanup: ${error.message}`);
        failures += 1;
      }
    }
  }
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
