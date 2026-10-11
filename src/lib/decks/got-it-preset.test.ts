import { describe, expect, it } from "vitest";
import type { PrintingChoice } from "../collection/catalog-read";
import type { Finish } from "../collection/key";
import { finishFor, gotItNeed, gotItPreset, presetQuantity, rebaseStale } from "./got-it-preset";
import type { PriceFact } from "./price";

const NEWEST = new Date("2026-10-10T09:00:00Z");
const STALE = new Date("2026-10-01T09:00:00Z");
const ORACLE = "33333333-3333-4333-8333-333333333333";

const choice = (scryfallId: string, finishes: Finish[], setCode = "mom", collectorNumber = "137"): PrintingChoice => ({
  scryfallId, setCode, setName: "March of the Machine", collectorNumber, releasedAt: "2023-04-21",
  imageUri: null, flavorName: null, finishes, owned: {},
});
const A = choice("a0000000-0000-4000-8000-000000000000", ["nonfoil", "foil"], "mom", "137");
const B = choice("b0000000-0000-4000-8000-000000000000", ["nonfoil", "foil"], "mom", "300");
const FOIL = choice("c0000000-0000-4000-8000-000000000000", ["foil"], "pmom", "137p");
const ETCHED = choice("d0000000-0000-4000-8000-000000000000", ["etched"], "cmm", "600");

const fact = (over: Partial<PriceFact>): PriceFact => ({ cents: null, foilCents: null, etchedCents: null, asOf: NEWEST, ...over });

describe("gotItPreset (How the preset is chosen)", () => {
  it("presets a live deck pick: the printing behind the figure, nonfoil on a priced row", () => {
    // `priceFor` hands the row the pick's fact when the pick is in stock, so its printing is the pick.
    const price = fact({ cents: 120, printing: { scryfallId: B.scryfallId } });
    expect(gotItPreset(price, NEWEST, [A, B])).toEqual({ scryfallId: B.scryfallId, finish: "nonfoil" });
  });

  it("presets today's cheapest in-stock printing when that is what the figure was read from", () => {
    const price = fact({ cents: 70, printing: { scryfallId: A.scryfallId } });
    expect(gotItPreset(price, NEWEST, [A, B])).toEqual({ scryfallId: A.scryfallId, finish: "nonfoil" });
  });

  it("presets nothing on a sold-out row: the printing behind it is stale", () => {
    const price = fact({ cents: 70, asOf: STALE, printing: { scryfallId: A.scryfallId } });
    expect(gotItPreset(price, NEWEST, [A, B])).toEqual({ scryfallId: null, finish: null });
  });

  it("presets nothing when the row has no price at all", () => {
    expect(gotItPreset(null, NEWEST, [A, B])).toEqual({ scryfallId: null, finish: null });
    // A live row whose three figures are all null is `absent` too.
    expect(gotItPreset(fact({ printing: { scryfallId: A.scryfallId } }), NEWEST, [A, B])).toEqual({ scryfallId: null, finish: null });
  });

  it("selects a card's only printing whatever the price says", () => {
    expect(gotItPreset(null, NEWEST, [A])).toEqual({ scryfallId: A.scryfallId, finish: "nonfoil" });
    expect(gotItPreset(fact({ cents: 9, asOf: STALE }), NEWEST, [FOIL])).toEqual({ scryfallId: FOIL.scryfallId, finish: "foil" });
  });

  it("presets foil on a foil-only figure, and etched on an etched-only one", () => {
    expect(gotItPreset(fact({ foilCents: 450, printing: { scryfallId: A.scryfallId } }), NEWEST, [A, B]))
      .toEqual({ scryfallId: A.scryfallId, finish: "foil" });
    expect(gotItPreset(fact({ etchedCents: 450, printing: { scryfallId: ETCHED.scryfallId } }), NEWEST, [A, ETCHED]))
      .toEqual({ scryfallId: ETCHED.scryfallId, finish: "etched" });
  });

  it("presets nothing when the figure's printing is not among the choices", () => {
    const price = fact({ cents: 70, printing: { scryfallId: "e0000000-0000-4000-8000-000000000000" } });
    expect(gotItPreset(price, NEWEST, [A, B])).toEqual({ scryfallId: null, finish: null });
  });
});

describe("finishFor (audit finding 1)", () => {
  it("keeps the asked finish when offered, else nonfoil, else the first offered", () => {
    expect(finishFor(["nonfoil", "foil"], "foil")).toBe("foil");
    expect(finishFor(["nonfoil", "foil"], "etched")).toBe("nonfoil");
    expect(finishFor(["foil", "etched"], "nonfoil")).toBe("foil");
    expect(finishFor([], "foil")).toBeNull();
  });
});

describe("gotItNeed", () => {
  const avail = (owned: number, free: number) => ({ owned, free, hard: 0, soft: 0, claims: [] });
  it("is the whole ask on an unowned card", () => {
    expect(gotItNeed({ owned: false, quantity: 3, availability: null })).toBe(3);
  });
  it("is the shortfall on a spoken-for card, never the deck's ask", () => {
    expect(gotItNeed({ owned: true, quantity: 3, availability: avail(2, -1) })).toBe(1);
    expect(gotItNeed({ owned: true, quantity: 1, availability: avail(1, 0) })).toBe(0);
  });
  it("starts the stepper at the need, at least one and at most twenty", () => {
    expect(presetQuantity(0)).toBe(1);
    expect(presetQuantity(3)).toBe(3);
    expect(presetQuantity(40)).toBe(20);
  });
});

describe("rebaseStale (STATES B8)", () => {
  const row = (quantity: number, finish: Finish = "nonfoil") =>
    ({ oracleId: ORACLE, setCode: "mom", collectorNumber: "137", finish, quantity });
  it("takes the holding's count now as the next expected, and lowers the need by what landed", () => {
    expect(rebaseStale([row(1)], A, "nonfoil", 0, 3, 4)).toEqual({ expected: 1, need: 2, added: true });
  });
  it("reads only the holding the confirm sent, and never drops the need below zero", () => {
    expect(rebaseStale([row(5, "foil"), row(4)], A, "nonfoil", 0, 2, 4)).toEqual({ expected: 4, need: 0, added: true });
  });
  it("raises the need by copies removed elsewhere, never past the deck's quantity", () => {
    expect(rebaseStale([row(1)], A, "nonfoil", 2, 1, 4)).toEqual({ expected: 1, need: 2, added: false });
    expect(rebaseStale([], A, "nonfoil", 3, 1, 2)).toEqual({ expected: 0, need: 2, added: false });
  });
});
