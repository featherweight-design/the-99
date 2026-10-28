// Proves friend decks' data half against a real database (friend decks handoff, G1 and G2): that a friend's Decks tab
// and a friend's deck page keep exactly the decks the OWNER's rules let friends see, that a stranger and a hidden deck
// read as nothing, that the page marks the VIEWER's ownership rather than the owner's, and that both writes move the
// owner's data stamp only when they change something and leave `last_edited_at` alone. The unit tests pin the rule
// (`friendCanSeeDeck`) and the hide write's SQL; this proves the ANSWERS through `loadFriendDecks` and `loadFriendDeck`.
//
// It WRITES, so it fails closed on its target. The target is NAMED, never `.env`'s `DATABASE_URL` (env.mjs would put
// local-dev back over any prefix): `FRIEND_DECKS_PROBE_URL` is the database and `PROBE_DB_BRANCH` the Neon branch it
// must report, checked through the app's own `db` before the first write, and never staging, production or local-dev.
// Its accounts are per-run made-up ids, and every row it wrote is removed by those ids in a finally.
//
//   FRIEND_DECKS_PROBE_URL=postgres://… PROBE_DB_BRANCH=br-… pnpm probe:friend-decks
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const V = `probe_frdeck_v_${run}`; // the viewer
const F = `probe_frdeck_f_${run}`; // the friend whose decks are read
const S = `probe_frdeck_s_${run}`; // a stranger to F

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const url = process.env.FRIEND_DECKS_PROBE_URL;
  const named = process.env.PROBE_DB_BRANCH;
  if (!url || !named) throw new Error("probe:friend-decks: set FRIEND_DECKS_PROBE_URL and PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:friend-decks: ${named} is staging, production or local-dev; it writes`);
  process.env.DATABASE_URL = url;
  // The owner's switches decide the filter (`resolveSwitchEnv`), and this process's environment is their default.
  process.env.SOCIAL_FRIENDS_ENABLED = "true";
  process.env.FRIEND_DECKS_ENABLED = "true";
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:friend-decks: database reports ${rows[0]?.b}, not ${named}`);
  console.log(`branch ${named}`);

  const friends = await import("../src/lib/social/friends");
  const read = await import("../src/lib/social/decks");
  const vis = await import("../src/lib/social/deck-visibility");
  const stamp = async (u: string) => {
    const { rows: r } = await db.execute<{ s: number | null }>(sql`select stamp::int as s from user_data_stamps where user_id = ${u}`);
    return r[0]?.s ?? 0;
  };

  try {
    const v = await friends.ensureProfile(V, "Vera");
    const f = await friends.ensureProfile(F, "Finn");
    await friends.ensureProfile(S, "Sam");
    const t = await friends.createInvite(V);
    if (!t.ok) throw new Error("createInvite refused");
    if (!(await friends.redeemInvite(F, t.token)).ok) throw new Error("redeemInvite refused");

    // A commander and two nonbasic cards the catalog holds. The viewer owns card A; the owner owns both.
    const { rows: cmd } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line like 'Legendary Creature%' and name ~ '^[A-Za-z ,]+$' order by oracle_id limit 1`);
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line like 'Artifact%' and type_line not like '%Creature%' order by oracle_id limit 2`);
    if (!cmd[0] || picks.length < 2) throw new Error("the catalog has too few cards to pick from");
    const C = cmd[0].oracle_id;
    const [A, B] = picks.map((r) => r.oracle_id);
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values
      (${V}, ${A}, 1, 'prb'), (${F}, ${A}, 1, 'prb'), (${F}, ${B}, 1, 'prb')`);
    const { rows: made } = await db.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id) values (${F}, 'Probe Shown', ${C}), (${F}, 'Probe Hidden', ${C})
      returning id`);
    const [shown, hidden] = made.map((r) => r.id);
    await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values
      (${shown}, ${A}, 1), (${shown}, ${B}, 1), (${hidden}, ${A}, 1)`);

    // Both decks are uncommitted (Draft), which the defaults keep from friends.
    const tab = async () => (await read.loadFriendDecks(V, f.publicId))?.map((d) => d.name).sort();
    check("defaults: a friend sees no Draft", JSON.stringify(await tab()) === "[]", JSON.stringify(await tab()));
    check("defaults: a Draft's page is nothing", (await read.loadFriendDeck(V, f.publicId, shown)) === null);

    const s00 = await stamp(F);
    await vis.writeFriendDeckPrefs(F, vis.DEFAULT_FRIEND_DECK_PREFS);
    const { rows: prefRows } = await db.execute<{ n: number }>(sql`select count(*)::int as n from user_prefs where user_id = ${F}`);
    check("writing the defaults with no prefs row inserts none and moves no stamp", Number(prefRows[0].n) === 0 && (await stamp(F)) === s00);
    const before = await stamp(F);
    await vis.writeFriendDeckPrefs(F, { seeDecks: true, seeUnfinished: true });
    const afterWrite = await stamp(F);
    await vis.writeFriendDeckPrefs(F, { seeDecks: true, seeUnfinished: true });
    check("a prefs write moves the owner's stamp", afterWrite > before, `${before} -> ${afterWrite}`);
    check("an unchanged prefs write does not", (await stamp(F)) === afterWrite);
    check("drafts included: both decks on the tab", JSON.stringify(await tab()) === JSON.stringify(["Probe Hidden", "Probe Shown"]));

    const { rows: edited } = await db.execute<{ t: string }>(sql`select last_edited_at::text as t from decks where id = ${hidden}`);
    const s0 = await stamp(F);
    check("hiding the owner's deck is accepted", await vis.setDeckHiddenFromFriends(F, hidden, true));
    const s1 = await stamp(F);
    check("hiding moves the owner's stamp", s1 > s0, `${s0} -> ${s1}`);
    check("hiding again changes nothing and moves nothing", (await vis.setDeckHiddenFromFriends(F, hidden, true)) && (await stamp(F)) === s1);
    const { rows: edited2 } = await db.execute<{ t: string }>(sql`select last_edited_at::text as t from decks where id = ${hidden}`);
    check("hiding is not an edit: last_edited_at unchanged", edited[0].t === edited2[0].t);
    check("a stranger cannot hide the owner's deck", !(await vis.setDeckHiddenFromFriends(S, shown, true)));
    check("hidden: the tab drops it", JSON.stringify(await tab()) === JSON.stringify(["Probe Shown"]));
    check("hidden: its page is nothing", (await read.loadFriendDeck(V, f.publicId, hidden)) === null);

    const page = await read.loadFriendDeck(V, f.publicId, shown);
    check("the shown deck's page reads", page !== null && page.name === "Probe Shown");
    const mark = Object.fromEntries((page?.cards ?? []).map((c) => [c.oracleId, c.owned]));
    check("the page marks the VIEWER's ownership", mark[A] === true && mark[B] === false, JSON.stringify(mark));
    check("the commander is first, alone", page?.commanders.length === 1 && page.commanders[0].oracleId === C);
    check("a stranger reads nothing", (await read.loadFriendDeck(S, f.publicId, shown)) === null && (await read.loadFriendDecks(S, f.publicId)) === null);

    await vis.writeFriendDeckPrefs(F, { seeDecks: false, seeUnfinished: true });
    check("decks off: the tab is empty", JSON.stringify(await tab()) === "[]");
    check("decks off: the page is nothing", (await read.loadFriendDeck(V, f.publicId, shown)) === null);

    // Rule 0 setup follows the same owner rules as the game log's picker (never a second rule).
    const pods = await import("../src/lib/social/pods");
    const rz = await import("../src/lib/social/rule-zero");
    const pod = await pods.createPod(V, "Probe pod");
    if (!pod || !(await pods.addMember(V, pod.id, f.publicId))) throw new Error("pod setup refused");
    await db.execute(sql`insert into decks (user_id, name, commander_oracle_id) values (${V}, 'Probe Mine', ${C})`);
    const listed = async () => (await rz.podSetup(V, pod.id))?.members.find((m) => m.publicId === f.publicId)?.decks.map((d) => d.name).sort();
    const mine = async () => (await rz.podSetup(V, pod.id))?.members.find((m) => m.publicId === v.publicId)?.decks.map((d) => d.name);
    const seat = (deck: string | null) => [{ member: v.publicId, deck: null }, { member: f.publicId, deck }];
    await vis.writeFriendDeckPrefs(F, { seeDecks: true, seeUnfinished: true });
    check("rule 0 setup: a hidden deck is not listed, a shown one is", JSON.stringify(await listed()) === JSON.stringify(["Probe Shown"]), JSON.stringify(await listed()));
    check("rule 0 setup: the viewer's own deck is listed", JSON.stringify(await mine()) === JSON.stringify(["Probe Mine"]));
    check("rule 0 setTable refuses a hidden deck id", JSON.stringify(await rz.setTable(V, pod.id, seat(hidden))) === JSON.stringify({ kind: "refused", reason: "deck" }));
    await vis.writeFriendDeckPrefs(F, { seeDecks: false, seeUnfinished: true });
    check("rule 0 setup: friends_see_decks off lists none", JSON.stringify(await listed()) === "[]", JSON.stringify(await listed()));
    check("rule 0 setup: the owner's own decks stay listed with it off", JSON.stringify(await mine()) === JSON.stringify(["Probe Mine"]));
    check("rule 0 setTable refuses a shown deck while sharing is off", JSON.stringify(await rz.setTable(V, pod.id, seat(shown))) === JSON.stringify({ kind: "refused", reason: "deck" }));
    await vis.writeFriendDeckPrefs(F, { seeDecks: true, seeUnfinished: true });
    const okSeat = await rz.setTable(V, pod.id, seat(shown));
    check("rule 0 setTable seats a deck the friend lets friends see", okSeat.kind !== "refused", JSON.stringify(okSeat));

    // The table page and the reopened setup: a deck seated while shown, hidden since, reads as no deck.
    const tz = await import("../src/lib/social/rule-zero-table");
    const tableId = okSeat.kind === "set" || okSeat.kind === "open" ? okSeat.tableId : "";
    const friendSeat = async () => (await tz.loadTable(V, tableId))?.seats.find((s) => s.publicId === f.publicId)?.deck?.name ?? null;
    const setupSeat = async () => (await rz.tableSetup(V, tableId))?.seated.find((s) => s.publicId === f.publicId)?.deck?.name ?? null;
    check("rule 0 table: the seated friend's shown deck is drawn", (await friendSeat()) === "Probe Shown", String(await friendSeat()));
    await vis.setDeckHiddenFromFriends(F, shown, true);
    check("rule 0 table: hidden since the pick, it reads as no deck", (await friendSeat()) === null, String(await friendSeat()));
    check("rule 0 table setup: hidden since the pick, the seat has no deck", (await setupSeat()) === null, String(await setupSeat()));
    await vis.setDeckHiddenFromFriends(F, shown, false);
    await vis.writeFriendDeckPrefs(F, { seeDecks: false, seeUnfinished: true });
    check("rule 0 table: sharing off since the pick, it reads as no deck", (await friendSeat()) === null, String(await friendSeat()));
    await vis.writeFriendDeckPrefs(F, { seeDecks: true, seeUnfinished: true });
  } finally {
    const who = sql`(${V}, ${F}, ${S})`;
    await db.execute(sql`delete from pods where owner_user_id in ${who}`);
    await db.execute(sql`delete from friend_links where user_id in ${who} or friend_user_id in ${who}`);
    await db.execute(sql`delete from user_prefs where user_id in ${who}`);
    await db.execute(sql`delete from decks where user_id in ${who}`);
    await db.execute(sql`delete from collection_items where user_id in ${who}`);
    await db.execute(sql`delete from friend_invites where inviter_user_id in ${who}`);
    await db.execute(sql`delete from social_profiles where user_id in ${who}`);
    // Stamps last: every delete above fires the deferred stamp trigger, which writes them back.
    await db.execute(sql`delete from user_data_stamps where user_id in ${who}`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from decks where user_id in ${who})
           + (select count(*) from collection_items where user_id in ${who})
           + (select count(*) from user_prefs where user_id in ${who})
           + (select count(*) from social_profiles where user_id in ${who})
           + (select count(*) from user_data_stamps where user_id in ${who}) as n`);
    check("cleanup left none of this run's rows", Number(left[0].n) === 0, `${left[0].n}`);
  }
  if (failed > 0) {
    console.log(`\n${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("\nall checks passed");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
