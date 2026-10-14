import { describe, expect, it } from "vitest";
import { isStartVersion, oldestVersionQuery, START_WINDOW_MS } from "./start-version";

const made = new Date("2026-10-14T12:00:00Z");
const at = (ms: number) => new Date(made.getTime() + ms);
const BOX = [{ oracleId: "sol", quantity: 1 }, { oracleId: "wastes", quantity: 30 }];

describe("isStartVersion", () => {
  it("takes any v0: only a start commits one", () => {
    expect(isStartVersion({ number: 0, committedAt: at(10 * 24 * 3600_000) }, made, [], BOX)).toBe(true);
  });

  it("takes a v1 committed with its deck that holds exactly the box's list (a start from before v0)", () => {
    expect(isStartVersion({ number: 1, committedAt: at(200) }, made, [...BOX].reverse(), BOX)).toBe(true);
    expect(isStartVersion({ number: 1, committedAt: at(START_WINDOW_MS) }, made, BOX, BOX)).toBe(true);
  });

  it("refuses a v1 committed later, or holding anything else: a brew linked after the fact", () => {
    expect(isStartVersion({ number: 1, committedAt: at(START_WINDOW_MS + 1) }, made, BOX, BOX)).toBe(false);
    expect(isStartVersion({ number: 1, committedAt: at(0) }, made, [BOX[0]], BOX)).toBe(false);
    expect(isStartVersion({ number: 1, committedAt: at(0) }, made, [BOX[0], { oracleId: "wastes", quantity: 29 }], BOX)).toBe(false);
    expect(isStartVersion({ number: 1, committedAt: at(0) }, made, [...BOX, { oracleId: "x", quantity: 1 }], BOX)).toBe(false);
  });

  it("refuses an oldest version past v1", () => {
    expect(isStartVersion({ number: 2, committedAt: at(0) }, made, BOX, BOX)).toBe(false);
  });
});

describe("oldestVersionQuery", () => {
  const { sql, params } = oldestVersionQuery("user-1", "deck-1").toSQL();
  it("reads the deck's lowest-numbered version, owner-scoped in its own SQL", () => {
    expect(sql).toMatch(/where \("decks"\."id" = \$\d+ and "decks"\."user_id" = \$\d+\)/);
    expect(sql).toContain(`order by "deck_versions"."number" asc limit`);
    expect(params).toEqual(expect.arrayContaining(["deck-1", "user-1"]));
  });
});
