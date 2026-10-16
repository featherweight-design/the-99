import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// The mapping table and the rate counter, played by hand.
// `raceWinner`: another request's mapping, stored between this one's read and its insert.
const state = vi.hoisted(() => ({ mapping: new Map<string, string>(), hits: 0, inserts: 0, raceWinner: null as string | null }));
vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  return {
    db: {
      select: () => ({
        from: () => ({
          where: async (cond: unknown) => {
            void cond;
            const id = state.mapping.get("user_a");
            return id ? [{ id }] : [];
          },
        }),
      }),
      insert: (table: unknown) => ({
        values: (v: { userId: string; stripeCustomerId: string }) => ({
          onConflictDoNothing: async () => {
            expect(table).toBe(schema.stripeCustomers);
            state.inserts += 1;
            if (state.raceWinner) state.mapping.set(v.userId, state.raceWinner);
            if (!state.mapping.has(v.userId)) state.mapping.set(v.userId, v.stripeCustomerId);
          },
        }),
      }),
    },
  };
});
vi.mock("../rate/observe", () => ({ recordHit: vi.fn(async () => ++state.hits) }));

import { createPackCheckout, ensureCustomer } from "./checkout";

const create = vi.fn(async () => ({ id: "cus_new" }));
const update = vi.fn(async (id: string) => ({ id }));
const sessionCreate = vi.fn(async () => ({ url: "https://checkout.stripe.com/c/pay/cs_1" }));
const stripe = { customers: { create, update }, checkout: { sessions: { create: sessionCreate } } } as unknown as Stripe;
const ACTION = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  state.mapping.clear();
  state.hits = 0;
  state.inserts = 0;
  create.mockClear();
  update.mockClear();
  sessionCreate.mockClear();
  state.raceWinner = null;
  vi.stubEnv("STRIPE_PRICE_PACK_40", "price_pack40");
  vi.stubEnv("APP_ORIGIN", "https://the-99.dev");
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
});

describe("ensureCustomer", () => {
  it("returns a stored mapping, giving its Customer the reader's current verified email", async () => {
    state.mapping.set("user_a", "cus_old");
    expect(await ensureCustomer(stripe, "user_a", "new@x.dev")).toBe("cus_old");
    expect(create).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith("cus_old", { email: "new@x.dev" });
  });

  it("leaves a stored Customer's email alone when the reader has none", async () => {
    state.mapping.set("user_a", "cus_old");
    expect(await ensureCustomer(stripe, "user_a", null)).toBe("cus_old");
    expect(update).not.toHaveBeenCalled();
  });

  it("creates one tagged Customer under a per-account idempotency key, and stores the mapping", async () => {
    expect(await ensureCustomer(stripe, "user_a", "a@x.dev")).toBe("cus_new");
    expect(create).toHaveBeenCalledWith(
      { email: "a@x.dev", metadata: { app: "the-99", user_id: "user_a" } },
      { idempotencyKey: "the-99:customer:user_a" },
    );
    expect(state.mapping.get("user_a")).toBe("cus_new");
    expect(update).not.toHaveBeenCalled();
  });

  // A race lost: another request stored its mapping between this one's read and its insert. The stored one
  // is returned, never the one just made, so an account can only ever pay as the customer the webhook maps.
  it("returns the mapping already stored when its insert lost a race", async () => {
    state.raceWinner = "cus_winner";
    expect(await ensureCustomer(stripe, "user_a", null)).toBe("cus_winner");
    expect(state.inserts).toBe(1);
  });
});

describe("createPackCheckout", () => {
  const run = () => createPackCheckout(stripe, { userId: "user_a", email: "a@x.dev", packId: "pack40", actionId: ACTION });

  it("creates the Session under the press's idempotency key and returns its URL", async () => {
    expect(await run()).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_1" });
    const [params, opts] = sessionCreate.mock.calls[0] as unknown as [Stripe.Checkout.SessionCreateParams, Stripe.RequestOptions];
    expect(params.customer).toBe("cus_new");
    expect(params.metadata).toEqual({ app: "the-99", pack: "pack40", user_id: "user_a" });
    expect(opts).toEqual({ idempotencyKey: `the-99:checkout:user_a:${ACTION}` });
  });

  it("refuses the 11th Session in the hour, before Stripe is asked", async () => {
    state.hits = 10;
    expect(await run()).toEqual({ ok: false, reason: "throttled" });
    expect(create).not.toHaveBeenCalled();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("is unconfigured, and counts nothing, without a Price or an origin", async () => {
    vi.stubEnv("STRIPE_PRICE_PACK_40", "");
    expect(await run()).toEqual({ ok: false, reason: "unconfigured" });
    vi.stubEnv("STRIPE_PRICE_PACK_40", "price_pack40");
    vi.stubEnv("APP_ORIGIN", "");
    expect(await run()).toEqual({ ok: false, reason: "unconfigured" });
    expect(state.hits).toBe(0);
    expect(sessionCreate).not.toHaveBeenCalled();
  });
});
