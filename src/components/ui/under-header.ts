/**
 * A sticky page head's `top` on the phone (card search plan, PR B): it rides under a returned header, which publishes
 * the room it takes as `--header-offset` (0 while the header is in the page or away, and on desktop, where there is no
 * header), and moves with it on the sheet curve. Every class spelled whole so Tailwind sees it.
 */
export const UNDER_HEADER =
  "top-[var(--header-offset,0px)] transition-[top] duration-[200ms] ease-[var(--motion-ease-out)] motion-reduce:transition-none";
