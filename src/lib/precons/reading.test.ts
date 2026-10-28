// Small items 5, PR 6a: the one read a precon start makes, its Overview and its reading together.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { deckProfile } from "../../components/decks/__fixtures__/deck-profile";
import { preconCarryQuery, readPreconCarry } from "./reading";
import { preconReadingColumns } from "./reading-rule";

describe("preconCarryQuery", () => {
  it("is one statement over precon_synopses by precon, contract and basis, with no filter on current", () => {
    const { sql, params } = new PgDialect().sqlToQuery(preconCarryQuery("Turtles_TMC", 12, "labels").getSQL());
    expect(sql).toContain(`from "precon_synopses"`);
    // One table, so Drizzle leaves the projection unqualified; no subquery in it, so nothing can collide.
    for (const col of ["content", "current", "created_at", "reading", "reading_permits", "reading_list", "reading_seen_seq", "reading_analyzed_oracle_ids", "reading_at"]) {
      expect(sql).toContain(`"${col}"`);
    }
    expect(sql).toMatch(/where \("precon_synopses"\."precon_file" = \$1 and "precon_synopses"\."contract_version" = \$2 and "precon_synopses"\."role_basis" = \$3\)/);
    expect(sql).not.toMatch(/"current" = /);
    expect(params).toEqual(["Turtles_TMC", 12, "labels"]);
  });
});

describe("preconCarryQuery by deck", () => {
  it("names the precon by the deck a start made, owner-scoped, in the same statement", () => {
    const { sql, params } = new PgDialect().sqlToQuery(preconCarryQuery({ deckId: "d-1", userId: "u-1" }, 12, "labels").getSQL());
    expect(sql).toContain(`where ("precon_synopses"."precon_file" = (select d.built_from_precon from "decks" d where d.id = $1::uuid and d.user_id = $2) and "precon_synopses"."contract_version" = $3`);
    expect(params).toEqual(["d-1", "u-1", 12, "labels"]);
  });
});

describe("readPreconCarry", () => {
  const fake = (rows: unknown[]) => ({ select: () => ({ from: () => ({ where: async () => rows }) }) }) as never;
  const overview = { listFingerprint: "list-1", contractVersion: 12, model: "m", content: { overview: "x" }, current: false, createdAt: new Date(1), checkedAt: new Date(2) };

  it("returns the Overview and the reading of one row, current or not", async () => {
    const reading = preconReadingColumns({ profile: deckProfile(), list: "list-1", catalog: "1", seenSeq: 3, analyzedOracleIds: ["a"], at: new Date(5) });
    const got = await readPreconCarry("f", 12, "labels", fake([{ ...overview, ...reading }]));
    expect(got?.overview).toEqual(overview);
    expect(got?.reading).toMatchObject({ list: "list-1", seenSeq: 3, permits: reading.readingPermits });
  });
  it("returns the Overview with no reading when none is stored, and null with no row", async () => {
    const empty = { reading: null, readingPermits: null, readingList: null, readingCatalog: null, readingProfileVersion: null, readingRulesVersion: null, readingAnalyzedOracleIds: null, readingSeenSeq: null, readingAt: null };
    expect((await readPreconCarry("f", 12, "labels", fake([{ ...overview, ...empty }])))?.reading).toBeNull();
    expect(await readPreconCarry("f", 12, "labels", fake([]))).toBeNull();
  });
});
