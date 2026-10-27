// A face is ANY catalog card in any of its printings (Hugh, 2026-10-27). `probe:face-printing` proves `setCommander`
// against the catalog; this pins the shape every read hands out, what is refused before any query, and the
// SQL the face reads share.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { commanderColumns, faceJoin, setCommander, toCommander } from "./commander";

describe("toCommander", () => {
  it("is null when the read joined no card", () => {
    expect(toCommander({ commanderOracleId: null, commanderName: null, commanderArt: null })).toBeNull();
  });

  it("carries the oracle id, name and art crop", () => {
    expect(toCommander({ commanderOracleId: "o", commanderName: "N", commanderArt: null })).toEqual({ oracleId: "o", name: "N", artCropUri: null });
  });
});

describe("setCommander, refused before any query", () => {
  it("refuses a malformed card id", async () => {
    await expect(setCommander("user_viewer", "not-a-uuid")).resolves.toEqual({ ok: false, reason: "noCard" });
    await expect(setCommander("user_viewer", 7)).resolves.toEqual({ ok: false, reason: "noCard" });
  });

  it("refuses a malformed printing id", async () => {
    await expect(setCommander("user_viewer", "00000000-0000-4000-8000-000000000001", "nope")).resolves.toEqual({ ok: false, reason: "badPrinting" });
  });

  it("refuses a printing with no card", async () => {
    await expect(setCommander("user_viewer", null, "00000000-0000-4000-8000-000000000001")).resolves.toEqual({ ok: false, reason: "badPrinting" });
  });
});

describe("the face's art chain", () => {
  const dialect = new PgDialect();
  it("is the chosen printing's crop, else the card's", () => {
    const { sql } = dialect.sqlToQuery(commanderColumns.commanderArt.getSQL());
    expect(sql).toBe('coalesce("face_printing"."art_crop_uri", "commander_card"."art_crop_uri")');
  });

  it("joins the pick on BOTH the printing and its card", () => {
    const { sql } = dialect.sqlToQuery(faceJoin!);
    expect(sql).toContain('"face_printing"."scryfall_id" = "social_profiles"."commander_printing_id"');
    expect(sql).toContain('"face_printing"."oracle_id" = "social_profiles"."commander_oracle_id"');
  });
});
