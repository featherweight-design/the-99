// Proves the wishlist backend (scope §2, Hugh's ruling Q7, 2026-10-12; Social R2) against a real database: the
// owner's lines, the tiles and card details' want, a friend's read of them through the friendship (and that a
// stranger, a forged id and a former friend read nothing), and COLLECTED (G5): a read hides a line the collection
// reaches and never deletes it, while a ledger write, a Replace and a want lowered to what is held each delete it in
// their own transaction and keep it for the one-time strip, which its ✕ forgets; a want SET at or below what is held
// leaves no line and is not kept for the strip.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. Its three accounts are made-up ids, and it removes
// every row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:wishlist
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const A = `probe_wish_a_${run}`; // the friend who looks
const B = `probe_wish_b_${run}`; // the owner
const C = `probe_wish_c_${run}`; // a stranger

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:wishlist: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:wishlist: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:wishlist: database reports ${rows[0]?.b}, not ${named}`);

  const friends = await import("../src/lib/social/friends");
  const wishlist = await import("../src/lib/wishlist/wishlist");
  const collected = await import("../src/lib/wishlist/collected");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { replaceCollection } = await import("../src/lib/collection/import");
  const { randomUUID } = await import("node:crypto");
  const { loadFriendWishlist } = await import("../src/lib/social/wishlist");
  const stamp = async (u: string) => {
    const { rows: r } = await db.execute<{ s: number | null }>(sql`select stamp::int as s from user_data_stamps where user_id = ${u}`);
    return r[0]?.s ?? 0;
  };

  try {
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line like '%Creature%' order by oracle_id limit 2`);
    const [X, Y] = picks.map((r) => r.oracle_id);
    await friends.ensureProfile(A, "Ann");
    const b = await friends.ensureProfile(B, "Ben");
    await friends.ensureProfile(C, "Cal");
    const t = await friends.createInvite(B);
    if (!t.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(A, t.token);

    // B owns one X; Y not at all.
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${B}, ${X}, 1, 'prb')`);
    const before = await stamp(B);
    check("B wants two X", (await wishlist.setWishlistQuantity(B, X, 2))?.status === "wanted");
    check("B wants one Y", (await wishlist.setWishlistQuantity(B, Y, 1))?.status === "wanted");
    check("a wishlist write moves the owner's stamp", (await stamp(B)) > before);
    check("an unknown card writes nothing", (await wishlist.setWishlistQuantity(B, "00000000-0000-0000-0000-000000000000", 1)) === null);
    check("a quantity of 0 writes nothing", (await wishlist.setWishlistQuantity(B, X, 0)) === null);
    check("a quantity of 100 writes nothing", (await wishlist.setWishlistQuantity(B, X, 100)) === null);

    const own = await wishlist.loadWishlist(B);
    const ownX = own.find((l) => l.oracleId === X);
    check("B's own read: X owned 1 of 2, and Y", ownX?.owned === 1 && ownX.quantity === 2 && own.length === 2, JSON.stringify(own));

    const seen = await loadFriendWishlist(A, b.publicId);
    check("A, a friend, sees both lines", seen.length === 2, JSON.stringify(seen));
    check("with the card and the wanted count, and no owned count or got",
      seen.every((l) => Object.keys(l).sort().join() === "backImageUri,imageUri,layout,name,oracleId,quantity" && l.name.length > 0));
    check("C, the stranger, sees nothing", (await loadFriendWishlist(C, b.publicId)).length === 0);
    check("a forged public id reads nothing", (await loadFriendWishlist(A, "00000000-0000-0000-0000-000000000000")).length === 0);
    check("a malformed id reads nothing", (await loadFriendWishlist(A, "nope")).length === 0);

    // The tiles (G1) and card details' want.
    const { tiles, newestAsOf } = await wishlist.loadWishlistTiles(B);
    const tileX = tiles.find((t) => t.oracleId === X);
    const { rows: [cardX] } = await db.execute<{ name: string; image_uri: string | null }>(sql`select name, image_uri from cards where oracle_id = ${X}`);
    check("a tile carries the catalog's name and full card image", tileX?.name === cardX.name && tileX.imageUri === cardX.image_uri && tiles.length === 2, JSON.stringify(tileX));
    check("and the price read's figure, or null, with that read's newest as_of", tiles.every((t) => t.price === null || t.price.asOf instanceof Date)
      && (tiles.every((t) => t.price === null) || newestAsOf instanceof Date));
    check("card details reads X's want", (await wishlist.loadWishlistWant(B, X)) === 2);
    check("and none for a card not on the list", (await wishlist.loadWishlistWant(B, "00000000-0000-0000-0000-000000000000")) === null);

    // G5: a copy written around the chokepoints (straight into the table) is HIDDEN by every read, never deleted.
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${B}, ${Y}, 1, 'prb')`);
    const lineCount = async () => Number((await db.execute<{ n: number }>(sql`select count(*)::int as n from wishlist_items where user_id = ${B}`)).rows[0].n);
    check("a read leaves out Y, which the collection now reaches", (await wishlist.loadWishlist(B)).map((l) => l.oracleId).join() === X);
    check("and so does a friend's read (R2 PR 6: no got, a collected line is gone)",
      (await loadFriendWishlist(A, b.publicId)).map((l) => l.oracleId).join() === X);
    check("and so does card details", (await wishlist.loadWishlistWant(B, Y)) === null);
    check("but the read deleted nothing", (await lineCount()) === 2);

    // A ledger write that reaches the want: previewed (rolled back), then for real.
    const add = (oracleId: string, set: string) => ({ kind: "add" as const, items: [{ oracleId, setCode: set, condition: null, quantity: 1 }] });
    await applyCollectionChange(B, add(X, "pr2"), { id: randomUUID(), env: process.env, dryRun: true });
    check("a previewed add that would reach X's want leaves both lines", (await lineCount()) === 2);
    await applyCollectionChange(B, add(X, "pr2"), { id: randomUUID(), env: process.env });
    check("the add that reaches X's want deletes the line, and the sweep takes Y with it", (await lineCount()) === 0);
    const notices = await collected.loadCollectedNotices(B);
    check("both are kept for the strip, by name, with the want they reached",
      notices.length === 2 && notices.find((n) => n.oracleId === X)?.quantity === 2 && notices.every((n) => n.name.length > 0), JSON.stringify(notices));
    check("a friend no longer sees them", (await loadFriendWishlist(A, b.publicId)).length === 0);

    // A notice the strip never drew, dated EARLIER than what it did draw (a write that started first and committed
    // last): the ✕ must leave it.
    const { rows: [late] } = await db.execute<{ oracle_id: string }>(sql`select oracle_id from cards where oracle_id not in (${X}, ${Y}) order by oracle_id limit 1`);
    await db.execute(sql`insert into wishlist_collected (user_id, oracle_id, quantity, collected_at) values (${B}, ${late.oracle_id}, 1, now() - interval '1 hour')`);
    check("the strip's ✕ forgets exactly what it drew", (await collected.dismissCollected(B, notices)) === 2
      && (await collected.loadCollectedNotices(B)).map((n) => n.oracleId).join() === late.oracle_id);
    await collected.dismissCollected(B, await collected.loadCollectedNotices(B));
    check("and nothing is left once that one is drawn and dismissed too", (await collected.loadCollectedNotices(B)).length === 0);

    // The want write itself: re-wanted above what is held, then lowered to it.
    check("wanting X again, five, stands", (await wishlist.setWishlistQuantity(B, X, 5))?.status === "wanted"
      && (await wishlist.loadWishlist(B))[0]?.quantity === 5);
    // A want is copies in all: a set at or below what is held cannot take an unmet line off (`wantFloor`).
    const floored = await wishlist.setWishlistQuantity(B, X, 2);
    check("lowering it to the two held stops at one more, and the line stays", floored?.status === "wanted"
      && floored.quantity === 3 && floored.held === 2 && (await wishlist.loadWishlist(B))[0]?.quantity === 3);
    check("Remove is the way off the list", await wishlist.clearWishlistLine(B, X) && (await lineCount()) === 0);
    check("and nothing goes on the strip: the player did that themselves", (await collected.loadCollectedNotices(B)).length === 0);
    check("a first want of what is already held writes no line either", (await wishlist.setWishlistQuantity(B, X, 1))?.status === "held"
      && (await lineCount()) === 0 && (await collected.loadCollectedNotices(B)).length === 0);

    // An upload's Replace reaches a want too.
    check("B wants two Y again, more than the one held", (await wishlist.setWishlistQuantity(B, Y, 2))?.status === "wanted");
    await replaceCollection(B, [
      { oracleId: X, setCode: "prb", condition: null, quantity: 1 },
      { oracleId: Y, setCode: "prb", condition: null, quantity: 2 },
    ]);
    check("a Replace that reaches Y's want collects it", (await lineCount()) === 0
      && (await collected.loadCollectedNotices(B)).some((n) => n.oracleId === Y && n.quantity === 2));

    const shown = await collected.loadCollectedNotices(B);
    await collected.dismissCollected(B, shown);
    check("B clears a line", (await wishlist.setWishlistQuantity(B, X, 9))?.status === "wanted" && await wishlist.clearWishlistLine(B, X));
    check("clearing a line that is not there says so", (await wishlist.clearWishlistLine(B, X)) === false);
    check("a cleared line is not collected", (await collected.loadCollectedNotices(B)).length === 0);

    // Add to wishlist's first press (G4): one more than held, so the line lands wanted, never collected.
    const more = await wishlist.wantOneMore(B, X);
    check("Add wants one more than the one X held", more?.status === "wanted" && more.quantity === 2 && more.held === 1, JSON.stringify(more));
    check("and the line stands at that want", (await wishlist.loadWishlistWant(B, X)) === 2);
    check("an unknown card writes nothing", (await wishlist.wantOneMore(B, "00000000-0000-0000-0000-000000000000")) === null);
    await replaceCollection(B, [
      { oracleId: X, setCode: "prb", condition: null, quantity: 99 },
      { oracleId: Y, setCode: "prb", condition: null, quantity: 2 },
    ]);
    await collected.dismissCollected(B, await collected.loadCollectedNotices(B));
    const capped = await wishlist.wantOneMore(B, X);
    check("holding 99, Add is answered held and writes no line", capped?.status === "held" && capped.quantity === 99
      && (await wishlist.loadWishlistWant(B, X)) === null, JSON.stringify(capped));
    check("and puts nothing on the strip", (await collected.loadCollectedNotices(B)).length === 0);

    // Something for a former friend to NOT see: without a standing line the read below is empty whatever unfriend did.
    check("B wants nine Y", (await wishlist.setWishlistQuantity(B, Y, 9))?.status === "wanted");
    check("which A, still a friend, sees", (await loadFriendWishlist(A, b.publicId)).length === 1);
    await friends.unfriend(A, b.publicId);
    check("a former friend reads nothing", (await loadFriendWishlist(A, b.publicId)).length === 0);
  } finally {
    const who = sql`(${A}, ${B}, ${C})`;
    await db.execute(sql`delete from wishlist_items where user_id in ${who}`);
    await db.execute(sql`delete from wishlist_collected where user_id in ${who}`);
    await db.execute(sql`delete from collection_history where user_id in ${who}`);
    await db.execute(sql`delete from commander_scores where user_id in ${who}`);
    await db.execute(sql`delete from collection_items where user_id in ${who}`);
    await db.execute(sql`delete from friend_links where user_id in ${who} or friend_user_id in ${who}`);
    await db.execute(sql`delete from friend_invites where inviter_user_id in ${who}`);
    await db.execute(sql`delete from social_profiles where user_id in ${who}`);
    await db.execute(sql`delete from user_data_stamps where user_id in ${who}`);
  }
  console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
