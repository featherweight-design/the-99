# Design Property Table — Small items 4 (dismiss ✕ and kicker time)

Source: `design/design_handoff_the99_small_items/README.md` §4, `Dismiss-X.dc.html`, `Eng-Rulings.dc.html` (both files carry the identical stylesheet). Only `.d4n` frames are read. Mobile = `.ph.d4n` (390), Desktop = `.dk.d4n` (1300; the lead's ask-state specimen is a 1000px `.dk.d4n`). Cascade resolved as base → `.dk` → `.d4n` / `.dk.d4n` / `.d4n.ph`.

## Component: What's new row / Waiting on you row (`.fi`)

### Row (`.fi`)
| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | `46px minmax(0,1fr)` | `46px minmax(0,1fr) auto` |
| gap | 12px | 14px |
| padding | 12px 14px | 12px 16px |
| align-items | — (stretch) | center |
| position | relative | relative |
| border-top (`.fi+.fi`) | 1px solid `var(--border)` | 1px solid `var(--border)` |
| border-top after a day head (`.fday+.fi`) | 0 | 0 |
| padding-right reserve | — (none; `pr-[30px]` dropped) | — (none; `md:pr-[34px]` dropped) |
| children, DOM order | `.vis` (or `.combo`), `.bd` | `.vis` (or `.combo`), `.bd`, `.ac` |
| `.ac` placement | last child INSIDE `.bd` | third grid column, sibling of `.bd` |

### Container (`.fd`)
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| border | 1px solid `var(--border)` | same |
| border-radius | 14px | 14px |
| background | `var(--surface-inset)` | same |
| overflow | hidden | hidden |
| margin-top (in `.sec`) | 12px | 12px |

### Preview (`.vis`)
| Property | Mobile | Desktop |
|---|---|---|
| position | relative | relative |
| width × height | 46 × 64px | 46 × 64px |
| `.cardimg` | 46 × 64px | 46 × 64px |
| `.fa` position | absolute; right -6px; bottom -5px | same |
| `.fa` size | 24 × 24px | 24 × 24px |
| `.fa` border-radius | 7px | 7px |
| `.fa` border | 1.5px solid `var(--surface-inset)` | same |
| `.fa` overflow | hidden | hidden |
| `.fa img` | 100% × 100%; object-fit cover; display block | same |

### Combo glyph tile (`.combo`, in place of `.vis`)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 46 × 64px | 46 × 64px |
| border-radius | 4px | 4px |
| border | 1px solid `var(--border-strong)` | same |
| background | `var(--surface-raised)` | same |
| display / align / justify | flex / center / center | same |
| color | `var(--fact)` | same |

### Text column (`.bd`)
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-direction | flex / column | flex / column |
| gap | 3px | 3px |
| min-width | 0 | 0 |
| padding-right | — (no reserve) | — |
| children, DOM order | `.kr`, `.tt`, `.dt`, `.ac` | `.kr`, `.tt`, `.dt` |

### Kicker line (`.kr`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 7px |
| min-width | 0 | 0 |
| DOM order | `.un` (unread only), `.kd`, `small` (time) | same |

### Unread mark (`.kr .un`)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 6 × 6px | 6 × 6px |
| background | `var(--accent)` | same |
| transform | rotate(45deg) | same |
| flex | none | none |
| rendered | only on unread rows | same |

### Kind (`.kd`)
| Property | Mobile | Desktop |
|---|---|---|
| font-family | 'IBM Plex Mono' | same |
| font-size | 9.5px | 9.5px |
| font-weight | 500 | 500 |
| letter-spacing | .12em | .12em |
| text-transform | uppercase | uppercase |
| color (default) | `var(--fg-faint)` | same |
| color `.w` (spare request, Waiting on you) | `var(--accent-text)` | same |
| color `.ok` (Accepted) | `var(--success)` | same |
| color `.ac2` (Requested) | `var(--accent-text)` | same |
| color, row `.seen` | `var(--fg-locked)` | same |
| white-space / overflow / text-overflow | nowrap / hidden / ellipsis | same |

### Time (`.kr small`)
| Property | Mobile | Desktop |
|---|---|---|
| display | inline (shown) | shown (no longer `display:none` at 1300) |
| font-family | 'IBM Plex Mono' | same |
| font-size | 10.5px | 10.5px |
| font-weight | 400 (font shorthand) | 400 |
| color | `var(--fg-locked)` | same |
| flex | none | none |
| margin-left | 0 (was auto) | 0 |
| margin-right | 0 | 0 |
| `::before` content | `"·"` | `"·"` |
| `::before` margin-right | 7px | 7px |
| spacing from `.kd` | 7px (`.kr` gap) | 7px |
| position in row | after the kind, never top-right corner, never on the action line | same |

### Title (`.tt`)
| Property | Mobile | Desktop |
|---|---|---|
| font | 600 14px/1.35 'IBM Plex Sans' | same |
| color | `var(--fg)` | same |
| width | full text column (no ✕ reserve) | same |

### Detail (`.dt`)
| Property | Mobile | Desktop |
|---|---|---|
| font-size / line-height | 12.5px / 1.5 | same |
| color | `var(--fg-body)` | same |
| `.mo` | 12px 'IBM Plex Mono' | same |
| `s` | color `var(--fg-faint)` | same |
| `.dn` | color `var(--success)` | same |

### Action line (`.ac`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| justify-content | — (flex-start) | flex-end |
| gap | 8px | 12px |
| flex-wrap | nowrap | nowrap |
| margin | margin-top 2px (others 0) | 0 |
| padding-right | — | — (no 34px reserve) |
| DOM order, link row (price drop, combo, trade match) | `.lnk`, `.x4` | `.lnk`, `.x4` |
| DOM order, ask row (Waiting on you) | `.yg` (`.yn.y`, `.yn`, `.ex`), `.x4` | same |
| DOM order, row with no press | `.x4` alone (line kept) | `.x4` alone |
| ✕ placement | last item, pushed right by `margin-left:auto` | last item |

### Press group (`.ac .yg`, ask rows)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | center | center |
| gap | 8px | 8px |
| min-width | 0 | 0 |
| DOM order | Yes (`.yn.y`), No (`.yn`), days left (`.ex`) | same |

### Yes / No (`.ac .yn`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 36px | 36px |
| padding | 0 16px | 0 16px |
| border-radius | 8px | 8px |
| border | 1px solid `var(--border-strong)` | same |
| display / align-items | flex / center | same |
| font | 500 13px 'IBM Plex Sans' | same |
| color | `var(--fg)` | same |
| `.y` background / color / border-color | `var(--fg)` / `var(--bg)` / `var(--fg)` | same |

### Days left (`.ac .ex`)
| Property | Mobile | Desktop |
|---|---|---|
| font | 10.5px 'IBM Plex Mono' (400) | same |
| color | `var(--fg-muted)` | same |
| position | inside `.yg`, after No; wraps under Yes/No on a narrow line | same |

### Link press (`.ac .lnk`)
| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--accent-text)` | same |
| font | 500 13px 'IBM Plex Sans' (13.5 base overridden to 13) | same |
| white-space | nowrap | nowrap |
| min-height | 32px | 32px |
| display / align-items | flex / center | same |

### Receipt row (`.fi.rc`) — not drawn in d4n; base rule
| Property | Mobile | Desktop |
|---|---|---|
| background | `color-mix(in oklab, var(--success) 6%, var(--surface-inset))` | same |
| `.tt` color | `var(--fg)` | same |
| ✕ | — (none) | — |

## Component: Dismiss ✕ (`.x4`)

### `.x4`
| Property | Mobile | Desktop |
|---|---|---|
| element position | in flow, last child of the action line (`.ac` / `.la`) | same |
| position | static (no `absolute top-[6px] right-[4px]`) | static |
| flex | none | none |
| width × height | 44 × 44px | 32 × 32px |
| hit area | 44px | 44px under a coarse pointer (as shipped; prose, no CSS drawn) |
| margin | 0 -10px 0 auto | 0 -6px 0 auto |
| margin-top, lead only | -2px (`.d4n.ph .ld .la .x4`) | 0 |
| display / align-items / justify-content | flex / center / center | same |
| color | `var(--fg-muted)` | same |
| font-size (glyph) | 13px | 13px |
| vertical alignment | centred on the press (line `align-items:center`; lead phone `flex-start` + -2px) | centred |
| disabled while an answer is out (rows) | disabled, as shipped (not drawn) | same |
| lead while an answer is out | absent | absent |
| receipt | absent | absent |

## Component: Your requests row (`.ya .fi`)

### Row
| Property | Mobile | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | `46px minmax(0,1fr)` | `46px minmax(0,1fr) auto` |
| gap | 12px | 14px |
| padding | 12px 14px | 12px 16px |
| align-items | center (R1b: preview centred) | center |
| position | relative | relative |
| children, DOM order | `.vis`, `.bd` (`.kr`, `.tt`, `.dt`), `.xx` | same |
| action line | — (none) | — |

### Kicker / time
| Property | Mobile | Desktop |
|---|---|---|
| `.kr` order | `.un` (unread), `.kd` (`.ac2` Requested / `.ok` Accepted), `small` | same |
| `small` margin-right | 0 (30px reserve removed) | 0 |
| `small` margin-left | 0 | 0 |
| `small::before` | `"·"`, margin-right 7px | same |
| `small` font / color | 10.5px 'IBM Plex Mono' / `var(--fg-locked)` | same |

### Its own ✕ (`.xx`)
| Property | Mobile | Desktop |
|---|---|---|
| position | absolute | absolute |
| right / top | 4px / 6px | 4px / 6px |
| width × height | 36 × 36px | 36 × 36px |
| display / align / justify | flex / center / center | same |
| color | `var(--fg-muted)` | same |
| font-size | 13px | 13px |
| text-column reserve | — (no rule in d4n) | — |

## Component: Lead story (`.ld`)

### Band (`.ld`)
| Property | Mobile | Desktop |
|---|---|---|
| position | relative | relative |
| overflow | hidden | hidden |
| border-radius | 14px | 14px |
| border | 1px solid `var(--accent)` | same |
| background | `var(--surface-rail)` | same |
| display | flex | flex |
| gap | 16px | 28px |
| padding | 16px 16px 16px 14px | 20px 24px 20px 26px |
| align-items | — (stretch) | center |
| children order | `.blur`, `.lc`, `.lt` | same |

### Blur (`.blur`)
| Property | Mobile | Desktop |
|---|---|---|
| position / inset | absolute / -40px | same |
| display | flex | flex |
| opacity | .28 | .28 |
| filter | blur(34px) saturate(1.25) | same |
| pointer-events | none | none |
| img | flex 1; min-width 0; height 100%; object-fit cover | same |

### Card (`.lc`)
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width × height | 96 × 134px | 120 × 168px |
| transform | rotate(-4deg) | rotate(-4deg) |
| margin | 6px 2px 0 4px | 0 |
| `.cardimg` radius | 5px | 6px |
| `.cardimg` box-shadow | 0 10px 24px rgba(0,0,0,.6) | same |
| `.fa` | absolute right -10px bottom -8px; 36 × 36; radius 10px; border 2px solid `var(--surface-rail)`; rotate(4deg); overflow hidden | same |

### Text column (`.lt`)
| Property | Mobile | Desktop |
|---|---|---|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| display / flex-direction | flex / column | same |
| gap | 6px | 6px |
| padding-right | — (28px / 20px reserves dropped) | — |
| children order | `.lk`, `h3`, `p`, `.la` | same |

### Kicker (`.lk`)
| Property | Mobile | Desktop |
|---|---|---|
| display / align-items | flex / center | same |
| gap | 8px | 8px |
| font | 500 10px 'IBM Plex Mono' | same |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| color | `var(--accent-text)` | same |
| DOM order | kind text, `small` (time) | same |

### Lead time (`.lk small`)
| Property | Mobile | Desktop |
|---|---|---|
| margin-left | 0 (was auto) | 0 |
| letter-spacing | 0 | 0 |
| text-transform | none | none |
| font-size | 10.5px | 10.5px |
| font-family / weight | inherited 'IBM Plex Mono' / 500 | same |
| color | `var(--fg-muted)` | same |
| `::before` content / margin-right | `"·"` / 7px | same |

### Headline / body
| Property | Mobile | Desktop |
|---|---|---|
| `h3` font | 700 18px/1.25 'Cinzel', serif | 700 22px/1.25 'Cinzel' |
| `h3` margin | 0 | 0 |
| `p` font-size / line-height | 13px / 1.5 | 13.5px / 1.5 |
| `p` color | `var(--fg-body)` | same |
| `p` max-width | — | 640px |

### Button line (`.la`)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| gap | 8px | 8px |
| margin-top | 6px | 6px |
| flex-wrap | nowrap | nowrap |
| align-items | flex-start | center |
| DOM order, trade match | `.ba` (Ask), `.x4` | same |
| DOM order, spare request (ask) | `.yg` (`.ba` Yes, `.bg` No, `.m` days left), `.x4` | same |
| DOM order, after Ask (Requested) | `.ba` (containing `.rq`), `.x4` | not drawn |
| DOM order, answer out | press only, ✕ absent | same |

### Lead press group (`.la .yg`)
| Property | Mobile | Desktop |
|---|---|---|
| display / flex-wrap | flex / wrap | flex / wrap |
| align-items | center | center |
| gap | 8px | 8px |
| min-width | 0 | 0 |
| wrap behaviour | days left wraps under Yes/No; ✕ holds the first line's end | one line |

### Lead primary (`.la .ba`)
| Property | Mobile | Desktop |
|---|---|---|
| display | inline-flex | inline-flex |
| align / justify | center / center | same |
| height | 40px | 36px |
| padding | 0 16px | 0 16px |
| border-radius | 8px | 8px |
| background / color | `var(--accent)` / `var(--bg)` | same |
| font | 600 13.5px 'IBM Plex Sans' | 600 13px 'IBM Plex Sans' |
| white-space | nowrap | nowrap |

### Lead No (`.la .bg`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 40px (inline style) | 40px (inline style beats `.dk .bg` 32px) |
| padding | 0 14px | 0 14px |
| border-radius | 10px | 8px |
| border | 1px solid `var(--border-strong)` | same |
| color | `var(--fg)` | same |
| font | 400 14px 'IBM Plex Sans' | 400 12.5px 'IBM Plex Sans' |
| display / align / justify / gap | flex / center / center / 8px | same |
| white-space | nowrap | nowrap |

### Lead days left (`.la .m`)
| Property | Mobile | Desktop |
|---|---|---|
| font-family | 'IBM Plex Mono', monospace | same |
| font-size | 10.5px (inline) | 10.5px |
| color | `var(--fg-muted)` (inline) | same |
