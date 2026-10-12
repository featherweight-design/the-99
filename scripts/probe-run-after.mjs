// Leaving a page never cancels a run: Suggested changes and Proposed cuts finish AFTER their
// response (`after()`), so a closed tab leaves the run going and it settles on its own.
//
// WHAT IT PROVES, for each tool: the press reserves a run (a `pending` row appears), the page is
// then CLOSED (context and all) while the model call is still held, and the run still reaches a
// settled state with its credit refunded, and later than the close. A run that stayed `pending`
// until the 5-minute reaper, or came back `cancelled`, fails. The model is a held stand-in
// (`TUNING_STUB_DELAY_MS`, `src/lib/tuning/stub.ts`): no call is made, no credit is spent, and a
// production build cannot reach it.
//
// THE SERVER MUST BE STARTED WITH `TUNING_STUB_DELAY_MS=8000` (and the Analysis tab on, the
// tuning and cuts switches on): without it the real model would be called. The probe reads the
// held run's model, which the stub leaves as the real model's name, so it checks the server's
// setting the only way it can: the run must still be pending 3s after the press.
//
// Writes only `deck_suggestion_runs` and `model_calls` rows it created, deleted in a `finally`.
// Point it at `local-dev` or a scratch Neon branch, NEVER production or staging.
//
//   TUNING_STUB_DELAY_MS=8000 pnpm dev   (on its own port, an exact PID you started)
//   PROBE_BASE=http://localhost:3047 pnpm probe:run-after
//   PROBE_CUTS_DECK=<id> names the over-100 deck the cuts leg clones; otherwise the first one found.
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
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function accountDeckIds(page) {
  await page.goto(`${BASE}/decks`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(`${PAGE} a[href^='/decks/']`, { timeout: 20_000 }).catch(() => {});
  return page.evaluate((scope) => [...(document.querySelector(scope)?.querySelectorAll("a[href^='/decks/']") ?? [])]
    .map((a) => a.getAttribute("href").split("/")[2]).filter((id) => /^[0-9a-f-]{36}$/.test(id)), PAGE);
}

async function openAnalysis(page, deckId, heading, tool) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = onPageRole(page, "tab", /analysis/i).first();
  await tab.waitFor({ timeout: 30_000 });
  await tab.click();
  // The Analysis tab lands on the tool hub; the tool's own panel opens from its tile.
  await page.locator(`${PAGE} button[aria-label^="${heading}"]`).first().click({ timeout: 30_000 }).catch(async (error) => {
    // PROBE_SHOTS=<dir> keeps what the page drew when the tool's tile was not there.
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/run-after-${tool}.png`, fullPage: true });
    throw error;
  });
  await onPageRole(page, "heading", heading).first().waitFor({ timeout: 60_000 });
  await page.waitForTimeout(500);
}

/** Press, close the page while the held call runs, and watch the run settle without it. */
async function leg(browser, label, tool, hubTool, deckId, heading, button) {
  const known = new Set((await sql`select id from deck_suggestion_runs where deck_id = ${deckId} and tool = ${tool}`).map((r) => r.id));
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  await openAnalysis(page, deckId, heading, hubTool);
  await onPageRole(page, "button", button).first().click();
  let run = null;
  for (let i = 0; i < 100 && !run; i += 1) {
    run = (await sql`select id, status, model_call_id, created_at from deck_suggestion_runs where deck_id = ${deckId} and tool = ${tool} order by created_at desc limit 1`)
      .find((r) => !known.has(r.id)) ?? null;
    if (!run) await sleep(150);
  }
  if (!report(`${label}: the press reserved a run`, run !== null && run.status === "pending", run ? `${run.id} ${run.status}` : "no new run row")) {
    await context.close();
    return null;
  }
  await sleep(1500);
  const [held] = await sql`select status from deck_suggestion_runs where id = ${run.id}`;
  report(`${label}: the call is held, so the server's stub is on`, held.status === "pending", `status ${held.status} 1.5s after the press`);
  const closedAt = Date.now();
  await context.close();
  let settled = null;
  for (let i = 0; i < 120 && !settled; i += 1) {
    const [row] = await sql`select r.status, r.error_class, c.status as unit from deck_suggestion_runs r left join model_calls c on c.id = r.model_call_id where r.id = ${run.id}`;
    if (row && row.status !== "pending") settled = row;
    else await sleep(500);
  }
  const waited = Date.now() - closedAt;
  report(`${label}: the run settled with the page gone`, settled !== null, settled ? `${settled.status}/${settled.error_class} after ${waited}ms` : "still pending after 60s");
  if (settled) {
    report(`${label}: it was not cancelled, and its failure was the stub's`, settled.status === "failed" && settled.error_class === "upstream_busy", `${settled.status}/${settled.error_class}`);
    report(`${label}: its credit came back`, settled.unit === "refunded", `unit ${settled.unit}`);
    report(`${label}: it settled after the close, not before`, waited > 500, `${waited}ms after the close`);
  }
  return run;
}

async function cleanup(runs) {
  for (const run of runs) {
    await sql`delete from deck_suggestion_runs where id = ${run.id}`.catch((e) => console.error("cleanup run:", e));
    await sql`delete from model_calls where id = ${run.model_call_id}`.catch((e) => console.error("cleanup call:", e));
  }
}

const made = [];
let cloneId = null;
const browser = await chromium.launch();
try {
  await clerkSetup();
  const setup = await (await browser.newContext()).newPage();
  await signIn(setup);
  const ids = await accountDeckIds(setup);
  const tuning = (await sql`
    select d.id from decks d join deck_profiles p on p.deck_id = d.id
    where d.id = any(${ids}::uuid[]) and not exists (select 1 from deck_suggestion_runs r where r.deck_id = d.id)
    order by d.id limit 1`)[0];
  if (report("a never-run analyzed deck for Suggested changes", !!tuning, tuning?.id ?? "none among the account's decks")) {
    const run = await leg(browser, "Suggested changes", "suggested_changes", "suggested", tuning.id, "Suggested changes", /^Suggest/);
    if (run) made.push(run);
  }
  // Proposed cuts needs a deck over 100 cards: one is cloned under this account from any over-100
  // deck on the database (PROBE_CUTS_DECK names one), and the clone is deleted in the `finally`.
  const source = process.env.PROBE_CUTS_DECK
    ?? (await sql`select d.id from decks d join deck_cards c on c.deck_id = d.id
        group by d.id, d.partner_oracle_id having sum(c.quantity) + 1 + (d.partner_oracle_id is not null)::int > 100 limit 1`)[0]?.id;
  if (report("an over-100 deck to clone for Proposed cuts", !!source, source ?? "none on this database; set PROBE_CUTS_DECK")) {
    const [{ user_id: owner }] = await sql`select user_id from decks where id = ${ids[0]}`;
    cloneId = randomUUID();
    const cols = (await sql.query(`select column_name from information_schema.columns where table_name = 'decks' order by ordinal_position`)).map((r) => r.column_name);
    const select = cols.map((c) => (c === "id" ? "$1::uuid" : c === "user_id" ? "$2" : `"${c}"`)).join(", ");
    await sql.query(`insert into decks (${cols.map((c) => `"${c}"`).join(", ")}) select ${select} from decks where id = $3`, [cloneId, owner, source]);
    await sql.query(`insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, oracle_id, quantity, auto from deck_cards where deck_id = $2`, [cloneId, source]);
    const run = await leg(browser, "Proposed cuts", "proposed_cuts", "deeper", cloneId, "Proposed cuts", /^Look deeper/);
    if (run) made.push(run);
  }
} catch (error) {
  console.error(error);
  failures += 1;
} finally {
  // Whatever the legs made, in whatever state they were left.
  await cleanup(made);
  if (cloneId) await sql`delete from decks where id = ${cloneId}`.catch((e) => console.error("cleanup deck:", e));
  await browser.close();
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
