# The 99 · Strategy focus · R1 (account 2, 2026-10-22)

Canvas: https://claude.ai/artifact/5DXdxuVHyRhgFAEV83mirP

Brief: `docs/superpowers/design-briefs/2026-10-22-strategy-focus.md` (#2207), with Hugh's same-day ruling that replaces its
center of gravity: the feature leads with a **strategy read** (1 credit, one model call, kept per deck version) that says how
the deck wins, whether its strategies pull together or apart, its weak links (off-plan cards and holes), and 5 to 10 swaps
built only from candidates the app finds. The strategies list (the brief's "radar") stays free and is the read's summary,
before and after. The lean-in list is now the read's swap list, applied through the shipped add-and-cut flow.

Extends `design_handoff_the99_deck_analysis/`, `_analysis_tab/`, `_tuning_hub/`, `_deck_tuning/`. Drawn over the shipped
Analysis tab on Hugh's HD - Avatar Aang, in Low Sun. Card thumbs are cut from Hugh's captures (`art/`).

## Boards

| Board | What |
|---|---|
| Main | The calls, and state 3 (read) on the whole Analysis tab, 390 and 1300 |
| Read-States | States 1 not read, 2 reading, 4 stale with Read again, 5 out of credits, 6 failed with no charge |
| Placement | Call A (list inside the read, picked; above it, not picked) and call B (phone: one scroll with two folds, picked; a Read/Swaps switch, not picked; a fold opened) |
| Apply | Call C: one at a time, several (reject, then Apply the rest), all (Apply all), and checkboxes (not picked) |
| Strategies | The free list's own states: one to four rows, nothing over the floor, too small (read waits too), typal replaces tribal, landfall as-is |
| Form | Bars, not a spider; axis names |
| History-And-About | A read's History row (new chip Read, new mark) and the About entry |

## Design's picks

- **A · list inside the read.** One block, *What it's built around*: the list is the read's head (left on desktop, top on the
  phone). Before a read, the read's side holds *Read my strategy* and the shipped credit line.
- **B · phone.** One scroll. How it wins open; How its strategies fit and Weak links fold to a line that states the gist; then
  the swaps.
- **C · applying.** The shipped suggestion card and answered rows. One: Apply. Several: Reject the unwanted, then
  *Apply the rest · N*. All: *Apply all N*. Shipped `lists` strings (`applyAll`, `applyRest`, `tally`). No checkboxes.
- Kept per version: no Read again while the deck is unchanged (foot line *Kept for version 2*). Stale keeps the read under
  the shipped dashed note with Read again; swaps are re-checked (shipped *no longer applies*).
- Press, reading manifest, credit lines (L1, L4, again) and failure classes are the shipped Suggested changes shapes.
- The read sits last in the reading on Analysis, above Tuning. Tuning keeps its four shipped tools.

## Gaps and owed

- All read text, strategy counts, holes and prices are fixtures until eng runs the read on staging.
- Copy is placeholder for /copy-review (lead, fold summaries, Weak links labels, About caption and keys).
- History row's chip and mark are a proposal; About switch name is eng's; a recapture with the switch on is owed.
- The first R1 pass (a free "Double down" tool) was set aside after the ruling; its generator is not kept here.

`scratch-gen/` builds every board: `python3 build.py` (local, `out/`), `python3 build.py blob` (canvas, `/_blob` urls from
`blobs.json`), `python3 render.py` (screenshots, broken-image and overflow check).
