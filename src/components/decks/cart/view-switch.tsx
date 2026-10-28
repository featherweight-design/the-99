// ViewSwitch — the cart by card, by deck or by friend (handoff A5; spare requests `Cart-By-Friend`). The app's
// segmented switch in its compact size, a radiogroup since every view holds the same list grouped another way; the
// page mirrors the choice into `?view=` so a reload keeps it. 30px from `md:` like every compact switch (it drew 32px
// before the switches converged). By deck needs two decks (E1); By friend is drawn from first paint while spare requests
// are on (v2 G2), whatever friends' spares read says: the view has its own reading, empty and failed states.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { SegmentedSwitch, type Segment } from "../../ui/segmented-switch";

export type CartViewMode = "card" | "deck" | "friend";

const IDS = { tab: (v: CartViewMode) => `cart-view-${v}` };

/** The segments the switch draws: By card always, By deck with two decks or more, By friend with spare requests on. */
export function viewSegments({ deck, friend }: { deck: boolean; friend: boolean }): Segment<CartViewMode>[] {
  return [
    { value: "card", label: copy.view.byCard },
    ...(deck ? [{ value: "deck" as const, label: copy.view.byDeck }] : []),
    ...(friend ? [{ value: "friend" as const, label: copy.view.byFriend }] : []),
  ];
}

export function ViewSwitch({
  view,
  onView,
  deck = true,
  friend = false,
}: {
  view: CartViewMode;
  onView: (v: CartViewMode) => void;
  /** By deck is a view (two decks or more, E1). */
  deck?: boolean;
  /** By friend is a view (spare requests on, v2 G2). */
  friend?: boolean;
}) {
  return (
    <SegmentedSwitch
      kind="radio"
      size="compact"
      ariaLabel={copy.view.label}
      value={view}
      onChange={onView}
      ids={IDS}
      segments={viewSegments({ deck, friend })}
    />
  );
}
