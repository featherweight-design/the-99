import { describe, expect, it, vi } from "vitest";
import { aboutEntries } from "../copy/about-entries";
import { filterChapters, matchTitle, searchEntries } from "./search";
import { visibleEntries } from "./visible";

describe("matchTitle", () => {
  it("folds case the same in every locale", () => {
    // A Turkish-locale fold, where `I` becomes dotless `ı`.
    const turkish = vi
      .spyOn(String.prototype, "toLocaleLowerCase")
      .mockImplementation(function (this: string) {
        return this.replace(/I/g, "ı").toLowerCase();
      });
    try {
      expect(matchTitle("Import", "i").matched).toBe(true);
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

describe("searchEntries", () => {
  const entry = (id: string, title: string, caption = "", keys: string[] = []) => ({ id, title, caption, keys });

  it("matches the title, then the caption, then the keys, and splits the first field that holds the query", () => {
    const hits = searchEntries([
      entry("a", "Import a collection"),
      entry("b", "Shopping", "Every card you still need to buy."),
      entry("c", "Stats", "Counts.", ["Buy what the deck is missing."]),
      entry("d", "Notes", "Nothing here."),
    ], "buy");
    expect(hits.map((h) => [h.entry.id, h.field, h.before + "[" + h.hit + "]" + h.after])).toEqual([
      ["b", "caption", "Every card you still need to [buy]."],
      ["c", "key", "[Buy] what the deck is missing."],
    ]);
  });

  it("hits an entry once, by its earliest field", () => {
    const hits = searchEntries([entry("a", "Deck stats", "Stats for a deck.", ["stats"])], "stats");
    expect(hits).toHaveLength(1);
    expect(hits[0].field).toBe("title");
  });

  it("matches nothing for a blank query, and reads a pattern character literally", () => {
    expect(searchEntries([entry("a", "x")], "  ")).toEqual([]);
    expect(searchEntries([entry("a", "Plus (+1) counters")], "(+1")).toHaveLength(1);
  });

  it("never matches a caption line its switch strips from the resolved entry", () => {
    const off = visibleEntries({ TUNING_ENABLED: "false" } as unknown as NodeJS.ProcessEnv, aboutEntries);
    const on = visibleEntries({ TUNING_ENABLED: "true", ANALYSIS_TAB_ENABLED: "true" } as unknown as NodeJS.ProcessEnv, aboutEntries);
    const q = "Each “Suggested changes” run";
    expect(searchEntries(off, q).map((h) => h.entry.id)).not.toContain("credits");
    expect(searchEntries(on, q).map((h) => h.entry.id)).toContain("credits");
  });
});
