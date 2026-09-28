# Suggested changes: the manifest reads as checkboxes

Design brief, 2026-09-28. A small restyle of an existing surface; no new feature.

## The finding

On the Analysis tab's **Suggested changes** panel, Hugh pressed the manifest rows (*Your games*,
*Notes on your games*, and the rest) expecting them to toggle, on desktop and on the phone. Nothing
happened, because they are not controls. Each row is a bordered 44px row (38px from `md`) led by an
**empty 18px bordered box** (16px from `md`). That box in that row reads as an unchecked checkbox,
and it invites a press.

The code is doing what the handoff draws. The row has no input, no role and no handler, and the box
is an `aria-hidden` span that gets a ✓ when its read lands. The fault is the affordance.

## The ruling (locked, Hugh 2026-09-28)

**The manifest stays a read-only disclosure** of what a run hands the model. It is **not** a set of
toggles, and there is no include/exclude feature: the run takes every read it lists. The restyle
has one job: nothing in the manifest may look pressable.

## What already exists (keep every state)

From `design/design_handoff_the99_deck_tuning/STATES-tuning-panel.md`, rows 2 to 4:

| State | Manifest |
|---|---|
| Ready (no run yet, or after `Stop`) | the rows, **unchecked** |
| Generating | the same rows, **ticking as each read lands** (real completion, never a timer), with `3 of 4 read` beside the primary |
| Results | collapsed to one mono line, *Read from …* |

These stay as they are:
- **The empty-games row** is drawn dashed, with *none logged* and a *Log a game →* link. That link
  is the only control in the list and must keep reading as one.
- **Each row's count** is in mono on the right (`12 games`, `on 3 of 12 games`, …).
- **The generating state is load-bearing** (READINESS §3, around line 113). It is the honest wait,
  and a spinner would hide it.
- **Colour is never the only carrier** (READINESS, around line 175): a done row carries a ✓ as well
  as a fill.
- **The targets are 38px desktop and 44px phone rows** (READINESS, around line 176).

## Open for Design

1. **The status mark.** What a row shows before its read lands, and once it has, so the pair reads
   as *pending / read* and never as *unchecked / checked*. It must still pass the "not colour alone"
   rule once done.
2. **The row's border.** Does a row keep its border and fill? A bordered row reads as a pressable
   tile, and that is part of the problem. If the border goes, say what separates the rows.
3. Whether the **44px phone row** still earns its height once it is no longer a target. The
   empty-games row keeps a 44px target for *Log a game →* either way.

Out of scope: the copy (unchanged), the panel's other states, and the collapsed Results line.

## Where it lives

- `src/components/decks/manifest-rows.tsx`: the rows, the `Box` glyph and the dashed empty-games row.
- `src/components/decks/tuning-panel.tsx`: builds the rows (`manifestRows`, `neverRunRows`).
- `src/components/decks/builder-shell.tsx:1437`: where the Analysis tab mounts `TuningPanel`.
- `design/design_handoff_the99_deck_tuning/STATES-tuning-panel.md`: states 2 to 4 and rules 5 and 9.
- `design/design_handoff_the99_deck_tuning/READINESS.md`: §3 (the manifest is load-bearing), plus
  the accessibility and target lines near the end.
