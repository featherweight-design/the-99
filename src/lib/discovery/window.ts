// `/discover`'s window: which rows, in which order, a reader with these parameters sees.
//
// Moved here from `discovery-view.tsx` unchanged (plans/2026-09-28-list-payload-shrink.md,
// PR 3), because the SERVER now needs the same answer: it ships the draw-only columns only for
// the rows of the URL's own first window, and a second copy of this logic on the server would
// drift from the client's a round at a time. One definition, imported by both.
import { filterByColors, type JoinMode } from "../commanders/filter";
import { discoverSort, type LaneOrder } from "../commanders/lane-params";
import { isPrintedIn } from "../sets/printed-in";

/** The figures the client-side orders rank on, and nothing a row only draws. */
type OrderedRow = { name: string; releasedAt: string | null; deckCount: number | null };

// `filterByColors` matches against `colorIdentity`, which is upper-case
// throughout the catalog; `lane-params` writes the URL in lower case. The lift
// happens once, here, exactly as the owned lane does it.
export const upper = (colors: string[]) => colors.map((c) => c.toUpperCase());

/**
 * The lane's client-side ordering — three of its five orders, over rows the
 * client already holds. A round trip for a sort of a list in memory is the
 * request this lane's cache exists to avoid, and the payload carries every
 * figure they rank on. None of these touches `rank`, which stays the position in
 * the server's own ranking.
 *
 * The other two, `bestfit` and `new`, fall through untouched: they ARE the
 * server's ranking, and the payload already arrives in that order. That
 * fallthrough is the whole of the fix — the build before this one re-sorted
 * every payload by a separate order control, so the ranking the reader asked for
 * never reached the screen.
 *
 * `popularity` sorts on the EDHREC deck count, which is the figure the row
 * prints under that name. It is NOT the server's own order: the server ranks on
 * support or on novelty, so returning the list untouched here would have printed
 * `Popularity` over whichever of those was active and called it the deck count.
 *
 * A row with no figure sorts last in both figure orders. An undated set and an
 * uncounted commander are absences, and an absence ordered as a zero would be
 * the claim that nobody has built it.
 */
export function ordered<T extends OrderedRow>(rows: T[], order: LaneOrder): T[] {
  if (order === "name") {
    return [...rows].sort((a, b) => a.name.localeCompare(b.name, "en"));
  }
  if (order === "recent") {
    return [...rows].sort((a, b) => (b.releasedAt ?? "").localeCompare(a.releasedAt ?? ""));
  }
  if (order === "popularity") {
    return [...rows].sort((a, b) => (b.deckCount ?? -1) - (a.deckCount ?? -1));
  }
  return rows;
}


/**
 * Search narrows first: name matching only, case-insensitive. Nothing is trimmed off the middle:
 * a player typing "ur-dragon" has typed part of a name, and normalising punctuation here would be
 * a second matcher disagreeing with the server's.
 */
export function searchRows<T extends { name: string }>(rows: T[], q: string): T[] {
  const needle = q.trim().toLowerCase();
  if (needle === "") return rows;
  return rows.filter((r) => r.name.toLowerCase().includes(needle));
}

/**
 * `Printed in` (decision 9). With no index the selection is not applied: there is nothing to
 * apply it against.
 */
export function inSets<T extends { slug: string }>(
  rows: T[],
  codesBySlug: ReadonlyMap<string, readonly string[]> | null,
  setCodes: readonly string[],
): T[] {
  return setCodes.length === 0 || !codesBySlug
    ? rows
    : rows.filter((r) => isPrintedIn(codesBySlug, r.slug, setCodes));
}

export type WindowParams = {
  q: string;
  /** As the URL writes them, lower case; lifted here. */
  colors: string[];
  match: JoinMode;
  order: LaneOrder;
  printedIn: string[];
};

/** Search, then sets, then colour, then order: the list the reader is looking at, whole. */
export function discoveryRows<T extends OrderedRow & { slug: string; colorIdentity: string[] }>(
  rows: T[],
  p: WindowParams,
  codesBySlug: ReadonlyMap<string, readonly string[]> | null,
): T[] {
  const narrowed = inSets(searchRows(rows, p.q), codesBySlug, p.printedIn);
  return ordered(filterByColors(narrowed, upper(p.colors), p.match), p.order);
}

/**
 * The parameters with `order` corrected to the ranking the server actually
 * returned. Only `new` can be refused — `loadDiscovery` downgrades it when there
 * is no built deck to measure novelty from — and the four orders that ask for
 * the fit ranking always get it, so a mismatch has exactly one meaning and one
 * repair. Returning the same object when nothing moved is what lets the caller
 * skip a set during render.
 */
export function settleOrder<P extends { order: LaneOrder }>(p: P, sort: "fit" | "new"): P {
  return discoverSort(p.order) === sort ? p : { ...p, order: "bestfit" };
}
