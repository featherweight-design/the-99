// The landing read and the open-links list (Social R1 PR A; audit E3, E6, D1). The emitted SQL proves the
// correlated subquery is qualified on both sides (AGENTS.md); `shapeInvite` proves what an ended link may
// say; `probe:social` proves the answers on a database.
import { describe, expect, it } from "vitest";
import { inviteOutcomesQuery, inviteQuery, openInvitesQuery, shapeInvite, shapeOutcome } from "./friends";
import { named } from "../person-name/mint";

const VIEWER = "user_viewer";
const NOW = new Date("2026-10-15T12:00:00Z");
const LATER = new Date("2026-10-20T12:00:00Z");
const SINCE = new Date("2026-10-02T09:41:00Z");

const row = (over: Partial<Parameters<typeof shapeInvite>[0]> = {}): Parameters<typeof shapeInvite>[0] => ({
  inviterUserId: "user_inviter",
  expiresAt: LATER,
  redeemedAt: null,
  declinedAt: null,
  revokedAt: null,
  inviterName: "Dave",
  friendsSince: null,
  commanderOracleId: "c1",
  commanderName: "Atraxa",
  commanderArt: "art/c1",
  ...over,
});

describe("inviteQuery", () => {
  it("reads friendsSince through a correlated subquery qualified on both sides", () => {
    const q = inviteQuery(VIEWER, "tok").toSQL();
    expect(q.sql).toContain(`where fl.user_id = $1 and fl.friend_user_id = "friend_invites".inviter_user_id`);
    expect(q.params[0]).toBe(VIEWER);
  });

  it("draws the inviter's face from the inviter's profile", () => {
    const q = inviteQuery(VIEWER, "tok").toSQL();
    expect(q.sql).toContain(`inner join "social_profiles" on "social_profiles"."user_id" = "friend_invites"."inviter_user_id"`);
    expect(q.sql).toContain(`left join "cards" "commander_card" on "commander_card"."oracle_id" = "social_profiles"."commander_oracle_id"`);
  });
});

describe("shapeInvite", () => {
  it("an open link names its inviter and shows the face", () => {
    // The row is the database's string; the payload carries it branded.
    expect(shapeInvite(row(), VIEWER, NOW)).toEqual({
      state: "open", inviterName: named("Dave"), commander: { oracleId: "c1", name: "Atraxa", artCropUri: "art/c1" },
      self: false, alreadyFriends: false, friendsSince: null,
    });
  });

  it("your own open link is self", () => {
    expect(shapeInvite(row({ inviterUserId: VIEWER }), VIEWER, NOW)).toMatchObject({ state: "open", self: true });
  });

  it("an open link from a friend says since when", () => {
    expect(shapeInvite(row({ friendsSince: SINCE }), VIEWER, NOW)).toMatchObject({ alreadyFriends: true, friendsSince: SINCE });
  });

  it("an inviter with no face reads null", () => {
    const shaped = shapeInvite(row({ commanderOracleId: null, commanderName: null, commanderArt: null }), VIEWER, NOW);
    expect(shaped).toMatchObject({ commander: null });
  });

  it.each([
    ["redeemed", { redeemedAt: NOW }],
    ["declined", { declinedAt: NOW }],
    ["revoked", { revokedAt: NOW }],
    ["expired", { expiresAt: NOW }],
  ] as const)("a %s link carries its state and nothing else, even from a friend", (state, over) => {
    expect(shapeInvite(row({ ...over, friendsSince: SINCE }), VIEWER, NOW)).toEqual({ state });
    expect(shapeInvite(row({ ...over, inviterUserId: VIEWER }), VIEWER, NOW)).toEqual({ state });
  });
});

describe("openInvitesQuery", () => {
  it("lists the viewer's own links, open ones only, oldest first", () => {
    const q = openInvitesQuery(VIEWER, NOW).toSQL();
    expect(q.sql).toContain(`"friend_invites"."inviter_user_id" = $1`);
    for (const col of ["redeemed_at", "declined_at", "revoked_at"]) expect(q.sql).toContain(`"friend_invites"."${col}" is null`);
    expect(q.sql).toContain(`"friend_invites"."expires_at" > $2`);
    expect(q.sql).toContain(`order by "friend_invites"."created_at" asc`);
    expect(q.params[0]).toBe(VIEWER);
  });
});

describe("inviteOutcomesQuery", () => {
  it("reads only the viewer's own links, and names a redeemer only through the viewer's own friendship row", () => {
    const q = inviteOutcomesQuery(VIEWER, ["tokA", "tokB"]).toSQL();
    expect(q.sql).toContain(`left join "friend_links" on ("friend_links"."user_id" = $1 and "friend_links"."friend_user_id" = "friend_invites"."redeemed_by")`);
    expect(q.sql).toContain(`left join "social_profiles" on "social_profiles"."user_id" = "friend_links"."friend_user_id"`);
    expect(q.sql).toContain(`"friend_invites"."inviter_user_id" = $2`);
    expect(q.params).toEqual([VIEWER, VIEWER, "tokA", "tokB"]);
  });
});

describe("shapeOutcome", () => {
  const out = (over: Partial<Parameters<typeof shapeOutcome>[0]> = {}) => shapeOutcome({
    token: "tok", redeemedAt: null, declinedAt: null, revokedAt: null, expiresAt: LATER, publicId: null, displayName: null, ...over,
  }, NOW);

  it("an open link is open and names nobody", () => {
    expect(out()).toEqual({ token: "tok", open: true, friend: null });
  });

  it("a link redeemed by someone now a friend names them", () => {
    expect(out({ redeemedAt: NOW, publicId: "p-mo", displayName: "Mo" })).toEqual({ token: "tok", open: false, friend: { publicId: "p-mo", displayName: named("Mo") } });
  });

  it("a link redeemed by someone no longer a friend is ended and names nobody", () => {
    expect(out({ redeemedAt: NOW })).toEqual({ token: "tok", open: false, friend: null });
  });

  it("an expired, declined or revoked link is ended", () => {
    expect(out({ expiresAt: NOW }).open).toBe(false);
    expect(out({ declinedAt: NOW }).open).toBe(false);
    expect(out({ revokedAt: NOW }).open).toBe(false);
  });
});
