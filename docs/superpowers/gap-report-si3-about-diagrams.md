# Gap report — Small items 3, items 1 and 3

Verified 2026-10-29 against `docs/superpowers/design-tables/si3-about-diagrams.md`, row by row, in
`src/components/about/pages/rule-diagrams.tsx` and `src/lib/copy/about-pages.ts`, and on the contact sheet
(`contact-sheets/si3-about/`, 390 and 1300, local, scratch branch `scratch-si3-about`).

**Verdict: 0 gaps introduced by this change.** Every structure row (one-copy, hidden-deck, commit, own-it, replace) and
every row, tag, caption and buy-slot property in the table matches.

Pre-existing, not changed here and not part of items 1 or 3:

- The diagram row's gap is the shipped `ROW_SHELL` gap (9px phone, 10px desktop) where the boards draw 8px (6px
  compact). The boards draw every row, old and new, at 8px; the shipped row has always taken `ROW_SHELL`.
- The buy slot is `min-w-[96px]` where the board sets `width:96px`. The same at every shipped chip (all fit 96px); a
  wider chip grows the slot rather than overflowing it.
- The short tag takes the availability marker's token (`--avail-hard-fg`) where the board writes its Low Sun hex.
