// Proves spare requests (G5; plan `2026-10-22-spare-requests.md`, PR 1) against a REAL schema and the real catalog:
// an ask needs the switch, a friendship and a card the friend offers as a spare; one open ask per card across every
// friend; the holder is told through the feed (when their kind is on); the holder alone answers, once, while the ask
// is open and the friendship stands; a No holds that friend back fourteen days and frees the next one at once; an ask
// past fourteen days reads as expired, cannot be answered, and frees the card; two asks at once let one through; an
// unfriend drops the ask from both sides; the purge deletes both sides.
//
// It WRITES, so it fails closed on its target, as `probe:feed-writers` does: the URL comes from `SPARE_PROBE_URL`
// (never `DATABASE_URL`, which `scripts/lib/env.mjs` would override from `.env`), and `SPARE_PROBE_BRANCH` must equal
// the `neon.branch_id` the database reports before any write. Staging, production and local-dev are refused by id.
// Its accounts are made-up per-run ids, purged in a finally.
//
//   SPARE_PROBE_URL=<scratch branch URL> SPARE_PROBE_BRANCH=br-… pnpm probe:spare-requests

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BRANCH = process.env.SPARE_PROBE_BRANCH;
const url = process.env.SPARE_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:spare-requests: set SPARE_PROBE_URL and SPARE_PROBE_BRANCH");
if (PROTECTED.has(BRANCH)) throw new Error(`probe:spare-requests: ${BRANCH} is staging, production or local-dev; it writes`);
// Before any app module loads: `src/db` reads it at import time.
process.env.DATABASE_URL = url;

import { randomUUID } from "node:crypto";

const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const A = `probe-sr-a-${run}`; // the asker
const H1 = `probe-sr-h1-${run}`; // a holder
const H2 = `probe-sr-h2-${run}`; // another holder
const ENV = { ...process.env, SOCIAL_FRIENDS_ENABLED: "true", SPARE_REQUESTS_ENABLED: "true" } as NodeJS.ProcessEnv;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`probe:spare-requests: database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  console.log(`target ${BRANCH}, asker ${A}, holders ${H1} ${H2}`);

  const sr = await import("../src/lib/social/spare-requests");
  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { shareSparesWith } = await import("../src/lib/social/spares");
  const prefs = await import("../src/lib/feed/prefs");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { purgeAccount } = await import("../src/lib/account/purge");

  type Row = { id: string; holder_user_id: string; status: string; answered_at: string | null };
  const rowsOf = async (asker: string) =>
    (await db.execute<Row>(sql`select id, holder_user_id, status, answered_at::text from spare_requests
      where asker_user_id = ${asker} order by created_at`)).rows;
  const feedOf = async (u: string) =>
    (await db.execute<{ dedupe_key: string; friend_user_id: string; oracle_id: string }>(sql`select dedupe_key, friend_user_id, oracle_id
      from feed_items where user_id = ${u} and kind = 'spare-request' order by created_at`)).rows;
  const printingOf = async (card: string) => {
    const { rows } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
      select p.set_code, p.collector_number, p.scryfall_id from printings p where p.oracle_id = ${card}
      order by p.scryfall_id limit 1`);
    if (!rows[0]) throw new Error(`no printing of ${card}`);
    return { oracleId: card, setCode: rows[0].set_code, collectorNumber: rows[0].collector_number, scryfallId: rows[0].scryfall_id,
      finish: "nonfoil" as const, condition: null, quantity: 1 };
  };
  const add = async (u: string, cards: string[]) => {
    const result = await applyCollectionChange(u, { kind: "add", items: await Promise.all(cards.map(printingOf)) }, { id: randomUUID(), env: ENV });
    if (result.status !== "applied") throw new Error(`add refused: ${result.status}`);
  };

  try {
    // Four ordinary cards with a printing: X, Z and W are held by both holders, Y by nobody.
    const { rows: picked } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id)
      order by c.oracle_id limit 4 offset 1000`);
    if (picked.length < 4) throw new Error("fewer than four cards with a printing on this branch");
    const [X, Y, Z, W] = picked.map((r) => r.oracle_id);

    const a = await friends.ensureProfile(A, "Ann");
    const h1 = await friends.ensureProfile(H1, "Hal");
    const h2 = await friends.ensureProfile(H2, "Hope");
    for (const h of [H1, H2]) {
      const inv = await friends.createInvite(A);
      if (!inv.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(h, inv.token);
    }
    // Ann's pod, the holders in it: Ann is the one friend both holders have.
    const pod = await pods.createPod(A, "Spare probe");
    if (!pod) throw new Error("createPod refused");
    for (const p of [h1.publicId, h2.publicId]) if (!(await pods.addMember(A, pod.id, p))) throw new Error("addMember refused");
    for (const h of [H1, H2]) if (!(await shareSparesWith(h, pod.id, true))) throw new Error("shareSparesWith refused");
    await add(H1, [X, Z, W]);
    await add(H2, [X, Z, W]);
    await prefs.setFeedKinds(H1, ["spare-request"]);

    console.log("\n1. who may ask");
    check("switch off: off", (await sr.askForSpare(A, h1.publicId, X, { ...ENV, SPARE_REQUESTS_ENABLED: "" })).ok === false);
    check("friends off: off", ((r) => !r.ok && r.reason === "off")(await sr.askForSpare(A, h1.publicId, X, { ...ENV, SOCIAL_FRIENDS_ENABLED: "" })));
    check("a stranger's public id: not-friend", ((r) => !r.ok && r.reason === "not-friend")(await sr.askForSpare(A, randomUUID(), X, ENV)));
    check("a card the friend holds no spare of: not-spare", ((r) => !r.ok && r.reason === "not-spare")(await sr.askForSpare(A, h1.publicId, Y, ENV)));
    check("nothing written by a refusal", (await rowsOf(A)).length === 0);

    console.log("\n2. the ask");
    const t0 = new Date();
    const first = await sr.askForSpare(A, h1.publicId, X, ENV, t0);
    check("asking Hal for X lands", first.ok);
    const r1 = first.ok ? first.id : "";
    let rows = await rowsOf(A);
    check("... one open row naming Hal", rows.length === 1 && rows[0].status === "open" && rows[0].holder_user_id === H1, JSON.stringify(rows));
    const told = await feedOf(H1);
    check("Hal (kind on) is told once, keyed on the request, naming Ann", told.length === 1 && told[0].dedupe_key === r1 && told[0].friend_user_id === A && told[0].oracle_id === X, JSON.stringify(told));
    check("asking Hal again: asked", ((r) => !r.ok && r.reason === "asked")(await sr.askForSpare(A, h1.publicId, X, ENV)));
    check("asking Hope for the same card: asked (one friend per card)", ((r) => !r.ok && r.reason === "asked")(await sr.askForSpare(A, h2.publicId, X, ENV)));

    const incoming = await sr.loadIncomingAsks(H1, ENV);
    check("Hal's incoming list holds it, naming Ann by public id, never the Clerk id",
      incoming.length === 1 && incoming[0].id === r1 && incoming[0].asker.publicId === a.publicId && !JSON.stringify(incoming).includes(A));
    let mine = await sr.loadMyAsks(A, ENV);
    check("Ann's list shows it open, naming Hal by public id", mine.length === 1 && mine[0].state === "open" && mine[0].holder.publicId === h1.publicId && !JSON.stringify(mine).includes(H1));

    console.log("\n3. the answer");
    check("Hope cannot answer Hal's ask", ((r) => !r.ok && r.reason === "gone")(await sr.answerSpareRequest(H2, r1, "yes", ENV)));
    check("the asker cannot answer it", ((r) => !r.ok && r.reason === "gone")(await sr.answerSpareRequest(A, r1, "yes", ENV)));
    check("Hal answers No", (await sr.answerSpareRequest(H1, r1, "no", ENV)).ok);
    check("... once: a second answer is gone", ((r) => !r.ok && r.reason === "gone")(await sr.answerSpareRequest(H1, r1, "yes", ENV)));
    rows = await rowsOf(A);
    check("... stored no with its time", rows[0].status === "no" && rows[0].answered_at !== null);
    check("Hal's incoming list is empty", (await sr.loadIncomingAsks(H1, ENV)).length === 0);
    check("after the No, Hal for X: declined", ((r) => !r.ok && r.reason === "declined")(await sr.askForSpare(A, h1.publicId, X, ENV)));
    const second = await sr.askForSpare(A, h2.publicId, X, ENV);
    check("... and Hope may be asked at once", second.ok);
    check("Hope (kind off) is not told", (await feedOf(H2)).length === 0);
    check("Hope answers Yes", second.ok && (await sr.answerSpareRequest(H2, second.id, "yes", ENV)).ok);
    mine = await sr.loadMyAsks(A, ENV);
    check("Ann's list: Hope yes, Hal no", JSON.stringify(mine.map((m) => [m.holder.displayName, m.state])) === JSON.stringify([["Hope", "yes"], ["Hal", "no"]]), JSON.stringify(mine.map((m) => [m.holder.displayName, m.state])));

    console.log("\n4. expiry");
    const z = await sr.askForSpare(A, h1.publicId, Z, ENV);
    check("asking Hal for Z lands", z.ok);
    const zId = z.ok ? z.id : "";
    await db.execute(sql`update spare_requests set created_at = now() - interval '15 days' where id = ${zId}`);
    check("fifteen days on, Hal's list drops it", !(await sr.loadIncomingAsks(H1, ENV)).some((i) => i.id === zId));
    check("... and it cannot be answered", ((r) => !r.ok && r.reason === "gone")(await sr.answerSpareRequest(H1, zId, "yes", ENV)));
    check("... Ann's list reads it expired", (await sr.loadMyAsks(A, ENV)).find((m) => m.id === zId)?.state === "expired");
    const again = await sr.askForSpare(A, h1.publicId, Z, ENV);
    check("Ann may ask Hal for Z again", again.ok);
    check("... the stale row was written expired", (await rowsOf(A)).find((r) => r.id === zId)?.status === "expired");

    console.log("\n5. two asks at once");
    const both = await Promise.all([sr.askForSpare(A, h1.publicId, W, ENV), sr.askForSpare(A, h2.publicId, W, ENV)]);
    check("one lands, the other is asked", both.filter((r) => r.ok).length === 1 && both.some((r) => !r.ok && r.reason === "asked"), JSON.stringify(both));
    check("... one open row for W", (await db.execute<{ n: number }>(sql`select count(*)::int as n from spare_requests where asker_user_id = ${A} and oracle_id = ${W} and status = 'open'`)).rows[0].n === 1);

    console.log("\n6. unfriend");
    const open = (await sr.loadIncomingAsks(H1, ENV)).map((i) => i.id);
    check("Hal holds open asks before the unfriend", open.length >= 1);
    await friends.unfriend(A, h1.publicId);
    check("after it, Hal's list is empty", (await sr.loadIncomingAsks(H1, ENV)).length === 0);
    check("... and none of them can be answered", (await Promise.all(open.map((id) => sr.answerSpareRequest(H1, id, "yes", ENV)))).every((r) => !r.ok));
    check("... and Ann's list no longer names Hal", !(await sr.loadMyAsks(A, ENV)).some((m) => m.holder.publicId === h1.publicId));
    check("... and Ann cannot ask Hal", ((r) => !r.ok && r.reason === "not-friend")(await sr.askForSpare(A, h1.publicId, Y, ENV)));
    check("an open ask to Hal no longer holds Z: Ann may ask Hope for it", (await sr.askForSpare(A, h2.publicId, Z, ENV)).ok);

    console.log("\n7. purge");
    const onHal = (await db.execute<{ n: number }>(sql`select count(*)::int as n from spare_requests where holder_user_id = ${H1}`)).rows[0].n;
    check("Hal holds asks before his purge", onHal > 0, `${onHal}`);
    await purgeAccount(H1, { stripe: () => null });
    check("a holder's purge deletes every ask made of them", (await db.execute<{ n: number }>(sql`select count(*)::int as n from spare_requests where holder_user_id = ${H1}`)).rows[0].n === 0);
    check("... and leaves the asks made of others", (await db.execute<{ n: number }>(sql`select count(*)::int as n from spare_requests where holder_user_id = ${H2}`)).rows[0].n > 0);
    await purgeAccount(A, { stripe: () => null });
    const left = (await db.execute<{ n: number }>(sql`select count(*)::int as n from spare_requests where asker_user_id = ${A} or holder_user_id = ${A}`)).rows[0].n;
    check("the asker's purge deletes every ask on either side", left === 0, `${left} left`);
    check("... and the feed items that named them", (await db.execute<{ n: number }>(sql`select count(*)::int as n from feed_items where friend_user_id = ${A}`)).rows[0].n === 0);
  } finally {
    for (const u of [A, H1, H2]) {
      try {
        await purgeAccount(u, { stripe: () => null });
      } catch (e) {
        console.error(`cleanup: purge of ${u} failed`, e);
      }
    }
    await db.execute(sql`delete from user_prefs where user_id in (${A}, ${H1}, ${H2})`);
    await db.execute(sql`delete from user_data_stamps where user_id in (${A}, ${H1}, ${H2})`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from spare_requests where asker_user_id in (${A}, ${H1}, ${H2}) or holder_user_id in (${A}, ${H1}, ${H2}))
        + (select count(*) from feed_items where user_id in (${A}, ${H1}, ${H2}) or friend_user_id in (${A}, ${H1}, ${H2}))
        + (select count(*) from collection_items where user_id in (${A}, ${H1}, ${H2}))
        + (select count(*) from social_profiles where user_id in (${A}, ${H1}, ${H2}))
        + (select count(*) from friend_links where user_id in (${A}, ${H1}, ${H2}) or friend_user_id in (${A}, ${H1}, ${H2}))
        + (select count(*) from pods where owner_user_id in (${A}, ${H1}, ${H2}))
        as n`);
    check("cleanup: every row this run wrote is gone", Number(left[0]?.n ?? -1) === 0, `${left[0]?.n} rows remain`);
  }
}

main()
  .then(() => {
    console.log(failed === 0 ? "\nprobe:spare-requests: all checks passed" : `\nprobe:spare-requests: ${failed} check(s) FAILED`);
    process.exit(failed === 0 ? 0 : 1);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
