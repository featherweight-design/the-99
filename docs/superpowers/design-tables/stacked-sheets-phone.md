# Design Property Table: Stacked sheets on the phone (R1)

Source: `design/design_handoff_the99_stacked_sheets/` (README calls 1 to 9, `STATES-stacked-sheets.md`, `StackFrame.dc.html`, and `READINESS.md` with the engineering audit). Plan: `docs/superpowers/plans/2026-10-05-stacked-sheets-phone.md`. Phone only (below `md`); desktop stacking is unchanged.

Each row is verified against the code, its tests (`stacked-phone.test.tsx`) and a walk at 390x844 in Chromium (touch) and WebKit. Measured values come from `getBoundingClientRect`. Rows marked with a later PR land there.

## A card over a sheet (PR A)

| Property | Design | Built | |
|---|---|---|---|
| Geometry | Starts at 0, as an unstacked card: card 320 x 447 at y 64, teaser top 532 at 812 | No `STACKED_SHEET` / `PHONE_TOP` for a card. Measured at 844 tall: card 35, 64, 320x447; teaser top 564 (532 + 32) for s1, s2, s3 and s7 | ✅ |
| Sheet underneath | Mounted, scroll kept, `inert`, `aria-hidden`, opacity 0 | Mounted, `aria-hidden`, opacity 0, `pointer-events: none`; **not inert** (audit A10: inert refused the focus the card hands back) | ✅ see audit |
| Way back | `← {sheet}` in the ✕'s slot, y 22 to 54; no ✕ beside it | `card-modal-back-mobile` at 22, right 18, 32 tall; the phone ✕ isn't drawn | ✅ |
| Pill rest (b1) | 32 tall, radius 16, `color-mix(--bg 55%)`, `←` `--fg-muted`, label 13/500 `--fg` | same | ✅ |
| Pill pressed (b2) | +16% `--fg` wash, scale .97 | `active:` wash and `scale-[.97]` | ✅ |
| Pill focus (b3) | 2px `--accent` ring, offset 2 | same, `focus-visible` | ✅ |
| Hit target (b4) | 44 tall (y 16 to 60) | a `before:` band 6px over and under the 32px plate | ✅ |
| Width (b5, b6) | 266 with the counter, 354 without, then an ellipsis | `max-w-[266px]` / `max-w-[354px]`, label `truncate` | ✅ |
| Disabled while a Take is pending (b7) | 40%, `aria-disabled` | PR B, with Take in the teaser | PR B |
| Accessible name | `Back to {sheet}` | `cardSheetCopy.back.a11y(label)` at both widths | ✅ |
| Focus on open | the pill | measured: the pill, both engines | ✅ |
| Escape / Back | full → teaser → the sheet | the card's `onEscape` ladder; history pops run it too (audit A5); walked in both engines | ✅ |
| Pill from full | straight to the sheet | `onClose`; walked | ✅ |
| Focus on pop | the opener inside the sheet | measured on the opener (s1, s2, s3, s7), both engines; the trigger names itself for Safari (audit A6b) | ✅ |
| Further layers (call 8) | none from a stacked card | no Find a deck with a sheet under the card | ✅ |

## A list sheet over a card (s6, PR A)

| Property | Design | Built | |
|---|---|---|---|
| Sheet top | 52, as shipped | measured 52 | ✅ |
| The card under it | doesn't move to 52; full size under the scrim | measured at y 64, full width (311 with its door strip in the teaser) | ✅ |
| Way back | `← {card}` in the sheet's head, `Back to {card}` | a pill in the head at both widths; no × | ✅ |
| Escape | the sheet, then the card, focus on the door | walked: focus lands on `See cheaper stand-ins` | ✅ |

## Later PRs

| Row | PR |
|---|---|
| Take in the teaser's foot row, `in place of` as an oracle line, the pill disabled while pending | B |
| s2 phone label `What would have to go`; s5 Pull it opener and `Which deck to pull from` | C |
| Open rise 240ms, pop drop 200ms, reduced-motion swap; pill contrast on six themes | D |

VERDICT (PR A rows): 0 visual gaps, 0 state gaps.
