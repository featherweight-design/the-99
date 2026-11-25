import { describe, expect, it } from "vitest";
import { parseTrail, resolveFlip, TRAIL_TTL_MS, type FlipDeck } from "./flip";

const deck = (id: string, name: string, over: Partial<FlipDeck> = {}): FlipDeck => ({
  id, name, createdAt: 1000, lastPlayedAt: null, sortPosition: null, ...over,
});
const decks = [deck("a", "Alpha"), deck("b", "Bravo"), deck("c", "Charlie")];
const NOW = 1_000_000;
const trailOf = (over: Partial<{ ids: string[]; caption: string; href: string; at: number; seen: string[] }> = {}) => ({
  ids: ["c", "a", "b"], caption: "Blue", href: "/decks?folder=x", at: NOW, seen: ["a", "b", "c"], ...over,
});
const flip = (trail: ReturnType<typeof trailOf> | null, sort: string | null, id: string, list = decks) =>
  resolveFlip(list, trail, sort, id, NOW);

describe("resolveFlip", () => {
  it("follows the trail's order and wraps at both ends", () => {
    const mid = flip(trailOf(), null, "a")!;
    expect([mid.k, mid.n, mid.prev.id, mid.next.id, mid.caption, mid.href]).toEqual([2, 3, "c", "b", "Blue", "/decks?folder=x"]);
    expect(flip(trailOf(), null, "c")!.prev.id).toBe("b");
    expect(flip(trailOf(), null, "b")!.next.id).toBe("c");
  });

  it("with no trail, steps All decks in the saved sort and names no shelf", () => {
    const f = flip(null, "name", "b")!;
    expect([f.k, f.prev.id, f.next.id, f.caption, f.href]).toEqual([2, "a", "c", null, "/decks"]);
    const newest = [deck("a", "Alpha", { createdAt: 1 }), deck("b", "Bravo", { createdAt: 3 }), deck("c", "Charlie", { createdAt: 2 })];
    expect(flip(null, "newest", "b", newest)!.k).toBe(1);
  });

  it("ignores a trail the chain from the list never reached this deck by", () => {
    // Opened from Home: the deck is in the list's ids but not in what the reader flipped through.
    const f = flip(trailOf({ seen: ["a"] }), "name", "c")!;
    expect([f.caption, f.href, f.k]).toEqual([null, "/decks", 3]);
  });

  it("ignores a trail older than its lifetime, and keeps one at the edge", () => {
    expect(flip(trailOf({ at: NOW - TRAIL_TTL_MS - 1 }), "name", "a")!.caption).toBeNull();
    expect(flip(trailOf({ at: NOW - TRAIL_TTL_MS }), "name", "a")!.caption).toBe("Blue");
  });

  it("drops a deck deleted since the trail, and falls back when the trail lacks this deck", () => {
    const f = flip(trailOf({ ids: ["a", "gone", "b"], caption: "X", href: "/decks" }), null, "a")!;
    expect([f.n, f.next.id]).toEqual([2, "b"]);
    const stale = flip(trailOf({ ids: ["a", "b"], caption: "X", href: "/decks" }), "name", "c")!;
    expect([stale.caption, stale.n]).toEqual([null, 3]);
  });

  it("has nothing to flip to for one deck", () => {
    expect(flip(null, null, "a", [deck("a", "Alpha")])).toBeNull();
    expect(flip(null, null, "zzz")).toBeNull();
  });

  it("reads an unknown stored sort as the default", () => {
    const played = [deck("a", "Alpha"), deck("b", "Bravo", { lastPlayedAt: 5 }), deck("c", "Charlie", { lastPlayedAt: 9 })];
    // Last played first, never played last: c, b, a. Name order would read a, b, c.
    const f = flip(null, "nonsense", "b", played)!;
    expect([f.k, f.prev.id, f.next.id]).toEqual([2, "c", "a"]);
  });
});

describe("parseTrail", () => {
  const ok = { ids: ["a"], caption: "Fixture caption", href: "/decks?sort=name", at: 1, seen: ["a"] };
  it("accepts a trail and refuses anything else, including a return link off /decks", () => {
    expect(parseTrail(JSON.stringify(ok))).not.toBeNull();
    expect(parseTrail(JSON.stringify({ ...ok, href: "https://evil.example/" }))).toBeNull();
    expect(parseTrail(JSON.stringify({ ...ok, href: "/decksfoo" }))).toBeNull();
    expect(parseTrail(JSON.stringify({ ...ok, ids: [1] }))).toBeNull();
    expect(parseTrail(JSON.stringify({ ...ok, seen: undefined }))).toBeNull();
    expect(parseTrail(JSON.stringify({ ...ok, at: "now" }))).toBeNull();
    expect(parseTrail("not json")).toBeNull();
    expect(parseTrail(null)).toBeNull();
  });
});
