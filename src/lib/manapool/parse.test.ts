import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/singles.json";
import { parseManapoolPayload } from "./parse";

// The fixture is a verbatim trim of the live feed captured 2026-08-29. Trimming
// an observed payload is fine; inventing a field shape we have not seen upstream
// is not — a test that passes against a fabricated shape proves nothing.

describe("parseManapoolPayload", () => {
  it("reads as_of from the payload, not the wall clock", () => {
    const feed = parseManapoolPayload(fixture);
    expect(feed.asOf.toISOString()).toBe("2026-08-29T15:32:41.270Z");
  });

  it("collapses a repeated scryfall_id to a single row", () => {
    const feed = parseManapoolPayload(fixture);
    const ids = feed.rows.map((r) => r.scryfallId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(feed.rows).toHaveLength(3);
    expect(feed.collapsedDuplicates).toBe(1);
  });

  it("keeps the cheaper single over the pricier bundle", () => {
    const row = parseManapoolPayload(fixture).rows
      .find((r) => r.scryfallId === "71dc8556-a658-40e1-8a93-6a62af208a28")!;
    expect(row.priceCents).toBe(34);
    expect(row.availableQuantity).toBe(57);
    expect(row.buyUrl).toBe("https://manapool.com/card/thou/1/adorned-pouncer");
  });

  it("prefers a priced entry over an unpriced one regardless of order", () => {
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [
        { scryfall_id: "aaa", price_cents: null, available_quantity: 99, url: "u1" },
        { scryfall_id: "aaa", price_cents: 500, available_quantity: 1, url: "u2" },
      ],
    });
    expect(feed.rows[0].priceCents).toBe(500);
  });

  it("breaks a price tie on the higher available_quantity", () => {
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [
        { scryfall_id: "aaa", price_cents: 100, available_quantity: 3, url: "u1" },
        { scryfall_id: "aaa", price_cents: 100, available_quantity: 9, url: "u2" },
      ],
    });
    expect(feed.rows[0].availableQuantity).toBe(9);
    expect(feed.rows[0].buyUrl).toBe("u2");
  });

  it("keeps a foil-only row with a null price rather than dropping it", () => {
    const row = parseManapoolPayload(fixture).rows
      .find((r) => r.scryfallId === "b24b0f07-999f-437a-af88-5d3f391afe12")!;
    // Null price plus a set foil price is "stocked in foil only" — a real,
    // renderable state. Defaulting it to 0 would claim the card is free.
    expect(row.priceCents).toBeNull();
    expect(row.priceCentsFoil).toBe(52);
    expect(row.availableQuantity).toBe(7);
  });

  it("carries the payload as_of onto every row", () => {
    const feed = parseManapoolPayload(fixture);
    for (const row of feed.rows) {
      expect(row.asOf.toISOString()).toBe("2026-08-29T15:32:41.270Z");
    }
  });

  it("returns an empty feed rather than throwing on a shape it does not recognise", () => {
    const feed = parseManapoolPayload({ unexpected: true });
    expect(feed.rows).toEqual([]);
    expect(feed.collapsedDuplicates).toBe(0);
  });

  it("returns an empty feed when as_of is a string it cannot parse", () => {
    // An unparseable timestamp reaches `as_of timestamp NOT NULL` as an Invalid
    // Date and throws at `toISOString()` in the canary — far from the field that
    // actually moved. Refusing the payload puts the failure where the cause is.
    const feed = parseManapoolPayload({
      meta: { as_of: "29/08/2026" },
      data: [{ scryfall_id: "aaa", price_cents: 100, available_quantity: 1 }],
    });
    expect(feed.rows).toEqual([]);
  });

  it("returns an empty feed when as_of is absent", () => {
    const feed = parseManapoolPayload({
      data: [{ scryfall_id: "aaa", price_cents: 100, available_quantity: 1 }],
    });
    expect(feed.rows).toEqual([]);
  });

  it("skips an entry missing a scryfall_id", () => {
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [{ price_cents: 100, available_quantity: 1 }],
    });
    expect(feed.rows).toEqual([]);
  });

  it("skips an entry with a non-numeric available_quantity", () => {
    // The column is NOT NULL with no DEFAULT, so a row we cannot quantify has
    // no honest value to insert — dropping it is the only correct answer.
    const feed = parseManapoolPayload({
      meta: { as_of: "2026-08-29T15:32:41.270Z" },
      data: [{ scryfall_id: "aaa", price_cents: 100, available_quantity: null }],
    });
    expect(feed.rows).toEqual([]);
  });
});
