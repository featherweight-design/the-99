// ViewSwitch — the cart by card or by deck (handoff A5). Two pressed-state buttons in one group;
// the page mirrors the choice into `?view=` so a reload keeps it.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";

export type CartViewMode = "card" | "deck";

export function ViewSwitch({ view, onView }: { view: CartViewMode; onView: (v: CartViewMode) => void }) {
  const seg = (v: CartViewMode, label: string) => (
    <button
      type="button"
      aria-pressed={view === v}
      onClick={() => onView(v)}
      className={`inline-flex h-[40px] items-center rounded-[7px] px-[13px] text-[13px] md:h-[32px] ${view === v
        ? "bg-[var(--elevated)] font-semibold text-[color:var(--fg)]"
        : "text-[color:var(--fg-muted)]"}`}
    >
      {label}
    </button>
  );
  return (
    <div role="group" aria-label={copy.view.label} className="flex gap-[2px] rounded-[9px] border border-[color:var(--border-strong)] p-[2px]">
      {seg("card", copy.view.byCard)}
      {seg("deck", copy.view.byDeck)}
    </div>
  );
}
