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
  it("passes both commanders and the combined identity, and returns the measured mix", async () => {
    reads(pairDeck, [
      { oracleId: "o-cmd", colorIdentity: ["U", "R"] },
      { oracleId: "o-partner", colorIdentity: ["R", "G"] },
    ]);
    loadSkeletonForCommanders.mockResolvedValue({
      skeleton: {
        roleTargets: {
          of: "pair",
          targets: { ramp: 9, draw: 13, removal: 6, wipes: 2 },
        },
        composition: { of: "pair", targets: { land: 35 } },
      },
    });

    const mix = await loadDeckMix("d-1", "u-1", "classifier");

    // The ARGUMENTS, because a mix built from the wrong commander is a plausible mix: it
    // draws five sensible integers and nothing downstream can tell they describe another
    // deck. Identity is the union of both, deduped — `R` appears on each.
    const [commanderId, partnerId, identity] = loadSkeletonForCommanders.mock.calls[0];
    expect(commanderId).toBe("o-cmd");
    expect(partnerId).toBe("o-partner");
    expect([...identity].sort()).toEqual(["G", "R", "U"]);

    // And the result, mapped through rather than around: measured targets reach the cells,
    // and the pair's own land figure is kept instead of the asserted 37.
    expect(mix.measured).toBe(true);
    expect(mix.cells.ramp.target).toBe(9);
    expect(mix.cells.draw.target).toBe(13);
    expect(mix.cells.land.target).toBe(35);
  });

  it("keeps the partner's land target when the chain throws", async () => {
    reads(pairDeck, [
      { oracleId: "o-cmd", colorIdentity: ["U"] },
      { oracleId: "o-partner", colorIdentity: ["R"] },
    ]);
    loadSkeletonForCommanders.mockRejectedValue(new Error("chain down"));

    const mix = await loadDeckMix("d-1", "u-1", "classifier");

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

    const mix = await loadDeckMix("d-1", "u-1", "classifier");

    expect(mix.cells.land.target).toBe(37);
    expect(mix.measured).toBe(false);
  });

  it("returns the baseline rather than throwing when the deck is not the reader's", async () => {
    reads(null);
    const mix = await loadDeckMix("d-1", "someone-else", "classifier");

    expect(mix.measured).toBe(false);
    expect(mix.cells.ramp.target).toBeGreaterThan(0);
    expect(loadSkeletonForCommanders).not.toHaveBeenCalled();
  });
});
