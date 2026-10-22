# Design Property Table — Home B and What's new (menu+Home R1): the feed item

Companion to `menu-home-home.md`. Source: `design/design_handoff_the99_menu_home/Feed-Kinds.dc.html` ("All six · 390", "All six · 1300 main column", "Unseen / seen", Rules, kinds table), cross-checked against the feed rows drawn in `Home-States.dc.html` and `Home-Directions.dc.html` (B). Shared stylesheet, `/* the feed (NEW) */` block.

Conventions: as in `menu-home-home.md` (font families by name; Mobile = 390 inside a 358px `.fd`; Desktop = 1300 main column, `.dk` scope). No `:hover`/`:focus` rule is drawn: unspecified. The blue `.later` outline is an annotation, not styling. Copy is not a property.

---

## Feed item row (`.fi`)

### Container

| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | 46px minmax(0,1fr) | 46px minmax(0,1fr) auto |
| gap | 12px | 14px |
| align-items | — (stretch; picture top-aligned) | center |
| padding | 12px 14px | 12px 16px |
| position | relative | relative |
| `.fi + .fi` | border-top 1px solid var(--border) | same |
| `.fday + .fi` | border-top 0 | same |
| background | — (inherits `.fd` var(--surface-inset)) | same |
| Press | whole row opens its target ("one press per item"); the link names where | same |

### Columns

| Property | Mobile | Desktop |
|---|---|---|
| Col 1 | picture (`.vis` or `.combo`) | picture |
| Col 2 | `.bd` (kicker row, title, line, actions `.ac`) | `.bd` (kicker row, title, line) |
| Col 3 | — | `.ac` (press moves to its own column at the right) |
| Note | `.ac` is drawn inside `.bd` in the markup; the desktop third column is the `auto` track: `.ac` takes it at desktop ("The press moves to its own column at the right") | same |

---

## Picture: card image (`.vis` + `.cardimg`)

| Property | Mobile | Desktop |
|---|---|---|
| `.vis` position | relative | relative |
| `.vis` width × height | 46 × 64 | 46 × 64 |
| `.cardimg` display | block | block |
| `.cardimg` width × height | 46 × 64 | 46 × 64 |
| aspect | card shape, 63:88 | same |
| object-fit | cover | cover |
| border-radius | 3px | 3px |
| box-shadow | 0 2px 6px rgba(0,0,0,.45) | same |
| Source | full card image, NEVER the art crop | same |
| Per kind | New set: one card from the set · New precon: its commander · Price drop: the card · Trade match: the card · Spare request: your card · Combo: — (see combo mark) | same |

### Friend face on the card's corner (`.vis .fa`)

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute | absolute |
| right | -6px | -6px |
| bottom | -5px | -5px |
| width × height | 24 × 24 | 24 × 24 |
| border-radius | 7px | 7px |
| overflow | hidden | hidden |
| border | 1.5px solid var(--surface-inset) | same |
| transform | — (no tilt in the row) | — |
| img | 100% × 100%; object-fit cover; display block | same |
| Conditional | trade match and spare request only (a friend is the news) | same |

## Picture: combo mark (`.combo`, replaces `.vis`)

| Property | Mobile | Desktop |
|---|---|---|
| width × height | 46 × 64 | 46 × 64 |
| border-radius | 4px | 4px |
| border | 1px solid var(--border-strong) | same |
| background | var(--surface-raised) | same |
| display | flex; align-items center; justify-content center | same |
| color | var(--fact) | var(--fact) |
| aria-hidden | true | true |
| SVG | 26×14, viewBox `0 0 26 14`, fill none, stroke currentColor, stroke-width 1.8 | same |
| SVG path (∞, the shipped two-card-combo mark of the collection key) | `M13 7c-2.6-3.4-4.6-5-7-5a5 5 0 0 0 0 10c2.4 0 4.4-1.6 7-5Zm0 0c2.6 3.4 4.6 5 7 5a5 5 0 0 0 0-10c-2.4 0-4.4 1.6-7 5Z` | same |
| Conditional | Combo kind only ("no single card is the news") | same |

---

## Body (`.bd`)

| Property | Mobile | Desktop |
|---|---|---|
| min-width | 0 | 0 |
| display | flex column | same |
| gap | 3px | 3px |

### Kicker row `.kr`

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 7px |
| min-width | 0 | 0 |
| Children order | unseen diamond (when unseen) → kind kicker → age (right) | same |

### Unseen diamond `.kr .un`

| Property | Mobile | Desktop |
|---|---|---|
| width × height | 6 × 6 | 6 × 6 |
| background | var(--accent) | var(--accent) |
| transform | rotate(45deg) | rotate(45deg) |
| flex | none | none |
| Conditional | unseen only; absent when seen | same |

### Kind kicker `.kd` (slot: kind name)

| Property | Mobile | Desktop |
|---|---|---|
| font | 500 9.5px 'IBM Plex Mono' | same |
| letter-spacing | .12em | .12em |
| text-transform | uppercase | uppercase |
| color (default) | var(--fg-faint) | var(--fg-faint) |
| color `.kd.w` (waiting on you: spare request) | var(--accent-text) | var(--accent-text) |
| color when seen (`.fi.seen .kd`) | var(--fg-locked) | var(--fg-locked) |
| white-space | nowrap | nowrap |
| overflow | hidden; text-overflow ellipsis | same |

### Age `.kr small` (slot: relative time)

| Property | Mobile | Desktop |
|---|---|---|
| margin-left | auto | auto |
| flex | none | none |
| font | 10.5px 'IBM Plex Mono' (400) | same |
| color | var(--fg-locked) | var(--fg-locked) |

### Title `.tt` (slot: one title)

| Property | Mobile | Desktop |
|---|---|---|
| font | 600 14px/1.35 'IBM Plex Sans' | same |
| color | var(--fg) | var(--fg) |
| Seen | unchanged | unchanged |

### Line `.dt` (slot: one line)

| Property | Mobile | Desktop |
|---|---|---|
| font-size / line-height | 12.5px / 1.5 | same |
| color | var(--fg-body) | var(--fg-body) |
| `.mo` (money run) | 12px 'IBM Plex Mono' | same |
| `s` (old price) | color var(--fg-faint); strikethrough (UA default for `s`) | same |
| `.dn` (drop: "↓ $amount") | color var(--success) | same |
| Price-drop line shape | `.mo` [ `s` old price, space, `.dn` ↓ drop ] + trailing plain text | same |

### Actions `.ac`

| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 8px | 8px |
| margin-top | 6px | 0 |
| flex-wrap | wrap | wrap |
| justify-content | — (start) | flex-end |
| Placement | under the line, inside `.bd` | third grid column (`auto`), right |

### Link `.ac .lnk` (slot: press label ending `›`)

| Property | Mobile | Desktop |
|---|---|---|
| color | var(--accent-text) | var(--accent-text) |
| font | 500 13px 'IBM Plex Sans' (13.5 base overridden to 13) | same |
| white-space | nowrap | nowrap |
| min-height | 32px | 32px |
| display | flex; align-items center | same |

### Spare-request actions (LATER ROUND — build the slot only)

| Property | Mobile | Desktop |
|---|---|---|
| Wrapper | `display:flex; gap:8px; align-items:center` (inline) | same |
| Wrapper margin-top (annotation `.later`) | 16px (board spacing for the tag; not a build value) | 0 (`.dk .fi .later`) |
| `.yn` | height 36px; padding 0 16px; radius 8px; border 1px solid var(--border-strong); flex center; 500 13px 'IBM Plex Sans'; var(--fg) | same |
| `.yn.y` (Yes) | background var(--fg); color var(--bg); border-color var(--fg) | same |
| `.ex` (days left) | 10.5px 'IBM Plex Mono'; var(--fg-muted) | same |
| Slots | Yes · No · days left (14-day expiry) | same |

---

## Kinds (one row shape, six kinds)

| Kind | Kicker class | Picture | Face | Unseen drawn | Press slot | Lands on | Written when |
|---|---|---|---|---|---|---|---|
| New set | `.kd` | one card from the set (`.vis`) | — | seen in board | See the set › | set page `/collection/sets/[code]` | a set releases (set import job) |
| New precon | `.kd` | its commander (`.vis`) | — | seen in board | Open in Precons › | `/precons`, that precon open | a precon is imported as released |
| Price drop (wishlist) | `.kd` | the card (`.vis`) | — | unseen | Open the card › | shipped card detail | G2 rule on a wishlisted card (placeholder: cheapest printing falls 20% or $2 below the wishlist-time price, at most once a week per card) |
| Trade match | `.kd` | the card (`.vis`) | friend's face `.fa` | unseen | See [friend]'s spares › | friend's page, Spares tab | a friend's spare appears for a card on your wishlist (spares read) |
| Spare request (later round) | `.kd.w` (accent) | your card (`.vis`) | friend's face `.fa` | unseen | Yes · No · days left | answered in place; also under Waiting on you on /friends | a friend asks (next round's flow) |
| Combo | `.kd` | `.combo` ∞ mark | — | seen in board | See the combo › | first card's detail, combo block open | a collection write completes a pair (combo tables) |

---

## State Coverage — feed item

| State | Trigger | What renders |
|---|---|---|
| Unseen | item arrived since the reader's last Home visit | `.un` accent diamond before the kicker; kicker var(--fg-faint) (or accent for `.kd.w`) |
| Seen | first Home visit after arrival (spare request: when answered on Friends) | no diamond; kicker color var(--fg-locked); title, line, picture, press unchanged |
| Friend is the news | trade match, spare request | 24×24 face on the card's bottom-right corner |
| No single card | combo | 46×64 `.combo` box with the ∞ path in var(--fact) |
| Waiting on you | spare request | kicker in var(--accent-text); sorts first in the list; Yes/No/days-left slot (later round, blue outline) |
| Price drop | wishlisted card under G2 | mono money run: struck old price var(--fg-faint), drop in var(--success) |
| Desktop | `.dk` | three-column grid, items vertically centered, press right-aligned in its own column |
| Lead story | first unseen by priority (waiting on you › trade match › combo › price drop › precon › set) | drawn as the lead (`menu-home-home.md` § Lead story), not as a row; once seen it drops into the list |
