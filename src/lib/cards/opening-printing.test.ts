import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrintingPrices } from "./price-lookup";

// The loader's two reads, stubbed: the printings rows (in whatever order the database yields them) and the prices.
const stub = vi.hoisted(() => ({ rows: [] as Record<string, unknown>[], prices: new Map<string, unknown>(), fail: false }));
vi.mock("../../db", () => ({
  db: {
    select: () => ({ from: () => ({ innerJoin: () => ({ where: async () => { if (stub.fail) throw new Error("read failed"); return stub.rows; } }) }) }),
  },
}));
vi.mock("./prices", () => ({ loadOwnedPrintingPrices: async () => stub.prices }));
vi.mock("../cache/soft-failure", () => ({ recordSoftFailure: vi.fn() }));

const { liveCents, loadOpeningPrintings, openingScryfallId } = await import("./opening-printing");
import type { OpeningCandidate } from "./opening-printing";

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

// The loader's job beyond the rule: put the printings in card details' own order before applying it, because the
// rule takes the FIRST of two equally cheap printings and the database yields them in no order at all. The probe
// found this on the real catalog; this pins it without one.
describe("loadOpeningPrintings", () => {
  const newest = new Date("2026-10-12T09:00:00Z");
  const row = (scryfallId: string, setCode: string, collectorNumber: string) => ({
    oracleId: "card", scryfallId, imageUri: `${scryfallId}.jpg`, setCode, collectorNumber, rarity: "common", defaultId: "default-not-stocked",
  });
  const priced = (ids: string[]) => new Map([["card", {
    newestAsOf: newest,
    byScryfallId: Object.fromEntries(ids.map((id) => [id, { cents: 100, asOf: newest }])),
  }]]);

  beforeEach(() => { stub.rows = []; stub.prices = new Map(); stub.fail = false; });

  it("breaks a tie between equally cheap printings the way the modal's order does, whatever order the rows arrive in", async () => {
    stub.prices = priced(["z", "a", "m"]);
    for (const order of [["z", "a", "m"], ["m", "z", "a"], ["a", "m", "z"]]) {
      const bySet: Record<string, ReturnType<typeof row>> = { z: row("z", "zzz", "5"), a: row("a", "aaa", "9"), m: row("m", "aaa", "10") };
      stub.rows = order.map((id) => bySet[id]);
      // `aaa 9` sorts before `aaa 10` (natural collector number) and both before `zzz`.
      expect((await loadOpeningPrintings(["card"])).get("card")?.scryfallId).toBe("a");
    }
  });

  it("answers the printing's art, set and rarity together, and nothing for a card with no live printing", async () => {
    stub.prices = priced(["a"]);
    stub.rows = [row("a", "aaa", "9")];
    expect((await loadOpeningPrintings(["card"])).get("card")).toEqual({ scryfallId: "a", imageUri: "a.jpg", setCode: "aaa", rarity: "common" });
    stub.prices = new Map();
    expect((await loadOpeningPrintings(["card"])).size).toBe(0);
  });

  it("answers nothing on a failed read, and records it", async () => {
    stub.fail = true;
    expect((await loadOpeningPrintings(["card"])).size).toBe(0);
    const { recordSoftFailure } = await import("../cache/soft-failure");
    expect(recordSoftFailure).toHaveBeenCalled();
  });
});
