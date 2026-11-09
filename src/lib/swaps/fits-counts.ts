import type { Availability } from "../cards/availability";
import type { FitsRead } from "./fits";

/**
 * The name and copy counts the free list heads with (`useFitsList`, `fits-picker.tsx`), from the card as it opened and
 * the list's read. Pure, and out of the hook: shared with the landing demo's exporter (PR 6b-2), so both count by the
 * same rule.
 *
 * - The name is the opened copy's printed name, else the card's (`card.printedName ?? card.name`, the picker's own
 *   expression: a `printedName` the payload leaves out reads as none).
 * - Known before the read lands, off the card payload, so the loading state draws it too (F15).
 * - The payload's count is the card as it opened, so once an add has spent a copy (`spent`: a write beside the list, or
 *   an add from it) only a read knows. Before a read, the payload's count stands only when its availability read
 *   worked: a null there is an unknown count, never `none free`.
 */
export function fitsCounts(input: {
  card: { name: string; printedName?: string | null; quantity: number; availability?: Pick<Availability, "free"> | null };
  read: FitsRead | null;
  spent: boolean;
}) {
  const { card, read, spent } = input;
  const free = read ? read.free ?? 0 : card.availability?.free ?? 0;
  return {
    name: card.printedName ?? card.name,
    owned: read ? read.owned : card.quantity,
    freeNow: Math.max(0, free),
    countsKnown: read !== null || (!spent && card.availability != null),
  };
}
