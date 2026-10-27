// The ask-once flag (G4). `probe:face-printing` proves the write against a database; this pins the SQL: the stamp is
// written only while it is null, because `user_prefs`' stamp trigger fires on a no-op UPDATE too.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { faceAskPlaces, facePromptDoneWrite } from "./face-prompt";

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

describe("faceAskPlaces", () => {
  it("asks nowhere with no ask (the switch off, or a read that failed)", () => {
    expect(faceAskPlaces(null)).toEqual({ row: false, strip: false });
  });

  it("asks in both places with no face, never asked", () => {
    expect(faceAskPlaces({ hasFace: false, done: false })).toEqual({ row: true, strip: true });
  });

  it("asks nowhere after Skip or ✕ with no face", () => {
    expect(faceAskPlaces({ hasFace: false, done: true })).toEqual({ row: false, strip: false });
  });

  it("keeps the done row once picked, and never the strip", () => {
    expect(faceAskPlaces({ hasFace: true, done: true })).toEqual({ row: true, strip: false });
    expect(faceAskPlaces({ hasFace: true, done: false })).toEqual({ row: true, strip: false });
  });
});
