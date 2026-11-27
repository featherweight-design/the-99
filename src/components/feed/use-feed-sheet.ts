"use client";
// What's new's Show all sheet: whether it is open, and the way back to it from a combo. A combo row's press closes the sheet (the
// combo view is a page-level dialog and the sheet holds the page inert, #3371), so the sheet has to leave its place behind: the row
// that was pressed, how far the list had scrolled, which chip was on. When the reader closes the combo, the sheet opens again there.
// The place is kept in a ref and spent by the return, and anything else that opens or closes the sheet, or the page leaving, forgets it,
// so the sheet never comes back over a page it was not left from.

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedKind } from "../../lib/feed/kinds";

/** Where the sheet was left: the pressed row's key, the list's scrollTop and the chip's kind (null: All). */
export type SheetPlace = { key: string; scroll: number; kind: FeedKind | null };

export function useFeedSheet() {
  const [open, setOpen] = useState(false);
  // The place the open sheet draws itself at: set by the return, so the sheet's first render has it.
  const [place, setPlace] = useState<SheetPlace | null>(null);
  const left = useRef<SheetPlace | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settle = () => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  };
  // A page that unmounts this (Home left) takes the place with it, and the pending hand-over with it.
  useEffect(() => () => {
    settle();
    left.current = null;
  }, []);
  const show = useCallback(() => {
    settle();
    left.current = null;
    setPlace(null);
    setOpen(true);
  }, []);
  const close = useCallback(() => {
    settle();
    left.current = null;
    setPlace(null);
    setOpen(false);
  }, []);
  /** A combo row's press went through: the sheet closes a tick later (unmounting a row inside its own click drops the open) and keeps `at`. */
  const giveWay = useCallback((at: SheetPlace) => {
    settle();
    left.current = at;
    timer.current = setTimeout(() => {
      timer.current = null;
      setOpen(false);
    }, 0);
  }, []);
  /** The reader closed the combo: the sheet opens again where it was left, a tick later so the combo's own teardown is done. A close with no place is nothing. */
  const comboClosed = useCallback(() => {
    const at = left.current;
    if (!at) return;
    left.current = null;
    settle();
    timer.current = setTimeout(() => {
      timer.current = null;
      setPlace(at);
      setOpen(true);
    }, 0);
  }, []);
  return { open, place, show, close, giveWay, comboClosed };
}
