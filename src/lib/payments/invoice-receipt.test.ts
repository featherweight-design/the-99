// A plan month's Receipt (E8): the invoice's hosted page, found through the viewer's OWN plan lot, never stored.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const state = vi.hoisted(() => ({ lots: new Map<string, { userId: string; source: string }>() }));
vi.mock("../../db", async () => {
  const { PgDialect } = await import("drizzle-orm/pg-core");
  return {
    db: {
      select: () => ({
        from: () => ({
          where: async (w: unknown) => {
            const q = new PgDialect().sqlToQuery(w as never);
            const lot = state.lots.get(q.params[0] as string);
            return lot && lot.userId === q.params[1] && lot.source === q.params[2] ? [{ id: "g1" }] : [];
          },
        }),
      }),
    },
  };
});

import { invoiceReceiptUrlFor, receiptUrlFor } from "./return";

const stripeWith = (invoice: unknown, session?: unknown) => ({
  invoices: { retrieve: vi.fn(async () => invoice) },
  checkout: { sessions: { retrieve: vi.fn(async () => session) } },
}) as unknown as Stripe & { invoices: { retrieve: ReturnType<typeof vi.fn> } };

beforeEach(() => state.lots.clear());

describe("invoiceReceiptUrlFor", () => {
  it("returns the hosted invoice URL for the viewer's own plan lot", async () => {
    state.lots.set("in_1", { userId: "user_a", source: "plan" });
    const stripe = stripeWith({ hosted_invoice_url: "https://invoice.stripe.com/i/1" });
    expect(await invoiceReceiptUrlFor(stripe, { invoiceId: "in_1", viewerId: "user_a" })).toBe("https://invoice.stripe.com/i/1");
  });

  it("asks Stripe nothing for an invoice that is not one of the viewer's own lots, or is malformed", async () => {
    state.lots.set("in_1", { userId: "user_b", source: "plan" });
    const stripe = stripeWith({ hosted_invoice_url: "https://invoice.stripe.com/i/1" });
    expect(await invoiceReceiptUrlFor(stripe, { invoiceId: "in_1", viewerId: "user_a" })).toBeNull();
    expect(await invoiceReceiptUrlFor(stripe, { invoiceId: "cs_1", viewerId: "user_a" })).toBeNull();
    expect(await invoiceReceiptUrlFor(stripe, { invoiceId: "in_1", viewerId: "" })).toBeNull();
    expect(stripe.invoices.retrieve).not.toHaveBeenCalled();
  });

  it("refuses a URL that is not https", async () => {
    state.lots.set("in_1", { userId: "user_a", source: "plan" });
    expect(await invoiceReceiptUrlFor(stripeWith({ hosted_invoice_url: "http://x" }), { invoiceId: "in_1", viewerId: "user_a" })).toBeNull();
    expect(await invoiceReceiptUrlFor(stripeWith({ hosted_invoice_url: null }), { invoiceId: "in_1", viewerId: "user_a" })).toBeNull();
  });
});

describe("receiptUrlFor for a plan's Checkout Session", () => {
  const session = (viewer: string) => ({ mode: "subscription", invoice: "in_1", metadata: { app: "the-99", plan: "plan50", user_id: viewer } });
  it("falls to the Session's first invoice, since a subscription has no PaymentIntent of its own", async () => {
    const stripe = stripeWith({ hosted_invoice_url: "https://invoice.stripe.com/i/1" }, session("user_a"));
    expect(await receiptUrlFor(stripe, { sessionId: "cs_test_1", viewerId: "user_a" })).toBe("https://invoice.stripe.com/i/1");
  });
  it("still refuses another reader's Session", async () => {
    const stripe = stripeWith({ hosted_invoice_url: "https://invoice.stripe.com/i/1" }, session("user_b"));
    expect(await receiptUrlFor(stripe, { sessionId: "cs_test_1", viewerId: "user_a" })).toBeNull();
    expect(stripe.invoices.retrieve).not.toHaveBeenCalled();
  });
});
