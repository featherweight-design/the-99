// RECONCILE PAYMENTS (payments K2). READ-ONLY and dry-run only: no write mode exists. Lists, for the last 72 hours,
//   A  paid PaymentIntents tagged `metadata.app = "the-99"` in Stripe with NO `payment_records` row, and
//   B  `payment_records` rows (and pack lots) with no matching paid PaymentIntent / record.
// Output is counts and Stripe ids to the terminal, nothing else (no email, no amount, no account id).
//
// Stripe is read with the restricted key (`STRIPE_SECRET_KEY`: PaymentIntents read is all it uses). The
// database is read inside one READ ONLY transaction. The target is NAMED, as the other read-only scripts do:
//
//   RECONCILE_TARGET_BRANCH=br-…  must equal the `neon.branch_id` `DATABASE_URL` reports, or it stops.
//   Production and staging are refused unless  RECONCILE_READONLY_OK=<that same branch id>  also names them:
//   a deliberate act, because this is the one script here pointed at a live ledger. It still writes nothing.
//
//   RECONCILE_TARGET_BRANCH=br-… pnpm reconcile:payments
// First, and on its own line: the helper's import loads `.env`.
import { requireEnv } from "./lib/env.mjs";
import { Pool } from "@neondatabase/serverless";
import { PAYMENTS_APP } from "../src/lib/payments/packs";
import { unmatchedInvoices, unmatchedRecords } from "../src/lib/payments/reconcile";
import { stripeClient } from "../src/lib/payments/stripe";

const PRODUCTION_BRANCH = "br-noisy-violet-a6vw4ess";
const STAGING_BRANCH = "br-polished-pond-a6e63y0b";
const WINDOW_HOURS = 72;
// The database side looks back an hour less: a record is written after its PaymentIntent was created.
const DB_WINDOW_HOURS = 71;

const { DATABASE_URL, RECONCILE_TARGET_BRANCH } = requireEnv(["DATABASE_URL", "RECONCILE_TARGET_BRANCH"]);
const pool = new Pool({ connectionString: DATABASE_URL });

async function main(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin read only");
    const { rows } = await client.query("select current_setting('neon.branch_id', true) as branch");
    const branch = rows[0]?.branch as string | null;
    if (branch !== RECONCILE_TARGET_BRANCH) {
      console.error("refused: RECONCILE_TARGET_BRANCH does not match the database DATABASE_URL reports");
      return 2;
    }
    if ((branch === PRODUCTION_BRANCH || branch === STAGING_BRANCH) && process.env.RECONCILE_READONLY_OK !== branch) {
      console.error("refused: production and staging need RECONCILE_READONLY_OK=<the branch id> (read-only, writes nothing)");
      return 2;
    }
    const stripe = stripeClient();
    if (!stripe) {
      console.error("refused: no usable Stripe key for this environment");
      return 2;
    }

    const since = Math.floor(Date.now() / 1000) - WINDOW_HOURS * 3600;
    const paid = new Set<string>();
    for await (const pi of stripe.paymentIntents.list({ created: { gte: since }, limit: 100 })) {
      if (pi.status === "succeeded" && pi.metadata?.app === PAYMENTS_APP) paid.add(pi.id);
    }

    const dbSince = new Date(Date.now() - DB_WINDOW_HOURS * 3600_000).toISOString();
    const recorded = (await client.query(
      "select payment_intent_id as pi, checkout_session_id as ref from payment_records where created_at >= $1::timestamp", [dbSince],
    )).rows;
    // A plan month is recorded under its invoice id; its PaymentIntent has no app tag, so it is checked as an invoice.
    const recordedInvoices = recorded.filter((r) => String(r.ref).startsWith("in_")).map((r) => r.ref as string);
    const recordedIntents = recorded.filter((r) => !String(r.ref).startsWith("in_")).map((r) => r.pi as string);
    const known = new Set((await client.query(
      "select payment_intent_id as pi from payment_records where payment_intent_id = any($1::text[])", [[...paid]],
    )).rows.map((r) => r.pi as string));
    const orphanLots = (await client.query(
      `select g.id as id from credit_grants g
        where g.source = 'pack' and g.created_at >= $1::timestamp
          and not exists (select 1 from payment_records p where p.checkout_session_id = g.external_id)`, [dbSince],
    )).rows.map((r) => r.id as string);

    // A paid invoice of this app's subscription with no payment record (its webhook was missed or refused). An invoice's
    // PaymentIntent is untagged, so `paid` above cannot see it: list the invoices and read the tag off the subscription.
    const recordedRefs = new Set((await client.query(
      "select checkout_session_id as ref from payment_records where checkout_session_id like 'in\\_%'",
    )).rows.map((r) => r.ref as string));
    const unrecordedInvoices: string[] = [];
    for await (const inv of stripe.invoices.list({ created: { gte: since }, status: "paid", limit: 100 })) {
      if (inv.parent?.subscription_details?.metadata?.app === PAYMENTS_APP && !recordedRefs.has(inv.id!)) unrecordedInvoices.push(inv.id!);
    }
    const unrecorded = [...[...paid].filter((id) => !known.has(id)), ...unrecordedInvoices];
    // Records the creation window did not list are asked of Stripe; a transient failure throws (exit 1).
    const unmatched = [...(await unmatchedRecords(stripe, recordedIntents, paid)), ...(await unmatchedInvoices(stripe, recordedInvoices))];
    console.log(`window ${WINDOW_HOURS}h: ${paid.size} paid PaymentIntents of this app in Stripe, ${recordedIntents.length + recordedInvoices.length} payment records`);
    console.log(`A  paid in Stripe, no record: ${unrecorded.length}${unrecorded.length ? `\n   ${unrecorded.join("\n   ")}` : ""}`);
    console.log(`B  record with no paid Stripe PaymentIntent: ${unmatched.length}${unmatched.length ? `\n   ${unmatched.join("\n   ")}` : ""}`);
    console.log(`B  pack lot with no payment record: ${orphanLots.length}${orphanLots.length ? `\n   ${orphanLots.join("\n   ")}` : ""}`);
    return unrecorded.length + unmatched.length + orphanLots.length === 0 ? 0 : 1;
  } finally {
    await client.query("rollback").catch(() => {});
    client.release();
    await pool.end();
  }
}

main().then((code) => process.exit(code), (error) => {
  console.error(`failed: could not finish reading Stripe or the database (${(error as Error).name}); nothing was reported`);
  process.exit(1);
});
