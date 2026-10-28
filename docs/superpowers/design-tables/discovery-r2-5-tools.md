# Discovery R2·5 · ToolCard (option C) · property table

**About visual PR 6a (2026-10-28): the Tools tab retired** (Addendum A1 placed every tool on an About page's Try it).
Its rows (§1 page head, §2 tabs, §3 groups, §5 Written for you, §6 To the Reference, §7 chrome) were deleted with it.
The card stays, on the pages' Try it, with one change (handoff `design/design_handoff_the99_about_visual/`, call 6):
the footer's left link is `Show me ›` (`ABOUT_PAGE_STRINGS.toolShowMe`, `--fg-muted`), landing on the tool's label,
where it was `How it works ›` into the Reference; and the body keeps the phone's padding at every width.

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
| 73 | Body | Padding | `14px 14px 12px` | `14px 14px 12px` (the phone body at every width, PR 6a; was `16px 18px 14px` on the Tools tab) |
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
| 94 | Show me | Copy element | `Show me ›` (was How it works, PR 6a) | same |
| 95 | Show me | Position | left of the footer row, `position:relative; z-index:2` (above the stretched link), its own link | same |
| 96 | Show me | Font / color | `font-mono` 12 `--fg-muted`, no underline (was `--fg-faint`) | same |
| 97 | Show me | Behavior | `flex:none`, `white-space:nowrap`, padding `10px 0` | same |
| 98 | Show me | Target | the tool's label on its About page, lit (`showMeHref`) | same |
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
| 114 | Show me | Position / style | left; `font-mono` 12 `--fg-muted`, padding `10px 0`, own link | same |
| 115 | Door | Rendered when | another screen helps (e.g. Friends' spares); absent otherwise (e.g. Top off) | same |
| 116 | Door | Copy element | door label (with trailing →) | same |
| 117 | Door | Font / color | body 14 / 600 `--accent`, no underline | same |
| 118 | Door | Position | right, `margin-left:auto`, padding `10px 0` | same |
| 119 | Ring / footer label | Rendering | absent | absent |

## State Coverage (ToolCard, option C)

| State | When | Stretched link | Footer label + ring | None-line | Door | Show me | Drawn in |
|---|---|---|---|---|---|---|---|
| One deck fits | exactly one deck meets `fits` | yes, name `Try it on <deck>` | `Opens <deck>` + ring | no | no | yes, left, above the link (z 2) | T2 / ShowcaseDesk, ShowcasePhone (e.g. Cheaper stand-ins) |
| Several fit | two or more decks fit | yes, opens the most recently opened fitting deck | `Opens <deck> · +N` + ring, truncates with ellipsis | no | no | yes | T2 (Proposed cuts, Suggested changes, Mana Balance) |
| None fits, no door | no deck fits, nowhere better to send them | **no** (card is not a press) | no | yes, mono 12 `--fg-muted` | no | yes, left | T2 (Top off) |
| None fits, a door | no deck fits, another screen helps | **no** | no | yes | yes, right, 14/600 `--accent` | yes, left | T2 (Friends' spares) |
| Needs no deck | Help me choose, Precons, Wishlist, Sync, Lineup, Friends (and Find a deck's "a card you own") | yes, name = destination label | destination label (no arrow) + ring | no | no | yes | S1 |
| Switch off | the tool's switch is off for this reader | — | — | — | — | — | not drawn (L2): no card |
| Moment dismissed | R1's moment for the tool was spent | as its fit state | as its fit state | as its fit state | as its fit state | yes | S1: the card renders exactly as usual (no change) |

