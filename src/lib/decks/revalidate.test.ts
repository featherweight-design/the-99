import { describe, expect, it } from "vitest";

import { claimSurfaces, deckSurfaces } from "./revalidate";

describe("deckSurfaces", () => {
  // Home lists the three most recent decks, so it goes stale on a rename or a
  // create just as surely as /decks does.
  it("names the home dashboard alongside the deck and the index", () => {
    expect(deckSurfaces("deck-1")).toEqual(["/decks/deck-1", "/decks", "/decks/shopping", "/"]);
  });

  // The rail carries the deck's name, a row per version and a games-held tally
  // per row — none of which is claim-shaped, and all of which a plain deck write
  // moves. It is a TAB on the deck page now, so the deck's own path covers it;
  // the retired `/decks/[id]/versions` must NOT be named, because no route fills
  // that cache entry any more.
  it("does not name the retired version route", () => {
    expect(deckSurfaces("deck-1")).not.toContain("/decks/deck-1/versions");
  });
});

describe("claimSurfaces", () => {
  // A back navigation to either is served from the router cache, so a deck
  // write that does not name them leaves a claimed card reading as unclaimed.
  it("names the availability surfaces as well as every deck surface", () => {
    expect(claimSurfaces("deck-1")).toEqual([
      ...deckSurfaces("deck-1"),
      "/decks/deck-1/changes",
      "/collection",
      "/commanders",
      "/discover",
    ]);
  });

  // Every pull offer on the review page is a claim read against other decks, so a
  // membership change elsewhere can leave it offering a pull the server would now
  // refuse — and a back navigation is served exactly that page.
  it("names the deck's review page, where the pull offers are drawn", () => {
    expect(claimSurfaces("deck-1")).toContain("/decks/deck-1/changes");
  });
});
