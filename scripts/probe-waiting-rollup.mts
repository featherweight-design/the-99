// pnpm probe:waiting-rollup: a friend's trade matches on one reader-day are ONE row in the Friends page's Waiting on
// you and ONE in the Friends badge, as Home's What's new folds them (#3441), against a real database. A friend shares
// three spares the reader wants and a pass notices them; on main that drew three rows and a badge of 3.
// Its accounts are made-up per-run ids, purged in a finally. With ROLLUP_VIEWER set, that account is the reader and
// nothing is purged, which seeds the contact sheet's Friends page (scratch branch only, like every run).
//
//   ROLLUP_PROBE_BRANCH=br-… [ROLLUP_VIEWER=user_…] pnpm probe:waiting-rollup   (DATABASE_URL is the scratch branch)
import { randomUUID } from "node:crypto";
import { requireEnv } from "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";

requireEnv(["DATABASE_URL"]);
const BRANCH = process.env.ROLLUP_PROBE_BRANCH;
if (!BRANCH) throw new Error("probe:waiting-rollup: set ROLLUP_PROBE_BRANCH");
const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const KEEP = process.env.ROLLUP_VIEWER;
const R = KEEP ?? `probe-wr-r-${run}`; // the reader
const F = `probe-wr-f-${run}`; // the friend

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`probe:waiting-rollup: database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  assertScratchBranch(who[0]?.b, "probe:waiting-rollup");
  const ENV = await (await import("../src/lib/flags/snapshot")).resolveFlagsStrict(null);
  console.log(`target ${BRANCH}, reader ${R}, friend ${F}`);

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { shareSparesWith } = await import("../src/lib/social/spares");
  const { noticeTradeMatches } = await import("../src/lib/social/trade-match");
  const { loadWaitingOnYou } = await import("../src/lib/social/waiting");
  const prefs = await import("../src/lib/feed/prefs");
  const { FEED_KINDS } = await import("../src/lib/feed/kinds");
  const read = await import("../src/lib/feed/read");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const add = async (u: string, card: string, quantity: number) => {
    const { rows } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
      select p.set_code, p.collector_number, p.scryfall_id from printings p where p.oracle_id = ${card} order by p.scryfall_id limit 1`);
    if (!rows[0]) throw new Error(`no printing of ${card}`);
    const items = [{ oracleId: card, setCode: rows[0].set_code, collectorNumber: rows[0].collector_number, scryfallId: rows[0].scryfall_id,
      finish: "nonfoil" as const, condition: null, quantity }];
    const result = await applyCollectionChange(u, { kind: "add", items }, { id: randomUUID() });
    if (result.status !== "applied") throw new Error(`add refused: ${result.status}`);
  };

  try {
    // Three cards the reader owns none of, so each is a want and the friend's second copy a spare.
    const { rows: picked } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c
      where c.image_uri is not null and exists (select 1 from printings p where p.oracle_id = c.oracle_id)
        and not exists (select 1 from collection_items ci where ci.user_id = ${R} and ci.oracle_id = c.oracle_id)
      order by c.oracle_id limit 3 offset 1500`);
    if (picked.length < 3) throw new Error("fewer than three cards with a printing on this branch");

    await friends.ensureProfile(R, "Rae");
    const f = await friends.ensureProfile(F, "Fin");
    const inv = await friends.createInvite(R);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(F, inv.token);
    const pod = await pods.createPod(R, "Rollup probe");
    if (!pod || !(await pods.addMember(R, pod.id, f.publicId))) throw new Error("pod refused");
    for (const u of [R, F]) if (!(await shareSparesWith(u, pod.id, true))) throw new Error("shareSparesWith refused");
    await prefs.setFeedKinds(R, FEED_KINDS, new Date(Date.now() - 86_400_000));
    await prefs.setFeedKinds(F, FEED_KINDS, new Date(Date.now() - 86_400_000));

    for (const { oracle_id } of picked) {
      await add(F, oracle_id, 2);
      // By hand: `setWishlistQuantity` reads the request's switches, and a script has no request.
      await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${R}, ${oracle_id}, 1) on conflict do nothing`);
    }
    await noticeTradeMatches(R, ENV);
    const { rows: items } = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from feed_items where user_id = ${R} and friend_user_id = ${F} and kind = 'trade-match'`);
    check("the pass wrote one trade match per card", items[0]?.n === 3, `${items[0]?.n}`);

    const waiting = (await loadWaitingOnYou(R, ENV, new Date())).filter((w) => w.kind === "trade-match");
    check("Waiting on you draws the friend's day as one row", waiting.length === 1, `${waiting.length} rows`);
    const row = waiting[0];
    check("... rolled over all three cards", row?.kind === "trade-match" && row.rollup?.keys.length === 3, `${row?.kind === "trade-match" ? row.rollup?.keys.length : "none"}`);
    check("... and not askable (no one card to ask for)", row?.kind === "trade-match" && row.askable === false);

    const badge = await read.unseenFriendsCount(R, ENV);
    check("the Friends badge counts the friend's day once", badge === 1, `${badge}`);
    if (KEEP) console.log(`\nseeded: ${R} has a rolled row from friend ${F}; nothing purged`);
  } finally {
    if (!KEEP) {
      for (const u of [R, F]) {
        try {
          await purgeAccount(u);
        } catch (e) {
          console.error(`cleanup: purge of ${u} failed`, e);
        }
      }
      await db.execute(sql`delete from user_prefs where user_id in (${R}, ${F})`);
      await db.execute(sql`delete from user_data_stamps where user_id in (${R}, ${F})`);
      const { rows: left } = await db.execute<{ n: number }>(sql`
        select (select count(*) from feed_items where user_id in (${R}, ${F}) or friend_user_id in (${R}, ${F}))
          + (select count(*) from collection_items where user_id in (${R}, ${F}))
          + (select count(*) from wishlist_items where user_id in (${R}, ${F}))
          + (select count(*) from social_profiles where user_id in (${R}, ${F}))
          + (select count(*) from pods where owner_user_id in (${R}, ${F}))
          as n`);
      check("cleanup: every row this run wrote is gone", Number(left[0]?.n ?? -1) === 0, `${left[0]?.n} rows remain`);
    }
  }
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nprobe:waiting-rollup: all checks passed" : `\nprobe:waiting-rollup: ${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
