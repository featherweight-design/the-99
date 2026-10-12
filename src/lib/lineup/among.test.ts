import { describe, expect, it } from "vitest";
import { defaultChosen, jobsGrid, median, strip, worth } from "./among";
import type { LineupBuild, LineupDeck } from "./types";

const build = (over: Partial<LineupBuild> = {}): LineupBuild => ({ manaValue: 3, lands: 36, ramp: 10, draw: 10, removal: 8, valueCents: 10000, ...over });
const deck = (name: string, over: Partial<LineupDeck> = {}): LineupDeck => ({ id: name, name, identity: [], brew: false, bracket: null, games: [], build: build(), basis: name, ...over });

describe("median", () => {
  it("takes the middle value, or the mean of the two middle ones", () => {
    expect([median([3, 1, 2]), median([4, 1, 2, 3])]).toEqual([2, 2.5]);
  });
});

describe("strip", () => {
  const ds = [deck("a", { build: build({ ramp: 20 }) }), deck("b", { build: build({ ramp: 10 }) }), deck("c", { build: build({ ramp: 10 }) }), deck("d", { build: build({ ramp: 4 }) })];

  it("ranks most first, says when the figure is tied, and places the median and both ends", () => {
    const s = strip(ds, ds[1], "ramp")!;
    expect(s.chosen).toEqual({ value: 10, at: 6 / 16, rank: 2, tied: true });
    expect([s.lo, s.hi, s.median.value, s.total]).toEqual([4, 20, 10, 4]);
    expect(s.others.map((o) => o.id)).toEqual(["a", "c", "d"]);
    expect(strip(ds, ds[0], "ramp")!.chosen).toMatchObject({ rank: 1, tied: false, at: 1 });
  });

  it("leaves a deck without the figure out of the rank, and has no strip for a chosen deck without one", () => {
    const withNull = [...ds, deck("e", { build: build({ manaValue: null }) }), deck("f", { build: null })];
    expect(strip(withNull, withNull[0], "manaValue")!.total).toBe(4);
    expect(strip(withNull, withNull[4], "manaValue")).toBeNull();
  });

  it("centres every deck when all hold the same figure", () => {
    expect(strip([deck("a"), deck("b")], deck("a"), "lands")!.chosen.at).toBe(0.5);
  });
});

describe("defaultChosen", () => {
  it("is the deck played most recently, else the first by name", () => {
    const g = (d: string) => ({ result: "win" as const, playedAt: `${d}T20:00:00.000Z`, podSize: 4 });
    expect(defaultChosen([deck("b", { games: [g("2026-09-01")] }), deck("a"), deck("c", { games: [g("2026-10-01")] })])?.name).toBe("c");
    expect(defaultChosen([deck("b"), deck("a")])?.name).toBe("a");
    expect(defaultChosen([])).toBeNull();
  });
});

describe("worth", () => {
  it("draws each deck's own value most first or by name, with the sum, the most and the median", () => {
    const ds = [deck("b", { build: build({ valueCents: 100 }) }), deck("a", { build: build({ valueCents: 300 }) }), deck("c", { build: build({ valueCents: 200 }) }), deck("x", { build: null })];
    const w = worth(ds, "most");
    expect(w.rows.map((r) => [r.deck.name, r.share])).toEqual([["a", 1], ["c", 2 / 3], ["b", 1 / 3]]);
    expect([w.sumCents, w.maxCents, w.medianCents]).toEqual([600, 300, 200]);
    expect(worth(ds, "name").rows.map((r) => r.deck.name)).toEqual(["a", "b", "c"]);
  });
});

describe("jobsGrid", () => {
  it("sorts by the chosen column most first, then by name, and shades within each column", () => {
    const ds = [deck("b", { build: build({ ramp: 10, draw: 2 }) }), deck("a", { build: build({ ramp: 10, draw: 6 }) }), deck("c", { build: build({ ramp: 30, draw: 4 }) })];
    const g = jobsGrid(ds, "ramp");
    expect(g.rows.map((r) => r.deck.name)).toEqual(["c", "a", "b"]);
    expect(g.rows[0].cells.find((c) => c.key === "ramp")!.shade).toBe(1);
    expect(g.rows[1].cells.find((c) => c.key === "draw")!.shade).toBe(1);
    expect(g.rows[2].cells.find((c) => c.key === "draw")!.shade).toBe(0);
    expect(jobsGrid(ds, "draw").rows.map((r) => r.deck.name)).toEqual(["a", "c", "b"]);
  });
});
