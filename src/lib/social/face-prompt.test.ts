// The ask-once flag (G4). `probe:face-printing` proves the write against a database; this pins the SQL: the stamp is
// written only while it is null, because `user_prefs`' stamp trigger fires on a no-op UPDATE too.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { facePromptDoneWrite } from "./face-prompt";

describe("facePromptDoneWrite", () => {
  const { sql } = new PgDialect().sqlToQuery(facePromptDoneWrite("user_x").getSQL());

  it("inserts the reader's row or stamps the existing one", () => {
    expect(sql).toContain('insert into "user_prefs"');
    expect(sql).toContain('on conflict ("user_id") do update set "face_prompt_done_at" = now()');
  });

  it("stamps only while the flag is null", () => {
    expect(sql).toContain('where "user_prefs"."face_prompt_done_at" is null');
  });
});
