// The purchase action (payments K1b): it decides the switch for the READER, refuses a pack id outside the
// closed set and an unverified email, and maps every failure to an outcome, never a throw that leaks.
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  currentUser: vi.fn(),
  stripeClient: vi.fn(),
  createPackCheckout: vi.fn(),
  createPlanCheckout: vi.fn(),
  readReturn: vi.fn(),
  receiptUrlFor: vi.fn(),
  invoiceReceiptUrlFor: vi.fn(),
  purchaseBlocked: vi.fn(),
  setPlanCancelling: vi.fn(),
  openCardPortal: vi.fn(),
}));
vi.mock("../../lib/payments/plan-manage", () => ({ setPlanCancelling: m.setPlanCancelling, openCardPortal: m.openCardPortal }));
vi.mock("../../lib/payments/blocked", () => ({ purchaseBlocked: m.purchaseBlocked }));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("@clerk/nextjs/server", () => ({ currentUser: m.currentUser }));
vi.mock("../../lib/payments/stripe", () => ({ stripeClient: m.stripeClient }));
vi.mock("../../lib/payments/checkout", () => ({ createPackCheckout: m.createPackCheckout, createPlanCheckout: m.createPlanCheckout }));
vi.mock("../../lib/payments/return", () => ({ readReturn: m.readReturn, receiptUrlFor: m.receiptUrlFor, invoiceReceiptUrlFor: m.invoiceReceiptUrlFor }));

import { buyPackAction, buyPlanAction, cancelPlanAction, keepPlanAction, manageCardAction, readReturnAction, receiptAction } from "./actions";

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

describe("buyPlanAction", () => {
  beforeEach(() => m.createPlanCheckout.mockResolvedValue({ ok: true, url: "https://checkout.stripe.com/plan" }));

  it("returns Checkout's URL for a verified reader with the switch on", async () => {
    expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: true, url: "https://checkout.stripe.com/plan" });
    expect(m.createPlanCheckout).toHaveBeenCalledWith({}, { userId: "user_a", email: "a@x.dev", planId: "monthly", actionId: ACTION });
  });

  it("is off when the switch is off or killed, and asks nothing else", async () => {
    for (const env of [{}, { PAYMENTS_ENABLED: "off" }]) {
      m.requestSwitchEnv.mockResolvedValueOnce(env);
      expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason: "off" });
    }
    expect(m.createPlanCheckout).not.toHaveBeenCalled();
  });

  it("refuses an id outside the plan registry (a pack id included) and a malformed press id", async () => {
    expect(await buyPlanAction("pack40", ACTION)).toEqual({ ok: false, reason: "invalid" });
    expect(await buyPlanAction("monthly", "nope")).toEqual({ ok: false, reason: "invalid" });
    expect(m.createPlanCheckout).not.toHaveBeenCalled();
  });

  it("refuses a blocked account before any Stripe call, and fails closed when the block cannot be read", async () => {
    m.purchaseBlocked.mockResolvedValueOnce(true);
    expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason: "blocked" });
    m.purchaseBlocked.mockRejectedValueOnce(new Error("db down"));
    expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason: "failed" });
    expect(m.currentUser).not.toHaveBeenCalled();
    expect(m.createPlanCheckout).not.toHaveBeenCalled();
  });

  it("refuses an unverified email and a deployment with no usable key", async () => {
    m.currentUser.mockResolvedValueOnce({ primaryEmailAddress: { emailAddress: "a@x.dev", verification: { status: "unverified" } } });
    expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason: "unverified" });
    m.stripeClient.mockReturnValueOnce(null);
    expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason: "unconfigured" });
  });

  it("passes through already, throttled and unconfigured, and maps a throw to failed", async () => {
    for (const reason of ["already", "throttled", "unconfigured"]) {
      m.createPlanCheckout.mockResolvedValueOnce({ ok: false, reason });
      expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason });
    }
    vi.spyOn(console, "error").mockImplementation(() => {});
    m.createPlanCheckout.mockRejectedValueOnce(Object.assign(new Error("cus_1 broke"), { type: "StripeAPIError" }));
    expect(await buyPlanAction("monthly", ACTION)).toEqual({ ok: false, reason: "failed" });
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

describe("receiptAction for a plan month", () => {
  it("reads an invoice id through the invoice reader, scoped to the signed-in reader, never the Session reader", async () => {
    m.invoiceReceiptUrlFor.mockResolvedValueOnce("https://invoice.stripe.com/i/1");
    expect(await receiptAction("in_1")).toEqual({ ok: true, url: "https://invoice.stripe.com/i/1" });
    expect(m.invoiceReceiptUrlFor).toHaveBeenCalledWith({}, { invoiceId: "in_1", viewerId: "user_a" });
    expect(m.receiptUrlFor).not.toHaveBeenCalled();
    m.invoiceReceiptUrlFor.mockResolvedValueOnce(null);
    expect(await receiptAction("in_other")).toEqual({ ok: false, reason: "none" });
  });
});

describe("cancelPlanAction / keepPlanAction", () => {
  beforeEach(() => {
    m.setPlanCancelling.mockResolvedValue({ ok: true, changed: true });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  it("sets and clears cancel_at_period_end for the signed-in reader", async () => {
    expect(await cancelPlanAction()).toEqual({ ok: true, unchanged: false });
    expect(m.setPlanCancelling).toHaveBeenLastCalledWith({}, "user_a", true);
    expect(await keepPlanAction()).toEqual({ ok: true, unchanged: false });
    expect(m.setPlanCancelling).toHaveBeenLastCalledWith({}, "user_a", false);
  });
  it("answers unchanged for a repeat", async () => {
    m.setPlanCancelling.mockResolvedValue({ ok: true, changed: false });
    expect(await cancelPlanAction()).toEqual({ ok: true, unchanged: true });
  });
  it("works with the switch off or killed: a plan holder keeps managing the plan (O2, O3)", async () => {
    for (const env of [{}, { PAYMENTS_ENABLED: "off" }]) {
      m.requestSwitchEnv.mockResolvedValue(env);
      m.setPlanCancelling.mockClear();
      expect(await cancelPlanAction()).toEqual({ ok: true, unchanged: false });
      expect(m.setPlanCancelling).toHaveBeenCalledTimes(1);
    }
  });
  it("KEEP is a purchase: off with the switch off or killed, and nothing is written", async () => {
    for (const env of [{}, { PAYMENTS_ENABLED: "off" }]) {
      m.requestSwitchEnv.mockResolvedValue(env);
      expect(await keepPlanAction()).toEqual({ ok: false, reason: "off" });
    }
    expect(m.setPlanCancelling).not.toHaveBeenCalled();
  });
  it("KEEP is blocked while buying is paused, and fails closed when the block cannot be read", async () => {
    m.purchaseBlocked.mockResolvedValueOnce(true);
    expect(await keepPlanAction()).toEqual({ ok: false, reason: "blocked" });
    m.purchaseBlocked.mockRejectedValueOnce(new Error("db"));
    expect(await keepPlanAction()).toEqual({ ok: false, reason: "failed" });
    expect(m.setPlanCancelling).not.toHaveBeenCalled();
  });
  it("CANCEL ignores the switch and the block, and never reads the block", async () => {
    m.requestSwitchEnv.mockResolvedValue({ PAYMENTS_ENABLED: "off" });
    m.purchaseBlocked.mockResolvedValue(true);
    expect(await cancelPlanAction()).toEqual({ ok: true, unchanged: false });
    expect(m.purchaseBlocked).not.toHaveBeenCalled();
  });
  it("is unconfigured without a Stripe client", async () => {
    m.stripeClient.mockReturnValue(null);
    expect(await keepPlanAction()).toEqual({ ok: false, reason: "unconfigured" });
  });
  it("answers not_found for no plan, a foreign subscription or an ended one, without detail", async () => {
    for (const reason of ["not_found", "foreign", "ended"]) {
      m.setPlanCancelling.mockResolvedValueOnce({ ok: false, reason });
      expect(await cancelPlanAction()).toEqual({ ok: false, reason: "not_found" });
    }
  });
  it("answers failed on a throw, leaking nothing", async () => {
    m.setPlanCancelling.mockRejectedValue(new Error("cus_secret sub_123"));
    expect(await cancelPlanAction()).toEqual({ ok: false, reason: "failed" });
  });
});

describe("manageCardAction", () => {
  beforeEach(() => {
    m.openCardPortal.mockResolvedValue({ ok: true, url: "https://billing.stripe.com/p/x" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  it("returns the portal url", async () => {
    expect(await manageCardAction()).toEqual({ ok: true, url: "https://billing.stripe.com/p/x" });
    expect(m.openCardPortal).toHaveBeenCalledWith({}, "user_a");
  });
  it("works with the switch off: a plan holder can still update the card", async () => {
    m.requestSwitchEnv.mockResolvedValue({ PAYMENTS_ENABLED: "off" });
    expect(await manageCardAction()).toEqual({ ok: true, url: "https://billing.stripe.com/p/x" });
  });
  it("passes unconfigured and not_found through, and fails closed on a throw", async () => {
    m.openCardPortal.mockResolvedValueOnce({ ok: false, reason: "unconfigured" });
    expect(await manageCardAction()).toEqual({ ok: false, reason: "unconfigured" });
    m.openCardPortal.mockResolvedValueOnce({ ok: false, reason: "not_found" });
    expect(await manageCardAction()).toEqual({ ok: false, reason: "not_found" });
    m.openCardPortal.mockRejectedValueOnce(new Error("x"));
    expect(await manageCardAction()).toEqual({ ok: false, reason: "failed" });
  });
});
