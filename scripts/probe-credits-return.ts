// The Checkout RETURN's read and the purchase history (buying-credits plan E1, E8, G5), proved against a real
// Postgres by calling the real `readReturn`, `listCreditHistory` and `fulfilCheckoutSession`. Stripe is a
// stand-in object whose `checkout.sessions.retrieve` serves crafted Sessions (or throws), so this proves the
// database half: that a return reads the grant of THIS viewer and nobody else's, and what it says before and
// after the webhook's grant lands. The signature and the grant transaction are `probe:payments-webhook`.
//
// Cases:
//   a  a paid pack Session of viewer A with no grant reads `processing` (units = the pack's size); after
//      `fulfilCheckoutSession` runs it reads `added` with the GRANT's units (the lot is set to 37 to tell them apart)
//   b  viewer B reading A's Session id reads `none`, before and after the grant exists; and a Session Stripe serves
//      with B's id on it, under A's Session id, finds no grant of B's (the lookup is scoped to user_id): `processing`,
//      never `added`; nothing is inserted for B
//   c  a Session with no `metadata.app`, another app's, an unknown pack, a non-`cs_` id (Stripe never asked) or an
//      unpaid status reads `none`
//   d  a Session Stripe does not know (code `resource_missing`) reads `none`; any other error throws
//   e  `listCreditHistory(A)` returns A's two pack lots newest first and none of B's
//
// Mutations, each run against it (file copied to the scratchpad, broken by an exact replace, run, restored by
// copying back), and each fails it:
//   - the `user_id` condition dropped from the grant lookup in `readReturn`: fails b (B's session id over A's grant).
//   - the `metadata.user_id` check dropped from `decideReturn`: fails b and c.
//
// It writes under per-run ids and deletes them in a `finally`, so it fails closed: `PROBE_DB_BRANCH` must name the
// branch the database reports, and staging, production and local-dev are refused by id. `.env` overrides an
// exported `DATABASE_URL`, so the target is `PROBE_DATABASE_URL`, assigned after the env import.
//
//   PROBE_DATABASE_URL=… PROBE_DB_BRANCH=br-… pnpm probe:credits-return
// First, and on its own line: the helper's import loads `.env`, and anything reading
// `DATABASE_URL` at module scope needs it already loaded.
import { requireEnv } from "./lib/env.mjs";
import { sql } from "drizzle-orm";
import type Stripe from "stripe";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const LOCAL_DEV_BRANCH = "br-patient-hall-a6nbonvo";

const { PROBE_DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["PROBE_DATABASE_URL", "PROBE_DB_BRANCH"]);
process.env.DATABASE_URL = PROBE_DATABASE_URL;
const RUN = `probecr${Date.now()}`;
const PRICE = `price_${RUN}`;
process.env.STRIPE_PRICE_PACK_40 = PRICE;

// Dynamic, because a static import is hoisted above the assignment of DATABASE_URL (loaded in `run`: no top-level await under tsx's cjs).
let fixture: typeof import("../src/db").db;
let fulfilCheckoutSession: typeof import("../src/lib/payments/fulfil").fulfilCheckoutSession;
let readReturn: typeof import("../src/lib/payments/return").readReturn;
let listCreditHistory: typeof import("../src/lib/payments/return").listCreditHistory;

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
const sessions: string[] = [];
const events: string[] = [];
let n = 0;
const id = (kind: string) => `${kind}_${RUN}_${++n}`;

async function account() {
  const userId = id("user");
  const customerId = id("cus");
  users.push(userId);
  await fixture.execute(sql`insert into stripe_customers (user_id, stripe_customer_id) values (${userId}, ${customerId})`);
  return { userId, customerId };
}

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

/** A stand-in Stripe whose retrieve answers with `answer` (a Session, or a function that may throw) and counts calls. */
function stripeServing(answer: Stripe.Checkout.Session | (() => Stripe.Checkout.Session)) {
  const calls = { retrieve: 0 };
  const stub = { checkout: { sessions: { retrieve: async () => { calls.retrieve += 1; return typeof answer === "function" ? answer() : answer; } } } } as unknown as Stripe;
  return { stub, calls };
}

const grantsOf = async (userId: string) => Number((await rows<{ n: string }>(sql`select count(*)::text as n from credit_grants where user_id = ${userId}`))[0].n);

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

const grant = async (s: Stripe.Checkout.Session) => {
  const e = id("evt");
  events.push(e);
  return (await fulfilCheckoutSession(stripeServing(s).stub, e, "checkout.session.completed", s.id)).outcome;
};

async function run() {
  fixture = (await import("../src/db")).db;
  ({ fulfilCheckoutSession } = await import("../src/lib/payments/fulfil"));
  ({ readReturn, listCreditHistory } = await import("../src/lib/payments/return"));
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || [STAGING_BRANCH, PRODUCTION_BRANCH, LOCAL_DEV_BRANCH].includes(branch)) {
    throw new Error(`refusing to run against ${branch}: this probe writes. Name the scratch branch the database reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);

  const A = await account();
  const B = await account();
  const sa = session(A.customerId, A.userId);
  const { stub: stubA } = stripeServing(sa);

  // a · processing, then added with the grant's own units.
  check("a · a paid pack Session with no grant reads processing at the pack's size", await readReturn(stubA, { sessionId: sa.id, viewerId: A.userId }), { kind: "processing", units: 40 });
  // b (before) · another viewer's read of the same id.
  check("b · B reading A's Session id before the grant reads none", await readReturn(stubA, { sessionId: sa.id, viewerId: B.userId }), { kind: "none" });
  check("a · fulfilment grants", await grant(sa), "grant");
  check("a · after the grant it reads added", await readReturn(stubA, { sessionId: sa.id, viewerId: A.userId }), { kind: "added", units: 40 });
  await fixture.execute(sql`update credit_grants set units = 37 where user_id = ${A.userId} and external_id = ${sa.id}`);
  check("a · and the units are the GRANT's, not the pack's", await readReturn(stubA, { sessionId: sa.id, viewerId: A.userId }), { kind: "added", units: 37 });

  // b (after) · B, with and without a Session of its own naming B over A's Session id.
  check("b · B reading A's Session id after the grant reads none", await readReturn(stubA, { sessionId: sa.id, viewerId: B.userId }), { kind: "none" });
  {
    const forged = { ...session(B.customerId, B.userId), id: sa.id } as Stripe.Checkout.Session;
    const { stub } = stripeServing(forged);
    check("b · a Session naming B under A's Session id finds no grant of B's (the lookup is scoped to the viewer)", await readReturn(stub, { sessionId: sa.id, viewerId: B.userId }), { kind: "processing", units: 40 });
    check("b · and nothing is inserted for B", await grantsOf(B.userId), 0);
  }

  // c · Sessions that read none.
  {
    const bad: Array<[string, Stripe.Checkout.Session]> = [
      ["no metadata.app", session(A.customerId, A.userId, { metadata: { pack: "pack40", user_id: A.userId } } as never)],
      ["another app's", session(A.customerId, A.userId, { metadata: { app: "concert-crawl", pack: "pack40", user_id: A.userId } } as never)],
      ["an unknown pack", session(A.customerId, A.userId, { metadata: { app: "the-99", pack: "pack999", user_id: A.userId } } as never)],
      ["an unpaid status", session(A.customerId, A.userId, { payment_status: "unpaid" } as never)],
    ];
    for (const [label, s] of bad) {
      check(`c · ${label} reads none`, await readReturn(stripeServing(s).stub, { sessionId: s.id, viewerId: A.userId }), { kind: "none" });
    }
    const { stub, calls } = stripeServing(sa);
    for (const bogus of ["pi_123", "cs_", "cs_bad-id", "", 42, null, undefined]) {
      const r = await readReturn(stub, { sessionId: bogus, viewerId: A.userId });
      if (r.kind !== "none") check(`c · ${JSON.stringify(bogus)} reads none`, r, { kind: "none" });
    }
    check("c · a non-cs_ id never reaches Stripe", calls.retrieve, 0);
  }

  // d · Stripe does not know the Session / fails otherwise.
  {
    const { stub } = stripeServing(() => { throw Object.assign(new Error("No such checkout.session"), { code: "resource_missing" }); });
    check("d · a Session Stripe does not know reads none", await readReturn(stub, { sessionId: `cs_${RUN}_unknown`, viewerId: A.userId }), { kind: "none" });
    const { stub: broken } = stripeServing(() => { throw Object.assign(new Error("boom"), { code: "api_connection_error" }); });
    let threw = false;
    try { await readReturn(broken, { sessionId: `cs_${RUN}_unknown`, viewerId: A.userId }); } catch { threw = true; }
    check("d · any other Stripe error throws", threw, true);
  }

  // e · history.
  {
    const sa2 = session(A.customerId, A.userId);
    check("e · a second pack for A grants", await grant(sa2), "grant");
    const sb = session(B.customerId, B.userId);
    check("e · a pack for B grants", await grant(sb), "grant");
    const ha = await listCreditHistory(A.userId);
    check("e · A's history is its two lots, newest first", ha.map((r) => [r.source, r.externalId]), [["pack", sa2.id], ["pack", sa.id]]);
    check("e · and holds none of B's", ha.some((r) => r.externalId === sb.id), false);
    check("e · B's history is B's one lot", (await listCreditHistory(B.userId)).map((r) => r.externalId), [sb.id]);
  }
}

run()
  .catch((err) => { failures += 1; console.error(err); })
  .finally(async () => {
    await cleanup();
    process.exit(failures === 0 ? (console.log("\nAll checks passed."), 0) : (console.log(`\n${failures} failure(s).`), 1));
  });
