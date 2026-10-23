/**
 * The flush (plan `2026-10-22-push.md`, D1): the pushes the outbox holds go to the devices, judged one device at a time.
 * Run by `/api/cron/push-flush` every five minutes. It takes no lock: an overlapping run can only send a push twice, and a
 * notification's `tag` is its kind, so the second replaces the first on the device.
 *
 * Fair across readers (`PER_READER`, round by round). Per reader: the switch again (an off switch abandons the row); rows older
 * than a day are no longer news and are abandoned; a row whose kind the reader has since unticked, re-stamped after the event or
 * lost the feature for is abandoned (`stillWanted`); the words come from the feed's own read (`resolvePushItems`), and a row that no longer stands is abandoned
 * too. Per device (`planDevice`): nothing inside its held hours, a live push for what arrived while it was not held, the
 * morning release for what arrived while it was. A device the push service answers 404 or 410 is deleted. A transient failure
 * leaves the rows for the next run. A row is SENT once every device the reader has is done with it (`payload.done`).
 * Every outcome is a count; no endpoint, key or word is logged.
 */
import { eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "../../db";
import { pushOutbox, pushSubscriptions } from "../../db/schema";
import { availableFeedKinds } from "../feed/flag";
import { isStoredKind } from "../feed/kinds";
import type { PushConfig } from "./config";
import { stillWanted } from "./eligible";
import { pushEnabled } from "./flag";
import type { PushItem } from "./message";
import { planDevice, type OutboxRow } from "./plan";
import { readPushPrefs } from "./prefs";
import { resolvePushItems, type OutboxRef } from "./resolve";
import { payloadFor, type PushSender } from "./send";

export const STALE_MS = 24 * 60 * 60_000;
export const RETAIN_MS = 7 * 24 * 60 * 60_000;
export const MAX_ROWS = 1000;
/** One reader's share of a run: a reader whose rows are held or failing cannot crowd the others out of the batch. */
export const PER_READER = 50;

export type FlushReport = {
  rows: number; readers: number; sent: number; held: number; gone: number; failed: number; abandoned: number; pruned: number;
};

export type FlushDeps = {
  config: PushConfig;
  now: Date;
  send: PushSender;
  /** The reader's resolved switches (`resolveSwitchEnv`). */
  resolveEnv: (userId: string) => Promise<NodeJS.ProcessEnv>;
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
  const report: FlushReport = { rows: 0, readers: 0, sent: 0, held: 0, gone: 0, failed: 0, abandoned: 0, pruned: 0 };

  // Fair across readers: each reader's oldest PER_READER rows, then the whole batch round by round (everyone's first row, then
  // everyone's second), so rows that are held overnight or keep failing for some readers never starve the rest.
  const picked = (await q.execute<{ id: string }>(sql`
    select pr.id as id from (
      select po.id as id, po.created_at as created_at, row_number() over (partition by po.user_id order by po.created_at, po.id) as rn
      from ${pushOutbox} po where po.sent_at is null) pr
    where pr.rn <= ${PER_READER}
    order by pr.rn, pr.created_at
    limit ${MAX_ROWS}`)).rows.map((r) => r.id);
  const rows = picked.length === 0 ? [] : (await q.select().from(pushOutbox).where(inArray(pushOutbox.id, picked))).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  report.rows = rows.length;
  const byUser = new Map<string, Row[]>();
  for (const r of rows) byUser.set(r.userId, [...(byUser.get(r.userId) ?? []), r]);
  report.readers = byUser.size;

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
      const fresh = young.filter((r) => isStoredKind(r.kind) && stillWanted(prefs, r.kind, r.createdAt, available));
      const unwanted = young.filter((r) => !fresh.includes(r));
      await settle(unwanted.map((r) => r.id), "off");
      report.abandoned += unwanted.length;
      if (fresh.length === 0) continue;

      const devices = await q.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).orderBy(pushSubscriptions.createdAt);
      if (devices.length === 0) { await settle(fresh.map((r) => r.id), "no-device"); report.abandoned += fresh.length; continue; }

      const refs: OutboxRef[] = fresh.flatMap((r) => (isStoredKind(r.kind) ? [{ kind: r.kind, key: r.itemKey, batch: r.batchKey }] : []));
      const { items: resolved, dropped } = await resolvePushItems(userId, refs, env, now, q);
      const dropKeys = new Set(dropped.map((d) => `${d.kind}\u0000${d.key}`));
      const live = fresh.filter((r) => !dropKeys.has(`${r.kind}\u0000${r.itemKey}`));
      await settle(fresh.filter((r) => dropKeys.has(`${r.kind}\u0000${r.itemKey}`)).map((r) => r.id), "gone");
      report.abandoned += fresh.length - live.length;
      const itemByKey = new Map<string, PushItem>(resolved.map((i) => [`${i.kind}\u0000${i.key}`, i]));
      const items = new Map<string, PushItem>();
      for (const r of live) { const i = itemByKey.get(`${r.kind}\u0000${r.itemKey}`); if (i) items.set(r.id, i); }

      const done = new Map<string, Set<string>>(live.map((r) => [r.id, new Set(doneOf(r))]));
      const persisted = new Map<string, number>(live.map((r) => [r.id, done.get(r.id)!.size]));
      const removed = new Set<string>();
      for (const device of devices) {
        const waiting: OutboxRow[] = live.filter((r) => !done.get(r.id)!.has(device.id)).map((r) => ({ id: r.id, itemKey: r.itemKey, createdAt: r.createdAt }));
        if (waiting.length === 0) continue;
        const plan = planDevice(waiting, items, device, now);
        if (plan.held) { report.held += waiting.length; continue; }
        let allOk = true;
        for (const s of plan.sends) {
          const result = await send({ endpoint: device.endpoint, p256dh: device.p256dh, auth: device.auth }, payloadFor(s.message), config);
          if (result.ok) {
            report.sent += 1;
            // Recorded in the database AT ONCE, before anything else can throw: a later send or a bookkeeping write failing must
            // not make this one go out again. (Delivery and this write cannot be atomic; this is the narrowest window.)
            for (const id of s.rowIds) {
              done.get(id)!.add(device.id);
              await q.update(pushOutbox).set({ payload: { done: [...done.get(id)!] } }).where(eq(pushOutbox.id, id));
              persisted.set(id, done.get(id)!.size);
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

      // A row is sent once every device the reader still has is done with it.
      const remaining = devices.filter((d) => !removed.has(d.id)).map((d) => d.id);
      for (const r of live) {
        const d = done.get(r.id)!;
        const complete = remaining.every((id) => d.has(id));
        if (!complete && d.size === persisted.get(r.id)) continue; // nothing new to record
        await q.update(pushOutbox).set(complete ? { sentAt: now, payload: { done: [...d] } } : { payload: { done: [...d] } }).where(eq(pushOutbox.id, r.id));
      }
    } catch (error) {
      report.failed += 1;
      const code = (error as { cause?: { code?: unknown }; code?: unknown })?.cause?.code ?? (error as { code?: unknown })?.code;
      console.error(`[push-flush] a reader's pushes failed${typeof code === "string" && /^[0-9A-Z]{5}$/.test(code) ? ` (${code})` : ""}`);
    }
  }

  // A week after it was written a row goes, sent or abandoned (an unsent one is abandoned as stale long before).
  const cutoff = new Date(now.getTime() - RETAIN_MS);
  const pruned = await q.delete(pushOutbox).where(lt(pushOutbox.createdAt, cutoff)).returning({ id: pushOutbox.id });
  report.pruned = pruned.length;
  return report;
}
