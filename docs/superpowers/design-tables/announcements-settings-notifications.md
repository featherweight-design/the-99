# Design Property Table — Announcements Settings (R1b-1 Notifications)

Sources: `design/design_handoff_the99_announcements/` — README.md (R1b-1), STATES-announcements.md (Surface 2),
R1b-Settings.dc.html (layout A frames: 390 all on, 390 mixed, 390 push unavailable, 1300 this browser) and
Settings.dc.html (All on 390, One off 390, Push unavailable 390, A failed save 390, All on 1300).

The `.an-nt`, `.sech`, `.sec`, `.stp`, `.pcb` and `.toast` CSS is byte-identical between the two board files
(diffed). The Notifications section markup is identical across both boards for the same state (diffed), apart from
the per-state checkbox `on` flags, the device band title slot (phone vs browser), and the `.cc.lit` annotation in
the failed-save frame.

Mobile = `.ph` 390 frames; Desktop = `.dk` 1300 frames (`.dk .stp` 720px column). Base font family inherited from
`.board`: `'IBM Plex Sans', sans-serif`. Annotation-only classes, NOT to build: `li.chg` (orange dashed outline,
`outline:1.5px dashed rgba(207,135,69,.8); outline-offset:3px` under `.an-nt`; border-radius 8px) and `.cc.lit`
(press highlight ring).

Token values (board, for reference): `--bg #14110E`, `--surface-sunken #18140F`, `--elevated #29241F`,
`--border #2B241B`, `--border-strong #3A3229`, `--fg #EDE6D8`, `--fg-body #C0B8A6`, `--fg-muted #A59C89`,
`--fg-faint #948B78`, `--accent #CF8745`, `--accent-text #CF8745`, `--danger #C6533F`.

## Component: Settings page column (context)

### `.stp` (page column containing the section)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | column |
| padding | 22px 16px 40px | 36px 0 50px |
| width | — (fills 390 frame; content 358px) | 720px |
| margin | — | 0 auto |

### `section.sec.an-nt` (Notifications section)
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 26px | 34px |
| position in page | first section after `h1` + `p.sub`; followed by the Spares `section.sec` | same |
| DOM order of children | `.sech` → `.dv` → `.chd` → `ul` → `p.foot` | same |

## Component: Section head

### `.sech`
| Property | Mobile | Desktop |
|---|---|---|
| copy slot | section title ("Notifications" per R1b-1) | same |
| display | flex | flex |
| align-items | center | center |
| justify-content | space-between | space-between |
| min-height | 44px | 32px |
| padding-bottom | — | 8px |
| border-bottom | 1px solid var(--border) | 1px solid var(--border) |
| font | 500 10.5px 'IBM Plex Mono' | same |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |
| right-side `.r` child | — (none in any frame) | — |

## Component: Device band

### `.dv` (band container)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | flex-start | flex-start |
| gap | 12px | 12px |
| margin-top | 10px | 10px |
| padding | 10px 0 10px 12px (right 0) | same |
| border-radius | 10px | 10px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--border) | 1px solid var(--border) |
| DOM order | `.bell` → `.ct` → `.cc` (cell absent when push unavailable) | same |
| presence | present in every state, including push unavailable | same |

### `.dv .bell` (icon wrapper)
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width / height | 18px / 18px | same |
| margin-top | 1px | 1px |
| color | var(--fg-muted) | var(--fg-muted) |
| display | flex | flex |
| align-items / justify-content | center / center | same |

### Bell SVG
| Property | Mobile | Desktop |
|---|---|---|
| width / height | 18 / 18 | same |
| viewBox | 0 0 20 20 | same |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.5 | 1.5 |
| stroke-linecap | round | round |
| stroke-linejoin | round | round |
| aria-hidden | true | true |
| path 1 d | `M5.6 8.4a4.4 4.4 0 0 1 8.8 0c0 3.7 1.6 5.2 1.6 5.2H4s1.6-1.5 1.6-5.2z` | same |
| path 2 d | `M8.3 16.2a1.8 1.8 0 0 0 3.4 0` | same |

### `.dv .ct` (band text)
| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| display | flex, column | flex, column |
| gap | 2px | 2px |
| padding | 0 (inline override) | 0 |
| min-height | 0 (inline override) | 0 |
| `b` copy slot | device title, phone form ("Push on this phone") | device title, browser form ("Push on this browser") |
| `b` font | 500 14px 'IBM Plex Sans' | same |
| `b` color | var(--fg) | var(--fg) |
| `span` copy slot | device state line: "on" line (all on / mixed / one off / failed save); "can't push" line (push unavailable) | "on" line |
| `span` font-size | 12.5px | 12.5px |
| `span` line-height | 1.45 | 1.45 |
| `span` color | var(--fg-muted) | var(--fg-muted) |

### `.dv .cc` (device box cell)
| Property | Mobile | Desktop |
|---|---|---|
| presence | present when push available; absent (no cell, no box) when push unavailable | present |
| width | 52px (flex none) | same |
| min-height | 44px | 44px |
| display / justify-content | flex / center | same |
| padding-top | 10px | 10px |
| position | relative | relative |
| margin-left | — (CSS `.an-nt .dv .pc{margin-left:0}` targets `.pc`, which the markup does not use) | — |
| box state | `.pcb.on` (ticked) in every push-available frame | `.pcb.on` |

## Component: Column heads row

### `.chd`
| Property | Mobile | Desktop |
|---|---|---|
| presence | present in every state | present |
| display | flex | flex |
| align-items | flex-end | flex-end |
| justify-content | flex-end | flex-end |
| padding | 14px 0 6px | same |
| border-bottom | 1px solid var(--border-strong) | same |
| children | `span` In app → `span` Push; push unavailable: `span` In app only | In app → Push |

### `.chd span`
| Property | Mobile | Desktop |
|---|---|---|
| width | 52px | 52px |
| flex | none | none |
| text-align | center | center |
| font | 500 10px 'IBM Plex Mono' | same |
| letter-spacing | .1em | .1em |
| text-transform | uppercase | uppercase |
| color | var(--fg-muted) | var(--fg-muted) |

## Component: Kind list

### `ul`
| Property | Mobile | Desktop |
|---|---|---|
| margin | 0 | 0 |
| padding | 0 | 0 |
| list-style | none | none |
| row order (by kind) | New sets, New precons, Secret Lair drops, Commander decklists, Other Wizards news, Price drops on your wishlist, Trade matches, Friends asking for your spares, Combos you can make (9 rows) | same |

### `li` (kind row)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | flex-start | flex-start |
| border-top (li+li) | 1px solid var(--border) | same |
| first row border-top | — (sits on `.chd`'s border-strong bottom) | — |
| last row border-bottom | — | — |
| gap | — | — |
| DOM order | `.ct` → `.cc` (In app) → `.cc` (Push); push unavailable: `.ct` → `.cc` (In app) | `.ct` → `.cc` → `.cc` |

### `li .ct` (kind text)
| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| display | flex | flex |
| flex-direction | column | column |
| gap | 2px | 2px |
| padding | 9px 0 | 9px 0 |
| min-height | 44px | 44px |
| `b` copy slot | kind name | same |
| `b` font | 500 14px 'IBM Plex Sans' | same |
| `b` color | var(--fg) | var(--fg) |
| `span` copy slot | kind line (the new three and Friends asking for your spares end with the "on from the start" clause) | same |
| `span` font-size | 12.5px | 12.5px |
| `span` line-height | 1.45 | 1.45 |
| `span` color | var(--fg-muted) | var(--fg-muted) |
| interactive | — (row text toggles nothing, per R1b-1) | — |

### `li .cc` (checkbox cell; own 44px press)
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width | 52px | 52px |
| min-height | 44px | 44px |
| display | flex | flex |
| justify-content | center | center |
| padding-top | 10px | 10px |
| position | relative | relative |
| accessible name | per README: "In app: <kind>" / "Push: <kind>" (ariaLabel) | same |

### `.cc.lit::before` (annotation only, failed-save frame)
| Property | Mobile | Desktop |
|---|---|---|
| content | '' | — (no desktop failed-save frame) |
| position / inset | absolute / 2px 4px auto 4px | — |
| height | 40px | — |
| border-radius | 10px | — |
| box-shadow | 0 0 0 1.5px rgba(240,230,210,.7) | — |
| note | generic `.lit{box-shadow:0 0 0 2px var(--accent),0 0 18px rgba(207,135,69,.35);border-radius:10px}` also matches the cell; both are annotation | — |

## Component: Checkbox (shared `ui/checkbox.tsx`, `.pcb`)

### `.pcb`
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width / height | 18px / 18px | same |
| border-radius | 4px | 4px |
| border | 1.5px solid var(--fg-faint) | same |
| display | flex | flex |
| align-items / justify-content | center / center | same |
| font | 700 12px/1 'IBM Plex Sans' | same |
| color (glyph) | var(--bg) | var(--bg) |
| background (off) | — | — |

### `.pcb.on`
| Property | Mobile | Desktop |
|---|---|---|
| background | var(--accent) | var(--accent) |
| border-color | var(--accent) | var(--accent) |
| `::after` content | '✓' | '✓' |

### `.pcb.dis`
| Property | Mobile | Desktop |
|---|---|---|
| opacity | .5 (defined; not used in any in-scope frame) | same |

## Component: Foot

### `p.foot`
| Property | Mobile | Desktop |
|---|---|---|
| margin-top | 10px | 10px |
| font | 10.5px/1.6 'IBM Plex Mono' (weight normal) | same |
| color | var(--fg-faint) | var(--fg-faint) |
| copy slot (push available) | in-app clause + push clause + no-email clause | same |
| bold spans (push available) | `<b>In app</b>` and `<b>Push</b>` (the column names leading each clause) | same |
| copy slot (push unavailable) | in-app clause + no-email clause (push clause removed) | — |
| bold spans (push unavailable) | `<b>In app</b>` only | — |

### `p.foot b`
| Property | Mobile | Desktop |
|---|---|---|
| color | var(--fg-muted) | var(--fg-muted) |
| font-weight | 500 | 500 |

## Component: Failed-save toast (shared ToastFrame; Settings.dc.html only)

### `.toast`
| Property | Mobile | Desktop |
|---|---|---|
| presence | failed-save frame only | — (not drawn) |
| position | absolute; z-index 45; left 16px; right 16px; bottom 96px (inline) | — |
| display / align-items / gap | flex / center / 10px | — |
| padding | 12px 6px 12px 14px | — |
| border-radius | 12px | — |
| background | var(--elevated) | — |
| border | 1px solid var(--border-strong) | — |
| box-shadow | 0 14px 30px rgba(0,0,0,.55) | — |
| font-size | 13.5px | — |
| color | var(--fg) | — |
| DOM order | `i` (dot) → `span` (message slot: the shared couldn't-save line) → `b` (✕ close) | — |
| `i` | 8×8px, border-radius 50%, background var(--danger), flex none | — |
| `span` | flex 1 | — |
| `b` | 36×36px, flex center, color var(--fg-muted), font-weight 400, content ✕ | — |

## State Coverage

| State / frame | Device band | Band box | Band copy slot | Column heads | Boxes per row | Ticked boxes | Foot | Extra |
|---|---|---|---|---|---|---|---|---|
| 2.1 All on (default) — R1b "390 · all on", Settings "All on 390" | present | `.pcb.on` | phone title + on line | In app, Push | 2 | Secret Lair drops, Commander decklists, Other Wizards news, Friends asking for your spares: both. All others: neither | full; bold In app + Push | — |
| 2.1 desktop — R1b "1300 · this browser", Settings "All on 1300" | present | `.pcb.on` | browser title + on line | In app, Push | 2 | same as 2.1 | full; bold In app + Push | — |
| 2.2 One off — R1b "390 · mixed" | present | `.pcb.on` | phone + on line | In app, Push | 2 | as 2.1 except Commander decklists In app only (Push off); Other Wizards news off in both | full | — |
| 2.2 One off — Settings "One off 390" | present | `.pcb.on` | phone + on line | In app, Push | 2 | as 2.1 except Other Wizards news off in both | full | — |
| 2.3 Push unavailable — R1b "390 · push unavailable", Settings "Push unavailable 390" (identical markup) | present | — (no cell) | phone title + can't-push line | In app only | 1 (In app) | Secret Lair drops, Commander decklists, Other Wizards news, Friends asking for your spares | in-app + no-email clauses; bold In app only | — |
| 2.4 A failed save — Settings "A failed save 390" | present | `.pcb.on` | phone + on line | In app, Push | 2 | same as 2.1 (Other Wizards news Push box back to ticked) | full | `.cc.lit` annotation on Other Wizards news Push cell; toast at bottom 96px |
| 2.5 Device row | own sunken band above the heads in every frame; states "as shipped (`deviceState`)" — only on (box ticked) and unsupported (no box) are drawn | | | | | | | |

## Ambiguities

1. `.an-nt .dv .pc{margin-left:0}` targets `.pc`, but the band's cell is `.cc`; the rule matches nothing. Treated as dead CSS.
2. The band has 0 right padding and a 1px border, so its 52px cell ends 1px inside the Push column's right edge (sits 1px left of the row cells). Taken as drawn.
3. Band `.cc` keeps `padding-top:10px` while the band text starts at its padding top, so the band box sits ~9px lower than the bell (bell has margin-top 1px). Taken as drawn.
4. STATES 2.5 says the device row keeps shipped `deviceState` states, but only "on" and "unsupported" are drawn; off/denied/blocked band states are not in either board.
5. The two One-off frames differ (R1b mixed also turns Commander decklists Push off; Settings turns off only Other Wizards news). Both are examples, not distinct rules.
6. `.cc.lit` also matches the board's generic `.lit` rule (accent ring and glow). Both are annotation; neither is built.
7. No `line-height` is set on `.ct b` or `.chd span` (inherit normal).
