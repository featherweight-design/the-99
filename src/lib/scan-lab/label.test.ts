// The label write's guards live in its WHERE, so the emitted SQL is what proves them: only the
// player's own row, only a ✗ row, and only a card the catalog holds.
import { describe, expect, it } from "vitest";
import { labelQuery } from "./label";

const USER = "user_1";
const ROW = "11111111-1111-4111-8111-111111111111";
const CARD = "22222222-2222-4222-8222-222222222222";

describe("labelQuery", () => {
  const q = labelQuery(USER, ROW, CARD).toSQL();

  it("writes the true card and nothing else", () => {
    expect(q.sql).toMatch(/^update "scan_lab_results" set "true_oracle_id" = \$1 where/);
  });

  it("is scoped to the row, its owner and a wrong tap", () => {
    expect(q.sql).toContain(`"scan_lab_results"."id" = $2`);
    expect(q.sql).toContain(`"scan_lab_results"."user_id" = $3`);
    expect(q.sql).toContain(`"scan_lab_results"."correct" = $4`);
    expect(q.params).toEqual([CARD, ROW, USER, false, CARD]);
  });

  it("names only a card the catalog holds", () => {
    expect(q.sql).toMatch(/exists \(select "oracle_id" from "cards" where "cards"\."oracle_id" = \$5\)/);
  });
});
