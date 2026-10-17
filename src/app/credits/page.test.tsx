// /credits: `notFound()` for a reader with the switch off, nothing held and nothing ever bought; the reduced page
// (no offers) for one who holds or has bought; the Checkout return read server-side for the reader's own Session
// only; a failed read drawn as P7, never thrown.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

const m = vi.hoisted(() => ({
  requireUserId: vi.fn(),
  requestSwitchEnv: vi.fn(),
  readAllowance: vi.fn(),
  listCreditHistory: vi.fn(),
  readReturn: vi.fn(),
  stripeClient: vi.fn(),
}));
class NotFound extends Error {}
vi.mock("next/navigation", () => ({ notFound: () => { throw new NotFound("not found"); }, useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../../lib/auth", () => ({ requireUserId: m.requireUserId }));
vi.mock("../../lib/switches/request", () => ({ requestSwitchEnv: m.requestSwitchEnv }));
vi.mock("../../lib/model/allowance", () => ({ readAllowance: m.readAllowance }));
vi.mock("../../lib/payments/stripe", () => ({ stripeClient: m.stripeClient }));
vi.mock("../../lib/payments/return", () => ({ listCreditHistory: m.listCreditHistory, readReturn: m.readReturn }));

const { default: CreditsPage } = await import("./page");
const { CreditsView } = await import("../../components/credits/credits-view");
const { CreditsReadFailed } = await import("../../components/credits/read-failed");

const grant = { id: "g1", source: "pack", units: 40, revokedUnits: 0, createdAt: new Date("2026-10-02T12:00:00Z"), externalId: "cs_test_1" };
const render = (params: Record<string, string> = {}) => CreditsPage({ searchParams: Promise.resolve(params) }) as Promise<ReactElement<Record<string, unknown>>>;

beforeEach(() => {
  vi.resetAllMocks();
  m.requireUserId.mockResolvedValue("user_a");
  m.requestSwitchEnv.mockResolvedValue({ PAYMENTS_ENABLED: "true" });
  m.readAllowance.mockResolvedValue({ used: 2, limit: 5, reopensAt: null, nextAt: null });
  m.listCreditHistory.mockResolvedValue([]);
  m.stripeClient.mockReturnValue({});
});

describe("visibility (E3)", () => {
  it("is not found with the switch off, nothing held and nothing ever bought", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    await expect(render()).rejects.toBeInstanceOf(NotFound);
    m.requestSwitchEnv.mockResolvedValue({ PAYMENTS_ENABLED: "off" });
    await expect(render()).rejects.toBeInstanceOf(NotFound);
  });

  it("keeps the page, without offers, for a reader holding credits with the switch off (O4)", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.readAllowance.mockResolvedValue({ used: 0, limit: 5, reopensAt: null, nextAt: null, pack: 12 });
    const el = await render();
    expect(el.type).toBe(CreditsView);
    expect((el.props.model as { offers: unknown }).offers).toBeNull();
  });

  it("keeps the page, without offers, for a reader who once bought and holds nothing now", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.listCreditHistory.mockResolvedValue([grant]);
    const el = await render();
    expect((el.props.model as { offers: unknown }).offers).toBeNull();
  });

  it("draws the offers with the switch on", async () => {
    const el = await render();
    expect((el.props.model as { offers: { id: string }[] }).offers?.map((o) => o.id)).toEqual(["pack40"]);
  });

  it("draws P7, never throws, when a read fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    m.listCreditHistory.mockRejectedValue(new Error("db down"));
    expect((await render()).type).toBe(CreditsReadFailed);
    log.mockRestore();
  });
});

describe("the return", () => {
  const SESSION = "cs_test_abc";

  it("reads the reader's own Session and starts the band from it", async () => {
    m.readReturn.mockResolvedValue({ kind: "processing", units: 40 });
    const el = await render({ checkout: "done", session_id: SESSION });
    expect(m.readReturn).toHaveBeenCalledWith({}, { sessionId: SESSION, viewerId: "user_a" });
    expect(el.props.ret).toEqual({ kind: "done", sessionId: SESSION, initial: { kind: "processing", units: 40 } });
  });

  it("draws no band for a Session that read as none (a forged id of another reader's)", async () => {
    m.readReturn.mockResolvedValue({ kind: "none" });
    expect((await render({ checkout: "done", session_id: SESSION })).props.ret).toBeNull();
  });

  it("reads nothing for a malformed id or a missing id", async () => {
    expect((await render({ checkout: "done", session_id: "../x" })).props.ret).toBeNull();
    expect((await render({ checkout: "done" })).props.ret).toBeNull();
    expect(m.readReturn).not.toHaveBeenCalled();
  });

  it("reads the return, and draws the band, with the switch off: stopping sales does not cancel an open Checkout", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.listCreditHistory.mockResolvedValue([grant]);
    m.readReturn.mockResolvedValue({ kind: "processing", units: 40 });
    const el = await render({ checkout: "done", session_id: SESSION });
    expect(el.props.ret).toEqual({ kind: "done", sessionId: SESSION, initial: { kind: "processing", units: 40 } });
    expect((el.props.model as { offers: unknown }).offers).toBeNull();
  });

  it("keeps the page, reduced, for a first-time buyer whose switch turned off mid-purchase (not a 404)", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.readReturn.mockResolvedValue({ kind: "processing", units: 40 });
    const el = await render({ checkout: "done", session_id: SESSION });
    expect(el.type).toBe(CreditsView);
    expect((el.props.model as { offers: unknown }).offers).toBeNull();
  });

  it("is still not found for a switch-off reader whose session_id is not their own", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.readReturn.mockResolvedValue({ kind: "none" });
    await expect(render({ checkout: "done", session_id: SESSION })).rejects.toBeInstanceOf(NotFound);
  });

  it("draws the retryable read-failed state, not a 404, for a switch-off reader whose return read THREW", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.readReturn.mockRejectedValue(new Error("network"));
    expect((await render({ checkout: "done", session_id: SESSION })).type).toBe(CreditsReadFailed);
  });

  it("draws the retryable read-failed state, not a 404, when there is no Stripe client to ask", async () => {
    m.requestSwitchEnv.mockResolvedValue({});
    m.stripeClient.mockReturnValueOnce(null);
    expect((await render({ checkout: "done", session_id: SESSION })).type).toBe(CreditsReadFailed);
  });

  // The webhook can commit between the two reads. Read the return first and the grant it observes is always in the
  // balances and the history that are read after it.
  it("reads the return BEFORE the balances and the history", async () => {
    const order: string[] = [];
    m.readReturn.mockImplementation(async () => { order.push("return"); return { kind: "added", units: 40 }; });
    m.readAllowance.mockImplementation(async () => { order.push("allowance"); return { used: 2, limit: 5, reopensAt: null, nextAt: null, pack: 40 }; });
    m.listCreditHistory.mockImplementation(async () => { order.push("history"); return [grant]; });
    await render({ checkout: "done", session_id: SESSION });
    expect(order[0]).toBe("return");
    expect(order.slice(1).sort()).toEqual(["allowance", "history"]);
  });

  it("starts the band empty, to ask again at once, when Stripe could not be asked", async () => {
    m.readReturn.mockRejectedValue(new Error("network"));
    expect((await render({ checkout: "done", session_id: SESSION })).props.ret).toEqual({ kind: "done", sessionId: SESSION, initial: null });
  });

  it("passes a cancel through as one quiet line", async () => {
    expect((await render({ checkout: "cancelled" })).props.ret).toEqual({ kind: "cancelled" });
  });
});
