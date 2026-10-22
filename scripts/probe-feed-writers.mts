// Proves the news feed's three writers (menu and Home PR 5) against a REAL schema and the real catalog:
//   1. PRICE DROP (`noticePriceDrops`, `src/lib/feed/price-drop.ts`): a want records its price at add through the real
//      wishlist write; a line whose price fell is told once (card and ISO week), `price_noticed_at` set; a second run
//      tells nothing; a kind that is off is never told; a line with no baseline is backfilled with today's cheapest.
//   2. COMBO (`src/lib/feed/combo-writer.ts`, hooked into `applyCollectionChange` and `replaceCollection`): a real
//      two-card variant, card A held first, card B added through the real collection write, is told once; a first
//      fill of an empty collection tells nothing; the replace path tells too; a kind that is off tells nothing.
//   3. TRADE MATCH (`noticeTradeMatches`, `src/lib/social/trade-match.ts`): a friend sharing spares of a wished card is
//      told once, a repeat writes nothing, and the feed names the friend by public id.
//
// It WRITES, so it fails closed on its target, as `probe:feed-store` does: the URL comes from `FEED_PROBE_URL` (never
// `DATABASE_URL`, which `scripts/lib/env.mjs` would override from `.env`), and `FEED_PROBE_BRANCH` (default the feed
// lane's scratch branch) must equal the `neon.branch_id` the database reports before any write. Staging, production
// and local-dev are refused by name. Its accounts are made-up per-run ids, purged in a finally. The price job it runs
// reads every reader on the branch whose price-drop kind is on: a scratch branch's other rows are the job's to read.
//
//   FEED_PROBE_URL="$(sed -n 's/^DATABASE_URL=//p' .env.local)" pnpm probe:feed-writers

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BRANCH = process.env.FEED_PROBE_BRANCH ?? "br-holy-frog-a6613xf6";
const url = process.env.FEED_PROBE_URL;
if (!url) throw new Error("probe:feed-writers: set FEED_PROBE_URL");
if (PROTECTED.has(BRANCH)) throw new Error(`probe:feed-writers: ${BRANCH} is staging, production or local-dev; it writes`);
// Before any app module loads: `src/db` reads it at import time.
process.env.DATABASE_URL = url;

import { randomUUID } from "node:crypto";

const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const U = `probe-fw-u-${run}`; // the reader
const F = `probe-fw-f-${run}`; // the friend
const ENV = {
  ...process.env, HOME_FEED_ENABLED: "true", SOCIAL_FRIENDS_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true",
} as NodeJS.ProcessEnv;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`probe:feed-writers: database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  console.log(`target ${BRANCH}, reader ${U}, friend ${F}`);

  const prefs = await import("../src/lib/feed/prefs");
  const { noticePriceDrops } = await import("../src/lib/feed/price-drop");
  const { priceDropKey } = await import("../src/lib/feed/price-drop-rule");
  const { cheapestNow, loadPrices } = await import("../src/lib/decks/price-query");
  const { wantOneMore } = await import("../src/lib/wishlist/wishlist");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { replaceCollection } = await import("../src/lib/collection/import");
  const { isInfiniteOrGameEnding } = await import("../src/lib/spellbook/combo-features");
  const { noticeTradeMatches, forgetTradeMatchFingerprints } = await import("../src/lib/social/trade-match");
  const read = await import("../src/lib/feed/read");
  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { shareSparesWith } = await import("../src/lib/social/spares");
  const { purgeAccount } = await import("../src/lib/account/purge");

  type Item = { kind: string; dedupe_key: string; oracle_id: string | null; variant_id: string | null; friend_user_id: string | null; data: Record<string, unknown> };
  const items = async (u: string, kind: string) =>
    (await db.execute<Item>(sql`select kind, dedupe_key, oracle_id, variant_id, friend_user_id, data from feed_items
      where user_id = ${u} and kind = ${kind} order by created_at`)).rows;
  const line = async (u: string, card: string) =>
    (await db.execute<{ at_add: number | null; noticed: string | null }>(sql`select price_at_add_cents as at_add, price_noticed_at::text as noticed
      from wishlist_items where user_id = ${u} and oracle_id = ${card}`)).rows[0];
  const printingOf = async (card: string) => {
    const { rows } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
      select p.set_code, p.collector_number, p.scryfall_id from printings p where p.oracle_id = ${card}
      order by p.scryfall_id limit 1`);
    if (!rows[0]) throw new Error(`no printing of ${card}`);
    return { oracleId: card, setCode: rows[0].set_code, collectorNumber: rows[0].collector_number, scryfallId: rows[0].scryfall_id,
      finish: "nonfoil" as const, condition: null, quantity: 1 };
  };
  const add = async (u: string, cards: string[], quantity = 1) => {
    const result = await applyCollectionChange(u, { kind: "add", items: await Promise.all(cards.map(async (c) => ({ ...(await printingOf(c)), quantity }))) },
      { id: randomUUID(), env: ENV });
    if (result.status !== "applied") throw new Error(`add refused: ${result.status}`);
  };

  try {
    // ---- 1. price drop
    console.log("\n1. price drop");
    await prefs.setFeedKinds(U, ["price-drop", "trade-match", "combo"]);
    // Cards priced in today's feed, live, non-foil, at $4 or more: a real figure to fall from.
    const { rows: priced } = await db.execute<{ oracle_id: string }>(sql`
      with newest as (select max(as_of) as as_of from printing_prices)
      select distinct p.oracle_id from printings p join printing_prices pp on pp.scryfall_id = p.scryfall_id
      where pp.as_of = (select as_of from newest) and pp.price_cents >= 400
      order by p.oracle_id limit 4`);
    if (priced.length < 4) throw new Error("fewer than four live-priced cards on this branch");
    const [P1, P2, P3, P4] = priced.map((r) => r.oracle_id);
    const prices = await loadPrices([P1, P2, P3, P4]);
    const today = (c: string) => cheapestNow(prices, c)!;

    const want = await wantOneMore(U, P1);
    check("the real wishlist write puts the card on the list", want?.status === "wanted");
    let l1 = await line(U, P1);
    check("... with its price at add = today's cheapest, as the buy tag draws it", l1?.at_add === today(P1), `${l1?.at_add} vs ${today(P1)}`);
    await wantOneMore(U, P1);
    check("a second want (quantity up) keeps the price at add", (await line(U, P1))?.at_add === today(P1));

    // The price was higher when wishlisted: double, so today's is at most 50% of it.
    await db.execute(sql`update wishlist_items set price_at_add_cents = ${today(P1) * 2} where user_id = ${U} and oracle_id = ${P1}`);
    // A line older than the column: no baseline.
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity) values (${U}, ${P2}, 1)`);
    const now = new Date();
    let r = await noticePriceDrops(ENV, now);
    console.log(`  run 1: ${JSON.stringify(r)}`);
    let drops = await items(U, "price-drop");
    check("a fallen price is told once", drops.length === 1 && drops[0].oracle_id === P1, JSON.stringify(drops));
    check("... keyed on the card and the ISO week", drops[0]?.dedupe_key === priceDropKey(P1, now));
    check("... carrying the price at add and today's", drops[0]?.data.fromCents === today(P1) * 2 && drops[0]?.data.toCents === today(P1), JSON.stringify(drops[0]?.data));
    l1 = await line(U, P1);
    check("... and the line's price_noticed_at is set", l1?.noticed !== null && l1?.noticed !== undefined);
    check("a line with no baseline is backfilled with today's cheapest", (await line(U, P2))?.at_add === today(P2), String((await line(U, P2))?.at_add));
    check("... and is not told on the run that filled it", !drops.some((d) => d.oracle_id === P2));

    r = await noticePriceDrops(ENV, new Date(now.getTime() + 60_000));
    check("a second run the same week tells nothing", (await items(U, "price-drop")).length === 1, JSON.stringify(r));
    // Eight days on, still fallen: the once-a-week rule lets it through again, under next week's key.
    await db.execute(sql`update wishlist_items set price_noticed_at = price_noticed_at - interval '8 days' where user_id = ${U} and oracle_id = ${P1}`);
    const nextWeek = new Date(now.getTime() + 8 * 86_400_000);
    await noticePriceDrops(ENV, nextWeek);
    drops = await items(U, "price-drop");
    check("a week later, still fallen: told again under that week's key", drops.length === 2 && drops[1].dedupe_key === priceDropKey(P1, nextWeek));

    // The kind off: a fallen line is not told and not marked.
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity, price_at_add_cents) values (${U}, ${P3}, 1, ${today(P3) + 500})`);
    await prefs.setFeedKinds(U, ["trade-match", "combo"]);
    await noticePriceDrops(ENV, now);
    check("price-drop off: a fallen line is not told", !(await items(U, "price-drop")).some((d) => d.oracle_id === P3));
    check("... nor marked noticed", (await line(U, P3))?.noticed === null);
    await prefs.setFeedKinds(U, ["price-drop", "trade-match", "combo"]);
    await noticePriceDrops({ ...ENV, SOCIAL_WISHLIST_ENABLED: "off" }, now);
    check("the wishlist switched off for the reader: not told", !(await items(U, "price-drop")).some((d) => d.oracle_id === P3));
    await noticePriceDrops(ENV, now);
    check("both on again: told ($5 under)", (await items(U, "price-drop")).some((d) => d.oracle_id === P3));
    // A line the collection now reaches is collected: never told.
    await db.execute(sql`insert into wishlist_items (user_id, oracle_id, quantity, price_at_add_cents) values (${U}, ${P4}, 1, ${today(P4) * 3})`);
    await add(U, [P4]);
    await noticePriceDrops(ENV, now);
    check("a line the collection reached is not told", !(await items(U, "price-drop")).some((d) => d.oracle_id === P4));

    const loaded = await read.loadFeed(U, ENV, nextWeek);
    check("the feed reads the price drops", loaded.filter((i) => i.kind === "price-drop").length >= 1);

    // ---- 2. combo
    console.log("\n2. combo");
    const { rows: variants } = await db.execute<{ variant_id: string; produces: string[]; ids: string[] }>(sql`
      select v.variant_id, v.produces, array_agg(vc.oracle_id::text order by vc.oracle_id) as ids
      from spellbook_variants v join spellbook_variant_cards vc on vc.variant_id = v.variant_id
      where v.card_count = 2 and cardinality(v.requires_template_ids) = 0
        and exists (select 1 from printings p where p.oracle_id = vc.oracle_id)
      group by v.variant_id having count(*) = 2
      order by v.popularity desc nulls last, v.variant_id limit 200`);
    const counted = variants.filter((v) => isInfiniteOrGameEnding(v.produces));
    // Three variants with no card in common, and none of P1..P4.
    const used = new Set([P1, P2, P3, P4]);
    const picks: typeof counted = [];
    for (const v of counted) {
      if (v.ids.some((id) => used.has(id))) continue;
      v.ids.forEach((id) => used.add(id));
      picks.push(v);
      if (picks.length === 3) break;
    }
    if (picks.length < 3) throw new Error("fewer than three disjoint counted two-card variants on this branch");
    const [V1, V2, V3] = picks;
    console.log(`  variants ${V1.variant_id}, ${V2.variant_id}, ${V3.variant_id}`);
    // U already holds P4 (above), so the collection is not empty: card A arrives into a collection with content.
    await add(U, [V1.ids[0]]);
    check("card A alone completes nothing", (await items(U, "combo")).length === 0);
    await add(U, [V1.ids[1]]);
    let combos = await items(U, "combo");
    check("card B through the real collection write tells the combo", combos.length === 1 && combos[0].variant_id === V1.variant_id, JSON.stringify(combos));
    check("... keyed on the variant id, naming the card the write added",
      combos[0]?.dedupe_key === V1.variant_id && combos[0]?.oracle_id === V1.ids[1]
        && JSON.stringify((combos[0]?.data as { added?: string[] }).added) === JSON.stringify([V1.ids[1]]), JSON.stringify(combos[0]?.data));
    await add(U, [V1.ids[1]]);
    check("another copy of B tells nothing more", (await items(U, "combo")).length === 1);

    await prefs.setFeedKinds(U, ["price-drop", "trade-match"]);
    await add(U, V2.ids);
    check("combo off: completing a variant tells nothing", (await items(U, "combo")).length === 1);
    await prefs.setFeedKinds(U, ["price-drop", "trade-match", "combo"]);

    // The replace path: the whole collection again, plus V3's two cards.
    const { rows: holdings } = await db.execute<{ oracle_id: string }>(sql`select distinct oracle_id from collection_items where user_id = ${U}`);
    const all = [...holdings.map((h) => h.oracle_id), ...V3.ids];
    await replaceCollection(U, await Promise.all(all.map(printingOf)));
    combos = await items(U, "combo");
    check("a replace that adds a pair tells it", combos.some((c) => c.variant_id === V3.variant_id), JSON.stringify(combos.map((c) => c.variant_id)));
    check("... and not the pair the replace kept (V2, held before it)", !combos.some((c) => c.variant_id === V2.variant_id));

    // A first fill of an empty collection is the collection, not news: F holds nothing yet.
    await prefs.setFeedKinds(F, ["combo"]);
    await add(F, V1.ids, 2);
    check("a first fill of an empty collection tells nothing", (await items(F, "combo")).length === 0);

    // ---- 3. trade match
    console.log("\n3. trade match");
    await friends.ensureProfile(F, "Fay");
    const u = await friends.ensureProfile(U, "Una");
    const inv = await friends.createInvite(U);
    if (!inv.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(F, inv.token);
    const pod = await pods.createPod(F, "Writers probe");
    if (!pod) throw new Error("createPod refused");
    if (!(await pods.addMember(F, pod.id, u.publicId))) throw new Error("addMember refused");
    if (!(await shareSparesWith(F, pod.id, true))) throw new Error("shareSparesWith refused");
    // F holds two of V1's first card and no deck asks for them: two spares. U wants it (U holds one, wants two).
    const W = V1.ids[0];
    const wanted = await wantOneMore(U, W);
    check("U wishes for a card F has spares of", wanted?.status === "wanted");

    check("friends off: nothing is noticed", (await noticeTradeMatches(U, { ...ENV, SOCIAL_FRIENDS_ENABLED: "" })) === 0);
    const n1 = await noticeTradeMatches(U, ENV);
    let matches = await items(U, "trade-match");
    check("the match is noticed once", n1 === 1 && matches.length === 1 && matches[0].oracle_id === W && matches[0].friend_user_id === F, JSON.stringify(matches));
    check("... keyed on the card and the friend", matches[0]?.dedupe_key === `${W}:${F}`);
    check("a repeat with nothing changed writes nothing", (await noticeTradeMatches(U, ENV)) === 0);
    forgetTradeMatchFingerprints();
    check("a cold instance's full read writes nothing new either", (await noticeTradeMatches(U, ENV)) === 0 && (await items(U, "trade-match")).length === 1);
    const feed = await read.loadFeed(U, ENV, new Date());
    const tm = feed.find((i) => i.kind === "trade-match");
    check("the feed reads it, naming F by public id, never the Clerk id",
      tm !== undefined && "friend" in tm && tm.friend?.displayName === "Fay" && !JSON.stringify(tm).includes(F));
    await prefs.setFeedKinds(U, ["price-drop", "combo"]);
    forgetTradeMatchFingerprints();
    check("trade-match off: nothing is read or written", (await noticeTradeMatches(U, ENV)) === 0);
    matches = await items(U, "trade-match");
    check("... and the stored match stands untouched", matches.length === 1);
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
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from feed_items where user_id in (${U}, ${F}) or friend_user_id in (${U}, ${F}))
        + (select count(*) from user_prefs where user_id in (${U}, ${F}))
        + (select count(*) from wishlist_items where user_id in (${U}, ${F}))
        + (select count(*) from collection_items where user_id in (${U}, ${F}))
        + (select count(*) from collection_history where user_id in (${U}, ${F}))
        + (select count(*) from social_profiles where user_id in (${U}, ${F}))
        + (select count(*) from friend_links where user_id in (${U}, ${F}) or friend_user_id in (${U}, ${F}))
        + (select count(*) from pods where owner_user_id in (${U}, ${F}))
        as n`);
    console.log(`\ncleanup: ${Number(left[0]?.n ?? -1) === 0 ? "every row this run wrote is gone" : `${left[0]?.n} rows remain`}`);
  }
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nprobe:feed-writers: all checks passed" : `\nprobe:feed-writers: ${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
