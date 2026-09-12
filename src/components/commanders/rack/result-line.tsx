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
//
// The sentence is drawn immediately and ANNOUNCED 300ms later, which is why the
// visible line and the live region are two nodes. Filtering is never delayed;
// only the message waits, so a reader typing four letters hears one count
// rather than four. `filter-panel.tsx` debounces its own count the same way.

import { ResultLine as SharedResultLine } from "../../ui/result-line";
import type { Lane } from "../../../lib/commanders/lane-params";
import { commandersCopy, discoverCopy, filterCopy } from "../../../lib/copy/lanes";

/** The sentence the rack and the sheet header both print. The sheet draws it
    silently — this lane has one live region and it is the result line. */
export function resultSentence(shown: number, total: number, lane: Lane): string {
  const copy = lane === "owned" ? commandersCopy.result : discoverCopy.result;
  return shown === total ? copy.rest(total) : copy.filtered(shown, total);
}

// The announce behaviour now lives in `ui/result-line.tsx`, which the filter
// chassis mounts. This file keeps the lane-shaped wrapper — `resultSentence`
// and the `Exactly` aside both read lane copy — and delegates the rest, so
// there is one debounce and one live region in the codebase rather than two
// that can drift. The rack is retired into the chassis in a later PR; until
// then both callers share this implementation.

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
  const aside =
    excludedByExactly === null
      ? ""
      : ` — ${filterCopy.match.excludedAside(excludedByExactly)}`;
  return <SharedResultLine line={`${resultSentence(shown, total, lane)}${aside}`} />;
}
