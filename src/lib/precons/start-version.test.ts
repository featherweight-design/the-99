import { describe, expect, it } from "vitest";
import { isStartVersion, oldestVersionQuery, START_WINDOW_MS } from "./start-version";

const made = new Date("2026-10-14T12:00:00Z");
const at = (ms: number) => new Date(made.getTime() + ms);
const BOX = [{ oracleId: "sol", quantity: 1 }, { oracleId: "wastes", quantity: 30 }];
const HELM: { commanderOracleId: string | null; partnerOracleId: string | null } = { commanderOracleId: "ulalek", partnerOracleId: null };
const PRECON = { cards: BOX, helm: HELM };
const v = (number: number, ms: number, helm = HELM) => ({ number, committedAt: at(ms), ...helm });

describe("isStartVersion", () => {
  it("takes a v0 holding the linked precon's list, whenever it was committed: only a start commits one", () => {
    expect(isStartVersion(v(0, 10 * 24 * 3600_000), made, BOX, PRECON)).toBe(true);
  });

  it("refuses a v0 holding another list: a started deck relinked to a different precon", () => {
    expect(isStartVersion(v(0, 0), made, [{ oracleId: "other", quantity: 1 }], PRECON)).toBe(false);
  });

  it("takes a v1 committed with its deck that holds exactly the box's list (a start from before v0)", () => {
    expect(isStartVersion(v(1, 200), made, [...BOX].reverse(), PRECON)).toBe(true);
    expect(isStartVersion(v(1, START_WINDOW_MS), made, BOX, PRECON)).toBe(true);
  });

  it("refuses a v1 committed later, or holding anything else: a brew linked after the fact", () => {
    expect(isStartVersion(v(1, START_WINDOW_MS + 1), made, BOX, PRECON)).toBe(false);
    expect(isStartVersion(v(1, 0), made, [BOX[0]], PRECON)).toBe(false);
    expect(isStartVersion(v(1, 0), made, [BOX[0], { oracleId: "wastes", quantity: 29 }], PRECON)).toBe(false);
    expect(isStartVersion(v(1, 0), made, [...BOX, { oracleId: "x", quantity: 1 }], PRECON)).toBe(false);
  });

  it("refuses the box's 99 under another helm", () => {
    expect(isStartVersion(v(0, 0, { commanderOracleId: "kozilek", partnerOracleId: null }), made, BOX, PRECON)).toBe(false);
    expect(isStartVersion(v(1, 0, { commanderOracleId: "ulalek", partnerOracleId: "kozilek" }), made, BOX, PRECON)).toBe(false);
    // A pair in the other order is the same pair.
    const pair = { cards: BOX, helm: { commanderOracleId: "a", partnerOracleId: "b" } };
    expect(isStartVersion(v(0, 0, { commanderOracleId: "b", partnerOracleId: "a" }), made, BOX, pair)).toBe(true);
  });

  it("refuses an oldest version past v1", () => {
    expect(isStartVersion(v(2, 0), made, BOX, PRECON)).toBe(false);
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
