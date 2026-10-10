// `loadStatsAverage` asks the basis chain for LABEL targets whatever the env says (the card's job rows
// are label counts), passes the combined identity, and never throws.
import { beforeEach, describe, expect, it, vi } from "vitest";

const loadSkeletonForCommanders = vi.fn();

vi.mock("../profile/load", () => ({ loadSkeletonForCommanders }));

const { loadStatsAverage } = await import("./stats-average-load");

const deck = { commander: { oracleId: "o-1", name: "Tymna the Weaver", colorIdentity: ["W", "B"] }, partner: { oracleId: "o-2", name: "Kraum", colorIdentity: ["U", "B"] } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("loadStatsAverage", () => {
  it("asks for the label basis with both commanders and their combined identity", async () => {
    loadSkeletonForCommanders.mockResolvedValue({
      skeleton: {
        composition: { of: "pair", targets: { land: 35 }, averageCurve: null },
        roleTargets: { of: "pair", targets: { ramp: 9, draw: 13, removal: 6, wipes: 2 } },
        condition: "UWB",
        thinCondition: false,
        staples: [],
        commanderDeckCount: 400,
      },
    });
    const a = await loadStatsAverage(deck);
    expect(loadSkeletonForCommanders).toHaveBeenCalledWith("o-1", "o-2", ["W", "B", "U"], undefined, { roleBasis: "labels" });
    expect(a?.basis).toEqual({ of: "pair", names: ["Tymna the Weaver", "Kraum"], label: "", decks: 400 });
  });

  it("returns null rather than throw, so the card stays a shell", async () => {
    loadSkeletonForCommanders.mockRejectedValue(new Error("down"));
    expect(await loadStatsAverage(deck)).toBeNull();
  });
});
