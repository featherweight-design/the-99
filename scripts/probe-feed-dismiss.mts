// pnpm probe:feed-dismiss: the ✕ on What's new and Waiting on you (Hugh's ruling 2026-10-27, the menu-home plan's
// product call 6) keeps an item away for good, against a real database:
//   1. a trade match: dismissed, it leaves the feed, the unseen count and Waiting on you; the friend's spare kept back
//      and released, and the matches noticed again, write no second row and bring nothing back;
//   2. an incoming ask: dismissed by its request id, it leaves the holder's asks, the waiting count and Home's feed,
//      and the ask itself stays OPEN for the asker (dismissing answers nothing);
//   3. an ask to a holder with the spare-request kind off (no feed item for it): its ✕ still hides it;
//   4. the purge deletes the reader's dismissals.
// Its accounts are made-up per-run ids, purged in a finally.
//
//   FEED_DISMISS_PROBE_URL=<scratch branch URL> FEED_DISMISS_PROBE_BRANCH=br-… pnpm probe:feed-dismiss

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BRANCH = process.env.FEED_DISMISS_PROBE_BRANCH;
const url = process.env.FEED_DISMISS_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:feed-dismiss: set FEED_DISMISS_PROBE_URL and FEED_DISMISS_PROBE_BRANCH");
if (PROTECTED.has(BRANCH)) throw new Error(`probe:feed-dismiss: ${BRANCH} is staging, production or local-dev; it writes`);
// Before any app module loads: `src/db` reads it at import time.
process.env.DATABASE_URL = url;

import { randomUUID } from "node:crypto";

const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const R = `probe-fd-r-${run}`; // the reader
const F = `probe-fd-f-${run}`; // the friend
const ENV = process.env;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`probe:feed-dismiss: database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  console.log(`target ${BRANCH}, reader ${R}, friend ${F}`);

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { shareSparesWith } = await import("../src/lib/social/spares");
  const { keepCardBack, releaseCard } = await import("../src/lib/social/spare-settings");
  const { noticeTradeMatches } = await import("../src/lib/social/trade-match");
  const { setWishlistQuantity } = await import("../src/lib/wishlist/wishlist");
  const sr = await import("../src/lib/social/spare-requests");
  const { loadWaitingOnYou } = await import("../src/lib/social/waiting");
  const { dismissFeedTarget, parseDismissKey } = await import("../src/lib/social/feed-dismiss");
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
  const dismiss = async (u: string, key: string) => {
    const t = parseDismissKey(key);
    if (!t) throw new Error(`unparsable key ${key}`);
    await dismissFeedTarget(u, t);
  };
  const keysOf = async (u: string, kind: string) => (await read.loadFeed(u, ENV)).filter((i) => i.kind === kind).map((i) => i.key);
  const rowsOf = async (u: string, kind: string) =>
    (await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_items where user_id = ${u} and kind = ${kind}`)).rows[0].n;

  try {
    const { rows: picked } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id)
      order by c.oracle_id limit 3 offset 1200`);
    if (picked.length < 3) throw new Error("fewer than three cards with a printing on this branch");
    const [X, Y, Z] = picked.map((r) => r.oracle_id);

    await friends.ensureProfile(R, "Rae");
    const f = await friends.ensureProfile(F, "Fin");
    const r = await friends.ensureProfile(R, "Rae");
    const inv = await friends.createInvite(R);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(F, inv.token);
    const pod = await pods.createPod(R, "Dismiss probe");
    if (!pod || !(await pods.addMember(R, pod.id, f.publicId))) throw new Error("pod refused");
    for (const u of [R, F]) if (!(await shareSparesWith(u, pod.id, true))) throw new Error("shareSparesWith refused");
    // Every kind on, a day back, so the reader's own items count.
    await prefs.setFeedKinds(R, FEED_KINDS, new Date(Date.now() - 86_400_000));
    await prefs.setFeedKinds(F, FEED_KINDS, new Date(Date.now() - 86_400_000));

    console.log("\n1. a trade match");
    await add(F, X, 2);
    await setWishlistQuantity(R, X, 1);
    await noticeTradeMatches(R, ENV);
    const [match] = await keysOf(R, "trade-match");
    check("the reader has a trade match on Home", Boolean(match), match);
    const unseenBefore = await read.unseenCount(R, ENV);
    check("... counted unseen", unseenBefore >= 1, `${unseenBefore}`);
    check("... and listed in Waiting on you", (await loadWaitingOnYou(R, ENV, new Date())).some((w) => w.kind === "trade-match"));
    await dismiss(R, match);
    check("dismissed, it leaves Home's feed", !(await keysOf(R, "trade-match")).includes(match));
    check("... the unseen count", (await read.unseenCount(R, ENV)) === unseenBefore - 1, `${await read.unseenCount(R, ENV)}`);
    check("... and Waiting on you", !(await loadWaitingOnYou(R, ENV, new Date())).some((w) => w.kind === "trade-match"));
    await keepCardBack(F, X);
    await noticeTradeMatches(R, ENV);
    await releaseCard(F, X);
    await noticeTradeMatches(R, ENV);
    check("the friend's spare kept back and released, noticed again: still one row", (await rowsOf(R, "trade-match")) === 1, `${await rowsOf(R, "trade-match")}`);
    check("... and it never comes back to Home", (await keysOf(R, "trade-match")).length === 0);
    check("... nor to Waiting on you", !(await loadWaitingOnYou(R, ENV, new Date())).some((w) => w.kind === "trade-match"));
    await dismiss(R, match);
    check("a second ✕ on the same item writes nothing new", (await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_dismissals where user_id = ${R}`)).rows[0].n === 1);

    console.log("\n2. an incoming ask");
    await add(R, Y, 2);
    const asked = await sr.askForSpare(F, r.publicId, Y, ENV);
    check("the friend asks the reader for a spare", asked.ok);
    if (!asked.ok) throw new Error("ask refused");
    check("the reader holds the ask", (await sr.loadIncomingAsks(R, ENV)).some((a) => a.id === asked.id));
    check("... counted waiting", (await sr.waitingAsksCount(R, ENV)) === 1);
    check("... and on Home", (await keysOf(R, "spare-request")).length === 1);
    await dismiss(R, `ask:${asked.id}`);
    check("dismissed, it leaves the reader's asks", !(await sr.loadIncomingAsks(R, ENV)).some((a) => a.id === asked.id));
    check("... the waiting count", (await sr.waitingAsksCount(R, ENV)) === 0);
    check("... and Home", (await keysOf(R, "spare-request")).length === 0);
    const status = (await db.execute<{ status: string }>(sql`select status from spare_requests where id = ${asked.id}`)).rows[0]?.status;
    check("the ask itself stays open for the asker: dismissing answers nothing", status === "open", status);

    console.log("\n3. an ask to a holder with the spare-request kind off");
    await prefs.setFeedKinds(R, FEED_KINDS.filter((k) => k !== "spare-request"), new Date());
    await add(R, Z, 2);
    const quiet = await sr.askForSpare(F, r.publicId, Z, ENV);
    check("the friend asks for another spare", quiet.ok);
    if (!quiet.ok) throw new Error("ask refused");
    const itemFor = async (id: string) => (await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_items
      where user_id = ${R} and kind = 'spare-request' and dedupe_key = ${id}`)).rows[0].n;
    check("... which writes the holder no feed item", (await itemFor(quiet.id)) === 0, `${await itemFor(quiet.id)}`);
    check("... yet Waiting on you lists it", (await sr.loadIncomingAsks(R, ENV)).some((a) => a.id === quiet.id));
    await dismiss(R, `ask:${quiet.id}`);
    check("its ✕ still hides it from the holder's asks", !(await sr.loadIncomingAsks(R, ENV)).some((a) => a.id === quiet.id));
    check("... and from the waiting count", (await sr.waitingAsksCount(R, ENV)) === 0);
    check("... and only the holder can hide it: the asker's ✕ on it writes nothing", await (async () => {
      await dismiss(F, `ask:${quiet.id}`);
      return (await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_dismissals where user_id = ${F}`)).rows[0].n === 0;
    })());

    console.log("\n4. purge");
    await purgeAccount(R, { stripe: () => null });
    check("the reader's purge deletes their dismissals", (await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_dismissals where user_id = ${R}`)).rows[0].n === 0);
  } finally {
    for (const u of [R, F]) {
      try {
        await purgeAccount(u, { stripe: () => null });
      } catch (e) {
        console.error(`cleanup: purge of ${u} failed`, e);
      }
    }
    await db.execute(sql`delete from user_prefs where user_id in (${R}, ${F})`);
    await db.execute(sql`delete from user_data_stamps where user_id in (${R}, ${F})`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from feed_dismissals where user_id in (${R}, ${F}))
        + (select count(*) from spare_requests where asker_user_id in (${R}, ${F}) or holder_user_id in (${R}, ${F}))
        + (select count(*) from feed_items where user_id in (${R}, ${F}) or friend_user_id in (${R}, ${F}))
        + (select count(*) from collection_items where user_id in (${R}, ${F}))
        + (select count(*) from wishlist_items where user_id in (${R}, ${F}))
        + (select count(*) from social_profiles where user_id in (${R}, ${F}))
        + (select count(*) from pods where owner_user_id in (${R}, ${F}))
        as n`);
    check("cleanup: every row this run wrote is gone", Number(left[0]?.n ?? -1) === 0, `${left[0]?.n} rows remain`);
  }
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nprobe:feed-dismiss: all checks passed" : `\nprobe:feed-dismiss: ${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
