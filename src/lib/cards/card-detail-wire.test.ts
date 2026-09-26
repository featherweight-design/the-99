import { describe, expect, it } from "vitest";
import { decodeCardDetail, encodeCardDetail } from "./card-detail-wire";

describe("card detail wire format", () => {
  it("brings every Date back a Date, at any depth, and leaves the rest as JSON has it", () => {
    const asOf = new Date("2026-09-21T09:00:00.000Z");
    const card = {
      name: "Sol Ring",
      prices: {
        newestAsOf: asOf,
        byScryfallId: { a: { cents: 150, asOf } },
        byPrintingKey: { "C21|263": { cents: 150, asOf } },
      },
      printings: [{ when: asOf, set: "C21" }],
      note: null,
      dateLike: "2026-09-21T09:00:00.000Z",
    };
    const back = decodeCardDetail<typeof card>(encodeCardDetail(card));
    expect(back).toEqual(card);
    expect(back.prices.newestAsOf).toBeInstanceOf(Date);
    expect(back.prices.byScryfallId.a.asOf.getTime()).toBe(asOf.getTime());
    expect(back.printings[0].when).toBeInstanceOf(Date);
    // A string that merely looks like a date stays a string.
    expect(typeof back.dateLike).toBe("string");
  });

  it("round-trips a missing card", () => {
    expect(decodeCardDetail(encodeCardDetail(null))).toBeNull();
  });
});
