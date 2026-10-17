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

  it("reads nothing for a malformed id, a missing id, or a switch that is off", async () => {
    expect((await render({ checkout: "done", session_id: "../x" })).props.ret).toBeNull();
    expect((await render({ checkout: "done" })).props.ret).toBeNull();
    m.requestSwitchEnv.mockResolvedValue({});
    m.listCreditHistory.mockResolvedValue([grant]);
    expect((await render({ checkout: "done", session_id: SESSION })).props.ret).toBeNull();
    expect(m.readReturn).not.toHaveBeenCalled();
  });

  it("starts the band empty, to ask again at once, when Stripe could not be asked", async () => {
    m.readReturn.mockRejectedValue(new Error("network"));
    expect((await render({ checkout: "done", session_id: SESSION })).props.ret).toEqual({ kind: "done", sessionId: SESSION, initial: null });
  });

  it("passes a cancel through as one quiet line", async () => {
    expect((await render({ checkout: "cancelled" })).props.ret).toEqual({ kind: "cancelled" });
  });
});
