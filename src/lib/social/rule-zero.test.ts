// A table is seen only from the viewer's own seat, while it is open on the DATABASE's clock, and while the viewer is
// still in its pod. Only the emitted SQL shows that (the `built.test.ts` precedent); `probe:rule-zero` proves the
// answers, including a table expiring between two reads.
import { describe, expect, it } from "vitest";
import { markSeen, openTablesQuery, podSetupMembers, reseatTable, setSeatDeck, setTable } from "./rule-zero";

const VIEWER = "user_viewer";
const POD = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const MEMBER = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("openTablesQuery", () => {
  const q = openTablesQuery(VIEWER).toSQL();

  it("decides open by the database's clock, qualified to the table", () => {
    expect(q.sql).toContain(`"rule_zero_tables"."expires_at" > now()`);
    expect(q.params).not.toContainEqual(expect.any(Date));
  });

  it("joins the viewer's own seat and the viewer's own pod membership", () => {
    expect(q.sql).toContain(`inner join "rule_zero_seats" "mine" on ("mine"."table_id" = "rule_zero_tables"."id" and "mine"."user_id" = $1)`);
    expect(q.sql).toContain(`inner join "pod_members" "viewer_in" on ("viewer_in"."pod_id" = "rule_zero_tables"."pod_id" and "viewer_in"."user_id" = $2)`);
    expect(q.params).toEqual([VIEWER, VIEWER]);
  });
});

describe("the writes refuse a malformed ask before reading anything", () => {
  const seat = (member: string, deck: string | null = null) => ({ member, deck });

  it("setTable takes 2 to 8 distinct members", async () => {
    expect(await setTable(VIEWER, POD, [seat(MEMBER)])).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, POD, [seat(MEMBER), seat(MEMBER)])).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, POD, Array.from({ length: 9 }, () => seat(MEMBER)))).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, "not-a-pod", [seat(MEMBER), seat(POD)])).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, POD, [seat(MEMBER, "deck"), seat(POD)])).toEqual({ kind: "refused", reason: "invalid" });
  });

  it("reseatTable, setSeatDeck, markSeen and podSetupMembers take only ids", async () => {
    expect(await reseatTable(VIEWER, "x", [seat(MEMBER), seat(POD)])).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setSeatDeck(VIEWER, "x", null)).toBe("refused");
    expect(await setSeatDeck(VIEWER, POD, "x")).toBe("refused");
    expect(await markSeen(VIEWER, POD, "2026-10-17")).toBe(false);
    expect(await markSeen(VIEWER, POD, new Date("nope"))).toBe(false);
    expect(await podSetupMembers(VIEWER, "x")).toEqual([]);
  });
});
