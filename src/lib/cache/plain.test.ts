import { describe, expect, it } from "vitest";

import { decodePlain, encodePlain } from "./plain";

describe("the page cache's plain-data codec", () => {
  it("brings a Date back a Date, at any depth", () => {
    const at = new Date("2026-09-26T12:00:00.000Z");
    const back = decodePlain<{ decks: { lastEditedAt: Date; lastPlayedAt: Date | null }[] }>(
      encodePlain({ decks: [{ lastEditedAt: at, lastPlayedAt: null }] }),
    );
    expect(back.decks[0].lastEditedAt).toBeInstanceOf(Date);
    expect(back.decks[0].lastEditedAt.getTime()).toBe(at.getTime());
    expect(back.decks[0].lastPlayedAt).toBeNull();
  });

  it("brings a Map back a Map, with Dates inside it restored too", () => {
    const at = new Date(0);
    const back = decodePlain<{ byDeck: Map<string, { asOf: Date; n: number }> }>(
      encodePlain({ byDeck: new Map([["d1", { asOf: at, n: 2 }]]) }),
    );
    expect(back.byDeck).toBeInstanceOf(Map);
    expect(back.byDeck.get("d1")?.n).toBe(2);
    expect(back.byDeck.get("d1")?.asOf).toBeInstanceOf(Date);
  });

  it("leaves an ordinary object that happens to have other keys alone", () => {
    expect(decodePlain(encodePlain({ a: { $date: "x", other: 1 } }))).toEqual({ a: { $date: "x", other: 1 } });
  });
});
