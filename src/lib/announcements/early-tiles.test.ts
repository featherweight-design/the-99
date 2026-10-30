import { describe, expect, it } from "vitest";
import { earlyIsNew, earlyPosted, earlySeenKey, earlySeenKeys, filterEarly, listedCommanderIds, listsToCome, type EarlyTile } from "./early-tiles";
import { earlyListHref } from "./early-list";

const tile = (position: number, name: string, commander: string, identity: string[]): EarlyTile => ({
  href: earlyListHref("post-1", position), name,
  commanders: [{ oracleId: `o-${commander}`, name: commander, imageUri: null, colorIdentity: identity }],
  identity, owned: 10, of: 68,
});

describe("the early seen key (G2)", () => {
  it("is `early:<code>:<count>`, lowercase, apart from `lists:<code>`", () => {
    expect(earlySeenKey("FDC", 3)).toBe("early:fdc:3");
    expect(earlySeenKey("fdc", 3)).not.toBe("lists:fdc");
  });

  it("is news until a key at least as large as the count is held", () => {
    expect(earlyIsNew("fdc", 3, [])).toBe(true);
    expect(earlyIsNew("fdc", 3, ["early:fdc:3"])).toBe(false);
    expect(earlyIsNew("fdc", 3, ["early:fdc:5"])).toBe(false);
    // A further list lands: 3 seen, 5 posted.
    expect(earlyIsNew("fdc", 5, ["early:fdc:3"])).toBe(true);
  });

  it("is never satisfied by the set's own key, `lists:<code>`, or another set's early key", () => {
    expect(earlyIsNew("fdc", 1, ["fdc", "lists:fdc", "early:trc:9"])).toBe(true);
  });

  it("is never news with no lists", () => {
    expect(earlyIsNew("fdc", 0, [])).toBe(false);
  });

  it("writes one key per set with lists, at its count", () => {
    expect(earlySeenKeys({ fdc: { lists: [tile(0, "A", "a", ["W"]), tile(1, "B", "b", ["U"])], promised: 5 }, trc: { lists: [], promised: null } }))
      .toEqual(["early:fdc:2"]);
  });
});

describe("lists to come (STATES 3.2)", () => {
  it("counts the promised lists neither posted nor stood for by a waiting commander", () => {
    expect(listsToCome(3, 5, 1)).toBe(1);
    expect(listsToCome(5, 5, 0)).toBe(0);
    expect(listsToCome(3, 4, 2)).toBe(0);
    expect(listsToCome(3, null, 0)).toBe(0);
  });

  it("names the commanders the posted lists stand for", () => {
    expect([...listedCommanderIds([tile(0, "A", "a", ["W"]), tile(1, "B", "b", ["U"])])]).toEqual(["o-a", "o-b"]);
    // A list that gave way to its release list still stands for its commander.
    expect([...listedCommanderIds([tile(0, "A", "a", ["W"])], ["o-c"])]).toEqual(["o-a", "o-c"]);
  });
});

describe("filterEarly", () => {
  const lists = [tile(0, "Calling All Angels", "Giada", ["W"]), tile(1, "Reign of Dragons", "Lathliss", ["R"])];
  it("keeps every list with no filter", () => {
    expect(filterEarly(lists, { q: "", colours: [] }, false)).toHaveLength(2);
  });
  it("matches colours by containment, and a search by the list's or its commander's name, or the set", () => {
    expect(filterEarly(lists, { q: "", colours: ["R"] }, false).map((l) => l.name)).toEqual(["Reign of Dragons"]);
    expect(filterEarly(lists, { q: "angels", colours: [] }, false).map((l) => l.name)).toEqual(["Calling All Angels"]);
    expect(filterEarly(lists, { q: "lathliss", colours: [] }, false).map((l) => l.name)).toEqual(["Reign of Dragons"]);
    expect(filterEarly(lists, { q: "foundations", colours: [] }, true)).toHaveLength(2);
  });
});

describe("earlyPosted", () => {
  const t = (n: number): EarlyTile => ({ href: `/e/${n}`, name: `L${n}`, commanders: [], identity: [], owned: 0, of: 99 });

  it("counts the lists that gave way to their release list with the early ones, and none once no early list remains", () => {
    expect(earlyPosted(undefined)).toBe(0);
    expect(earlyPosted({ lists: [t(0), t(1)], promised: 5 })).toBe(2);
    expect(earlyPosted({ lists: [t(0), t(1), t(2)], promised: 5, releasedLists: 1 })).toBe(4);
    expect(earlyPosted({ lists: [], promised: 5, releasedLists: 3 })).toBe(0);
  });

  it("writes the seen key at the posted count, so a list releasing never lowers it", () => {
    // Seen at 3; one released and a fourth posted leaves three tiles, but four posted.
    expect(earlySeenKeys({ trc: { lists: [t(0), t(1), t(2)], promised: 5, releasedLists: 1 } })).toEqual(["early:trc:4"]);
    expect(earlySeenKeys({ trc: { lists: [], promised: 5, releasedLists: 3 } })).toEqual([]);
  });
});
