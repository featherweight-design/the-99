# States: Card details carousel (R1, R2 phone)

## R2 phone sheet

| # | State | Sheet top | Paging | Frame |
|---|---|---|---|---|
| h1 | Teaser (on open, after every page) | 532 | Horizontal on the card band | H1, H2 |
| h2 | Dragging | Follows the finger | No | H4 |
| h3 | Full | 64 | **Withheld** | H3 |
| h4 | Full, picker open | 64 | Withheld | (H3) |
| h5 | First / last | 532 | One side; rubber-band | H5 |
| h6 | List of one | 532 | None; the sheet still expands | H6 |
| h7 | Zoom open | n/a | None | as shipped |

Escape: zoom → full→teaser → close. The teaser text swaps when a page commits.

Frames on the canvas: P1–P7 phone, D1–D5 desktop, M1–M3 motion, R1–R3 reduced motion.

## List shape × width

| # | List | Phone (390) | Desktop ≥ 1252 | Desktop 768–1251 | Frame |
|---|---|---|---|---|---|
| s1 | 1 card | No counter, no peeks, drag inert | No neighbors; footer = link only | Same | P4, D4 |
| s2 | 2 cards, on 1 | `1 of 2`, right peek | `1 of 2`, right neighbor, ‹ Prev .4 | Footer only | (P2 shape) |
| s3 | Mid-list | `n of N`, both peeks | Both neighbors, both controls | Footer only | P1, D1, D5 |
| s4 | First | No left peek; right-drag rubber-bands | No left neighbor; ‹ Prev .4, aria-disabled | Footer only | P2, D2 |
| s5 | Last | Mirror of s4 | Mirror of s4 | Footer only | P3, D3 |

## Modal state × paging

| # | State | Paging | Drawn |
|---|---|---|---|
| m1 | Full art header | Swipe, peek tap | Counter + peeks |
| m2 | Compact 72px (picker open past threshold) | **Withheld on phone** | Counter only; no peeks |
| m3 | Picker open, desktop | Footer + neighbors; arrows skip the search field and radiogroup | Unchanged |
| m4 | Zoom open | **None** (decision 2 stands) | Zoom as shipped |
| m5 | Stacked, top layer | Own list | Own counter + peeks (P7) |
| m6 | Held under a sheet | None | Nothing (`onPrev={null}`) |
| m7 | Loading next card | Strip settles on the neighbor's art; content keeps the provider's shipped wait | Shipped wait announcement |
| m8 | Two-faced card | Arrives on its front | Turn unchanged |

## Input

| # | Input | Result |
|---|---|---|
| i1 | Tap centre card | Zoom (shipped) |
| i2 | Tap peek | Page that way |
| i3 | Horizontal drag on header, past 25% or flick | Page; press under it cancelled |
| i4 | Short horizontal drag | Return |
| i5 | Vertical drag | Sheet scroll (shipped) |
| i6 | Drag starting ≤ 16px from screen edge | System's |
| i7 | ← / → (desktop, focus not in search, radiogroup, zoom) | Page; at an end, announce `firstCard` / `lastCard` |
| i8 | Click neighbor | Page |
| i9 | Click backdrop elsewhere | Close (shipped) |
| i10 | Press during a glide | Finish the glide, start the next |

## Announcements (provider live region)

| Event | Spoken |
|---|---|
| Arrive by any paging | `{name}, {n} of {total}` |
| Arrow at an end | `First card in this list` / `Last card in this list` |
| First open | Nothing new |

## Motion

| | Allowed | Reduced |
|---|---|---|
| Phone commit | 240ms glide, incoming 128→180 / .5→1 | Jump |
| Phone return | 180ms | Jump |
| Drag | 1:1; past an end 0.3×, max 40 | Same |
| Desktop page | Art 24px slide + fade, 200ms | Swap |
