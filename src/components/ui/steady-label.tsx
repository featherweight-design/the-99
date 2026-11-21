import type { ReactNode } from "react";

/**
 * A button label that holds its width while it swaps to another.
 *
 * A control that says "Send" and then "Sending…" while it works shrinks (or grows) under the pointer: a row
 * of buttons shuffles, and the press target moves between the press and the answer. This sizes the label to
 * the widest of the words it can show, so the swap changes the letters and never the box.
 *
 * The other words are drawn as zero-height pseudo-element content (`data-hold`), never as markup: they take
 * up width and nothing else, so a screen reader reads one label, `getByText` finds one, and selecting the
 * button copies one. Pass every other string the control can show in `hold` (two at most; the widest pair
 * is enough, since the box only needs the widest of the set).
 */
export function SteadyLabel({ children, hold }: { children: ReactNode; hold: readonly [string, string?] }) {
  return (
    <span
      data-hold={hold[0]}
      data-hold-more={hold[1]}
      className="inline-block whitespace-nowrap text-center before:invisible before:block before:h-0 before:overflow-hidden before:content-[attr(data-hold-more)] after:invisible after:block after:h-0 after:overflow-hidden after:content-[attr(data-hold)]"
    >
      {children}
    </span>
  );
}
