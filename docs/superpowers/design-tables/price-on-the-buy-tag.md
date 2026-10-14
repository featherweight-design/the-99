# Price on the buy tag (#288) — pre-implementation property table

Source of truth: the R3 round of the addendum in `design/design_handoff_the99_decks/` — `R3-README.md`, `R3-READINESS.md` and `The 99 - Decks · Price Addendum (R3).dc.html`, with the R2 round's token table and derivation carried forward where R3 states they are "accepted and not reopened" (R3RM:5–6).

Citation scheme — `R3C:<line>` = `The 99 - Decks · Price Addendum (R3).dc.html`; `R3RM:<line>` = `R3-README.md`; `R2RM:<line>` = `R2-README.md`. Every non-obvious row carries a citation.

**Precedence: the README wins over the canvas.** R3's own §6 records what the canvases still draw wrongly (R3RM:157–168), so a canvas is evidence of arrangement, not of copy or state. Where R3 and R2 disagree, R3 wins; R2 survives only where R3 says it is carried forward.

**No hex in any canvas is normative** (R3C:34, R2RM:93). The canvases resolve against `amonkhet`; every colour below is named as a token and must be read from `src/app/globals.css` at runtime. The one exception is the scrim's *percentage*, which is a ruled value rather than a colour (R3RM:104).

**All card names, prices, counts and dates in the canvases are mock data.** `Dockside Extortionist`, `$45.00`, `$84.25`, `6 of 8 priced`, `last checked Monday`, `12 August` — reproduce the shape of the string, never the value.

---

## 1. The buy tag — four states, two variants

The tag is one component with a `row` and a `tile` variant. Every state below renders at both.

| # | Property | Value | Source |
|---|---|---|---|
| 1.1 | The word | `buy`, unchanged from shipped | R3C:67 |
| 1.2 | The word's ink | `--warning`, both variants | R2RM:97 |
| 1.3 | Separator between word and tail | A `·` in `--border-strong` with `3px` of padding either side. Drawn as ` · ` in R2RM; the literal spaces were three mono advances (~17px at 9.5px) where the padded dot draws the same mark in ~12px — see the amendment below | R2RM:98, R3C:67; amended 2026-09-09 |
| 1.4 | Separator presence | Only when a tail renders. State 4 has no separator | R3C:70 |
| 1.5 | Figure ink, row variant | `--fg-body` | R2RM:99 |
| 1.6 | Figure ink, tile variant | `--fg` | R2RM:100 |
| 1.7 | `sold out` ink | The figure's own ink, per variant — it sits in the figure's slot and is the same class of fact | R2RM:81–85 |
| 1.8 | `foil` / `etched` qualifier ink | `--fg-faint` — a qualifier on a figure, not a fact of its own | R2RM:101 |
| 1.9 | Row tag fill | `--warning` at 13% | R2RM:102 |
| 1.10 | Tile tag scrim | `--bg` at **92%** (was 82%) | R3RM:104 |
| 1.11 | Tile tag inset ring | `--warning` at 50% — unchanged | R3RM:122 |
| 1.12 | Tile tag position | `absolute`, right/top inset, `pointer-events: none` — untouched | R3RM:123 |
| 1.13 | Font | mono, ~9px tile / ~9–9.5px row | R3C:67, R3C:221 |

### The four states

| # | State | Tail | Derivation | Source |
|---|---|---|---|---|
| 1.14 | `priced` | ` · $45.00` | `live && cents !== null` | R3RM:134 |
| 1.15 | `foilOnly` | ` · $2.10 foil` (or ` etched`) | `live && cents === null && (foilCents ?? etchedCents) !== null`; the word is `foil` when `foilCents` is set, `etched` when only `etchedCents` is | R3RM:135, R2RM:127–130 |
| 1.16 | `soldOut` | ` · sold out` | `row exists && !live` | R3RM:136 |
| 1.17 | `absent` | **No tail at all.** The bare tag, byte-identical to shipped | `default` — the branch, not a condition | R3RM:137, R3RM:140–141 |
| 1.18 | A live row with all three price columns null | Falls to `absent`, and counts as unpriced in the strip's denominator | R3RM:140–141 | 
| 1.19 | "Live" | `as_of === max(as_of)` over the table — the table's own rule, never a wall clock | R2RM (carried, R3RM:5) |

### Figure alignment

| # | Property | Value | Source |
|---|---|---|---|
| 1.20 | Figure slot | `min-width: 46px`, right-aligned — a column of figures lines up on the decimal point. R3C drew `58px`; see the amendment below | R3C:67–69, R3C:102–104; amended 2026-09-09 |
| 1.21 | Slot scope | The **Shopping list's**, not the tag's. Under `All` the figure hugs the word; the drawn slot appears only in the Shopping renderings | R3C:67–70 vs R3C:221–236 |

### Amendment · 2026-09-09 · the tag was too wide

Owner's call, taken without a round-trip to Design because nothing about the
drawing's intent changes — the column still opens, the mark still separates.
Both amendments shrink dead air between `buy` and its figure:

| # | Was | Is | Why |
|---|---|---|---|
| 1.3 | ` · ` spelled with literal spaces | `·` with `3px` padding | Three mono advances at 9.5px is ~17px of gap for one visible glyph. Padding draws the identical mark in ~12px. |
| 1.20 | `min-width: 58px` | `min-width: 46px` | The widest thing that can land in the slot is `sold out`: 8 characters of IBM Plex Mono, whose advance is `0.6em`, so `8 x 5.7px = 45.6px`. The other 12px held nothing. Still a min-width, so a four-figure price bends the column rather than truncating. |

Also retired here: the `2nd copy` word on a contested Shopping row (was row 5.2
of the amendment-5 table in `card-availability.md`'s sibling brief). The plate
draws `buy` on every row now. The group is headed `Spoken for` and the marker
beside it reads `short N`, so the plate was the third telling. The spoken form
is unchanged — `a second copy to buy` — because a reader can reach the row with
neither the heading nor the marker in earshot.

### Accessible name

| # | Property | Value | Source |
|---|---|---|---|
| 1.22 | Row variant | No added utterance — `buy` already sits in the row's reading order | R2RM (carried) |
| 1.23 | Tile variant, priced | The shipped ownership sentence, then `$45.00 at Mana Pool, last checked Monday` — **one utterance per price**, appended rather than added as a second sentence | R2RM:76–77 |
| 1.24 | Tile variant, behind | The same sentence with `, these prices are behind` appended | R2RM:76–77 |
| 1.25 | Tile variant, `sold out` / `absent` | The shipped sentence, unchanged. The visible tail stays readable, because the sentence never carries `sold out` | derived from 1.23 |

---

## 2. The price strip

R3's structural correction: the price facts belong to the **Shopping filter**, which is what scopes them, so they get their own element rather than renting a line off the builder spine (R3RM:28–34).

| # | Property | Value | Source |
|---|---|---|---|
| 2.1 | Placement | One element, **directly under the `All / Shopping` filter pills** | R3RM:33–34 |
| 2.2 | Condition | Rendered **only while Shopping is the active filter** | R3RM:34 |
| 2.3 | Parity | Identical at both widths — one home, no per-width disagreement | R3RM:34, R3RM:49–50 |
| 2.4 | `builder-spine.tsx:391` | **Untouched.** Same words, same deliberate desktop-only condition | R3RM:30–31 |
| 2.5 | Under the `All` filter | No strip, no total, no provenance line. Item 3's old ruling re-derives itself structurally | R3C:143–145 |
| 2.5a | Empty Shopping list (`totalCopies === 0`) | No strip. Eng ruling, 2026-09-06 — the design does not draw this case, and a provenance line above an empty list dates a list with nothing in it. Enforced **inside the strip**, so it holds wherever the strip is mounted | — |
| 2.6 | Plate | Own surface plate: sunken background, 1px `--border`, ~9px radius | R3C:61, R3C:94 |
| 2.7 | Phone arrangement | Two lines: figure line above, provenance line below, left-aligned | R3C:61–64, R3RM:55–57 |
| 2.8 | Desktop arrangement | One line: **provenance at the left, figure at the right**, baseline-aligned, space between | R3C:94–96 |
| 2.9 | Gap above the strip | ~10px below the pill row. Carried by the strip's own root rather than a wrapper at the call site — a wrapper holds the gap open under the pills when the strip declines to render (rows 2.5, 2.5a) | R3C:60, R3C:94 |

### Line 1 — the figure

| # | Property | Value | Source |
|---|---|---|---|
| 2.10 | Total | `$84.25` — mono, ~14px, semibold, ink `--fg` | R3C:62, R2RM:104 |
| 2.11 | Clause | `6 of 8 priced` — mono, ~10.5px, ink `--fg-faint` | R3C:62, R2RM:104 |
| 2.12 | Separator | ` · `, between figure and clause | R3C:62 |
| 2.13 | **All copies priced** | The clause **drops entirely**; the strip renders `$129.50` and nothing else | R3RM:62–63, R3C:125–130 |
| 2.14 | Why it drops | The count is already on screen twice — the filter pill and the spine. The clause names what is *missing*; when nothing is, the figure is the only new fact | R3RM:65–68 |
| 2.15 | `6 of 8 priced` at partial | Stays as written — that `8` is a denominator doing work | R3RM:68 |
| 2.16 | Nothing priced | The figure drops rather than rendering `$0.00`. No price at all is not zero | derived from R3RM:66–68 and R2RM (silence is a state) |
| 2.17 | Denominator | **Copies, not rows**, and the same figure the `Shopping N` pill carries. One fact, two renderings | R3C:117 |
| 2.18 | `soldOut` and `absent` cards | Contribute nothing to the total, and count against the denominator | R3RM:140–141 |

### Line 2 — the provenance

| # | Property | Value | Source |
|---|---|---|---|
| 2.19 | Fresh form | `prices from Mana Pool · last checked Monday` | R3C:63 |
| 2.20 | Behind form | `prices from Mana Pool · last checked 12 August · these are behind` | R3C:137 |
| 2.21 | Behind clause position | Third and last | R3RM:70–71 |
| 2.22 | Ink, both forms | `--fg-locked` | R2RM:105, R3C:139 |
| 2.23 | Not a warning | No banner, no amber. Old prices are our operational problem, not the player's error | R2RM:72–74 |
| 2.24 | Font | mono, ~9.5px | R3C:63 |
| 2.25 | Weekday vs date | Fresh reads a weekday; behind reads a date. One threshold governs both the switch and the clause | R2RM (carried, R3RM:5) |
| 2.26 | Failed price read | The strip is absent entirely — every line it renders is a claim about a table it could not read | derived; the builder degrades rather than errors |

---

## 3. The scrim

| # | Property | Value | Source |
|---|---|---|---|
| 3.1 | Change | Tile tag scrim, 82% → **92%** | R3RM:104 |
| 3.2 | Scope | The **tile tag only**. The row tag's fill is untouched | R3RM:97 |
| 3.3 | Conditionality | **Unconditional** — not "raised when a figure renders". A scrim that changed with what is written on it would be a primitive deciding how to look from its own content | R3RM:112–115 |
| 3.4 | Step size | 10 points, and no further. A larger step or an opaque plate starts reading as a chip glued to the card rather than a label on it | R3RM:117–120 |
| 3.5 | Everything else | Inset stays `--warning` at 50%; inks stay as the R2 token table has them; position and `pointer-events: none` untouched | R3RM:122–123 |
| 3.6 | The reason | A word is recognised; a figure is read. A misread digit is a wrong number in somebody's budget | R3RM:106–110 |
| 3.7 | If 92% still falls short | The next move is the theme's `--warning`, not another 10 points of scrim | R3C:311–313 |

### The ledger ask, answered

R3 asks for the worst case recomputed at 92% (R3RM:125–127). `--warning` over `--bg` at the given alpha, composited over pure white art, WCAG 2.x contrast:

| Theme | 82% (Design's figure) | 82% (recomputed) | **92% (ruled)** |
|---|---|---|---|
| amonkhet | 5.18 | 5.18 | **7.27** |
| phyrexia | 4.66 | 4.66 | **6.49** |
| duskmourn | 4.50 | 4.48 | **6.26** |
| kamigawa | 4.48 | 4.46 | **6.25** |
| innistrad | 4.31 | 4.28 | **6.02** |
| kaldheim | 4.27 | 4.29 | **6.02** |

The recomputed 82% column reproduces Design's to within 0.03, which is what licenses the 92% column. All six clear AA (4.5) with 1.5 points of margin, and land between the old worst case and the normal-art column Design measured at 7.36–8.86 — exactly the expectation R3 asked to have measured rather than assumed.

---

## 4. The sort rename

| # | Property | Value | Source |
|---|---|---|---|
| 4.1 | Label | `Cheapest first` → `Cheapest to cast` | R3RM:80 |
| 4.2 | Scope | The copy string only. The sort itself still sorts on `manaValue` | R3RM:75, R3C:218 |
| 4.3 | Why renamed, not shared | One toolbar, one word, two currencies. A dollar figure is never "to cast", so the collision becomes impossible in the only phrase where it could occur | R3RM:84–86 |
| 4.4 | Why not `Lowest mana value` | Precise, and the wrong register for this voice | R3RM:86 |
| 4.5 | What the rename protects | Fail-quiet. After it, nothing in the app ranks, filters or sorts on price, so that argument stands without a caveat | R3RM:87–89 |

---

## 5. The export copy

| # | Property | Value | Source |
|---|---|---|---|
| 5.1 | String | `Prices show in the app · exports copy names only` | R3RM:146–148, R2RM:156 |
| 5.2 | Call sites | **Both** — the desktop note and the mobile `names only · pricing planned`. Two call sites, one live value | R3RM:146–149 |
| 5.3 | Export behaviour | Unchanged. Names only, both tabs. A copy correction, not a feature | R2RM:161 |
| 5.4 | Why | Shipping a price on the decklist makes "pricing is a planned add" false | R2RM:152–154 |

---

## 6. Copy rules

| # | Rule | Source |
|---|---|---|
| 6.1 | The apostrophe is curly — `don’t` throughout, matching shipped | R3RM:150–151 |
| 6.2 | `sold out` is a fact about the shop, never "unavailable" (spent on the availability block) and never "out of stock at Mana Pool" | R2RM (carried) |
| 6.3 | **There is no string for a missing price.** Not `—`, not `$0.00`, not "price unknown". Silence is the state | R3RM:140–141 |
| 6.4 | The six themes are `amonkhet · kamigawa · innistrad · phyrexia · duskmourn · kaldheim`. "Neon Rain" is not among them and is withdrawn | R3RM:152–155 |

---

## 7. Recorded stale drawings — do not implement from these

R3 §6 (R3RM:157–168) records what R1 and R2 still draw wrongly. Reproducing any of them would be building from a superseded round:

1. Every Shopping header in both earlier canvases — R1's invented `8 cards you don't own` and R2's `54 owned · 8 you don't own`, which is the Consider panel's line.
2. The total drawn inside a spine-attached header box. It is a filter-scoped strip under the pills.
3. `$129.50 · 8 cards` for the all-priced state. The clause now drops entirely.
4. The tile scrim at 82% in every tile drawn in R1 and R2.
5. "Neon Rain" in R2's item 4 panel and its README §4.
