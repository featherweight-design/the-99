import { describe, expect, it } from "vitest";
import { claimSurfaces } from "./revalidate";

describe("claimSurfaces", () => {
  // The client cache holds these two for a window now, so a deck write that
  // does not name them leaves a claimed card reading as unclaimed until the
  // window lapses.
  it("names the availability surfaces as well as the deck's own", () => {
    expect(claimSurfaces("deck-1")).toEqual([
      "/decks/deck-1",
      "/decks",
      "/collection",
      "/commanders",
    ]);
  });
});
