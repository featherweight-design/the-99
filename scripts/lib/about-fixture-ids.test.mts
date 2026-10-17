import { describe, expect, it } from "vitest";
import { fixtureFriendId, ownedFixturePattern, ownerTag, sortFixtures } from "./about-fixture-ids.mjs";

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
