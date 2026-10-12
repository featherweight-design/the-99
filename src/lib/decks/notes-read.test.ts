import { describe, expect, it } from "vitest";
import { notesQuery } from "./notes-read";

describe("notesQuery", () => {
  it("scopes by deck AND owner with the qualified columns, newest first", () => {
    const q = notesQuery("d1", "u1").toSQL();
    expect(q.sql).toContain('"deck_notes"."deck_id" = $1');
    expect(q.sql).toContain('"deck_notes"."user_id" = $2');
    expect(q.params).toEqual(["d1", "u1"]);
    expect(q.sql).toMatch(/order by "deck_notes"\."created_at" desc/);
  });
});
