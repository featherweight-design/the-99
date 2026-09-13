import { describe, expect, it } from "vitest";
import {
  DECK_SORT_LABELS,
  DECK_SORT_ORDER,
  deckSortFromParams,
  isDeckSort,
  DEFAULT_DECK_SORT,
  parseDeckSort,
  serializeDeckSort,
  sortDecks,
  type SortableDeck,
} from "./sort";

describe("deck sort", () => {
  it("defaults to last played on either absence", () => {
    // `undefined` is what a server component's searchParams gives for a missing
    // key; `null` is what URLSearchParams.get gives. Both mean "not in the URL".
    expect(DEFAULT_DECK_SORT).toBe("lastPlayed");
    expect(parseDeckSort(undefined)).toBe("lastPlayed");
    expect(parseDeckSort(null)).toBe("lastPlayed");
  });

  it("reads the two non-default orders off the URL", () => {
    expect(parseDeckSort("name")).toBe("name");
    expect(parseDeckSort("newest")).toBe("newest");
  });

  it("falls back to the default rather than throwing on junk", () => {
    expect(parseDeckSort("")).toBe("lastPlayed");
    expect(parseDeckSort("popularity")).toBe("lastPlayed");
    expect(parseDeckSort("__proto__")).toBe("lastPlayed");
    expect(parseDeckSort("toString")).toBe("lastPlayed");
  });

  it("serialises the default as an absence, so the clean URL is the clean state", () => {
    expect(serializeDeckSort("lastPlayed")).toBeUndefined();
    expect(serializeDeckSort("name")).toBe("name");
    expect(serializeDeckSort("newest")).toBe("newest");
  });

  it("labels every order in the register the trigger prints", () => {
    // Sentence case: these were the only menu options in the app not
    // capitalised. The trigger takes the same string, so it reads
    // `Sort · Last played`.
    expect(DECK_SORT_LABELS).toEqual({
      lastPlayed: "Last played",
      name: "Name",
      newest: "Newest",
    });
  });

  it("tells an absent order apart from the default", () => {
    // `parseDeckSort` collapses the two, which is right for a caller that needs
    // an order and wrong for the view: the stored preference sits between them,
    // and only an absence reaches it.
    expect(deckSortFromParams(null)).toBeNull();
    expect(deckSortFromParams(undefined)).toBeNull();
    expect(deckSortFromParams("")).toBeNull();
    expect(deckSortFromParams("popularity")).toBeNull();
    expect(deckSortFromParams("__proto__")).toBeNull();
    expect(deckSortFromParams("lastPlayed")).toBe("lastPlayed");
    expect(deckSortFromParams("name")).toBe("name");
  });

  it("guards the stored value the same way", () => {
    expect(isDeckSort("name")).toBe(true);
    expect(isDeckSort("popularity")).toBe(false);
    expect(isDeckSort("toString")).toBe(false);
  });

  it("renders the sheet's chips default-first", () => {
    expect(DECK_SORT_ORDER).toEqual(["lastPlayed", "name", "newest"]);
    expect(DECK_SORT_ORDER[0]).toBe(DEFAULT_DECK_SORT);
  });
});

describe("sortDecks", () => {
  function deck(over: Partial<SortableDeck> = {}): SortableDeck {
    return {
      id: "d1",
      name: "Atraxa",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      lastPlayedAt: new Date("2026-09-01T00:00:00Z"),
      ...over,
    };
  }

  it("puts a deck that has never been played last, not first", () => {
    // The SQL says `nulls last` for the same reason: Postgres sorts nulls first
    // under DESC, and a never-played deck at the top of "last played" is wrong
    // in both places or neither.
    const decks = [
      deck({ id: "never", name: "Never", lastPlayedAt: null }),
      deck({ id: "old", name: "Old", lastPlayedAt: new Date("2026-08-01T00:00:00Z") }),
      deck({ id: "new", name: "New", lastPlayedAt: new Date("2026-09-05T00:00:00Z") }),
    ];
    expect(sortDecks(decks, "lastPlayed").map((d) => d.id)).toEqual(["new", "old", "never"]);
  });

  it("breaks an equal name on the id, because deck names are not unique", () => {
    const decks = [
      deck({ id: "b", name: "Krenko" }),
      deck({ id: "a", name: "krenko" }),
    ];
    expect(sortDecks(decks, "name").map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("orders newest by creation, most recent first", () => {
    const decks = [
      deck({ id: "old", createdAt: new Date("2025-06-01T00:00:00Z") }),
      deck({ id: "new", createdAt: new Date("2026-06-01T00:00:00Z") }),
    ];
    expect(sortDecks(decks, "newest").map((d) => d.id)).toEqual(["new", "old"]);
  });

  it("orders by code point, not by the runtime's locale", () => {
    // `localeCompare` under en-US sorts the apostrophe as though it were not
    // there, putting "Ur-Dragon" ahead of "Ur'zad"; by code point the
    // apostrophe (U+0027) precedes the hyphen (U+002D). The value of this
    // function is landing on the server's sequence for every reader, so the
    // locale must not reach it at all.
    const decks = [
      deck({ id: "b", name: "Ur-Dragon" }),
      deck({ id: "a", name: "Ur'zad" }),
    ];
    expect(sortDecks(decks, "name").map((d) => d.id)).toEqual(["a", "b"]);
  });

  it("returns a new array rather than sorting the caller's", () => {
    const decks = [deck({ id: "b", name: "B" }), deck({ id: "a", name: "A" })];
    const sorted = sortDecks(decks, "name");
    expect(sorted).not.toBe(decks);
    expect(decks.map((d) => d.id)).toEqual(["b", "a"]);
  });
});
