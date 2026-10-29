# Design Property Table — Small items 3, items 1 and 3 (Good to know diagrams, prices buy chips)

Enumerated from `design/design_handoff_the99_small_items_3/{README.md §1 §3, build.py, si3.css}` (the `.new` state) by a
design-only agent, 2026-10-29. The diagram markup is the same at 390 and 1300; only the host card changes (292px phone,
388px desktop), so one column serves both.

## Structure

| Diagram | Side by side (`columns`) | Single column / foot |
|---|---|---|
| one-copy | one column, w 250, gap 5 | row Sol Ring (owned dot, muted tag) · ↓ · Ghalta · Sai (short) · Zimone (dim, short) |
| hidden-deck | tile + void, gap 12 | foot w 250 gap 5: upper caption · row (muted tag) · muted caption |
| commit | one column, w 250, gap 5 | upper caption · 2 compact edge rows · ↓ "commit" · upper caption · compact row (short) |
| own-it | tile + unsized caption column (muted caption), gap 12 | foot w 250 gap 5: upper caption · row (owned dot, buy chip) · muted caption; the ≠ removed |
| replace | one column, w 250, gap 5 | upper caption · 3 compact rows (muted tag) · compact gone row (muted tag) |
| credits, never | one column, w 250 (unchanged) | as shipped |

## Row (`.drw.new`)

| Property | Mobile | Desktop |
|---|---|---|
| height / padding / font-size | 30px / 0 10px / 12.5px | same |
| compact: height / padding / font-size | 22px / 0 8px / 11.5px | same |
| border | 1px solid var(--border-dashed) | same |
| radius / background / color | 7px / var(--surface-raised) / var(--fg) | same |
| dim | border-style dashed, no opacity | same |
| gone | name line-through, var(--fg-muted); tag full strength; no opacity | same |
| edge | box-shadow inset 2px 0 0 0 var(--accent) | same |
| gap (base / compact) | 8px / 6px | same |

## Tags, captions, between

| Element | Property |
|---|---|
| tag | 500 10px var(--mono), flex none; muted var(--fg-body), accent var(--accent-text), success var(--success), short the availability ink |
| upper caption | 500 10px var(--mono), .04em, uppercase, var(--fg-faint) |
| muted caption | 500 10px var(--mono), .04em, var(--fg-body) |
| between | column, centred, gap 6, var(--fg-faint), 16px glyph; label an upper caption; centred in its column |

## Prices diagram (item 3)

| Element | Property |
|---|---|
| line | flex, align center, gap 10px |
| slot | width 96px, flex none, justify-content flex-end (was center) |
| note | muted caption, var(--fg-body) |
| lines | column, gap 7px |
