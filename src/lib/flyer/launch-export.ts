/**
 * The launch list's export (flyer admin PR C). SERVER-ONLY. The caller (`src/app/admin/invites/flyer-actions.ts`) has
 * already decided the actor is an admin and the trial's switch is on.
 *
 * The read of every address and the `launch_list_exported` `admin_events` row (the row count in `new_value`) commit in
 * ONE transaction, under the switch writes' advisory lock like the launch date's save, so an export is never
 * un-audited and a file that could not be built leaves no event. Addresses are strangers' personal data: the CSV goes
 * back to the caller in memory and is never logged.
 */
import { asc, eq } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, flyerCodes, launchList } from "../../db/schema";
import { lockSwitchWrites } from "../switches/write-lock";
import { launchListCsv, launchListFilename } from "./launch-csv";

export type LaunchListExport = { filename: string; csv: string; rows: number };

export async function exportLaunchListFile(actorId: string, deps: { now?: Date } = {}): Promise<LaunchListExport> {
  const now = deps.now ?? new Date();
  return db.transaction(async (tx) => {
    await lockSwitchWrites(tx);
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
