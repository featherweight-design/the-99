import { describe, expect, it, vi } from "vitest";

// The module under test reaches `next/cache` through `revalidateClaims`, which
// nothing here calls. Mocked so importing it never depends on Next's runtime:
// the two functions asserted below are pure, and should stay testable as such.
vi.mock("next/cache", () => ({ revalidatePath: () => {}, updateTag: () => {} }));

import { claimSurfaces, deckSurfaces } from "./revalidate";

describe("deckSurfaces", () => {
  // Home lists the three most recent decks, so it goes stale on a rename or a
  // create just as surely as /decks does.
  it("names the home dashboard alongside the deck and the index", () => {
    expect(deckSurfaces("deck-1")).toEqual(["/decks/deck-1", "/decks", "/"]);
  });
});

describe("claimSurfaces", () => {
  // A back navigation to either is served from the router cache, so a deck
  // write that does not name them leaves a claimed card reading as unclaimed.
  it("names the availability surfaces as well as every deck surface", () => {
    expect(claimSurfaces("deck-1")).toEqual([
      ...deckSurfaces("deck-1"),
      "/collection",
      "/commanders",
      "/discover",
    ]);
  });
});
