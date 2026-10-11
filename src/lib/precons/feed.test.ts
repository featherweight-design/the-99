import { describe, expect, it } from "vitest";
import {
  canReuse, commanderDeckEntries, deriveDeck, indexKey, parseFeed, PRECON_REUSE_MAX_AGE_MS,
  type IndexEntry, type PreconFeed,
} from "./feed";

const entry = (fileName: string, over: Partial<IndexEntry> = {}): IndexEntry =>
  ({ code: "CMM", fileName, name: fileName, releaseDate: "2023-08-04", type: "Commander Deck", ...over });

describe("commanderDeckEntries", () => {
  it("keeps Commander Deck alone, never the neighbouring types", () => {
    const got = commanderDeckEntries({
      meta: {},
      data: [entry("A"), entry("B", { type: "MTGO Commander Deck" }), entry("C", { type: "Brawl Deck" }), entry("D")],
    });
    expect(got.map((e) => e.fileName)).toEqual(["A", "D"]);
  });

  it("throws on an index whose data is not an array", () => {
    expect(() => commanderDeckEntries({ data: {} })).toThrow(/not an array/);
  });

  it("throws on a Commander Deck entry missing a field the ingest keys on", () => {
    expect(() => commanderDeckEntries({ data: [{ ...entry("A"), fileName: "" }] })).toThrow(/lacks/);
  });
});

describe("indexKey", () => {
  it("ignores order and moves when a deck is added", () => {
    const a = indexKey([entry("A"), entry("B")]);
    expect(indexKey([entry("B"), entry("A")])).toBe(a);
    expect(indexKey([entry("A"), entry("B"), entry("C")])).not.toBe(a);
  });
});

describe("deriveDeck", () => {
  const card = (count: number, oracle: string | undefined, printing: string | undefined) =>
    ({ count, name: "Name is never read", identifiers: { scryfallOracleId: oracle, scryfallId: printing } });

  it("keeps the commander and main board, by id, and drops the rest", () => {
    const d = deriveDeck(entry("A"), {
      data: {
        commander: [card(1, "o1", "p1")],
        mainBoard: [card(98, "o2", "p2"), card(1, undefined, "p3")],
        sideBoard: [card(5, "o9", "p9")],
        tokens: [card(1, "o8", "p8")],
        displayCommander: [card(1, "o1", "p1")],
      },
    });
    expect(d.cards).toEqual([
      { oracleId: "o1", scryfallId: "p1", count: 1, commander: true },
      { oracleId: "o2", scryfallId: "p2", count: 98, commander: false },
      { oracleId: null, scryfallId: "p3", count: 1, commander: false },
    ]);
  });

  it("throws on a deck file without its two boards", () => {
    expect(() => deriveDeck(entry("A"), { data: { mainBoard: [] } })).toThrow(/commander or mainBoard/);
  });

  it("throws on a card with no count", () => {
    expect(() => deriveDeck(entry("A"), { data: { commander: [{ identifiers: {} }], mainBoard: [] } })).toThrow(/count/);
  });
});

describe("canReuse", () => {
  const now = new Date("2026-10-11T09:00:00Z");
  const feed = (over: Partial<PreconFeed> = {}): PreconFeed =>
    ({ indexKey: "k", fetchedAt: "2026-10-10T09:00:00Z", decks: [{ fileName: "A", name: "A", code: "X", releaseDate: "2026-01-01", cards: [] }], ...over });

  it("reuses a fresh file for the same decks", () => expect(canReuse(feed(), "k", now)).toBe(true));
  it("refetches when the decks moved", () => expect(canReuse(feed(), "other", now)).toBe(false));
  it("refetches a file a week old", () => {
    const old = new Date(now.getTime() - PRECON_REUSE_MAX_AGE_MS).toISOString();
    expect(canReuse(feed({ fetchedAt: old }), "k", now)).toBe(false);
  });
  it("refetches with no cached file or an empty one", () => {
    expect(canReuse(null, "k", now)).toBe(false);
    expect(canReuse(feed({ decks: [] }), "k", now)).toBe(false);
  });
});

describe("parseFeed", () => {
  it("accepts a derived file and rejects anything else", () => {
    const ok = { indexKey: "k", fetchedAt: "t", decks: [{ fileName: "A", name: "A", code: "X", releaseDate: "d", cards: [] }] };
    expect(parseFeed(ok)).toBe(ok);
    expect(parseFeed({ ...ok, decks: [{ fileName: "A" }] })).toBeNull();
    expect(parseFeed(null)).toBeNull();
  });
});
