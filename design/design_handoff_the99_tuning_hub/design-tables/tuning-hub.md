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
| condition | **R3:** the deck has a colored pip (state `ok` or `noSources`) and the land count is not under its target with a shelf. Was: tier 1 finds any color short (superseded, no verdict) | same |
| precedence | land count under target with a shelf → `consider →`; else colored pip → `balance mana →`; else dash. One action per cell | same |
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

> **Superseded by R3 (Hugh, 2026-10-10: no verdicts).** The Status column, the covers tick and `have of covers` are withdrawn. Build `ManaEvidenceTable` (end of this file) instead.

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

> **Superseded by R3.** Nothing is suggested on open; help is asked for, per color, and its rows are information (`HelpResult`, end of this file).

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

## CutRow (Proposed cuts)

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface`, `1px --border`, radius 10, padding 12, column, gap 10 | radius 9, `8px 12px`, row, center, gap 12 |
| rank | mono 10.5 `--fg-locked`, width 16, right | same |
| thumbnail | 22 × 31, as the cut thumbnail | same |
| name | 13 / 600 `--fg`, dotted `--accent` underline (opens card) | same |
| reason | one shipped citation chip; sources `edhrec · role · curve · bracket` | same |
| actions | `Cut` brass outline + `Keep` neutral, two 44 halves | 32 tall |
| cut | `AnsweredRow` applied tone, label `cut`, name struck, `Undo` | same |
| kept | `AnsweredRow` rejected tone, label `kept`, `Show it again` | same |
| list gap | 10 | 8 |
| page | 5 shown, then `Show N more` | same |
| foot | mono 10.5 `--fg-faint` never-cut line | same |
| action row | `Rank again` brass outline once anything is answered; mono tally | same |

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

## Proposed cuts — shortlist size

| Property | Value |
|---|---|
| candidates | overage + 2 (six over → eight), set when ranked; never shrinks as cards are cut |
| shown | 5, then `Show {n} more` |
| tier 2 | Look deeper band above (C2). Running (C8): the shortlist stays live. Done (C9): a deeper block above, one line per named candidate (`cut it first` / `keep it`), kind tag + citations; the shortlist stays unchanged below |

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


---

# R3 · Mana Balance, evidence (2026-10-10)

Source: `docs/superpowers/design-briefs/2026-10-10-mana-balance-evidence.md`. Frames: `… (R3) · B Mana Balance, evidence.dc.html`. No new tokens. **No component on this screen takes `--warning`, `--success` or `--danger` on a figure.** The one `--danger` is the failure mark (B8, M9b).

## ManaEvidenceTable

| Property | Mobile | Desktop |
|---|---|---|
| rows | colors with a pip or a source, W U B R G (the Colors card's filter and order) | same |
| columns | two: name + Karsten on row 1, pips + sources on row 2; mono 9 `--fg-locked` cell labels | `104px minmax(0,1fr) minmax(0,1fr) 156px`, gap 16; head mono 9.5 / 0.12em uppercase `--fg-locked`: COLOR · PIPS · SOURCES · KARSTEN, HARDEST CARD |
| row | padding `11px 2px`, `1px solid --border` bottom | same |
| color | 18 pip disc (`--w --u --b --r --g`, mono 10 / 600) + name 13 `--fg` | same |
| pips | Colors card bar (14 tall, radius 3, width = share / widest × 60%) + mono 11 `{n} · {share}%` `--fg-body`; under it mono 10 `--fg-faint` `{n} without {commander}` (only when it differs) | same |
| sources | Colors card `SourceBar` (solid lands, striped other) + mono 11 `{n} · {share}%`; under it mono 10 `--fg-faint` `{lands} lands · {other} other` | same |
| shares | the Colors card's: of all pips, and of all sources **including colorless** | same |
| Karsten | mono 13 / 500 `--fg` `karstenHardest`; under it mono 10 `--fg-faint` `to cast {card} ({code})`. None published: `—` + `no pips to cast` | same |
| Karsten note | under the table, `--surface`, `1px --border`, radius 9, `11px 13px`; mono 9.5 uppercase `--fg-muted` `Reading the Karsten figure` + 12.5 / 1.6 `--fg-body`: what it counts, the lead color's hardest card and figure, how to read it beside Sources. Absent when colorless | same |
| zero | `0` in `--fg-locked`, no bar | same |
| ink | every figure `--fg` / `--fg-body`; nothing is tinted by comparison | same |

## PatternRows (Hardest costs)

| Property | Mobile | Desktop |
|---|---|---|
| heading | `Hardest costs` 13.5 / 600 `--fg-body` + mono 10.5 `--fg-faint` `Karsten, 99-card column` | same |
| color chips | one per color with a pip (absent for one color); single select, 44 tall, scroll sideways | 30 tall, wrap; default = most pips |
| row grid | `auto minmax(0,1fr) auto`; names on row 2, full width | `72px minmax(0,1fr) 140px`, gap 14 |
| code | mono 13 / 600 `--fg`; copies mono 10 `--fg-faint` (`×3`) | same |
| names | 12.5 / 1.5 `--fg-body`, dotted `--accent` underline (opens card detail), comma-separated; `×2` after a name with two copies; commander tagged mono 9 uppercase `commander` on `1px --border-strong` | same |
| long list | 3 names, then `+{n} more` mono 11 `--accent` (44 tall on phone), expands in place | same |
| Karsten | right-aligned mono 13 `--fg`: `28` · `at most 26` (mono 11 `--fg-body` `at most` + 13 figure) · `no published figure` mono 11 `--fg-muted` | same |
| count | at most 6 per color (`PATTERNS_SHOWN`), hardest first; foot mono 10.5 `--fg-faint` | same |

## LandFacts

| Property | Mobile | Desktop |
|---|---|---|
| layout | fact rows, Proposed cuts' `What we counted` grid: label + mono figure + mono comparison | same |
| rows | Lands · Enter tapped · Tapped unless a condition holds · Fetch a land that enters tapped · Average mana value · Karsten's land count | same |
| tapped rows | open to the land names (Jobs card pattern, `›` / `⌃`) | same |
| land count | figure to one decimal, unrounded; comparison is the formula with the deck's inputs | same |
| caveat | 12 / 1.5 `--fg-muted`, always shown, never behind ⓘ: cheap ramp counts sources of MV 3 or less, draw spells aren't counted | same |
| colorless | one row: `{C} pips` and colorless sources | same |

## HelpPicker

| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface`, `1px --border`, radius 10, padding 14 | same |
| title / lead | 13.5 / 600 `--fg` · 12.5 / 1.5 `--fg-body` | same |
| chips | one per color in the commander's identity, W U B R G; pip disc 14 + name; `<button aria-pressed>`; 44 tall, flex 1, wrap | 32 tall |
| pressed | `--fg-body` fill, `--bg` ink (the History filter's selected chip) | same |
| absent | colors outside the identity are not drawn, not disabled | same |
| none | colorless identity: no picker. No meta line under the chips | same |
| outside the colors | no state: the picker can't ask for one | same |

## HelpResult

| Property | Mobile | Desktop |
|---|---|---|
| container | under the picker, `border-top 1px --border`, padding-top 12, gap 12 | same |
| head | `Help adding {color}` 13.5 / 600 + mono 10.5 `--fg-faint` `{n} {color} sources now` | same |
| section heads | mono 10 / 0.14em uppercase `--fg-faint` + 1px rule (`Swap basics`, `Staples {commander} decks run · owned first`) | same |
| swap row | `--surface-sunken`, `1px --border`, radius 9, `10px 12px`; `Up to {n} {Basic}s → {Basic}s` 13 `--fg`; changes mono 10.5 `--fg-muted`, picked color first, `{color} {before} → {after}` | same |
| staple row | thumbnail 22 × 31 (dashed when not in the collection), name 13 / 600 dotted `--accent`, ownership: 7px `--success` dot + mono 10.5 `owned · {n} free`, or dashed dot + `to buy` + shipped BuyTag + `↗` (`manapoolCardUrl`); price absent when `priceCents` is null | same |
| staple fact | mono 10.5 `--fg-faint`: how often, labelled by its kind (`in {p}% of {commander} decks` · `of this pairing's decks` · `{bucket} average`), then `adds` + 10px pip discs | same |
| trade line | the R1 `CountedStrip` shape, tag `trade`: `1 {Card} for it: {changes}` (a basic, a land making none of the deck's colors, or a cut the deck's tuning named; 2026-10-12); else mono 10.5 `--fg-faint` `no trade for it` | same |
| none rows | `1px dashed --border-dashed`, radius 9, 12.5 `--fg-faint`; no reason given | same |
| how moves are picked | 18px ⓘ after the Swap basics head, tooltip on `--elevated` | same |
| actions | **none** (open 3: information only this round) | same |

## KarstenCitation

| Property | Value |
|---|---|
| by name | `Karsten` heads every column, row and caption that carries one of his figures |
| in full | once, the panel's last line: 12 / 1.6 `--fg-muted`, `border-top 1px --border`, padding-top 12; the article title in quotes, `TCGplayer` + 14px link-out glyph (stroke 1.6) as the link (`--accent`, 500) |
| land count | the same line names it his Commander formula, constants as quoted in secondary write-ups |
| reference | the line says his figures are a reference point, not a target |


---

# R3a · Needed, one door (2026-10-11; Ruling 1 revised: no lead line)
Frames: `… (R3a) · B Mana Balance, pointer.dc.html`. No new tokens; no `--warning` / `--danger` / `--success` on any figure below.

## NeedsExplainer (Design: inline, not an InfoTip; the shipped `StripRationale` disclosure)
| Property | Value |
|---|---|
| shape | `src/components/decks/strip-rationale.tsx`, the role strip's "Why these numbers?": one tree for both states, focus returned to the trigger on Hide |
| closed | own row; mono 11 `--accent`, `border-bottom 1px --accent-dim` (accent-shadow), pb 1; 44 tall hit area on phone |
| open | `--surface-sunken`, `1px --border`, `border-left 3px --accent`, radius 9, `11px 13px`, gap 7; header row: the trigger (mono 11 `--accent`, no rule) + `Hide` (mono 11 `--fg-faint`) |
| lines | 12 / 1.55 `--fg-body`, bold lead-in 600 `--fg`: **Needs** Hugh's sentence · **Source** Karsten's article title, `TCGplayer` + 14px link-out, "A reference point for reading the count, not a target." |
| place | under the Hardest costs heading, and in the color step under its order line |

## PatternRows (R3a changes)
| Property | Mobile | Desktop |
|---|---|---|
| figure | mono 12 `--fg`: `You have N · Needs N` · `You have N · Needs at most N` · `No published figure` (`--fg-muted`) | column 200px |
| head | — | `Needed` (was `Karsten · 99 cards`) |
| sub | `six hardest per color` (Karsten dropped) | same |

## ManaEvidenceTable (R3a changes)
| Property | Value |
|---|---|
| column | `Needed` (was `Karsten · hardest card`); figure = the color's tightest cost shared by 2+ cards, the step's ordering rule |
| Karsten note box | withdrawn |

## ImproveDoor
| Property | Mobile | Desktop |
|---|---|---|
| container | `--surface`, `1px --border`, radius 10, padding 14 (R3 HelpPicker's) | same |
| title / lead | `Improve my mana` 13.5 / 600 · 12.5 / 1.5 `--fg-body` | same |
| button | full width, 44, `1px --accent`, `--accent` ink 13 / 600, `aria-expanded` | right, 32 |
| one color | opens the color's help directly | same |
| colorless | absent | same |

## ColorStep
| Property | Mobile | Desktop |
|---|---|---|
| head | mono 10 uppercase `--fg-faint` `Which color?` + ✕ (44) | ✕ 28 |
| rows | `role=radio`, none checked; 56 tall, two lines (name / cost), Have · Needs right | 44 tall, one line: radio · name 120 · cost · Have · Needs |
| row style | `--surface-sunken`, `1px --border-strong`, radius 9; identical for every row | same |
| order line | 12.5 / 1.55 `--fg-body`: how the list is ordered, `Pick any.` | same |
| order | lowest have/needs over patterns with ≥2 nonland cards (commander excluded) with a published figure; tie → W U B R G; pipless identity colors last, `N sources · no pips` in `--fg-muted` | same |
| pick | runs HelpResult (R3) for that color; the step closes into it | same |


---

# R3b · Mana Balance, full view (2026-10-11, LGTM). Build target: F3.

## Order, top to bottom
title + sub → lead sentence → ManaEvidenceTable (Needed) → NeedsExplainer → ManaSection "Hardest costs" (PatternRows) → ManaSection "Lands" (LandFacts) → ImproveDoor (ColorStep → HelpResult) → KarstenCitation. Panel gap 18.

## ManaSection (Consider's `ShelfSection` header, `consider-panel.tsx`)
| Property | Mobile | Desktop |
|---|---|---|
| rule | `border-top 1px --border-strong` | same |
| trigger | the whole header row, `aria-expanded`, `aria-controls` only while the body is mounted | same |
| row | min-height 52, gap 8; label and clause stacked (column, gap-y 2) | min-height 44, gap 10; one row, baseline, gap-x 10 |
| chevron | `▸` `--fg-muted`, rotate 90° when open (150ms transform) | same |
| label | sans 600 16 / 1.2 `--fg` | 17 |
| clause | mono 10.5 `--fg-muted` | 11 |
| clauses | Hardest costs: `six per color · {colors with a pip, W U B R G}` · Lands: `{n} lands · {n} can enter tapped · Karsten’s count {x}` | same |
| body | mounted only when open; mt 9 | mt 11 |
| default | folded; state persisted per deck | same |
| clause must not | name, rank or order colors by comparison | same |

## ColorStep (R3b)
| Property | Value |
|---|---|
| order line | "Listed by how close each color’s sources are to what its tightest cost needs, counting costs two or more cards share. Pick any." |
| result head | the color + `You have N · Needs N` + `Change color` (mono 11 `--accent`, returns to the step) |
