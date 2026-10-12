import { describe, expect, it } from "vitest";
import {
  PRICE_STALE_AFTER_DAYS,
  formatCents,
  formatPriceFigure,
  parseAsOf,
  priceRank,
  priceState,
  provenanceForm,
  summarisePrices,
  type PriceFact,
} from "./price";

const NEWEST = new Date("2026-09-01T09:00:00.000Z");
const OLDER = new Date("2026-08-25T09:00:00.000Z");

const fact = (over: Partial<PriceFact> = {}): PriceFact => ({
  cents: null,
  foilCents: null,
  etchedCents: null,
  asOf: NEWEST,
  ...over,
});

describe("priceState", () => {
  it("is priced when a live row carries a non-foil figure", () => {
    expect(priceState(fact({ cents: 4500 }), NEWEST)).toBe("priced");
  });

  it("is foilOnly when a live row carries only foil or only etched", () => {
    expect(priceState(fact({ foilCents: 210 }), NEWEST)).toBe("foilOnly");
    expect(priceState(fact({ etchedCents: 680 }), NEWEST)).toBe("foilOnly");
  });

  it("is soldOut when the best row we could find is not live", () => {
    expect(priceState(fact({ cents: 4500, asOf: OLDER }), NEWEST)).toBe("soldOut");
  });

  it("is absent for a missing fact", () => {
    expect(priceState(null, NEWEST)).toBe("absent");
    expect(priceState(undefined, NEWEST)).toBe("absent");
  });

  // The default branch, and the reason it is a default rather than a
  // condition: a live row with nothing in any price column tells us nothing
  // about buying the card, which is exactly what the bare tag means.
  it("is absent for a live row whose three price columns are all null", () => {
    expect(priceState(fact(), NEWEST)).toBe("absent");
  });

  it("is absent when the table itself is empty", () => {
    expect(priceState(fact({ cents: 4500 }), null)).toBe("absent");
  });

  // THE PROPERTY THE WHOLE DERIVATION WAS REWRITTEN FOR. Under a wall-clock
  // window a missed ingest run would age every row past the window and every
  // card would claim to be sold out at once. This must never regress.
  it("calls no card sold out when every row shares one as_of, however old", () => {
    const ancient = new Date("2020-01-01T00:00:00.000Z");
    const rows = [
      fact({ cents: 4500, asOf: ancient }),
      fact({ foilCents: 210, asOf: ancient }),
      fact({ asOf: ancient }),
    ];
    const states = rows.map((r) => priceState(r, ancient));
    expect(states).not.toContain("soldOut");
    expect(states).toEqual(["priced", "foilOnly", "absent"]);
  });
});

describe("formatCents", () => {
  it("prints whole cents without rounding", () => {
    expect(formatCents(12950)).toBe("$129.50");
    expect(formatCents(210)).toBe("$2.10");
    expect(formatCents(0)).toBe("$0.00");
  });

  // The locale is pinned, so the separator cannot follow the runtime's idea of
  // one and hydrate mismatched.
  it("separates thousands in a fixed locale", () => {
    expect(formatCents(123450)).toBe("$1,234.50");
  });
});

describe("formatPriceFigure", () => {
  // A foil-only figure stated bare is the normal printing's price, which is a
  // figure the feed never gave. Every surface that prints a price prints this.
  it("qualifies a foil-only figure, and leaves a normal one bare", () => {
    const foil = fact({ foilCents: 940 });
    expect(formatPriceFigure(foil, priceState(foil, NEWEST))).toBe("$9.40 foil");
    const etched = fact({ etchedCents: 1200 });
    expect(formatPriceFigure(etched, priceState(etched, NEWEST))).toBe("$12.00 etched");
    const plain = fact({ cents: 250, foilCents: 940 });
    expect(formatPriceFigure(plain, priceState(plain, NEWEST))).toBe("$2.50");
  });

  it("is null when there is no figure to print", () => {
    const soldOut = fact({ asOf: OLDER });
    expect(formatPriceFigure(soldOut, priceState(soldOut, NEWEST))).toBeNull();
  });
});

describe("summarisePrices", () => {
  it("multiplies by quantity and counts copies, not rows", () => {
    const summary = summarisePrices(
      [
        { quantity: 3, price: fact({ cents: 100 }) },
        { quantity: 2, price: fact({ foilCents: 250 }) },
      ],
      NEWEST,
    );
    expect(summary).toEqual({ totalCents: 800, pricedCopies: 5, totalCopies: 5 });
  });

  // The denominator is every copy the filter is showing — that is what makes
  // "6 of 8 priced" name something missing.
  it("counts sold-out and absent copies against the denominator only", () => {
    const summary = summarisePrices(
      [
        { quantity: 6, price: fact({ cents: 1000 }) },
        { quantity: 1, price: fact({ cents: 9900, asOf: OLDER }) },
        { quantity: 1, price: null },
      ],
      NEWEST,
    );
    expect(summary).toEqual({ totalCents: 6000, pricedCopies: 6, totalCopies: 8 });
  });

  it("totals nothing when nothing is priced", () => {
    const summary = summarisePrices([{ quantity: 4, price: null }], NEWEST);
    expect(summary).toEqual({ totalCents: 0, pricedCopies: 0, totalCopies: 4 });
  });
});

describe("provenanceForm", () => {
  const at = (days: number) => new Date(NEWEST.getTime() + days * 86_400_000);

  it("is ten days, so a healthy weekly feed never says it is behind", () => {
    expect(PRICE_STALE_AFTER_DAYS).toBe(10);
    // The worst healthy case: the ingest runs 09:00 UTC every Monday, so the
    // table is very nearly seven days old just before the next run.
    expect(provenanceForm(NEWEST, at(7)).behind).toBe(false);
  });

  it("names the weekday while the table is current", () => {
    expect(provenanceForm(NEWEST, at(9))).toEqual({ behind: false, when: "Tuesday" });
  });

  it("switches to a date and gains the clause at the same threshold", () => {
    expect(provenanceForm(NEWEST, at(11))).toEqual({ behind: true, when: "September 1" });
  });
});

// `timestamp` without time zone holds a UTC instant, but a driver that hands
// back the raw string hands back one with no zone marker on it. Read in the
// runtime's zone, an evening row in Denver dates to the following day in UTC —
// which is the day the provenance line then names.
describe("parseAsOf", () => {
  it("reads a zone-less Postgres string as UTC, not as local time", () => {
    expect(parseAsOf("2026-09-01 09:00:00").toISOString()).toBe("2026-09-01T09:00:00.000Z");
  });

  it("keeps microseconds and an explicit zone when the driver supplies one", () => {
    expect(parseAsOf("2026-09-01 09:00:00.156").toISOString()).toBe("2026-09-01T09:00:00.156Z");
    expect(parseAsOf("2026-09-01T09:00:00+00:00").toISOString()).toBe("2026-09-01T09:00:00.000Z");
  });

  it("passes through a Date the driver already parsed", () => {
    expect(parseAsOf(NEWEST)).toEqual(NEWEST);
  });

  // An Invalid Date fails every comparison, including its own: `NaN !== NaN`
  // would read a whole deck as sold out rather than as unreadable.
  it("throws rather than returning an Invalid Date", () => {
    expect(() => parseAsOf("not a timestamp")).toThrow(/not a readable timestamp/);
  });
});

// The figure a row draws, which is what every order in the app ranks on. The
// comparator that used to live beside it is `sort-cards.ts`'s now; this is the
// half that answers "what does this row say it costs".
describe("priceRank", () => {
  it("is the live figure when there is one", () => {
    expect(priceRank({ price: fact({ cents: 18999 }) }, NEWEST)).toBe(18999);
  });

  // The figure ON THE TAG. A foil-only row prints its foil price, so that is
  // what it is ranked on; ranking it at zero would file a $40 foil under the
  // 85-cent commons.
  it("is the foil figure on a foil-only row, and the etched one on an etched row", () => {
    expect(priceRank({ price: fact({ foilCents: 4000 }) }, NEWEST)).toBe(4000);
    expect(priceRank({ price: fact({ etchedCents: 100 }) }, NEWEST)).toBe(100);
  });

  // Neither is a price of zero: one sold out and the other was never stocked.
  it("is null for a sold-out row and for one that was never stocked", () => {
    expect(priceRank({ price: fact({ cents: 9999, asOf: OLDER }) }, NEWEST)).toBeNull();
    expect(priceRank({ price: null }, NEWEST)).toBeNull();
    expect(priceRank({}, NEWEST)).toBeNull();
  });

  // The whole table unreadable is not every card being free.
  it("is null for every row when there is no table to compare against", () => {
    expect(priceRank({ price: fact({ cents: 500 }) }, null)).toBeNull();
  });
});


