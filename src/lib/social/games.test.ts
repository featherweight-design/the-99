// A friend's deck is read only through the viewer's own friendship row, in the same statement, and a pod
// seats only members who are the viewer's friends. Only the emitted SQL shows that (the `built.test.ts`
// precedent); `probe:game-opponents` proves the answers.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { friendDecksIn, friendDecksQuery, friendshipsIn, listFriendDecks, listPodSeats, podSeatsQuery } from "./games";

const VIEWER = "user_viewer";
const FRIEND = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const DECK = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const tx = db as never;

describe("friendDecksQuery", () => {
  const q = friendDecksQuery(VIEWER, [FRIEND]).toSQL();

  it("reads decks owned by the friend the viewer's own link row names", () => {
    expect(q.sql).toContain(`inner join "decks" on "decks"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toMatch(/where \("friend_links"\."user_id" = \$1 and "social_profiles"\."public_id" in \(\$2\)\)/);
    expect(q.params).toEqual([VIEWER, FRIEND]);
  });

  it("returns a deck's name and commanders, never its list or its owner's id", () => {
    const projection = q.sql.slice(0, q.sql.indexOf(" from "));
    expect(projection).not.toMatch(/user_id/);
    expect(q.sql).not.toMatch(/deck_cards/);
  });
});

describe("podSeatsQuery", () => {
  const q = podSeatsQuery(VIEWER, DECK).toSQL();

  it("seats only a pod the viewer is in", () => {
    expect(q.sql).toMatch(/"viewer_in"\."pod_id" = "pod_members"\."pod_id" and "viewer_in"\."user_id" = \$1/);
  });

  it("and only members who are the viewer's friends", () => {
    expect(q.sql).toMatch(/"friend_links"\."user_id" = \$2 and "friend_links"\."friend_user_id" = "pod_members"\."user_id"/);
    expect(q.params.filter((p) => p === VIEWER)).toHaveLength(2);
  });
});

describe("the write-time reads", () => {
  it("hold the viewer's friendship rows FOR SHARE, read by the viewer", () => {
    const q = friendshipsIn(tx, VIEWER, [FRIEND]).toSQL();
    expect(q.sql).toMatch(/where \("friend_links"\."user_id" = \$1 and "social_profiles"\."public_id" in \(\$2\)\)/);
    expect(q.sql).toMatch(/for share of "friend_links"$/);
  });

  it("hold a friend's decks FOR KEY SHARE, joined to the viewer's friendship", () => {
    const q = friendDecksIn(tx, VIEWER, [DECK]).toSQL();
    expect(q.sql).toContain(`"friend_links"."friend_user_id" = "decks"."user_id" and "friend_links"."user_id" = $1`);
    expect(q.sql).toMatch(/for key share of "decks"$/);
  });
});

describe("malformed ids read nothing", () => {
  it("before any query", async () => {
    await expect(listFriendDecks(VIEWER, "nope")).resolves.toEqual([]);
    await expect(listPodSeats(VIEWER, 7)).resolves.toEqual([]);
  });
});
