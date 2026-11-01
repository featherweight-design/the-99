import { describe, expect, it } from "vitest";
import {
  filterConditions, GAME_HISTORY_WINDOW, historyMonthsQuery, historyPageQuery, historySummaryQuery, historyTopDecksQuery,
  historyByDeckQuery, historyTotalQuery, keysetAfter, playedAgainstCommandersQuery,
} from "./history";
import { decodeCursor, encodeCursor } from "./history-rules";
import { and, eq } from "drizzle-orm";
import { db } from "../../db";
import { deckGames } from "../../db/schema";

const VIEWER = "user_viewer";
const DECK = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const FRIEND = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const CMD = "2121bcb4-f5fe-447f-9112-c7e5b5c45baf";
const AT = "2026-10-10 12:00:00.123456";

describe("the window and the order", () => {
  const q = historyPageQuery(VIEWER, {}, null).toSQL();

  it("reads one more than a window, newest first, ties broken by id", () => {
    expect(GAME_HISTORY_WINDOW).toBe(50);
    expect(q.sql).toMatch(/order by "deck_games"\."played_at" desc, "deck_games"\."id" desc limit \$\d+$/);
    expect(q.params.at(-1)).toBe(GAME_HISTORY_WINDOW + 1);
  });

  it("selects the played_at as text beside the date, so the cursor keeps its microseconds", () => {
    expect(q.sql).toContain(`"deck_games"."played_at"::text`);
  });

  it("reads no offset", () => {
    expect(q.sql).not.toMatch(/offset/i);
  });
});

describe("owner scoping", () => {
  it("every statement scopes the game AND its deck to the viewer", () => {
    const owned = /\("deck_games"\."user_id" = \$1 and "decks"\."user_id" = \$2\)/;
    for (const q of [
      historyPageQuery(VIEWER, {}, null),
      historyMonthsQuery(VIEWER, {}),
      historySummaryQuery(VIEWER, {}),
      historyTopDecksQuery(VIEWER, {}),
      historyTotalQuery(VIEWER),
    ]) {
      const { sql, params } = q.toSQL();
      expect(sql).toMatch(owned);
      expect(params.slice(0, 2)).toEqual([VIEWER, VIEWER]);
    }
    const c = playedAgainstCommandersQuery(VIEWER).toSQL();
    expect(c.sql).toMatch(owned);
  });

  it("a friend filter resolves through the viewer's link and a stranger's public id matches no game", () => {
    const q = historyPageQuery(VIEWER, { friend: FRIEND }, null).toSQL();
    expect(q.sql).toContain("fl.user_id = $");
    expect(q.params).toContain(FRIEND);
  });
});

describe("the keyset cursor", () => {
  it("compares (played_at, id) as a row, strictly after the cursor, with the timestamp bound as text", () => {
    const q = historyPageQuery(VIEWER, {}, { playedAt: AT, id: DECK }).toSQL();
    expect(q.sql).toContain(`("deck_games"."played_at", "deck_games"."id") < ($3::timestamp, $4::uuid)`);
    expect(q.params.slice(2, 4)).toEqual([AT, DECK]);
  });

  it("is absent from the first window", () => {
    expect(historyPageQuery(VIEWER, {}, null).toSQL().sql).not.toContain("::timestamp");
  });

  it("renders the same predicate on its own", () => {
    const q = db.select({ id: deckGames.id }).from(deckGames).where(and(eq(deckGames.userId, VIEWER), keysetAfter({ playedAt: AT, id: DECK }))).toSQL();
    expect(q.sql).toContain(`("deck_games"."played_at", "deck_games"."id") < ($2::timestamp, $3::uuid)`);
  });

  it("round-trips, and anything it did not write reads as no cursor", () => {
    expect(decodeCursor(encodeCursor({ playedAt: AT, id: DECK }))).toEqual({ playedAt: AT, id: DECK });
    expect(decodeCursor("2026-10-10 12:00:00|not-a-uuid")).toBeNull();
    expect(decodeCursor(`'; drop table decks;--|${DECK}`)).toBeNull();
    expect(decodeCursor(AT)).toBeNull();
    // Well-shaped but impossible instants read as no cursor, not as a Postgres error.
    expect(decodeCursor(`2026-13-45 99:99:99|${DECK}`)).toBeNull();
    expect(decodeCursor(`2026-02-30 12:00:00|${DECK}`)).toBeNull();
    expect(decodeCursor(`2026-10-10 24:00:00|${DECK}`)).toBeNull();
    expect(decodeCursor(undefined)).toBeNull();
    expect(decodeCursor(null)).toBeNull();
  });
});

describe("filters", () => {
  const render = (filter: Parameters<typeof filterConditions>[1]) =>
    db.select({ id: deckGames.id }).from(deckGames).where(and(...filterConditions(VIEWER, filter))).toSQL();

  it("no filter adds no condition", () => {
    expect(filterConditions(VIEWER, {})).toEqual([]);
  });

  it("deck and result are plain equalities", () => {
    const q = render({ deckId: DECK, result: "loss" });
    expect(q.sql).toBe(`select "id" from "deck_games" where ("deck_games"."deck_id" = $1 and "deck_games"."result" = $2)`);
    expect(q.params).toEqual([DECK, "loss"]);
  });

  it("a commander matches either commander slot of any seat, correlated on the game", () => {
    const q = render({ commander: CMD });
    expect(q.sql).toContain(`oc.game_id = "deck_games".id`);
    expect(q.sql).toContain("oc.commander_oracle_id = $1 or oc.partner_oracle_id = $2");
    expect(q.params).toEqual([CMD, CMD]);
  });

  it("combine with AND", () => {
    const q = render({ deckId: DECK, result: "win", friend: FRIEND, commander: CMD });
    expect(filterConditions(VIEWER, { deckId: DECK, result: "win", friend: FRIEND, commander: CMD })).toHaveLength(4);
    expect(q.sql).toContain(`"deck_games"."deck_id" = $1 and "deck_games"."result" = $2 and exists (`);
    expect(q.sql).toContain(" and exists (select 1 from \"deck_game_opponents\" oc");
  });

  it("a value that is not valid matches nothing instead of being dropped", () => {
    for (const filter of [{ deckId: "x" }, { result: "won" }, { friend: "x" }, { commander: "x" }]) {
      expect(filterConditions(VIEWER, filter)).toHaveLength(1);
      expect(render(filter).sql).toContain("false");
    }
  });

  it("the month heads and summary use the same filter as the page", () => {
    const filter = { result: "loss", deckId: DECK };
    for (const q of [historyMonthsQuery(VIEWER, filter), historySummaryQuery(VIEWER, filter), historyTopDecksQuery(VIEWER, filter)]) {
      const { sql } = q.toSQL();
      expect(sql).toContain(`"deck_games"."deck_id" = $`);
      expect(sql).toContain(`"deck_games"."result" = $`);
    }
  });
});

describe("aggregates", () => {
  it("counts the whole month under the filter, newest first", () => {
    const q = historyMonthsQuery(VIEWER, {}).toSQL();
    expect(q.sql).toContain(`to_char("deck_games"."played_at", 'YYYY-MM')`);
    expect(q.sql).toMatch(/group by to_char\([^)]*\) order by to_char\([^)]*\) desc$/);
    expect(q.sql).not.toMatch(/limit/);
  });

  it("the friend-won count is present only with a friend filter", () => {
    expect(historySummaryQuery(VIEWER, {}).toSQL().sql).not.toContain("o.won");
    expect(historySummaryQuery(VIEWER, { friend: FRIEND }).toSQL().sql).toContain("and o.won");
  });

  it("reads two decks, to tell a lead from a tie", () => {
    const q = historyTopDecksQuery(VIEWER, {}).toSQL();
    expect(q.params.at(-1)).toBe(2);
    expect(q.sql).toMatch(/order by count\(\*\)::int desc, "decks"\."id" asc limit/);
  });

  it("the commander options cover both commander slots, over the whole history, counted per distinct game", () => {
    const q = playedAgainstCommandersQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`("cards"."oracle_id" = "deck_game_opponents"."commander_oracle_id" or "cards"."oracle_id" = "deck_game_opponents"."partner_oracle_id")`);
    expect(q.sql).toContain(`count(distinct "deck_game_opponents"."game_id")::int`);
  });

  it("each commander option carries its art, for the Played against list's thumbnail", () => {
    const q = playedAgainstCommandersQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`"cards"."art_crop_uri"`);
    expect(q.sql).toMatch(/group by "cards"\."oracle_id", "cards"\."name", "cards"\."art_crop_uri"/);
  });
});

describe("the deck picker's counts", () => {
  it("count per deck under every filter but the deck, scoped to the viewer's own games", () => {
    const q = historyByDeckQuery(VIEWER, { deckId: DECK, result: "win" }).toSQL();
    expect(q.sql).toMatch(/\("deck_games"\."user_id" = \$1 and "decks"\."user_id" = \$2\)/);
    expect(q.sql).toContain(`group by "decks"."id"`);
    expect(q.params).toContain("win");
    expect(q.params).not.toContain(DECK);
  });
});

describe("the deck on a row", () => {
  const q = historyPageQuery(VIEWER, {}, null).toSQL();

  it("joins the deck's commanders and its version, the version scoped to the game's own deck", () => {
    expect(q.sql).toContain(`inner join "decks" on "decks"."id" = "deck_games"."deck_id"`);
    expect(q.sql).toContain(`left join "cards" "partner_card" on "partner_card"."oracle_id" = "decks"."partner_oracle_id"`);
    expect(q.sql).toContain(`left join "deck_versions" on ("deck_versions"."id" = "deck_games"."version_id" and "deck_versions"."deck_id" = "deck_games"."deck_id")`);
  });
});
