// probe:store-upgrade — store choice, ruling A: a precon upgrade run's adds are priced at the READER'S store as the
// result draws, not at the store the run stored them at. Pressed in Chromium at 390x844 and 1300x900.
//
// What jsdom cannot prove, and this does: on the real /decks/precons/<file> page, pressing Upgrade this precon and
// opening the kept run draws its To buy figure from today's prices at the reader's store. The run is seeded with each
// add stored at $1.00, a figure neither store charges for these cards, so the stored total ($2.00) and the repriced one
// cannot agree. Fails on main: the result draws the stored $2.00.
//
// The store line (addendum-upgrade-store): under the four facts the result names the store whose figures it draws, in the
// strip's words, 8px under the facts and 3px in from their edge, inside the sheet at both widths and on one row at 1300.
// Fails on main: there is no line.
//
// FIXTURE: a scratch branch of local-dev, which the dev server reads, where the audit account has a user
// STORE_PREFERENCE_ENABLED and PRECON_UPGRADE_ENABLED overrides 'on', user_prefs.preferred_store = 'tcgplayer' and
// printing_store_prices rows for tcgplayer. The probe writes one model_calls row and one precon_upgrades row of the
// signed-in account (first clearing any an earlier run left), and deletes both in its
// `finally`; `assertScratchBranch` refuses production, staging and local-dev before the first write.
//
//   PROBE_BASE=http://localhost:3161 pnpm probe:store-upgrade
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { clearAboutSheet } from "./lib/about-clear.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, DATABASE_URL } = requireEnv(["E2E_AUDIT_USER_EMAIL", "CLERK_SECRET_KEY", "DATABASE_URL"]);
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname)) {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback dev server only`);
  }
}
const sql = neon(DATABASE_URL);

const FILE = "KeenEngineering_FDC";
const ADDS = ["Cyclonic Rift", "Rhystic Study"];
const STORED_CENTS = 100;
const WIDTHS = [
  { name: "390", width: 390, height: 844 },
  { name: "1300", width: 1300, height: 900 },
];

let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${saw})`);
};
// The app drops the decimals of a whole-dollar figure ($57), so a figure is read in either form.
const dollars = (cents) => `$${(cents / 100).toFixed(2)}`;
const figureIs = (text, cents) => text.includes(dollars(cents)) || (cents % 100 === 0 && text.includes(`$${cents / 100}`));

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 60_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test") || !password
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
        if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
          const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
          await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor?.emailAddressId });
          attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
        }
        if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
        await window.Clerk.setActive({ session: attempt.createdSessionId });
        return null;
      } catch (error) {
        return error?.errors?.[0]?.longMessage ?? String(error);
      }
    },
    [EMAIL, PASSWORD],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  return page.evaluate(() => window.Clerk.user.id);
}

const PROBE_KEY = "probe/3/probe";

/** Every probe run of this account and its model call: a run an earlier, crashed probe left behind would sit beside this one. */
async function clean(userId) {
  const left = await sql`delete from precon_upgrades where user_id = ${userId} and strategy_key = ${PROBE_KEY} returning model_call_id`;
  const calls = left.map((r) => r.model_call_id).filter(Boolean);
  if (calls.length) await sql`delete from model_calls where id = any(${calls}) and user_id = ${userId}`;
}

/** One kept run of the signed-in account on the box: the two adds stored at $1.00 each, over two of its own cards. */
async function seed(userId, made) {
  const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
  assertScratchBranch(branch, "probe:store-upgrade");
  await clean(userId);
  const adds = await sql`select oracle_id, name from cards where name = any(${ADDS}) order by name`;
  const cuts = await sql`
    select c.oracle_id, c.name from precon_cards pc join cards c on c.oracle_id = pc.oracle_id
    where pc.file_name = ${FILE} and not pc.is_commander and c.type_line not like '%Land%' order by pc.position limit 2`;
  if (adds.length !== 2 || cuts.length !== 2) throw new Error(`fixture cards missing: ${adds.length} adds, ${cuts.length} cuts`);
  const pairs = adds.map((a, i) => ({
    cutId: cuts[i].oracle_id, cut: cuts[i].name, addId: a.oracle_id, add: a.name, addCents: STORED_CENTS,
    reason: "probe", cutReason: null, position: i + 1,
  }));
  const [call] = await sql`insert into model_calls (user_id, feature) values (${userId}, 'precon_upgrade') returning id`;
  made.callId = call.id;
  const [run] = await sql`
    insert into precon_upgrades (user_id, precon_file, strategy_key, strategy_label, status, model_call_id, model, pairs,
      buy_total_cents, bracket_before, bracket_after, bracket_target, finished_at, seen_at)
    values (${userId}, ${FILE}, ${PROBE_KEY}, 'Store probe', 'done', ${call.id}, 'probe', ${JSON.stringify(pairs)}::jsonb,
      ${STORED_CENTS * 2}, 2, 3, 3, now(), now())
    returning id`;
  made.runId = run.id;
  made.addIds = adds.map((a) => a.oracle_id);
}

/**
 * Today's cheapest live figure at the reader's store for each add, summed: what the result should draw. A close reading of
 * `cheapestNow` over the newest price day; the first check (not the stored figure) holds whatever this reads.
 */
async function expectedCents(userId, addIds) {
  const [pref] = await sql`select preferred_store as store from user_prefs where user_id = ${userId}`;
  const store = pref?.store;
  if (store !== "tcgplayer") throw new Error(`fixture: the account's store is ${store ?? "unset"}, not tcgplayer`);
  const rows = await sql`
    select p.oracle_id, min(s.price_cents) as cents from printing_store_prices s join printings p on p.scryfall_id = s.scryfall_id
    where s.store = ${store} and p.oracle_id = any(${addIds}) and s.price_cents > 0
      and s.as_of = (select max(as_of) from printing_store_prices where store = ${store})
    group by p.oracle_id`;
  return { store, cents: rows.reduce((n, r) => n + Number(r.cents), 0), priced: rows.length };
}

async function run(size) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height } });
    await context.route(/^https:\/\/(www\.)?(tcgplayer|manapool|cardkingdom)\.com\//, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
    const page = await context.newPage();
    const userId = await signIn(page);
    await clearAboutSheet(page, userId);
    return { page, userId, browser };
  } catch (e) {
    await browser.close();
    throw e;
  }
}

async function walk(page, size, expected) {
  await page.goto(`${BASE}/decks/precons/${FILE}`, { waitUntil: "domcontentloaded" });
  const entry = page.getByRole("button", { name: "Upgrade this precon" }).filter({ visible: true }).first();
  await entry.waitFor({ state: "visible", timeout: 60_000 });
  await entry.click();
  const dialog = page.locator('[role="dialog"]').first();
  await dialog.waitFor({ state: "visible", timeout: 20_000 });
  const last = dialog.locator("[data-last-run] button").first();
  if (await last.isVisible().catch(() => false)) await last.click();
  const label = dialog.locator("span", { hasText: /^To buy$/ }).first();
  await label.waitFor({ state: "attached", timeout: 30_000 }).catch(() => {});
  const figure = (await label.locator("xpath=following-sibling::span[1]").textContent().catch(() => null))?.trim() ?? "";
  const stored = dollars(STORED_CENTS * 2);
  check(figure !== "" && !figure.includes(stored), `${size.name} To buy is not the stored ${stored}`, figure || "no figure");
  check(figureIs(figure, expected.cents), `${size.name} To buy is today's price at ${expected.store}, ${dollars(expected.cents)}`, figure || "no figure");

  const line = dialog.locator("[data-upgrade-price-line]").first();
  await line.waitFor({ state: "attached", timeout: 10_000 }).catch(() => {});
  const text = (await line.textContent().catch(() => null))?.trim() ?? "";
  check(
    /^TCGplayer market prices · averages of recent sales, so a listing can differ · last checked /.test(text),
    `${size.name} the line names the reader's store and the market note, dated`, text || "no line",
  );
  const box = await line.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const g = el.previousElementSibling.getBoundingClientRect();
    const sheet = el.closest('[role="dialog"]').getBoundingClientRect();
    return { top: r.top, left: r.left + parseFloat(getComputedStyle(el).paddingLeft), right: r.right, height: r.height, gridBottom: g.bottom, gridLeft: g.left, sheetRight: sheet.right };
  }).catch(() => null);
  if (box) {
    check(Math.abs(box.top - box.gridBottom - 8) <= 1, `${size.name} the line sits 8px under the facts`, `${(box.top - box.gridBottom).toFixed(1)}px`);
    check(Math.abs(box.left - box.gridLeft - 3) <= 1, `${size.name} the line sits 3px in from the facts' edge`, `${(box.left - box.gridLeft).toFixed(1)}px`);
    check(box.right <= box.sheetRight + 0.5, `${size.name} the line stays inside the sheet`, `right ${box.right.toFixed(0)} of ${box.sheetRight.toFixed(0)}`);
    if (size.width >= 1000) check(box.height < 20, `${size.name} the line is one row`, `${box.height.toFixed(1)}px high`);
  }
}

await clerkSetup();
const made = {};
try {
  for (const size of WIDTHS) {
    const { page, userId, browser } = await run(size);
    try {
      if (!made.runId) await seed(userId, made);
      const expected = await expectedCents(userId, made.addIds);
      if (expected.priced !== 2) throw new Error(`fixture: ${expected.priced} of 2 adds priced at ${expected.store}`);
      await walk(page, size, expected);
    } finally {
      await browser.close();
    }
  }
} finally {
  if (made.runId) await sql`delete from precon_upgrades where id = ${made.runId}`;
  if (made.callId) await sql`delete from model_calls where id = ${made.callId}`;
}
console.log(failures ? `\n${failures} check(s) failed` : "\nall checks passed");
process.exit(failures ? 1 : 0);
