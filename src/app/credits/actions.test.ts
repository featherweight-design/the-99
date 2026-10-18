// The purchase action (payments K1b): it decides the switch for the READER, refuses a pack id outside the
// closed set and an unverified email, and maps every failure to an outcome, never a throw that leaks.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  currentUser: vi.fn(),
  stripeClient: vi.fn(),
  createPackCheckout: vi.fn(),
  readReturn: vi.fn(),
  receiptUrlFor: vi.fn(),
  purchaseBlocked: vi.fn(),
}));
vi.mock("../../lib/payments/blocked", () => ({ purchaseBlocked: m.purchaseBlocked }));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("../../lib/payments/stripe", () => ({ stripeClient: m.stripeClient }));
vi.mock("../../lib/payments/checkout", () => ({ createPackCheckout: m.createPackCheckout }));
vi.mock("../../lib/payments/return", () => ({ readReturn: m.readReturn, receiptUrlFor: m.receiptUrlFor }));

import { buyPackAction, readReturnAction, receiptAction } from "./actions";

const ACTION = "11111111-1111-4111-8111-111111111111";
const verified = { primaryEmailAddress: { emailAddress: "a@x.dev", verification: { status: "verified" } } };

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_a");
  m.requestSwitchEnv.mockResolvedValue({ PAYMENTS_ENABLED: "true" });
  m.currentUser.mockResolvedValue(verified);
  m.stripeClient.mockReturnValue({});
  m.createPackCheckout.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/x" });
  m.purchaseBlocked.mockResolvedValue(false);
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

  it("refuses a blocked account before any Stripe call, and fails closed when the block cannot be read", async () => {
    m.purchaseBlocked.mockResolvedValueOnce(true);
    expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: false, reason: "blocked" });
    m.purchaseBlocked.mockRejectedValueOnce(new Error("db down"));
    expect(await buyPackAction("pack40", ACTION)).toEqual({ ok: false, reason: "failed" });
    expect(m.stripeClient).not.toHaveBeenCalled();
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

describe("readReturnAction", () => {
  it("reads the Session for THIS reader and returns the closed result", async () => {
    m.readReturn.mockResolvedValue({ kind: "added", units: 40 });
    expect(await readReturnAction("cs_1")).toEqual({ ok: true, read: { kind: "added", units: 40 } });
    expect(m.readReturn).toHaveBeenCalledWith({}, { sessionId: "cs_1", viewerId: "user_a" });
  });

  it("still reads with the switch off or killed: stopping sales does not cancel an open Checkout", async () => {
    m.readReturn.mockResolvedValue({ kind: "added", units: 40 });
    for (const env of [{}, { PAYMENTS_ENABLED: "off" }]) {
      m.requestSwitchEnv.mockResolvedValue(env);
      expect(await readReturnAction("cs_1")).toEqual({ ok: true, read: { kind: "added", units: 40 } });
    }
    expect(m.readReturn).toHaveBeenCalledTimes(2);
  });

  it("answers failed, with a fixed log line, when Stripe or the database throws", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.readReturn.mockRejectedValue(Object.assign(new Error("No such session cs_secret"), { type: "StripeConnectionError" }));
    expect(await readReturnAction("cs_1")).toEqual({ ok: false, reason: "failed" });
    expect(log).toHaveBeenCalledWith("[checkout] return read failed (StripeConnectionError)");
    log.mockRestore();
  });

  it("answers failed without a Stripe key", async () => {
    m.stripeClient.mockReturnValue(null);
    expect(await readReturnAction("cs_1")).toEqual({ ok: false, reason: "failed" });
  });
});

describe("receiptAction", () => {
  it("returns the receipt URL for the reader's own Session, and works with the switch off (money already taken)", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.receiptUrlFor.mockResolvedValue("https://pay.stripe.com/receipts/x");
    expect(await receiptAction("cs_1")).toEqual({ ok: true, url: "https://pay.stripe.com/receipts/x" });
    expect(m.receiptUrlFor).toHaveBeenCalledWith({}, { sessionId: "cs_1", viewerId: "user_a" });
  });

  it("answers none for a Session that is not the reader's, and failed when Stripe throws", async () => {
    m.receiptUrlFor.mockResolvedValueOnce(null);
    expect(await receiptAction("cs_other")).toEqual({ ok: false, reason: "none" });
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.receiptUrlFor.mockRejectedValueOnce(new Error("boom"));
    expect(await receiptAction("cs_1")).toEqual({ ok: false, reason: "failed" });
    log.mockRestore();
  });
});
