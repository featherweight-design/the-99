// Card details page through a recommended-card list in its DRAWN order, from the three places a player is handed a
// list of cards to act on, at 1300x900 (the modal's Next / Previous buttons) and 390x844 (the phone has no buttons: a
// swipe on the card band pages).
//
//   1. Suggest swaps: the Add and Cut sides of a stored Suggested changes v2 run (`SuggestedChangesPickLine` -> `Name`).
//   2. Proposed cuts: a stored run's rows (`CutRow`).
//   3. Upgrade this precon: a kept run's result, which draws the same `SuggestedChangesRun`.
// For each list: open the first card, assert the dialog names row 1, page to the next (button / swipe left) and assert it
// names row 2 OF THAT LIST (read from the DOM, never hardcoded), then page back (button / swipe right) and assert row 1.
// Fails on main for 1 and 3: a name there opened a one-card list, so there was nothing to page to.
//
// FIXTURE (a scratch branch of local-dev ONLY; `assertScratchBranch` refuses production, staging and local-dev before the
// first write): user-scope overrides for SUGGESTED_CHANGES_V2_ENABLED and PRECON_UPGRADE_ENABLED on the probe account; a
// 100-card colourless deck of its own with a stub-run Suggested changes result (no model call); a clone of an over-100
// deck with a stored cuts run; one kept precon upgrade run. Every row is deleted in a `finally`.
//
//   PROBE_BASE=http://localhost:3427 pnpm probe:recommended-paging
//   PROBE_WIDTH=390 runs one width. PROBE_ONLY=swaps|cuts|precon runs one list.
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { Pool } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";
import { chromium, type Locator, type Page } from "playwright";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL, CLERK_SECRET_KEY } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(BASE)) throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
const ONLY = process.env.PROBE_ONLY;

const { resolveFlagsStrict } = await import("../src/lib/flags/snapshot");
const { readProposedCuts } = await import("../src/lib/decks/cuts-read");
const { persistCutsRun, startCutsRun } = await import("../src/lib/tuning/cuts-run-store");
const { STUB_ADDITIONS } = await import("../src/lib/tuning/stub");
const { computeAndStoreProfile, requestProfileDeps } = await import("../src/lib/profile/stored");

const pool = new Pool({ connectionString: DATABASE_URL });
const q = async (text: string, params: unknown[] = []) => (await pool.query(text, params)).rows;
let failures = 0;
const report = (label: string, ok: boolean, detail: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} - ${JSON.stringify(detail)}`);
  if (!ok) failures += 1;
};
const WIDTHS = [
  { label: 1300, viewport: { width: 1300, height: 900 }, desktop: true },
  { label: 390, viewport: { width: 390, height: 844 }, desktop: false },
];
const PRECON_FILE = "KeenEngineering_FDC";
const PRECON_KEY = "probe/recommended-paging";
const SWITCHES = ["SUGGESTED_CHANGES_V2_ENABLED", "PRECON_UPGRADE_ENABLED"];

async function userId(): Promise<string> {
  const res = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`, { headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` } });
  const users = (await res.json()) as { id: string }[];
  if (!users[0]) throw new Error("the probe account is not in this Clerk instance");
  return users[0].id;
}

async function signIn(page: Page) {
  await clerkSetup();
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => (window as unknown as { Clerk?: { loaded: boolean } }).Clerk?.loaded, null, { timeout: 60_000 });
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

// ---------------------------------------------------------------- fixtures

const made = { decks: [] as string[], callIds: [] as string[], preconRun: "" };

async function cloneOverDeck(owner: string): Promise<string> {
  const source = (await q(`select d.id from decks d join deck_cards c on c.deck_id = d.id group by d.id having sum(c.quantity) + 1 + (d.partner_oracle_id is not null)::int > 100 limit 1`))[0]?.id;
  if (!source) throw new Error("no over-100 deck to clone on this database");
  const id = randomUUID();
  made.decks.push(id);
  const cols = (await q(`select column_name from information_schema.columns where table_name = 'decks' order by ordinal_position`)).map((r) => r.column_name as string);
  const select = cols.map((c) => (c === "id" ? "$1::uuid" : c === "user_id" ? "$2" : `"${c}"`)).join(", ");
  await q(`insert into decks (${cols.map((c) => `"${c}"`).join(", ")}) select ${select} from decks where id = $3`, [id, owner, source]);
  await q(`insert into deck_cards (deck_id, oracle_id, quantity, auto) select $1, oracle_id, quantity, auto from deck_cards where deck_id = $2`, [id, source]);
  return id;
}

async function seedCuts(owner: string): Promise<string> {
  return cloneOverDeck(owner);
}

/** A stored Proposed cuts result for the deck as it stands. Written AFTER the page has read the deck once: a result already
 *  stored when a visit began is a prior visit's and is drawn only in History. */
async function storeCuts(owner: string, flags: NodeJS.ProcessEnv, deckId: string): Promise<void> {
  const inputs = (await readProposedCuts(deckId, owner, flags))!;
  const picks = inputs.facts.cards.slice(0, 3);
  await q(`delete from deck_suggestion_runs where deck_id = $1`, [deckId]);
  const run = await startCutsRun(owner, deckId, inputs.fingerprint, inputs.readVersion);
  if (run.kind !== "started") throw new Error(`cuts start: ${run.kind}`);
  made.callIds.push(run.callId);
  await persistCutsRun(run, picks.map((c, i) => ({ oracleId: c.oracleId, name: c.name, reason: `${c.name} is the least-played of the cards the list holds.`, cites: [{ kind: "offList" as const }], position: i })),
    { askedCount: inputs.facts.over, survivedCount: 3, keptCount: 3, over: inputs.facts.over, drops: [] });
  await q(`update model_calls set status = 'refunded' where id = $1`, [run.callId]);
}

/** A 100-card colourless deck (legend + 99 that are none of the stub's additions) and a settled stub Suggested changes run. */
async function seedSwaps(owner: string, flags: NodeJS.ProcessEnv): Promise<string> {
  const legend = (await q(`select oracle_id from cards where type_line ilike '%Legendary Artifact Creature%' and commander_legal and color_identity = '{}' order by oracle_id limit 1`))[0]?.oracle_id;
  if (!legend) throw new Error("no colourless legend");
  const body = (await q(
    `select oracle_id from cards where commander_legal and color_identity = '{}' and type_line not ilike '%Land%' and type_line not ilike '%Legendary%'
       and oracle_id <> $1::uuid and name <> all($2::text[]) order by oracle_id limit 99`, [legend, [...STUB_ADDITIONS]]));
  if (body.length < 99) throw new Error("not enough colourless cards");
  const id = (await q(`insert into decks (user_id, name, commander_oracle_id) values ($1, 'probe recommended paging', $2::uuid) returning id`, [owner, legend]))[0].id as string;
  made.decks.push(id);
  await q(`insert into deck_cards (deck_id, oracle_id, quantity) select $1::uuid, x, 1 from unnest($2::uuid[]) x`, [id, body.map((b) => b.oracle_id)]);
  // Suggested changes works from the deck's stored reading: the Analyze press, called directly.
  const reading = await computeAndStoreProfile(id, owner, requestProfileDeps(flags));
  if (!reading || reading.kind === "illegal") throw new Error(`reading: ${reading?.kind ?? "none"}`);
  return id;
}

async function seedPrecon(owner: string): Promise<void> {
  const adds = await q(`select oracle_id, name from cards where name = any($1) order by name`, [["Cyclonic Rift", "Rhystic Study", "Arcane Signet"]]);
  const cuts = await q(
    `select c.oracle_id, c.name from precon_cards pc join cards c on c.oracle_id = pc.oracle_id
     where pc.file_name = $1 and not pc.is_commander and c.type_line not like '%Land%' order by pc.position limit $2`, [PRECON_FILE, adds.length]);
  if (adds.length < 2 || cuts.length < adds.length) throw new Error(`precon fixture cards missing: ${adds.length} adds, ${cuts.length} cuts`);
  const pairs = adds.map((a, i) => ({ cutId: cuts[i].oracle_id, cut: cuts[i].name, addId: a.oracle_id, add: a.name, addCents: 100, reason: "probe", cutReason: null, position: i + 1 }));
  const call = (await q(`insert into model_calls (user_id, feature, status) values ($1, 'precon_upgrade', 'refunded') returning id`, [owner]))[0].id as string;
  made.callIds.push(call);
  made.preconRun = (await q(
    `insert into precon_upgrades (user_id, precon_file, strategy_key, strategy_label, status, model_call_id, model, pairs, buy_total_cents, bracket_before, bracket_after, bracket_target, finished_at, seen_at)
     values ($1, $2, $3, 'Paging probe', 'done', $4, 'probe', $5::jsonb, $6, 2, 3, 3, now(), now()) returning id`,
    [owner, PRECON_FILE, PRECON_KEY, call, JSON.stringify(pairs), adds.length * 100]))[0].id;
}

// ---------------------------------------------------------------- opening each list

/** The day's one free run is shared by the lists: set the call of one feature so the one under test can reserve it, or draw. */
const setCalls = (feature: string, status: "spent" | "refunded") =>
  q(`update model_calls set status = $3 where user_id = $1 and feature = $2`, [owner, feature, status]);

async function openSwaps(page: Page, deckId: string) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = page.locator("main").getByRole("tab", { name: /^tuning/i }).first();
  await tab.waitFor({ timeout: 60_000 });
  await tab.click();
  // The live tile needs the deck's stored reading, which `seedSwaps` computes.
  const tile = page.locator("main button[data-tool-tile='suggested']");
  await tile.waitFor({ timeout: 60_000 });
  await tile.click();
  // The dev server runs with `TUNING_V2_STUB_DELAY_MS`: the press draws the staged stub, never a model. A stored run from a
  // prior visit is not drawn, so the run happens in this visit.
  const press = page.getByRole("button", { name: /^(suggest changes|run it again)/i });
  await press.waitFor({ timeout: 60_000 });
  await press.click();
  await page.locator("[data-sc-side='add'] li").first().waitFor({ timeout: 60_000 });
}

async function openCuts(page: Page, deckId: string, flags: NodeJS.ProcessEnv) {
  await page.goto(`${BASE}/decks/${deckId}`, { waitUntil: "domcontentloaded" });
  const tab = page.locator("main").getByRole("tab", { name: /^tuning/i }).first();
  await tab.waitFor({ timeout: 60_000 });
  await tab.click();
  const first = page.locator("main button[data-tool-tile='cuts']");
  const panel0 = page.locator('main section[aria-labelledby="cuts-heading"]');
  await Promise.race([first.waitFor({ timeout: 30_000 }), panel0.waitFor({ timeout: 30_000 })]).catch(() => {});
  if (await first.count()) await first.click();
  // The panel has read the deck: the visit's baseline is "no result".
  await panel0.getByRole("button", { name: /^name the cuts/i }).waitFor({ timeout: 60_000 });
  await storeCuts(owner, flags, deckId);
  // A reload would start a new visit, and the stored result would be its baseline: remount the panel inside this one.
  await page.locator("main").getByRole("tab", { name: /^your deck/i }).first().click();
  await page.waitForTimeout(500);
  await tab.click();
  const tile = page.locator("main button[data-tool-tile='cuts']");
  const panel = page.locator('main section[aria-labelledby="cuts-heading"]');
  await Promise.race([tile.waitFor({ timeout: 30_000 }), panel.waitFor({ timeout: 30_000 })]).catch(() => {});
  if (await tile.count()) await tile.click();
  await panel.locator("article").first().waitFor({ timeout: 60_000 });
}

async function openPrecon(page: Page) {
  // The deck page may still be settling a request of its own: a navigation it supersedes is aborted, so go again.
  await page.waitForTimeout(1000);
  await page.goto(`${BASE}/decks/precons/${PRECON_FILE}`, { waitUntil: "domcontentloaded" }).catch(async () => {
    await page.waitForTimeout(1500);
    await page.goto(`${BASE}/decks/precons/${PRECON_FILE}`, { waitUntil: "domcontentloaded" });
  });
  const entry = page.getByRole("button", { name: "Upgrade this precon" }).filter({ visible: true }).first();
  await entry.waitFor({ state: "visible", timeout: 60_000 });
  await entry.click();
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout: 20_000 });
  const last = dialog.locator("[data-last-run] button").first();
  if (await last.isVisible().catch(() => false)) await last.click();
  await dialog.locator("[data-sc-side='add'] li").first().waitFor({ timeout: 30_000 });
}

// ---------------------------------------------------------------- paging

const title = (page: Page) => page.locator("#card-modal-title").first();
const titleText = async (page: Page) => ((await title(page).textContent({ timeout: 2000 }).catch(() => null)) ?? "").trim();
async function waitTitle(page: Page, want: string): Promise<string> {
  await page.waitForFunction((n) => (document.querySelector("#card-modal-title")?.textContent ?? "").trim() === n, want, { timeout: 10_000 }).catch(() => {});
  return titleText(page);
}

/** A drag the gesture reads as held: moves 16ms apart, a pause before the release. */
async function drag(page: Page, x0: number, y: number, x1: number) {
  await page.mouse.move(x0, y);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(x0 + ((x1 - x0) * i) / 16, y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(120);
  await page.mouse.up();
}

async function swipe(page: Page, dir: "left" | "right") {
  const g = await page.evaluate(() => {
    const mid = (sel: string) => { const r = document.querySelector(sel)?.getBoundingClientRect(); return r ? { mid: r.left + r.width / 2, top: r.top, width: r.width } : null; };
    return { card: mid("[data-testid=modal-art-mobile]"), next: mid("[data-testid=phone-peek-next]"), prev: mid("[data-testid=phone-peek-prev]") };
  });
  if (!g.card) throw new Error("no phone card band");
  const peek = dir === "left" ? g.next : g.prev;
  const pitch = peek ? Math.abs(peek.mid - g.card.mid) : g.card.width * 0.8;
  const y = g.card.top + g.card.width * 0.5;
  const x0 = dir === "left" ? 300 : 90;
  await drag(page, x0, y, dir === "left" ? x0 - pitch * 0.6 : x0 + pitch * 0.6);
}

/** Opens the first of `names` through `press`, pages forward and back, and reports each step. */
async function pageThrough(page: Page, w: (typeof WIDTHS)[number], list: string, names: string[], press: () => Promise<void>) {
  const tag = `${w.label} ${list}`;
  report(`${tag}: the list draws at least two cards`, names.length >= 2, names);
  if (names.length < 2) return;
  await press();
  const first = await waitTitle(page, names[0]);
  report(`${tag}: card details names row 1`, first === names[0], { got: first, want: names[0] });
  // A one-card list has no Next button: that is a FAIL to record, not a reason to stop the other lists.
  if (w.desktop) await page.getByRole("button", { name: "Next card", exact: true }).first().click({ timeout: 4_000 }).catch(() => {});
  else await swipe(page, "left");
  const second = await waitTitle(page, names[1]);
  report(`${tag}: ${w.desktop ? "Next" : "swipe left"} names row 2`, second === names[1], { got: second, want: names[1] });
  // PROBE_SHOTS=<dir>: the paged card, one image per list and width, for the PR's contact sheet.
  if (process.env.PROBE_SHOTS) await page.screenshot({ path: `${process.env.PROBE_SHOTS}/${w.label}-${list.replace(/\W+/g, "-")}.png` }).catch(() => {});
  if (w.desktop) await page.getByRole("button", { name: "Previous card", exact: true }).first().click({ timeout: 4_000 }).catch(() => {});
  else await swipe(page, "right");
  const back = await waitTitle(page, names[0]);
  report(`${tag}: ${w.desktop ? "Prev" : "swipe right"} is back on row 1`, back === names[0], { got: back, want: names[0] });
  await page.keyboard.press("Escape");
  await page.waitForFunction(() => !document.querySelector("#card-modal-title"), null, { timeout: 8_000 }).catch(() => {});
}

const names = async (rows: Locator) => (await rows.evaluateAll((els) => els.map((e) => (e.textContent ?? "").trim()))).filter(Boolean);

async function scSide(page: Page, w: (typeof WIDTHS)[number], list: string, scope: Locator, sides: ("add" | "cut")[]) {
  for (const side of sides) {
    // A phone draws one half at a time, behind the Additions / Cuts tabs.
    if (!w.desktop && side === "cut") await scope.getByRole("tab", { name: /^cuts/i }).filter({ visible: true }).first().click();
    const rows = scope.locator(`[data-sc-side='${side}'] li button[aria-label^='Open ']`).filter({ visible: true });
    // The cuts stream in after the additions: wait for the side before reading it.
    await rows.first().waitFor({ timeout: 60_000 }).catch(() => {});
    const list2 = await names(rows);
    await pageThrough(page, w, `${list} ${side} side`, list2, () => rows.first().click());
  }
}

// ---------------------------------------------------------------- run

const owner = await userId();
let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;
let flagsWritten = false;
let lastPage: Page | null = null;
try {
  const branch = (await q(`select current_setting('neon.branch_id', true) as b`))[0]?.b;
  assertScratchBranch(branch, "probe:recommended-paging");
  console.log(`branch ${branch}`);
  await q(`delete from flag_overrides where scope = 'user' and user_id = $1 and switch = any($2::text[]) and updated_by = 'probe:recommended-paging'`, [owner, SWITCHES]);
  for (const s of SWITCHES) {
    const had = (await q(`select 1 from flag_overrides where scope = 'user' and user_id = $1 and switch = $2`, [owner, s])).length;
    if (!had) await q(`insert into flag_overrides (switch, scope, user_id, value, updated_by) values ($1, 'user', $2, 'on', 'probe:recommended-paging')`, [s, owner]);
  }
  flagsWritten = true;
  const flags = await resolveFlagsStrict(owner);
  // Cuts first: it refunds its call, while the swaps run keeps its charge (a refunded run is not drawn as current) and
  // so spends the day's one free run.
  const cutsDeck = !ONLY || ONLY === "cuts" ? await seedCuts(owner) : "";
  const swapsDeck = !ONLY || ONLY === "swaps" ? await seedSwaps(owner, flags) : "";
  if (!ONLY || ONLY === "precon") await seedPrecon(owner);

  browser = await chromium.launch();
  for (const w of WIDTHS.filter((x) => !process.env.PROBE_WIDTH || String(x.label) === process.env.PROBE_WIDTH)) {
    const ctx = await browser.newContext(w.desktop ? { viewport: w.viewport } : { viewport: w.viewport, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.addInitScript("window.__name = (f) => f;");
    lastPage = page;
    await signIn(page);
    if (swapsDeck) {
      await openSwaps(page, swapsDeck);
      await scSide(page, w, "swaps", page.locator("main"), ["add"]);
      // A fresh deck state for the next width: a deck holding a run offers "Run it again" behind a confirm, not the press.
      for (const r of await q(`select model_call_id from deck_suggestion_runs where deck_id = $1`, [swapsDeck])) if (r.model_call_id) made.callIds.push(r.model_call_id);
      await q(`delete from deck_suggestion_runs where deck_id = $1`, [swapsDeck]);
      await setCalls("suggested_changes_v2", "refunded");
      // the staged stub's cuts mostly fail the app's own cut checks, leaving one: no pair to page
    }
    if (cutsDeck) {
      await openCuts(page, cutsDeck, flags);
      const rows = page.locator('main section[aria-labelledby="cuts-heading"] article').locator("button[aria-label]").filter({ visible: true });
      const cutNames = (await rows.evaluateAll((els) => els.map((e) => e.getAttribute("aria-label") ?? ""))).filter((n, i, a) => n && a.indexOf(n) === i);
      await pageThrough(page, w, "cuts", cutNames, () => rows.first().click());
    }
    if (!ONLY || ONLY === "precon") {
      await openPrecon(page);
      await scSide(page, w, "precon", page.locator('[role="dialog"]').first(), ["add", "cut"]);
    }
    await ctx.close();
  }
} catch (error) {
  failures += 1;
  if (process.env.PROBE_SHOTS && lastPage) await (lastPage as Page).screenshot({ path: `${process.env.PROBE_SHOTS}/recommended-paging-failed.png`, fullPage: true }).catch(() => {});
  console.error("FAIL  probe error:", error instanceof Error ? error.message : error);
} finally {
  if (browser) await browser.close().catch(() => {});
  const calls = [...made.callIds];
  for (const d of made.decks) {
    const runs = await q(`select model_call_id from deck_suggestion_runs where deck_id = $1`, [d]).catch(() => []);
    for (const r of runs) if (r.model_call_id) calls.push(r.model_call_id);
    await q(`delete from deck_suggestion_runs where deck_id = $1`, [d]).catch((e) => { failures += 1; console.error("cleanup runs:", e); });
    await q(`delete from decks where id = $1`, [d]).catch((e) => { failures += 1; console.error("cleanup deck:", e); });
  }
  if (made.preconRun) await q(`delete from precon_upgrades where id = $1`, [made.preconRun]).catch((e) => { failures += 1; console.error("cleanup precon:", e); });
  if (calls.length) await q(`delete from model_calls where id = any($1::uuid[])`, [calls]).catch((e) => { failures += 1; console.error("cleanup calls:", e); });
  if (flagsWritten) await q(`delete from flag_overrides where scope = 'user' and user_id = $1 and switch = any($2::text[]) and updated_by = 'probe:recommended-paging'`, [owner, SWITCHES]).catch((e) => { failures += 1; console.error("cleanup flags:", e); });
  await pool.end();
}
console.log(failures === 0 ? "\nall checks passed" : `\n${failures} check(s) FAILED`);
process.exit(failures === 0 ? 0 : 1);
