// Proves the push flush (plan 2026-10-22-push.md, PR 3b) against a real database with a FAKE sender, so nothing leaves the
// machine: a live push goes once and its row is settled; the same flush sends nothing twice; a device inside its held hours
// gets nothing and the row waits, then the morning release sends one push per kind; a device the push service answers 410
// for is deleted; a transient failure leaves the row for the next run and keeps the sends that already went (recorded in the
// database as each goes); a row whose kind was unticked, or stamped again after the event, while it waited is abandoned; one
// reader's rows cannot crowd the others out of a run; a reader with no
// device, the switch off, or a row that no longer resolves is abandoned, never sent; a device that subscribed after an
// event never gets it; a row a week old is pruned.
//
// PR 3c, section 7: the catalog kinds. It seeds its OWN set, printing, precons and `catalog_first_seen` stamps (probe-named
// keys, removed in the finally) and proves the cron pass queues and sends them: a baseline stamp never pushes, a fresh set is
// one push on its page, two fresh precons of one day collapse to ONE push, a precon that arrived before the reader's tick never
// pushes, a second run queues nothing new and sends nothing twice, and a catalog row whose precon is gone is abandoned. Every
// flush here also runs the catalog pass for ANY reader on the target with a device and a catalog kind ticked: on a scratch
// branch those rows are harmless (the sender is fake), which is one more reason this probe never runs on a shared database.
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
  const { pushOutbox, pushSubscriptions, userPrefs, cards, sets, printings, precons, preconCards, catalogFirstSeen } = await import("../src/db/schema");
  const { inArray } = await import("drizzle-orm");
  const { randomUUID } = await import("node:crypto");
  const { rows } = await db.execute<{ b: string | null }>(sql`select current_setting('neon.branch_id', true) as b`);
  if (rows[0]?.b !== named) throw new Error(`probe:push-flush: database reports ${rows[0]?.b}, not ${named}`);

  const { flushPush, PER_DEVICE } = await import("../src/lib/push/flush");
  const { recordFeedItem } = await import("../src/lib/social/feed-write");
  const [card] = await db.select({ oracleId: cards.oracleId, name: cards.name }).from(cards).limit(1);
  const config = { publicKey: "pub", privateKey: "priv", subject: "mailto:probe@example.com" };
  const sent: { endpoint: string; payload: Record<string, unknown> }[] = [];
  let mode: "ok" | "gone" | "busy" = "ok";
  let beforeSend: ((endpoint: string) => Promise<void>) | null = null;
  let busyFor: string | null = null;
  const send = async (t: { endpoint: string }, payload: string) => {
    if (beforeSend) await beforeSend(t.endpoint);
    if (busyFor === t.endpoint) return { ok: false as const, gone: false, status: 503 };
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
  // Section 7's catalog fixtures: probe-named, so the finally removes exactly these.
  const SET_FRESH = `zpf${run}`;
  const SET_BASE = `zpb${run}`;
  const PRECON = (n: string) => `probe_flush_${n}_${run}`;
  const preconFiles = ["a", "b", "old", "gone"].map(PRECON);

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
    for (let i = 0; i < PER_DEVICE + 10; i++) {
      await db.insert(pushOutbox).values({ userId: X, kind: "price-drop", itemKey: `item:backlog-${i}`, batchKey: "b", payload: {}, createdAt: new Date(Date.parse("2026-10-22T10:00:00.000Z") + i * 1000) });
    }
    const Y = U("y");
    await reader(Y); await device(Y, "y", "UTC");
    await dropAt(Y, "f1", new Date("2026-10-22T15:30:00.000Z"));
    sent.length = 0;
    const fair = await flush(DAY);
    check("the backlog takes only its share of the run (PER_DEVICE of its rows, plus the other reader's one), and the other reader still goes", sent.some((x) => x.endpoint === endpoint("y")) && fair.rows === PER_DEVICE + 1, JSON.stringify(fair));

    // 4e. A held device does not starve an awake one: the awake device already has the oldest PER_DEVICE rows (the held one
    // has not), and the newer rows still reach it this run.
    const Z = U("z");
    await reader(Z); await device(Z, "za", "UTC"); await device(Z, "zb", "Asia/Tokyo"); // 01:00 in Tokyo at DAY: held
    const [za] = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint("za")));
    for (let i = 0; i < PER_DEVICE + 3; i++) await dropAt(Z, `z${i}`, new Date(Date.parse("2026-10-22T14:00:00.000Z") + i * 1000), `zb${i}`);
    const zRows = (await outbox(Z)).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    for (const r of zRows.slice(0, PER_DEVICE)) await db.update(pushOutbox).set({ payload: { done: [za!.id] } }).where(eq(pushOutbox.id, r.id));
    sent.length = 0;
    await flush(DAY);
    const newer = new Set(zRows.slice(PER_DEVICE).map((r) => r.id));
    const after = await outbox(Z);
    check("an awake device gets the rows past the held device's backlog in the same run", sent.some((x) => x.endpoint === endpoint("za"))
      && after.filter((r) => newer.has(r.id)).every((r) => ((r.payload as { done?: string[] }).done ?? []).includes(za!.id)));

    // 4f. An overlapping run's progress is merged, never overwritten: while this run sends to one device, another run records
    // the second device as done; this run's own send to the second device fails. Both stay recorded and the row is settled.
    const O = U("o");
    await reader(O); await device(O, "oa", "UTC"); await device(O, "ob", "UTC");
    const [ob] = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint("ob")));
    await dropAt(O, "ov1", new Date("2026-10-22T15:00:00.000Z"));
    const [oRow] = await outbox(O);
    beforeSend = async (e) => {
      if (e === endpoint("oa")) await db.update(pushOutbox).set({ payload: { done: [ob!.id] } }).where(eq(pushOutbox.id, oRow!.id));
    };
    busyFor = endpoint("ob");
    sent.length = 0;
    await flush(DAY);
    beforeSend = null; busyFor = null;
    const [oAfter] = await outbox(O);
    const oDone = (oAfter?.payload as { done?: string[] }).done ?? [];
    check("an overlapping run's recorded device survives this run's write, and the row is settled", oDone.length === 2 && oDone.includes(ob!.id) && oAfter?.sentAt != null, JSON.stringify(oDone));

    // 4g. The kick: recordFeedItem's statement says whether it queued a push, and a flush for ONE reader (the kick's) sends
    // that reader's rows and leaves everyone else's for the cron.
    const K1 = U("k1");
    const K2 = U("k2");
    await reader(K1); await device(K1, "k1", "UTC");
    await reader(K2); await device(K2, "k2", "UTC");
    const { recordFeedItemQuery } = await import("../src/lib/social/feed-write");
    const flagged = await db.execute<{ pushed: boolean }>(recordFeedItemQuery({ userId: K1, kind: "price-drop", dedupeKey: "kick1", oracleId: card!.oracleId, data: { fromCents: 840, toCents: 510 }, now: new Date("2026-10-22T15:50:00.000Z") }));
    check("the feed write reports that it queued a push", flagged.rows[0]?.pushed === true);
    const E0 = U("e0"); // the kind on for Home but no device: the feed row is written, no push is queued
    await db.insert(userPrefs).values({ userId: E0, feedKinds: { "price-drop": stamp }, pushKinds: { "price-drop": stamp } });
    const unflagged = await db.execute<{ pushed: boolean }>(recordFeedItemQuery({ userId: E0, kind: "price-drop", dedupeKey: "kick0", oracleId: card!.oracleId, data: { fromCents: 840, toCents: 510 }, now: new Date("2026-10-22T15:50:00.000Z") }));
    check("and that it did not, for a reader with no device", unflagged.rows.length === 1 && unflagged.rows[0]?.pushed === false);
    await dropAt(K2, "kick2", new Date("2026-10-22T15:50:00.000Z"));
    sent.length = 0;
    const kicked = await flushPush({ config, now: DAY, send: send as never, resolveEnv: async () => on, onlyUser: K1 });
    check("a kicked flush sends only its reader's rows", sent.length === 1 && sent[0]!.endpoint === endpoint("k1") && kicked.rows === 1 && kicked.pruned === 0, JSON.stringify(kicked));
    check("and leaves the other reader's for the cron", (await outbox(K2))[0]?.sentAt == null);

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

    // 7. The catalog kinds (PR 3c): the cron pass queues a reader's new sets and precons and they go out like any row.
    const [art] = await db.select({ oracleId: cards.oracleId }).from(cards).where(sql`${cards.imageUri} is not null`).limit(1);
    await db.insert(sets).values([
      { code: SET_FRESH, name: `Probe Set ${run}`, setType: "expansion", releasedAt: "2026-10-01", cardCount: 5 },
      { code: SET_BASE, name: `Probe Baseline ${run}`, setType: "expansion", releasedAt: "2026-10-01", cardCount: 5 },
    ]);
    await db.insert(printings).values([SET_FRESH, SET_BASE].map((code) => ({
      scryfallId: randomUUID(), oracleId: art!.oracleId, setCode: code, collectorNumber: "1", finishes: ["nonfoil"], imageUri: "https://example.com/probe.jpg",
    })));
    await db.insert(precons).values(preconFiles.map((fileName) => ({ fileName, name: `Probe ${fileName}`, setCode: SET_FRESH.toUpperCase(), releaseDate: "2026-10-01" })));
    await db.insert(preconCards).values(preconFiles.map((fileName) => ({ fileName, position: 0, oracleId: art!.oracleId, quantity: 1, isCommander: true })));
    const seen = (h: string) => new Date(`2026-10-22T${h}:00.000Z`);
    await db.insert(catalogFirstSeen).values([
      { kind: "set", key: SET_FRESH, firstSeenAt: seen("09:05"), baseline: false },
      { kind: "set", key: SET_BASE, firstSeenAt: seen("09:05"), baseline: true }, // a baseline stamp is never an arrival
      { kind: "precon", key: PRECON("a"), firstSeenAt: seen("09:05"), baseline: false },
      { kind: "precon", key: PRECON("b"), firstSeenAt: seen("09:06"), baseline: false },
      { kind: "precon", key: PRECON("old"), firstSeenAt: seen("08:00"), baseline: false }, // before the reader ticked precons
    ]);
    const P = U("p");
    await db.insert(userPrefs).values({ userId: P, pushKinds: { "new-set": stamp, "new-precon": "2026-10-22T08:30:00.000Z" } });
    await device(P, "p", "UTC");
    const catOn = { ...on, PRECONS_ENABLED: "true" } as unknown as NodeJS.ProcessEnv;
    const catFlush = () => flushPush({ config, now: DAY, send: send as never, resolveEnv: async () => catOn });
    // The request-time kick (one reader) never runs the catalog pass: that is the cron's job.
    const kicked7 = await flushPush({ config, now: DAY, send: send as never, resolveEnv: async () => catOn, onlyUser: P });
    check("a kicked flush queues no catalog arrival", kicked7.queued === 0 && (await outbox(P)).length === 0, JSON.stringify(kicked7));
    sent.length = 0;
    const c1 = await catFlush();
    const pRows = await outbox(P);
    const byKey = new Map(pRows.map((r) => [r.itemKey, r]));
    check("the cron pass queues the fresh set and both fresh precons", byKey.has(`set:${SET_FRESH}`) && byKey.has(`precon:${PRECON("a")}`) && byKey.has(`precon:${PRECON("b")}`), JSON.stringify(c1));
    check("a baseline stamp is never queued", !byKey.has(`set:${SET_BASE}`));
    check("a precon that arrived before the reader ticked the kind is never queued", !byKey.has(`precon:${PRECON("old")}`));
    check("one day's precons share a batch, and the row carries the item's own moment",
      byKey.get(`precon:${PRECON("a")}`)?.batchKey === "new-precon:2026-10-22" && byKey.get(`precon:${PRECON("b")}`)?.batchKey === "new-precon:2026-10-22"
        && byKey.get(`set:${SET_FRESH}`)?.createdAt.toISOString() === seen("09:05").toISOString());
    // Real arrivals on the target may join these pushes, so the checks are by key, not by an exact count.
    const pSent = sent.filter((x) => x.endpoint === endpoint("p"));
    const setPush = pSent.find((x) => (x.payload.keys as string[]).includes(`set:${SET_FRESH}`));
    const preconPushes = pSent.filter((x) => (x.payload.keys as string[]).some((k) => k.startsWith("precon:probe_flush_")));
    check("the set goes out on the feed's words, landing on its page", setPush !== undefined && setPush.payload.tag === "new-set"
      && ((setPush.payload.keys as string[]).length > 1 || (setPush.payload.title === `Probe Set ${run} is out` && setPush.payload.route === `/collection/sets/${SET_FRESH}`)), JSON.stringify(setPush?.payload));
    check("the two precons collapse into ONE push, landing on Precons", preconPushes.length === 1
      && (preconPushes[0]!.payload.keys as string[]).includes(`precon:${PRECON("a")}`) && (preconPushes[0]!.payload.keys as string[]).includes(`precon:${PRECON("b")}`)
      && String(preconPushes[0]!.payload.title).endsWith("new precons are out") && preconPushes[0]!.payload.route === "/decks/precons", JSON.stringify(preconPushes.map((x) => x.payload)));
    check("no push names the baseline set or the early precon", pSent.every((x) => !(x.payload.keys as string[]).some((k) => k === `set:${SET_BASE}` || k === `precon:${PRECON("old")}`)));
    check("the catalog rows are settled", pRows.every((r) => r.sentAt != null));
    sent.length = 0;
    await catFlush();
    check("the next run queues nothing new and sends nothing twice", (await outbox(P)).length === pRows.length && sent.filter((x) => x.endpoint === endpoint("p")).length === 0);

    // A catalog row whose precon the feed no longer lists is abandoned as gone, never sent.
    await db.insert(pushOutbox).values({ userId: P, kind: "new-precon", itemKey: `precon:${PRECON("gone")}`, batchKey: "new-precon:2026-10-22", payload: {}, createdAt: new Date("2026-10-22T15:00:00.000Z") });
    sent.length = 0;
    await catFlush();
    const goneRow = (await outbox(P)).find((r) => r.itemKey === `precon:${PRECON("gone")}`);
    check("a catalog row the feed does not list (no stamp) is abandoned as gone", sent.filter((x) => x.endpoint === endpoint("p")).length === 0
      && goneRow?.sentAt != null && (goneRow.payload as { dropped?: string }).dropped === "gone", JSON.stringify(goneRow?.payload));
  } finally {
    await db.delete(catalogFirstSeen).where(inArray(catalogFirstSeen.key, [SET_FRESH, SET_BASE, ...preconFiles]));
    await db.delete(precons).where(inArray(precons.fileName, preconFiles)); // precon_cards cascade
    await db.delete(printings).where(inArray(printings.setCode, [SET_FRESH, SET_BASE]));
    await db.delete(sets).where(inArray(sets.code, [SET_FRESH, SET_BASE]));
    await db.delete(pushSubscriptions).where(like(pushSubscriptions.endpoint, `%${run}-%`));
    for (const t of ["push_outbox", "feed_items", "user_prefs", "user_data_stamps"]) {
      await db.execute(sql`delete from ${sql.raw(t)} where user_id like ${`probe_flush_%_${run}`}`);
    }
  }
  if (failed) throw new Error(`${failed} check(s) failed`);
  console.log("\nall checks passed");
}

main().then(() => process.exit(0), (e) => { console.error(e); process.exit(1); });
