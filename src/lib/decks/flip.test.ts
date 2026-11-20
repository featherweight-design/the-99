import { describe, expect, it } from "vitest";
import { parseTrail, resolveFlip, type FlipDeck } from "./flip";

const deck = (id: string, name: string, over: Partial<FlipDeck> = {}): FlipDeck => ({
  id, name, createdAt: 1000, lastPlayedAt: null, sortPosition: null, ...over,
});
const decks = [deck("a", "Alpha"), deck("b", "Bravo"), deck("c", "Charlie")];

describe("resolveFlip", () => {
  it("follows the trail's order and wraps at both ends", () => {
    const trail = { ids: ["c", "a", "b"], caption: "Blue", href: "/decks?folder=x" };
    const mid = resolveFlip(decks, trail, null, "a")!;
    expect([mid.k, mid.n, mid.prev.id, mid.next.id, mid.caption, mid.href]).toEqual([2, 3, "c", "b", "Blue", "/decks?folder=x"]);
    expect(resolveFlip(decks, trail, null, "c")!.prev.id).toBe("b");
    expect(resolveFlip(decks, trail, null, "b")!.next.id).toBe("c");
  });

  it("with no trail, steps All decks in the saved sort and names no shelf", () => {
    const f = resolveFlip(decks, null, "name", "b")!;
    expect([f.k, f.prev.id, f.next.id, f.caption, f.href]).toEqual([2, "a", "c", null, "/decks"]);
    const newest = [deck("a", "Alpha", { createdAt: 1 }), deck("b", "Bravo", { createdAt: 3 }), deck("c", "Charlie", { createdAt: 2 })];
    expect(resolveFlip(newest, null, "newest", "b")!.k).toBe(1);
  });

  it("drops a deck deleted since the trail, and falls back when the trail lacks this deck", () => {
    const f = resolveFlip(decks, { ids: ["a", "gone", "b"], caption: "X", href: "/decks" }, null, "a")!;
    expect([f.n, f.next.id]).toEqual([2, "b"]);
    const stale = resolveFlip(decks, { ids: ["a", "b"], caption: "X", href: "/decks" }, "name", "c")!;
    expect([stale.caption, stale.n]).toEqual([null, 3]);
  });

  it("has nothing to flip to for one deck", () => {
    expect(resolveFlip([deck("a", "Alpha")], null, null, "a")).toBeNull();
    expect(resolveFlip(decks, null, null, "zzz")).toBeNull();
  });

  it("reads an unknown stored sort as the default", () => {
    const played = [deck("a", "Alpha"), deck("b", "Bravo", { lastPlayedAt: 5 }), deck("c", "Charlie", { lastPlayedAt: 9 })];
    // Last played first, never played last: c, b, a. Name order would read a, b, c.
    const f = resolveFlip(played, null, "nonsense", "b")!;
    expect([f.k, f.prev.id, f.next.id]).toEqual([2, "c", "a"]);
  });
});

describe("parseTrail", () => {
  it("accepts a trail and refuses anything else, including a return link off /decks", () => {
    expect(parseTrail(JSON.stringify({ ids: ["a"], caption: "All decks", href: "/decks?sort=name" }))).not.toBeNull();
    expect(parseTrail(JSON.stringify({ ids: ["a"], caption: "x", href: "https://evil.example/" }))).toBeNull();
    expect(parseTrail(JSON.stringify({ ids: ["a"], caption: "x", href: "/decksfoo" }))).toBeNull();
    expect(parseTrail(JSON.stringify({ ids: [1], caption: "x", href: "/decks" }))).toBeNull();
    expect(parseTrail("not json")).toBeNull();
    expect(parseTrail(null)).toBeNull();
  });
});
