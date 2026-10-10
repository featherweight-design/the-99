# Design Property Table — Tuning hub

**Commit to:** `docs/superpowers/design-tables/tuning-hub.md`, beside `deck-tuning.md`. Everything Suggested changes already ships stays in `deck-tuning.md`, `deck-tuning-addendum.md`, `deck-tuning-d2.md` and `never-cut-tuning.md`. This table adds only what is new.

**Sources:**
- `design/design_handoff_the99_tuning_hub/`: the three canvases are the authority on pixels; also `README.md` and `STATES-tuning-hub.md`.
- Tokens are the app's own, with no new token. Hexes are Kaldheim, as the canvases pin them.

**Breakpoint:** `md:` / 768px. Desktop frames are drawn at 900, phone at 390.

---

## TuningToolMark

| Property | Value |
|---|---|
| tools | `suggested` (swap) · `mana` (balance) · `cuts` (card cut) · `history` (ledger) |
| ruled set | geometric for `suggested`, `mana`, `history`; glyph (filled, 16 grid: `M4 1.5 H12 V5.2 L4 10 Z` + `M12 7.6 V14.5 H4 V12.4 Z`) for `cuts` |
| box | square, `size` px; geometry in % of the box |
| ink | `currentColor` only; no fill color of its own |
| ink by state | rest `--fg-body` · inert `--fg-locked` · running / active tab `--accent` |
| stroke | 1.5px under 18, 2px from 18, 2.5px from 28 |
| sizes in use | 20 tile and past-run heading · 14 tab, phone header, History row, filter chip · 16 in a 28px `--accent`-at-14% plate, radius 7 |
| a11y | `aria-hidden`; always beside the tool's name |
| build | inline SVG component, 24-unit viewBox |

## TuningHub — section

| Property | Mobile | Desktop |
|---|---|---|
| placement | last section of the Analysis tabpanel | same |
| border-top | `1px solid var(--border)` | same |
| padding-top | 16 | 16 |
| heading | `Tuning`, display font, 17, `--fg` | 19 |
| heading → body gap | 12 | 12 |
| mount | with the reading; absent before one | same |
| view state | `openTool: null \| tool`, reset on tabpanel unmount | same |

## ToolTile

| Property | Mobile | Desktop |
|---|---|---|
| layout | stacked, gap 8 | grid `repeat(2, minmax(0,1fr))`, gap 10 |
| background | `var(--surface)` | same |
| border | `1px solid var(--border)` | same |
| border-radius | 10 | 10 |
| padding | `12px 14px` | `14px 16px` |
| min-height | 44 (content-driven, ≥ 64 in practice) | 112 |
| name | 14 / 600 `--fg` | same |
| chevron | `›` mono 14 `--fg-faint` | same |
| purpose | 12.5 / 1.5 `--fg-body` | same |
| cost tag | mono 10.5 `--fg-faint`, `1px solid --border-strong`, radius 999, `1px 8px` | same |
| status | mono 10.5 `--fg-faint`; offer figure `--warning` | same |
| element | `<button>` whose name is tool + status | same |

### ToolTile — running

| Property | Mobile | Desktop |
|---|---|---|
| border | `1px solid var(--accent)` | same |
| dot | 6 × 6, `--accent`, `anim-dots` (reduced motion: still) | same |
| status ink | `--accent` | same |
| status text | tool's live-region words · elapsed `m:ss` | same |

### ToolTile — inert (Proposed cuts, ≤ 100)

| Property | Mobile | Desktop |
|---|---|---|
| background | transparent | same |
| border | `1px dashed var(--border-dashed)` | same |
| name / purpose ink | `--fg-faint` | same |
| chevron / cost / status | absent | absent |
| element | `<div>`, not focusable | same |

## Tool switch

| Property | Mobile | Desktop |
|---|---|---|
| form | `‹ Tuning` back, 44 tall, 13 / 500 `--fg-muted` | underline tab row (`role=tablist`) |
| tabs | — | All tools · Suggested changes · Mana Balance · Proposed cuts · History |
| tab font | — | 13; active 600 `--fg`, rest 500 `--fg-muted` |
| tab gap | — | 22 |
| tab padding | — | `4px 0 10px` |
| active rule | — | `2px solid var(--accent)`, overlapping the row's `1px --border` bottom |
| running mark | — | 6px `--accent` dot after the label |

## Trim line link (spine, Your deck)

| Property | Mobile | Desktop |
|---|---|---|
| text | `Proposed cuts →` | same |
| font | mono 11.5 `--accent` | same |
| placement | own line under the trim sentence, centered, 44 tall | inline after the sentence, gap 10 |
| underline | none | `1px solid --accent-dim` bottom border |
| condition | `total > 100`, commanders included (= `built > bodySize`) | same |

## Land cell — balance mana

| Property | Mobile | Desktop |
|---|---|---|
| caption | `balance →`, mono 9 `--accent` | `balance mana →`, mono 10 `--accent` |
| condition | Mana Balance tier 1 finds any color short | same |
| precedence | replaces `consider →`; one action per cell | same |
| border | `--border-strong` (as the shipped interactive cell) | same |
| action | switch to Analysis, open Mana Balance, scroll Tuning heading to top, focus tool heading | same |

## Mana Balance — DeeperBand (offer)

> **Superseded in part (Mana Balance feedback).** There is no separate cost tag. The cost is a segment inside the button: `[ Look deeper │ ◆ 1 credit ]`. The segment is mono 10.5 / 500 with a `1px` left rule in the button's border color, `0 12px` padding, and a 7px rotated-square `◆` in `currentColor`. The label half is `0 14px`, and the whole button is one control (`aria-label` "Look deeper. Uses 1 credit."). When spent, the segment is absent, the button takes `--fg-locked` on `--border-strong`, and the standing line reads `0 of 3 credits left · next one at {time}. Suggestions, overviews and deeper looks share these credits.` `Try again` after a failure carries the same segment. The same band is used on Proposed cuts (C2, C8, C9).

| Property | Mobile | Desktop |
|---|---|---|
| background / border | `--surface` / `1px solid --border` | same |
| radius / padding | 10 / `12px 14px` | same |
| layout | column, stretch | row, center, gap 12 |
| title | 13.5 / 600 `--fg` | same |
| lead | 12.5 / 1.5 `--fg-body` | same |
| cost tag | mono 10.5 `--fg-faint`, `1px solid --border-strong`, radius 999, `2px 9px` | same |
| button | brass outline, 13 / 600, radius 8, 44 tall, flex 1 | 36 tall, padding `0 16px` |
| credit line | mono 10.5 `--fg-faint`, `creditsCopy.first` | same |
| spent | tag `0 left` `--warning`; button `--fg-locked` on `--border-strong`; `creditsCopy.spent(…, deeperLooks)` | same |

### DeeperBand — running / note
- **Running:** border `1px solid var(--accent)`, `aria-busy`. The title has a 6px accent dot. Stop is a neutral ghost in the button's slot.
- **Refused:** `--border-strong`, an 18px `i` disc in `--fg-faint`, a 12.5 `--fg-body` sentence, and `Look deeper` stays.
- **Failed:** the `Didn't finish` tag (the failure tag spec in `deck-tuning.md`), the sentence, and `Try again` in the button's slot.

## DeeperResult

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface`, `1px solid --border-strong`, radius 10, padding 14 | same |
| header | `Deeper look` 13.5 / 600 + `done` tag (mono 9.5 uppercase `--success` on 12%) + mono 10.5 read line | same |
| item separator | `1px solid --border` top, padding-top 12 | same |
| item text | 12.5 / 1.55; ink per KindTag | same |
| chips | shipped citation chip, indented 96 under the tag | same |
| foot | mono 10.5 `--fg-faint`, `1 credit used · {standing}` | same |
| divider below | mono 10 uppercase `The count, unchanged` + 1px `--border` rule | same |

## KindTag

| Kind | Border | Ink | Text ink |
|---|---|---|---|
| Checked | `1px solid --border-strong` | `--fg-body` | `--fg-body` |
| Unchecked | `1px dashed --border-dashed` | `--fg-faint` | `--fg-muted` |
| Suggestion | `1px solid --accent-dim` | `--accent` | `--fg-body` |
| all | width 86, radius 999, padding `2px 0`, mono 9.5 / 0.12em uppercase, centered | | |

## CountedStrip (tier 1)

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface-sunken`, `1px solid --border`, radius 7, `7px 9px`, flex, gap 8 | same |
| tag | `counted`, mono 9 / 0.12em uppercase `--fg-body`, `1px solid --border-strong`, radius 999, `1px 7px` | same |
| text | mono 10.5 / 1.55 `--fg-muted`: current, target, after | same |

## ManaSourceTable

| Property | Mobile | Desktop |
|---|---|---|
| columns | `1fr auto auto`; bar spans the full second row | `120px 90px 1fr 110px`, gap 14 |
| head row | — | mono 9.5 / 0.12em uppercase `--fg-locked` |
| row | padding `10px 2px`, `1px solid --border` bottom | same |
| pip | 18 disc in the color token (`--w --u --b --r --g`), mono 10 / 600 | same |
| bar | 8 tall, radius 999, `--elevated` track | same |
| land segment | solid color token | same |
| other segment | `repeating-linear-gradient(135deg, color 0 2px, transparent 2px 4px)` | same |
| covers tick | 2 × 14, `--fg`, at covers / scale | same |
| figure | mono 10.5: `{have}` 600 `--fg` + ` of {covers} · {mix}` `--fg-faint` | same |
| status | mono 11; `covered` `--fg-faint`, `short N` `--warning` | same |
| below | legend line, dork caveat (`--fg-muted`), not-counted line (dashed box) | same |

## BalanceSuggestion

| Property | Mobile | Desktop |
|---|---|---|
| card | Suggested changes' card: `--surface`, `1px --border`, radius 10 / 9, padding `13px 12px` / `10px 12px`, gap 11 / 8 | |
| kind line | mono 9.5 / 0.12em uppercase `--fg-locked` | same |
| pair | column (cut over add) | one row, gap 9 |
| staple glyph | `+` mono 15 / 600 `--accent`, in the arrow's slot; no cut side | same |
| staple thumbnail | `1px dashed --border-dashed` | same |
| staple dot | 7, transparent, `1px dashed --fg-faint` | same |
| unowned | shipped `BuyTag` row variant | same |
| actions | `Apply` / `Add` brass outline + `Reject`, two 44 halves | 32 tall, inline, then mono 10 after line |
| answered | shipped `AnsweredRow` tones | same |

## Proposed cuts (R2, model-first): the count and the result

Replaces R1's CutRow and "shortlist size" tables (rank number, `Rank again`, overage + 2, `Show N more`, the tier-2 band over a shortlist). Source: `(R2) · C Proposed cuts and History.dc.html`, C1 to C9, built in `src/components/decks/cuts-panel.tsx`. Mounted on the Analysis tab after Suggested changes until the hub landing ships. Tokens are the app's own.

### Panel

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface-sunken`, `1px --border`, radius 11, padding `16 14` | radius 12, padding `18 20`, 24 above |
| heading | `Proposed cuts`, display 17 / 600 `--fg`; sub `free count · look deeper 1 credit` mono 10.5 `--fg-faint` on its own line | display 19; sub beside it |
| lead | 13 / 1.5 `--fg-body`; the over figure bold in `--fg`, never `--warning` | same |
| count rows | `Six over the ninety-nine.` then `Below is what we counted. To have the cards named, look deeper.` | same |

### Look deeper band (C1, C5, C6, C7)

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface`, `1px --border` (`--accent` while running), radius 10, padding 14 | padding `14 16` |
| title | 14 / 600 `--fg`, `Name the six cuts` | same |
| lead | 12.5 `--fg-body`, one sentence naming what it reads; thin EDHREC swaps in the sentence that names the gap | same |
| button | the hub's one filled button: `--accent` fill, `--bg` ink, 44 tall full width, radius 8; `Look deeper` then a segment after a rule `color-mix(in srgb, var(--bg) 35%, transparent)` holding `◆ 1 credit` | 38 tall, auto width |
| spent / paused | disabled at half opacity, no segment, the standing line says why | same |
| standing line | mono 10.5 `--fg-faint` under the button: `2 of 3 left · reset at 4:10 PM` (the shared credits line) | same |
| running (C2) | `--accent` border, `Looking deeper…`, mono read line with the elapsed clock and `stopping gives the credit back`, `Stop` neutral outline | Stop beside the text |
| refused (C6) | neutral sentence, never `--danger`, the offer stays | same |
| failed (C7) | 16 `!` disc in `--danger` beside the heading (`aria-label` `Didn’t finish`), one sentence, `Try again` outline with the credit segment | same |
| all locked (C6c) | neutral sentence, no offer | same |

### What we counted (C1, C5)

| Property | Mobile | Desktop |
|---|---|---|
| head | `What we counted` 13.5 / 600 `--fg`; mono 10.5 read line `from 105 cards · EDHREC for Gishath, 2,140 decks · bracket 3, as declared · free` | beside it |
| row | grid `64 / 1fr / auto`; source tag mono 9.5 uppercase `--fg-locked`, label 13 `--fg`, figure mono 13 / 600 `--fg` right, the comparison under the label in mono 11 `--fg-muted` | grid `84 / 1fr / auto / 220`, the comparison in its own column |
| role rows | only a role over its target: `rec 10 · 4 over` | same |
| curve rows | the fullest slot (`the fullest slot`) and, when it is not the top slot, `Cost 7 or more` with `of 105` | same |
| bracket rows | only against a DECLARED bracket, only a flag it does not allow: `bracket 3 allows 3`; none with no declaration | same |
| EDHREC row | `In under 10% of Gishath decks` with `your median card 38%`; thin or absent list: a dashed `--border-dashed` row, no figure | same |
| foot | mono 10.5 `--fg-faint`: `Never named: Gishath, the 4 cards you locked and the 6 Key cards.` | same |
| divider | with a result on screen: `THE COUNT`, or `The count, as the list is now` once anything is answered; mono 10 caps `--fg-faint`, rule after | same |

### Result lines (C3, C4, C9)

| Property | Mobile | Desktop |
|---|---|---|
| block | `--surface`, `1px --border`, radius 10, padding `14 12`; head `Six to cut` 14 / 600 plus the mono read line | padding `14 14` |
| line | `--surface-sunken`, `1px --border`, radius 9, padding `11 12`, column, gap 9 | name row and buttons on one line |
| tag | `Suggestion`, 86 wide, pill, mono 9 caps `--accent`, `1px --accent-dim`; never Checked or Unchecked | same |
| card | 22 × 31 thumb and a name 13 / 600 `--fg`, dotted `--accent` underline, opens the card | same |
| sentence | 12.5 `--fg-body`, the model's one sentence after the validator | indented 96 under the tag |
| chips | one per cite, built from the evidence pack and not the visible count rows: `ROLE ramp 14 · rec 10`, `EDHREC 14% · median 38%`, `CURVE 9 cost 7 or more`, `BRACKET Game Changers 4 · bracket 3 allows 3`, `YOU SAID` plus the quoted words (or `your description` when the sentence quotes none). Mono 9.5, label `--fg-locked` caps, value `--fg-muted` | same |
| actions | `Cut` `--accent` outline + `Keep` neutral, two 44 halves | 32 tall, auto |
| cut | answered row, `--success` border, `✓`, label `cut`, name struck, `Undo` | same |
| kept | answered row, label `kept`, `Show it again` | same |
| shortfall (C4) | one dashed slot per missing line: `A sixth wasn’t named` and `it cited a figure the count doesn’t have · left out, not replaced`; never padded, no second call | same |
| foot | mono 10.5 `--fg-faint`: `5 of 6 named · each figure checked against the count` and the credits line | same |
| re-offer | cuts pressed from a result keep it current (the run’s fingerprint follows them); any other edit retires it and the offer returns | same |
| back to 99 (C8) | finishes in place: `Back to 99 / 99. You cut 2.` then `The deck isn’t over any more, so Proposed cuts closes here.` | same |
| Cut | writes to the list at once and re-checks locks under the deck lock: a locked or missing card is refused on its own row | same |


## Failure mark (replaces the failure tag across the hub)

| Property | Value |
|---|---|
| glyph | 16-grid filled disc with `!` cut out (evenodd): `M8 1.2 A6.8 6.8 0 1 0 8 14.8 A6.8 6.8 0 1 0 8 1.2 Z M7.05 4 H8.95 L8.6 9.3 H7.4 Z M8 10.5 A1.15 1.15 0 1 0 8 12.8 A1.15 1.15 0 1 0 8 10.5 Z` |
| size | 18 beside a heading or a sentence; 13 in a History outcome |
| ink | `--danger`, the only `--danger` on the panel |
| a11y | `role=img`, `aria-label` = the old tag text (`Didn't finish`, `Couldn't count`, `Couldn't rank`, `Couldn't load`) |
| layout | flex row, `align-items:flex-start`, gap 10, no wrap; the heading is `flex:1; min-width:0`, so the mark stays beside it at 390 |

## Suggestions — Additions and Cuts (Mana Balance and Suggested changes)

| Property | Mobile | Desktop |
|---|---|---|
| section head | mono 10 / 0.14em uppercase `--fg-faint` label, 1px `--border` rule, tally, `Apply all` | same, one row, wraps |
| tally | mono 10.5 `--fg-faint`: `+{in} in · −{out} out · stays at {n}` / `the deck goes to {n}`; never `--warning` | same |
| over-100 link | `TuningToolMark cuts` 14 + `Proposed cuts →`, mono 10.5 `--accent`, after the tally | same |
| Apply all | brass outline, 12.5 / 600, radius 7, 44 tall; `Apply the rest` once anything is answered | 32 tall |
| list heading | `Additions` / `Cuts` 12.5 / 600 `--fg` + mono 10.5 `--fg-faint` count | same |
| line | `--surface`, `1px --border`, radius 10, padding 12, gap 10 | radius 9, `10px 12px`, gap 7 |
| glyph | `+` mono 14 / 600 `--accent` (addition) · `−` `--fg-faint` (cut), width 12 | same |
| name | addition 13 / 600 `--fg`; cut 13 / 400 `--fg-body`, struck in `--fg-locked`; both dotted `--accent` underline | same |
| not in deck | dashed thumbnail + dashed 7px dot; shipped `BuyTag` when unowned | same |
| reason | Mana Balance: `CountedStrip`. Suggested changes: 12.5 / 1.55 `--fg-body` sentence + shipped citation chips | same |
| actions | `Add` / `Cut` brass outline + `Reject` neutral, two 44 halves under the reason | inline at the row's end, 32 tall |
| answered | added / cut: `--surface`, `1px --success`, ✓ box + mono label, `Undo` · rejected: `--surface-sunken`, `1px --border`, `Show it again` | same |
| list gap | 10 | 6 |

## HistoryRow

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface`, `1px --border` (`--accent` running), radius 9 | same |
| padding | `11px 12px` | `9px 12px` |
| grid | row 1: tool · date · outcome; row 2: summary; tier beside outcome | `110px 92px 1fr 64px 76px`, gap 12 |
| min-height | 60 | 44 |
| date | mono 11 `--fg-faint` | same |
| tool | `TuningToolMark` 14 + short name 12 / 500 `--fg-body`, gap 7, width 96 | width 104 |
| summary | 12.5 / 1.45 `--fg-body` | same |
| tier | `free`: mono 10 `--fg-faint`, no plate · `◆ 1 credit`: `--fg-body`, 6px diamond, no plate · `◆ deeper look`: `--accent` on `--accent` at 12%, `1px --accent-dim`, radius 999, `1px 8px` | same |
| tier placement | own full-width line under the summary | its own 108px column |
| date | nowrap | nowrap |
| scroll | list in a `role=region` container, max-height 460, `overscroll-behavior:contain`, 28px foot fade, month headings `position:sticky` on `--surface-sunken` | max-height 420 |
| filter row | one row, `overflow-x:auto`, scrollbar hidden, bleeds 14px past the panel's right edge, 32px right fade | wraps |
| outcome | mono 9.5 uppercase, radius 999, `2px 8px`: ok `--fg-faint`; refused / stopped on `--elevated`; failed `--danger` on 12%; running `--accent` on 14% | same |
| month heading | mono 10 / 0.14em uppercase `--fg-faint` | same |
| filter chips | single select, 44 tall, one scrolling row | 30 tall, wrap |
| page size | 20 | 20 |

## PastRun (History, opened)

| Property | Mobile | Desktop |
|---|---|---|
| back | `‹ History` in the back slot | 12.5 / 500 `--fg-muted` above the heading |
| heading | tool name, display 17 | 19 |
| meta | mono 10.5 `--fg-faint`: date · version · tier | same |
| read-only note | `1px dashed --border-dashed`, radius 9, `9px 12px`, 12.5 `--fg-faint` | same |
| rows | `AnsweredRow` tones, plus `left open` (sunken, dashed border, `--fg-faint`) | same |
| write controls | none | none |
