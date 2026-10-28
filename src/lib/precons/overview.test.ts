import { describe, expect, it } from "vitest";
import { listFingerprint } from "../profile/fingerprint";
import { carryOverDecision, synopsisRequestHash } from "./overview";
import { preconDeckCards } from "./start";

const LIST = "list-a";
const row = { listFingerprint: LIST, contractVersion: 12, current: true };

describe("carryOverDecision", () => {
  it("attaches a current overview of exactly this list", () => {
    expect(carryOverDecision({ analysisTab: true, row, liveFingerprint: LIST })).toEqual({ attach: true });
  });

  it("attaches nothing without the Analysis tab, a stored row, current inputs or the same list", () => {
    expect(carryOverDecision({ analysisTab: false, row, liveFingerprint: LIST })).toEqual({ attach: false, reason: "off" });
    expect(carryOverDecision({ analysisTab: true, row: null, liveFingerprint: LIST })).toEqual({ attach: false, reason: "none" });
    expect(carryOverDecision({ analysisTab: true, row: { ...row, current: false }, liveFingerprint: LIST })).toEqual({ attach: false, reason: "not_current" });
    expect(carryOverDecision({ analysisTab: true, row, liveFingerprint: "list-b" })).toEqual({ attach: false, reason: "list_moved" });
  });
});

describe("preconDeckCards", () => {
  const lines = [
    { oracleId: "cmd", quantity: 1, isCommander: true },
    { oracleId: "island", quantity: 4, isCommander: false },
    { oracleId: "sol", quantity: 1, isCommander: false },
    // The feed lists a basic once per art: one row per card in the deck.
    { oracleId: "island", quantity: 3, isCommander: false },
  ];

  it("leaves the commanders out and sums a card listed under two printings", () => {
    expect(preconDeckCards(lines)).toEqual([{ oracleId: "island", quantity: 7 }, { oracleId: "sol", quantity: 1 }]);
  });

  it("fingerprints the same whatever order the feed lists the cards in", () => {
    const summed = { commanderOracleId: "cmd", partnerOracleId: null, cards: [{ oracleId: "sol", quantity: 1 }, { oracleId: "island", quantity: 7 }] };
    const fromFeed = { commanderOracleId: "cmd", partnerOracleId: null, cards: preconDeckCards([...lines].reverse()) };
    expect(listFingerprint(fromFeed)).toBe(listFingerprint(summed));
  });
});

describe("synopsisRequestHash", () => {
  it("is stable for one request and moves with any field", () => {
    const req = { model: "m", system: "s", messages: [{ role: "user", content: "oracle text A" }] };
    expect(synopsisRequestHash(req)).toBe(synopsisRequestHash({ ...req }));
    expect(synopsisRequestHash({ ...req, messages: [{ role: "user", content: "oracle text B" }] })).not.toBe(synopsisRequestHash(req));
  });
});
