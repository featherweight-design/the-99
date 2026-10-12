// probe:tuning-optimistic — an answer to a Tuning row flips the row BEFORE its server action
// answers (Hugh, 2026-10-12), and a refused one rolls back with its refusal.
//
// It holds every server-action POST (`next-action` header) the page makes once a row is pressed,
// asserts what the row draws while the action is still unanswered, then lets it through or fails
// it. Two surfaces, at 1300x900 and 390x844:
//   - Proposed cuts, a past deeper run reopened from History (review mode): Cut flips to `cut`
//     while held; released, it stays cut; Undo puts it back (the deck is left as it was found).
//   - Suggested changes, a past run reopened from History: Reject flips to `rejected` while held;
//     a FAILED action rolls it back to its Apply/Reject card with the refusal.
//
// Needs a running server (`PROBE_BASE`, default http://localhost:3000) signed in as
// E2E_AUDIT_USER_EMAIL, and two of that account's decks: OPTIMISTIC_CUTS_DECK with an ok deeper
// Proposed cuts run in History, and OPTIMISTIC_SUGGESTED_DECK with an ok Suggested changes run.
// It WRITES (one cut and its undo), so it FAILS CLOSED: the server must be on this machine, and the
// database the worktree's .env names (the one that server reads) must not report the production or
// staging Neon branch, by `neon.branch_id`. The cut is undone in a `finally`.
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { Pool } from "@neondatabase/serverless";
import { chromium } from "playwright";

import { requireEnv } from "./lib/env.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, OPTIMISTIC_CUTS_DECK: CUTS, OPTIMISTIC_SUGGESTED_DECK: SUGGESTED, DATABASE_URL } =
  requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "OPTIMISTIC_CUTS_DECK", "OPTIMISTIC_SUGGESTED_DECK", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";

// Production and staging: never written by a probe (AGENTS.md).
const FORBIDDEN = new Set(["br-noisy-violet-a6vw4ess", "br-polished-pond-a6e63y0b"]);
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) {
  console.error(`refusing: PROBE_BASE must be a server on this machine, got ${BASE}`);
  process.exit(2);
}
{
  const pool = new Pool({ connectionString: DATABASE_URL });
  const branch = (await pool.query("select current_setting('neon.branch_id', true) as b")).rows[0]?.b ?? null;
  await pool.end();
  if (!branch || FORBIDDEN.has(branch)) {
    console.error(`refusing: the database .env names reports branch ${branch ?? "unknown"}, which this probe never writes`);
    process.exit(2);
  }
}
let failures = 0;
const check = (label, ok, detail) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} - ${JSON.stringify(detail)}`);
  if (!ok) failures += 1;
};

async function signIn(page) {
  await clerkSetup();
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  await page.evaluate(async (email) => {
    const s = window.Clerk.client.signIn;
    let a = await s.create({ identifier: email });
    const f = a.supportedFirstFactors.find((x) => x.strategy === "email_code");
    await s.prepareFirstFactor({ strategy: "email_code", emailAddressId: f.emailAddressId });
    a = await s.attemptFirstFactor({ strategy: "email_code", code: "424242" });
    await window.Clerk.setActive({ session: a.createdSessionId });
  }, EMAIL);
}

/** Hold the next server-action POSTs until `release` or `fail` is called. */
async function holdActions(page) {
  const held = [];
  let mode = "hold";
  await page.route("**/*", async (route) => {
    const req = route.request();
    if (req.method() !== "POST" || !req.headers()["next-action"] || mode === "pass") return route.fallback();
    held.push(route);
  });
  return {
    count: () => held.length,
    /** Until the pressed row's request is in hand (a loaded machine can take a while to send it). */
    async caught() { for (let i = 0; i < 100 && held.length === 0; i += 1) await page.waitForTimeout(100); return held.length; },
    async release() { mode = "pass"; for (const r of held.splice(0)) await r.fallback(); await page.unroute("**/*"); },
    async fail() { mode = "pass"; for (const r of held.splice(0)) await r.abort("failed"); await page.unroute("**/*"); },
  };
}

/**
 * Press Undo on the answered cut and wait for the ANSWER, not the flip: Undo is optimistic too, so
 * the card is back on screen before its action has run. Done means the action's response arrived
 * and the restored row's Cut is pressable again, which it is only once the re-read has landed.
 */
async function undoCut(page, cutRow, name) {
  const answered = page.waitForResponse((r) => r.request().method() === "POST" && !!r.request().headers()["next-action"], { timeout: 60_000 });
  await cutRow.getByRole("button", { name: "Undo" }).click();
  await answered;
  const cut = onPage(page, "article").filter({ hasText: name }).first().getByRole("button", { name: "Cut", exact: true });
  await cut.waitFor({ timeout: 30_000 });
  for (let i = 0; i < 300 && !(await cut.isEnabled()); i += 1) await page.waitForTimeout(100);
  return cut.isEnabled();
}

async function openFromHistory(page, deckId, tier) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  await onPageRole(page, "tab", /analysis/i).first().click();
  await onPage(page, "[data-tool-tile='history']").click();
  await onPage(page, `[data-history-row^='run:']:has-text('${tier}')`).first().click();
  await onPage(page, "[data-review-note]").waitFor({ timeout: 30_000 });
}

const browser = await chromium.launch();
for (const w of [{ label: 1300, width: 1300, height: 900 }, { label: 390, width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: { width: w.width, height: w.height } });
  const page = await ctx.newPage();
  await signIn(page);

  // Proposed cuts: Cut flips while its action is held.
  await openFromHistory(page, CUTS, "deeper look");
  const article = onPage(page, "article").first();
  await article.waitFor({ timeout: 30_000 });
  const name = await article.getAttribute("aria-label");
  const gate = await holdActions(page);
  const cutRow = onPage(page, "[data-testid='answered-cut']").filter({ hasText: name });
  let undone = false;
  try {
    await article.getByRole("button", { name: "Cut", exact: true }).click();
    await gate.caught();
    check(`${w.label} cuts: the row reads cut while its action is still unanswered`, (await cutRow.count()) === 1 && gate.count() >= 1, { held: gate.count() });
    await gate.release();
    await page.waitForTimeout(2500);
    check(`${w.label} cuts: once answered it stays cut`, (await cutRow.count()) === 1, null);
    undone = await undoCut(page, cutRow, name);
    check(`${w.label} cuts: Undo puts the card back, once its action has answered`, undone, name);
  } finally {
    // Whatever failed above, the deck is left as it was found: an answered cut is undone.
    if (!undone) {
      await gate.release().catch(() => {});
      await page.waitForTimeout(2500);
      if ((await cutRow.count()) > 0) await undoCut(page, cutRow, name).catch(() => {});
    }
  }

  // Suggested changes: Reject flips while held; a failed action rolls back with its refusal.
  await openFromHistory(page, SUGGESTED, "1 credit");
  const reject = onPageRole(page, "button", /^Reject$/).first();
  await reject.waitFor({ timeout: 30_000 });
  const openBefore = await onPageRole(page, "button", /^Reject$/).count();
  const gate2 = await holdActions(page);
  await reject.click();
  await gate2.caught();
  const rejected = await onPage(page, "[data-testid='answered-rejected']").count();
  check(`${w.label} suggested: the row reads rejected while its action is still unanswered`, rejected >= 1 && gate2.count() >= 1, { rejected, held: gate2.count() });
  await gate2.fail();
  await page.waitForTimeout(1500);
  const openAfter = await onPageRole(page, "button", /^Reject$/).count();
  const alert = await onPage(page, "[role=alert]").count();
  check(`${w.label} suggested: a failed action rolls the row back, with its refusal`, openAfter === openBefore && alert >= 1, { openBefore, openAfter, alert });
  await ctx.close();
}
await browser.close();
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
