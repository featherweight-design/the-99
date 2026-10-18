import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const fulfil = vi.hoisted(() => vi.fn());
const configured = vi.hoisted(() => ({ value: true }));
vi.mock("../../../lib/payments/fulfil", () => ({ fulfilCheckoutSession: fulfil, paymentsConfigured: () => configured.value }));

const reverse = vi.hoisted(() => vi.fn());
vi.mock("../../../lib/payments/reverse", () => ({ reverseCharge: reverse }));
const invoice = vi.hoisted(() => vi.fn());
const syncSub = vi.hoisted(() => vi.fn());
const planOn = vi.hoisted(() => ({ value: true }));
vi.mock("../../../lib/payments/subscribe", () => ({ fulfilInvoice: invoice, syncSubscription: syncSub, planConfigured: () => planOn.value }));

import { POST } from "./route";

// A made-up secret and key: no payment data and no real credential ever reaches these tests (scope §5.2).
const SECRET = "whsec_test_fixture";
const signer = new Stripe("sk_test_fixture");

function delivery(type: string, opts: { secret?: string; timestamp?: number; signature?: string | null; metadata?: Record<string, string> | null; id?: string; mode?: string } = {}) {
  const metadata = opts.metadata === undefined ? { app: "the-99" } : opts.metadata;
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { id: opts.id ?? "cs_1", object: "checkout.session", metadata, ...(opts.mode ? { mode: opts.mode } : {}) } } });
  const header = opts.signature !== undefined
    ? opts.signature
    : signer.webhooks.generateTestHeaderString({ payload, secret: opts.secret ?? SECRET, timestamp: opts.timestamp });
  const headers = new Headers({ "content-type": "application/json" });
  if (header !== null) headers.set("stripe-signature", header);
  return new Request("http://localhost/api/stripe-webhook", { method: "POST", body: payload, headers }) as never;
}

beforeEach(() => {
  vi.stubEnv("STRIPE_SECRET_KEY", "rk_test_fixture");
  vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
  vi.stubEnv("STRIPE_WEBHOOK_SECRET_PREVIOUS", "");
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
  fulfil.mockReset();
  reverse.mockReset();
  invoice.mockReset();
  syncSub.mockReset();
  configured.value = true;
  planOn.value = true;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/stripe-webhook: fails closed", () => {
  it("answers 503 and runs nothing, for a Session of ours, with no signing secret, no key, or a key of the wrong mode", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(503);
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", SECRET);
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(503);
    vi.stubEnv("STRIPE_SECRET_KEY", "rk_live_fixture");
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(503);
    vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_fixture");
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(503);
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("answers 400 and runs nothing for a missing, forged or stale signature", async () => {
    expect((await POST(delivery("checkout.session.completed", { signature: null }))).status).toBe(400);
    expect((await POST(delivery("checkout.session.completed", { secret: "whsec_someone_else" }))).status).toBe(400);
    const stale = Math.floor(Date.now() / 1000) - 301;
    expect((await POST(delivery("checkout.session.completed", { timestamp: stale }))).status).toBe(400);
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("accepts the previous secret while a roll overlaps", async () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_new_fixture");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_PREVIOUS", SECRET);
    fulfil.mockResolvedValue({ outcome: "grant" });
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(200);
    expect(fulfil).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/stripe-webhook: what a verified event does", () => {
  it("answers 503 to a completed Checkout while a pack's Price is unset, so the payment is retried, not lost", async () => {
    configured.value = false;
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(503);
    expect(fulfil).not.toHaveBeenCalled();
  });

  // The Stripe account is shared with Concert Crawl, whose Sessions reach this endpoint too.
  it("acknowledges another app's Session with 200 and touches nothing, even while our Price is unset", async () => {
    const others: (Record<string, string> | null)[] = [{ app: "concert-crawl" }, {}, null];
    for (const metadata of others) {
      configured.value = true;
      expect((await POST(delivery("checkout.session.completed", { metadata }))).status).toBe(200);
      configured.value = false;
      expect((await POST(delivery("checkout.session.completed", { metadata }))).status).toBe(200);
    }
    // And where this deployment has no usable key at all: a signature needs none.
    for (const key of ["", "rk_live_fixture", "sk_test_fixture"]) {
      vi.stubEnv("STRIPE_SECRET_KEY", key);
      expect((await POST(delivery("checkout.session.completed", { metadata: { app: "concert-crawl" } }))).status).toBe(200);
    }
    expect(fulfil).not.toHaveBeenCalled();
    // One fixed info line each, and nothing louder: a Session of ours that lost its tag still shows.
    expect(vi.mocked(console.info).mock.calls.flat()).toEqual(Array(9).fill("[stripe-webhook] checkout.session.completed: not this app's Session; ignored"));
    expect([console.warn, console.error].flatMap((fn) => vi.mocked(fn).mock.calls)).toEqual([]);
  });

  // A plan's Checkout completes too; the invoice grants. It must not need a pack Price nor be judged as a pack.
  it("answers 200 and ignores a completed plan Checkout of ours, even while no pack Price is set or no key is usable", async () => {
    configured.value = false;
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(delivery("checkout.session.completed", { mode: "subscription" }))).status).toBe(200);
    expect(fulfil).not.toHaveBeenCalled();
    expect(vi.mocked(console.info).mock.calls.flat()).toEqual(["[stripe-webhook] checkout.session.completed: a plan's Checkout; the invoice grants; ignored"]);
    expect(vi.mocked(console.error).mock.calls).toEqual([]);
  });

  it("still judges a pack's payment-mode Session as before", async () => {
    fulfil.mockResolvedValue({ outcome: "grant" });
    expect((await POST(delivery("checkout.session.completed", { mode: "payment" }))).status).toBe(200);
    expect(fulfil).toHaveBeenCalledTimes(1);
    configured.value = false;
    expect((await POST(delivery("checkout.session.completed", { mode: "payment" }))).status).toBe(503);
  });

  it("acknowledges an event type it does not handle, and acts on none", async () => {
    expect((await POST(delivery("customer.created"))).status).toBe(200);
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("hands a completed Checkout's ids to the fulfilment, never the event's copy of the Session", async () => {
    fulfil.mockResolvedValue({ outcome: "grant" });
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(200);
    expect(fulfil).toHaveBeenCalledWith(expect.anything(), "evt_1", "checkout.session.completed", "cs_1");
  });

  it("answers 200 to a refusal and an unattributed payment, which a retry cannot heal", async () => {
    for (const result of [{ outcome: "refuse", reason: "attribution" }, { outcome: "unattributed" }, { outcome: "duplicate" }]) {
      fulfil.mockResolvedValueOnce(result);
      expect((await POST(delivery("checkout.session.completed"))).status).toBe(200);
    }
  });

  it("answers 500 when Stripe or the database fails, so Stripe retries", async () => {
    fulfil.mockRejectedValue(Object.assign(new Error("connection to cus_1 for user_a failed"), { code: "08006" }));
    expect((await POST(delivery("checkout.session.completed"))).status).toBe(500);
  });

  it("logs the type and the outcome in fixed words, never an id or the error's message", async () => {
    fulfil.mockResolvedValueOnce({ outcome: "refuse", reason: "attribution" });
    await POST(delivery("checkout.session.completed"));
    fulfil.mockRejectedValueOnce(Object.assign(new Error("connection to cus_1 for user_a failed"), { code: "08006" }));
    await POST(delivery("checkout.session.completed"));
    const logged = [console.info, console.warn, console.error]
      .flatMap((fn) => vi.mocked(fn).mock.calls.flat()).map(String).join("\n");
    expect(logged).toContain("refused (attribution)");
    expect(logged).toContain("(08006)");
    for (const leak of ["cs_1", "evt_1", "cus_1", "user_a"]) expect(logged).not.toContain(leak);
  });
});

describe("POST /api/stripe-webhook: refunds and disputes", () => {
  const types = ["charge.refunded", "charge.dispute.created", "charge.dispute.closed"];

  it("hands the charge or dispute id to reverseCharge, for each of the three events", async () => {
    reverse.mockResolvedValue({ outcome: "refund" });
    for (const type of types) expect((await POST(delivery(type, { id: "ch_1", metadata: null }))).status).toBe(200);
    expect(reverse.mock.calls.map((c) => [c[2], c[3]])).toEqual(types.map((t) => [t, "ch_1"]));
  });

  it("answers 200 and touches nothing for a charge tagged as another app's, even with no key", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(delivery("charge.refunded", { metadata: { app: "concert-crawl" } }))).status).toBe(200);
    expect(reverse).not.toHaveBeenCalled();
  });

  it("answers 503 with no usable key, for an event that may be ours", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(delivery("charge.dispute.created", { metadata: null }))).status).toBe(503);
    expect(reverse).not.toHaveBeenCalled();
  });

  it("answers 500 for a payment of ours with no record yet, so Stripe redelivers it", async () => {
    reverse.mockResolvedValue({ outcome: "retry" });
    expect((await POST(delivery("charge.refunded"))).status).toBe(500);
  });

  it("answers 200 and logs at error level for an unmatched charge past the retry window", async () => {
    reverse.mockResolvedValueOnce({ outcome: "unmatched" });
    expect((await POST(delivery("charge.refunded"))).status).toBe(200);
    expect(vi.mocked(console.error).mock.calls.flat().join("\n")).toContain("no payment record");
  });

  it("answers 200 for an ignored or duplicate event and 500 when the work fails", async () => {
    for (const outcome of ["ignored", "duplicate", "no_grant", "dispute_won"]) {
      reverse.mockResolvedValueOnce({ outcome });
      expect((await POST(delivery("charge.refunded"))).status).toBe(200);
    }
    reverse.mockRejectedValueOnce(Object.assign(new Error("boom ch_1 user_a"), { code: "40P01" }));
    expect((await POST(delivery("charge.refunded"))).status).toBe(500);
  });

  it("logs a refund, a dispute and a shortfall at error level, in fixed words with no id", async () => {
    reverse.mockResolvedValueOnce({ outcome: "dispute_opened", shortfall: true });
    await POST(delivery("charge.dispute.created", { id: "dp_secret", metadata: null }));
    const errors = vi.mocked(console.error).mock.calls.flat().map(String).join("\n");
    expect(errors).toContain("dispute_opened");
    expect(errors).toContain("shortfall");
    expect(errors).not.toContain("dp_secret");
  });
});

// The monthly plan's three events. An invoice carries its subscription's metadata under parent.subscription_details.
function planDelivery(type: string, app: string | null = "the-99", over: { subscription?: unknown } = {}) {
  const meta = app ? { app } : {};
  const object = type === "invoice.paid"
    ? { id: "in_1", object: "invoice", parent: { subscription_details: { subscription: "subscription" in over ? over.subscription : "sub_1", metadata: meta } } }
    : { id: "sub_1", object: "subscription", metadata: meta };
  const payload = JSON.stringify({ id: "evt_p", object: "event", type, data: { object } });
  const header = signer.webhooks.generateTestHeaderString({ payload, secret: SECRET });
  return new Request("http://localhost/api/stripe-webhook", { method: "POST", body: payload, headers: new Headers({ "stripe-signature": header }) }) as never;
}

describe("POST /api/stripe-webhook: the plan's events", () => {
  it("hands an invoice's and a subscription's ids to their handlers, never the event's copy", async () => {
    invoice.mockResolvedValue({ outcome: "grant" });
    syncSub.mockResolvedValue({ outcome: "applied" });
    expect((await POST(planDelivery("invoice.paid"))).status).toBe(200);
    expect(invoice).toHaveBeenCalledWith(expect.anything(), "evt_p", "invoice.paid", "in_1", "sub_1");
    for (const type of ["customer.subscription.updated", "customer.subscription.deleted"]) {
      expect((await POST(planDelivery(type))).status).toBe(200);
      expect(syncSub).toHaveBeenLastCalledWith(expect.anything(), "evt_p", type, "sub_1");
    }
    expect(fulfil).not.toHaveBeenCalled();
  });

  it("acknowledges another app's objects, and an invoice with no subscription, with 200 and touches nothing, whatever the config", async () => {
    for (const type of ["invoice.paid", "customer.subscription.updated", "customer.subscription.deleted"]) {
      for (const app of ["concert-crawl", null]) {
        planOn.value = false;
        vi.stubEnv("STRIPE_SECRET_KEY", "");
        expect((await POST(planDelivery(type, app))).status).toBe(200);
      }
    }
    expect((await POST(planDelivery("invoice.paid", "the-99", { subscription: null }))).status).toBe(200);
    expect(invoice).not.toHaveBeenCalled();
    expect(syncSub).not.toHaveBeenCalled();
  });

  it("answers 503 for one of ours while the plan's Price is unset or there is no usable key, so it is retried", async () => {
    planOn.value = false;
    expect((await POST(planDelivery("invoice.paid"))).status).toBe(503);
    planOn.value = true;
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect((await POST(planDelivery("customer.subscription.updated"))).status).toBe(503);
    expect(invoice).not.toHaveBeenCalled();
  });

  it("answers 200 to a refusal, an unattributed payment and a duplicate, and 500 when Stripe or the database fails", async () => {
    for (const result of [{ outcome: "refuse", reason: "amount" }, { outcome: "unattributed" }, { outcome: "duplicate" }]) {
      invoice.mockResolvedValueOnce(result);
      expect((await POST(planDelivery("invoice.paid"))).status).toBe(200);
    }
    invoice.mockRejectedValueOnce(Object.assign(new Error("db down for cus_1"), { code: "08006" }));
    expect((await POST(planDelivery("invoice.paid"))).status).toBe(500);
    const logged = [console.info, console.warn, console.error].flatMap((fn) => vi.mocked(fn).mock.calls.flat()).map(String).join("\n");
    for (const leak of ["in_1", "sub_1", "evt_p", "cus_1"]) expect(logged).not.toContain(leak);
  });
});
