import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { NON_GAME_LAYOUTS, NON_GAME_TYPE_LINES } from "./game-card";
import { isGameCardWhere } from "./game-card-where";

describe("isGameCardWhere", () => {
  const { sql, params } = new PgDialect().sqlToQuery(isGameCardWhere());

  it("excludes every non-game layout and type line isGameCard does, by value", () => {
    expect(params).toEqual([...NON_GAME_LAYOUTS, ...NON_GAME_TYPE_LINES]);
    expect(params).toContain("Stickers");
    expect(params).toContain("front_card");
  });

  it("reads the qualified columns, the type line trimmed", () => {
    expect(sql).toContain('"cards"."layout" not in');
    expect(sql).toContain('btrim("cards"."type_line") not in');
  });
});
