import { describe, expect, it } from "vitest";
import type { PrintingChoice } from "../collection/catalog-read";
import { matchedPrinting, orderPrintings } from "./printing-order";

const P = (id: string): PrintingChoice => ({
  scryfallId: id, setCode: id, setName: null, collectorNumber: "1", releasedAt: null, imageUri: null, flavorName: null,
  finishes: ["nonfoil"], owned: {},
});
const loaded = ["new", "mid", "old", "older"].map(P);

describe("orderPrintings", () => {
  it("leads with the identified printings, best first, the best selected, and keeps the rest in loaded order", () => {
    const o = orderPrintings(loaded, [{ scryfallId: "old", score: 0.8 }, { scryfallId: "mid", score: 0.9 }]);
    expect(o.short.map((p) => p.scryfallId)).toEqual(["mid", "old"]);
    expect(o.preselected?.scryfallId).toBe("mid");
    expect(o.autoPick).toBe(false);
    expect(o.rest.map((p) => p.scryfallId)).toEqual(["new", "older"]);
  });

  it("auto-picks a card with exactly one printing, identified or not", () => {
    const o = orderPrintings([P("only")], []);
    expect(o).toEqual({ short: [P("only")], preselected: P("only"), autoPick: true, rest: [] });
  });

  it("ignores a scored id the loaded list lacks, and counts a repeat once", () => {
    const o = orderPrintings(loaded, [{ scryfallId: "gone", score: 0.99 }, { scryfallId: "new", score: 0.7 }, { scryfallId: "new", score: 0.6 }]);
    expect(o.short.map((p) => p.scryfallId)).toEqual(["new"]);
    expect(o.rest).toHaveLength(3);
  });

  it("with nothing identified, selects nothing and leaves every printing behind the press", () => {
    const o = orderPrintings(loaded, []);
    expect(o.short).toEqual([]);
    expect(o.preselected).toBeNull();
    expect(o.rest).toEqual(loaded);
    expect(orderPrintings([], [])).toEqual({ short: [], preselected: null, autoPick: false, rest: [] });
  });
});

describe("matchedPrinting", () => {
  it("takes the printing the scan scored best, not the first loaded", () => {
    expect(matchedPrinting(loaded, [{ scryfallId: "old", score: 0.8 }, { scryfallId: "mid", score: 0.9 }])?.scryfallId).toBe("mid");
  });

  it("falls back to the first loaded when the scan named none of them", () => {
    expect(matchedPrinting(loaded, [])?.scryfallId).toBe("new");
    expect(matchedPrinting(loaded, [{ scryfallId: "gone", score: 0.99 }])?.scryfallId).toBe("new");
  });

  it("answers null when no printing loaded", () => {
    expect(matchedPrinting([], [{ scryfallId: "new", score: 0.9 }])).toBeNull();
  });
});
