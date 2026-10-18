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
//   h  a grant arriving while the purge holds the account's mapping is seen waiting on it, then keeps
//      the payment unattributed: no lot outlives the account
//   i  a Session recorded unattributed and seen again once its customer maps is a duplicate, not a grant
//   j  a full refund revokes the whole unspent lot (K2); readAllowance reports no pack credits
//   k  partial refunds read the charge's CUMULATIVE figure: a replayed event is a duplicate and a later one converges
//   l  a refund of a part-spent lot revokes only the unspent credits and records the shortfall
//   m  a dispute revokes the unspent lot, blocks buying, and a win gives back exactly that
//   n  a lost dispute stays revoked and stays blocked
//   o  a charge of another app is ignored; one of ours with no payment record yet asks for a retry
//   p  two concurrent deliveries of one refund event revoke once
//   q  the purge keeps the dispute record, which names no account
//   The monthly plan (the subscription PR), by `fulfilInvoice` and `syncSubscription` with a stand-in Stripe
//   whose invoice and subscription are crafted and mutable:
//   P1  the first invoice grants one 60-credit plan lot labelled `subscription_create`, stores the subscription
//      and a payment record under the INVOICE id, and `readAllowance` reports plan 60 with no planExpiresAt
//   P2  a renewal invoice grants a second lot labelled `subscription_cycle`
//   P3  cancel_at_period_end sets every live plan lot to the period end, and `readAllowance` reports it
//   P4  keeping the plan clears it again
//   P5  a deleted subscription ends the row and expires the lots
//   P6  a replayed invoice (same event, then a new event) grants once
//   P7  another app's subscription is refused: no row, no lot
//   P8  two concurrent deliveries of one invoice event grant once
//   P9  a late invoice.paid for an ENDED subscription grants a lot that expires at the ended period end
//   P10 S1 cancelled, S2 subscribed and granted, a late S1 event: S2's lot keeps no expiry
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run,
// restored by copying back), and each fails it:
//   - the event row's conflict check dropped (`fulfilCheckoutSession` carries on after a conflict): fails d.
//   - the lot's conflict target dropped (a plain insert): fails c.
//   - the attribution check removed from `decideFulfilment`: fails e.
//   - the mapping read without FOR SHARE: fails h (the grant is never seen waiting, reads the mapping the
//     purge has not yet committed away, and writes a lot after the purge's delete of the lots).
//   - a record conflict let through to the grant: fails i.
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
import { reverseCharge } from "../src/lib/payments/reverse";
import { fulfilInvoice, syncSubscription } from "../src/lib/payments/subscribe";
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
const PLAN_PRICE = `price_plan_${RUN}`;
process.env.STRIPE_PRICE_PLAN_60 = PLAN_PRICE;

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
const disputeIds: string[] = [];
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
    customer: customerId, client_reference_id: userId, metadata: { app: "the-99", pack: "pack40", user_id: userId },
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

/** A granted pack lot for a fresh account, with the payment intent it was paid by. */
async function boughtPack() {
  const acct = await account();
  const s = session(acct.customerId, acct.userId);
  const { stub } = stripeServing(s);
  await fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", s.id);
  const [lot] = await rows<{ id: string }>(sql`select id from credit_grants where user_id = ${acct.userId}`);
  return { ...acct, sid: s.id, pi: s.payment_intent as string, lotId: lot.id };
}

/** A stand-in Stripe for refunds and disputes: the charge's cumulative refund, the dispute's status, the intent's tag. */
function stripeReversing(pi: string, state: { refunded: number; dispute?: string; app?: string; ageSeconds?: number }) {
  return {
    charges: { retrieve: async () => ({ id: "ch_x", payment_intent: pi, amount: 531, amount_refunded: state.refunded, created: Math.floor(Date.now() / 1000) - (state.ageSeconds ?? 60) }) },
    disputes: { retrieve: async (did: string) => ({ id: did, charge: "ch_x", payment_intent: pi, status: state.dispute ?? "needs_response" }) },
    paymentIntents: { retrieve: async () => ({ id: pi, metadata: state.app ? { app: state.app } : {} }) },
  } as unknown as Stripe;
}
const lot = async (userId: string) => (await rows<{ revoked_units: number; unrecovered_units: number }>(sql`select revoked_units, unrecovered_units from credit_grants where user_id = ${userId}`))[0];
const blockedAt = async (userId: string) => (await rows<{ b: boolean }>(sql`select purchase_blocked_at is not null as b from stripe_customers where user_id = ${userId}`))[0]?.b;
const newDispute = () => { const d = id("dp"); disputeIds.push(d); return d; };

async function cleanup() {
  for (const u of users) {
    try {
      await fixture.execute(sql`delete from model_calls where user_id = ${u}`);
      await fixture.execute(sql`delete from credit_grants where user_id = ${u}`);
      await fixture.execute(sql`delete from subscriptions where user_id = ${u}`);
      await fixture.execute(sql`delete from stripe_customers where user_id = ${u}`);
    } catch (err) { failures += 1; console.error(`cleanup failed for ${u}`, err); }
  }
  try {
    for (const s of sessions) await fixture.execute(sql`delete from payment_records where checkout_session_id = ${s}`);
    for (const e of events) await fixture.execute(sql`delete from stripe_events where event_id = ${e}`);
    for (const d of disputeIds) await fixture.execute(sql`delete from payment_disputes where dispute_id = ${d}`);
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

  // i · A Session recorded unattributed, seen again under a new event once its customer maps to an
  //     account, is a duplicate: never granted on top of the hand refund it is waiting for.
  {
    const ghost = id("user");
    const customerId = id("cus");
    const si = session(customerId, ghost);
    const { stub } = stripeServing(si);
    check("i · first seen with no account, it is unattributed", (await fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", si.id)).outcome, "unattributed");
    users.push(ghost);
    await fixture.execute(sql`insert into stripe_customers (user_id, stripe_customer_id) values (${ghost}, ${customerId})`);
    check("i · seen again with a mapping, it is a duplicate", (await fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", si.id)).outcome, "duplicate");
    check("i · and grants nothing", await lots(ghost), 0);
  }

  // P1-P10 · The monthly plan.
  const PERIOD1 = new Date(Date.now() + 30 * 86_400_000);
  const planStripe = (state: { sub: unknown; invoices: Record<string, unknown> }) =>
    ({ invoices: { retrieve: async (i: string) => state.invoices[i] }, subscriptions: { retrieve: async () => state.sub } }) as unknown as Stripe;
  const subObj = (customerId: string, userId: string, over: { cancel?: boolean; status?: string; end?: Date; app?: string } = {}) => ({
    id: subId, status: over.status ?? "active", customer: customerId, cancel_at_period_end: over.cancel ?? false,
    metadata: { app: over.app ?? "the-99", plan: "plan60", user_id: userId },
    items: { data: [{ current_period_end: Math.floor((over.end ?? PERIOD1).getTime() / 1000), price: { id: PLAN_PRICE } }] },
  });
  const invObj = (iid: string, customerId: string, userId: string, reason: string) => {
    sessions.push(iid);
    return {
      id: iid, status: "paid", billing_reason: reason, currency: "usd", amount_paid: 500, total: 500, total_excluding_tax: 500,
      customer: customerId, customer_address: { country: "US" },
      parent: { subscription_details: { subscription: subId, metadata: { app: "the-99", plan: "plan60", user_id: userId } } },
      lines: { data: [{ quantity: 1, pricing: { price_details: { price: PLAN_PRICE } } }] },
      payments: { data: [{ status: "paid", payment: { type: "payment_intent", payment_intent: id("pi") } }] },
    };
  };
  let subId = id("sub");
  const planLots = async (userId: string) => rows<{ reason: string | null; units: number; exp: string | null }>(sql`
    select billing_reason as reason, units, expires_at::text as exp from credit_grants where user_id = ${userId} and source = 'plan' order by created_at, external_id`);
  const subRow = async () => (await rows<{ status: string; cancel: boolean }>(sql`select status, cancel_at_period_end as cancel from subscriptions where stripe_subscription_id = ${subId}`))[0] ?? null;
  const j = await account();
  const inv1 = id("in");
  const inv2 = id("in");
  const state = { sub: subObj(j.customerId, j.userId), invoices: { [inv1]: invObj(inv1, j.customerId, j.userId, "subscription_create"), [inv2]: invObj(inv2, j.customerId, j.userId, "subscription_cycle") } as Record<string, unknown> };
  const ps = planStripe(state);
  const ej = eventId();
  check("P1 · the first invoice grants", (await fulfilInvoice(ps, ej, "invoice.paid", inv1, subId)).outcome, "grant");
  check("P1 · one 60-credit lot labelled subscription_create, not expiring", (await planLots(j.userId)).map((l) => [l.reason, l.units, l.exp]), [["subscription_create", 60, null]]);
  check("P1 · the payment is recorded under the invoice id", await record(inv1), ["granted"]);
  check("P1 · the subscription is stored", await subRow(), { status: "active", cancel: false });
  {
    const al = await readAllowance(j.userId);
    check("P1 · readAllowance reports plan 60 and no expiry", [al.plan, al.planExpiresAt ?? null], [60, null]);
  }
  check("P2 · a renewal grants a second lot", (await fulfilInvoice(ps, eventId(), "invoice.paid", inv2, subId)).outcome, "grant");
  check("P2 · labelled subscription_cycle", (await planLots(j.userId)).map((l) => l.reason).sort(), ["subscription_create", "subscription_cycle"]);
  state.sub = subObj(j.customerId, j.userId, { cancel: true });
  check("P3 · cancel at period end is applied", (await syncSubscription(ps, eventId(), "customer.subscription.updated", subId)).outcome, "applied");
  check("P3 · every live plan lot expires at the period end", (await planLots(j.userId)).every((l) => l.exp !== null), true);
  {
    const al = await readAllowance(j.userId);
    check("P3 · readAllowance reports the expiry", al.planExpiresAt instanceof Date && Math.abs(al.planExpiresAt.getTime() - PERIOD1.getTime()) < 1000, true);
  }
  state.sub = subObj(j.customerId, j.userId, { cancel: false });
  await syncSubscription(ps, eventId(), "customer.subscription.updated", subId);
  check("P4 · keeping the plan clears every expiry", (await planLots(j.userId)).map((l) => l.exp), [null, null]);
  state.sub = subObj(j.customerId, j.userId, { status: "canceled" });
  await syncSubscription(ps, eventId(), "customer.subscription.deleted", subId);
  check("P5 · a deleted subscription ends the row", (await subRow())?.status, "canceled");
  check("P5 · and expires the lots at the period end", (await planLots(j.userId)).every((l) => l.exp !== null), true);
  {
    subId = id("sub");
    const o = await account();
    const oi = id("in");
    const os = { sub: subObj(o.customerId, o.userId), invoices: { [oi]: invObj(oi, o.customerId, o.userId, "subscription_create") } as Record<string, unknown> };
    const eo = eventId();
    await fulfilInvoice(planStripe(os), eo, "invoice.paid", oi, subId);
    check("P6 · the same event again is a duplicate", (await fulfilInvoice(planStripe(os), eo, "invoice.paid", oi, subId)).outcome, "duplicate");
    check("P6 · a new event for the same invoice is a duplicate", (await fulfilInvoice(planStripe(os), eventId(), "invoice.paid", oi, subId)).outcome, "duplicate");
    check("P6 · one lot", await lots(o.userId), 1);
  }
  {
    subId = id("sub");
    const p = await account();
    const pi = id("in");
    const pst = { sub: subObj(p.customerId, p.userId, { app: "concert-crawl" }), invoices: { [pi]: invObj(pi, p.customerId, p.userId, "subscription_create") } as Record<string, unknown> };
    const r = await fulfilInvoice(planStripe(pst), eventId(), "invoice.paid", pi, subId);
    check("P7 · another app's subscription is refused", [r.outcome, r.reason], ["refuse", "not_ours"]);
    check("P7 · no lot", await lots(p.userId), 0);
  }
  {
    subId = id("sub");
    const q = await account();
    const qi = id("in");
    const qs = { sub: subObj(q.customerId, q.userId), invoices: { [qi]: invObj(qi, q.customerId, q.userId, "subscription_create") } as Record<string, unknown> };
    const eq = eventId();
    const got = (await Promise.all([1, 2].map(() => fulfilInvoice(planStripe(qs), eq, "invoice.paid", qi, subId)))).map((r) => r.outcome).sort();
    check("P8 · two concurrent deliveries of one invoice event: one grant, one duplicate", got, ["duplicate", "grant"]);
    check("P8 · one lot", await lots(q.userId), 1);
  }

  {
    subId = id("sub");
    const r = await account();
    const ri = id("in");
    const rs = { sub: subObj(r.customerId, r.userId, { status: "canceled" }), invoices: { [ri]: invObj(ri, r.customerId, r.userId, "subscription_cycle") } as Record<string, unknown> };
    await syncSubscription(planStripe(rs), eventId(), "customer.subscription.deleted", subId);
    check("P9 · a late invoice for an ended subscription still grants", (await fulfilInvoice(planStripe(rs), eventId(), "invoice.paid", ri, subId)).outcome, "grant");
    check("P9 · and its lot expires at the ended period end", (await planLots(r.userId)).every((l) => l.exp !== null && Math.abs(new Date(l.exp + "Z").getTime() - PERIOD1.getTime()) < 5000), true);
  }
  {
    const t = await account();
    const s1 = id("sub");
    const s2 = id("sub");
    const i1 = id("in");
    const i2 = id("in");
    subId = s1;
    const first = { sub: subObj(t.customerId, t.userId), invoices: { [i1]: invObj(i1, t.customerId, t.userId, "subscription_create") } as Record<string, unknown> };
    await fulfilInvoice(planStripe(first), eventId(), "invoice.paid", i1, s1);
    first.sub = subObj(t.customerId, t.userId, { status: "canceled" });
    await syncSubscription(planStripe(first), eventId(), "customer.subscription.deleted", s1);
    subId = s2;
    const second = { sub: subObj(t.customerId, t.userId), invoices: { [i2]: invObj(i2, t.customerId, t.userId, "subscription_create") } as Record<string, unknown> };
    await fulfilInvoice(planStripe(second), eventId(), "invoice.paid", i2, s2);
    subId = s1;
    await syncSubscription(planStripe(first), eventId(), "customer.subscription.deleted", s1);
    const bySub = await rows<{ sid: string; exp: string | null }>(sql`select subscription_id as sid, expires_at::text as exp from credit_grants where user_id = ${t.userId} order by created_at`);
    check("P10 · the old subscription's lot expires, the new one's does not, after a late old event", bySub.map((l) => [l.sid === s1 ? "s1" : "s2", l.exp !== null]), [["s1", true], ["s2", false]]);
  }

  // h · A purge holding the account's mapping when the grant arrives: the grant waits on the mapping
  //     row (FOR SHARE), finds it gone once the purge commits, and keeps the payment unattributed, so
  //     no lot outlives the account. The purge is played by hand, in the order PURGE_ORDER runs it.
  {
    const h = await account();
    const sh = session(h.customerId, h.userId);
    const { stub } = stripeServing(sh);
    const purge = await pool.connect();
    let open = false;
    try {
      await purge.query("begin");
      open = true;
      await purge.query("delete from stripe_customers where user_id = $1", [h.userId]);
      const granting = fulfilCheckoutSession(stub, eventId(), "checkout.session.completed", sh.id);
      // The grant must be SEEN waiting on the mapping row before the purge goes on: a fixed delay would
      // also pass with the lock removed, whenever the purge happened to commit first.
      let waiting = false;
      for (let i = 0; i < 100 && !waiting; i += 1) {
        const [w] = await rows<{ n: number }>(sql`select count(*)::int as n from pg_stat_activity
          where wait_event_type = 'Lock' and query ilike '%"stripe_customers"%for share%'`);
        waiting = w.n > 0;
        if (!waiting) await new Promise((r) => setTimeout(r, 100));
      }
      check("h · the grant waits on the mapping the purge holds", waiting, true);
      await purge.query("delete from credit_grants where user_id = $1", [h.userId]);
      await purge.query("commit");
      open = false;
      check("h · a grant racing the purge of its account is kept unattributed", (await granting).outcome, "unattributed");
      check("h · and leaves no lot behind", await lots(h.userId), 0);
    } finally {
      // A failure mid-way must not hand a connection still inside the transaction, and its locks, back
      // to the pool that the cleanup then runs on.
      if (open) await purge.query("rollback").catch(() => {});
      purge.release();
    }
  }

  // j · A full refund.
  {
    const j = await boughtPack();
    const st = { refunded: 531 };
    const r = await reverseCharge(stripeReversing(j.pi, st), eventId(), "charge.refunded", "ch_x");
    check("j · a full refund is applied with no shortfall", [r.outcome, r.shortfall], ["refund", false]);
    check("j · the whole lot is revoked", (await lot(j.userId)).revoked_units, 40);
    // A fully revoked lot holds nothing, so it is no lot at all: the Allowance carries no pack figure, which every reader takes as none.
    check("j · readAllowance reports no pack credits", (await readAllowance(j.userId)).pack ?? 0, 0);
  }

  // k · Partial refunds, cumulative.
  {
    const k = await boughtPack();
    const st = { refunded: 266 }; // about half of 531
    const ev = eventId();
    await reverseCharge(stripeReversing(k.pi, st), ev, "charge.refunded", "ch_x");
    const first = (await lot(k.userId)).revoked_units;
    check("k · half refunded revokes about half", first, 21);
    check("k · a replay is a duplicate", (await reverseCharge(stripeReversing(k.pi, st), ev, "charge.refunded", "ch_x")).outcome, "duplicate");
    st.refunded = 531;
    await reverseCharge(stripeReversing(k.pi, st), eventId(), "charge.refunded", "ch_x");
    check("k · the later cumulative figure converges on the whole lot", (await lot(k.userId)).revoked_units, 40);
    st.refunded = 266;
    await reverseCharge(stripeReversing(k.pi, st), eventId(), "charge.refunded", "ch_x");
    check("k · an older figure arriving late never lowers it", (await lot(k.userId)).revoked_units, 40);
  }

  // l · Part spent.
  {
    const l = await boughtPack();
    for (let i = 0; i < 15; i += 1) {
      await fixture.execute(sql`insert into model_calls (user_id, feature, origin, status, credit_grant_id) values (${l.userId}, 'synopsis', 'player', 'spent', ${l.lotId})`);
    }
    const r = await reverseCharge(stripeReversing(l.pi, { refunded: 531 }), eventId(), "charge.refunded", "ch_x");
    check("l · a refund of a part-spent lot reports the shortfall", [r.outcome, r.shortfall], ["refund", true]);
    check("l · revokes only the unspent 25 and records 15 unrecovered", await lot(l.userId), { revoked_units: 25, unrecovered_units: 15 });
    check("l · nothing spendable is left", (await readAllowance(l.userId)).pack, 0);
  }

  // m · A dispute, then a win.
  {
    const m = await boughtPack();
    const did = newDispute();
    const st = { refunded: 0, dispute: "needs_response" };
    const r = await reverseCharge(stripeReversing(m.pi, st), eventId(), "charge.dispute.created", did);
    check("m · a dispute opens", r.outcome, "dispute_opened");
    check("m · revokes the unspent lot and blocks buying", [(await lot(m.userId)).revoked_units, await blockedAt(m.userId)], [40, true]);
    st.dispute = "won";
    check("m · a win is applied", (await reverseCharge(stripeReversing(m.pi, st), eventId(), "charge.dispute.closed", did)).outcome, "dispute_won");
    check("m · it gives back exactly what the dispute took, and the block stays", [(await lot(m.userId)).revoked_units, await blockedAt(m.userId)], [0, true]);
  }

  // n · A lost dispute.
  {
    const nn = await boughtPack();
    const did = newDispute();
    const st = { refunded: 0, dispute: "needs_response" };
    await reverseCharge(stripeReversing(nn.pi, st), eventId(), "charge.dispute.created", did);
    st.dispute = "lost";
    check("n · a loss is applied", (await reverseCharge(stripeReversing(nn.pi, st), eventId(), "charge.dispute.closed", did)).outcome, "dispute_lost");
    check("n · the lot stays revoked and buying stays blocked", [(await lot(nn.userId)).revoked_units, await blockedAt(nn.userId)], [40, true]);
  }

  // o · Whose charge.
  {
    const other = id("pi");
    check("o · another app's charge is ignored", (await reverseCharge(stripeReversing(other, { refunded: 100, app: "concert-crawl" }), eventId(), "charge.refunded", "ch_x")).outcome, "ignored");
    const ours = id("pi");
    check("o · ours with no record yet asks for a retry", (await reverseCharge(stripeReversing(ours, { refunded: 100, app: "the-99" }), eventId(), "charge.refunded", "ch_x")).outcome, "retry");
    check("o · ours with no record, past the grace window, is recorded as unmatched", (await reverseCharge(stripeReversing(ours, { refunded: 100, app: "the-99", ageSeconds: 73 * 3600 }), eventId(), "charge.refunded", "ch_x")).outcome, "unmatched");
  }

  // p · The same refund event delivered twice at once.
  {
    const pp = await boughtPack();
    const ev = eventId();
    const got = (await Promise.all([1, 2].map(() => reverseCharge(stripeReversing(pp.pi, { refunded: 531 }), ev, "charge.refunded", "ch_x")))).map((r) => r.outcome).sort();
    check("p · two concurrent deliveries: one refund, one duplicate", got, ["duplicate", "refund"]);
  }

  // q · The purge keeps the dispute record.
  {
    const q = await boughtPack();
    const did = newDispute();
    await reverseCharge(stripeReversing(q.pi, { refunded: 0 }), eventId(), "charge.dispute.created", did);
    // The purge's step 0 deletes the account's Stripe Customer: a stand-in tagged as `ensureCustomer` tags it, so no network call.
    const fakeForQ = {
      customers: {
        retrieve: async (id: string) => ({ id, metadata: { app: "the-99", user_id: q.userId } }),
        del: async (id: string) => ({ id, deleted: true }),
      },
    } as unknown as import("stripe").default;
    await purgeAccount(q.userId, { stripe: () => fakeForQ });
    check("q · the dispute row outlives the account", Number((await rows<{ n: string }>(sql`select count(*)::text as n from payment_disputes where dispute_id = ${did}`))[0].n), 1);
  }

  // g · The purge.
  {
    // A stand-in for Stripe, so the purge's step 0 makes no network call and needs no key: the Customer is
    // tagged as `ensureCustomer` tags it, and the delete resolves.
    const fakeStripe = {
      customers: {
        retrieve: async (id: string) => ({ id, metadata: { app: "the-99", user_id: a.userId } }),
        del: async (id: string) => ({ id, deleted: true }),
      },
    } as unknown as import("stripe").default;
    const report = await purgeAccount(a.userId, { stripe: () => fakeStripe });
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
