// The webhook's GRANT TRANSACTION (payments K1a), proved against a real Postgres by calling the real
// `fulfilCheckoutSession`, `readAllowance` and `purgeAccount`. Stripe itself is a stand-in object here:
// its `checkout.sessions.retrieve` hands back a crafted Session and counts its calls, so this proves the
// database half (idempotency, attribution, what a grant writes and what the purge keeps) without a
// Stripe account. The signature half is `src/app/api/stripe-webhook/route.test.ts`, with fixtures signed
// by the SDK. The end-to-end run through the Stripe CLI waits for test-mode keys.
//
// Cases:
//   a  a paid Session for a mapped account grants one 40-credit pack lot and a `granted` payment record,
//      and `readAllowance` reports pack 40
//   b  the same event delivered again is a duplicate: no second retrieve, no second lot
//   c  a second event for the same Session records its event and still grants once
//   d  two concurrent deliveries of one new event grant once
//   e  a Session naming another account than its customer maps to is refused: no lot, no record
//   f  a paid Session whose customer maps to no account is kept `unattributed`, with no lot
//   g  the purge takes the account's customer mapping and lots, and keeps the payment records
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run,
// restored by copying back), and each fails it:
//   - the event row's conflict check dropped (`fulfilCheckoutSession` carries on after a conflict): fails d.
//   - the lot's conflict target dropped (a plain insert): fails c.
//   - the attribution check removed from `decideFulfilment`: fails e.
//
// It writes under per-run ids and deletes them in a `finally`, so it fails closed: `PROBE_DB_BRANCH`
// must name the branch `DATABASE_URL` reports, and staging and production are refused by id.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:payments-webhook
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import type Stripe from "stripe";

import { fulfilCheckoutSession } from "../src/lib/payments/fulfil";
import { readAllowance } from "../src/lib/model/allowance";
import { purgeAccount } from "../src/lib/account/purge";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const RUN = `probe-pw-${Date.now()}`;
const PRICE = `price_${RUN}`;
process.env.STRIPE_PRICE_PACK_40 = PRICE;

let failures = 0;
const check = (label: string, actual: unknown, expected: unknown) => {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  const ok = a === e;
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label} — got ${a}, expected ${e}`);
};
const rows = async <T>(text: ReturnType<typeof sql>): Promise<T[]> => (await fixture.execute(text)).rows as T[];

const users: string[] = [];
const customers: string[] = [];
const sessions: string[] = [];
const events: string[] = [];
let n = 0;
const id = (kind: string) => `${kind}_${RUN}_${++n}`;

/** A mapped account with its own Stripe customer. */
async function account() {
  const userId = id("user");
  const customerId = id("cus");
  users.push(userId);
  customers.push(customerId);
  await fixture.execute(sql`insert into stripe_customers (user_id, stripe_customer_id) values (${userId}, ${customerId})`);
  return { userId, customerId };
}

/** A retrieved Session as Stripe returns it, paid for one 40-credit pack with $0.31 tax. */
function session(customerId: string, userId: string, over: Partial<Stripe.Checkout.Session> = {}): Stripe.Checkout.Session {
  const sid = id("cs");
  sessions.push(sid);
  return {
    id: sid, object: "checkout.session", mode: "payment", payment_status: "paid", currency: "usd",
    amount_total: 531, total_details: { amount_tax: 31, amount_discount: 0, amount_shipping: 0 },
    line_items: { object: "list", data: [{ price: { id: PRICE }, quantity: 1 }], has_more: false, url: "" },
    customer: customerId, client_reference_id: userId, metadata: { pack: "pack40", user_id: userId },
    payment_intent: id("pi"), customer_details: { address: { country: "US" } },
    ...over,
  } as unknown as Stripe.Checkout.Session;
}

/** A stand-in Stripe whose retrieve answers with `s` and counts its calls. */
function stripeServing(s: Stripe.Checkout.Session) {
  const calls = { retrieve: 0 };
  const stub = { checkout: { sessions: { retrieve: async () => { calls.retrieve += 1; return s; } } } } as unknown as Stripe;
  return { stub, calls };
}

const eventId = () => { const e = id("evt"); events.push(e); return e; };
const lots = async (userId: string) => Number((await rows<{ n: string }>(sql`select count(*)::text as n from credit_grants where user_id = ${userId}`))[0].n);
const record = async (sid: string) => (await rows<{ status: string }>(sql`select status from payment_records where checkout_session_id = ${sid}`)).map((r) => r.status);

async function cleanup() {
  for (const u of users) {
    try {
      await fixture.execute(sql`delete from model_calls where user_id = ${u}`);
      await fixture.execute(sql`delete from credit_grants where user_id = ${u}`);
      await fixture.execute(sql`delete from stripe_customers where user_id = ${u}`);
    } catch (err) { failures += 1; console.error(`cleanup failed for ${u}`, err); }
  }
  try {
    for (const s of sessions) await fixture.execute(sql`delete from payment_records where checkout_session_id = ${s}`);
    for (const e of events) await fixture.execute(sql`delete from stripe_events where event_id = ${e}`);
  } catch (err) { failures += 1; console.error("cleanup failed for the run's records", err); }
}

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);

  // a · A grant.
  const a = await account();
  const sa = session(a.customerId, a.userId);
  const ea = eventId();
  {
    const { stub } = stripeServing(sa);
    check("a · a paid Session for its own account grants", (await fulfilCheckoutSession(stub, ea, "checkout.session.completed", sa.id)).outcome, "grant");
    check("a · one lot", await lots(a.userId), 1);
    check("a · and a granted payment record", await record(sa.id), ["granted"]);
    check("a · readAllowance reports the pack", (await readAllowance(a.userId)).pack, 40);
  }

  // b · The same event again.
  {
    const { stub, calls } = stripeServing(sa);
    check("b · a replayed event is a duplicate", (await fulfilCheckoutSession(stub, ea, "checkout.session.completed", sa.id)).outcome, "duplicate");
    check("b · and asks Stripe nothing", calls.retrieve, 0);
    check("b · still one lot", await lots(a.userId), 1);
  }

  // c · A second event for the same Session.
  {
    const { stub } = stripeServing(sa);
    const again = await fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", sa.id);
    check("c · a second event for one Session is a duplicate", again.outcome, "duplicate");
    check("c · and still grants once", await lots(a.userId), 1);
  }

  // d · Two concurrent deliveries of one new event.
  {
    const d = await account();
    const sd = session(d.customerId, d.userId);
    const ed = eventId();
    const { stub } = stripeServing(sd);
    const got = (await Promise.all([1, 2].map(() => fulfilCheckoutSession(stub, ed, "checkout.session.completed", sd.id)))).map((r) => r.outcome).sort();
    check("d · two concurrent deliveries: one grant, one duplicate", got, ["duplicate", "grant"]);
    check("d · one lot", await lots(d.userId), 1);
  }

  // e · Attribution disagrees.
  {
    const e = await account();
    const other = await account();
    const se = session(e.customerId, other.userId);
    const { stub } = stripeServing(se);
    const r = await fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", se.id);
    check("e · a Session naming another account is refused", [r.outcome, r.reason], ["refuse", "attribution"]);
    check("e · neither account gets a lot", [await lots(e.userId), await lots(other.userId)], [0, 0]);
    check("e · and nothing is recorded", await record(se.id), []);
  }

  // f · No account behind the customer.
  {
    const ghost = id("user");
    const sf = session(id("cus"), ghost);
    const { stub } = stripeServing(sf);
    check("f · a payment from a customer with no account is unattributed", (await fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", sf.id)).outcome, "unattributed");
    check("f · kept as such, with no lot", [await record(sf.id), await lots(ghost)], [["unattributed"], 0]);
  }

  // g · The purge.
  {
    const report = await purgeAccount(a.userId);
    check("g · the purge takes the customer mapping and the lot", [report.rows.stripe_customers, report.rows.credit_grants], [1, 1]);
    check("g · and keeps the payment record, which names no account", await record(sa.id), ["granted"]);
  }
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    await cleanup();
    await pool.end();
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} failure(s).`);
    process.exit(failures === 0 ? 0 : 1);
  });
