import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { unmatchedInvoices, unmatchedRecords } from "./reconcile";

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

describe("unmatchedInvoices", () => {
  const stripeWith = (retrieve: (id: string) => unknown) => ({ invoices: { retrieve: vi.fn(async (id: string) => retrieve(id)) } }) as never;
  const inv = (status: string, app?: string) => ({ status, parent: { subscription_details: { metadata: app ? { app } : {} } } });
  it("matches a paid invoice of this app's subscription", async () => {
    expect(await unmatchedInvoices(stripeWith(() => inv("paid", "the-99")), ["in_1"])).toEqual([]);
  });
  it("reports an unpaid, untagged or foreign invoice", async () => {
    expect(await unmatchedInvoices(stripeWith((id) => (id === "in_a" ? inv("open", "the-99") : id === "in_b" ? inv("paid") : inv("paid", "concert-crawl"))), ["in_a", "in_b", "in_c"])).toEqual(["in_a", "in_b", "in_c"]);
  });
  it("reports a missing invoice and lets any other failure propagate", async () => {
    expect(await unmatchedInvoices(stripeWith(() => { throw Object.assign(new Error("x"), { code: "resource_missing" }); }), ["in_1"])).toEqual(["in_1"]);
    await expect(unmatchedInvoices(stripeWith(() => { throw new Error("timeout"); }), ["in_1"])).rejects.toThrow("timeout");
  });
});
