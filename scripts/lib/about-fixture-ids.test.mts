import { describe, expect, it } from "vitest";
import { deckMark, deckNames, fixtureFriendId, ownedFixturePattern, ownerTag, readDeckMarks, sortFixtures } from "./about-fixture-ids.mjs";

const A = "user_2aaaaaaaaaaaaaaaaaaaaaaaaaa";
const B = "user_2bbbbbbbbbbbbbbbbbbbbbbbbbb";

/** What Postgres's LIKE would match, for a pattern with `%` as its only wildcard. */
function like(pattern: string, value: string): boolean {
  const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/_/g, ".").replace(/%/g, ".*")}$`);
  return re.test(value);
}

describe("about fixture ids", () => {
  it("namespaces a friend by its viewer, with no Clerk id and no LIKE wildcard in the namespace", () => {
    const a = fixtureFriendId(A, 1700000000000);
    expect(a.startsWith(`about-fixture-${ownerTag(A)}-friend-`)).toBe(true);
    expect(a).not.toContain(A);
    expect(ownerTag(A)).not.toBe(ownerTag(B));
    expect(ownerTag(A)).toMatch(/^o[0-9a-f]{16}$/);
    expect(ownedFixturePattern(A).replace(/%$/, "")).not.toMatch(/[_%]/);
  });

  it("a run for B purges only B's friend: never A's, never an older run's", () => {
    const aFriend = fixtureFriendId(A, 1);
    const bFriend = fixtureFriendId(B, 2);
    const legacy = "about-fixture-colin-1760000000000";
    const sorted = sortFixtures(B, [aFriend, bFriend, legacy, "user_real", "about-fixture-colin-x"]);
    expect(sorted.purge).toEqual([bFriend]);
    expect(sorted.foreign).toEqual([aFriend]);
    expect(sorted.unowned).toEqual([legacy, "about-fixture-colin-x"]);
  });

  it("the cleanup's LIKE pattern matches its own viewer's friends only", () => {
    const pattern = ownedFixturePattern(B);
    expect(like(pattern, fixtureFriendId(B, 5))).toBe(true);
    expect(like(pattern, fixtureFriendId(A, 5))).toBe(false);
    expect(like(pattern, "about-fixture-colin-5")).toBe(false);
  });

  it("refuses to namespace no viewer", () => {
    expect(() => ownerTag("")).toThrow();
  });
});

describe("about fixture decks", () => {
  const U = "0b8f6c1e-1d2a-4c3b-9e4f-5a6b7c8d9e0f";
  const P = "1c9a7d2f-2e3b-4d4c-8f5a-6b7c8d9e0f1a";

  it("names each deck after its commander, numbering only a repeat", () => {
    expect(deckNames(["Zada, Hedron Grinder", "Ghave, Guru of Spores", "Marchesa"])).toEqual([
      "Zada, Hedron Grinder",
      "Ghave, Guru of Spores",
      "Marchesa",
    ]);
    expect(deckNames(["Sol", "sol ", "Sol"])).toEqual(["Sol", "sol 2", "Sol 3"]);
    expect(() => deckNames([" "])).toThrow();
  });

  it("records a deck by role and reads the marks back, ignoring anything else in the array", () => {
    const marks = ["entry-1", deckMark("under", U), deckMark("played", P), "about-deck:under:not-a-uuid"];
    const { byRole, ids } = readDeckMarks(marks);
    expect(byRole).toEqual({ under: U, played: P });
    expect(ids).toEqual([U, P]);
    expect(readDeckMarks(null)).toEqual({ byRole: {}, ids: [] });
  });

  it("refuses an unknown role, a non-uuid id, and two different decks for one role", () => {
    expect(() => deckMark("brew", U)).toThrow();
    expect(() => deckMark("under", "About · Under 99")).toThrow();
    expect(() => readDeckMarks([deckMark("over", U), deckMark("over", P)])).toThrow();
    expect(readDeckMarks([deckMark("over", U), deckMark("over", U)]).ids).toEqual([U]);
  });
});
