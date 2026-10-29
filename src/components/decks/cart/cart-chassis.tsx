"use client";

// The cart's filter chassis (handoff Controls A1, A2, B1, C1/C2; addendum R2 §4; plan PRs 8 and 9): the app's one filter
// frame (`ui/filter-chassis`) under the view switch, built from the shipped parts as they are:
//   - 1000px and up: the search field, `Friend ▾` and `Owned ▾` (`FilterPanel` mounts), then `Sort · <current> ▾` past
//     the hairline (`OrderMenu`);
//   - below it: the search field and the 36px Filters pill with its count badge, which opens `CartFilterSheet`, then the
//     44px ⇅ that opens `OrderMenu`'s dropdown, as /decks does (R2 retired the cart's own sort sheet).
// Row 2 holds a chip per filter on and the search's; row 3 the cart's sentence, which REPLACES the list head. Search,
// Friend and Owned narrow the same lines in every view (D4) and the sort is the view's own, so this takes the filters'
// state and the view's order set and knows nothing about which view it is.

import { useState } from "react";
import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { OWNED_FILTERS, CART_SORTS, type CartView, type FriendFilter, type OwnedFilter } from "../../../lib/decks/cart-sort";
import { CHASSIS_WIDE_MIN_PX, FilterChassis, type FilterChip } from "../../ui/filter-chassis";
import { FilterPanel } from "../../ui/filter-panel";
import { useMinWidth } from "../../ui/use-min-width";
import { FiltersTrigger } from "../../collection/filter-bar";
import { Face } from "../../social/face";
import { DeckSearchField } from "../deck-filter-column";
import { OrderMenu } from "../deck-sort-menu";
import { CartFilterSheet, type FriendOffer } from "./cart-filter-sheet";

export type { FriendOffer } from "./cart-filter-sheet";

/** The longest search a chip draws before it ends in an ellipsis. */
const CHIP_TERM_MAX = 24;

const LABELS: Record<CartView, Readonly<Record<string, string>>> = {
  card: copy.sort.byCard,
  deck: copy.sort.byDeck,
  friend: copy.sort.byFriend,
};

const OWNED_LABEL: Record<OwnedFilter, string> = {
  any: copy.filters.ownedAny,
  some: copy.filters.ownedSome,
  none: copy.filters.ownedNone,
};

/** The chip's dimension, drawn before its value as the board's `<em>` (Controls C1), and spoken with it. */
const dimension = (word: string) => <span aria-hidden className="text-[color:var(--fg-muted)]">{word}</span>;

/** The filters' state and their presses, as the cart holds them. */
export type CartFilters = {
  friend: FriendFilter;
  onFriend: (code: string) => void;
  /** The Friend dimension as it can be offered now; `none` hides the trigger and the sheet's group (B2, call 6). */
  offer: FriendOffer;
  /** Whether the Friend filter narrows the list now: a failed read leaves it inert, with no chip and no badge. */
  friendLive: boolean;
  onFriendOff: () => void;
  owned: OwnedFilter;
  onOwned: (next: OwnedFilter) => void;
  /** The lines each Owned value would leave, the search and the Friend filter applied: the desktop panel's counts. */
  ownedCounts: Readonly<Record<OwnedFilter, number>>;
  /** The lines every filter and the search leave, and the selected lines before them (the sheet's figure). */
  shown: number;
  of: number;
  onClearAll: () => void;
};

export function CartChassis({
  view, query, onQuery, sort, onSort, resultLine, reading, filters,
}: {
  view: CartView;
  /** The search, as typed. */
  query: string;
  onQuery: (next: string) => void;
  /** The view's order, one of `CART_SORTS[view]`. */
  sort: string;
  onSort: (next: string) => void;
  /** Row 3's sentence, finished by the cart. */
  resultLine: string;
  /** Friends' spares are still being read: the result line's trailing slot says so. */
  reading: boolean;
  filters: CartFilters;
}) {
  const wide = useMinWidth(`(min-width: ${CHASSIS_WIDE_MIN_PX}px)`);
  const [sheet, setSheet] = useState(false);
  // The sheet belongs to the compact form: crossing into the wide one closes it, so it cannot reopen on the way back.
  if (wide && sheet) setSheet(false);
  const order = CART_SORTS[view];
  const labels = LABELS[view];
  const term = query.trim();
  const { friend, offer, owned } = filters;
  const friendOn = filters.friendLive && friend !== null;
  // A long term is cut for the eye and spoken whole, so the chip and its ✕ stay inside a phone's width.
  const shortTerm = term.length > CHIP_TERM_MAX ? `${term.slice(0, CHIP_TERM_MAX)}…` : term;
  const friendNames = offer.kind === "friends" ? new Map(offer.friends.map((o) => [o.friend.publicId, o.friend.displayName])) : new Map<string, string>();
  // One chip for the Friend filter, Any or the named friends, whose ✕ turns it off (decision 2); then Owned; then the
  // search (Controls C2, D: the filters' chips lead).
  // Never a public id: until the read lands a named filter's chip is name-free, reading as the trigger does; once it
  // lands every id left has a name (the cart drops the rest, decision 2).
  const named = (friend === null || friend === "any" ? [] : friend).flatMap((id) => friendNames.get(id) ?? []);
  const friendValue = friend === "any" ? copy.filters.anyFriend : named.length > 0 ? named.join(", ") : copy.filters.friendReading;
  const chips: FilterChip[] = [
    ...(friendOn ? [{
      key: "friend", leading: dimension(copy.filters.chipFriend), label: friendValue,
      spoken: `${copy.filters.chipFriend} ${friendValue}`, onRemove: filters.onFriendOff,
    }] : []),
    ...(owned !== "any" ? [{
      key: "owned", leading: dimension(copy.filters.chipOwned), label: OWNED_LABEL[owned],
      spoken: `${copy.filters.chipOwned} ${OWNED_LABEL[owned]}`, onRemove: () => filters.onOwned("any"),
    }] : []),
    ...(term ? [{
      key: "q", label: copy.filters.chipSearch(shortTerm), spoken: shortTerm === term ? undefined : copy.filters.chipSearch(term), onRemove: () => onQuery(""),
    }] : []),
  ];
  // The badge counts the dimensions on behind the button, never the search, which sits beside it (as /collection's does).
  const active = (friendOn ? 1 : 0) + (owned !== "any" ? 1 : 0);
  const search = (
    <div className="min-w-0 flex-auto">
      <DeckSearchField value={query} onChange={onQuery} size={wide ? "column" : "sheet"} active={term !== ""} placeholder={copy.filters.search} />
    </div>
  );
  return (
    <FilterChassis
      form={wide ? "wide" : "compact"}
      controls={
        wide ? (
          <>
            {search}
            <FriendTrigger filters={filters} />
            <FilterPanel
              desktopRowMinPx={44}
              compact={false}
              copy={copy.panels.owned}
              options={OWNED_FILTERS.map((value) => ({
                code: value, label: OWNED_LABEL[value], count: filters.ownedCounts[value], disabled: filters.ownedCounts[value] === 0 && owned !== value,
              }))}
              selected={[owned]}
              onToggle={(code) => filters.onOwned(code as OwnedFilter)}
              onClear={() => filters.onOwned("any")}
              selectionMode="single"
              // Any is Owned's rest, so only a real pick lights the trigger.
              selectionOrnament={owned !== "any"}
              widthPx={280}
              footerStatus={false}
            />
          </>
        ) : (
          <>
            {search}
            <FiltersTrigger active={active} expanded={sheet} onClick={() => setSheet(true)} />
          </>
        )
      }
      sort={
        <OrderMenu
          value={sort}
          order={order}
          labels={labels}
          triggerLabel={copy.sort.trigger}
          heading={copy.sort.sheetAria}
          onChange={onSort}
        />
      }
      chips={chips}
      onClearAll={filters.onClearAll}
      resultLine={resultLine}
      silentResult={!wide && sheet}
      resultTrailing={
        reading ? (
          // Loading A's `.rln .rd`: the line's mono 11, a 7px gap, the 6px `--fact` dot at .8.
          <span data-result-reading className="flex items-center gap-[7px] font-mono text-[11px] text-[color:var(--fg-faint)]">
            <span aria-hidden className="h-[6px] w-[6px] flex-none rounded-full bg-[color:var(--fact)] opacity-80" />
            {copy.result.reading}
          </span>
        ) : null
      }
      after={
        wide ? null : (
          <CartFilterSheet
            open={sheet}
            onDismiss={() => setSheet(false)}
            shown={filters.shown}
            of={filters.of}
            offer={offer}
            friend={friend}
            onFriend={filters.onFriend}
            owned={owned}
            onOwned={filters.onOwned}
            onClearAll={filters.onClearAll}
          />
        )
      }
    />
  );
}

/**
 * The desktop Friend trigger (call 6, Loading A, addendum R2 B2): absent while no friend has a spare of a selected line
 * or the read failed; dashed and reading `reading…` while it is out; otherwise the Friend panel, Any friend above a row
 * per friend with their face and how many of the drawn cards they hold.
 */
function FriendTrigger({ filters }: { filters: CartFilters }) {
  const { offer, friend } = filters;
  if (offer.kind === "none") return null;
  if (offer.kind === "reading") {
    return (
      // `FilterPanel`'s desktop trigger, inert: the dashed edge and locked words of Loading A's `.trg.wait`, `reading…`
      // in the chevron's place.
      <span
        data-friend-reading
        aria-disabled="true"
        className="inline-flex flex-none items-center gap-[8px] whitespace-nowrap rounded-lg border border-dashed border-[color:var(--border-strong)] bg-[color:var(--elevated)] px-[14px] py-[9px] font-sans text-[13px] font-medium text-[color:var(--fg-locked)]"
      >
        {copy.filters.friend}
        <span className="font-mono text-[10px] text-[color:var(--fg-faint)]">{copy.filters.friendReading}</span>
      </span>
    );
  }
  const named = Array.isArray(friend) ? friend : [];
  return (
    <FilterPanel
      desktopRowMinPx={44}
      compact={false}
      copy={copy.panels.friend}
      options={[
        { code: "any", label: copy.filters.anyFriend, count: offer.any, disabled: offer.any === 0 && friend !== "any" },
        ...offer.friends.map(({ friend: f, count }) => ({
          code: f.publicId,
          label: f.displayName,
          count,
          disabled: count === 0 && !named.includes(f.publicId),
          leadingGlyph: <Face name={f.displayName} commander={f.commander} size={22} />,
        })),
      ]}
      selected={friend === null ? [] : friend === "any" ? ["any"] : [...named]}
      onToggle={filters.onFriend}
      onClear={filters.onFriendOff}
      widthPx={280}
      footerStatus={false}
    />
  );
}
