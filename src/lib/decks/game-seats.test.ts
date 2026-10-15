import { describe, expect, it } from "vitest";
import {
  hasRoom, opponentsFor, podSizeHeld, seatCount, seatLabelled, seatName, seatWith, seatWithout, seatWon, seatsForResult,
  shortName, SEAT_LABEL_MAX, type Seat, type SeatCommander,
} from "./game-seats";
import { OPPONENT_LABEL_MAX, parseOpponents } from "./game-opponents";

const cmd = (id: string, name = `Cmdr ${id}`): SeatCommander => ({ oracleId: id, name, imageUri: null, colorIdentity: [] });
const seat = (key: string, over: Partial<Seat> = {}): Seat => ({ key, commander: cmd(key), label: "", won: false, ...over });

describe("seats and the pod", () => {
  it("a table of N has N - 1 seats, and a pod is held while its filled seats would not fit", () => {
    expect(seatCount(4)).toBe(3);
    expect(podSizeHeld(2, 2)).toBe(true);
    expect(podSizeHeld(3, 2)).toBe(false);
    expect(podSizeHeld(2, 0)).toBe(false);
    expect(hasRoom(4, 2)).toBe(true);
    expect(hasRoom(4, 3)).toBe(false);
  });
  it("keeps the client label cap equal to the server's", () => {
    expect(SEAT_LABEL_MAX).toBe(OPPONENT_LABEL_MAX);
  });
});

describe("filling and clearing seats", () => {
  it("adds a new seat at the end, and changes one in place keeping its label and its trophy", () => {
    const base = [seat("a", { label: "Sam", won: true }), seat("b")];
    expect(seatWith(base, null, cmd("c"), "k3").map((s) => s.commander.oracleId)).toEqual(["a", "b", "c"]);
    const changed = seatWith(base, "a", cmd("z"), "ignored");
    expect(changed[0]).toMatchObject({ key: "a", label: "Sam", won: true, commander: { oracleId: "z" } });
    expect(changed).toHaveLength(2);
  });
  it("clears a seat by key, leaving the order of the rest", () => {
    expect(seatWithout([seat("a"), seat("b"), seat("c")], "b").map((s) => s.key)).toEqual(["a", "c"]);
  });
  it("caps a label at 30 characters by code point", () => {
    const out = seatLabelled([seat("a")], "a", "😀".repeat(40));
    expect(Array.from(out[0].label)).toHaveLength(30);
  });
});

describe("who won", () => {
  it("moves to the pressed seat, and clears when the winner is pressed again", () => {
    const base = [seat("a", { won: true }), seat("b")];
    expect(seatWon(base, "b").map((s) => s.won)).toEqual([false, true]);
    expect(seatWon(base, "a").map((s) => s.won)).toEqual([false, false]);
  });
  it("is dropped when the result is not Lost, and kept on a loss or before a result", () => {
    const base = [seat("a", { won: true })];
    expect(seatsForResult(base, "win")[0].won).toBe(false);
    expect(seatsForResult(base, "draw")[0].won).toBe(false);
    expect(seatsForResult(base, "loss")[0].won).toBe(true);
    expect(seatsForResult(base, null)[0].won).toBe(false);
  });
});

describe("what is sent", () => {
  it("sends the commander, a typed label and won only on a loss", () => {
    const seats = [seat("a", { label: " Sam ", won: true }), seat("b")];
    expect(opponentsFor(seats, "loss")).toEqual([{ commander: "a", label: "Sam", won: true }, { commander: "b" }]);
    expect(opponentsFor(seats, "win")).toEqual([{ commander: "a", label: "Sam" }, { commander: "b" }]);
  });
  // The parser checks ids as uuids, so these seats carry real-shaped ones.
  const A = "00000000-0000-4000-8000-00000000000a";
  const B = "00000000-0000-4000-8000-00000000000b";
  const uuidSeat = (id: string, over: Partial<Seat> = {}): Seat => ({ key: id, commander: cmd(id), label: "", won: false, ...over });
  it("is accepted by the server's own parser, for a loss with a winner", () => {
    const seats = [uuidSeat(A, { label: "Sam", won: true }), uuidSeat(B)];
    expect(parseOpponents(opponentsFor(seats, "loss"), { podSize: 4, result: "loss" })).toHaveLength(2);
  });
  it("is refused by the parser when a winner rides a win, which is why leaving Lost clears it first", () => {
    expect(parseOpponents([{ commander: A, won: true }], { podSize: 4, result: "win" })).toBeNull();
    // What the form sends once the result is Win: the winner is dropped from the payload as well as the state.
    expect(parseOpponents(opponentsFor([uuidSeat(A, { won: true })], "win"), { podSize: 4, result: "win" })).toHaveLength(1);
  });
});

describe("names", () => {
  it("shortens a commander before its comma and prefers a typed label", () => {
    expect(shortName("Yuriko, the Tiger's Shadow")).toBe("Yuriko");
    expect(shortName("Atraxa")).toBe("Atraxa");
    expect(seatName(seat("a", { commander: cmd("a", "Yuriko, the Tiger's Shadow") }))).toBe("Yuriko");
    expect(seatName(seat("a", { label: "  Lee " }))).toBe("Lee");
  });
});
