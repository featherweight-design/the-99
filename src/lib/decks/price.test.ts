import { describe, expect, it } from "vitest";
import {
  PRICE_STALE_AFTER_DAYS,
  comparePriceDesc,
  formatCents,
  formatPriceFigure,
  parseAsOf,
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
    expect(provenanceForm(NEWEST, at(11))).toEqual({ behind: true, when: "1 September" });
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

// The Shopping list's order. It ranks on the figure the row DRAWS — through
// `priceState` and `priceOf`, the same pair the tag renders — so a row and its
// place in the list can never disagree about what this card costs.
describe("comparePriceDesc", () => {
  // The id doubles as the fixture's handle and as the comparator's last clause,
  // so a case that needs two rows to differ only by id says so by name.
  const card = (name: string, price: PriceFact | null, oracleId = name) =>
    ({ oracleId, name, price });

  const order = (cards: { oracleId: string; name: string; price: PriceFact | null }[]) =>
    cards.slice().sort((a, b) => comparePriceDesc(a, b, NEWEST)).map((c) => c.name);

  it("puts the dearest card first", () => {
    expect(order([
      card("cheap", fact({ cents: 85 })),
      card("dear", fact({ cents: 18999 })),
      card("middling", fact({ cents: 3410 })),
    ])).toEqual(["dear", "middling", "cheap"]);
  });

  // A foil-only row draws the foil figure, so that is the figure it is ranked
  // on. Ranking it at zero would file a $40 foil under the 85c commons.
  it("ranks a foil-only row by the figure its tag prints", () => {
    expect(order([
      card("normal", fact({ cents: 500 })),
      card("foil only", fact({ foilCents: 4000 })),
      card("etched only", fact({ etchedCents: 100 })),
    ])).toEqual(["foil only", "normal", "etched only"]);
  });

  // Neither is a price of zero: one has sold out and the other was never
  // stocked. Sorted as 0 they would read as the cheapest things on the list,
  // which is the one reading the feed's absence must never produce. The two are
  // ranked EQUAL and fall to the name — the list draws no figure for either, so
  // ordering one above the other would state a difference nothing on screen
  // shows. The stale row's own last price is deliberately not used: it is what
  // the card cost when it was last stocked, not what buying it costs today.
  it("sends a sold-out row and a never-stocked row to the end, in name order", () => {
    expect(order([
      card("sold out", fact({ cents: 9999, asOf: OLDER })),
      card("priced", fact({ cents: 1 })),
      card("never stocked", null),
    ])).toEqual(["priced", "never stocked", "sold out"]);
  });

  // Without a tiebreak the order falls out of however the rows arrived, so two
  // reads of one unchanged list can differ — and the test that pins the order
  // passes or fails by luck.
  it("breaks a tie on the name, so the order is stable", () => {
    expect(order([
      card("Zealot", fact({ cents: 250 })),
      card("Acolyte", fact({ cents: 250 })),
    ])).toEqual(["Acolyte", "Zealot"]);
    expect(order([
      card("Zealot", null),
      card("Acolyte", null),
    ])).toEqual(["Acolyte", "Zealot"]);
  });

  // `cards.name` carries no uniqueness constraint and the rows are keyed by
  // `oracleId`, so two same-named cards at one price would still order by
  // arrival without this last clause.
  it("breaks a tie between two cards of the same name on the id", () => {
    const pair = [
      card("Forest Bear", fact({ cents: 250 }), "zzz"),
      card("Forest Bear", fact({ cents: 250 }), "aaa"),
    ];
    expect(pair.slice().sort((a, b) => comparePriceDesc(a, b, NEWEST)).map((c) => c.oracleId))
      .toEqual(["aaa", "zzz"]);
  });

  // The server renders this list and the browser renders it again. `localeCompare`
  // reads the runtime's own locale, so a pair it orders one way in Node can come
  // back the other way in a reader's browser — a hydration difference rather than
  // a preference. The comparison is by code point for that reason.
  it("orders equal prices by code point rather than by the runtime's locale", () => {
    // `ä` sorts beside `a` under most locales' collation and after `z` by code
    // point, so the two rules disagree on this pair and the assertion can tell
    // them apart.
    expect(order([
      card("äther", fact({ cents: 100 })),
      card("zephyr", fact({ cents: 100 })),
    ])).toEqual(["zephyr", "äther"]);
  });

  // The whole table unreadable is not the same as every card being free: with
  // no newest timestamp every row is `absent`, and the list keeps the order it
  // would have had without a feed at all.
  it("falls back to the name when there is no table to compare against", () => {
    const cards = [card("Zealot", fact({ cents: 9999 })), card("Acolyte", fact({ cents: 1 }))];
    expect(cards.slice().sort((a, b) => comparePriceDesc(a, b, null)).map((c) => c.name))
      .toEqual(["Acolyte", "Zealot"]);
  });
});
