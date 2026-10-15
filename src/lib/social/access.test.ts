// The cross-user reads ask their question in SQL: each joins the grant ON THE VIEWER in the same
// statement. Only the emitted SQL can show that (the `built.test.ts` precedent), so each read's
// qualified join and viewer predicate are asserted here, and `probe:social` proves the answers.
import { describe, expect, it } from "vitest";
import { friendQuery, friendsQuery, loadFriend, podMembersQuery, resolveFriend, resolveFriendQuery, shapePod, sortFriends, viewerPodsQuery } from "./access";

const VIEWER = "user_viewer";

describe("access reads", () => {
  it("lists friends from the viewer's own link rows, joined to the friend's profile", () => {
    const q = friendsQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`inner join "social_profiles" on "social_profiles"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`where "friend_links"."user_id" = $1`);
    expect(q.params).toEqual([VIEWER]);
    expect(q.sql).not.toContain(`"friend_links"."friend_user_id" = $`);
  });

  it("reads one friend by public id only through the viewer's own link row (G2)", () => {
    const PUB = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
    const q = friendQuery(VIEWER, PUB).toSQL();
    expect(q.sql).toContain(`inner join "social_profiles" on "social_profiles"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`where ("friend_links"."user_id" = $1 and "social_profiles"."public_id" = $2)`);
    expect(q.sql).toContain(`left join "cards" "commander_card" on "commander_card"."oracle_id" = "social_profiles"."commander_oracle_id"`);
    expect(q.sql).toMatch(/ limit \$3$/);
    expect(q.params).toEqual([VIEWER, PUB, 1]);
  });

  it("answers one friend in the list's shape, and refuses a malformed public id before any query", async () => {
    const never = { select: () => { throw new Error("queried"); } } as never;
    await expect(loadFriend(VIEWER, "not-a-uuid", never)).resolves.toBeNull();
    const since = new Date("2026-10-01T00:00:00Z");
    const row = {
      publicId: "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b", displayName: "Bob", since,
      commanderOracleId: "11111111-1111-4111-8111-111111111111", commanderName: "Kilo", commanderArt: "art.jpg",
    };
    const chain: Record<string, unknown> = {};
    for (const m of ["from", "innerJoin", "leftJoin", "$dynamic", "where", "limit"]) chain[m] = () => chain;
    chain.then = (resolve: (v: unknown) => void) => resolve([row]);
    const reader = { select: () => chain } as never;
    await expect(loadFriend(VIEWER, row.publicId, reader)).resolves.toEqual({
      publicId: row.publicId, displayName: "Bob", since,
      commander: { oracleId: row.commanderOracleId, name: "Kilo", artCropUri: "art.jpg" },
    });
    chain.then = (resolve: (v: unknown) => void) => resolve([]);
    await expect(loadFriend(VIEWER, row.publicId, reader)).resolves.toBeNull();
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
    expect(q.params.every((p) => p === VIEWER)).toBe(true);
  });

  it("draws a friend's face from the friend's own profile row", () => {
    const q = friendsQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`left join "cards" "commander_card" on "commander_card"."oracle_id" = "social_profiles"."commander_oracle_id"`);
    expect(q.sql).toContain(`"commander_card"."art_crop_uri"`);
  });

  it("joins the viewer's friendship with each pod member, and a face only through it or for the viewer (D2)", () => {
    const q = podMembersQuery(VIEWER).toSQL();
    expect(q.sql).toContain(
      `left join "friend_links" "viewer_friend" on ("viewer_friend"."user_id" = $2 and "viewer_friend"."friend_user_id" = "pod_members"."user_id")`,
    );
    expect(q.sql).toContain(
      `left join "cards" "commander_card" on ("commander_card"."oracle_id" = "social_profiles"."commander_oracle_id" and ("pod_members"."user_id" = $3 or "viewer_friend"."user_id" is not null))`,
    );
    expect(q.params).toEqual([VIEWER, VIEWER, VIEWER]);
  });
});

const T0 = new Date("2026-10-01T00:00:00Z");
const T1 = new Date("2026-10-02T00:00:00Z");
const face = (id: string) => ({ commanderOracleId: id, commanderName: `Card ${id}`, commanderArt: `art/${id}` });
type Face = { commanderOracleId: string | null; commanderName: string | null; commanderArt: string | null };
const noFace: Face = { commanderOracleId: null, commanderName: null, commanderArt: null };
const row = (userId: string, displayName: string, joinedAt: Date, isFriend: boolean, f: Face = noFace) =>
  ({ podId: "p", userId, joinedAt, publicId: `pub_${userId}`, displayName, isFriend, ...f });

describe("shapePod", () => {
  const pod = { id: "p", name: "Table", ownerUserId: "u_owner" };
  const rows = [
    row("u_zed", "Zed", T0, true, face("z")),
    row(VIEWER, "Me", T1, false, face("v")),
    row("u_owner", "Olga", T0, true, face("o")),
    row("u_amy", "Amy", T1, false),
  ];

  it("orders the owner, then You, then by name", () => {
    expect(shapePod(pod, rows, VIEWER).members.map((m) => m.displayName)).toEqual(["Olga", "Me", "Amy", "Zed"]);
  });

  it("says who is a friend, never the viewer", () => {
    const m = shapePod(pod, rows, VIEWER).members;
    expect(m.map((x) => [x.displayName, x.isFriend, x.isYou])).toEqual([
      ["Olga", true, false], ["Me", false, true], ["Amy", false, false], ["Zed", true, false],
    ]);
  });

  it("carries the face the read joined, and none where it joined none", () => {
    const m = shapePod(pod, rows, VIEWER).members;
    expect(m.find((x) => x.displayName === "Zed")?.commander).toEqual({ oracleId: "z", name: "Card z", artCropUri: "art/z" });
    expect(m.find((x) => x.displayName === "Amy")?.commander).toBeNull();
  });

  it("names no next owner to a member", () => {
    expect(shapePod(pod, rows, VIEWER).nextOwner).toBeNull();
  });

  it("names the next owner to the owner: earliest joined, a tie broken by account id", () => {
    const asOwner = shapePod({ ...pod, ownerUserId: VIEWER }, [
      row(VIEWER, "Me", T0, false),
      row("u_b", "Bea", T1, true),
      row("u_a", "Zack", T1, true),
    ], VIEWER);
    expect(asOwner.isOwner).toBe(true);
    expect(asOwner.nextOwner).toEqual({ publicId: "pub_u_a", displayName: "Zack" });
  });

  it("names nobody when the owner is alone", () => {
    expect(shapePod({ ...pod, ownerUserId: VIEWER }, [row(VIEWER, "Me", T0, false)], VIEWER).nextOwner).toBeNull();
  });
});

describe("sortFriends", () => {
  it("sorts by name ignoring case and accents, the public id breaking a tie (C4)", () => {
    const f = (displayName: string, publicId: string) => ({ displayName, publicId });
    const out = sortFriends([f("zed", "p1"), f("Émile", "p2"), f("Bob", "p3"), f("alex", "p4"), f("bob", "p0")]);
    expect(out.map((x) => `${x.displayName}:${x.publicId}`)).toEqual(["alex:p4", "bob:p0", "Bob:p3", "Émile:p2", "zed:p1"]);
  });
});
