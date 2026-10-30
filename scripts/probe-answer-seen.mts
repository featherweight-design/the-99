// pnpm probe:answer-seen: an answer to the reader's own spare request is seen ONE BY ONE (small items item 3, the
// answer sheet over Home, `spare_requests.asker_seen_at`), against a real database:
//   1. two friends answer two of the reader's asks: both answers are unseen, on Your requests, on the Friends badge and
//      on Home's feed;
//   2. opening ONE (`openAnswerAction`'s two calls: `loadAnsweredRequest` by its Home key, then `markAnswerSeen`) leaves
//      the other's diamond, and takes exactly one off the Friends badge and one off Home's count;
//   3. opening it again writes nothing; a stranger's key and the holder's own item name nothing;
//   4. the purge leaves none of it.
// Its accounts are made-up per-run ids, purged in a finally.
//
//   ANSWER_SEEN_PROBE_URL=<scratch branch URL> ANSWER_SEEN_PROBE_BRANCH=br-… pnpm probe:answer-seen

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const BRANCH = process.env.ANSWER_SEEN_PROBE_BRANCH;
const url = process.env.ANSWER_SEEN_PROBE_URL;
if (!url || !BRANCH) throw new Error("probe:answer-seen: set ANSWER_SEEN_PROBE_URL and ANSWER_SEEN_PROBE_BRANCH");
if (PROTECTED.has(BRANCH)) throw new Error(`probe:answer-seen: ${BRANCH} is staging, production or local-dev; it writes`);
// Before any app module loads: `src/db` reads it at import time.
process.env.DATABASE_URL = url;

import { randomUUID } from "node:crypto";

const run = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const A = `probe-as-a-${run}`; // the asker, the reader
const H1 = `probe-as-h1-${run}`; // answers Yes
const H2 = `probe-as-h2-${run}`; // answers No
const ENV = {
  ...process.env, SOCIAL_FRIENDS_ENABLED: "true",
} as NodeJS.ProcessEnv;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

async function main() {
  const { db } = await import("../src/db");
  const { sql } = await import("drizzle-orm");
  const { rows: who } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (who[0]?.b !== BRANCH) throw new Error(`probe:answer-seen: database reports ${who[0]?.b}, not ${BRANCH}; nothing written`);
  console.log(`target ${BRANCH}, asker ${A}, holders ${H1} ${H2}`);

  const sr = await import("../src/lib/social/spare-requests");
  const yr = await import("../src/lib/social/your-requests");
  const friends = await import("../src/lib/social/friends");
  const pods = await import("../src/lib/social/pods");
  const { shareSparesWith } = await import("../src/lib/social/spares");
  const read = await import("../src/lib/feed/read");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { purgeAccount } = await import("../src/lib/account/purge");

  const add = async (u: string, cards: string[]) => {
    const items = await Promise.all(cards.map(async (c) => {
      const { rows } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
        select p.set_code, p.collector_number, p.scryfall_id from printings p where p.oracle_id = ${c} order by p.scryfall_id limit 1`);
      return { oracleId: c, setCode: rows[0].set_code, collectorNumber: rows[0].collector_number, scryfallId: rows[0].scryfall_id,
        finish: "nonfoil" as const, condition: null, quantity: 1 };
    }));
    const result = await applyCollectionChange(u, { kind: "add", items }, { id: randomUUID(), env: ENV });
    if (result.status !== "applied") throw new Error(`add refused: ${result.status}`);
  };
  const itemKeyOf = async (requestId: string) => {
    const { rows } = await db.execute<{ id: string }>(sql`select id from feed_items
      where user_id = ${A} and kind = 'spare-request' and dedupe_key = ${requestId} and data ->> 'answer' is not null`);
    return `item:${rows[0]?.id}`;
  };

  try {
    const { rows: picked } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id)
      order by c.oracle_id limit 2 offset 1200`);
    if (picked.length < 2) throw new Error("fewer than two cards with a printing on this branch");
    const [X, Y] = picked.map((r) => r.oracle_id);

    await friends.ensureProfile(A, "Ann");
    const h1 = await friends.ensureProfile(H1, "Hal");
    const h2 = await friends.ensureProfile(H2, "Hope");
    for (const h of [H1, H2]) {
      const inv = await friends.createInvite(A);
      if (!inv.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(h, inv.token);
    }
    const pod = await pods.createPod(A, "Answer probe");
    if (!pod) throw new Error("createPod refused");
    for (const p of [h1.publicId, h2.publicId]) if (!(await pods.addMember(A, pod.id, p))) throw new Error("addMember refused");
    for (const h of [H1, H2]) if (!(await shareSparesWith(h, pod.id, true))) throw new Error("shareSparesWith refused");
    await add(H1, [X]);
    await add(H2, [Y]);

    console.log("\n1. two answers, both unseen");
    const askX = await sr.askForSpare(A, h1.publicId, X, ENV);
    const askY = await sr.askForSpare(A, h2.publicId, Y, ENV);
    if (!askX.ok || !askY.ok) throw new Error("an ask was refused");
    const rX = (await db.execute<{ id: string }>(sql`select id from spare_requests where asker_user_id = ${A} and oracle_id = ${X}`)).rows[0].id;
    const rY = (await db.execute<{ id: string }>(sql`select id from spare_requests where asker_user_id = ${A} and oracle_id = ${Y}`)).rows[0].id;
    check("Hal answers Yes", (await sr.answerSpareRequest(H1, rX, "yes", ENV)).ok);
    check("Hope answers No", (await sr.answerSpareRequest(H2, rY, "no", ENV)).ok);
    const now = () => new Date();
    const diamonds = async () => new Map((await yr.loadYourRequests(A, ENV, now())).map((r) => [r.id, r.unseen]));
    const before = await diamonds();
    check("both answers carry the diamond on Your requests", before.get(rX) === true && before.get(rY) === true);
    const friendsBefore = await read.unseenFriendsCount(A, ENV, now());
    const homeBefore = await read.unseenCount(A, ENV, now());
    check("the Friends badge counts both", friendsBefore >= 2, `${friendsBefore}`);
    check("Home counts both answer items", homeBefore >= 2, `${homeBefore}`);

    console.log("\n2. opening one");
    const keyX = await itemKeyOf(rX);
    const opened = await yr.loadAnsweredRequest(A, keyX, ENV, now());
    check("the Home key opens Hal's answer as the reader's own row", opened?.id === rX && opened.state === "yes" && opened.unseen === true);
    check("marking it seen writes", await sr.markAnswerSeen(A, rX, ENV, now()));
    const after = await diamonds();
    check("Hal's answer loses its diamond", after.get(rX) === false);
    check("Hope's answer KEEPS its diamond", after.get(rY) === true);
    check("the Friends badge drops by exactly one", (await read.unseenFriendsCount(A, ENV, now())) === friendsBefore - 1);
    check("Home's count drops by exactly one", (await read.unseenCount(A, ENV, now())) === homeBefore - 1);
    const feed = await read.loadFeed(A, ENV, now());
    const unseenOf = (k: string) => feed.find((i) => i.key === k)?.unseen;
    check("Home's feed draws Hal's item seen and Hope's unseen", unseenOf(keyX) === false && unseenOf(await itemKeyOf(rY)) === true);

    console.log("\n3. repeats and strangers");
    check("opening it again writes nothing", !(await sr.markAnswerSeen(A, rX, ENV, now())));
    check("a holder cannot mark the asker's answer", !(await sr.markAnswerSeen(H1, rX, ENV, now())));
    check("another reader's key names nothing", (await yr.loadAnsweredRequest(H1, keyX, ENV, now())) === null);
    check("a key naming no item names nothing", (await yr.loadAnsweredRequest(A, `item:${randomUUID()}`, ENV, now())) === null);
    check("switch off: nothing opens", (await yr.loadAnsweredRequest(A, keyX, { ...ENV, SOCIAL_FRIENDS_ENABLED: "" }, now())) === null);

    console.log("\n4. purge");
    await purgeAccount(A, { stripe: () => null });
    const left = (await db.execute<{ n: number }>(sql`select count(*)::int as n from spare_requests where asker_user_id = ${A}`)).rows[0].n;
    check("the asker's purge deletes every ask, seen marks with them", left === 0, `${left} left`);
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
  }
  console.log(failed === 0 ? "\nall checks passed" : `\n${failed} check(s) FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
