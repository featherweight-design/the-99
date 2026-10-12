// The cross-user reads ask their question in SQL: each joins the grant ON THE VIEWER in the same
// statement. Only the emitted SQL can show that (the `built.test.ts` precedent), so each read's
// qualified join and viewer predicate are asserted here, and `probe:social` proves the answers.
import { describe, expect, it } from "vitest";
import { friendsQuery, podMembersQuery, resolveFriend, resolveFriendQuery, viewerPodsQuery } from "./access";

const VIEWER = "user_viewer";

describe("access reads", () => {
  it("lists friends from the viewer's own link rows, joined to the friend's profile", () => {
    const q = friendsQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`inner join "social_profiles" on "social_profiles"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`where "friend_links"."user_id" = $1`);
    expect(q.params).toEqual([VIEWER]);
    expect(q.sql).not.toContain(`"friend_links"."friend_user_id" = $`);
  });

  it("resolves a public id only through the viewer's links", () => {
    const q = resolveFriendQuery(VIEWER, "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b").toSQL();
    expect(q.sql).toContain(`"friend_links"."user_id" = $1`);
    expect(q.sql).toContain(`"social_profiles"."public_id" = $2`);
    expect(q.params.slice(0, 2)).toEqual([VIEWER, "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b"]);
  });

  it("refuses a malformed public id before any query", async () => {
    const never = { select: () => { throw new Error("queried"); } } as never;
    await expect(resolveFriend(VIEWER, "not-a-uuid", never)).resolves.toBeNull();
    await expect(resolveFriend(VIEWER, 7, never)).resolves.toBeNull();
  });

  it("lists pods by the viewer's own membership", () => {
    const q = viewerPodsQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`inner join "pods" on "pods"."id" = "pod_members"."pod_id"`);
    expect(q.sql).toContain(`where "pod_members"."user_id" = $1`);
  });

  it("reads pod members only through the viewer's membership of the same pod", () => {
    const q = podMembersQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`"viewer_membership"."pod_id" = "pod_members"."pod_id"`);
    expect(q.sql).toContain(`"viewer_membership"."user_id" = $1`);
    expect(q.params).toEqual([VIEWER]);
  });
});
