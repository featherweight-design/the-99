import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// The transaction's shape, played by hand: which inserts conflicted, and whether the customer maps.
const state = vi.hoisted(() => ({ seen: false, eventInserted: true, recordInserted: true, lotInserted: true, mapped: "user_a" as string | null, lotInserts: 0 }));
vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  const insert = (table: unknown) => ({
    values: () => ({
      onConflictDoNothing: () => ({
        returning: async () => {
          if (table === schema.stripeEvents) return state.eventInserted ? [{ id: "evt" }] : [];
          if (table === schema.paymentRecords) return state.recordInserted ? [{ id: "pi" }] : [];
          state.lotInserts += 1;
          return state.lotInserted ? [{ id: "lot" }] : [];
        },
      }),
    }),
  });
  const tx = {
    insert,
    select: () => ({ from: () => ({ where: () => ({ for: async () => (state.mapped ? [{ userId: state.mapped }] : []) }) }) }),
  };
  return {
    db: {
      select: () => ({ from: () => ({ where: async () => (state.seen ? [{ id: "evt" }] : []) }) }),
      transaction: async (cb: (t: typeof tx) => unknown) => cb(tx),
    },
  };
});

import { fulfilCheckoutSession } from "./fulfil";

const session = {
  id: "cs_1", mode: "payment", payment_status: "paid", currency: "usd", amount_total: 500,
  total_details: { amount_tax: 0 }, line_items: { data: [{ price: { id: "price_pack40" }, quantity: 1 }] },
  customer: "cus_1", client_reference_id: "user_a", metadata: { pack: "pack40", user_id: "user_a" },
  payment_intent: "pi_1", customer_details: { address: { country: "US" } },
};
const stripe = { checkout: { sessions: { retrieve: vi.fn(async () => session) } } } as unknown as Stripe;
const run = () => fulfilCheckoutSession(stripe, "evt_1", "checkout.session.completed", "cs_1");

function reset(over: Partial<typeof state> = {}) {
  Object.assign(state, { seen: false, eventInserted: true, recordInserted: true, lotInserted: true, mapped: "user_a", lotInserts: 0 }, over);
  vi.stubEnv("STRIPE_PRICE_PACK_40", "price_pack40");
}

describe("fulfilCheckoutSession: what each conflict means", () => {
  it("grants when every insert lands", async () => {
    reset();
    expect((await run()).outcome).toBe("grant");
    expect(state.lotInserts).toBe(1);
  });

  it("asks Stripe nothing for an event already recorded", async () => {
    reset({ seen: true });
    vi.mocked(stripe.checkout.sessions.retrieve).mockClear();
    expect((await run()).outcome).toBe("duplicate");
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
  });

  it("is a duplicate when another delivery recorded the event first", async () => {
    reset({ eventInserted: false });
    expect((await run()).outcome).toBe("duplicate");
    expect(state.lotInserts).toBe(0);
  });

  // A Session first kept unattributed, then seen under a new event once its customer maps: the payment
  // record conflicts, and that alone must stop the grant, or it is refunded by hand AND granted.
  it("never grants a payment already recorded, whatever the mapping now says", async () => {
    reset({ recordInserted: false });
    expect((await run()).outcome).toBe("duplicate");
    expect(state.lotInserts).toBe(0);
  });

  it("reports a lot that already existed as a duplicate, not a grant", async () => {
    reset({ lotInserted: false });
    expect((await run()).outcome).toBe("duplicate");
  });

  it("keeps a payment from a customer with no account unattributed, with no lot", async () => {
    reset({ mapped: null });
    expect((await run()).outcome).toBe("unattributed");
    expect(state.lotInserts).toBe(0);
  });
});
