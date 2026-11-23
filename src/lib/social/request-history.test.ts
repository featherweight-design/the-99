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
  it("From you: the viewer started the row (the asker of an ask, the holder of an offer), joined to the viewer's own friendship row, and withdrawn rows stay", () => {
    const { q, params } = render(requestHistoryQuery("viewer", "asked", null));
    const starter = "(case when hsr.initiated_by = 'asker' then hsr.asker_user_id else hsr.holder_user_id end)";
    const other = "(case when hsr.initiated_by = 'asker' then hsr.holder_user_id else hsr.asker_user_id end)";
    expect(q).toContain(`join "friend_links" hfl on hfl.user_id = ${starter} and hfl.friend_user_id = ${other}`);
    expect(q).toContain(`join "social_profiles" hsp on hsp.user_id = ${other}`);
    expect(q).toContain("where ((hsr.initiated_by = 'asker' and hsr.asker_user_id = $1) or (hsr.initiated_by = 'holder' and hsr.holder_user_id = $2))");
    expect(q).toContain("(hsr.initiated_by = 'holder') as offer");
    expect(q).not.toContain("asker_cleared_at");
    expect(q).not.toContain("<> 'withdrawn'");
    expect(q).toMatch(/order by hsr\.created_at desc, hsr\.id desc limit \$3$/);
    expect(params).toEqual(["viewer", "viewer", HISTORY_PAGE + 1]);
  });

  it("To you: the viewer is the other side of the row (the holder of an ask, the asker of an offer), and a withdrawn row never shows", () => {
    const { q } = render(requestHistoryQuery("viewer", "received", null));
    const starter = "(case when hsr.initiated_by = 'asker' then hsr.asker_user_id else hsr.holder_user_id end)";
    const other = "(case when hsr.initiated_by = 'asker' then hsr.holder_user_id else hsr.asker_user_id end)";
    expect(q).toContain(`on hfl.user_id = ${other} and hfl.friend_user_id = ${starter}`);
    expect(q).toContain("where ((hsr.initiated_by = 'asker' and hsr.holder_user_id = $1) or (hsr.initiated_by = 'holder' and hsr.asker_user_id = $2)) and hsr.status <> 'withdrawn'");
  });

  it("reads asks and offers both (no initiated_by filter on the row set) and draws a deck line only for an ask", () => {
    const { q } = render(requestHistoryQuery("viewer", "asked", null));
    expect(q).not.toMatch(/where hsr\.initiated_by/);
    expect(q).toContain("left join \"decks\" hdk on hdk.id = hsr.deck_id and hdk.user_id = hsr.asker_user_id and hsr.initiated_by = 'asker'");
  });

  it("pages by a (created_at, id) keyset carried as the database's own text", () => {
    const { q, params } = render(requestHistoryQuery("viewer", "asked", CURSOR));
    expect(q).toContain("and (hsr.created_at, hsr.id) < ($3::timestamptz, $4::uuid)");
    expect(params.slice(0, 4)).toEqual(["viewer", "viewer", CURSOR.createdAt, CURSOR.id]);
  });
});

describe("validCursor", () => {
  it("accepts the reader's own cursor and refuses anything else, which reads as the first page", () => {
    expect(validCursor(CURSOR)).toBe(true);
    expect(validCursor({ ...CURSOR, createdAt: "yesterday" })).toBe(false);
    expect(validCursor({ ...CURSOR, id: "x'; drop table" })).toBe(false);
    const { q, params } = render(requestHistoryQuery("viewer", "asked", { createdAt: "nope", id: CURSOR.id }));
    expect(q).not.toContain("hsr.created_at, hsr.id) <");
    expect(params).toEqual(["viewer", "viewer", HISTORY_PAGE + 1]);
  });
});

describe("hiddenHistoryCountQuery", () => {
  it("counts the viewer's rows whose other side has no friendship row, and reads no name", () => {
    const { q } = render(hiddenHistoryCountQuery("viewer"));
    expect(q).toContain("select count(*)::int as n");
    expect(q).toContain("not exists");
    expect(q).not.toContain("display_name");
    // Asks and offers both count: the viewer is either side of the row.
    expect(q).toContain("where (hcr.asker_user_id = $1 or hcr.holder_user_id = $2)");
    // The history never shows a withdrawn row to its non-starter (an ask's holder, an offer's wanter), so the foot line does not count one.
    expect(q).toContain("not (hcr.status = 'withdrawn' and (case when hcr.initiated_by = 'asker' then hcr.holder_user_id else hcr.asker_user_id end) = $3)");
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
    commander_oracle_id: null, commander_name: null, commander_art: null, offer: false, ...over,
  });
  it("returns a page of 30 and the cursor of its last row when one more exists", async () => {
    const rows = Array.from({ length: HISTORY_PAGE + 1 }, (_, i) => row(i));
    const page = await loadRequestHistory("viewer", "asked", null, new Date("2026-11-10T00:00:00Z"), { execute: async () => ({ rows }) } as never);
    expect(page.entries).toHaveLength(HISTORY_PAGE);
    expect(page.next).toEqual({ createdAt: rows[HISTORY_PAGE - 1].cursor_at, id: rows[HISTORY_PAGE - 1].id });
  });
  it("marks an offer row, and an ask row is not one", async () => {
    const page = await loadRequestHistory("viewer", "asked", null, new Date("2026-11-10T00:00:00Z"), { execute: async () => ({ rows: [row(1, { offer: true }), row(2)] }) } as never);
    expect(page.entries.map((e) => e.offer)).toEqual([true, false]);
  });
  it("has no next on a short page, and reads an open ask past its days as expired", async () => {
    const page = await loadRequestHistory("viewer", "asked", null, new Date("2026-12-01T00:00:00Z"), { execute: async () => ({ rows: [row(1, { status: "open", answered_at: null })] }) } as never);
    expect(page.next).toBeNull();
    expect(page.entries[0].state).toBe("expired");
  });
});
