/**
 * The flush (plan `2026-10-22-push.md`, D1): the pushes the outbox holds go to the devices, judged one device at a time.
 * Run by `/api/cron/push-flush` every fifteen minutes (paused on the staging project: `src/lib/cron/staging-pause.ts`).
 * It takes no lock: an overlapping run can send a push twice (a
 * notification's `tag` is its kind, so the second replaces the first on the device), but it never loses another run's
 * progress, because `payload.done` is merged in the database and a row is settled only when the merged set covers every device.
 *
 * Fair across devices (`PER_DEVICE`, round by round): each device's oldest rows still waiting for IT, so a device that is
 * held or failing cannot keep an awake one from its news. Per reader: the switch again (an off switch abandons the row); rows older
 * than a day are no longer news and are abandoned; a row whose kind the reader has since unticked, re-stamped after the event or
 * lost the feature for is abandoned (`stillWanted`); the words come from the feed's own read (`resolvePushItems`), and a row that no longer stands is abandoned
 * too. Per device (`planDevice`): nothing inside its held hours (but the seat notice, which is exempt from the hold and goes out live), a live push for what arrived while it was not held, the
 * morning release for what arrived while it was. A device the push service answers 404 or 410 is deleted. A transient failure
 * leaves the rows for the next run. A row is SENT once every device the reader has is done with it (`payload.done`).
 * Every outcome is a count; no endpoint, key or word is logged.
 *
 * First, the catalog kinds (PR 3c, `catalog.ts`): a new set or precon has no per-reader row, so the run queues each subscribed
 * reader's arrivals as outbox rows, and from there they are judged and sent exactly like a stored kind's.
 */
import { eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../db";
import { pushOutbox, pushSubscriptions } from "../../db/schema";
import { availableFeedKinds } from "../feed/flag";
import { isFeedKind, SEAT_PUSH_KIND } from "../feed/kinds";
import { enqueueCatalogArrivals } from "./catalog";
import type { PushConfig } from "./config";
import { stillWanted } from "./eligible";
import { pushEnabled } from "./flag";
import type { PushItem } from "./message";
import { planDevice, type OutboxRow } from "./plan";
import { captureServerError } from "../sentry/capture";
import { readPushPrefs } from "./prefs";
import { resolvePushItems, type OutboxRef } from "./resolve";
import { payloadFor, type PushSender } from "./send";

export const STALE_MS = 24 * 60 * 60_000;
export const RETAIN_MS = 7 * 24 * 60 * 60_000;
export const MAX_ROWS = 1000;
/** One device's share of a run (a reader with no device counts as one): rows held or failing for one device cannot crowd
 * out another device's, the reader's own included. */
export const PER_DEVICE = 50;

export type FlushReport = {
  rows: number; readers: number; sent: number; held: number; gone: number; failed: number; abandoned: number; pruned: number;
  /** Catalog arrivals (new set, new precon) queued by this run (PR 3c). */
  queued: number;
};

export type FlushDeps = {
  config: PushConfig;
  now: Date;
  send: PushSender;
  /** The reader's resolved switches (`resolveSwitchEnv`). */
  resolveEnv: (userId: string) => Promise<NodeJS.ProcessEnv>;
  /** One reader's rows only, and no pruning: the kick after a write in a request (`kick.ts`). The cron passes nothing. */
  onlyUser?: string;
  q?: typeof db;
};

type Row = typeof pushOutbox.$inferSelect;
const doneOf = (row: Row): string[] => {
  const d = (row.payload as { done?: unknown }).done;
  return Array.isArray(d) ? d.filter((x): x is string => typeof x === "string") : [];
};

export async function flushPush(deps: FlushDeps): Promise<FlushReport> {
  const { config, now, send, resolveEnv } = deps;
  const q = deps.q ?? db;
  const report: FlushReport = { rows: 0, readers: 0, sent: 0, held: 0, gone: 0, failed: 0, abandoned: 0, pruned: 0, queued: 0 };

  // The catalog kinds have no per-reader row (D2 as amended): this run queues each subscribed reader's new sets and precons
  // first, so they go out below with everything else. The CRON's job only: a flush limited to one reader (the request-time
  // kick) skips it.
  if (deps.onlyUser === undefined) {
    const catalog = await enqueueCatalogArrivals({ now, staleMs: STALE_MS, resolveEnv, q });
    report.queued = catalog.queued;
    report.failed += catalog.failed;
  }

  // Fair across devices: each device's oldest PER_DEVICE rows that it has NOT had yet (a reader with no device: its oldest
  // rows, to be abandoned), then the whole batch round by round, so rows held overnight or failing on one device never starve
  // another. A row a device already has does not count against that device's share.
  const picked = (await q.execute<{ id: string }>(sql`
    select w.id as id from (
      select po.id as id, po.created_at as created_at,
        row_number() over (partition by coalesce(ps.id::text, po.user_id) order by po.created_at, po.id) as rn
      from ${pushOutbox} po
      left join ${pushSubscriptions} ps on ps.user_id = po.user_id
      where po.sent_at is null${deps.onlyUser === undefined ? sql`` : sql` and po.user_id = ${deps.onlyUser}`}
        and (ps.id is null or not (coalesce(po.payload->'done', '[]'::jsonb) @> jsonb_build_array(ps.id::text)))) w
    where w.rn <= ${PER_DEVICE}
    group by w.id
    order by min(w.rn), min(w.created_at)
    limit ${MAX_ROWS}`)).rows.map((r) => r.id);
  const rows = picked.length === 0 ? [] : (await q.select().from(pushOutbox).where(inArray(pushOutbox.id, picked))).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  report.rows = rows.length;
  const byUser = new Map<string, Row[]>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  report.readers = byUser.size;

  // Merges device ids into a row's `payload.done` IN the database, so a run that overlaps this one keeps what it recorded.
  const markDone = async (id: string, deviceIds: readonly string[]) => {
    if (deviceIds.length === 0) return;
    await q.execute(sql`
      update ${pushOutbox} set payload = payload || jsonb_build_object('done', (
        select coalesce(jsonb_agg(distinct e), '[]'::jsonb)
        from jsonb_array_elements(coalesce(payload->'done', '[]'::jsonb) || ${JSON.stringify(deviceIds)}::jsonb) e))
      where id = ${id}`);
  };

  const settle = async (ids: string[], reason: string) => {
    if (ids.length === 0) return;
    await q.update(pushOutbox).set({ sentAt: now, payload: { dropped: reason } }).where(inArray(pushOutbox.id, ids));
  };

  for (const [userId, userRows] of byUser) {
    try {
      const env = await resolveEnv(userId);
      if (!pushEnabled(env)) { await settle(userRows.map((r) => r.id), "switch"); report.abandoned += userRows.length; continue; }
      const young = userRows.filter((r) => now.getTime() - r.createdAt.getTime() < STALE_MS);
      const stale = userRows.filter((r) => !young.includes(r));
      await settle(stale.map((r) => r.id), "stale");
      report.abandoned += stale.length;
      // Judged again NOW: a row that waited overnight or retried is dropped when the reader unticked its kind, stamped it again
      // after the event, or its feature went off for them.
      const prefs = await readPushPrefs(userId, q);
      const available = availableFeedKinds(env);
      // The seat notice has no kind preference to judge (the master switch above is its only gate); every other row is a feed kind.
      const fresh = young.filter((r) => r.kind === SEAT_PUSH_KIND || (isFeedKind(r.kind) && stillWanted(prefs, r.kind, r.createdAt, available)));
      const unwanted = young.filter((r) => !fresh.includes(r));
      await settle(unwanted.map((r) => r.id), "off");
      report.abandoned += unwanted.length;
      if (fresh.length === 0) continue;

      const devices = await q.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).orderBy(pushSubscriptions.createdAt);
      if (devices.length === 0) { await settle(fresh.map((r) => r.id), "no-device"); report.abandoned += fresh.length; continue; }

      const refs: OutboxRef[] = fresh.flatMap((r) => (r.kind === SEAT_PUSH_KIND || isFeedKind(r.kind) ? [{ kind: r.kind as OutboxRef["kind"], key: r.itemKey, batch: r.batchKey }] : []));
      const { items: resolved, dropped } = await resolvePushItems(userId, refs, env, now, q);
      const dropKeys = new Set(dropped.map((d) => `${d.kind}\u0000${d.key}`));
      const live = fresh.filter((r) => !dropKeys.has(`${r.kind}\u0000${r.itemKey}`));
      await settle(fresh.filter((r) => dropKeys.has(`${r.kind}\u0000${r.itemKey}`)).map((r) => r.id), "gone");
      report.abandoned += fresh.length - live.length;
      const itemByKey = new Map<string, PushItem>(resolved.map((i) => [`${i.kind}\u0000${i.key}`, i]));
      const items = new Map<string, PushItem>();
      for (const r of live) { const i = itemByKey.get(`${r.kind}\u0000${r.itemKey}`); if (i) items.set(r.id, i); }

      const done = new Map<string, Set<string>>(live.map((r) => [r.id, new Set(doneOf(r))]));
      const recorded = new Map<string, Set<string>>(live.map((r) => [r.id, new Set(done.get(r.id))]));
      const removed = new Set<string>();
      for (const device of devices) {
        const waiting: OutboxRow[] = live.filter((r) => !done.get(r.id)!.has(device.id)).map((r) => ({ id: r.id, itemKey: r.itemKey, createdAt: r.createdAt }));
        if (waiting.length === 0) continue;
        const plan = planDevice(waiting, items, device, now);
        if (plan.held && plan.sends.length === 0 && plan.covered.length === 0) { report.held += waiting.length; continue; }
        let allOk = true;
        for (const s of plan.sends) {
          const result = await send({ endpoint: device.endpoint, p256dh: device.p256dh, auth: device.auth }, payloadFor(s.message), config);
          if (result.ok) {
            report.sent += 1;
            // Recorded in the database AT ONCE, before anything else can throw: a later send or a bookkeeping write failing must
            // not make this one go out again. (Delivery and this write cannot be atomic; this is the narrowest window.)
            for (const id of s.rowIds) {
              done.get(id)!.add(device.id);
              await markDone(id, [device.id]);
              recorded.get(id)!.add(device.id);
            }
            await q.update(pushSubscriptions).set({ lastOkAt: now }).where(eq(pushSubscriptions.id, device.id)).catch(() => undefined);
          } else if (result.gone) {
            report.gone += 1;
            await q.delete(pushSubscriptions).where(eq(pushSubscriptions.id, device.id));
            removed.add(device.id);
            break;
          } else {
            report.failed += 1;
            allOk = false;
            break;
          }
        }
        if (removed.has(device.id)) continue;
        if (allOk) for (const id of plan.covered) done.get(id)!.add(device.id);
      }

      // A row is sent once every device the reader still has is done with it, judged on the MERGED set in the database (an
      // overlapping run may have recorded devices this one did not).
      const remaining = devices.filter((d) => !removed.has(d.id)).map((d) => d.id);
      for (const r of live) {
        const fresh = [...done.get(r.id)!].filter((id) => !recorded.get(r.id)!.has(id));
        await markDone(r.id, fresh);
        await q.execute(sql`
          update ${pushOutbox} set sent_at = ${now}
          where id = ${r.id} and sent_at is null
            and coalesce(payload->'done', '[]'::jsonb) @> ${JSON.stringify(remaining)}::jsonb`);
      }
    } catch (error) {
      report.failed += 1;
      const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
      console.error(`[push-flush] a reader's pushes failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}`);
      // Caught so the other readers still go, so reported here: neither the cron's nor the kick's catch ever sees it.
      captureServerError("push-flush-reader", error);
    }
  }

  // A week after it was written a row goes, sent or abandoned (an unsent one is abandoned as stale long before).
  if (deps.onlyUser === undefined) {
    const cutoff = new Date(now.getTime() - RETAIN_MS);
    const pruned = await q.delete(pushOutbox).where(lt(pushOutbox.createdAt, cutoff)).returning({ id: pushOutbox.id });
    report.pruned = pruned.length;
  }
  return report;
}
