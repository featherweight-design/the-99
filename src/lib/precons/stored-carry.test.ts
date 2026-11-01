// PR 6 round 1: the arrival copy reads the deck's stamp and list from one snapshot, and decides and copies
// from ONE locked revision of the precon's row. The statements are rendered (no database); the decision is pure.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { db } from "../../db";
import { arrivalDeckQuery, lockedCarry, sourceRowQuery } from "./stored-carry";

const render = (q: { getSQL: () => unknown }) => new PgDialect().sqlToQuery(q.getSQL() as never).sql;

describe("arrivalDeckQuery", () => {
  it("reads the edit stamp and the list in ONE statement, so they are one snapshot", () => {
    const sql = render(arrivalDeckQuery("d", "u"));
    expect(sql.match(/^select /g)).toHaveLength(1);
    expect(sql).toContain(`"last_edited_at"::text`);
    expect(sql).toMatch(/json_agg\(json_build_object\('oracleId', dc\.oracle_id, 'quantity', dc\.quantity\)\)\s+from "deck_cards" dc where dc\.deck_id = "decks"\.id/);
  });
});

describe("sourceRowQuery", () => {
  it("re-reads the precon's row FOR SHARE, with the change log head as of that row's own last check", () => {
    const sql = render(sourceRowQuery(db, "f", 13, "labels"));
    expect(sql).toMatch(/ for share$/);
    // The check's own mark first (`checked_seen_seq`), the time comparison only for a row written before it.
    expect(sql).toContain(`coalesce("precon_synopses".checked_seen_seq, (select coalesce(max(dc.seq), 0)::bigint from "deck_data_changes" dc where dc.published_at <= "precon_synopses".checked_at))`);
    expect(sql).toMatch(/where \("precon_synopses"\."precon_file" = \$1 and "precon_synopses"\."contract_version" = \$2 and "precon_synopses"\."role_basis" = \$3\)/);
  });
});

describe("lockedCarry", () => {
  const readAt = new Date("2026-10-27T10:00:00Z");
  const src = {
    listFingerprint: "list", contractVersion: 13, current: true, model: "m", content: { overview: "x" } as never,
    createdAt: new Date("2026-10-26T09:00:00Z"), readingAt: readAt, logAtCheck: "40",
  };
  const base = { wantsOverview: true, readAt, readingSeenSeq: 42, list: "list", src };

  it("copies the Overview of the locked revision: its content, its date and its log mark, never past the reading's", () => {
    expect(lockedCarry(base)).toEqual({ kind: "copy", overview: { contractVersion: 13, model: "m", content: src.content, createdAt: src.createdAt, seenSeq: 40 } });
    expect(lockedCarry({ ...base, src: { ...src, logAtCheck: 99 } })).toMatchObject({ overview: { seenSeq: 42 } });
  });
  it("copies the reading alone when the locked revision is no longer current, or is of another list", () => {
    expect(lockedCarry({ ...base, src: { ...src, current: false } })).toEqual({ kind: "copy", overview: null });
    expect(lockedCarry({ ...base, src: { ...src, listFingerprint: "other" } })).toEqual({ kind: "copy", overview: null });
    expect(lockedCarry({ ...base, wantsOverview: false })).toEqual({ kind: "copy", overview: null });
  });
  it("falls back when the row is gone or its reading was rewritten since it was read", () => {
    expect(lockedCarry({ ...base, src: null })).toEqual({ kind: "fallback", reason: "no_row" });
    expect(lockedCarry({ ...base, src: { ...src, readingAt: new Date(readAt.getTime() + 1) } })).toEqual({ kind: "fallback", reason: "not_fresh" });
    expect(lockedCarry({ ...base, src: { ...src, readingAt: null } })).toEqual({ kind: "fallback", reason: "not_fresh" });
  });
});

// The write's ORDER, read off the source (the function needs a database): the deck lock, then the source
// row's shared lock and the decision on it, then the reading's insert dated by that decision.
describe("carryStoredOnArrival's write", () => {
  const text = readFileSync(join(process.cwd(), "src/lib/precons/stored-carry.ts"), "utf8");
  const body = text.slice(text.indexOf("export async function carryStoredOnArrival"), text.indexOf("export function arrivalDeckQuery"));
  it("reads the deck and its list through the one-statement query, never the cards apart", () => {
    expect(body).toContain("arrivalDeckQuery(deckId, userId)");
    expect(body).not.toMatch(/from\(deckCards\)/);
  });
  it("locks the deck, then re-reads and decides on the source row, before writing anything", () => {
    const lock = body.indexOf('.for("update")');
    const share = body.indexOf("sourceRowQuery(tx,");
    const decide = body.indexOf("lockedCarry(");
    const insert = body.indexOf("tx.insert(deckProfiles)");
    expect(lock).toBeGreaterThan(-1);
    expect(share).toBeGreaterThan(lock);
    expect(decide).toBeGreaterThan(share);
    expect(insert).toBeGreaterThan(decide);
    expect(body).toMatch(/const at = plan\.overview\?\.createdAt \?\? null;/);
    expect(body).toMatch(/content: o\.content/);
  });
});
