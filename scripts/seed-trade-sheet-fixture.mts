// Seeds the audit account's trades in every state the trade sheet draws (friend trades PR 5), through the real
// writers, for the contact sheet and the ui-probe. Four friends, each sharing spares with the reader's pod:
//   Rin  the page friend: Rin's open offer (theirs), and five trades past the offer: accepted, you marked, Rin
//        marked, traded, declined. Nothing of the reader's waits on Rin, so the Trade press shows.
//   Sol  the reader offered, Sol countered (theirCounter); then the reader's own open offer (yours), which holds the
//        cap: Sol's spares sheet row says Offer waiting. That offer carries a card also in Rin's offer (Q9's chip).
//   Tam  Tam's offer whose card Tam no longer has spare (look).
//   Uma  the reader's offer whose own card the reader no longer has (lookYours).
// SCRATCH BRANCH ONLY: it names its target and refuses anything else. A rerun purges the previous run's friends first.
// Rin also wants two of the reader's spares (Wants), and the reader wants one of Rin's. It prints each friend's public id and each trade's id, for the inventory.
// The target is named outright: `.env` wins over an inherited DATABASE_URL (scripts/lib/env.mjs), so the scratch
// branch's URL comes in as SHEET_FIXTURE_DATABASE_URL and replaces it before the database module loads.
//   SHEET_FIXTURE_DATABASE_URL=postgres://... SHEET_FIXTURE_BRANCH=br-... SHEET_FIXTURE_USER=user_... \
//     pnpm tsx scripts/seed-trade-sheet-fixture.mts
import { randomUUID } from "node:crypto";
import "./lib/env.mjs";
import { assertScratchBranch } from "./lib/scratch-branch.mjs";
const target = process.env.SHEET_FIXTURE_DATABASE_URL;
const named = process.env.SHEET_FIXTURE_BRANCH;
const viewer = process.env.SHEET_FIXTURE_USER;
if (!target || !named || !viewer) throw new Error("set SHEET_FIXTURE_DATABASE_URL, SHEET_FIXTURE_BRANCH and SHEET_FIXTURE_USER");
process.env.DATABASE_URL = target;
const { db } = await import("../src/db");
const { sql } = await import("drizzle-orm");
const { rows: where } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
if (where[0]?.b !== named) throw new Error(`database reports ${where[0]?.b}, not ${named}`);
assertScratchBranch(where[0]?.b, "seed-trade-sheet-fixture");
const friends = await import("../src/lib/social/friends");
const pods = await import("../src/lib/social/pods");
const { shareSparesWith, loadFriendSpares } = await import("../src/lib/social/spares");
const { setCommander } = await import("../src/lib/social/commander");
const trades = await import("../src/lib/social/trades");
const { applyCollectionChange } = await import("../src/lib/collection/write");
const { purgeAccount } = await import("../src/lib/account/purge");

const { rows: old } = await db.execute<{ user_id: string }>(sql`select user_id from social_profiles where user_id like 'sheet-fixture-%'`);
for (const o of old) await purgeAccount(o.user_id);
await db.execute(sql`delete from pods where owner_user_id = ${viewer} and name = 'Trade sheet fixture'`);

const printingOf = async (card: string) => {
  const { rows } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
    select p.set_code, p.collector_number, p.scryfall_id from printings p where p.oracle_id = ${card} order by p.scryfall_id limit 1`);
  if (!rows[0]) throw new Error(`no printing of ${card}`);
  return { oracleId: card, setCode: rows[0].set_code, collectorNumber: rows[0].collector_number, scryfallId: rows[0].scryfall_id,
    finish: "nonfoil" as const, condition: null, quantity: 1 };
};
const add = async (u: string, cards: string[]) => {
  const result = await applyCollectionChange(u, { kind: "add", items: await Promise.all(cards.map(printingOf)) }, { id: randomUUID() });
  if (result.status !== "applied") throw new Error(`add refused: ${result.status}`);
};
const must = <T extends { ok: boolean }>(what: string, r: T): T & { ok: true } => {
  if (!r.ok) throw new Error(`${what} refused: ${JSON.stringify(r)}`);
  return r as T & { ok: true };
};

// The friends' cards: ordinary cards with art and a printing that the reader does not own, so each side is its own.
const { rows: theirCards } = await db.execute<{ oracle_id: string }>(sql`
  select c.oracle_id from cards c where c.layout = 'normal' and c.image_uri is not null and c.type_line not like 'Basic%'
    and exists (select 1 from printings p where p.oracle_id = c.oracle_id)
    and not exists (select 1 from collection_items ci where ci.user_id = ${viewer} and ci.oracle_id = c.oracle_id)
  order by c.oracle_id offset 300 limit 16`);
// The reader's candidate cards: owned, with art; the ones spare to a friend are picked once Rin exists.
const { rows: yourCards } = await db.execute<{ oracle_id: string }>(sql`
  select distinct c.oracle_id from collection_items ci join cards c on c.oracle_id = ci.oracle_id
  where ci.user_id = ${viewer} and c.layout = 'normal' and c.image_uri is not null and c.type_line not like 'Basic%'
  order by c.oracle_id offset 200 limit 60`);
if (theirCards.length < 16 || yourCards.length < 12) throw new Error("not enough cards on this branch");
const R = theirCards.map((r) => r.oracle_id);
const { rows: faces } = await db.execute<{ oracle_id: string }>(sql`
  select oracle_id from cards where commander_legal and layout = 'normal' and type_line like 'Legendary Creature%'
    and art_crop_uri is not null order by oracle_id offset 50 limit 3`);

const me = await friends.ensureProfile(viewer, "Hugh");
const pod = await pods.createPod(viewer, "Trade sheet fixture");
if (!pod) throw new Error("createPod refused");
if (!(await shareSparesWith(viewer, pod.id, true))) throw new Error("shareSparesWith refused (reader)");
const tag = Date.now();
const mk = async (name: string, cards: string[], face: string | null) => {
  const id = `sheet-fixture-${name.toLowerCase()}-${tag}`;
  const p = await friends.ensureProfile(id, name);
  const invite = await friends.createInvite(viewer);
  if (!invite.ok) throw new Error("createInvite refused");
  await friends.redeemInvite(id, invite.token);
  if (face) await setCommander(id, face);
  if (!(await pods.addMember(viewer, pod.id, p.publicId))) throw new Error("addMember refused");
  if (!(await shareSparesWith(id, pod.id, true))) throw new Error(`shareSparesWith refused (${name})`);
  await add(id, cards);
  console.log(`${name.toUpperCase()}_PUBLIC_ID=${p.publicId}`);
  return { id, publicId: p.publicId };
};
const rin = await mk("Rin", R.slice(0, 8), faces[0]?.oracle_id ?? null);
const sol = await mk("Sol", R.slice(8, 11), faces[1]?.oracle_id ?? null);
const tam = await mk("Tam", R.slice(11, 14), null);
const uma = await mk("Uma", R.slice(14, 16), faces[2]?.oracle_id ?? null);
// The reader's cards as a friend sees them: only those spare (a deck can hold the rest).
const Y = (await loadFriendSpares(rin.id, yourCards.map((r) => r.oracle_id))).filter((s) => s.friend.publicId === me.publicId && s.spare > 0).map((s) => s.oracleId);
if (Y.length < 12) throw new Error(`only ${Y.length} of the reader's cards are spare`);

const head = async (u: string, tradeId: string) => {
  const { rows } = await db.execute<{ round: number; offered_at: Date }>(sql`
    select t.round, r.offered_at from trades t join trade_rounds r on r.trade_id = t.id and r.round = t.round where t.id = ${tradeId}`);
  if (!rows[0]) throw new Error(`no trade ${tradeId} for ${u}`);
  return { round: rows[0].round, at: new Date(rows[0].offered_at).toISOString() };
};
const out = (k: string, v: string) => console.log(`${k}=${v}`);
const pause = () => new Promise((r) => setTimeout(r, 1100));

// Rin wants two of the reader's spares (the picker's Wants chip and its listed-first line); one is also in Sol's offer.
await db.execute(sql`insert into wishlist_items (user_id, oracle_id) values (${rin.id}, ${Y[6]}), (${rin.id}, ${Y[9]})`);
// The reader wants one of Rin's spares, in no trade (PR 6: the Wanted call-out's You want row and its switch).
await db.execute(sql`insert into wishlist_items (user_id, oracle_id) values (${viewer}, ${R[7]}) on conflict do nothing`);

// Rin: five trades the reader offered and Rin answered, then Rin's own open offer.
const rinPast: [string, "yes" | "no", ("you" | "them")[]][] = [
  ["TRADE_ACCEPTED", "yes", []],
  ["TRADE_YOU_MARKED", "yes", ["you"]],
  ["TRADE_THEM_MARKED", "yes", ["them"]],
  ["TRADE_TRADED", "yes", ["you", "them"]],
  ["TRADE_DECLINED", "no", []],
];
for (const [i, [key, answer, marks]] of rinPast.entries()) {
  const made = must("propose to Rin", await trades.proposeTrade(viewer, rin.publicId, { theirs: [R[i]], yours: [Y[i]] }));
  const h = await head(viewer, made.id);
  must("Rin answers", await trades.answerTrade(rin.id, made.id, h.round, h.at, answer));
  for (const m of marks) must("mark", await trades.markTraded(m === "you" ? viewer : rin.id, made.id));
  out(key, made.id);
  await pause();
}
const rinOffer = must("Rin proposes", await trades.proposeTrade(rin.id, me.publicId, { theirs: [Y[6], Y[7]], yours: [R[5], R[6]] }));
out("TRADE_THEIRS", rinOffer.id);
await pause();

// Sol: the reader's offer, Sol's counter; then the reader's own open offer, holding the cap, with Y[6] (also in Rin's offer).
const solFirst = must("propose to Sol", await trades.proposeTrade(viewer, sol.publicId, { theirs: [R[8]], yours: [Y[8]] }));
const sh = await head(viewer, solFirst.id);
must("Sol counters", await trades.counterTrade(sol.id, solFirst.id, sh.round, sh.at, { theirs: [Y[8], Y[9]], yours: [R[8], R[9]] }));
out("TRADE_THEIR_COUNTER", solFirst.id);
await pause();
const solHeld = must("propose to Sol again", await trades.proposeTrade(viewer, sol.publicId, { theirs: [R[10]], yours: [Y[6]] }));
out("TRADE_YOURS", solHeld.id);
await pause();

// Tam: Tam's offer, then Tam's card leaves Tam's collection (look).
const tamOffer = must("Tam proposes", await trades.proposeTrade(tam.id, me.publicId, { theirs: [Y[10]], yours: [R[11]] }));
await db.execute(sql`delete from collection_items where user_id = ${tam.id} and oracle_id = ${R[11]}`);
out("TRADE_LOOK", tamOffer.id);
await pause();

// Uma: the reader's offer, then the reader's card leaves the reader's collection (lookYours).
const umaOffer = must("propose to Uma", await trades.proposeTrade(viewer, uma.publicId, { theirs: [R[14]], yours: [Y[11]] }));
await db.execute(sql`delete from collection_items where user_id = ${viewer} and oracle_id = ${Y[11]}`);
out("TRADE_LOOK_YOURS", umaOffer.id);
console.log("seeded the trade sheet fixture");
process.exit(0);
