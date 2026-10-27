// The ✕'s key parser and its one write, rendered: a stored item only when it is the reader's own row, an ask through
// the holder's own feed item for it, a catalog key as given. Plus every read the ruling covers leaves a dismissed key out.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { dismissQuery, parseDismissKey } from "./feed-dismiss";
import { incomingAsksQuery, waitingAsksCountQuery } from "./spare-requests";
import { storedFeedBranch, storedItemsByKeyQuery } from "./feed-items";
import { catalogBranch } from "../feed/read";

const render = (q: SQL) => new PgDialect().sqlToQuery(q);
const ID = "0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f";
const NOW = new Date("2026-10-27T12:00:00Z");

describe("parseDismissKey", () => {
  it("reads Home's keys and a Waiting ask, lowercasing ids", () => {
    expect(parseDismissKey(`item:${ID.toUpperCase()}`)).toEqual({ kind: "item", id: ID });
    expect(parseDismissKey(`ask:${ID}`)).toEqual({ kind: "ask", requestId: ID });
    expect(parseDismissKey("set:dsk")).toEqual({ kind: "catalog", key: "set:dsk" });
    expect(parseDismissKey("precon:DuskmournHouseOfHorrorJumpScare_DSC")).toEqual({ kind: "catalog", key: "precon:DuskmournHouseOfHorrorJumpScare_DSC" });
  });
  it("refuses anything else", () => {
    for (const bad of [null, 3, "", "item:nope", "ask:", "set:", `precon:${"x".repeat(201)}`, "set:a\nb", "card:abc", `item:${ID}x`]) {
      expect(parseDismissKey(bad)).toBeNull();
    }
  });
});

describe("dismissQuery", () => {
  it("writes a catalog key as given", () => {
    const { sql, params } = render(dismissQuery("u1", { kind: "catalog", key: "set:dsk" }));
    expect(sql).toMatch(/^insert into "feed_dismissals" \(user_id, key\) values \(\$1, \$2\) on conflict do nothing$/);
    expect(params).toEqual(["u1", "set:dsk"]);
  });
  it("writes a stored item only from the reader's own row", () => {
    const { sql, params } = render(dismissQuery("u1", { kind: "item", id: ID }));
    expect(sql).toContain(`select dfi.user_id, 'item:' || dfi.id::text from "feed_items" dfi`);
    expect(sql).toContain("where dfi.user_id = $1 and dfi.id = $2::uuid");
    expect(params).toEqual(["u1", ID]);
  });
  it("writes an ask through the holder's own unanswered feed item for that request", () => {
    const { sql, params } = render(dismissQuery("u1", { kind: "ask", requestId: ID }));
    expect(sql).toContain("where dfi.user_id = $1 and dfi.kind = 'spare-request' and dfi.dedupe_key = $2 and dfi.data ->> 'answer' is null");
    expect(params).toEqual(["u1", ID]);
  });
});

describe("every read leaves a dismissed key out", () => {
  it("the stored feed branch and the push resolver, on the item's own key", () => {
    const clause = `not exists (select 1 from "feed_dismissals" ffd where ffd.user_id = fi.user_id and ffd.key = 'item:' || fi.id::text)`;
    expect(render(storedFeedBranch("u1", ["trade-match"], NOW)).sql).toContain(clause);
    expect(render(storedItemsByKeyQuery("u1", [{ kind: "trade-match", key: `item:${ID}` }], NOW)!).sql).toContain(clause);
  });
  it("the catalog branches, by set code and precon file", () => {
    const gate = () => ({ queryChunks: [] }) as unknown as SQL;
    expect(render(catalogBranch("new-set", "u1", NOW, gate)).sql).toContain(`not exists (select 1 from "feed_dismissals" sfd where sfd.user_id = $`);
    expect(render(catalogBranch("new-set", "u1", NOW, gate)).sql).toContain(`and sfd.key = 'set:' || s.code)`);
    expect(render(catalogBranch("new-precon", "u1", NOW, gate)).sql).toContain(`and pfd.key = 'precon:' || p.file_name)`);
  });
  it("the incoming asks and their count, through the holder's feed item for the ask", () => {
    for (const [q, a] of [[incomingAsksQuery("u1", NOW), "isr"], [waitingAsksCountQuery("u1", NOW), "wsr"]] as const) {
      const { sql } = render(q);
      expect(sql).toContain(`join "feed_dismissals" dfd on dfd.user_id = dfi.user_id and dfd.key = 'item:' || dfi.id::text`);
      expect(sql).toContain(`where dfi.user_id = ${a}.holder_user_id and dfi.kind = 'spare-request' and dfi.dedupe_key = ${a}.id::text`);
    }
  });
});
