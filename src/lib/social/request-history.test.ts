import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../db", () => ({ db: { execute: vi.fn() } }));

import { endedAtOf, hiddenHistoryCountQuery, validCursor, HISTORY_PAGE, loadRequestHistory, requestHistoryQuery } from "./request-history";

const render = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { q: sql.replace(/\s+/g, " "), params };
};
const CURSOR = { createdAt: "2026-11-01T10:00:00.123456Z", id: "1b6b8d7c-2f4e-4b1a-9a3e-1c2d3e4f5a6b" };

describe("requestHistoryQuery", () => {
  it("You asked: the viewer is the asker, joined to the viewer's own friendship row, and cleared or withdrawn asks stay", () => {
    const { q, params } = render(requestHistoryQuery("viewer", "asked", null));
    expect(q).toContain(`join "friend_links" hfl on hfl.user_id = hsr.asker_user_id and hfl.friend_user_id = hsr.holder_user_id`);
    expect(q).toContain(`join "social_profiles" hsp on hsp.user_id = hsr.holder_user_id`);
    expect(q).toContain("where hsr.asker_user_id = $1 and hsr.initiated_by = 'asker'");
    expect(q).not.toContain("asker_cleared_at");
    expect(q).not.toContain("<> 'withdrawn'");
    expect(q).toMatch(/order by hsr\.created_at desc, hsr\.id desc limit \$2$/);
    expect(params).toEqual(["viewer", HISTORY_PAGE + 1]);
  });

  it("Asked of you: the viewer is the holder, and a withdrawn ask never shows", () => {
    const { q } = render(requestHistoryQuery("viewer", "received", null));
    expect(q).toContain(`on hfl.user_id = hsr.holder_user_id and hfl.friend_user_id = hsr.asker_user_id`);
    expect(q).toContain("where hsr.holder_user_id = $1 and hsr.initiated_by = 'asker' and hsr.status <> 'withdrawn'");
  });

  it("pages by a (created_at, id) keyset carried as the database's own text", () => {
    const { q, params } = render(requestHistoryQuery("viewer", "asked", CURSOR));
    expect(q).toContain("and (hsr.created_at, hsr.id) < ($2::timestamptz, $3::uuid)");
    expect(params.slice(0, 3)).toEqual(["viewer", CURSOR.createdAt, CURSOR.id]);
  });
});

describe("validCursor", () => {
  it("accepts the reader's own cursor and refuses anything else, which reads as the first page", () => {
    expect(validCursor(CURSOR)).toBe(true);
    expect(validCursor({ ...CURSOR, createdAt: "yesterday" })).toBe(false);
    expect(validCursor({ ...CURSOR, id: "x'; drop table" })).toBe(false);
    const { q, params } = render(requestHistoryQuery("viewer", "asked", { createdAt: "nope", id: CURSOR.id }));
    expect(q).not.toContain("hsr.created_at, hsr.id) <");
    expect(params).toEqual(["viewer", HISTORY_PAGE + 1]);
  });
});

describe("hiddenHistoryCountQuery", () => {
  it("counts the viewer's rows whose other side has no friendship row, and reads no name", () => {
    const { q } = render(hiddenHistoryCountQuery("viewer"));
    expect(q).toContain("select count(*)::int as n");
    expect(q).toContain("not exists");
    expect(q).not.toContain("display_name");
    // The history never shows a withdrawn ask to its holder, so the foot line does not count one.
    expect(q).toContain("hcr.holder_user_id = $2 and hcr.status <> 'withdrawn'");
  });
});

describe("endedAtOf", () => {
  const createdAt = new Date("2026-11-01T00:00:00Z");
  const answeredAt = new Date("2026-11-03T00:00:00Z");
  const withdrawnAt = new Date("2026-11-04T00:00:00Z");
  it("dates each state by what ended it", () => {
    const r = { createdAt, answeredAt, withdrawnAt };
    expect(endedAtOf("yes", r)).toEqual(answeredAt);
    expect(endedAtOf("no", r)).toEqual(answeredAt);
    expect(endedAtOf("expired", r)).toEqual(new Date("2026-11-15T00:00:00Z"));
    expect(endedAtOf("withdrawn", r)).toEqual(withdrawnAt);
    expect(endedAtOf("open", r)).toEqual(createdAt);
  });
  it("claims no date for an ask withdrawn before withdrawn_at existed", () => {
    expect(endedAtOf("withdrawn", { createdAt, answeredAt: null, withdrawnAt: null })).toBeNull();
  });
});

describe("loadRequestHistory", () => {
  const row = (n: number, over: Record<string, unknown> = {}) => ({
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`, oracle_id: "o", status: "yes", created_at: "2026-11-01T00:00:00Z", answered_at: "2026-11-02T00:00:00Z",
    withdrawn_at: null, cursor_at: `2026-11-01 00:00:00.00000${n % 10}+00`, copies: 1, public_id: "p", display_name: "Rosa", card_name: "Sol Ring", card_image: null, deck_name: null,
    commander_oracle_id: null, commander_name: null, commander_art: null, ...over,
  });
  it("returns a page of 30 and the cursor of its last row when one more exists", async () => {
    const rows = Array.from({ length: HISTORY_PAGE + 1 }, (_, i) => row(i));
    const page = await loadRequestHistory("viewer", "asked", null, new Date("2026-11-10T00:00:00Z"), { execute: async () => ({ rows }) } as never);
    expect(page.entries).toHaveLength(HISTORY_PAGE);
    expect(page.next).toEqual({ createdAt: rows[HISTORY_PAGE - 1].cursor_at, id: rows[HISTORY_PAGE - 1].id });
  });
  it("has no next on a short page, and reads an open ask past its days as expired", async () => {
    const page = await loadRequestHistory("viewer", "asked", null, new Date("2026-12-01T00:00:00Z"), { execute: async () => ({ rows: [row(1, { status: "open", answered_at: null })] }) } as never);
    expect(page.next).toBeNull();
    expect(page.entries[0].state).toBe("expired");
  });
});
