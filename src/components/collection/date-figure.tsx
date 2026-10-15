// The figure that leads a row's type line or a tile's sub-line while `/collection` is sorted by Date
// added. It takes the Price figure's slot (`price-figure.tsx`), so the same line carries it in the same
// ink and never shrinks. Days are read in UTC so the server's draw and the browser's agree.
//
// An EXACT date is a real arrival; a "since" date is only known to be there by then (the file that
// filled an empty collection dates every holding to its day). A card with neither draws nothing.

import type { BrowseListCard } from "../../lib/collection/browse";
import { collectionAddedCopy } from "../../lib/copy/collection-added";

type Dated = Pick<BrowseListCard, "added" | "since">;

const MONTH_DAY = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const WITH_YEAR = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function dayOf(ms: number, now: number): string {
  const sameYear = new Date(ms).getUTCFullYear() === new Date(now).getUTCFullYear();
  return (sameYear ? MONTH_DAY : WITH_YEAR).format(ms);
}

/** The figure as text and its spoken clause, or null for a card with no date. */
export function readCardDate(card: Dated, now: number = Date.now()): { text: string; spoken: string } | null {
  if (card.added !== undefined) {
    const day = dayOf(card.added * 60_000, now);
    return { text: collectionAddedCopy.exact(day), spoken: collectionAddedCopy.spokenExact(day) };
  }
  if (card.since !== undefined) {
    const day = dayOf(card.since * 86_400_000, now);
    return { text: collectionAddedCopy.since(day), spoken: collectionAddedCopy.spokenSince(day) };
  }
  return null;
}

/** Null for silence: the caller draws its line exactly as it would on any other sort. */
export function DateFigure({ card, className }: { card: Dated; className: string }) {
  const date = readCardDate(card);
  if (date === null) return null;
  return (
    <span aria-hidden className={`flex-none tabular-nums ${className}`} style={{ color: "var(--fg)" }}>
      {date.text}
    </span>
  );
}

/** The clause the row or tile name gains, last, while sorted by Date added. Null for silence. */
export function dateSpoken(card: Dated): string | null {
  return readCardDate(card)?.spoken ?? null;
}
