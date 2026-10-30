import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { earlyListsQuery, earlyTileOf, mergeEarlySet, releasedCommandersQuery } from "./early-tiles-read";
import type { EarlyTile } from "./early-tiles";

describe("earlyListsQuery", () => {
  it("reads recent Commander decklists posts' lists that declare a commander, in post order", () => {
    const { sql, params } = earlyListsQuery(new Date("2026-03-01T00:00:00Z"), db).toSQL();
    expect(sql).toContain('inner join "wizards_announcements" on "wizards_announcements"."id" = "wizards_announcement_decklists"."announcement_id"');
    expect(sql).toContain('"wizards_announcements"."kind" = $');
    expect(sql).toContain('"wizards_announcements"."published_at" >= $');
    expect(sql).toContain('"wizards_announcement_decklists"."commander_name" is not null');
    expect(sql).toContain('order by "wizards_announcements"."published_at", "wizards_announcement_decklists"."position"');
    expect(params[0]).toBe("commander-decklists");
  });
});

describe("releasedCommandersQuery", () => {
  it("qualifies both tables of its join and keeps plain-edition commanders only", () => {
    const { sql } = releasedCommandersQuery(["c1", "c2"], db).toSQL();
    expect(sql).toContain('select distinct "precon_cards"."oracle_id", "precons"."set_code"');
    expect(sql).toContain('inner join "precons" on "precons"."file_name" = "precon_cards"."file_name"');
    expect(sql).toContain('"precon_cards"."is_commander" = $');
    expect(sql).toContain('"precons"."twin_of" is null');
  });
});

describe("mergeEarlySet", () => {
  const tile = (n: number): EarlyTile => ({ href: `/decks/precons/early/p/${n}`, name: `List ${n}`, commanders: [], identity: [], identityKnown: true, owned: 0, of: 99 });

  it("keeps a post's promise and released lists when every one of its lists gave way, whichever post comes first", () => {
    const early = { lists: [tile(1)], promised: 3, released: ["a"], releasedLists: 0 };
    const allGaveWay = { lists: [], promised: 5, released: ["b", "c"], releasedLists: 2 };
    const want = { lists: [tile(1)], promised: 5, released: ["a", "b", "c"], releasedLists: 2 };
    expect(mergeEarlySet(mergeEarlySet(undefined, early), allGaveWay)).toEqual(want);
    expect(mergeEarlySet(mergeEarlySet(undefined, allGaveWay), early)).toEqual({ ...want, released: ["b", "c", "a"] });
  });

  it("reads the larger promise, and a post that promised none defers to one that did", () => {
    expect(mergeEarlySet({ lists: [], promised: null }, { lists: [tile(0)], promised: 4 }).promised).toBe(4);
    expect(mergeEarlySet({ lists: [tile(0)], promised: 4 }, { lists: [], promised: null }).promised).toBe(4);
  });
});

describe("earlyTileOf", () => {
  const tana = { oracleId: "unmatched:Tana, the Bloodsower", name: "Tana, the Bloodsower", imageUri: null, colorIdentity: [] as string[] };
  const tymna = { oracleId: "tymna", name: "Tymna the Weaver", imageUri: null, colorIdentity: ["W", "B"] };
  const page = (commanders: (typeof tana)[], identity: string[], unknownCommanders: string[]) =>
    ({ precon: { row: { name: "Party Time", commanders, identity, owned: 12, of: 68 } }, unknownCommanders });

  it("keeps the page's figures, and calls the identity known when every commander matched", () => {
    expect(earlyTileOf("/decks/precons/early/p/0", page([tymna], ["W", "B"], []))).toEqual({
      href: "/decks/precons/early/p/0", name: "Party Time", commanders: [tymna], identity: ["W", "B"], identityKnown: true, owned: 12, of: 68,
    });
  });

  it("calls the identity unknown when a commander the catalog cannot match yet leaves it empty", () => {
    const tile = earlyTileOf("/e/1", page([tana], [], [tana.oracleId]));
    expect(tile.identityKnown).toBe(false);
    expect(tile.commanders).toEqual([tana]);
  });

  it("calls a partly matched pair's identity unknown, never its known partner's colors as the whole", () => {
    const tile = earlyTileOf("/e/2", page([tana, tymna], ["W", "B"], [tana.oracleId]));
    expect(tile.identityKnown).toBe(false);
    expect(tile.identity).toEqual(["W", "B"]);
  });
});
