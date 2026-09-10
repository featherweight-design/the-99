# Gap report — Top-Off Addendum R1, decision 6 (the keep-all confirm)

Property table: `docs/superpowers/design-tables/top-off-addendum.md`, the
`Keep-all inline confirm` component section, states S-K1 to S-K6, and the four
`keepAllConfirm*` copy rows. That table was enumerated for the addendum as a
whole; decision 6 was deferred out of the candidate-list pull request and is
what this one builds.

**Verdict: 0 gaps in decision 6's own work.** Every property the confirm adds
matches. Three pre-existing mismatches sit in the at-rest section the table
itself marks unchanged, and one deliberate divergence is recorded below.

## Standing, with reasons

| # | Item | Why it stands |
|---|---|---|
| 1 | The two at-rest bulk buttons have no `flex: 1` at phone | Pre-existing; the section is marked unchanged, and the pair sizes to its content inside the toolbar's own wrap |
| 2 | The cluster's desktop gap is 8px, not 12px | Pre-existing and shared with the kept note beside it; changing it would move an element this decision does not touch |
| 3 | The refusal renders as a bare `<p role="alert">` in mono `--fg-locked`, not `MutationError` | Pre-existing, and shared with the sweep's own failure and the undo's. A per-call-site swap here would give one of three sibling errors a different voice |

## Divergences

**The question does not carry `md:ml-auto`.** The table gives the desktop
question `margin-left: auto`, but the confirm's container is content-sized at
desktop (`md:w-auto md:flex-nowrap`), so there is no free space for the margin to
absorb and the class would be inert. The right-alignment the canvas draws is
already produced by the toolbar's own `flex-1` spacer, which is what
right-aligns the at-rest pair too. The drawn result holds; the dead class does
not ship.

## Ambiguity 3 — what shipped

The component-notes values, at both widths: radius `7px`, question `11.5px`,
answers `11.5px`, phone padding `px-[14px]`. The phone canvas draws `8px` /
`13px` / `12px`. The notes match the desktop canvas exactly and match
`game-history-row.tsx`, which the addendum says to copy verbatim minus the
danger ink, so the canvas reads as the outlier rather than the specification.
This follows the same rule the candidate-list pull request applied to its own
two ambiguities.

## The one thing the confirm does not do

`disabled={busy}` on the two answers cannot fire: the yes answer closes the
question before it calls `onKeepAll`, so `busy` is only ever true while the
at-rest pair is what renders. It is kept because a future path that left the
question up during the write would otherwise offer a live control over a write
already in flight, which is the failure the shipped `busy` rule exists to
prevent.
