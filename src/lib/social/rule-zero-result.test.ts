import { describe, expect, it } from "vitest";
import { gameLoggedQuery, gameLoggerQuery, mayReplace, maySave, placementsFor, resultPlacesQuery, startDeckOf } from "./rule-zero-result";
import { resultFor } from "./rule-zero-log";

const TABLE = "7a0e0000-0000-4000-8000-000000000001";
const SEATS = [
  { seat: 1, userId: "user_a" },
  { seat: 2, userId: "user_b" },
  { seat: 3, userId: "user_c" },
];

describe("maySave (ruling (b))", () => {
  const start = SEATS.map((s) => ({ ...s, deckId: null }));
  it("lets a Start player save after a reseat moved them", () => {
    expect(maySave(start, [{ userId: "user_c" }, { userId: "user_a" }], "user_a")).toBe(true);
  });
  it("refuses a player not in the Start roster, even one seated now", () => {
    expect(maySave(start, [...SEATS, { userId: "user_new" }], "user_new")).toBe(false);
  });
  it("refuses a Start player who has left the table", () => {
    expect(maySave(start, SEATS.filter((s) => s.userId !== "user_a"), "user_a")).toBe(false);
  });
});

describe("mayReplace", () => {
  const t = new Date("2026-11-20T20:00:00Z");
  it("lets the same or a newer game's roster replace the stored result, never an older one", () => {
    expect(mayReplace(null, t)).toBe(true);
    expect(mayReplace(t, t)).toBe(true);
    expect(mayReplace(t, new Date(t.getTime() + 1))).toBe(true);
    expect(mayReplace(new Date(t.getTime() + 1), t)).toBe(false);
  });
});

describe("startDeckOf", () => {
  const D = "d0000000-0000-4000-8000-000000000001";
  const start = [{ seat: 1, userId: "user_a", deckId: D }, { seat: 2, userId: "user_b", deckId: null }];
  it("keeps a Start deck only while it exists and is still that seat player's own", () => {
    expect(startDeckOf(start, [{ id: D, userId: "user_a" }], { seat: 1, userId: "user_a" })).toBe(D);
    expect(startDeckOf(start, [], { seat: 1, userId: "user_a" })).toBeNull();
    expect(startDeckOf(start, [{ id: D, userId: "user_b" }], { seat: 1, userId: "user_a" })).toBeNull();
    expect(startDeckOf(start, [{ id: D, userId: "user_a" }], { seat: 2, userId: "user_b" })).toBeNull();
  });
});

describe("placementsFor", () => {
  const ok = [{ seat: 1, place: 2 }, { seat: 2, place: 1 }, { seat: 3, place: 3 }];
  it("maps seats to accounts", () => {
    expect(placementsFor(SEATS, ok)).toEqual([
      { userId: "user_a", seat: 1, place: 2 },
      { userId: "user_b", seat: 2, place: 1 },
      { userId: "user_c", seat: 3, place: 3 },
    ]);
  });
  it("accepts a tie for first", () => {
    expect(placementsFor(SEATS, [{ seat: 1, place: 1 }, { seat: 2, place: 1 }, { seat: 3, place: 3 }])).not.toBeNull();
  });
  it.each([
    ["not an array", "x"],
    ["a seat missing", ok.slice(1)],
    ["a seat twice", [ok[0], ok[0], ok[2]]],
    ["a seat not at the table", [ok[0], ok[1], { seat: 4, place: 3 }]],
    ["no first place", [{ seat: 1, place: 2 }, { seat: 2, place: 2 }, { seat: 3, place: 3 }]],
    ["a place past the seat count", [ok[0], ok[1], { seat: 3, place: 4 }]],
    ["a fractional place", [ok[0], ok[1], { seat: 3, place: 2.5 }]],
    ["a non-object row", [ok[0], ok[1], null]],
  ])("refuses %s", (_n, input) => {
    expect(placementsFor(SEATS, input)).toBeNull();
  });
});

describe("resultFor", () => {
  const rows = SEATS;
  const placed = [{ userId: "user_a", place: 2 }, { userId: "user_b", place: 1 }, { userId: "user_c", place: 3 }];
  it("names the seat the winner is drawn at for a loss", () => {
    expect(resultFor(rows, placed, "user_a")).toEqual({ viewer: "loss", winnerSeat: 2 });
    expect(resultFor([{ seat: 5, userId: "user_b" }, ...rows.filter((r) => r.userId !== "user_b")], placed, "user_a")).toEqual({ viewer: "loss", winnerSeat: 5 });
  });
  it("gives no winner seat once the winner is not drawn (left the pod)", () => {
    expect(resultFor(rows.filter((r) => r.userId !== "user_b"), placed, "user_a")).toEqual({ viewer: "loss", winnerSeat: null });
  });
  it("is a win for the sole first place and a draw for a tie in it", () => {
    expect(resultFor(rows, placed, "user_b")).toEqual({ viewer: "win", winnerSeat: null });
    const tie = [{ userId: "user_a", place: 1 }, { userId: "user_b", place: 1 }, { userId: "user_c", place: 3 }];
    expect(resultFor(rows, tie, "user_a")).toEqual({ viewer: "draw", winnerSeat: null });
    expect(resultFor(rows, tie, "user_c")).toEqual({ viewer: "loss", winnerSeat: null });
  });
  it("is null when the table has no result or the viewer is not in it", () => {
    expect(resultFor(rows, [], "user_a")).toBeNull();
    expect(resultFor(rows, placed, "user_x")).toBeNull();
  });
});

describe("resultPlacesQuery", () => {
  it("reads one table's rows, account and place only", () => {
    const { sql: text, params } = resultPlacesQuery(TABLE, "user_a").toSQL();
    expect(text).toContain('"rule_zero_result_seats"."table_id" = $1');
    expect(text).not.toContain('"rule_zero_result_seats"."seat"');
    // Qualified in the subquery, and skipped once the viewer logged a game from the table since the result was saved.
    expect(text).toContain('dg.rule_zero_table_id = $3');
    expect(text).toContain('>= "rule_zero_result_seats".saved_at');
    expect(params).toEqual([TABLE, "user_a", TABLE]);
  });
});

describe("gameLoggedQuery (Undo's refusal)", () => {
  it("asks for one game's rows that any seat player has logged from this table since the save, aliased and qualified", () => {
    const started = new Date("2026-11-21T03:00:00.000Z");
    const { sql: text, params } = gameLoggedQuery(TABLE, started).toSQL();
    expect(text).toContain('"rule_zero_result_seats"."table_id" = $1');
    expect(text).toContain('"rule_zero_result_seats"."started_at" = $2');
    // Unqualified, these would compare a column to itself and never find a log (AGENTS.md, correlated subqueries).
    expect(text).toContain('lg.user_id = "rule_zero_result_seats".user_id');
    expect(text).toContain('lg.rule_zero_table_id = "rule_zero_result_seats".table_id');
    expect(text).toContain('>= "rule_zero_result_seats".saved_at');
    expect(params[0]).toBe(TABLE);
  });
});

describe("gameLoggerQuery (the U3 note's read)", () => {
  it("joins the viewer's seat and pod membership in the same statement, and the logger's name only through their membership", () => {
    const { sql: text, params } = gameLoggerQuery("user_a", TABLE, new Date("2026-11-21T03:00:00.000Z")).toSQL();
    expect(text).toContain('inner join "rule_zero_seats" "viewer_seat" on ("viewer_seat"."table_id" = "rule_zero_tables"."id" and "viewer_seat"."user_id" = $');
    expect(text).toContain('inner join "pod_members" "viewer_in" on ("viewer_in"."pod_id" = "rule_zero_tables"."pod_id" and "viewer_in"."user_id" = $');
    expect(text).toContain('left join "pod_members" "logger_in" on ("logger_in"."pod_id" = "rule_zero_tables"."pod_id" and "logger_in"."user_id" = "rule_zero_result_seats"."user_id")');
    expect(text).toContain('"deck_games"."rule_zero_table_id" = "rule_zero_result_seats"."table_id"');
    expect(text).toContain('left join "social_profiles" on "social_profiles"."user_id" = "logger_in"."user_id"');
    expect(params.filter((p) => p === "user_a")).toHaveLength(2);
  });
});
