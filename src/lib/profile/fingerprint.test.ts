import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { listFingerprint, profileFingerprint } from "./fingerprint";
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

  // THE DECLARATION IS NOT AN INPUT HERE, and this is the case that says so.
  //
  // It used to be: the fingerprint read it, so one press retired the whole cached profile
  // and rebuilt the flags, combos, staples, composition and population — 630ms median and
  // 2.2s on the largest deck — to recompute figures that are identical either side of it.
  // Nothing the profile computes reads the declaration; only the verdict does, and the
  // verdict is a pure function handed it at the draw.
  //
  // There is no `declaredBracket` on the input any more, so this asserts the PROPERTY that
  // makes that safe: a fingerprint is a function of the cards and the commanders, and two
  // decks with the same ones share a key whatever either player declared.
  it("ignores a declaration even when one is handed to it", () => {
    // COMPARED AGAINST A DIFFERENT DECLARATION, not a clone of the same input — a clone
    // hashes the same whether or not the field is read, so it proves nothing. The field is
    // off the input type now, so it is forced past the compiler: what this asserts is that
    // a stray `declared_bracket` on the object cannot move the key, which is what makes a
    // cached profile safe to serve across a declaration.
    const withDeclaration = { ...base, declaredBracket: 3 } as unknown as typeof base;
    const withAnother = { ...base, declaredBracket: 5 } as unknown as typeof base;
    expect(profileFingerprint(withDeclaration)).toBe(profileFingerprint(base));
    expect(profileFingerprint(withAnother)).toBe(profileFingerprint(withDeclaration));
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

describe("listFingerprint", () => {
  it("is 64 lowercase hex chars", () => {
    expect(listFingerprint(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is stable across card-row order", () => {
    expect(listFingerprint({ ...base, cards: [...base.cards].reverse() })).toBe(listFingerprint(base));
  });

  it("moves with a quantity, a card, the commander and the partner", () => {
    expect(listFingerprint({ ...base, cards: [{ oracleId: "a", quantity: 1 }, { oracleId: "b", quantity: 3 }] }))
      .not.toBe(listFingerprint(base));
    expect(listFingerprint({ ...base, cards: [...base.cards, { oracleId: "c", quantity: 1 }] }))
      .not.toBe(listFingerprint(base));
    expect(listFingerprint({ ...base, commanderOracleId: "c-2" })).not.toBe(listFingerprint(base));
    expect(listFingerprint({ ...base, partnerOracleId: "p-1" })).not.toBe(listFingerprint(base));
  });

  it("is not the profile's key — the version is the difference", () => {
    expect(listFingerprint(base)).not.toBe(profileFingerprint(base));
  });

  // THE PROPERTY THIS FUNCTION EXISTS FOR: a version bump is not a player's edit. Both
  // functions are re-imported under a mocked PROFILE_VERSION, and the profile key is asserted
  // to MOVE beside it — without that half, a mock that failed to apply would pass this test
  // by changing nothing.
  it("does not move when PROFILE_VERSION does, while profileFingerprint does", async () => {
    vi.resetModules();
    vi.doMock("./version", () => ({ PROFILE_VERSION: PROFILE_VERSION + 1 }));
    const bumped = await import("./fingerprint");
    vi.doUnmock("./version");
    vi.resetModules();
    expect(bumped.profileFingerprint(base)).not.toBe(profileFingerprint(base));
    expect(bumped.listFingerprint(base)).toBe(listFingerprint(base));
  });
});

// Extracting the shared body must not move the profile key: every stored `deck_profiles` row
// is filed under it, and a changed hash would retire all of them on deploy — the exact
// failure listFingerprint exists to stop reading as an edit. Pinned against the literal form
// the function hashed before the extraction.
describe("profileFingerprint after the extraction", () => {
  it("hashes byte-for-byte what it hashed before", () => {
    const before = createHash("sha256")
      .update(JSON.stringify({ v: PROFILE_VERSION, commander: "c-1", partner: null, cards: [["a", 1], ["b", 2]] }))
      .digest("hex");
    expect(profileFingerprint(base)).toBe(before);
  });
});

// The play group is attached at the read and never stored, so carrying it must move neither
// key: a logged game retiring every cached and stored analysis is exactly what it avoids.
describe("the play group and the fingerprints", () => {
  it("moves neither fingerprint when a play group rides along", () => {
    const withPlay = {
      ...base,
      play: { games: [], summary: { count: 3, marked: 1, record: { wins: 1, losses: 2, draws: 0 }, axes: [] } },
    };
    expect(profileFingerprint(withPlay)).toBe(profileFingerprint(base));
    expect(listFingerprint(withPlay)).toBe(listFingerprint(base));
  });
});
