// Proves the account purge (`purgeAccount`, the Clerk `user.deleted` webhook's only work) against a real
// database: that every row naming the purged account goes, that nobody else's rows do, that a pod the
// account owned passes to its longest-standing member, that friends' data stamps move, and that the
// account's own stamp row does not come back at commit. The unit tests pin the coverage from the schema;
// this reads the DATABASE for the answer: every text column of every table is searched for the account's
// id by value, with no list of account columns, so a table the schema scan missed would still show here.
//
// It WRITES and DELETES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch
// `DATABASE_URL` reports, and never staging, production or local-dev. Its three accounts are made-up ids,
// and it removes every row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:purge
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const P = `probe_purge_p_${run}`; // the account being deleted
const F = `probe_purge_f_${run}`; // a friend, longest-standing in P's pod
const G = `probe_purge_g_${run}`; // a friend who joined later
const ADMIN = `probe_purge_admin_${run}`; // this run's own admin actor, so concurrent runs never count each other

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:purge: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:purge: ${named} is staging, production or local-dev; it deletes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:purge: database reports ${rows[0]?.b}, not ${named}`);

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const spares = await import("../src/lib/social/spares");
  const { purgeAccount } = await import("../src/lib/account/purge");

  // Every text column in the database, read from the catalog, and searched for the account's id by VALUE.
  // No list of account columns is involved, so this is independent of the purge's own coverage test: a
  // table naming the account under any column name at all shows here.
  const { rows: columns } = await db.execute<{ t: string; c: string }>(sql`
    select c.table_name as t, c.column_name as c from information_schema.columns c
    join information_schema.tables t on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE' and c.data_type in ('text', 'character varying')
    order by c.table_name, c.column_name`);
  const rowsNaming = async (u: string) => {
    const out: Record<string, number> = {};
    for (const { t, c } of columns) {
      if (t === "admin_settings" || (t === "admin_events" && c === "actor_id")) continue; // kept on purpose
      const { rows: r } = await db.execute<{ n: number }>(
        sql`select count(*)::int as n from ${sql.identifier(t)} where ${sql.identifier(c)} = ${u}`);
      if (r[0].n > 0) out[`${t}.${c}`] = r[0].n;
    }
    return out;
  };
  const stamp = async (u: string) => {
    const { rows: r } = await db.execute<{ s: number | null }>(sql`select stamp::int as s from user_data_stamps where user_id = ${u}`);
    return r[0]?.s ?? null;
  };

  const racers: string[] = [];
  try {
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line like '%Legendary Creature%' order by oracle_id limit 2`);
    const [CMD, X] = picks.map((r) => r.oracle_id);

    // Social: P befriends F then G; P's pod holds F (joined first) then G; P is in F's pod; P shares spares.
    await friends.ensureProfile(P, "Pat");
    const f = await friends.ensureProfile(F, "Fay");
    const g = await friends.ensureProfile(G, "Gus");
    // P sends F an invite; G sends P one, so the purge meets both sides (inviter and redeemer).
    const toF = await friends.createInvite(P);
    if (!toF.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(F, toF.token);
    const fromG = await friends.createInvite(G);
    if (!fromG.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(P, fromG.token);
    const open = await friends.createInvite(P);
    if (!open.ok) throw new Error("createInvite refused");
    const t2 = await friends.createInvite(F);
    if (!t2.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(G, t2.token); // F and G are friends too, which must survive
    const mine = await pods.createPod(P, "Pat's table");
    if (!mine) throw new Error("createPod refused");
    await pods.addMember(P, mine.id, f.publicId);
    await new Promise((r) => setTimeout(r, 20));
    await pods.addMember(P, mine.id, g.publicId);
    const theirs = await pods.createPod(F, "Fay's table");
    if (!theirs) throw new Error("createPod refused");
    const p = await friends.ensureProfile(P, "Pat");
    await pods.addMember(F, theirs.id, p.publicId);
    await spares.shareSparesWith(P, mine.id, true);
    await spares.shareSparesWith(P, theirs.id, true);

    // The rest of an account: a folder, a deck with cards and a version, a game and a note, a collection,
    // preferences, a model call with a row pointing at it, and an admin event about the account.
    const { rows: folder } = await db.execute<{ id: string }>(sql`insert into deck_folders (user_id, name) values (${P}, 'probe') returning id`);
    const { rows: deck } = await db.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id, folder_id) values (${P}, 'probe deck', ${CMD}, ${folder[0].id}) returning id`);
    const deckId = deck[0].id;
    await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckId}, ${X}, 1)`);
    await db.execute(sql`insert into deck_versions (deck_id, number, commander_oracle_id) values (${deckId}, 1, ${CMD})`);
    await db.execute(sql`insert into deck_games (deck_id, user_id, result, pod_size) values (${deckId}, ${P}, 'win', 4)`);
    await db.execute(sql`insert into deck_notes (deck_id, user_id, body) values (${deckId}, ${P}, 'probe')`);
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${P}, ${X}, 2, 'prb'), (${F}, ${X}, 1, 'prb')`);
    await db.execute(sql`insert into user_prefs (user_id) values (${P}) on conflict do nothing`);
    const { rows: call } = await db.execute<{ id: string }>(sql`insert into model_calls (user_id, feature) values (${P}, 'fits_read') returning id`);
    await db.execute(sql`
      insert into fits_reads (user_id, oracle_id, status, model_call_id, model, prompt_version, candidate_hashes)
      values (${P}, ${CMD}, 'done', ${call[0].id}, 'probe', 1, '[]'::jsonb)`);
    await db.execute(sql`insert into admin_events (actor_id, kind, switch, scope, user_id, new_value) values (${ADMIN}, 'override_set', 'probe', 'user', ${P}, 'on')`);

    const before = await rowsNaming(P);
    check("the fixture names the account in many tables", Object.keys(before).length >= 12, Object.keys(before).join(" "));
    const fBefore = await stamp(F);

    const report = await purgeAccount(P);
    const after = await rowsNaming(P);
    check("no column anywhere names the purged account", Object.keys(after).length === 0, JSON.stringify(after));
    check("the purge reports what it removed", report.rows.decks === 1 && report.social.friendLinks === 4, JSON.stringify(report));
    const { rows: kids } = await db.execute<{ n: number }>(sql`
      select (select count(*) from deck_cards where deck_id = ${deckId}) + (select count(*) from deck_versions where deck_id = ${deckId}) as n`);
    check("the deck's cards and versions went with it", Number(kids[0].n) === 0);
    const { rows: calls } = await db.execute<{ n: number }>(sql`select count(*)::int as n from model_calls where id = ${call[0].id}`);
    check("its model call went, after the row pointing at it", calls[0].n === 0);

    const { rows: podRow } = await db.execute<{ owner: string }>(sql`select owner_user_id as owner from pods where id = ${mine.id}`);
    check("P's pod passed to the longest-standing member (F)", podRow[0]?.owner === F, podRow[0]?.owner);
    const { rows: members } = await db.execute<{ u: string }>(sql`select user_id as u from pod_members where pod_id = ${mine.id} order by user_id`);
    check("and keeps its other members", members.map((m) => m.u).join() === [F, G].sort().join());
    const { rows: theirMembers } = await db.execute<{ u: string }>(sql`select user_id as u from pod_members where pod_id = ${theirs.id}`);
    check("F's pod stands, without P", theirMembers.map((m) => m.u).join() === F);
    check("F and G are still friends", (await db.execute<{ n: number }>(sql`
      select count(*)::int as n from friend_links where user_id = ${F} and friend_user_id = ${G}`)).rows[0].n === 1);
    check("F's collection is untouched", (await db.execute<{ n: number }>(sql`
      select count(*)::int as n from collection_items where user_id = ${F}`)).rows[0].n === 1);
    check("F's data stamp moved (the friendship went)", ((await stamp(F)) ?? 0) > (fBefore ?? 0));
    check("P's stamp row did not come back at commit", (await stamp(P)) === null);
    const { rows: kept } = await db.execute<{ n: number }>(sql`select count(*)::int as n from admin_events where actor_id = ${ADMIN}`);
    check("an admin event ABOUT the account went", kept[0].n === 0);
    const again = await purgeAccount(P);
    check("a second purge finds nothing", Object.values(again.rows).every((n) => n === 0) && again.stamp === 0
      && Object.values(again.social).every((n) => n === 0), JSON.stringify(again));
    void open;

    // The lock hierarchy under a real race: a friend unfriends the account while it is purged, with a pod
    // each owns holding the other. Five fresh pairs, both sides started together; neither may deadlock
    // (40P01) and the account must end with nothing.
    let raced = 0;
    for (let i = 0; i < 5; i++) {
      const q = `${P}_race${i}`;
      const h = `${F}_race${i}`;
      racers.push(q, h);
      const qp = await friends.ensureProfile(q, "Quin");
      const hp = await friends.ensureProfile(h, "Hal");
      const inv = await friends.createInvite(q);
      if (!inv.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(h, inv.token);
      const qPod = await pods.createPod(q, "Q's");
      const hPod = await pods.createPod(h, "H's");
      if (!qPod || !hPod) throw new Error("createPod refused");
      await pods.addMember(q, qPod.id, hp.publicId);
      await pods.addMember(h, hPod.id, qp.publicId);
      const results = await Promise.allSettled([purgeAccount(q), friends.unfriend(h, qp.publicId)]);
      const bad = results.filter((r) => r.status === "rejected").map((r) => String((r as PromiseRejectedResult).reason?.cause?.code ?? (r as PromiseRejectedResult).reason));
      if (bad.length === 0 && Object.keys(await rowsNaming(q)).length === 0) raced++;
      else console.log(`  race ${i}: ${bad.join(", ") || JSON.stringify(await rowsNaming(q))}`);
    }
    check("a purge racing an unfriend over shared pods settles, five times out of five, with nothing left", raced === 5, `${raced}/5`);
  } finally {
    const all = [P, F, G, ...racers];
    const who = sql`(${sql.join(all.map((u) => sql`${u}`), sql`, `)})`;
    await db.execute(sql`delete from friend_links where user_id in ${who} or friend_user_id in ${who}`);
    await db.execute(sql`delete from decks where user_id in ${who}`);
    await db.execute(sql`delete from deck_folders where user_id in ${who}`);
    await db.execute(sql`delete from collection_items where user_id in ${who}`);
    await db.execute(sql`delete from fits_reads where user_id in ${who}`);
    await db.execute(sql`delete from model_calls where user_id in ${who}`);
    await db.execute(sql`delete from user_prefs where user_id in ${who}`);
    await db.execute(sql`delete from admin_events where actor_id = ${ADMIN}`);
    await db.execute(sql`delete from pod_spare_shares where user_id in ${who}`);
    await db.execute(sql`delete from pods where owner_user_id in ${who}`);
    await db.execute(sql`delete from pod_members where user_id in ${who}`);
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
