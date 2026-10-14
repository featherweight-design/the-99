// design/design_handoff_the99_rail_mark/rail-mark · copy strings.ts
//
// The rail head is the app mark, not a nav item and not a link (see CHROME-rail-mark.md §3).
// It therefore has exactly one string: its accessible name. Belongs in src/lib/copy/shell.ts
// beside firstRun.railLockedCaption.

export const railMarkCopy = {
  /** role="img" on the head lockup; children are aria-hidden. */
  aria: "The 99",
} as const;

// Not added, deliberately:
//   - no tooltip: the head is decorative and not focusable, so there is nothing to hover-explain.
//   - no "home" wording: that string belongs to 1c, which was declined — the head is not a route.
