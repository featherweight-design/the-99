// Proves Settings' Spares against a real database (menu and Home plan PR 3, handoff G3): that the friend spares
// read applies each GRANTOR's own `user_prefs.spare_min` and `spare_keep`, never the viewer's and never another
// friend's, that a keep-back write moves the keeper's data stamp alone, and that Keep a card back's search
// answers only the reader's own cards. The unit tests pin the rule (`isOffered`) and the emitted SQL; this proves
// the ANSWERS through `loadFriendSpares`, the one read the stand-ins modal, a friend's page and the feed share.
//
// It WRITES, so it fails closed on its target. The target is NAMED, never `.env`'s `DATABASE_URL` (env.mjs would
// put local-dev back over any prefix): `SPARES_PROBE_URL` is the database and `PROBE_DB_BRANCH` the Neon branch it
// must report, checked through the app's own `db` before the first write, and never staging, production or
// local-dev. Its accounts are per-run made-up ids, and every row it wrote is removed by those ids in a finally.
//
//   SPARES_PROBE_URL=postgres://… PROBE_DB_BRANCH=br-… pnpm probe:spare-settings
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const V = `probe_spareset_v_${run}`; // the viewer
const F = `probe_spareset_f_${run}`; // the friend whose settings move
const G = `probe_spareset_g_${run}`; // a second friend on defaults

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const url = process.env.SPARES_PROBE_URL;
  const named = process.env.PROBE_DB_BRANCH;
  if (!url || !named) throw new Error("probe:spare-settings: set SPARES_PROBE_URL and PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:spare-settings: ${named} is staging, production or local-dev; it writes`);
  // After env.mjs has run (it overrides DATABASE_URL from .env) and before `src/db` binds its pool to it.
  process.env.DATABASE_URL = url;
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:spare-settings: database reports ${rows[0]?.b}, not ${named}`);
  console.log(`branch ${named}`);

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const spares = await import("../src/lib/social/spares");
  const settings = await import("../src/lib/social/spare-settings");
  const stamp = async (u: string) => {
    const { rows: r } = await db.execute<{ s: number | null }>(sql`select stamp::int as s from user_data_stamps where user_id = ${u}`);
    return r[0]?.s ?? 0;
  };
  const befriend = async (a: string, b: string) => {
    const t = await friends.createInvite(a);
    if (!t.ok) throw new Error("createInvite refused");
    const r = await friends.redeemInvite(b, t.token);
    if (!r.ok) throw new Error("redeemInvite refused");
  };

  try {
    await friends.ensureProfile(V, "Vera");
    const f = await friends.ensureProfile(F, "Finn");
    const g = await friends.ensureProfile(G, "Gail");
    await befriend(V, F);
    await befriend(V, G);
    const pod = await pods.createPod(V, "Probe night");
    if (!pod) throw new Error("createPod refused");
    if (!(await pods.addMember(V, pod.id, f.publicId)) || !(await pods.addMember(V, pod.id, g.publicId))) throw new Error("addMember refused");
    if (!(await spares.shareSparesWith(F, pod.id, true)) || !(await spares.shareSparesWith(G, pod.id, true))) throw new Error("shareSparesWith refused");

    // Three distinct, plainly named nonbasic cards: X (3 spare), Y (1 spare), Z (the viewer's own).
    const { rows: picks } = await db.execute<{ oracle_id: string; name: string }>(sql`
      select oracle_id, name from cards
      where type_line not like 'Basic%' and type_line like '%Creature%' and name ~ '^[A-Za-z]{5,}( [A-Za-z]+)*$'
      order by oracle_id limit 3`);
    if (picks.length < 3) throw new Error("the catalog has too few cards to pick from");
    const [X, Y, Z] = picks.map((r) => r.oracle_id);
    const [xName] = picks.map((r) => r.name);
    // No decks, so every copy is spare: F and G each hold 3 of X and 1 of Y; V holds 2 of Z and 2 of X (a count no friend holds).
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values
      (${F}, ${X}, 3, 'prb'), (${F}, ${Y}, 1, 'prb'), (${G}, ${X}, 3, 'prb'), (${G}, ${Y}, 1, 'prb'),
      (${V}, ${Z}, 2, 'prb'), (${V}, ${X}, 2, 'prb')`);

    const offered = async (who: string) =>
      (await spares.loadFriendSpares(V, [X, Y, Z]))
        .filter((r) => r.friend.publicId === who)
        .map((r) => `${r.oracleId === X ? "X" : r.oracleId === Y ? "Y" : "Z"}${r.spare}`)
        .sort()
        .join();

    // 1. Defaults: no prefs row, then a row holding 1.
    const { rows: noRow } = await db.execute<{ n: number }>(sql`select count(*)::int as n from user_prefs where user_id = ${F}`);
    check("F starts with no user_prefs row", noRow[0].n === 0);
    check("1a. no prefs row: both of F's cards offered", (await offered(f.publicId)) === "X3,Y1", await offered(f.publicId));
    check("setSpareMin(F, 1) writes", await settings.setSpareMin(F, 1));
    check("1b. a row holding 1: both still offered", (await offered(f.publicId)) === "X3,Y1", await offered(f.publicId));

    // 2. Thresholds.
    await settings.setSpareMin(F, 3);
    check("2a. spare_min 3: only the 3-spare card", (await offered(f.publicId)) === "X3", await offered(f.publicId));
    await settings.setSpareMin(F, 4);
    check("2b. spare_min 4: nothing", (await offered(f.publicId)) === "", await offered(f.publicId));

    // 3. Keep back, at min 1. Check 6 rides on the same write: F's stamp moves, V's does not.
    await settings.setSpareMin(F, 1);
    const [fBefore, vBefore, gBefore] = [await stamp(F), await stamp(V), await stamp(G)];
    check("keepCardBack(F, X) writes", await settings.keepCardBack(F, X));
    const [fAfter, vAfter, gAfter] = [await stamp(F), await stamp(V), await stamp(G)];
    check("3. X kept back at min 1: only the 1-spare card", (await offered(f.publicId)) === "Y1", await offered(f.publicId));

    // 4. G on defaults sees none of F's settings.
    await settings.setSpareMin(F, 3); // F now offers nothing: X kept, Y under 3.
    check("F under min 3 with X kept offers nothing", (await offered(f.publicId)) === "", await offered(f.publicId));
    check("4. G, on defaults, still offers both", (await offered(g.publicId)) === "X3,Y1", await offered(g.publicId));

    // 5. The viewer's own settings never filter a friend's offers.
    await settings.setSpareMin(V, 9);
    await settings.keepCardBack(V, Y);
    check("5. V's own min 9 and keep on Y leave G's offers whole", (await offered(g.publicId)) === "X3,Y1", await offered(g.publicId));
    check("5b. and F's offers are still F's own answer", (await offered(f.publicId)) === "", await offered(f.publicId));

    // 6. The keep-back write moved the keeper's stamp alone.
    check("6. F's keep moved F's data stamp", fAfter > fBefore, `${fBefore} -> ${fAfter}`);
    check("6b. and not the viewer's or the other friend's", vAfter === vBefore && gAfter === gBefore, `V ${vBefore}->${vAfter}, G ${gBefore}->${gAfter}`);
    const fBeforeRelease = await stamp(F);
    const vBeforeRelease = await stamp(V);
    await settings.releaseCard(F, X);
    check("6c. a release moves F's stamp and not V's", (await stamp(F)) > fBeforeRelease && (await stamp(V)) === vBeforeRelease);
    check("released X is offered again at F's min 3", (await offered(f.publicId)) === "X3", await offered(f.publicId));

    // 7. Keep a card back's search: the lib call behind `searchSpareCardsAction` (the action itself needs a Clerk
    // session, so it is not called here; its auth and switch gate are unit-tested in actions.test.ts).
    const fHits = await settings.searchSpareCards(F, xName, process.env);
    check("7a. F's search for X's name finds F's own X with 3 spare", fHits.some((h) => h.oracleId === X && h.spare === 3), JSON.stringify(fHits));
    const zName = picks[2].name;
    const fZ = await settings.searchSpareCards(F, zName, process.env);
    check("7b. F's search for a card only V owns finds nothing of V's", fZ.every((h) => h.oracleId !== Z), JSON.stringify(fZ));
    const vX = await settings.searchSpareCards(V, xName, process.env);
    check("7c. V's search for X answers V's own count (2), not a friend's (3)", vX.filter((h) => h.oracleId === X).every((h) => h.spare === 2)
      && vX.some((h) => h.oracleId === X), JSON.stringify(vX));
    await settings.keepCardBack(F, X);
    check("7d. a kept card leaves the reader's search", (await settings.searchSpareCards(F, xName, process.env)).every((h) => h.oracleId !== X));
  } finally {
    // Stamps last: every delete above fires the deferred stamp trigger, which writes them back.
    const who = sql`(${V}, ${F}, ${G})`;
    await db.execute(sql`delete from friend_links where user_id in ${who} or friend_user_id in ${who}`);
    await db.execute(sql`delete from spare_keep where user_id in ${who}`);
    await db.execute(sql`delete from user_prefs where user_id in ${who}`);
    await db.execute(sql`delete from decks where user_id in ${who}`);
    await db.execute(sql`delete from collection_items where user_id in ${who}`);
    await db.execute(sql`delete from pod_spare_shares where user_id in ${who}`);
    await db.execute(sql`delete from pods where owner_user_id in ${who}`);
    await db.execute(sql`delete from pod_members where user_id in ${who}`);
    await db.execute(sql`delete from friend_invites where inviter_user_id in ${who}`);
    await db.execute(sql`delete from social_profiles where user_id in ${who}`);
    await db.execute(sql`delete from user_data_stamps where user_id in ${who}`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from collection_items where user_id in ${who})
           + (select count(*) from spare_keep where user_id in ${who})
           + (select count(*) from user_prefs where user_id in ${who})
           + (select count(*) from social_profiles where user_id in ${who})
           + (select count(*) from user_data_stamps where user_id in ${who}) as n`);
    check("cleanup left none of this run's rows", Number(left[0].n) === 0, `${left[0].n}`);
  }
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nall checks passed");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
