// Proves the push flush (plan 2026-10-22-push.md, PR 3b) against a real database with a FAKE sender, so nothing leaves the
// machine: a live push goes once and its row is settled; the same flush sends nothing twice; a device inside its held hours
// gets nothing and the row waits, then the morning release sends one push per kind; a device the push service answers 410
// for is deleted; a transient failure leaves the row for the next run and keeps the sends that already went (recorded in the
// database as each goes); a row whose kind was unticked, or stamped again after the event, while it waited is abandoned; one
// reader's rows cannot crowd the others out of a run; a reader with no
// device, the switch off, or a row that no longer resolves is abandoned, never sent; a device that subscribed after an
// event never gets it; a row a week old is pruned.
//
// It WRITES, so it fails closed on its target: `PROBE_DB_BRANCH` must name the Neon branch `DATABASE_URL` reports, and never
// staging, production or local-dev. Its accounts are made-up ids and it removes every row it wrote, in a finally.
//
//   PROBE_DB_BRANCH=br-… pnpm probe:push-flush
import { createECDH } from "node:crypto";
import "./lib/env.mjs";

const PROTECTED = new Set(["br-polished-pond-a6e63y0b", "br-noisy-violet-a6vw4ess", "br-patient-hall-a6nbonvo"]);
const run = Date.now().toString(36);
const U = (n: string) => `probe_flush_${n}_${run}`;

let failed = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail ? ` (${detail})` : ""}`);
  if (!ok) failed++;
};

const ecdh = createECDH("prime256v1");
ecdh.generateKeys();
const point = ecdh.getPublicKey().toString("base64url");
const authKey = Buffer.alloc(16, 9).toString("base64url");
const endpoint = (n: string) => `https://fcm.googleapis.com/fcm/send/${run}-${n}`;

async function main() {
  const named = process.env.PROBE_DB_BRANCH;
  if (!named) throw new Error("probe:push-flush: set PROBE_DB_BRANCH");
  if (PROTECTED.has(named)) throw new Error(`probe:push-flush: ${named} is staging, production or local-dev; it writes`);
  const { db } = await import("../src/db");
  const { sql, eq, like } = await import("drizzle-orm");
  const { pushOutbox, pushSubscriptions, userPrefs, cards } = await import("../src/db/schema");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:push-flush: database reports ${rows[0]?.b}, not ${named}`);

  const { flushPush } = await import("../src/lib/push/flush");
  const { recordFeedItem } = await import("../src/lib/social/feed-write");
  const [card] = await db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards).limit(1);
  const config = { publicKey: "pub", privateKey: "priv", subject: "mailto:probe@example.com" };
  const sent: { endpoint: string; payload: Record<string, unknown> }[] = [];
  let mode: "ok" | "gone" | "busy" = "ok";
  const send = async (t: { endpoint: string }, payload: string) => {
    if (mode === "busy") return { ok: false as const, gone: false, status: 503 };
    if (mode === "gone") return { ok: false as const, gone: true, status: 410 };
    sent.push({ endpoint: t.endpoint, payload: JSON.parse(payload) });
    return { ok: true as const };
  };
  const on = { PUSH_ENABLED: "true", HOME_FEED_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const off = { PUSH_ENABLED: "false", HOME_FEED_ENABLED: "true", SOCIAL_WISHLIST_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
  const stamp = "2026-01-01T00:00:00.000Z";
  // NY is UTC-4 in October: 12:00 local = 16:00Z; 23:00 local = 03:00Z next day; 09:05 local = 13:05Z.
  const DAY = new Date("2026-10-22T16:00:00.000Z");
  const dropAt = (userId: string, key: string, at: Date, batch?: string) =>
    recordFeedItem(db, { userId, kind: "price-drop", dedupeKey: key, oracleId: card!.oracleId, data: { fromCents: 840, toCents: 510 }, now: at, batchKey: batch });
  const flush = (now: Date, env = on) => flushPush({ config, now, send: send as never, resolveEnv: async () => env });
  const outbox = async (userId: string) => db.select().from(pushOutbox).where(eq(pushOutbox.userId, userId));
  const device = async (userId: string, n: string, tz: string, createdAt = new Date("2026-10-01T00:00:00.000Z")) => {
    await db.insert(pushSubscriptions).values({ userId, endpoint: endpoint(n), p256dh: point, auth: authKey, userAgent: "probe", timeZone: tz, createdAt });
  };
  const reader = async (userId: string) => db.insert(userPrefs).values({ userId, pushKinds: { "price-drop": stamp } });

  try {
    // 1. A live push goes once.
    const A = U("a");
    await reader(A); await device(A, "a", "America/New_York");
    await dropAt(A, "k1", new Date("2026-10-22T15:00:00.000Z"));
    sent.length = 0;
    const r1 = await flush(DAY);
    check("a daytime item goes out once, with the feed's own words", sent.length === 1 && sent[0]!.payload.tag === "price-drop" && String(sent[0]!.payload.title).includes(card!.name), JSON.stringify(r1));
    check("its row is settled", (await outbox(A))[0]?.sentAt != null);
    sent.length = 0;
    await flush(DAY);
    check("the next flush sends nothing twice", sent.length === 0);

    // 2. Held at night, released in the morning, one per kind.
    const B = U("b");
    await reader(B); await device(B, "b", "America/New_York");
    await dropAt(B, "n1", new Date("2026-10-22T03:00:00.000Z"), "run-1");
    await dropAt(B, "n2", new Date("2026-10-22T08:00:00.000Z"), "run-2");
    sent.length = 0;
    const night = await flush(new Date("2026-10-22T09:00:00.000Z"));
    check("inside the device's held hours nothing goes and the rows wait", sent.length === 0 && night.held >= 2 && (await outbox(B)).every((r) => r.sentAt == null));
    sent.length = 0;
    await flush(new Date("2026-10-22T13:05:00.000Z"));
    check("at 09:00 local what waited goes as ONE push per kind", sent.length === 1 && (sent[0]!.payload.keys as string[]).length === 2, String(sent.length));
    check("and both rows are settled", (await outbox(B)).every((r) => r.sentAt != null));

    // 3. A device the push service forgot is deleted.
    const C = U("c");
    await reader(C); await device(C, "c", "UTC");
    await dropAt(C, "g1", new Date("2026-10-22T15:00:00.000Z"));
    mode = "gone";
    const gone = await flush(DAY);
    mode = "ok";
    check("a 410 deletes the device", gone.gone >= 1 && (await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, C))).length === 0);
    check("and settles the row, with nobody left to send to", (await outbox(C))[0]?.sentAt != null);

    // 4. A transient failure leaves the row; a good device is not blocked by a bad one.
    const D = U("d");
    await reader(D); await device(D, "d1", "UTC"); await device(D, "d2", "UTC");
    await dropAt(D, "t1", new Date("2026-10-22T15:00:00.000Z"));
    mode = "busy";
    const busy = await flush(DAY);
    mode = "ok";
    check("a transient failure leaves the row for the next run", busy.failed >= 1 && (await outbox(D))[0]?.sentAt == null);
    sent.length = 0;
    await flush(DAY);
    check("the next run sends to both devices and settles it", sent.length === 2 && (await outbox(D))[0]?.sentAt != null, String(sent.length));

    // 4b. A send that went is recorded at once: when the NEXT send of the same device fails, only the second is retried.
    const K = U("k");
    await reader(K); await device(K, "k", "UTC");
    await dropAt(K, "p1", new Date("2026-10-22T15:00:00.000Z"), "run-a");
    await dropAt(K, "p2", new Date("2026-10-22T15:01:00.000Z"), "run-b");
    let calls = 0;
    const flaky = async (t: { endpoint: string }, payload: string) => {
      calls++;
      if (calls === 2) return { ok: false as const, gone: false, status: 503 };
      sent.push({ endpoint: t.endpoint, payload: JSON.parse(payload) });
      return { ok: true as const };
    };
    sent.length = 0;
    await flushPush({ config, now: DAY, send: flaky as never, resolveEnv: async () => on });
    const afterFlaky = await outbox(K);
    check("the send that went is recorded though the next one failed", afterFlaky.filter((r) => r.sentAt != null).length === 1 && afterFlaky.filter((r) => r.sentAt == null).length === 1 && sent.length === 1, `${sent.length}`);
    sent.length = 0;
    await flush(DAY);
    check("the next run sends only the one that did not go", sent.length === 1 && (await outbox(K)).every((r) => r.sentAt != null), String(sent.length));

    // 4c. Judged again at the flush: unticked, or stamped after the event, while it waited.
    const L = U("l");
    await reader(L); await device(L, "l", "UTC");
    await dropAt(L, "u1", new Date("2026-10-22T10:00:00.000Z"));
    await db.update(userPrefs).set({ pushKinds: {} }).where(eq(userPrefs.userId, L)); // unticked while it waited
    const M = U("m");
    await reader(M); await device(M, "m", "UTC");
    await dropAt(M, "u2", new Date("2026-10-22T10:00:00.000Z"));
    await db.update(userPrefs).set({ pushKinds: { "price-drop": "2026-10-22T12:00:00.000Z" } }).where(eq(userPrefs.userId, M)); // off and on again after the event
    sent.length = 0;
    await flush(DAY);
    check("a kind unticked while the row waited is abandoned, never sent", sent.filter((x) => x.endpoint === endpoint("l")).length === 0 && (await outbox(L))[0]?.sentAt != null);
    check("a kind stamped again AFTER the event is abandoned too", sent.filter((x) => x.endpoint === endpoint("m")).length === 0 && (await outbox(M))[0]?.sentAt != null);

    // 4d. Fair: a reader with a long backlog held overnight takes only its share of a run.
    const X = U("x");
    await reader(X); await device(X, "x", "Asia/Tokyo"); // 01:00 at DAY: held
    const { PER_READER } = await import("../src/lib/push/flush");
    for (let i = 0; i < PER_READER + 10; i++) {
      await db.insert(pushOutbox).values({ userId: X, kind: "price-drop", itemKey: `item:backlog-${i}`, batchKey: "b", payload: {}, createdAt: new Date(Date.parse("2026-10-22T10:00:00.000Z") + i * 1000) });
    }
    const Y = U("y");
    await reader(Y); await device(Y, "y", "UTC");
    await dropAt(Y, "f1", new Date("2026-10-22T15:30:00.000Z"));
    sent.length = 0;
    const fair = await flush(DAY);
    check("the backlog takes only its share of the run (PER_READER of its rows, plus the other reader's one), and the other reader still goes", sent.some((x) => x.endpoint === endpoint("y")) && fair.rows === PER_READER + 1, JSON.stringify(fair));

    // 5. Abandoned, never sent.
    const E = U("e"); // no device
    await reader(E);
    await db.insert(pushOutbox).values({ userId: E, kind: "price-drop", itemKey: "item:00000000-0000-0000-0000-000000000001", batchKey: "b", payload: {}, createdAt: new Date("2026-10-22T15:00:00.000Z") });
    const F = U("f"); // switch off
    await reader(F); await device(F, "f", "UTC");
    await dropAt(F, "s1", new Date("2026-10-22T15:00:00.000Z"));
    const G = U("g"); // a row that no longer resolves
    await reader(G); await device(G, "g", "UTC");
    await db.insert(pushOutbox).values({ userId: G, kind: "price-drop", itemKey: "item:00000000-0000-0000-0000-000000000002", batchKey: "b", payload: {}, createdAt: new Date("2026-10-22T15:00:00.000Z") });
    sent.length = 0;
    const ab = await flushPush({ config, now: DAY, send: send as never, resolveEnv: async (u) => (u === F ? off : on) });
    check("no device, switch off and a row that no longer resolves are abandoned, never sent", sent.filter((s) => [endpoint("f"), endpoint("g")].includes(s.endpoint)).length === 0 && ab.abandoned >= 3, JSON.stringify(ab));
    check("each is settled with its reason", (await Promise.all([E, F, G].map(outbox))).every((r) => r[0]?.sentAt != null));

    // 6. A device that subscribed after the event never hears of it; a week-old row is pruned.
    const H = U("h");
    await reader(H);
    await device(H, "h0", "UTC"); // an older device, so the event queues at all
    await dropAt(H, "o1", new Date("2026-10-22T10:00:00.000Z"));
    await device(H, "h", "UTC", new Date("2026-10-22T14:00:00.000Z")); // subscribed after it
    await db.insert(pushOutbox).values({ userId: H, kind: "price-drop", itemKey: "item:old", batchKey: "b", payload: {}, createdAt: new Date("2026-10-01T00:00:00.000Z"), sentAt: new Date("2026-10-01T01:00:00.000Z") });
    sent.length = 0;
    const last = await flush(DAY);
    check("a device that subscribed AFTER the event is sent nothing, the older one is", sent.filter((s) => s.endpoint === endpoint("h")).length === 0 && sent.filter((s) => s.endpoint === endpoint("h0")).length === 1);
    check("a row a week old is pruned", last.pruned >= 1 && (await outbox(H)).every((r) => r.itemKey !== "item:old"));
  } finally {
    await db.delete(pushSubscriptions).where(like(pushSubscriptions.endpoint, `%${run}-%`));
    for (const t of ["push_outbox", "feed_items", "user_prefs", "user_data_stamps"]) {
      await db.execute(sql`delete from ${sql.raw(t)} where user_id like ${`probe_flush_%_${run}`}`);
    }
  }
  if (failed) throw new Error(`${failed} check(s) failed`);
  console.log("\nall checks passed");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
