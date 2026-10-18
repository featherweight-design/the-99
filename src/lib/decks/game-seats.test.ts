import { describe, expect, it } from "vitest";
import {
  hasRoom, opponentsFor, podSizeHeld, seatCount, seatLabelled, seatName, seatWith, seatWithout, seatWon, seatsForResult,
  podFill, prefillSeats, seatedFriends, shortName, SEAT_LABEL_MAX, type Seat, type SeatCommander, type SeatFriend, type SeatPick,
} from "./game-seats";
import { OPPONENT_LABEL_MAX, parseOpponents } from "./game-opponents";
import { cleanName } from "../social/rules";

const cmd = (id: string, name = `Cmdr ${id}`): SeatCommander => ({ oracleId: id, name, imageUri: null });
const seat = (key: string, over: Partial<Seat> = {}): Seat => ({ key, commander: cmd(key), friend: null, deck: null, label: "", won: false, table: null, ...over });
const anyone = (c: SeatCommander): SeatPick => ({ friend: null, deck: null, commander: c });

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
    expect(seatWith(base, null, anyone(cmd("c")), "k3").map((s) => s.commander?.oracleId)).toEqual(["a", "b", "c"]);
    const changed = seatWith(base, "a", anyone(cmd("z")), "ignored");
    expect(changed[0]).toMatchObject({ key: "a", label: "Sam", won: true, commander: { oracleId: "z" } });
    expect(changed).toHaveLength(2);
  });
  it("clears a seat by key, leaving the order of the rest", () => {
    expect(seatWithout([seat("a"), seat("b"), seat("c")], "b").map((s) => s.key)).toEqual(["a", "c"]);
  });
  it("strips what the server would refuse, so a pasted zero-width space cannot sink the whole game", () => {
    const pasted = "Sa\u200Bm\u202E \u00A0 Lee\u0007";
    expect(seatLabelled([seat("a")], "a", pasted)[0].label).toBe("Sam \u00A0 Lee");
    const sent = opponentsFor([seat("a", { label: seatLabelled([seat("a")], "a", pasted)[0].label })], "win")[0].label;
    // The cleaned label is the one `cleanName` accepts unchanged, which is what the parser will check.
    expect(sent).toBe("Sam Lee");
    expect(cleanName(sent, 30)).toBe(sent);
  });
  it("keeps a zero-width joiner, which composed emoji need", () => {
    const family = "👨\u200D👩\u200D👧";
    expect(seatLabelled([seat("a")], "a", family)[0].label).toBe(family);
    expect(cleanName(family, 30)).toBe(family);
  });
  it("lets a space be typed between words, and collapses it only on the way out", () => {
    expect(seatLabelled([seat("a")], "a", "Sam ")[0].label).toBe("Sam ");
    expect(opponentsFor([seat("a", { label: "Sam   Lee " })], "win")).toEqual([{ commander: "a", label: "Sam Lee" }]);
  });
  it("caps after normalizing, because composing can add code points the server would count", () => {
    // U+0958 is one code point that NFC turns into two: 29 letters after it would read 30 and be sent as 31.
    const typed = seatLabelled([seat("a")], "a", "\u0958" + "x".repeat(29))[0].label;
    expect(Array.from(typed).length).toBeLessThanOrEqual(30);
    const sent = opponentsFor([seat("a", { label: typed })], "win")[0].label as string;
    expect(cleanName(sent, 30)).toBe(sent);
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
  const uuidSeat = (id: string, over: Partial<Seat> = {}): Seat => ({ key: id, commander: cmd(id), friend: null, deck: null, label: "", won: false, table: null, ...over });
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

describe("friend seats", () => {
  const F1 = "00000000-0000-4000-8000-0000000000f1";
  const F2 = "00000000-0000-4000-8000-0000000000f2";
  const DECK = "00000000-0000-4000-8000-0000000000d1";
  const dave: SeatFriend = { publicId: F1, name: "Dave" };
  const jo: SeatFriend = { publicId: F2, name: "Jo" };

  it("sends a friend's deck alone, a friend's own commander beside the friend, and a bare friend as just the friend", () => {
    const seats = [
      seat("a", { friend: dave, deck: { id: DECK, name: "Avengers Tempo" }, commander: cmd("x") }),
      seat("b", { friend: jo, commander: cmd("y") }),
      seat("c", { friend: { publicId: "3", name: "Sam" }, commander: null }),
    ];
    expect(opponentsFor(seats, "win")).toEqual([{ friend: F1, deck: DECK }, { friend: F2, commander: "y" }, { friend: "3" }]);
  });
  it("is accepted by the server's own parser, and a friend carries no label even if the seat held one", () => {
    const A = "00000000-0000-4000-8000-00000000000a";
    const seats = [
      seat("a", { friend: dave, deck: { id: DECK, name: "d" }, commander: cmd(A), won: true }),
      seat("b", { friend: jo, commander: cmd(A), label: "ignored" }),
    ];
    expect(parseOpponents(opponentsFor(seats, "loss"), { podSize: 4, result: "loss" })).toEqual([
      { kind: "friendDeck", friend: F1, deck: DECK, won: true },
      { kind: "friend", friend: F2, commander: A, partner: null, won: false },
    ]);
  });
  it("picking a friend over a seat drops the label it held, and picking anyone over a friend seat keeps nothing of the friend", () => {
    const withLabel = [seat("a", { label: "Lee" })];
    expect(seatWith(withLabel, "a", { friend: dave, deck: null, commander: null }, "k")[0]).toMatchObject({ friend: dave, label: "", commander: null });
    const friendSeat = [seat("a", { friend: dave, deck: { id: DECK, name: "d" }, commander: cmd("x") })];
    expect(seatWith(friendSeat, "a", anyone(cmd("z")), "k")[0]).toMatchObject({ friend: null, deck: null, commander: { oracleId: "z" } });
  });
  it("names a friend seat by the friend, and lists the friends at the OTHER seats as already seated", () => {
    const seats = [seat("a", { friend: dave, commander: cmd("x") }), seat("b", { friend: jo, commander: null })];
    expect(seatName(seats[0])).toBe("Dave");
    expect(seatName(seats[1])).toBe("Jo");
    expect([...seatedFriends(seats, "a")]).toEqual([F2]);
    expect([...seatedFriends(seats, null)].sort()).toEqual([F1, F2]);
  });
});

describe("Seat a pod", () => {
  const f = (n: number): SeatFriend => ({ publicId: `p${n}`, name: `Friend ${n}` });
  it("sets the pod size to the member count and seats the friends in join order", () => {
    expect(podFill([], 4, [f(1), f(2)])).toEqual({ podSize: 4, add: [f(1), f(2)], unseated: [] });
  });
  it("clamps the size to 2 to 8, and names who did not fit", () => {
    const nine = Array.from({ length: 8 }, (_, i) => f(i + 1));
    const fill = podFill([], 9, nine);
    expect(fill.podSize).toBe(8);
    expect(fill.add).toHaveLength(7);
    expect(fill.unseated).toEqual(["Friend 8"]);
    expect(podFill([], 1, []).podSize).toBe(2);
  });
  it("never lowers the pod below the seats already filled, and skips a friend already seated", () => {
    const seats = [seat("a", { friend: f(1), commander: null }), seat("b")];
    expect(podFill(seats, 2, [f(1), f(2)]).podSize).toBe(3);
    const fill = podFill(seats, 4, [f(1), f(2)]);
    expect(fill.podSize).toBe(4);
    expect(fill.add).toEqual([f(2)]);
    expect(fill.unseated).toEqual([]);
  });
});

// A seat from a Rule 0 table (plan §PR 8) is drawn from the prefill and sent by its number alone (decision 5).
describe("seats from a table", () => {
  const prefill = {
    seats: [
      { seat: 2, name: "Colin", deckName: "Zimone Combo", commanderName: "Zimone, Quandrix Prodigy", artCropUri: "z.jpg", friend: true },
      { seat: 4, name: "Max", deckName: null, commanderName: null, artCropUri: null, friend: false },
    ],
  };
  const seats = prefillSeats(prefill, (n) => `t${n}`);

  it("fills every other seat, a waiting one too, marking the one who is not a friend", () => {
    expect(seats.map((s) => [s.key, seatName(s), s.table?.deckName, s.table?.mark])).toEqual([
      ["t2", "Colin", "Zimone Combo", false],
      ["t4", "Max", null, true],
    ]);
  });

  it("sends a table seat as its number, with a winner mark and nothing else", () => {
    expect(opponentsFor(seatWon(seats, "t4"), "loss")).toEqual([{ tableSeat: 2 }, { tableSeat: 4, won: true }]);
    expect(parseOpponents(opponentsFor(seats, "loss"), { podSize: 4, result: "loss" })).toHaveLength(2);
  });

  it("leaves the table path on any edit but the winner mark", () => {
    expect(seatWon(seats, "t2")[0].table).not.toBeNull();
    const picked = seatWith(seats, "t2", anyone(cmd("x")), "unused");
    expect(picked[0].table).toBeNull();
    expect(opponentsFor(picked, "win")[0]).toEqual({ commander: "x" });
    expect(seatLabelled(seats, "t4", "Maxine")[1].table).toBeNull();
  });
});
