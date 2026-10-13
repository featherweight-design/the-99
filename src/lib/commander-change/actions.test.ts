import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../switches/request", () => ({ requestSwitchEnv: vi.fn(async () => process.env) }));

const after = vi.fn();
vi.mock("next/server", () => ({ after: (...a: unknown[]) => after(...a) }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
const transaction = vi.fn();
vi.mock("../../db", () => ({ db: { transaction: (...a: unknown[]) => transaction(...a) } }));
const loadChangeCandidates = vi.fn();
vi.mock("./candidates", () => ({ loadChangeCandidates: (...a: unknown[]) => loadChangeCandidates(...a) }));
const revalidateClaims = vi.fn();
vi.mock("../decks/revalidate-claims", () => ({ revalidateClaims: (...a: unknown[]) => revalidateClaims(...a) }));

const writeCommanderChange = vi.fn(async () => ({ ok: false, reason: "mismatch" }));
vi.mock("./write", () => ({ writeCommanderChange: (...a: unknown[]) => writeCommanderChange(...(a as [])) }));
const { changeCommander, readChangeCandidates } = await import("./actions");
const DECK = "00000000-0000-4000-8000-000000000001";
const CARD = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  process.env.CHANGE_COMMANDER_ENABLED = "true";
  transaction.mockReset();
  loadChangeCandidates.mockReset();
  revalidateClaims.mockReset();
  after.mockReset();
});

describe("changeCommander at the request boundary", () => {
  it("refuses a malformed deck id without opening a transaction", async () => {
    expect(await changeCommander("nope", { commanderOracleId: CARD, partnerOracleId: null }))
      .toEqual({ ok: false, reason: "unavailable" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("refuses a malformed commander or partner id as illegal", async () => {
    expect(await changeCommander(DECK, { commanderOracleId: "x", partnerOracleId: null }))
      .toEqual({ ok: false, reason: "illegal" });
    expect(await changeCommander(DECK, { commanderOracleId: CARD, partnerOracleId: "y" }))
      .toEqual({ ok: false, reason: "illegal" });
    expect(await changeCommander(DECK, null as never)).toEqual({ ok: false, reason: "illegal" });
    expect(transaction).not.toHaveBeenCalled();
  });

  // In the action, not deferred: the reply then carries the deck page under the new commander,
  // and the sheet needs no refresh that could race a deferred invalidation.
  it("revalidates before it returns on a success, and not at all on a refusal", async () => {
    transaction.mockResolvedValueOnce({ ok: true });
    expect(await changeCommander(DECK, { commanderOracleId: CARD, partnerOracleId: null })).toEqual({ ok: true });
    expect(revalidateClaims).toHaveBeenCalledWith(DECK, "user_1");
    expect(after).not.toHaveBeenCalled();

    revalidateClaims.mockReset();
    transaction.mockResolvedValueOnce({ ok: false, reason: "mismatch" });
    await changeCommander(DECK, { commanderOracleId: CARD, partnerOracleId: null });
    expect(revalidateClaims).not.toHaveBeenCalled();
  });

  it("refuses a malformed half-trade choice, and passes a well-formed one to the write", async () => {
    expect(await changeCommander(DECK, { commanderOracleId: CARD, partnerOracleId: null }, "z"))
      .toEqual({ ok: false, reason: "illegal" });
    expect(transaction).not.toHaveBeenCalled();
    transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn("tx"));
    await changeCommander(DECK, { commanderOracleId: CARD, partnerOracleId: null }, CARD);
    expect(writeCommanderChange).toHaveBeenCalledWith("tx", DECK, "user_1", { commanderOracleId: CARD, partnerOracleId: null }, CARD);
  });

  it("refuses everything with the switch off", async () => {
    delete process.env.CHANGE_COMMANDER_ENABLED;
    expect(await changeCommander(DECK, { commanderOracleId: CARD, partnerOracleId: null }))
      .toEqual({ ok: false, reason: "unavailable" });
    expect(transaction).not.toHaveBeenCalled();
  });
});

describe("readChangeCandidates at the request boundary", () => {
  it("answers null for a malformed deck id without reading", async () => {
    expect(await readChangeCandidates("nope")).toBeNull();
    expect(loadChangeCandidates).not.toHaveBeenCalled();
  });
});
