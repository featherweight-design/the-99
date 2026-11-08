import { describe, expect, it } from "vitest";
import { PACKS, PLANS } from "../payments/packs";
import { landingClaims } from "./claims";

const WELCOME = { units: 15, days: 30 };
const PRICES = { STRIPE_PRICE_PACK_40: "price_pack", STRIPE_PRICE_PLAN_MONTHLY: "price_plan" };
const env = (o: Record<string, string>) => o as unknown as NodeJS.ProcessEnv;
const ALL_ON = env({ PAYMENTS_ENABLED: "true", WELCOME_CREDITS_ENABLED: "true", SUGGESTED_CHANGES_V2_ENABLED: "true", PUBLIC_PAGES_ENABLED: "true" });

describe("landingClaims", () => {
  it("reads the prices and counts from the shipped packs and plan, never typed", () => {
    const c = landingClaims(ALL_ON, WELCOME, PRICES);
    expect(c.buying).toEqual({
      pack: { units: PACKS.pack40.units, priceCents: PACKS.pack40.priceCents },
      plan: { units: PLANS.monthly.units, priceCents: PLANS.monthly.priceCents },
    });
    expect(c.welcome).toEqual(WELCOME);
    expect(c.suggestedTwo).toBe(true);
    expect(c.publicPages).toBe(true);
  });

  it("leaves a promise out when its switch is off", () => {
    const c = landingClaims(env({}), WELCOME, PRICES);
    expect(c).toEqual({ welcome: null, buying: null, suggestedTwo: false, publicPages: false });
  });

  it("offers no prices while a Stripe Price is unset: the pack or the plan is then not on sale", () => {
    expect(landingClaims(ALL_ON, WELCOME, { ...PRICES, STRIPE_PRICE_PLAN_MONTHLY: undefined }).buying).toBeNull();
    expect(landingClaims(ALL_ON, WELCOME, { ...PRICES, STRIPE_PRICE_PACK_40: " " }).buying).toBeNull();
    expect(landingClaims(ALL_ON, WELCOME, {}).buying).toBeNull();
  });

  it("promises welcome credits only with payments on too (the welcome switch needs its parent)", () => {
    expect(landingClaims(env({ WELCOME_CREDITS_ENABLED: "true" }), WELCOME, PRICES).welcome).toBeNull();
    expect(landingClaims(env({ PAYMENTS_ENABLED: "true" }), WELCOME, PRICES).welcome).toBeNull();
  });

  it("the kill value is off for every promise", () => {
    expect(landingClaims(env({ PAYMENTS_ENABLED: "off", WELCOME_CREDITS_ENABLED: "off" }), WELCOME, PRICES)).toMatchObject({ welcome: null, buying: null });
  });
});
