import { describe, expect, it } from "vitest";
import { decideFulfilment, type FetchedSession } from "./fulfil-rule";
import { isPackId, packForPrice, packsConfigured } from "./packs";

const env = { STRIPE_PRICE_PACK_40: "price_pack40" };
const paid: FetchedSession = {
  id: "cs_1", mode: "payment", paymentStatus: "paid", currency: "usd", amountTotal: 531, amountTax: 31,
  lineItems: [{ priceId: "price_pack40", quantity: 1 }], customerId: "cus_1", clientReferenceId: "user_a",
  metadata: { pack: "pack40", user_id: "user_a" }, paymentIntentId: "pi_1", country: "US",
};

describe("packs", () => {
  it("knows its own ids and maps only a configured Price", () => {
    expect(isPackId("pack40")).toBe(true);
    expect(isPackId("toString")).toBe(false);
    expect(packForPrice("price_pack40", env)?.id).toBe("pack40");
    expect(packForPrice("price_pack40", {})).toBeNull();
    expect(packForPrice("price_other", env)).toBeNull();
    expect(packsConfigured(env)).toBe(true);
    expect(packsConfigured({})).toBe(false);
    expect(packsConfigured({ STRIPE_PRICE_PACK_40: "  " })).toBe(false);
  });
});

describe("decideFulfilment", () => {
  it("grants the pack's units to the mapped account when every fact agrees, with tax taken off", () => {
    expect(decideFulfilment(paid, "user_a", env)).toEqual({
      kind: "grant", userId: "user_a", pack: "pack40", units: 40,
      record: { paymentIntentId: "pi_1", checkoutSessionId: "cs_1", amountCents: 531, taxCents: 31, currency: "usd", country: "US" },
    });
  });

  it("refuses each fact that does not agree, naming it", () => {
    const cases: [Partial<FetchedSession>, string][] = [
      [{ mode: "subscription" }, "not_payment_mode"],
      [{ paymentStatus: "unpaid" }, "not_paid"],
      [{ paymentIntentId: null }, "no_payment_intent"],
      [{ lineItems: [] }, "line_items"],
      [{ lineItems: [{ priceId: "price_pack40", quantity: 2 }] }, "line_items"],
      [{ lineItems: [{ priceId: "price_pack40", quantity: 1 }, { priceId: "price_pack40", quantity: 1 }] }, "line_items"],
      [{ lineItems: [{ priceId: "price_other", quantity: 1 }] }, "unknown_price"],
      [{ metadata: { pack: "pack99", user_id: "user_a" } }, "pack_mismatch"],
      [{ currency: "eur" }, "currency"],
      [{ amountTotal: 100, amountTax: 0 }, "amount"],
      [{ amountTotal: null }, "amount"],
      [{ amountTax: -1, amountTotal: 499 }, "amount"],
      [{ customerId: null }, "no_customer"],
    ];
    for (const [over, reason] of cases) expect(decideFulfilment({ ...paid, ...over }, "user_a", env)).toEqual({ kind: "refuse", reason });
  });

  it("refuses, never fixes, a Session naming a different account than its customer maps to", () => {
    expect(decideFulfilment({ ...paid, clientReferenceId: "user_b" }, "user_a", env)).toEqual({ kind: "refuse", reason: "attribution" });
    expect(decideFulfilment({ ...paid, metadata: { pack: "pack40", user_id: "user_b" } }, "user_a", env)).toEqual({ kind: "refuse", reason: "attribution" });
    expect(decideFulfilment(paid, "user_b", env)).toEqual({ kind: "refuse", reason: "attribution" });
  });

  it("keeps a paid Session whose customer maps to no account as unattributed, granting nothing", () => {
    const d = decideFulfilment(paid, null, env);
    expect(d.kind).toBe("unattributed");
  });

  it("checks the sale before the account: an unpaid Session for no account is refused, not recorded", () => {
    expect(decideFulfilment({ ...paid, paymentStatus: "unpaid" }, null, env)).toEqual({ kind: "refuse", reason: "not_paid" });
  });
});
