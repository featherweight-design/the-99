import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { compareTokenOffers, tokenManapoolLine, tokenPriceQuery, type TokenOffer, type TokenPriceFact } from "./price";

const NEW = new Date("2026-10-11T22:00:00Z");
const OLD = new Date("2026-10-04T22:00:00Z");
const offer = (id: string, over: Partial<TokenOffer> = {}): TokenOffer => ({
  scryfallId: id, priceCents: 15, priceCentsFoil: null, priceCentsEtched: null, asOf: NEW, ...over,
});
const pick = (offers: TokenOffer[]) => [...offers].sort((a, b) => compareTokenOffers(a, b, NEW))[0].scryfallId;

describe("compareTokenOffers", () => {
  it("prefers a live printing to a cheaper stale one", () => {
    expect(pick([offer("stale", { priceCents: 1, asOf: OLD }), offer("live", { priceCents: 90 })])).toBe("live");
  });
  it("prefers real non-foil stock to a cheaper foil, at any price", () => {
    expect(pick([offer("foil", { priceCents: null, priceCentsFoil: 5 }), offer("plain", { priceCents: 5000 })])).toBe("plain");
  });
  it("then takes the cheapest", () => {
    expect(pick([offer("b", { priceCents: 40 }), offer("a", { priceCents: 15 }), offer("c", { priceCents: 25 })])).toBe("a");
  });
  it("breaks a tie on the printing id, whatever the input order", () => {
    expect(pick([offer("b"), offer("a")])).toBe("a");
    expect(pick([offer("a"), offer("b")])).toBe("a");
  });
  it("prices a row by its foil figure before its etched one, so a cheap etched price does not win", () => {
    // `a` carries foil 50 and etched 10; its figure is 50. If etched were read first it would read 10
    // and beat `b` at 30.
    expect(pick([
      offer("a", { priceCents: null, priceCentsFoil: 50, priceCentsEtched: 10 }),
      offer("b", { priceCents: null, priceCentsFoil: 30 }),
    ])).toBe("b");
  });
  it("sorts a row with no figure last", () => {
    expect(pick([offer("none", { priceCents: null }), offer("foil", { priceCents: null, priceCentsFoil: 99 })])).toBe("foil");
  });
});

describe("tokenPriceQuery", () => {
  const text = new PgDialect().sqlToQuery(tokenPriceQuery(["00000000-0000-4000-8000-000000000001"])).sql;
  it("orders by the same four clauses as compareTokenOffers, in that order", () => {
    const order = text.slice(text.indexOf("order by"));
    const at = ["(pp.as_of = (select as_of from newest)) desc", "(pp.price_cents is null)", "coalesce(pp.price_cents, pp.price_cents_foil, pp.price_cents_etched) asc", "pp.scryfall_id"].map((c) => order.indexOf(c));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
  });
  it("takes the newest from the same statement and does not filter to live rows", () => {
    expect(text).toContain("select max(as_of) as as_of from token_printing_prices");
    expect(text).toContain("left join chosen on true");
    // Liveness is a comparison in the `order by`, never a filter: a `where` on `as_of` makes `soldOut` unreachable.
    expect(text.slice(0, text.indexOf("order by"))).not.toMatch(/as_of\s*=/);
  });
  it("reads token tables only", () => {
    expect(text).not.toMatch(/\bprinting_prices\b(?<!token_printing_prices)/);
    expect(text).not.toMatch(/from printings\b/);
  });
});

describe("tokenManapoolLine", () => {
  const fact = (over: Partial<TokenPriceFact["printing"]> = {}): TokenPriceFact => ({
    cents: 15, foilCents: null, etchedCents: null, asOf: NEW,
    printing: { scryfallId: "x", setCode: "tonc", collectorNumber: "17", productName: "Soldier // Eldrazi", productSet: "TONC", productNumber: "1-17", ...over },
  });

  it("names Mana Pool's product, not Scryfall's printing", () => {
    expect(tokenManapoolLine("Soldier", 2, fact())).toEqual({
      name: "Soldier // Eldrazi", quantity: 2, printing: { setCode: "TONC", collectorNumber: "1-17" },
    });
  });

  it("falls back to the token's name alone when a row predates the product columns", () => {
    expect(tokenManapoolLine("Soldier", 1, fact({ productName: null, productSet: null, productNumber: null })))
      .toEqual({ name: "Soldier", quantity: 1 });
  });

  it("degrades a number Mana Pool cannot place exactly to the name alone", () => {
    for (const number of ["1★", "12 a", "3/4"]) {
      expect(tokenManapoolLine("Angel // Demon", 1, fact({ productName: "Angel // Demon", productSet: "PHEL", productNumber: number })))
        .toEqual({ name: "Angel // Demon", quantity: 1 });
    }
    expect(tokenManapoolLine("X", 1, fact({ productNumber: "2-TTLA-8" })).printing).toEqual({ setCode: "TONC", collectorNumber: "2-TTLA-8" });
  });

  it("sends no coordinates when Mana Pool's name is missing, rather than its numbers beside Scryfall's name", () => {
    const line = tokenManapoolLine("Soldier", 1, fact({ productName: null }));
    expect(line).toEqual({ name: "Soldier", quantity: 1 });
  });

  it("never sends Scryfall's number when Mana Pool's is absent", () => {
    const line = tokenManapoolLine("Soldier", 1, fact({ productNumber: null }));
    expect(line.printing).toBeUndefined();
  });
});
