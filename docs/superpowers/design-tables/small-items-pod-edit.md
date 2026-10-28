# Design Property Table — Small items 7 (pod edit)

Sources: `design/design_handoff_the99_small_items/README.md` §7; `Pod-Edit.dc.html` (one board, tag R1b). Frames used: "Redrawn · 390", "Redrawn · 390 · editing", "Redrawn · 390 · Max removed", "Redrawn · 1300 · editing" (desktop, `.dk`, Item 6's right column). Excluded: "As shipped · 390 · for reference" (✕ on every seat at rest; `···` as a bare `<i>`), and the `.f7rm` Remove line (CSS present, used in no frame; replaced by the ✕ disc in R1b).

## PodCard (`pod-card.tsx`)

### Card (at rest)
| Property | Mobile | Desktop |
|---|---|---|
| Border | 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |
| Radius | 14px | 14px |
| Background | `var(--surface-rail)` (blurred art wash behind) | `var(--surface-rail)` |
| Padding | 12px 14px 12px | 16px 18px 14px |
| Gap | 10px | 14px |

### Card edge (editing, `.f7edit`)
| Property | Mobile | Desktop |
|---|---|---|
| Edge | `box-shadow: 0 0 0 1px var(--accent) inset` (over the 1px `--border-strong` border) | same |
| Width | 1px | 1px |
| Color | `var(--accent)` | `var(--accent)` |

### Head (`.f6hd`)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, `align-items:center`, gap 8px | same |
| Name | 600 15px IBM Plex Sans | same |
| Meta ("N members · yours") | 10.5px IBM Plex Mono, `var(--fg-faint)` | same |
| Trailing group (`.f7hd-e`) | `margin-left:auto`, flex, gap 2px | same |

### Edit press (owner, at rest)
| Property | Mobile | Desktop |
|---|---|---|
| String | Edit | Edit |
| Position | in head, before `···` | in head, before `···` |
| Kind | text press (no fill, no border) | text press |
| Min height | 44px | 32px |
| Padding | 0 10px | 0 10px |
| Font | 500 13.5px IBM Plex Sans | 500 13px IBM Plex Sans |
| Color | `var(--accent-text)` | `var(--accent-text)` |
| Shown to non-owner | — | — |

### `···` menu press (owner, at rest)
| Property | Mobile | Desktop |
|---|---|---|
| Size | 44×44px | 32×32px |
| Color | `var(--fg-muted)` | `var(--fg-muted)` |
| Letter spacing | 1px | 1px |
| Contents | Rename, Leave, Delete stay here (`pod-menu.tsx`) | same |
| While editing | — (hidden) | — (hidden) |

### Done press (editing; replaces Edit and `···`)
| Property | Mobile | Desktop |
|---|---|---|
| String | Done | Done |
| Fill | `var(--accent)` | `var(--accent)` |
| Text color | `var(--bg)` | `var(--bg)` |
| Min height | 36px | 32px |
| Padding | 0 14px | 0 14px |
| Radius | 8px | 6px |
| Font | 600 13.5px IBM Plex Sans | 600 13px IBM Plex Sans |
| Head reads | Done alone | Done alone |

### Seats grid (`.f6st`)
| Property | Mobile | Desktop |
|---|---|---|
| Columns | 3, `minmax(0,1fr)` | `repeat(var(--n),116px)` (frame `--n:3`) |
| Gap | 12px 10px | 12px 12px |
| Seat art size | 100% × 74px | 116 × 82px |
| Seat art radius | 9px | 9px |
| Seat art border | 1px solid `var(--border-strong)`; yours 2px solid `var(--accent)` | same |
| Seat label | 13px, `var(--fg-body)`, gap 6px under art | same |
| Seat size while editing | unchanged (seats never grow) | unchanged |

### Seat at rest
| Property | Mobile | Desktop |
|---|---|---|
| Control on art | — | — |

### ✕ disc (editing; every seat but yours)
| Property | Mobile | Desktop |
|---|---|---|
| Disc size | 28px (README/caption; board CSS `.f6x` draws 26px) | 28px (same note) |
| Press target | 44px | 44px |
| Position | absolute on art, right 5px, top 5px | same |
| Shape | circle (`border-radius:50%`) | same |
| Background | `rgba(20,17,14,.8)` | same |
| Glyph | ✕, 11px, `var(--fg)` | same |
| On your seat | — | — |
| Aria / handler | shipped `removeMemberAria`, `onRemove` | same |

### Add friends tile (`.f6ad`)
| Property | Mobile | Desktop |
|---|---|---|
| Size | 100% × 74px | 116 × 82px |
| Border | 1px dashed `var(--border-dashed)`, radius 9px | same |
| Text | 13px `var(--fg-body)` | same |
| While editing | works as usual, unchanged | same |

### Spares box row (`.f6sh`)
| Property | Mobile | Desktop |
|---|---|---|
| Row | flex, gap 10px, 13px IBM Plex Sans, `var(--fg-body)`, min-height 32px | same |
| Checkbox (on) | 18px, `var(--accent)` fill and border, `var(--bg)` check | same |
| While editing | works as usual, unchanged | same |

## Behavior

### Focus
| Property | Mobile | Desktop |
|---|---|---|
| Edit pressed | focus → first ✕ | same |
| Done pressed | focus → Edit | same |
| After a removal | next ✕, else Done | same |

### Remove
| Property | Mobile | Desktop |
|---|---|---|
| Confirm | — (acts at once) | — |
| Member notified | — | — |
| After removal | stays editing; count in head drops (5 → 4) | same |
| Failed write | seat returns + shared toast | same |

### Exits from editing
| Property | Mobile | Desktop |
|---|---|---|
| Done | ends | ends |
| Escape | ends | ends |
| Leaving the page | ends | ends |
| Only member left | ends by itself | ends by itself |

## State Coverage

| State | Mobile frame | Desktop frame | Notes |
|---|---|---|---|
| Owner at rest | Redrawn · 390 | — (not drawn) | Edit + `···`; no ✕ |
| Non-owner at rest | — (prose only) | — | neither Edit nor `···` change; "as shipped" |
| Editing | Redrawn · 390 · editing | Redrawn · 1300 · editing | accent edge, Done alone, ✕ on 4 of 5 |
| Editing, after a removal | Redrawn · 390 · Max removed | — | still editing, 4 members |
| Only member left | — (prose only) | — | exits editing |
| Failed removal | — (prose only) | — | seat back + shared toast |
| Focus states | — (prose only) | — | rules above |
| Escape / leaving page | — (prose only) | — | exits |
