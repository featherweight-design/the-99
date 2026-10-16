# Design Property Table — Quick return

Sources: card search handoff README §3, STATES, Header-Phone Q1–Q5, R2 Deck-Page DP2–DP3.

## Component: MobileHeader (quick return)

### Dimensions (`.mhd`, as shipped)
| Property | Mobile |
|---|---|
| Height | 73px (20px top padding, 38px account button, 14px bottom, 1px rule) |
| Padding | `20px 20px 14px` |
| Layout | flex, `align-items:center`, `justify-content:space-between` |
| Border | `border-bottom: 1px solid var(--border)` |
| Background | `var(--bg)` |
| z-index | 6 |

### At the top (Q1)
| Property | Mobile |
|---|---|
| Position | in the page as shipped (`position:relative`), not sticky |
| Hides | never; rubber-band overscroll ignored |
| Shadow | — |

### Away (Q2)
| Property | Mobile |
|---|---|
| Trigger | page scrolled past the header AND 8px of downward travel since the last turn |
| Motion | slides up, 160ms, `cubic-bezier(.4,0,1,1)` |
| Translate distance | not stated (header absent in frame; implied its 73px) |
| Drawn | header not in frame; filter head pinned at `top:0px` |

### Returned (Q3, DP2)
| Property | Mobile |
|---|---|
| Trigger | 12px up from the lowest point, anywhere on the page |
| Motion | slides down, 200ms, `cubic-bezier(.2,.7,.2,1)` (the sheet curve) |
| Position | `.mhd.float`: `position:absolute; left:0; right:0; top:0` |
| Box-shadow | `0 10px 28px rgba(0,0,0,.5)` |
| Background / border | unchanged: `var(--bg)`, 1px `var(--border)` bottom |
| Flow | overlays the page, never pushes it down |
| Focus | focus order unchanged; Tab to it while away brings it back |

### Sticky page heads riding under it
| Property | Mobile |
|---|---|
| Which | Collection's filter head (`.pfh`) is the one named and drawn |
| Header away | head pins at `top:0px`, `z-index:5` |
| Header returned | head moves down by 73px (`top:73px`), same 200ms |
| z-order | head 5, under header 6 |

### Under a sheet or modal (Q4)
| Property | Mobile |
|---|---|
| Behaviour | freezes where it was (page can't scroll); stays put when the sheet closes |
| z-order | header 6 < scrim 7 < sheet 8 |
| Scrim | `position:absolute; inset:0; background:rgba(14,15,20,.72)` |
| Drawn | returned header (`.float`, with shadow) visible beneath scrim |

### Keyboard up / field focused (Q5, DP3)
| Property | Mobile |
|---|---|
| Trigger | any text field on the page has focus |
| Behaviour | does not return; a returned header slides away when the field takes focus |
| Precedent | tab bar's `data-hide-on-note-focus` |
| Deck page | typing in Add a card suspends quick return; scrolling up won't bring it over the field's results; rule resumes when the keyboard goes |

### Deck page spacing (DP2, lock 7)
| Property | Mobile |
|---|---|
| Layout | header takes the top; dock and tab bar keep the bottom |
| Gap | 582px of list between them at 844 |
| Overlay | header only ever overlays the list |
| Tab bar | 74px, `var(--surface-rail)`, z-index 5 |
| Dock | `var(--bg)`, 1px top `var(--border)`, z-index 4 |

### Navigation, app scrolls, motion
| Property | Mobile |
|---|---|
| New page | arrives with header in place |
| App scrolls | `reveal()`, scroll restore on Back don't move it (G4; suggested: ignore scroll 300ms after a programmatic scroll or navigation) |
| Reduced motion | no slide; appears and goes in one frame, same thresholds |
| Switch | follows `CARD_SEARCH_ENABLED` (G1) |

## State Coverage
| State | Triggering condition | What renders |
|---|---|---|
| At the top (Q1) | `scrollY` ≤ header | In-flow 73px header, no shadow |
| Away (Q2) | 8px down past it | Header gone (160ms up); filter head pinned at top 0 |
| Returned (Q3, DP2) | 12px up from lowest point | Absolute header at top 0 with `0 10px 28px rgba(0,0,0,.5)`; filter head at 73px; deck: 582px list between header and dock |
| Under a sheet (Q4) | sheet or modal up | Header frozen under scrim (z 6 < 7 < 8) |
| Keyboard up (Q5, DP3) | page field focused | Header away and suspended |
| New page | navigation | Header in place |
| Reduced motion | `prefers-reduced-motion` | Same states, no slide |
