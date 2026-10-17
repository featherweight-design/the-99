import { describe, expect, it } from "vitest";
import { ABOUT_SCREENS, DECK_VIEWS } from "./about";
import { DECK_VIEW_NAMES, SCREEN_NAMES, screenName } from "./discovery";

describe("screenName", () => {
  it("names a deck's view after the deck, and any other screen by its own name", () => {
    expect(screenName({ screen: "deck", view: "shopping" })).toBe("A deck · Shopping");
    expect(screenName({ screen: "collection" })).toBe("Collection · Cards");
    expect(screenName({ screen: "account" })).toBe("Account menu");
  });

  it("has a name for every screen and every deck view", () => {
    expect(Object.keys(SCREEN_NAMES).sort()).toEqual([...ABOUT_SCREENS].sort());
    expect(Object.keys(DECK_VIEW_NAMES).sort()).toEqual([...DECK_VIEWS].sort());
  });
});
