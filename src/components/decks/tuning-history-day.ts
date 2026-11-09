// A reopened run's date as History B and C draw it. Pure, so the run's read-only view can draw it without the History list,
// which reads the hub's actions (`tuning-history.tsx`, which re-exports this).

/** `Oct 26`: the day alone, as History B and C's head and lead draw a reopened run's date. */
export function historyDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
