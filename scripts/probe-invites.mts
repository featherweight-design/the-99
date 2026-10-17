// Proves the sender's invite writes (plan `2026-10-16-invites.md`, PR 2) against a real database: the sender's lock
// (presses at once, one invite), every count, the invariant (`held` ≥ the rows holding) after every write, a Clerk
// refusal answered as a success and kept holding, an indeterminate send kept holding, a live QR re-shown from a
// fresh request with the same token (and to nobody else), an expired QR, an admin Set, a group top-up and a revoke.
// PR 3 (the newcomer's backend) adds: a claim and its mail (Resend stubbed), the resend cooldown, five wrong tries to
// the end, a proven claim handed over with and without an account (and again after a reopen), the spend run twice
// and in both orders with the webhook and the first `/friends` (one edge, one friendship, `held` down once, one
// receipt), a lapsed or revoked reservation spending nothing, the sweep (returns, a failed revoke kept and retried,
// a reconcile) and the purge's Clerk half.
// Clerk is STUBBED: no real invitation is ever made.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL`
// reports, and never staging, production or local-dev. Its accounts and group are made-up ids, and it removes
// every row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:invites
import "./lib/env.mjs";
import type { ClerkInvites, CreateInvitation, CreateResult } from "../src/lib/invites/clerk";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const ADMIN = `probe_inv_admin_${run}`;
const S = `probe_inv_s_${run}`; // the sender
const T = `probe_inv_t_${run}`; // a second member of the group
const O = `probe_inv_o_${run}`; // another account
const K = `probe_inv_k_${run}`; // a sender whose QR outlives a key change
const L = `probe_inv_l_${run}`; // a sender whose QR lapses while a write waits for the lock
const P = `probe_inv_p_${run}`; // PR 3: the sender whose invites are claimed and spent
const ADMIN3 = `probe_inv_admin3_${run}`;
const N1 = `probe_inv_n1_${run}`; // PR 3: newcomers
const N2 = `probe_inv_n2_${run}`;
const N3 = `probe_inv_n3_${run}`;
const N4 = `probe_inv_n4_${run}`;
const Z = `probe_inv_z_${run}`; // PR 3: a sender whose account is purged
const W = `probe_inv_w_${run}`; // PR 3: Z's invitee
const Q = `probe_inv_q_${run}`; // PR 3: a sender with a backlog for the sweep
const N5 = `probe_inv_n5_${run}`; // PR 3: a newcomer whose account was deleted
const N6 = `probe_inv_n6_${run}`;
const PR3 = [P, N1, N2, N3, N4, Z, W, Q, N5, N6];
const SECRET = "c0ffee".repeat(11).slice(0, 64);

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

/** A Clerk stand-in answering what it is told to, recording every call. */
function stubClerk(answer: (input: CreateInvitation) => CreateResult | Promise<CreateResult>) {
  const created: CreateInvitation[] = [];
  const revoked: string[] = [];
  const revokedFor: { email: string; reservationId: string }[] = [];
  const clerk: ClerkInvites = {
    async create(input) { created.push(input); return answer(input); },
    async revoke(id) { revoked.push(id); return true; },
    async revokeFor(email, reservationId) { revokedFor.push({ email, reservationId }); return true; },
    async findFor() { return { ok: true as const, id: null }; },
    async hasAccount() { return false; },
  };
  return { clerk, created, revoked, revokedFor };
}

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:invites: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:invites: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:invites: database reports ${rows[0]?.b}, not ${named}`);

  const { sendEmailInvite, showInviteQr, readSenderQr } = await import("../src/lib/invites/send");
  const { setInvites, topUpGroupInvites, revokeReservation } = await import("../src/lib/invites/admin");
  const { loadInviteCount } = await import("../src/lib/invites/read");

  /** The invariant, read straight from the tables: held ≥ the rows holding now. */
  const invariant = async (who: string, label: string) => {
    const { rows: r } = await db.execute<{ held: number; holding: number }>(sql`
      select coalesce((select held from invite_balances where user_id = ${who}), 0)::int as held,
        (select count(*) from invite_reservations where user_id = ${who} and (
          (state = 'qr_open' and qr_expires_at > now()) or (state in ('claimed', 'reserved') and holds_until > now())
        ))::int as holding`);
    check(`invariant after ${label}`, r[0].held >= r[0].holding, `held ${r[0].held}, holding ${r[0].holding}`);
  };
  const left = async (who: string) => (await loadInviteCount(who)).left;
  let groupId: string | null = null;

  try {
    const ok = stubClerk((i) => ({ ok: true, id: `inv_${i.reservationId.slice(0, 8)}`, url: null }));

    // 0 to start: no row reads as 0, and an email send is refused before Clerk is asked.
    check("a new account has 0 left", (await left(S)) === 0);
    check("out refuses an email send", (await sendEmailInvite(S, "a@x.dev", { clerk: ok.clerk })).ok === false);
    check("an out send never reaches Clerk", ok.created.length === 0);
    check("a malformed address is invalid", (await sendEmailInvite(S, "not an address", { clerk: ok.clerk }))
      .ok === false);

    // An admin Set, then a send that Clerk accepts.
    check("Set 2 left", (await setInvites(ADMIN, S, 2)).ok);
    check("2 left", (await left(S)) === 2);
    check("a send is ok", (await sendEmailInvite(S, " New@X.dev ", { clerk: ok.clerk })).ok);
    check("Clerk was asked once, mailing, with the reservation and the normalized address",
      ok.created.length === 1 && ok.created[0].notify === true && ok.created[0].emailAddress === "new@x.dev");
    const { rows: sent } = await db.execute<{ state: string; clerk: string | null; email: string | null }>(sql`
      select state, clerk_invitation_id as clerk, email from invite_reservations
      where id = ${ok.created[0].reservationId}`);
    check("the reservation is reserved, with Clerk's id stored", sent[0]?.state === "reserved"
      && sent[0]?.clerk === `inv_${ok.created[0].reservationId.slice(0, 8)}` && sent[0]?.email === "new@x.dev");
    check("1 left, 1 waiting", (await left(S)) === 1 && (await loadInviteCount(S)).waiting === 1);
    await invariant(S, "a send");

    // The lock: two presses at once with one left take one invite between them.
    const both = await Promise.all(
      Array.from({ length: 8 }, (_, i) => sendEmailInvite(S, `race${i}@x.dev`, { clerk: ok.clerk })),
    );
    check("eight presses at once, one invite", both.filter((r) => r.ok).length === 1,
      `${both.filter((r) => r.ok).length} took one`);
    check("0 left after the race", (await left(S)) === 0);

    // The lock, deterministically: another write holds the sender's lock and takes the last invite; a press made
    // while it is held must wait for it, then find none left. Without the lock it reads one left and over-holds.
    check("Set 1 left for the held-lock check", (await setInvites(ADMIN, S, 1)).ok);
    const { lockSenderIn } = await import("../src/lib/invites/send");
    const { inviteReservations } = await import("../src/db/schema");
    const holder = db.transaction(async (tx) => {
      await lockSenderIn(tx, S);
      await tx.execute(sql`select pg_sleep(1.5)`);
      await tx.insert(inviteReservations).values({
        userId: S, kind: "email", state: "reserved", email: "holder@x.dev", holdsUntil: new Date(Date.now() + 86_400_000),
      });
    });
    await new Promise((r) => setTimeout(r, 400));
    const late = await sendEmailInvite(S, "late@x.dev", { clerk: ok.clerk });
    await holder;
    check("a press made under another write's lock waits, then finds none left", late.ok === false);
    check("0 left after the held lock", (await left(S)) === 0);
    await invariant(S, "the race");

    // A refusal and an indeterminate send are answered as successes and keep holding.
    check("Set 2 left again", (await setInvites(ADMIN, S, 2)).ok);
    check("a Set keeps the waiting ones waiting", (await loadInviteCount(S)).waiting === 3 && (await left(S)) === 2);
    const refuse = stubClerk(() => ({ ok: false, reason: "refused", code: "duplicate_record" }));
    check("a refused send answers ok", (await sendEmailInvite(S, "has-account@x.dev", { clerk: refuse.clerk })).ok);
    const lost = stubClerk(() => ({ ok: false, reason: "indeterminate" }));
    check("an indeterminate send answers ok", (await sendEmailInvite(S, "lost@x.dev", { clerk: lost.clerk })).ok);
    const { rows: kept } = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from invite_reservations where user_id = ${S} and state = 'reserved'
        and clerk_invitation_id is null and email in ('has-account@x.dev', 'lost@x.dev')`);
    check("both are kept holding, with no Clerk id", kept[0].n === 2);
    check("0 left: both hold", (await left(S)) === 0);
    await invariant(S, "a refusal and an indeterminate send");

    // The QR: Set 1, show, re-show from a fresh request, read by its sender and by nobody else.
    check("Set 1 left", (await setInvites(ADMIN, S, 1)).ok);
    const first = await showInviteQr(S, SECRET);
    check("a QR is shown", first.ok);
    check("the QR holds the invite: 0 left, live", (await left(S)) === 0 && (await loadInviteCount(S)).liveQr);
    const again = await showInviteQr(S, SECRET);
    check("out, the live QR is re-shown with the same token",
      first.ok && again.ok && again.token === first.token && again.expiresAt.getTime() === first.expiresAt.getTime());
    await invariant(S, "a QR and its re-show");
    if (first.ok) {
      const watch = await readSenderQr(S, first.token);
      check("its sender reads it live", watch?.state === "live" && watch.secondsLeft > 800 && watch.secondsLeft <= 900);
      check("another account reads nothing", (await readSenderQr(O, first.token)) === null);
      const later = new Date(first.expiresAt.getTime() + 1000);
      check("past its 15 minutes it reads expired", (await readSenderQr(S, first.token, later))?.state === "expired");
      // Lapse it in the table, so every later read (each at the real time) agrees it has lapsed.
      await db.execute(sql`update invite_reservations set qr_expires_at = now() - interval '1 second'
        where qr_token_hash is not null and user_id = ${S}`);
      check("a lapsed QR returns its invite", (await left(S)) === 1);
      const renewed = await showInviteQr(S, SECRET);
      check("past its time, a new QR needs an invite left: the invite is back, so a new token",
        renewed.ok && renewed.token !== first.token);
    }
    check("without the secret nothing is written", (await showInviteQr(O, null)).ok === false);
    const { rows: none } = await db.execute<{ n: number }>(sql`
      select count(*)::int as n from invite_reservations where user_id = ${O}`);
    check("no row for the unconfigured QR", none[0].n === 0);

    // Revoke a waiting reservation: the invite is back at once, the address erased, Clerk's invitation revoked.
    const { rows: waiting } = await db.execute<{ id: string }>(sql`
      select id from invite_reservations where user_id = ${S} and email = 'new@x.dev'`);
    const before = await left(S);
    const revoke = stubClerk(() => ({ ok: false, reason: "indeterminate" }));
    check("revoke changes it", (await revokeReservation(ADMIN, waiting[0].id, { clerk: revoke.clerk })).changed);
    check("Clerk's invitation is revoked", revoke.revoked.length === 1 && revoke.revoked[0].startsWith("inv_"));
    check("the invite is back at once", (await left(S)) === before + 1);
    const { rows: gone } = await db.execute<{ state: string; email: string | null; resolved: boolean }>(sql`
      select state, email, resolved_at is not null as resolved from invite_reservations where id = ${waiting[0].id}`);
    check("revoked, address erased, resolved", gone[0].state === "revoked" && gone[0].email === null && gone[0].resolved);
    check("a second revoke changes nothing",
      !(await revokeReservation(ADMIN, waiting[0].id, { clerk: revoke.clerk })).changed && revoke.revoked.length === 1);
    await invariant(S, "a revoke");

    // A revoke of a reservation whose Clerk id was never stored (the indeterminate send above) looks the invitation
    // up by its address and reservation, read before the address is erased.
    const { rows: lostRow } = await db.execute<{ id: string }>(sql`
      select id from invite_reservations where user_id = ${S} and email = 'lost@x.dev'`);
    const byMeta = stubClerk(() => ({ ok: false, reason: "indeterminate" }));
    check("revoke of a row with no Clerk id changes it",
      (await revokeReservation(ADMIN, lostRow[0].id, { clerk: byMeta.clerk })).changed);
    check("its invitation is looked up by address and reservation", byMeta.revoked.length === 0
      && byMeta.revokedFor.length === 1 && byMeta.revokedFor[0].email === "lost@x.dev"
      && byMeta.revokedFor[0].reservationId === lostRow[0].id);

    // A revoke that lands while Clerk is still creating: the send finds its reservation gone and revokes the
    // invitation it was just handed, so the ticket is not left usable with its invite returned.
    check("Set 1 left for the mid-send revoke", (await setInvites(ADMIN, S, 1)).ok);
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const slow = stubClerk(async (i) => { await gate; return { ok: true, id: `inv_late_${i.reservationId.slice(0, 8)}`, url: null }; });
    const pending = sendEmailInvite(S, "midway@x.dev", { clerk: slow.clerk });
    while (slow.created.length === 0) await new Promise((r) => setTimeout(r, 20));
    const midId = slow.created[0].reservationId;
    check("an admin revokes it mid-send", (await revokeReservation(ADMIN, midId, { clerk: slow.clerk })).changed);
    release();
    check("the send still answers ok", (await pending).ok);
    check("the late invitation is revoked", slow.revoked.includes(`inv_late_${midId.slice(0, 8)}`));
    const { rows: mid } = await db.execute<{ state: string; clerk: string | null }>(sql`
      select state, clerk_invitation_id as clerk from invite_reservations where id = ${midId}`);
    check("the revoked row is not rewritten with the late id", mid[0].state === "revoked" && mid[0].clerk === null);
    await invariant(S, "a mid-send revoke");

    // The same race with an indeterminate answer: the send has no id to revoke, so it reconciles by the address it
    // still holds (the revoke erased the row's).
    check("Set 1 left for the indeterminate mid-send revoke", (await setInvites(ADMIN, S, 1)).ok);
    let release2!: () => void;
    const gate2 = new Promise<void>((r) => { release2 = r; });
    const lostLate = stubClerk(async () => { await gate2; return { ok: false, reason: "indeterminate" }; });
    const pending2 = sendEmailInvite(S, "lost-late@x.dev", { clerk: lostLate.clerk });
    while (lostLate.created.length === 0) await new Promise((r) => setTimeout(r, 20));
    const lateId = lostLate.created[0].reservationId;
    check("an admin revokes it mid-send", (await revokeReservation(ADMIN, lateId, { clerk: lostLate.clerk })).changed);
    release2();
    check("the indeterminate send still answers ok", (await pending2).ok);
    // Two look-ups by address: the revoke's own (it found no id) and the send's, after Clerk's answer was lost.
    check("the send reconciles by its own address, after the revoke's",
      lostLate.revokedFor.filter((r) => r.email === "lost-late@x.dev" && r.reservationId === lateId).length === 2,
      JSON.stringify(lostLate.revokedFor));

    // A key change while a QR is live: the old QR cannot be opened by any token derivable now, so a re-show returns
    // it and makes a new one the sender's own watch can read.
    check("Set K 1 left", (await setInvites(ADMIN, K, 1)).ok);
    const oldKey = await showInviteQr(K, SECRET);
    const newKey = await showInviteQr(K, "beef".repeat(16));
    check("after a key change a new QR is made", oldKey.ok && newKey.ok && newKey.token !== oldKey.token);
    if (newKey.ok) check("the new QR reads live to its sender", (await readSenderQr(K, newKey.token))?.state === "live");
    const { rows: kRows } = await db.execute<{ state: string; n: number }>(sql`
      select state, count(*)::int as n from invite_reservations where user_id = ${K} group by state order by state`);
    check("the old QR is returned, the new one open", JSON.stringify(kRows) === JSON.stringify([{ state: "qr_open", n: 1 }, { state: "returned", n: 1 }]),
      JSON.stringify(kRows));
    check("K is out: one QR holds its one invite", (await left(K)) === 0);
    await invariant(K, "a key change");

    // A QR that lapses while a Set waits for the lock is counted as lapsed: the time is read once the lock is held.
    check("Set L 1 left", (await setInvites(ADMIN, L, 1)).ok);
    check("L shows a QR", (await showInviteQr(L, SECRET)).ok);
    await db.execute(sql`update invite_reservations set qr_expires_at = now() + interval '1 second' where user_id = ${L}`);
    const lockHolder = db.transaction(async (tx) => {
      await lockSenderIn(tx, L);
      await tx.execute(sql`select pg_sleep(2)`);
    });
    await new Promise((r) => setTimeout(r, 300));
    check("Set L 0 while the lock is held", (await setInvites(ADMIN, L, 0)).ok);
    await lockHolder;
    const { rows: lHeld } = await db.execute<{ held: number }>(sql`select held from invite_balances where user_id = ${L}`);
    check("the lapsed QR is not counted as holding: held is 0", lHeld[0]?.held === 0, `held ${lHeld[0]?.held}`);
    check("L has 0 left", (await left(L)) === 0);

    // A group top-up: raises who is below, lowers nobody.
    const { rows: g } = await db.execute<{ id: string }>(sql`
      insert into flag_groups (name, created_by) values (${`probe-inv-${run}`}, ${ADMIN}) returning id`);
    groupId = g[0].id;
    await db.execute(sql`insert into flag_group_members (user_id, group_id, added_by)
      values (${S}, ${groupId}, ${ADMIN}), (${T}, ${groupId}, ${ADMIN})`);
    check("Set T 5 left", (await setInvites(ADMIN, T, 5)).ok);
    const sBefore = await left(S);
    const top = await topUpGroupInvites(ADMIN, groupId, 3);
    check("top-up to 3 raises one member", top.ok && top.raised === (sBefore < 3 ? 1 : 0));
    check("S has 3 left", (await left(S)) === 3);
    check("T keeps 5: nobody is lowered", (await left(T)) === 5);
    await invariant(S, "a top-up");
    await invariant(T, "a top-up");
    check("an unknown group is notFound",
      (await topUpGroupInvites(ADMIN, "00000000-0000-4000-8000-000000000000", 3)).ok === false);
    check("a value out of range is invalid", (await setInvites(ADMIN, S, 1001)).ok === false
      && (await setInvites(ADMIN, S, -1)).ok === false && (await topUpGroupInvites(ADMIN, groupId, "x")).ok === false);


    // ------------------------------------------------------------------------------------------------------ PR 3
    const { claimInvite, confirmCode, handOver } = await import("../src/lib/invites/claim");
    const { spendInviteOnSignUp, takeReceipt } = await import("../src/lib/invites/spend");
    const { sweepInvites } = await import("../src/lib/invites/sweep");
    const { purgeAccount } = await import("../src/lib/account/purge");
    const env = { RESEND_API_KEY: "re_probe", INVITE_EMAIL_FROM: "The 99 <invites@probe.dev>", INVITE_CODE_SECRET: SECRET };
    const mailed: { to: string; text: string }[] = [];
    const mail = async (_c: unknown, m: { to: string; subject: string; text: string; html: string }) => { mailed.push(m); return { ok: true as const }; };
    const lastCode = () => mailed[mailed.length - 1].text.match(/is (\d{6})/)![1];
    const stateOf = async (id: string) => (await db.execute<{ state: string; email: string | null; clerk: string | null; holds: string | null }>(sql`
      select state, email, clerk_invitation_id as clerk, holds_until::text as holds from invite_reservations where id = ${id}`)).rows[0];
    const idOfToken = async (tok: string) => {
      const { secretHash } = await import("../src/lib/invites/tokens");
      return (await db.execute<{ id: string }>(sql`select id from invite_reservations where qr_token_hash = ${secretHash(tok)}`)).rows[0].id;
    };
    const heldOf = async (who: string) => (await db.execute<{ held: number }>(sql`select coalesce((select held from invite_balances where user_id = ${who}), 0)::int as held`)).rows[0].held;
    const clerk3 = stubClerk((i) => ({ ok: true, id: `tk_${i.reservationId.slice(0, 8)}_${i.notify ? "m" : "h"}`, url: `https://accounts.probe/sign-up?ticket=${i.reservationId.slice(0, 8)}` }));

    check("Set 6 left for P", (await setInvites(ADMIN3, P, 6)).ok);
    await db.execute(sql`insert into social_profiles (user_id, display_name) values (${P}, 'Sender P')`);

    // Send code: refused as unconfigured BEFORE anything is claimed, then claimed with the code mailed.
    const q1 = await showInviteQr(P, SECRET);
    if (!q1.ok) throw new Error("no QR for P");
    const r1 = await idOfToken(q1.token);
    const unconf = await claimInvite(q1.token, "n1@x.dev", null, { env: { INVITE_CODE_SECRET: SECRET }, mail });
    check("unconfigured mail refuses the claim", !unconf.ok && unconf.reason === "unconfigured");
    check("…and claims nothing: the QR is still open and the 6 stand", (await stateOf(r1)).state === "qr_open" && (await left(P)) === 5);
    check("a malformed address is invalid before anything is claimed", (await claimInvite(q1.token, "nope", null, { env, mail })).ok === false
      && (await stateOf(r1)).state === "qr_open");
    // The proxy hands the browser its secret with the page; Send code binds THAT one (so a lost first answer leaves the cookie).
    const PRE = "p".repeat(43);
    const c1 = await claimInvite(q1.token, " N1@X.dev ", PRE, { env, mail });
    check("Send code claims it and mails the code", c1.ok && c1.mailed && mailed.length === 1 && mailed[0].to === "n1@x.dev" && /^\d{6}$/.test(lastCode()));
    const sc1 = await stateOf(r1);
    const days = Number((await db.execute<{ d: string }>(sql`select (extract(epoch from (holds_until - now())) / 86400)::text as d from invite_reservations where id = ${r1}`)).rows[0].d);
    check("the claim holds 7 days, with the address", sc1.state === "claimed" && sc1.email === "n1@x.dev" && days > 6.99 && days <= 7, `${days.toFixed(3)} days`);
    check("a claim holds the SAME invite the QR held: 5 left, 1 waiting", (await left(P)) === 5 && (await loadInviteCount(P)).waiting === 1);
    await invariant(P, "a claim");
    check("the watch reads it claimed", (await readSenderQr(P, q1.token))?.state === "claimed");
    if (!c1.ok) throw new Error("claim failed");
    const cookie1 = c1.claimSecret;
    check("a well-shaped presented secret is bound as is", cookie1 === PRE
      && (await db.execute<{ h: string }>(sql`select claim_secret_hash as h from invite_reservations where id = ${r1}`)).rows[0].h === (await import("../src/lib/invites/tokens")).secretHash(PRE));
    // Lost response: the first answer never arrived, the cookie did. The retry presents the same secret: wait, then confirm works.
    {
      const retry = await claimInvite(q1.token, "n1@x.dev", PRE, { env, mail });
      check("a retry after a lost first answer waits on the cooldown, not ended", !retry.ok && retry.reason === "wait");
    }

    // The resend cooldown, another browser, and a changed address.
    const wait = await claimInvite(q1.token, "n1@x.dev", cookie1, { env, mail });
    check("a resend inside 60 seconds waits", !wait.ok && wait.reason === "wait" && (wait.waitMs ?? 0) > 0);
    const later = new Date(Date.now() + 61_000);
    check("another browser cannot resend or confirm", (await claimInvite(q1.token, "n1@x.dev", "other", { env, mail, now: later, clerk: ok.clerk })).ok === false
      && (await confirmCode(q1.token, lastCode(), "other", { now: later, env })).ok === false);
    const resent = await claimInvite(q1.token, "n1b@x.dev", cookie1, { env, mail, now: later, clerk: ok.clerk });
    check("the same browser resends to a different address, the 7 days not restarted",
      resent.ok && mailed.length === 2 && mailed[1].to === "n1b@x.dev" && (await stateOf(r1)).holds === sc1.holds);

    // A resend to another address ends the old address's pending invitation first (a lost hand-over answer stores none).
    const addr = stubClerk(() => ({ ok: true, id: "x", url: null }));
    await db.execute(sql`update invite_reservations set clerk_invitation_id = 'inv_prev' where id = ${r1}`);
    const moved = await claimInvite(q1.token, "n1c@x.dev", cookie1, { env, mail, now: new Date(Date.now() + 130_000), clerk: addr.clerk });
    check("a changed address first ends the old one's pending invitations, by id and by address", moved.ok
      && addr.revoked.includes("inv_prev") && addr.revokedFor.some((r) => r.reservationId === r1 && r.email === "n1b@x.dev")
      && (await stateOf(r1)).clerk === null && (await stateOf(r1)).email === "n1c@x.dev");
    const failing = stubClerk(() => ({ ok: true, id: "x", url: null }));
    failing.clerk.revokeFor = async () => false;
    const refused = await claimInvite(q1.token, "n1d@x.dev", cookie1, { env, mail, now: new Date(Date.now() + 260_000), clerk: failing.clerk });
    check("…and an address change is refused while the old one's invitation cannot be ended", !refused.ok && refused.reason === "failed" && (await stateOf(r1)).email === "n1c@x.dev");

    // Wrong tries to the end: four count, the fifth ends the row and its invite goes back.
    const wrong = [] as string[];
    for (let i = 0; i < 4; i += 1) {
      const w = await confirmCode(q1.token, "000000" === lastCode() ? "111111" : "000000", cookie1, { env, now: later });
      wrong.push(w.ok ? "ok" : w.reason === "wrong" ? `wrong:${w.triesLeft}` : w.reason);
    }
    check("four wrong codes count down the tries", wrong.join(",") === "wrong:4,wrong:3,wrong:2,wrong:1", wrong.join(","));
    const fifthClerk = stubClerk(() => ({ ok: true, id: "x", url: null }));
    const fifth = await confirmCode(q1.token, "000000" === lastCode() ? "111111" : "000000", cookie1, { env, now: later, clerk: fifthClerk.clerk });
    check("the fifth ends the row (N12)", !fifth.ok && fifth.reason === "ended");
    const ended1 = await stateOf(r1);
    check("…revoked, the address erased, the invite back", ended1.state === "revoked" && ended1.email === null && (await left(P)) === 6);
    check("the fifth try ends Clerk's pending invitations by address and reservation BEFORE the address is erased",
      fifthClerk.revokedFor.some((r) => r.reservationId === r1 && r.email === "n1c@x.dev"));
    check("a right code afterwards proves nothing", (await confirmCode(q1.token, lastCode(), cookie1, { env, now: later })).ok === false);
    await invariant(P, "five wrong tries");

    // The fifth try when Clerk cannot end the invitation: the row keeps its address and id (ended for every step,
    // spent tries) and the sweep finishes it once Clerk answers.
    const q5 = await showInviteQr(P, SECRET);
    if (!q5.ok) throw new Error("no QR 5");
    const r5 = await idOfToken(q5.token);
    const c5 = await claimInvite(q5.token, "tries@x.dev", "short", { env, mail });
    check("a malformed presented secret is replaced by a minted one", c5.ok && c5.claimSecret !== "short" && /^[A-Za-z0-9_-]{43}$/.test(c5.claimSecret));
    if (!c5.ok) throw new Error("claim 5 failed");
    await db.execute(sql`update invite_reservations set code_tries = 4, clerk_invitation_id = 'inv_tries', proven_at = now() where id = ${r5}`);
    const downClerk = stubClerk(() => ({ ok: true, id: "x", url: null }));
    downClerk.clerk.revokeFor = async () => false;
    const fifthDown = await confirmCode(q5.token, lastCode() === "000000" ? "111111" : "000000", c5.claimSecret, { env, clerk: downClerk.clerk });
    const kept5 = await stateOf(r5);
    check("a fifth try whose Clerk cleanup fails keeps the address and id for the sweep, and every step reads it as ended",
      !fifthDown.ok && fifthDown.reason === "ended" && kept5.state === "claimed" && kept5.email === "tries@x.dev" && kept5.clerk === "inv_tries"
      && (await handOver(q5.token, c5.claimSecret, { clerk: downClerk.clerk })).ok === false);
    // The exhausted claim was PROVEN and its ticket exists: it can neither hand over again nor spend.
    const exhaustedSpend = await spendInviteOnSignUp(`probe_inv_n6_${run}`, r5, "Fay");
    check("an exhausted claim (proven, ticket made) cannot spend while its cleanup is pending", exhaustedSpend.spent === false
      && Number((await db.execute<{ n: number }>(sql`select count(*) as n from invite_edges where invitee_user_id = ${`probe_inv_n6_${run}`}`)).rows[0].n) === 0);
    const finishClerk = stubClerk(() => ({ ok: true, id: "x", url: null }));
    await sweepInvites(new Date(), finishClerk.clerk, { senderIds: [P] });
    const done5 = await stateOf(r5);
    check("the sweep ends it: invitations revoked, row returned, address and id erased", done5.state === "returned" && done5.email === null && done5.clerk === null
      && finishClerk.revoked.includes("inv_tries") && finishClerk.revokedFor.some((r) => r.reservationId === r5));

    // A proven claim, handed over: the ticket is made quietly, ignoring an existing one, with the reservation id.
    const q2 = await showInviteQr(P, SECRET);
    if (!q2.ok) throw new Error("no QR 2");
    const r2 = await idOfToken(q2.token);
    const c2 = await claimInvite(q2.token, "n2@x.dev", null, { env, mail });
    if (!c2.ok) throw new Error("claim 2 failed");
    check("handing over before the code is proven ends", (await handOver(q2.token, c2.claimSecret, { clerk: clerk3.clerk })).ok === false && clerk3.created.length === 0);
    const wrong2 = await confirmCode(q2.token, lastCode() === "123456" ? "654321" : "123456", c2.claimSecret, { env });
    check("a wrong code proves nothing and counts a try", !wrong2.ok && wrong2.reason === "wrong" && wrong2.triesLeft === 4);
    check("the right code proves the mailbox", (await confirmCode(q2.token, lastCode(), c2.claimSecret, { env })).ok);
    const provenAt2 = (await db.execute<{ p: string }>(sql`select proven_at::text as p from invite_reservations where id = ${r2}`)).rows[0].p;
    check("the same code again from the proven browser answers proven and writes nothing (a retry after a lost response)",
      (await confirmCode(q2.token, lastCode(), c2.claimSecret, { env })).ok === true
      && (await db.execute<{ p: string }>(sql`select proven_at::text as p from invite_reservations where id = ${r2}`)).rows[0].p === provenAt2);
    check("…and to no other browser", (await confirmCode(q2.token, lastCode(), "someone-else", { env })).ok === false);
    // A same-address resend after the proof installs a fresh code and keeps the proof; confirming it clears that code
    // and leaves the first timestamp, so the claim cannot be exhausted or expire back into "not proven".
    const resentProven = await claimInvite(q2.token, "n2@x.dev", c2.claimSecret, { env, mail, now: new Date(Date.now() + 130_000) });
    check("a same-address resend keeps the proof and installs a fresh code", resentProven.ok
      && (await db.execute<{ p: string; h: boolean }>(sql`select proven_at::text as p, (code_hmac is not null) as h from invite_reservations where id = ${r2}`)).rows[0].h === true);
    check("confirming that code clears it and keeps the first proof timestamp", (await confirmCode(q2.token, lastCode(), c2.claimSecret, { env })).ok === true
      && (await db.execute<{ p: string; h: boolean }>(sql`select proven_at::text as p, (code_hmac is not null) as h from invite_reservations where id = ${r2}`)).rows[0].h === false
      && (await db.execute<{ p: string }>(sql`select proven_at::text as p from invite_reservations where id = ${r2}`)).rows[0].p === provenAt2);
    const h1 = await handOver(q2.token, c2.claimSecret, { clerk: clerk3.clerk });
    check("Continue hands over the invitation's url", h1.ok && h1.url.includes("ticket="));
    const mk1 = clerk3.created[clerk3.created.length - 1];
    check("…made with notify false, ignoreExisting and this reservation", mk1.notify === false && mk1.ignoreExisting === true && mk1.reservationId === r2 && mk1.emailAddress === "n2@x.dev");
    const id1 = (await stateOf(r2)).clerk;
    check("…its id stored, and no url", Boolean(id1) && id1?.endsWith("_h") === true);
    const h2 = await handOver(q2.token, c2.claimSecret, { clerk: clerk3.clerk });
    check("a hand-over also ends whatever is still pending for the reservation before making one", clerk3.revokedFor.some((r) => r.reservationId === r2 && r.email === "n2@x.dev"));
    check("continuing again revokes the stored invitation and makes a fresh one", h2.ok && clerk3.revoked.includes(id1!) && clerk3.created.length === 2);

    // An address with an account draws N9 and the reservation keeps holding.
    const q3 = await showInviteQr(P, SECRET);
    if (!q3.ok) throw new Error("no QR 3");
    const r3 = await idOfToken(q3.token);
    const c3 = await claimInvite(q3.token, "has@x.dev", null, { env, mail });
    if (!c3.ok) throw new Error("claim 3 failed");
    await confirmCode(q3.token, lastCode(), c3.claimSecret, { env });
    const withAccount = stubClerk(() => ({ ok: true, id: "never", url: "https://never" }));
    withAccount.clerk.hasAccount = async () => true;
    const h3 = await handOver(q3.token, c3.claimSecret, { clerk: withAccount.clerk });
    check("an address with an account is N9, and creates nothing", !h3.ok && h3.reason === "account" && withAccount.created.length === 0);
    check("…and its reservation keeps holding", (await stateOf(r3)).state === "claimed" && (await loadInviteCount(P)).waiting === 2);
    await invariant(P, "a hand over");

    // The spend: one transaction, idempotent, in either order with the first /friends.
    const heldBefore = await heldOf(P);
    const s1 = await spendInviteOnSignUp(N1, r2, "Ana");
    check("the spend runs", s1.spent === true);
    const spent = await stateOf(r2);
    check("…the reservation spent, its address erased", spent.state === "spent" && spent.email === null);
    check("…held down by exactly one", (await heldOf(P)) === heldBefore - 1, `${heldBefore} to ${await heldOf(P)}`);
    const edge = (await db.execute<{ inviter: string; kind: string }>(sql`select inviter_user_id as inviter, kind from invite_edges where invitee_user_id = ${N1}`)).rows;
    check("…one tree edge, inviter P, kind qr", edge.length === 1 && edge[0].inviter === P && edge[0].kind === "qr");
    const links = (await db.execute<{ n: number }>(sql`select count(*)::int as n from friend_links where (user_id = ${P} and friend_user_id = ${N1}) or (user_id = ${N1} and friend_user_id = ${P})`)).rows[0].n;
    check("…the friendship, both directions", links === 2);
    const prof = (await db.execute<{ name: string }>(sql`select display_name as name from social_profiles where user_id = ${N1}`)).rows[0];
    check("…the newcomer's profile, from the first name", prof?.name === "Ana");
    const s1b = await spendInviteOnSignUp(N1, r2, "Ana");
    check("run twice: already, nothing more written", s1b.spent === false && (await heldOf(P)) === heldBefore - 1
      && (await db.execute<{ n: number }>(sql`select count(*)::int as n from invite_edges where invitee_user_id = ${N1}`)).rows[0].n === 1);
    check("the receipt is drawn once", (await takeReceipt(N1)) === P && (await takeReceipt(N1)) === null);
    await invariant(P, "a spend");

    // Both orders: the webhook first, then the page; and the page first, then the webhook.
    const e1 = await sendEmailInvite(P, "n3@x.dev", { clerk: ok.clerk });
    const e2 = await sendEmailInvite(P, "n4@x.dev", { clerk: ok.clerk });
    check("two more email invites reserved", e1.ok && e2.ok);
    const rs = (await db.execute<{ id: string; email: string }>(sql`select id, email from invite_reservations where user_id = ${P} and state = 'reserved' order by email`)).rows;
    const rN3 = rs.find((r) => r.email === "n3@x.dev")!.id;
    const rN4 = rs.find((r) => r.email === "n4@x.dev")!.id;
    const orderA = [] as (string | null)[];
    await spendInviteOnSignUp(N3, rN3, "Cy");
    orderA.push(await takeReceipt(N3));
    await spendInviteOnSignUp(N3, rN3, "Cy");
    orderA.push(await takeReceipt(N3));
    check("webhook first, then the page: one band", orderA.join(",") === `${P},`, orderA.join(","));
    const orderB = [] as (string | null)[];
    orderB.push(await takeReceipt(N4));
    await spendInviteOnSignUp(N4, rN4, "Di");
    orderB.push(await takeReceipt(N4));
    orderB.push(await takeReceipt(N4));
    check("the page first, then the webhook: one band", orderB.join(",") === `,${P},`, orderB.join(","));
    check("an email invite's edge is kind email", (await db.execute<{ kind: string }>(sql`select kind from invite_edges where invitee_user_id = ${N3}`)).rows[0]?.kind === "email");

    // Nothing is spent on a reservation that is not waiting, is lapsed, or is not one of ours.
    const stranger = `probe_inv_x_${run}`;
    check("a revoked reservation spends nothing", (await spendInviteOnSignUp(stranger, r1, "X")).spent === false);
    check("a spent reservation spends nothing for another account", (await spendInviteOnSignUp(stranger, r2, "X")).spent === false);
    check("an unknown id spends nothing", (await spendInviteOnSignUp(stranger, "00000000-0000-4000-8000-000000000000", "X")).spent === false
      && (await spendInviteOnSignUp(stranger, "not-an-id", "X")).spent === false);
    const heldLapsed = await heldOf(P);
    const lapsedId = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, email, holds_until, created_at)
      values (${P}, 'email', 'reserved', 'late@x.dev', now() - interval '1 minute', now() - interval '8 days') returning id`)).rows[0].id;
    const sl = await spendInviteOnSignUp(stranger, lapsedId, "X");
    check("a lapsed reservation spends nothing and forms nothing", sl.spent === false && (await heldOf(P)) === heldLapsed
      && (await db.execute<{ n: number }>(sql`select count(*)::int as n from invite_edges where invitee_user_id = ${stranger}`)).rows[0].n === 0
      && (await db.execute<{ n: number }>(sql`select count(*)::int as n from friend_links where user_id = ${stranger} or friend_user_id = ${stranger}`)).rows[0].n === 0
      && (await db.execute<{ n: number }>(sql`select count(*)::int as n from social_profiles where user_id = ${stranger}`)).rows[0].n === 0);
    await invariant(P, "the spends");

    // The sweep: lapsed rows are returned after their invitations are ended; a failed revoke keeps the row, and the
    // id, for the next run; an indeterminate send is reconciled.
    const sw = stubClerk(() => ({ ok: true, id: "x", url: null }));
    const failIds = new Set<string>();
    sw.clerk.revoke = async (id) => { sw.revoked.push(id); return !failIds.has(id); };
    const found = new Map<string, string>();
    sw.clerk.findFor = async (_e, rid) => ({ ok: true, id: found.get(rid) ?? null });
    const qOld = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, qr_token_hash, qr_expires_at, created_at)
      values (${P}, 'qr', 'qr_open', ${`probe_h_${run}_a`}, now() - interval '1 minute', now() - interval '20 minutes') returning id`)).rows[0].id;
    const cOld = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, qr_token_hash, qr_expires_at, holds_until, email, clerk_invitation_id, created_at)
      values (${P}, 'qr', 'claimed', ${`probe_h_${run}_b`}, now() - interval '8 days', now() - interval '1 hour', 'old@x.dev', 'inv_claimed_old', now() - interval '8 days') returning id`)).rows[0].id;
    const eOldFail = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, holds_until, email, clerk_invitation_id, created_at)
      values (${P}, 'email', 'reserved', now() - interval '1 hour', 'fail@x.dev', 'inv_fail', now() - interval '8 days') returning id`)).rows[0].id;
    const eNoId = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, holds_until, email, created_at)
      values (${P}, 'email', 'reserved', now() - interval '1 hour', 'noid@x.dev', now() - interval '8 days') returning id`)).rows[0].id;
    const eUnknown = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, holds_until, email, created_at)
      values (${P}, 'email', 'reserved', now() + interval '6 days', 'unk@x.dev', now() - interval '10 minutes') returning id`)).rows[0].id;
    const eFresh = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, holds_until, email, created_at)
      values (${P}, 'email', 'reserved', now() + interval '6 days', 'fresh@x.dev', now()) returning id`)).rows[0].id;
    found.set(eUnknown, "inv_found");
    found.set(eFresh, "inv_should_not_be_looked_up");
    failIds.add("inv_fail");
    // A lapsed row of a sender OUTSIDE the scope: the sweep must neither return it nor touch it.
    const outside = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, qr_token_hash, qr_expires_at, created_at)
      values (${Q}, 'qr', 'qr_open', ${`probe_h_${run}_out`}, now() - interval '1 minute', now() - interval '20 minutes') returning id`)).rows[0].id;
    const rep1 = await sweepInvites(new Date(), sw.clerk, { senderIds: [P] });
    check("a sweep scoped to this run's senders leaves another sender's lapsed row alone", (await stateOf(outside)).state === "qr_open");
    check("the sweep returns the lapsed QR, the claim and the unreferenced email", (await stateOf(qOld)).state === "returned"
      && (await stateOf(cOld)).state === "returned" && (await stateOf(eNoId)).state === "returned", JSON.stringify(rep1));
    check("…each address erased, the invitation id cleared", (await stateOf(cOld)).email === null && (await stateOf(cOld)).clerk === null);
    check("…the claim's invitation revoked by its id AND by address and reservation (a replacement may not be the stored one), the id-less one by address",
      sw.revoked.includes("inv_claimed_old") && sw.revokedFor.some((r) => r.reservationId === cOld && r.email === "old@x.dev")
      && sw.revokedFor.some((r) => r.reservationId === eNoId && r.email === "noid@x.dev"));
    const failedRow = await stateOf(eOldFail);
    check("a revoke that fails keeps the row reserved, with its id and address, for the next run", failedRow.state === "reserved" && failedRow.clerk === "inv_fail" && failedRow.email === "fail@x.dev");
    check("an indeterminate send is reconciled: Clerk's id recorded", (await stateOf(eUnknown)).clerk === "inv_found", JSON.stringify([await stateOf(eUnknown), rep1]));
    check("a send younger than two minutes is not looked up", (await stateOf(eFresh)).clerk === null);
    failIds.clear();
    const rep2 = await sweepInvites(new Date(), sw.clerk, { senderIds: [P] });
    check("the next run returns the one whose revoke failed", (await stateOf(eOldFail)).state === "returned" && (await stateOf(eOldFail)).clerk === null, JSON.stringify(rep2));
    check("a holding reservation is never returned", (await stateOf(eUnknown)).state === "reserved" && (await stateOf(eFresh)).state === "reserved");
    const rep3 = await sweepInvites(new Date(), sw.clerk, { senderIds: [P] });
    check("a run with nothing to do returns nothing", rep3.returned === 0 && rep3.revoked === 0, JSON.stringify(rep3));
    await invariant(P, "the sweep");

    // A delayed user.created for an account that was deleted spends nothing, even with its raw id long retired.
    check("Set 20 left for P again", (await setInvites(ADMIN3, P, 20)).ok);
    check("a send for the deleted account's invitation", (await sendEmailInvite(P, "tomb@x.dev", { clerk: ok.clerk })).ok);
    const tombRes = (await db.execute<{ id: string }>(sql`select id from invite_reservations where user_id = ${P} and email = 'tomb@x.dev'`)).rows[0].id;
    const { tombstoneHash } = await import("../src/lib/account/purge");
    await db.execute(sql`insert into account_tombstones (id_hash, clerk_id) values (${tombstoneHash(N5)}, null)`);
    const deleted = await spendInviteOnSignUp(N5, tombRes, "Eve");
    check("a deleted account's late sign-up event spends nothing and recreates nothing", deleted.spent === false && (deleted as { reason?: string }).reason === "deleted"
      && (await stateOf(tombRes)).state === "reserved"
      && Number((await db.execute<{ n: number }>(sql`select (select count(*) from social_profiles where user_id = ${N5}) + (select count(*) from friend_links where user_id = ${N5} or friend_user_id = ${N5}) + (select count(*) from invite_edges where invitee_user_id = ${N5}) as n`)).rows[0].n) === 0);
    await invariant(P, "a refused late spend");

    // Two hand-overs overlap: the second finished (another address proven) while Clerk was asked for the first, so the
    // first loses, revokes what it made and stores nothing.
    const q4 = await showInviteQr(P, SECRET);
    if (!q4.ok) throw new Error("no QR 4");
    const r4 = await idOfToken(q4.token);
    const c4 = await claimInvite(q4.token, "race-a@x.dev", null, { env, mail });
    if (!c4.ok) throw new Error("claim 4 failed");
    await confirmCode(q4.token, lastCode(), c4.claimSecret, { env });
    const raceClerk = stubClerk(() => ({ ok: true, id: "inv_loser", url: "https://accounts.probe/loser" }));
    raceClerk.clerk.create = async (i) => {
      raceClerk.created.push(i);
      // The other hand-over wins while this create is in flight.
      await db.execute(sql`update invite_reservations set email = 'race-b@x.dev', clerk_invitation_id = 'inv_winner' where id = ${r4}`);
      return { ok: true, id: "inv_loser", url: "https://accounts.probe/loser" };
    };
    const overlapped = await handOver(q4.token, c4.claimSecret, { clerk: raceClerk.clerk });
    check("an overlapped hand-over loses: ended, its own invitation revoked, the winner's id kept",
      !overlapped.ok && raceClerk.revoked.includes("inv_loser") && (await stateOf(r4)).clerk === "inv_winner");

    // An indeterminate create whose claim changed meanwhile is ended by the address captured at the time.
    const q6 = await showInviteQr(P, SECRET);
    if (!q6.ok) throw new Error("no QR 6");
    const r6 = await idOfToken(q6.token);
    const c6 = await claimInvite(q6.token, "late-a@x.dev", null, { env, mail });
    if (!c6.ok) throw new Error("claim 6 failed");
    await confirmCode(q6.token, lastCode(), c6.claimSecret, { env });
    const lateClerk = stubClerk(() => ({ ok: false, reason: "indeterminate" }));
    lateClerk.clerk.create = async (i) => {
      lateClerk.created.push(i);
      await db.execute(sql`update invite_reservations set state = 'revoked', email = null, resolved_at = now() where id = ${r6}`);
      return { ok: false, reason: "indeterminate" };
    };
    const lateOut = await handOver(q6.token, c6.claimSecret, { clerk: lateClerk.clerk });
    check("an indeterminate create on a claim that ended meanwhile is reconciled by the captured address",
      !lateOut.ok && lateClerk.revokedFor.filter((r) => r.reservationId === r6 && r.email === "late-a@x.dev").length >= 2);

    // A backlog of refused sends cannot starve a reconcile: each run draws its batch at random.
    const bulk = Array.from({ length: 60 }, (_, i) => `('${Q}', 'email', 'reserved', 'bulk${i}@x.dev', now() + interval '6 days', now() - interval '10 minutes')`).join(", ");
    await db.execute(sql.raw(`insert into invite_reservations (user_id, kind, state, email, holds_until, created_at) values ${bulk}`));
    await db.execute(sql`insert into invite_balances (user_id, held) values (${Q}, 100)`);
    const target = (await db.execute<{ id: string }>(sql`
      insert into invite_reservations (user_id, kind, state, email, holds_until, created_at)
      values (${Q}, 'email', 'reserved', 'target@x.dev', now() + interval '6 days', now() - interval '10 minutes') returning id`)).rows[0].id;
    const bl = stubClerk(() => ({ ok: true, id: "x", url: null }));
    bl.clerk.findFor = async (_e, rid) => ({ ok: true, id: rid === target ? "inv_target" : null });
    let reconciledAt = -1;
    for (let run = 0; run < 25 && reconciledAt < 0; run += 1) {
      await sweepInvites(new Date(), bl.clerk, { senderIds: [Q] });
      if ((await stateOf(target)).clerk === "inv_target") reconciledAt = run + 1;
    }
    check("a backlog over the batch still reaches an indeterminate send", reconciledAt > 0, `after ${reconciledAt} runs`);

    // The purge's Clerk half: the sender's invitations are revoked after it commits, the tree kept with a null side.
    await db.execute(sql`insert into invite_balances (user_id, held) values (${Z}, 3)`);
    await db.execute(sql`
      insert into invite_reservations (user_id, kind, state, holds_until, email, clerk_invitation_id, created_at)
      values (${Z}, 'email', 'reserved', now() + interval '3 days', 'z@x.dev', 'inv_z', now())`);
    await db.execute(sql`
      insert into invite_reservations (user_id, kind, state, holds_until, email, created_at)
      values (${Z}, 'email', 'reserved', now() + interval '3 days', 'z-lost@x.dev', now())`);
    await db.execute(sql`insert into invite_edges (inviter_user_id, invitee_user_id, kind) values (${Z}, ${W}, 'email')`);
    const purgeRevoked: string[] = [];
    const purgeFor: string[] = [];
    const rep = await purgeAccount(Z, {
      revoke: async (id) => { purgeRevoked.push(id); return true; },
      revokeFor: async (email) => { purgeFor.push(email); return true; },
    });
    check("the purge revokes the sender's pending invitation after it commits", purgeRevoked.join() === "inv_z" && rep.invitations.revoked === 3);
    check("…and finds sends by address and reservation too, with or without a stored id, which nothing else could after the purge", purgeFor.slice().sort().join() === "z-lost@x.dev,z@x.dev" && rep.invitations.found === 3);
    check("…and the reservations and balance are gone", Number((await db.execute<{ n: number }>(sql`select (select count(*) from invite_reservations where user_id = ${Z}) + (select count(*) from invite_balances where user_id = ${Z}) as n`)).rows[0].n) === 0);
    const zEdge = (await db.execute<{ inviter: string | null; invitee: string | null }>(sql`select inviter_user_id as inviter, invitee_user_id as invitee from invite_edges where invitee_user_id = ${W}`)).rows;
    check("the tree is kept with the deleted side null", zEdge.length === 1 && zEdge[0].inviter === null && zEdge[0].invitee === W);
    const rep2b = await purgeAccount(Z, { revoke: async () => { throw new Error("must not be asked"); } });
    check("a re-run of the purge asks Clerk for nothing", rep2b.invitations.found === 0);

    const { rows: events } = await db.execute<{ kind: string; n: number }>(sql`
      select kind, count(*)::int as n from admin_events where actor_id = ${ADMIN} group by kind order by kind`);
    const byKind = Object.fromEntries(events.map((e) => [e.kind, e.n]));
    check("history: one line per Set, top-up and revoke",
      byKind.invites_set === 10 && byKind.invites_topped_up === 1 && byKind.invite_revoked === 4, JSON.stringify(byKind));
  } finally {
    await db.execute(sql`delete from admin_events where actor_id in (${ADMIN}, ${ADMIN3})`);
    await db.execute(sql`delete from invite_reservations where user_id in (${S}, ${T}, ${O}, ${K}, ${L}, ${P}, ${Z}, ${Q})`);
    await db.execute(sql`delete from invite_balances where user_id in (${S}, ${T}, ${O}, ${K}, ${L}, ${P}, ${Z}, ${Q})`);
    const pr3 = PR3.map((id) => `'${id}'`).join(", ");
    await db.execute(sql.raw(`delete from invite_edges where inviter_user_id in (${pr3}) or invitee_user_id in (${pr3})`));
    await db.execute(sql.raw(`delete from friend_links where user_id in (${pr3}) or friend_user_id in (${pr3})`));
    await db.execute(sql.raw(`delete from social_profiles where user_id in (${pr3})`));
    await db.execute(sql.raw(`delete from user_data_stamps where user_id in (${pr3})`));
    const { tombstoneHash: th } = await import("../src/lib/account/purge");
    await db.execute(sql`delete from account_tombstones where id_hash = ${th(N5)}`);
    if (groupId) await db.execute(sql`delete from flag_groups where id = ${groupId}`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from invite_reservations where user_id in (${S}, ${T}, ${O}, ${K}, ${L}, ${P}, ${Z}, ${Q}))
        + (select count(*) from invite_balances where user_id in (${S}, ${T}, ${O}, ${K}, ${L}, ${P}, ${Z}, ${Q}))
        + (select count(*) from invite_edges where inviter_user_id = any(${sql.param(PR3)}::text[]) or invitee_user_id = any(${sql.param(PR3)}::text[]))
        + (select count(*) from social_profiles where user_id = any(${sql.param(PR3)}::text[]))
        + (select count(*) from admin_events where actor_id in (${ADMIN}, ${ADMIN3})) as n`);
    check("cleanup left nothing", Number(left[0].n) === 0);
  }
  console.log(failed === 0 ? "\nprobe:invites passed" : `\nprobe:invites FAILED ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
