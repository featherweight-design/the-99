// The plan card's server half (payments U3a, plan E4/E5), proved against a real Postgres by calling the real
// `setPlanCancelling` and `openCardPortal` with a stand-in Stripe whose subscription and customer are crafted and whose
// calls are counted. Proves the plan card's writes re-read Stripe and check `metadata.app` / `user_id` first.
//
// Cases:
//   a  cancel re-reads Stripe (one retrieve) and sets cancel_at_period_end true; keep sets it false
//   b  a repeat is `unchanged`: no update call
//   c  a subscription whose Stripe metadata names another account is refused: update never called, even though OUR row
//      says it is this account's
//   d  another app's subscription is refused: update never called
//   e  Stripe says canceled while our row still says active: refused as ended, no update
//   f  an account with no plan row asks Stripe nothing
//   g  neither call writes OUR rows: the subscriptions row is byte-identical afterwards (the webhook is the writer)
//   h  the portal uses STRIPE_PORTAL_CONFIG and /credits, is unconfigured without it (no Session), and refuses a
//      Customer not tagged for the account
//
// Writes under per-run ids and deletes them in a `finally`; fails closed: `PROBE_DB_BRANCH` must name the branch
// `DATABASE_URL` reports, and staging and production are refused by id.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:plan-cancel
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import type Stripe from "stripe";

import { openCardPortal, setPlanCancelling } from "../src/lib/payments/plan-manage";

const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";

const { DATABASE_URL, PROBE_DB_BRANCH } = requireEnv(["DATABASE_URL", "PROBE_DB_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });
const fixture = drizzle(pool);
const RUN = `probe-pc-${Date.now()}`;
process.env.STRIPE_PORTAL_CONFIG = "bpc_probe123";
process.env.APP_ORIGIN = "https://the-99.dev";

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
let n = 0;
const id = (kind: string) => `${kind}_${RUN}_${++n}`;

/** An account with a mapped Customer and (optionally) a stored plan row. */
async function account(status: string | null = "active") {
  const userId = id("user");
  const customerId = id("cus");
  const subId = id("sub");
  users.push(userId);
  await fixture.execute(sql`insert into stripe_customers (user_id, stripe_customer_id) values (${userId}, ${customerId})`);
  if (status) {
    await fixture.execute(sql`insert into subscriptions (stripe_subscription_id, user_id, status, cancel_at_period_end) values (${subId}, ${userId}, ${status}, false)`);
  }
  return { userId, customerId, subId };
}

type SubState = { status: string; metadata: Record<string, string>; cancel_at_period_end: boolean };
/** A stand-in Stripe: the subscription and customer it serves are mutable, and every call is counted. */
function stripeServing(sub: SubState, customer: { metadata: Record<string, string> }) {
  const calls = { retrieve: 0, update: [] as unknown[], portal: [] as unknown[] };
  const stub = {
    subscriptions: {
      retrieve: async (sid: string) => { calls.retrieve += 1; return { id: sid, ...sub }; },
      update: async (sid: string, params: { cancel_at_period_end: boolean }) => {
        calls.update.push(params);
        sub.cancel_at_period_end = params.cancel_at_period_end;
        return { id: sid, ...sub };
      },
    },
    customers: { retrieve: async (cid: string) => ({ id: cid, ...customer }) },
    billingPortal: { sessions: { create: async (p: unknown) => { calls.portal.push(p); return { url: "https://billing.stripe.com/p/probe" }; } } },
  } as unknown as Stripe;
  return { stub, calls, sub };
}

async function cleanup() {
  for (const u of users) {
    try {
      await fixture.execute(sql`delete from subscriptions where user_id = ${u}`);
      await fixture.execute(sql`delete from stripe_customers where user_id = ${u}`);
    } catch (err) { failures += 1; console.error(`cleanup failed for ${u}`, err); }
  }
}

async function run() {
  const [{ branch }] = await rows<{ branch: string | null }>(sql`select current_setting('neon.branch_id', true) as branch`);
  if (!branch || branch !== PROBE_DB_BRANCH || branch === STAGING_BRANCH || branch === PRODUCTION_BRANCH) {
    throw new Error(`refusing to run against ${branch}: this probe writes. Name the scratch branch DATABASE_URL reports as PROBE_DB_BRANCH.`);
  }
  console.log(`branch ${branch}`);
  const tagged = (userId: string) => ({ app: "the-99", user_id: userId });
  const rowOf = async (userId: string) => JSON.stringify(await rows(sql`select * from subscriptions where user_id = ${userId}`));

  // a, b, g · cancel then keep, a repeat, and none of OUR rows written.
  {
    const a = await account();
    const before = await rowOf(a.userId);
    const s = stripeServing({ status: "active", metadata: tagged(a.userId), cancel_at_period_end: false }, { metadata: tagged(a.userId) });
    check("a · cancel is applied", await setPlanCancelling(s.stub, a.userId, true), { ok: true, changed: true });
    check("a · it re-read Stripe once and set true", [s.calls.retrieve, s.calls.update], [1, [{ cancel_at_period_end: true }]]);
    check("b · a repeat cancel is unchanged, with no second update", [await setPlanCancelling(s.stub, a.userId, true), s.calls.update.length], [{ ok: true, changed: false }, 1]);
    check("a · keep is applied", await setPlanCancelling(s.stub, a.userId, false), { ok: true, changed: true });
    check("a · it set false", s.calls.update[1], { cancel_at_period_end: false });
    check("g · our subscriptions row is untouched: the webhook is the writer", await rowOf(a.userId), before);
  }

  // c · Stripe's metadata names another account, though our row says this one's.
  {
    const a = await account();
    const s = stripeServing({ status: "active", metadata: tagged("user_someone_else"), cancel_at_period_end: false }, { metadata: tagged(a.userId) });
    check("c · a subscription tagged for another account is refused", await setPlanCancelling(s.stub, a.userId, true), { ok: false, reason: "foreign" });
    check("c · and update is never called", s.calls.update.length, 0);
  }

  // d · another app's subscription.
  {
    const a = await account();
    const s = stripeServing({ status: "active", metadata: { app: "concert-crawl", user_id: a.userId }, cancel_at_period_end: false }, { metadata: tagged(a.userId) });
    check("d · another app's subscription is refused", await setPlanCancelling(s.stub, a.userId, true), { ok: false, reason: "foreign" });
    check("d · and update is never called", s.calls.update.length, 0);
  }

  // e · Stripe says ended while our row is stale.
  {
    const a = await account();
    const s = stripeServing({ status: "canceled", metadata: tagged(a.userId), cancel_at_period_end: false }, { metadata: tagged(a.userId) });
    check("e · Stripe's status wins over our row", await setPlanCancelling(s.stub, a.userId, true), { ok: false, reason: "ended" });
    check("e · and update is never called", s.calls.update.length, 0);
  }

  // f · no plan row.
  {
    const a = await account(null);
    const s = stripeServing({ status: "active", metadata: tagged(a.userId), cancel_at_period_end: false }, { metadata: tagged(a.userId) });
    check("f · no plan row is not_found", await setPlanCancelling(s.stub, a.userId, true), { ok: false, reason: "not_found" });
    check("f · and Stripe is not asked", [s.calls.retrieve, s.calls.update.length], [0, 0]);
  }

  // h · the portal.
  {
    const a = await account(null);
    const s = stripeServing({ status: "active", metadata: tagged(a.userId), cancel_at_period_end: false }, { metadata: tagged(a.userId) });
    check("h · a portal Session on our configuration", await openCardPortal(s.stub, a.userId), { ok: true, url: "https://billing.stripe.com/p/probe" });
    check("h · customer, configuration and return_url", s.calls.portal[0], { customer: a.customerId, configuration: "bpc_probe123", return_url: "https://the-99.dev/credits" });
    const foreign = stripeServing({ status: "active", metadata: tagged(a.userId), cancel_at_period_end: false }, { metadata: tagged("user_someone_else") });
    check("h · a Customer tagged for another account is refused", [await openCardPortal(foreign.stub, a.userId), foreign.calls.portal.length], [{ ok: false, reason: "not_found" }, 0]);
    delete process.env.STRIPE_PORTAL_CONFIG;
    check("h · no configuration is unconfigured, with no Session", [await openCardPortal(s.stub, a.userId), s.calls.portal.length], [{ ok: false, reason: "unconfigured" }, 1]);
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
