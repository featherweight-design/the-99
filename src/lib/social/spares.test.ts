// The spares grant asks its whole question in one statement on the viewer: the friendship, the friend's
// grant to a pod, the friend's own membership of it, and the viewer's. Only the emitted SQL can show all
// four are there; `probe:social` proves the answers.
import { describe, expect, it } from "vitest";
import { listSharedPods, sharedPodsQuery, spareCount, spareGrantDetailsQuery, spareGrantorsQuery } from "./spares";

const VIEWER = "user_viewer";

describe("spareGrantorsQuery", () => {
  const q = spareGrantorsQuery(VIEWER).toSQL();

  it("starts from the viewer's own friendships", () => {
    expect(q.sql).toMatch(/where "friend_links"\."user_id" = \$\d+$|where "friend_links"\."user_id" = \$\d+ order by/);
  });

  it("joins the friend's grant, the friend's membership of that pod, and the viewer's", () => {
    expect(q.sql).toContain(`inner join "pod_spare_shares" on "pod_spare_shares"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`"friend_in"."pod_id" = "pod_spare_shares"."pod_id" and "friend_in"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toMatch(/"viewer_in"\."pod_id" = "pod_spare_shares"\."pod_id" and "viewer_in"\."user_id" = \$\d+/);
    expect(q.params.filter((p) => p === VIEWER)).toHaveLength(2);
  });

  it("returns no owned count, claim or deck", () => {
    expect(q.sql).not.toMatch(/collection_items|deck/);
  });
});

describe("spareGrantDetailsQuery (R2 PR 2)", () => {
  const q = spareGrantDetailsQuery(VIEWER).toSQL();

  it("asks the same four-part grant as the grantors read, on the viewer", () => {
    expect(q.sql).toContain(`inner join "pod_spare_shares" on "pod_spare_shares"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`"friend_in"."pod_id" = "pod_spare_shares"."pod_id" and "friend_in"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toMatch(/"viewer_in"\."pod_id" = "pod_spare_shares"\."pod_id" and "viewer_in"\."user_id" = \$\d+/);
    expect(q.sql).toMatch(/where "friend_links"\."user_id" = \$\d+ group by/);
    expect(q.params).toEqual([VIEWER, VIEWER]);
  });

  it("names the pods the grant holds through, and only those", () => {
    expect(q.sql).toContain(`inner join "pods" on "pods"."id" = "pod_spare_shares"."pod_id"`);
    expect(q.sql).toContain(`array_agg("pods"."name" order by "pods"."name", "pods"."id")`);
  });

  it("draws the friend's face from their own profile, one row per friend", () => {
    expect(q.sql).toContain(`left join "cards" "commander_card" on "commander_card"."oracle_id" = "social_profiles"."commander_oracle_id"`);
    expect(q.sql).toContain(`group by "friend_links"."friend_user_id", "social_profiles"."public_id", "social_profiles"."display_name", "commander_card"."oracle_id"`);
  });

  it("returns no owned count, claim or deck", () => {
    expect(q.sql).not.toMatch(/collection_items|deck/);
  });
});

describe("sharedPodsQuery", () => {
  it("lists only grants on pods the viewer is still in", () => {
    const q = sharedPodsQuery(VIEWER).toSQL();
    expect(q.sql).toMatch(/"pod_members"\."pod_id" = "pod_spare_shares"\."pod_id" and "pod_members"\."user_id" = \$\d+/);
    expect(q.sql).toMatch(/where "pod_spare_shares"\."user_id" = \$\d+/);
  });
});

describe("listSharedPods (E5)", () => {
  it("answers the shared-pods query's rows, read through the reader it is given", async () => {
    const rows = [{ podId: "p1", name: "Table" }];
    const calls: string[] = [];
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "where", "orderBy"]) chain[m] = () => { calls.push(m); return chain; };
    chain.then = (resolve: (v: unknown) => void) => resolve(rows);
    const reader = { select: () => chain, selectDistinct: () => chain } as never;
    await expect(listSharedPods(VIEWER, reader)).resolves.toEqual(rows);
    expect(calls).toEqual(["from", "innerJoin", "innerJoin", "where", "orderBy"]);
  });
});

describe("spareCount (Q12)", () => {
  it("is what no deck, committed or draft, asks for", () => {
    expect(spareCount({ owned: 4, hard: 1, soft: 1 })).toBe(2);
  });

  it("gives nothing for a copy only a draft wants", () => {
    expect(spareCount({ owned: 1, hard: 0, soft: 1 })).toBe(0);
  });

  it("never goes below zero when decks ask for more than exist", () => {
    expect(spareCount({ owned: 1, hard: 2, soft: 1 })).toBe(0);
  });
});
