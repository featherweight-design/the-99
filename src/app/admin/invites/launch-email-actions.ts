"use server";

import { requireAdmin } from "../../../lib/admin/access";
import { LAUNCH_BATCH_MAX, sendLaunchBatch, type LaunchBatchReport } from "../../../lib/flyer/launch-send";

// The launch email's admin actions (launch email R2c G3). Every export calls `requireAdmin()` on its first line
// (`src/app/admin/actions.test.ts` reads every action module under src/app/admin); the page is never trusted. Each batch
// is logged with its counts and the admin's id, never an address. The flyer switch does not gate these: at launch the
// trial is off and the list is still to be emailed.

export type LaunchEmailActionResult = LaunchBatchReport | { ok: false; reason: "failed" };

/** Counts the addresses still waiting, after checking the launch date, the mail configuration and the images. Sends nothing. */
export async function launchEmailDryRun(): Promise<LaunchEmailActionResult> {
  await requireAdmin();
  try {
    return await sendLaunchBatch({ dryRun: true, limit: 0 });
  } catch (error) {
    console.error("admin: launch email dry run failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}

/** Sends the next `count` (at most `LAUNCH_BATCH_MAX`). The page asks for a confirm naming the count before it calls this. */
export async function sendLaunchEmailBatch(count: unknown): Promise<LaunchEmailActionResult> {
  const { userId } = await requireAdmin();
  if (typeof count !== "number" || !Number.isInteger(count) || count < 1 || count > LAUNCH_BATCH_MAX) return { ok: false, reason: "failed" };
  try {
    const report = await sendLaunchBatch({ dryRun: false, limit: count });
    if (report.ok) {
      console.info(`[launch-email] batch by=${userId} asked=${count} sent=${report.sent} released=${report.released} uncertain=${report.uncertain} waiting=${report.waiting} stopped=${report.stoppedBy}`);
    } else {
      console.info(`[launch-email] batch refused by=${userId} reason=${report.reason}`);
    }
    return report;
  } catch (error) {
    console.error("admin: launch email batch failed", error instanceof Error ? error.name : "unknown");
    return { ok: false, reason: "failed" };
  }
}
