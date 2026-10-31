/**
 * The admin-set launch date (flyer admin PR B). SERVER-ONLY. The caller (`src/app/admin/invites/flyer-actions.ts`) has
 * already decided the actor is an admin and the trial's switch is on. The value lives in `flyer_settings` under
 * `launch_date`; unset is no row, so "cleared" and "never set" are the same state.
 *
 * `setLaunchDate` reads the saved value, writes the new one and records one `launch_date_set` `admin_events` row in ONE
 * transaction, under the switch writes' advisory lock so two saves cannot interleave their read and write. A save that
 * changes nothing writes nothing (no row, no event). `readStoredLaunchDate` is the one read the purge and the admin
 * card share.
 */
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { adminEvents, flyerSettings } from "../../db/schema";
import { lockSwitchWrites } from "../switches/write-lock";
import { LAUNCH_DATE_KEY, parseLaunchDateInput } from "./launch-date-rule";

export type SetLaunchDateResult =
  | { ok: true; state: "saved"; value: string; changed: boolean }
  | { ok: true; state: "cleared"; value: null; changed: boolean }
  | { ok: false; error: "invalid" | "past" };

/** The saved launch date (`YYYY-MM-DD`), or null when none is set. */
export async function readStoredLaunchDate(): Promise<string | null> {
  const [row] = await db.select({ value: flyerSettings.value }).from(flyerSettings).where(eq(flyerSettings.key, LAUNCH_DATE_KEY));
  return row?.value ?? null;
}

export async function setLaunchDate(actorId: string, raw: unknown, deps: { now?: Date } = {}): Promise<SetLaunchDateResult> {
  const now = deps.now ?? new Date();
  const input = parseLaunchDateInput(raw, now);
  if (input.kind === "refused") return { ok: false, error: input.reason };
  const next = input.kind === "set" ? input.day : null;
  return db.transaction(async (tx) => {
    await lockSwitchWrites(tx);
    const [row] = await tx.select({ value: flyerSettings.value }).from(flyerSettings).where(eq(flyerSettings.key, LAUNCH_DATE_KEY));
    const prior = row?.value ?? null;
    const result = (changed: boolean): SetLaunchDateResult =>
      next === null ? { ok: true, state: "cleared", value: null, changed } : { ok: true, state: "saved", value: next, changed };
    if (prior === next) return result(false);
    if (next === null) await tx.delete(flyerSettings).where(eq(flyerSettings.key, LAUNCH_DATE_KEY));
    else await tx.insert(flyerSettings).values({ key: LAUNCH_DATE_KEY, value: next, updatedAt: now }).onConflictDoUpdate({ target: flyerSettings.key, set: { value: next, updatedAt: now } });
    await tx.insert(adminEvents).values({ actorId, kind: "launch_date_set", oldValue: prior, newValue: next, at: now });
    return result(true);
  });
}
