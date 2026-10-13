# Design Property Table — Help me choose, the deeper look

Sources: `design/design_handoff_the99_help_me_choose/` — `HANDOFF.md` §3 (R1.3), `STATES-help-me-choose.md`
(3a–3g, "Credit line, by allowance"), `READINESS.md`, `READINESS-audit.md` (F9, F11, F12, H2), and the canvas files
`Help Me Choose.dc.html` (the mounted frame; its inline styles are the values below) and
`The 99 - Help Me Choose.dc.html` (legend and frame notes). Copy keys come from `help-me-choose · copy strings.ts`
(`helpMeChooseCopy.*`); wording is out of scope.

Mobile = the canvas's `phone` frame (390). Desktop = the 1300 frame, applied from `md` (768px) up.
`--display` is a canvas alias: in `src/` it is the `font-display` class or `var(--font-display)` (audit F12).
Mono = `'IBM Plex Mono',monospace`; body text inherits `'IBM Plex Sans',sans-serif` from the frame root.

## Rulings that beat the canvas or the STATES table

| # | Source | Ruling | Effect on this table |
|---|---|---|---|
| R1 | Audit H2 (Hugh, 2026-09-24); READINESS reading 6; HANDOFF §3 | The offer shows whenever the submit had words, even when every word matched | STATES marks the Offer "hidden" on 4c, 4d, 4e and 5b, all of which had words. The canvas logic (`offerKey = sc.offer ?? (sc.text ? "ready" : null)`) draws the 3a offer on those four. H2 and the canvas win: the offer shows on any results screen whose submit had words |
| R2 | Audit F11 | The owner-share state has no frame. It is 3g's disabled button with `creditsCopy.ownerShare` as the line | Owner-share rows below are derived from 3g |
| R3 | STATES "Credit line, by allowance"; audit F11 | Precedence: paused, then owner share, then spent | See State Coverage |
| R4 | Audit F9; READINESS "Copy that needs widening" | `creditsCopy.spent`'s tail widens to name deeper looks; `PAUSED_REASON` widens. Both via `/copy-review`. **Superseded (Hugh, 2026-10-12, link, never list):** neither line names a feature; both end in the `What uses credits?` link to About `credits` | The 3f and 3g lines are `creditsCopy.*` keys, not the canvas's literal strings |
| R5 | Audit F12 | `var(--display)` is a canvas alias | Title family is `--font-display` |
| R6 | HANDOFF §3 ("first results at 0.45") vs canvas | The canvas applies `opacity: dim` only to the `More commanders` rows (`s.row`); the Best fits cards (`s.bestCard`) carry no opacity, so in 3b's frame (5 results, 3 as best fits) only 2 rows dim | HANDOFF text is the spec: the first results dim at 0.45. Flagged for the verify pass: whether Best fits cards dim is not drawn |
| R7 | Canvas legend (`The 99 - Help Me Choose.dc.html:73`) vs mounted frame | Legend's `deeper` tag has no letter-spacing; the mounted chip has 0.06em | The mounted frame's 0.06em is used |

## Component: DeeperLook (the offer panel in the results bar)

Placement: the last child of the results bar (`ReadAsBar`), after the bar's top row (chips + Not used, Change
answers / Start over). The bar is a flex column, gap 14; padding 14 (mobile) / 16px 18px (desktop); radius 12;
`--surface-rail`; 1px solid `--border`.

### Panel

| Property | Mobile | Desktop |
|---|---|---|
| Renders when | the submit had words (R1) | same |
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | center |
| gap | 12px | 24px |
| padding | 13px 14px | 14px 16px |
| border-radius | 10px | 10px |
| background | `color-mix(in oklab, var(--accent) 6%, var(--surface-sunken))` | same |
| border | 1px solid `color-mix(in oklab, var(--accent) 28%, var(--border))` | same |
| motion | none (no transition or animation in any state) | none |

### Text column (left side)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| gap | 4px | 4px |
| flex | 1 | 1 |
| min-width | 0 | 0 |

### Title row

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 8px |
| flex-wrap | wrap | wrap |
| children | title, then the state tag when present | same |

### Title

| Property | Mobile | Desktop |
|---|---|---|
| copy key | `deeper.title` (3a, 3d, 3f, 3g, owner share) · `deeper.pendingTitle` (3b) · `deeper.doneTitle` (3c, 3e) | same |
| font-family | `--font-display` | `--font-display` |
| font-weight | 600 | 600 |
| font-size | 14.5px | 15.5px |
| color | `--fg` | `--fg` |

### State tag (`DONE` / `DIDN'T FINISH`)

| Property | Mobile | Desktop |
|---|---|---|
| Renders when | 3c (`deeper.doneTag`); 3d (`deeper.failTag`); absent in every other state | same |
| border-radius | 999px | 999px |
| padding | 2px 8px | 2px 8px |
| font-family | mono | mono |
| font-size | 9.5px | 9.5px |
| letter-spacing | 0.12em | 0.12em |
| text-transform | uppercase | uppercase |
| color, 3c done | `--accent` | `--accent` |
| background, 3c done | `color-mix(in oklab, var(--accent) 12%, transparent)` | same |
| color, 3d failed | `--danger` | `--danger` |
| background, 3d failed | `color-mix(in oklab, var(--danger) 12%, transparent)` | same |
| border | none | none |

### Lead

| Property | Mobile | Desktop |
|---|---|---|
| copy key | `deeper.lead` (3a, 3f, 3g, owner share) · `deeper.pendingLead` (3b) · `deeper.doneLead` (3c) · `deeper.failedLead` (3d) · `deeper.emptyLead` (3e) | same |
| font-size | 12.5px | 13px |
| line-height | 1.55 | 1.55 |
| color | `--fg-body` | `--fg-body` |
| text-wrap | pretty | pretty |
| max-width | 520px | 520px |

### Action column (right side)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| align-items | stretch | flex-end |
| gap | 6px | 6px |
| flex | none | none |
| children | the button row (when the state has a button), then the line | same |

### Button row

| Property | Mobile | Desktop |
|---|---|---|
| Renders when | 3a, 3b, 3d, 3f, 3g, owner share; absent in 3c and 3e | same |
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 8px |
| children | the button alone (until 2026-10-12, Stop followed it in 3b) | same |

### Button (all states that draw it)

| Property | Mobile | Desktop |
|---|---|---|
| role | button | button |
| display | inline-flex | inline-flex |
| align-items | center | center |
| justify-content | center | flex-start |
| gap | 9px | 9px |
| height | 44px | 38px |
| padding | 0 14px 0 6px | 0 14px 0 6px |
| border-radius | 999px | 999px |
| font-size | 13.5px | 13.5px |
| font-weight | 600 | 600 |
| white-space | nowrap | nowrap |
| flex | 1 1 auto | none |
| child order | cost pill first, then the label | same |
| accessible name | `{stub}. {label}` — cost first; 3a: `deeper.aria` (*1 credit. Look deeper.*) | same |
| label copy key | `deeper.action` (3a, 3f, 3g, owner share) · `deeper.actionPending` (3b) · `deeper.retry` (3d) | same |

### Button — live (3a offer, 3d failed)

| Property | Mobile | Desktop |
|---|---|---|
| background | `--accent` | `--accent` |
| color | `--bg` | `--bg` |
| border | none | none |
| hover | unspecified | unspecified |

### Button — looking (3b)

| Property | Mobile | Desktop |
|---|---|---|
| background | transparent | transparent |
| border | 1px solid `--border-strong` | same |
| color | `--fg-muted` | `--fg-muted` |
| label | `deeper.actionPending` | same |

### Button — disabled (3f spent, 3g paused, owner share)

| Property | Mobile | Desktop |
|---|---|---|
| state | disabled | disabled |
| background | transparent | transparent |
| border | 1px solid `--border-strong` | same |
| color | `--fg-disabled` | `--fg-disabled` |
| label | `deeper.action` | same |

### Cost pill (inside the button)

| Property | Mobile | Desktop |
|---|---|---|
| copy key | `deeper.cost` (3a, 3b, 3d) · `deeper.costSpent` (3f) · `deeper.costPaused` (3g, owner share) | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| height | 30px | 26px |
| padding | 0 10px | 0 10px |
| border-radius | 999px | 999px |
| font-family | mono | mono |
| font-size | 10.5px | 10.5px |
| font-weight, live (3a, 3d) | 600 | 600 |
| background, live | `color-mix(in oklab, var(--bg) 22%, transparent)` | same |
| color, live | `--bg` | `--bg` |
| font-weight, 3b and disabled | 500 | 500 |
| background, 3b and disabled | `--surface` | `--surface` |
| color, 3b | `--fg-muted` | `--fg-muted` |
| color, disabled (3f, 3g, owner share) | `--fg-disabled` | `--fg-disabled` |

### Stop

**Removed 2026-10-12 (Hugh):** a read always runs to its end, so Help me choose draws no Stop. Kept below as the record of what shipped.

| Property | Mobile | Desktop |
|---|---|---|
| Renders when | 3b only | same |
| copy key | `deeper.stop` | same |
| role | button | button |
| display | inline-flex | inline-flex |
| align-items | center | center |
| height | 44px | 36px |
| padding | 0 12px | 0 12px |
| border-radius | 8px | 8px |
| border | 1px solid `--border-strong` | same |
| background | none | none |
| font-size | 13px | 13px |
| color | `--fg-muted` | `--fg-muted` |
| flex | not set (the Looking… button takes the rest of the row) | not set |
| behavior | stops the look; the credit comes back (audit F4) | same |

### The line (under the button)

| Property | Mobile | Desktop |
|---|---|---|
| Renders | in every state but 3b | same |
| copy, 3a / 3d | `creditsCopy.first` (ruled: STATES "Credit line, by allowance" gives its examples in `first`'s wording, and a press follows) | same |
| copy, 3e | `creditsCopy.standing` (no press follows) | same |
| copy, 3b | none: nothing sits under the press while it reads (removed with Stop, 2026-10-12; was `deeper.pendingLine`) | same |
| copy, 3c | `deeper.doneLine(creditsCopy.standing)` | same |
| copy, 3f | `creditsCopy.spent`. `deeper.spentLine` was dropped (orchestrator ruling); it ends in the `What uses credits?` link (superseded F9, 2026-10-12) | same |
| copy, 3g | `creditsCopy.paused`; its reason ends in the same link (superseded F9, 2026-10-12) | same |
| copy, owner share | `creditsCopy.ownerShare` (R2) | same |
| font-family | mono | mono |
| font-size | 10px | 10.5px |
| line-height | 1.5 | 1.5 |
| color | `--fg-faint` | `--fg-faint` |
| text-align | center | right |
| text-wrap | pretty | pretty |

## Component: Deeper chip (a chip drawn from the deeper look)

Sits in the We read this as chip row (flex, wrap, gap 6px), after the free-match chips. Renders in 3c only (the
canvas draws one: `theme · Tokens`). Everything but the edge and the tag is the chip of its kind.

### Chip

| Property | Mobile | Desktop |
|---|---|---|
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 6px | 6px |
| white-space | nowrap | nowrap |
| height | 32px | 28px |
| padding | 0 8px 0 9px | 0 8px 0 9px |
| border-radius | 6px | 6px |
| background | `--surface` | `--surface` |
| border | **1px dashed `--accent`** | same |
| motion on arrival | none | none |
| child order | kind label, value, (card trailing marks), `deeper` tag last | same |

### Kind label

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 9px | 9px |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `--fg-locked` | `--fg-locked` |

### Value

| Property | Mobile | Desktop |
|---|---|---|
| theme / budget / bracket kind | 12.5px, `--fg-body` | same |
| card kind | 12.5px / 600, `--fg`, border-bottom 1px dotted `--accent`; opens `CardModal` | same |

### `deeper` tag

| Property | Mobile | Desktop |
|---|---|---|
| copy key | `readAs.deeperMark` | same |
| font-family | mono | mono |
| font-size | 9px | 9px |
| letter-spacing | 0.06em (R7) | 0.06em |
| text-transform | none (drawn lowercase) | none |
| color | `--accent` | `--accent` |

## Component: Not used line (after a look)

The same line as before a look; only its label key changes. It is not a chip.

### Row

| Property | Mobile | Desktop |
|---|---|---|
| Renders when | at least one phrase is left unused | same |
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | baseline | baseline |
| gap | 4px 10px | 4px 10px |

### Label

| Property | Mobile | Desktop |
|---|---|---|
| copy key | `readAs.notUsed` (3a, 3b, 3d, 3f, 3g, owner share) · `readAs.stillNotUsed` (3c, 3e) | same |
| font-family | mono | mono |
| font-size | 9.5px | 9.5px |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `--fg-locked` | `--fg-locked` |

### Phrase

| Property | Mobile | Desktop |
|---|---|---|
| content | the phrase in curly quotes (“…”) | same |
| 3c | only the phrases the look did not use (canvas: 1 of 2) | same |
| 3e | every phrase (canvas: 2 of 2) | same |
| font-size | 13px | 13px |
| color | `--fg-muted` | `--fg-muted` |
| border-bottom | 1px dotted `--border-dashed` | same |
| edge / background / remove control | none | none |

## Component: Results list while a look runs (3b)

| Property | Mobile | Desktop |
|---|---|---|
| Renders | the first results, kept in place until the new ones are ready | same |
| opacity, 3b | 0.45 (HANDOFF §3; see R6 for the Best fits cards) | 0.45 |
| opacity, every other state | 1 | 1 |
| transition | none | none |
| unaffected | the results bar, the order line, the Best fits / More commanders labels | same |

## State Coverage

| State | Triggering condition | What renders | Key props |
|---|---|---|---|
| 3a offer (`leftover`) | Results screen; the submit had words; no look run for these words yet; ≥ 1 credit left; not paused or owner-share | Chips + `Not used` phrases; panel with title, lead, live button (`1 credit` · Look deeper), standing line; first results at opacity 1 | title `deeper.title`; lead `deeper.lead`; stub `deeper.cost`; label `deeper.action`; aria `deeper.aria`; line `creditsCopy.first` |
| 3a, words all matched (R1) | Same, but no phrase left unused (4c, 4d, 4e, 5b with words) | As 3a, without the Not used row | same as 3a |
| 3b looking (`reading`) | The player pressed Look deeper; the look is running | Title and lead change; hairline button (`1 credit` · Looking…) in `--fg-muted`, alone, with no line under it (Stop and its line removed 2026-10-12); first results at 0.45 | title `deeper.pendingTitle`; lead `deeper.pendingLead`; stub `deeper.cost`; label `deeper.actionPending` |
| 3c done (`read`) | The look returned ≥ 1 valid answer | Deeper chip(s) with dashed accent edge + `deeper`; `Still not used` with the remaining phrases; panel title + `DONE` tag, lead, no button, line; results re-ranked with the new answer's figure on each row (canvas: 3 figures) | title `deeper.doneTitle`; tag `deeper.doneTag`; lead `deeper.doneLead`; line `deeper.doneLine(standing)`; chip `readAs.deeperMark` |
| 3d failed (`failed`) | The look errored or timed out; credit refunded | Title + `DIDN'T FINISH` tag (danger); failed lead; live button (`1 credit` · Try again); standing line; first results at 1; `Not used` unchanged | title `deeper.title`; tag `deeper.failTag`; lead `deeper.failedLead`; label `deeper.retry`; line `creditsCopy.first` |
| 3e nothing to add (`emptyread`) | The look returned no valid answer; credit refunded (READINESS 1, audit F4) | Title `Deeper look`, no tag; empty lead; no button (no second offer for the same words); standing line; `Still not used` with every phrase; first results | title `deeper.doneTitle`; lead `deeper.emptyLead`; line `creditsCopy.standing` |
| 3f no credits (`spent`) | 0 credits left; not paused; owner share not used | Title + lead as 3a; disabled button (`0 left` · Look deeper); spent line; first results | stub `deeper.costSpent`; line `creditsCopy.spent` (ends in the `What uses credits?` link) |
| 3g paused (`paused`) | App-wide spend limit reached (highest precedence) | Title + lead as 3a; disabled button (`Paused` · Look deeper); paused line; first results | stub `deeper.costPaused`; line `creditsCopy.paused` (its reason ends in the same link) |
| Owner share (F11, no frame) | Owner's share used; not paused (precedes spent) | 3g's disabled button with a different line | stub `deeper.costPaused`; line `creditsCopy.ownerShare` |
| No offer | Results screen and the submit had no words (2a blank, 4a, 4b, 4f, 5a, 5c–5e) | No panel; no deeper chip; no Not used row | — |

Credit line by allowance (the line in 3a/3d/3e and the stub):

| Allowance | Stub | Button | Line |
|---|---|---|---|
| ≥ 1 left, none out | `1 credit` | live | `creditsCopy.first` |
| ≥ 1 left, some out | `1 credit` | live | `creditsCopy.first` (with next-at time) |
| 0 left | `0 left` | disabled | `creditsCopy.spent`, ending in the `What uses credits?` link |
| owner's share used | `Paused` | disabled | `creditsCopy.ownerShare` |
| app paused | `Paused` | disabled | `creditsCopy.paused`, its reason ending in the same link |
