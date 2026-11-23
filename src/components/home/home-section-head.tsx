// Home's section heading (tool-discovery R8, Q14 A): the page's display face at 17px in --fg, led by the accent
// diamond the app already uses as its mark, with the count in mono. One definition for What's new, the resume
// decks, Friends and Commitments, so the four cannot drift apart. The `id` and the section's `aria-labelledby`
// stay with the caller, as they were on the 10px labels this replaces.

import type { ReactNode } from "react";

export function HomeSectionHead({
  id,
  tabIndex,
  count,
  aside,
  className = "",
  children,
}: {
  id?: string;
  tabIndex?: number;
  /** The count, as the copy writes it (`· 3 new`): mono, in the accent text. */
  count?: ReactNode;
  /** What sits at the head's far end: a link, drawn at the sans size and not in the display face. */
  aside?: ReactNode;
  /** The heading's own margin: each section kept its own top margin, now 10px deeper. */
  className?: string;
  children: ReactNode;
}) {
  return (
    <h2
      id={id}
      tabIndex={tabIndex}
      className={`m-0 flex items-center gap-[9px] font-display text-[17px] leading-[1.2] font-semibold tracking-normal text-[color:var(--fg)] ${className}`}
    >
      <span aria-hidden="true" className="h-[7px] w-[7px] flex-none rotate-45 bg-[color:var(--accent)]" />
      <span>{children}</span>
      {/* A space for the accessible name ("Friends · 3"); a whitespace-only text node draws nothing in a flex row. */}
      {count ? (
        <>
          {" "}
          <span className="font-mono text-[11px] font-normal tracking-[.08em] text-[color:var(--accent-text)]">{count}</span>
        </>
      ) : null}
      {aside}
    </h2>
  );
}
