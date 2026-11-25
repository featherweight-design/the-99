import { cardAvailabilityState } from "./availability-filter";
import { filterCards, type BrowseFilters, type BrowseListCard } from "./browse";
import { QUICK_KEYS, isFreeAlone, matchesQuick, type QuickKey } from "./quick-filters";

export type QuickCounts = { free: number } & Record<QuickKey, number>;

/**
 * The count printed on each chip: the cards the chip's own press would leave, so the figure it promised is the list
 * the press shows. Every OTHER filter holds, and `quick` is the chip's own. Pressing In no deck takes the availability
 * selection back out, and pressing a fact or foil chip while In no deck is pressed does too (`pressQuick` in
 * `browser.tsx` replaces the free-only selection), so the fact chips count without it then.
 */
export function quickCounts(list: BrowseListCard[], f: BrowseFilters): QuickCounts {
  const withoutQuick = { ...f, quick: undefined };
  const rest = filterCards(list, withoutQuick);
  // Available only when there is a selection to remove; otherwise it is `rest`.
  const unclaimed = f.availability?.length ? filterCards(list, { ...withoutQuick, availability: [] }) : rest;
  const factBase = isFreeAlone(f) ? unclaimed : rest;
  const counts: QuickCounts = { free: 0, gc: 0, tutor: 0, turns: 0, mld: 0, foil: 0 };
  for (const card of factBase) for (const key of QUICK_KEYS) if (matchesQuick(card, key)) counts[key]++;
  counts.free = unclaimed.reduce((n, c) => n + (cardAvailabilityState(c) === "free" ? 1 : 0), 0);
  return counts;
}
