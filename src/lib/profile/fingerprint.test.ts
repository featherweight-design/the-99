import { describe, expect, it } from "vitest";

import { profileFingerprint } from "./fingerprint";
import { PROFILE_VERSION } from "./version";

const base = {
  commanderOracleId: "c-1",
  partnerOracleId: null as string | null,
  declaredBracket: null as number | null,
  cards: [
    { oracleId: "a", quantity: 1 },
    { oracleId: "b", quantity: 2 },
  ],
};

describe("profileFingerprint", () => {
  it("is 64 lowercase hex chars", () => {
    expect(profileFingerprint(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  // Row order out of Postgres is not a property of the deck. Two decks holding the same
  // cards must fingerprint the same however the rows happened to come back.
  it("is stable across card-row order", () => {
    expect(profileFingerprint({ ...base, cards: [...base.cards].reverse() })).toBe(
      profileFingerprint(base),
    );
  });

  it("does not mutate the caller's array", () => {
    const cards = [
      { oracleId: "z", quantity: 1 },
      { oracleId: "a", quantity: 1 },
    ];
    profileFingerprint({ ...base, cards });
    expect(cards.map((c) => c.oracleId)).toEqual(["z", "a"]);
  });

  it("moves with quantity", () => {
    expect(
      profileFingerprint({ ...base, cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 3 }] }),
    ).not.toBe(profileFingerprint(base));
  });

  it("moves with the commander", () => {
    expect(profileFingerprint({ ...base, commanderOracleId: "c-2" })).not.toBe(
      profileFingerprint(base),
    );
  });

  it("moves with the partner", () => {
    expect(profileFingerprint({ ...base, partnerOracleId: "p-1" })).not.toBe(
      profileFingerprint(base),
    );
  });

  // The declaration is an INPUT to the verdict, not a label on it: a cached profile built
  // under the old declaration would keep reporting the old drift.
  it("moves with the declared bracket", () => {
    expect(profileFingerprint({ ...base, declaredBracket: 3 })).not.toBe(
      profileFingerprint(base),
    );
  });

  // Pinned rather than asserted by reading the constant back: the point is that a bump
  // retires every cached profile, and a test importing the version proves only that the
  // version equals itself.
  it("moves with PROFILE_VERSION", () => {
    const withVersion = (v: number) =>
      JSON.stringify({ v, commander: "c-1", partner: null, declared: null, cards: [] });
    expect(withVersion(PROFILE_VERSION)).not.toBe(withVersion(PROFILE_VERSION + 1));
  });

  // R6: provenance is not membership. `auto` records who added a card; the deck holds it
  // either way, and every fact the profile computes reads the same.
  it("ignores fields it was not given — an extra key changes nothing", () => {
    const withExtra = { ...base, cards: base.cards.map((c) => ({ ...c, auto: true })) };
    expect(profileFingerprint(withExtra)).toBe(profileFingerprint(base));
  });
});
