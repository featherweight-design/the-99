import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

vi.mock("../../db", () => ({ db: {} }));

import { friendsAfterGameSql } from "./after-game";

describe("friendsAfterGameSql", () => {
  it("reads the viewer's own games and own friendship rows, and nobody else's", () => {
    const q = new PgDialect().sqlToQuery(friendsAfterGameSql("user_a"));
    expect(q.sql).toContain('from "deck_games" g where g.user_id = $1');
    expect(q.sql).toContain('not exists (select 1 from "friend_links" f where f.user_id = $2)');
    expect(q.params).toEqual(["user_a", "user_a"]);
  });
});
