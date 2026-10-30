import { describe, expect, it } from "vitest";
import { listFingerprint } from "../profile/fingerprint";
import { carryOverDecision, pickOverviewRow, synopsisRequestHash } from "./overview";
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

describe("pickOverviewRow (the pre-batch fallback to contract 12)", () => {
  const v13 = { listFingerprint: LIST, contractVersion: 13, current: true };
  const stale12 = { listFingerprint: LIST, contractVersion: 12, current: false };

  it("prefers a current contract-13 row over the 12 one", () => {
    expect(pickOverviewRow([stale12, v13], 13, 12)).toEqual({ row: v13, viaFallback: false });
  });

  it("draws and carries a precon with only a stale-hash contract-12 row", () => {
    const picked = pickOverviewRow([stale12], 13, 12);
    expect(picked.viaFallback).toBe(true);
    expect(picked.row?.contractVersion).toBe(12);
    expect(carryOverDecision({ analysisTab: true, row: picked.row, liveFingerprint: LIST })).toEqual({ attach: true });
  });

  it("still refuses the 12 row for another list", () => {
    const picked = pickOverviewRow([stale12], 13, 12);
    expect(carryOverDecision({ analysisTab: true, row: picked.row, liveFingerprint: "list-b" })).toEqual({ attach: false, reason: "list_moved" });
  });

  it("falls back from a non-current 13 row, and gives the usual reasons when there is no fallback", () => {
    expect(pickOverviewRow([{ ...v13, current: false }, stale12], 13, 12).row?.contractVersion).toBe(12);
    const own = pickOverviewRow([{ ...v13, current: false }], 13, 12);
    expect(carryOverDecision({ analysisTab: true, row: own.row, liveFingerprint: LIST })).toEqual({ attach: false, reason: "not_current" });
    expect(pickOverviewRow([stale12], 13, null)).toEqual({ row: null, viaFallback: false });
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
