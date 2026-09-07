import { describe, expect, it } from "vitest";
import { DECK_SORT_LABELS, DEFAULT_DECK_SORT, parseDeckSort, serialiseDeckSort } from "./sort";

describe("deck sort", () => {
  it("defaults to last played", () => {
    expect(DEFAULT_DECK_SORT).toBe("lastPlayed");
    expect(parseDeckSort(undefined)).toBe("lastPlayed");
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
    expect(serialiseDeckSort("lastPlayed")).toBeUndefined();
    expect(serialiseDeckSort("name")).toBe("name");
    expect(serialiseDeckSort("newest")).toBe("newest");
  });

  it("labels every order in the register the trigger prints", () => {
    // `Sort · last played` — the trigger lowercases nothing itself.
    expect(DECK_SORT_LABELS).toEqual({
      lastPlayed: "last played",
      name: "name",
      newest: "newest",
    });
  });
});
