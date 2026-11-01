import { describe, expect, it } from "vitest";
import { named } from "../person-name/mint";
import { friendSeatPredicate, historySeatsQuery, playedAgainstFriendsQuery, seatsFromRows } from "./game-history";
import { db } from "../../db";
import { and, eq } from "drizzle-orm";
import { deckGames } from "../../db/schema";

const VIEWER = "user_viewer";
const FRIEND = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const GAME = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("friendSeatPredicate", () => {
  // Rendered inside a select on deck_games, as the history does.
  const render = (opts?: { won?: boolean }) =>
    db.select({ id: deckGames.id }).from(deckGames).where(and(eq(deckGames.userId, VIEWER), friendSeatPredicate(VIEWER, FRIEND, opts))).toSQL();

  it("resolves the friend through the viewer's own link row in the same statement", () => {
    const q = render();
    expect(q.sql).toContain(`o.game_id = "deck_games".id`);
    expect(q.sql).toContain(`inner join "friend_links" fl on fl.friend_user_id = sp.user_id`);
    expect(q.sql).toContain("fl.user_id = $");
    expect(q.params).toEqual([VIEWER, VIEWER, FRIEND]);
  });

  it("narrows to the seat that won only when asked", () => {
    expect(render().sql).not.toMatch(/and o\.won/);
    expect(render({ won: true }).sql).toMatch(/and o\.won/);
  });
});

describe("historySeatsQuery", () => {
  const q = historySeatsQuery(VIEWER, [GAME]).toSQL();

  it("reads only the viewer's own games on the viewer's own decks", () => {
    expect(q.sql).toContain(`inner join "decks" on ("decks"."id" = "deck_games"."deck_id" and "decks"."user_id" = $1)`);
    expect(q.sql).toContain(`"deck_games"."user_id" = $3`);
    expect(q.params).toEqual([VIEWER, VIEWER, VIEWER, GAME]);
  });

  it("gives a seat a public id only through the viewer's own friend link", () => {
    expect(q.sql).toContain(`left join "friend_links" on ("friend_links"."user_id" = $2 and "friend_links"."friend_user_id" = "deck_game_opponents"."friend_user_id")`);
    expect(q.sql).toContain(`left join "social_profiles" on "social_profiles"."user_id" = "friend_links"."friend_user_id"`);
  });
});

describe("playedAgainstFriendsQuery", () => {
  const q = playedAgainstFriendsQuery(VIEWER).toSQL();

  it("lists current friends only, counted per distinct game, over the viewer's own games", () => {
    expect(q.sql).toContain(`inner join "friend_links" on ("friend_links"."user_id" = $2 and "friend_links"."friend_user_id" = "deck_game_opponents"."friend_user_id")`);
    expect(q.sql).toContain(`count(distinct "deck_game_opponents"."game_id")::int`);
    expect(q.sql).toContain(`"deck_games"."user_id" = $3`);
    expect(q.sql).toMatch(/group by "social_profiles"\."public_id", "social_profiles"\."display_name"/);
  });
});

describe("seatsFromRows", () => {
  const row = (over: object) => ({
    gameId: "g1", seat: 1, friendUserId: null, friendNameThen: null, deckNameThen: null, label: null, won: false,
    commanderOracleId: null, commanderName: null, commanderIdentity: null,
    partnerOracleId: null, partnerName: null, partnerIdentity: null, publicId: null, ...over,
  });

  it("carries the public id for a current friend and null once the link or account is gone", () => {
    const out = seatsFromRows([
      row({ friendUserId: "user_dave", friendNameThen: "Dave", publicId: FRIEND }),
      row({ gameId: "g2", friendUserId: "user_dave", friendNameThen: "David", publicId: FRIEND }),
      row({ gameId: "g2", seat: 2, friendUserId: null, friendNameThen: "Gone", publicId: null }),
    ]);
    expect(out.get("g1")![0].friend).toEqual({ key: "f1", publicId: FRIEND, name: named("Dave") });
    expect(out.get("g2")!.map((s) => s.friend!.publicId)).toEqual([FRIEND, null]);
    // The snapshot still draws for the seat whose account is gone.
    expect(out.get("g2")![1].friend!.name).toEqual(named("Gone"));
  });

  it("never returns an account id", () => {
    const out = seatsFromRows([row({ friendUserId: "user_dave", friendNameThen: "Dave", publicId: FRIEND })]);
    expect(JSON.stringify([...out.values()])).not.toContain("user_dave");
  });

  it("keeps a snapshot of a friend's deleted deck: the deck's name stays, branded, with no deck id", () => {
    const out = seatsFromRows([row({ friendUserId: "user_dave", friendNameThen: "Dave", deckNameThen: "Avengers Tempo", publicId: FRIEND })]);
    expect(out.get("g1")![0].deckName).toEqual(named("Avengers Tempo"));
  });

  it("a game with no seats is absent", () => {
    expect(seatsFromRows([]).size).toBe(0);
  });
});
