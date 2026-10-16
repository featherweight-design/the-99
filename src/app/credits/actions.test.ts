// The purchase action (payments K1b): it decides the switch for the READER, refuses a pack id outside the
// closed set and an unverified email, and maps every failure to an outcome, never a throw that leaks.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  currentUser: vi.fn(),
  stripeClient: vi.fn(),
  createPackCheckout: vi.fn(),
}));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("../../lib/payments/stripe", () => ({ stripeClient: m.stripeClient }));
vi.mock("../../lib/payments/checkout", () => ({ createPackCheckout: m.createPackCheckout }));

import { buyPackAction } from "./actions";

const ACTION = "11111111-1111-4111-8111-111111111111";
const verified = { primaryEmailAddress: { emailAddress: "a@x.dev", verification: { status: "verified" } } };

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_a");
  m.requestSwitchEnv.mockResolvedValue({ PAYMENTS_ENABLED: "true" });
  m.currentUser.mockResolvedValue(verified);
  m.stripeClient.mockReturnValue({});
  m.createPackCheckout.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/x" });
});

describe("buyPackAction", () => {
  it("returns Checkout's URL for a verified reader with the switch on", async () => {
    expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: true, url: "https://checkout.stripe.com/x" });
    expect(m.createPackCheckout).toHaveBeenCalledWith({}, { userId: "user_a", email: "a@x.dev", packId: "pack40", actionId: ACTION });
  });

  it("is off, and asks nothing else, when the reader's switch is off or killed", async () => {
    for (const env of [{}, { PAYMENTS_ENABLED: "off" }]) {
      m.requestSwitchEnv.mockResolvedValueOnce(env);
      expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: false, reason: "off" });
    }
    expect(m.currentUser).not.toHaveBeenCalled();
    expect(m.createPackCheckout).not.toHaveBeenCalled();
  });

  it("refuses a pack outside the registry and a malformed press id", async () => {
    for (const [pack, id] of [["pack999", ACTION], ["toString", ACTION], [["pack40"], ACTION], ["pack40", "nope"]]) {
      expect(await buyPackAction(pack, id)).toEqual({ ok: false, reason: "invalid" });
    }
    expect(m.createPackCheckout).not.toHaveBeenCalled();
  });

  it("refuses a reader with no verified email", async () => {
    for (const user of [null, {}, { primaryEmailAddress: { emailAddress: "a@x.dev", verification: { status: "unverified" } } }]) {
      m.currentUser.mockResolvedValueOnce(user);
      expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: false, reason: "unverified" });
    }
    expect(m.createPackCheckout).not.toHaveBeenCalled();
  });

  it("is unconfigured without a usable Stripe key", async () => {
    m.stripeClient.mockReturnValue(null);
    expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("answers failed, without the error's message, when Stripe or the database throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.createPackCheckout.mockRejectedValue(Object.assign(new Error("No such customer: cus_secret"), { type: "StripeInvalidRequestError" }));
    expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: false, reason: "failed" });
    expect(log).toHaveBeenCalledWith("[checkout] failed (StripeInvalidRequestError)");
    log.mockRestore();
  });
});
