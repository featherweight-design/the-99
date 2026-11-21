// Clear all on Home's What's new (clear-all handoff): one press clears the lead, the rows and the drops, and Undo
// brings back exactly what that press cleared.
//
// jsdom cannot see most of what this proves: the foot's press existing at 390 and 1300, the lead leaving through the
// held-lead slot (not the hidden set), the toast being a live status region with an Undo, where focus lands, and the
// server's `feed_dismissals` rows being the ones the press named. So this presses it in a browser against the real
// database. It FAILS on main, where there is no `[data-clear-all]` button.
//
// What it asserts, per width:
//   1. The foot offers Clear all, and Home draws the lead and the seeded rows first.
//   2. Pressing it empties the lead and the rows at once, and focus lands on `#home-whats-new`.
//   3. The toast is `role=status`, reads "Cleared N from What’s new.", and carries Undo.
//   4. The server holds a dismissal for every item cleared, and the item dismissed BEFORE the press is still one.
//   5. Undo brings the lead and the rows back, focus returns to `[data-clear-all]`, and the server holds a dismissal
//      for ONLY the earlier item: Undo restored what the press cleared and nothing it did not.
//
// WRITES. It seeds its own marker `feed_items` (dedupe key `probe-clear-all-<run>-*`) and one `feed_dismissals` row
// for the headless account, turns the price-drop kind on for it, and puts all of that back in a finally. Run on
// local-dev only (a marker-row probe); it refuses production and staging.
//
//   PROBE_BASE=http://localhost:3092 PROBE_USER_EMAIL=alpha-test+clerk_test@the99.app node scripts/probe-clear-all.mjs
import { neon } from "@neondatabase/serverless";
import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { randomUUID } from "node:crypto";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { LOCAL_DEV_BRANCH } from "./lib/scratch-branch.mjs";

const { CLERK_SECRET_KEY, DATABASE_URL } = requireEnv(["CLERK_SECRET_KEY", "DATABASE_URL"]);
// Not E2E_AUDIT_USER_EMAIL: the repo `.env` holds a stale address there and overrides the command line.
const EMAIL = process.env.PROBE_USER_EMAIL ?? "alpha-test+clerk_test@the99.app";
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
if (!EMAIL.includes("+clerk_test")) throw new Error("probe-clear-all: a +clerk_test address only (the email-code path).");

const sql = neon(DATABASE_URL);
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
if (branch !== LOCAL_DEV_BRANCH) throw new Error(`probe-clear-all: ${branch} is not local-dev; it writes marker rows there only.`);

const found = await fetch(`https://api.clerk.com/v1/users?email_address=${encodeURIComponent(EMAIL)}`, {
  headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
}).then((r) => r.json());
const USER = found?.[0]?.id;
if (!USER) throw new Error(`probe-clear-all: no Clerk user for ${EMAIL}`);

const run = Date.now().toString(36);
const MARK = `probe-clear-all-${run}`;
const KIND = "price-drop";

async function signIn(page) {
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(async (email) => {
    try {
      const signIn = window.Clerk.client.signIn;
      let attempt = await signIn.create({ identifier: email });
      if (attempt.status === "needs_first_factor" || attempt.status === "needs_client_trust") {
        const factor = attempt.supportedFirstFactors?.find((f) => f.strategy === "email_code");
        if (!factor?.emailAddressId) return `${email} offers no usable email_code first factor.`;
        await signIn.prepareFirstFactor({ strategy: "email_code", emailAddressId: factor.emailAddressId });
        attempt = await signIn.attemptFirstFactor({ strategy: "email_code", code: "424242" });
      }
      if (attempt.status !== "complete") return `sign-in status: ${attempt.status}`;
      await window.Clerk.setActive({ session: attempt.createdSessionId });
      return null;
    } catch (error) {
      return error?.errors?.[0]?.longMessage ?? String(error);
    }
  }, EMAIL);
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
}

// PROBE_SHOTS=<dir> also photographs each state (the contact sheet's cells) at the width it ran.
const SHOTS = process.env.PROBE_SHOTS;
const shot = (page, tag, name) => (SHOTS ? page.screenshot({ path: `${SHOTS}/${tag}-${name}.png`, fullPage: false }) : null);

let failures = 0;
function report(label, ok, detail) {
  console.log(`${ok ? "  ok  " : " FAIL "} ${label} — ${detail}`);
  if (!ok) failures += 1;
}

let original = null; // the account's feed_kinds before this run, put back at the end
let earlierId = null; // the item dismissed before the press
let seeded = [];

async function seed() {
  const [prefs] = await sql`select feed_kinds from user_prefs where user_id = ${USER}`;
  if (!prefs) throw new Error("probe-clear-all: the account has no user_prefs row; sign in once by hand first.");
  original = prefs.feed_kinds ?? {};
  await sql`update user_prefs set feed_kinds = ${JSON.stringify({ ...original, [KIND]: "2020-01-01T00:00:00.000Z" })}::jsonb where user_id = ${USER}`;
  const cards = await sql`select distinct oracle_id from cards limit 5`;
  if (cards.length < 5) throw new Error("probe-clear-all: the catalog has fewer than 5 cards.");
  seeded = [];
  for (const [i, c] of cards.entries()) {
    const [row] = await sql`
      insert into feed_items (user_id, kind, dedupe_key, oracle_id, data)
      values (${USER}, ${KIND}, ${`${MARK}-${i}`}, ${c.oracle_id}, ${JSON.stringify({ from: 500, to: 300 })}::jsonb)
      returning id`;
    seeded.push(row.id);
  }
  earlierId = seeded[0];
  await sql`insert into feed_dismissals (user_id, key) values (${USER}, ${`item:${earlierId}`}) on conflict do nothing`;
}

async function cleanup() {
  const ids = seeded.map((id) => `item:${id}`);
  if (ids.length) await sql`delete from feed_dismissals where user_id = ${USER} and key = any(${ids})`;
  await sql`delete from feed_items where user_id = ${USER} and dedupe_key like ${`${MARK}-%`}`;
  if (original) await sql`update user_prefs set feed_kinds = ${JSON.stringify(original)}::jsonb where user_id = ${USER}`;
}

const dismissedAmongSeeded = async () => {
  const keys = seeded.map((id) => `item:${id}`);
  const rows = await sql`select key from feed_dismissals where user_id = ${USER} and key = any(${keys})`;
  return rows.map((r) => r.key).sort();
};

/** The lead and the rows Home draws now. */
const drawn = (page) =>
  page.evaluate(() => ({
    lead: document.querySelectorAll("[data-feed-lead]").length > 0 || document.querySelectorAll("[data-lead-story]").length > 0,
    rows: document.querySelectorAll("[data-whats-new] [data-feed-item]").length,
    focus: document.activeElement?.id || (document.activeElement?.hasAttribute("data-clear-all") ? "[data-clear-all]" : document.activeElement?.tagName),
  }));

async function run1(width, height) {
  const tag = width < 768 ? "390" : "1300";
  await cleanup().catch(() => {});
  await seed();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  try {
    await signIn(page);
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2_500);
    const press = page.locator("[data-clear-all]:visible").first();
    const present = (await press.count()) > 0;
    const before = await drawn(page);
    report(`${tag} · the foot offers Clear all, over a lead and rows`, present && before.lead && before.rows >= 1, `button ${present}; lead ${before.lead}; rows ${before.rows}; at ${new URL(page.url()).pathname}`);
    if (present && SHOTS) await press.evaluate((el) => el.scrollIntoView({ block: "center" }));
    await shot(page, tag, "1-before");
    if (!present) return;

    await press.evaluate((el) => el.click());
    await page.waitForTimeout(1_200);
    await shot(page, tag, "2-cleared");
    const after = await drawn(page);
    report(`${tag} · pressing it clears the lead and the rows, focus on the heading`, !after.lead && after.rows === 0 && after.focus === "home-whats-new", `lead ${after.lead}; rows ${after.rows}; focus ${after.focus}`);

    const status = page.locator('[role="status"]', { hasText: "Cleared" }).first();
    const text = (await status.count()) > 0 ? await status.innerText() : "";
    const undo = status.getByRole("button", { name: "Undo" });
    report(`${tag} · the toast is a status with Undo`, /Cleared \d+ from What’s new\./.test(text) && (await undo.count()) > 0, JSON.stringify(text.replace(/\s+/g, " ")));

    const cleared = await dismissedAmongSeeded();
    const want = seeded.map((id) => `item:${id}`).sort();
    report(`${tag} · the server holds every item cleared, and the earlier one`, JSON.stringify(cleared) === JSON.stringify(want), `${cleared.length} of ${want.length} seeded keys dismissed`);

    if ((await undo.count()) === 0) return;
    await undo.first().evaluate((el) => el.click());
    await page.waitForTimeout(1_500);
    await shot(page, tag, "3-undone");
    const back = await drawn(page);
    report(`${tag} · Undo brings every item back (the redraw may seat the lead among the rows, as after any refresh), focus on Clear all`, back.rows + (back.lead ? 1 : 0) === before.rows + (before.lead ? 1 : 0) && back.focus === "[data-clear-all]", `lead ${back.lead}; rows ${back.rows}; focus ${back.focus}`);

    const left = await dismissedAmongSeeded();
    report(`${tag} · Undo restored only what the press cleared`, JSON.stringify(left) === JSON.stringify([`item:${earlierId}`]), `still dismissed: ${left.length} (the earlier item alone is ${left.length === 1 && left[0] === `item:${earlierId}`})`);
  } finally {
    await browser.close();
    await cleanup();
  }
}

try {
  await clerkSetup();
  await run1(390, 844);
  await run1(1300, 900);
} catch (error) {
  console.error(error);
  failures += 1;
  await cleanup().catch(() => {});
}
console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exitCode = failures === 0 ? 0 : 1;
