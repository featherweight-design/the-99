import { describe, expect, it } from "vitest";

import { nowHolderNames, type HistoryLive } from "./history-live-view";

const live = (...ids: string[]): HistoryLive => ({ change: true, holders: ids.map((id) => ({ id, name: `Deck ${id}` })) });

describe("nowHolderNames", () => {
  it("says nothing before the live read lands, or when no deck holds the card", () => {
    expect(nowHolderNames(["a"], undefined)).toBeNull();
    expect(nowHolderNames(["a"], live())).toBeNull();
  });

  it("says nothing when the holders are exactly the decks the record named", () => {
    expect(nowHolderNames(["a", "b"], live("b", "a"))).toBeNull();
  });

  it("names the live holders when the copy has moved", () => {
    expect(nowHolderNames(["a"], live("b"))).toEqual(["Deck b"]);
  });

  it("names them when a holder was added beside the one the record named", () => {
    expect(nowHolderNames(["a"], live("a", "b"))).toEqual(["Deck a", "Deck b"]);
  });
});
