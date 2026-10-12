import { describe, expect, it } from "vitest";
import { byName, daysAgo, fullestSlot, podSizes, recency, scoped, slotOf, spread } from "./figures";
import type { LineupDeck, LineupGame } from "./types";

const game = (playedAt: string, result: LineupGame["result"] = "loss", podSize = 4): LineupGame => ({ result, playedAt: `${playedAt}T20:00:00.000Z`, podSize });
const deck = (name: string, over: Partial<LineupDeck> = {}): LineupDeck => ({ id: name, name, identity: [], brew: false, bracket: null, games: [], ...over });
const NOW = "2026-10-11T12:00:00.000Z";

describe("scoped", () => {
  it("leaves the brews out under Finished only, and nothing else", () => {
    const ds = [deck("a"), deck("b", { brew: true })];
    expect(scoped(ds, "all").map((d) => d.name)).toEqual(["a", "b"]);
    expect(scoped(ds, "finished").map((d) => d.name)).toEqual(["a"]);
  });
});

describe("recency", () => {
  const ds = [
    deck("Tovolar", { games: [game("2026-09-12", "loss", 4), game("2026-07-17", "loss", 3)] }),
    deck("Scrappy", { games: [game("2026-10-05", "win", 4)] }),
    deck("Brago"),
    deck("aang"),
  ];

  it("lays played decks out newest game first, and keeps every never-played deck, by name", () => {
    const r = recency(ds, NOW);
    expect(r.lanes.map((l) => l.deck.name)).toEqual(["Scrappy", "Tovolar"]);
    expect(r.never.map((d) => d.name)).toEqual(["aang", "Brago"]);
  });

  it("counts the record raw, with the pod sizes each game had", () => {
    const r = recency(ds, NOW);
    expect([r.wins, r.games, r.pods]).toEqual([1, 3, [3, 4]]);
    expect(r.lanes[1]).toMatchObject({ wins: 0, games: 2, pods: [3, 4], ago: 29 });
    expect(r.lastAgo).toBe(6);
  });

  it("puts the first game in scope at the left edge and today at the right, beads oldest first", () => {
    const r = recency(ds, NOW);
    expect(r.lanes[1].beads[0]).toEqual({ result: "loss", at: 0 });
    // Jul 17 to Oct 5 is 80 days of the 86 to today.
    expect(r.lanes[0].beads[0].at).toBeCloseTo(80 / 86, 5);
    expect(r.lanes[0].lastAt).toBeCloseTo(80 / 86, 5);
    expect(r.axis?.months.map((m) => m.label)).toEqual(["Aug", "Sep", "Oct"]);
  });

  it("has no lanes and no axis with no games, and every deck is never played", () => {
    const r = recency([deck("a"), deck("b")], NOW);
    expect([r.lanes, r.axis, r.lastAgo, r.never.length]).toEqual([[], null, null, 2]);
  });
});

describe("daysAgo and podSizes", () => {
  it("counts calendar days, and sorts distinct pod sizes", () => {
    expect(daysAgo("2026-10-10T23:59:00.000Z", "2026-10-11T00:01:00.000Z")).toBe(1);
    expect(daysAgo(NOW, NOW)).toBe(0);
    expect(podSizes([game("2026-01-01", "win", 5), game("2026-01-02", "win", 3), game("2026-01-03", "win", 5)])).toEqual([3, 5]);
  });
});

describe("spread", () => {
  it("puts a single bracket on its own row and a pair of two on the boundary row between them", () => {
    expect([slotOf([1]), slotOf([1, 2]), slotOf([4, 5]), slotOf([5]), slotOf([2, 4])]).toEqual([0, 1, 7, 8, null]);
  });

  it("files each deck by its own stored range, and every other deck under not analyzed", () => {
    const s = spread([
      deck("Goblins", { bracket: { permits: [4, 5], answered: 4 }, identity: ["R"] }),
      deck("Brago", { bracket: { permits: [4], answered: null }, identity: ["W", "U"] }),
      deck("Elves", { identity: ["G"] }),
      deck("Eldrazi", { bracket: { permits: [3], answered: null } }),
    ]);
    expect(s.slots.map((x) => x.decks.map((d) => d.name))).toEqual([[], [], [], [], ["Eldrazi"], [], ["Brago"], ["Goblins"], []]);
    expect(s.notAnalyzed.map((d) => d.name)).toEqual(["Elves"]);
    expect(s.analyzed).toBe(3);
    expect(s.slots[7].brackets).toEqual([4, 5]);
    expect(s.colors.map((c) => [c.color, c.decks.length])).toEqual([["W", 1], ["U", 1], ["B", 0], ["R", 1], ["G", 1], ["C", 1]]);
    expect(s.sizes).toEqual([1, 2, 1, 0, 0, 0]);
    expect(fullestSlot(s)?.label).toBe("3");
  });

  it("names no fullest slot when nothing is analyzed", () => {
    expect(fullestSlot(spread([deck("a")]))).toBeNull();
  });
});

describe("byName", () => {
  it("orders by code point, ignoring case", () => {
    expect(["b", "A", "a"].sort(byName)).toEqual(["A", "a", "b"]);
  });
});
