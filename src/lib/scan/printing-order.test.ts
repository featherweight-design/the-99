import { describe, expect, it } from "vitest";
import type { PrintingChoice } from "../collection/catalog-read";
import { matchedPrinting, orderPrintings, type PrintingOrder } from "./printing-order";

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

describe("orderPrintings' printing gate", () => {
  // Command Tower's C18 and C19 printings share one picture, yet their index rows sit at cosine 0.556 (staging,
  // 2026-11-14), so a photo of the C19 card can score C18 well ahead. #2915 took a sure card's best printing when it
  // led by 0.10, and filed C19 cards as C18. A caller that still passes the old `sure` argument must get the step.
  const C18 = P("c18-240");
  const C19 = P("c19-237");
  const scored = [{ scryfallId: C18.scryfallId, score: 0.62 }, { scryfallId: C19.scryfallId, score: 0.5 }];
  const withSure = orderPrintings as unknown as (p: PrintingChoice[], s: typeof scored, sure: boolean) => PrintingOrder;

  it("never auto-picks a card with two printings, however far ahead (and however sure) the best one scored", () => {
    const o = withSure([C19, C18], scored, true);
    expect(o.autoPick).toBe(false);
    expect(o.preselected).toEqual(C18);
    expect(o.short).toEqual([C18, C19]);
    expect(orderPrintings([C19, C18], scored).autoPick).toBe(false);
    expect(withSure(loaded, [{ scryfallId: "old", score: 0.95 }, { scryfallId: "gone", score: 0.2 }], true).autoPick).toBe(false);
  });

  it("auto-picks a card with exactly one printing, sure or not", () => {
    expect(withSure([C18], [{ scryfallId: C18.scryfallId, score: 0.62 }], true).autoPick).toBe(true);
    expect(orderPrintings([C18], []).autoPick).toBe(true);
  });

  it("Auto still takes the printing the scan scored best", () => {
    expect(matchedPrinting([C19, C18], scored)).toEqual(C18);
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
