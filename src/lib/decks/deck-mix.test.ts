// `loadDeckMix` never throws, and what it returns when it catches is the whole question.
// A degraded path that quietly reports the wrong figure is worse than one that reports
// nothing: the strip draws `rec ~37` with no mark on it, and a pair deck is measured
// against a body one card larger than it has.
import { beforeEach, describe, expect, it, vi } from "vitest";

const select = vi.fn();
const loadSkeletonForCommanders = vi.fn();

vi.mock("../../db", () => ({ db: { select } }));
vi.mock("../profile/load", () => ({ loadSkeletonForCommanders }));

const { loadDeckMix } = await import("./deck-mix");

/** The deck row, then the commander rows — the two selects in call order. */
const reads = (deck: Record<string, unknown> | null, cardRows: unknown[] = []) => {
  select
    .mockReturnValueOnce({ from: () => ({ where: async () => (deck ? [deck] : []) }) })
    .mockReturnValueOnce({ from: () => ({ where: async () => cardRows }) });
};

const pairDeck = {
  commanderOracleId: "o-cmd",
  partnerOracleId: "o-partner",
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("loadDeckMix", () => {
  it("keeps the partner's land target when the chain throws", async () => {
    reads(pairDeck, [
      { oracleId: "o-cmd", colorIdentity: ["U"] },
      { oracleId: "o-partner", colorIdentity: ["R"] },
    ]);
    loadSkeletonForCommanders.mockRejectedValue(new Error("chain down"));

    const mix = await loadDeckMix("d-1", "u-1");

    // The pair bit was known before the throw, so the fallback carries it. 36, not 37 —
    // `landTarget` subtracts a slot for the second commander, and every other pair surface
    // says 36. This is the case that was wrong: `hasPartner` lived inside the `try`.
    expect(mix.cells.land.target).toBe(36);
    expect(mix.measured).toBe(false);
  });

  it("uses the single-commander target when there is no partner", async () => {
    reads({ commanderOracleId: "o-cmd", partnerOracleId: null }, [
      { oracleId: "o-cmd", colorIdentity: ["G"] },
    ]);
    loadSkeletonForCommanders.mockRejectedValue(new Error("chain down"));

    const mix = await loadDeckMix("d-1", "u-1");

    expect(mix.cells.land.target).toBe(37);
    expect(mix.measured).toBe(false);
  });

  it("returns the baseline rather than throwing when the deck is not the reader's", async () => {
    reads(null);
    const mix = await loadDeckMix("d-1", "someone-else");

    expect(mix.measured).toBe(false);
    expect(mix.cells.ramp.target).toBeGreaterThan(0);
    expect(loadSkeletonForCommanders).not.toHaveBeenCalled();
  });
});
