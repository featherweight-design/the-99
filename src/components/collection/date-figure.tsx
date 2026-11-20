// The figure that leads a row's type line or a tile's sub-line while `/collection` is sorted by Date
// added. It takes the Price figure's slot (`price-figure.tsx`), so the same line carries it in the same
// ink and never shrinks. An exact day is read in the reader's zone (`useZone`); a "since" day is a UTC date, not an instant, and stays UTC.
//
// An EXACT date is a real arrival; a "since" date is only known to be there by then (the file that
// filled an empty collection dates every holding to its day). A card with neither draws nothing.

import type { BrowseListCard } from "../../lib/collection/browse";
import { collectionAddedCopy } from "../../lib/copy/collection-added";
import { wall } from "../../lib/time/zoned";
import { useZone } from "../zone-context";

type Dated = Pick<BrowseListCard, "added" | "since">;

const dayFormat = (zone: string, withYear: boolean) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", ...(withYear ? { year: "numeric" as const } : {}), timeZone: zone });

/**
 * The day as drawn and as spoken. Outside the current year (in `zone`) the drawn form carries a two-digit year
 * (`Sep 22 ’25`), because a narrow tile's caption has about 89px and `since Sep 22, 2025` does not fit; the
 * spoken form keeps all four digits.
 */
function dayOf(ms: number, now: number, zone: string): { text: string; spoken: string } {
  const year = wall(new Date(ms), zone).y;
  const day = dayFormat(zone, false).format(ms);
  if (year === wall(new Date(now), zone).y) return { text: day, spoken: day };
  return { text: `${day} \u2019${String(year).slice(-2)}`, spoken: dayFormat(zone, true).format(ms) };
}

/** The figure as text and its spoken clause, or null for a card with no date. */
export function readCardDate(card: Dated, now: number = Date.now(), zone: string | null = null): { text: string; spoken: string } | null {
  if (card.added !== undefined) {
    const day = dayOf(card.added * 60_000, now, zone ?? "UTC");
    return { text: collectionAddedCopy.exact(day.text), spoken: collectionAddedCopy.spokenExact(day.spoken) };
  }
  if (card.since !== undefined) {
    const day = dayOf(card.since * 86_400_000, now, "UTC");
    return { text: collectionAddedCopy.since(day.text), spoken: collectionAddedCopy.spokenSince(day.spoken) };
  }
  return null;
}

/** Null for silence: the caller draws its line exactly as it would on any other sort. */
export function DateFigure({ card, className }: { card: Dated; className: string }) {
  const date = readCardDate(card, undefined, useZone());
  if (date === null) return null;
  return (
    <span aria-hidden className={`flex-none tabular-nums ${className}`} style={{ color: "var(--fg)" }}>
      {date.text}
    </span>
  );
}

/** The clause the row or tile name gains, last, while sorted by Date added. Null for silence. */
export function dateSpoken(card: Dated, zone: string | null = null): string | null {
  return readCardDate(card, Date.now(), zone)?.spoken ?? null;
}
