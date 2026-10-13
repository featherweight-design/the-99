// The spares grant asks its whole question in one statement on the viewer: the friendship, the friend's
// grant to a pod, the friend's own membership of it, and the viewer's. Only the emitted SQL can show all
// four are there; `probe:social` proves the answers.
import { describe, expect, it } from "vitest";
import { sharedPodsQuery, spareCount, spareGrantorsQuery } from "./spares";

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

describe("sharedPodsQuery", () => {
  it("lists only grants on pods the viewer is still in", () => {
    const q = sharedPodsQuery(VIEWER).toSQL();
    expect(q.sql).toMatch(/"pod_members"\."pod_id" = "pod_spare_shares"\."pod_id" and "pod_members"\."user_id" = \$\d+/);
    expect(q.sql).toMatch(/where "pod_spare_shares"\."user_id" = \$\d+/);
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
