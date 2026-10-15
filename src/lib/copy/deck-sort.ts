// Deck list sort — the copy block and the four pure helpers behind the deck
// page's `Sort` trigger.
//
// Shaped like `collectionFilterCopy.sort` (`copy/collection.ts:328-360`) and
// satisfying the same `FilterPanelCopy` contract, so the deck list mounts
// `FilterPanel` in `selectionMode="single"` rather than becoming a fifth menu
// implementation. There must never be a second copy of the direction labels:
// this list and `/collection` both name directions per key, and the two
// vocabularies are deliberately different words for deliberately different
// keys.
//
// Handoff: `design/design_handoff_the99_decklist_sort/` (R1), verdict
// `docs/superpowers/readiness-decklist-sort.md`, brief
// `docs/superpowers/design-briefs/2026-09-14-ordering-the-deck-list.md`.
//
// ONE departure from the /collection block, and it is `triggerOne`.

import type { FilterPanelCopy } from "./collection";

export type DeckSortKey = "name" | "price" | "mana";
export type DeckSortDirection = "asc" | "desc";

/** The three keys, in panel order. `price` is filtered out under `All`. */
export const DECK_SORT_KEYS = ["name", "price", "mana"] as const satisfies readonly DeckSortKey[];

/**
 * Offered under `Shopping` only (brief §2.4). Every deck card carries a price
 * fact server-side, so a price order under `All` would be REAL — but an `All`
 * row draws no figure, so the reader would be handed an order nothing on the
 * page confirms. Not a disabled row: the order is not unavailable, it is not a
 * question on that lane.
 */
export const DECK_SORT_KEYS_BY_FILTER: Record<"all" | "shopping", readonly DeckSortKey[]> = {
  all: ["name", "mana"],
  shopping: ["name", "price", "mana"],
};

const DECK_SORT_LABELS: Record<DeckSortKey, string> = {
  name: "Name",
  // Not "Price to buy", not "Cost". The strip below this row already says
  // dollars and nothing else on the deck page competes for the word.
  price: "Price",
  // The app's own term (consider-panel.tsx:119). "Cost" is the ambiguity this
  // word exists to avoid on a surface that also shows money.
  mana: "Mana value",
};

/**
 * How each key's two directions read — `/collection`'s rule
 * (sort-options.ts:37-44): "A–Z" says more than "ascending" for a name and
 * nothing at all for a rarity, so every key gets its own pair.
 *
 * `price` names its extremes as FIGURES, not as shopping. The workshop's straw
 * man was `Cheapest` / `Dearest`; `dearest` is British, and this copy layer is
 * US English throughout — `Color identity` in the chassis block, `en-US` pinned
 * through every formatter in this file's sibling. `Lowest` / `Highest` also
 * keeps /collection's pattern of naming the extreme rather than the direction
 * (`Fewest`/`Most`, `Common first`/`Mythic first`), and beside a strip reading
 * `$129.50` there is nothing else `Highest` could mean.
 *
 * `Curve up` / `Curve down` for mana value, and NOTE WHAT CHANGED: R1's first
 * argument was collision — the shipped `Cheapest to cast` (consider-panel.tsx)
 * sitting two 44px rows above a `Price · Cheapest`. With the money words gone
 * from `price`, that argument goes with them. The pair now stands on one thing
 * only: it abbreviates a sentence this same deck already shows the reader —
 * `deckVersioningCopy.changed` ships "the curve goes up" and "the curve comes
 * down" on its own diff (lib/copy/deck-versioning.ts:440-441).
 *
 * So the shipped `Cheapest to cast` is available again and is the live
 * alternative. What it still lacks is a reverse: `Dearest to cast` is the word
 * just retired and `Priciest to cast` is a coinage. Flagged in READINESS.
 */
const DECK_DIRECTION_LABELS: Record<DeckSortKey, Record<DeckSortDirection, string>> = {
  name: { asc: "A–Z", desc: "Z–A" },
  price: { asc: "Lowest", desc: "Highest" },
  mana: { asc: "Curve up", desc: "Curve down" },
};

/**
 * The direction a key adopts when it is newly picked.
 *
 * `price` is `desc` because that is what ships: the Shopping list has sorted
 * highest-first since PR #629 (decklist.tsx:355-367), and this control names
 * that order rather than replacing it (brief §2.7). Changing the default here
 * would silently re-sort every shopping list in the app on deploy.
 */
export const DECK_DEFAULT_SORT_DIRECTION: Record<DeckSortKey, DeckSortDirection> = {
  name: "asc",
  price: "desc",
  mana: "asc",
};

export function deckSortDirectionLabel(key: DeckSortKey, direction: DeckSortDirection): string {
  return DECK_DIRECTION_LABELS[key][direction];
}

/** "Name · A–Z" — the trigger and the chosen row both read as the whole order. */
export function deckSortOrderLabel(key: DeckSortKey, direction: DeckSortDirection): string {
  return `${DECK_SORT_LABELS[key]} · ${deckSortDirectionLabel(key, direction)}`;
}

/**
 * The panel's rows for one lane. Only the chosen row carries a hint: an
 * unchosen row has no direction yet — picking it adopts that key's default — so
 * labelling one would promise a state the click does not produce
 * (brief §2.3, sort-options.ts:59-66).
 *
 * `count: 0` and `disabled: false` throughout. `showCounts={false}` on the
 * mount, so the zeroes never render.
 */
export function buildDeckSortOptions(
  filter: "all" | "shopping",
  key: DeckSortKey,
  direction: DeckSortDirection,
) {
  return DECK_SORT_KEYS_BY_FILTER[filter].map((k) => ({
    code: k,
    label: DECK_SORT_LABELS[k],
    hint: k === key ? deckSortDirectionLabel(k, direction) : undefined,
    count: 0,
    disabled: false,
  }));
}

/**
 * Picking a row: a different key switches to it in its natural direction;
 * picking the chosen key reverses it. That reversal is the only direction
 * control — brief §2.2, and `/collection`'s own reasoning, which this reuses
 * rather than restates.
 */
export function nextDeckSortState(
  current: { key: DeckSortKey; direction: DeckSortDirection },
  picked: DeckSortKey,
): { key: DeckSortKey; direction: DeckSortDirection } {
  if (picked !== current.key) return { key: picked, direction: DECK_DEFAULT_SORT_DIRECTION[picked] };
  return { key: picked, direction: current.direction === "asc" ? "desc" : "asc" };
}

export const deckSortCopy: FilterPanelCopy = {
  // ── Trigger ──────────────────────────────────────────────────────────────
  //
  // Unreachable: one row is always chosen, so the trigger always has an order
  // to print. Kept because the shape is shared.
  triggerLabel: "Sort",

  /**
   * THE ONE DEPARTURE. `/collection` reads `Sort: Name · A–Z`; this reads
   * `Name · A–Z`.
   *
   * Two reasons, and the first is a measurement. The prefix is 38px, and 38px
   * is the difference between the list/card well staying on the arrangement
   * line at 390px and landing alone on a fourth: 345 of 358 without it, 383 of
   * 358 with it.
   *
   * The second is that this is the right row to lose the word on. On
   * `/collection` the prefix earns its width because the trigger sits among
   * `Type`, `Set` and `Availability`, where a bare value would read as a filter
   * value. Here the neighbours are `By type` and `By role` — already
   * arrangement statements — and this row's `Group` caption was retired at the
   * refresh for exactly this: a label naming the category beside controls that
   * say it themselves.
   *
   * Nothing is lost to a reader who cannot see the neighbours: the accessible
   * names below carry the word in full.
   */
  triggerOne: (order: string) => order,

  triggerAriaCollapsed: "Sort the deck list, collapsed",
  // Unreachable under single-select (`selected.length` is always 1), so the
  // count is dropped rather than announced as a selection nobody made.
  triggerAriaWithSelection: () => "Sort the deck list, collapsed",

  // ── Panel chrome ─────────────────────────────────────────────────────────
  //
  // "Sort the deck list", not `/collection`'s "Sort cards". The page holds one
  // list, and `card` is overloaded on this surface — the list/card well two
  // controls away means a tile, not a card.
  panelAriaLabel: "Sort the deck list",
  sheetTitle: "Sort by",

  // `searchable={false}`: the field and the group labels both drop. Three rows
  // have nothing to search.
  searchPlaceholder: "Search",
  searchAriaLabel: "Search sort orders",
  clearSearch: "Clear search",

  groupDefault: "Sort by",
  groupSelected: () => "Current",
  groupMatches: (n: number) => (n === 1 ? "1 match" : `${n} matches`),

  // ── Option ───────────────────────────────────────────────────────────────
  //
  // Verbatim from the /collection block, including the reversal clause. The
  // hint carries the direction, so the name reads as the whole order, and the
  // chosen row is the ONLY place the re-pick rule is stated out loud — nothing
  // on screen says it.
  optionAria: (order: string, _count: number, selected = false) =>
    selected ? `${order}, current order, choose again to reverse` : order,
  optionAriaUnavailable: (order: string) => order,

  // ── Footer ───────────────────────────────────────────────────────────────
  //
  // `renderFooter` returns null for single-select on desktop, and `Clear` never
  // renders at either width: a list is always sorted by something, so there is
  // no empty selection to offer one for. Written out, inert.
  footerTotal: () => "",
  footerSelected: () => "",
  clear: "Clear",
  // The sheet's way out. Commits nothing — the pick applied and dismissed the
  // sheet already; this is for a reader who opened it and changed their mind.
  done: "Done",
  closeLabel: "Close",

  // Unreachable: no search field, so no query, so no no-results state.
  emptyTitle: "No sort orders",
  emptyBody: (query: string) => ({
    before: "No sort order matches ",
    query: `“${query}”`,
    after: ".",
  }),

  // ── Live region ──────────────────────────────────────────────────────────
  //
  // Through the deck page's existing region. One sentence, both directions:
  // "Sorted by Name · Z–A." A reordering is not an addition or a removal, so
  // the added/removed pair say the same thing, exactly as they do on
  // /collection.
  announceMatches: (n: number) => `${n} sort orders`,
  announceAdded: (order: string) => `Sorted by ${order}.`,
  announceRemoved: (order: string) => `Sorted by ${order}.`,
  announceCleared: () => "",
};

// Persistence lives in `lib/decks/sort-memory.ts`, which owns the key and the
// wire format. The handoff's sample exported a `DECK_SORT_KEY_STORAGE` constant
// here as well; two constants for one key is how the exported name and the key
// actually written come to disagree, so this module keeps the copy and the
// helpers and nothing else.

/**
 * The decklist's two groupings, as the toggle draws them.
 *
 * Here rather than inline in `group-toggle.tsx` because a second reader
 * appeared: the /about figure that documents this control. Two literals in two
 * files is how a figure goes stale on a rename while every test passes, which
 * is exactly what the sort labels below were moved out of.
 */
export const DECK_GROUPING_LABELS = { type: "By type", role: "By role" } as const;

/** The grouping switch's accessible name (a radiogroup's label; segmented-switch plan, PR 1). */
export const DECK_GROUPING_ARIA = "Group the list";

/** Where the reader's last grouping is kept: one key for every deck, as `the99:deck-view` is. */
export const DECK_GROUPING_KEY = "the99:deck-grouping";

export type DeckGrouping = "type" | "role";

export function isDeckGrouping(value: string): value is DeckGrouping {
  return value === "type" || value === "role";
}
