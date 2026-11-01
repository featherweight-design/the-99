/**
 * What one device gets from the outbox rows waiting for it (plan `2026-10-22-push.md`, D1, handoff G4). Pure: rows, their
 * resolved items, one device and the time in; messages and bookkeeping out.
 *
 * - A device that subscribed AFTER an event never hears of it: such a row is covered without sending.
 * - Inside the device's held hours (21:00 to 09:00 in ITS zone) nothing goes and nothing is covered: the rows wait. Except a kind the
 *   hold does not apply to (`heldKind`: the seat notice), which is sent live at any hour; `held` still says the device is inside its hours.
 * - Outside them, rows that arrived while the device was NOT held are sent LIVE (one message per kind and batch) and rows that
 *   arrived during the held hours are sent as the morning RELEASE (one per kind). A spare request is never merged. Sends go
 *   oldest news first, so the newest notification of a tag is the last one the device shows.
 */
import { heldKind, isHeld } from "./hold";
import { messagesFor, type PushItem, type PushMessage } from "./message";

export type OutboxRow = { id: string; itemKey: string; createdAt: Date };
export type Device = { id: string; createdAt: Date; timeZone: string };

export type DevicePlan = {
  /** What to send, each with the rows it stands for. */
  sends: { message: PushMessage; rowIds: string[] }[];
  /** Rows this device is done with once every send above succeeds (the sent ones, and those older than the device). */
  covered: string[];
  /** The device is inside its held hours: only a kind exempt from the hold is sent, and only its rows are covered. */
  held: boolean;
};

export function planDevice(rows: readonly OutboxRow[], items: ReadonlyMap<string, PushItem>, device: Device, now: Date): DevicePlan {
  const held = isHeld(now, device.timeZone);
  // Inside the held hours only the exempt kinds are planned; the rest wait, untouched.
  const planned = held ? rows.filter((row) => { const item = items.get(row.id); return item !== undefined && !heldKind(item.kind); }) : rows;
  if (held && planned.length === 0) return { sends: [], covered: [], held: true };
  const covered: string[] = [];
  const live: PushItem[] = [];
  const waiting: PushItem[] = [];
  const rowOf = new Map<string, OutboxRow>();
  for (const row of planned) {
    // An event from before this device existed is not its news.
    if (row.createdAt < device.createdAt) { covered.push(row.id); continue; }
    const item = items.get(row.id);
    if (!item) continue;
    rowOf.set(item.key, row);
    (heldKind(item.kind) && isHeld(row.createdAt, device.timeZone) ? waiting : live).push(item);
  }
  const grouped = [...messagesFor(live, "live"), ...messagesFor(waiting, "release")].map((message) => {
    const rowsOf = message.keys.flatMap((k) => (rowOf.get(k) ? [rowOf.get(k)!] : []));
    return { message, rowIds: rowsOf.map((r) => r.id), newest: Math.max(...rowsOf.map((r) => r.createdAt.getTime())) };
  });
  // In the order the news happened, oldest first: messages of one tag replace each other on the device in the order they
  // arrive, so the newest must come last, whether it is the morning's release or a daytime push.
  const sends = grouped.sort((a, b) => a.newest - b.newest).map(({ message, rowIds }) => ({ message, rowIds }));
  for (const s of sends) covered.push(...s.rowIds);
  return { sends, covered, held };
}
