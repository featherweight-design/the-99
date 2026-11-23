import { beforeEach, describe, expect, it, vi } from "vitest";

// The proxy resolves each reader's switches onto a request header; with no request here, the
// action reads the environment alone, as it did before overrides.
vi.mock("../flags/request", async () => {
  const { ENV_VIEW } = await import("@/test/env-view");
  return { requestFlags: vi.fn(async () => ENV_VIEW) };
});

const after = vi.fn();
vi.mock("next/server", () => ({ after: (...a: unknown[]) => after(...a) }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
const transaction = vi.fn();
vi.mock("../../db", () => ({ db: { transaction: (...a: unknown[]) => transaction(...a) } }));
const loadChangeCandidates = vi.fn();
vi.mock("./candidates", () => ({ loadChangeCandidates: (...a: unknown[]) => loadChangeCandidates(...a) }));
vi.mock("../stores/action-store", () => ({ readerStoreForAction: async () => "tcgplayer" }));
const revalidateClaims = vi.fn();
vi.mock("../decks/revalidate-claims", () => ({ revalidateClaims: (...a: unknown[]) => revalidateClaims(...a) }));

const writeCommanderChange = vi.fn(async () => ({ ok: false, reason: "mismatch" }));
vi.mock("./write", () => ({ writeCommanderChange: (...a: unknown[]) => writeCommanderChange(...(a as [])) }));
const writeUndoPartnerAdd = vi.fn(async () => ({ ok: true }));
vi.mock("./undo-write", () => ({ writeUndoPartnerAdd: (...a: unknown[]) => writeUndoPartnerAdd(...(a as [])) }));
const { changeCommander, readChangeCandidates, undoPartnerAdd } = await import("./actions");
const DECK = "00000000-0000-4000-8000-000000000001";
const CARD = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
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
    expect(writeCommanderChange).toHaveBeenCalledWith("tx", DECK, "user_1", { commanderOracleId: CARD, partnerOracleId: null }, CARD, null);
  });

  it("refuses a malformed cut, and passes a well-formed one to the write", async () => {
    const to = { commanderOracleId: CARD, partnerOracleId: CARD };
    expect(await changeCommander(DECK, to, null, "z")).toEqual({ ok: false, reason: "illegal" });
    expect(transaction).not.toHaveBeenCalled();
    transaction.mockImplementationOnce(async (fn: (tx: unknown) => unknown) => fn("tx"));
    await changeCommander(DECK, to, null, CARD);
    expect(writeCommanderChange).toHaveBeenCalledWith("tx", DECK, "user_1", to, null, CARD);
  });
});

describe("readChangeCandidates at the request boundary", () => {
  it("answers null for a malformed deck id without reading", async () => {
    expect(await readChangeCandidates("nope")).toBeNull();
    expect(loadChangeCandidates).not.toHaveBeenCalled();
  });

  it("reads the candidates at the reader's store", async () => {
    await readChangeCandidates(DECK);
    expect(loadChangeCandidates).toHaveBeenCalledWith(DECK, "user_1", "tcgplayer");
  });
});

describe("undoPartnerAdd at the request boundary", () => {
  const STAYS = "00000000-0000-4000-8000-000000000003";
  const PARTNER = "00000000-0000-4000-8000-000000000004";

  it("refuses malformed ids without opening a transaction", async () => {
    expect(await undoPartnerAdd("nope", STAYS, PARTNER, null)).toEqual({ ok: false, reason: "unavailable" });
    expect(await undoPartnerAdd(DECK, "x", PARTNER, null)).toEqual({ ok: false, reason: "changed" });
    expect(await undoPartnerAdd(DECK, STAYS, "y", null)).toEqual({ ok: false, reason: "changed" });
    expect(await undoPartnerAdd(DECK, STAYS, PARTNER, "z")).toEqual({ ok: false, reason: "changed" });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("revalidates on a success, and not on a refusal", async () => {
    transaction.mockResolvedValueOnce({ ok: true });
    expect(await undoPartnerAdd(DECK, STAYS, PARTNER, CARD)).toEqual({ ok: true });
    expect(revalidateClaims).toHaveBeenCalledWith(DECK, "user_1");

    revalidateClaims.mockReset();
    transaction.mockResolvedValueOnce({ ok: false, reason: "changed" });
    expect(await undoPartnerAdd(DECK, STAYS, PARTNER, null)).toEqual({ ok: false, reason: "changed" });
    expect(revalidateClaims).not.toHaveBeenCalled();
  });
});
