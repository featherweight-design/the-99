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

import type { Lane } from "../../../lib/commanders/lane-params";
import { commandersCopy, discoverCopy, filterCopy } from "../../../lib/copy/lanes";

/** The sentence the rack and the sheet header both print. The sheet draws it
    silently — this lane has one live region and it is the result line. */
export function resultSentence(shown: number, total: number, lane: Lane): string {
  const copy = lane === "owned" ? commandersCopy.result : discoverCopy.result;
  return shown === total ? copy.rest(total) : copy.filtered(shown, total);
}

/** The sentence with the `Exactly` aside appended, when there is one.
 *
 *  The separator lives HERE rather than at the call site, because the aside is
 *  an independent clause (`Exactly excludes 6 that Any would show`) and joining
 *  it with a comma splices two sentences. It was a literal in `filter-rack.tsx`
 *  and a second literal in the test, which meant the test asserted its own copy
 *  of the rule and stayed green when the component's copy changed. */
export function resultLineWithAside(
  shown: number,
  total: number,
  lane: Lane,
  excludedByExactly: number | null,
): string {
  const sentence = resultSentence(shown, total, lane);
  return excludedByExactly === null
    ? sentence
    : `${sentence}. ${filterCopy.match.excludedAside(excludedByExactly)}`;
}

// What survives of the rack's result line: the sentence, which reads lane copy
// and is the one thing the chassis cannot derive for itself. The announce
// behaviour and the live region live in `ui/result-line.tsx`, which the chassis
// mounts; the lane-shaped wrapper that delegated to it is gone now that the
// rack is a chassis mount and composes the sentence itself.
