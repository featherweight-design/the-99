/**
 * The admin's launch date as arithmetic (flyer admin PR B; boards Launch-Date.dc.html). Pure: the write is
 * `launch-date.ts`. The date is a UTC day, `YYYY-MM-DD`, which is what a native date input submits and what
 * `readLaunchDate` reads as UTC midnight. A blank clears it; a day before today (UTC) is refused, because the launch
 * list is purged 30 days after the date and a past date would delete strangers' addresses before any launch email
 * exists (READINESS small items 7, product rule 5). Today itself is allowed.
 */

/** The key the date is stored under in `flyer_settings`. */
export const LAUNCH_DATE_KEY = "launch_date";

export type LaunchDateInput = { kind: "clear" } | { kind: "set"; day: string } | { kind: "refused"; reason: "invalid" | "past" };

/** A real calendar day, written exactly `YYYY-MM-DD`: `2026-02-30` is not rolled into March. */
export function isCalendarDay(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number);
  const c = new Date(Date.UTC(y, m - 1, d));
  return c.getUTCFullYear() === y && c.getUTCMonth() === m - 1 && c.getUTCDate() === d;
}

/** The UTC day of `now`, `YYYY-MM-DD`. */
export const utcDay = (now: Date): string => now.toISOString().slice(0, 10);

export function parseLaunchDateInput(raw: unknown, now: Date): LaunchDateInput {
  if (typeof raw !== "string") return { kind: "refused", reason: "invalid" };
  const v = raw.trim();
  if (v === "") return { kind: "clear" };
  if (!isCalendarDay(v)) return { kind: "refused", reason: "invalid" };
  // Both are zero-padded `YYYY-MM-DD`, so string order is calendar order.
  if (v < utcDay(now)) return { kind: "refused", reason: "past" };
  return { kind: "set", day: v };
}
