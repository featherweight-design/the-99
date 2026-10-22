# Design Property Table — Menu (menu+Home R1)

Source: `design/design_handoff_the99_menu_home/Menu.dc.html` (inline `<style>` + board markup), with calls from
`README.md` (Calls 1–3, 8), `READINESS.md` (Eng 1, 2, 6) and `STATES-menu-home.md`. Mobile = phone frame at 390
(tab bar, account sheet). Desktop = 1300 frame (rail, account popover). `—` = explicitly absent on that surface;
omitted rows = unspecified. Copy is a placeholder (for `/copy-review`); only string SLOTS are recorded.

Theme tokens as drawn on the board (Low Sun): `--surface-rail #1A1611`, `--surface-inset #1B1712`,
`--surface-sunken #18140F`, `--surface #1E1A15`, `--surface-raised #211D18`, `--elevated #29241F`,
`--border #2B241B`, `--border-strong #3A3229`, `--fg #EDE6D8`, `--fg-faint #948B78`, `--fg-muted #A59C89`,
`--fg-locked #6E6654`, `--accent #CF8745`, `--accent-shadow #6B482A`, `--danger #C6533F`, `--bg #14110E`.
Fonts: Sans = `'IBM Plex Sans'`, Mono = `'IBM Plex Mono'`, Serif = `'Cinzel'`.

---

## Nav items (both surfaces)

### Slot order and membership

| Property | Mobile (bar) | Desktop (rail) |
|---|---|---|
| Order, switch on | Home, Collection, Commanders, Decks, Friends (5 slots) | Search, separator, Home, Collection, Commanders, Decks, Friends |
| Order, `SOCIAL_FRIENDS_ENABLED` off | Home, Collection, Commanders, Decks (4 slots, each wider via `flex:1`) | Friends slot absent (README Call 1 / READINESS Eng 1; not drawn on rail) |
| Discover slot | — (removed; glyph retires) | — (removed) |
| Friends locks in first run | Never | Never |
| Slots held by first-run lock | Commanders, Decks | Commanders, Decks |
| Collection in first run | Open (unchanged) | Open |
| Order, first run | Home, Collection, [Commanders, Decks under bracket], Friends (positions unchanged) | Search, sep, Home, Collection, Friends, then well [Commanders, Decks] (Friends moves ABOVE the well) |
| Label slot | One string per slot (name) | Pointer: hidden (`em` display none), shown as hover tag; touch: shown under glyph |

---

## Glyphs

### Shared SVG attributes (all five nav glyphs)

| Property | Mobile | Desktop |
|---|---|---|
| width × height | 19 × 19 | 19 × 19 |
| viewBox | `0 0 20 20` | `0 0 20 20` |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.5 | 1.5 |
| stroke-linecap | round | round |
| stroke-linejoin | round | round |
| aria-hidden | true | true |

### Friends glyph (NEW)

| Property | Mobile | Desktop |
|---|---|---|
| circle | cx 7.6, cy 7.4, r 2.7 | same |
| path 1 (near body) | `M2.8 16.4c.5-2.9 2.4-4.5 4.8-4.5s4.3 1.6 4.8 4.5` | same |
| path 2 (far head) | `M12.4 4.9a2.4 2.4 0 1 1 1.3 4.5` | same |
| path 3 (far body) | `M14.6 11.6c1.5.5 2.4 1.9 2.7 4` | same |
| Meaning | two seats: near one whole, far one behind | same |

### Other nav glyphs (unchanged, recorded for completeness)

| Glyph | Elements |
|---|---|
| Home | path `M3 9.2 10 3.6l7 5.6V16a1 1 0 0 1-1 1h-3.5v-4.2h-5V17H4a1 1 0 0 1-1-1z` |
| Collection | 4 rects 5.8×5.8 rx 1.2 at (3.2,3.2), (11,3.2), (3.2,11), (11,11) |
| Commanders | path `M3 14.5 4.4 6l3.2 3.6L10 4l2.4 5.6L15.6 6 17 14.5z`; path `M3 16.6h14` |
| Decks | rect x 6.6 y 3.2 w 10 h 13 rx 1.6; path `M4.2 5.4A1.6 1.6 0 0 0 3.4 6.8v8.6a1.6 1.6 0 0 0 1.6 1.6h8.2` |
| Search (rail only) | circle cx 8.6 cy 8.6 r 5.6; path `M12.8 12.8 17 17`; 19×19, stroke-width 1.5 (phone header copy: 20×20, stroke-width 1.6) |

### Glyph specimen tile (board-only, "Glyphs at 72px")

| Property | Value |
|---|---|
| tile | 96×96, border-radius 14px, border 1px solid var(--border-strong), background var(--surface-rail), flex center |
| svg | 72×72, same viewBox/stroke |
| caption | Mono 10px, color var(--fg-faint), gap 8px |

---

## Phone tab bar (`.tbar`)

### Bar container — normal

| Property | Mobile | Desktop |
|---|---|---|
| height | 74px | — |
| flex | none | — |
| display | flex | — |
| align-items | center | — |
| padding | 8px 8px 14px | — |
| background | var(--surface-rail) | — |
| border-top | 1px solid var(--border) | — |

### Slot (`.t`)

| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | — |
| height | 52px | — |
| display | flex | — |
| flex-direction | column | — |
| align-items | center | — |
| justify-content | center | — |
| gap | 3px | — |
| border-radius | 12px | — |
| color (glyph + label) | var(--fg-faint) | — |
| font-family | Mono | — |
| font-size | 9px | — |
| font-weight | 400 | — |
| letter-spacing | .06em | — |
| text-transform | none | — |
| position | relative (badge anchor) | — |

### Slot — active (`.t.on`)

| Property | Mobile | Desktop |
|---|---|---|
| background | var(--surface-inset) | — |
| color | var(--fg) | — |

### Slot — locked (`.t.lk`)

| Property | Mobile | Desktop |
|---|---|---|
| color | var(--fg-locked) | — |
| background | — (none) | — |

### Bar container — first-run lock (`.tbar.lock`)

| Property | Mobile | Desktop |
|---|---|---|
| height | 88px | — |
| flex-direction | column | — |
| align-items | stretch | — |
| padding | 7px 8px 14px | — |
| slot row (`.row`) | display flex; align-items center | — |

### Lock bracket (`.brk`)

| Property | Mobile | Desktop |
|---|---|---|
| position | relative | — |
| height | 14px | — |
| flex | none | — |
| margin-left | 40% (start of slot 3 of 5) | — |
| margin-right | 20% (end of slot 4 of 5) | — |
| Placement | above the slot row | — |

### Bracket line (`.brk i`)

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute | — |
| top | 7px | — |
| left / right | 8px / 8px | — |
| height | 6px | — |
| border | 1px solid var(--border-strong) | — |
| border-bottom | 0 | — |
| border-radius | 3px 3px 0 0 | — |

### Bracket label (`.brk em`)

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute; top 0; left 50%; transform translateX(-50%) | — |
| display | inline-flex | — |
| align-items | center | — |
| gap | 5px | — |
| white-space | nowrap | — |
| background | var(--surface-rail) (masks the line) | — |
| padding | 0 7px | — |
| font | normal 9px/14px Mono | — |
| letter-spacing | .08em | — |
| text-transform | uppercase | — |
| color | var(--fg-locked) | — |
| String slot | one line (lock message) | — |

### Lock glyph (bracket and well)

| Property | Mobile | Desktop |
|---|---|---|
| width × height | 9 × 12 | 9 × 12 |
| viewBox | `0 0 11 14` | `0 0 11 14` |
| shackle path | `M2.5 6V4a3 3 0 0 1 6 0v2`, fill none, stroke currentColor, stroke-width 1.4 | same |
| body rect | x .5, y 6, w 10, h 7.5, rx 1.5, fill currentColor | same |

---

## Desktop rail (`.rail`)

### Rail container

| Property | Mobile | Fine pointer (62) | Touch (88) |
|---|---|---|---|
| width | — | 62px | 88px |
| flex | — | none | none |
| background | — | var(--surface-rail) | var(--surface-rail) |
| border-right | — | 1px solid var(--border) | same |
| display | — | flex | flex |
| flex-direction | — | column | column |
| align-items | — | center | center |
| padding | — | 14px 0 | 14px 0 |
| gap | — | 4px | 4px |

### Rail mark (`.rail .mk`)

| Property | Mobile | Desktop |
|---|---|---|
| display / direction / align | — | flex / column / center |
| gap | — | 3px |
| margin-bottom | — | 20px |
| numeral `.nn` | — | font 800 19px/18px Cinzel |
| diamonds `.dia` | — | flex, gap 3px; i 5×5 (middle 7×7), background var(--accent), rotate(45deg) |

### Rail slot (`.sl`)

| Property | Mobile | Fine pointer | Touch |
|---|---|---|---|
| width | — | 38px | 72px |
| height | — | 38px | 52px |
| border-radius | — | 10px | 12px |
| display | — | flex | flex |
| flex-direction | — | column | column |
| align-items / justify-content | — | center / center | center / center |
| gap | — | (none) | 3px |
| color | — | var(--fg-faint) | var(--fg-faint) |
| position | — | relative | relative |
| flex | — | none | none |
| label `em` display | — | none | block |
| label font | — | — | normal 9px/12px Mono |
| label letter-spacing | — | — | .06em |
| active `.on` background | — | var(--elevated) | var(--elevated) |
| active `.on` color | — | var(--fg) | var(--fg) |
| locked `.lk` color | — | var(--fg-locked) | var(--fg-locked) |

### Separator (`.sep`, after Search)

| Property | Mobile | Desktop |
|---|---|---|
| width × height | — | 24px × 1px |
| background | — | var(--border-strong) |
| margin | — | 6px 0 |
| flex | — | none |

### Hover label (`.rtag`, fine pointer only)

| Property | Mobile | Desktop |
|---|---|---|
| Trigger | — | hover on a pointer-rail slot ("as shipped", desktop nav labels R2) |
| position | — | absolute; z-index 20; left 70px (8px past the 62px rail), vertically on the slot |
| height | — | 28px |
| display / align | — | flex / center |
| padding | — | 0 10px |
| border-radius | — | 7px |
| background | — | var(--surface-raised) |
| border | — | 1px solid var(--border-strong) |
| font | — | 500 12.5px Sans |
| color | — | var(--fg) |
| white-space | — | nowrap |
| box-shadow | — | 0 8px 20px rgba(0,0,0,.4) |
| Touch rail | — | — (labels are inline instead) |

### Locked well (`.well`, first run)

| Property | Mobile | Fine pointer | Touch |
|---|---|---|---|
| width | — | 48px | 80px |
| border-radius | — | 12px | 14px |
| border | — | 1px solid var(--border) | same |
| background | — | var(--surface-sunken) | same |
| display / direction / align | — | flex / column / center | same |
| gap | — | 4px | 4px |
| padding | — | 4px 0 9px | 4px 0 9px |
| contents | — | Commanders `.sl.lk`, Decks `.sl.lk`, then caption | same |
| caption `small` font | — | normal 8px Mono | same |
| caption letter-spacing | — | .08em | same |
| caption color | — | var(--fg-locked) | same |
| caption layout | — | flex column, align center, gap 3px (lock glyph over one uppercase word slot) | same |

### Rail foot (`.foot`)

| Property | Mobile | Desktop |
|---|---|---|
| margin-top | — | auto |
| display / direction / align | — | flex / column / center |
| gap | — | 10px |
| help `.hq` | — | 30×30, flex center, color var(--fg-muted), font 500 14px Sans |
| avatar `.rav` | — | 30×30, border-radius 50%, border 1px solid var(--accent), color var(--accent), font 500 11px Sans, flex center |
| avatar open `.rav.on` | — | box-shadow 0 0 0 3px rgba(207,135,69,.25) |

---

## Badges (`.bdg`, NEW)

### Placement and conditions

| Property | Mobile | Desktop |
|---|---|---|
| Slots that carry one | Home, Friends | Home, Friends |
| Home count | unseen What's new items; clears on a Home visit | same |
| Friends count | items waiting on the reader's answer; clears when answered | same |
| Count 0 | no badge rendered | same |
| Count 1–9 | numeral | same |
| Count ≥10 | caps at `9+` | same |
| Shown while slot active | yes (Home `.on` with badge drawn in account-menu frames) | yes |
| Pending pip | stays at slot's foot; badge clear of it | same |
| Delivery | in-app only (no push, no email) | same |
| Dot variant `.bdg.dot` | defined in CSS (8×8, top 6px, left calc(50% + 6px), padding 0) but not used on any frame | same |

### Badge style

| Property | Mobile (bar) | Desktop pointer | Desktop touch |
|---|---|---|---|
| position | absolute | absolute | absolute |
| top | 3px | 2px | 4px |
| left | calc(50% + 4px) | calc(50% + 3px) | calc(50% + 5px) |
| min-width | 16px | 16px | 16px |
| height | 16px | 16px | 16px |
| padding | 0 4px | 0 4px | 0 4px |
| border-radius | 999px | 999px | 999px |
| background | var(--accent) | var(--accent) | var(--accent) |
| color | #14110E | #14110E | #14110E |
| font | 600 9.5px/16px Mono | same | same |
| text-align | center | center | center |
| letter-spacing | 0 | 0 | 0 |
| box-shadow (ring) | 0 0 0 2px var(--surface-rail) | 0 0 0 2px var(--surface-rail) | same |

---

## Phone header (account-menu frame)

### Header `.mhd`

| Property | Mobile | Desktop |
|---|---|---|
| height | 79px | — |
| display / align / justify | flex / center / space-between | — |
| padding | 20px 20px 14px | — |
| border-bottom | 1px solid var(--border) | — |
| background | var(--bg) | — |
| cluster `.clu` | flex, align center, gap 6px, color var(--fg-body) | — |
| icon button `.ib` | 38×38 flex center | — |
| help `.q` | font 500 16px Sans, color var(--fg-body) | — |
| avatar `.av` | 38×38, border-radius 12px, border 1px solid var(--accent), color var(--accent), font 500 13px Sans | — |
| avatar open `.av.on` | box-shadow 0 0 0 3px rgba(207,135,69,.25) | — |

---

## Account menu

### Container

| Property | Mobile (sheet `.ams`) | Desktop (popover `.amp`) |
|---|---|---|
| Trigger | header avatar (`.av.on` while open) | rail-foot avatar (`.rav.on` while open) |
| scrim | `.scrim`: absolute inset 0, background rgba(20,17,14,.72), z-index 30 | — (none) |
| position | absolute; left 0; right 0; bottom 0 | absolute; left 70px; bottom 14px |
| z-index | 31 | 31 |
| width | full frame (390) | 300px |
| background | var(--surface) | var(--surface-raised) |
| border | border-top 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| border-radius | 20px 20px 0 0 | 14px |
| padding | 20px 20px 26px | 8px |
| box-shadow | — | 0 20px 50px rgba(0,0,0,.6) |
| grabber `.gr` | 40×4, radius 2px, background var(--border-strong), margin 0 auto 20px | — |

### Identity block `.idb`

| Property | Mobile | Desktop |
|---|---|---|
| display / align | flex / center | flex / center |
| gap | 14px | 12px |
| padding | 0 0 18px | 12px 12px 14px |
| border-bottom | 1px solid var(--border) | 1px solid var(--border) |
| avatar `.a` size | 48×48 | 44×44 |
| avatar radius | 14px | 12px |
| avatar border / color | 1px solid var(--accent) / var(--accent) | same |
| avatar font | 500 15px Sans | 500 14px Sans |
| name `b` | 600 16px Sans, display block | 600 14px Sans |
| email `small` | Mono 12px, color var(--fg-faint), margin-top 2px | Mono 11px, color var(--fg-muted) |
| String slots | initial, name, email | same |

### Credit chip `.idb .cr` (unchanged)

| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 8px | 8px |
| display / align | inline-flex / center | same |
| gap | 6px | 6px |
| height | 32px | 32px |
| padding | 0 12px | 0 12px |
| border-radius | 999px | 999px |
| border | 1px solid var(--accent-shadow) | same |
| background | rgba(207,135,69,.1) | same |
| font-size / color | 12.5px / var(--fg) | same |
| diamond `i` | 7×7, var(--accent), rotate(45deg) | same |
| String slot | credit count + chevron | same |

### Theme heading `.thl`

| Property | Mobile | Desktop |
|---|---|---|
| margin | 16px 0 8px | 12px 4px 6px |
| font | 500 11px Mono | same |
| letter-spacing | .16em | same |
| text-transform | uppercase | same |
| color | var(--fg-faint) | same |

### Theme grid `.thg` (unchanged)

| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | 1fr 1fr | 1fr 1fr 1fr |
| gap | 8px | 6px |
| option count | 6 | 6 |
| option layout | flex row, align center, gap 10px | flex column, align flex-start, gap 4px |
| option height | 56px | auto |
| option padding | 0 10px | 6px |
| option radius | 10px | 10px |
| option border | 1px solid transparent | same |
| selected `.on` | border-color var(--accent); background var(--surface-raised) | same |
| swatch `i` | 34×24, radius 5px, border 1px solid var(--border-strong), background #0f0d0b; stripe ::after 10×2 at left 5 bottom 4, radius 2, background var(--c) | same |
| name `b` | 500 12.5px Sans | 500 10.5px Sans |
| plane `small` | Mono 9px, color var(--fg-muted) | Mono 8.5px |

### Menu rows `.mis`

| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 14px | 12px |
| padding-top | 10px | 10px |
| border-top | 1px solid var(--border) | same |
| display / direction | flex / column | same |
| Row order | About, Take the tour, **Settings**, Manage account, Sign out | same |
| Friends row | — (removed; Settings occupies its position, 3rd) | — |
| Row count | 5 (unchanged count vs today) | 5 |
| Settings target | `/settings` | `/settings` |
| Row display / align | flex / center | flex / center |
| Row gap | 14px | 14px |
| Row min-height | 48px | 36px |
| Row font-size | 15px | 13px |
| Row color | var(--fg) | var(--fg) |
| Row padding | 0 | 0 10px |
| Row border-bottom | 1px solid var(--border) (none on last) | 0 |
| Row border-radius | — | 8px |
| Row hover `.hv` | — | background var(--elevated) |
| Marker `i` | 6×6, background var(--accent), rotate(45deg), flex none | same |
| Sign out marker `.dg i` | background var(--danger) | same |
| Switch off (`SOCIAL_FRIENDS_ENABLED`) | no Friends row (Settings row present) | same |

### "Today vs R1" comparison frame (board-only)

| Property | Value |
|---|---|
| struck row `.gone` | color var(--fg-locked); text-decoration line-through; decoration color var(--danger) |
| new row `.new` | outline 1.5px dashed rgba(207,135,69,.8), offset 3px, radius 8px (board annotation only, not shipped) |

---

## State coverage

| Surface | State | Trigger | Frame |
|---|---|---|---|
| Bar (390) | Normal, 5 slots | `SOCIAL_FRIENDS_ENABLED` on, collection loaded | Bar · new (Home active) |
| Bar (390) | Badges | Home: unseen feed items > 0 (drawn 3); Friends: waiting-on-you > 0 (drawn 1); Decks active | Bar · badges |
| Bar (390) | Badge cap | count ≥ 10 → `9+` | caption only (not drawn) |
| Bar (390) | First-run lock | no collection yet: bracket over Commanders + Decks (`.lk`), Home active, Collection + Friends open; bar 88px | Bar · first run |
| Bar (390) | Friends switch off | `SOCIAL_FRIENDS_ENABLED` off: 4 slots, no Friends | Bar · Friends switch off |
| Rail 62 | Normal + badges + hover tag | fine pointer; Commanders active; Home 3, Friends 1; hover on Friends shows `.rtag` | Rail · pointer · 62 |
| Rail 88 | Normal + badges, labelled | coarse pointer (touch) | Rail · touch · 88 |
| Rail 62 | First-run lock | no collection: Friends above the well, well holds Commanders + Decks, Home active | Rail · first run |
| Rail 88 | First-run lock, touch | same, touch widths | Rail · first run · touch |
| Rail | Friends switch off | Friends slot absent (README/READINESS; not drawn) | — |
| Account menu 390 | Sheet open | header avatar pressed: scrim + bottom sheet; avatar `.on`; Home badge 3 still visible in bar | Account menu · 390 |
| Account menu | Today vs R1 rows | Friends struck, Settings in its place | Account menu · today vs R1 |
| Account menu 1300 | Popover open, Settings hovered | rail avatar pressed (`.rav.on`); Settings row `.hv`; rail badges Home 3, Friends 1 | Account menu · 1300 · popover |
| Glyphs | Specimen at 72px | five glyphs, Friends new; Discover retired | Glyphs · at 72px |
| Badge | Count 0 | badge not rendered | implied (unbadged slots) |
| Badge | Cleared | Home: on Home visit; Friends: when answered | README Call 8 |
