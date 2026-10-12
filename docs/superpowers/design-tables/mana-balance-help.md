# Mana Balance: Improve my mana (door, color step, help result) and the land cell — property table

Sources, design files only:

- **R3b** `design/design_handoff_the99_tuning_hub/The 99 - Tuning Hub (R3b) · B Mana Balance, full view.dc.html` (build target; frames F1, F1b, F2, F2b, F3, F3b)
- **R3a** `… (R3a) · B Mana Balance, pointer.dc.html` (N3c pipless row, N4 one color, N5 colorless, step's open disclosure)
- **R3** `… (R3) · B Mana Balance, evidence.dc.html` (M5 swap rows, M5b tooltip open, M8 no staples, M9 help failed)
- **R1A** `… (R1) · A Landing, shortcuts and the strip.dc.html` (A5 / A5b strip cell geometry)
- `design-tables/tuning-hub.md` (rows Land cell, HelpResult, ImproveDoor, ColorStep, ColorStep R3b) and `STATES-tuning-hub.md` (R3, R3a, R3b)
- Copy keys: `mana-balance R3 · copy strings.ts` (`manaBalanceCopy.*`). Wording out of scope; the key that renders is recorded.

Conventions: Phone = 390 frame, Desktop = 900 frame. "same" = identical value. `[conflict]` = files disagree; the R3b value is the one in the cell. `[gap]` = no file specifies it. Mono = `'IBM Plex Mono'`; sans = `'IBM Plex Sans'`. All colors are the handoff tokens; the only raw values are noted as such.

Panel context (R3b): Mana Balance panel `--surface-sunken`, `1px --border`, radius 12, padding `18px 20px` desktop / `16px 14px` phone, column gap 18. Order: … ManaSection "Lands" → **ImproveDoor** → KarstenCitation. `tapH` = 32 desktop / 44 phone throughout.

---

## 1. ImproveDoor (container, closed)

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| element | `div` | same |
| background | `--surface` | same |
| border | `1px solid --border` | same |
| radius | 10 | same |
| padding | 14 | same |
| layout | flex column, gap 12 (top row, then step or result) | same |
| top row | flex, `flex-wrap: wrap`, `align-items: center`, `justify-content: space-between`, gap `10px 16px` | same |
| text column | flex column, gap 4, `flex: 1 1 260px`, `min-width: 0` | same |
| title | sans 13.5 / 600 `--fg`; key `door.title` | same |
| lead | sans 12.5 / 1.5 `--fg-body`, `text-wrap: pretty`; key `door.lead(commander)` (several colors) | same |
| button element | `role=button`, `aria-expanded="false"` | same |
| button size | `flex: 1 1 100%` (wraps to its own full-width line), min-height 44 | `flex: none` (right of the text), min-height 32 |
| button box | flex, center/center, padding `0 16px`, radius 8, `1px solid --accent`, background none | same |
| button text | sans 13 / 600 `--accent`; key `door.button` | same |
| button visibility | drawn only while neither step nor result is open (F2, F3/F3b); absent in F2b (step) and F1/F1b (result) | same |
| title / lead visibility | always drawn, including while step or result is open | same |
| preselection | none: no color named, chip or row chosen while closed | same |
| colorless identity | the whole door is absent (R3a N5); `thin.colorless` note stands above | same |

## 2. ImproveDoor, one color (R3a N4, Wizards)

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| lead | key `door.leadOne(commander, color)` | same |
| button | drawn as §1 | same |
| press | opens the color's HelpResult directly; no ColorStep rendered ("a one-row step" is a must-not) | same |
| Change color in result | [gap] not drawn for one color (the step it returns to skips itself) | same |

## 3. ColorStep (R3b F2b)

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| condition | door pressed, identity has 2+ colors, no pick yet | same |
| container | `border-top 1px solid --border`, padding-top 12, flex column, gap 8 | same |
| head row | flex, `align-items: center` [conflict: R3a `baseline`], `justify-content: space-between`, gap 10 | same |
| head label | mono 10 / letter-spacing 0.14em / uppercase `--fg-faint`; key `step.head` | same |
| close (✕) | `role=button`, `aria-label` key `step.close`; min-width 44, min-height 44; flex, `align-items: center`, `justify-content: flex-end`; glyph `✕` sans 13 `--fg-muted` | min-width 32, min-height 32 [conflict: R3a frame min-height 28; tuning-hub.md "✕ 28"] |
| close action | closes the step back to the closed door (§1) [gap: focus target not specified] | same |
| order line | sans 12.5 / 1.55 `--fg-body`, `text-wrap: pretty`; key `step.order` | same |
| Needs disclosure (closed) | under the order line; `role=button`, `aria-expanded="false"`, `align-self: flex-start`, min-height 44, flex center; inner text mono 11 `--accent`, `border-bottom 1px solid --accent-dim`, padding-bottom 1; key `needs.toggle` | same, min-height 32 |
| Needs disclosure (open, R3a) | panel `--surface-sunken`, `1px solid --border`, `border-left 3px solid --accent`, radius 9, padding `11px 13px`, column gap 7; header row flex baseline space-between gap 10: trigger (mono 11 `--accent`, no rule, `aria-expanded="true"`) + `Hide` (mono 11 `--fg-faint`, key `needs.close`); two `p` 12 / 1.55 `--fg-body` with bold lead-in 600 `--fg` (`needs.needsLabel`/`needsBody`, `needs.sourceLabel`/`sourceBody`/`sourceLink`/`sourceTail`); link `TCGplayer` 500 `--accent`, inline-flex gap 4, nowrap, 14px link-out SVG (§10) | same |
| radiogroup | `role=radiogroup`, `aria-label="Which color"`; flex column, gap 6 | same |
| order of rows | lowest have/needs first over patterns with ≥2 nonland cards (commander excluded) and a published figure; ties W U B R G; pipless colors last | same |
| selection on open | none: every row `aria-checked="false"` | same |
| foot line | absent [conflict: R3a draws mono 10.5 / 1.5 `--fg-faint` designer note under the rows; R3b drops it] | same |
| pick | closes the step into HelpResult (§5) for that color | same |

## 4. ColorStep radio row

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| element | `div role=radio aria-checked="false"` | same |
| min-height | 56 | 44 |
| layout | grid, columns `18px minmax(0,1fr) auto`; column-gap 12, row-gap 2; `align-items: center` | grid, columns `18px 120px minmax(0,1fr) auto`; column-gap 12, row-gap 2; `align-items: center` |
| lines | two: name + Have·Needs on row 1, cost on row 2 | one: radio · name · cost · Have·Needs |
| padding | `8px 12px` | same |
| background / border / radius | `--surface-sunken`, `1px solid --border-strong`, radius 9; identical for every row (no star, tint or weight on the first) | same |
| radio circle | grid col 1, rows `1 / span 2`; 18 × 18, radius 50%, `1px solid --fg-faint`, no fill | col 1, row 1 (span 1); same box |
| name cell | col 2, row 1; flex center gap 8; sans 13 / 500 `--fg`; color disc 14 × 14 radius 50% `var(--w|u|b|r|g)`; name = color name | same |
| cost cell | col `2 / -1`, row 2; mono 11 `--fg-muted`, `min-width: 0`; key `step.cost(code, cards)` | col 3, row 1; same type |
| Have · Needs cell (ranked) | col 3, row 1, `justify-self: end`, `white-space: nowrap`; mono 11.5 `--fg`; key `patterns.haveNeeds(have, needs)` | col 4, row 1; same |
| noPips row (R3a N3b, Aang black) | last; cost cell empty; Have cell key `step.noPips(sources)` in `--fg-muted` | same |
| noPublished row | [gap] not drawn in any frame and no `step.*` key; the order rule counts only patterns with a published figure. Nearest drawn analogue is the pattern row's `patterns.none` in `--fg-muted` | same |
| checked state | [gap] not drawn: a pick closes the step | same |
| hover / focus | [gap] not drawn | same |

## 5. HelpResult (R3b F1 / F1b)

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| condition | a color picked from the step, or the one-color door pressed | same |
| container | `border-top 1px solid --border`, padding-top 12, flex column, gap 12 | same |
| head row | flex, `align-items: baseline`, `justify-content: space-between`, gap 10, wrap | same |
| head left group | flex baseline, gap 10, wrap | same |
| title | flex center gap 8; disc 14 × 14 radius 50% in the picked color's token; sans 13.5 / 600 `--fg`; key `help.head(color)` [conflict: R3 has no disc] | same |
| have / needs figure | mono 10.5 `--fg-faint`; key `patterns.haveNeeds(have, needs)` [conflict: R3 `{n} {color} sources now`] | same |
| figure for a pipless color | [gap] not drawn | same |
| Change color | `role=button`; min-height 44; flex center; mono 11 `--accent`; key `help.change`; returns to the step (§3) | min-height 32; same |
| sections | Swap basics (§6), then Staples (§8); each a flex column, gap 8 | same |
| actions | none: no Apply, Add or Cut (information only) | same |
| door button | absent while the result is shown | same |

## 6. Swap basics section

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| section head | flex, `align-items: center`, gap 10; mono 10 / 0.14em / uppercase `--fg-faint`; label key `help.swaps` | same |
| info button | after the label; `role=button`, `aria-label` key `help.howLabel`; `flex: none`, 18 × 18, radius 50%, `1px solid --fg-faint`, ink `--fg-faint`; glyph `i` 10.5 / 600, letter-spacing 0, `text-transform: none`; centered | same |
| info button, open | ring and ink `--accent` (R3 M5b) | same |
| info button hit area | 18 drawn; [gap] no 44 expansion drawn on phone | 18 |
| head rule | `flex: 1`, height 1, `--border` | same |
| tooltip (open) | in flow directly under the head (not floating); `role=tooltip`; `max-width: 420px`; padding `12px 14px`; `--elevated`; `1px solid --border-strong`; radius 8; `box-shadow: 0 8px 24px rgba(0,0,0,0.45)` (raw); sans 12.5 / 1.55 `--fg-body`, `text-wrap: pretty`; key `help.how(color)` | same (drawn open only at 900, M5b) |
| tooltip trigger / dismiss | [gap] press vs hover not specified | same |
| swap row | `--surface-sunken`, `1px solid --border`, radius 9, padding `10px 12px`; flex, wrap, `align-items: baseline`, gap `4px 14px` | same |
| swap move | sans 13 `--fg`; key `help.swap(n, out, into)` | same |
| swap changes | mono 10.5 / 1.5 `--fg-muted`; each change key `help.change_(color, before, after)`, joined ` · `, picked color first | same |
| none row (no swap) | `1px dashed --border-dashed`, radius 9, min-height 40, flex center, gap 10, padding `8px 12px`; dash `–` mono 12 `--fg-locked`; text sans 12.5 `--fg-faint`, key `help.noSwap(color)`; no reason given | same |
| none row + info | the ⓘ stays on the head when the none row shows (R3b F1) | same |

## 7. Staples section head

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| head | as §6 head, no info button; key `help.staples(commander)` | same |
| head rule | `flex: 1`, `min-width: 16px`, height 1, `--border` | same |
| order | owned first; no to-buy row above an owned one | same |
| no staples (R3 M8) | one none row, same box as §6 none row; key `help.noStaples(color)`; no reason, no trades | same |

## 8. Staple row

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| container | `--surface-sunken`, `1px solid --border`, radius 9; flex column, gap 7 | same |
| padding | 12 | `10px 12px` |
| top line | flex, wrap, `align-items: center`, gap `8px 10px` | same |
| thumbnail | 22 × 31, `flex: none`, radius 3 (placeholder fill in frames: `repeating-linear-gradient(135deg, --elevated 0 3px, --border 3px 6px)`) | same |
| thumbnail border, owned | `1px solid --border-strong` | same |
| thumbnail border, to buy | `1px dashed --border-dashed` | same |
| name | sans 13 / 600 `--fg`, `border-bottom 1px dotted --accent`; opens the card detail | same |
| ownership group | inline-flex center gap 6; mono 10.5 `--fg-muted` | same |
| dot, owned | 7 × 7, radius 50%, fill `--success`, `1px solid --success`; text key `help.owned(free)` | same |
| dot, to buy | 7 × 7, radius 50%, transparent, `1px dashed --fg-faint`; text key `help.toBuy` | same |
| BuyTag (to buy, price known) | shipped BuyTag: inline-flex center gap 5; mono 10.5 `--warning` on `rgba(224,145,60,0.12)` (raw); radius 4; padding `1px 6px`; `buy ··· {price}` with `···` in `--fg-locked` | same |
| Mana Pool link | `a`, mono 11, `--accent`, hover `#6C95D8` (raw, canvas `a:hover`); key `help.buyLink`; `aria-label` "Buy {name} at Mana Pool, opens in a new tab"; href `manapoolCardUrl` | same |
| to buy, price null | `to buy` only; BuyTag and Mana Pool link both absent [conflict: tuning-hub.md says BuyTag + ↗ with the price omitted; R3 and R3b frames (Utopia Sprawl) drop both] | same |
| fact line | flex, wrap, `align-items: center`, gap `5px 8px`; mono 10.5 `--fg-faint`; rate key `help.rate.commander` / `.pair` / `.identity` by source; then `· ` + key `help.adds` | same |
| pip discs | inline-flex, gap 3; each 12 × 12 [conflict: tuning-hub.md 10], radius 50%, bg `var(--w|u|b|r|g)`, ink W `#14110E`, U `#F2F4F4`, B `#14110E`, R `#0B0B0E`, G `#F2F4F4` (raw); letter 7.5 / 600 centered; `aria-label` color name; W U B R G order | same |
| trade box | flex, `align-items: flex-start`, gap 8; `--bg`; `1px solid --border`; radius 7; padding `7px 9px` | same |
| trade tag | `flex: none`; mono 9 / 0.12em / uppercase `--fg-body`; `1px solid --border-strong`; radius 999; padding `1px 7px`; key `help.tradeTag` | same |
| trade text | mono 10.5 / 1.55 `--fg-muted`; key `help.trade(basic, changes)` | same |
| no trade line | replaces the trade box; mono 10.5 `--fg-faint`; key `help.noTrade` | same |
| colors | only the identity's colors; no staple outside it | same |
| actions | none | same |

## 9. HelpResult failed (R3 M9, phone only drawn)

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| head | title as §5; figure absent [gap: R3b head (disc, Change color) on failure not drawn] | [gap] not drawn |
| message row | flex, `align-items: flex-start`, gap 10 | [gap] |
| mark | SVG `role=img`, `aria-label` key `help.failedMark`; viewBox `0 0 16 16`, 18 × 18, `flex: none`, `display: block`, `color: --danger`, margin-top 1; path fill `currentColor`, `fill-rule: evenodd`, d `M8 1.2 A6.8 6.8 0 1 0 8 14.8 A6.8 6.8 0 1 0 8 1.2 Z M7.05 4 H8.95 L8.6 9.3 H7.4 Z M8 10.5 A1.15 1.15 0 1 0 8 12.8 A1.15 1.15 0 1 0 8 10.5 Z` | [gap] |
| sentence | `flex: 1`, `min-width: 0`; sans 12.5 / 1.55 `--fg-body`; key `help.failed(color)` | [gap] |
| Try again | `align-self: stretch`, min-height 44, flex center; sans 13 / 600 `--accent`; `1px solid --accent`; radius 8; key `help.retry` | [gap] |
| sections | Swap basics and Staples absent | [gap] |
| evidence above | stands (not hidden) | same |

## 10. Shared SVG

| Glyph | Spec |
|---|---|
| link-out (Needs disclosure Source line) | `aria-hidden`, viewBox `0 0 16 16`, 14 × 14, `display: block`, `flex: none`; path `M6 3.5h6.5V10M12.5 3.5 4 12`, `fill: none`, `stroke: currentColor`, `stroke-width: 1.6`, round caps and joins |
| failure mark | §9 |

## 11. Land cell — `balance mana →` / `balance →`

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| caption | mono 9 `--accent`, margin-top 3, under the figure and rec, centered; key `tuningHubCopy.shortcuts.balanceManaShort` | mono 10 `--accent`, right end of the bottom row (flex baseline space-between gap 8, `rec` mono 9 `--fg-faint` left), margin-top 6; key `tuningHubCopy.shortcuts.balanceMana` |
| cell box (R1A, shipped strip) | min-height 62, radius 7, padding `7px 2px 6px`, `text-align: center`, `--surface-sunken` | min-height 72, radius 9, padding `11px 14px`, `--surface-sunken` |
| border | `1px solid --border-strong` (interactive cell) | same |
| condition | deck has a colored pip AND the land count is not under its target with a shelf | same |
| precedence | under target with a shelf → `consider →`; else colored pip → balance; else dash. One action per cell | same |
| dash (colorless) | `—` in `--border-dashed`; border `--border` | same |
| action | whole cell is the control: switch to Analysis, open Mana Balance, scroll the Tuning heading to top, focus the tool heading | same |
| verdict | none: no `--warning` tint from Mana Balance; a door, not an alarm | same |

## 12. Hover, focus, transitions

| Property | Phone (390) | Desktop (900) |
|---|---|---|
| link hover | `a:hover` `#6C95D8` (raw, canvas-wide; Mana Pool link, TCGplayer link) | same |
| button / radio / info hover | [gap] not drawn | same |
| focus rings | [gap] not drawn | same |
| transitions | none in scope (the only drawn one is ManaSection's chevron, 150ms, outside this table) | same |

## 13. Must-nots (all states)

| Rule |
|---|
| No `--warning`, `--success` or `--danger` on any figure (`--success` is the owned dot only; `--danger` the failure mark only; `--warning` the BuyTag only) |
| No color named, ranked or pointed at before the door is opened; the step's order is the only pointer |
| No row preselected, starred, tinted or weighted |
| No Apply / Add / Cut on help rows |
| No reason given on either none row |
| No price when `priceCents` is null |

---

## State coverage

| State | Frame(s) | Drawn at | What renders | Notes |
|---|---|---|---|---|
| Door closed, several colors | R3b F3, F3b, F2; R3a N1 / N1b | 900, 390 | §1, `door.lead`, button | button full-width on phone |
| Door closed, one color | R3a N4 / N4b | 900, 390 | §1, `door.leadOne`, button | |
| Colorless | R3a N5 / N5b; R3 M6 | 900, 390 | no door; `thin.colorless` | |
| Step open, ranked rows | R3b F2b; R3a N3 | 390 (R3b), 900 + 390 (R3a) | §3, §4 | none checked; button hidden |
| Step, pipless color | R3a N3b (Aang black) | 390 / 900 per R3a | §4 noPips row last | |
| Step, noPublished color | — | — | [gap] | |
| Step, Needs disclosure open | R3a N3 | per R3a | §3 open panel | R3b draws closed only |
| Step closed by ✕ | — | — | back to §1 | [gap] focus target |
| One color, press | R3a N4 → R3 M5 shape | — | §5 directly, no step | |
| Result, swaps present | R3 M5b / M5c (Aang blue) | 900, 390 | §6 swap rows | |
| Result, no swap | R3b F1 / F1b; R3 M4b | 900, 390 | §6 none row + ⓘ | |
| Tooltip open | R3 M5b | 900 | §6 tooltip, ring `--accent` | phone open state not drawn |
| Staple, owned | R3b F1 | 900, 390 | §8 owned dot + `help.owned` | |
| Staple, to buy with price | R3b F1 (Lotus Cobra) | 900, 390 | §8 BuyTag + Mana Pool link | |
| Staple, to buy, price null | R3b F1 (Utopia Sprawl) | 900, 390 | `to buy` only | [conflict] with table |
| Staple, with trade | R3b F1 | 900, 390 | §8 trade box | |
| Staple, no trade | R3b F1 (Utopia Sprawl) | 900, 390 | §8 no trade line | |
| No staples | R3 M8 / M8b | 900, 390 | §7 none row | |
| Help failed | R3 M9 | 390 | §9 | desktop not drawn |
| Change color | R3b F1 | 900, 390 | returns to §3 | |
| Land cell, balance | R1A A5 / A5b; table | 900, 390 | §11 caption | |
| Land cell, consider wins | table | — | `consider →` | strip's own rule |
| Land cell, colorless | table | — | dash | |
