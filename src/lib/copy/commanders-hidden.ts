// The Hidden list, `/commanders/hidden` (design_handoff_the99_hide_commander README §3, the Hidden board). Strings
// marked DRAFT are the board's own DRAFTs; the rest follow it. All for /copy-review.

import type { HiddenLane } from "../commanders/hidden-row";

/** Where an Unhide put the commander, in the Undo row's receipt voice: the board's *back in For you* / *back in
    Discover*, or, when neither list will show it (READINESS Y3: built, not legal, owned but not ranked by For you, or
    unowned and not in the index), just that it is no longer hidden. DRAFT (the neutral line is Y3's own suggestion). */
function backIn(name: string, lane: HiddenLane): string {
  if (lane === "foryou") return `${name} back in For you`;
  if (lane === "discover") return `${name} back in Discover`;
  return `${name} unhidden`;
}

export const hiddenListCopy = {
  /** The shipped `PageHeader`'s two lines. */
  title: "Hidden",
  subtitle: "commanders you hid",
  /** The count line over the list. Pinned to en-US as the other count lines are. */
  count: (n: number) => `${n.toLocaleString("en-US")} hidden · newest first`,
  /** The line under the name: the day it was hidden, never the year (READINESS Y11). */
  hiddenOn: (day: string) => `Hidden ${day}`,
  /** A built commander's row opens its deck, not its page (READINESS Y3), and says so to a screen reader. DRAFT. */
  openDeck: (name: string) => `Open your ${name} deck`,
  empty: {
    heading: "Nothing hidden",
    /** The sentence draws the glyph it names; `glyph` is its accessible text. DRAFT. */
    before: "Press ",
    glyph: "Hide",
    after: " on a commander in For you or Discover, or on its page, and it waits here until you bring it back.",
  },
  undoRow: {
    label: backIn,
    /** The Undo row's button, which hides it again. Its accessible name starts with the visible *Undo* (WCAG 2.5.3,
        label in name), as the hide's own Undo row reads *Undo hiding {name}*. The board's *Hide {name} again* did not. */
    actionAria: (name: string) => `Undo unhiding ${name}`,
    /** The Undo of an Unhide was refused: it is still unhidden, so its list's own Hide is the way back. DRAFT. */
    refused: (lane: HiddenLane) =>
      lane === "foryou"
        ? "Couldn’t hide that again. Hide it from For you."
        : lane === "discover"
          ? "Couldn’t hide that again. Hide it from Discover."
          : "Couldn’t hide that again.",
  },
  /** The Unhide was refused: the row stays, and the shared toast says so. Its Try again button carries the retry,
      so the line does not repeat it (PR 3's `rowHideRefused`). DRAFT. */
  unhideRefused: (name: string) => `We couldn’t unhide ${name}.`,
} as const;
