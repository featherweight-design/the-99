"use client";

import { useLayoutEffect, useState } from "react";

/**
 * A host for a sheet portalled OUT of the head that opened it (collection surfaces E1).
 *
 * A `fixed` sheet drawn inside a sticky head is fixed inside that head's stacking context, so
 * the phone's tab bar (z-40, later in the document) paints over it however high its own z-index
 * is. Moved out of the head, its z-50 is measured against the page again.
 *
 * Into `<main>`, not `document.body`: everything that reads
 * the page (the probes' `onPage`, the contact sheet) is scoped to `<main>`, and a sheet under
 * `body` would be invisible to all of it. `<main>` is not itself a stacking context, so the sheet
 * still clears the tab bar. The theme and the font variables are on `<html>`, so nothing is lost
 * by leaving the head's subtree.
 *
 * PREPENDED, not appended: a card modal opened from inside the sheet is a later child of `<main>`
 * at the same z-50, so it paints above the sheet only while the sheet comes first (the receipt's
 * rule, `receipt-modal.tsx`). Change commander's sheet portals here for that reason as well as
 * the first one: its door sits in a `display: none` spine at one width.
 *
 * Made once on the client (a server never opens a sheet) and attached only while `open`, before
 * paint, so a sheet never draws a frame outside the page.
 */
export function useSheetHost(open: boolean): HTMLElement | null {
  const [host] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : document.createElement("div"),
  );
  // React renders the portal into the detached host; this attaches it in the same commit,
  // before the browser paints, so the sheet is never seen outside the page.
  useLayoutEffect(() => {
    if (!open || !host) return;
    (document.querySelector("main") ?? document.body).prepend(host);
    return () => host.remove();
  }, [open, host]);
  return host;
}
