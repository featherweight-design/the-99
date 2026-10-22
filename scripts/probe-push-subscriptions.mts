// Proves push's device rows and push choices (plan 2026-10-22-push.md, PR 2) against a real database: a device is stored
// once per endpoint and a re-subscribe refreshes it; a browser that signs in as another account takes the row over; a
// reader keeps at most MAX_DEVICES (the oldest go); a removal deletes only the reader's own row; the push choice follows
// the feed's rule (spare-request on by default, a tick stamps it, an unchanged save writes nothing); a NEW feed item
// queues a push through the outbox (only with a device, only for a kind whose push is on and whose stamp is older than the
// item, once per item, with the feed kind off too) and resolves to the same words Home draws; the account purge takes
// every row.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL` reports, and
// never staging, production or local-dev. Its accounts are made-up ids and it removes every row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:push-subscriptions
import { createECDH } from "node:crypto";
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const A = `probe_push_a_${run}`;
const B = `probe_push_b_${run}`;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const point = ecdh.getPublicKey().toString("base64url");
const authKey = Buffer.alloc(16, 9).toString("base64url");
const device = (n: number, tz = "UTC") => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${run}-${n}`, p256dh: point, auth: authKey, userAgent: `probe ${n}`, timeZone: tz });

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:push-subscriptions: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:push-subscriptions: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql, eq, like } = await import("drizzle-orm");
  const { pushSubscriptions, userPrefs } = await import("../src/db/schema");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:push-subscriptions: database reports ${rows[0]?.b}, not ${named}`);

  const { saveDevice, removeDevice, MAX_DEVICES } = await import("../src/lib/push/subscriptions");
  const { setPushKinds, readPushPrefs } = await import("../src/lib/push/prefs");
  const { effectiveKinds } = await import("../src/lib/feed/prefs");
  const count = async (userId: string) => (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId))).length;

  try {
    await saveDevice(A, device(1, "America/Denver"));
    check("a device is stored", (await count(A)) === 1);
    await saveDevice(A, { ...device(1, "Asia/Tokyo"), userAgent: "refreshed" });
    const [row] = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, device(1).endpoint));
    check("a re-subscribe of the same endpoint refreshes it, never adds", (await count(A)) === 1 && row?.timeZone === "Asia/Tokyo" && row?.userAgent === "refreshed");

    await saveDevice(B, device(1));
    check("a browser signing in as another account takes its row over", (await count(A)) === 0 && (await count(B)) === 1);

    check("a removal only deletes the reader's own row", (await removeDevice(A, device(1).endpoint)) === false && (await count(B)) === 1);
    check("the owner's removal deletes it", (await removeDevice(B, device(1).endpoint)) === true && (await count(B)) === 0);

    for (let n = 1; n <= MAX_DEVICES + 3; n++) {
      await saveDevice(A, device(n));
      await db.update(pushSubscriptions).set({ createdAt: new Date(Date.now() - (MAX_DEVICES + 3 - n) * 60_000) }).where(eq(pushSubscriptions.endpoint, device(n).endpoint));
    }
    const kept = (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, A))).map((r) => r.userAgent);
    check(`a reader keeps at most ${MAX_DEVICES}`, kept.length <= MAX_DEVICES, `${kept.length}`);
    check("the oldest go first", !kept.includes("probe 1") && kept.includes(`probe ${MAX_DEVICES + 3}`));

    check("a reader who never chose has spare-request on", (await effectiveKinds(await readPushPrefs(A))).join() === "spare-request");
    check("a first tick writes", (await setPushKinds(A, ["spare-request", "combo"])) === true);
    const prefs = await readPushPrefs(A);
    check("the tick is stamped and the default stays on", prefs.map.combo !== undefined && effectiveKinds(prefs).includes("spare-request"));
    check("an unchanged save writes nothing", (await setPushKinds(A, ["spare-request", "combo"])) === false);
    check("turning the default off declines it", (await setPushKinds(A, ["combo"])) === true && !effectiveKinds(await readPushPrefs(A)).includes("spare-request"));
    const [feed] = await db.select({ feedKinds: userPrefs.feedKinds }).from(userPrefs).where(eq(userPrefs.userId, A));
    check("the feed's own choice is untouched", JSON.stringify(feed?.feedKinds ?? {}) === "{}");

    // The outbox: a new feed item queues a push, and the push resolves to what Home would say.
    const { recordFeedItem } = await import("../src/lib/social/feed-write");
    const { resolvePushItems } = await import("../src/lib/push/resolve");
    const { pushOutbox, feedItems, cards } = await import("../src/db/schema");
    const [card] = await db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards).limit(1);
    const old = "2026-01-01T00:00:00.000Z";
    const now = new Date("2026-10-22T12:00:00.000Z");
    const drop = (userId: string, key: string, at = now) =>
      recordFeedItem(db, { userId, kind: "price-drop", dedupeKey: key, oracleId: card!.oracleId, data: { fromCents: 840, toCents: 510 }, now: at });
    const queued = async (userId: string) => (await db.select().from(pushOutbox).where(eq(pushOutbox.userId, userId))).length;
    const P = `probe_push_p_${run}`; // a device, price-drop push on, the FEED kind off
    const Q = `probe_push_q_${run}`; // the feed kind on, no device
    const R = `probe_push_r_${run}`; // a device, the feed kind on, push off
    await db.insert(userPrefs).values({ userId: P, pushKinds: { "price-drop": old } });
    await db.insert(userPrefs).values({ userId: Q, feedKinds: { "price-drop": old }, pushKinds: { "price-drop": old } });
    await db.insert(userPrefs).values({ userId: R, feedKinds: { "price-drop": old } });
    await saveDevice(P, device(101));
    await saveDevice(R, device(102));

    check("a new item with the push on and a device is written even with the feed kind off", (await drop(P, "k1")) === true);
    check("and queues one push", (await queued(P)) === 1);
    check("a repeat writes nothing and queues nothing more", (await drop(P, "k1")) === false && (await queued(P)) === 1);
    check("an item OLDER than the push stamp queues nothing", (await drop(P, "k-old", new Date("2025-12-01T00:00:00.000Z"))) === false && (await queued(P)) === 1);
    await drop(Q, "k1");
    check("no device, no push (the feed item is still written)", (await queued(Q)) === 0 && (await db.select().from(feedItems).where(eq(feedItems.userId, Q))).length === 1);
    await drop(R, "k1");
    check("a device with the kind's push off queues nothing", (await queued(R)) === 0);

    const [outboxRow] = await db.select().from(pushOutbox).where(eq(pushOutbox.userId, P));
    check("the outbox row's key is the feed item's OPAQUE key, never the writer's dedupe key", /^item:[0-9a-f-]{36}$/.test(outboxRow!.itemKey) && !outboxRow!.itemKey.includes("k1"), outboxRow!.itemKey);
    const resolved = await resolvePushItems(P, [{ kind: "price-drop", key: outboxRow!.itemKey, batch: outboxRow!.batchKey }], process.env, now);
    const item = resolved.items[0];
    check("the push resolves to the card, the two prices and the batch", item?.kind === "price-drop" && item.card === card!.name && item.wasCents === 840 && item.nowCents === 510 && item.batch === outboxRow!.batchKey, JSON.stringify(item));
    const gone = await resolvePushItems(P, [{ kind: "price-drop", key: "item:00000000-0000-0000-0000-000000000000", batch: "b" }], process.env, now);
    check("a key that is not there is dropped, never sent", gone.items.length === 0 && gone.dropped.length === 1);

    // The producers' own eligibility reads include a push-only reader (a device and the kind's push on, the feed kind off).
    const { wishlistItems } = await import("../src/db/schema");
    const { priceDropCandidatesQuery } = await import("../src/lib/feed/price-drop");
    const { comboOnQuery } = await import("../src/lib/feed/combo-writer");
    const { wishedForMatchQuery } = await import("../src/lib/social/trade-match");
    await db.insert(userPrefs).values({ userId: P, pushKinds: { "price-drop": old, combo: old, "trade-match": old } }).onConflictDoUpdate({ target: userPrefs.userId, set: { pushKinds: { "price-drop": old, combo: old, "trade-match": old } } });
    const T = `probe_push_t_${run}`; // no device, no feed kind: wanted by nobody
    await db.insert(userPrefs).values({ userId: T, pushKinds: { "price-drop": old, combo: old, "trade-match": old } });
    for (const u of [P, T]) await db.insert(wishlistItems).values({ userId: u, oracleId: card!.oracleId, quantity: 1, priceAtAddCents: 500 });
    const ids = async (q: ReturnType<typeof priceDropCandidatesQuery>) => (await db.execute<{ user_id: string }>(q)).rows.map((r) => r.user_id);
    const candidates = await ids(priceDropCandidatesQuery());
    check("the price-drop job reads a push-only reader with a device, and not one with no device", candidates.includes(P) && !candidates.includes(T));
    check("the combo writer sees the push-only reader's kind on", (await db.execute(comboOnQuery(P))).rows.length === 1 && (await db.execute(comboOnQuery(T))).rows.length === 0);
    check("the trade-match read keeps a push-only reader's wished cards", (await db.execute(wishedForMatchQuery(P))).rows.length === 1 && (await db.execute(wishedForMatchQuery(T))).rows.length === 0);

    const { purgeAccount } = await import("../src/lib/account/purge");
    await purgeAccount(A);
    check("the account purge takes every device row", (await count(A)) === 0);
  } finally {
    await db.delete(pushSubscriptions).where(like(pushSubscriptions.endpoint, `%${run}-%`));
    await db.execute(sql`delete from push_outbox where user_id like ${`probe_push_%_${run}`}`);
    await db.execute(sql`delete from wishlist_items where user_id like ${`probe_push_%_${run}`}`);
    await db.execute(sql`delete from feed_items where user_id like ${`probe_push_%_${run}`}`);
    await db.delete(userPrefs).where(like(userPrefs.userId, `probe_push_%_${run}`));
    // The user_prefs trigger fires on DELETE too, so a failed run leaves stamp rows behind unless they go as well.
    await db.execute(sql`delete from user_data_stamps where user_id like ${`probe_push_%_${run}`}`);
  }
  if (failed) throw new Error(`${failed} check(s) failed`);
  console.log("\nall checks passed");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
