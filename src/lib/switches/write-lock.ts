/**
 * The one advisory lock every switch write, group save and automatic group join takes (admin plan: either can move
 * another\'s rise). It lives here, outside `src/lib/admin/`, so a sign-up that joins a group can wait on it without
 * importing the admin write modules, which `group-writes.test.ts` pins to `src/app/admin/**`.
 */
import { sql } from "drizzle-orm";
import type { db } from "../../db";

export const SWITCH_WRITE_LOCK = "admin_switches";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function lockSwitchWrites(tx: Tx): Promise<void> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${SWITCH_WRITE_LOCK}, 0))`);
}
