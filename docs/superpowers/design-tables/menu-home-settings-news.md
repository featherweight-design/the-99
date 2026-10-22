# Design Property Table — Settings · What's new on Home (menu+Home R1)

Source: `design/design_handoff_the99_menu_home/Settings.dc.html` (+ `README.md`, `READINESS.md`, `STATES-menu-home.md`).
The handoff is NOT on the main checkout's tree at `92b7a46db`; it landed in #2174 (`2aa10a027`) and was read from
`.worktrees/settings-spares/design/design_handoff_the99_menu_home/` (read-only).

Frames: `Settings · 390` (phone `.ph`, 390 wide) and `Settings · 1300` (desktop `.dk`, 1300 wide, 62px fine-pointer rail).
The markup of the section is IDENTICAL in both frames; every difference below comes from a `.dk`-scoped CSS rule.
Copy wording is not a property: strings are recorded as slots (placeholder for `/copy-review` per README).

Tokens (board-local values, dark theme `.board`): `--fg #EDE6D8`, `--fg-muted #A59C89`, `--fg-faint #948B78`,
`--border #2B241B`, `--border-dashed #494037`, `--surface-sunken #18140F`, `--accent #CF8745`, `--bg #14110E`.

## Component: Settings page shell (context only)

### Page column `.stp` (wraps the section; carries the `.new` orange dashed outline = new page)

| Property | Mobile | Desktop |
|---|---|---|
| display / direction | flex, column | flex, column |
| width | fills phone body (390 frame less 1px borders, less 16+16 padding = ~356px content) | 720px, `margin: 0 auto` (centered in the main column) |
| padding | 22px 16px 40px | 36px 0 50px |
| design annotation | `.new`: outline 1.5px dashed rgba(207,135,69,.8), offset 3px, radius 8px (board marker, NOT shipped UI) | same |

### Page title `h1` / sub line `.sub` (precede the section)

| Property | Mobile | Desktop |
|---|---|---|
| h1 font | 700 22px 'Cinzel', serif; margin 0 | 700 28px Cinzel |
| h1 color | inherits `--fg` | inherits `--fg` |
| h1 slot | "Settings" | same |
| .sub font | 400 11px 'IBM Plex Mono' | same |
| .sub color | `--fg-faint` | same |
| .sub margin-top | 4px | 4px |
| .sub slot | save-on-change line ("Saved as you change them") | same |

## Component: What's new on Home section (`section.sec`, first section on the page)

### Section `section.sec`

| Property | Mobile | Desktop |
|---|---|---|
| element | `<section class="sec">` | same |
| margin-top | 26px (from `.sub`) | 34px |
| other spacing | none | none |
| position on page | FIRST section, directly under title + sub line | same |
| relative to Spares | immediately ABOVE `section.sec` "Spares" (sibling; Spares' own margin-top 26px mobile / 34px desktop separates them; no divider other than Spares' `.sech` border) | same |

### Section head `.sech` ("What's new on Home")

| Property | Mobile | Desktop |
|---|---|---|
| element | `<div class="sech">` (not a heading tag) | same |
| display | flex; align-items center; justify-content space-between | same |
| min-height | 44px | 32px |
| padding | 0 | 0 0 8px 0 (padding-bottom 8px) |
| border-bottom | 1px solid `--border` | same |
| font-family | 'IBM Plex Mono' | same |
| font-size | 10.5px | 10.5px |
| font-weight | 500 | 500 |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| line-height | normal (font shorthand) | normal |
| color | `--fg-faint` | `--fg-faint` |
| right-hand slot (`.sech .r`) | NOT drawn (no link/count in this head) | NOT drawn |
| slot | section title ("What's new on Home") | same |

### Intro line under the head

| Property | Mobile | Desktop |
|---|---|---|
| rendered | NONE: no `p.ex` in this section (Spares has one; What's new does not) | NONE |

### Checkbox list `.cks`

| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 4px (`.stp .cks`) | 4px |
| layout | block; rows stacked in ONE column | block; ONE column (the 2-column `.dk .su .cks` grid is scoped to Home's inline opt-in `.su`, NOT to Settings) |
| row count | 6 | 6 |

### Order of kinds (fixed; same order as Home's inline opt-in and Feed-Kinds)

| # | Kind name slot | Line slot | Drawn state in mock |
|---|---|---|---|
| 1 | New sets | when a set comes out + how many of its cards fit decks you've built | off |
| 2 | New precons | a new Commander precon + how many of its cards you own | off |
| 3 | Price drops on your wishlist | a card you want gets cheaper | ON |
| 4 | Trade matches | a friend has a spare of a card on your wishlist | ON |
| 5 | Friends asking for your spares | a friend asks for a card you have spare | ON |
| 6 | Combos you can make | you now own both halves of a two-card combo | off |

(Mobile and desktop identical: same order, same on/off states.)

### Checkbox row `.ck`

| Property | Mobile | Desktop |
|---|---|---|
| element | `<div class="ck">` (whole row; no `<label>`/`<input>` in the mock) | same |
| display | flex; align-items flex-start | same |
| gap | 12px (box to text) | 12px |
| min-height | 44px | 44px |
| padding | 8px 0 (top/bottom 8, left/right 0) | same |
| border-top | none on the first row; `1px solid --border` on every following row (`.ck+.ck`) | same |
| border-bottom | none (the last row has no rule beneath; the foot line follows) | same |
| width | full column (~356px) | full 720px column |
| background | none (transparent) | none |
| radius | none | none |

### Checkbox `.box` (off)

| Property | Mobile | Desktop |
|---|---|---|
| width × height | 20px × 20px | 20px × 20px |
| flex | none (does not shrink) | same |
| border | 1.5px solid `--border-dashed` | same |
| border-radius | 5px | 5px |
| background | `--surface-sunken` | same |
| display | flex; center/center | same |
| margin-top | 1px (optical alignment to the name's first line) | 1px |
| content | empty | empty |

### Checkbox `.box.on` (checked)

| Property | Mobile | Desktop |
|---|---|---|
| background | `--accent` | same |
| border-color | `--accent` (1.5px width kept) | same |
| check mark | CSS `::after`, NOT SVG | same |
| mark box | width 9px, height 5px | same |
| mark strokes | border-left 2px solid `--bg`; border-bottom 2px solid `--bg` | same |
| mark transform | rotate(-45deg) translate(1px,-1px) | same |
| mark position | centered by the box's flex centering | same |

### Text column `.ct`

| Property | Mobile | Desktop |
|---|---|---|
| flex | 1; min-width 0 | same |
| display | flex column | same |
| gap | 2px (name to line) | 2px |

### Kind name `.ct b`

| Property | Mobile | Desktop |
|---|---|---|
| font-family | 'IBM Plex Sans' | same |
| font-size | 14px | 14px |
| font-weight | 500 | 500 |
| line-height | normal (font shorthand) | normal |
| letter-spacing / transform | none / none | none / none |
| color | `--fg` | `--fg` |
| color when checked vs unchecked | unchanged (no state styling on text) | unchanged |

### Kind line `.ct span`

| Property | Mobile | Desktop |
|---|---|---|
| font-family | inherits IBM Plex Sans | same |
| font-size | 12.5px | 12.5px |
| font-weight | 400 | 400 |
| line-height | 1.45 | 1.45 |
| color | `--fg-muted` | `--fg-muted` |
| wrap | wraps freely (no clamp/ellipsis); at 390 the longer lines (New sets, New precons) run to 2 lines | one line at 720 for all six |

### Foot line `p.foot`

| Property | Mobile | Desktop |
|---|---|---|
| element | `<p class="foot">`, after `.cks`, inside the section | same |
| margin-top | 10px (`.stp .foot`) | 10px |
| font | 400 10.5px/1.6 'IBM Plex Mono' | same |
| text-transform / letter-spacing | none / none | none / none |
| color | `--fg-faint` | `--fg-faint` |
| border | none | none |
| slot | in-app only line (count on Home + the list; phone notifications later; no email) | same |

### Spare-request kind (row 5, "Friends asking for your spares")

| Property | Mobile | Desktop |
|---|---|---|
| treatment | IDENTICAL to every other row: same `.ck`, same `.box`, no extra class | same |
| later-round outline (`.later`, blue dashed) | NOT applied in Settings (README G5: the request flow is a later round, drawn only where its items land; here the switch itself is drawn as an ordinary row) | not applied |
| state in mock | checked (`.box.on`) | checked |
| badge / note / disabled look | none | none |

## Responsive variants (summary)

| Property | Mobile | Desktop |
|---|---|---|
| column width | phone body, 16px gutters | 720px centered |
| section margin-top | 26px | 34px |
| head min-height / padding-bottom | 44px / 0 | 32px / 8px |
| checkbox layout | single column | single column (no grid) |
| everything else | same | same |

## Interaction states

| State | Drawn? | Notes |
|---|---|---|
| hover | NOT drawn (no `:hover` rule) | — |
| focus / focus-visible | NOT drawn | — |
| disabled | NOT drawn | — |
| pressed | NOT drawn | — |
| save behaviour (board header) | text only | "Checkboxes save as they change (no Save button), with the shipped toast on a failed write." |
| tap target | row min-height 44px; the box itself is 20×20 | whole row implied as target |

## State Coverage

| State | Trigger | What renders |
|---|---|---|
| Kind off | account has not opted in (every kind starts off, READINESS §5) | `.box`: 20×20, 1.5px `--border-dashed` border, `--surface-sunken` fill, empty |
| Kind on | reader ticks the row | `.box.on`: `--accent` fill + border, `--bg` check mark (::after) |
| Mixed (the drawn mock) | three on, three off | rows 3, 4, 5 on; 1, 2, 6 off; mobile and desktop identical |
| All off | nothing chosen | same six rows, all `.box` (not drawn as its own frame here; Home shows the inline opt-in in this state instead) |
| Save failure | a write fails | shipped toast (described in board header, not drawn) |
| Switch off (`SOCIAL_FRIENDS_ENABLED` etc.) | NOT specified for this section | the social kinds (rows 4, 5) are not drawn hidden in any frame |
| Page entry | avatar / account menu Settings row | no tab-bar slot or rail slot is lit on mobile (caption: "No tab slot is lit: Settings is reached from the avatar"); NOTE the desktop rail draws Home `.sl.on` lit, which contradicts that caption (design inconsistency to flag) |

## Notes / flags

1. Mobile frame: the phone tab bar also draws Home as `.t.on`, contradicting the caption "No tab slot is lit". Both frames light Home; the caption says none. Flag to resolve (code, not Design: no slot should be lit per caption).
2. The section has no intro `p.ex` and no head-right link; the head is a `div.sech`, not a heading element (semantics for engineering to choose).
3. Desktop does NOT use the two-column checkbox grid Home's inline opt-in uses at 1300.
