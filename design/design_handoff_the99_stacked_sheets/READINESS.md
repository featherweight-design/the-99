# Stacked sheets on the phone — readiness (R1)

**Status: awaiting Hugh's review.** Phone only (below `md`); desktop stacking unchanged.

| Part | Readiness | Note |
|---|---|---|
| Card over a sheet goes full screen | **Ready** | Drop `STACKED_SHEET` (96) and `PHONE_TOP` 96 / 140 for card sheets. A stacked card uses the unstacked geometry, so its card is 320 at 390×812. |
| Sheet underneath | **Ready** | Stays mounted with its scroll kept. While covered it is `inert`, `aria-hidden` and at opacity 0. |
| Back pill on the phone | **Ready, small change** | `backLabel` is already plumbed. The pill drops its `md:`-only class and replaces the phone ✕ in the same slot. Width cap 266 with the counter, 354 without. Hit target 44 tall. |
| Back labels per opener | **Needs openers** | Each opener passes its short name (copy file). Pull it is a new opener: the card name in its head becomes a `CardDetailTrigger`. |
| Escape / Back / pill | **Ready** | Escape and Back: full → teaser → pop. The pill pops from any state. Each layer keeps its own history entry. |
| Focus | **Ready** | On open, focus goes to the pill. On pop, it goes to the opener inside the sheet. |
| List sheet over a card | **Ready** | Stand-ins still rise from 52. The card underneath no longer moves to `PHONE_TOP[52]`. The sheet's ✕ becomes `← {card}`. |
| Take in the teaser | **Ready, layout change** | The `footer` phone layout moves into the teaser's foot row, and `teaserHeight` no longer adds `footerHeight` on the phone. In the full state, Take pins to the foot. |
| Motion | **Ready** | Open: the card rises over 240ms `cubic-bezier(.2,.7,.2,1)` and the sheet beneath fades out. Pop: 200ms. Never sideways. Reduced motion: swap. |
| Copy | **To /copy-review** | `stacked-sheets · copy strings.ts`. `Which deck to pull from` is new. |

## Gap report

1. **Rulings reopened:** the verdict addendum's ruling 1 phone drawing (the 96 offset and the step down to `--surface-sunken`). Its rule stands: the card stacks, the receipt doesn't close, two dismissals give two landings.
2. **The swap tools addendum §3's phone offsets** (52 / 96 / 140) are superseded for card layers. The list sheet keeps 52.
3. **Desktop label mismatch:** the phone's `← What would have to go` vs desktop's `← {target}`. Flagged for Hugh, not changed.
4. **Pill contrast** on the art wash: measure it in build across all six themes, as for the counter plate.
5. **`cramped` guard** stays as is. At 390 it no longer trips for a stacked card.

## What a green looks like

- At 390×812, a card opened from the receipt, from What would have to go, from stand-ins or from the Pull it list measures 320 × 447 at y 64. The teaser top is 532.
- The top-right control reads `← {sheet}`, and its accessible name is `Back to {sheet}`. No ✕ is drawn beside it.
- A horizontal drag on the band pages the stacked card's own list. The pill and the counter stay fixed.
- From full: Escape goes to the teaser, then to the sheet. The pill goes straight to the sheet. Focus lands on the opener.
- Stand-ins over a card: the card stays at full size under the scrim. Opening a stand-in gives a 320 card with Take in the teaser's foot row.
- Hardware Back pops exactly one layer every time.
- Reduced motion: no rise and no fade. Drags still track the finger.
- Desktop is unchanged.

## Engineering readiness audit (2026-10-05, against `origin/main`)

**Verdict: GREEN.** Every claim was checked against the code. The findings below are engineering-level and resolved here; none needs Design. Two are flagged to Hugh for information only, and neither blocks the build.

| # | Handoff claim | At `main` | Resolution |
|---|---|---|---|
| A1 | `backLabel` is plumbed; each opener passes its short name | `registerSheet(label)` is called by `ModalChrome` for every sheet. `backLabel` defaults to the sheet's `title`. The receipt passes none (so its finding label), as do lean-line reasoning (its title) and the synopsis. Stand-ins passes `Cheaper stand-ins`, change-commander passes its single title, and upgrade path passes `BRACKET_NAMES[target]` | No change for s1, s3, s4. **s2 needs a second label**: desktop keeps `← {target}` and the phone draws `← What would have to go`. `registerSheet` takes an optional phone label beside the desktop one. Change commander isn't in the pairs table, but it registers a label and gets the same rule. |
| A2 | s3 Synopsis is `← Synopsis` ("shipped") | The synopsis sheet's title is `synopsisCopy.modal.title` = `Overview`, which is what its card shows today | The copy file's "shipped" note is wrong. The label is the sheet's own title (A1 rule), so it reads `← Overview`, the name the reader saw. Wording goes to `/copy-review`, not Design. |
| A3 | Pull it is a new opener: its head's name becomes a `CardDetailTrigger` | `SourcePickerBody` draws `sourceCopy.title(card.name)` as plain text and is shared by the desktop popover and the phone sheet. Neither registers as a sheet. Its `Sheet` dismisses on an outside press. | Phone only: the sheet shell's head renders the name as a trigger; the desktop popover is unchanged (scope). The sheet registers `Which deck to pull from` through `registerSheet`. It ignores outside presses while a card is up over it (`openOracleId`), or the card's first tap would close the list under it. The pick is kept because the sheet stays mounted. `/decks/[id]/changes` already has a `CardDetailProvider`. |
| A4 | Call 8: "nothing in a stacked card opens a further layer: no door, no Find a deck … as shipped" | **Not as shipped.** The provider passes `fitsDoor(card)` to a card stacked over any sheet that has no footer (the receipt, upgrade path, synopsis), so Find a deck opens a fourth layer today | Built as called: a card with a sheet under it gets no Find a deck. The stand-ins' Take card already has none. **Flagged to Hugh for information**: this removes a door that works today on cards opened from analysis sheets. |
| A5 | Escape / hardware Back: full → teaser → pop | `lib/a11y/dialog.ts`: each dialog arms its own history entry, and a pop calls that dialog's close, which on the card modal is the Escape ladder (`onEscape`: zoom → sheet → close) | Already true. The pill calls `onClose` directly, so it skips the teaser rung, as called. |
| A6 | On pop, focus goes to the opener inside the sheet | `useDialogA11y` returns focus to the element that opened the dialog, and the sheet stays mounted | Already true. On open, focus moves to the pill (today the ✕). |
| A7 | The pill replaces the phone ✕ | `card-modal.tsx` draws `back` as a desktop pill (`md:` only) and a phone ✕ whose `aria-label` is an inline `Back to ${back}` string | The pill draws at both widths and the phone ✕ goes. The inline strings move to `cardSheetCopy.back` (the copy file's target). |
| A8 | Call 7: the sheet's ✕ becomes `← {card}` in its own head | `ModalChrome`'s `overCard` (stand-ins over a card, **and the Find a deck picker**) draws a phone × named `Back to {name}` | The same `← {card}` pill in the head for both. The Find a deck picker isn't drawn, but it is the same `overCard` path, so it follows the rule. `PHONE_TOP[52]` no longer moves the card under it. |
| A9 | Call 9: the footer's `3 of 4` goes | The phone has drawn no footer counter since R2; the stand-in footer's column layout is `in place of {cut}, in {deck}`, a price plate and a 44px Take | Nothing to remove. In the teaser, Take shares the foot row with All details and `in place of` takes an oracle line. The price plate goes from the footer because the teaser's second line already shows it. Shipped `swapToolsCopy.modal.inPlaceOf(cut, deck)` stays unless `/copy-review` shortens it. |
| A10 | The sheet underneath is `inert`, `aria-hidden` and at opacity 0 once the card settles | `ModalChrome` already reads `behind = openOracleId !== null` to step its ground down | That same flag drives opacity 0, `aria-hidden` and `pointer-events: none` on the phone. Desktop keeps the stepped ground. **Not `inert`** (measured in PR A, Chromium and WebKit at 390): the card hands focus back to its opener in the commit before the sheet re-renders without the flag, so an inert sheet refused the focus and it fell to `<body>`. The card's own dialog already traps Tab, so `inert` added nothing a keyboard reader could reach. |
| A6b | Focus returns to the opener in Safari | WebKit focuses no button on a click, so the dialog's capture of the focused element read `<body>`, and focus came back to nothing (measured at 390) | The trigger names itself to `open`, and the card returns focus to it while it is still in the document. An opener that names none falls back to the dialog's own capture, as today. |
| A11 | Pop: the card drops in 200ms | `CardModal` unmounts the moment it closes; nothing animates an exit | A short exit state in the provider keeps the card mounted for 200ms while it drops and the sheet fades back. Under reduced motion it unmounts at once. |
| A12 | The cramped guard stays | `cramped` is measured per dialog | Unchanged. A stacked card's dialog is now full height, so it trips only where an unstacked card's would. |

**Ledger, in build:** the pill's contrast across six themes (the counter plate's measurement). The desktop `← {target}` vs phone `← What would have to go` difference is Design's flag for Hugh and is left out of scope.

**About:** an ordinary edit to `card-detail`'s caption, no bump. Nothing here is a new capability; a card opened from a sheet now covers it and names the way back.
