// The Undo row's line (addendum U1, clarification 8): the change that ended the game, named from the replay before it
// and after it, with the round it landed in.
import { describe, expect, it } from "vitest";
import { endingLine } from "./ending";
import type { Action, Game } from "./engine";
import type { PlaySeat } from "./seat";

const seat = (n: number, name: string, you = false): PlaySeat => ({ seat: n, you, name, art: null, partnerArt: null, commander: `${name}'s commander`, partner: null, deck: null });
const seats = [seat(0, "Hugh", true), seat(1, "Colin"), seat(2, "Max")];

function game(log: Action[], players = seats): Game {
  return {
    config: { tableId: "t1", startingLife: 40, seats: players.map((s) => ({ seat: s.seat, commanders: 1 })), first: 0, layout: "phone-3", startedAt: 0, snapshot: { players, roster: "r" } },
    log,
  };
}
const line = (g: Game, players = seats) => endingLine(g, players)?.join("") ?? null;
const two = seats.slice(0, 2);

describe("endingLine", () => {
  it("is null while the game runs, and for a game with nothing logged", () => {
    expect(line(game([]))).toBeNull();
    expect(line(game([{ t: "life", seat: 1, delta: -3 }]))).toBeNull();
  });

  it("names the one seat a life change knocked out, with its true life after the change", () => {
    expect(line(game([{ t: "life", seat: 1, delta: -39 }, { t: "life", seat: 1, delta: -3 }], two), two)).toBe("Colin −3 life, to -2 · round 1");
  });

  it("opens with You when the viewer went out", () => {
    expect(line(game([{ t: "life", seat: 0, delta: -40 }], two), two)).toBe("You −40 life, to 0 · round 1");
  });

  it("names several out on the same amount together, the viewer last and lowercase", () => {
    const g = game([{ t: "life", seat: 2, delta: -40 }, { t: "batch", actions: [{ t: "life", seat: 0, delta: -40 }, { t: "life", seat: 1, delta: -40 }] }]);
    expect(line(g)).toBe("Colin and you −40 life · round 1");
  });

  it("gives each amount when several go out on life by different amounts", () => {
    const g = game([{ t: "life", seat: 0, delta: -37 }, { t: "batch", actions: [{ t: "life", seat: 0, delta: -3 }, { t: "life", seat: 1, delta: -40 }] }], two);
    expect(line(g, two)).toBe("Colin −40 and you −3 life · round 1");
  });

  it("names poison and commander damage with their totals", () => {
    expect(line(game([{ t: "counter", seat: 1, key: "poison", delta: 9 }, { t: "counter", seat: 1, key: "poison", delta: 1 }], two), two)).toBe("Colin +1 poison, to 10 · round 1");
    expect(line(game([{ t: "damage", seat: 1, from: 0, cmdr: 0, delta: 21 }], two), two)).toBe("Colin +21 commander damage from Hugh's commander, to 21 · round 1");
  });

  it("joins seats knocked out in different ways by one change", () => {
    const g = game([{ t: "batch", actions: [{ t: "life", seat: 1, delta: -40 }, { t: "counter", seat: 2, key: "poison", delta: 10 }] }]);
    expect(line(g)).toBe("Colin −40 life, to 0 and Max +10 poison, to 10 · round 1");
  });

  it("names a concede, not the life it took", () => {
    expect(line(game([{ t: "life", seat: 1, delta: -40, concede: true }], two), two)).toBe("Colin conceded · round 1");
  });

  it("names an ending by hand", () => {
    expect(line(game([{ t: "end", winners: [1] }]))).toBe("Ended by hand: Colin won · round 1");
    expect(line(game([{ t: "end", winners: [0] }]))).toBe("Ended by hand: you won · round 1");
    expect(line(game([{ t: "end", winners: [0, 1] }]))).toBe("Ended by hand: a draw · round 1");
  });

  it("gives the round the ending change landed in", () => {
    const g = game([{ t: "endTurn" }, { t: "endTurn" }, { t: "life", seat: 1, delta: -40 }], two);
    expect(line(g, two)).toBe("Colin −40 life, to 0 · round 2");
  });
});
