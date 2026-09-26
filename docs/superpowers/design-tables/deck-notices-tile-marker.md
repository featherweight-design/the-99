# Design table — deck notices, the tile's notice mark (addendum)

**Sources (design only):**
- `design/design_handoff_the99_deck_notices/addendum-tile-marker/README.md` (README)
- `…/addendum-tile-marker/READINESS.md` (AR)
- `…/READINESS-audit.md` § "Addendum: the tile's notice marker" — findings F19–F24, Hugh's rulings H7, H8 (RA)
- `…/addendum-tile-marker/Tile Marker.dc.html` (frame, TM)
- `…/addendum-tile-marker/The 99 - Tile Marker Addendum.dc.html` (canvas, CV)
- `…/addendum-tile-marker/tile-marker · copy strings.ts` (copy, `tileMarkerCopy`)

**Scope:** the /decks tile's notice mark, the mark's link, its tooltip, the yield, and the /decks key. The deck
header appears only where the addendum states what it keeps. Amends parent `HANDOFF.md` §1 and §1a **for the
tile only** (README). No About entry (README; RA "About entry: none new").

**Width convention.** Mobile = below `md` (the canvas draws it at 390 viewport, 358 cell). Desktop = from `md`
(the canvas draws 1300 viewport, 340 cells). In the frame, `desk` switches exactly the values marked here.

**Amendments applied over the README:**

| Ref | What it changes |
|---|---|
| **H7** | Two inks, as drawn: `--danger` for not legal, `--fact` for a data change. One mark only. (Ratifies README §1 "Hugh to confirm"; the key keeps two entries.) |
| **H8** | A legality mark stays red until the deck is legal again, with no read look on the tile. The header keeps read vs unread. |
| **F19** | Supersedes README §2's `router.push` forwarding. The lifted mark wrapper is **a second `Link` to the same href**, `tabIndex={-1}`, `aria-hidden`, so cmd-click / middle-click behave as the tile does and nothing enters the tab order. |
| **F20** | `NoticeSummary` returns the unread data count beside a legality kind; the spoken name and the *both* tooltip are built from both parts with existing strings. |
| **F21** | The key is an `<li>` spanning the grid (`col-span-full`), carrying its region label, and not a bare `div` inside the `<ul>`. |
| **F22** | Re-run `probe:notices-tile` with the mark. Delete both `YIELD` bands and the `face={false}` branch only if both widths land ≤ 330; the probe reads the band from the shipped classes so it changes with them. |
| **F23** | Both inks' glyph on their own tints tested at ≥ 3:1 in `status-style.test.ts`, every theme. |
| **F24** | Six new strings (three tooltip sentences, two key words, the region label) go to `/copy-review`. |

---

## 1 · The mark (`NoticeTag` on the tile → `NoticeMark`)

### 1.1 Placement

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Slot | the tag's slot, unchanged: after `BracketChip`; after `StatusPillBadge` when there is no chip | same | README §1; CV §1 |
| Container | the chips row `data-deck-chips` | same | TM |
| Gap before the mark | 8px (the chips row's `gap`) | 8px | README §1; TM `chipsRow.gap: 8` |
| Vertical | centred in the chips row (`align-items: center`) | same | README §1; TM |
| Chips row height | 22px | 24px | TM `H = desk ? 24 : 22` |
| Adds to row height | — (fits inside the row) | — | README §5; CV §4 |
| Count per tile | one, never two | one | README §1 "Both"; H7 |
| `flex` | `none` | `none` | TM `marker.flex` |
| Data hook (canvas) | `data-notice-marker="notLegal"` \| `"unread"` | same | TM `markerKind` |

### 1.2 Box

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| `display` | `flex` | `flex` | TM |
| `align-items` / `justify-content` | `center` / `center` | same | TM |
| `width` × `height` | 18px × 18px | 18px × 18px | README §1; TM |
| `border-radius` | `50%` (a circle, where every chip and pill is radius 6) | same | TM; CV §1 |
| `box-sizing` | `border-box` | same | TM |
| `border` | `1px solid color-mix(in oklab, var(<ink>) 70%, transparent)` | same | TM; README §1 "1px hairline of the ink at 70%" |
| `background` | `color-mix(in oklab, var(<ink>) 14%, var(--surface-inset))` (the parent's H5 treatment) | same | TM; README §1 |
| `color` | `var(<ink>)` | same | TM |
| `outline` (resting) | `none` | `none` | TM |
| `outline` (tooltip open, canvas only) | — | `2px solid color-mix(in oklab, var(<ink>) 35%, transparent)`, `outline-offset: 2px` | TM `p.tip` — drawn to show which mark owns the open bubble; not specified as a shipped hover state anywhere in prose |

### 1.3 Glyph

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Content | `!` (literal glyph, no copy key) | same | TM; README §1 |
| `font-family` | IBM Plex Mono → `var(--font-plex-mono)` (canvas: `'IBM Plex Mono',monospace`) | same | TM |
| `font-weight` | 600 | 600 | TM; README §1 |
| `font-size` | 12px | 12px | TM; README §1 |
| `line-height` | 1 | 1 | TM |
| `letter-spacing` | — | — | not specified |
| Contrast bar | graphic, 3:1; measured 3.5:1 on its tint | same | README §1; CV §1; F23 |

### 1.4 Ink selection (conditional)

| Notice state on the deck | Ink `<ink>` | Mark drawn | Source |
|---|---|---|---|
| No notices / none unread and no legality entry | — | **nothing** | README §1; CV 1a "none" |
| Legality entry standing, **unread** | `--danger` | yes | README §1; H7 |
| Legality entry standing, **read** | `--danger` | yes — same red mark, no read/dot distinction on the tile | README §1 "Read legality"; H8 |
| Unread data notices only | `--fact` | yes | README §1; H7 |
| Read data notices only | — | **nothing**, as today | README §1 "Read data" |
| Legality (read or unread) **and** unread data | `--danger` | ONE mark, never two | README §1 "Both"; H7 |
| Legality, no bracket chip (no analysis) | `--danger` | yes, placed after the status pill | CV 1a "noChip" |

### 1.5 The mark's link (hover target; F19 over README §2)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Problem | the tile `<Link>` overlays the footer (`absolute inset-0`, last in DOM), so the mark gets no pointer | same | README §2; F19 |
| Wrapper stacking | lifted above the overlay: `relative z-10` | same | README §2 |
| Wrapper element | a second `Link` to the same deck, with `?notices=1` (`noticesHref`) | same | F19 (supersedes README's `router.push`); Hugh's staging walk, 2026-09-26 |
| `tabIndex` | `-1` | `-1` | F19 |
| `aria-hidden` | `true` | `true` | F19 |
| `role` | — (none added) | — | README §2 "no role"; CV §5 "Mark" |
| Focus stop | — (none) | — | CV §2, §5 |
| Click / tap | opens the deck WITH its Notices sheet open, on a cold load and on client navigation; the deck page strips the parameter with `history.replaceState` once it has opened, so a refresh lands on the deck alone. Cmd-click and middle-click still open a new tab | same | CV §2; F19; Hugh's staging walk, 2026-09-26 (the mark used to land on the deck with no word of its notices) |
| Hover | — (no tooltip; tooltip is pointer-fine only) | opens the tooltip (§2) | README §2 |
| Hover visual on the mark | not specified | not specified (see §1.2 canvas outline note) | — |

### 1.6 The mark, accessibility

| Attribute | Value | Source |
|---|---|---|
| Mark `aria-hidden` | `true` | TM; README §4; CV §5 |
| Mark role | — | CV §5 |
| Mark `tabIndex` | — on the glyph; the wrapping link is `-1` | F19 |
| Words | carried by the tile link's name (§4) | README §4 |

---

## 2 · Tooltip (desktop only)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Component | — (not drawn) | shipped `FactTooltip` with `sentence` | README §2; CV §2 |
| Pointer gate | — | pointer-fine only | README §2 |
| Open delay | — | 400ms | README §2; CV §2 |
| Portal | — | portalled | README §2 |
| Placement | — | above by default, 6px above the mark, centred on it, clamped 4px inside the box; flipped when there is no room (flip rules unchanged) | CV §2; TM `place()` |
| Boxes per mark | — | one; *both* is one sentence naming both counts | README §2 |
| `aria-hidden` | — | `true` | README §2; CV §5 |
| `width` | — | `max-content` | TM `bubble` |
| `max-width` | — | 220px | TM |
| `box-sizing` | — | `border-box` | TM |
| `padding` | — | 6px 9px | TM |
| `border-radius` | — | 7px | TM |
| `background` | — | `var(--elevated)` | TM; CV §2 |
| `border` | — | `1px solid var(--border)` | TM |
| `color` | — | `var(--fg-body)` | TM |
| `font-family` | — | IBM Plex Sans → `var(--font-plex-sans)` | TM |
| `font-size` | — | 11.5px | TM; CV §2 |
| `line-height` | — | 1.45 | TM |
| `font-weight` / `letter-spacing` | — | not specified | — |
| `box-shadow` | — | `0 4px 14px color-mix(in srgb, var(--bg) 70%, transparent)` | TM |
| `z-index` | — | 5 (canvas) | TM |
| Test hook (canvas) | — | `data-testid="notice-tooltip"`, `data-side="above"` | TM |

Note: every tooltip property above is the shipped `FactTooltip`'s own; the addendum changes none of them and
passes only `sentence`.

### 2.1 Tooltip copy (structure only)

| Mark state | Key | Arguments | Source |
|---|---|---|---|
| Not legal (read or unread), no unread data | `tileMarkerCopy.tooltip.notLegal` | `(n)` — count of cards not legal | copy; TM |
| Unread data only | `tileMarkerCopy.tooltip.unread` | `(n)` — count of unread notices | copy; TM |
| Both | `tileMarkerCopy.tooltip.both` | `(legal, data)` — not-legal card count, unread notice count | copy; TM; F20 |

---

## 3 · The key on /decks (`DecksMarkKey`)

### 3.1 Mount

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Component | existing `MarkKey`, new mount `DecksMarkKey` | same | README §3 |
| Position | first item of the tile list: first child of the phone's flex column, above the first tile | first item of the `sm:grid-cols-3` grid, above the first row | README §3; CV §3 |
| Element | `<li>` inside the tile `<ul>` | `<li>` inside the tile `<ul>` | F21 |
| Span | full width | `col-span-full` (canvas: `grid-column: 1 / -1`) | README §3; CV; F21 |
| Drawn at this width | yes | yes | README §3; CV §3 "Drawn at 1300 too" |
| Canvas list gap to first tile | 12px (column `gap`) | 14px (grid `gap`) | CV §3 frames (the list's own existing gaps) |
| Data hook (canvas) | `data-mark-key="true"` | same | CV |

### 3.2 Key line

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| `role` | `group` | `group` | CV; CV §5 "Key" |
| `aria-label` | `tileMarkerCopy.key.regionAria` | same | copy; README §3 |
| `display` | `flex` | `flex` | CV |
| `flex-wrap` | `wrap` | `wrap` | CV |
| `align-items` | `center` | `center` | CV |
| `gap` | `6px 12px` (row, column) | `6px 12px` | CV |
| `font-family` | IBM Plex Mono → `var(--font-plex-mono)` | same | CV |
| `font-size` | 10px | 10.5px | CV; CV §3 "mono 10 / 10.5" |
| `color` | `var(--fg-faint)` | `var(--fg-faint)` | CV |
| `font-weight` / `line-height` / `letter-spacing` | not specified | not specified | — |

### 3.3 Key entry

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| `display` | `inline-flex` | `inline-flex` | CV |
| `align-items` | `center` | `center` | CV |
| `gap` (sample → word) | 5px | 5px | CV |
| Order | not legal, then notices | same | CV; README §3 |

### 3.4 Key sample (the mark at 18px)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Element | the real mark at 18px, `aria-hidden="true"` | same | README §3; CV |
| Glyph | `!` | `!` | CV |
| `width` × `height` | 18px × 18px | same | CV `key()` |
| `border-radius` | `50%` | same | CV |
| `display` / `flex` / alignment | `flex`, `flex: none`, centred both axes | same | CV |
| `border` | `1px solid color-mix(in oklab, var(<ink>) 70%, transparent)` | same | CV |
| `background` | canvas: `color-mix(in oklab, var(<ink>) 14%, var(--bg))` — see note | same | CV `key()` |
| `color` | `var(<ink>)` | same | CV |
| `font-family` / `font-weight` / `font-size` / `line-height` | Plex Mono, 600, 12px, 1 | same | CV |
| Ink — not-legal entry | `--danger` | `--danger` | CV `keyRed`; README §3 |
| Ink — notices entry | `--fact` | `--fact` | CV `keyFact`; README §3 |

**Note (discrepancy in source):** the canvas key sample mixes its tint into `--bg` (the key sits on the page
background), where the tile mark mixes into `--surface-inset`. README §3 calls the sample "the real mark at
18px". Recorded as drawn; the implementer should confirm whether the sample reuses the tile mark unchanged
(tint into `--surface-inset`) or re-grounds the tint on `--bg`.

### 3.5 Key word

| Entry | Key | Mobile | Desktop | Source |
|---|---|---|---|---|
| Not legal | `tileMarkerCopy.key.notLegal` | inherits line: mono 10px `--fg-faint` | mono 10.5px `--fg-faint` | copy; CV |
| Data notices | `tileMarkerCopy.key.unread` | same | same | copy; CV |

### 3.6 Key conditional rendering

| Condition (computed from `shown`, not `decks`) | Rendered | Source |
|---|---|---|
| No tile in the current shelf and filter draws any mark | the whole key line is absent | README §3; AR eng 3 |
| At least one shown tile draws the red mark (any legality entry, read or unread, alone or with data) | the not-legal entry | README §3; H7/H8 |
| At least one shown tile draws the `--fact` mark (unread data, no legality) | the notices entry | README §3 |
| Both kinds of mark among shown tiles | both entries | README §3; CV §3 390 frame |
| A filter or shelf change hides every marked tile | the line disappears (re-evaluated from `shown`) | README §3; AR eng 3 |

Note: a *both* deck draws the red mark only, so on its own it adds only the not-legal entry.

---

## 4 · Spoken (the tile link's name)

| Property | Value | Source |
|---|---|---|
| Carrier | the tile link's accessible name (shipped `cardAria` + `noticeSpoken`) | README §4; CV §5 |
| Not legal | existing `tag.spoken.notLegal(n)` | copy header; CV §5 |
| Data | existing `tag.spoken.unread(n)` | copy header; CV §5 |
| Both (new) | `${spoken.notLegal(n)}, ${spoken.unread(m)}` — no new string | copy; README §4; F20 |
| Position in the name | after the bracket, before the `built / 99` count | CV §5 |
| Mark | `aria-hidden`, no role, no focus stop | CV §5 |
| Tooltip | `aria-hidden` | CV §5 |
| Key | `role="group"`, label `regionAria`; each sample `aria-hidden` so each entry is read once | CV §5 |
| Data dependency | `NoticeSummary` carries `dataUnread` beside a legality kind | README §4; AR eng 2; F20 |

---

## 5 · Footer and the yield

### 5.1 Footer (untouched, context for the mark)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Rows | chips 22 · bar 14 · detail 14 | chips 24 · bar 14 · detail 14 | README §5; TM |
| Row gap | 9px | 9px | README §5; TM |
| `padding` | 11px 13px 13px | 11px 13px 13px | TM; README §5 "11/13" |
| `height` | 92px | 94px | README §5; TM |
| `border-top` | `1px solid var(--border)` | same | TM |
| Chips row | `display:flex; flex-wrap:nowrap; align-items:center; gap:8px; flex:none; min-width:0` | same | TM |
| Tile height | 248 art + 92 | 248 art + 94 | CV rules "Footer" |
| Effect of the mark | none — fits inside the chips row | none | README §5; CV §4 |

### 5.2 The yield

| Property | Value | Source |
|---|---|---|
| Existing `YIELD` | two bands, sized for a word beside a range: `notLegal` 330–408 (`Not legal` chip, ≈90px), `data` 330–358 (`● 99`, ≈40px) | README §5; F22 |
| Mark width | 18px | README §5 |
| Live measurements (with the word) | 404.5 from `md`, 386.3 below, 354.3 beside `● 99` | README §5 |
| Design estimate with the mark | widest row ≈ 333px from `md`, ≈ 320px below | README §5; F22 |
| Band floor | 330 (row wraps under it anyway) | README §5 |
| Rule | re-run `probe:notices-tile` with the mark; if **both** widths land ≤ 330, delete `YIELD` (both bands) and the `face={false}` branch; otherwise keep one window at the measured width | README §5; F22 |
| Canvas outcome | widest row (Unresolved + range + mark) fits whole at 340 and 358; the range no longer drops its name at 358 | CV 1a, 1b |
| Probe coupling | the probe reads the band from the shipped classes and changes with them | F22 |

---

## 6 · The deck header (what it keeps)

| Property | Value | Source |
|---|---|---|
| Tag | keeps the full tag (the *Not legal* chip with its text) | README ruling; RA |
| Notices sheet | unchanged | README ruling; CV intro |
| Read vs unread | the header keeps the read/unread (dot) distinction the tile drops | README §1; H8 |
| Contrast bar | parent H5 (4.5:1 for the *Not legal* text) still applies to the header chip | F23 |

---

## 7 · Tile context the canvas draws (unchanged, for reference)

| Element | Mobile | Desktop | Source |
|---|---|---|---|
| Status pill height | 22px | 24px | TM |
| Status pill type | mono 10.5px, `letter-spacing: 0.06em` | same | TM |
| Bracket chip height | 22px | 24px | TM |
| Bracket chip font-size | 10px | 11px | TM |
| Count slot | 60px, mono 12.5px | 60px, mono 12px | TM |

---

## State coverage

| State | Triggering condition | Rendered | Key props |
|---|---|---|---|
| None | no legality entry; no unread data notices | no mark; chips row as today | — |
| Not legal, unread | ≥1 card not legal, entry unread | 18px mark, `--danger`, after chip | `markerKind="notLegal"`; tooltip `notLegal(n)`; spoken `tag.spoken.notLegal(n)` |
| Not legal, read | ≥1 card not legal, entry read | same red mark, no read look (H8) | as above |
| Data unread | unread data notices, no legality entry | 18px mark, `--fact` | `markerKind="unread"`; tooltip `unread(n)`; spoken `tag.spoken.unread(n)` |
| Data read | data notices all read, no legality entry | nothing | — |
| Both | legality entry (read or unread) and unread data | ONE mark, `--danger` | `markerKind="notLegal"`; tooltip `both(legal, data)`; spoken both parts joined `", "` |
| No chip | no analysis (no bracket chip) plus a mark state | mark directly after the status pill, gap 8 | as the mark state |
| Widest row | Unresolved pill + a range chip + the mark | fits whole at 340 (desktop) and 358 (mobile) | range chip + mark |
| Tooltip open | desktop, fine pointer, hover 400ms on the mark | `FactTooltip` above the mark, centred, clamped | `sentence` per state |
| Mark pressed | click / tap / cmd-click / middle-click on the mark | opens the deck as the tile link does | second `Link`, same href, `tabIndex -1`, `aria-hidden` (F19) |
| Key: absent | no shown tile draws a mark | no key `<li>` | computed from `shown` |
| Key: not-legal only | shown tiles draw only the red mark | one entry, red sample | `key.notLegal` |
| Key: notices only | shown tiles draw only the `--fact` mark | one entry, `--fact` sample | `key.unread` |
| Key: both entries | shown tiles draw both marks | two entries, not legal first | `key.notLegal`, `key.unread` |
| Key: filter hides marked tiles | shelf/filter leaves no marked tile shown | the line disappears | re-evaluated from `shown` |
