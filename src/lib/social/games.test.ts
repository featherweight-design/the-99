// A friend's deck is read only through the viewer's own friendship row, in the same statement, and a pod
// seats only members who are the viewer's friends. Only the emitted SQL shows that (the `built.test.ts`
// precedent); `probe:game-opponents` proves the answers.
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { friendDeckCountsQuery, friendDecksIn, friendDecksQuery, friendshipsIn, listFriendDecks, listPodSeats, pickerDeckFigures, podSeatsQuery } from "./games";

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

describe("what the picker draws of a friend's deck", () => {
  const q = friendDecksQuery(VIEWER, [FRIEND]).toSQL();

  it("lists the newest deck first, so the one a friend is playing now leads", () => {
    expect(q.sql).toMatch(/order by "social_profiles"\."public_id" asc, "decks"\."created_at" desc, "decks"\."id" asc$/);
  });
  it("names the commander and its art through the deck's own commander id", () => {
    expect(q.sql).toContain(`"commander_card"."oracle_id" = "decks"."commander_oracle_id"`);
    expect(q.sql.slice(0, q.sql.indexOf(" from "))).toContain(`"commander_card"."image_uri"`);
  });
});

describe("friendDeckCountsQuery", () => {
  const q = friendDeckCountsQuery(VIEWER).toSQL();

  it("counts decks only for friends the viewer's own link row names, one count per friend", () => {
    expect(q.sql).toMatch(/where "friend_links"\."user_id" = \$1 group by "social_profiles"\."public_id", "friend_links"\."friend_user_id", "user_prefs"\."friends_see_decks"$/);
    expect(q.sql).toContain(`left join "decks" on "decks"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.params).toEqual([VIEWER]);
  });

  it("counts the decks the owner's rules let through apart, and says only WHETHER any were withheld", () => {
    expect(q.sql).toContain(`left join "user_prefs" on "user_prefs"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`count("decks"."id") filter (where (not "decks"."hidden_from_friends" and coalesce("user_prefs"."friends_see_decks", true)))`);
    expect(q.sql).toContain(`(not coalesce("user_prefs"."friends_see_decks", true) or coalesce(bool_or("decks"."hidden_from_friends"), false))`);
    // No unfinished rule: drafts are pickable.
    expect(q.sql).not.toMatch(/friends_see_unfinished|status/);
  });
});

describe("the picker's deck rules (friend decks PR 5)", () => {
  it("as shipped for an owner whose switch is off: every deck, no rule", () => {
    const q = friendDecksQuery(VIEWER, [FRIEND]).toSQL();
    expect(q.sql).not.toContain("hidden_from_friends");
    expect(q.params).toEqual([VIEWER, FRIEND]);
  });

  it("for an owner whose switch is on: no hidden deck, and none at all while Friends can see my decks is off", () => {
    const q = friendDecksQuery(VIEWER, [FRIEND], ["user_friend"]).toSQL();
    expect(q.sql).toContain(`left join "user_prefs" on "user_prefs"."user_id" = "decks"."user_id"`);
    expect(q.sql).toContain(`("decks"."user_id" not in ($3) or (not "decks"."hidden_from_friends" and coalesce("user_prefs"."friends_see_decks", true)))`);
    expect(q.params).toEqual([VIEWER, FRIEND, "user_friend"]);
    expect(q.sql).not.toMatch(/friends_see_unfinished|status/);
  });

  it("the count and withheld follow the owner's switch, and withheld carries no count", () => {
    const row = { count: 3, visible: 1, withheld: true };
    expect(pickerDeckFigures(row, true)).toEqual({ deckCount: 1, withheld: true });
    expect(pickerDeckFigures(row, false)).toEqual({ deckCount: 3, withheld: false });
    expect(typeof pickerDeckFigures(row, true).withheld).toBe("boolean");
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

  it("check a chosen friend deck without the owner's deck rules, so a deck hidden since the pick still logs", () => {
    const q = friendDecksIn(tx, VIEWER, [DECK]).toSQL();
    expect(q.sql).not.toMatch(/hidden_from_friends|user_prefs/);
  });
});

describe("malformed ids read nothing", () => {
  it("before any query", async () => {
    await expect(listFriendDecks(VIEWER, "nope")).resolves.toEqual([]);
    await expect(listPodSeats(VIEWER, 7)).resolves.toEqual([]);
  });
});
