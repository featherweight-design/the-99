import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { PgDialect } from "drizzle-orm/pg-core";

// This fake proves the rules and the writes, not concurrency or locking: the lock order and the races are what
// `pnpm probe:payments-webhook` proves against a real Postgres.
//
// An in-memory ledger played by hand: the tables the handlers touch, with the conflict rules the real ones have.
type Lot = { subscriptionId?: string; userId: string; source: string; units: number; revokedUnits: number; expiresAt: Date | null; externalId: string; billingReason: string | null };
type Row = { stripeSubscriptionId: string; userId: string; status: string; currentPeriodEnd: Date | null; cancelAtPeriodEnd: boolean };
const paramsOf = (w: unknown): unknown[] => new PgDialect().sqlToQuery(w as never).params;
const db = vi.hoisted(() => ({
  events: new Set<string>(), records: new Map<string, Record<string, unknown>>(), lots: [] as Lot[],
  subs: new Map<string, Row>(), customers: new Map<string, string>(), locks: [] as unknown[], updateWheres: [] as unknown[], now: new Date(),
}));

vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  const live = (l: Lot) => l.revokedUnits < l.units && (l.expiresAt === null || l.expiresAt.getTime() > db.now.getTime());
  const insert = (table: unknown) => ({
    values: (v: Record<string, unknown>) => {
      const run = (): unknown[] => {
        if (table === schema.stripeEvents) { if (db.events.has(v.eventId as string)) return []; db.events.add(v.eventId as string); return [{ id: v.eventId }]; }
        if (table === schema.paymentRecords) { if (db.records.has(v.paymentIntentId as string)) return []; db.records.set(v.paymentIntentId as string, v); return [{ id: v.paymentIntentId }]; }
        if (table === schema.creditGrants) {
          if (db.lots.some((l) => l.externalId === v.externalId)) return [];
          db.lots.push({ revokedUnits: 0, expiresAt: null, billingReason: null, ...v } as Lot);
          return [{ id: "lot" }];
        }
        throw new Error("unexpected insert");
      };
      return {
        onConflictDoNothing: () => ({ returning: async () => run() }),
        onConflictDoUpdate: async ({ set }: { set: Record<string, unknown> }) => {
          const prev = db.subs.get(v.stripeSubscriptionId as string);
          db.subs.set(v.stripeSubscriptionId as string, { ...(prev ?? (v as Row)), ...(prev ? set : {}) } as Row);
        },
      };
    },
  });
  const tx = {
    insert,
    execute: async (q: unknown) => { db.locks.push(paramsOf(q)[0]); },
    select: () => ({
      from: (table: unknown) => ({
        where: (w: unknown) => {
          const ps = paramsOf(w);
          const rows = table === schema.subscriptions ? [...db.subs.values()].filter((r) => ps.includes(r.stripeSubscriptionId) || ps.includes(r.userId)).map((r) => ({ ...r, id: r.stripeSubscriptionId })) : [];
          return Object.assign(Promise.resolve(rows), {
            for: async () => [...db.customers.values()].length === 0 ? [] : [{ userId: [...db.customers.values()][0] }],
          });
        },
      }),
    }),
    update: (table: unknown) => ({
      set: (set: { expiresAt: Date | null }) => ({
        where: async (w: unknown) => {
          expect(table).toBe(schema.creditGrants);
          db.updateWheres.push(w);
          const ps = paramsOf(w);
          for (const l of db.lots) if (l.source === "plan" && ps.includes(l.subscriptionId) && live(l)) l.expiresAt = set.expiresAt;
        },
      }),
    }),
  };
  return {
    db: {
      select: () => ({ from: () => ({ where: async () => [] as unknown[] }) }),
      transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
    },
  };
});

import { creditGrants } from "../../db/schema";
import { fulfilInvoice, syncSubscription } from "./subscribe";

const MONTH1 = new Date("2026-11-01T00:00:00Z");
const MONTH2 = new Date("2026-12-01T00:00:00Z");
const MONTH3 = new Date("2027-01-01T00:00:00Z");
const TAG = { app: "the-99", plan: "plan60", user_id: "user_a" };

type SubState = { status?: string; cancel?: boolean; end?: Date; meta?: Record<string, string>; customer?: string };
const subscription = (s: SubState = {}) => ({
  id: "sub_1", status: s.status ?? "active", customer: s.customer ?? "cus_1", metadata: s.meta ?? TAG,
  cancel_at_period_end: s.cancel ?? false,
  items: { data: [{ current_period_end: Math.floor((s.end ?? MONTH2).getTime() / 1000), price: { id: "price_plan60" } }] },
});
const invoice = (id: string, reason = "subscription_create", over: Record<string, unknown> = {}) => ({
  id, status: "paid", billing_reason: reason, currency: "usd", amount_paid: 500, total: 500, total_excluding_tax: 500,
  customer: "cus_1", customer_address: { country: "US" },
  parent: { subscription_details: { subscription: "sub_1", metadata: TAG } },
  lines: { data: [{ quantity: 1, pricing: { price_details: { price: "price_plan60" } } }] },
  payments: { data: [{ status: "paid", payment: { type: "payment_intent", payment_intent: `pi_${id}` } }] },
  ...over,
});

let invoices: Record<string, unknown>;
let current: ReturnType<typeof subscription>;
const stripe = {
  invoices: { retrieve: vi.fn(async (id: string) => invoices[id]) },
  subscriptions: { retrieve: vi.fn(async () => current) },
} as unknown as Stripe;

let n = 0;
const pay = (id: string, reason?: string, eventId = `evt_${++n}`, at = MONTH1) => fulfilInvoice(stripe, eventId, "invoice.paid", id, "sub_1", at);
const sync = (eventId = `evt_${++n}`, at = MONTH1) => syncSubscription(stripe, eventId, "customer.subscription.updated", "sub_1", at);

beforeEach(() => {
  db.events.clear(); db.records.clear(); db.lots.length = 0; db.subs.clear(); db.customers.clear(); db.locks.length = 0; db.updateWheres.length = 0;
  db.customers.set("cus_1", "user_a");
  db.now = MONTH1;
  invoices = { in_1: invoice("in_1"), in_2: invoice("in_2", "subscription_cycle") };
  current = subscription();
  vi.stubEnv("STRIPE_PRICE_PLAN_60", "price_plan60");
});

describe("invoice.paid", () => {
  it("grants 60 plan credits with the billing reason, stores the subscription and records the payment under the invoice id", async () => {
    expect((await pay("in_1")).outcome).toBe("grant");
    expect(db.lots).toEqual([expect.objectContaining({ userId: "user_a", source: "plan", units: 60, externalId: "in_1", billingReason: "subscription_create", expiresAt: null })]);
    expect(db.subs.get("sub_1")).toMatchObject({ userId: "user_a", status: "active", currentPeriodEnd: MONTH2, cancelAtPeriodEnd: false });
    expect(db.records.get("pi_in_1")).toMatchObject({ checkoutSessionId: "in_1", amountCents: 500, status: "granted" });
    // The subscription's own lock first, then the player's allowance lock before the expiry is written.
    expect(db.locks).toEqual(["plan-subscription:sub_1", "model-allowance:user_a"]);
    expect(db.lots[0].subscriptionId).toBe("sub_1");
  });

  it("logs no second-plan line for a lone subscription's own grants", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await pay("in_1");
    await pay("in_2");
    expect(err).not.toHaveBeenCalled();
    err.mockRestore();
  });

  it("grants a second lot for a renewal, labelled subscription_cycle", async () => {
    await pay("in_1");
    expect((await pay("in_2")).outcome).toBe("grant");
    expect(db.lots.map((l) => l.billingReason)).toEqual(["subscription_create", "subscription_cycle"]);
  });

  it("grants once when the same invoice is delivered again, under the same event or another", async () => {
    await pay("in_1", undefined, "evt_a");
    expect((await pay("in_1", undefined, "evt_a")).outcome).toBe("duplicate");
    expect((await pay("in_1", undefined, "evt_b")).outcome).toBe("duplicate");
    expect(db.lots).toHaveLength(1);
  });

  it("grants once when two deliveries of one event run at the same time", async () => {
    const [a, b] = await Promise.all([pay("in_1", undefined, "evt_same"), pay("in_1", undefined, "evt_same")]);
    expect([a.outcome, b.outcome].sort()).toEqual(["duplicate", "grant"]);
    expect(db.lots).toHaveLength(1);
  });

  it("clears the expiry of every live plan lot (a resubscribe or a keep before the renewal)", async () => {
    db.lots.push({ userId: "user_a", source: "plan", units: 60, revokedUnits: 0, expiresAt: MONTH2, externalId: "in_old", billingReason: null, subscriptionId: "sub_1" });
    await pay("in_1");
    expect(db.lots.map((l) => l.expiresAt)).toEqual([null, null]);
  });

  it("gives the new lot the period end when the subscription is already cancelling", async () => {
    current = subscription({ cancel: true });
    await pay("in_1");
    expect(db.lots[0].expiresAt).toEqual(MONTH2);
  });

  it("keeps a payment from a customer with no account unattributed, with no lot and no subscription row", async () => {
    db.customers.clear();
    expect((await pay("in_1")).outcome).toBe("unattributed");
    expect(db.records.get("pi_in_1")).toMatchObject({ status: "unattributed", checkoutSessionId: "in_1" });
    expect(db.lots).toEqual([]);
    expect(db.subs.size).toBe(0);
  });

  it("refuses an amount that is not the plan's, recording nothing but the event", async () => {
    invoices.in_1 = invoice("in_1", "subscription_create", { total_excluding_tax: 400 });
    expect(await pay("in_1")).toEqual({ outcome: "refuse", reason: "amount" });
    expect(db.lots).toEqual([]);
    expect(db.records.size).toBe(0);
  });

  it("refuses another app's subscription even if its event slipped past the route", async () => {
    current = subscription({ meta: { app: "concert-crawl" } });
    expect(await pay("in_1")).toEqual({ outcome: "refuse", reason: "not_ours" });
    expect(db.lots).toEqual([]);
  });

  it("throws when Stripe cannot be reached, leaving no event recorded so Stripe retries", async () => {
    vi.mocked(stripe.invoices.retrieve).mockRejectedValueOnce(new Error("network"));
    await expect(pay("in_1", undefined, "evt_x")).rejects.toThrow();
  });
});

describe("customer.subscription.updated and .deleted", () => {
  beforeEach(async () => { await pay("in_1"); });

  it("cancel at period end sets every live plan lot to the period end", async () => {
    await pay("in_2");
    current = subscription({ cancel: true });
    expect((await sync()).outcome).toBe("applied");
    expect(db.lots.map((l) => l.expiresAt)).toEqual([MONTH2, MONTH2]);
    expect(db.subs.get("sub_1")).toMatchObject({ cancelAtPeriodEnd: true });
  });

  it("keeping the plan clears it again", async () => {
    current = subscription({ cancel: true });
    await sync();
    current = subscription({ cancel: false });
    await sync();
    expect(db.lots.map((l) => l.expiresAt)).toEqual([null]);
    expect(db.subs.get("sub_1")).toMatchObject({ cancelAtPeriodEnd: false });
  });

  it("a deleted subscription ends the row and expires live lots at the period end when it is ahead", async () => {
    current = subscription({ status: "canceled", end: MONTH2 });
    await syncSubscription(stripe, "evt_del", "customer.subscription.deleted", "sub_1", MONTH1);
    expect(db.subs.get("sub_1")).toMatchObject({ status: "canceled" });
    expect(db.lots[0].expiresAt).toEqual(MONTH2);
  });

  it("a deleted subscription whose period is over expires lots now", async () => {
    current = subscription({ status: "canceled", end: MONTH1 });
    const now = new Date("2026-11-15T00:00:00Z");
    db.now = now;
    await syncSubscription(stripe, "evt_del", "customer.subscription.deleted", "sub_1", now);
    expect(db.lots[0].expiresAt).toEqual(now);
  });

  it("does not revive a lot that already expired", async () => {
    db.lots[0].expiresAt = new Date("2026-10-01T00:00:00Z");
    current = subscription({ cancel: false });
    await sync();
    expect(db.lots[0].expiresAt).toEqual(new Date("2026-10-01T00:00:00Z"));
  });

  it("converges when a deleted arrives before an older update: the ended row is never lowered", async () => {
    current = subscription({ status: "canceled", end: MONTH2 });
    await sync("evt_deleted");
    current = subscription({ status: "active", end: MONTH1 }); // a stale retrieval, should one ever be served
    await sync("evt_old_update");
    expect(db.subs.get("sub_1")).toMatchObject({ status: "canceled" });
    expect(db.lots[0].expiresAt).toEqual(MONTH2);
  });

  it("does not move a period end backwards", async () => {
    current = subscription({ end: MONTH3 });
    await sync();
    current = subscription({ end: MONTH2, cancel: true });
    await sync();
    expect(db.subs.get("sub_1")).toMatchObject({ currentPeriodEnd: MONTH3, cancelAtPeriodEnd: false });
  });

  it("stores the state when an update arrives before the invoice, and the invoice then grants onto it", async () => {
    db.events.clear(); db.records.clear(); db.lots.length = 0; db.subs.clear();
    current = subscription({ cancel: false });
    expect((await sync()).outcome).toBe("applied");
    expect(db.subs.get("sub_1")).toBeDefined();
    expect((await pay("in_1")).outcome).toBe("grant");
    expect(db.lots).toHaveLength(1);
  });

  it("ignores another app's subscription and one whose customer has no account", async () => {
    current = subscription({ meta: { app: "concert-crawl" } });
    expect((await sync()).outcome).toBe("refuse");
    current = subscription();
    db.customers.clear();
    expect((await sync()).outcome).toBe("ignored");
  });

  it("answers a replayed event as a duplicate", async () => {
    await sync("evt_r");
    expect((await sync("evt_r")).outcome).toBe("duplicate");
  });

  it("limits the expiry write to the account's live plan lots", async () => {
    current = subscription({ cancel: true });
    await sync();
    const rendered = new PgDialect().sqlToQuery(db.updateWheres.at(-1) as never);
    expect(rendered.sql).toContain('"credit_grants"."user_id" = $1');
    expect(rendered.sql).toContain('"credit_grants"."source" = $2');
    expect(rendered.sql).toContain('"credit_grants"."subscription_id" = $3');
    expect(rendered.sql).toContain('"credit_grants"."revoked_units" < "credit_grants"."units"');
    expect(rendered.sql).toContain('"credit_grants"."expires_at" is null');
    expect(rendered.params.slice(0, 3)).toEqual(["user_a", "plan", "sub_1"]);
    expect(creditGrants.expiresAt.name).toBe("expires_at");
  });
});

describe("a late event never gives out permanent credits, nor reaches another subscription's lots", () => {
  it("expires the lot of a late invoice for an ENDED subscription at the ended period end", async () => {
    invoices.in_late = invoice("in_late");
    current = subscription({ status: "canceled", end: MONTH2 });
    await sync("evt_deleted");
    expect((await pay("in_late")).outcome).toBe("grant");
    expect(db.lots.map((l) => l.expiresAt)).toEqual([MONTH2]);
    expect(db.subs.get("sub_1")).toMatchObject({ status: "canceled" });
  });

  it("expires it now when the ended period is already over", async () => {
    invoices.in_late = invoice("in_late");
    current = subscription({ status: "canceled", end: new Date("2026-10-01T00:00:00Z") });
    await sync("evt_deleted");
    await pay("in_late");
    expect(db.lots.map((l) => l.expiresAt)).toEqual([MONTH1]);
  });

  it("leaves a newer subscription's lot alone when a late event of the old one arrives", async () => {
    const sub2 = (over: SubState = {}) => ({ ...subscription(over), id: "sub_2" });
    invoices.in_s1 = invoice("in_s1");
    invoices.in_s2 = invoice("in_s2", "subscription_create", { parent: { subscription_details: { subscription: "sub_2", metadata: TAG } } });
    await pay("in_s1");
    current = subscription({ cancel: true });
    await sync("evt_cancel");
    current = subscription({ status: "canceled", end: MONTH2 });
    await sync("evt_deleted_1");
    // The resubscribe: a new subscription, a new invoice, a lot that does not expire.
    current = sub2();
    await fulfilInvoice({ invoices: stripe.invoices, subscriptions: { retrieve: async () => current } } as unknown as Stripe, "evt_s2", "invoice.paid", "in_s2", "sub_2", MONTH1);
    expect(db.lots.map((l) => [l.subscriptionId, l.expiresAt])).toEqual([["sub_1", MONTH2], ["sub_2", null]]);
    // A late update of the first one, retrieved as it now stands.
    current = subscription({ status: "canceled", end: MONTH2 });
    await sync("evt_late_s1");
    expect(db.lots.find((l) => l.subscriptionId === "sub_2")?.expiresAt).toBeNull();
  });

  it("logs one fixed line, and still grants, when the account already holds another live subscription", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    db.subs.set("sub_other", { stripeSubscriptionId: "sub_other", userId: "user_a", status: "active", currentPeriodEnd: MONTH2, cancelAtPeriodEnd: false });
    expect((await pay("in_1")).outcome).toBe("grant");
    expect(err.mock.calls.flat()).toEqual(["[payments] second live plan subscription for an account; cancel one by hand"]);
    // A replay logs nothing more, and an ended other subscription is no second plan.
    await pay("in_1", undefined, "evt_again");
    expect(err).toHaveBeenCalledTimes(1);
    db.subs.get("sub_other")!.status = "canceled";
    await pay("in_2");
    expect(err).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });
});
