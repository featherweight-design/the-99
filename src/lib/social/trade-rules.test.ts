import { describe, expect, it } from "vitest";
import {
  TRADE_ROUND_MAX, TRADE_SIDE_MAX, authorOf, canAct, cleanSides, compareRows, offerHeld, roleOf, roundDiff, rowState,
  sheetState, tradeDaysLeft, tradeStatus, type TradeFacts,
} from "./trade-rules";

const NOW = new Date("2026-11-27T12:00:00Z");
const daysAgo = (d: number) => new Date(NOW.getTime() - d * 86_400_000);
const P = "user_proposer";
const R = "user_recipient";

const trade = (o: Partial<TradeFacts> = {}): TradeFacts => ({
  status: "open", proposerUserId: P, recipientUserId: R, round: 1, createdAt: daysAgo(2), endedByUserId: null,
  proposerMarkedAt: null, recipientMarkedAt: null, ...o,
});

describe("the trade's clock (D6)", () => {
  it("runs 14 days from the first offer, and a counter never resets it", () => {
    expect(tradeDaysLeft(daysAgo(2), NOW)).toBe(12);
    expect(tradeDaysLeft(daysAgo(13.5), NOW)).toBe(1);
    expect(tradeDaysLeft(daysAgo(20), NOW)).toBe(0);
    expect(tradeStatus(trade({ round: 4, createdAt: daysAgo(14) }), NOW)).toBe("expired");
    expect(tradeStatus(trade({ createdAt: daysAgo(13.9) }), NOW)).toBe("open");
  });

  it("never expires an accepted trade: it waits on the marks", () => {
    expect(tradeStatus(trade({ status: "accepted", createdAt: daysAgo(40) }), NOW)).toBe("accepted");
  });
});

describe("whose offer it is", () => {
  it("alternates: the proposer's rounds are odd, the recipient's even", () => {
    expect(authorOf(trade({ round: 1 }))).toBe(P);
    expect(authorOf(trade({ round: 2 }))).toBe(R);
    expect(authorOf(trade({ round: 3 }))).toBe(P);
    expect(roleOf(trade(), "someone_else")).toBeNull();
  });
});

describe("the sheet's state, for each side", () => {
  it("draws an offer as theirs to the recipient and yours to the proposer", () => {
    expect(sheetState(trade(), R, NOW, false)).toBe("theirs");
    expect(sheetState(trade(), P, NOW, false)).toBe("yours");
  });

  it("draws a later round as their counter to whoever answers it", () => {
    expect(sheetState(trade({ round: 2 }), P, NOW, false)).toBe("theirCounter");
    expect(sheetState(trade({ round: 2 }), R, NOW, false)).toBe("yours");
    expect(sheetState(trade({ round: 3 }), R, NOW, false)).toBe("theirCounter");
  });

  it("draws a gone card as Needs a look, the answerer's or the author's", () => {
    expect(sheetState(trade(), R, NOW, true)).toBe("look");
    expect(sheetState(trade(), P, NOW, true)).toBe("lookYours");
  });

  it("draws the marks after a Yes", () => {
    const accepted = trade({ status: "accepted" });
    expect(sheetState(accepted, P, NOW, false)).toBe("accepted");
    expect(sheetState({ ...accepted, recipientMarkedAt: NOW }, P, NOW, false)).toBe("themMarked");
    expect(sheetState({ ...accepted, recipientMarkedAt: NOW }, R, NOW, false)).toBe("youMarked");
    expect(sheetState(trade({ status: "traded", proposerMarkedAt: NOW, recipientMarkedAt: NOW }), P, NOW, false)).toBe("traded");
  });

  it("never flags an accepted trade as needing a look: its cards are promised", () => {
    expect(sheetState(trade({ status: "accepted" }), R, NOW, true)).toBe("accepted");
  });

  it("has nothing to open on an ended or expired trade", () => {
    for (const status of ["declined", "withdrawn", "rescinded"] as const) expect(sheetState(trade({ status }), P, NOW, false)).toBe("ended");
    expect(sheetState(trade({ createdAt: daysAgo(15) }), R, NOW, false)).toBe("ended");
  });
});

describe("the Trades rows", () => {
  it("names each state, and who made the move", () => {
    expect(rowState(trade(), R, NOW, false)).toEqual({ state: "offer", waitsOnYou: true, byYou: false });
    expect(rowState(trade(), P, NOW, false)).toEqual({ state: "offered", waitsOnYou: false, byYou: true });
    expect(rowState(trade({ round: 2 }), P, NOW, false)).toEqual({ state: "countered", waitsOnYou: true, byYou: false });
    expect(rowState(trade(), P, NOW, true)).toEqual({ state: "look", waitsOnYou: true, byYou: true });
    // The recipient answered round 1 with a Yes: it was their accept.
    expect(rowState(trade({ status: "accepted" }), R, NOW, false)).toEqual({ state: "accepted", waitsOnYou: true, byYou: true });
    expect(rowState(trade({ status: "accepted" }), P, NOW, false)).toEqual({ state: "accepted", waitsOnYou: true, byYou: false });
    expect(rowState(trade({ status: "accepted", proposerMarkedAt: NOW }), R, NOW, false).state).toBe("themMarked");
    expect(rowState(trade({ status: "accepted", proposerMarkedAt: NOW }), P, NOW, false)).toEqual({ state: "youMarked", waitsOnYou: false, byYou: true });
    expect(rowState(trade({ status: "declined", endedByUserId: R }), R, NOW, false)).toEqual({ state: "declined", waitsOnYou: false, byYou: true });
    expect(rowState(trade({ status: "rescinded", endedByUserId: R }), P, NOW, false)).toEqual({ state: "rescinded", waitsOnYou: false, byYou: false });
    expect(rowState(trade({ createdAt: daysAgo(15) }), R, NOW, false)).toEqual({ state: "expired", waitsOnYou: false, byYou: true });
    expect(rowState(trade({ createdAt: daysAgo(15) }), P, NOW, false)).toEqual({ state: "expired", waitsOnYou: false, byYou: false });
  });

  it("sorts what waits on you first, in the boards' order, then the rest newest first", () => {
    const at = (d: number) => daysAgo(d);
    const rows = [
      { name: "old ended", row: rowState(trade({ status: "declined", endedByUserId: R }), P, NOW, false), at: at(9) },
      { name: "marked by them", row: rowState(trade({ status: "accepted", recipientMarkedAt: NOW }), P, NOW, false), at: at(1) },
      { name: "my offer", row: rowState(trade(), P, NOW, false), at: at(0) },
      { name: "counter", row: rowState(trade({ round: 2 }), P, NOW, false), at: at(5) },
      { name: "offer", row: rowState(trade(), R, NOW, false), at: at(8) },
      { name: "look", row: rowState(trade(), R, NOW, true), at: at(3) },
      { name: "accepted", row: rowState(trade({ status: "accepted" }), P, NOW, false), at: at(2) },
    ];
    expect([...rows].sort(compareRows).map((r) => r.name)).toEqual(
      ["offer", "counter", "look", "accepted", "marked by them", "my offer", "old ended"],
    );
  });
});

describe("the cap (Q10): one unanswered offer per friend", () => {
  it("holds a new trade while an offer of the reader's waits, a counter they sent included", () => {
    expect(offerHeld([trade()], P, NOW)).toBe(true);
    expect(offerHeld([trade({ round: 2 })], R, NOW)).toBe(true);
  });

  it("does not hold for the friend's offer, an accepted trade, or an expired one", () => {
    expect(offerHeld([trade()], R, NOW)).toBe(false);
    expect(offerHeld([trade({ status: "accepted" })], P, NOW)).toBe(false);
    expect(offerHeld([trade({ createdAt: daysAgo(14) })], P, NOW)).toBe(false);
  });

  it("never holds a counter: the reader may counter with their own offer to that friend waiting", () => {
    const theirs = trade({ proposerUserId: R, recipientUserId: P });
    expect(offerHeld([trade(), theirs], P, NOW)).toBe(true);
    expect(canAct(theirs, P, "counter", NOW)).toBe(true);
  });
});

describe("who may do what", () => {
  it("lets only the answerer answer, and only the author withdraw", () => {
    const t = trade();
    expect(canAct(t, R, "accept", NOW)).toBe(true);
    expect(canAct(t, R, "decline", NOW)).toBe(true);
    expect(canAct(t, R, "counter", NOW)).toBe(true);
    expect(canAct(t, P, "accept", NOW)).toBe(false);
    expect(canAct(t, P, "counter", NOW)).toBe(false);
    expect(canAct(t, P, "withdraw", NOW)).toBe(true);
    expect(canAct(t, R, "withdraw", NOW)).toBe(false);
    expect(canAct(t, "someone_else", "decline", NOW)).toBe(false);
  });

  it("holds Yes while a card is gone, and lets the author revise only then", () => {
    expect(canAct(trade(), R, "accept", NOW, true)).toBe(false);
    expect(canAct(trade(), R, "counter", NOW, true)).toBe(true);
    expect(canAct(trade(), P, "revise", NOW, true)).toBe(true);
    expect(canAct(trade(), P, "revise", NOW, false)).toBe(false);
  });

  it("answers nothing once expired, but clears it", () => {
    const t = trade({ createdAt: daysAgo(14) });
    for (const a of ["accept", "decline", "counter", "withdraw"] as const) expect(canAct(t, R, a, NOW)).toBe(false);
    expect(canAct(t, R, "clear", NOW)).toBe(true);
    expect(canAct(trade(), R, "clear", NOW)).toBe(false);
  });

  it("stops counters at the round cap", () => {
    // Round 19 is the proposer's, so the recipient counters with round 20; round 20 is the recipient's, and the
    // proposer may not counter past the cap.
    expect(canAct(trade({ round: TRADE_ROUND_MAX - 1 }), R, "counter", NOW)).toBe(true);
    expect(canAct(trade({ round: TRADE_ROUND_MAX }), P, "counter", NOW)).toBe(false);
    expect(canAct(trade({ round: TRADE_ROUND_MAX }), P, "decline", NOW)).toBe(true);
  });

  it("marks and rescinds only an accepted trade, each side marking once", () => {
    const a = trade({ status: "accepted" });
    expect(canAct(a, P, "mark", NOW)).toBe(true);
    expect(canAct({ ...a, proposerMarkedAt: NOW }, P, "mark", NOW)).toBe(false);
    expect(canAct(a, R, "rescind", NOW)).toBe(true);
    expect(canAct(trade(), P, "mark", NOW)).toBe(false);
    expect(canAct(trade(), P, "rescind", NOW)).toBe(false);
  });
});

describe("an offer's sides as sent", () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

  it("keeps distinct ids, one copy each", () => {
    expect(cleanSides({ theirs: [id(1), id(1).toUpperCase(), id(2)], yours: [id(3)] })).toEqual({ theirs: [id(1), id(2)], yours: [id(3)] });
  });

  it("refuses an empty side, a malformed id, or a side past the cap", () => {
    expect(cleanSides({ theirs: [], yours: [id(1)] })).toBeNull();
    expect(cleanSides({ theirs: [id(1)] })).toBeNull();
    expect(cleanSides({ theirs: ["nope"], yours: [id(1)] })).toBeNull();
    expect(cleanSides({ theirs: [id(1)], yours: [7] })).toBeNull();
    expect(cleanSides(null)).toBeNull();
    const many = Array.from({ length: TRADE_SIDE_MAX + 1 }, (_, i) => id(i));
    expect(cleanSides({ theirs: many, yours: [id(1)] })).toBeNull();
    expect(cleanSides({ theirs: many.slice(0, TRADE_SIDE_MAX), yours: [id(TRADE_SIDE_MAX + 5)] })?.theirs).toHaveLength(TRADE_SIDE_MAX);
  });

  it("refuses a card on both sides: a card for itself", () => {
    expect(cleanSides({ theirs: [id(1), id(2)], yours: [id(2).toUpperCase()] })).toBeNull();
  });
});

describe("a counter against the round it replaces", () => {
  it("names what it added and took out", () => {
    expect(roundDiff(["a", "c", "d"], ["a", "b"])).toEqual({ added: ["c", "d"], removed: ["b"] });
    expect(roundDiff(["a"], ["a"])).toEqual({ added: [], removed: [] });
  });
});
