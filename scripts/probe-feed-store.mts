// Proves the news feed's store (menu and Home PR 4, `src/lib/feed/`, `src/lib/social/feed-items.ts`) against a REAL
// schema: the kinds map (`setFeedKinds`), the one writer (`recordFeedItem`), the read (`loadFeed`) with the live friend
// grant re-joined, both badges and both seen cursors (`markFeedSeen`, `markFriendsSeen`) writing only when an unseen
// item exists, the purge's social half deleting the rows that name a deleted friend, and the plans of the read and the
// count.
//
// It WRITES, so it fails closed on its target: the URL comes from `FEED_PROBE_URL` (never `DATABASE_URL`, which
// `scripts/lib/env.mjs` would override from `.env`), and `FEED_PROBE_BRANCH` (default the feed lane's scratch branch)
// must equal the `neon.branch_id` the database reports, checked through the app's own `db` handle before any write.
// Staging, production and local-dev are refused by name. Its two accounts are made-up per-run ids, purged in a
// finally; the catalog stamps it adds for real set codes are deleted by key.
//
//   FEED_PROBE_URL="$(sed -n 's/^DATABASE_URL=//p' .env.local)" pnpm probe:feed-store

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BRANCH = process.env.FEED_PROBE_BRANCH ?? "br-holy-frog-a6613xf6";
const url = process.env.FEED_PROBE_URL;
if (!url) throw new Error("probe:feed-store: set FEED_PROBE_URL");
if (PROTECTED.has(BRANCH)) throw new Error(`probe:feed-store: ${BRANCH} is staging, production or local-dev; it writes`);
// Before any app module loads: `src/db` reads it at import time.
process.env.DATABASE_URL = url;

const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const U = `probe-feed-u-${run}`; // the reader
const F = `probe-feed-f-${run}`; // the friend
const ENV = { SOCIAL_FRIENDS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
const DAY = 86_400_000;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`probe:feed-store: database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  console.log(`target ${BRANCH}, reader ${U}, friend ${F}`);

  const prefs = await import("../src/lib/feed/prefs");
  const { recordFeedItem } = await import("../src/lib/social/feed-write");
  const read = await import("../src/lib/feed/read");
  const { availableFeedKinds } = await import("../src/lib/feed/flag");
  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { shareSparesWith } = await import("../src/lib/social/spares");
  const { keepCardBack, releaseCard } = await import("../src/lib/social/spare-settings");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const stamp = async (u: string) => {
    const { rows } = await db.execute<{ s: number | null }>(sql`select stamp::int as s from user_data_stamps where user_id = ${u}`);
    return rows[0]?.s ?? 0;
  };
  const prefsRow = async (u: string) => {
    const { rows } = await db.execute<{ feed_kinds: Record<string, string>; feed_seen_at: string | null; friends_seen_at: string | null }>(
      sql`select feed_kinds, feed_seen_at::text, friends_seen_at::text from user_prefs where user_id = ${u}`);
    return rows[0];
  };
  const stampedKeys: string[] = [];

  const now = new Date();
  const ago = (d: number) => new Date(now.getTime() - d * DAY);

  try {
    // ---- fixture: profiles, a friendship, a pod both are in, F sharing spares with it.
    await friends.ensureProfile(U, "Una");
    const f = await friends.ensureProfile(F, "Fay");
    const u = await friends.ensureProfile(U, "Una");
    const inv = await friends.createInvite(U);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(F, inv.token);
    const pod = await pods.createPod(F, "Feed probe");
    if (!pod) throw new Error("createPod refused");
    if (!(await pods.addMember(F, pod.id, u.publicId))) throw new Error("addMember refused");
    if (!(await shareSparesWith(F, pod.id, true))) throw new Error("shareSparesWith refused");
    const { rows: cardRows } = await db.execute<{ oracle_id: string }>(sql`select oracle_id from cards order by oracle_id limit 1`);
    const CARD = cardRows[0].oracle_id;

    // ---- 1. setFeedKinds
    console.log("\n1. setFeedKinds");
    const base = ["new-set", "price-drop", "trade-match", "combo"] as const;
    check("turning kinds on writes (no row yet: inserts)", await prefs.setFeedKinds(U, [...base], ago(30)));
    let row = await prefsRow(U);
    check("each kind turned on carries enabledAt = the save's now",
      base.every((k) => row.feed_kinds[k] === ago(30).toISOString()) && Object.keys(row.feed_kinds).length === 4, JSON.stringify(row.feed_kinds));
    check("adding a kind writes", await prefs.setFeedKinds(U, [...base, "new-precon"], ago(29)));
    row = await prefsRow(U);
    check("kept kinds keep their enabledAt; the new one is stamped now",
      row.feed_kinds.combo === ago(30).toISOString() && row.feed_kinds["new-precon"] === ago(29).toISOString(), JSON.stringify(row.feed_kinds));
    let s0 = await stamp(U);
    check("an unchanged save writes nothing", (await prefs.setFeedKinds(U, [...base, "new-precon"], ago(28))) === false);
    check("... and moves no stamp", (await stamp(U)) === s0);
    check("... and the map is as it was", JSON.stringify((await prefsRow(U)).feed_kinds) === JSON.stringify(row.feed_kinds));
    check("turning a kind off writes", await prefs.setFeedKinds(U, [...base], ago(28)));
    row = await prefsRow(U);
    check("the kind turned off is absent", !("new-precon" in row.feed_kinds) && row.feed_kinds.combo === ago(30).toISOString(), JSON.stringify(row.feed_kinds));
    check("a save moves the stamp", (await stamp(U)) > s0);

    // ---- 2. recordFeedItem
    console.log("\n2. recordFeedItem");
    check("price drop (on) out of the window is written",
      await recordFeedItem(db, { userId: U, kind: "price-drop", dedupeKey: "pd-old", oracleId: CARD, data: { from: 500, to: 300 }, now: ago(20) }));
    check("price drop (on) is written",
      await recordFeedItem(db, { userId: U, kind: "price-drop", dedupeKey: "pd-1", oracleId: CARD, data: { from: 500, to: 300 }, now: ago(3) }));
    check("the same event again writes nothing",
      (await recordFeedItem(db, { userId: U, kind: "price-drop", dedupeKey: "pd-1", oracleId: CARD, now: ago(2) })) === false);
    check("combo (on) is written", await recordFeedItem(db, { userId: U, kind: "combo", dedupeKey: "cb-1", variantId: "1-2", now: ago(5) }));
    check("a kind that is off (spare-request) writes nothing",
      (await recordFeedItem(db, { userId: U, kind: "spare-request", dedupeKey: "sr-1", oracleId: CARD, friendUserId: F, now: ago(1) })) === false);
    check("a reader with no feed kinds (F) gets nothing",
      (await recordFeedItem(db, { userId: F, kind: "combo", dedupeKey: "cb-f", variantId: "1-2", now: ago(1) })) === false);
    let threw = false;
    try {
      await recordFeedItem(db, { userId: U, kind: "trade-match", dedupeKey: "tm-self", oracleId: CARD, friendUserId: U, now: ago(1) });
    } catch {
      threw = true;
    }
    check("an item naming the reader as the friend is refused", threw);
    const { rows: selfRows } = await db.execute(sql`select 1 from feed_items where user_id = ${U} and dedupe_key = 'tm-self'`);
    check("... and nothing reached the table", selfRows.length === 0);
    let dbRefused = false;
    try {
      await db.execute(sql`insert into feed_items (user_id, kind, dedupe_key, friend_user_id) values (${U}, 'trade-match', 'tm-self-raw', ${U})`);
    } catch {
      dbRefused = true;
    }
    check("the table's own check refuses a self-friend row too", dbRefused);
    // combo off then on again: the item from before stays hidden.
    await prefs.setFeedKinds(U, ["new-set", "price-drop", "trade-match"], ago(4));
    check("combo off: a combo writes nothing",
      (await recordFeedItem(db, { userId: U, kind: "combo", dedupeKey: "cb-off", variantId: "3-4", now: ago(4) })) === false);
    await prefs.setFeedKinds(U, [...base], ago(2));
    check("combo on again: a new combo is written", await recordFeedItem(db, { userId: U, kind: "combo", dedupeKey: "cb-2", variantId: "5-6", now: ago(1) }));
    check("trade match naming F is written",
      await recordFeedItem(db, { userId: U, kind: "trade-match", dedupeKey: "tm-1", oracleId: CARD, friendUserId: F, data: {}, now: ago(0.5) }));

    // A catalog arrival: a real released expansion/commander set with no stamp yet, stamped 6 days ago (not baseline),
    // and another stamped as a BASELINE. Read-only on the catalog otherwise.
    const { rows: unstamped } = await db.execute<{ code: string }>(sql`
      select s.code from sets s
      where s.digital = false and s.set_type in ('expansion', 'commander') and s.released_at <= current_date - 6
        and not exists (select 1 from catalog_first_seen c where c.kind = 'set' and c.key = s.code)
      order by s.released_at desc limit 2`);
    // Both identifiers are set only when two candidates exist: with one, ARRIVED alone would make later checks expect
    // an arrival that was never inserted.
    const [ARRIVED, BASELINE] = unstamped.length === 2 ? unstamped.map((r) => r.code) : [undefined, undefined];
    if (ARRIVED && BASELINE) {
      await db.execute(sql`insert into catalog_first_seen (kind, key, first_seen_at, baseline) values
        ('set', ${ARRIVED}, ${ago(6).toISOString()}::timestamptz at time zone 'UTC', false),
        ('set', ${BASELINE}, ${ago(6).toISOString()}::timestamptz at time zone 'UTC', true)`);
      stampedKeys.push(ARRIVED, BASELINE);
    } else {
      console.log(`note: ${unstamped.length} unstamped released set(s) on this branch, two needed; nothing stamped, the set-arrival checks are skipped`);
    }

    // ---- 3. loadFeed
    console.log("\n3. loadFeed");
    let feed = await read.loadFeed(U, ENV, now);
    const keys = feed.map((i) => `${i.kind}`);
    const expected = ["trade-match", "combo", "price-drop", ...(ARRIVED ? ["new-set"] : [])];
    check("stored rows (and the arrival) newest first, inside 14 days", JSON.stringify(keys) === JSON.stringify(expected), JSON.stringify(keys));
    check("the price drop out of the window is not read", feed.filter((i) => i.kind === "price-drop").length === 1);
    check("the combo from before combo was turned on again is not read", feed.filter((i) => i.kind === "combo").length === 1);
    check("every item is unseen (never seen)", feed.every((i) => i.unseen));
    const tm = feed.find((i) => i.kind === "trade-match");
    check("the trade match names F by public id and name, never a Clerk id",
      tm !== undefined && "friend" in tm && tm.friend?.publicId === f.publicId && tm.friend.displayName === "Fay" && !JSON.stringify(tm).includes(F));
    if (ARRIVED) {
      check("the set arrival is read, the baseline row never",
        feed.some((i) => i.kind === "new-set" && i.code === ARRIVED) && !feed.some((i) => i.kind === "new-set" && i.code === BASELINE));
      // A set stamped before the kind's enabledAt is not read: move new-set's enabledAt past the stamp.
      await prefs.setFeedKinds(U, ["price-drop", "trade-match", "combo"], ago(1));
      await prefs.setFeedKinds(U, [...base], ago(1));
      check("an arrival stamped before new-set's enabledAt is not read",
        !(await read.loadFeed(U, ENV, now)).some((i) => i.kind === "new-set"));
    }
    check("a kind not available (friends off) is not read",
      !(await read.loadFeed(U, { ...ENV, SOCIAL_FRIENDS_ENABLED: "" }, now)).some((i) => i.kind === "trade-match"));

    await shareSparesWith(F, pod.id, false);
    check("F stops sharing spares with the pod: the trade match leaves the feed",
      !(await read.loadFeed(U, ENV, now)).some((i) => i.kind === "trade-match"));
    check("... and the Friends badge", (await read.unseenFriendsCount(U, ENV, now)) === 0);
    await shareSparesWith(F, pod.id, true);
    check("sharing again brings it back, with no write to feed_items",
      (await read.loadFeed(U, ENV, now)).some((i) => i.kind === "trade-match"));

    if (!(await keepCardBack(F, CARD))) throw new Error("keepCardBack refused");
    check("F keeps that card back: the trade match leaves the feed",
      !(await read.loadFeed(U, ENV, now)).some((i) => i.kind === "trade-match"));
    check("... and the Friends badge", (await read.unseenFriendsCount(U, ENV, now)) === 0);
    await releaseCard(F, CARD);
    check("F releases it: the match is back, with no write to feed_items",
      (await read.loadFeed(U, ENV, now)).some((i) => i.kind === "trade-match"));

    // ---- 4. counts and the seen cursors
    console.log("\n4. unseen counts and the seen cursors");
    feed = await read.loadFeed(U, ENV, now);
    check("Home's count equals the unseen items", (await read.unseenCount(U, ENV, now)) === feed.length && feed.length > 0, String(feed.length));
    check("the Friends count is the trade match", (await read.unseenFriendsCount(U, ENV, now)) === 1);
    s0 = await stamp(U);
    check("markFeedSeen writes while an item is unseen", await prefs.markFeedSeen(U, ENV, now));
    row = await prefsRow(U);
    check("feed_seen_at is the render's now; friends_seen_at untouched",
      row.feed_seen_at !== null && new Date(row.feed_seen_at).getTime() === now.getTime() && row.friends_seen_at === null, `${row.feed_seen_at} ${row.friends_seen_at}`);
    const s1 = await stamp(U);
    check("... and moves the stamp once", s1 === s0 + 1, `${s0} -> ${s1}`);
    check("markFeedSeen again writes nothing", (await prefs.markFeedSeen(U, ENV, now)) === false);
    check("... feed_seen_at unchanged", (await prefsRow(U)).feed_seen_at === row.feed_seen_at);
    check("... the stamp did not move", (await stamp(U)) === s1);
    check("Home's count is 0", (await read.unseenCount(U, ENV, now)) === 0);
    check("the feed reads every item seen", (await read.loadFeed(U, ENV, now)).every((i) => !i.unseen));
    check("Home's seen did not clear the Friends count", (await read.unseenFriendsCount(U, ENV, now)) === 1);
    check("markFriendsSeen writes", await prefs.markFriendsSeen(U, ENV, now));
    const after = await prefsRow(U);
    check("friends_seen_at moved; feed_seen_at untouched",
      after.friends_seen_at !== null && after.feed_seen_at === row.feed_seen_at, `${after.feed_seen_at} ${after.friends_seen_at}`);
    const s2 = await stamp(U);
    check("markFriendsSeen again writes nothing, no stamp moves",
      (await prefs.markFriendsSeen(U, ENV, now)) === false && (await stamp(U)) === s2);
    check("the Friends count is 0", (await read.unseenFriendsCount(U, ENV, now)) === 0);
    const later = new Date(now.getTime() + 60_000);
    await recordFeedItem(db, { userId: U, kind: "trade-match", dedupeKey: "tm-2", oracleId: CARD, friendUserId: F, now: new Date(now.getTime() + 30_000) });
    check("a new trade match: Home 1, Friends 1",
      (await read.unseenCount(U, ENV, later)) === 1 && (await read.unseenFriendsCount(U, ENV, later)) === 1);
    await prefs.markFriendsSeen(U, ENV, later);
    check("/friends' seen did not clear Home's count",
      (await read.unseenCount(U, ENV, later)) === 1 && (await read.unseenFriendsCount(U, ENV, later)) === 0);

    // ---- 6. plans (before the purge empties the fixture)
    console.log("\n6. EXPLAIN");
    const kinds = availableFeedKinds(ENV);
    const plans: [string, ReturnType<typeof read.feedQuery>][] = [
      ["loadFeed", read.feedQuery(U, kinds, later)],
      ["unseen count", read.unseenCountQuery(U, kinds, later, "feed_seen_at")],
    ];
    for (const [label, q] of plans) {
      for (const forced of [false, true]) {
        const text = await db.transaction(async (tx) => {
          if (forced) await tx.execute(sql`set local enable_seqscan = off`);
          const { rows } = await tx.execute<{ "QUERY PLAN": string }>(sql`explain ${q!}`);
          return rows.map((r) => r["QUERY PLAN"]).join("\n");
        });
        const uses = /feed_items_user_created_idx/.test(text);
        const fiLine = text.split("\n").find((l) => /feed_items/.test(l))?.trim() ?? "(no feed_items node)";
        console.log(`  ${label}${forced ? " [enable_seqscan=off]" : ""}: ${uses ? "uses" : "does NOT use"} feed_items_user_created_idx; ${fiLine}`);
        if (process.env.FEED_PROBE_PLANS) console.log(text);
      }
    }

    // ---- 5. the purge deletes the items naming the deleted friend
    console.log("\n5. purge");
    const { rows: before } = await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_items where friend_user_id = ${F}`);
    check("rows naming F exist before the purge", (before[0]?.n ?? 0) >= 2, String(before[0]?.n));
    // No `stripe_customers` row for F, so step 0 calls nothing; a null client makes sure of it.
    await purgeAccount(F, { stripe: () => null });
    const { rows: gone } = await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_items where friend_user_id = ${F}`);
    check("the purge deleted every feed item naming F", (gone[0]?.n ?? 1) === 0);
    const { rows: kept } = await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_items where user_id = ${U}`);
    check("U's other items stand", (kept[0]?.n ?? 0) >= 3, String(kept[0]?.n));
    check("U's feed no longer reads a trade match", !(await read.loadFeed(U, ENV, later)).some((i) => i.kind === "trade-match"));
  } finally {
    for (const who of [F, U]) {
      try {
        await purgeAccount(who, { stripe: () => null });
      } catch (e) {
        console.error(`cleanup: purge of ${who} failed`, e);
      }
    }
    await db.execute(sql`delete from feed_items where user_id in (${U}, ${F}) or friend_user_id in (${U}, ${F})`);
    await db.execute(sql`delete from user_prefs where user_id in (${U}, ${F})`);
    await db.execute(sql`delete from user_data_stamps where user_id in (${U}, ${F})`);
    for (const key of stampedKeys) await db.execute(sql`delete from catalog_first_seen where kind = 'set' and key = ${key}`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from feed_items where user_id in (${U}, ${F}) or friend_user_id in (${U}, ${F}))
        + (select count(*) from user_prefs where user_id in (${U}, ${F}))
        + (select count(*) from social_profiles where user_id in (${U}, ${F}))
        + (select count(*) from friend_links where user_id in (${U}, ${F}) or friend_user_id in (${U}, ${F}))
        + (select count(*) from pods where owner_user_id in (${U}, ${F}))
        + (select count(*) from friend_invites where inviter_user_id in (${U}, ${F}))
        + (select count(*) from spare_keep where user_id in (${U}, ${F}))
        + (select count(*) from catalog_first_seen where kind = 'set' and key = any(${sql.param(stampedKeys)}::text[]))
        as n`);
    console.log(`\ncleanup: ${Number(left[0]?.n ?? -1) === 0 ? "every row this run wrote is gone" : `${left[0]?.n} rows remain`}`);
  }
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nprobe:feed-store: all checks passed" : `\nprobe:feed-store: ${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
