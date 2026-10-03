// Availability-filter options — the pure half of the Availability ▾ panel (#43).
//
// Mirrors type-filter.ts, with two deliberate differences, both from
// Addendum 2 §4:
//
// 1. A count is the number of DISTINCT cards, not the sum of quantities.
//    Availability is classified once per oracle_id, so a per-card count is the
//    only one that partitions — the four numbers must add up to the collection
//    total, and summed quantities would not.
// 2. The vocabulary is the four states, always all four, so a state with no
//    matches is listed disabled rather than removed.

import { availabilityState, type AvailabilityState } from "../decks/availability";
import { availabilityCopy } from "../copy/availability";
import { filterCards, type BrowseListCard, type BrowseFilters } from "./browse";

/** Menu order, top to bottom, per the addendum canvas. */
export const AVAILABILITY_STATES: AvailabilityState[] = ["free", "soft", "hard", "over"];

const LABEL: Record<AvailabilityState, string> = {
  free: availabilityCopy.collection.filterFree,
  soft: availabilityCopy.collection.filterSoft,
  hard: availabilityCopy.collection.filterHard,
  over: availabilityCopy.collection.filterOver,
};

/**
 * URL tokens. `inuse` and `over` are fixed by the addendum's worked example
 * (`?avail=inuse,over`); `free` and `brew` are chosen to match — short, lower
 * case, and readable next to them. The internal codes stay AvailabilityState
 * values, so the translation happens only at the URL boundary.
 */
const PARAM_TOKEN: Record<AvailabilityState, string> = {
  free: "free",
  soft: "brew",
  hard: "inuse",
  over: "over",
};
const STATE_BY_TOKEN = new Map<string, AvailabilityState>(
  AVAILABILITY_STATES.map((s) => [PARAM_TOKEN[s], s]),
);

export type AvailabilityOption = {
  code: AvailabilityState;
  label: string;
  count: number;
  disabled: boolean;
};

export function availabilityLabel(state: AvailabilityState): string {
  return LABEL[state];
}

/**
 * A card with no availability entry reads as free — an unclaimed card and a
 * failed read are the same silence everywhere else in this feature, and the
 * four counts must still partition.
 */
export function cardAvailabilityState(card: BrowseListCard): AvailabilityState {
  return card.availability ? availabilityState(card.availability) : "free";
}

/**
 * The four states with the number of cards in each under the OTHER active
 * filters — not the free-text search box, and not this panel's own selection,
 * the same convention set-filter.ts and type-filter.ts follow.
 */
export function buildAvailabilityOptions(
  cards: BrowseListCard[],
  filters: BrowseFilters,
): AvailabilityOption[] {
  const surviving = filterCards(cards, {
    search: "",
    colors: filters.colors,
    match: filters.match,
    types: filters.types,
    setCodes: filters.setCodes,
  });

  const counts = new Map<AvailabilityState, number>(AVAILABILITY_STATES.map((s) => [s, 0]));
  for (const c of surviving) {
    const state = cardAvailabilityState(c);
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  return AVAILABILITY_STATES.map((code) => {
    const count = counts.get(code) ?? 0;
    return { code, label: LABEL[code], count, disabled: count === 0 };
  });
}

/** `?avail=inuse,over` → `["hard","over"]`, in menu order, unknowns dropped. */
export function parseAvailabilityParam(param: string | null): AvailabilityState[] {
  if (!param) return [];
  const picked = new Set<AvailabilityState>();
  for (const raw of param.split(",")) {
    const state = STATE_BY_TOKEN.get(raw.trim().toLowerCase());
    if (state) picked.add(state);
  }
  return AVAILABILITY_STATES.filter((s) => picked.has(s));
}

/**
 * The selection a page load starts with. `?avail=` is a request, not a promise
 * — the /commanders ruling, applied here. On a failed read every card falls
 * through filterCards as free, so honouring `?avail=inuse` would draw an empty
 * collection behind a disabled control, with nothing on screen able to clear it.
 */
export function initialAvailability(ok: boolean, param: string | null): AvailabilityState[] {
  return ok ? parseAvailabilityParam(param) : [];
}

/**
 * Add or drop a state, keeping the selection in menu order. Unlike Set and
 * Type, whose chips deliberately read in selection order, this vocabulary is
 * fixed and four long, and the menu draws it in one order everywhere — so
 * ticking Over then In use has to leave the chips and the URL reading the same
 * way round as reopening the menu would.
 */
export function toggleAvailability(
  current: AvailabilityState[],
  state: AvailabilityState,
): AvailabilityState[] {
  const next = new Set(current);
  if (!next.delete(state)) next.add(state);
  return AVAILABILITY_STATES.filter((s) => next.has(s));
}

/**
 * `["hard","over"]` → `inuse,over`. Menu order, so the round trip through
 * parseAvailabilityParam is an identity and a reload cannot reshuffle the URL.
 */
export function serializeAvailability(states: AvailabilityState[]): string {
  const picked = new Set(states);
  return AVAILABILITY_STATES.filter((s) => picked.has(s))
    .map((s) => PARAM_TOKEN[s])
    .join(",");
}
