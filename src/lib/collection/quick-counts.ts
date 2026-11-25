import { cardAvailabilityState } from "./availability-filter";
import { filterCards, type BrowseFilters, type BrowseListCard } from "./browse";
import { QUICK_KEYS, matchesQuick, type QuickKey } from "./quick-filters";

export type QuickCounts = { free: number } & Record<QuickKey, number>;

/**
 * The count printed on each chip: the cards every OTHER filter leaves, so a pressed chip keeps its own figure and
 * the strip reads the same before and after a press. In no deck counts without the availability selection, which is
 * the chip's own.
 */
export function quickCounts(list: BrowseListCard[], f: BrowseFilters): QuickCounts {
  const rest = filterCards(list, { ...f, quick: undefined });
  const counts: QuickCounts = { free: 0, gc: 0, tutor: 0, turns: 0, mld: 0, foil: 0 };
  for (const card of rest) for (const key of QUICK_KEYS) if (matchesQuick(card, key)) counts[key]++;
  const unclaimed = f.availability?.length ? filterCards(list, { ...f, quick: undefined, availability: [] }) : rest;
  counts.free = unclaimed.reduce((n, c) => n + (cardAvailabilityState(c) === "free" ? 1 : 0), 0);
  return counts;
}
