import { describe, expect, it } from "vitest";
import { tokenShopping } from "./shopping";
import type { DeckToken, DeckTokensRead } from "./read";
import type { TokenPriceFact } from "./price";

const NEWEST = new Date("2026-10-11");
const fact = (cents: number | null, over: Partial<TokenPriceFact> = {}): TokenPriceFact => ({
  cents, foilCents: null, etchedCents: null, asOf: NEWEST,
  printing: { scryfallId: "p", setCode: "tla", collectorNumber: "8", productName: "Soldier", productSet: "tla", productNumber: "8" },
  ...over,
});
const token = (over: Partial<DeckToken> = {}): DeckToken => ({
  oracleId: "t1", name: "Soldier", typeLine: "Token Creature — Soldier", colors: ["W"], power: "1", toughness: "1",
  oracleText: null, makers: [], state: "not", source: null, joined: true, picture: null, printingPick: null, price: null, ...over,
});
const ok = (tokens: DeckToken[]): DeckTokensRead =>
  ({ status: "ok", read: true, tokens, makerCount: 1, newestPriceAsOf: NEWEST });

describe("tokenShopping", () => {
  it("is null with nothing joined, for a failed or absent read, and for none at all", () => {
    expect(tokenShopping(null)).toBeNull();
    expect(tokenShopping({ status: "failed" })).toBeNull();
    expect(tokenShopping({ status: "absent" })).toBeNull();
    expect(tokenShopping(ok([token({ joined: false })]))).toBeNull();
  });

  it("never lists a held token, whatever its join says", () => {
    expect(tokenShopping(ok([token({ state: "owned", source: "upload" })]))).toBeNull();
  });

  it("sums the live figures and counts only those as priced", () => {
    const r = tokenShopping(ok([
      token({ oracleId: "a", price: fact(15) }),
      token({ oracleId: "b", price: fact(25) }),
      token({ oracleId: "c", price: null }),
      token({ oracleId: "d", price: fact(99, { asOf: new Date("2026-09-01") }) }),
    ]))!;
    expect(r.rows).toHaveLength(4);
    expect(r.priced).toBe(2);
    expect(r.cents).toBe(40);
  });

  it("sends Mana Pool's product where it has one, the name alone otherwise", () => {
    const r = tokenShopping(ok([
      token({ oracleId: "a", price: fact(15, { printing: { scryfallId: "p", setCode: "tla", collectorNumber: "8", productName: "Soldier // Eldrazi", productSet: "tonc", productNumber: "1-17" } }) }),
      token({ oracleId: "b", name: "Monk", price: null }),
    ]))!;
    expect(r.lines).toEqual([
      { name: "Soldier // Eldrazi", quantity: 1, printing: { setCode: "tonc", collectorNumber: "1-17" } },
      { name: "Monk", quantity: 1 },
    ]);
  });
});
