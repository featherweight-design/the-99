// Proves the sender's invite writes (plan `2026-10-16-invites.md`, PR 2) against a real database: the sender's lock
// (presses at once, one invite), every count, the invariant (`held` ≥ the rows holding) after every write, a Clerk
// refusal answered as a success and kept holding, an indeterminate send kept holding, a live QR re-shown from a
// fresh request with the same token (and to nobody else), an expired QR, an admin Set, a group top-up and a revoke.
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

    const { rows: events } = await db.execute<{ kind: string; n: number }>(sql`
      select kind, count(*)::int as n from admin_events where actor_id = ${ADMIN} group by kind order by kind`);
    const byKind = Object.fromEntries(events.map((e) => [e.kind, e.n]));
    check("history: one line per Set, top-up and revoke",
      byKind.invites_set === 6 && byKind.invites_topped_up === 1 && byKind.invite_revoked === 3, JSON.stringify(byKind));
  } finally {
    await db.execute(sql`delete from admin_events where actor_id = ${ADMIN}`);
    await db.execute(sql`delete from invite_reservations where user_id in (${S}, ${T}, ${O})`);
    await db.execute(sql`delete from invite_balances where user_id in (${S}, ${T}, ${O})`);
    if (groupId) await db.execute(sql`delete from flag_groups where id = ${groupId}`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from invite_reservations where user_id in (${S}, ${T}, ${O}))
        + (select count(*) from invite_balances where user_id in (${S}, ${T}, ${O}))
        + (select count(*) from admin_events where actor_id = ${ADMIN}) as n`);
    check("cleanup left nothing", Number(left[0].n) === 0);
  }
  console.log(failed === 0 ? "\nprobe:invites passed" : `\nprobe:invites FAILED ${failed}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
