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
  announce,
  silent,
}: {
  line: string;
  /**
   * Announced instead of `line` when the surface has something more specific to
   * say. `/collection`'s panels report which value changed — "EOE added. 3
   * sets, 120 of 400 cards shown." — which the line's bare count cannot.
   */
  announce?: string;
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
  // When the current silence began, or null if not silent.
  const silentSince = useRef<number | null>(null);
  useEffect(() => {
    if (announced.current === null || announced.current === line) {
      announced.current = line;
      return;
    }
    // Silence is a handover, not a mute: while the sheet is open it owns the
    // region and announces the same count on the same 300ms debounce. Two
    // failures sit either side of that.
    //
    // Stamping before the silent return loses the announcement entirely when
    // the reader dismisses the sheet inside 300ms — the sheet's timer dies with
    // its unmount and the line already looks spoken. Never stamping speaks it
    // twice when they dismiss after 300ms, because the sheet said it and then
    // this does too.
    //
    // The two cases are separated by how long the silence lasted, which is the
    // one thing this component can measure: shorter than the debounce and the
    // sheet cannot have spoken, so this does.
    if (silent) {
      if (silentSince.current === null) silentSince.current = performance.now();
      return;
    }
    const silentFor =
      silentSince.current === null ? null : performance.now() - silentSince.current;
    silentSince.current = null;
    if (silentFor !== null && silentFor >= ANNOUNCE_DELAY_MS) {
      // The sheet already said it. Record it as spoken and stay quiet.
      announced.current = line;
      return;
    }
    announced.current = line;
    const t = setTimeout(() => setAnnouncement(announce ?? line), ANNOUNCE_DELAY_MS);
    return () => clearTimeout(t);
  }, [line, announce, silent]);

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
