"use client";
// Row three of the rack: how many rows the filters left, and the rack's ONLY
// live region. Every other count in it — the sheet's dismiss button, the empty
// state — is silent, because a screen reader given four live regions reads a
// chorus after every keystroke. The lane's own announcer is the one other
// region on the page, and it speaks only for events this line cannot describe:
// a re-rank, and a reveal step.
//
// At rest the line states the lane instead of printing a ratio: `3,301 of
// 3,301` is a fact nobody asked for. Filtered, it prints the ratio, and the
// `Exactly` aside is appended to that same sentence rather than opening a
// second line — a second line would move the list under the reader's eye.

import type { Lane } from "../../../lib/commanders/lane-params";
import { commandersCopy, discoverCopy, filterCopy } from "../../../lib/copy/lanes";

export function ResultLine({
  shown,
  total,
  lane,
  excludedByExactly,
}: {
  shown: number;
  total: number;
  lane: Lane;
  /** Null unless `Exactly` is active AND it costs rows `Any` would have shown. */
  excludedByExactly: number | null;
}) {
  const copy = lane === "owned" ? commandersCopy.result : discoverCopy.result;
  const sentence = shown === total ? copy.rest(total) : copy.filtered(shown, total);
  const aside =
    excludedByExactly === null
      ? ""
      : ` — ${filterCopy.match.excludedAside(excludedByExactly)}`;

  return (
    <p
      aria-live="polite"
      // Atomic, or a reader hears only the number that changed and loses the
      // sentence that gave it a denominator.
      aria-atomic
      className="m-0 font-mono text-[11px] leading-[1.5] text-[color:var(--fg-muted)]"
    >
      {`${sentence}${aside}`}
    </p>
  );
}
