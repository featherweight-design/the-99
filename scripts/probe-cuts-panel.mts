// Proposed cuts on the Analysis tab, measured in a real browser at 1300x900 and 390x844.
//
// jsdom lays nothing out, so every claim here is about geometry or about what is DRAWN:
//  - the count state (C1): the panel mounts after Suggested changes, `Look deeper` is the one
//    filled button and 44px tall on a phone, the count rows draw their figures, no card is named,
//    and nothing is wider than the viewport.
//  - a stored result (C3): one line per cut with the Suggestion tag, the sentence and its chips,
//    `Cut` and `Keep` 44px on a phone, and the count below under its divider.
//  - a Cut pressed from the result writes the list and the result STAYS (the re-offer rule): the
//    row collapses to its answered form and the offer does not come back.
// (An edit that is not one of the result's cuts retires it, and Undo, locks and the commander are
// `probe:cuts-state`'s: they are database facts, and this probe is about what is drawn.)
//
// THE FIXTURE IS A STORED RESULT, never a model call. It clones an over-100 deck under the probe
// account (the first one on the database, or PROBE_CUTS_DECK), writes one ok run with three cuts
// through the real run store (the SAME flags as the server it drives: pass NEVER_CUT_ENABLED to both or neither, because locks are in the fingerprint), and deletes the clone in a `finally`. Local-dev or a scratch branch
// only, NEVER staging or production: it writes. Needs a server with ANALYSIS_TAB_ENABLED and
// PROPOSED_CUTS_ENABLED on, signed in through Clerk's dev instance.
//
//   PROBE_BASE=http://localhost:3347 pnpm probe:cuts-panel
//   PROBE_WIDTH=390 runs one width. PROBE_SHOTS=<dir> also saves the panel at each width and phase.
import { requireEnv } from "./lib/env.mjs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { Pool } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { chromium, type Page } from "playwright";

process.env.PROPOSED_CUTS_ENABLED = "true";
const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
const SHOTS = process.env.PROBE_SHOTS;
const { readProposedCuts } = await import("../src/lib/decks/cuts-read");
const { persistCutsRun, startCutsRun } = await import("../src/lib/tuning/cuts-run-store");

const pool = new Pool({ connectionString: DATABASE_URL });
const q = async (text: string, params: unknown[] = []) => (await pool.query(text, params)).rows;
let failures = 0;
const report = (label: string, ok: boolean, detail: unknown) => {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} - ${JSON.stringify(detail)}`);
  if (!ok) failures += 1;
};
const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, desktop: true },
  { label: 390, viewport: { width: 390, height: 844 }, desktop: false },
];

async function userId(): Promise<string> {
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`, { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } });
  const users = (await res.json()) as { id: string }[];
  if (!users[0]) throw new Error("the probe account is not in this Clerk instance");
  return users[0].id;
}

async function clone(owner: string, onId: (id: string) => void): Promise<string> {
  const source = process.env.PROBE_CUTS_DECK
    ?? (await q(`select d.id from decks d join deck_cards c on c.deck_id = d.id group by d.id having sum(c.quantity) + 1 + (d.partner_oracle_id is not null)::int > 100 limit 1`))[0]?.id;
  if (!source) throw new Error("no over-100 deck to clone on this database");
  const id = randomUUID();
  // Published before the first write, so a failure part-way still reaches the cleanup.
  onId(id);
  const cols = (await q(`select column_name from information_schema.columns where table_name = 'decks' order by ordinal_position`)).map((r) => r.column_name as string);
  const select = cols.map((c) => (c === "id" ? "$1::uuid" : c === "user_id" ? "$2" : `"${c}"`)).join(", ");
  await q(`insert into decks (${cols.map((c) => `"${c}"`).join(", ")}) select ${select} from decks where id = $3`, [id, owner, source]);
  await q(`insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, oracle_id, quantity, auto from deck_cards where deck_id = $2`, [id, source]);
  return id;
}

async function signIn(page: Page) {
  await clerkSetup();
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = (window as any).Clerk.client.signIn; // eslint-disable-line @typescript-eslint/no-explicit-any
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f: { strategy: string }) => f.strategy === "email_code");
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await (window as any).Clerk.setActive({ session: attempt.createdSessionId }); // eslint-disable-line @typescript-eslint/no-explicit-any
      return null;
    } catch (error) {
      return String((error as Error).message ?? error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

const panel = (page: Page) => page.locator('main section[aria-labelledby="cuts-heading"]');

async function openAnalysis(page: Page, deckId: string) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = page.locator("main").getByRole("tab", { name: /analysis/i }).first();
  await tab.waitFor({ timeout: 30_000 }).catch(async (error) => {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cuts-failed-tab.png` });
    throw error;
  });
  await tab.click();
  // No reading is needed: Proposed cuts is for a deck OVER its size, which a reading refuses.
  await panel(page).waitFor({ timeout: 60_000 }).catch(async (error) => {
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/cuts-failed-open.png`, fullPage: true });
    throw error;
  });
  await page.waitForTimeout(500);
}

const geometry = (page: Page) => page.evaluate(() => {
  const root = document.querySelector('main section[aria-labelledby="cuts-heading"]')!;
  const h = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().height) : null);
  const btn = (re: RegExp) => [...root.querySelectorAll("button")].find((b) => re.test(b.textContent ?? ""));
  return {
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    lookDeeperH: h(btn(/^Look deeper/) ?? null),
    cutH: h(btn(/^Cut$/) ?? null),
    keepH: h(btn(/^Keep$/) ?? null),
    articles: root.querySelectorAll("article").length,
    tags: [...root.querySelectorAll("span")].filter((s) => s.textContent === "Suggestion").length,
    countRows: root.querySelectorAll('[data-testid^="count-"]').length,
    text: (root as HTMLElement).innerText,
  };
});

const owner = await userId();
let deckId = "";
// The ledger rows this probe made, and only those: the account is persistent.
const callIds: string[] = [];
const browser = await chromium.launch();
try {
  for (const w of WIDTHS.filter((x) => !process.env.PROBE_WIDTH || String(x.label) === process.env.PROBE_WIDTH)) {
    // A fresh clone per width: an Undo restores the row but the list is not byte-identical.
    if (deckId) await q(`delete from decks where id = $1`, [deckId]);
    await clone(owner, (id) => { deckId = id; });
    const ctx = await browser.newContext({ viewport: w.viewport });
    const page = await ctx.newPage();
    // tsx's keepNames wraps helpers in `__name`, which does not exist in the page.
    await page.addInitScript("window.__name = (f) => f;");
    await signIn(page);
    await openAnalysis(page, deckId);
    const shot = (name: string) => SHOTS ? panel(page).screenshot({ path: `${SHOTS}/cuts-${name}-${w.label}.png` }) : Promise.resolve();

    // C1: the count.
    let g = await geometry(page);
    report(`${w.label} C1 no overflow`, !g.overflow, g.overflow);
    report(`${w.label} C1 Look deeper drawn${w.desktop ? "" : ", 44 tall"}`, w.desktop ? g.lookDeeperH !== null : g.lookDeeperH === 44, g.lookDeeperH);
    report(`${w.label} C1 count rows drawn, no card named, no result`, g.countRows > 0 && g.tags === 0 && g.articles === 0, { rows: g.countRows });
    report(`${w.label} C1 never-cut foot`, /Never named:/.test(g.text), null);
    await shot("c1-count");

    // C3: a stored result for the deck as it stands now.
    const inputs = (await readProposedCuts(deckId, owner))!;
    const picks = inputs.facts.cards.slice(0, 3);
    await q(`delete from deck_suggestion_runs where deck_id = $1`, [deckId]);
    const run = await startCutsRun(owner, deckId, inputs.fingerprint, inputs.readVersion);
    if (run.kind !== "started") throw new Error(`start: ${run.kind}`);
    // Recorded the moment it exists: a failure below must still reach the cleanup.
    callIds.push(run.callId);
    await persistCutsRun(run, picks.map((c, i) => ({ oracleId: c.oracleId, name: c.name, reason: `${c.name} is the least-played of the cards the list holds.`, cites: [{ kind: "offList" as const }], position: i })),
      { askedCount: inputs.facts.over, survivedCount: 3, keptCount: 3, over: inputs.facts.over, drops: [] });
    await q(`update model_calls set status = 'refunded' where id = $1`, [run.callId]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await openAnalysis(page, deckId);
    g = await geometry(page);
    report(`${w.label} C3 one line per cut with the Suggestion tag`, g.articles === 3 && g.tags === 3, { articles: g.articles, tags: g.tags });
    report(`${w.label} C3 Cut and Keep${w.desktop ? "" : " 44 tall"}`, w.desktop ? g.cutH !== null && g.keepH !== null : g.cutH === 44 && g.keepH === 44, { cut: g.cutH, keep: g.keepH });
    report(`${w.label} C3 the count sits below the result, no overflow`, /THE COUNT|The count/i.test(g.text) && !g.overflow, null);
    report(`${w.label} C3 the offer is gone while a result stands`, g.lookDeeperH === null, g.lookDeeperH);
    await shot("c3-result");

    // The hover preview is on the cut's thumbnail and name only (Hugh, 2026-10-12): a preview over the row covers the
    // reason being read. Desktop only, since the box is hidden below md.
    if (w.desktop) {
      const article = panel(page).locator("article").first();
      const boxOpen = () => page.evaluate(() => document.querySelector('[data-testid="hover-preview"]') !== null);
      await page.mouse.move(2, 2);
      await article.locator("p").first().hover();
      await page.waitForTimeout(700);
      const overReason = await boxOpen();
      await page.mouse.move(2, 2);
      await page.waitForTimeout(300);
      await article.locator("button").first().hover();
      await page.waitForTimeout(700);
      const overName = await boxOpen();
      report(`${w.label} C3 hover: none over the reason, the card over its name`, !overReason && overName, { overReason, overName });
      await page.mouse.move(2, 2);
      await page.waitForTimeout(300);
    }

    // Cut writes to the list, and the result stays: the row collapses to its answered form and the
    // offer does not come back. The action chains the run's fingerprint before it returns, so the
    // panel's re-read sees a result that is still current.
    await panel(page).getByRole("button", { name: "Cut", exact: true }).first().click();
    await page.waitForFunction(() => document.querySelectorAll('main section[aria-labelledby="cuts-heading"] [data-testid="answered-cut"]').length === 1, null, { timeout: 40_000 }).catch(() => {});
    g = await geometry(page);
    report(`${w.label} C4 Cut collapses the row and the offer does not return`, /\bcut\b/.test(g.text) && g.lookDeeperH === null && g.articles === 2, { articles: g.articles, offer: g.lookDeeperH });
    await shot("c4-answered");
    await ctx.close();
  }
} finally {
  if (deckId) {
    await q(`delete from deck_suggestion_runs where deck_id = $1`, [deckId]).catch((e) => { failures += 1; console.error("cleanup runs:", e); });
    await q(`delete from decks where id = $1`, [deckId]).catch((e) => { failures += 1; console.error("cleanup deck:", e); });
  }
  if (callIds.length > 0) await q(`delete from model_calls where id = any($1::uuid[])`, [callIds]).catch((e) => { failures += 1; console.error("cleanup calls:", e); });
  await browser.close();
  await pool.end();
}
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
