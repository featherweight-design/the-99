// probe:ai-sweep — the shared `.ai-sweep` border rides each AI tool WHILE its read runs and is gone
// once the result lands, in a real browser at 1300x900 and 390x844 (Hugh, 2026-10-13: option 1, the
// conic sweep, for Help me choose, Suggested changes, Proposed cuts and Find a deck's read).
//
// jsdom lays nothing out and computes no pseudo-element styles, so this reads the page:
//  - ON while running: the host carries `.ai-sweep`, its ring (`::before`) runs the `ai-sweep`
//    animation and paints a conic gradient, in the tool's own theme accent.
//  - REDUCED MOTION: the same host under `prefers-reduced-motion: reduce` has no animation and a
//    plain accent ring (the static border).
//  - OFF afterward: once the read settles, nothing on the page carries `.ai-sweep`. A sweep left
//    running behind a finished answer is the one failure this exists to catch.
//
// The models are the held stand-ins, so no model is called. Help me choose and Find a deck's read still
// SPEND a stand-in credit when they succeed; the probe deletes what it made (see `cleanStandIns`). THE SERVER MUST BE
// STARTED WITH the switches below and the three delays, or the probe cannot hold a read open:
//   ANALYSIS_TAB_ENABLED=true TUNING_ENABLED=true PROPOSED_CUTS_ENABLED=true HELP_ME_CHOOSE_ENABLED=true
//   SWAP_TOOLS_ENABLED=true FIND_A_DECK_READ_ENABLED=true TUNING_STUB_DELAY_MS=9000
//   INTAKE_STUB_DELAY_MS=10000 FITS_READ_STUB_DELAY_MS=10000
// Writes runs, reads and credit rows (and clones one over-100 deck for Proposed cuts, deleted in a
// `finally`). Point DATABASE_URL at `local-dev` or a scratch branch: it refuses staging and production.
//
//   PROBE_BASE=http://localhost:3047 pnpm probe:ai-sweep
//   PROBE_CUTS_DECK=<id> names the over-100 deck to clone; PROBE_SHOTS=<dir> saves one shot per leg.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { onPageRole, PAGE } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
const sql = neon(DATABASE_URL);

const PRODUCTION = "br-noisy-violet-a6vw4ess";
const STAGING = "br-polished-pond-a6e63y0b";
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
if (!branch || branch === PRODUCTION || branch === STAGING) throw new Error(`refusing branch ${branch ?? "(unknown)"}`);

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
  return ok;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** A cleanup that fails leaves rows behind on a shared database: count it, and keep going with the rest. */
async function tidy(label, run) {
  try {
    await run();
  } catch (error) {
    report(`cleanup: ${label}`, false, String(error?.message ?? error));
  }
}
const WIDTHS = [{ width: 1300, height: 900 }, { width: 390, height: 844 }];

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await signIn.create({ identifier: email }) : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return `${email} offers no email_code first factor.`;
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user?.id ?? null);
}


/** What the ring of every `.ai-sweep` host inside the page draws right now. */
const ringOf = (page, hostSelector) =>
  page.evaluate((sel) => {
    const hosts = [...document.querySelectorAll(sel)];
    return hosts.map((el) => {
      const ring = getComputedStyle(el, "::before");
      return { cls: el.classList.contains("ai-sweep"), anim: ring.animationName, bg: ring.backgroundImage, w: Math.round(el.getBoundingClientRect().width) };
    });
  }, hostSelector);
// The whole document, dialogs included: a picker draws outside <main>.
const anySweep = (page) => page.evaluate(() => document.querySelectorAll(".ai-sweep").length);

/** While the read runs: the class is on, the ring animates, then reduced motion holds it still, then the read settles and it is gone. */
async function check(page, label, hostSelector, settled, shotName) {
  const tag = `${label} @${page.viewportSize().width}`;
  let hosts = [];
  // Up to 30s: on a dev server a press can wait on a cold route compile before its running state draws.
  for (let i = 0; i < 200 && hosts.length === 0; i += 1) {
    hosts = (await ringOf(page, hostSelector)).filter((h) => h.cls);
    if (hosts.length === 0) await sleep(150);
  }
  report(`${tag}: the running read carries .ai-sweep`, hosts.length > 0, `${hosts.length} host(s)`);
  if (hosts.length === 0) {
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/ai-sweep-miss-${shotName}-${page.viewportSize().width}.png` });
    return;
  }
  report(`${tag}: its ring runs the sweep on a conic gradient`, hosts.every((h) => h.anim === "ai-sweep" && h.bg.includes("conic-gradient")), `${hosts[0].anim} / ${hosts[0].bg.slice(0, 24)}`);
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/ai-sweep-${shotName}-${page.viewportSize().width}.png`, fullPage: false });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const still = (await ringOf(page, hostSelector)).filter((h) => h.cls);
  report(`${tag}: reduced motion holds the ring still, as a plain accent border`, still.length > 0 && still.every((h) => h.anim === "none" && !h.bg.includes("conic")), `${still[0]?.anim} / ${still[0]?.bg.slice(0, 24)}`);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  let gone = false;
  for (let i = 0; i < 160 && !gone; i += 1) {
    gone = await settled(page);
    if (!gone) await sleep(250);
  }
  report(`${tag}: the read settled`, gone, gone ? "result drawn" : "still running after 40s");
  // The settle signal is the caller's own (a run row, a phase, the band's test id), never the class; the
  // page may take a beat after it to draw the result, so give the class up to 10s to leave.
  let left = await anySweep(page);
  for (let i = 0; i < 40 && left > 0; i += 1) {
    await sleep(250);
    left = await anySweep(page);
  }
  report(`${tag}: nothing carries .ai-sweep once it has`, left === 0, `${left} left`);
}

async function accountDeckIds(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} a[href^='/decks/']`, { timeout: 20_000 }).catch(() => {});
  return page.evaluate((scope) => [...(document.querySelector(scope)?.querySelectorAll("a[href^='/decks/']") ?? [])]
    .map((a) => a.getAttribute("href").split("/")[2]).filter((id) => /^[0-9a-f-]{36}$/.test(id)), PAGE);
}

async function openAnalysis(page, deckId, heading) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = onPageRole(page, "tab", /analysis/i).first();
  await tab.waitFor({ timeout: 30_000 });
  await tab.click();
  await page.locator(`${PAGE} button[aria-label^="${heading}"]`).first().click({ timeout: 30_000 });
  await onPageRole(page, "heading", heading).first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);
}

const startedAt = new Date().toISOString();
const made = [];
const reads = [];
const gone = (sel) => (page) => page.evaluate((s) => !document.querySelector(s), sel);

async function toolLeg(browser, size, label, tool, deckId, heading, button, host, shot) {
  const known = new Set((await sql`select id from deck_suggestion_runs where deck_id = ${deckId} and tool = ${tool}`).map((r) => r.id));
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  try {
    await signIn(page);
    await openAnalysis(page, deckId, heading);
    await onPageRole(page, "button", button).first().click();
    let found = null;
    for (let i = 0; i < 100; i += 1) {
      const run = (await sql`select id, model_call_id from deck_suggestion_runs where deck_id = ${deckId} and tool = ${tool} order by created_at desc limit 1`).find((r) => !known.has(r.id));
      if (run) { found = run; made.push(run); break; }
      await sleep(150);
    }
    report(`${label} @${size.width}: the press reserved a run`, found !== null, found?.id ?? "no new run row");
    // Settled is the RUN's status, not the class going: a regression that dropped the class early
    // would otherwise satisfy both the wait and the assertion after it.
    await check(page, label, host, async () => {
      const [row] = await sql`select status from deck_suggestion_runs where id = ${found?.id}`;
      return !!row && row.status !== "pending";
    }, shot);
  } finally {
    await context.close();
  }
}

async function chooseLeg(browser, size) {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.goto(`${BASE}/decks/new/choose`, { waitUntil: "networkidle" });
    await page.locator(`${PAGE} textarea`).fill(`big dumb lizards that stomp ${size.width} ${Date.now()}`);
    await page.locator(`${PAGE} form button[type='submit']`).filter({ visible: true }).first().click();
    await check(page, "Help me choose", "[data-testid='read-panel']", (p) => p.evaluate((scope) => !document.querySelector(scope).querySelector("[data-testid='results-searching']") && !!document.querySelector(scope).querySelector("[data-testid='order-line']"), PAGE), "choose");
    const r = new URL(page.url()).searchParams.get("r");
    if (r) reads.push(r);
  } finally {
    await context.close();
  }
}

async function findDeckLeg(browser, size, card) {
  const context = await browser.newContext({ viewport: size });
  const page = await context.newPage();
  try {
    await signIn(page);
    await page.goto(`${BASE}/collection?view=grid&q=${encodeURIComponent(card)}`, { waitUntil: "networkidle" });
    await page.locator(`${PAGE} button:has(div[style*="aspect-ratio"])`).first().click();
    try {
      // A phone opens the card as a collapsed sheet: its doors are behind "All details".
      const door = page.getByRole("button", { name: `Find a deck for ${card}` }).first();
      if (size.width < 500) await page.getByRole("button", { name: /^All details/ }).first().click({ timeout: 10_000 });
      await door.click({ timeout: 10_000 });
      await page.getByRole("button", { name: /^Which deck needs/ }).first().click({ timeout: 15_000 });
    } catch (error) {
      if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/ai-sweep-find-a-deck-miss-${size.width}.png` });
      throw error;
    }
    await check(page, "Find a deck's read", "[data-testid='read-band-running']", gone("[data-testid='read-band-running']"), "find-a-deck");
  } finally {
    await context.close();
  }
}

/** An owned card with at least one deck the picker can offer: any owned card the account has a deck without. */
async function pickCard(userId) {
  const [row] = await sql`
    select c.name from collection_items ci join cards c on c.oracle_id = ci.oracle_id
    where ci.user_id = ${userId} and c.name not like '%//%'
      and not exists (select 1 from deck_cards dc join decks d on d.id = dc.deck_id where d.user_id = ${userId} and dc.oracle_id = ci.oracle_id)
    order by c.name limit 1`;
  return row?.name ?? null;
}

/**
 * Help me choose and Find a deck's read SPEND a (stand-in) credit when they succeed, and a stored read
 * stands in place of the offer on the next visit: take back what this run made. Scoped to the signed-in
 * account, to the stand-in's own model name and to calls created since this run began, so another
 * account's run on a shared database is never touched. Run between widths as well as at the end.
 */
async function cleanStandIns(userId) {
  const calls = (await sql`select id from model_calls where user_id = ${userId} and model = 'stub' and feature in ('intake', 'fits_read') and created_at >= ${startedAt}`).map((r) => r.id);
  if (calls.length === 0) return;
  await tidy("fits reads", () => sql`delete from fits_reads where model_call_id = any(${calls}::uuid[])`);
  await tidy("intake reads", () => sql`delete from intake_reads where model_call_id = any(${calls}::uuid[])`);
  await tidy("stand-in calls", () => sql`delete from model_calls where id = any(${calls}::uuid[])`);
}

async function cleanup(userId) {
  for (const run of made) {
    await tidy(`run ${run.id}`, () => sql`delete from deck_suggestion_runs where id = ${run.id}`);
    if (run.model_call_id) await tidy(`call ${run.model_call_id}`, () => sql`delete from model_calls where id = ${run.model_call_id}`);
  }
  for (const r of reads) await tidy(`read ${r}`, () => sql`delete from intake_reads where id = ${r}::uuid`);
  if (userId) await tidy("stand-in calls", () => cleanStandIns(userId));
}

let cloneId = null;
let accountId = null;
const browser = await chromium.launch();
try {
  await clerkSetup();
  const setup = await (await browser.newContext()).newPage();
  const userId = await signIn(setup);
  accountId = userId;
  const ids = await accountDeckIds(setup);
  const source = process.env.PROBE_CUTS_DECK
    ?? (await sql`select d.id from decks d join deck_cards c on c.deck_id = d.id
        group by d.id, d.partner_oracle_id having sum(c.quantity) + 1 + (d.partner_oracle_id is not null)::int > 100 limit 1`)[0]?.id;
  if (!report("an over-100 deck to clone for Proposed cuts", !!source, source ?? "none on this database; set PROBE_CUTS_DECK")) throw new Error("no deck to clone");
  const [{ user_id: owner }] = await sql`select user_id from decks where id = ${ids[0]}`;
  cloneId = randomUUID();
  const cols = (await sql.query(`select column_name from information_schema.columns where table_name = 'decks' order by ordinal_position`)).map((r) => r.column_name);
  const select = cols.map((c) => (c === "id" ? "$1::uuid" : c === "user_id" ? "$2" : `"${c}"`)).join(", ");
  await sql.query(`insert into decks (${cols.map((c) => `"${c}"`).join(", ")}) select ${select} from decks where id = $3`, [cloneId, owner, source]);
  await sql.query(`insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, oracle_id, quantity, auto from deck_cards where deck_id = $2`, [cloneId, source]);
  const served = await setup.goto(`${BASE}/decks/${cloneId}`, { waitUntil: "domcontentloaded" });
  if (!report("the server draws the clone, so it writes to this database", served?.status() === 200, `status ${served?.status()}`)) throw new Error("the server is on another database");

  const card = await pickCard(userId);
  report("an owned card no deck holds, for Find a deck", !!card, card ?? "none");
  for (const size of WIDTHS) {
    // A fresh never-run analyzed deck per width: a settled run retires the "never run" state.
    const tuning = (await sql`
      select d.id from decks d join deck_profiles p on p.deck_id = d.id
      where d.id = any(${ids}::uuid[]) and not exists (select 1 from deck_suggestion_runs r where r.deck_id = d.id)
      order by d.id limit 1`)[0];
    if (report(`a never-run analyzed deck for Suggested changes @${size.width}`, !!tuning, tuning?.id ?? "none")) {
      await toolLeg(browser, size, "Suggested changes", "suggested_changes", tuning.id, "Suggested changes", /^Suggest/,
        "section[aria-labelledby='tuning-heading']", "suggested-changes");
    }
    await toolLeg(browser, size, "Proposed cuts", "proposed_cuts", cloneId, "Proposed cuts", /^Look deeper/,
      "section[aria-labelledby='cuts-heading'] div", "proposed-cuts");
    await chooseLeg(browser, size);
    if (card) await findDeckLeg(browser, size, card);
    await cleanStandIns(userId);
  }
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  await cleanup(accountId);
  if (cloneId) await tidy(`cloned deck ${cloneId}`, () => sql`delete from decks where id = ${cloneId}`);
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
