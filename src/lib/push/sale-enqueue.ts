/**
 * Queues each subscribed reader's due sale push (`sale.ts`), in the cron's run like the catalog arrivals (`catalog.ts`): the
 * readers with a device and the `secret-lair` push on, under their switches. One reader failing (a strict switch read) leaves
 * theirs for the next run and never stops the others. Counts only.
 */
import { db } from "../../db";
import { catalogReadersQuery, type CatalogEnqueueDeps } from "./catalog";
import { catalogPushKinds } from "./catalog-rule";
import { enqueueSalePushQuery } from "./sale";

export async function enqueueSalePushes(deps: CatalogEnqueueDeps): Promise<{ queued: number; failed: number }> {
  const q = deps.q ?? db;
  const { rows } = await q.execute<{ user_id: string }>(catalogReadersQuery(["secret-lair"]));
  let queued = 0;
  let failed = 0;
  for (const { user_id: userId } of rows as { user_id: string }[]) {
    try {
      if (!catalogPushKinds(await deps.resolveEnv(userId)).includes("secret-lair")) continue;
      queued += (await q.execute<{ id: string }>(enqueueSalePushQuery(userId, deps.now, deps.staleMs))).rows.length;
    } catch {
      failed += 1;
    }
  }
  if (failed > 0) console.error(`[push-flush] ${failed} reader(s)' sale pushes were not queued`);
  return { queued, failed };
}
