// What other modules take from the card details modal without drawing it. Here rather than in
// card-modal.tsx so that importing one of them does not pull the modal into a page's startup
// bundle: the modal is loaded on demand (card-detail-provider.tsx).

/** The phone's drop off a sheet (stacked sheets R1, motion), and how long the provider waits on it. */
export const STACK_DROP_MS = 200;

/**
 * The receipt's link style: the modal's accent underline, right-aligned on the label line. The
 * phone's tap area is the 44px row; the negative margin keeps the row from growing the block. Shared
 * by /collection's Edit copies and the Shopping door's `Bought this card?` (I got it A11), which
 * take the same slot and never draw together.
 */
export const RECEIPT_LINK_CLASS =
  "-my-[16px] flex min-h-[44px] cursor-pointer items-center border-0 bg-transparent p-0 text-[13px] text-[color:var(--accent)] underline underline-offset-2 md:-my-[8px] md:min-h-[32px]";
