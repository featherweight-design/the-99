import { describe, expect, it } from "vitest";
import type { Game } from "./engine";
import { discardGame, guideSeen, loadGame, loadKept, markGuideSeen, saveGame, sweepGames } from "./storage";

class Mem {
  m = new Map<string, string>();
  get length() { return this.m.size; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const game = (tableId: string): Game => ({ config: { tableId, startingLife: 40, seats: [{ seat: 1, commanders: 1 }], first: 1, layout: "phone-2" }, log: [] });

describe("device storage", () => {
  it("keeps a game until its table's close, then clears it", () => {
    const s = new Mem();
    saveGame(s, game("a"), 1000);
    expect(loadGame(s, "a", 999)).toEqual(game("a"));
    expect(loadGame(s, "a", 1000)).toBeNull();
    expect(s.length).toBe(0);
  });
  it("reads null for a missing, corrupt or other table's entry", () => {
    const s = new Mem();
    expect(loadGame(s, "a", 0)).toBeNull();
    s.setItem("the99.tracker.a", "{nope");
    expect(loadGame(s, "a", 0)).toBeNull();
    saveGame(s, game("b"), 1000);
    s.setItem("the99.tracker.c", s.getItem("the99.tracker.b")!);
    expect(loadGame(s, "c", 0)).toBeNull();
  });
  it("sweeps expired and unreadable entries only", () => {
    const s = new Mem();
    saveGame(s, game("old"), 10);
    saveGame(s, game("live"), 1000);
    s.setItem("the99.tracker.junk", "x");
    s.setItem("other", "keep");
    sweepGames(s, 500);
    expect([...s.m.keys()].sort()).toEqual(["other", "the99.tracker.live"]);
  });
  it("discards one table's game", () => {
    const s = new Mem();
    saveGame(s, game("a"), 1000);
    discardGame(s, "a");
    expect(loadGame(s, "a", 0)).toBeNull();
  });
  it("never throws when storage does", () => {
    const boom = { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); }, key: () => { throw new Error("x"); }, length: 1 };
    expect(() => { saveGame(boom, game("a"), 1); discardGame(boom, "a"); sweepGames(boom, 1); }).not.toThrow();
    expect(loadGame(boom, "a", 0)).toBeNull();
  });
});

describe("loadKept", () => {
  it("hands back the game with the instant it stops being kept, so an Undo restores it exactly", () => {
    const s = new Mem();
    saveGame(s, game("a"), 1000);
    expect(loadKept(s, "a", 0)).toEqual({ game: game("a"), expiresAt: 1000 });
    discardGame(s, "a");
    expect(loadKept(s, "a", 0)).toBeNull();
    expect(loadKept(s, "a", 2000)).toBeNull();
  });
});

describe("the What's what flag", () => {
  it("reads unseen, then seen once marked, and never matches the game sweep", () => {
    const s = new Mem();
    expect(guideSeen(s)).toBe(false);
    markGuideSeen(s);
    expect(guideSeen(s)).toBe(true);
    const [key] = [...s.m.keys()];
    expect(key.startsWith("the99.tracker.")).toBe(false);
    sweepGames(s, 0);
    expect(guideSeen(s)).toBe(true);
  });
  it("treats storage that throws as unseen and does not throw on mark", () => {
    const bad = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(guideSeen(bad)).toBe(false);
    expect(() => markGuideSeen(bad)).not.toThrow();
  });
});
