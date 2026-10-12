// BackBand (K1): one band over the list when the tab comes back after the Mana Pool link was
// pressed, once per visit, dismissable. Nothing is marked bought: the band says how to record what
// was bought, by pressing buy on each card. When it shows is the cart's (`CartView`), which keeps
// that once-per-visit state where a remount cannot reset it.

import { allDecksCartCopy as copy } from "../../../lib/copy/all-decks-cart";

export function BackBand({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div
      role="status"
      className="flex items-start gap-[6px] rounded-[10px] border border-[color:var(--border-strong)] bg-[color:var(--surface-rail)] pt-[10px] pr-[4px] pb-[10px] pl-[14px]"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
        <p className="m-0 text-[13.5px] font-semibold text-[color:var(--fg)]">{copy.back.title}</p>
        <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--fg-body)] [text-wrap:pretty]">{copy.back.body}</p>
      </div>
      <button
        type="button"
        aria-label={copy.back.dismiss}
        onClick={onDismiss}
        className="flex h-[44px] w-[44px] flex-none items-center justify-center text-[13px] text-[color:var(--fg-muted)]"
      >
        ✕
      </button>
    </div>
  );
}
