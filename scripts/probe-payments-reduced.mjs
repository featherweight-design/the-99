// probe:payments-reduced (buying credits U4: G6, B1, O1 to O4): /credits in a real browser over every switch × held ×
// bought combination, plus a paused buyer, against the shipped rules (`readerSeesCredits`, `readerSeesOffers`,
// `readerSeesPause`).
//
// For each case it seeds the signed-in test account's lots and a `PAYMENTS_ENABLED` account override, loads /credits,
// and asserts what the rules say the page is:
//   - the not-found page, with no balances, when the switch is off, nothing is held and nothing was ever bought (O1):
//     judged by what is drawn, since the route streams (it keeps a `loading.tsx`) and its status is 200;
//   - otherwise the page, with balances and history, the offers ONLY with the switch on and buying not paused, and the
//     pause band ONLY with the switch on and buying paused (B1); never both, and never a disabled Buy.
// "Held" is a gift lot (held and spent, never bought, so it adds no history row); "bought" is a pack lot, revoked in
// full when the case is bought-but-not-held (a history row, nothing left). The pause is `stripe_customers
// .purchase_blocked_at`. The matrix runs at 1300; B1 and O4 run again at 390.
//
// IT WRITES the account's `credit_grants` (its own lots parked, then restored; the probe's own lots deleted), its
// `PAYMENTS_ENABLED` override and its `stripe_customers` row, so it refuses anything but a scratch branch
// (`assertScratchBranch`) and restores all three in a `finally`, every column through `json_populate_record`. A switch
// PLAN HELD (d9, the plan card PR): the account also holds a plan (a `subscriptions` row and a 60-unit `plan` lot, both
// carrying MARK), cancelling (state `cancelled`, 20 days out) or not (`active`), over switch on / off x paused / not at
// both widths. The page must draw the plan card (`[data-plan-state]`, the state `planCardFacts` names) and exactly the
// presses `cardPresses(state, reduced)` allows, where `reduced` is `!readerSeesOffers(...)`: Keep my plan and Subscribe
// are purchases and go with the offers; Cancel plan and Update card stay. Both rules are imported, never restated, so
// the probe is run with `tsx`.
//
// A switch change waits out the server's 30-second switch memo (`SNAPSHOT_TTL_MS`).
//
//   PROBE_BASE=http://localhost:3392 PROBE_DATABASE_URL=… pnpm probe:payments-reduced
// The server must read the same database (its `.env` `DATABASE_URL`). Point it at `next start`, never `next dev`.

import { clerkSetup, setupClerkTestingToken } from "@clerk/testing/playwright";
import { neon } from "@neondatabase/serverless";
import { chromium } from "playwright";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
import { onPage, onPageRole } from "./lib/surface.mjs";
import { readerSeesOffers } from "../src/lib/payments/visible-rule";
import { cardPresses, planCardFacts } from "../src/lib/payments/plan-card-rule";

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
assertScratchBranch(branch, "probe:payments-reduced");

const MARK = `probe-payments-reduced-${Date.now()}`;
const MEMO_MS = 31_000;
const SHOTS = process.env.PROBE_SHOTS;
let failures = 0;
const check = (ok, label, saw) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${saw === undefined ? "" : `  (${saw})`}`);
};

async function signIn(page) {
  // A client-side failure draws the error screen with nothing in the server's log: print it.
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
  // Each visit waits for `load`: leaving a page while its stream is still arriving cuts that stream, and React's
  // reveal script then fails on the half-written document.
  await page.goto(`${BASE}/about`, { waitUntil: "load" });
  await page.waitForFunction(() => window.Clerk?.loaded && window.Clerk.user?.id, null, { timeout: 30_000 });
  return page.evaluate(() => window.Clerk.user.id);
}

// The rules, restated only as the probe's expectations; the unit tests hold the code to the same table.
const expect = ({ switchOn, held, bought, blocked }) => ({
  found: switchOn || held || bought,
  offers: switchOn && !blocked,
  band: switchOn && blocked,
});

const dropProbeLots = (userId) => sql`delete from credit_grants where user_id = ${userId} and external_id like ${`${MARK}-%`}`;

async function setLots(userId, { held, bought }) {
  await dropProbeLots(userId);
  // The account's own lots are parked (every unit revoked), never deleted: a spent lot is referenced by `model_calls`.
  await sql`update credit_grants set revoked_units = units where user_id = ${userId} and (external_id is null or external_id not like ${`${MARK}-%`})`;
  // "Never bought" means no history row at all, and history lists every paid lot however spent, so the account's own
  // paid lots stand as gifts for that case, with no expiry, since a gift never expires (restored, source, expiry and all,
  // in the `finally`).
  if (!bought) await sql`update credit_grants set source = 'gift', expires_at = null where user_id = ${userId} and source in ('plan', 'pack') and (external_id is null or external_id not like ${`${MARK}-%`})`;
  if (held) await sql`insert into credit_grants (user_id, source, units, external_id) values (${userId}, 'gift', 7, ${`${MARK}-gift`})`;
  if (bought) await sql`insert into credit_grants (user_id, source, units, revoked_units, external_id) values (${userId}, 'pack', 40, ${held ? 0 : 40}, ${`${MARK}-pack`})`;
}

async function setPaused(userId, blocked) {
  await sql`insert into stripe_customers (user_id, stripe_customer_id, purchase_blocked_at) values (${userId}, ${`cus_${MARK}`}, ${blocked ? new Date().toISOString().replace("Z", "") : null}::timestamp)
    on conflict (user_id) do update set purchase_blocked_at = excluded.purchase_blocked_at`;
}

const PLAN_SUB = `sub_${MARK}`;
const PERIOD_END_MS = Date.now() + 20 * 24 * 60 * 60 * 1000;
const periodEnd = () => new Date(PERIOD_END_MS).toISOString().replace("Z", "");

const dropPlan = async (userId) => {
  await dropProbeLots(userId);
  await sql`delete from subscriptions where stripe_subscription_id = ${PLAN_SUB} and user_id = ${userId}`;
};

// A plan lot (60 units, spent none) and its subscription. A cancelling plan's lot expires with the paid month.
async function setPlan(userId, cancelling) {
  await setLots(userId, { held: false, bought: false });
  await dropPlan(userId);
  await sql`insert into subscriptions (stripe_subscription_id, user_id, status, current_period_end, cancel_at_period_end)
    values (${PLAN_SUB}, ${userId}, 'active', ${periodEnd()}::timestamp, ${cancelling})`;
  await sql`insert into credit_grants (user_id, source, units, expires_at, external_id, subscription_id)
    values (${userId}, 'plan', 60, ${cancelling ? periodEnd() : null}::timestamp, ${`${MARK}-plan`}, ${PLAN_SUB})`;
}

async function setSwitch(userId, on) {
  await sql`delete from flag_overrides where switch = 'PAYMENTS_ENABLED' and scope = 'user' and user_id = ${userId}`;
  await sql`insert into flag_overrides (switch, scope, user_id, value, note, updated_by) values ('PAYMENTS_ENABLED', 'user', ${userId}, ${on ? "on" : "off"}, ${MARK}, ${MARK})`;
  // The server memoizes each reader's switches for 30 seconds.
  await new Promise((r) => setTimeout(r, MEMO_MS));
}

async function look(page, width, c) {
  const res = await page.goto(`${BASE}/credits`, { waitUntil: "load" });
  const status = res?.status() ?? 0;
  const want = expect(c);
  const name = `${width} switch ${c.switchOn ? "on" : "off"}, ${c.held ? "held" : "nothing held"}, ${c.bought ? "bought" : "never bought"}${c.blocked ? ", paused" : ""}`;
  if (!want.found) {
    // The route streams (it keeps a `loading.tsx`), so `notFound()` lands after a 200 header: judge the page drawn.
    const shown = await page.getByRole("heading", { name: "There’s no page here." }).waitFor({ timeout: 20_000 }).then(() => true, () => false);
    check(shown, `${name}: not found`, String(status));
    check((await page.locator("[data-testid='credits-total']").count()) === 0, `${name}: no balances`);
    return;
  }
  check(status === 200, `${name}: the page`, String(status));
  const total = onPage(page, "[data-testid='credits-total']");
  check(await total.waitFor({ timeout: 20_000 }).then(() => true, () => false), `${name}: balances`);
  const history = await page.getByText("Purchase history").count();
  check(history > 0, `${name}: history`);
  const offers = await onPage(page, "#credits-offers").count();
  check((offers > 0) === want.offers, `${name}: offers ${want.offers ? "drawn" : "absent"}`, `${offers}`);
  const buys = await page.getByRole("button", { name: /^Buy / }).count();
  check((buys > 0) === want.offers, `${name}: Buy ${want.offers ? "drawn" : "absent, never disabled"}`, `${buys}`);
  const band = await onPage(page, "[data-pause-band]").count();
  check((band > 0) === want.band, `${name}: pause band ${want.band ? "drawn" : "absent"}`, `${band}`);
  if (SHOTS && (c.blocked || (!c.switchOn && c.bought))) await page.screenshot({ path: `${SHOTS}/payments-reduced-${width}-${c.switchOn ? "on" : "off"}${c.blocked ? "-paused" : ""}.png`, fullPage: true });
}

async function lookPlan(page, width, { switchOn, blocked, cancelling }) {
  const reduced = !readerSeesOffers({ switchOn, blocked });
  const end = new Date(PERIOD_END_MS);
  const facts = planCardFacts({ status: "active", cancelAtPeriodEnd: cancelling, currentPeriodEnd: end }, { planExpiresAt: cancelling ? end : null }, new Date());
  const want = cardPresses(facts.state, reduced);
  const name = `${width} plan ${facts.state}, switch ${switchOn ? "on" : "off"}${blocked ? ", paused" : ""}`;
  const res = await page.goto(`${BASE}/credits`, { waitUntil: "load" });
  check((res?.status() ?? 0) === 200, `${name}: the page`, String(res?.status()));
  const card = onPage(page, "[data-plan-state]");
  const drawn = await card.first().waitFor({ timeout: 20_000 }).then(() => true, () => false);
  check(drawn, `${name}: plan card drawn`);
  if (!drawn) return;
  check((await card.first().getAttribute("data-plan-state")) === facts.state, `${name}: state is ${facts.state}`, String(await card.first().getAttribute("data-plan-state")));
  for (const [key, label] of [["keep", /^Keep my plan/], ["subscribe", /^Subscribe/], ["cancel", /^Cancel plan/], ["updateCard", /^Update card/]]) {
    const n = await onPageRole(page, "button", label).count();
    check((n > 0) === want[key], `${name}: ${key} ${want[key] ? "drawn" : "absent"}`, `${n}`);
  }
  const offers = await onPage(page, "#credits-offers").count();
  check((offers > 0) === !reduced, `${name}: offers ${reduced ? "absent" : "drawn"}`, `${offers}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/payments-reduced-plan-${width}-${facts.state}-${switchOn ? "on" : "off"}${blocked ? "-paused" : ""}.png`, fullPage: true });
}

let userId = null;
let saved = null;
await clerkSetup();
const browser = await chromium.launch();
try {
  const contexts = {};
  const pages = {};
  for (const [w, vp] of [["1300", { width: 1300, height: 900, phone: false }], ["390", { width: 390, height: 844, phone: true }]]) {
    contexts[w] = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.phone, isMobile: vp.phone, serviceWorkers: "block" });
    pages[w] = await contexts[w].newPage();
    userId = await signIn(pages[w]);
  }
  saved = {
    grants: (await sql`select row_to_json(t)::text as j from credit_grants t where user_id = ${userId}`).map((r) => r.j),
    overrides: (await sql`select row_to_json(t)::text as j from flag_overrides t where switch = 'PAYMENTS_ENABLED' and scope = 'user' and user_id = ${userId}`).map((r) => r.j),
    customer: (await sql`select row_to_json(t)::text as j from stripe_customers t where user_id = ${userId}`)[0]?.j ?? null,
  };
  for (const switchOn of [true, false]) {
    console.log(`\n── switch ${switchOn ? "on" : "off"}`);
    await setSwitch(userId, switchOn);
    for (const held of [true, false]) for (const bought of [true, false]) {
      await setLots(userId, { held, bought });
      await setPaused(userId, false);
      await look(pages["1300"], "1300", { switchOn, held, bought, blocked: false });
    }
    // A paused buyer who bought and still holds.
    await setLots(userId, { held: true, bought: true });
    await setPaused(userId, true);
    await look(pages["1300"], "1300", { switchOn, held: true, bought: true, blocked: true });
    await look(pages["390"], "390", { switchOn, held: true, bought: true, blocked: true });
    if (!switchOn) {
      // O4 at the phone width: switch off, a holder who bought, no pause.
      await setPaused(userId, false);
      await look(pages["390"], "390", { switchOn, held: true, bought: true, blocked: false });
    }
    // Plan held: the card stays, its purchases follow the offers.
    for (const cancelling of [true, false]) {
      await setPlan(userId, cancelling);
      for (const blocked of [false, true]) {
        await setPaused(userId, blocked);
        for (const w of ["1300", "390"]) await lookPlan(pages[w], w, { switchOn, blocked, cancelling });
      }
    }
    await dropPlan(userId);
  }
  for (const c of Object.values(contexts)) await c.close();
} finally {
  await browser.close();
  if (userId && saved) {
    await dropPlan(userId);
    for (const g of saved.grants) {
      await sql`update credit_grants c set source = r.source, units = r.units, revoked_units = r.revoked_units, expires_at = r.expires_at
        from json_populate_record(null::credit_grants, ${g}::json) r where c.id = r.id`;
    }
    await sql`delete from flag_overrides where switch = 'PAYMENTS_ENABLED' and scope = 'user' and user_id = ${userId}`;
    for (const o of saved.overrides) await sql`insert into flag_overrides select * from json_populate_record(null::flag_overrides, ${o}::json)`;
    await sql`delete from stripe_customers where user_id = ${userId}`;
    if (saved.customer) await sql`insert into stripe_customers select * from json_populate_record(null::stripe_customers, ${saved.customer}::json)`;
  }
}
console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
