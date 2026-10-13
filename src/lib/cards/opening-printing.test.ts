import { describe, expect, it } from "vitest";
import { liveCents, openingScryfallId, type OpeningCandidate } from "./opening-printing";
import type { PrintingPrices } from "./price-lookup";

const c = (scryfallId: string, liveCents: number | null, ownArt = true): OpeningCandidate => ({ scryfallId, ownArt, liveCents });

// The rule card details open an unowned card by, and every preview of one draws.
describe("openingScryfallId", () => {
  it("opens on the oracle's own printing when the shop carries it now, even over a cheaper one", () => {
    expect(openingScryfallId([c("a", 500), c("b", 50)], "a")).toBe("a");
  });

  it("opens on the cheapest live printing with art when the oracle's own is not live (Zul Ashur)", () => {
    expect(openingScryfallId([c("a", null), c("b", 300), c("c", 120)], "a")).toBe("c");
  });

  it("passes over a printing that has no art of its own, the default included", () => {
    expect(openingScryfallId([c("a", 100, false), c("b", 300), c("c", 120, false)], "a")).toBe("b");
  });

  it("answers null when nothing is live, so the caller keeps the oracle-level art", () => {
    expect(openingScryfallId([c("a", null), c("b", null)], "a")).toBeNull();
    expect(openingScryfallId([], "a")).toBeNull();
  });

  it("takes the first of two equally cheap printings, as the modal always has", () => {
    expect(openingScryfallId([c("a", null), c("b", 100), c("c", 100)], "a")).toBe("b");
  });

  it("names the cheapest live printing when the oracle default is not among the printings at all", () => {
    expect(openingScryfallId([c("b", 300), c("c", 120)], "gone")).toBe("c");
    expect(openingScryfallId([c("b", 300), c("c", 120)], null)).toBe("c");
  });
});

describe("liveCents", () => {
  const newest = new Date("2026-10-12T09:00:00Z");
  const prices = {
    newestAsOf: newest,
    byScryfallId: {
      fresh: { cents: 150, asOf: newest },
      stale: { cents: 90, asOf: new Date("2026-10-01T09:00:00Z") },
      foilOnly: { cents: null, asOf: newest },
    },
  } as unknown as PrintingPrices;

  it("is a non-foil price at the newest as_of, and nothing else", () => {
    expect(liveCents(prices, "fresh")).toBe(150);
    expect(liveCents(prices, "stale")).toBeNull();
    expect(liveCents(prices, "foilOnly")).toBeNull();
    expect(liveCents(prices, "unknown")).toBeNull();
    expect(liveCents(null, "fresh")).toBeNull();
  });
});
