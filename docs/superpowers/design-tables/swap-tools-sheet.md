# Design table: the Stand-ins sheet and the row's ⇄ (swap tools PR 4a)

**Sources.** `design/design_handoff_the99_swap_tools/`: `Stand-ins Sheet.dc.html` (primary; the template
and its `renderVals()`), `Shopping View.dc.html` (the row's ⇄, the reserved 22px slot, the key line only),
`The 99 - Swap Tools.dc.html` (sections §4 call 1, 1b, 1c, 1d, for scrim geometry and ruling notes), `README.md`
(R2 wins over R1; R3 and R4 do not touch the sheet), `READINESS.md`, `READINESS-audit.md`, and
`swap-tools · copy strings.ts` (keys). **Applied:** README R2 (⇄ on marked rows only; desktop keeps an empty
22px slot; 22×31 thumbs on the head and every row; Loading as LoadingScreen scaled in; Failed as the tuning
failure shape); audit **H3** (a utility land's stand-in says what it gives up, never `gives up nothing` unless
true; this supersedes F2's proposed narrowing to `noRoleLand`); **F5** (a sold-out original is never over and
its sheet lists free copies only; new lead and empty sentence owed to /copy-review); **F7** (`ModalChrome` has
no 640 width; add `640` to its width union and `WIDTH_CLASS`); **F8** (phone card footer; recorded only
because it bounds this PR: nothing here builds a phone Prev/Next); **F14** (a pair the index does not hold:
the spells lead drops its second clause); **F1** (the stand-in's commander figure takes the staple read
later, PR 6; this table draws the plain figure only); **F6** (a foil-only stand-in draws `priceOf`'s foil figure
in the shipped BuyTag); **F12** (the ⇄ width probe); **F15** (loading built from the shipped `LoadingScreen`, so
reduced motion stops the crown). **Out of scope, PR 4b:** Take's outcomes, the refused panel, the taken state
and `takenNote`, the receipt, Undo swap, the stacked card, the card-modal door (`See cheaper stand-ins →`),
Prev/Next, the hover preview. **PR 5:** Fits your decks. **PR 6:** the staple form of the inclusion figure.

Copy is recorded as a KEY under `swapToolsCopy` (abbreviated `sheet.*`, `row.*`, `limit.*`), with its
arguments. Canvas fixture wording is never a property. Fonts: `mono` = `'IBM Plex Mono',monospace` (the
app's mono class), `sans` = `'IBM Plex Sans',sans-serif` (the app's body face), `--display` = the canvas's
display variable, which the app spells as the `font-display` class (`--font-display-face`, audit §2 Tokens).
No SVG is drawn anywhere in scope: ⇄, × and ✓ are text glyphs, and the crown is three rotated boxes.

---

## 1 · Sheet chrome (`ModalChrome` body)

### 1.1 Scrim and placement

| Element | Property | Desktop (640) | Phone (390) | Source |
|---|---|---|---|---|
| Scrim | background | `color-mix(in oklab, var(--bg) 72%, transparent)` | same | Swap Tools :143, :149 |
| Sheet placement | position | centred horizontally, `padding-top: 60px` from the viewport top | `top: 52px`, `left: 0`, `right: 0`, `bottom: 0` | Swap Tools :143, :149; README §4.1 ("same geometry as the Brackets sheet") |
| `ModalChrome` width | width | `640` (new union member, F7) | full width (390 drawn) | Sheet `sheetStyle`; audit F7 |

### 1.2 Sheet container

| Property | Desktop | Phone |
|---|---|---|
| width | `640px` | `390px` (the viewport) |
| background | `var(--surface-raised)` | `var(--surface-raised)` |
| border | `1px solid var(--border-strong)` (all sides) | `border-top: 1px solid var(--border-strong)` only |
| border-radius | `14px` | `14px 14px 0 0` |
| box-shadow | `0 24px 60px rgba(0,0,0,0.45)` | none |
| display / flex-direction | `flex` / `column` | `flex` / `column` |
| overflow | `hidden` | `hidden` |
| font-family | sans | sans |
| color | `var(--fg)` | `var(--fg)` |

### 1.3 Header bar

| Element | Property | Desktop | Phone |
|---|---|---|---|
| Header | flex | `none` | `none` |
| Header | height | not set (from padding) | `43px` |
| Header | display / align-items | `flex` / `center` | `flex` / `center` |
| Header | gap | `10px` | `9px` |
| Header | padding | `14px 18px` | `0 6px 0 16px` |
| Header | border-bottom | `1px solid var(--border)` | same |
| Title `h2` | key | `sheet.title` | same |
| Title | margin / flex | `0` / `1` | same |
| Title | font-family / weight / size / line-height | `--display` / `700` / `16px` / `1.2` | same |
| Title | color | `var(--fg)` | same |
| Title | white-space | `nowrap` | same |
| Close | glyph | `×` | same |
| Close | aria-label key | `sheet.closeAria` | same |
| Close | flex | `none` | same |
| Close | width × height | `44px × 44px` | same |
| Close | margin-right | `-10px` | same |
| Close | display / align / justify | `flex` / `center` / `center` | same |
| Close | font-family / size | mono / `14px` | same |
| Close | color | `var(--fg-faint)` | same |

### 1.4 Body

| Property | Desktop | Phone |
|---|---|---|
| padding | `16px 18px 18px` | `14px 16px 24px` |
| display / flex-direction | `flex` / `column` | `flex` / `column` |
| gap (between head plate, lead, groups, foot) | `14px` | `12px` |

Render order in the body: head plate → lead (conditional) → loading (conditional) → failed (conditional) →
sentence (conditional) → groups (`sc-for`) → foot (conditional). (`takenNote` sits between sentence and groups:
PR 4b.)

---

## 2 · Head plate (the original being replaced)

Renders in every kind, including loading and failed ("The head still renders at once from the tapped row",
Swap Tools :217).

| Element | Property | Value (both widths unless split) |
|---|---|---|
| Plate | display / flex-direction | `flex` / `column` |
| Plate | gap | `6px` |
| Plate | padding | `11px 13px 12px` |
| Plate | border | `1px solid var(--border)` |
| Plate | border-radius | `10px` |
| Plate | background | `var(--bg)` |
| Label | key | `sheet.replacing(deck)`; deck = the deck's name (`HD Gishath`, partner `HD Tymna + Thrasios`) |
| Label | font-family / size | mono / `9.5px` |
| Label | letter-spacing / text-transform | `0.12em` / `uppercase` |
| Label | color | `var(--fg-faint)` |
| Name line | display / flex-wrap / align-items | `flex` / `wrap` / `center` |
| Name line | gap | `6px 9px` (row / column) |
| Thumb | flex | `none` |
| Thumb | width × height | `22px × 31px` |
| Thumb | border-radius | `3px` |
| Thumb | border | `1px solid var(--border-strong)` |
| Thumb | background | card art (the canvas draws a placeholder hatch `repeating-linear-gradient(135deg, var(--border) 0 3px, var(--surface-raised) 3px 6px)`) |
| Thumb | aria-hidden | `true` |
| Dot | flex / size | `none` / `7px × 7px` |
| Dot | border-radius / border | `50%` / `1px dashed var(--fg-faint)` (always dashed: the original is always a card to buy) |
| Dot | aria-hidden | `true` |
| Name | content | the original's display name |
| Name | font-size / weight | `14px` / `600` |
| Name | color | `var(--fg)` |
| Name | border-bottom | `1px dotted var(--accent)` |
| Name | behaviour | opens the card (PR 4b); in 4a it is present as the name |
| Buy tag | component | shipped BuyTag, row plate (see §2.1) |
| Over text | condition | `orig.over` (the original's drawn price is over the deck's limit) |
| Over text | key | `row.over(figure)`; figure = the limit, `formatCents` (`$10`) |
| Over text | font-family / size | mono / `10px` |
| Over text | color | `var(--warning)` |
| Over text | white-space | `nowrap` |
| Job line | font-family / size / line-height | mono / `10.5px` / `1.5` |
| Job line | color | `var(--fg-muted)` |
| Job line | key (land) | `sheet.jobColors(colors)` + ` · ` + the original's own drawback clause, or `sheet.givesUpNothing` only when that is true (H3) |
| Job line | key (fetch) | `sheet.jobFinds(types)` + ` · ` + drawback (`sheet.drawback.lifeFetch(n)`, etc.) |
| Job line | key (spell) | `sheet.jobRole(roles, mv)` |
| Job line | key (no role) | `sheet.jobNoRole` |

### 2.1 Head buy tag

| Property | Value |
|---|---|
| flex | `none` |
| font-family / size | mono / `9.5px` |
| border-radius | `4px` |
| padding | `1px 5px` |
| color | `var(--warning)` |
| background | `color-mix(in oklab, var(--warning) 13%, transparent)` |
| white-space | `nowrap` |
| Content | `buy` · figure |
| Separator `·` | color `var(--border-strong)`, padding `0 3px` |
| Figure | color `var(--fg-body)`; `formatCents` of the drawn price |
| Over ring | **not drawn on the head's tag** (the Shopping row's over ring is not repeated here) |
| Sold out (F5) | the shipped BuyTag's sold-out rendering, no figure, and no over text |

---

## 3 · Lead line

| Property | Value |
|---|---|
| Condition | a list renders (lands, fetch, spells, partner, sold-out). Absent in loading, failed, no role, nothing cheaper |
| margin | `0` |
| font-size / line-height | `12.5px` / `1.55` |
| color | `var(--fg-body)` |
| text-wrap | `pretty` |
| Key (land) | `sheet.leadLands(colors)`; colors e.g. `white and red` |
| Key (fetch) | `sheet.leadFetch(types)`; types e.g. `Mountain or a Forest` |
| Key (spell, partner) | `sheet.leadSpells(roles, mv, commander)`; commander = the commander's short name or the pair `A + B` |
| Key (spell, nothing listed for the pair, F14) | a new key: `leadSpells` without its second clause (owed to /copy-review) |
| Key (sold-out original, F5) | a new free-copies-only lead (owed to /copy-review) |

---

## 4 · Groups

| Element | Property | Value |
|---|---|---|
| Group | display / flex-direction | `flex` / `column` |
| Heading | key, in order | `sheet.groupFree` (always first) → lands and fetch: `sheet.groupCheapest`; spells: `sheet.groupByCommander(commander)` then `sheet.groupUnlisted(commander)` |
| Heading | padding | `0 0 6px` |
| Heading | font-family / size | mono / `9.5px` |
| Heading | letter-spacing / text-transform | `0.12em` / `uppercase` |
| Heading | color | `var(--fg-faint)` |
| Heading | border-bottom | `1px solid var(--border)` |
| Group | condition | a group renders only when it has rows (partner draws no unlisted group; sold-out draws `groupFree` only) |
| Rows | rank number | none: the heading carries the order |
| Row order | within `groupFree` | v2 PR B: lands and fetches on the ladder (rung, then synergy, then price); spells by the commander's synergy, then price |
| Row order | `groupCheapest` (`best mana first`) | v2 PR B: the ladder (`landRung`: untapped, untapped with a condition or catch, tapped, utility), then synergy, then price |
| Row order | by commander | v2 PR B: descending by the commander (or pair) synergy, never drawn; a card is listed when the index holds its support row |
| Row order | unlisted | ascending by drawn price |

---

## 5 · Stand-in row

### 5.1 Row shell and grid

**PR 4a drew no Take** and shipped the grid without its track. PR 4b adds the Take column as specified below.

| Property | Desktop | Phone |
|---|---|---|
| Wrapper border-bottom | `1px solid var(--border)` | same |
| Grid display | `grid` | `grid` |
| grid-template-columns | `minmax(0,1fr) 96px 64px` | `minmax(0,1fr) 72px` |
| column-gap | `12px` | `10px` |
| row-gap | not set | `6px` |
| align-items | `center` | `center` |
| padding | `9px 0` | `10px 0` |
| Left cell placement | column 1, row 1 | column 1, row 1 |
| Price cell placement | column 2, row 1 | column 1, row 2 |
| Take cell placement | column 3, row 1 | column 2, rows `1 / span 2` |

### 5.2 Left cell

| Element | Property | Value (both widths) |
|---|---|---|
| Left cell | display / flex-direction | `flex` / `column` |
| Left cell | gap / min-width | `3px` / `0` |
| Name line | display / align-items | `flex` / `center` |
| Name line | gap / min-width | `7px` / `0` |
| Thumb | flex / size | `none` / `22px × 31px` |
| Thumb | border-radius | `3px` |
| Thumb | border | `1px solid var(--border-dashed)` (the head's is `--border-strong`) |
| Thumb | background | card art (canvas placeholder `repeating-linear-gradient(135deg, var(--elevated) 0 3px, var(--border) 3px 6px)`) |
| Thumb | aria-hidden | `true` |
| Dot, free | flex / size / radius | `none` / `7px × 7px` / `50%` |
| Dot, free | background | `var(--success)` (solid) |
| Dot, to buy | flex / size / radius | `none` / `7px × 7px` / `50%` |
| Dot, to buy | border | `1px dashed var(--fg-faint)` |
| Dot | aria-hidden | `true` |
| Name | content | the stand-in's display name |
| Name | font-size / weight | `13px` / `600` |
| Name | color | `var(--fg)` |
| Name | border-bottom | `1px dotted var(--accent)` |
| Name | min-width / overflow / text-overflow / white-space | `0` / `hidden` / `ellipsis` / `nowrap` |
| Name | behaviour | opens the card stacked (PR 4b) |
| Availability marker | condition | the free copy is soft-held (a brew claims it) |
| Availability marker | component | the shipped availability marker; its label is the shipped availability copy (`in 1 brew`) |
| Marker wrapper | flex / display / align-items / gap | `none` / `inline-flex` / `center` / `6px` |
| Marker diamond | size / transform | `6px × 6px` / `rotate(45deg)` |
| Marker diamond | border | `1.5px solid var(--avail-soft)` |
| Marker label | font-family / size | mono / `10.5px` |
| Marker label | color / white-space | `var(--fg-body)` / `nowrap` |
| Facts line | padding-left | `43px` (thumb 22 + gap 7 + dot 7 + gap 7: the name's left edge) |
| Facts line | font-family / size / line-height | mono / `10.5px` / `1.45` |
| Facts line | color | `var(--fg-muted)` |
| Facts line | text-wrap | `pretty` |
| Facts line | font-style | `italic` only when the drawback is unnamed |

### 5.3 Facts line content, by kind

Clauses are joined by ` · ` in the component; no clause is a score and no figure is combined.

| Kind | Keys, in order | Arguments |
|---|---|---|
| Land (colors) | one named drawback: `sheet.drawback.entersTapped` · `entersTappedUnless(cond)` · `damage(n, colors)` · `life(n, colors)` | `colors` = the colors the original makes |
| Land, unnamed drawback | `sheet.drawback.unnamed` (italic) | none |
| Land, what it gives up (H3) | the stand-in's give-up clause for a utility original (e.g. Cavern of Souls: uncounterable creatures). **No key exists; owed to /copy-review.** Never `sheet.givesUpNothing` unless true | the original's non-mana ability, named |
| Fetch | `sheet.drawback.basicOnly` · then `entersTapped` / `entersTappedUnless(cond)` / `lifeFetch(n)` | |
| Spell, listed | role · `sheet.mv(n)`; no figure since v2 PR B (Hugh's Q2: the % is dropped and synergy orders silently) | |
| Spell, unlisted | role · `sheet.mv(n)` (no figure) | |
| Foil-only stand-in (F6) | as its kind; the price cell draws BuyTag's foil figure | |

### 5.4 Price cell

| Property | Desktop | Phone |
|---|---|---|
| display | `flex` | `flex` |
| justify-content | `flex-end` | not set (left) |
| padding-left | not set | `43px` |
| Content, to buy | BuyTag row plate (§5.4.1) | same |
| Content, free | `free` plate (§5.4.2) | same |

#### 5.4.1 Buy tag (stand-in)

| Property | Value |
|---|---|
| font-family / size | mono / `9.5px` |
| border-radius / padding | `4px` / `1px 5px` |
| color / background | `var(--warning)` / `color-mix(in oklab, var(--warning) 13%, transparent)` |
| white-space | `nowrap` |
| Separator | `·` in `var(--border-strong)`, padding `0 3px` |
| Figure | `var(--fg-body)`, `formatCents` of the drawn price (no ring: a stand-in is never over) |

#### 5.4.2 Free plate

| Property | Value |
|---|---|
| key | `sheet.free` |
| font-family / size | mono / `9.5px` |
| border-radius / padding | `4px` / `1px 6px` |
| color / background | `var(--success)` / `color-mix(in oklab, var(--success) 13%, transparent)` |

### 5.5 Take cell (PR 4b; its outcomes are in `swap-tools-take.md`)

| Property | Desktop | Phone |
|---|---|---|
| Cell display / justify-content | `flex` / `flex-end` | `flex` / `flex-end` |
| Button key | `sheet.take`; aria `sheet.takeAria(add, cut)` | same |
| Button skin | Apply's exact skin | same |
| display / align-items | `inline-flex` / `center` | `flex` / `center`, justify `center` |
| width × height | auto (from padding) | `72px × 44px` |
| border-radius | `7px` | `8px` |
| padding | `6px 13px` | not set |
| font-size / weight | `12.5px` / `600` | `13px` / `600` |
| color | `var(--accent)` | same |
| border | `1px solid var(--accent)` | same |
| background | none | none |
| Condition | present on every live row in 4a (`canTake` is false only in the taken state, PR 4b) | same |

---

## 6 · Sentence (no role, nothing cheaper, sold-out with no free copy)

| Property | Value |
|---|---|
| Condition | kinds `norole`, `nothing`, and the F5 sold-out empty case; groups, lead and foot are absent |
| margin | `0` |
| padding-top | `12px` |
| border-top | `1px solid var(--border)` |
| font-size / line-height | `13px` / `1.6` |
| color | `var(--fg-body)` |
| text-wrap | `pretty` |
| Key, no-role spell | `sheet.noRole(name)` |
| Key, no-role land (no color and no fetch) | `sheet.noRoleLand(name)` |
| Key, nothing cheaper (spell) | `sheet.nothingCheaper(roles, mv, commander, price)`; price = the original's drawn figure |
| Key, nothing cheaper (land) | `sheet.nothingCheaperLand(colors, price)` |
| Key, sold-out original with no free copy (F5) | a new price-free sentence (owed to /copy-review): `nothingCheaper*` cite a price the row cannot draw |

---

## 7 · Loading

| Element | Property | Value (both widths) |
|---|---|---|
| Container | role | `status` |
| Container | display / flex-direction / align-items / justify-content | `flex` / `column` / `center` / `center` |
| Container | text-align | `center` |
| Container | min-height | `250px` |
| Container | padding | `28px 20px` |
| Container | border-radius | `10px` |
| Container | background | `radial-gradient(420px 220px at 50% 70%, color-mix(in oklab, var(--accent) 8%, transparent), transparent 70%)` |
| Crown | component | the shipped `LoadingScreen` crown (F15) |
| Crown | wrapper | `display: flex`, `align-items: center`, `gap: 9px`, `height: 16px`, aria-hidden |
| Crown | diamonds | three boxes `8px`, `11px`, `8px` square, `transform: rotate(45deg)`, background `var(--accent-strong)` |
| Crown | animation | `dots 1.2s ease-in-out infinite`, delay `0s / 0.2s / 0.4s`; `dots` = opacity `0.25 → 1 → 0.25`; class `anim-dots` |
| Crown | reduced motion | `animation: none` under `prefers-reduced-motion: reduce` |
| Heading `h3` | key | `sheet.loadingHeading` |
| Heading | margin / width | `20px 0 0` / `100%` |
| Heading | font-family / weight / size / line-height | `--display` / `700` / `18px` / `1.25` |
| Heading | color / text-wrap | `var(--fg)` / `balance` |
| Status `p` | key | land `sheet.loadingLands(colors)`, fetch `sheet.loadingFetch(types)`, spell `sheet.loadingSpells(roles)` |
| Status | margin | `8px 0 0` |
| Status | font-family / size / color | mono / `12px` / `var(--fg-faint)` |
| Lead, groups, foot | condition | absent |

## 8 · Failed

| Element | Property | Value (both widths unless split) |
|---|---|---|
| Container | role | `alert` |
| Container | display / flex-direction / align-items / text-align | `flex` / `column` / `center` / `center` |
| Container | padding | `30px 20px 26px` |
| Container | border-radius / border | `10px` / `1px solid var(--border)` |
| Container | background | `var(--surface)` |
| Crown | diamonds | as §7, still (no animation), background `var(--border-strong)` |
| Tag | key | `sheet.failed.tag` |
| Tag | margin-top | `18px` |
| Tag | font-family / size / letter-spacing / transform | mono / `9.5px` / `0.12em` / `uppercase` |
| Tag | color | `var(--danger)` |
| Heading `h3` | key | `sheet.failed.heading` |
| Heading | margin / width | `8px 0 0` / `100%` |
| Heading | font-family / weight / size / line-height / color / wrap | `--display` / `700` / `18px` / `1.25` / `var(--fg)` / `balance` |
| Body | key | `sheet.failed.body` |
| Body | margin / max-width | `10px 0 0` / `420px` |
| Body | font-size / line-height / color / wrap | `13px` / `1.55` / `var(--fg-body)` / `pretty` |
| Kept line | key | `sheet.failed.kept(cut)`; cut = the original's name |
| Kept line | margin / max-width | `8px 0 0` / `420px` |
| Kept line | font-size / line-height / color / wrap | `12.5px` / `1.55` / `var(--fg-muted)` / `pretty` |
| Try again | key | `sheet.retry` |
| Try again | skin | Apply's skin (the Take button of §5.5) with `width: auto`, `margin-top: 18px` |
| Try again | padding | desktop `7px 16px`; phone `0 18px` (height `44px`, radius `8px`) |
| Try again | line-height | `1` (the addendum's revised sheet makes every control a real `<button>` with `lineHeight: 1`; desktop 28.5px tall) |
| Lead, groups, foot | condition | absent |

## 9 · Foot

| Property | Value |
|---|---|
| Condition | a list renders; absent in loading, failed, no role, nothing cheaper |
| key | `sheet.foot(when)`; when = the price feed's relative age |
| font-family / size / line-height | mono / `9.5px` / `1.5` |
| color | `var(--fg-locked)` |

---

## 10 · The row's ⇄ (Shopping `DecklistRow`)

### 10.1 ⇄ trigger

| Property | Desktop | Phone |
|---|---|---|
| Condition | the row is over the limit (drawn price > limit). Under-limit rows draw none (R2); a sold-out or unpriced row is never over (F5) | same |
| Position | after the buy tag, before the ✕ | same |
| Glyph | `⇄` | same |
| aria-label key | `row.swapOverAria(name, figure)` (figure = the limit, `$10`) | same |
| flex | `none` | `none` |
| display / align-items / justify-content | `flex` / `center` / `center` | same |
| width × height | `22px × 20px` | `44px × 44px` |
| border-radius | `6px` | `6px` |
| font-family / size / line-height | mono / `13px` / `1` | same |
| color | `var(--warning)` | same |
| margin-right | not set | `-9px` (the pair keeps the ✕'s right edge) |
| Action | opens the Stand-ins sheet for that row | same |

### 10.2 Reserved slot (row under the limit)

| Property | Desktop | Phone |
|---|---|---|
| Condition | row not over | **not rendered**; the 44px goes back to the name |
| Element | empty `span`, aria-hidden | none |
| flex / width | `none` / `22px` | none |

Context the slot sits in (shipped, unchanged): row shell gap `10px` desktop / `9px` phone; ✕ in
`var(--border-dashed)`, 13px, auto-sized on desktop, `44×44` on the phone.

### 10.3 Key line entry (under the limit line)

| Property | Value |
|---|---|
| Glyph span | `⇄` in `var(--warning)` |
| Text key | `limit.key`, drawn after the glyph and a space |
| font-family / size / line-height | mono / `10px` / `1.5` |
| color | `var(--fg-faint)` |
| Placement | under the limit line's row, in the limit block (flex column, gap `4px` desktop / `0` phone) |

---

## 11 · Hover and focus

### 11.1 ⇄ hover
Not drawn. The README R1 rule ("lifting on hover like the ✕") applied to the under-limit `--border-dashed`
ink, which R2 removed. An over-limit ⇄ stays `var(--warning)`; the design sets no hover change.

### 11.2 Stand-in name and thumb hover
The shipped hover preview on a fine pointer (R2). PR 4b; nothing drawn for 4a.

### 11.3 Take hover
Apply's shipped skin, unchanged. The canvas draws no hover.

### 11.4 Close × hover
Not drawn.

### 11.5 Focus
No focus state is drawn anywhere in scope; shipped focus rings apply.

---

## 12 · Mobile vs desktop summary

| Part | Desktop | Phone |
|---|---|---|
| Sheet | 640, centred, 60px from top, all-side border, 14 radius, shadow | from 52px, top border only, `14 14 0 0` radius |
| Header | padding `14px 18px`, gap 10 | 43px tall, padding `0 6px 0 16px`, gap 9 |
| Body | padding `16 18 18`, gap 14 | padding `14 16 24`, gap 12 |
| Row grid | `1fr 96px 64px`, gap 12, padding `9px 0` | `1fr 72px`, gaps 10 / 6, padding `10px 0` |
| Price | column 2, right-aligned | row 2 under the facts, indent 43 |
| Take | inline, `6px 13px`, 12.5, radius 7 | `72×44`, 13, radius 8, spans both rows |
| Try again | `7px 16px` | 44 tall, `0 18px` |
| ⇄ | 22×20 | 44×44, margin-right −9 |
| Under-limit slot | empty 22px | none |

---

## State Coverage

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Lands | original is a land with colors; stand-ins found | head plate, `leadLands`, `groupFree` + `groupCheapest`, rows with drawback facts, foot | deck name, original (name, price, over, colors, own drawback), rows (name, price or free, drawback kind + args, soft-held marker), `when` |
| Land, unnamed drawback | classifier returns "unnamed" for a stand-in | row facts `drawback.unnamed`, italic | `unnamed: true` |
| Land, utility original (H3) | the original's text does more than make its colors | as Lands; each stand-in's facts add what it gives up | the original's named non-mana ability (new key) |
| Fetch | original is a fetch land; stand-ins found by land types | head `jobFinds` + drawback, `leadFetch`, `groupFree` + `groupCheapest`, rows with `basicOnly` + drawback | types, `basicOnly`, entered-tapped / life drawbacks |
| Spells | original has a role; stand-ins at MV ≤ original's, same role | head `jobRole`, `leadSpells`, `groupFree`, `groupByCommander`, `groupUnlisted`, rows with role · MV and no figure; listed rows run by synergy, never drawn (v2 PR B) | roles, mv, commander short name |
| Partner deck | spells kind, deck led by a pair | as Spells, `commander` = `A + B`, ordered by the pair's synergy from pair support | pair name |
| Partner, pair not indexed (F14) | pair has no support rows; every row unlisted | lead without its second clause (new key), `groupUnlisted` only | pair name |
| No role (spell) | original has no role | head `jobNoRole`, sentence `noRole(name)`; no lead, groups, foot | name |
| No role (land) | land with no color and no fetch | sentence `noRoleLand(name)` | name |
| Nothing cheaper (spell) | no same-role card at MV ≤ is cheaper, and no free copy | sentence `nothingCheaper(roles, mv, commander, price)` | roles, mv, commander, original price |
| Nothing cheaper (land) | no land making those colors is cheaper, and no free copy | sentence `nothingCheaperLand(colors, price)` | colors, original price |
| Sold-out original (F5) | original's price state is sold out: never over, reached from the card modal | head with sold-out BuyTag and no over text; new free-only lead; `groupFree` only; foot | free stand-ins only |
| Sold-out, no free copy (F5) | as above, no free stand-in | new price-free sentence | name, job |
| Loading | payload not yet read | head plate, loading block (crown, `loadingHeading`, `loadingLands/Fetch/Spells`) | kind + colors / types / roles for the status |
| Failed | payload read threw | head plate, failed block, Try again | original name (`kept`) |
| ⇄ over | Shopping row's drawn price > limit | ⇄ trigger, `--warning` | name, limit figure |
| ⇄ under (desktop) | row not over, width ≥ 768 | empty 22px slot | none |
| ⇄ under (phone) | row not over, width < 768 | nothing | none |
| Key line | the limit line renders (Shopping, non-empty list) | `⇄` + `limit.key` | none |
