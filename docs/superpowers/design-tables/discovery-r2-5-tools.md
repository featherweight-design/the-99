# Discovery R2·5 · About's Tools tab, ToolCard (option C), Written for you · property table

Enumerated from the design files only (no `src/`):

- `design/design_handoff_the99_discovery_onboarding/design-tables/discovery-r2.md` (§A tool card; §About's tabs: Title, Tabs, Group head rows)
- `.../STATES-showcase-reference.md` (§A tool card)
- `.../README-r2.md` (C1, C2, C3, R2b option C, Written for you)
- `.../r2/ShowcaseDesk.dc.html` (1280), `.../r2/ShowcasePhone.dc.html` (390), `.../r2/ToolCard.dc.html` (`cta="card"` branch + shared picture/head/line only)
- Binding readiness resolutions: `docs/superpowers/readiness/discovery-r2.md` gap 13 (widths as drawn, no fixed height, cards in a row stretch to the tallest; the table's 450/400 heights are a target, not a style) and gap 14 (option C governs; options A/B/D, the `more` menu and the dashed box are out).

Out of scope: the ? panel/sheet, the Reference tab body, the note. Copy wording is out of scope; each row names the copy element that renders.

Token map: `#14110E` `--bg`, `#1E1A15` `--surface`, `#2B241B` `--border`, `#3A3229` `--border-strong`, `#494037` `--border-dashed`, `#EDE6D8` `--fg`, `#C0B8A6` `--fg-body`, `#A59C89` `--fg-muted`, `#8B8270` `--fg-faint`, `#CF8745` `--accent`, `#6B482A` `--accent-dim`. Cinzel = `font-display`, IBM Plex Mono = `font-mono`, IBM Plex Sans = body.

**Conflicts settled in this table** (source wins in brackets):

- Card height: README says 530 / 460, the table 450 / 400, the boards pass `h=450` / `h=400`. **No fixed height** (gap 13); grid/row items stretch to the tallest.
- README C3 says the none-fits line sits "in a dashed box". That is option A's branch; option C draws **no box**, a plain mono line under the hairline (gap 14).
- The table names the card link's accessible name `Try it on <deck>`; the `.dc.html` sets `aria-label="{{ tryLabel }}"`, which carries a trailing ` →`. The name renders the tool's try label (deck form or needs-no-deck form); whether the arrow is spoken is a copy call, not a layout property.

---

## 1. Page head

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 1 | `main` | Padding | `24px 0 104px` (inner blocks carry their own 16px inset) | `40px 56px 64px`, beside the rail, `flex:1; min-width:0` |
| 2 | `main` | Background | `--bg` (page frame) | `--bg` |
| 3 | Head block | Inset | `padding: 0 16px` | none (main's padding) |
| 4 | Head block | Layout | stacked | flex, `align-items:flex-end`, `justify-content:space-between`, gap 24 (one child drawn) |
| 5 | Title `h1` | Copy element | About page title | same |
| 6 | Title `h1` | Font | `font-display` 27 / 600 | `font-display` 34 / 600, letter-spacing `.01em` |
| 7 | Title `h1` | Color | `--fg` | `--fg` |
| 8 | Title `h1` | Margin | 0 | 0 |
| 9 | Sub `p` | Copy element | Tools tab sub (what each tool is for) | same |
| 10 | Sub `p` | Font | body 14.5, line-height 1.5 | body 15 (normal line-height) |
| 11 | Sub `p` | Color | `--fg-body` | `--fg-body` |
| 12 | Sub `p` | Margin | `6px 0 0` | `8px 0 0` |

## 2. Tabs row

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 13 | Tab row wrapper | Margin-top | 10 | 26 |
| 14 | Tab row wrapper | Layout | the tablist itself is the bordered row; `padding:0 16px` | flex, `align-items:center`, `justify-content:space-between` (tablist left, help hint right) |
| 15 | Tab row wrapper | Border | 1px `--border` bottom | 1px `--border` bottom |
| 16 | Tablist | Role / label | `role="tablist"`, `aria-label` About | same |
| 17 | Tablist | Gap between tabs | 26 | 28 |
| 18 | Tab (both) | Element | `button type="button" role="tab"`, no background, no border | same, `cursor:pointer` |
| 19 | Tab (both) | Padding | `10px 2px 12px` | `0 2px 12px` |
| 20 | Tab (both) | Font | body 16 | body 16 |
| 21 | Tab selected | Weight / color | 600 `--fg` | 600 `--fg` |
| 22 | Tab selected | Underline | 2px `--accent` bottom border, `margin-bottom:-1px` (sits on the row's hairline) | same |
| 23 | Tab selected | ARIA | `aria-selected="true"` | same |
| 24 | Tab unselected | Weight / color | 500 `--fg-muted` | 500 `--fg-muted` |
| 25 | Tab unselected | Underline | none | none |
| 26 | Tab unselected | ARIA | `aria-selected="false"` | same |
| 27 | Tab order | Order / default | Tools first (default), Reference second | same |
| 28 | Tab count | Copy element | number of tools (Tools) / number of entries (Reference) | same |
| 29 | Tab count | Font | `font-mono` 12 / 500, inline after the label with a space | same |
| 30 | Tab count | Color, selected | `--accent` | `--accent` |
| 31 | Tab count | Color, unselected | `--fg-faint` | `--fg-faint` |
| 32 | Help hint | Rendered | **not drawn** | right end of the tab row |
| 33 | Help hint | Font / color | — | `font-mono` 12 `--fg-faint`, `padding-bottom:12px` |
| 34 | Help hint | Copy element | — | "every screen has a ? for its own entries" sentence with an inline ? glyph |
| 35 | Help hint glyph | Box | — | inline-flex 20 × 20, centered, 1px `--border-strong`, radius 6, `--fg-muted`; decorative (not a control) |
| 36 | Tab parameter | URL | `?tab=reference` mirrored through `mirrorUrl`; Tools is the absence (readiness gap 12) | same |

## 3. Group (five sections: Start a deck, Tune it, Buy smarter, Use what you own, Play)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 37 | Section | Element | `section aria-label=<group label>` | same |
| 38 | Section | Margin | `margin-top:30px` | `margin-top:40px` |
| 39 | Section | Order | Start a deck · Tune it · Buy smarter · Use what you own · Play; tools inside in C2's order | same |
| 40 | Group head | Layout | flex, `align-items:baseline`, `justify-content:space-between`, gap 10, `padding:0 16px` | flex, `align-items:baseline`, gap 12 (sub sits right after the h2) |
| 41 | Group head | Margin-bottom | 12 | 16 |
| 42 | Group `h2` | Copy element | group label | same |
| 43 | Group `h2` | Font | `font-display` 19 / 600 | `font-display` 21 / 600 |
| 44 | Group `h2` | Color / margin | `--fg`, 0 | `--fg`, 0 |
| 45 | Group trailing text | Copy element | swipe count (`<n> · swipe`, n = cards drawn in the group) | group sub (one short phrase per group) |
| 46 | Group trailing text | Font / color | `font-mono` 12 `--fg-faint`, right-aligned | `font-mono` 12 `--fg-faint`, inline |
| 47 | Group trailing text | Count rule | n counts only rendered cards (switch-off tools excluded) | — |
| 48 | Empty group | Rendering | a group whose tools are all switched off is not drawn (head included) | same |
| 49 | Card container | Layout | one horizontal row: flex, gap 12, `padding:0 16px`, sideways scroll (drawn `overflow:hidden` with the next card peeking) | grid `repeat(3, minmax(0,1fr))`, gap 22 |
| 50 | Card container | Item width | each card wrapped `flex:none`, 300 wide | column width (354 at 1280 with the rail) |
| 51 | Card container | Item height | none fixed; cards in the row stretch to the tallest (gap 13) | none fixed; cards in a grid row stretch to the tallest (gap 13) |
| 52 | Card container | Wrap | never wraps; groups of 2–4 scroll | wraps to new rows of 3 (Tune it: 3 + 1) |

## 4. ToolCard, option C (`cta="card"`)

### 4a. Frame, picture, halo

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 53 | Frame | Element | `article aria-label=<tool name>` | same |
| 54 | Frame | Width | 300 | 354 (column width) |
| 55 | Frame | Height | none fixed (target ~400); fills the stretched row | none fixed (target ~450); fills the stretched row |
| 56 | Frame | Layout | `position:relative`, flex column, `box-sizing:border-box` | same |
| 57 | Frame | Background | `--surface` | `--surface` |
| 58 | Frame | Border / radius | 1px `--border`, radius 14 | same |
| 59 | Frame | Clip | `overflow:hidden` | same |
| 60 | Frame | Base font / color | body, `--fg` | same |
| 61 | Picture | Box | full width, `aspect-ratio: 3/2`, `position:relative`, `overflow:hidden` | same |
| 62 | Picture | Background | `--bg` behind the image | same |
| 63 | Picture | Border | 1px `--border` bottom | same |
| 64 | Picture `img` | Fit | absolute inset 0, 100% × 100%, `object-fit:cover`, block | same |
| 65 | Picture `img` | Source | the tool's real capture (captured at 390, 2x) | same |
| 66 | Picture `img` | Alt | `<tool name>, on a real screen of the app` (copy element: picture alt) | same |
| 67 | Halo | Element | `span aria-hidden="true"`, absolute, `pointer-events:none` | same |
| 68 | Halo | Position | per-tool box as % of the picture (left, top, width, height) | same |
| 69 | Halo | Radius | 9 | 9 |
| 70 | Halo | Shadow | `0 0 0 2px` accent @ 75%, `0 0 0 6px` accent @ 20% | same |
| 71 | Halo | Dim | `0 0 0 2000px` bg @ 28% (dims the surround, clipped by the picture) | same |
| 72 | Picture chip (option D) | Rendering | never in option C | never |

### 4b. Body, head, line

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 73 | Body | Padding | `14px 14px 12px` (card width < 330) | `16px 18px 14px` |
| 74 | Body | Layout | flex column, gap 8, `flex:1` (takes remaining height) | same |
| 75 | Name row | Layout | flex, `align-items:baseline`, `justify-content:space-between`, gap 10 | same |
| 76 | Name `h3` | Copy element | tool name | same |
| 77 | Name `h3` | Font | body 16 / 600, line-height 1.3 | same |
| 78 | Name `h3` | Color / margin | `--fg`, 0 | same |
| 79 | Cost chip | Rendered when | the tool has a cost (only where the app already shows one, G13); otherwise absent | same |
| 80 | Cost chip | Copy element | tool cost (`free`, `1 credit per run`, or the shipped tile's chip verbatim) | same |
| 81 | Cost chip | Font / color | `font-mono` 11 `--fg-muted` | same |
| 82 | Cost chip | Border / shape | 1px `--border-strong`, pill (radius 999), padding `2px 9px` | same |
| 83 | Cost chip | Behavior | `flex:none`, `white-space:nowrap` | same |
| 84 | Line `p` | Copy element | tool one-liner | same |
| 85 | Line `p` | Font | body 14, line-height 1.5 | same |
| 86 | Line `p` | Color / margin | `--fg-body`, 0 | same |

### 4c. Footer, a deck fits (one or several) and needs-no-deck

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 87 | Footer | Position | `margin-top:auto` (pinned to the card bottom) | same |
| 88 | Footer | Hairline | 1px `--border` top, `padding-top:8px` | same |
| 89 | Footer | Layout | flex column, gap 6 | same |
| 90 | Stretched link | Element | `a`, `position:absolute; inset:0; z-index:1; radius 14` over the whole card, no visible content | same |
| 91 | Stretched link | Accessible name | `aria-label` = the tool's try label: deck form (`Try it on <deck>`) or the needs-no-deck form (e.g. `Open Help me choose`) | same |
| 92 | Stretched link | Target | fitting deck the reader opened most recently (E10), else the tool's own page; tool named in the address | same |
| 93 | Footer row | Layout | flex, `align-items:center`, gap 10, `min-height:40px` | same |
| 94 | How it works | Copy element | How it works link | same |
| 95 | How it works | Position | left of the footer row, `position:relative; z-index:2` (above the stretched link), its own link | same |
| 96 | How it works | Font / color | `font-mono` 12 `--fg-faint`, no underline | same |
| 97 | How it works | Behavior | `flex:none`, `white-space:nowrap`, padding `10px 0` | same |
| 98 | How it works | Target | the tool's entry in the Reference | same |
| 99 | Footer label | Copy element | `Opens <deck>` (one fits), `Opens <deck> · +N` (several), or the destination label without arrow (needs no deck) | same |
| 100 | Footer label | Font / color | body 13.5 `--fg-muted` | same |
| 101 | Footer label | Position | `margin-left:auto`, `min-width:0` (right side, before the ring) | same |
| 102 | Footer label | Overflow | one line, `overflow:hidden`, `text-overflow:ellipsis` | same |
| 103 | Ring | Box | 30 × 30, radius 999, 1px `--accent`, flex centered, `flex:none` | same |
| 104 | Ring | Glyph | `→` `--accent`, size 15 | same |
| 105 | Ring | ARIA | `aria-hidden="true"` | same |
| 106 | Deck menu / `▾` | Rendering | none (option C has no menu; `+N` is text only) | none |
| 107 | Card hover/focus | Rendering | whole card is the press; focus ring follows the stretched link's radius 14 (not drawn: app's focus style) | same |

### 4d. Footer, no deck fits

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 108 | Stretched link | Rendering | **absent**: the card is not a press | same |
| 109 | Footer | Hairline / layout | same hairline, flex column gap 6 as 4c | same |
| 110 | None-line | Copy element | the tool's needs reason | same |
| 111 | None-line | Font / color | `font-mono` 12, line-height 1.5, `--fg-muted` | same |
| 112 | None-line | Spacing | `padding-top:4px`; no box, no dashed border (gap 14) | same |
| 113 | Footer row | Layout | flex, `align-items:center`, gap 10, `min-height:40px` | same |
| 114 | How it works | Position / style | left; `font-mono` 12 `--fg-faint`, padding `10px 0`, own link | same |
| 115 | Door | Rendered when | another screen helps (e.g. Friends' spares); absent otherwise (e.g. Top off) | same |
| 116 | Door | Copy element | door label (with trailing →) | same |
| 117 | Door | Font / color | body 14 / 600 `--accent`, no underline | same |
| 118 | Door | Position | right, `margin-left:auto`, padding `10px 0` | same |
| 119 | Ring / footer label | Rendering | absent | absent |

## 5. Written for you

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 120 | Section | Element | `section aria-label` Written for you, sixth, after Play | same |
| 121 | Section | Margin | `30px 16px 0` | `margin-top:40px` |
| 122 | Head | Layout | flex, baseline, `space-between`, gap 10, margin-bottom 12 | flex, baseline, gap 12, margin-bottom 16 |
| 123 | Head `h2` | Font / color | `font-display` 19 / 600 `--fg` | `font-display` 21 / 600 `--fg` |
| 124 | Head sub | Copy element / style | "uses credits" sub; `font-mono` 12 `--fg-faint` (right) | same, inline after h2 |
| 125 | Frame | Border / radius | 1px `--accent-dim`, radius 14 | same |
| 126 | Frame | Background | `--surface` | `--surface` |
| 127 | Frame | Padding | `16px 16px 4px` | `20px 24px 8px` |
| 128 | Frame | Layout | flex column | flex column |
| 129 | Intro `p` | Copy element | credits intro (what a credit is, the free allowance) | same |
| 130 | Intro `p` | Font / color | body 14, line-height 1.55, `--fg-body` | body 14.5, line-height 1.55, `--fg-body` |
| 131 | Intro `p` | Margin | `0 0 12px` | `0 0 14px` |
| 132 | Spender row | Count / order | five: Overview, Suggested changes, Look deeper, Help me choose with "Anything else?", Which deck needs it most?; each follows its own switch (absent when off) | same |
| 133 | Spender row | Hairline | 1px `--border` top | same |
| 134 | Spender row | Layout | stacked: flex column, gap 4, padding `12px 0`; line 1 = name + chip (flex, baseline, `space-between`, gap 10), then what, then where | grid `300px minmax(0,1fr) 170px`, `align-items:center`, gap 18, `min-height:52px` |
| 135 | Spender name | Font / color | body 14.5 / 600 `--fg` | body 15 / 600 `--fg`, block |
| 136 | Spender where | Copy element | where it lives | same |
| 137 | Spender where | Font / color | `font-mono` 11 `--fg-faint` | `font-mono` 11 `--fg-faint` |
| 138 | Spender where | Position | last line, below what | block under the name, `margin-top:2px` (column 1) |
| 139 | Spender what | Copy element | the spender's one line | same |
| 140 | Spender what | Font / color | body 13.5, line-height 1.5, `--fg-body` | body 14, line-height 1.5, `--fg-body` (column 2) |
| 141 | Spender chip | Copy element | **short form**: `each`, `per run`, `per look`, `per search`, `per read` | **long form**: `1 credit each`, `1 credit per run`, `1 credit per look`, `1 credit per search`, `1 credit per read` |
| 142 | Spender chip | Font / color | `font-mono` 11 `--accent` | `font-mono` 11 `--accent` |
| 143 | Spender chip | Border / shape | 1px `--accent-dim`, pill, padding `2px 9px`, nowrap, `flex:none` | same, `justify-self:end` in the 170px column |
| 144 | Free line row | Hairline / layout | 1px `--border` top, `padding-top:12px`; flex wrap, center, `space-between`, gap `8px 20px` | same |
| 145 | Free line | Copy element / style | what is free; body 13.5 `--fg-muted` | same |
| 146 | How credits work | Copy element / style | link; `font-mono` 12.5 `--accent`, no underline, padding `10px 0` | same |
| 147 | How credits work | Target | the credits entry in the Reference | same |
| 148 | Buying credits | Rendering | not drawn this round | same |

## 6. To the Reference (bottom row)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 149 | Row | Margin / padding | `margin:34px 16px 0`, `padding-top:18px` | `margin-top:48px`, `padding-top:22px` |
| 150 | Row | Hairline | 1px `--border` top | same |
| 151 | Row | Layout | flex column, gap 4 | flex, `align-items:center`, `space-between` |
| 152 | Sentence | Copy element / style | "everything else is in the Reference" line; body 14, line-height 1.5, `--fg-muted` | body 14 `--fg-muted` |
| 153 | Link | Copy element | Open the Reference (with →) | same |
| 154 | Link | Font / color | body 14.5 / 600 `--accent`, no underline, padding `10px 0` | same |
| 155 | Link | Position | `align-self:flex-start` (under the sentence) | right |
| 156 | Link | Behavior | switches to the Reference tab | same |

## 7. Chrome on this page (context only)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 157 | Header / rail | Rendering | MobileHeader on top with the ? shown; TabBar fixed at bottom, nothing active (`main` bottom padding 104 clears it) | Rail on the left, nothing active, ? shown |

---

## State Coverage (ToolCard, option C)

| State | When | Stretched link | Footer label + ring | None-line | Door | How it works | Drawn in |
|---|---|---|---|---|---|---|---|
| One deck fits | exactly one deck meets `fits` | yes, name `Try it on <deck>` | `Opens <deck>` + ring | no | no | yes, left, above the link (z 2) | T2 / ShowcaseDesk, ShowcasePhone (e.g. Cheaper stand-ins) |
| Several fit | two or more decks fit | yes, opens the most recently opened fitting deck | `Opens <deck> · +N` + ring, truncates with ellipsis | no | no | yes | T2 (Proposed cuts, Suggested changes, Mana Balance) |
| None fits, no door | no deck fits, nowhere better to send them | **no** (card is not a press) | no | yes, mono 12 `--fg-muted` | no | yes, left | T2 (Top off) |
| None fits, a door | no deck fits, another screen helps | **no** | no | yes | yes, right, 14/600 `--accent` | yes, left | T2 (Friends' spares) |
| Needs no deck | Help me choose, Precons, Wishlist, Sync, Lineup, Friends (and Find a deck's "a card you own") | yes, name = destination label | destination label (no arrow) + ring | no | no | yes | S1 |
| Switch off | the tool's switch is off for this reader | — | — | — | — | — | not drawn (L2): no card; a group left empty is not drawn; phone swipe count drops it |
| Moment dismissed | R1's moment for the tool was spent | as its fit state | as its fit state | as its fit state | as its fit state | yes | S1: the card renders exactly as usual (no change) |

Written for you, per spender: switch on → row drawn; switch off → row absent (README R2b). Help hint: desktop only. Group trailing text: sub at 1280, swipe count at 390.
