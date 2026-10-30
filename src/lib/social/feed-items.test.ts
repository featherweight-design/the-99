import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";

import { storedFeedBranch } from "./feed-items";

const { sql, params } = new PgDialect().sqlToQuery(storedFeedBranch("viewer_1", ["trade-match", "combo", "spare-request"], new Date("2026-10-22T12:00:00Z")));
const q = sql.replace(/\s+/g, " ");

describe("storedFeedBranch", () => {
  it("reads only the viewer's own rows of the kinds asked for", () => {
    expect(q).toMatch(/where fi\.user_id = \$1 and fi\.kind = any\(\$2::text\[\]\)/);
    expect(params).toEqual(["viewer_1", ["trade-match", "combo", "spare-request"], ["spare-request", "secret-lair", "commander-decklists", "wizards-news"], "2026-10-08T12:00:00.000Z"]);
  });

  it("left joins the reader's prefs and gates each kind on its effective enabledAt: the stamp, else always for a default-on kind not declined (G4)", () => {
    expect(q).toContain(`from "feed_items" fi left join "user_prefs" fup on fup.user_id = fi.user_id`);
    expect(q).toContain(`and fi.created_at > coalesce((fup.feed_kinds ->> fi.kind)::timestamptz, case when fi.kind = any($3::text[]) and not (fi.kind = any(coalesce(fup.feed_kinds_declined, '{}'::text[]))) then '-infinity'::timestamptz end)`);
  });

  it("keeps a spare request only while its ask is open and inside its fourteen days, by the request id it was keyed on (a uuid, so the primary key is used) and the reader as holder", () => {
    expect(q).toContain(`and (fi.kind <> 'spare-request' or exists ( select 1 from "spare_requests" fsr where fsr.id = (case when fi.kind = 'spare-request' then fi.dedupe_key::uuid end) and (case when fi.data ->> 'answer' is not null then fsr.asker_user_id = fi.user_id and fsr.status = fi.data ->> 'answer' and fsr.asker_cleared_at is null else fsr.holder_user_id = fi.user_id and fsr.status = 'open' and fsr.created_at > $4::timestamptz end)))`);
  });

  it("keeps an ANSWER to the reader's own ask while that ask still holds the answer it reports and is not cleared, the reader as asker", () => {
    expect(q).toContain(`then fsr.asker_user_id = fi.user_id and fsr.status = fi.data ->> 'answer' and fsr.asker_cleared_at is null else`);
  });

  it("re-joins the live spare grant for a trade match: the friendship, the friend's share, both in that pod", () => {
    expect(q).toContain(`(fi.kind = 'trade-match' and exists ( select 1 from "friend_links" gl join "pod_spare_shares" gs on gs.user_id = gl.friend_user_id join "pod_members" gf on gf.pod_id = gs.pod_id and gf.user_id = gl.friend_user_id join "pod_members" gv on gv.pod_id = gs.pod_id and gv.user_id = gl.user_id where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id)`);
  });

  it("drops a trade match once the friend keeps that card back: a not-exists on spare_keep, aliased and qualified", () => {
    expect(q).toContain(`where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id) and not exists ( select 1 from "spare_keep" sk where sk.user_id = fi.friend_user_id and sk.oracle_id = fi.oracle_id))`);
  });

  it("holds any other friend-naming row to the friendship, and a row naming no friend to nothing", () => {
    expect(q).toContain(`or (fi.kind <> 'trade-match' and exists ( select 1 from "friend_links" gl where gl.user_id = fi.user_id and gl.friend_user_id = fi.friend_user_id))`);
    expect(q).toContain("(fi.friend_user_id is null or (sp.public_id is not null and (");
  });

  it("names the friend by public id and display name, never the Clerk id", () => {
    expect(q).toContain("sp.public_id::text as friend_public_id, sp.display_name as friend_name");
    expect(q).not.toMatch(/fi\.friend_user_id as/);
  });

  it("types every column as the catalog branches do, so the union matches (a uuid against null::text is refused)", () => {
    expect(q).toContain("sp.public_id::text as friend_public_id");
    expect(q).not.toMatch(/sp\.public_id as/);
  });
});
