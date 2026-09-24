# Design Property Table — Deck notices: the check before the overview (plan PR 7)

Source: `design/design_handoff_the99_deck_notices/`, HANDOFF §6, STATES rows 8 and 9, and the frames in
`Deck Page 1300.dc.html` (105–152, 168–207) and `Deck Page 390.dc.html` (106–149, 164–199). "Mono" is the literal
`'IBM Plex Mono'` stack the frames use, `var(--font-plex-mono)` in the app. Copy is not a property here; each row names
its string slot, and the wording is `/copy-review`'s (ruled by Hugh 2026-09-24: "legal in this deck").

## A · Check note beside Analyze, empty state (6a) — slot `check.note` + `check.seeWhich`

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font-family | Mono | Mono |
| font-size | 9.5px | 11px |
| line-height | 1.5 | 1.55 |
| color | `--fg-faint` | `--fg-faint` |
| layout | own block under Analyze, centered, 10px below it | same row as Analyze, after it; `flex:1 1 300px; max-width:340px` |

## B · Check note beside Re-analyze on the banner (6b) — slot `check.note`

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font-family | Mono | Mono |
| font-size | 9.5px | 11px |
| line-height | 1.5 | 1.55 |
| color | `--fg-faint` | `--fg-faint` |
| layout | after the full-width Re-analyze, centered | between the sentence and Re-analyze, right-aligned, `flex:0 1 300px` (the credit note's banner placement) |

## C · `See which →`

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font | inherits the note's mono (A); 11px mono in the withheld row (E) | same |
| color | `--accent` | `--accent` |
| underline | `border-bottom: 1px dotted var(--accent)`, running under the arrow | same |
| action | opens Notices | same |

## D · Withheld Overview line (6c) — slot `check.withheld`

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| font | sans 13px / 1.55 | sans 13.5px / 1.55 |
| color | `--fg-faint` | `--fg-faint` |
| layout | block under the Overview heading, section gap 8px | same, in the 2fr column |

## E · Disabled `Write one` and its row

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| button | sans 13px 500, `--fg-disabled`, 1px `--border-strong`, radius 8px, padding 0 16px, min-height 44px, `aria-disabled` | same, min-height 36px |
| row | flex, center, gap 14px, no wrap | flex, center, gap 16px, wrap, margin-top 6px |
| order | Write one, then See which → | same |

## F · Warning over a saved overview (H3)

Undrawn in every frame. Built by Hugh's H3 ruling as the withheld row's form with `See which →` alone (Q4), above the
saved overview, which stays whole. No write is offered, including in the overview modal.

## State coverage

| State | Trigger | Renders |
|---|---|---|
| 6a | illegal, no reading | empty state: Analyze, note A |
| 6b | illegal, reading stale (banner) | banner Re-analyze with note B |
| 6c | illegal, no saved overview | Overview: line D, row E |
| H3 | illegal, saved overview | warning F above the saved overview, no write |
| F13 | illegal and not whole | `blocked` wins; no check note |

## Deviations from the frames, and why

1. HANDOFF §6 puts `See which →` beside BOTH Analyze and Re-analyze; the 6b frames draw the banner note as plain
   text. The text wins (§6 is the spec the frames illustrate), so the banner note carries the link too.
2. F13 precedence: `blocked` beats the check note (readiness F13).
