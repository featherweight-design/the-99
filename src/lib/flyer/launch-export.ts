/**
 * The launch list's export (flyer admin PR C). SERVER-ONLY. The caller (`src/app/admin/invites/flyer-actions.ts`) has
 * already decided the actor is an admin and the trial's switch is on.
 *
 * The read of every address and the `launch_list_exported` `admin_events` row (the row count in `new_value`) commit in
 * ONE transaction, so an export is never un-audited and a file that could not be built leaves no event. (No
 * switch-writes lock: the read and the audit row are atomic already, and that lock also gates automatic group joins, so
 * a long export would stall sign-ups for nothing.) Addresses are strangers' personal data: the CSV goes
 * back to the caller in memory and is never logged.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, flyerCodes, launchList } from "../../db/schema";
import { launchListCsv, launchListFilename } from "./launch-csv";

export type LaunchListExport = { filename: string; csv: string; rows: number };

export async function exportLaunchListFile(actorId: string, deps: { now?: Date } = {}): Promise<LaunchListExport> {
  const now = deps.now ?? new Date();
  return db.transaction(async (tx) => {
    const rows = await tx
      .select({ email: launchList.email, store: flyerCodes.label, code: flyerCodes.code, addedAt: launchList.createdAt })
      .from(launchList)
      .leftJoin(flyerCodes, eq(launchList.codeId, flyerCodes.id))
      .orderBy(asc(launchList.createdAt), asc(launchList.email));
    const csv = launchListCsv(rows);
    await tx.insert(adminEvents).values({ actorId, kind: "launch_list_exported", newValue: String(rows.length), at: now });
    return { filename: launchListFilename(now), csv, rows: rows.length };
  });
}
