import { describe, expect, it } from "vitest";
import { announcedSetAnchor, earlyListHref, isWizardsPostUrl, parseListPosition, resolvePostSet, splitEarlyLines, type EarlyCardFacts } from "./early-list";

describe("earlyListHref", () => {
  it("is the early route with the post's id and the list's position", () => {
    expect(earlyListHref("7lx5sD7iX53db5PBU", 2)).toBe("/decks/precons/early/7lx5sD7iX53db5PBU/2");
  });

  it("encodes an id that is not a plain path segment", () => {
    expect(earlyListHref("a/b c?", 0)).toBe("/decks/precons/early/a%2Fb%20c%3F/0");
  });
});

describe("announcedSetAnchor", () => {
  it("names the set block by its lowercased code", () => {
    expect(announcedSetAnchor("FDC")).toBe("announced-fdc");
    expect(announcedSetAnchor("trc")).toBe("announced-trc");
  });
});

describe("parseListPosition", () => {
  it("reads a plain non-negative integer", () => {
    expect(parseListPosition("0")).toBe(0);
    expect(parseListPosition("4")).toBe(4);
  });

  it.each(["", "-1", "1.5", "1e2", "abc", " 2", "0x1", "9999999"])("refuses %j", (segment) => {
    expect(parseListPosition(segment)).toBeNull();
  });
});

describe("isWizardsPostUrl", () => {
  it("accepts an https page on magic.wizards.com", () => {
    expect(isWizardsPostUrl("https://magic.wizards.com/en/news/announcements/foundations-commander-decklists")).toBe(true);
  });

  it.each([
    "http://magic.wizards.com/en/news/x",
    "https://evil.example/magic.wizards.com",
    "https://magic.wizards.com.evil.example/x",
    "javascript:alert(1)",
    "not a url",
  ])("refuses %j", (url) => {
    expect(isWizardsPostUrl(url)).toBe(false);
  });
});

describe("resolvePostSet", () => {
  const p = (oracleId: string, setCode: string, releasedAt = "2026-11-13") => ({ oracleId, setCode, releasedAt });

  it("takes the set most of the post's lists' commanders are printed in", () => {
    // `c` is a reprint also printed in an older Commander set: one list cannot move the post.
    const set = resolvePostSet(["a", "b", "c"], [p("a", "fdc"), p("b", "fdc"), p("c", "fdc"), p("c", "old", "2026-09-01")]);
    expect(set).toBe("fdc");
  });

  it("is null when no commander is printed in a candidate set", () => {
    expect(resolvePostSet(["a", null], [p("z", "fdc")])).toBeNull();
    expect(resolvePostSet([], [])).toBeNull();
  });

  it("skips a list whose commander the catalog could not match", () => {
    expect(resolvePostSet([null, "a"], [p("a", "fdc")])).toBe("fdc");
  });

  it("breaks a tie by the earlier release, then the lower code, whatever the row order", () => {
    const rows = [p("a", "late", "2026-12-01"), p("b", "early", "2026-11-13")];
    expect(resolvePostSet(["a", "b"], rows)).toBe("early");
    expect(resolvePostSet(["a", "b"], [...rows].reverse())).toBe("early");
    expect(resolvePostSet(["a", "b"], [p("a", "zzz"), p("b", "aaa")])).toBe("aaa");
  });

  it("resolves a set of another type that holds the precons (CMM, a masters set)", () => {
    // The read hands a non-`commander` set over once it holds precons; the vote treats it as any other.
    expect(resolvePostSet(["a", "b"], [p("a", "cmm", "2023-08-04"), p("b", "cmm", "2023-08-04")])).toBe("cmm");
  });

  it("compares codes lowercase, as `sets.code` stores them", () => {
    expect(resolvePostSet(["a"], [p("a", "FDC")])).toBe("fdc");
  });
});

describe("splitEarlyLines", () => {
  const facts = (oracleId: string, name: string): EarlyCardFacts => ({
    oracleId, name, typeLine: "Creature", manaCost: null, layout: "normal", colorIdentity: [], imageUri: null, legal: true,
  });

  it("keeps the matched cards in post order and the unmatched lines by the post's words", () => {
    const { matched, unmatched } = splitEarlyLines(
      [
        { name: "Giada, Font of Hope", count: 1, cardId: "g" },
        { name: "Seraph of the Dawnfire", count: 1, cardId: null },
        { name: "Sol Ring", count: 1, cardId: "s" },
      ],
      new Map([["g", facts("g", "Giada, Font of Hope")], ["s", facts("s", "Sol Ring")]]),
    );
    expect(matched.map((m) => m.facts.name)).toEqual(["Giada, Font of Hope", "Sol Ring"]);
    expect(unmatched).toEqual([{ name: "Seraph of the Dawnfire", count: 1 }]);
  });

  it("reads a matched card that has left the catalog as unmatched, never dropping it", () => {
    const { matched, unmatched } = splitEarlyLines([{ name: "Gone", count: 2, cardId: "x" }], new Map());
    expect(matched).toEqual([]);
    expect(unmatched).toEqual([{ name: "Gone", count: 2 }]);
  });
});
