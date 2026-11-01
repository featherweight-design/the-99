// A table is seen only from the viewer's own seat, while it is open on the DATABASE's clock, and while the viewer is
// still in its pod. Only the emitted SQL shows that (the `built.test.ts` precedent); `probe:rule-zero` proves the
// answers, including a table expiring between two reads.
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import { tableEnded, tableLoggable, tableOpen } from "./rule-zero-open";
import { closeTableWhere, closeTable, markSeen, openTablesQuery, podSetup, tableFacesQuery, podSetupMembers, reseatTable, setSeatDeck, setTable, setupDecksQuery, startDeck, tableSetup } from "./rule-zero";

const VIEWER = "user_viewer";
const POD = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const MEMBER = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";

describe("openTablesQuery", () => {
  const q = openTablesQuery(VIEWER).toSQL();

  it("decides open by the database's clock, qualified to the table", () => {
    expect(q.sql).toContain(`("rule_zero_tables"."closed_at" is null and "rule_zero_tables"."expires_at" > now())`);
    expect(q.params).not.toContainEqual(expect.any(Date));
  });

  it("joins the viewer's own seat and the viewer's own pod membership", () => {
    expect(q.sql).toContain(`inner join "rule_zero_seats" "mine" on ("mine"."table_id" = "rule_zero_tables"."id" and "mine"."user_id" = $1)`);
    expect(q.sql).toContain(`inner join "pod_members" "viewer_in" on ("viewer_in"."pod_id" = "rule_zero_tables"."pod_id" and "viewer_in"."user_id" = $2)`);
    expect(q.params).toEqual([VIEWER, VIEWER]);
  });
});

describe("the pod row's and Home's read (PR 6)", () => {
  it("names the setter and the viewer's own seated deck, from the viewer's own seat", () => {
    const q = openTablesQuery(VIEWER).toSQL();
    expect(q.sql).toContain(`left join "social_profiles" "setter" on "setter"."user_id" = "rule_zero_tables"."set_by"`);
    expect(q.sql).toContain(`left join "decks" "mine_deck" on "mine_deck"."id" = "mine"."deck_id"`);
  });

  it("joins the viewer's own friendship to each seat, so a non-friend draws as initials (D2)", () => {
    const q = tableFacesQuery(VIEWER, [POD]).toSQL();
    expect(q.sql).toContain(`left join "friend_links" "viewer_friend" on ("viewer_friend"."user_id" = $1 and "viewer_friend"."friend_user_id" = "rule_zero_seats"."user_id")`);
    expect(q.params[0]).toBe(VIEWER);
  });
});

describe("the writes refuse a malformed ask before reading anything", () => {
  const seat = (member: string, deck: string | null = null) => ({ member, deck });

  it("setTable takes 2 to 8 distinct members", async () => {
    expect(await setTable(VIEWER, POD, [seat(MEMBER)], "UTC")).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, POD, [seat(MEMBER), seat(MEMBER)], "UTC")).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, POD, Array.from({ length: 9 }, (_, i) => seat(`${i}a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b`)), "UTC")).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, "not-a-pod", [seat(MEMBER), seat(POD)], "UTC")).toEqual({ kind: "refused", reason: "invalid" });
    expect(await setTable(VIEWER, POD, [seat(MEMBER, "deck"), seat(POD)], "UTC")).toEqual({ kind: "refused", reason: "invalid" });
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

describe("setup's decks (G2, G3, G8)", () => {
  const q = new PgDialect().sqlToQuery(setupDecksQuery(VIEWER, POD));

  it("lists a member's decks only for the viewer and the viewer's friends, and only in a pod the viewer is in", () => {
    expect(q.sql).toContain("exists (select 1 from \"pod_members\" vi where vi.pod_id = pm.pod_id and vi.user_id = $");
    expect(q.sql).toContain("pm.user_id = $");
    expect(q.sql).toContain("exists (select 1 from \"friend_links\" fl where fl.user_id = $");
    expect(q.sql).toContain("fl.friend_user_id = pm.user_id");
  });

  it("leaves out a ruled friend's hidden deck and every deck while their sharing is off, never the viewer's own", () => {
    const ruled = new PgDialect().sqlToQuery(setupDecksQuery(VIEWER, POD, ["user_friend"]));
    expect(ruled.sql).toContain('left join "user_prefs" up on up.user_id = d.user_id');
    expect(ruled.sql).toContain("(d.user_id = $");
    expect(ruled.sql).toContain("d.user_id not in ($");
    expect(ruled.sql).toContain("not d.hidden_from_friends and coalesce(up.friends_see_decks, true)");
    expect(ruled.params).toContain("user_friend");
    // No owner's switch on: the list is as shipped.
    expect(q.sql).not.toContain("hidden_from_friends");
  });

  it("reads a deck's last game from that deck's own games, aliased", () => {
    expect(q.sql).toContain("(select max(g.played_at) from \"deck_games\" g where g.deck_id = d.id)");
  });

  it("lists newest first, as the game log's picker does", () => {
    expect(q.sql).toContain("order by sp.public_id, d.created_at desc, d.id");
  });

  it("starts a seat on the most recently played deck, else the most recently edited", () => {
    const deck = (deckId: string, lastPlayed: string | null, lastEdited: string) => ({ deckId, lastPlayed, lastEdited });
    expect(startDeck([])).toBeNull();
    expect(startDeck([deck("a", null, "2026-10-10"), deck("b", "2026-10-01", "2026-09-01"), deck("c", null, "2026-10-12")])).toBe("b");
    expect(startDeck([deck("a", null, "2026-10-10"), deck("c", null, "2026-10-12")])).toBe("c");
    expect(startDeck([deck("a", "2026-10-01", "2026-10-01"), deck("b", "2026-10-01", "2026-10-05")])).toBe("b");
  });

  it("takes only ids", async () => {
    expect(await podSetup(VIEWER, "x")).toBeNull();
    expect(await tableSetup(VIEWER, "x")).toBeNull();
  });
});

describe("the open predicate (closeTable's lifecycle)", () => {
  const render = (c: Parameters<PgDialect["sqlToQuery"]>[0]) => new PgDialect().sqlToQuery(c).sql;

  it("is open only while the setter has not closed it AND the database's clock is before its morning", () => {
    expect(render(tableOpen)).toBe(`("rule_zero_tables"."closed_at" is null and "rule_zero_tables"."expires_at" > now())`);
  });

  it("ends on either, the exact complement of open", () => {
    expect(render(tableEnded)).toBe(`("rule_zero_tables"."closed_at" is not null or "rule_zero_tables"."expires_at" <= now())`);
  });

  it("keeps the game log on the clock alone, so a host-closed table logs until its morning", () => {
    expect(render(tableLoggable)).toBe(`"rule_zero_tables"."expires_at" > now()`);
    expect(render(tableLoggable)).not.toContain("closed_at");
  });
});

describe("closeTable's guard", () => {
  const q = new PgDialect().sqlToQuery(closeTableWhere(VIEWER, POD)!);

  it("closes only the setter's own table, still open, with the setter seated: one WHERE, so a race has one winner", () => {
    expect(q.sql).toContain(`"rule_zero_tables"."id" = $1`);
    expect(q.sql).toContain(`"rule_zero_tables"."set_by" = $2`);
    expect(q.sql).toContain(`("rule_zero_tables"."closed_at" is null and "rule_zero_tables"."expires_at" > now())`);
    expect(q.sql).toContain("gs.user_id = $");
    expect(q.sql).toContain("(gt.closed_at is null and gt.expires_at > now())");
    expect(q.params).toContain(POD);
    expect(q.params.filter((p) => p === VIEWER).length).toBeGreaterThanOrEqual(2);
  });

  it("refuses a malformed id before writing anything", async () => {
    expect(await closeTable(VIEWER, "not a uuid")).toBe(false);
    expect(await closeTable(VIEWER, undefined)).toBe(false);
  });
});
