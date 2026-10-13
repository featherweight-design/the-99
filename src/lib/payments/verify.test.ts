import { describe, expect, it, vi, afterEach } from "vitest";
import type Stripe from "stripe";
import { SIGNATURE_TOLERANCE_S, verifyStripeEvent } from "./verify";

afterEach(() => vi.unstubAllEnvs());

describe("verifyStripeEvent", () => {
  // The route's stale-signature test cannot tell this constant from the SDK's own default, which is
  // also 300s: this pins that the tolerance is OURS and is handed to every verification.
  it("hands its own five-minute tolerance to every verification it tries", () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_new");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_PREVIOUS", "whsec_old");
    const constructEvent = vi.fn(() => { throw new Error("no"); });
    const stripe = { webhooks: { constructEvent } } as unknown as Stripe;
    expect(verifyStripeEvent(stripe, "{}", "t=1,v1=x")).toBe("invalid");
    expect(SIGNATURE_TOLERANCE_S).toBe(300);
    expect(constructEvent.mock.calls.map((c) => (c as unknown[]).slice(2))).toEqual([["whsec_new", 300], ["whsec_old", 300]]);
  });

  it("is unconfigured with no secret, and invalid with no signature", () => {
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET_PREVIOUS", "");
    const stripe = { webhooks: { constructEvent: vi.fn() } } as unknown as Stripe;
    expect(verifyStripeEvent(stripe, "{}", "sig")).toBe("unconfigured");
    vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_new");
    expect(verifyStripeEvent(stripe, "{}", null)).toBe("invalid");
  });
});
