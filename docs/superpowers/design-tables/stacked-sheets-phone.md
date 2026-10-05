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
| Disabled while a Take is pending (b7) | 40%, `aria-disabled` | Not reachable: Take closes the card before the swap runs (`press` calls `closeCard()` first, as shipped), so no pill is drawn while one is pending; the receipt's own Undo carries the wait | ✅ n/a |
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

## Take on a stacked stand-in (call 9, PR B)

Walked on `d5c1` (Aura Shards → Cheaper stand-ins → Astral Slide), 390x844, Chromium and WebKit.

| Property | Design | Built | |
|---|---|---|---|
| Teaser height | stays 280 | `teaserHeight` no longer adds the footer; teaser top measured 564 at 844 | ✅ |
| Card | 320 x 447 | measured 35, 64, 320x447 | ✅ |
| Oracle | two lines (max-height 44) when Take is in | `max-h-[44px]` with a footer, `64` without | ✅ |
| `in place of` line | margin-top auto, padding-bottom 6, mono 11, `--fg-muted`, one line | `teaserNote`: mono 11 `--fg-muted`, truncated; measured y 744 | ✅ |
| Foot row | border-top 1 `--border`, min-height 44, grid 1 : 1.35 | measured All details 166 of 390 (= 1 / 2.35), 43 tall | ✅ |
| All details cell | 13.5 `--fg-body`, `▴` `--fg-faint`, border-right 1 `--border` | same; the divider names `border-r-[color:var(--border)]` (a bare `border-r` resolves to the `--r` token) | ✅ |
| Take (teaser) | 34 tall, padding 0 14, border 1 `--accent`, radius 8, 13.5/500 `--accent`, nowrap | `teaserAction`, measured 133 x 34 | ✅ |
| Take (full) | pinned at the foot: padding 10 20 44, `--surface-sunken`, border-top; `in place of` mono 11 beside a 44-tall Take | `foot`, measured 740 to 844 | ✅ |
| Price plate | not in the footer (the teaser's second line has it) | a buy price is dropped from the phone layouts; a FREE row keeps its `free` chip in the note and the foot, since the teaser's line shows a buy price, and any row keeps its plate where the card's line names no figure (a failed read, or `no stock`); desktop `row` keeps the plate | ✅ |
| Counter in the footer | dropped | the phone footer never drew one after R2 (audit A9) | ✅ |

## The phone's own names, and Pull it as an opener (s2, s5, PR C)

Walked at 390x844 in Chromium (touch) and WebKit: s2 on `cafe` (What would have to go → Jeska's
Will), s5 on a local-dev fixture of three decks where `Silence` is asked for by one and sleeved in
two (Pull it → choose from 2 decks → the list head's name).

| Property | Design | Built | |
|---|---|---|---|
| s2 pill (phone) | `← What would have to go` | `phoneBackLabel={deckAnalysisCopy.sheets.upgradePath}`; measured `←What would have to go`, 178 wide | ✅ |
| s2 pill (desktop) | `← {target}`, unchanged | `backLabel` unchanged; the phone reads `phoneBackLabel ?? backLabel` | ✅ |
| s5 opener | the list head's card name | the title's name is a `CardDetailTrigger` (`TitleOpeningCard`); one per sheet | ✅ |
| s5 pill | `← Which deck to pull from` | `review.source.backLabel`; measured, named `Back to Which deck to pull from` | ✅ |
| s5 sheet under the card | hidden, kept mounted with the reader's pick | wrapper `aria-hidden`, opacity 0, `pointer-events: none` while the card is up | ✅ |
| s5 card | 320 x 447 at y 64, focus on the pill | measured; focus on the pill | ✅ |
| s5 way back | Escape, the pill and Back each pop one layer, focus back on the opener | all three measured; focus returned to `View details for Silence` | ✅ |

## Motion, the ledger and About (PR D)

Sampled every 40ms at 390x844 in Chromium (touch) and WebKit, on `cafe` (Game changers → a card).

| Property | Design | Built | |
|---|---|---|---|
| Open | the card rises 812 → 0 over 240ms `cubic-bezier(.2,.7,.2,1)` | `.anim-stack-rise`: `translateY(100%)` → none, 0.24s, that curve; phone only (`animation: none` from `48rem`); measured y 728, 286, 92, 34 at 40ms steps (WebKit 418, 153, 58, 18) | ✅ |
| Sheet on open | fades to 0 onto its scrim | `motion-safe:transition-opacity` 240ms on the hidden sheet (`ModalChrome`, the Pull it wrapper); measured 1.00, 0.85, 0.35, 0.13 | ✅ |
| Rise only on arrival | paging inside the card is sideways and does not re-rise | the provider marks the rise when a card arrives over a sheet from nothing; a page or a held card coming back does not | ✅ |
| Back | the card drops in 200ms, the sheet fades back | `dismiss`: `.anim-stack-drop` 0.2s and the provider's `revealing` flag draws the sheet again at once (still `aria-hidden` and unpressable until the card really closes after `STACK_DROP_MS`); measured y 0, 77, 234, 443, 706 with the sheet at 0, 0.21, 0.71, 0.92, 0.99 (WebKit) | ✅ |
| Every way back drops | Escape, the pill, hardware Back, the backdrop | all route through `dismiss` | ✅ |
| Never sideways | | rise and drop are vertical only | ✅ |
| Reduced motion | a swap | both animations `none`; `dismiss` closes at once; the sheet's fade is `motion-safe` only; measured: no intermediate frame in either direction | ✅ |
| Desktop | unchanged | the keyframes apply below 768 only, and `dismiss` closes at once at desktop width | ✅ |
| Focus | back on the opener | measured on `View details for Jeska's Will` after the drop, both engines | ✅ |
| Pill contrast | measure across six themes (the counter plate's ledger) | label against the pixels under it, three cards per theme: worst 6.66:1 (Kaldheim, WebKit), best 14.50:1; every theme ≥ 4.5 | ✅ |
| About | an ordinary edit, no bump | one sentence on the `card-detail` caption; `ABOUT_VERSION` stays 10, hash re-pinned | ✅ |

VERDICT (PR A, B, C and D rows): 0 visual gaps, 0 state gaps.
