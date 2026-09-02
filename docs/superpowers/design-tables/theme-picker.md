# Design Property Table — Theme Picker

Enumerated from `design/design_handoff_the99_themes/The 99 - Six-Theme Visual System.dc.html`
§C ("C — Theme picker"), which answers handoff §9.2 and §9.3, plus README decisions 4, 5
and 12.

The canvas draws the picker inside a schematic account popover and a schematic bottom
sheet. Only the picker and the panel geometry it forces are enumerated here — the identity
header, avatar and menu items were specified by the earlier app-shell handoff and are not
re-specified by this one.

Mobile = the 390px sheet. Desktop = the 300px popover.

## Component: AccountPopover / AccountSheet (host geometry)

| Property | Mobile (sheet) | Desktop (popover) |
|----------|----------------|-------------------|
| width | 390px (inset-x-0) | 300px |
| border-radius | 18px 18px 0 0 | 14px |
| padding | 16px 16px 28px | 14px |
| column gap between blocks | 14px | 12px |
| divider above menu items | 1px solid var(--border) | 1px solid var(--border) |

**Host geometry is not this handoff's to change.** The canvas redraws the popover and
the sheet only schematically, to give the picker somewhere to sit; the shipped padding,
radii and sheet insets come from the earlier app-shell handoff and stay as they are.
The one exception is the popover's width. At the shipped 216px the 3-up grid yields
61px chips, which no theme name survives, so the picker genuinely forces 300px and that
value is adopted. The block gap above the menu divider is likewise the picker's own new
edge, and ships at the canvas's 12px. Rows in this table that restate prior app-shell
geometry — popover `padding`, sheet `border-radius`, sheet `padding` — are recorded for
completeness and are not gaps.

## Component: ThemePicker

### Group label ("Theme")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 11px | 11px |
| font-weight | 500 | 500 |
| letter-spacing | 0.16em | 0.16em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |
| padding-inline | — | 4px |

### Grid

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | grid | grid |
| grid-template-columns | repeat(2, 1fr) | repeat(3, 1fr) |
| gap | 10px | 8px |
| role | radiogroup | radiogroup |
| option count | 6 | 6 |

### Chip (option)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | row | column |
| align-items | center | — |
| gap | 11px | 5px |
| padding | 10px | 5px |
| border-radius | 10px | 10px |
| min-height | 44px | — |
| role | radio | radio |

### Chip — selected

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | var(--elevated) | var(--elevated) |
| outline | 1px solid var(--accent) | 1px solid var(--accent) |
| tick | rendered | rendered |

### Chip — focus

| Property | Mobile | Desktop |
|----------|--------|---------|
| outline | 2px accent, 2px offset (inherited from `globals.css` `@layer base`) | same |

### Miniature (the preview box)

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 52px | 100% |
| height | 38px | 46px |
| flex | none | — |
| border-radius | 6px | 6px |
| overflow | hidden | hidden |
| background | previewed theme's var(--bg) | previewed theme's var(--bg) |
| border | 1px solid previewed var(--border-strong) | 1px solid previewed var(--border-strong) |
| aria-hidden | true | true |

### Miniature — surface panel

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left / right | 4px | 5px |
| top | 5px | 6px |
| height | 16px | 20px |
| border-radius | 3px | 3px |
| background | previewed var(--surface) | previewed var(--surface) |
| display | flex, centred | flex, centred |

### Miniature — "99"

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | previewed theme's display face | previewed theme's display face |
| font-weight | 700 | 700 |
| font-size | 10px | 12px |
| line-height | 1 | 1 |
| color | previewed var(--fg) | previewed var(--fg) |

### Miniature — accent bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| left | 4px | 5px |
| bottom | 5px | 6px |
| width | 16px | 18px |
| height | 4px | 4px |
| border-radius | 2px | 2px |
| background | previewed var(--accent) | previewed var(--accent) |

### Miniature — chrome bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | — (no room at 52px) | yes |
| left | — | 27px |
| right | — | 5px |
| bottom | — | 6px |
| height | — | 4px |
| border-radius | — | 2px |
| background | — | previewed var(--border) |

### Miniature — selected tick

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | absolute | absolute |
| top | 3px | 3px |
| right | 4px | 4px |
| width / height | 13px | 13px |
| border-radius | 999px | 999px |
| background | previewed var(--accent) | previewed var(--accent) |
| color | previewed var(--bg) | previewed var(--bg) |
| font-size | 9px | 9px |
| font-weight | 700 | 700 |
| glyph | ✓ | ✓ |

### Chip — theme name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5px | 10.5px |
| font-weight | 500 | 500 |
| line-height | — | 1.25 |
| color (selected) | var(--fg) | var(--fg) |
| color (unselected) | var(--fg-body) | var(--fg-body) |

### Chip — plane subtitle

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--font-mono) | var(--font-mono) |
| font-size | 9px | 8.5px |
| line-height | — | 1.2 |
| letter-spacing | — | 0.04em |
| color | `#6E6654` → **RD: var(--fg-muted)** | `#6E6654` → **RD: var(--fg-muted)** |
| content | plane name before its colon | plane name before its colon |

**RD§1 on the plane subtitle.** The canvas paints it `#6E6654`, which is `--fg-locked` —
a 3:1 token intended for struck-through chrome. At 8.5px that is not readable body text.
Shipped on `--fg-muted`, which the token contract holds at ≥4.5:1 on `--surface` in all
six themes. The same correction the shipped account menu already makes for its email line.

## State Coverage — ThemePicker

| State | Triggering condition | Rendered | Key props required |
|-------|---------------------|----------|--------------------|
| Default | chip's theme ≠ current | chip, no ring, no tick | `current` |
| Selected | chip's theme = current | ring + tick, `aria-checked="true"` | `current` |
| Hover | pointer over an unselected chip | `--surface-raised` background | — |
| Focus | roving tabindex lands on chip | 2px accent outline, 2px offset | — |
| Applied | a chip is chosen | `data-theme` swapped, cookie written, live region announces | `themeCopy.applied(name)` |

## Behaviour (Picker rules, §C)

1. Selected reads as a ring **and** a tick, never colour alone.
2. Focus is the app's own 2px accent outline at 2px offset, inherited from `globals.css`.
3. Roving-tabindex radiogroup; arrow keys move and select in one step; no Save, so a live
   region announces "<Name> applied."
4. Mobile chips are 44px minimum in a 2-up grid; the 3-up desktop grid is pointer-only.
5. All six display faces are fetched when the menu opens — deliberate, and deferred to the
   interaction rather than paid at page load.
