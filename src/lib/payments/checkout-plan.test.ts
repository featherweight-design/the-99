import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

// The plan's Checkout (payments, the subscription PR): the subscriptions table, the mapping and the rate counter, by hand.
const state = vi.hoisted(() => ({ subs: [] as { status: string }[], mapped: "cus_1" as string | null, hits: 0, blocked: false }));
vi.mock("./blocked", () => ({ purchaseBlocked: async () => state.blocked }));
vi.mock("../../db", async () => {
  const schema = await vi.importActual<typeof import("../../db/schema")>("../../db/schema");
  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: async () => (table === schema.subscriptions ? state.subs : state.mapped ? [{ id: state.mapped }] : []),
        }),
      }),
    },
  };
});
vi.mock("../account/tombstone", () => ({ isTombstoned: async () => false }));
vi.mock("../rate/observe", () => ({ recordHit: vi.fn(async () => ++state.hits) }));

import { createPlanCheckout } from "./checkout";

const list = vi.fn(async () => ({ data: [] as { status: string; metadata: Record<string, string> }[] }));
const sessionCreate = vi.fn(async () => ({ url: "https://checkout.stripe.com/c/pay/cs_plan" }));
const stripe = {
  customers: { update: vi.fn(async () => ({})) }, subscriptions: { list }, checkout: { sessions: { create: sessionCreate } },
} as unknown as Stripe;
const ACTION = "11111111-1111-4111-8111-111111111111";
const go = () => createPlanCheckout(stripe, { userId: "user_a", email: "a@x.dev", planId: "plan60", actionId: ACTION });

beforeEach(() => {
  state.subs = []; state.mapped = "cus_1"; state.hits = 0; state.blocked = false;
  list.mockClear(); sessionCreate.mockClear(); list.mockResolvedValue({ data: [] });
  vi.stubEnv("STRIPE_PRICE_PLAN_60", "price_plan60");
  vi.stubEnv("APP_ORIGIN", "https://the-99.dev");
  vi.stubEnv("ADMIN_ENV_LABEL", "staging");
});

describe("createPlanCheckout", () => {
  it("creates a subscription Session under the press's idempotency key", async () => {
    expect(await go()).toEqual({ ok: true, url: "https://checkout.stripe.com/c/pay/cs_plan" });
    const [params, opts] = sessionCreate.mock.calls[0] as unknown as [Stripe.Checkout.SessionCreateParams, { idempotencyKey: string }];
    expect(params.mode).toBe("subscription");
    expect(opts.idempotencyKey).toContain(ACTION);
  });

  it("is blocked for a disputed account, before anything is counted or made", async () => {
    state.blocked = true;
    expect(await go()).toEqual({ ok: false, reason: "blocked" });
    expect(state.hits).toBe(0);
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("is unconfigured while the plan's Price is unset, and makes nothing", async () => {
    vi.stubEnv("STRIPE_PRICE_PLAN_60", "");
    expect(await go()).toEqual({ ok: false, reason: "unconfigured" });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("is throttled past the hourly limit", async () => {
    state.hits = 10;
    expect(await go()).toEqual({ ok: false, reason: "throttled" });
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("refuses a second plan when our table holds a live one, without asking Stripe", async () => {
    for (const status of ["active", "trialing", "past_due", "unpaid", "incomplete"]) {
      state.subs = [{ status }];
      expect(await go()).toEqual({ ok: false, reason: "already" });
    }
    expect(list).not.toHaveBeenCalled();
    expect(sessionCreate).not.toHaveBeenCalled();
  });

  it("allows a resubscribe after an ended one", async () => {
    state.subs = [{ status: "canceled" }];
    expect((await go()).ok).toBe(true);
  });

  it("refuses when Stripe lists a live subscription of ours the webhook has not stored yet, and ignores another app's", async () => {
    list.mockResolvedValueOnce({ data: [{ status: "active", metadata: { app: "concert-crawl" } }] });
    expect((await go()).ok).toBe(true);
    list.mockResolvedValueOnce({ data: [{ status: "active", metadata: { app: "the-99" } }] });
    expect(await go()).toEqual({ ok: false, reason: "already" });
  });
});
