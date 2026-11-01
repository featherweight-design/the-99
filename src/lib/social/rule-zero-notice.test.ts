// The seat notice is read from the viewer's own seat and marked seen on the viewer's own seat row. Only the emitted SQL
// shows the grant (the `rule-zero.test.ts` precedent).
import { describe, expect, it } from "vitest";
import { isThirdPartyName } from "../person-name/brand";
import { markSeatNoticeSeen, markSeatNoticeSeenQuery, unseenSeatNotices, unseenSeatNoticesQuery } from "./rule-zero-notice";

const VIEWER = "user_viewer";
const TABLE = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("unseenSeatNoticesQuery", () => {
  const q = unseenSeatNoticesQuery(VIEWER).toSQL();

  it("joins the viewer's own unseen seat, their pod membership, and decides open by the database's clock", () => {
    expect(q.sql).toContain(`inner join "rule_zero_seats" "notice_seat" on ("notice_seat"."table_id" = "rule_zero_tables"."id" and "notice_seat"."user_id" = $1 and "notice_seat"."notice_seen_at" is null)`);
    expect(q.sql).toContain(`inner join "pod_members" "notice_pod" on ("notice_pod"."pod_id" = "rule_zero_tables"."pod_id" and "notice_pod"."user_id" = $2)`);
    expect(q.sql).toContain(`("rule_zero_tables"."closed_at" is null and "rule_zero_tables"."expires_at" > now())`);
    expect(q.params.slice(0, 2)).toEqual([VIEWER, VIEWER]);
  });

  it("leaves out a table the viewer set themself", () => {
    expect(q.sql).toContain(`"rule_zero_tables"."set_by" <> $`);
  });

  it("takes the host from the setter's profile and the deck from the viewer's own deck only", () => {
    expect(q.sql).toContain(`inner join "social_profiles" "notice_host" on "notice_host"."user_id" = "rule_zero_tables"."set_by"`);
    expect(q.sql).toContain(`left join "decks" "notice_deck" on ("notice_deck"."id" = "notice_seat"."deck_id" and "notice_deck"."user_id" =`);
  });

  it("narrows to the given tables when asked", () => {
    const narrowed = unseenSeatNoticesQuery(VIEWER, [TABLE]).toSQL();
    expect(narrowed.sql).toContain(`"rule_zero_tables"."id" in (`);
    expect(narrowed.params).toContain(TABLE);
    expect(q.sql).not.toContain(`"rule_zero_tables"."id" in (`);
  });
});

describe("markSeatNoticeSeen", () => {
  it("writes nothing for an id that is not a table id", async () => {
    expect(await markSeatNoticeSeen(VIEWER, "not-a-uuid")).toBe(false);
    expect(await markSeatNoticeSeen(VIEWER, null)).toBe(false);
  });
});

describe("markSeatNoticeSeenQuery", () => {
  const q = markSeatNoticeSeenQuery(VIEWER, TABLE, new Date("2026-10-31T23:30:00.000Z")).toSQL();

  it("updates only the viewer's own seat at the table, and only while it is unseen", () => {
    expect(q.sql).toContain(`update "rule_zero_seats" set "notice_seen_at" = $1`);
    expect(q.sql).toContain(`"rule_zero_seats"."table_id" = $2`);
    expect(q.sql).toContain(`"rule_zero_seats"."user_id" = $3`);
    expect(q.sql).toContain(`"rule_zero_seats"."notice_seen_at" is null`);
    expect(q.params.slice(1)).toEqual([TABLE, VIEWER]);
  });
});

describe("unseenSeatNotices", () => {
  const rows = [{ tableId: TABLE, hostName: "Colin", podName: "Thursday night", deckName: null, since: new Date("2026-10-31T23:30:00.000Z") }];
  const reader = (result: unknown[]) => {
    const chain: Record<string, unknown> = { then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej) };
    for (const m of ["from", "innerJoin", "leftJoin", "where", "orderBy"]) chain[m] = () => chain;
    return { select: () => chain, selectDistinct: () => chain } as never;
  };

  it("mints the host and the pod name through named(), so neither leaves as a plain string", async () => {
    const [notice] = await unseenSeatNotices(VIEWER, undefined, reader(rows));
    expect(isThirdPartyName(notice.host)).toBe(true);
    expect(isThirdPartyName(notice.podName)).toBe(true);
    expect(notice.deckName).toBeNull();
  });

  it("reads nothing for an empty list of tables", async () => {
    expect(await unseenSeatNotices(VIEWER, [], reader(rows))).toEqual([]);
  });
});
