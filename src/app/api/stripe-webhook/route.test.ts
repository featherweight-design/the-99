import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

const fulfil = vi.hoisted(() => vi.fn());
const configured = vi.hoisted(() => ({ value: true }));
vi.mock("../../../lib/payments/fulfil", () => ({ fulfilCheckoutSession: fulfil, paymentsConfigured: () => configured.value }));

import { POST } from "./route";

// A made-up secret and key: no payment data and no real credential ever reaches these tests (scope §5.2).
const SECRET = "whsec_test_fixture";
const signer = new Stripe("sk_test_fixture");

function delivery(type: string, opts: { secret?: string; timestamp?: number; signature?: string | null } = {}) {
  const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object: { id: "cs_1", object: "checkout.session" } } });
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
  configured.value = true;
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/stripe-webhook: fails closed", () => {
  it("answers 503 and runs nothing with no signing secret, with no key, or with a key of the wrong mode", async () => {
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
