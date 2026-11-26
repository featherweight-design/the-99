import { describe, expect, it } from "vitest";
import { summarizeGames, type DeckGame } from "./games";

function game(over: Partial<DeckGame> = {}): DeckGame {
  return {
    id: "g",
    result: "win",
    podSize: 4,
    playedAt: new Date("2026-09-01"),
    versionNumber: null,
    note: null,
    worked: [],
    hurt: [],
    ...over,
  };
}

describe("summarizeGames", () => {
  it("returns an empty summary for no games", () => {
    const s = summarizeGames([]);
    expect(s.count).toBe(0);
    expect(s.marked).toBe(0);
    expect(s.record).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(s.axes).toEqual([]);
    expect(s.keep).toEqual([]);
    expect(s.fix).toEqual([]);
    expect(s.mixed).toEqual([]);
  });

  it("counts the record across all three results", () => {
    const s = summarizeGames([
      game({ result: "win" }),
      game({ result: "win" }),
      game({ result: "loss" }),
      game({ result: "draw" }),
    ]);
    expect(s.count).toBe(4);
    expect(s.record).toEqual({ wins: 2, losses: 1, draws: 1 });
  });

  // One game can mark several axes, so the tallies cannot be summed to reach
  // this figure — it counts games, not marks.
  it("counts marked games once however many axes they carry", () => {
    const s = summarizeGames([
      game({ worked: ["mana", "board"], hurt: ["speed"] }),
      game(),
      game({ hurt: ["mana"] }),
    ]);
    expect(s.marked).toBe(2);
  });

  // An axis nobody has ever marked is absent, not a zero row — otherwise the
  // panel would draw eight cells at N=1 for one marked axis.
  it("omits an axis with no marks", () => {
    const s = summarizeGames([game({ worked: ["mana"] })]);
    expect(s.axes.map((a) => a.key)).toEqual(["mana"]);
  });

  it("buckets by net, and mixed is exactly net zero", () => {
    const s = summarizeGames([
      game({ worked: ["mana", "board"], hurt: ["card_flow"] }),
      game({ worked: ["board"], hurt: ["mana", "card_flow"] }),
    ]);
    expect(s.keep.map((a) => a.key)).toEqual(["board"]);
    expect(s.fix.map((a) => a.key)).toEqual(["card_flow"]);
    expect(s.mixed.map((a) => a.key)).toEqual(["mana"]);
  });

  it("orders each bucket by absolute net, then by key", () => {
    const s = summarizeGames([
      game({ hurt: ["card_flow", "mana", "speed"] }),
      game({ hurt: ["card_flow", "mana"] }),
      game({ hurt: ["card_flow"] }),
    ]);
    // card_flow at -3 leads; mana and speed at -2 and -1 follow by magnitude.
    expect(s.fix.map((a) => a.key)).toEqual(["card_flow", "mana", "speed"]);

    const tied = summarizeGames([game({ hurt: ["mana", "board"] })]);
    // Equal magnitude falls back to the vocabulary order, not alphabetical:
    // mana precedes board in GAME_AXIS_KEYS, though board sorts first by name.
    expect(tied.fix.map((a) => a.key)).toEqual(["mana", "board"]);
  });

  // The buckets rank; the flat list does not. It is what the N=1 panel draws,
  // where an ordering would be a claim about a single game.
  it("keeps the flat axis list in vocabulary order whatever the strengths", () => {
    const s = summarizeGames([
      game({ hurt: ["card_flow", "speed"] }),
      game({ hurt: ["card_flow"] }),
    ]);
    // speed precedes card_flow in GAME_AXIS_KEYS, though card_flow is stronger.
    expect(s.axes.map((a) => a.key)).toEqual(["speed", "card_flow"]);
    expect(s.fix.map((a) => a.key)).toEqual(["card_flow", "speed"]);
  });

  it("carries both counts so the cell can print a denominator", () => {
    const s = summarizeGames([
      game({ worked: ["mana"] }),
      game({ hurt: ["mana"] }),
      game({ worked: ["mana"] }),
    ]);
    expect(s.axes[0]).toMatchObject({ key: "mana", worked: 2, hurt: 1, net: 1 });
  });

  // The tiles' dot row: games arrive newest first, the row reads oldest first.
  it("reads each axis across the last ten games, oldest first", () => {
    const s = summarizeGames([game({ hurt: ["mana"] }), game(), game({ worked: ["mana"] })]);
    expect(s.axes[0].recent).toEqual(["worked", null, "hurt"]);
  });

  it("stops the sequence at ten games while the totals keep counting", () => {
    const games = Array.from({ length: 12 }, () => game({ hurt: ["mana"] }));
    const s = summarizeGames(games);
    expect(s.axes[0].recent).toHaveLength(10);
    expect(s.axes[0].hurt).toBe(12);
  });
});
