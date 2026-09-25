import { describe, expect, it, vi } from "vitest";
import { filterChapters, matchTitle } from "./search";

describe("matchTitle", () => {
  it("folds case the same in every locale", () => {
    // A Turkish-locale fold, where `I` becomes dotless `ı`.
    const turkish = vi
      .spyOn(String.prototype, "toLocaleLowerCase")
      .mockImplementation(function (this: string) {
        return this.replace(/I/g, "ı").toLowerCase();
      });
    try {
      expect(matchTitle("Import a collection", "i").matched).toBe(true);
    } finally {
      turkish.mockRestore();
    }
  });

  it("splits a title around a case-insensitive match", () => {
    expect(matchTitle("The other half of a combo", "HALF")).toEqual({
      matched: true,
      before: "The other ",
      hit: "half",
      after: " of a combo",
    });
  });

  it("treats the query as characters, never a pattern", () => {
    expect(matchTitle("Deck (v2)", "(v").matched).toBe(true);
    expect(matchTitle("Plus +1 counters", "+1").matched).toBe(true);
    expect(matchTitle("anything", ".*").matched).toBe(false);
    expect(() => matchTitle("x", "[")).not.toThrow();
  });

  it("matches nothing on an empty or blank query", () => {
    expect(matchTitle("Anything", "").matched).toBe(false);
    expect(matchTitle("Anything", "   ").matched).toBe(false);
  });

  it("ignores the query's surrounding whitespace", () => {
    expect(matchTitle("Browse what you own", " own ").matched).toBe(true);
  });
});

describe("filterChapters", () => {
  const chapters = [
    { id: "01", entries: [{ title: "Browse what you own" }, { title: "Upload a collection" }] },
    { id: "02", entries: [{ title: "Finding a commander" }] },
    { id: "03", entries: [{ title: "The other half of a combo" }, { title: "Combo pieces you own" }] },
  ];

  it("keeps only chapters that hold a match, each with only its matches", () => {
    const r = filterChapters(chapters, "own");
    expect(r.chapters.map((c) => c.id)).toEqual(["01", "03"]);
    expect(r.chapters[0].entries.map((e) => e.title)).toEqual(["Browse what you own"]);
    expect(r.count).toBe(2);
    expect(r.total).toBe(5);
  });

  it("returns no chapters and a zero count when nothing matches", () => {
    expect(filterChapters(chapters, "mulligan")).toEqual({ chapters: [], count: 0, total: 5 });
  });
});
