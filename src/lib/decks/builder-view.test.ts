import { describe, expect, it } from "vitest";
import { deckViewSearch, initialBuilderView, readBuilderView, readDeckBody } from "./builder-view";

describe("readBuilderView", () => {
  it("takes the tab a URL names", () => {
    expect(readBuilderView("consider")).toBe("consider");
    expect(readBuilderView("games")).toBe("games");
    expect(readBuilderView("deck")).toBe("deck");
    // `versions` is a tab like any other and an arrival may name it, so a
    // fallback here would land a hand-written URL meant for the rail on
    // `Your deck` with nothing to say it had missed.
    expect(readBuilderView("versions")).toBe("versions");
  });

  // The parameter is reader-supplied: an absent, repeated or invented value has
  // to land on the deck rather than on a tab that does not exist.
  it("falls back to the deck for anything it does not recognise", () => {
    expect(readBuilderView(undefined)).toBe("deck");
    expect(readBuilderView("shopping")).toBe("deck");
    expect(readBuilderView("")).toBe("deck");
    expect(readBuilderView(["consider", "games"])).toBe("deck");
  });
});

describe("initialBuilderView", () => {
  // The row draws no Versions cell on a deck with no version, so opening on that
  // tab would leave every cell unselected above an empty panel.
  it("sends a versions arrival to the deck when there is no version to show", () => {
    expect(initialBuilderView("versions", 0)).toBe("deck");
  });

  it("opens on the rail when the deck has versions", () => {
    expect(initialBuilderView("versions", 1)).toBe("versions");
    expect(initialBuilderView("versions", 12)).toBe("versions");
  });

  // The count decides the versions arm only. A deck with no version still has a
  // decklist, a consider panel and a game log.
  it("leaves every other tab alone however many versions there are", () => {
    expect(initialBuilderView("consider", 0)).toBe("consider");
    expect(initialBuilderView("games", 0)).toBe("games");
    expect(initialBuilderView("deck", 3)).toBe("deck");
  });
});

describe("readDeckBody (?panel=, About PR 6a)", () => {
  it("takes Shopping, Stats or Notes and nothing else", () => {
    expect(readDeckBody("shopping")).toBe("shopping");
    expect(readDeckBody("stats")).toBe("stats");
    expect(readDeckBody("notes")).toBe("notes");
    for (const v of [undefined, "", "list", "analysis", ["stats", "notes"]]) expect(readDeckBody(v)).toBeNull();
  });
});

describe("deckViewSearch", () => {
  it("names a tab by ?tab=, a body by ?panel=, Your deck by neither, keeping every other parameter", () => {
    expect(deckViewSearch("", "analysis")).toBe("?tab=analysis");
    expect(deckViewSearch("?tab=games&table=t1", "versions")).toBe("?table=t1&tab=versions");
    expect(deckViewSearch("?tab=analysis", "notes")).toBe("?panel=notes");
    expect(deckViewSearch("?panel=stats&tab=games", "your-deck")).toBe("");
    expect(deckViewSearch("?x=1", "shopping")).toBe("?x=1&panel=shopping");
    // Consider reads as Your deck but is its own tab.
    expect(deckViewSearch("?panel=stats", "your-deck", "consider")).toBe("?tab=consider");
  });
});
