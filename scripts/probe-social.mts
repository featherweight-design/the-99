// Proves the social foundation's queries against a real database (plan
// `boards/plan-social-foundation-2026-10-12.md`, PR 1). The unit tests pin the rules and the emitted SQL;
// this proves the ANSWERS: that a stranger gets nothing from any read or write, that a token cannot be
// spent twice, that pods stay friends-only, and that befriending moves both readers' data stamps without
// deadlocking.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. Run it on a scratch branch migrated to this PR's
// migration, then delete the branch. Its four accounts are made-up ids, so it touches nobody's data, and
// it removes every row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:social
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const A = `probe_social_a_${run}`;
const B = `probe_social_b_${run}`;
const C = `probe_social_c_${run}`;
const D = `probe_social_d_${run}`;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:social: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:social: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:social: database reports ${rows[0]?.b}, not ${named}`);

  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const access = await import("../src/lib/social/access");
  const stamp = async (u: string) => {
    const { rows: r } = await db.execute<{ s: number | null }>(sql`select stamp::int as s from user_data_stamps where user_id = ${u}`);
    return r[0]?.s ?? 0;
  };

  try {
    const a = await friends.ensureProfile(A, "Alice");
    const b = await friends.ensureProfile(B, "Bob");
    const c = await friends.ensureProfile(C, "Cleo");
    const d = await friends.ensureProfile(D, "Dev");
    check("a profile takes the offered name, and a bad one falls back", (await friends.ensureProfile(`probe_social_x_${run}`, "\u0007")).displayName === "Player");
    await db.execute(sql`delete from social_profiles where user_id = ${`probe_social_x_${run}`}`);

    // Invites: create, accept, spend.
    const before = [await stamp(A), await stamp(B)];
    const invite = await friends.createInvite(A);
    if (!invite.ok) throw new Error("createInvite refused the first invite");
    const view = await friends.readInvite(B, invite.token);
    check("the landing read says who invited, and nothing else", view?.inviterName === "Alice" && view.state === "open" && !view.self && !view.alreadyFriends);
    check("an inviter cannot accept their own link", (await friends.redeemInvite(A, invite.token)).ok === false);
    const accepted = await friends.redeemInvite(B, invite.token);
    check("the friend accepts", accepted.ok && accepted.friend.publicId === a.publicId);
    check("the token is spent: a second accept fails", (await friends.redeemInvite(C, invite.token)).ok === false);
    check("a spent token cannot be declined", (await friends.declineInvite(C, invite.token)) === false);
    check("both readers' data stamps moved", (await stamp(A)) > before[0] && (await stamp(B)) > before[1]);
    const { rows: links } = await db.execute<{ n: number }>(sql`select count(*)::int as n from friend_links where user_id in (${A}, ${B})`);
    check("a friendship is two directed rows", links[0].n === 2);

    // Reads: A and B see each other; C sees nobody.
    check("A lists B", (await access.listFriends(A)).map((f) => f.publicId).join() === b.publicId);
    check("B lists A", (await access.listFriends(B)).map((f) => f.publicId).join() === a.publicId);
    check("C, the stranger, lists nobody", (await access.listFriends(C)).length === 0);
    check("C cannot resolve A's public id", (await access.resolveFriend(C, a.publicId)) === null);
    check("A cannot resolve a forged id", (await access.resolveFriend(A, c.publicId)) === null);

    // Decline, revoke, expiry, cap.
    const toDecline = await friends.createInvite(A);
    if (!toDecline.ok) throw new Error("createInvite refused");
    check("C declines silently", await friends.declineInvite(C, toDecline.token));
    check("a declined token cannot then be accepted", (await friends.redeemInvite(C, toDecline.token)).ok === false);
    const toRevoke = await friends.createInvite(A);
    if (!toRevoke.ok) throw new Error("createInvite refused");
    check("C cannot revoke A's link", (await friends.revokeInvite(C, toRevoke.token)) === false);
    check("A revokes it", await friends.revokeInvite(A, toRevoke.token));
    check("a revoked token cannot be accepted", (await friends.redeemInvite(C, toRevoke.token)).ok === false);
    const old = await friends.createInvite(A, new Date(Date.now() - 8 * 24 * 3600 * 1000));
    if (!old.ok) throw new Error("createInvite refused");
    check("an expired token cannot be accepted", (await friends.redeemInvite(C, old.token)).ok === false);
    check("an unknown token reads as nothing", (await friends.readInvite(C, "AAAAAAAAAAAAAAAAAAAAAA")) === null);
    let made = 0;
    for (let i = 0; i < 12; i++) if ((await friends.createInvite(D)).ok) made++;
    check("an inviter holds at most 10 open invites", made === 10, `${made}`);

    // Concurrency: two accepts of one link at once; befriend and unfriend both ways at once.
    const race = await friends.createInvite(C);
    if (!race.ok) throw new Error("createInvite refused");
    const both = await Promise.all([friends.redeemInvite(A, race.token), friends.redeemInvite(B, race.token)]);
    check("two accepts of one link: exactly one wins", both.filter((r) => r.ok).length === 1);

    // Pods: friends-only, owner-only writes, hand-on by seniority.
    const pod = await pods.createPod(A, "Thursday");
    if (!pod) throw new Error("createPod refused");
    check("the owner adds a friend", await pods.addMember(A, pod.id, b.publicId));
    check("the owner cannot add a stranger", (await pods.addMember(A, pod.id, d.publicId)) === false);
    check("a member cannot add anyone", (await pods.addMember(B, pod.id, a.publicId)) === false);
    check("a stranger cannot rename the pod", (await pods.renamePod(C, pod.id, "Mine")) === false);
    check("a stranger reads no pods", (await access.listPods(D)).length === 0);
    const seen = await access.listPods(B);
    check("a member reads the pod, owner first", seen.length === 1 && seen[0].members.map((m) => m.displayName).join() === "Alice,Bob");

    // Unfriend removes each from the other's pods.
    check("a stranger cannot unfriend for A", (await friends.unfriend(D, b.publicId)) === false);
    check("A unfriends B", await friends.unfriend(A, b.publicId));
    check("B left A's pod with the friendship", (await access.listPods(B)).length === 0);
    check("A and B no longer list each other", (await access.listFriends(A)).every((f) => f.publicId !== b.publicId));

    // Owner leaves: the earliest remaining member takes it.
    const invite2 = await friends.createInvite(A);
    if (!invite2.ok) throw new Error("createInvite refused");
    await friends.redeemInvite(B, invite2.token);
    await pods.addMember(A, pod.id, b.publicId);
    if (!(await access.listFriends(A)).some((f) => f.publicId === c.publicId)) {
      const i3 = await friends.createInvite(C);
      if (!i3.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(A, i3.token);
    }
    await pods.addMember(A, pod.id, c.publicId);
    check("the owner leaving hands the pod on", (await pods.leavePod(A, pod.id)) === "handedOn");
    const after = await access.listPods(B);
    check("to the longest-standing member", after[0]?.isOwner === true && after[0].members.length === 2);
    check("a member leaves", (await pods.leavePod(C, pod.id)) === "left");
    check("the last member out deletes it", (await pods.leavePod(B, pod.id)) === "deleted");

    // Stamp order: befriend and unfriend from both sides at once never deadlock. D's capped invites are
    // cleared first so D can invite again.
    await db.execute(sql`delete from friend_invites where inviter_user_id = ${D}`);
    let befriended = 0;
    const pairs = await Promise.allSettled(Array.from({ length: 6 }, async (_, i) => {
      const [inviter, invitee, them] = i % 2 ? [C, D, d.publicId] : [D, C, c.publicId];
      const t = await friends.createInvite(inviter);
      if (!t.ok) throw new Error("createInvite refused");
      const r = await friends.redeemInvite(invitee, t.token);
      if (r.ok) befriended++;
      await friends.unfriend(inviter, them);
    }));
    const errors = pairs.filter((p) => p.status === "rejected").map((p) => String((p as PromiseRejectedResult).reason));
    check("concurrent befriend and unfriend in both orders commit without an error", errors.length === 0, errors.join("; "));
    check("and the befriends really ran", befriended === 6, `${befriended}`);

    // ── Spares (PR 2): per pod, view-only, a copy only in a draft is not spare (Q3, Q12).
    const spares = await import("../src/lib/social/spares");
    const { rows: picks } = await db.execute<{ oracle_id: string }>(sql`
      select oracle_id from cards where type_line not like 'Basic%' and type_line like '%Creature%' order by oracle_id limit 3`);
    const [X, Y, CMD] = picks.map((r) => r.oracle_id);
    // A and B friends again; A's pod with B in it.
    if (!(await access.listFriends(A)).some((f) => f.publicId === b.publicId)) {
      const t = await friends.createInvite(A);
      if (!t.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(B, t.token);
    }
    const night = await pods.createPod(A, "Game night");
    if (!night) throw new Error("createPod refused");
    await pods.addMember(A, night.id, b.publicId);
    // B owns 3 of X and 1 of Y; a draft of B's asks 1 of X and 1 of Y.
    await db.execute(sql`insert into collection_items (user_id, oracle_id, quantity, set_code) values (${B}, ${X}, 3, 'prb'), (${B}, ${Y}, 1, 'prb')`);
    const { rows: deckRows } = await db.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id) values (${B}, 'probe draft', ${CMD}) returning id`);
    await db.execute(sql`insert into deck_cards (deck_id, oracle_id, quantity) values (${deckRows[0].id}, ${X}, 1), (${deckRows[0].id}, ${Y}, 1)`);

    check("no grant, no spares", (await spares.loadFriendSpares(A, [X, Y])).length === 0);
    const solo = await pods.createPod(B, "Just me");
    if (!solo) throw new Error("createPod refused");
    check("B cannot share with a pod B is not in", (await spares.shareSparesWith(B, (await pods.createPod(C, "Cleo's"))?.id, true)) === false);
    await spares.shareSparesWith(B, solo.id, true);
    check("a grant to a pod the viewer is not in shows nothing", (await spares.loadFriendSpares(A, [X, Y])).length === 0);
    const genBefore = await spares.friendGeneration(A);
    check("B shares spares with the game-night pod", await spares.shareSparesWith(B, night.id, true));
    const seenSpares = await spares.loadFriendSpares(A, [X, Y]);
    check("A sees B's spare X: owned 3, a draft asks 1, so 2", seenSpares.length === 1 && seenSpares[0].oracleId === X && seenSpares[0].spare === 2
      && seenSpares[0].friend.publicId === b.publicId, JSON.stringify(seenSpares));
    check("a copy only a draft wants is not spare (Y)", seenSpares.every((r) => r.oracleId !== Y));
    check("the row carries no owned count, claim or deck", Object.keys(seenSpares[0] ?? {}).sort().join() === "friend,oracleId,spare");
    check("C, the stranger, sees nothing", (await spares.loadFriendSpares(C, [X, Y])).length === 0);
    check("B sees no spares of their own through the friend read", (await spares.loadFriendSpares(B, [X, Y])).length === 0);
    const genShared = await spares.friendGeneration(A);
    check("friendGeneration moves when a friend starts sharing", genShared !== genBefore);
    await db.execute(sql`update collection_items set quantity = 4 where user_id = ${B} and oracle_id = ${X}`);
    const genMoved = await spares.friendGeneration(A);
    check("and when that friend's collection moves", genMoved !== genShared);
    check("a malformed card id asks for nothing", (await spares.loadFriendSpares(A, ["nope"])).length === 0);
    check("and it holds still when nothing moved", (await spares.friendGeneration(A)) === genMoved);

    await friends.setDisplayName(B, "Bobby");
    check("and when that friend renames", (await spares.friendGeneration(A)) !== genMoved);

    // Every way out of a pod drops the grant ROW, counted in the table (the read alone would hide a missed
    // cleanup, because it joins membership too).
    const grantRows = async () => Number((await db.execute<{ n: number }>(sql`
      select count(*)::int as n from pod_spare_shares where user_id = ${B} and pod_id = ${night.id}`)).rows[0].n);
    check("B leaves the game-night pod", (await pods.leavePod(B, night.id)) === "left");
    check("leaving dropped the grant row", (await grantRows()) === 0);
    await pods.addMember(A, night.id, b.publicId);
    check("rejoining does not bring the grant back", (await spares.loadFriendSpares(A, [X])).length === 0);
    await spares.shareSparesWith(B, night.id, true);
    check("B shares again", (await spares.loadFriendSpares(A, [X])).length === 1);
    check("A removes B", await pods.removeMember(A, night.id, b.publicId));
    check("removal dropped the grant row", (await grantRows()) === 0);
    // A share racing a removal, in the order that could strand a grant: the removal deletes the membership
    // and its grants, then holds its transaction open while B shares. The share must wait on the membership
    // row and find nothing once the removal commits.
    await pods.addMember(A, night.id, b.publicId);
    let release = () => {};
    const held = new Promise<void>((r) => { release = r; });
    let removed = () => {};
    const removing = new Promise<void>((r) => { removed = r; });
    const removal = db.transaction(async (tx) => {
      await tx.execute(sql`delete from pod_members where pod_id = ${night.id} and user_id = ${B}`);
      await tx.execute(sql`delete from pod_spare_shares where pod_id = ${night.id} and user_id = ${B}`);
      removed();
      await held;
    });
    await removing;
    const sharing = spares.shareSparesWith(B, night.id, true);
    await new Promise((r) => setTimeout(r, 1500));
    release();
    await removal;
    check("a share racing a removal is refused", (await sharing) === false);
    check("and leaves no grant row behind", (await grantRows()) === 0);
    // A stale grant row, as a missed cleanup would leave it, still shows nothing: the read joins membership.
    await db.execute(sql`insert into pod_spare_shares (user_id, pod_id) values (${B}, ${night.id})`);
    check("a grant to a pod its owner left shows nothing", (await spares.loadFriendSpares(A, [X])).length === 0);
    await db.execute(sql`delete from pod_spare_shares where user_id = ${B} and pod_id = ${night.id}`);
    await pods.addMember(A, night.id, b.publicId);
    await spares.shareSparesWith(B, night.id, true);
    check("B shares a third time", (await grantRows()) === 1);
    await friends.unfriend(A, b.publicId);
    check("unfriending ends it", (await spares.loadFriendSpares(A, [X])).length === 0);
    check("unfriending dropped the grant row", (await grantRows()) === 0);
    await db.execute(sql`delete from decks where user_id = ${B}`);
    await db.execute(sql`delete from collection_items where user_id = ${B}`);
  } finally {
    // Stamps last: every delete above fires the deferred stamp trigger, which writes them back.
    const who = sql`(${A}, ${B}, ${C}, ${D})`;
    await db.execute(sql`delete from friend_links where user_id in ${who} or friend_user_id in ${who}`);
    await db.execute(sql`delete from decks where user_id in ${who}`);
    await db.execute(sql`delete from collection_items where user_id in ${who}`);
    await db.execute(sql`delete from pod_spare_shares where user_id in ${who}`);
    await db.execute(sql`delete from pods where owner_user_id in ${who}`);
    await db.execute(sql`delete from pod_members where user_id in ${who}`);
    await db.execute(sql`delete from friend_invites where inviter_user_id in ${who}`);
    await db.execute(sql`delete from social_profiles where user_id in ${who}`);
    await db.execute(sql`delete from user_data_stamps where user_id in ${who}`);
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
