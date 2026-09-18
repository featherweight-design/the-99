"use client";

// One rule, shared by every list that becomes a scroll box when it opens.
//
// A collapse does not discard a scroll position. The element is the same DOM
// node across every open and close — same id, same place in the tree — so the
// offset it was left at survives while the box is unscrollable and the browser
// hands it straight back the moment `maxHeight`/`overflowY` return. A reader who
// scrolls a list to its foot, closes it, and opens it again is looking at the
// bottom of a list they never scrolled this time.
//
// Measured on the commander page: a 40-row role list closed at offset 1752 and
// reopened at 1752, with `scrollTop` reading 0 in between — the zero is the box
// being unscrollable, not the offset being gone.
//
// A LAYOUT effect, not an effect: the reset has to land before paint, or the old
// offset is drawn for a frame first.

import { useLayoutEffect, useRef } from "react";

/**
 * A ref for the scroll box, whose offset is discarded whenever `keys` change.
 *
 * `keys` are the transitions that owe the discard — the disclosure's own state,
 * and anything that changes WHICH list is in the box. Its length must be stable
 * across renders, as React requires of any dependency list.
 */
export function useDiscardedScroll<T extends HTMLElement>(keys: unknown[]) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
    // The caller's keys ARE the dependency list; the linter cannot see through
    // the parameter to check it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, keys);
  return ref;
}
