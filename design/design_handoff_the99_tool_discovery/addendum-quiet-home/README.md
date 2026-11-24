# Finding the tools · Quiet Home (addendum R1 · approved 2026-11-24)

Hugh, 2026-11-24: on desktop and tablet, a Home with no notifications and no open table leaves a large empty space beside
the rail, with only the search and Pick up where you left off in the main column. "What's new works on the side when the
main area is busy, but maybe it should stay on the main area when it's less busy?" Approved on the canvas the same day.

Builds on tool-discovery R8 (What's new tops the desktop rail, Q13 A). Busy days are unchanged.

## What changes

`src/components/home/dashboard.tsx` and `src/components/home/whats-new.tsx` only (`scratch-gen/proposal.diff`, applies to
main 1871a0a).

- **The count.** `heads` = open tables (each one) + 1 if there is a game to log + 1 if there is a lead story.
  `quiet = !!feed && heads < 2`.
- **Quiet (fewer than two).** What's new renders in the main column, after the resume block (Pick up where you left off),
  `min-[1180px]:mt-[10px]`, with a new `wide` prop: its rows pass `compact={false}` to `FeedItemRow`, so they keep the wide
  layout (action right of the text) from 1180 as they already do below it. The foot fits one line. The rail keeps
  Commitments then Friends; it is not drawn when neither shows (the existing rule, now `(feed && !quiet) || ...`).
- **Busy (two or more).** As shipped: What's new tops the rail in compact rows.
- **Below 1180.** One column, unchanged: the main-column What's new carries `order-1`, so it still sits above the decks
  (`order-2`), under the lead.
- **Decided on load.** Server props decide it; dismissing the lead or the game to log during a visit does not move
  What's new.
- Not counted: the arrivals banner (spans both columns), the welcome credits (in the search panel's foot), the signature
  ask. An empty What's new (its quiet card) moves the same way.

## Settled

- **Q1 A:** quiet What's new goes UNDER Pick up where you left off (B, above the decks, drawn for comparison and declined).
- **Q2 A:** the line is two or more heading cards (B, any one card, drawn as `Table only · rail` and declined).

## Copy

No new or changed strings. The heading, count, Choose notifications, foot and Show all sheet are the shipped ones.

## Seen, not in scope

Between 1180 and 1279 the table and game-to-log cards keep their `sm:max-w-[392px]` cap (`xl:max-w-none` lifts it at 1280),
so on a busy 1180 Home they sit narrower than the panel under them (Tablet board, Busy). Shipped behaviour; a possible
one-line follow-up.

## Files

- `Main.dc.html` (the call, rule, Q1, Q2), `Desktop.dc.html` (1300: quiet shipped / proposed / Q1 B, then lead only,
  table only A and B, table and lead, busy), `Tablet.dc.html` (1180).
- `art/qh-*.webp`: rendered from a scratch copy of main with the proposal applied (`scratch-gen/HOW.md`).
- `STATES.md`, `READINESS.md`, `canvas.json`, `support.js`.

No About entry this round.
