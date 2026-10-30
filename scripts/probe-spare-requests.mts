// Proves spare requests (G5; plan `2026-10-22-spare-requests.md`, PR 1) against a REAL schema and the real catalog:
// an ask needs the switch, a friendship and a card the friend offers as a spare; one open ask per card across every
// friend; the holder is told through the feed (when their kind is on); the holder alone answers, once, while the ask
// is open and the friendship stands; a No holds that friend back fourteen days and frees the next one at once; an ask
// past fourteen days reads as expired, cannot be answered, and frees the card; two asks at once let one through; an
// unfriend drops the ask from both sides; the purge deletes both sides. PR 3a adds: the asker's ✕ (a withdraw that tells
// nobody and holds nothing, and a clear that keeps a No's cooldown), Ask instead as one transaction, copies capped at
// the spare count and a deck stored only when it is the asker's, "no longer spare" on both sides, the spare-request
// kind on by default (a holder with no prefs row is told), and the Shopping read's payload.
// Section 6c: an answer tells the asker in its own transaction (a feed item marked with the answer, its push queued
// when the asker has a device), once, and nothing with the asker's spare-request ticks off.
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
const H3 = `probe-sr-h3-${run}`; // a holder who never touches Settings (G4)
const ENV = { ...process.env, SOCIAL_FRIENDS_ENABLED: "true" } as NodeJS.ProcessEnv;

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
  const { keepCardBack, releaseCard } = await import("../src/lib/social/spare-settings");
  const prefs = await import("../src/lib/feed/prefs");
  const read = await import("../src/lib/feed/read");
  const { applyCollectionChange } = await import("../src/lib/collection/write");
  const { purgeAccount } = await import("../src/lib/account/purge");

  type Row = { id: string; holder_user_id: string; status: string; answered_at: string | null };
  const rowsOf = async (asker: string) =>
    (await db.execute<Row>(sql`select id, holder_user_id, status, answered_at::text from spare_requests
      where asker_user_id = ${asker} order by created_at`)).rows;
  const feedOf = async (u: string) =>
    (await db.execute<{ dedupe_key: string; friend_user_id: string; oracle_id: string }>(sql`select dedupe_key, friend_user_id, oracle_id
      from feed_items where user_id = ${u} and kind = 'spare-request' order by created_at`)).rows;
  const printingOf = async (card: string, quantity = 1) => {
    const { rows } = await db.execute<{ set_code: string; collector_number: string; scryfall_id: string }>(sql`
      select p.set_code, p.collector_number, p.scryfall_id from printings p where p.oracle_id = ${card}
      order by p.scryfall_id limit 1`);
    if (!rows[0]) throw new Error(`no printing of ${card}`);
    return { oracleId: card, setCode: rows[0].set_code, collectorNumber: rows[0].collector_number, scryfallId: rows[0].scryfall_id,
      finish: "nonfoil" as const, condition: null, quantity };
  };
  const add = async (u: string, cards: string[], quantity = 1) => {
    const items = await Promise.all(cards.map((c) => printingOf(c, quantity)));
    const result = await applyCollectionChange(u, { kind: "add", items }, { id: randomUUID(), env: ENV });
    if (result.status !== "applied") throw new Error(`add refused: ${result.status}`);
  };

  try {
    // Ten ordinary cards with a printing: X, Z, W, U and T are held by Hal and Hope, V, S (two copies) and R by Hope
    // alone, T and Q by Ida, Y by nobody.
    const { rows: picked } = await db.execute<{ oracle_id: string }>(sql`
      select c.oracle_id from cards c where exists (select 1 from printings p where p.oracle_id = c.oracle_id)
      order by c.oracle_id limit 10 offset 1000`);
    if (picked.length < 10) throw new Error("fewer than ten cards with a printing on this branch");
    const [X, Y, Z, W, V, U, T, S, R, Q] = picked.map((r) => r.oracle_id);

    const a = await friends.ensureProfile(A, "Ann");
    const h1 = await friends.ensureProfile(H1, "Hal");
    const h2 = await friends.ensureProfile(H2, "Hope");
    const h3 = await friends.ensureProfile(H3, "Ida");
    for (const h of [H1, H2, H3]) {
      const inv = await friends.createInvite(A);
      if (!inv.ok) throw new Error("createInvite refused");
      await friends.redeemInvite(h, inv.token);
    }
    // Ann's pod, the holders in it: Ann is the one friend both holders have.
    const pod = await pods.createPod(A, "Spare probe");
    if (!pod) throw new Error("createPod refused");
    for (const p of [h1.publicId, h2.publicId, h3.publicId]) if (!(await pods.addMember(A, pod.id, p))) throw new Error("addMember refused");
    for (const h of [H1, H2, H3]) if (!(await shareSparesWith(h, pod.id, true))) throw new Error("shareSparesWith refused");
    await add(H1, [X, Z, W, U, T]);
    await add(H2, [X, Z, W, V, U, T, R]);
    await add(H2, [S], 2);
    await add(H3, [T, Q]);
    // Hal keeps the default (spare-request on, G4); Hope turns it OFF, so her early asks write her nothing.
    await prefs.setFeedKinds(H1, ["spare-request"]);
    check("Hope turning the default-on kind off writes", await prefs.setFeedKinds(H2, []));

    console.log("\n1. who may ask");
    check("switch off: off", (await sr.askForSpare(A, h1.publicId, X, { ...ENV, SOCIAL_FRIENDS_ENABLED: "" })).ok === false);
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
    check("Hope (kind turned off) is not told", (await feedOf(H2)).length === 0);
    check("Hope answers Yes", second.ok && (await sr.answerSpareRequest(H2, second.id, "yes", ENV)).ok);
    mine = await sr.loadMyAsks(A, ENV);
    check("Ann's list: Hope yes, Hal no", JSON.stringify(mine.map((m) => [m.holder.displayName, m.state])) === JSON.stringify([[{ $tp: "Hope" }, "yes"], [{ $tp: "Hal" }, "no"]]), JSON.stringify(mine.map((m) => [m.holder.displayName, m.state])));

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

    // An ask waits for another decision on the same asker and card: hold the lock, the ask must not finish until it goes.
    let release!: () => void;
    const held = new Promise<void>((r) => { release = r; });
    let locked!: () => void;
    const isLocked = new Promise<void>((r) => { locked = r; });
    const holder = db.transaction(async (tx) => {
      await tx.execute(sr.askLockQuery(A, W));
      locked();
      await held;
    });
    await isLocked;
    let settled = false;
    const waiting = sr.askForSpare(A, h2.publicId, W, ENV).then((r) => { settled = true; return r; });
    await new Promise((r) => setTimeout(r, 1500));
    check("an ask waits while another decision on the same asker and card holds the lock", !settled);
    release();
    await holder;
    check("... and is decided once it goes (W already has its open ask)", ((r) => !r.ok && r.reason === "asked")(await waiting));

    console.log("\n6. the feed and the Friends badge (plan PR 2)");
    const FEED = { ...ENV } as NodeJS.ProcessEnv;
    await prefs.setFeedKinds(H2, ["spare-request"]);
    check("the kind is offered with the switch on", (await import("../src/lib/feed/flag")).availableFeedKinds(FEED).includes("spare-request"));
    const waitingBefore = await sr.waitingAsksCount(H2, FEED);
    check("Hope's waiting count is her incoming list", waitingBefore === (await sr.loadIncomingAsks(H2, FEED)).length, `${waitingBefore}`);
    const v = await sr.askForSpare(A, h2.publicId, V, FEED);
    check("asking Hope for V lands", v.ok);
    let hopeFeed = await read.loadFeed(H2, FEED);
    check("Hope's feed carries it, naming Ann by public id", hopeFeed.some((i) => i.kind === "spare-request" && "friend" in i && i.friend?.publicId === a.publicId && !JSON.stringify(i).includes(A)));
    check("... and Home's badge counts it", (await read.unseenCount(H2, FEED)) >= 1);
    check("Hope's waiting count rises by one", (await sr.waitingAsksCount(H2, FEED)) === waitingBefore + 1);
    check("... and is not cleared by a /friends visit", (await prefs.markFriendsSeen(H2, FEED), (await sr.waitingAsksCount(H2, FEED)) === waitingBefore + 1));
    check("Hope answers Yes", v.ok && (await sr.answerSpareRequest(H2, v.id, "yes", FEED)).ok);
    hopeFeed = await read.loadFeed(H2, FEED);
    // Her only spare-request item is V's: every earlier ask of her was made while her kind was off.
    check("the answered ask leaves Hope's feed with no write", !hopeFeed.some((i) => i.kind === "spare-request"));
    check("... and her waiting count", (await sr.waitingAsksCount(H2, FEED)) === waitingBefore);
    const prefsRow = (await db.execute<{ n: number }>(sql`select count(*)::int as n from user_prefs where user_id = ${A}`)).rows[0].n;
    check("Ann has no prefs row (the upsert path)", prefsRow === 0, `${prefsRow}`);
    const answered = (await sr.loadMyAsks(A, FEED)).filter((m) => m.state === "yes" || m.state === "no").length;
    check("Ann's unseen answers are every answer she can see", (await sr.unseenAnswersCount(A, FEED)) === answered && answered >= 2, `${answered}`);
    check("... and the Friends badge counts them", (await read.unseenFriendsCount(A, FEED)) >= answered);
    check("a /friends visit marks them seen", await prefs.markFriendsSeen(A, FEED));
    check("... the count is zero", (await sr.unseenAnswersCount(A, FEED)) === 0);
    check("... and a second visit writes nothing", !(await prefs.markFriendsSeen(A, FEED)));

    console.log("\n6c. the answer tells the asker (feed item and push, in the answer's transaction)");
    type Told = { id: string; kind: string; friend_user_id: string | null; oracle_id: string; data: { answer?: string } };
    const toldOf = async (asker: string, requestId: string) =>
      (await db.execute<Told>(sql`select id, kind, friend_user_id, oracle_id, data from feed_items
        where user_id = ${asker} and kind = 'spare-request' and dedupe_key = ${requestId}`)).rows;
    const outboxOf = async (asker: string, itemId: string) =>
      (await db.execute<{ n: number }>(sql`select count(*)::int as n from push_outbox
        where user_id = ${asker} and kind = 'spare-request' and item_key = ${`item:${itemId}`}`)).rows[0].n;
    const vTold = v.ok ? await toldOf(A, v.id) : [];
    check("Hope's Yes wrote Ann ONE spare-request item, keyed on the request, marked yes, naming Hope and the card",
      vTold.length === 1 && vTold[0].data.answer === "yes" && vTold[0].friend_user_id === H2 && vTold[0].oracle_id === V, JSON.stringify(vTold));
    check("... with no device, no push was queued", vTold.length === 1 && (await outboxOf(A, vTold[0].id)) === 0);
    const annFeed = await read.loadFeed(A, FEED);
    const vItem = annFeed.find((i) => i.key === `item:${vTold[0]?.id}`);
    check("... Ann's feed reads it as an answer, never naming Hope's Clerk id", vItem?.kind === "spare-request" && "answer" in vItem && vItem.answer === "yes"
      && !JSON.stringify(vItem).includes(H2));
    check("... it never leads Home and does not wait on Ann", (await import("../src/lib/feed/kinds")).leadStory(annFeed.filter((i) => i.key === vItem?.key)) === null);
    check("... and Home's badge counts it", (await read.unseenCount(A, FEED)) >= 1);
    check("a second answer to the same ask is gone, and writes Ann nothing more", v.ok
      && ((r) => !r.ok)(await sr.answerSpareRequest(H2, v.id, "no", FEED)) && (await toldOf(A, v.id)).length === 1);
    await db.execute(sql`insert into push_subscriptions (user_id, endpoint, p256dh, auth)
      values (${A}, ${`https://push.example.invalid/${run}`}, 'p', 'a')`);

    console.log("\n6a. withdraw and clear (G1)");
    const FEEDU = { ...ENV } as NodeJS.ProcessEnv;
    const hasAsk = async (u: string, card: string) =>
      (await read.loadFeed(u, FEEDU)).some((i) => i.kind === "spare-request" && "oracleId" in i && i.oracleId === card);
    const halWaiting = await sr.waitingAsksCount(H1, FEEDU);
    const u1 = await sr.askForSpare(A, h1.publicId, U, FEEDU);
    check("Ann asks Hal for U", u1.ok);
    const u1Id = u1.ok ? u1.id : "";
    check("... Hal's list, badge and feed carry it", (await sr.loadIncomingAsks(H1, FEEDU)).some((i) => i.id === u1Id)
      && (await sr.waitingAsksCount(H1, FEEDU)) === halWaiting + 1 && (await hasAsk(H1, U)));
    check("Ann's ✕ on the open ask withdraws it", JSON.stringify(await sr.closeSpareRequest(A, u1Id, FEEDU)) === JSON.stringify({ ok: true, closed: "withdrawn" }));
    check("... stored withdrawn", (await rowsOf(A)).find((r) => r.id === u1Id)?.status === "withdrawn");
    check("... it leaves Hal's list, his badge and his feed, with nothing written to him",
      !(await sr.loadIncomingAsks(H1, FEEDU)).some((i) => i.id === u1Id) && (await sr.waitingAsksCount(H1, FEEDU)) === halWaiting && !(await hasAsk(H1, U)));
    check("... and Ann's own list", !(await sr.loadMyAsks(A, FEEDU)).some((m) => m.id === u1Id));
    check("... Hal cannot answer it", ((r) => !r.ok && r.reason === "gone")(await sr.answerSpareRequest(H1, u1Id, "yes", FEEDU)));
    const u2 = await sr.askForSpare(A, h1.publicId, U, FEEDU);
    check("a withdrawn ask holds nothing: Ann may ask Hal again at once", u2.ok);
    const u2Id = u2.ok ? u2.id : "";
    check("Hal answers No", (await sr.answerSpareRequest(H1, u2Id, "no", FEEDU)).ok);
    const u2Told = await toldOf(A, u2Id);
    check("... Ann is told the No, and with a device now, its push is queued in the same write",
      u2Told.length === 1 && u2Told[0].data.answer === "no" && (await outboxOf(A, u2Told[0].id)) === 1, JSON.stringify(u2Told));
    check("Ann's ✕ on the answered ask clears it", JSON.stringify(await sr.closeSpareRequest(A, u2Id, FEEDU)) === JSON.stringify({ ok: true, closed: "cleared" }));
    check("... it leaves her list", !(await sr.loadMyAsks(A, FEEDU)).some((m) => m.id === u2Id));
    check("... the row stays, a No, cleared", await (async () => {
      const r = (await db.execute<{ status: string; c: string | null }>(sql`select status, asker_cleared_at::text as c from spare_requests where id = ${u2Id}`)).rows[0];
      return r?.status === "no" && r.c !== null;
    })());
    check("... and still holds Hal back: declined", ((r) => !r.ok && r.reason === "declined")(await sr.askForSpare(A, h1.publicId, U, FEEDU)));
    check("a second ✕ on it is gone", ((r) => !r.ok && r.reason === "gone")(await sr.closeSpareRequest(A, u2Id, FEEDU)));
    check("someone else's ✕ on Ann's ask is gone", ((r) => !r.ok && r.reason === "gone")(await sr.closeSpareRequest(H1, u2Id, FEEDU)));

    console.log("\n6b. Ask instead (G1, one transaction)");
    const tNo = await sr.askForSpare(A, h2.publicId, T, FEEDU);
    // Ann turns the kind off for both the feed and push: the answer still lands, and tells her nothing.
    const { setPushKinds } = await import("../src/lib/push/prefs");
    await prefs.setFeedKinds(A, []);
    await setPushKinds(A, []);
    const annOutbox = async () => (await db.execute<{ n: number }>(sql`select count(*)::int as n from push_outbox where user_id = ${A}`)).rows[0].n;
    const outboxBefore = await annOutbox();
    check("Ann asks Hope for T and Hope says No", tNo.ok && (await sr.answerSpareRequest(H2, tNo.id, "no", FEEDU)).ok);
    check("... with Ann's spare-request tick off on both, no item and no push", tNo.ok && (await toldOf(A, tNo.id)).length === 0
      && (await annOutbox()) === outboxBefore);
    await prefs.setFeedKinds(A, ["spare-request"]);
    await setPushKinds(A, ["spare-request"]);
    const t1 = await sr.askForSpare(A, h1.publicId, T, FEEDU);
    check("Ann asks Hal for T", t1.ok);
    const t1Id = t1.ok ? t1.id : "";
    const stillOpen = async () => (await rowsOf(A)).find((r) => r.id === t1Id)?.status === "open";
    await keepCardBack(H3, T);
    check("Ask instead to a friend offering no spare of T (Ida keeps hers back): not-spare", ((r) => !r.ok && r.reason === "not-spare")(await sr.askInsteadForSpare(A, t1Id, h3.publicId, T, FEEDU)));
    await releaseCard(H3, T);
    check("... the first ask is still open", await stillOpen());
    check("Ask instead to a stranger: not-friend", ((r) => !r.ok && r.reason === "not-friend")(await sr.askInsteadForSpare(A, t1Id, randomUUID(), T, FEEDU)));
    check("Ask instead to Hope inside her No's cooldown: declined, refused INSIDE the transaction after the withdraw",
      ((r) => !r.ok && r.reason === "declined")(await sr.askInsteadForSpare(A, t1Id, h2.publicId, T, FEEDU)));
    check("... the withdraw rolled back: the first ask is still open, and still Hal's to answer", (await stillOpen())
      && (await sr.loadIncomingAsks(H1, FEEDU)).some((i) => i.id === t1Id));
    check("Ask instead to Hal himself: gone (it is not another friend)", ((r) => !r.ok && r.reason === "gone")(await sr.askInsteadForSpare(A, t1Id, h1.publicId, T, FEEDU)));
    check("... still open", await stillOpen());
    const idaFeedBefore = (await feedOf(H3)).length;
    const t2 = await sr.askInsteadForSpare(A, t1Id, h3.publicId, T, FEEDU);
    check("Ask instead to Ida lands", t2.ok);
    rows = await rowsOf(A);
    check("... the first is withdrawn and one open ask for T names Ida",
      rows.find((r) => r.id === t1Id)?.status === "withdrawn" && rows.filter((r) => r.status === "open" && t2.ok && r.id === t2.id && r.holder_user_id === H3).length === 1);
    check("... Hal's list drops the first", !(await sr.loadIncomingAsks(H1, FEEDU)).some((i) => i.id === t1Id));
    check("Ask instead from an ask no longer open: gone", ((r) => !r.ok && r.reason === "gone")(await sr.askInsteadForSpare(A, t1Id, h3.publicId, T, FEEDU)));

    console.log("\n6c. G4: a holder who never chose is told");
    const idaPrefs = async () => (await db.execute<{ d: string[] | null }>(sql`select feed_kinds_declined as d from user_prefs where user_id = ${H3}`)).rows[0];
    check("Ida has no prefs row", (await idaPrefs()) === undefined);
    check("... yet the ask wrote her feed item (spare-request on by default)", (await feedOf(H3)).length === idaFeedBefore + 1);
    check("... her feed reads it, and Home's badge counts it", (await hasAsk(H3, T)) && (await read.unseenCount(H3, FEEDU)) >= 1);
    check("... Settings reads the kind on", (await prefs.loadNewsSettings(H3, FEEDU)).some((n) => n.kind === "spare-request" && n.on));
    check("a Home visit marks it seen with no prefs row (the upsert)", await prefs.markFeedSeen(H3, FEEDU));
    check("... the count is zero, and a second visit writes nothing", (await read.unseenCount(H3, FEEDU)) === 0 && !(await prefs.markFeedSeen(H3, FEEDU)));
    check("Ida turning it off writes", await prefs.setFeedKinds(H3, [], new Date(), ["spare-request"]));
    check("... into feed_kinds_declined", JSON.stringify((await idaPrefs())?.d) === JSON.stringify(["spare-request"]));
    check("... Settings reads it off, and her feed drops the item", !(await prefs.loadNewsSettings(H3, FEEDU)).some((n) => n.kind === "spare-request" && n.on) && !(await hasAsk(H3, T)));
    const q1 = await sr.askForSpare(A, h3.publicId, Q, FEEDU);
    check("Ann asks Ida for Q while it is off: no item is written", q1.ok && (await feedOf(H3)).length === idaFeedBefore + 1);
    check("... yet Waiting on you still holds it", (await sr.loadIncomingAsks(H3, FEEDU)).some((i) => q1.ok && i.id === q1.id));
    check("Ida turning it on again writes", await prefs.setFeedKinds(H3, ["spare-request"], new Date(), ["spare-request"]));
    check("... no backfill: neither T's item from before nor Q's from while it was off", !(await hasAsk(H3, T)) && !(await hasAsk(H3, Q)));
    check("Ann withdraws Q and asks again", q1.ok && (await sr.closeSpareRequest(A, q1.id, FEEDU)).ok && (await sr.askForSpare(A, h3.publicId, Q, FEEDU)).ok);
    check("... the new ask reaches Ida's feed", await hasAsk(H3, Q));

    console.log("\n6d. copies and deck (G2)");
    const deckOf = async (u: string, name: string) => (await db.execute<{ id: string }>(sql`
      insert into decks (user_id, name, commander_oracle_id) values (${u}, ${name}, ${Y}) returning id`)).rows[0].id;
    const annDeck = await deckOf(A, "Probe dragons");
    const hopeDeck = await deckOf(H2, "Hope's deck");
    const copiesOf = async (id: string) => (await db.execute<{ copies: number; deck_id: string | null }>(sql`
      select copies, deck_id from spare_requests where id = ${id}`)).rows[0];
    const s1 = await sr.askForSpare(A, h2.publicId, S, FEEDU, new Date(), { copies: 5, deckId: annDeck });
    check("Ann asks Hope for 5 of S for her deck", s1.ok);
    const s1Row = s1.ok ? await copiesOf(s1.id) : undefined;
    check("... copies capped at Hope's spare count (2), the deck stored", s1Row?.copies === 2 && s1Row.deck_id === annDeck, JSON.stringify(s1Row));
    const hopeSees = (await sr.loadIncomingAsks(H2, FEEDU)).find((i) => s1.ok && i.id === s1.id);
    check("... Hope's row draws the card, 2 copies, Ann's deck name, her own spare count, Ann's face",
      hopeSees?.copies === 2 && JSON.stringify(hopeSees.deckName).includes("Probe dragons") && hopeSees.spare === 2 && hopeSees.card.name.length > 0
      && hopeSees.asker.publicId === a.publicId && "commander" in hopeSees.asker && hopeSees.daysLeft === 14, JSON.stringify(hopeSees));
    check("Ann withdraws it", s1.ok && (await sr.closeSpareRequest(A, s1.id, FEEDU)).ok);
    const s2 = await sr.askForSpare(A, h2.publicId, S, FEEDU, new Date(), { copies: "lots", deckId: hopeDeck });
    const s2Row = s2.ok ? await copiesOf(s2.id) : undefined;
    check("an ask naming SOMEONE ELSE's deck lands with no deck, and junk copies read 1", s2.ok && s2Row?.deck_id === null && s2Row.copies === 1, JSON.stringify(s2Row));
    check("Ann withdraws it", s2.ok && (await sr.closeSpareRequest(A, s2.id, FEEDU)).ok);
    const s3 = await sr.askForSpare(A, h2.publicId, S, FEEDU, new Date(), { copies: 0, deckId: "not-a-deck" });
    const s3Row = s3.ok ? await copiesOf(s3.id) : undefined;
    check("an ask naming a non-id deck lands with no deck, and 0 copies read 1", s3.ok && s3Row?.deck_id === null && s3Row.copies === 1, JSON.stringify(s3Row));

    console.log("\n6e. no longer spare (G3)");
    const rr = await sr.askForSpare(A, h2.publicId, R, FEEDU);
    check("Ann asks Hope for R", rr.ok);
    const rrId = rr.ok ? rr.id : "";
    const hopeWaiting = await sr.waitingAsksCount(H2, FEEDU);
    check("... it waits on Hope", (await sr.loadIncomingAsks(H2, FEEDU)).some((i) => i.id === rrId) && hopeWaiting >= 1);
    check("... Ann reads it open", (await sr.loadMyAsks(A, FEEDU)).find((m) => m.id === rrId)?.state === "open");
    await keepCardBack(H2, R);
    check("Hope keeps R back: it leaves her Waiting on you", !(await sr.loadIncomingAsks(H2, FEEDU)).some((i) => i.id === rrId));
    check("... and her badge, the two agreeing", (await sr.waitingAsksCount(H2, FEEDU)) === hopeWaiting - 1
      && (await sr.waitingAsksCount(H2, FEEDU)) === (await sr.loadIncomingAsks(H2, FEEDU)).length);
    check("... Ann reads it No longer spare", (await sr.loadMyAsks(A, FEEDU)).find((m) => m.id === rrId)?.state === "unavailable");
    await releaseCard(H2, R);
    check("Hope releases R: it is back on both sides", (await sr.loadIncomingAsks(H2, FEEDU)).some((i) => i.id === rrId)
      && (await sr.loadMyAsks(A, FEEDU)).find((m) => m.id === rrId)?.state === "open");
    check("an ask for a card Ann's lists no longer want reads No longer needed",
      (await sr.loadMyAsks(A, FEEDU, new Date(), { stillNeeded: new Set([X]) })).find((m) => m.id === rrId)?.state === "unneeded");
    check("... and open while they still do", (await sr.loadMyAsks(A, FEEDU, new Date(), { stillNeeded: new Set([R]) })).find((m) => m.id === rrId)?.state === "open");

    console.log("\n6f. the Shopping read (GET /api/spare-requests, its loader)");
    const lines = await sr.loadAskStates(A, [U, T, S, R, Q, Y], FEEDU);
    const keys = ["answeredAt", "createdAt", "daysLeft", "holder", "id", "oracleId", "state"];
    check("every line carries exactly the payload's fields, the holder as public id and name",
      !!lines && lines.length > 0 && lines.every((l) => JSON.stringify(Object.keys(l).sort()) === JSON.stringify(keys)
        && JSON.stringify(Object.keys(l.holder).sort()) === JSON.stringify(["displayName", "publicId"])), JSON.stringify(lines?.[0]));
    check("... never a Clerk id", !!lines && ![A, H1, H2, H3].some((u) => JSON.stringify(lines).includes(u)));
    // A cleared No inside its cooldown STAYS in this read (`keepClearedDeclines`, #2221): the modal draws Declined, not an
    // Ask the write would refuse. Only Your requests leaves it out.
    check("... no withdrawn ask, a cleared No kept as Declined while it holds the friend back, and open asks with their days left", !!lines
      && !lines.some((l) => l.id === u1Id || l.id === t1Id)
      && lines.find((l) => l.id === u2Id)?.state === "no"
      && lines.filter((l) => l.state === "open").every((l) => typeof l.daysLeft === "number")
      && lines.some((l) => l.oracleId === R && l.state === "open"), JSON.stringify(lines?.map((l) => [l.oracleId.slice(0, 4), l.state])));
    check("... refuses a batch past the cap before reading", (await sr.loadAskStates(A, Array(201).fill(U), FEEDU)) === null);

    console.log("\n7. unfriend");
    const open = (await sr.loadIncomingAsks(H1, ENV)).map((i) => i.id);
    check("Hal holds open asks before the unfriend", open.length >= 1);
    await friends.unfriend(A, h1.publicId);
    check("after it, Hal's list is empty", (await sr.loadIncomingAsks(H1, ENV)).length === 0);
    check("... and none of them can be answered", (await Promise.all(open.map((id) => sr.answerSpareRequest(H1, id, "yes", ENV)))).every((r) => !r.ok));
    check("... and Ann's list no longer names Hal", !(await sr.loadMyAsks(A, ENV)).some((m) => m.holder.publicId === h1.publicId));
    check("... and Ann cannot ask Hal", ((r) => !r.ok && r.reason === "not-friend")(await sr.askForSpare(A, h1.publicId, Y, ENV)));
    check("an open ask to Hal no longer holds Z: Ann may ask Hope for it", (await sr.askForSpare(A, h2.publicId, Z, ENV)).ok);

    console.log("\n8. purge");
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
    for (const u of [A, H1, H2, H3]) {
      try {
        await purgeAccount(u, { stripe: () => null });
      } catch (e) {
        console.error(`cleanup: purge of ${u} failed`, e);
      }
    }
    await db.execute(sql`delete from user_prefs where user_id in (${A}, ${H1}, ${H2}, ${H3})`);
    await db.execute(sql`delete from user_data_stamps where user_id in (${A}, ${H1}, ${H2}, ${H3})`);
    const { rows: left } = await db.execute<{ n: number }>(sql`
      select (select count(*) from spare_requests where asker_user_id in (${A}, ${H1}, ${H2}, ${H3}) or holder_user_id in (${A}, ${H1}, ${H2}, ${H3}))
        + (select count(*) from feed_items where user_id in (${A}, ${H1}, ${H2}, ${H3}) or friend_user_id in (${A}, ${H1}, ${H2}, ${H3}))
        + (select count(*) from collection_items where user_id in (${A}, ${H1}, ${H2}, ${H3}))
        + (select count(*) from social_profiles where user_id in (${A}, ${H1}, ${H2}, ${H3}))
        + (select count(*) from friend_links where user_id in (${A}, ${H1}, ${H2}, ${H3}) or friend_user_id in (${A}, ${H1}, ${H2}, ${H3}))
        + (select count(*) from pods where owner_user_id in (${A}, ${H1}, ${H2}, ${H3}))
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
