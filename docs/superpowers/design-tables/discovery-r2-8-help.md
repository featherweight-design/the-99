# Discovery R2·8 · the ? and its panel and sheet (HelpSheet) · property table

Enumerated from the design files only (no `src/`):

- `design/design_handoff_the99_discovery_onboarding/design-tables/discovery-r2.md` (§The ? in the chrome, §The ? panel and sheet (`HelpSheet`); §A tool card's Halo, for comparison)
- `.../design-tables/discovery.md` (R1's halo, row "Halo on the control")
- `.../README-r2.md` (C4, C6, E8 screens table, G15, G16, G17, G21)
- `.../STATES-showcase-reference.md` (§Try it, §The ? panel (1280) and sheet (390))
- `.../READINESS-r2.md` (E8, E12, E13)
- `.../r2/HelpSheet.dc.html` (the part, `mode` desk / phone), `.../r2/Rail.dc.html` (`help` none / shown / open), `.../r2/MobileHeader.dc.html` (`help` none / shown / open), `.../r2/PhoneShot.dc.html` (scrim, sheet placement, Show me halo), `.../r2/Help-Deck.dc.html` (H1), `.../r2/Help-Shopping.dc.html` (H2), `.../r2/Help-Collection.dc.html` (H3), `.../r2/Links.dc.html` (L1 the ?'s ends, L2 dead ends)
- `.../discovery-r2 · copy strings.ts` (`helpPanelCopy` key names only)
- Binding readiness resolutions: `docs/superpowers/readiness/discovery-r2.md` gap 6 (the panel fetches the reader's `visibleEntries` on first open, and on intent at 1280; search runs over that payload; a caption line hidden by `captionLineSwitches` never matches), gap 7 (Show me only for an entry whose control is registered in R1's anchor registry and in view), gap 15 (the ? sits ABOVE `OfflinePill`; drawn 6px gap and box unchanged; from `md` up to 1279 the rail and panel behave as at 1280), gap 17 (states described but not drawn are built from STATES/L2 words), and "R2 reuses R1's halo".

Out of scope: card details stacking and the ? over card details (R2·9, readiness gap 5), About's `helpHint` line beside the tabs (`aboutShapeCopy.helpHint`, the About page), the Reference itself (R2·6a), copy wording. Each copy row names the `helpPanelCopy` key that renders, not its text.

Token map: `#14110E` `--bg`, `#18140F` `--surface-sunken`, `#1A1611` `--surface-rail`, `#1E1A15` `--surface`, `#29241F` `--elevated`, `#2B241B` `--border`, `#3A3229` `--border-strong`, `#494037` `--border-dashed`, `#EDE6D8` `--fg`, `#C0B8A6` `--fg-body`, `#A59C89` `--fg-muted`, `#8B8270` `--fg-faint`, `#CF8745` `--accent`, `#6B482A` `--accent-dim`. Scrim `rgba(10,8,6,.62)`. Cinzel = `font-display`, IBM Plex Mono = `font-mono`, IBM Plex Sans = body.

**Conflicts settled in this table** (source wins in brackets):

- Show me's halo: `PhoneShot` draws `0 0 0 2px accent/75%, 0 0 0 6px accent/20%`, radius 9, no dim (the tool card picture's ring). README C4, STATES, H1's note and readiness all name **R1's halo**: `0 0 0 2px accent/60%, 0 0 0 6px accent/16%` on the control itself, no dim, no bubble (`discovery.md`, readiness "R2 reuses R1's halo").
- Section head's right slot: H1's board renders `moreHere(6)` (`+ 6 more on this tab`) because its frame is clipped at 758; H2 and H3 render `count(n)`. **`count(n)` always**; the list holds every entry and scrolls in the body (H1 note: the rest "scrolls into view in the same list"). `moreHere` is not rendered.
- The body's overflow: the part sets `overflow:hidden` (a static board). **The body scrolls** (`overflow-y:auto`) for the reason above.
- Elsewhere outside the deck: README C4 names Elsewhere only on the deck page; the part's Collection data draws `ELSEWHERE IN COLLECTION` chips, and readiness gap 5 relies on `Elsewhere in Collection` (copy key `elsewhere.collection`). **Collection carries Elsewhere chips too** (its other tabs, card details and Upload a file); the deck page carries `elsewhere.deck`.
- Chip pressed (not drawn): STATES says "the eyebrow names it", but the eyebrow is a fixed key (`eyebrow`). **The section head's label names the chosen tab (`here(view)`) and its count is that tab's**; the eyebrow and the title stay; the tab swapped out becomes a chip in its place.
- A tab whose visible entries are zero: not drawn. **Its chip is omitted** (L2: an entry behind an off switch is absent everywhere; a group left empty is not drawn).
- Collection · Cards rows: the part lists `card-detail` under Cards; E8 puts it under Card details (one screen per entry, G16). **E8 governs** which rows a screen lists; the board's rows are illustrative.
- A search result's destination: not stated. **The entry in the Reference**, as `Read the whole entry ›` (C6: "the ? leads to ... the entry"); results are `<a>` in the part.
- `See every entry →`: H3's note says it "opens the Reference with the search cleared"; L2 says it "clears the search". **It opens the Reference at the top with no query** (L1: "Reference, at the top · `All of About ›`, and `See every entry →`").
- The empty screen (G21, not drawn): the line sits **above the search**, with the search and the footer kept; no section head, rows or Elsewhere. No type values are drawn, so the table records placement and key only.
- Sheet shadow: the property table names none; the part draws `0 -20px 60px rgba(0,0,0,.55)` and a 1px `--border-strong` border with no bottom. **The part's values** are recorded.

---

## 1. The ? at 1280 (rail item)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 1 | Rail ? | Rendered | — (header press, §2) | yes, in the rail's column, `HELP_PANEL_ENABLED` on |
| 2 | Rail ? | Place | — | rail foot: `margin-top:auto`, above `OfflinePill` (gap 15), above the account button |
| 3 | Rail ? | Margin bottom | — | 6 |
| 4 | Rail ? | Element | — | `<button type="button">` |
| 5 | Rail ? | Box | — | 38 × 38, `border-radius:10px`, `border:0`, `padding:0` |
| 6 | Rail ? | Layout | — | flex, `align-items:center`, `justify-content:center` |
| 7 | Rail ? | Glyph | — | `?`, `font-mono` 16 / 500 |
| 8 | Rail ? | Rest | — | `background:transparent`, color `--fg-faint` |
| 9 | Rail ? | Open (pressed while panel open) | — | `background:--elevated`, color `--fg` |
| 10 | Rail ? | `aria-label` | — | `helpPanelCopy.button` |
| 11 | Rail ? | `aria-expanded` | — | `"true"` while open, `"false"` closed |
| 12 | Rail ? | Hover / focus | — | not drawn |
| 13 | Account button | Margin top | — | `0` with the ? present; `auto` with the ? absent |
| 14 | Rail ? | Widths `md`–1279 | — | as 1280 (gap 15) |

## 2. The ? at 390 (header press)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 15 | Header ? | Place | header right, in a flex row `align-items:center; gap:6px`, left of the account button | — |
| 16 | Header ? | Element | `<button type="button">` | — |
| 17 | Header ? | Box | 44 × 44, `border-radius:12px`, `border:0`, `padding:0` | — |
| 18 | Header ? | Layout | flex, `align-items:center`, `justify-content:center` | — |
| 19 | Header ? | Glyph | `?`, `font-mono` 17 / 500 | — |
| 20 | Header ? | Rest | `background:transparent`, color `--fg-muted` | — |
| 21 | Header ? | Open | `background:--elevated`, color `--fg` | — |
| 22 | Header ? | `aria-label` / `aria-expanded` | `helpPanelCopy.button`; `"true"` while open | — |
| 23 | Header ? | Scroll | not sticky; scrolls away with the header, as the account button does (G15) | — |
| 24 | Header ? | Hover / focus | not drawn | — |

## 3. Frame

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 25 | Frame | Element / role | `<section role="dialog">`, `aria-modal="true"`, `aria-label` `helpPanelCopy.button` | `<section role="dialog">`, `aria-modal="false"`, same label |
| 26 | Frame | Modal | yes, the shell's existing sheet behavior (E13) | no: the page stays usable |
| 27 | Frame | Placement | bottom of the viewport, `left:0; bottom:0` | right edge, top to bottom, over the page (the page is not reflowed) |
| 28 | Frame | Size | 390 × 684 | 400 wide × full viewport height |
| 29 | Frame | Layout | flex column, `box-sizing:border-box`, `overflow:hidden` | same |
| 30 | Frame | Background | `--surface-rail` | `--surface-rail` |
| 31 | Frame | Border | 1px `--border-strong` top / left / right, `border-bottom:0` | `border-left:1px solid --border-strong` only |
| 32 | Frame | Radius | `18px 18px 0 0` | — |
| 33 | Frame | Shadow | `0 -20px 60px rgba(0,0,0,.55)` | `-24px 0 60px rgba(0,0,0,.5)` |
| 34 | Frame | Font / color | IBM Plex Sans, `--fg` | same |
| 35 | Scrim | Rendered | yes, `position:absolute; inset:0` over the whole screen including the header, `rgba(10,8,6,.62)` | no |
| 36 | Grabber | Rendered | yes, first child, `aria-hidden` | no |
| 37 | Grabber | Box | 40 × 4, `border-radius:999px`, `--border-dashed`, `align-self:center` | — |
| 38 | Grabber | Margin | `8px 0 2px` | — |
| 39 | Frame | Focus | the shell's sheet behavior | moves into the panel on open; back to the ? on close (E13) |
| 40 | Frame | Close by | ✕, Esc, the ? again, leaving the page (H1); the scrim per the shell's sheet | ✕, Esc, the ? again, leaving the page (H1) |
| 41 | Frame | Data | fetched on first open (gap 6) | fetched on first open, and on intent (gap 6) |
| 42 | Frame | Widths `md`–1279 | — | as 1280 (gap 15) |

## 4. Head

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 43 | Head `<header>` | Layout | flex, `align-items:flex-start`, `justify-content:space-between`, gap 12 | same |
| 44 | Head | Padding | `10px 16px 12px` | `22px 20px 14px` |
| 45 | Eyebrow | Copy key | `helpPanelCopy.eyebrow`, uppercase | same |
| 46 | Eyebrow | Type | `font-mono` 11, `letter-spacing:.12em`, `--fg-faint` | same |
| 47 | Title `h2` | Copy key | `helpPanelCopy.screenName(screen, view)` (e.g. deck page on Shopping: screen + ` · ` + view) | same |
| 48 | Title `h2` | Type | `font-display` 20 / 600, `--fg` | same |
| 49 | Title `h2` | Margin | `6px 0 0` | same |
| 50 | Close | Element | `<button type="button">`, `aria-label` `helpPanelCopy.close`, glyph `✕` | same |
| 51 | Close | Box | 44 × 44, `flex:none`, `margin:-8px -12px 0 0`, no background, `border:0` | same |
| 52 | Close | Type / color | 20, `line-height:1`, `--fg-muted` | same |

## 5. Search

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 53 | Search wrapper | Padding | `0 16px 12px` | `0 20px 12px` |
| 54 | Search `label` | Layout | flex, `align-items:center`, gap 10 | same |
| 55 | Search `label` | Box | height 44, `padding:0 12px`, `border-radius:10px`, `box-sizing:border-box` | same |
| 56 | Search `label` | Background | `--surface-sunken` | same |
| 57 | Search `label` | Border | 1px `--border-strong`; 1px `--accent` while the field holds text | same |
| 58 | Search icon | SVG | 16 × 16, `viewBox="0 0 20 20"`, `fill:none`, stroke `--fg-faint`, `stroke-width:1.6`, `circle cx=8.5 cy=8.5 r=5.5`, `path d="M13 13l4.5 4.5"`, `aria-hidden` | same |
| 59 | Input | Element | `<input type="search">`, placeholder and `aria-label` `helpPanelCopy.search` | same |
| 60 | Input | Box | `flex:1; min-width:0`, no background, `border:0`, `outline:none` | same |
| 61 | Input | Type | IBM Plex Sans 15, `--fg` | same |
| 62 | Clear | Rendered | only while the field holds text | same |
| 63 | Clear | Element | `<button type="button">`, `aria-label` `helpPanelCopy.clear`, glyph `✕` | same |
| 64 | Clear | Box / type | 28 × 28, no background, `border:0`, 14, `--fg-faint` | same |
| 65 | Search | Scope | every visible entry's title, caption and keys on every screen, client side over the fetched payload; the same search as the Reference (E12, G17, gap 6) | same |
| 66 | Search | Effect | with text, the list (section head, rows, Elsewhere) is replaced by results (§10) or none (§11) | same |

## 6. Body and section head

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 67 | Body | Box | `flex:1; min-height:0`, `padding:0 16px`, scrolls (`overflow-y:auto`) | `padding:0 20px`, same |
| 68 | Section head | Layout | flex, `align-items:baseline`, `justify-content:space-between` | same |
| 69 | Section head | Padding / border | `6px 0 8px`, `border-bottom:1px solid --border` | same |
| 70 | Section head label | Copy key | `helpPanelCopy.here(view)`, uppercase | same |
| 71 | Section head label | Type | `font-mono` 11, `letter-spacing:.12em`, `--fg-muted` | same |
| 72 | Section head count | Copy key | `helpPanelCopy.count(n)`, n = this screen's (or tab's) visible entries | same |
| 73 | Section head count | Type | `font-mono` 11, `--fg-faint` | same |
| 74 | List | Which entries | entries whose `screen` is this one and, on the deck page, whose `view` is the tab or view in view (E8), filtered by `visibleEntries` | same |

## 7. Row (closed)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 75 | Row box | Padding / border | `padding:12px 0`, `border-bottom:1px solid --border` | same |
| 76 | Row inner | Layout | flex, `align-items:flex-start`, gap 10 | same |
| 77 | Row press | Element | `<button type="button">`, `aria-expanded="false"` | same |
| 78 | Row press | Box | `flex:1; min-width:0`, `text-align:left`, no background, `border:0`, `padding:0`, `font:inherit`, `color:inherit` | same |
| 79 | Row title | Content | the entry's title | same |
| 80 | Row title | Type | `display:block`, IBM Plex Sans 14.5 / 500, `line-height:1.35`, `--fg` | same |
| 81 | Row sentence | Content | the caption's first sentence | same |
| 82 | Row sentence | Type | `display:block`, `margin-top:3px`, 13 / 1.45, `--fg-muted` | same |
| 83 | Row press | Action | opens the row in place; any other open row closes (one open at a time) | same |

## 8. Row (open)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 84 | Open row box | Fill | `background:--surface` (padding-box) | same |
| 85 | Open row box | Inset | `margin:0 -12px`, `padding:12px 12px 14px`, `border-radius:10px`, `border-bottom-color:transparent` | same |
| 86 | Row press | `aria-expanded` | `"true"` | same |
| 87 | Open body | Layout | `margin-top:10px`, flex column, gap 8 | same |
| 88 | Paragraph `p` | Content | the rest of the caption's first paragraph | same |
| 89 | Paragraph `p` | Type | `margin:0`, 13.5 / 1.55, `--fg-body` | same |
| 90 | Key line | Count | up to two of the entry's keys (0, 1 or 2) | same |
| 91 | Key line | Layout | flex, gap 8 | same |
| 92 | Key line | Type | 13 / 1.5, `--fg-body` | same |
| 93 | Key dot | Glyph / color | `·`, `--accent` | same |
| 94 | Read the whole entry | Element | `<a>`, copy key `helpPanelCopy.readWhole` | same |
| 95 | Read the whole entry | Box / type | `align-self:flex-start`, `padding:4px 0`, `font-mono` 12, `--accent`, no underline | same |
| 96 | Read the whole entry | Target | the entry in the Reference (H1 note; L1) | same |

## 9. Show me

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 97 | Show me | Rendered | only when the entry's control is registered (R1's anchor registry) and on screen now (C4, gap 7); in the row's inner flex, right of the press, open or closed | same |
| 98 | Show me | Element | `<button type="button">`, copy key `helpPanelCopy.showMe` | same |
| 99 | Show me | Box | `flex:none`, height 30, `padding:0 10px`, `border:1px solid --border-strong`, `border-radius:999px`, no background | same |
| 100 | Show me | Type | `font-mono` 11.5, `--accent`, `white-space:nowrap` | same |
| 101 | Show me | Action | closes the panel first, scrolls the control into view, R1's halo for 2.4s, no bubble; never presses the control | same |
| 102 | Halo | Value | `0 0 0 2px color-mix(--accent 60%), 0 0 0 6px color-mix(--accent 16%)` as box-shadow on the control, no dim | same |
| 103 | Halo | Duration | 2.4s | same |
| 104 | Bubble | Rendered | no | no |

## 10. Elsewhere (deck page, Collection)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 105 | Elsewhere label | Rendered | on the deck page and Collection, after the rows, in list mode | same |
| 106 | Elsewhere label | Copy key | deck page `helpPanelCopy.elsewhere.deck`; Collection `helpPanelCopy.elsewhere.collection`; uppercase | same |
| 107 | Elsewhere label | Type / padding | `font-mono` 11, `letter-spacing:.12em`, `--fg-muted`, `padding:16px 0 6px` | same |
| 108 | Chip row | Layout | flex, `flex-wrap:wrap`, gap 8 | same |
| 109 | Chip | Element | `<button type="button">` | same |
| 110 | Chip | Box | height 34, `padding:0 12px`, `border:1px solid --border-strong`, `border-radius:999px`, `background:--surface` | same |
| 111 | Chip label | Type | IBM Plex Sans 13, `--fg-body` | same |
| 112 | Chip count | Content | the tab's visible entry count, after a space | same |
| 113 | Chip count | Type | `font-mono` 11, `--fg-faint` | same |
| 114 | Chips (deck, Your deck in view) | Set and order | Shopping, Stats, Notes, Analysis, Games, Versions | same |
| 115 | Chips (deck, Shopping in view) | Set and order | All, Stats, Notes, Analysis, Games, Versions (All = the Your deck tab's entries) | same |
| 116 | Chips (deck, any other tab) | Set | every other tab or view of the deck, in the same order | same |
| 117 | Chips (Collection · Cards) | Set and order | Card details, Sets, Proxies, History, Wishlist, Upload a file | same |
| 118 | Chip, zero entries | Rendered | no | no |
| 119 | Chip | Action | swaps the list in place to that tab's entries; section head label and count follow it; the swapped-out tab becomes a chip; no navigation | same |

## 11. Search results

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 120 | Results label | Copy key | `helpPanelCopy.hits(n, q)` | same |
| 121 | Results label | Type / box | `font-mono` 11.5, `--fg-muted`, `padding:6px 0 8px`, `border-bottom:1px solid --border` | same |
| 122 | Result | Element | `<a>`, `display:block`, `padding:12px 0`, `border-bottom:1px solid --border`, no underline | same |
| 123 | Result | Target | the entry in the Reference | same |
| 124 | Result screen | Content | the entry's screen name, uppercase | same |
| 125 | Result screen | Type | `font-mono` 11, `letter-spacing:.04em`, `--fg-faint`, `display:block` | same |
| 126 | Result title | Type | `display:block`, `margin-top:4px`, 14.5 / 500, `--fg` | same |
| 127 | Result snippet | Content | the matching text, the match wrapped in `<mark>` | same |
| 128 | Result snippet | Type | `display:block`, `margin-top:3px`, 13 / 1.45, `--fg-muted` | same |
| 129 | Match `mark` | Style | `background:--accent-dim`, color `--fg`, `border-radius:3px`, `padding:0 2px` | same |

## 12. Search, none

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 130 | None box | Layout | `padding:28px 4px`, flex column, gap 8 | same |
| 131 | None line | Copy key / type | `helpPanelCopy.none(q)`, 15, `--fg` | same |
| 132 | None note | Copy key / type | `helpPanelCopy.noneNote`, 13.5 / 1.5, `--fg-muted` | same |
| 133 | See every entry | Element | `<a>`, copy key `helpPanelCopy.noneOut` | same |
| 134 | See every entry | Box / type | `align-self:flex-start`, `margin-top:6px`, `padding:8px 0`, IBM Plex Sans 14 / 600, `--accent`, no underline | same |
| 135 | See every entry | Target | the Reference at the top, search cleared | same |
| 136 | None | Suggestions | none invented (H3 note) | same |

## 13. A screen with no entries (G21, not drawn)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 137 | Empty line | Copy key | `helpPanelCopy.empty` | same |
| 138 | Empty line | Place | above the search | same |
| 139 | Empty screen | Rest | search and footer kept; no section head, rows or Elsewhere | same |

## 14. Footer

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 140 | Footer | Layout | flex, `align-items:center`, `justify-content:space-between` | same |
| 141 | Footer | Padding | `12px 16px 22px` | `12px 20px 14px` |
| 142 | Footer | Border / fill | `border-top:1px solid --border`, `background:--surface-rail` | same |
| 143 | Tools | Element / copy key | `<a>`, `helpPanelCopy.footTools`, left | same |
| 144 | Tools | Type | `font-mono` 12.5, `--fg-muted`, `padding:10px 0`, no underline | same |
| 145 | Tools | Target | `/about` (Tools) | same |
| 146 | All of About | Element / copy key | `<a>`, `helpPanelCopy.footAll`, right | same |
| 147 | All of About | Type | `font-mono` 12.5, `--accent`, `padding:10px 0`, no underline | same |
| 148 | All of About | Target | the Reference at the top (`/about?tab=reference`, gap 12) | same |

---

## State Coverage — the ? and HelpSheet

| State | Triggering condition | Rendered | Key props required |
|---|---|---|---|
| Switch off | `HELP_PANEL_ENABLED` resolves off for the reader | no ? in the rail or header; account button `margin-top:auto` at 1280 | the resolved switch on the layout |
| ? closed | switch on, panel closed | rail item `--fg-faint` (1280) / header press `--fg-muted` (390), `aria-expanded="false"` | — |
| ? open | panel open | ? `--elevated` / `--fg`, `aria-expanded="true"` | open state shared by ? and panel |
| Panel on a plain screen (Collection · Cards, H3) | open on a non-deck screen | head, search, section head `here(view)` + `count(n)`, rows, Elsewhere in Collection, footer | current path → `screen`/`view`; fetched `visibleEntries` |
| Panel on the deck page, Your deck (H1) | open on `/decks/[id]`, Your deck tab, view All | title `screenName` with view; rows of that view; chips Shopping, Stats, Notes, Analysis, Games, Versions | deck page tab + view in view |
| Panel on the deck page, Shopping (H2) | Your deck tab, view Shopping | rows of Shopping; chips All, Stats, Notes, Analysis, Games, Versions | same |
| Panel on the deck page, Stats / Notes / Analysis / Games / Versions | that tab in view | that tab's rows; chips for the rest | same |
| Elsewhere chip pressed | chip press | list swaps in place; section head names the chosen tab and its count | local chosen-view state |
| Row closed | default | title + first sentence, `aria-expanded="false"` | entry title, caption |
| Row open (H1 roles, H2 stand-ins) | row press | inset `--surface` box, rest of first paragraph, ≤2 keys, `Read the whole entry ›`; any other row closes | caption paragraphs, keys |
| Show me present | entry's control registered and on screen now | 30px pill right of the row press | anchor registry + in-view check |
| Show me absent (H2 friend-spares) | control not registered or not on screen | no pill | same |
| Show me pressed | Show me press | panel closes, control scrolled into view, R1 halo 2.4s, no bubble | anchor for the entry |
| Searching, results (H2 `combo`) | query non-empty, ≥1 match | results label, results naming screen, `<mark>` on the match | fetched payload incl. keys |
| Searching, none (H3 `sideboard`) | query non-empty, 0 matches | none line, note, `See every entry →` | — |
| Empty screen (G21) | no visible entry has this `screen` (e.g. the all-decks cart, a friend's page) | `empty` line above the search; search; footer | `screen` resolved with zero entries |
| 390 sheet | viewport below `md` | modal sheet 684 tall, scrim .62, grabber | — |
| 1280 panel | viewport `md` and up | non-modal 400 panel, page usable | — |

Row count: 148.
