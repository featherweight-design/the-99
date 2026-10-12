"use client";

// A link to a DYNAMIC route that prefetches the whole page once a reader shows intent: a pointer
// resting on it, keyboard focus, or the touchstart that precedes a tap (speed plan (b), 2026-10-12).
//
// A dynamic route's default prefetch stops at its loading boundary, so the first visit to a deck
// waited on the full server render after the press: 3.4s on the slow profile from `/decks`. A full
// prefetch on intent starts that render a pointer's rest (or a touch's few ms) before the click.
// It is not the default for every link in view because each one is a full deck render on the
// server; `eager` opts a single link in on sight, for the one a reader is most likely to open.
//
// This follows Next's own hover-prefetch pattern (docs: linking-and-navigating, "Disabling
// prefetching"), with `true` in place of the default once active, which is the full prefetch.
import Link from "next/link";
import { useState, type ComponentProps } from "react";

type Props = ComponentProps<typeof Link> & { eager?: boolean };

export function IntentPrefetchLink({ eager = false, onPointerEnter, onFocus, onTouchStart, ...props }: Props) {
  const [active, setActive] = useState(false);
  return (
    <Link
      {...props}
      prefetch={eager || active ? true : undefined}
      onPointerEnter={(e) => {
        setActive(true);
        onPointerEnter?.(e);
      }}
      onFocus={(e) => {
        setActive(true);
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        setActive(true);
        onTouchStart?.(e);
      }}
    />
  );
}
