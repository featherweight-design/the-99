# Discovery R2·6a · About's Reference tab and the creator's note · property table

Enumerated from the design files only (no `src/`):

- `design/design_handoff_the99_discovery_onboarding/design-tables/discovery-r2.md` (§About's tabs, and the Reference: Screen head, Entry row, Screen row, Open entry, What's new, Screens index, How it works; §A tool card: Halo, for comparison)
- `.../STATES-showcase-reference.md` (§The Reference)
- `.../README-r2.md` (C5, C6, R2b "A note from the creator", G17, E8 screens table)
- `.../READINESS-r2.md` (E12 search, E14 banner, E17 the note)
- `.../r2/ReferenceDesk.dc.html` (1280), `.../r2/ReferencePhone.dc.html` (390), `.../r2/Reference.dc.html` (R1), `.../r2/Reference-Search.dc.html` (R2 results `combo`, R3 none `sideboard`), `.../r2/Note.dc.html` (N1 dialog / sheet, N2 placement)
- Binding readiness resolutions: `docs/superpowers/readiness/discovery-r2.md` gap 9 (the screenshot replaces the specimen; one frame per screen, each entry's halo box as fractions of its screen's frame; a visible entry with no frame or box fails a test; until the last capture lands an entry keeps its specimen), gap 10 (visit recording, out of scope here), gap 12 (`?tab=reference`).

Out of scope: the Tools tab (retired, About visual PR 6a: the Reference draws under one static `Reference N` label, no tab row, until PR 7b retires it), About's title, recording the visit (gap 10), copy wording. Each copy row names the copy element that renders, not its text.

Token map: `#14110E` `--bg`, `#18140F` `--surface-sunken`, `#1A1611` `--surface-rail`, `#1E1A15` `--surface`, `#2B241B` `--border`, `#3A3229` `--border-strong`, `#494037` `--border-dashed`, `#EDE6D8` `--fg`, `#C0B8A6` `--fg-body`, `#A59C89` `--fg-muted`, `#8B8270` `--fg-faint`, `#CF8745` `--accent`, `#6B482A` `--accent-dim`. Scrim `rgba(10,8,6,.62)` (as the ? sheet's). Cinzel = `font-display`, IBM Plex Mono = `font-mono`, IBM Plex Sans = body.

**Conflicts settled in this table** (source wins in brackets):

- Search height: the property table's Search row (44) is the ? panel's. The Reference draws **46** at both widths (`.dc.html`).
- Halo radius: §A tool card says 9; the Reference's opened entry draws **8** (`.dc.html`). Ring and dim are the same.
- Try it ring: the tool card's ring is 30; the Reference's text press draws a **28** ring (`.dc.html`; README R2b: "the same ringed arrow").
- Screen row count at 390: the table says "count and ⌄"; the board renders the bare entry number then the chevron (`{{ s.n }} {{ s.chev }}`), not `N entries`. The 1280 screen head renders `<route> · N entries` (`1 entry` singular).
- 1280 screens are never collapsed: every screen's entries are listed; only an entry opens. Collapsing screens is 390 only (README C5).
- Entry row "one line" applies at 1280 (nowrap, ellipsis). At 390 the first sentence wraps (line-height 1.45, no clamp drawn).
- Note body: drawn clipped with a 70px fade; the N1 caption says "the text scrolls inside it". **It scrolls**; the fade is the drawn bottom edge.
- An entry with no frame: not drawn. Gap 9 governs: the frame replaces the specimen, and until an entry's capture lands it keeps its specimen in the picture's place (never no figure).

---

## 1. Page head (Reference tab only)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 1 | Sub `p` | Copy element | Reference tab sub (every entry by screen), replacing the Tools sub | same |
| 2 | Sub `p` | Font / color / margin | as R2·5 (body 14.5 / 1.5, `--fg-body`, `6px 0 0`) | as R2·5 (body 15, `--fg-body`, `8px 0 0`) |
| 3 | Tab selected | State | Reference selected (`aria-selected="true"`), count `--accent` | same |

## 2. Body layout

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 4 | Body wrapper | Layout | flex column, gap 12 | flex row, gap 48, `align-items:flex-start` |
| 5 | Body wrapper | Padding / margin | `padding:16px 16px 0` | `margin-top:28px` |
| 6 | List column | Layout | (the wrapper itself) | `flex:1; min-width:0`, flex column, gap 14 |
| 7 | Screens index | Rendered | no | yes, right of the list (§9) |
| 8 | Order (list mode) | Sequence | search → what's new (when any) → screens (21) → How it works → the note row | same |

## 3. Search

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 9 | Field `label` | Layout | flex, `align-items:center`, gap 10 | same |
| 10 | Field `label` | Height / padding | 46, `box-sizing:border-box`, `padding:0 14px` | same |
| 11 | Field `label` | Border | 1px `--border-strong`; 1px `--accent` while the query is non-empty | same |
| 12 | Field `label` | Radius / background | 10, `--surface-sunken` | same |
| 13 | Search icon | SVG | 16×16, viewBox `0 0 20 20`, `fill:none`, stroke `--fg-faint`, stroke-width 1.6, `circle cx=8.5 cy=8.5 r=5.5`, `path d="M13 13l4.5 4.5"`, `aria-hidden` | same |
| 14 | `input` | Type / name | `type="search"`; placeholder and `aria-label` both the find-an-entry copy element | same |
| 15 | `input` | Font / color | body 15, `--fg`; no background, border or outline; `flex:1; min-width:0` | same |
| 16 | Clear `button` | Rendered | only when the trimmed query is non-empty | same |
| 17 | Clear `button` | Box / glyph | 32×32, no background/border, ✕ 14 `--fg-faint`, `aria-label` clear-search copy element | same |
| 18 | Search | Scope | titles, captions and keys of every visible entry, client side (E12, G17); also How it works (none-state line) | same |

## 4. What's new

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 19 | Box | Rendered | only with no query, and only when there are new entries; absent otherwise (search then sits directly above Home) | same |
| 20 | Box | Anchor | `id="new"` (banner lands on `/about?tab=reference#new`, scrolled to it) | same |
| 21 | Box | Border / bg / radius | 1px `--accent-dim`, `--surface`, 12 | same |
| 22 | Box | Padding / layout | `16px 18px`, flex column, gap 10 | same |
| 23 | Eyebrow | Copy element | `N new since your last visit` (N = count), drawn in caps | same |
| 24 | Eyebrow | Font / color | mono 11, letter-spacing `.12em`, `--accent` | same |
| 25 | Eyebrow row | Layout | flex, `align-items:baseline`, `justify-content:space-between` | same |
| 26 | Pill list | Layout | flex, `flex-wrap:wrap`, gap 8 | same |
| 27 | Pill | Element | `a` per new entry, renders the entry title | same |
| 28 | Pill | Box | `inline-flex`, center, `min-height:36px`, `padding:0 12px`, radius 999 | same |
| 29 | Pill | Border / color / font | 1px `--border-strong`, `--fg`, body 13.5, no underline | same |

## 5. Search results (R2)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 30 | Results | Rendered | query non-empty and ≥1 hit; replaces the screens, How it works and the note row; what's new hidden | same |
| 31 | Count line | Copy element | `N entries mention "<q>"` | same |
| 32 | Count line | Font / color / padding | mono 12, `--fg-muted`, `6px 0 4px` | same |
| 33 | Hit | Element / box | `a`, block, `padding:14px 16px`, 1px `--border`, radius 10, `--surface`, no underline | same |
| 34 | Hit gap | Spacing | 12 (wrapper gap) | 14 (column gap) |
| 35 | Hit screen | Copy element / font | the entry's screen name in caps; mono 11, letter-spacing `.06em`, `--fg-faint`, block | same |
| 36 | Hit title | Font | body 15 / 500, `--fg`, block, `margin-top:4px` | same |
| 37 | Hit snippet | Font | body 13.5, line-height 1.5, `--fg-muted`, block, `margin-top:4px` | same |
| 38 | Match `mark` | Style | background `--accent-dim`, color `--fg`, radius 3, `padding:0 2px` | same |

## 6. Search none (R3)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 39 | Box | Rendered | query non-empty and 0 hits; replaces the list; what's new hidden | same |
| 40 | Box | Style | `padding:28px 20px`, 1px **dashed** `--border-dashed`, radius 12, flex column, gap 8 | same |
| 41 | Line 1 | Copy element / font | nothing-mentions-`<q>` line; body 16, `--fg` | same |
| 42 | Line 2 | Copy element / font | what-search-reads line; body 14, line-height 1.5, `--fg-muted` | same |
| 43 | See every entry | Element | `a` (clears the search, back to the list) | same |
| 44 | See every entry | Style | `align-self:flex-start`, `margin-top:6px`, body 14.5 / 600, `--accent`, `padding:8px 0`, no underline | same |

## 7. Screens (list mode)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 45 | Screen | Element | `section` with `aria-label` = screen name, 21 in E8's order | same |
| 46 | Screens list | Layout | flex column, no gap; each `section` 1px `--border` bottom | each `section` `margin-top:14px` |
| 47 | Screen head | Element | a `button` with `aria-expanded` (the screen row opens) | a static head (`h2` + meta), not a press |
| 48 | Screen head | Layout | flex, center, `space-between`, gap 10, `min-height:50px`, `padding:0`, no bg/border, full width, left text | flex, `align-items:baseline`, gap 12, `padding-bottom:8px`, 1px `--border-strong` bottom |
| 49 | Screen name | Font | `font-display` 16 / 600, `--fg` (span) | `font-display` 19 / 600, `--fg` (`h2`, margin 0) |
| 50 | Screen meta | Copy element | entry count then chevron (`⌄` closed, `⌃` open) | `<route> · N entries` (`1 entry` singular) |
| 51 | Screen meta | Font | mono 11.5, `--fg-faint`, nowrap | mono 11.5, `--fg-faint` |
| 52 | Screen entries | Rendered | only when that screen is open (one drawn open: Shopping) | always |

## 8. Entry row and opened entry

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 53 | Entry wrapper | Border | 1px `--border` top | 1px `--border` bottom |
| 54 | Entry `button` | State | `aria-expanded` = open; full width, no bg/border, left text, body font | same |
| 55 | Entry `button` | Layout | flex column, gap 3, `min-height:48px`, `padding:10px 0` | grid `300px minmax(0,1fr) 56px 16px`, center, gap 16, `min-height:44px`, `padding:6px 0` |
| 56 | Title | Font | 14.5 / 500 `--fg` | 14.5 / 500 `--fg` |
| 57 | First sentence | Copy element | entry's first sentence | same |
| 58 | First sentence | Font | 13, line-height 1.45, `--fg-faint`; wraps | 13, `--fg-faint`, one line: nowrap, `overflow:hidden`, ellipsis |
| 59 | `in Tools` mark | Rendered | entry is a tool only; empty otherwise | same (column kept, empty) |
| 60 | `in Tools` mark | Place / font | inline after the title (space), mono 10.5 / 400 `--accent` | own 56px column, mono 10.5 `--accent` |
| 61 | Chevron | Rendered / font | none on entry rows | `⌄` closed, `⌃` open; 13 `--fg-faint` |
| 62 | Open body | Rendered | entry open; one open at a time drawn | same |
| 63 | Open body | Layout | flex column, gap 18, `padding:4px 0 18px` (picture above) | flex row, gap 18, `padding:4px 0 18px` (picture beside) |
| 64 | Picture | Box | `width:100%`, `aspect-ratio:3/2`, radius 10, `overflow:hidden`, 1px `--border`, `flex:none`, `position:relative` | `width:330px`, rest same |
| 65 | Picture `img` | Fit / alt | absolute inset 0, 100%×100%, `object-fit:cover`, block; alt = entry title on its screen | same |
| 66 | Picture | Source | the entry's SCREEN frame (gap 9); no frame yet → the entry's specimen in its place | same |
| 67 | Halo | Rendered | when the entry has a halo box | same |
| 68 | Halo | Box | absolute span, `aria-hidden`; left/top/width/height as percentages of the frame (drawn `54.36% / 61.92% / 6.41% / 10%`) | same |
| 69 | Halo | Style | radius 8; `box-shadow: 0 0 0 2px accent/.75, 0 0 0 6px accent/.2, 0 0 0 2000px bg/.28` | same |
| 70 | Text column | Layout | flex column, gap 10, `min-width:0` | same |
| 71 | Caption `p` | Font | 14, line-height 1.6, `--fg-body`, margin 0 | same |
| 72 | Key | Layout / font | flex, gap 8; 13.5, line-height 1.5, `--fg-body`; number span `--accent` (numbered 1, 2, …) | same |
| 73 | Actions row | Layout | flex, wrap, center, gap `10px 18px`, `margin-top:4px` | same |
| 74 | Try it | Rendered | tools only (`in Tools` entries) | same |
| 75 | Try it | Copy element | try-it-on-`<deck>` text press (README R2b) | same |
| 76 | Try it | Style | `a`, inline-flex, center, gap 10, `min-height:42px`, `--accent`, 14 / 600, no underline | same |
| 77 | Try it ring | Style | span `aria-hidden`, 28×28, radius 999, 1px `--accent`, inline-flex centered, `→` 14 | same |
| 78 | How link | Copy element | how-the-app-reaches-this link (to the entry's How it works row) | same |
| 79 | How link | Style | `a`, mono 12, `--fg-muted`, `padding:8px 0`, no underline | same |

## 9. Screens index (1280 only)

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 80 | `nav` | Name / box | — | `aria-label` Screens; width 230, `flex:none`, flex column, gap 2, `position:relative` |
| 81 | Label | Font | — | mono 11, letter-spacing `.12em`, `--fg-faint`, `padding-bottom:8px` (caps copy element) |
| 82 | Row | Element / box | — | `a` per screen (21), flex, `space-between`, center, `min-height:30px`, 13.5, no underline |
| 83 | Row | Color | — | `--fg-muted`; the current screen `--fg` / 500 |
| 84 | Row count | Font | — | mono 11, `--fg-faint` |
| 85 | How it works row | Style | — | as row, `--fg-muted`, plus `margin-top:8px; padding-top:8px`, 1px `--border` top; count = How it works row count |

## 10. How it works section

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 86 | Section | Rendered | list mode only (hidden by a query) | same |
| 87 | Section | Element / box | `section` `aria-label` = section title; `margin-top:36px`, 1px `--border-strong` top, `padding-top:22px` | same |
| 88 | Head | Layout | flex, baseline, `space-between`, gap 12 | same |
| 89 | Title `h2` | Font | `font-display` 17 / 600 `--fg`, margin 0 | `font-display` 21 / 600 `--fg`, margin 0 |
| 90 | Count | Copy element / font | `N rows`; mono 12 `--fg-faint` | same |
| 91 | Spacer | Height | 10 | 10 |
| 92 | Row | Box | flex, center, `space-between`, gap 12, `min-height:44px`, 1px `--border` bottom (8 rows) | same |
| 93 | Row label / › | Font | 14.5 `--fg`; `›` 13 `--fg-faint` | same |

## 11. The note row

| # | Element | Property | Mobile (390) | Desktop (1280) |
|---|---|---|---|---|
| 94 | Row | Rendered / place | list mode only; the last thing, after How it works; nowhere else (N2) | same |
| 95 | Row | Element / box | `a`, `margin-top:28px`, flex, center, `space-between`, gap 12, `min-height:56px`, `padding:0 18px`, no underline | same |
| 96 | Row | Border / bg | 1px `--border-strong`, radius 12, `--surface` | same |
| 97 | Title | Copy element / font | note title (`A note from the creator` key); `font-display` 16 / 600 `--fg`, block | same |
| 98 | Sub | Copy element / font | note row sub; 13 `--fg-muted`, block, `margin-top:2px` | same |
| 99 | › | Font | 14 `--fg-faint` | same |
| 100 | Press | Opens | the note sheet | the note dialog |

## 12. The note (dialog md+ / sheet below md)

| # | Element | Property | Mobile (390) sheet | Desktop (1280) dialog |
|---|---|---|---|---|
| 101 | Scrim | Style | absolute inset 0, `rgba(10,8,6,.62)` | same |
| 102 | Surface | Role | `section role="dialog" aria-modal="true"`, `aria-label` = note title | same |
| 103 | Surface | Size / place | 390 × 700, bottom 0, left 0 | 640 × 660, centered (left 320, top 50 in a 1280×760 frame) |
| 104 | Surface | Layout | flex column, `box-sizing:border-box` | same |
| 105 | Surface | Bg / border | `--surface-rail`, 1px `--border-strong`, no bottom border | `--surface-rail`, 1px `--border-strong` |
| 106 | Surface | Radius / shadow | `18px 18px 0 0`, no shadow | 16, `0 40px 100px rgba(0,0,0,.7)` |
| 107 | Grabber | Rendered / style | yes: 40×4, radius 999, `--border-dashed`, `margin:8px 0 0`, centered, `aria-hidden` | no |
| 108 | Header | Layout | flex, `align-items:flex-start`, `space-between`, gap 12, `padding:12px 16px 10px` | same, `padding:24px 28px 10px` |
| 109 | Title `h2` | Copy element / font | note title; `font-display` 20 / 600 `--fg`, margin 0 | `font-display` 24 / 600 `--fg`, margin 0 |
| 110 | Close | Box / glyph | `button` `aria-label` Close, 44×44, `flex:none`, `margin:-8px -12px 0 0`, no bg/border, ✕ 20 `--fg-muted` | same |
| 111 | Body | Copy element | the letter (`aboutCopy.pageIntro`, unchanged) | same |
| 112 | Body | Box | `position:relative`, `flex:1`, `min-height:0`, scrolls inside, `padding:4px 16px 0` | same, `padding:4px 28px 0` |
| 113 | Body | Font | body 14.5, line-height 1.65, `--fg-body` | body 15, line-height 1.65, `--fg-body` |
| 114 | Paragraph | Margin | `0 0 14px` | same |
| 115 | Sign-off line | Margin | `6px 0 2px` | same |
| 116 | Signature | Font | `font-display` 18 `--fg`, margin 0 | same |
| 117 | Bottom fade | Style | absolute, left/right/bottom 0, height 70, `linear-gradient(transparent → --surface-rail)` | same |

---

## State Coverage — Reference tab and note

| State | Triggering condition | Rendered | Key props required |
|---|---|---|---|
| Default (list) | trimmed query empty | search, what's new (if any), 21 screens, How it works, note row | visible entries grouped by screen |
| Entry closed | entry not open | row only (title, first sentence, mark, ⌄ at 1280) | entry id, title, first sentence, tool flag |
| Entry open | entry pressed (`aria-expanded="true"`) | open body (§8 rows 62–79), ⌃ at 1280 | frame, halo box, caption, keys |
| Screen row closed (390) | screen not open | name, count, ⌄; no entries | screen name, entry count |
| Screen row open (390) | screen pressed | name, count, ⌃, its entries | — |
| 1280 screens | always | every screen expanded with a static head | route, count |
| Search with hits | query non-empty, ≥1 match | count line + hit cards; list, How it works, note row and what's new hidden; field border `--accent`; ✕ shown | hits (screen, title, snippet, matched span) |
| Search with none | query non-empty, 0 matches | dashed box, two lines, See every entry →; list and what's new hidden | query |
| What's new present | no query and new entries exist | box `#new` with eyebrow and pills | new entries, count |
| What's new absent | no new entries, or a query is open | no box; search directly above the first screen | — |
| Arrived from banner | `/about?tab=reference#new` | Reference tab, scrolled to `#new` | — |
| Opened entry with a frame | entry's screen frame captured | the screen frame in the picture | frame src |
| Opened entry without a frame | capture not landed (gap 9) | the entry's specimen in the picture's place (not drawn); a visible entry with no frame or box after the last capture fails a test | — |
| With halo | entry has a halo box | halo span over the frame | box fractions |
| Without halo | no box (only before captures land, gap 9) | frame without the span (not drawn) | — |
| With Try it | entry is a tool | Try it text press with 28 ring | target deck (or tool page) |
| Without Try it | entry is not a tool | actions row holds only the How link | — |
| With How-it-works link | entry links a How it works row (drawn on the opened entry) | `How the app reaches this ›` | target row |
| Without How-it-works link | not specified by design | — | — |
| `in Tools` mark | entry is one of the tools | mono 10.5 `--accent` mark (inline at 390, own column at 1280) | tool flag |
| Index current screen (1280) | the screen in view | that index row `--fg` / 500; others `--fg-muted` | current screen id |
| Note dialog (md and up) | note row pressed, ≥ md | centered 640×660 modal over scrim | — |
| Note sheet (below md) | note row pressed, < md | bottom sheet 390×700 with grabber over scrim | — |
