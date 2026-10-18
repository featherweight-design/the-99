// probe:admin-payments (admin plan A2b): the Payments tab in a real browser, at 1300 and at 390.
//
// Signs in as the audit account, which the server's ADMIN_USER_IDS must name (and ADMIN_ENV_LABEL must be set). At each
// width it loads /admin/payments and checks the month bar, the four tiles (Paid, Tax, Net, Model spend) and the tab in
// the strip; then, at 1300 only, it grants the audit account itself 3 credits through the form: the pending bar names the
// account and the count, Grant answers `Gave …`, and the database holds exactly ONE new gift lot of 3 and ONE
// `credits_granted` event carrying the probe's note. A reload draws the lot in Credits granted and the note in Gifts.
// Then (A3), with a paid, half-refunded pack, an open dispute on it and the audit account's buying paused, all seeded:
// Paid says what was refunded, Disputes names the payment, Buying paused lists the account, and Let them buy clears
// the block (the column is null) and records one `purchase_block_cleared` event, after which the account is no longer
// listed.
//
// It WRITES that lot and event, and the A3 fixture (a `payment_records` row, its pack lot, a `payment_disputes` row and
// the account's `stripe_customers` row), so it refuses any branch but a scratch one (`assertScratchBranch`) and puts
// everything back in a `finally`: the lot by the external id `gift:<actionId>` the probe hands the form, the events by
// the probe's marker, the fixture by its marked ids, and the account's own `stripe_customers` row as it was found.
//
//   PROBE_BASE=http://localhost:3392 PROBE_DATABASE_URL=… pnpm probe:admin-payments
// The server must read the same database (its `.env` `DATABASE_URL`). Point it at `next start`, never `next dev`.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage } from "./lib/surface.mjs";

const { E2E_AUDIT_USER_EMAIL: EMAIL, CLERK_SECRET_KEY, PROBE_DATABASE_URL } = requireEnv([
  "E2E_AUDIT_USER_EMAIL",
  "CLERK_SECRET_KEY",
  "PROBE_DATABASE_URL",
]);
const BASE = process.env.PROBE_BASE ?? "http://localhost:3000";
{
  const u = new URL(BASE);
  if (u.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(u.hostname) || u.port === "" || u.pathname !== "/") {
    throw new Error(`refusing PROBE_BASE ${BASE}: a loopback server with a port only`);
  }
}
const PASSWORD = process.env.E2E_AUDIT_USER_PASSWORD;
if (!EMAIL.includes("+clerk_test") && !PASSWORD) throw new Error("Set E2E_AUDIT_USER_PASSWORD.");
if (!CLERK_SECRET_KEY.startsWith("sk_test_")) throw new Error("refusing: CLERK_SECRET_KEY is not a development instance's");

const sql = neon(PROBE_DATABASE_URL);
const [{ branch }] = await sql`select current_setting('neon.branch_id', true) as branch`;
assertScratchBranch(branch, "probe:admin-payments");

const MARK = `probe-admin-payments-${Date.now()}`;
// The grant's `actionId`, handed to the form (its next `crypto.randomUUID()`), so the lot is known by its external id
// before the press, and cleaned up by it whether or not the page ever says so.
const ACTION = crypto.randomUUID();
const SHOTS = process.env.PROBE_SHOTS;
let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${saw === undefined ? "" : `  (${saw})`}`);
};

async function signIn(page) {
  page.on("pageerror", (e) => console.log(`PAGE ERROR  ${String(e?.stack ?? e).slice(0, 900)}`));
  await setupClerkTestingToken({ page });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.Clerk?.loaded, null, { timeout: 30_000 });
  const failure = await page.evaluate(
    async ([email, password]) => {
      try {
        const signIn = window.Clerk.client.signIn;
        let attempt = email.includes("+clerk_test")
          ? await signIn.create({ identifier: email })
          : await signIn.create({ identifier: email, password });
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
    },
    [EMAIL, PASSWORD ?? ""],
  );
  if (failure) throw new Error(`Clerk sign-in failed: ${failure}`);
  await page.goto(`${BASE}/about`, { waitUntil: "load" });
  await page.waitForFunction(() => window.Clerk?.loaded && window.Clerk.user?.id, null, { timeout: 30_000 });
  return page.evaluate(() => ({ id: window.Clerk.user.id, first: window.Clerk.user.firstName ?? "" }));
}

let userId = null;
// The A3 fixture's ids, all marked, and the account's own `stripe_customers` row as found (JSON, so it goes back exact).
const PI = `pi_${MARK}`;
const SESSION = `cs_${MARK}`;
// The fixture's block, at a whole second, so the clear's event names it exactly and cleanup can match that event alone.
const BLOCK_AT = new Date(Math.floor(Date.now() / 1000) * 1000 - 60_000).toISOString();
let snapshot = null; // { row } once the account's own row was read; nothing of it is touched before then
let fixtureMade = false;
await clerkSetup();
const browser = await chromium.launch();
try {
  for (const w of [{ name: "1300", width: 1300, height: 900, phone: false, grant: true }, { name: "390", width: 390, height: 844, phone: true, grant: false }]) {
    console.log(`\n── ${w.name}`);
    const context = await browser.newContext({ viewport: { width: w.width, height: w.height }, hasTouch: w.phone, isMobile: w.phone, serviceWorkers: "block" });
    try {
      const page = await context.newPage();
      const me = await signIn(page);
      userId = me.id;
      const res = await page.goto(`${BASE}/admin/payments`, { waitUntil: "load" });
      check(res?.ok() === true && !page.url().includes("sign-in"), `${w.name} /admin/payments loads for the admin`, String(res?.status()));
      await onPage(page, "[data-testid='payments-month']").waitFor({ timeout: 20_000 });
      const named = await onPage(page, "[data-testid='payments-month']").textContent();
      const now = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date());
      check(named === now, `${w.name} the month bar names this UTC month`, named);
      const tiles = await onPage(page, "[data-testid='payments-tiles'] > div > span:first-child").allTextContents();
      check(JSON.stringify(tiles) === JSON.stringify(["Paid", "Tax", "Net", "Model spend"]), `${w.name} the four tiles`, tiles.join(", "));
      check((await page.locator("a[href='/admin/payments']").count()) > 0, `${w.name} the tab strip lists Payments`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/admin-payments-${w.name}.png`, fullPage: true });
      if (!w.grant) continue;

      const before = await sql`select count(*)::int as n from credit_grants where user_id = ${userId} and source = 'gift'`;
      const form = onPage(page, "[data-testid='gift-form']");
      // The audit account picks itself by the first letters of its masked name.
      await form.locator("input[type='search']").fill(me.first.slice(0, 3) || "a");
      await form.locator(`[role='radio'][data-account='${userId}']`).click();
      await form.getByRole("textbox", { name: /Credits/ }).fill("3");
      await form.getByRole("textbox", { name: /Why/ }).fill(MARK);
      await page.evaluate((id) => {
        const own = crypto.randomUUID.bind(crypto);
        let next = id;
        crypto.randomUUID = () => {
          const v = next ?? own();
          next = null;
          return v;
        };
      }, ACTION);
      const bar = onPage(page, "[data-testid='gift-pending']");
      const sentence = await bar.textContent();
      check(/gives .+ 3 credits/.test(sentence ?? ""), "the pending bar names the account and the count", sentence?.slice(0, 90));
      await bar.getByRole("button", { name: "Grant" }).click();
      await page.getByRole("status").filter({ hasText: "Gave" }).waitFor({ timeout: 20_000 });
      check(true, "Grant answers Gave …");
      const lots = await sql`select units, expires_at from credit_grants where user_id = ${userId} and source = 'gift'`;
      const mine = await sql`select units, expires_at from credit_grants where external_id = ${`gift:${ACTION}`}`;
      check(lots.length === before[0].n + 1 && mine.length === 1 && mine[0].units === 3 && mine[0].expires_at === null, "exactly one new gift lot of 3, never expiring, keyed on the form's action id", `${before[0].n} → ${lots.length}`);
      const events = await sql`select count(*)::int as n from admin_events where kind = 'credits_granted' and user_id = ${userId} and note = ${MARK} and new_value = '3'`;
      check(events[0].n === 1, "exactly one credits_granted event with the note", String(events[0].n));
      await page.reload({ waitUntil: "load" });
      // The page streams in behind its loading screen, so wait for what it draws rather than for `load`.
      const note = onPage(page, "[data-testid='payments-gifts']").getByText(MARK);
      check(await note.waitFor({ timeout: 20_000 }).then(() => true, () => false), "Gifts lists the note after a reload");
      check((await page.getByRole("table", { name: "Credits granted" }).getByRole("cell", { name: "Gift" }).count()) >= 1, "Credits granted lists a Gift row");
      // A3: disputes, refunds and the purchase block.
      snapshot = { row: (await sql`select row_to_json(t)::text as j from stripe_customers t where user_id = ${userId}`)[0]?.j ?? null };
      fixtureMade = true;
      await sql`insert into payment_records (payment_intent_id, checkout_session_id, amount_cents, tax_cents, currency, status) values (${PI}, ${SESSION}, 1080, 80, 'usd', 'granted')`;
      await sql`insert into credit_grants (user_id, source, units, external_id, refunded_cents) values (${userId}, 'pack', 40, ${SESSION}, 540)`;
      await sql`insert into payment_disputes (dispute_id, payment_intent_id, units_revoked, status) values (${`dp_${MARK}`}, ${PI}, 20, 'open')`;
      await sql`insert into stripe_customers (user_id, stripe_customer_id, purchase_blocked_at) values (${userId}, ${`cus_${MARK}`}, ${BLOCK_AT.replace("Z", "")}::timestamp)
        on conflict (user_id) do update set purchase_blocked_at = excluded.purchase_blocked_at`;
      await page.reload({ waitUntil: "load" });
      const disputes = onPage(page, "[data-testid='payments-disputes']");
      check(await disputes.getByText(/disputed a \$10\.80 payment/).first().waitFor({ timeout: 20_000 }).then(() => true, () => false), "Disputes names the disputed payment");
      check((await onPage(page, "[data-testid='payments-tiles']").getByText(/\$5\.40 refunded/).count()) === 1, "Paid says what was refunded");
      const blocked = onPage(page, "[data-testid='payments-blocked'] li").filter({ has: page.getByRole("button", { name: "Let them buy" }) });
      const rows = await blocked.count();
      check(rows >= 1, "Buying paused lists the account", String(rows));
      // The audit account's own row, by its id: masked names are not unique.
      const own = onPage(page, `[data-testid='payments-blocked'] li[data-account='${userId}']`);
      await own.getByRole("button", { name: "Let them buy" }).click();
      const clearBar = onPage(page, "[data-testid='clear-pending']");
      check(/1 dispute is still open/.test((await clearBar.textContent()) ?? ""), "the clear names the open dispute it leaves standing");
      await clearBar.getByRole("button", { name: "Let them buy" }).click();
      await page.getByRole("status").filter({ hasText: "can buy again" }).waitFor({ timeout: 20_000 });
      const [after] = await sql`select purchase_blocked_at from stripe_customers where user_id = ${userId}`;
      check(after?.purchase_blocked_at === null, "the block is cleared in the database");
      const clears = await sql`select count(*)::int as n from admin_events where kind = 'purchase_block_cleared' and user_id = ${userId} and old_value = ${BLOCK_AT}`;
      check(clears[0].n === 1, "one purchase_block_cleared event", String(clears[0].n));
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  if (userId && fixtureMade) {
    // The probe's own clear only: the event naming this run's fixture block.
    await sql`delete from admin_events where kind = 'purchase_block_cleared' and user_id = ${userId} and old_value = ${BLOCK_AT}`;
    await sql`delete from payment_disputes where dispute_id = ${`dp_${MARK}`}`;
    await sql`delete from credit_grants where external_id = ${SESSION}`;
    await sql`delete from payment_records where payment_intent_id = ${PI}`;
  }
  if (userId && snapshot) {
    // The account's own row as it was found: gone if there was none, restored whole if there was.
    await sql`delete from stripe_customers where user_id = ${userId}`;
    if (snapshot.row) await sql`insert into stripe_customers select * from json_populate_record(null::stripe_customers, ${snapshot.row}::json)`;
  }
  await sql`delete from credit_grants where external_id = ${`gift:${ACTION}`} and source = 'gift'`;
  await sql`delete from admin_events where kind = 'credits_granted' and note = ${MARK}`;
}
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
