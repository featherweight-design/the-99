# Design Property Table — Change commander (banner and review, PR 4)

Sources: `design/design_handoff_the99_change_commander/` HANDOFF.md §4–§5 (and R3), STATES-change-commander.md rows 19–22, READINESS-audit.md (F1, F3, F5, F9 override), `Deck Page 1300.dc.html`, `Deck Page 390.dc.html` (states `after`, `afterTrade`, `afterPair`, `afterCounts`), `Review Page.dc.html` (states `single`, `trade`, `pair`; `phone`), `The 99 - Change Commander.dc.html` §5 notes (5a–5e).

Conventions: Mobile = below 768px (`390` canvas); Desktop = `md:` and up (`1300` canvas). "shipped" = the element exists today and the handoff says it is unchanged; values are recorded only where the canvas draws them on this surface. `—` = explicitly absent. Omitted = the design does not specify. Copy is recorded as KEY only (`changeCommanderCopy.*` unless another module is named).

---

## 1 · Deck page header after a swap (STATES 19, 20)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Header band art | image | the NEW commander's crop (both geometries) | the NEW commander's crop (both geometries) |
| Deck name (h1) | content | untouched (deck's own name) | untouched |
| Commander line | name | new commander (pair: both halves, `+` joiner as shipped) | new commander (pair: both halves) |
| Commander line | pips | new commander's identity pips (unchanged for a same-identity swap) | same |
| Bracket chip | conditional rendering | — (absent: reading is dirty, as after any edit) | — (absent) |
| Version line (`v3 · committed …`) | conditional rendering | — (absent while a draft is pending, as shipped) | — (absent while a draft is pending, as shipped) |
| Status pill | conditional rendering | shipped rule: `To buy` when the new commander (or a half) is to buy, else `Complete` | same |
| Status pill (to buy) | color / background | `--warning` on `color-mix(in srgb, var(--warning) 14%, var(--bg))` (shipped) | same |
| Status pill (complete) | color / background | `--success` on `color-mix(in srgb, var(--success) 18%, var(--bg))` (shipped) | same |

## 2 · Pending banner, shell (shipped, drawn for reference)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Banner wrapper | padding | 14px 14px 0 | 18px 26px 0 |
| Banner box | background | `--surface-rail` | `--surface-rail` |
| Banner box | border | 1px solid `--border-strong`; left 3px solid `--accent` | same |
| Banner box | radius | 10px | 10px |
| Banner box | padding | 13px 14px | 15px 17px |
| Banner box | margin-bottom | 14px | — |
| Density switch | rule | inline when `changeCount` ≤ 6 (`INLINE_CHANGE_MAX`), counts when > 6; the commander change counts as ONE change (F1) | same |
| Label `Pending changes: not yet a version` | typography | mono 9.5px, letter-spacing 0.14em, uppercase, display block | mono 10px, letter-spacing 0.16em, uppercase |
| Label | color | `--accent` | `--accent` |
| Label | spacing | margin-bottom 9px | row: flex-wrap, align center, gap 12px (inline) / 14px (counts); margin-bottom 11px (inline) / 10px (counts) |

## 3 · Pending banner, inline density: commander NameLine (STATES 19, 20)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Change list `<ul>` | layout | flex column, gap 5px, list-style none, padding 0 | same, max-width 760px |
| Change list | margin | 0 0 14px | 0 0 14px |
| Commander line | order | FIRST in the list | FIRST in the list |
| Commander line | attribute | `data-commander-line="true"` | same |
| Commander line `<li>` | layout | flex, align-items center, gap 9px | same |
| Commander line | min-height | 34px | 34px |
| Commander line | focus | receives focus after a successful swap; announces `confirm.announced` | same |
| Glyph `⇄` | typography | IBM Plex Mono 12px | IBM Plex Mono 12px |
| Glyph | color | `--accent` | `--accent` |
| Glyph | dimensions | flex none, width 13px column | flex none, width 13px |
| Name | content key | `deckVersioningCopy.history.commanderChange(from, to)`; pair `history.commanderPair` (`{a} & {b} → {c} & {d}`) | same |
| Name | typography | IBM Plex Sans 13px, line-height 1.35 | IBM Plex Sans 13px (line-height not set) |
| Name | color | `--fg` | `--fg` |
| Name | layout | flex 1, min-width 0 | flex 1, min-width 0 |
| Hint | content key | `banner.hint` single / `banner.hintPair` pair (trade keeps `banner.hint`) | same |
| Hint | typography | IBM Plex Mono 10px | IBM Plex Mono 10px |
| Hint | color | `--fg-locked` | `--fg-locked` |
| Hint | layout | flex none | flex none |
| Price | component | `PRICE_TILE`, when the new commander (or a half) is to buy | same |
| Price (as drawn) | typography | mono 10px | mono 10px |
| Price (as drawn) | color | `--warning` | `--warning` |
| Price (as drawn) | border / radius | 1px solid `--accent-shadow`, radius 4px | same |
| Price (as drawn) | padding | 1px 5px | 1px 5px |
| Price | conditional rendering | — when nothing is to buy (trade, owned swap, owned pair) | same |
| +/− figure for a lone swap | conditional rendering | — (a swap moves no card) | — |
| Actions row | layout | column, gap 8px: `Commit as vN` full-width 44px, then row gap 8px: `Discard` (44px, padding 0 18px) + `review changes` (mono 11px `--accent`, min-h 44px) (shipped) | flex-wrap row, gap 10px: `Commit as vN` · `Discard` · `review changes` (shipped) |

## 4 · Pending banner, trade lines (STATES 20)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `+1 / −1` figure | conditional rendering | trade only | trade only |
| `+1 / −1` figure | placement | own line below the label, margin-bottom 8px | in the label row, after the label |
| `+1 / −1` figure | typography | IBM Plex Mono 15px | IBM Plex Mono 13px |
| `+1 / −1` figure | gap | 9px | 7px |
| `+1` | color | `--success` | `--success` |
| `/` | color | `--border-strong` | `--border-strong` |
| `−1` | color | `--warning` | `--warning` |
| Trade card lines | order | after the commander line: `+` (old commander into the 99), then `−` (new commander out of the 99) | same |
| Trade card line `<li>` | layout | flex, align center, gap 9px, min-height 34px (ordinary +/− line) | same |
| `+` / `−` glyph | typography / color | mono 12px, width 13px; `--success` / `--warning` | same |
| Trade card name | typography / color | 13px `--fg`, flex 1, min-width 0 | same |
| Trade hint | content key | `banner.fromZone` on the `+` line, `banner.toZone` on the `−` line, IN PLACE OF `removeHint` | same |
| Trade hint | typography / color | mono 10px `--fg-locked`, flex none | same |

## 5 · Pending banner, counts density sentence (> 6 changes)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Counts row (shipped) | layout | flex-wrap, align center, gap 9px, margin-bottom 8px; figure mono 15px gap 9px; `since` mono 10px `--fg-locked` | figure mono 13px gap 8px; `since` mono 10.5px `--fg-locked`; group gap 14px |
| Commander sentence `<p>` | placement | ABOVE the money sentence | ABOVE the money sentence |
| Commander sentence | attribute | `data-commander-line="true"` | same |
| Commander sentence | content key | `banner.replaces(new, old)`; pair `banner.replacesPair` | same |
| Commander sentence | typography | 12.5px, line-height 1.5 (the money sentence's style) | 13px, line-height 1.55 (the money sentence's style) |
| Commander sentence | color | `--fg-body` | `--fg-body` |
| Commander sentence | margin | 0 0 6px | 0 0 6px |
| Commander sentence | max-width | — | 700px |
| Sentence glyph `⇄` | typography | mono 12px | mono 12px |
| Sentence glyph | color | `--accent` | `--accent` |
| Sentence glyph | margin-right | 7px | 7px |
| Money sentence (shipped) | typography / margin | 12.5px / 1.5, `--fg-body`, margin 0 0 12px | 13px / 1.55, `--fg-body`, margin 0 0 14px, max-width 700px |
| Actions (shipped) | layout | `Review n changes` full 44px; row gap 8px: `Commit as vN` flex 1 + `Discard` | row gap 10px: `Review n changes` · `Commit as vN` · `Discard` |

## 6 · Review page, Commander section (STATES 21)

The section is drawn identically at both widths; only the page gutters differ.

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Section | placement | FIRST under the header/lede, above `ChangedStrip`, the chips and the columns | same |
| Section | attribute | `data-commander-change="true"` | same |
| Section | layout | flex column | flex column |
| Page body (context) | padding / gap | 14px 14px 22px, column gap 16px | 0 26px 28px, max-width 1180px, column gap 20px |
| Heading row | layout | flex, align-items baseline, justify space-between, gap 10px | same |
| Heading row | padding / margin | padding-bottom 10px, margin-bottom 10px | same |
| Heading row | border | bottom 1px solid `--elevated` | same |
| Heading `<h2>` | content key | `review.heading` single / `review.headingPair` pair | same |
| Heading | typography | IBM Plex Mono 11px, weight 400, letter-spacing 0.16em, uppercase (column-heading style) | same |
| Heading | color | `--accent` | `--accent` |
| Heading | layout / margin | flex none, margin 0 | same |
| Note | content key | `review.notePool(oldShort)`; pair `review.notePoolPair`; trade `review.noteTrade` | same |
| Note | typography | IBM Plex Mono 10px | same |
| Note | color | `--fg-locked` | `--fg-locked` |
| Note | alignment | text-align right | same |
| Rows container | layout | flex column, gap 6px | same |
| Rows | count / order | two: `was`, then `now` | same |
| Row | layout | flex, align-items center, gap 11px | same |
| Row | min-height | 48px | 48px |
| Row | padding | 4px 10px | 4px 10px |
| Row | background | `--surface` | `--surface` |
| Row | border / radius | 1px solid `--border`, radius 8px | same |
| Row label | content key | `review.was` / `review.now` | same |
| Row label | typography | IBM Plex Mono 10px, letter-spacing 0.06em | same |
| Row label | color | `--fg-faint` | `--fg-faint` |
| Row label | dimensions | flex none, width 30px | same |
| Thumb | dimensions | 48×35px, flex none | same |
| Thumb | border / radius | 1px solid `--border-strong`, radius 5px, overflow hidden | same |
| Thumb | background | `--elevated` under the art crop (cover, centered) | same |
| Thumb | aria | `aria-hidden="true"` | same |
| Thumb (pair) | layout | two 24px-wide halves, absolute, top/bottom 0; second half border-left 1px solid `--bg` | same |
| Name | content | the commander(s); pair drawn joined with ` + ` | same |
| Name | typography | IBM Plex Sans 13.5px, line-height 1.35 | same |
| Name `was` | color | `--fg-muted` | `--fg-muted` |
| Name `now` | color | `--fg` | `--fg` |
| Name | layout | flex 1, min-width 0 | same |
| Buy tag | component | `BuyTag` (its own states, incl. absent/sold-out, STATES 23) | same |
| Buy tag | conditional rendering | on the `now` row only, when it (or a half) is to buy; — on `was` | same |
| Buy tag (as drawn) | typography | mono 9.5px; `buy` `--warning`, `·` `--border-strong` padding 0 3px, price `--fg-body` | same |
| Buy tag (as drawn) | background / radius / padding | `color-mix(in oklab, var(--warning) 13%, transparent)`, radius 4px, padding 1px 5px, flex none | same |
| Row | hover / focus | — (not interactive in the drawing) | — |

## 7 · Review page, surrounding figures (STATES 21)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Page heading | content key | `heading(n)`: the commander change counts as ONE | same |
| Page heading (shipped) | typography | display face 700, 18px, margin 10px 0 8px | display face 700, 24px, margin 10px 0 8px |
| Lede | conditional rendering | — (not drawn at 390) | drawn (shipped), 14px / 1.6 `--fg-body`, max-width 680px, margin 0 0 18px |
| `ChangedStrip` note (lone swap / pair) | content | reports the body did not move (shipped strip) | same |
| Columns / chips | conditional rendering | lone swap / pair: — (no card moved); trade: shown | same |
| Trade: `Coming in` row hint | content key | `banner.fromZone` (old commander) | same |
| Trade: `Going out` row hint | content key | `banner.toZone` (new commander) | same |
| Trade hint | typography / color | mono 10px `--fg-locked`, flex none | same |
| Trade diff row (as drawn) | layout | min-h 44px, padding 0 10px, radius 7px, `--surface`, 1px `--border`, border-left 2px `--accent`; name 13px `--fg` ellipsized | same |
| Trade columns | layout | segmented pair (`Coming in · n` / `Going out · n`), one column shown (shipped) | two columns, gap 22px (shipped) |
| Footer `back in the pool` | figure | counts one copy per old commander that LEAVES (F3: `releasedCopies` + leaving commanders); trade 0; pair 2 | same |
| Footer text (shipped) | typography / color | mono 11px `--fg-muted` | same |
| Footer (shipped) | layout | column, stretch, gap 10px, padding 12px 14px 16px, top 1px `--border`, `--surface-rail` | row space-between, gap 16px, padding 14px 26px, top 1px `--border`, `--surface-rail` |
| Deck mix cache key | rule | includes the commander ids (F5) | same |

## 8 · Discard consequence (STATES 22)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Consequence line | content key | `deckVersioningCopy.discard.consequence` head + `discard.commanderBack(oldShort)` appended when the draft holds a commander change | same |
| Consequence line (pair) | content key | a pair form is owed (F9); `commanderBack` alone is singular | same |
| Consequence line | typography / color / spacing | shipped Discard confirm, unchanged (not drawn) | same |
| Discard action | effect | restores the version's commander columns (F1) and, for a trade, both cards' places | same |
| Consequence (brew) | conditional rendering | — (no version, no Discard; only another change undoes it) | same |

## 9 · Tokens (§5)

| Token | Use |
|---|---|
| — new tokens | none |
| `--accent` | ⇄ glyphs (NameLine, counts sentence), review Commander heading (the brass rule's ink) |
| `--success` / `--warning` | the diff's in/out only (+1/−1, +/− glyphs, column headings) |
| `--fg-locked` | banner hint, trade hints, review note |
| `--fg-faint` | review `was`/`now` labels |
| `--fg-muted` / `--fg` | review name `was` / `now` |
| Buy / held styling | the components' own (`PRICE_TILE`, `BuyTag`) |

---

## State Coverage

| # | Surface | State | Trigger | Drawn |
|---|---|---|---|---|
| 19 | Deck page | after swap | draft holds a commander change, no card moved, `changeCount` ≤ 6 | new band crop; no bracket chip; no version line; inline banner with the ⇄ NameLine first, hint `banner.hint`; `PRICE_TILE` if to buy; no +/− figure (1300/390 `after`) |
| 19b | Deck page | after swap in a large draft | commander change + other changes, `changeCount` > 6 | counts banner as shipped plus `banner.replaces` sentence above the money line (`afterCounts`, 5e) |
| 20 | Deck page | after trade | new commander was in the 99 | ⇄ line + `+` line (`banner.fromZone`) + `−` line (`banner.toZone`); `+1 / −1` figure; no price (`afterTrade`) |
| 20b | Deck page | after pair | pair deck, both halves replaced | ⇄ line with `history.commanderPair`, hint `banner.hintPair` (`afterPair`) |
| 21 | Review | swap | commander change, no card moved | Commander section first; `notePool`; `BuyTag` on `now` if to buy; no columns; footer counts 1 back in the pool (`single`) |
| 21b | Review | trade | new commander from the 99 | `noteTrade`; columns show both cards with command-zone hints; footer 0 back in the pool (`trade`) |
| 21c | Review | pair | two halves replaced | `headingPair`, `notePoolPair`, split thumbs; footer 2 back in the pool (`pair`) |
| 22 | Discard | after a swap | Discard pressed while the draft holds a commander change (versioned deck) | consequence appends `discard.commanderBack`; pair form owed (F9) — not drawn |

## Gap report

Verified against the implementation: 110 rows match, with 22 visual gaps and 2 state gaps.

**Fixed (17 visual, 2 state):**

- 1, 4, 8: the design's data attributes (`data-commander-line`, `data-commander-change`) sit beside the test ids.
- 2, 15: line-height 1.35 on the banner line's name and the review row's name.
- 5–7: the counts sentence sits on a 6px foot, and its glyph is mono 12px with a 7px margin.
- 9 (the section's half): the section sits 16px above the strip on a phone and 20px on desktop.
- 10–13: the review row's gap is 11px, its padding 4px 10px, its label tracks 0.06em, and its thumb has a `--border-strong` hairline.
- 14: a pair's names join with ` + `.
- 16–18, and state gap 1: a traded card's row in the review columns shows its command-zone hint (`fromZone` coming in, `toZone` going out) in mono 10px `--fg-locked`, in place of its action.
- 22, and state gap 2: Discard after a pair swap takes the plural, `commanderBackPair` ("A and B lead it again.").

**Deliberate (5), left as shipped:**

- 3: the banner's change list keeps the shipped width. The banner is shared with every draft, and its width is not this feature's to change.
- 9 (the page body's half): the review page's body padding is the shipped page's, on `main`.
- 19: the review page heading's margin is the shipped page's, on `main`.
- 20: the review page footer's size and color are the shipped page's, on `main`.
- 21: a draft that moved only its commander uses `commanderOnly` for the discard consequence, because the handoff's `consequence` head reads "3 cards. are not stored anywhere" with no card changes. The-99-d9 approved the string with a picture.
