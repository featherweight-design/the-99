import { describe, expect, it } from "vitest";
import { appOrigin, packCheckoutParams, planCheckoutParams, planPriceIdFor, priceIdFor } from "./checkout-rule";
import { decideFulfilment } from "./fulfil-rule";
import { PAYMENTS_APP } from "./packs";

const input = { userId: "user_a", customerId: "cus_1", packId: "pack40" as const, priceId: "price_pack40", origin: "https://the-99.dev" };

describe("packCheckoutParams", () => {
  const p = packCheckoutParams(input);

  // The Stripe account is shared with Concert Crawl: an untagged Session is ignored by our webhook and never granted.
  it("tags the Session and its PaymentIntent as this app's", () => {
    expect(p.metadata).toEqual({ app: PAYMENTS_APP, pack: "pack40", user_id: "user_a" });
    expect(p.payment_intent_data?.metadata).toEqual(p.metadata);
  });

  it("sets everything server-side: one item of the registry's Price, the customer and the reference", () => {
    expect(p.mode).toBe("payment");
    expect(p.line_items).toEqual([{ price: "price_pack40", quantity: 1 }]);
    expect(p.customer).toBe("cus_1");
    expect(p.client_reference_id).toBe("user_a");
    expect(p.payment_method_types).toEqual(["card"]);
    expect(p.automatic_tax).toEqual({ enabled: true });
  });

  it("returns to the billing page on the configured origin", () => {
    // Stripe's template, literal and unencoded: the page reads the Session by this id.
    expect(p.success_url).toBe("https://the-99.dev/credits?checkout=done&session_id={CHECKOUT_SESSION_ID}");
    expect(p.success_url).not.toContain("%7B");
    expect(p.cancel_url).toBe("https://the-99.dev/credits?checkout=cancelled");
  });

  // The builder and the webhook's rule are two halves of one contract: a Session built here, once paid, grants.
  it("builds a Session the webhook's rule grants once paid", () => {
    const decision = decideFulfilment({
      id: "cs_1", mode: p.mode!, paymentStatus: "paid", currency: "usd", amountTotal: 500, amountTax: 0,
      lineItems: [{ priceId: "price_pack40", quantity: 1 }], customerId: "cus_1",
      clientReferenceId: p.client_reference_id!, metadata: p.metadata as Record<string, string>,
      paymentIntentId: "pi_1", country: "US",
    }, "user_a", { STRIPE_PRICE_PACK_40: "price_pack40" });
    expect(decision.kind).toBe("grant");
  });

  // Stripe Tax adds tax ON TOP of a tax-exclusive Price, and the rule takes it back off. An inclusive Price
  // (total still 500, tax inside it) is refused, which is why the Price must be exclusive.
  it("grants with tax on top of a tax-exclusive Price, and refuses tax taken out of it", () => {
    const paid = (amountTotal: number, amountTax: number) => decideFulfilment({
      id: "cs_1", mode: "payment", paymentStatus: "paid", currency: "usd", amountTotal, amountTax,
      lineItems: [{ priceId: "price_pack40", quantity: 1 }], customerId: "cus_1",
      clientReferenceId: "user_a", metadata: p.metadata as Record<string, string>, paymentIntentId: "pi_1", country: "US",
    }, "user_a", { STRIPE_PRICE_PACK_40: "price_pack40" }).kind;
    expect(paid(540, 40)).toBe("grant");
    expect(paid(500, 40)).toBe("refuse");
  });
});

describe("appOrigin", () => {
  it("takes a bare https origin, with or without its slash", () => {
    expect(appOrigin("https://the-99.dev", "production")).toBe("https://the-99.dev");
    expect(appOrigin("https://staging.the-99.dev/", "staging")).toBe("https://staging.the-99.dev");
  });

  it("refuses unset, malformed, a path, a query, credentials and plain http", () => {
    for (const v of [undefined, "", "the-99.dev", "https://the-99.dev/credits", "https://the-99.dev?x=1",
      "https://a:b@the-99.dev", "http://the-99.dev", "javascript:alert(1)"]) {
      expect(appOrigin(v, "staging")).toBeNull();
    }
  });

  it("allows http://localhost for a local server, never in production", () => {
    expect(appOrigin("http://localhost:3000", undefined)).toBe("http://localhost:3000");
    expect(appOrigin("http://localhost:3000", "production")).toBeNull();
  });
});

describe("priceIdFor", () => {
  it("reads the pack's own variable, and is null while it is unset or blank", () => {
    expect(priceIdFor("pack40", { STRIPE_PRICE_PACK_40: " price_x " })).toBe("price_x");
    expect(priceIdFor("pack40", { STRIPE_PRICE_PACK_40: " " })).toBeNull();
    expect(priceIdFor("pack40", {})).toBeNull();
  });
});

describe("planCheckoutParams", () => {
  const p = planCheckoutParams({ userId: "user_a", customerId: "cus_1", planId: "plan60", priceId: "price_plan60", origin: "https://the-99.dev" });

  it("is a subscription Session of the registry's Price, on the same customer, cards only, with tax", () => {
    expect(p.mode).toBe("subscription");
    expect(p.line_items).toEqual([{ price: "price_plan60", quantity: 1 }]);
    expect(p.customer).toBe("cus_1");
    expect(p.client_reference_id).toBe("user_a");
    expect(p.payment_method_types).toEqual(["card"]);
    expect(p.automatic_tax).toEqual({ enabled: true });
  });

  // An invoice carries a snapshot of the SUBSCRIPTION's metadata, so that is where the tag must be.
  it("tags the Session and the subscription it creates as this app's, naming the plan and the account", () => {
    const tag = { app: PAYMENTS_APP, plan: "plan60", user_id: "user_a" };
    expect(p.metadata).toEqual(tag);
    expect(p.subscription_data?.metadata).toEqual(tag);
  });

  it("returns where the pack's Checkout does", () => {
    expect(p.success_url).toBe("https://the-99.dev/credits?checkout=done&session_id={CHECKOUT_SESSION_ID}");
    expect(p.cancel_url).toBe("https://the-99.dev/credits?checkout=cancelled");
  });

  it("names its Price from STRIPE_PRICE_PLAN_60, or null while unset", () => {
    expect(planPriceIdFor("plan60", { STRIPE_PRICE_PLAN_60: " price_plan60 " })).toBe("price_plan60");
    expect(planPriceIdFor("plan60", {})).toBeNull();
  });
});
