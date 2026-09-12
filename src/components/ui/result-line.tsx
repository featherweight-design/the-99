"use client";
// Row three of the filter chassis: how many rows the filters left, and the
// chassis's ONLY live region.
//
// Lifted verbatim from `commanders/rack/result-line.tsx` per decision 13, with
// one change the move forces. The rack's version took a `Lane` and looked its
// copy up from `commandersCopy` / `discoverCopy`, which cannot serve `/decks` or
// `/collection` — neither is a lane. It takes the finished sentence instead, so
// the four routes keep their own wording and share the behaviour that actually
// matters here: one live region, and a 300ms announce debounce.
//
// Everything the rack's header comment explains still holds. A screen reader
// given four live regions reads a chorus after every keystroke, so this is the
// only one in the chassis and every other count — the sheet's dismiss button,
// the empty state — stays silent. The sentence is drawn immediately and
// ANNOUNCED late, which is why the visible line and the live region are two
// nodes: filtering is never delayed, only the message waits, so a reader typing
// four letters hears one count rather than four.

import { useEffect, useRef, useState } from "react";

const ANNOUNCE_DELAY_MS = 300;

export function ResultLine({
  line,
  silent,
}: {
  line: string;
  /**
   * Stop announcing while another surface owns the region. The compact sheet is
   * `aria-modal` and carries its own, so with both live a filter change is
   * announced twice — once inside the modal and once from the page behind it,
   * which some assistive tech reads and some does not. The line still draws;
   * only the region goes quiet.
   */
  silent?: boolean;
}) {
  const [announcement, setAnnouncement] = useState("");
  // What was last announced. Null until the line first changes, which is what
  // keeps the chassis from reading its own count out on arrival.
  const announced = useRef<string | null>(null);
  useEffect(() => {
    if (announced.current === null || announced.current === line) {
      announced.current = line;
      return;
    }
    announced.current = line;
    if (silent) return;
    const t = setTimeout(() => setAnnouncement(line), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [line, silent]);

  return (
    <>
      <p
        aria-hidden
        className="m-0 font-mono text-[11px] leading-[1.5] tabular-nums text-[color:var(--fg-muted)]"
      >
        {line}
      </p>
      {/* Atomic, or a reader hears only the number that changed and loses the
          sentence that gave it a denominator. */}
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </span>
    </>
  );
}
