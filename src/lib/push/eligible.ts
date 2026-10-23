/**
 * Whether a queued push is still wanted when the flush reaches it (plan `2026-10-22-push.md`, D1). A row can wait overnight
 * or retry for hours, and the reader can change their mind meanwhile: the kind unticked, an off-and-on cycle that stamped it
 * AFTER the event, or the kind's feature switched off (spare requests). The same rule the enqueue applied, judged again now.
 * Pure.
 */
import { isDefaultOn, type FeedKind } from "../feed/kinds";
import type { FeedPrefs } from "../feed/prefs";

/** When the kind's push came on, as a time: its stamp, `-Infinity` for a default-on kind not declined, `null` when it is off. */
export function pushStamp(prefs: FeedPrefs, kind: FeedKind): number | null {
  const stamped = prefs.map[kind];
  if (stamped !== undefined) return Date.parse(stamped);
  return isDefaultOn(kind) && !prefs.declined.includes(kind) ? -Infinity : null;
}

/** Still wanted: the kind's push is on, the event is newer than its stamp, and the kind is available to this reader's switches. */
export function stillWanted(prefs: FeedPrefs, kind: FeedKind, eventAt: Date, available: readonly FeedKind[]): boolean {
  if (!available.includes(kind)) return false;
  const stamp = pushStamp(prefs, kind);
  return stamp !== null && eventAt.getTime() > stamp;
}
