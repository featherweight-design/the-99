/**
 * What the live table shows has moved since the viewer last drew it (plan `2026-10-16-rule-zero.md` PR 4; readiness
 * G5; boards S5, W5): the changed dot on a seat and `Since you looked` on the read. Pure: the page hands in the
 * snapshot it drew and the time it draws at.
 *
 * A seat is changed when its `changedAt` is after the viewer's `seenAt`, the `revision` of the last snapshot they drew
 * (`markSeen`). Before their first draw there is nothing to have looked at, so nothing is changed. The viewer's own
 * seat never carries the dot: its changes are their own, which the swap draws as `changed just now` (PR 7).
 */
import type { ThirdPartyName } from "../person-name/brand";
import { ruleZeroCopy } from "../copy/rule-zero";
import type { ClosedHow, ClosedTable, TableSeat, TableView } from "../social/rule-zero-table";

export function seatChanged(seat: Pick<TableSeat, "you" | "changedAt">, seenAt: Date | null): boolean {
  return !seat.you && seenAt !== null && seat.changedAt.getTime() > seenAt.getTime();
}

/**
 * The viewer's own seat holds the deck they swapped to this visit (S2's `changed just now`): `swappedTo` is the deck the
 * page itself seated, null before any swap and after an Undo. Never a read of another player's look: the seat keeps the
 * mark for the swapper's own visit only.
 */
export function ownChanged(seat: Pick<TableSeat, "you" | "deck">, swappedTo: string | null): boolean {
  return seat.you && swappedTo !== null && seat.deck?.deckId === swappedTo;
}

/** `Since you looked`'s sentences, in seat order: each changed seat that now holds a deck, and what it holds. */
export function sinceYouLooked(view: Pick<TableView, "seats" | "seenAt">): { name: string | ThirdPartyName; deck: string | ThirdPartyName }[] {
  return view.seats.flatMap((s) => (seatChanged(s, view.seenAt) && s.deck ? [{ name: s.displayName, deck: s.deck.name }] : []));
}

const MINUTE_MS = 60_000;

/** A changed seat's line: `changed just now`, `changed 1 min ago`, `changed 2 hr ago`. A table lasts a day. */
export function changedLine(at: Date, now: Date): string {
  const minutes = Math.floor(Math.max(0, now.getTime() - at.getTime()) / MINUTE_MS);
  if (minutes < 1) return ruleZeroCopy.seat.changedNow;
  return ruleZeroCopy.seat.changedAgo(minutes < 60 ? `${minutes} min ago` : `${Math.floor(minutes / 60)} hr ago`);
}

/** The JSON a poll answers turns every date into a string: put the ones `TableView` carries back. */
export function reviveTableView(raw: TableView): TableView {
  const at = (d: Date | string) => new Date(d);
  return {
    ...raw,
    closesAt: at(raw.closesAt),
    revision: at(raw.revision),
    seenAt: raw.seenAt === null ? null : at(raw.seenAt),
    seats: raw.seats.map((s) => ({ ...s, changedAt: at(s.changedAt) })),
  };
}

/** A closed table as the poll's JSON carries it: `how.at` is an ISO string, not the Date the server held. */
export type ClosedTableWire = Omit<ClosedTable, "how"> & {
  how: { kind: "host"; byYou: boolean; by: ThirdPartyName | null; at: string; logOpen: boolean } | { kind: "morning"; at: string };
};

/** The closed twin of `reviveTableView`: `how.at` goes back to a Date before anything calls a Date method on it. */
export function reviveClosedTable(raw: ClosedTableWire): ClosedTable {
  return { ...raw, how: { ...raw.how, at: new Date(raw.how.at) } as ClosedHow };
}
