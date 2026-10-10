import type { HistoryRow } from "../../db/schema";
import { collectionEditCopy } from "../copy/collection-edit";
import { HISTORY_RETENTION_DAYS } from "./retention";
import type { HistoryListEntry } from "./history";

// What the history list draws, as pure functions over the ledger's entries: the day groups, the
// title, the dates and the long entry's groups. Dates and times are UTC, spelled by hand, so a
// server render and the browser agree (the same rule `day()` in the upload choice follows).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;

/** "9 Oct", UTC. */
export const dayLabel = (d: Date) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;

/** "14:02", UTC. */
export const timeLabel = (d: Date) =>
  `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

const startOfDay = (ms: number) => ms - (((ms % DAY_MS) + DAY_MS) % DAY_MS);

export type DayGroup = { key: string; label: string; entries: HistoryListEntry[] };

/** Entries newest first, grouped by UTC day, the first two days named `Today` and `Yesterday`. */
export function groupByDay(entries: readonly HistoryListEntry[], nowMs: number): DayGroup[] {
  const c = collectionEditCopy.history;
  const today = startOfDay(nowMs);
  const groups: DayGroup[] = [];
  for (const e of entries) {
    const start = startOfDay(e.createdAt.getTime());
    const last = groups[groups.length - 1];
    if (last && last.key === String(start)) {
      last.entries.push(e);
      continue;
    }
    const date = dayLabel(e.createdAt);
    const label = start === today ? c.today(date) : start === today - DAY_MS ? c.yesterday(date) : date;
    groups.push({ key: String(start), label, entries: [e] });
  }
  return groups;
}

/**
 * The date history reaches back to: the later of the day the ledger shipped and the retention
 * edge, so a history younger than 90 days names its ship date and an older one names the edge.
 */
export function historyReachesBack(ship: Date, nowMs: number): Date {
  return new Date(Math.max(ship.getTime(), nowMs - HISTORY_RETENTION_DAYS * DAY_MS));
}

/** What an entry is called in the list: the file, the card, or what a revert undid. */
export function entryTitle(
  entry: HistoryListEntry,
  byId: ReadonlyMap<string, HistoryListEntry>,
  reachesBack: Date,
): string {
  const c = collectionEditCopy.history;
  if (entry.kind === "upload_replace" || entry.kind === "upload_add") return entry.uploadFilename ?? c.untitled;
  if (entry.kind === "revert") {
    const undone = entry.revertsId ? byId.get(entry.revertsId) : undefined;
    if (undone) return c.undid(entryTitle(undone, byId, reachesBack));
    return entry.revertsVisible ? c.undidOlder : c.undidAged(dayLabel(reachesBack));
  }
  if (!entry.firstName) return c.untitled;
  return entry.rowCount > 1 ? c.andMore(entry.firstName, entry.rowCount - 1) : entry.firstName;
}

export type RowGroup = "left" | "down" | "up" | "new";
const ORDER: RowGroup[] = ["left", "down", "up", "new"];
const qty = (s: { quantity: number } | null) => s?.quantity ?? 0;

/** Which of a long entry's four groups a row falls in; `null` when it did not change copies. */
export function rowGroup(r: HistoryRow): RowGroup | null {
  const before = qty(r.before);
  const after = qty(r.after);
  if (before === after) return null;
  if (after === 0) return "left";
  if (before === 0) return "new";
  return after < before ? "down" : "up";
}

/** A long entry's rows split into its groups, in the fixed order `Left, Went down, Went up, New`. */
export function groupRows(rows: readonly HistoryRow[]): { group: RowGroup; rows: HistoryRow[] }[] {
  const by = new Map<RowGroup, HistoryRow[]>();
  for (const r of rows) {
    const g = rowGroup(r);
    if (g) by.set(g, [...(by.get(g) ?? []), r]);
  }
  return ORDER.filter((g) => by.has(g)).map((g) => ({ group: g, rows: by.get(g)! }));
}

/** Entries of up to this many rows open in place, listing every row; longer ones are grouped and paged. */
export const SHORT_ENTRY_ROWS = 8;
/** A long entry's first screen, then each `Show more`. */
export const GROUP_FIRST = 8;
export const GROUP_STEP = 30;

export const rowDelta = (r: HistoryRow) => qty(r.after) - qty(r.before);
