// Proves the wishlist backend (scope §2, Hugh's rulings Q7 and Q9, 2026-10-12) against a real database: the
// owner's lines and their GOT state, a friend's read of them through the friendship, and that a stranger,
// a forged id and a former friend read nothing.
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

    // B owns one X (two printings' worth of rows would sum) and one Y.
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${B}, ${X}, 1, 'prb'), (${B}, ${Y}, 1, 'prb')`);
    const before = await stamp(B);
    check("B wants two X", await wishlist.setWishlistQuantity(B, X, 2));
    check("B wants one Y", await wishlist.setWishlistQuantity(B, Y));
    check("a wishlist write moves the owner's stamp", (await stamp(B)) > before);
    check("an unknown card writes nothing", (await wishlist.setWishlistQuantity(B, "00000000-0000-0000-0000-000000000000")) === false);
    check("a quantity of 0 writes nothing", (await wishlist.setWishlistQuantity(B, X, 0)) === false);
    check("a quantity of 100 writes nothing", (await wishlist.setWishlistQuantity(B, X, 100)) === false);

    const own = await wishlist.loadWishlist(B);
    const ownX = own.find((l) => l.oracleId === X);
    const ownY = own.find((l) => l.oracleId === Y);
    check("B's own read: X owned 1 of 2, not got", ownX?.owned === 1 && ownX.quantity === 2 && ownX.got === false, JSON.stringify(ownX));
    check("Y owned 1 of 1, got", ownY?.got === true);

    const seen = await loadFriendWishlist(A, b.publicId);
    check("A, a friend, sees both lines", seen.length === 2, JSON.stringify(seen));
    check("with the wanted count and got, and nothing else", seen.every((l) => Object.keys(l).sort().join() === "got,oracleId,quantity")
      && seen.find((l) => l.oracleId === X)?.got === false && seen.find((l) => l.oracleId === Y)?.got === true);
    check("C, the stranger, sees nothing", (await loadFriendWishlist(C, b.publicId)).length === 0);
    check("a forged public id reads nothing", (await loadFriendWishlist(A, "00000000-0000-0000-0000-000000000000")).length === 0);
    check("a malformed id reads nothing", (await loadFriendWishlist(A, "nope")).length === 0);

    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${B}, ${X}, 1, 'pr2')`);
    check("a second copy, in another printing, makes X got", (await loadFriendWishlist(A, b.publicId)).find((l) => l.oracleId === X)?.got === true);
    check("a got line stays until cleared", (await wishlist.loadWishlist(B)).length === 2);
    check("B clears Y", await wishlist.clearWishlistLine(B, Y));
    check("and it is gone", (await wishlist.loadWishlist(B)).map((l) => l.oracleId).join() === X);
    check("clearing a line that is not there says so", (await wishlist.clearWishlistLine(B, Y)) === false);
    check("changing a quantity rewrites the line", (await wishlist.setWishlistQuantity(B, X, 5))
      && (await wishlist.loadWishlist(B))[0]?.quantity === 5);

    await friends.unfriend(A, b.publicId);
    check("a former friend reads nothing", (await loadFriendWishlist(A, b.publicId)).length === 0);
  } finally {
    const who = sql`(${A}, ${B}, ${C})`;
    await db.execute(sql`delete from wishlist_items where user_id in ${who}`);
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
