# Design Property Table — Deck Versioning Surface 2 (review changes)

Source: `design/design_handoff_the99_deck_versioning/` — `README.md` (§Decisions 3, 3b, 4,
Component notes, Notes for engineering, Card-row compatibility, §Errata), `STATES-pending.md`
(table B, table D row 32, §Announcements, §The rules the matrix is generated from),
`OVERLAPS.md` (call 1, call 2, the mechanical checks), `READINESS.md` (items 13, 19, 20, 22,
28, 33, and the Not-blocking target floor), `COST-TRACK.md`,
`deck-versioning · copy strings.ts` (`review`, `changed`, `discard`, `commit.pullAnnounced`),
and the canvas `The 99 - Deck Versioning.dc.html` (§Surfaces 2 frame — desktop lines 210–338,
phone lines 340–376, annotation card lines 378–390; Contract frame lines 795–826; global
`<style>` lines 19–20). Spec statements from
`docs/superpowers/specs/2026-09-09-deck-versioning-design.md` §Surfaces 2 and Addendum R3.

Scope: the review page at `/decks/[id]/changes` — page shell, heading and lede, the
what-changed strip, the type-distribution ("shape") block, the count chips, the two equal
columns and their direction headers, the type group headings, the diff row in every variant it
draws (resting, hover, pull-bearing, guarded, quantity-moved), the `Pull it` control and both
guards, and the apply bar with `Commit as v{n}` / `Discard`.

Governing-value rule from the handoff: **§Errata at the foot of `README.md` wins over every
other sentence in the bundle, and where the canvas and R1-era prose disagree the canvas wins on
chrome.** Every row below records the canvas value and names the contradiction where one exists.

**Breakpoint:** two fixed frames — desktop at **1180px** content width, phone at **390px**
(drawn in a 392px device shell). No Tailwind breakpoint token is named anywhere in the bundle.
`Mobile` = the 390px frame, `Desktop` = the 1180px frame. Where the phone frame draws no
counterpart the cell reads `— (not drawn)`.

## Token ↔ hex correspondence used below

| Token | Hex on canvas | Asserted by |
|---|---|---|
| `--base` | `#14110E` | brand README (base); page background |
| `--surface` | `#1A1713` | diff-row + strip-cell spec `--surface`, and the canvas |
| `--surface-rail` | `#1A160F` | banner spec (not used on this surface) |
| `--elevated` | `#2A241D` | brand README (elevated); generic-cost disc, phone active segment |
| `--border` | `#26211B` | diff-row spec `1px --border` + canvas row border |
| `--border-strong` | `#3A3229` | chip spec `1px --border-strong`; apply-bar rule; button borders |
| `--fg` | `#EDE6D8` | brand README (primary); row name, group heading, after-figure in the shape row |
| `--fg-body` | `#C6B79A` | brand README (secondary); lede, chip label, shape-row type label |
| `--fg-muted` | `#A89B84` | brand README (muted); `Discard` label, annotation body |
| `--fg-faint` | `#8E8269` | brand README (faint); mono meta, group count, footer note |
| `--fg-locked` | `#6A6152` | brand README; before-figures, verdict notes, direction-header right slot |
| `--accent` | `#C9A24B` | brand README (accent); `Pull it` label, pullable chip, sleeved dot, `buy` segment ink |
| `--accent-hover` | `#D8B25E` | brand README; canvas global `a:hover` |
| `--accent-shadow` | `#4A3A1C` | buy-tag spec `1px --accent-shadow`; guard tag border; hover-row border |
| `--success` | `#6FA368` | brand README; free dot, `Coming in`, improving figures |
| `--warning` | `#E0913C` | brand README; `Going out`, prices, cut deltas, guard tag ink |
| `--danger` | `#C6533F` | brand README; used on this surface only by the Discard confirm and the Contract frame's "deleted" caption |
| cream primary fill | `#E8E4D6` | README R1.2 chrome table; `Commit as v3` fill |
| cream primary ink | `#14110E` | README R1.2 chrome table |
| group-heading rule (plum) | `#574463` | Contract frame: traced, **not in the brand ramp**, flagged to confirm |
| chip / browser-chrome plate | `#1E1A15` | canvas only — **unnamed in the brand ramp** (notes say the chip is `--surface`) |
| row hover fill | `#221D17` | canvas only; the annotation calls it `--elevated-hover` |
| kept-portion bar fill | `#4A4033` | canvas only, unnamed |
| identity pip — green | `#6B9E63` | canvas; brand WUBRG `G` |
| identity pip — blue | `#4A7FB5` | canvas; brand WUBRG `U` |
| identity pip — black | `#5B5566` | Contract frame: traced, flagged as the shipped page's to settle |
| annotation card plate | `#181410` | canvas annotation only — not product chrome |

Fonts: `var(--font-cinzel)` = Cinzel (type group headings) · `var(--font-sans)` = IBM Plex Sans
(UI + reading copy, and the default — every rule below with no family named inherits it) ·
`var(--font-mono)` = IBM Plex Mono (all numbers, labels, meta, tabular columns).

Links inherit the canvas global rule: `a { color: #C9A24B; text-decoration: none }` ·
`a:hover { color: #D8B25E }`.

---

## Component: Review page shell (`/decks/[id]/changes`)

Own route, back-navigable, **no focus trap and no modal** (README §Decisions 3; spec Addendum R3
"Review changes is a page"). Reaching it once the changes have been committed **redirects to the
deck page** (state 25).

| Property | Mobile | Desktop |
|----------|--------|---------|
| route | `/decks/[id]/changes` | `/decks/[id]/changes` |
| background | `#14110E` (`--base`) | `#14110E` (`--base`) |
| content max-width | 390px viewport | `1180px` |
| padding | `13px 14px 0` (body) + a route dock at the foot | `24px 26px 26px` |
| header block padding | `38px 14px 12px`, `border-bottom 1px #26211B` | — (no separate header block) |
| focus trap | none | none |
| windowing / pagination | none | none |
| live region | the existing app region; the page is not one | same |

### Back link

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `11px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| text | `← HD Tune - Mutant Menace` (the deck name) | `← HD Tune - Mutant Menace` |
| element | `a` | `a` |

### Heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-cinzel)` | `var(--font-cinzel)` |
| font-weight | `700` | `700` |
| font-size | `18px` | `24px` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| margin | `9px 0 0` | `12px 0 8px` |
| element | `h3` | `h2` |
| text | `36 changes since v2` — `review.heading(n, version)` | `36 changes since v2` |

### Lede

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | — (not drawn) | drawn |
| font-size | — | `14px` |
| color | — | `#C6B79A` (`--fg-body`) |
| line-height | — | `1.6` |
| margin | — | `0 0 18px` |
| max-width | — | `680px` |
| text | — | canvas: `Nothing here is a decision except the pulls. Tap any card to open it. Commit turns this into v3 and hands you the buy list.` — copy `review.lede(version)` ships `The deck page already shows this list: this is what it costs to lock in as v{n}.` (see Discrepancies 1) |

---

## Component: What-changed strip (six cells)

Six cells in the deck page's own mix-cell shape with a `→` in each. §Errata: **mana value plus
the five `ROLE_ORDER` roles — ramp, draw, removal, wipes, land**; `body` is not a role. Mana
value appears **only** here — no row carries one.

### Strip container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `grid` | `flex` |
| gap | `7px` | `10px` |
| margin-bottom | `11px` | `10px` |
| cells drawn | **6**, in `ROLE_ORDER` — `Mana value`, `Ramp`, `Draw`, `Removal`, `Wipes`, `Land` | **6**, in `ROLE_ORDER` — `Mana value`, `Ramp`, `Draw`, `Removal`, `Wipes`, `Land` |
| rows | three columns, two rows (`grid-cols-3`) | — (single row, `flex:1` each) |

**Ruling 2026-09-13 (Hugh):** "We need to render all of these cards on mobile, we can't just
selectively remove three." The canvas drew three cells at 390px; every role the deck is measured
against is a figure the reader came for, so the phone draws all six as a three-across grid in two
rows rather than one row of ~55px columns. Only the per-cell verdict line stays desktop-only.

### Strip cell

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — (grid item; `flex-1` is `md:` only) | `1` |
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| border-radius | `8px` | `9px` |
| padding | `9px 11px` | `12px 14px` |

### Strip cell — label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9px` | `10px` |
| letter-spacing | `0.12em` | `0.14em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| margin-bottom | `5px` | `7px` |
| text | `Mana value` · role name, in `ROLE_ORDER` | `Mana value` · `Ramp` · `Draw` · `Removal` · `Wipes` · `Land` |

### Strip cell — figures

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `baseline` | `baseline` |
| gap | `5px` | `7px` |
| before figure | mono `12px` `#6A6152` (`--fg-locked`) | mono `15px` `#6A6152` |
| arrow | mono `10px` `#6A6152`, `→` | mono `12px` `#6A6152`, `→` |
| after figure | mono `16px`, `#6FA368` improving / `#E0913C` still short | mono `19px`, `#6FA368` / `#E0913C` |
| mana-value formatting | `3.10 → 2.92` — two decimals | `3.10 → 2.92` |
| role formatting | integers, no sign | integers, no sign |

### Strip cell — verdict note

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | — (not drawn on phone) | drawn |
| font-family | — | `var(--font-mono)` |
| font-size | — | `10px` |
| margin-top | — | `6px` |
| color | — | `#6A6152` (`--fg-locked`), or `#6FA368` when the role crosses its recommendation |
| mana-value text | — | `the curve comes down` (`changed.manaValueDown`) / `the curve goes up` (`changed.manaValueUp`) |
| role text — at or over rec | — | `clears rec 8` (`changed.clears(rec)`) |
| role text — under rec | — | `still under rec 10` (`changed.under(rec)`) |
| role text — unmoved land cell | — | canvas `holds at rec ~37` — **no copy-module string exists for it** (Discrepancies 8) |

---

## Component: Type-distribution block ("how the shape moves")

A before / after / delta row per card type, showing **only the types whose count moved** on the
deck page's own arithmetic (state 9: "a row of zeroes is a table explaining it has nothing in
it") — though the canvas draws two zero rows (`Artifacts 0`, `Lands 0`).

### Block container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` | `1px solid #26211B` |
| border-radius | `8px` | `9px` |
| padding | `11px 12px` | `14px 16px` |
| margin-bottom | `13px` | `20px` |
| rows drawn | 4 (`Instants`, `Creatures`, `Sorceries`, `Enchant.`) | 6 (`Instants`, `Creatures`, `Sorceries`, `Enchantments`, `Artifacts`, `Lands`) |

### Block header

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | `flex`, `align-items: baseline`, `justify-content: space-between` |
| label font | mono `9px`, `letter-spacing 0.12em`, uppercase, `#8E8269` | mono `10px`, `letter-spacing 0.14em`, uppercase, `#8E8269` |
| label text | `How the shape moves` | `How the deck's shape moves` (`changed.shapeHeading`) |
| margin-bottom | `9px` | `11px` |
| right slot | — (absent) | mono `10px` `#6A6152`: `the interaction came from the self-mill package` — **no copy-module string** |

### Block row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex`, `align-items: center` | `flex`, `align-items: center` |
| gap | `8px` | `12px` |
| row gap (column) | `6px` | `7px` |
| type label | width `74px`, sans `12px`, `#C6B79A` | width `110px`, `flex:none`, sans `12.5px`, `#C6B79A` |
| before → after | `flex:1`, mono `11px` `#8E8269`, after in `#EDE6D8` | width `96px`, `flex:none`, mono `11.5px` `#8E8269`, after in `#EDE6D8` — `changed.shapeRow(before, after)` |
| bar | — (**no bar on phone**) | `flex:1`, `height 7px`, `border-radius 999px`, background `#26211B`, `max-width 520px`, `overflow hidden` |
| bar — kept segment | — | `flex: {after or before, whichever is smaller}`, fill `#4A4033` |
| bar — delta segment | — | `flex: {abs delta}`, fill `#6FA368` gained / `#E0913C` cut |
| bar — remainder | — | `flex: {padding to the widest type}`, `transparent` |
| delta figure | mono `11px`, `#6FA368` / `#E0913C` (no width reserved) | width `44px`, `flex:none`, mono `11.5px`, `text-align right`, `#6FA368` / `#E0913C` / `#6A6152` at zero |
| delta text | `+12` · `−5` (U+2212) | `+12` · `−5` · `0` — `changed.delta(n)` |

---

## Component: Count chips

The facet strip's construct verbatim. FIVE chips: in, out, to buy (carrying the total),
can be pulled, and — added 2026-09-15 with the card-assignment chooser — still short. A count of
nought is never drawn.

**Amended 2026-09-15**: the fifth chip. `still short` counts the CARDS on this page with a
contested copy — one decision each, never a count of copies — and takes the over state's own ink,
because `marker.over` says `short n` about the same card on the deck page. Drawn last, under the
same zero suppression as the other four.

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on the phone frame)**, though README §3 and the annotation say the chips stay above the segments (Discrepancies 4) | drawn above the columns |
| row display | — | `flex`, `gap 8px`, `flex-wrap: wrap` |
| row margin-bottom | — | `20px` |
| chip display | — | `flex`, `align-items: center`, `gap 8px` |
| chip background | — | `#1E1A15` — Component notes say `--surface` (`#1A1713`) (Discrepancies 2) |
| chip border | — | `1px solid #3A3229` (`--border-strong`) |
| chip border-radius | — | `999px` |
| chip padding | — | `6px 14px` |
| figure | — | mono `13px` — `#6FA368` in · `#E0913C` out · `#E0913C` to buy · `#C9A24B` pullable · `var(--avail-over-fg)` still short |
| label | — | mono `11px` `#C6B79A` — `in` · `out` · `to buy` · `can be pulled` · `still short` (`review.chipIn/chipOut/chipBuy/chipPullable/chipShort`) |
| total (to-buy chip only) | — | a second mono `11px` `#E0913C` figure, `$254.10` |
| zero suppression | — | a chip whose count is nought is absent (states 14, 15; matrix rule 1) |

---

## Component: Two-column layout

| Property | Mobile | Desktop |
|----------|--------|---------|
| construct | a segmented in/out pair — one column on screen at a time | two columns side by side |
| container display | — | `flex`, `gap 22px`, `align-items: flex-start` |
| column | full width | `flex: 1`, `min-width: 0` |
| column symmetry | same row anatomy on both sides | same row anatomy on both sides (dot, name, meta, cost track) |
| group alignment across columns | n/a | **none** — each column groups its own rows; no spacer aligns them (state 18) |
| small groups | stacked | the canvas pairs two short groups into a nested `flex; gap 22px` row of two `flex:1` sub-columns (`Enchant.` + `Artifacts`, both sides) |
| single-direction case | the segmented pair loses the absent side | the present column takes the full width, row anatomy unchanged (states 16, 17) |

### Phone segmented control

| Property | Mobile | Desktop |
|----------|--------|---------|
| container | `flex`, `gap 6px`, `margin-bottom 13px` | — |
| segment (active) | `flex:1`, sans `600` `12.5px`, `#EDE6D8`, background `#2A241D` (`--elevated`), `border-radius 999px`, `min-height 38px`, centred | — |
| segment (inactive) | `flex:1`, sans `500` `12.5px`, `#8E8269`, `1px solid #3A3229`, `border-radius 999px`, `min-height 38px`, centred | — |
| labels | `Coming in · 19` / `Going out · 17` (`review.groupIn` / `review.groupOut`) | — |
| target height | `38px` — below the 44px floor READINESS sets for controls at 390px | — |

---

## Component: Direction header (one per column)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | — (the segmented pair carries the direction) | one per column |
| display | — | `flex`, `align-items: baseline`, `justify-content: space-between`, `gap 10px` |
| border-bottom | — | `1px solid #2A241D` — Component notes say `1px --border` (`#26211B`) (Discrepancies 3) |
| padding-bottom | — | `10px` |
| margin-bottom | — | `14px` |
| label font | — | mono `11px`, `letter-spacing 0.16em`, `uppercase` |
| label color | — | `#6FA368` in · `#E0913C` out |
| label text | — | `Coming in · 19` · `Going out · 17` |
| right slot | — | mono `10px` `#6A6152` |
| right slot text — in | — | `11 free · 5 sleeved · 3 to buy` (`review.groupInBreakdown`) |
| right slot text — out | — | `all back in the pool on commit` — canvas; the copy module ships `review.outNote(n)`, which since **2026-09-13** is one sentence: `{it goes\|all {n} go} back in the pool when you commit.` The second sentence it used to carry explained a per-row toggle that does not exist, and crushed the heading beside it |

---

## Component: Type group heading

The deck page's own heading, mounted as shipped (`DecklistGroup` / `DecklistGroupHeader` —
§Errata: already separate modules, no extraction owed). Alphabetical within a group;
**no availability headings anywhere** (§Errata; spec Addendum R3).

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex`, `align-items: baseline`, `gap 9px` | `flex`, `align-items: baseline`, `gap 10px` |
| border-bottom | `1px solid #574463` (plum) | `1px solid #574463` (plum) |
| padding-bottom | `7px` | `7px` |
| margin-bottom | `9px` | `9px` |
| name font-family | `var(--font-cinzel)` | `var(--font-cinzel)` |
| name font-weight | `700` | `700` |
| name font-size | `14px` | `14px` |
| name letter-spacing | `0.04em` | `0.04em` |
| name text-transform | `uppercase` | `uppercase` |
| name color | `#EDE6D8` (`--fg`) | `#EDE6D8` |
| count | mono `11px` `#8E8269` | mono `11px` `#8E8269` |
| abbreviation | `Enchant.` in a narrow column | `Enchantments` full width; `Enchant.` in a nested sub-column |
| `{n} added, not yet committed` note | — **not on this surface** (it is the pending decklist's) | — not on this surface |
| empty group | absent on that side only (state 18) | absent on that side only |
| group list container | `flex column`, `gap 4px` | `flex column`, `gap 4px`, `margin-bottom 16px` |

---

## Component: Diff row (`update-diff-row`, mounted — no second row component)

OVERLAPS call 2: **one component, two mountings.** The `Keep` button becomes an `action` slot;
the review page passes the pull control and **never a `Keep` toggle** (check 5). The whole row
is the click target; the pull control is its one nested action and stops propagation.

### Row — resting (no action)

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | `44px` | `40px` |
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` |
| border-radius | `7px` | `7px` |
| padding | `0 8px` | `0 9px` (`0 6px 0 9px` when the row carries an action) |
| display | `flex`, `align-items: center` | `flex`, `align-items: center` — but a row that names a holding deck is **`flex-direction: column`, `align-items: stretch`** (`ROW_SHELL_STACKED`), with `align-items: center` on each of its two lines instead. Centring the shell itself shrink-wraps both lines to their content and the card name goes to zero at 820px, which is the defect PR #622 fixed; see the amendment below |
| gap | `9px` | `9px` (`8px` inside a nested sub-column) |
| row gap in the list | `4px` | `4px` |
| click target | the whole row opens the card | the whole row opens the card |
| chevron / icon | none | none |
| type label slot | **deleted** — the group heading carries type | **deleted** |

### Row — hover (drawn on `Brainstorm`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | (same rule) | `#221D17` — the annotation names it `--elevated-hover` |
| border | (same rule) | `1px solid #4A3A1C` (`--accent-shadow`) |
| meta appears | (same rule) | **withdrawn** — see the amendment below; the row draws no pointer hint |
| focus-visible | not specified | not specified |
| active | not specified | not specified |

> **Amendment, 2026-09-14 (PR #622), taken on Hugh's instruction and not through a design round.** Two
> things change on a row that names the deck sleeving the copy: the row keeps **two lines at
> every width**, and it draws **no `open card →` hint and no trailing anchor**.
>
> The single desktop line was not reachable. A row that prints a card name, a deck name, a buy
> tag and a control needs about 561px; a paired type column is 574px wide at 1300px and 165px at
> 820px, so `flex: 1 1 0%` on the card name took it to zero and the row named a deck while
> printing no card at all. The hover hint then claimed the width the trailing `Open →` anchor
> was standing in, and pushed it off the line. The phone's two-line stacking is what this row now
> draws at both widths: the name line, then a meta line that wraps under pressure, with a 90px
> floor under the deck name so it truncates rather than vanishing.
>
> The anchor and the hint go together. Both existed to say the row is clickable, which it already
> is — a click anywhere that is not a button or a link opens the card, so the deck name is the
> way in. **The link to the holding deck is genuinely lost by this**, and no surface replaces it.
> `pnpm probe:review` holds both names to a 40px floor at 1300px and again at 820px.

### Row slot — ownership dot (`OwnershipDot`, `aria-hidden`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| size | `7px × 7px` | `7px × 7px` |
| border-radius | `999px` | `999px` |
| free | filled `#6FA368` (`--success`) | filled `#6FA368` |
| sleeved elsewhere | filled `#C9A24B` (`--accent`; spec names `--avail-hard-fg`) | filled `#C9A24B` |
| unowned | `1px dashed #6A6152` (`--fg-locked`), no fill | `1px dashed #6A6152` |
| accessible name | carried by **the row**, not the dot (§Errata) | same |

### Row slot — name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `12.5px` | `13px` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` |
| flex | `1`, `min-width: 0` | `1`, `min-width: 0` |
| overflow | `hidden`, `text-overflow: ellipsis`, `white-space: nowrap` | same |
| quantity move | (same rule) | an inner mono `11.5px` `#8E8269` span: `9 → 7` — one row, `recountedItem`'s shape (§Errata: the handoff's `review.recounted` is discarded in favour of the shipped helper) |

### Row slot — holding deck name (sleeved adds only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` |
| placement | second line of the stacked pull row, `flex:1` | inline, after the name, `flex: none` |
| text | `Kess Storm` — bare deck name; copy `review.heldBy` ships `in {deck}` (Discrepancies 10) | `Kess Storm` · `Kinnan Ramp` |

### Row slot — buy tag (`BuyTag`, `density="full"` — §Errata ratified)

| Property | Mobile | Desktop |
|----------|--------|---------|
| construct | canvas draws a **single-segment** tag: mono `10px` `#E0913C`, `1px solid #4A3A1C`, radius `4px`, padding `1px 5px` (Discrepancies 5) | the split tag |
| container | — | `flex`, `align-items: stretch`, `1px solid #4A3A1C`, `border-radius 4px`, `overflow hidden`, `flex: none` |
| `buy` segment | — | mono `10px` `#C9A24B` on `rgba(201,162,75,0.10)`, padding `1px 5px` |
| price segment | — | mono `10px` `#E0913C`, padding `1px 6px` — `$28.40` |
| when drawn | on a row with no free copy: unowned, or sleeved elsewhere | same |
| collapsed `$` form | never on this surface | never on this surface |

### Row slot — cost track (`CostPips`, read as shipped)

| Property | Mobile | Desktop |
|----------|--------|---------|
| slot display | `flex`, `align-items: center`, `justify-content: flex-end`, `gap 3px`, `flex: none` | same |
| slot width (canvas) | `76px` | `90px` plain · `56px` on a pull row · `46px` / `44px` / `34px` / `22px` in nested sub-columns |
| slot width (governing) | pass `track` / `cap` from the shipped constants — `COST_TRACK = 72`, `PIP_CAP = 5` (§Errata) | same (Discrepancies 11) — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1** |
| generic-cost disc | `17px × 17px`, radius `999px`, background `#2A241D`, `1px solid #3A3229`, mono `9.5px` `#C6B79A` | `18px × 18px`, radius `999px`, background `#2A241D`, `1px solid #3A3229`, mono `10px` `#C6B79A` |
| disc absent | when the cost has no generic component | when the cost has no generic component |
| identity pip | `10px × 10px`, radius `999px` | `11px × 11px`, radius `999px` |
| pip fills | `#6B9E63` G · `#4A7FB5` U · `#5B5566` B | same |
| mana value on a row | **none** — §Errata; the figure lives in the strip alone | **none** |
| empty slot | drawn as an empty span holding the width (e.g. the `Swamp 9 → 7` row) | same |

### Row — pull-bearing variant

| Property | Mobile | Desktop |
|----------|--------|---------|
| structure | **two lines**: name line, then a meta line `padding-left 16px` carrying deck, price and control | one line |
| container | background `#1A1713`, `1px solid #26211B`, radius `7px`, `padding 8px`, `flex-direction: column`, `gap 8px` | `min-height 44px`, `padding 0 6px 0 9px` |
| min-height | driven by the two lines (control is `44px`) | `44px` |
| meta line | `flex`, `align-items: center`, `gap 8px` | inline in the single row |
| free copies shown | the cost track only | the cost track only |

### Row — the quantity-move row and its caption

| Property | Mobile | Desktop |
|----------|--------|---------|
| row | (same rule) | a normal `40px` row: dot, `Swamp` + inner mono `9 → 7`, empty `90px` cost slot |
| caption below | — (not drawn) | mono `10px` `#6A6152`, `padding 5px 9px 0`, `line-height 1.55` — annotation prose, **not product copy** |

---

## Component: `Pull it`

New atom. One per card, neutral, never solid, never the row default (README §Decisions 4).
`pullCardFromDeck`, one mutation, which commits a version on the **source** deck (§Errata).

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | `44px` | `34px` |
| border | `1px solid #3A3229` (`--border-strong`) — Component notes say `1px --border` | `1px solid #3A3229` |
| border-radius | `7px` | `7px` |
| padding | `0 16px` | `0 11px` (Component notes say `0 12px`) |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `600` | `600` |
| font-size | `12.5px` | `12px` |
| color | `#C9A24B` (`--accent`) | `#C9A24B` |
| background | none — never solid, never brass-filled | none |
| flex | `none` | `none` |
| label | `Pull it` (`review.pull`) | `Pull it` |
| propagation | stops propagation; the row's one nested action | same |
| in-flight label | `Pulling…` (`review.pulling`), disabled, **in place** — prose only, not drawn | same |
| disabled styling | not specified | not specified |
| hover / focus-visible | not specified | not specified |
| focus after the write | the row's own control (READINESS 20) | same |

### `Pull it` — the arithmetic it re-prints on success

| Property | Mobile | Desktop |
|----------|--------|---------|
| row movement | none — the row stays in its type group | none |
| row dot | goes to free | goes to free |
| marker + price | leave the row | leave the row |
| chips | to-buy count `8 → 7`, total `$254.10 → $225.70`, pullable count re-prints | same |
| animation | **none** — no count-up on any figure (READINESS 19) | none |
| announcement | `Cyclonic Rift pulled from Kess Storm. 7 to buy, $225.70.` (`commit.pullAnnounced`), once | same |

### Pull guard — variant 1, the holding deck has pending changes (state 20)

> **Retired 2026-09-27 (Hugh's ruling, PR A of the 0927 lane).** A pull no longer commits the
> holding deck: it takes the card out of that deck's draft and records a release, so a holder with
> changes of its own is pullable like any other, and nothing draws this variant. `review.pullGuardTag`
> and `review.pullGuardA11y` are deleted. The rows below are kept as the record of what shipped
> between #622 and that ruling.

| Property | Mobile | Desktop |
|----------|--------|---------|
| `Pull it` | absent | absent |
| tag font | mono `9.5px`, `letter-spacing 0.1em`, `uppercase` | mono `9.5px`, `letter-spacing 0.1em`, `uppercase` |
| tag color | `#E0913C` (`--warning`) | `#E0913C` |
| tag border / radius / padding | `1px solid #4A3A1C`, radius `4px`, `1px 5px` — `BuyTag`'s shape | `1px solid #4A3A1C`, radius `4px`, `1px 5px` |
| tag text | `deck has changes` (`review.pullGuardTag`) — see the amendment below | `deck has changes` |
| tag placement | beside the deck name on the meta line, spaced by that line's `9px` gap | same — the `gap 5px` grouping went with the withdrawn action |
| action label | **withdrawn** — see the amendment below | **withdrawn** |
| action font | **withdrawn** | **withdrawn** |
| action box | **withdrawn** | **withdrawn** |
| geometry vs a pullable row | shorter — the tag alone stands where the control did | shorter |
| price | **absent on the canvas's phone guard row** — states 20/21 say the price stays (Discrepancies 6) | present (`buy │ $6.40` on `Birds of Paradise`) |
| accessible description | `{deck} has pending changes of its own, so {card} cannot be pulled from it.` (`review.pullGuardA11y`) — carried by the row, never rendered | same |
| disabled button alternative | rejected — but so is the link now; the guard is a tag and a description (READINESS 13 is satisfied by drawing no control at all) | same |
| server dependency | a per-holding-deck *has changes* flag; the client must not infer it | same |

> **Amendment, 2026-09-14 (PR #622), taken on Hugh's instruction and not through a design round.** The tag
> read `pending`, and beside a card name it was taken for a pending change to **that card** — on
> a row where the card is not being touched at all. It names the deck now: `deck has changes`. The
> `Open →` anchor is withdrawn with the hover hint above, for the same reason, and the sentence
> it used to carry reaches a screen reader as the row's own description instead. The commander
> guard was already silent; the two guards now have the same shape.

### Pull guard — variant 2, the card is that deck's commander (state 21)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered on the canvas | **— (not drawn)** | **— (not drawn)** |
| tag text | `commander` (`review.commanderGuardTag`) | `commander` |
| tag shape | the same mono tag as variant 1's `deck has changes` | the same mono tag |
| control | **none at all** — no route releases a commander | **none** |
| price | stays (state 21) | stays |
| accessible name | `{card} is {deck}'s commander. It can’t be pulled.` (`review.commanderGuardA11y`) | same |

---

## Component: Apply bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | a dock at the foot of the page | under the columns |
| border-top | `1px solid #3A3229` | `1px solid #3A3229` |
| background | `#14110E` (`--base`) | — (inherits the page) |
| padding | `11px 14px 16px` | `padding-top 18px` |
| margin | `margin-top 13px` | `margin-top 24px` |
| display | `flex`, `flex-direction: column`, `gap 8px` | `flex`, `align-items: center`, `gap 12px`, `flex-wrap: wrap` |
| order | footer note first, then the button row | `Commit`, `Discard`, then the footer note |

### Apply bar — `Commit as v{n}`

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `600` | `600` |
| font-size | `14px` | `14px` |
| color | `#14110E` (cream primary ink) | `#14110E` |
| background | `#E8E4D6` (cream primary fill) | `#E8E4D6` |
| border-radius | `8px` | `8px` |
| size | `flex: 1`, `min-height 48px`, centred | `padding 11px 20px` |
| label | `Commit as v3` (`pending.commitCta`) | `Commit as v3` |
| disabled ever | **never** — nothing in this feature blocks a commit | never |
| opens | the commit sheet (Surface 3), inside this route | the commit sheet |

### Apply bar — `Discard`

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `500` | `500` |
| font-size | `13.5px` | `13.5px` |
| color | `#A89B84` (`--fg-muted`) | `#A89B84` |
| border | `1px solid #3A3229` | `1px solid #3A3229` |
| border-radius | `8px` | `8px` |
| size | `width 92px`, `flex: none`, `min-height 48px`, centred | `padding 11px 16px` |
| label | `Discard` (`pending.discardCta`) | `Discard` |
| hierarchy | never the primary; `--danger` only inside the confirm | never the primary |
| target note | drawn at `48px`, which READINESS reserves for "the two primaries" (Discrepancies 19) | — |

### Apply bar — footer note

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `11px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` |
| text | `101 cards · 8 to buy · 17 back in the pool` (`review.footer`) | same |
| zero suppression | not specified for this line | not specified |

### Apply bar — the discard confirm in place (state D32)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered on the canvas | **— (not drawn on this surface)**; the Discard frame draws it in the banner | **— (not drawn)** |
| construct | the same two lines and two buttons as D31, **in the apply bar** — no second wording | same |
| question | mono `10px` uppercase `--danger`: `Discard 36 changes?` (`discard.question`) | same |
| consequence | `13px` `--fg-body`, naming v2, its date and its card count (`discard.consequence`) | same |
| confirm button | the shipped danger button — `--danger` ink, `1px #4A2F28` — `Discard 36 changes` | same |
| cancel button | `Keep editing`, brass fill, **on top** on phone | `Keep editing`, beside it |
| refused | shipped `MutationError`; the confirm stays open; the changes untouched | same |

---

## State Coverage — the review page

State numbers are **section-scoped** to `STATES-pending.md` table B (plus table D row 32, the
discard confirm reached from this page). Diff source: `deck_cards` against the newest version's
`deck_version_cards` via `draft-diff.ts` — **derived, never a flag**.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| B13 — Every availability present | adds span free, sleeved and unowned | The drawn case: four count chips, both columns, rows grouped by type, availability **per row** — no bucket headings | `adds[]` (name, cost, bucket, holdingDeck, freeCount, price), `removes[]`, `chipCounts`, `buyTotal` |
| B14 — Only free adds | every add has a free copy | No markers, no prices, **no to-buy chip and no money anywhere on the page** | `adds[].bucket === 'free'` |
| B15 — Only unowned adds | no add is owned | Every add row carries `BuyTag`; the to-buy chip carries the full count and total | `adds[].price`, `buyCount`, `buyTotal` |
| B16 — No adds | `adds.length === 0` | `Coming in` **absent entirely**; the removes column takes the full width with its row anatomy unchanged | `adds`, `removes` |
| B17 — No removes | `removes.length === 0` | `Going out` absent; adds take the full width; nothing about the row changes | `adds`, `removes` |
| B18 — A type group is empty on one side | a type has rows on one side only | The heading is absent **on that side only**; the columns do not align their groups and no spacer is drawn | per-type row sets per column |
| B19 — A pull is available | add is sleeved in a deck with no pending changes and is not its commander | `Pull it` in the action slot, the holding deck named beside the name, the price beside that. One per card | `holdingDeck`, `price`, `canPull` |
| B20 — A pull is guarded, the deck has pending changes | holding deck's own diff is non-empty | No `Pull it`; mono `deck has changes` tag on the deck name; **no anchor** (see the 2026-09-14 amendment); **the price stays**; the sentence is the row's accessible description | `holdingDeck`, `holdingDeckHasPendingChanges`, `price` |
| B21 — A pull is guarded, the card is that deck's commander | the claim is a commander claim | The same tag reading `commander`, **no control at all**; the price stays | `holdingDeck`, `isCommanderOf`, `price` |
| B22 — A pull in flight | mutation dispatched | The row's control reads `Pulling…`, disabled, **in place**; the row does not move and nothing unmounts | `isPending` per row |
| B23 — A pull succeeded | mutation resolved | Dot goes to free; marker and price leave the row; pullable, to-buy and total re-print; **the row does not move**; announced once, no animation | `bucket`, `chipCounts`, `buyTotal`, announcement |
| B24 — A pull was refused | mutation rejected | Shipped `MutationError` beneath the row's control; the row stays pullable | `error` per row |
| B25 — Reached by a stale link | the changes have already been committed | **Redirect to the deck page** — no empty review page | `changeCount === 0` |
| D32 — Confirming a discard from this page | `Discard` pressed in the apply bar | The D31 confirm's two lines and two buttons, **in the apply bar**; no second wording | `changeCount`, `currentVersion`, `versionDate`, `versionCardCount`, `addCount`, `removeCount` |
| B9 (table A) — Changes with no type moved | a type's before/after are equal | The **type block renders only the types whose count moved** — "a row of zeroes is a table explaining it has nothing in it" | per-type before/after |
| B11 (table A) — A quantity changed only | one `draftDiff` entry with `from > 0 && to > 0` | One row reading `{name} {from} → {to}` via `recountedItem` — never a bare name | `from`, `to` |

### Cross-surface conditions that change Surface 2

| Condition | Effect on Surface 2 | Source |
|---|---|---|
| The deck's pending banner | `Review {n} changes` at 7+ changes / the `review changes` mono link at ≤6 is the only way in besides the URL | README §Decisions 1 |
| Money figures | The banner total, **this page's to-buy chip** and the commit sheet's sum are **one query** (`loadDeckBuyRows`, left-joined) rendered three times | OVERLAPS check 4; eng notes |
| Mana Pool link-out | **Never on this page** — exactly one instance in the feature, in the commit sheet | OVERLAPS call 1, check 1 |
| Top-off on a committed deck | Top-off's figures go signed; this page's figures stay bare | OVERLAPS call 1 |
| `Keep` toggles | **None on this page** — check 5: exactly one diff-row definition, both surfaces importing it, neither drawing a per-row type label | OVERLAPS call 2 |
| A pull | Commits a version on the **source** deck; revalidation is `revalidateClaims(deckId, userId)`, never `deckSurfaces()` | §Errata; §Pulling a card |
| Commit from this page | Route returns to the deck page; focus lands on the version line; announced `Committed v3. 101 cards, 8 to buy.` | STATES C26 |
| Discard from this page | Route returns to the deck page; focus lands on the deck name; announced `36 changes discarded. Back to v2.` | STATES D34; READINESS 20 |
| Announcements | One message per settle on the **existing** live region | STATES §Announcements |

---

## Absences the design states explicitly (write `—`, do not add)

| Element | Status |
|---|---|
| Availability bucket headings (`Free in your collection`, `Sleeved in another deck`, `Not owned`) | **Withdrawn** — §Errata; grouping is by card type. The `review.bucket*` copy keys are withdrawn with them |
| A `Bucket` header style in the component table | Deleted |
| `bucketAdds`' ordering as a render order | Rejected — it sorts by oracle UUID; rows sort alphabetically within a type group |
| A per-row type label | **Deleted** — the group heading carries type, and that deletion is what pays for the cost track |
| A `Keep` toggle on the removes | Rejected — the removal has already happened; the way back is the deck page |
| A chevron or icon on the row | None — the whole row is the click target |
| One in/out list sorted by name | Rejected — fails at thirty-six rows |
| A spacer aligning the two columns' groups | Rejected — "a table pretending to be a diff" |
| Mana value on a card row | **None** — rows draw `CostPips`' output; mana value lives in the strip alone |
| A curve histogram or per-role breakdown in the strip | Not drawn (gap 9) |
| `body` as a strip cell | **Not a role** — the six cells are mana value + `ramp, draw, removal, wipes, land` |
| A count of nought — `−0`, an empty chip, an empty column, an empty group heading | Never drawn |
| A modal, sheet-as-modal, focus trap, toast, tray, tooltip or confirm dialog | None exists in the product |
| Windowing / virtualisation / pagination | None (gap 2) |
| Count-up animation on any figure | Forbidden |
| Motion on this surface | **None** — only the commit sheet's open and close |
| A disabled `Pull it` with a tooltip | Rejected — a link, never a dead control |
| An `Open →` on the commander guard | **Absent** — no route releases a commander |
| A "prices as of" line | None (gap 4) |
| Mana Pool link-out | Not on this page |
| New tokens, hexes or motion classes | None |
| Hover, focus-visible or active styling for `Pull it`, `Open →`, `Commit as v{n}` or `Discard` | Not specified anywhere in the bundle |

---

## Contradictions inside the bundle, and the value recorded above

| Subject | Recorded value | Loser, and why |
|---|---|---|
| Review-page grouping | **Card type**, both columns, via the shipped `groupByCardType` | the five availability buckets in README §3 and `STATES-pending.md`'s copy table (§Errata) |
| Buy-tag density here | **`density="full"`** (§Errata ratified) | READINESS 33's "one judgement to ratify", and the phone frame's single-segment tag |
| Cost-track geometry | **shipped `COST_TRACK = 72`, `PIP_CAP = 5`** (§Errata) | the canvas's `90px` / `56px` / `46px` / `44px` / `34px` / `22px` slots, §Surfaces' `90px` / `76px`, and `COST-TRACK.md`'s `110px` / `76px` — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1** |
| Strip cell inventory and order | **mana value, ramp, draw, removal, wipes, land** (`changed.cells`, §Errata) | README §3b's "mana value, removal, draw, ramp, body" and the canvas's drawn order |
| The pull mutation's name | **`pullCardFromDeck`** (§Errata) | `pullFromDeck` in §Modules and in the eng notes |
| Revalidation | **`revalidateClaims(deckId, userId)`** (§Errata) | the `deckSurfaces()` call named later in the same eng notes |
| Grouping-component extraction | **No prerequisite** — the modules already ship (§Errata) | the eng note and READINESS 27, which both demand an extraction task |
| Quantity-move phrasing | **the shipped `recountedItem`, which takes strings** (spec Addendum R3) | the handoff's `review.recounted(name, from: number, to: number)` |
| Commit's card count | **the server's `cardCount`** | any client-side recount |
| Row min-height | canvas `40px` (`44px` with an action), phone `44px` | the Contract frame's "rows 38–44px desktop, 44–52px phone" and READINESS's "40–46px desktop, 46–52px phone" — three ranges disagree; the canvas figures are recorded |
| Freed type-column width | **150px on the adds variant** (§Errata, COST-TRACK, READINESS 30) | the README ledger's "loses a 120px type column — net −30px" |
| Direction-header rule | canvas `1px #2A241D` | Component notes' `1px --border` (`#26211B`) |
| Count-chip background | canvas `#1E1A15` | Component notes' `--surface` (`#1A1713`); `#1E1A15` is in no brand ramp |
| `Pull it` border | canvas `1px #3A3229` (`--border-strong`) | Component notes' `1px --border` |
| `Pull it` padding | canvas `0 11px` | Component notes' `0 12px` |
| Removes-column right slot | canvas `all back in the pool on commit` | the copy module's `review.outNote(n)`, shortened to one sentence 2026-09-13 |
| State numbering | **section-scoped** | any flat 1–45 reading — table B's 21–25 and table C's 21–25 are different states |

## Ambiguous or missing in the design (no value to verify against)

1. **The in-flight, success and refused pull states are prose only.** States 22, 23 and 24 are
   described in `STATES-pending.md` and drawn nowhere: there is no `Pulling…` control, no
   post-pull row, and no `MutationError` placement on the canvas for this surface.
2. **The commander guard (state 21) is not drawn either** — only variant 1 is.
3. **The discard confirm in the apply bar (D32) is not drawn** on this surface; it is inferred
   from the banner's confirm, with "no second wording" as the only instruction.
4. **No hover, focus-visible, active or disabled styling** for `Pull it`, `Open →`,
   `Commit as v{n}`, `Discard`, the phone segments or the count chips. Row hover is the only
   interactive state drawn. (`Open →` and the row's hover hint were both withdrawn by the
   2026-09-14 amendment above, so nothing is owed for either; the rest stands.)
5. **The phone frame draws no count chips**, no lede, no strip verdict notes, no `Going out`
   column content, no apply-bar confirm and no third/fourth/fifth/sixth strip cell. Every
   Mobile cell above reading `— (not drawn)` has no drawn source.
6. **No focus order or `aria` markup** beyond three accessible names (the row's availability
   word, `review.pullGuardA11y`, `review.commanderGuardA11y`) and "focus the row's own control
   after a pull".
7. **The zero-suppression rule is not stated for the footer note** (`101 cards · 8 to buy · 17
   back in the pool`) — whether `0 to buy` is dropped the way a chip is.
8. **The type block's row inclusion rule contradicts its own drawing**: state 9 says only moved
   types render, and the canvas draws `Artifacts 0` and `Lands 0`.
9. **The plum group rule `#574463`, the black identity pip `#5B5566`, the hover fill `#221D17`,
   the kept-bar fill `#4A4033` and the chip plate `#1E1A15`** are traced values with no brand
   token behind them.
10. **`holds at rec ~37`** — the land cell's verdict has no copy-module string, and the `~`
    appears nowhere else in the bundle.
11. **The unowned add row with no pull draws a bare `62px` spacer** where the action would be.
    No component-table entry covers it, and nothing says whether the slot is reserved or the
    row simply ends short.
12. **Whether the segmented pair is a control or two headings** at 390px is not stated — it is
    drawn as two pills at `38px`, under the 44px floor READINESS sets for controls.

---

## Discrepancies between design files

1. **The lede.** Canvas: `Nothing here is a decision except the pulls. Tap any card to open it.
   Commit turns this into v3 and hands you the buy list.` Copy module `review.lede(version)`:
   `The deck page already shows this list: this is what it costs to lock in as v{n}.` The canvas's "Tap" is a touch verb on a 1180px frame.
   **Amended 2026-09-13**: the shipped body dropped `this page exists to show you what it costs`,
   which restated the sentence before it. Hugh's copy ruling — see §Errata in the handoff README.

   **Amended 2026-09-15**: the first sentence is gone too. "Except the pulls" was true when a pull
   was the only decision on this page, and it is not — Put back restores a cut (#390) and a
   contested row gives a copy to a deck (card assignments). Naming all three would make the
   sentence a list, so it names none and says what the page IS. The quotation above this note is
   the CURRENT copy. The retired sentence survives in this file only where the CANVAS is
   transcribed — the rows at lines 119 and 723 record what the drawing says, which is a
   historical fact and stays true — and nowhere as copy to implement from.

   One thing this cost, worth knowing: `check:copy-drift` could not have caught the drift. It
   finds a table quoting a shipped string with different PUNCTUATION, and a sentence replaced
   outright shares no words to match on. Both quotations here were updated by hand.
2. **Count-chip background.** Canvas `#1E1A15`; Component notes say `--surface`. `#1E1A15` is
   not in the brand ramp at all (it is also the canvas's browser-chrome plate).
3. **Direction-header rule.** Canvas `border-bottom: 1px solid #2A241D` (the `--elevated`
   value); Component notes say `border-bottom 1px --border` (`#26211B`).
4. **Phone count chips.** README §3 and the canvas annotation both say "the count chips stay
   above the segments"; the phone frame draws no chips at all.
5. **Phone buy tag.** The phone pull row draws a single-segment `$28.40` tag — the shape the
   Component notes explicitly reject ("Never the R1.2 single-segment `buy $58.20`, which is not
   a shipped shape") and which §Errata overrides with `density="full"`.
6. **Phone guard row price.** States 20 and 21 both say "the price stays"; the phone guard row
   (`Birds of Paradise` / `Kinnan Ramp`) drops it, keeping only the `pending` tag and `Open →`.
   The desktop guard row keeps it. Both of those the canvas draws and neither ships: the
   2026-09-14 amendment above reworded the tag to `deck has changes` and withdrew the anchor.
7. **Strip cell order.** Canvas: mana value, Removal, Draw, Ramp, Wipes, Land. `changed.cells`:
   `manaValue, ramp, draw, removal, wipes, land`. README §3b names a third list — "mana value,
   removal, draw, ramp, **body**" — and `body` is not a role at all (§Errata).
8. **`holds at rec ~37`.** The land cell's verdict note matches no copy-module string;
   `changed.clears` and `changed.under` are the only two, and neither renders a `~`.
9. **Shape-block heading.** Phone draws `How the shape moves`; `changed.shapeHeading` and the
   desktop frame both say `How the deck's shape moves`. No responsive copy variant is specified.
10. **Holding-deck string.** Rows draw the bare deck name (`Kess Storm`, `Kinnan Ramp`);
    `review.heldBy(deck)` ships `in {deck}`.
11. **Cost-track widths.** The canvas reserves 90/56/46/44/34/22px per row variant;
    §Errata governs `COST_TRACK = 72` / `PIP_CAP = 5` — 40 until the pips stopped overlapping
    on 2026-09-14 (PR #621), see the amendment on surface 1 — and `COST-TRACK.md`'s own
    proposal is 110/76px. Three different geometries for one slot.
12. **Row height.** Canvas `40px` (`44px` with an action) desktop and `44px` phone; the Contract
    frame says "rows 38–44px desktop, 44–52px phone"; READINESS says "diff rows 40–46px desktop,
    46–52px phone"; the Component notes say "40px min-height (44px when it carries a pull
    control) … Phone 44–52px". No two agree.
13. **The pull mutation's name.** `pullFromDeck` in the spec's §Modules and in the eng notes;
    `pullCardFromDeck` in §Errata, which says the former "does not exist".
14. **Revalidation helper.** The eng notes name `revalidateClaims(deckId, userId)` in one bullet
    and "Revalidation goes through `deckSurfaces()`" in another, eleven bullets later. §Errata
    picks `revalidateClaims`.
15. **Grouping extraction.** The eng notes and READINESS 27 both make extracting
    `DecklistGroup` / `GroupToggle` a prerequisite; §Errata says they already ship as separate
    modules and "there is no extraction prerequisite".
16. **Withdrawn copy keys still ship.** §Errata withdraws `review.bucket*`; the copy module
    still exports `bucketFree`, `bucketSleeved`, `bucketUnowned`, `bucketFreeNote` and
    `bucketSleevedNote`.
17. **`review.recounted` versus `recountedItem`.** The copy module ships
    `recounted(name, from: number, to: number)`; spec Addendum R3 discards it for
    `deck-import.ts`'s `recountedItem`, which takes strings. Both phrasings produce
    `{name} {from} → {to}`.
18. **The pull-guard sentence.** `STATES-pending.md`'s copy table still lists the R1 string
    `that deck has its own pending changes →`, which README §Decisions 4 and the copy module
    both replaced — first with a `pending` tag plus `Open →`, and since the 2026-09-14
    amendment with the `deck has changes` tag alone.
19. **State numbers 21–25 are used twice.** Table B (review page) and table C (commit sheet)
    both number states 21–25. The errata's "section-scoped" ruling makes this legal, and it
    still means "state 21" is ambiguous without its table letter — and README §Decisions 4
    refers to "state 16's shape" for the commander guard, where state 16 in table B is "no adds".
20. **The freed type-column width.** §Errata, `COST-TRACK.md` and READINESS 30 all say **150px**
    on the adds variant; the README card-row ledger and the canvas Contract frame both say the
    row "loses a 120px type column — net −30px".
21. **Phone `Discard` height.** Drawn at `min-height 48px`, equal to `Commit as v3`, while
    READINESS and the Contract frame reserve 48px for "the two primaries" and the bundle
    repeatedly rules that Discard is never the primary.
22. **The hover fill is unnamed.** The annotation calls the row hover `--elevated-hover`; the
    drawn values are `#221D17` on `1px #4A3A1C`, and `#221D17` is in no brand ramp. `#4A3A1C`
    is `--accent-shadow`, which the Surface 1 notes say already means "opted out" on the
    re-import kept row.
