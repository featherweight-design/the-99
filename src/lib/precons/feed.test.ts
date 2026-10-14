import { afterEach, describe, expect, it, vi } from "vitest";
import {
  canReuse, commanderDeckEntries, deriveDeck, fetchDeckListIndex, indexKey, parseFeed, PRECON_REUSE_MAX_AGE_MS, retryDelayMs,
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

  it("keeps the commander, the main board and the tokens, by id, and drops the rest", () => {
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
      { oracleId: "o1", scryfallId: "p1", count: 1, commander: true, foil: false },
      { oracleId: "o2", scryfallId: "p2", count: 98, commander: false, foil: false },
      { oracleId: null, scryfallId: "p3", count: 1, commander: false, foil: false },
    ]);
    expect(d.tokens).toEqual([{ scryfallId: "p8", count: 1 }]);
  });

  it("keeps MTGJSON's isFoil per card, and reads a file with no tokens as none", () => {
    const d = deriveDeck(entry("A"), {
      data: { commander: [{ ...card(1, "o1", "p1"), isFoil: true }], mainBoard: [{ ...card(99, "o2", "p2"), isFoil: false }] },
    });
    expect(d.cards.map((c) => c.foil)).toEqual([true, false]);
    expect(d.tokens).toEqual([]);
  });

  it("throws on a deck file without its two boards", () => {
    expect(() => deriveDeck(entry("A"), { data: { mainBoard: [] } })).toThrow(/commander or mainBoard/);
  });

  it("throws on a token with no count, rather than inventing one", () => {
    expect(() => deriveDeck(entry("A"), { data: { commander: [], mainBoard: [], tokens: [{ identifiers: { scryfallId: "t" } }] } })).toThrow(/token entry/);
  });

  it("throws on a card with no count", () => {
    expect(() => deriveDeck(entry("A"), { data: { commander: [{ identifiers: {} }], mainBoard: [] } })).toThrow(/count/);
  });
});

describe("canReuse", () => {
  const now = new Date("2026-10-11T09:00:00Z");
  const feed = (over: Partial<PreconFeed> = {}): PreconFeed =>
    ({ indexKey: "k", fetchedAt: "2026-10-10T09:00:00Z", decks: [{ fileName: "A", name: "A", code: "X", releaseDate: "2026-01-01", cards: [], tokens: [] }], ...over });

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
    const ok = { indexKey: "k", fetchedAt: "t", decks: [{ fileName: "A", name: "A", code: "X", releaseDate: "d", cards: [], tokens: [] }] };
    expect(parseFeed(ok)).toBe(ok);
    expect(parseFeed({ ...ok, decks: [{ fileName: "A" }] })).toBeNull();
    const withCards = (cards: unknown[]) => ({ ...ok, decks: [{ ...ok.decks[0], cards }] });
    expect(parseFeed(withCards([{ oracleId: "o", scryfallId: null, count: 2, commander: false, foil: false }]))).not.toBeNull();
    expect(parseFeed(withCards([{ oracleId: "o", scryfallId: null, count: 0, commander: false, foil: false }]))).toBeNull();
    expect(parseFeed(withCards([{ oracleId: 7, scryfallId: null, count: 1, commander: false, foil: false }]))).toBeNull();
    expect(parseFeed(withCards([{ oracleId: "o", scryfallId: null, count: 1, foil: false }]))).toBeNull();
    // A file cached before foil and tokens were kept reads as no cache, so the next fetch brings them.
    expect(parseFeed(withCards([{ oracleId: "o", scryfallId: null, count: 1, commander: false }]))).toBeNull();
    expect(parseFeed({ ...ok, decks: [{ fileName: "A", name: "A", code: "X", releaseDate: "d", cards: [] }] })).toBeNull();
    expect(parseFeed({ ...ok, decks: [{ ...ok.decks[0], tokens: [{ scryfallId: "t", count: 0 }] }] })).toBeNull();
    expect(parseFeed(null)).toBeNull();
  });
});

describe("fetching with retries", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  const reply = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers });

  it("asks again after a 503 and a 429, then takes the answer", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply(503))
      .mockResolvedValueOnce(reply(429, {}, { "retry-after": "1" }))
      .mockResolvedValueOnce(reply(200, { data: [] }));
    vi.stubGlobal("fetch", fetchMock);
    const got = fetchDeckListIndex();
    await vi.runAllTimersAsync();
    await expect(got).resolves.toEqual({ data: [] });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("asks again after a network error", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(reply(200, { ok: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    const got = fetchDeckListIndex();
    await vi.runAllTimersAsync();
    await expect(got).resolves.toEqual({ ok: 1 });
  });

  it("fails at once on a 404, and after three attempts on a 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply(404)));
    await expect(fetchDeckListIndex()).rejects.toThrow(/404/);
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(reply(503));
    vi.stubGlobal("fetch", fetchMock);
    const got = fetchDeckListIndex();
    const settled = expect(got).rejects.toThrow(/503/);
    await vi.runAllTimersAsync();
    await settled;
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("waits what Retry-After says, capped at a minute, and backs off otherwise", () => {
    expect(retryDelayMs(1, "5")).toBe(5_000);
    expect(retryDelayMs(1, "600")).toBe(60_000);
    expect(retryDelayMs(1, null)).toBe(2_000);
    expect(retryDelayMs(2, "soon")).toBe(4_000);
  });
});
