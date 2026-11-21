import { describe, expect, it } from "vitest";

import { cardsWithChoice, nowHolderNames, type HistoryLive } from "./history-live-view";

const deck = (id: string) => ({ id, name: `Deck ${id}` });
/** Holders now, and of those the ones a pick put a copy in (`gained`). */
const live = (holders: string[], gained: string[] = []): HistoryLive => ({
  change: true,
  holders: holders.map(deck),
  gained: gained.map(deck),
});

describe("nowHolderNames", () => {
  it("says nothing before the live read lands, or when no deck holds the card", () => {
    expect(nowHolderNames(["a"], undefined)).toBeNull();
    expect(nowHolderNames(["a"], live([]))).toBeNull();
  });

  it("says nothing while every deck the record named still holds a copy", () => {
    expect(nowHolderNames(["a", "b"], live(["b", "a"]))).toBeNull();
    // A pick beside them changes nothing for the record: it still names decks that hold theirs.
    expect(nowHolderNames(["a"], live(["a", "b"], ["b"]))).toBeNull();
  });

  it("names the deck a pick put the copy in when the record's deck holds none now", () => {
    expect(nowHolderNames(["a"], live(["b"], ["b"]))).toEqual(["Deck b"]);
  });

  // SEVERAL PICKS (G3, H2): on a five-copy card every holder is five decks, four of them holding by
  // commit order and no news. Only the decks a pick put a copy in are named.
  it("names only the decks a pick put a copy in, never the holders by commit order", () => {
    expect(nowHolderNames(["gishath"], live(["zombies", "prismari", "urza", "reforged", "mutant"], ["mutant"])))
      .toEqual(["Deck mutant"]);
  });

  it("says nothing when no pick explains where the copy went", () => {
    expect(nowHolderNames(["a"], live(["b"]))).toBeNull();
  });
});

describe("cardsWithChoice", () => {
  const noChoice: HistoryLive = { change: false, holders: [], gained: [] };
  it("counts distinct cards whose live read says Change applies, and skips unread ones", () => {
    const l = { a: live(["x"]), b: noChoice, c: live(["y"]) };
    expect(cardsWithChoice(["a", "a", "b", "c", "d"], l)).toEqual(["a", "c"]);
    expect(cardsWithChoice(["a"], {})).toEqual([]);
  });
});
