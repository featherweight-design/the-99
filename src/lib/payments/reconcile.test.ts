import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { unmatchedRecords } from "./reconcile";

const stripeWith = (retrieve: (id: string) => Promise<unknown>) => ({ paymentIntents: { retrieve: vi.fn(retrieve) } }) as unknown as Stripe;

describe("unmatchedRecords", () => {
  it("does not ask about an id the window listed", async () => {
    const s = stripeWith(async () => { throw new Error("must not be called"); });
    expect(await unmatchedRecords(s, ["pi_1"], new Set(["pi_1"]))).toEqual([]);
  });
  it("counts an older, paid intent of ours as matched", async () => {
    const s = stripeWith(async (id) => ({ id, status: "succeeded", metadata: { app: "the-99" } }));
    expect(await unmatchedRecords(s, ["pi_old"], new Set())).toEqual([]);
  });
  it("reports an unpaid, foreign or nonexistent intent as unmatched", async () => {
    const s = stripeWith(async (id) => {
      if (id === "pi_gone") throw Object.assign(new Error("no such"), { code: "resource_missing" });
      return { id, status: id === "pi_unpaid" ? "requires_payment_method" : "succeeded", metadata: { app: id === "pi_foreign" ? "other" : "the-99" } };
    });
    expect(await unmatchedRecords(s, ["pi_unpaid", "pi_foreign", "pi_gone"], new Set())).toEqual(["pi_unpaid", "pi_foreign", "pi_gone"]);
  });
  it("lets a transient Stripe failure propagate, never reporting it as missing", async () => {
    const s = stripeWith(async () => { throw Object.assign(new Error("timeout"), { type: "StripeConnectionError" }); });
    await expect(unmatchedRecords(s, ["pi_1"], new Set())).rejects.toThrow("timeout");
  });
});
