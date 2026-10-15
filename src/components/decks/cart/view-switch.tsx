// ViewSwitch — the cart by card or by deck (handoff A5). The app's segmented switch in its compact size, a
// radiogroup since both views hold the same list grouped two ways; the page mirrors the choice into `?view=` so a
// reload keeps it. 30px from `md:` like every compact switch (it drew 32px before the switches converged).

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";
import { SegmentedSwitch } from "../../ui/segmented-switch";

export type CartViewMode = "card" | "deck";

const IDS = { tab: (v: CartViewMode) => `cart-view-${v}` };

export function ViewSwitch({ view, onView }: { view: CartViewMode; onView: (v: CartViewMode) => void }) {
  return (
    <SegmentedSwitch
      kind="radio"
      size="compact"
      ariaLabel={copy.view.label}
      value={view}
      onChange={onView}
      ids={IDS}
      segments={[
        { value: "card", label: copy.view.byCard },
        { value: "deck", label: copy.view.byDeck },
      ]}
    />
  );
}
