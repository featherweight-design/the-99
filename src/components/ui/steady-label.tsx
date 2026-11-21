import type { ReactNode } from "react";

/**
 * A button label that holds its width while it swaps to another.
 *
 * A control that says "Send" and then "Sending…" while it works shrinks (or grows) under the pointer: a row
 * of buttons shuffles, and the press target moves between the press and the answer. This sizes the label to
 * the widest of the words it can show, so the swap changes the letters and never the box.
 *
 * The words are drawn as zero-height pseudo-element content (`data-hold`, one word per line), never as markup:
 * they take up width and nothing else, so a screen reader reads one label, `getByText` finds one, and selecting
 * the button copies one. Pass every string the control can show in `hold`, the one on screen included.
 */
export function SteadyLabel({ children, hold }: { children: ReactNode; hold: readonly (string | undefined)[] }) {
  return (
    <span
      data-hold={hold.filter(Boolean).join("\n")}
      className="inline-block whitespace-nowrap text-center after:invisible after:block after:h-0 after:overflow-hidden after:whitespace-pre after:content-[attr(data-hold)]"
    >
      {children}
    </span>
  );
}
