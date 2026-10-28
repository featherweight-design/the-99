# Design Property Table — Small items 6 (/friends desktop)

Sources: `design/design_handoff_the99_small_items/README.md` §6; `Friends-Desktop.dc.html` (redrawn frames `.dk.d4n` / `.fp.f6two`; shipped reference `.dk.d4s` / `.fp.f6one`). Board frame is 1300px wide with a 62px rail (`.rail`), so `.main` is ~1236px.

Breakpoint: **from 1180px** (`min-[1180px]`, Home's two-column breakpoint). Under 1180 and on a phone: unchanged (shipped single column).

## Page container

### `friends-view.tsx` container (`.fp`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Width | unchanged (shipped) | 1160px (shipped: `max-w-[720px]`) |
| Horizontal centering | unchanged (shipped) | `margin: 0 auto` (unchanged from shipped desktop) |
| Padding | unchanged (shipped) | `36px 0 50px` (same as shipped desktop) |
| Display | unchanged (shipped) | flex column |
| Under 1180px | unchanged (shipped) | shipped single 720px column, nothing changes |

## Head

### `FriendsHead` (`.fhd`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Placement | unchanged (shipped) | spans the full 1160px, above the grid |
| Layout | unchanged (shipped) | row, `justify-content: space-between`, `align-items: flex-start` (as shipped desktop) |
| Avatar | unchanged (shipped) | 64×64, radius 14px (as shipped) |
| Who block gap / align | unchanged (shipped) | gap 14px, `align-items: flex-start` |
| h1 | unchanged (shipped) | Cinzel 700 28px |
| Privacy line (`.f6pv`) | unchanged (shipped) | margin-top 8px; IBM Plex Mono 11px/1.6; `--fg-muted`; max-width 460px; link `--fg-body` underline |
| Right block (`.ri`) | unchanged (shipped) | flex column, `align-items: flex-end`, gap 8px |
| Add a friend button | unchanged (shipped) | height 44px, 14px, accent fill (`.ba`, radius 8px, padding 0 20px) |
| Invites left line | unchanged (shipped) | IBM Plex Mono 11px, `--fg-muted` |
| Changed vs shipped | — | none; only its span widens |

## Two-column grid

### `.f6cols`
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Display | — (no grid) | grid |
| Columns | — | `minmax(0,1fr) 420px` (left resolves to 696px at 1160) |
| Gap | — | row 0, column 44px (`gap: 0 44px`) |
| Alignment | — | `align-items: start` |
| Column element | — | flex column, `min-width: 0` |
| Left column order | unchanged (shipped) | Waiting on you → Your requests → Friends |
| Right column order | unchanged (shipped) | Pods → Open links |
| DOM / reading order | unchanged (shipped) | phone order: head, inbox, friends, pods, links |
| Tabs | — | — (explicitly not now) |

## Sections

### Section (`.sec`) and section head (`.sech`) — both columns
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Section margin-top | unchanged (shipped, 26px) | 34px (every section, including each column's first) |
| First head alignment | — | left and right columns' first heads align: both are a `.sec` at 34px below the head inside a top-aligned grid |
| Head min-height | unchanged (shipped, 44px) | 32px |
| Head padding-bottom | unchanged (shipped) | 8px |
| Head border | unchanged (shipped) | bottom 1px `--border` |
| Head type | unchanged (shipped) | IBM Plex Mono 500 10.5px, letter-spacing .14em, uppercase, `--fg-faint` |
| Waiting on you head (`.sech.w`) | unchanged (shipped) | `--accent-text` |
| Head right action (`.sech .r`, "New pod") | unchanged (shipped) | IBM Plex Sans 500 13.5px, `--accent-text`, no transform |
| Your requests right note | unchanged (shipped) | 12.5px, `--fg-faint` |

### Left column rows
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Inbox card (`.fd`) | unchanged (shipped) | margin-top 12px; radius 14px; 1px `--border`; `--surface-inset`; overflow hidden |
| Row width | unchanged (shipped) | the width they were drawn for (696px column); #2284 one-line right edge and item 4's ✕ fit |
| Waiting on you ✕ | unchanged (item 4) | item 4's `.x4`: 32×32, ends the action line (`margin: 0 -6px 0 auto`), `--fg-muted`, 13px |
| Friend row (`.frow`) | unchanged (shipped) | height 60px, gap 12px, bottom 1px `--border`; face 36×36 radius 10px |

## Pod card (right column)

### `.f6pod` (shipped pod card, at 420px)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Margin-top | unchanged (shipped) | 12px |
| Width | unchanged (shipped) | fills the 420px column |
| Padding | unchanged (shipped) | `16px 18px 14px` |
| Radius | unchanged (shipped) | 14px |
| Border | unchanged (shipped) | 1px `--border-strong` |
| Background | unchanged (shipped) | `--surface-rail` |
| Internal gap | unchanged (shipped) | 14px, flex column |
| Overflow | unchanged (shipped) | hidden, position relative |
| Blurred art (`.f6bl`) | unchanged (shipped) | absolute, inset -40px, opacity .22, `blur(36px) saturate(1.2)` |

### Pod head (`.f6hd`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Layout | unchanged (shipped) | flex, `align-items: baseline`, gap 8px |
| Name | unchanged (shipped) | IBM Plex Sans 600 15px |
| Meta | unchanged (shipped) | IBM Plex Mono 10.5px, `--fg-faint` |
| ··· | unchanged (shipped) | `margin-left: auto`, `--fg-muted` |

### Seat grid (`.f6st`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Columns | unchanged (phone already draws three) | `repeat(3, 116px)` (shipped 720 desktop drew `--n:5`) |
| Gap | unchanged (shipped) | 12px row, 12px column |
| Seat (`.f6se`) | unchanged (shipped) | flex column, gap 6px, 13px, `--fg-body` |
| Seat art | unchanged (shipped) | 116×82, radius 9px, 1px `--border-strong`, cover |
| Own seat (`.me`) | unchanged (shipped) | 2px `--accent` border |
| Seat ✕ (`.f6x`) | unchanged (shipped) | absolute right 5px top 5px; 26×26 circle; `rgba(20,17,14,.8)`; 11px; `--fg` |
| Wrap | unchanged (shipped) | 5 members + tile wrap to two rows of three |

### Add friends tile (`.f6ad`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Size | unchanged (shipped) | 116×82 (a grid cell, last in the seat grid) |
| Radius | unchanged (shipped) | 9px |
| Border | unchanged (shipped) | 1px dashed `--border-dashed` |
| Type | unchanged (shipped) | 13px, `--fg-body`, centered |

### Share-spares line (`.f6sh`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Layout | unchanged (shipped) | flex, center, gap 10px, min-height 32px |
| Type | unchanged (shipped) | IBM Plex Sans 13px, `--fg-body` |
| Checkbox (`.box`) | unchanged (shipped) | 20×20, radius 5px, 1.5px `--border-dashed`, `--surface-sunken`; on: `--accent` fill and border, `--bg` check |

### Rule 0 check row (`.f6r0`)
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Container | unchanged (shipped) | flex, gap 12px, radius 10px, 1px `--border`, `--surface-sunken`, padding `10px 12px` |
| Icon | unchanged (shipped) | 32×32, radius 8px, `color-mix(in oklab, var(--accent) 16%, transparent)`, `--accent`, 14px |
| Title / sub | unchanged (shipped) | 600 14px / Mono 10.5px `--fg-muted` |
| Chevron | unchanged (shipped) | `margin-left: auto`, `--fg-muted` |

## Open links (right column)

### `OpenLinks`
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Placement | unchanged (shipped) | right column, after Pods |
| Visual properties | unchanged (shipped) | not drawn on the board (no frame contains it) |

## Nothing waiting

### Frame "Redrawn · 1300 · nothing waiting"
| Property | Mobile | Desktop (≥1180) |
|---|---|---|
| Waiting on you / Your requests | unchanged (shipped: absent) | absent |
| Left column | unchanged (shipped) | Friends is the first section (34px margin-top), moves up |
| Right column | unchanged (shipped) | Pods (then Open links), unchanged |
| Empty column | — | — (neither column empty) |
| Layout jump | — | — (same grid in both states) |

## State Coverage

| State | Mobile | Desktop (≥1180) | Drawn |
|---|---|---|---|
| Inbox populated (Waiting 3, Requests 2), Friends 4, 1 pod | unchanged (shipped) | two columns, inbox + Friends left, Pods right | yes (shipped + redrawn) |
| Nothing waiting | unchanged (shipped) | Friends first in left column | yes (redrawn) |
| Open links present | unchanged (shipped) | after Pods, right column | no |
| 1180–1300px window | unchanged (shipped) | 1160px container | no |
| Below 1180px | shipped single column | shipped single column | stated only |
| Several pods / dozen-plus friends | — | — (tabs later, not now) | no |
