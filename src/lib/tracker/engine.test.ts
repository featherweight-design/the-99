import { describe, expect, it } from "vitest";
import { commit, placements, reduce, replay, startGame, undo, isOver, type Action, type Game, type GameConfig } from "./engine";

const config = (n: number, extra: Partial<GameConfig> = {}): GameConfig => ({
  tableId: "t1",
  startingLife: 40,
  seats: Array.from({ length: n }, (_, i) => ({ seat: i + 1, commanders: 1 as const })),
  first: 1,
  layout: "phone-4-around",
  ...extra,
});
const play = (cfg: GameConfig, ...actions: Action[]) => replay({ config: cfg, log: actions });
const seat = (s: ReturnType<typeof replay>, n: number) => s.seats.find((x) => x.seat === n)!;

describe("life, counters, tax, mana", () => {
  it("applies deltas and floors counters at zero", () => {
    const s = play(config(2), { t: "life", seat: 1, delta: -3 }, { t: "counter", seat: 1, key: "energy", delta: 2 }, { t: "counter", seat: 1, key: "energy", delta: -5 }, { t: "tax", seat: 2, cmdr: 0, delta: 2 }, { t: "mana", seat: 2, color: "G", delta: 1 });
    expect(seat(s, 1).life).toBe(37);
    expect(seat(s, 1).counters.energy).toBe(0);
    expect(seat(s, 2).tax[0]).toBe(2);
    expect(seat(s, 2).mana.G).toBe(1);
  });
  it("caps speed at 4", () => {
    expect(seat(play(config(2), { t: "counter", seat: 1, key: "speed", delta: 9 }), 1).counters.speed).toBe(4);
  });
  it("refuses a second commander's tax or damage on a seat without a partner", () => {
    const s = play(config(2), { t: "tax", seat: 1, cmdr: 1, delta: 2 }, { t: "damage", seat: 2, from: 1, cmdr: 1, delta: 5 });
    expect(seat(s, 1).tax).toEqual([0, 0]);
    expect(seat(s, 2).life).toBe(40);
  });
  it("ignores a non-integer delta", () => {
    expect(seat(play(config(2), { t: "life", seat: 1, delta: 1.5 }), 1).life).toBe(40);
  });
});

describe("commander damage", () => {
  it("comes off life and puts the seat out at 21 from one commander", () => {
    const s = play(config(3), { t: "damage", seat: 2, from: 1, cmdr: 0, delta: 21 });
    expect(seat(s, 2).life).toBe(19);
    expect(seat(s, 2).out?.reason).toEqual({ kind: "commander", from: 1, cmdr: 0 });
  });
  it("counts each partner separately: 11 + 11 is not out", () => {
    const cfg = config(3, { seats: [{ seat: 1, commanders: 2 }, { seat: 2, commanders: 1 }, { seat: 3, commanders: 1 }] });
    const s = play(cfg, { t: "damage", seat: 2, from: 1, cmdr: 0, delta: 11 }, { t: "damage", seat: 2, from: 1, cmdr: 1, delta: 11 });
    expect(seat(s, 2).out).toBeNull();
    expect(seat(s, 2).life).toBe(18);
  });
  it("restores life when a damage entry is corrected down", () => {
    const s = play(config(2), { t: "damage", seat: 2, from: 1, cmdr: 0, delta: 5 }, { t: "damage", seat: 2, from: 1, cmdr: 0, delta: -9 });
    expect(seat(s, 2).life).toBe(40);
  });
});

describe("going out", () => {
  it("goes out at 0 life with the round", () => {
    const s = play(config(3), { t: "life", seat: 2, delta: -40 });
    expect(seat(s, 2).out).toMatchObject({ reason: { kind: "life" }, round: 1 });
  });
  it("goes out at 10 poison", () => {
    expect(seat(play(config(3), { t: "counter", seat: 2, key: "poison", delta: 10 }), 2).out?.reason).toEqual({ kind: "poison" });
  });
  it("takes no further changes once out", () => {
    const s = play(config(3), { t: "life", seat: 2, delta: -40 }, { t: "life", seat: 2, delta: 10 });
    expect(seat(s, 2).life).toBe(0);
  });
  it("is undone by dropping the entry", () => {
    const game: Game = commit({ config: config(3), log: [] }, { t: "life", seat: 2, delta: -40 });
    expect(seat(replay(undo(game)), 2).out).toBeNull();
  });
});

describe("turns and rounds", () => {
  it("counts the round up only when play passes the first player's seat again", () => {
    const e: Action = { t: "endTurn" };
    const s1 = play(config(3, { first: 2 }), e);
    expect([s1.active, s1.round]).toEqual([3, 1]);
    const s2 = play(config(3, { first: 2 }), e, e);
    expect([s2.active, s2.round]).toEqual([1, 1]);
    const s3 = play(config(3, { first: 2 }), e, e, e);
    expect([s3.active, s3.round]).toEqual([2, 2]);
  });
  it("skips a seat that is out", () => {
    const s = play(config(3), { t: "life", seat: 2, delta: -40 }, { t: "endTurn" });
    expect(s.active).toBe(3);
  });
  it("counts the round when the first player's seat is the one that is out", () => {
    const s = play(config(3), { t: "endTurn" }, { t: "endTurn" }, { t: "life", seat: 1, delta: -40 }, { t: "endTurn" });
    expect([s.active, s.round]).toEqual([2, 2]);
  });
  it("moves the turn on when the active player goes out", () => {
    const s = play(config(3), { t: "life", seat: 1, delta: -40 });
    expect(s.active).toBe(2);
  });
});

describe("monarch and initiative", () => {
  it("passes to the active player when the holder goes out", () => {
    const s = play(config(3), { t: "monarch", seat: 3 }, { t: "initiative", seat: 3 }, { t: "life", seat: 3, delta: -40 });
    expect([s.monarch, s.initiative]).toEqual([1, 1]);
  });
  it("is kept by a holder who stays in", () => {
    expect(play(config(3), { t: "monarch", seat: 2 }, { t: "endTurn" }).monarch).toBe(2);
  });
});

describe("the end of the game and placements", () => {
  it("ends when one seat is left and ranks by how long each lasted", () => {
    const s = play(config(4), { t: "life", seat: 2, delta: -40 }, { t: "life", seat: 3, delta: -40 }, { t: "life", seat: 4, delta: -40 });
    expect(isOver(s)).toBe(true);
    expect(placements(s)).toEqual([{ seat: 1, place: 1 }, { seat: 2, place: 4 }, { seat: 3, place: 3 }, { seat: 4, place: 2 }]);
  });
  it("counts several players going out in one commit as a draw", () => {
    const s = play(config(3), { t: "life", seat: 3, delta: -40 }, { t: "batch", actions: [{ t: "life", seat: 1, delta: -40 }, { t: "life", seat: 2, delta: -40 }] });
    expect(seat(s, 1).out?.entry).toBe(seat(s, 2).out?.entry);
    expect(placements(s)).toEqual([{ seat: 1, place: 1 }, { seat: 2, place: 1 }, { seat: 3, place: 3 }]);
  });
  it("takes no entries after the game is over", () => {
    const over = play(config(2), { t: "life", seat: 2, delta: -40 });
    expect(reduce(over, { t: "life", seat: 1, delta: -5 })).toBe(over);
  });
  it("ends by hand: winners take first, a draw is several winners", () => {
    const s = play(config(3), { t: "life", seat: 3, delta: -40 }, { t: "end", winners: [1, 2] });
    expect(isOver(s)).toBe(true);
    expect(placements(s)).toEqual([{ seat: 1, place: 1 }, { seat: 2, place: 1 }, { seat: 3, place: 3 }]);
  });
  it("ignores an end with no seated winner", () => {
    expect(isOver(play(config(3), { t: "end", winners: [9] }))).toBe(false);
  });
  it("never changes the state it reduces from", () => {
    const before = startGame(config(2));
    const frozen = JSON.stringify(before);
    reduce(before, { t: "life", seat: 1, delta: -5 });
    expect(JSON.stringify(before)).toBe(frozen);
  });
  it("names the lowest seat's commander when two reach 21 together", () => {
    const s = play(config(3), { t: "batch", actions: [{ t: "damage", seat: 1, from: 3, cmdr: 0, delta: 21 }, { t: "damage", seat: 1, from: 2, cmdr: 0, delta: 21 }] });
    expect(seat(s, 1).out?.reason).toEqual({ kind: "commander", from: 2, cmdr: 0 });
  });
});
