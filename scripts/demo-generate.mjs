// demo:generate — the landing demo's stored outputs (plan 2026-11-08-public-landing-demo.md, "Generating the stored
// outputs ($5 hard cap)", PR 3). Each tool is pressed ONCE through its real button on the fictional fixture (Wren
// Calloway, `docs/agents/fictional-fixture.md`), in a real browser against `next start`, and its output is stored
// where it always is. The capture pass (PR 6) then photographs the same screens.
//
// THE DATABASE is named on the command line, never read from `.env`: `DEMO_DATABASE_URL`, from THIS SHELL only. The
// script refuses to run if `.env` sets it (`scripts/lib/env.mjs` loads `.env` with `override`, so a value there would
// silently win), and refuses unless the database's own `neon.branch_id` is a scratch branch (`assertScratchBranch`:
// never production, staging or local-dev). With `--spend` it also requires `DEMO_DB_BRANCH` to equal that branch id
// (the dry run prints it), so a URL swapped between the dry run and the paid run is refused.
//
// DRY RUN BY DEFAULT. It checks the branch, the fixture (five decks at their totals, the shared card, at least 6
// credits), the live-path env the server will be started with, and prints the steps with each model step's worst case
// and the ledger's spent and cap. It presses nothing and starts nothing.
//
// `--spend` presses the tools. It starts `next start` ITSELF (a production build must exist: `pnpm build`), on
// `DEMO_PORT` (default 3391), with `DATABASE_URL=$DEMO_DATABASE_URL`, `NODE_ENV=production`, `SYNOPSIS_LIVE=1`,
// `INTAKE_LIVE=1`, `FITS_READ_LIVE=1` and both tuning stub delays emptied, so the server cannot be on another database
// or a stand-in. It stops that server by the PID it holds, never by pattern.
//
// SPEND CONTROL (`docs/superpowers/eval/ledger-landing-demo.jsonl`, `LEDGER_LIMITS`: a HARD $5, no ask line). One run
// at a time (`acquireRunLock`). Before each model press the feature's worst case (`featureWorstCaseMicroUsd`) is
// written as a pending entry, and the press is refused if `spent + worst` would cross the cap; after the result lands
// the entry is settled at the new `model_calls` row's recorded cost, or at the worst case when no cost was recorded.
// Credits are spent through the app's real reservation (the fixture's gift lot): 5 of its 10.
//
// WRITES (all on the scratch branch, through the app): one Overview, one Suggested changes v2 run at 10, one Look
// deeper run, one Help me choose read, one fits read, their `model_calls` rows, and whatever opening analysis, Top off
// and Mana balance store. Nothing is deleted: the stored rows are the point. Top off is opened, not committed (the
// demo shows the proposal; a commit would change the under deck the capture pass shoots). A summary JSON goes to
// `scripts/out/demo-generate-<timestamp>.json`: each step, the ids of the rows it stored and its settled cost. No
// Clerk id is written or printed.
//
//   DEMO_DATABASE_URL='<scratch url>' pnpm demo:generate                                  # dry run
//   DEMO_DATABASE_URL='<scratch url>' DEMO_DB_BRANCH=br-... pnpm demo:generate --spend    # the paid run
//
//   ... pnpm demo:generate --only=suggested-changes,look-deeper   # just these steps (dry run or --spend)
//   ... pnpm demo:generate --skip=help-me-choose,overview         # all but these
// Step ids: help-me-choose, overview, suggested-changes, look-deeper, which-deck, analysis, top-off, mana-balance.
// A rerun skips every step whose output is already stored, so nothing is pressed or paid for twice.
//
// PROBE_SHOTS=<dir> saves one screenshot per step.
import "./lib/env.mjs";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { parse as parseDotenv } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { LEDGER_LIMITS } from "../src/lib/eval/ledger-limits.ts";
import { remaining } from "../src/lib/model/credit-rule.ts";
import { featureWorstCaseMicroUsd } from "../src/lib/model/prices.ts";
import { standInReport } from "../src/lib/model/stand-in-report.ts";
import { v2StubDelayMs } from "../src/lib/tuning/stub.ts";
import { acquireRunLock, readLedger, record, spent } from "./eval/lib/ledger.mts";
import { ABOUT_DECK_IDS } from "./lib/fictional-fixture/rng.ts";
import { ENV_PATH } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

const LEDGER = "docs/superpowers/eval/ledger-landing-demo.jsonl";
const CAP_USD = LEDGER_LIMITS["ledger-landing-demo.jsonl"].hardCapUsd;
const MIN_CREDITS = 6;
const PORT = Number(process.env.DEMO_PORT ?? 3391);
const BASE = `http://localhost:${PORT}`;
/** Help me choose's "Anything else?" wish: fixed, so a rerun asks the same thing. Fictional, names no one. */
const WISH = "A lantern-lit artifact deck that builds a little army and wins slowly.";
/** "Which deck needs it most?" is pressed on this owned card (the fixture's shared card). */
const SHARED_CARD = "Thrill of Possibility";
/** Suggested changes v2's count. */
const V2_COUNT = 10;

const { values: args } = parseArgs({
  options: {
    spend: { type: "boolean", default: false },
    // Step ids, comma-separated (see STEPS): a rerun presses only these, or all but these, so a step whose output is
    // already stored is never pressed (and paid for) twice. The dry run honors the same selection.
    only: { type: "string" },
    skip: { type: "string" },
  },
});
if (args.only && args.skip) throw new Error("demo:generate: pass --only or --skip, not both.");

// --- The database: the shell's, never `.env`'s. ------------------------------------------------------------------
const dotenvKeys = existsSync(ENV_PATH) ? parseDotenv(readFileSync(ENV_PATH)) : {};
if ("DEMO_DATABASE_URL" in dotenvKeys || "DEMO_DB_BRANCH" in dotenvKeys) {
  throw new Error("demo:generate: .env sets DEMO_DATABASE_URL or DEMO_DB_BRANCH. Take them out; they are read from the shell only.");
}
const DB_URL = process.env.DEMO_DATABASE_URL?.trim();
if (!DB_URL) throw new Error("demo:generate: set DEMO_DATABASE_URL in this shell to the scratch branch's connection string (never read from .env).");
const sql = neon(DB_URL);
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertScratchBranch(branch, "demo:generate");
console.log(`database: neon branch ${branch} (scratch)`);
if (args.spend && process.env.DEMO_DB_BRANCH !== branch) {
  throw new Error(`demo:generate --spend: DEMO_DB_BRANCH must equal the branch the dry run printed (${branch}); got ${process.env.DEMO_DB_BRANCH ?? "nothing"}.`);
}

// --- The server's environment, decided here and checked before anything is pressed. ------------------------------
/** What `next start` is given. Next reads `.env` too, but never over a variable already set, so these win. */
const serverEnv = {
  ...process.env,
  DATABASE_URL: DB_URL,
  NODE_ENV: "production",
  SYNOPSIS_LIVE: "1",
  INTAKE_LIVE: "1",
  FITS_READ_LIVE: "1",
  // Emptied rather than deleted: a deleted variable would be filled again from `.env` by Next's own loader.
  TUNING_STUB_DELAY_MS: "",
  TUNING_V2_STUB_DELAY_MS: "",
  PORT: String(PORT),
};
delete serverEnv.DEMO_DATABASE_URL;
delete serverEnv.DEMO_DB_BRANCH;

/** Every reason the server would store a stand-in or refuse to call, empty when every path is live. */
function liveProblems(env) {
  const problems = [];
  const r = standInReport(env);
  for (const path of ["synopsis", "intake", "fits", "tuning"]) if (r[path] !== "live") problems.push(`${path} would be a stand-in`);
  if (v2StubDelayMs(env) !== null) problems.push("Suggested changes v2 would be the staged stub (TUNING_V2_STUB_DELAY_MS)");
  if (r.key !== "real") problems.push(`ANTHROPIC_API_KEY is ${r.key}`);
  for (const name of ["SYNOPSIS_LIVE", "INTAKE_LIVE", "FITS_READ_LIVE"]) if (env[name] !== "1") problems.push(`${name} is not 1`);
  for (const name of ["TUNING_STUB_DELAY_MS", "TUNING_V2_STUB_DELAY_MS"]) if (env[name]) problems.push(`${name} is set`);
  if (["off", "false"].includes(env.MODEL_CALLS_ENABLED ?? "")) problems.push(`MODEL_CALLS_ENABLED is ${env.MODEL_CALLS_ENABLED}`);
  return { problems, report: r };
}

// --- The fixture. ---------------------------------------------------------------------------------------------------
const EXPECTED = [
  { role: "played", total: 100 },
  { role: "under", total: 88 },
  { role: "over", total: 106 },
  { role: "fresh", total: 100 },
  { role: "versioned", total: 100 },
];
const decks = await sql`
  select d.id::text, d.name, d.user_id,
    coalesce((select sum(dc.quantity) from deck_cards dc where dc.deck_id = d.id), 0)::int
      + (case when exists (select 1 from deck_cards dc where dc.deck_id = d.id and dc.oracle_id = d.commander_oracle_id) then 0 else 1 end) as total
  from decks d where d.id = any(${Object.values(ABOUT_DECK_IDS)}::uuid[])`;
const deckOf = new Map(decks.map((d) => [d.id, d]));
const fixtureProblems = [];
for (const e of EXPECTED) {
  const d = deckOf.get(ABOUT_DECK_IDS[e.role]);
  if (!d) fixtureProblems.push(`no ${e.role} deck (${ABOUT_DECK_IDS[e.role]}): run pnpm fixtures:about on this branch`);
  else if (d.total !== e.total) fixtureProblems.push(`${e.role} "${d.name}" holds ${d.total}, expected ${e.total}`);
}
const owners = new Set(decks.map((d) => d.user_id));
if (owners.size > 1) fixtureProblems.push("the fixture decks have more than one owner");
/** The fixture account's user id. Used in queries only: never printed or written. */
const OWNER = decks[0]?.user_id ?? null;

async function creditsLeft() {
  if (!OWNER) return 0;
  const now = new Date();
  const grants = await sql`select id::text, source, units, revoked_units, expires_at, created_at from credit_grants where user_id = ${OWNER}`;
  const calls = await sql`select credit_grant_id::text, status, created_at, units from model_calls
    where user_id = ${OWNER} and credit_grant_id is not null and status in ('spent', 'reserved')`;
  return grants.reduce((n, g) => {
    const mine = calls.filter((c) => c.credit_grant_id === g.id);
    const usage = {
      spent: mine.filter((c) => c.status === "spent").reduce((s, c) => s + c.units, 0),
      reserved: mine.filter((c) => c.status === "reserved").flatMap((c) => Array(c.units).fill(new Date(c.created_at))),
    };
    const grant = { id: g.id, source: g.source, units: g.units, revokedUnits: g.revoked_units, expiresAt: g.expires_at ? new Date(g.expires_at) : null, createdAt: new Date(g.created_at) };
    return n + remaining(grant, usage, now);
  }, 0);
}
const credits = await creditsLeft();
if (credits < MIN_CREDITS) fixtureProblems.push(`the fixture account holds ${credits} credits; at least ${MIN_CREDITS} are needed`);
const [shared] = OWNER ? await sql`select c.oracle_id::text from collection_items ci join cards c on c.oracle_id = ci.oracle_id
  where ci.user_id = ${OWNER} and c.name = ${SHARED_CARD} limit 1` : [];
if (!shared) fixtureProblems.push(`the fixture account does not own ${SHARED_CARD}`);

// --- The steps. -----------------------------------------------------------------------------------------------------
const deckName = (role) => deckOf.get(ABOUT_DECK_IDS[role])?.name ?? `(${role} missing)`;
/** In order. `feature` is the `model_calls.feature` a model step reserves; null for a free tool. */
const STEPS = [
  { id: "help-me-choose", tool: "Help me choose", deck: null, feature: "intake", run: helpMeChoose },
  { id: "overview", tool: "Overview", deck: "played", feature: "synopsis", run: overview },
  { id: "suggested-changes", tool: `Suggested changes v2 (N=${V2_COUNT})`, deck: "played", feature: "suggested_changes_v2", run: suggestedChanges },
  { id: "look-deeper", tool: "Look deeper", deck: "over", feature: "proposed_cuts", run: lookDeeper },
  { id: "which-deck", tool: `Which deck needs it most? (${SHARED_CARD})`, deck: null, feature: "fits_read", run: whichDeck },
  { id: "analysis", tool: "Analysis", deck: "played", feature: null, run: analysis },
  { id: "top-off", tool: "Top off (opened, not committed)", deck: "under", feature: null, run: topOff },
  { id: "mana-balance", tool: "Mana balance", deck: "played", feature: null, run: manaBalance },
];
{
  const ids = new Set(STEPS.map((s) => s.id));
  const named = (v) => (v ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  const asked = named(args.only ?? args.skip);
  const unknown = asked.filter((x) => !ids.has(x));
  if (unknown.length > 0) throw new Error(`demo:generate: unknown step(s) ${unknown.join(", ")}; the steps are ${[...ids].join(", ")}`);
  if (args.only && asked.length === 0) throw new Error("demo:generate: --only names no step");
  const keep = (s) => (args.only ? asked.includes(s.id) : !asked.includes(s.id));
  for (let i = STEPS.length - 1; i >= 0; i -= 1) if (!keep(STEPS[i])) STEPS.splice(i, 1);
  if (STEPS.length === 0) throw new Error("demo:generate: the selection leaves no step");
}
const worstUsd = (feature) => (feature ? featureWorstCaseMicroUsd(feature) / 1e6 : 0);

const ledgerSpent = spent(readLedger(LEDGER));
const live = liveProblems(serverEnv);
let running = 0;
console.log(`\nledger ${LEDGER}: spent $${ledgerSpent.toFixed(3)} of a hard $${CAP_USD}\ncredits: ${credits} on the fixture account\n`);
console.table(STEPS.map((s, i) => {
  running += worstUsd(s.feature);
  return {
    step: i + 1,
    id: s.id,
    tool: s.tool,
    deck: s.deck ? deckName(s.deck) : "-",
    feature: s.feature ?? "(free)",
    "worst USD": worstUsd(s.feature).toFixed(3),
    "running USD": running.toFixed(3),
  };
}));
console.log(`steps selected: ${STEPS.map((s) => s.id).join(", ")}`);
console.log(`worst case of the pass: $${running.toFixed(3)}; with what is spent: $${(ledgerSpent + running).toFixed(3)} of $${CAP_USD}`);
console.log(`server paths: synopsis ${live.report.synopsis}, intake ${live.report.intake}, fits ${live.report.fits}, tuning ${live.report.tuning}, key ${live.report.key}${live.report.baseUrl ? ", ANTHROPIC_BASE_URL set" : ""}`);

// The switches the database decides: the app-wide model-call row (killed or off stops every press), and the two model
// lines the steps assume, reported as rows so the operator can see what the fixture account resolves.
const switchRows = await sql`select switch, scope, value, (user_id = ${OWNER}) as own from flag_overrides
  where switch in ('MODEL_CALLS_ENABLED', 'SUGGESTED_CHANGES_V2_ENABLED', 'OVERVIEW_V2_ENABLED') and (scope <> 'user' or user_id = ${OWNER})`;
for (const r of switchRows) console.log(`switch row: ${r.switch} ${r.scope}${r.own ? " (fixture account)" : ""} = ${r.value}`);
const modelCallsRow = switchRows.find((r) => r.switch === "MODEL_CALLS_ENABLED" && r.scope === "app");
if (modelCallsRow && ["off", "killed"].includes(modelCallsRow.value)) live.problems.push(`MODEL_CALLS_ENABLED's app row is ${modelCallsRow.value}`);
if (!switchRows.some((r) => r.switch === "SUGGESTED_CHANGES_V2_ENABLED" && r.value === "on" && r.scope !== "group")) {
  console.log("  note: no app or account row turns SUGGESTED_CHANGES_V2_ENABLED on; unless a group does, the v2 step will stop at its press");
}

const blockers = [...fixtureProblems, ...live.problems];
if (ledgerSpent + running > CAP_USD) blockers.push(`the pass's worst case would cross the $${CAP_USD} cap`);
for (const b of blockers) console.log(`  BLOCKED  ${b}`);
if (!args.spend) {
  console.log(blockers.length === 0 ? "\nDry run: ready. Nothing was pressed." : "\nDry run: not ready. Nothing was pressed.");
  process.exit(blockers.length === 0 ? 0 : 1);
}
if (blockers.length > 0) throw new Error("demo:generate --spend: refusing, see BLOCKED above.");

// --- The paid run. ----------------------------------------------------------------------------------------------------
const { clerkSetup, setupClerkTestingToken } = await import("@clerk/testing/playwright");
const { chromium } = await import("playwright");
const { onPage, onPageRole, PAGE } = await import("./lib/surface.mjs");
const { noteVariant } = await import("./lib/note-variant.mjs");

const EMAIL = process.env.E2E_AUDIT_USER_EMAIL;
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL || !process.env.CLERK_SECRET_KEY) throw new Error("demo:generate --spend: E2E_AUDIT_USER_EMAIL and CLERK_SECRET_KEY must be set (.env).");
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("demo:generate --spend: set E2E_AUDIT_USER_PASSWORD.");
if (!existsSync(new URL("../.next/BUILD_ID", import.meta.url))) throw new Error("demo:generate --spend: no production build; run pnpm build first.");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MODEL_WAIT_MS = 6 * 60_000;
const summary = { generatedAt: new Date().toISOString(), branch, ledger: LEDGER, capUsd: CAP_USD, steps: [] };
const OUT_DIR = new URL("./out/", import.meta.url);
const outFile = new URL(`./out/demo-generate-${summary.generatedAt.replace(/[:.]/g, "-")}.json`, import.meta.url);
const writeSummary = () => {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(outFile, `${JSON.stringify(summary, null, 2)}\n`);
};

/** Starts `next start` on the scratch branch; resolves once it answers. Returns the child, stopped by its own PID. */
async function startServer() {
  const child = spawn("node_modules/.bin/next", ["start", "-p", String(PORT)], {
    cwd: new URL("..", import.meta.url),
    env: serverEnv,
    stdio: ["ignore", "ignore", "pipe"],
  });
  child.stderr.on("data", (b) => process.stderr.write(`[next] ${b}`));
  for (let i = 0; i < 120; i += 1) {
    if (child.exitCode !== null) throw new Error(`next start exited (${child.exitCode})`);
    try {
      const res = await fetch(`${BASE}/api/health`);
      const body = await res.json().catch(() => null);
      if (body) return { child, health: body };
    } catch { /* not up yet */ }
    await sleep(1000);
  }
  throw new Error("next start did not answer within 120s");
}

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const attemptSignIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") ? await attemptSignIn.create({ identifier: email }) : await attemptSignIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          if (!factor?.emailAddressId) return "the account offers no email_code first factor.";
          await attemptSignIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
          attempt = await attemptSignIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
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

async function openAnalysis(page, role) {
  await page.goto(`${BASE}/decks/${ABOUT_DECK_IDS[role]}`, { waitUntil: "domcontentloaded" });
  const tab = onPageRole(page, "tab", /analysis/i).first();
  await tab.waitFor({ timeout: 60_000 });
  await tab.click();
}
async function openTile(page, role, heading) {
  await openAnalysis(page, role);
  await page.locator(`${PAGE} button[aria-label^="${heading}"]`).first().click({ timeout: 60_000 });
  await onPageRole(page, "heading", heading).first().waitFor({ timeout: 60_000 });
}

/**
 * The `model_calls` row a press reserved: the ONE row of the owner's that was not there before the press (`known`, the
 * ids read just before it) and is of `feature`, waited on until it leaves `reserved` and (briefly) until its cost is
 * recorded. A new row of ANOTHER feature, or a second new row, stops the run: the press reached a path this step did
 * not price. Matched by id, never by a time: `created_at` is a timestamp without time zone, and a JS Date parameter
 * sent against it lands hours off by the machine's offset (the first paid run picked up Help me choose's row this way).
 */
async function settledCall(feature, known, pressedAt, { optional = false } = {}) {
  const deadline = Date.now() + MODEL_WAIT_MS;
  let row = null;
  while (Date.now() < deadline) {
    const fresh = await newCalls(known);
    const stray = fresh.find((r) => r.feature !== feature);
    if (stray) throw new Error(`the press reserved ${stray.feature}, not ${feature}`);
    if (fresh.length > 1) throw new Error(`the press reserved ${fresh.length} ${feature} calls`);
    row = fresh[0] ?? null;
    if (!row && optional && Date.now() - pressedAt > 30_000) return null;
    if (row && row.status !== "reserved") break;
    await sleep(2000);
  }
  if (!row || row.status === "reserved") throw new Error(`no settled ${feature} call within ${MODEL_WAIT_MS / 60_000} minutes`);
  for (let i = 0; i < 10 && row.cost_micro_usd === null; i += 1) {
    await sleep(1000);
    [row] = await sql`select id::text, feature, status, model, cost_micro_usd from model_calls where id = ${row.id}::uuid`;
  }
  if (row.model === "stub") throw new Error(`the ${feature} call ran the stub; nothing real was stored`);
  return row;
}

/** The ids of every `model_calls` row the owner holds right now: what a press's new row is told apart from. */
async function knownCalls() {
  return new Set((await sql`select id::text from model_calls where user_id = ${OWNER}`).map((r) => r.id));
}
/** The owner's rows not in `known`, oldest first. */
async function newCalls(known) {
  const rows = await sql`select id::text, feature, status, model, cost_micro_usd from model_calls
    where user_id = ${OWNER} order by created_at, id`;
  return rows.filter((r) => !known.has(r.id));
}

/** One model press under the ledger: reserve the worst case, press, settle at the recorded cost. */
async function modelStep(step, page) {
  const worst = worstUsd(step.feature);
  const now = spent(readLedger(LEDGER));
  if (now + worst > CAP_USD) throw new Error(`STOP before ${step.id}: worst case $${worst.toFixed(3)} would cross the $${CAP_USD} cap (spent $${now.toFixed(3)})`);
  const pending = `${Date.now()}-${step.id}`;
  record(LEDGER, { at: new Date().toISOString(), runId: pending, source: "pending", usd: worst, requests: 1, pending, note: `${step.id} ${step.feature}` });
  const known = await knownCalls();
  let call = null;
  let usd = worst;
  let stored = {};
  try {
    const pressedAt = Date.now();
    stored = await step.run(page);
    call = await settledCall(step.feature, known, pressedAt, { optional: step.feature === "intake" });
    usd = call ? (call.cost_micro_usd === null ? worst : call.cost_micro_usd / 1e6) : 0;
  } finally {
    // Unreadable (a throw before the row was read) settles at the worst case, never at nothing.
    record(LEDGER, { at: new Date().toISOString(), runId: `landing-demo-${step.id}`, source: "realtime:1", usd, requests: 1, settles: pending, note: `${step.id} ${step.feature}${call ? ` ${call.status}` : ""}` });
  }
  if (call?.status === "refunded") throw new Error(`${step.id}: the run failed and was refunded; nothing was stored`);
  // The lookup hangs off the press function (`helpMeChoose.rows`), not the step: `step.rows` was always undefined, so
  // the first paid run's summary carried only the call id.
  if (call && typeof step.run.rows !== "function") throw new Error(`${step.id}: no stored-row lookup`);
  const ids = call ? { model_calls: call.id, ...(await step.run.rows(call.id)), ...stored } : { ...stored, reused: "a stored read for the same words; no call made" };
  return { usd, ids, model: call?.model ?? null };
}

// The steps' presses. Each returns the ids of what it stored that the call id cannot find.
async function helpMeChoose(page) {
  await page.goto(`${BASE}/commanders/choose`, { waitUntil: "networkidle" });
  await page.locator(`${PAGE} textarea`).fill(WISH);
  await page.locator(`${PAGE} form button[type='submit']`).filter({ visible: true }).first().click();
  await page.waitForFunction((scope) => {
    const s = document.querySelector(scope);
    return !!s && !s.querySelector("[data-testid='results-searching']") && !!s.querySelector("[data-testid='order-line']");
  }, PAGE, { timeout: MODEL_WAIT_MS });
  const r = new URL(page.url()).searchParams.get("r");
  return r ? { intake_reads: r } : {};
}
helpMeChoose.rows = async (callId) => ({ intake_reads: (await sql`select id::text from intake_reads where model_call_id = ${callId}::uuid`)[0]?.id ?? null });

async function overview(page) {
  await openAnalysis(page, "played");
  const slot = onPage(page, "[data-testid='synopsis-overview']").first();
  await slot.waitFor({ timeout: 60_000 });
  const write = slot.getByRole("button", { name: /^Write one/ }).first();
  if ((await write.count()) > 0 && (await write.isEnabled())) {
    await write.click();
  } else {
    // A reading that is not current disables Write one: Analyze writes the reading and the overview together, but
    // only when its note says it will (a credit or the free run), never a bare reading.
    const note = await onPage(page, "#panel-analysis [data-testid='press-note']").first().textContent({ timeout: 15_000 }).catch(() => "");
    const variant = noteVariant(note);
    if (variant !== "credit" && variant !== "free") throw new Error(`Overview: no Write one, and Analyze would not write the overview (${variant})`);
    await onPageRole(page, "button", /^Analyze$/).first().click();
  }
  await slot.getByRole("button", { name: /View full overview/ }).first().waitFor({ state: "visible", timeout: MODEL_WAIT_MS });
  return {};
}
overview.rows = async (callId) => ({ deck_synopses: (await sql`select id::text from deck_synopses where model_call_id = ${callId}::uuid`)[0]?.id ?? null });

async function suggestedChanges(page) {
  await openTile(page, "played", "Suggested changes");
  const count = onPageRole(page, "textbox", "Cards to change").first();
  await count.fill(String(V2_COUNT));
  await count.press("Enter");
  if ((await count.inputValue()) !== String(V2_COUNT)) throw new Error(`Suggested changes: the count reads ${await count.inputValue()}, not ${V2_COUNT}`);
  await onPageRole(page, "button", /^Suggest changes/).first().click();
  await onPageRole(page, "button", /^New run/).first().waitFor({ timeout: MODEL_WAIT_MS });
  return {};
}
suggestedChanges.rows = async (callId) => {
  const [run] = await sql`select id::text, requested_count, status from deck_suggestion_runs where model_call_id = ${callId}::uuid`;
  if (run && run.requested_count !== V2_COUNT) throw new Error(`Suggested changes: the run asked for ${run.requested_count}, not ${V2_COUNT}`);
  return { deck_suggestion_runs: run?.id ?? null, run_status: run?.status ?? null };
};

async function lookDeeper(page) {
  await openTile(page, "over", "Proposed cuts");
  await onPageRole(page, "button", /^Look deeper/).first().click();
  return {};
}
lookDeeper.rows = async (callId) => {
  // The press returns before the run settles; `settledCall` has waited for its unit, and the run row settles with it.
  const [run] = await sql`select id::text, status from deck_suggestion_runs where model_call_id = ${callId}::uuid and tool = 'proposed_cuts'`;
  return { deck_suggestion_runs: run?.id ?? null, run_status: run?.status ?? null };
};

async function whichDeck(page) {
  await page.goto(`${BASE}/collection?view=grid&q=${encodeURIComponent(SHARED_CARD)}`, { waitUntil: "networkidle" });
  await page.locator(`${PAGE} button:has(div[style*="aspect-ratio"])`).first().click();
  await page.getByRole("button", { name: `Find a deck for ${SHARED_CARD}` }).first().click({ timeout: 15_000 });
  await page.getByRole("button", { name: /^Which deck needs/ }).first().click({ timeout: 15_000 });
  await page.locator("[data-testid='read-band-running']").first().waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  await page.locator("[data-testid='read-band-running']").first().waitFor({ state: "detached", timeout: MODEL_WAIT_MS });
  return {};
}
whichDeck.rows = async (callId) => ({ fits_reads: (await sql`select id::text from fits_reads where model_call_id = ${callId}::uuid`)[0]?.id ?? null });

// The free tools: no ledger entry, but a press that reserves any model call stops the run (`assertNoCall`).
async function analysis(page) {
  await openAnalysis(page, "played");
  const invite = onPageRole(page, "button", /^Analyze$/);
  if ((await invite.count()) > 0 && (await invite.first().isVisible())) {
    const note = await onPage(page, "#panel-analysis [data-testid='press-note']").first().textContent({ timeout: 15_000 }).catch(() => "");
    const variant = noteVariant(note);
    // After the Overview step the overview exists, so Analyze must write none; anything else would spend unpriced.
    if (variant === "credit" || variant === "free" || variant === "unknown") throw new Error(`Analysis: Analyze would write an overview (${variant}); refusing`);
    await invite.first().click();
  }
  await onPage(page, 'section[aria-label="Your bracket"]').first().waitFor({ state: "visible", timeout: 60_000 });
  const [p] = await sql`select deck_id::text, computed_at from deck_profiles where deck_id = ${ABOUT_DECK_IDS.played}::uuid`;
  return { deck_profiles: p?.deck_id ?? null, computed_at: p?.computed_at ?? null };
}

async function topOff(page) {
  await page.goto(`${BASE}/decks/${ABOUT_DECK_IDS.under}`, { waitUntil: "domcontentloaded" });
  // Opened, not committed: opening reads options only (`bulkFillOptions`); the ticks live in the browser.
  await page.locator(`${PAGE} button[aria-label^="Choose the cards for the last"]`).first().click({ timeout: 60_000 });
  await page.getByRole("button", { name: /^Add .* cards? to the deck,/ }).first().waitFor({ state: "visible", timeout: 60_000 });
  return { committed: false };
}

async function manaBalance(page) {
  await openAnalysis(page, "played");
  await page.locator(`${PAGE} button[data-tool-tile='mana']`).first().click({ timeout: 60_000 });
  await page.locator("section[aria-labelledby='mana-heading'][data-mana-state]").first().waitFor({ state: "visible", timeout: 60_000 });
  let row = null;
  for (let i = 0; i < 20 && !row; i += 1) {
    [row] = await sql`select id::text from deck_tool_counts where deck_id = ${ABOUT_DECK_IDS.played}::uuid and tool = 'mana_balance' order by created_at desc limit 1`;
    if (!row) await sleep(500);
  }
  return { deck_tool_counts: row?.id ?? null };
}

async function freeStep(step, page) {
  const known = await knownCalls();
  const ids = await step.run(page);
  await sleep(2000);
  const n = (await newCalls(known)).length;
  if (n > 0) throw new Error(`${step.id}: a free tool reserved ${n} model call(s)`);
  return { usd: 0, ids, model: null };
}

acquireRunLock(LEDGER);
let server = null;
const browser = await chromium.launch();
let failed = false;
try {
  server = await startServer();
  console.log(`\nnext start on ${BASE} (pid ${server.child.pid}); modelCalls ${server.health.modelCalls}`);
  if (server.health.modelCalls !== "on") throw new Error(`the server reports modelCalls ${server.health.modelCalls}`);
  await clerkSetup();
  const context = await browser.newContext({ viewport: { width: 1300, height: 900 } });
  const page = await context.newPage();
  await signIn(page);
  for (const step of STEPS) {
    console.log(`\n${step.id}: ${step.tool}${step.deck ? ` on ${deckName(step.deck)}` : ""}`);
    const t = Date.now();
    const result = step.feature ? await modelStep(step, page) : await freeStep(step, page);
    if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/demo-${step.id}.png` });
    summary.steps.push({ step: step.id, tool: step.tool, deck: step.deck ? deckName(step.deck) : null, feature: step.feature, model: result.model, worstUsd: worstUsd(step.feature), settledUsd: result.usd, seconds: Math.round((Date.now() - t) / 1000), stored: result.ids });
    writeSummary();
    console.log(`  settled $${result.usd.toFixed(4)}; stored ${JSON.stringify(result.ids)}`);
  }
} catch (error) {
  failed = true;
  console.error(error);
  summary.error = String(error?.message ?? error);
} finally {
  writeSummary();
  await browser.close();
  // Stopped by the PID this process started, never by pattern.
  if (server?.child.exitCode === null) server.child.kill("SIGTERM");
}
summary.spentUsd = summary.steps.reduce((n, s) => n + s.settledUsd, 0);
writeSummary();
console.log(`\n${failed ? "STOPPED" : "Done"}: settled $${summary.spentUsd.toFixed(4)} this run; ledger now $${spent(readLedger(LEDGER)).toFixed(3)} of $${CAP_USD}. Summary: ${outFile.pathname}`);
process.exitCode = failed ? 1 : 0;
