# PROPERTY — What this deck is (the stats block)

Property tables for `DeckStatsBlock` (deck page) and `DeckStatsRollup` (Home), both widths.
Breakpoint is **768px (`md`)**, matching the shipped header, the mix strip and the tabs.
Every colour is a `var(--*)` token from the 37-key contract; **this document mints none.**

> **R3 (`The 99 - Deck Stats (R3).dc.html`) is the current drawing** and supersedes the R2 geometry
> noted below: the curve is a **unit tally** (one square per card), the colour spread is **six
> leader lines on one ruler** with counts at the right, the sections are **ruled heads** carrying
> their own denominators, and **no percentage is printed anywhere**. The data contract, both
> denominators and every absence string are unchanged — see §R3 in `README.md`.

> **R2 superseded the geometry below where they differ** (`The 99 - Deck Stats (R2).dc.html`):
> the block is three bands (~470px desktop), the curve is an axis'd chart with counts inside the
> bars, the colours are six cards with the share printed in a 22px track, and a colour at 0 dims
> the card to `0.44`. **Every property in the data contract, every denominator rule and every
> absence string is unchanged** — see §R2 in `README.md` for the two amended rulings.

---

## 1. The data contract

Everything the block reads, and nothing it may derive.

| Property | Source | Type | Null? | Drawn by | Denominator |
|---|---|---|---|---|---|
| `record.wins` | `stats.ts:35` `playRecord` / `:51` `recordFromCounts` | `number` | no | Record figure, term 1 | — |
| `record.losses` | same | `number` | no | Record figure, term 2 | — |
| `record.draws` | same | `number` | no | Record figure, term 3 — **printed even at 0** | — |
| `record.played` | same | `number` | no | Record caption `N games logged`; `0` switches the cell to absent | — |
| `colours.W…G` | `stats.ts:121` `colourSpread` | `number` | no | five colour rows: bar width + count | `colours.copies` |
| `colours.colourless` | same | `number` | no | sixth colour row, label `C` — **never omitted** | `colours.copies` |
| `colours.copies` | same | `number` | no (**≥ 1 always**) | Colours caption `of N cards` | is the denominator |
| `curve.buckets[0…7]` | `stats.ts:190` `manaCurve` | `CurveBucket[8]` | no, **always all eight in order** | eight columns; `copies === 0` → baseline, no figure | tallest bucket (height) |
| `curve.copies` | same | `number` | no | Curve caption `N cast`; `0` switches the cell to absent | — |
| `curve.average` | same | `number \| null` | **yes** | `avg N.N` — **rounded to one decimal**; null → `avg —` | `curve.copies` |
| `curve.lands` | same | `number` | no | Curve caption `N lands, excluded` | — |
| `cost` | `stats-query.ts:37` via `shopping-rollup.ts` | `DeckShopping \| null` | **yes** | To buy cell; null → absent | — |
| `cost.copies` | same | `number` | no when `cost` | To buy figure | — |
| `cost.cents` | same | `number` | no when `cost` | `$N.NN`; **`0` drops the line entirely** | — |
| `cost.pricedCopies` | same | `number` | no when `cost` | `N of M priced`; `0` → `provenanceUnpriced`; `=== copies` → the deficit clause instead | `cost.copies` |

**Forbidden derivations.** Do not sum the six colour figures to get a denominator. Do not use `99`
as any denominator. Do not use `colours.copies` in the curve cell or `curve.copies` in the colour
cell. Do not default `cost` to a zeroed object. Do not print `curve.average` unrounded.

**Roll-up.** Identical property names, produced by `sumPlayRecords(...)` and
`sumColourSpreads(...)` over `loadDeckStats({ userId }).values()`, plus one scalar: `deckCount`
(`number`, ≥ 1), drawn as `across N decks`. **`curve` and `cost` are not read at this altitude.**

---

## 2. §Block container

| Property | Phone (< 768) | Desktop (≥ 768) |
|---|---|---|
| element | `<section aria-label="What this deck is">` | same |
| position | last child of the Deck panel, below the decklist | same |
| outer padding | `16px` / `14px` | `30px` / `20px 30px 22px` |
| top divider | `1px solid var(--border)` | same |
| eyebrow | mono 9px, `tracking .1em`, upper, `--fg-faint` | mono 11px, `tracking .12em`, upper, `--fg-body` |
| eyebrow gloss | absent | mono 10.5px `--fg-faint`, `four figures, measured against nothing` |
| eyebrow → panel | `10px` | `12px` |
| panel ground | `var(--surface-sunken)` | same |
| panel border | `1px solid var(--border)` | same |
| panel radius | `10px` | `11px` |
| panel padding | `12px 13px` | `16px 18px` |
| layout | flow: scalar pair, then two full-width rows | `grid-template-columns: 152px minmax(0,1fr) minmax(0,1.28fr) 176px` |
| cell divider | `border-top: 1px solid var(--border)`, `12px` above and below | `border-left: 1px solid var(--border)`, `18px` padding each side |
| figure order | Record · To buy · Colours · Curve | Record · Colours · Curve · To buy |
| height at rest | ≈ 326px | ≈ 148px |
| motion | none | none |

The eyebrow inks are the mix strip's own two values (`role-counter-strip.tsx`), so the two headings
sit in one register at each width. **The panel shell is the Games aggregate box verbatim.**

**Why phone reorders.** Pairing is decided by shape: a scalar beside a distribution wastes the
distribution's only asset, its width. The two scalars pair; each distribution takes a full row.
Glance before study.

---

## 3. §Cell — Record

| Property | Phone | Desktop |
|---|---|---|
| label | mono 9px, `tracking .06em`, upper, `--fg-faint` | mono 10px, `tracking .1em`, upper, `--fg-faint` |
| figure | mono 600, **19px**, `--fg`, `tabular-nums` | mono 600, **22px**, `--fg`, `tabular-nums` |
| figure form | `W–L–D`, en dashes, **all three terms always** | same |
| label → figure | `4px` | `6px` |
| caption | mono 9.5px `--fg-faint`, `N games logged` | mono 10px `--fg-faint`, same |
| gloss | absent | mono 9.5px `--fg-faint`, `wins–losses–draws`, `22px` below caption |
| **absent** (`played === 0`) | figure `—` `--fg-locked`; caption `no games logged` | same |
| forbidden | `0–0–0`; dropping `–0`; a log-a-game link; `--accent`; any `deriveHeadline` string | same |

`--accent` is refused here on purpose: it is one of the Games tab's four record inks, and it is
spent in this block on `To buy` alone.

---

## 4. §Cell — Colours

| Property | Phone | Desktop |
|---|---|---|
| label | mono 9px upper `--fg-faint` | mono 10px upper `--fg-faint` |
| label-row trailing | `of N cards`, mono 9px `--fg-faint` | `identity, not cost`, mono 9.5px `--fg-faint` |
| rows | 6, always, in order `W U B R G C` | same |
| row grid | `9px 11px minmax(0,1fr) 30px`, gap `8px` | same (`34px` count column at roll-up) |
| row height / gap | `11px` / `3px` | same |
| pip | `9×9`, radius `2px`, `inset 0 0 0 1px rgba(0,0,0,.4)` | same |
| pip fill | `--w --u --b --r --g`; colourless `--fg-muted` | same |
| letter | mono 9px `--fg-faint` | same |
| bar track | `5px`, radius `2px`, `var(--elevated)` | same |
| bar fill | the row's token, `width: figure / copies` | same |
| count | mono 10px, right, `tabular-nums`; `--fg-body` when > 0, `--fg-faint` at 0 | same |
| caption | mono 9px `--fg-faint`, `once per colour, so these add past N` | mono 9.5px, `of N cards · once per colour, so these add past N` |
| caption condition | **unconditional** | **unconditional** |
| **R3 · ruler** | ticks at `0 · 50 · 100`% of `copies`, labelled **in cards** | ticks at `0 · 25 · 50 · 75 · 100`%, labelled in cards; collapse to `0` and the denominator when quarters are not countable |
| **R3 · row** | pip + letter, leader dots full width, `5px` rule at `figure / copies`, count right-aligned | pip + letter + colour name, otherwise identical |
| **R3 · a colour at 0** | leader dots to the ruler's end, count column prints `—` at `--fg-locked`; **nothing dimmed** | same |
| **R3 · percentages** | **never printed, at either width** | same |
| absent | **cannot occur** — `commander_oracle_id` is `NOT NULL` and folds in at 1 copy | same |
| forbidden | a stacked bar; percentages; a denominator from the six figures; dimming a pip; omitting `C`; omitting a zero row | same |

The caption is unconditional even on a mono-colour deck where the figures do add up exactly.
Making it conditional teaches a reader that its absence means the figures sum to `copies` — a rule
they would then carry to the five-colour deck beside it.

---

## 5. §Cell — Curve

| Property | Phone | Desktop |
|---|---|---|
| label | mono 9px upper `--fg-faint` | mono 10px upper `--fg-faint` |
| average | mono 10.5px `--fg-body`, `tabular-nums`, trailing edge of label row | mono 11px, same |
| average form | `avg N.N` — **one decimal**; `null` → `avg —` `--fg-locked` | same |
| columns | 8, always, `repeat(8, minmax(0,1fr))` | same |
| column gap | `4px` | `6px` |
| track height | **44px** | **56px** |
| bar fill | `var(--fg-muted)`, radius `2px 2px 0 0` | same |
| **R3 · tally unit** | **`7×7px`** square, `2px` radius, `2px` gap, `--fg-muted` (tallest `--fg`) | **`10×10px`** square, `2px` radius, `3px` gap |
| **R3 · tally column** | `1fr` of 8, unit **centred** (`align-items:center` — a unit with no width stretches to the track and the tally becomes a striped bar) | fixed **34px** track, unit centred; the tally is 272px wide and the foot captions set beside it |
| **R3 · unit value** | 1 card; **2 cards when the tallest bucket > 18**, stated on the foot line | same |
| **R3 · empty bucket** | no squares; the mana value prints an em dash where its count goes | same |
| bar height *(R2)* | `bucket.copies / max(buckets) × track`, **floor 20px when `copies > 0`** | same |
| bar fill, populated | `var(--fg-muted)` — **one fill for every populated bucket**, tallest `var(--fg)`; never `--elevated` (1.3:1) | same |
| in-bar count | always inside the bar, `var(--surface-sunken)` ink; the 20px floor is what guarantees it fits | same |
| **empty bucket** | `1px` `var(--border-strong)` rule, **no figure** | same |
| bucket figure | mono 9px; `--fg` on the tallest, `--fg-body` otherwise | mono 9.5px, same |
| bucket label | mono 8.5px `--fg-faint`; bucket 7 is `7+` | mono 9px, same |
| caption | two lines: `N cast · M lands, excluded` / `live list, both commanders in` | one line, both clauses, `·` joined |
| caption at `copies === 0` | `nothing to cast yet · M lands, excluded` | same |
| forbidden | scaling to `copies`; a 9th lands column; fractional buckets; `avg 0`; the raw average; the average with no list clause | same |

---

## 6. §Cell — To buy

| Property | Phone | Desktop |
|---|---|---|
| label | mono 9px upper `--fg-faint` | mono 10px upper `--fg-faint` |
| figure | mono 600 19px `var(--accent)` `tabular-nums` | mono 600 22px, same |
| figure unit | money rides the figure line (`3` `$18.40`) | `copies`, mono 11px `--fg-faint`, beside the figure |
| money | mono 12px `--fg` on the figure line | mono 13px `--fg`, own line, `4px` below |
| money at `cents === 0` | **line absent** | **line absent** |
| line 3 | mono 9.5px `--fg-faint` | mono 9.5px `--fg-faint`, `8px` below at full-priced |
| line 3 content | `N of M priced` when `pricedCopies < copies`; `after the copies you already own` when equal; `no prices from ManaPool for these` when `pricedCopies === 0` | same |
| **absent** (`cost === null`) | `—` `--fg-locked`; `nothing to buy`; `basics are never counted, so this is not finished` | same |
| forbidden | `$0.00` in any state; the word *complete* or *finished* as a status; a buy link; basics; the price strip's total | same |

**One line slot, three tenants.** The priced fraction, the unpriced sentence and the deficit clause
never co-occur. Two provenance lines under a two-line figure is more apparatus than figure.

---

## 7. §Roll-up block (Home)

| Property | Phone | Desktop |
|---|---|---|
| element | `<section aria-label="What you play">` | same |
| eyebrow | `What you play` mono 9px upper `--fg-faint`; trailing `across N decks` | mono 11px `--fg-body`; gloss `across N decks` mono 10.5px `--fg-faint` |
| cells | Record, then Colours below a `1px --border` divider | `grid-template-columns: 172px minmax(0,1fr)` |
| record | figure and caption on **one baseline** (`19px` + `9.5px`, gap `9px`) | figure over caption, as the deck page |
| record gloss | absent | `every deck's record, added` |
| colours | identical to the deck page; count column widens to `34px` | same |
| colours caption | `once per colour, so these add past N` | `of N cards · once per colour, so these add past N` |
| **absent** record | `—` `--fg-locked`, `no games logged yet`, gloss `the roll-up of one deck's absence is the same absence` | same |
| cells NOT drawn | Curve, To buy | Curve, To buy |
| placement | **owned by the home handoff** | **owned by the home handoff** |

Every string is the deck page's string. The only new copy at this altitude is the scope
(`across N decks`) and the record gloss.

---

## 8. Accessibility

| Property | Value |
|---|---|
| block role | `<section>` with `aria-label` — `What this deck is` / `What you play` |
| cell role | `role="figure"` + explicit `aria-label` (the role cell's static branch) |
| why explicit | one label on the figure replaces **every** descendant, so a screen reader gets one utterance per cell instead of a run of bare numbers |
| record label | `Record 3 wins, 1 loss, 1 draw across 5 games logged` |
| record absent | `Record — no games logged yet` |
| colours label | one utterance naming all six figures, the denominator **and** the caveat — see `copy strings` `colours.aria` |
| curve label | the eight buckets, the average with its list, then `N cast, M lands excluded` |
| cost label | copies, money, priced fraction, then the deficit clause |
| live region | **none.** Nothing here updates without a route revalidation, and the Games panel already owns the record's live region (`games-panel.tsx:33-43`) |
| focus | no focusable descendant — the block contains no control at any width |
| `forced-colors` | pips and bars lose their fills to system colours; every figure and caption is text and survives. The letter column is why the colour cell still reads |
