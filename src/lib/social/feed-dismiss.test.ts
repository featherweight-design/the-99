// The ✕'s key parser and its one write, rendered: a stored item only when it is the reader's own row, an ask through
// the holder's own feed item for it, a catalog key as given. Plus every read the ruling covers leaves a dismissed key out.
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { dismissQuery, parseDismissKey } from "./feed-dismiss";
import { incomingAsksQuery, waitingAsksCountQuery } from "./spare-requests";
import { storedFeedBranch, storedItemsByKeyQuery } from "./feed-items";
import { catalogBranch } from "../feed/read";

const render = (q: SQL) => {
  const { sql, params } = new PgDialect().sqlToQuery(q);
  return { sql: sql.replace(/\s+/g, " ").trim(), params };
};
const ID = "0f4b1c9e-1d2a-4c3b-8e5f-6a7b8c9d0e1f";
const NOW = new Date("2026-10-27T12:00:00Z");

describe("parseDismissKey", () => {
  it("reads Home's keys and a Waiting ask, lowercasing ids", () => {
    expect(parseDismissKey(`item:${ID.toUpperCase()}`)).toEqual({ kind: "item", id: ID });
    expect(parseDismissKey(`ask:${ID}`)).toEqual({ kind: "ask", requestId: ID });
    expect(parseDismissKey("set:dsk")).toEqual({ kind: "catalog", key: "set:dsk" });
    expect(parseDismissKey("precon:DuskmournHouseOfHorrorJumpScare_DSC")).toEqual({ kind: "catalog", key: "precon:DuskmournHouseOfHorrorJumpScare_DSC" });
    expect(parseDismissKey("post:4bqFzQ1x2y3Z")).toEqual({ kind: "catalog", key: "post:4bqFzQ1x2y3Z" });
  });
  it("refuses anything else", () => {
    for (const bad of [null, 3, "", "item:nope", "ask:", "set:", `precon:${"x".repeat(201)}`, "set:a\nb", "post:", "card:abc", `item:${ID}x`]) {
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
  it("writes an ask the reader holds under its own key, and its holder's unanswered feed item when there is one", () => {
    const { sql, params } = render(dismissQuery("u1", { kind: "ask", requestId: ID }));
    expect(sql).toContain(`select dsr.holder_user_id, 'ask:' || dsr.id::text from "spare_requests" dsr where dsr.id = $1::uuid and dsr.holder_user_id = $2 union all`);
    expect(sql).toContain(`join "spare_requests" dsr on dsr.id = $3::uuid and dsr.holder_user_id = dfi.user_id`);
    expect(sql).toContain("where dfi.user_id = $4 and dfi.kind = 'spare-request' and dfi.dedupe_key = dsr.id::text and dfi.data ->> 'answer' is null");
    expect(params).toEqual([ID, "u1", ID, "u1"]);
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
      expect(sql).toContain(`select 1 from "feed_dismissals" dad where dad.user_id = ${a}.holder_user_id and dad.key = 'ask:' || ${a}.id::text)`);
      expect(sql).toContain(`join "feed_dismissals" dfd on dfd.user_id = dfi.user_id and dfd.key = 'item:' || dfi.id::text`);
      expect(sql).toContain(`where dfi.user_id = ${a}.holder_user_id and dfi.kind = 'spare-request' and dfi.dedupe_key = ${a}.id::text`);
    }
  });
});
