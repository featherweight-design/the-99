import { describe, expect, it } from "vitest";
import { allDecksCartCopy } from "./all-decks-cart";

describe("By friend's no-spare body", () => {
  it("names one card as this card, never one of these 1 card", () => {
    expect(allDecksCartCopy.byFriend.noneBody(1)).toBe("A spare is a copy none of a friend’s decks use. None of your friends has this card right now.");
    expect(allDecksCartCopy.byFriend.noneBody(3)).toBe("A spare is a copy none of a friend’s decks use. None of your friends has one of these 3 cards right now.");
  });
});

describe("the cart's filter panels", () => {
  it("drops to the bare dimension only at Owned's rest, never for a friend who happens to be named Any", () => {
    expect(allDecksCartCopy.panels.owned.triggerOne!("Any")).toBe("Owned");
    expect(allDecksCartCopy.panels.owned.triggerOne!("None")).toBe("Owned: None");
    expect(allDecksCartCopy.panels.friend.triggerOne!("Any")).toBe("Friend: Any");
  });
});
