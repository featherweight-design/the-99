// The tracker's result (F11, S5): who won or drew, the rest out last first, and the same-change rule that makes a
// draw by elimination possible.
import { describe, expect, it } from "vitest";
import { commit, replay, type Action, type Game, type GameConfig } from "./engine";
import { gameLength, landLife, ordinal, resultOf } from "./result";

const config: GameConfig = {
  tableId: "t",
  startingLife: 40,
  seats: [0, 1, 2, 3].map((seat) => ({ seat, commanders: 1 as const })),
  first: 0,
  layout: "phone-4",
};
const play = (...log: Action[]) => replay(log.reduce<Game>((g, a) => commit(g, a), { config, log: [] }));

describe("resultOf", () => {
  it("names one winner and lists the rest by place, the last out first", () => {
    const r = resultOf(
      play(
        { t: "life", seat: 3, delta: -40 },
        { t: "endTurn" },
        { t: "counter", seat: 2, key: "poison", delta: 10 },
        { t: "damage", seat: 1, from: 0, cmdr: 0, delta: 21 },
      ),
    );
    expect(r.winners).toEqual([0]);
    expect(r.byHand).toBe(false);
    expect(r.out.map((o) => [o.seat, o.place, o.reason?.kind])).toEqual([
      [1, 2, "commander"],
      [2, 3, "poison"],
      [3, 4, "life"],
    ]);
  });
  it("is a draw when the last players go out in the same entry", () => {
    const r = resultOf(
      play(
        { t: "life", seat: 3, delta: -40 },
        { t: "life", seat: 2, delta: -40 },
        { t: "batch", actions: [{ t: "life", seat: 0, delta: -40 }, { t: "life", seat: 1, delta: -40 }] },
      ),
    );
    expect(r.winners).toEqual([0, 1]);
    expect(r.out.map((o) => [o.seat, o.place])).toEqual([[2, 3], [3, 4]]);
  });
  it("keeps a player still in at a hand-ended draw as still in, ranked behind the drawn", () => {
    const r = resultOf(play({ t: "life", seat: 3, delta: -40 }, { t: "end", winners: [0, 1] }));
    expect(r.byHand).toBe(true);
    expect(r.winners).toEqual([0, 1]);
    expect(r.out.map((o) => [o.seat, o.place, o.reason])).toEqual([[2, 3, null], [3, 4, { kind: "life" }]]);
  });
});

describe("landLife", () => {
  const two = play({ t: "life", seat: 3, delta: -40 }, { t: "life", seat: 2, delta: -40 }, { t: "life", seat: 0, delta: -39 }, { t: "life", seat: 1, delta: -39 });
  it("lands every other pending change with a change that ends the game", () => {
    let taken = 0;
    const others = () => {
      taken++;
      return [{ seat: 1, delta: -1 }, { seat: 0, delta: 0 }];
    };
    expect(landLife(two, 0, -1, others)).toEqual({ t: "batch", actions: [{ t: "life", seat: 0, delta: -1 }, { t: "life", seat: 1, delta: -1 }] });
    expect(taken).toBe(1);
  });
  it("leaves the other panels' pending changes alone when the change does not end the game", () => {
    let taken = 0;
    expect(landLife(play(), 0, -5, () => (taken++, [{ seat: 1, delta: -1 }]))).toEqual({ t: "life", seat: 0, delta: -5 });
    expect(taken).toBe(0);
  });
});

describe("formatting", () => {
  it("reads the game's length and places", () => {
    expect([gameLength(20_000), gameLength(38 * 60000), gameLength(74 * 60000), gameLength(120 * 60000)]).toEqual(["1 min", "38 min", "1 h 14 min", "2 h"]);
    expect([1, 2, 3, 4, 11, 12, 13, 21].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st"]);
  });
});

describe("landLife after the game is over", () => {
  it("takes nothing from the other panels", () => {
    const over = play({ t: "life", seat: 3, delta: -40 }, { t: "life", seat: 2, delta: -40 }, { t: "life", seat: 1, delta: -40 });
    let taken = 0;
    expect(landLife(over, 0, -1, () => (taken++, [{ seat: 1, delta: -1 }]))).toEqual({ t: "life", seat: 0, delta: -1 });
    expect(taken).toBe(0);
  });
});
