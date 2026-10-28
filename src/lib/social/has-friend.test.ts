// The cart's "has a friend" read asks its question in SQL, joined on the viewer's own link rows (the `access.test.ts`
// precedent): only the emitted SQL can show that.
import { describe, expect, it } from "vitest";
import { hasFriend, hasFriendQuery } from "./has-friend";

const VIEWER = "user_viewer";

describe("hasFriend", () => {
  it("asks through the viewer's own link rows, joined to the friend's profile, one row at most (cart v2 Empty-One C)", () => {
    const q = hasFriendQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`inner join "social_profiles" on "social_profiles"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`where "friend_links"."user_id" = $1`);
    expect(q.sql).toMatch(/ limit \$2$/);
    expect(q.params).toEqual([VIEWER, 1]);
    expect(q.sql).not.toContain(`"friend_links"."friend_user_id" = $`);
  });

  it("is true with a row and false with none", async () => {
    const reader = (rows: unknown[]) => ({
      select: () => ({ from: () => ({ innerJoin: () => ({ where: () => ({ limit: async () => rows }) }) }) }),
    }) as never;
    await expect(hasFriend(VIEWER, reader([{ publicId: "p" }]))).resolves.toBe(true);
    await expect(hasFriend(VIEWER, reader([]))).resolves.toBe(false);
  });
});
