import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";

const state = vi.hoisted(() => ({
  subs: [] as { id: string; status: string }[],
  customer: null as string | null,
}));
vi.mock("../../db", () => ({
  db: {
    select: (cols: Record<string, unknown>) => ({
      from: () => ({
        where: () => {
          const rows = "status" in cols ? state.subs : state.customer ? [{ id: state.customer }] : [];
          return Object.assign(Promise.resolve(rows), { orderBy: async () => rows });
        },
      }),
    }),
  },
}));

import { openCardPortal, setPlanCancelling } from "./plan-manage";

const subRetrieve = vi.fn();
const subUpdate = vi.fn();
const custRetrieve = vi.fn();
const portalCreate = vi.fn();
const fake = {
  subscriptions: { retrieve: subRetrieve, update: subUpdate },
  customers: { retrieve: custRetrieve },
  billingPortal: { sessions: { create: portalCreate } },
} as unknown as Stripe;
const mine = { app: "the-99", user_id: "user_a" };
const live = (o: object = {}) => ({ id: "sub_1", status: "active", metadata: mine, cancel_at_period_end: false, ...o });

beforeEach(() => {
  state.subs = [{ id: "sub_1", status: "active" }];
  state.customer = "cus_1";
  subRetrieve.mockReset().mockResolvedValue(live());
  subUpdate.mockReset().mockResolvedValue({});
  custRetrieve.mockReset().mockResolvedValue({ id: "cus_1", metadata: mine });
  portalCreate.mockReset().mockResolvedValue({ url: "https://billing.stripe.com/p/x" });
  vi.stubEnv("STRIPE_PORTAL_CONFIG", "bpc_123");
  vi.stubEnv("APP_ORIGIN", "https://the-99.dev");
});
afterEach(() => vi.unstubAllEnvs());

describe("setPlanCancelling", () => {
  it("re-reads Stripe and sets cancel_at_period_end, then keeps it off again", async () => {
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: true, changed: true });
    expect(subRetrieve).toHaveBeenCalledWith("sub_1");
    expect(subUpdate).toHaveBeenCalledWith("sub_1", { cancel_at_period_end: true });
    subRetrieve.mockResolvedValue(live({ cancel_at_period_end: true }));
    expect(await setPlanCancelling(fake, "user_a", false)).toEqual({ ok: true, changed: true });
    expect(subUpdate).toHaveBeenLastCalledWith("sub_1", { cancel_at_period_end: false });
  });
  it("is idempotent: already in that state writes nothing", async () => {
    expect(await setPlanCancelling(fake, "user_a", false)).toEqual({ ok: true, changed: false });
    subRetrieve.mockResolvedValue(live({ cancel_at_period_end: true }));
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: true, changed: false });
    expect(subUpdate).not.toHaveBeenCalled();
  });
  it("refuses a subscription whose Stripe metadata names another account, and never updates", async () => {
    subRetrieve.mockResolvedValue(live({ metadata: { app: "the-99", user_id: "user_b" } }));
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: false, reason: "foreign" });
    expect(subUpdate).not.toHaveBeenCalled();
  });
  it("refuses another app's subscription, and never updates", async () => {
    subRetrieve.mockResolvedValue(live({ metadata: { app: "concert-crawl", user_id: "user_a" } }));
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: false, reason: "foreign" });
    expect(subUpdate).not.toHaveBeenCalled();
  });
  it("trusts Stripe's status over our row: a row that holds a plan but a canceled subscription is refused", async () => {
    subRetrieve.mockResolvedValue(live({ status: "canceled" }));
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: false, reason: "ended" });
    expect(subUpdate).not.toHaveBeenCalled();
  });
  it("is not_found with no row that holds a plan, and asks Stripe nothing", async () => {
    state.subs = [{ id: "sub_0", status: "canceled" }];
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: false, reason: "not_found" });
    state.subs = [];
    expect(await setPlanCancelling(fake, "user_a", true)).toEqual({ ok: false, reason: "not_found" });
    expect(subRetrieve).not.toHaveBeenCalled();
  });
  it("throws on a Stripe failure, for the action to answer failed", async () => {
    subRetrieve.mockRejectedValue(new Error("boom"));
    await expect(setPlanCancelling(fake, "user_a", true)).rejects.toThrow();
    subRetrieve.mockResolvedValue(live());
    subUpdate.mockRejectedValue(new Error("boom"));
    await expect(setPlanCancelling(fake, "user_a", true)).rejects.toThrow();
  });
});

describe("openCardPortal", () => {
  it("makes a Session on The 99's own configuration, returning to /credits", async () => {
    expect(await openCardPortal(fake, "user_a")).toEqual({ ok: true, url: "https://billing.stripe.com/p/x" });
    expect(portalCreate).toHaveBeenCalledWith({ customer: "cus_1", configuration: "bpc_123", return_url: "https://the-99.dev/credits" });
  });
  it("is unconfigured, and never falls back to the default configuration, without a usable id or origin", async () => {
    for (const v of [undefined, "", "not_an_id"]) {
      vi.stubEnv("STRIPE_PORTAL_CONFIG", v as string);
      expect(await openCardPortal(fake, "user_a")).toEqual({ ok: false, reason: "unconfigured" });
    }
    vi.stubEnv("STRIPE_PORTAL_CONFIG", "bpc_123");
    vi.stubEnv("APP_ORIGIN", "");
    expect(await openCardPortal(fake, "user_a")).toEqual({ ok: false, reason: "unconfigured" });
    expect(portalCreate).not.toHaveBeenCalled();
  });
  it("is not_found with no mapped Customer, a deleted one, or one not tagged for the reader", async () => {
    state.customer = null;
    expect(await openCardPortal(fake, "user_a")).toEqual({ ok: false, reason: "not_found" });
    state.customer = "cus_1";
    custRetrieve.mockResolvedValue({ id: "cus_1", deleted: true });
    expect(await openCardPortal(fake, "user_a")).toEqual({ ok: false, reason: "not_found" });
    custRetrieve.mockResolvedValue({ id: "cus_1", metadata: { app: "the-99", user_id: "user_b" } });
    expect(await openCardPortal(fake, "user_a")).toEqual({ ok: false, reason: "not_found" });
    expect(portalCreate).not.toHaveBeenCalled();
  });
});
