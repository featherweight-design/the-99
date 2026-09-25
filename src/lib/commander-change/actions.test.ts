import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("../auth", () => ({ requireUserId: async () => "user_1" }));
const transaction = vi.fn();
vi.mock("../../db", () => ({ db: { transaction: (...a: unknown[]) => transaction(...a) } }));
const loadChangeCandidates = vi.fn();
vi.mock("./candidates", () => ({ loadChangeCandidates: (...a: unknown[]) => loadChangeCandidates(...a) }));
vi.mock("../decks/revalidate-claims", () => ({ revalidateClaims: vi.fn() }));

const { changeCommander, readChangeCandidates } = await import("./actions");
const DECK = "00000000-0000-4000-8000-000000000001";
const CARD = "00000000-0000-4000-8000-000000000002";

beforeEach(() => {
  process.env.CHANGE_COMMANDER_ENABLED = "true";
  transaction.mockReset();
  loadChangeCandidates.mockReset();
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
