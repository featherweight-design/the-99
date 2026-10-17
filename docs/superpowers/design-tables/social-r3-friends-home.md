# Design Property Table — Friends on Home

Source: `design/design_handoff_the99_social_r3/addendum-friends-home/` (R2b, approved 2026-10-16): `Friends.dc.html`
(the section), `HomeDesk.dc.html` / `HomePhone.dc.html` (placement), `Home-Desktop.dc.html` / `Home-Phone.dc.html`
(boards H1–H4, P1–P4), `Themes-Home-*.dc.html`, `README.md`, `STATES-friends-home.md`, `READINESS.md`.

Columns: **Mobile** = the phone part (`phone: true`, drawn at 390; the README places 640–1179 on the phone layout and the
split at 1180). **Desktop** = the 1280 part (`phone: false`, the 316 right column).

Token mapping: the parts draw literal hex from a per-theme table; each key maps to the app token whose Low Sun value
matches (confirmed against the design's token sheet): `fg`→`--fg`, `body`→`--fg-body`, `muted`→`--fg-muted`,
`faint`→`--fg-faint`, `strong`→`--border-strong`, `dashed`→`--border-dashed`, `raised`→`--surface-raised`,
`inset`→`--surface-inset`, `accent` / `rgb`→`--accent`, `warning`→`--warning`. Fonts are drawn as literal
`'IBM Plex Mono'` / `'IBM Plex Sans'`; written below as `--font-mono` / `--font-sans`.

Copy wording is not recorded; only which copy element appears.

No hover or focus style is drawn anywhere in the section's source: every hover/focus row reads —.

---

## Component: Placement on Home

### Desktop (two columns, from 1180)
| Property | Mobile | Desktop |
|---|---|---|
| Column | n/a (single column) | Right column, `flex: 0 0 316px` |
| Column width | n/a | 316px |
| Gap to left column | n/a | 20px (body row `display:flex; gap:20px; align-items:flex-start`) |
| Body row padding | n/a | 20px 26px 26px |
| Position in column | n/a | Under Commitments (Commitments' mono label, then its card, then Friends) |
| Column's own gap | n/a | 11px (flex column) |
| Section margin-top under Commitments | n/a | 4px (`col` true), so 15px from Commitments card to the FRIENDS label |
| Commitments absent (read failed) | n/a | Column renders for Friends alone; section at top of column, margin-top 0 (G7) |
| Left column | n/a | Unchanged: Ready to build, then Pick up where you left off; Friends joins neither |
| Banner | n/a | Spans both columns above the body, unchanged; Friends never moves above it |
| Surface | — (no card, border, shadow, ✕) | — (no card, border, shadow, ✕) |

### Phone (single column, below 1180)
| Property | Mobile | Desktop |
|---|---|---|
| Order | Header buttons → banner (if up) → READY TO BUILD heroes → "12 more… / All commanders" line → **Friends** → PICK UP WHERE YOU LEFT OFF → resume rows → Commitments (last) | n/a |
| Container | Body column `padding: 14px 16px 16px; display:flex; flex-direction:column; gap:12px` | n/a |
| Section width | 358px (390 − 16 gutter each side) | n/a |
| Wrapper | `div` with `margin-top: 6px` | n/a |
| Space above (from All commanders line) | 18px (12 gap + 6 margin) | n/a |
| Space below (to PICK UP label) | 18px (12 gap + the label row's own 6px margin-top) | n/a |
| Section margin-top | 0 (`col` false) | n/a |
| Implementation note | Drawn in two places or reordered with CSS `order` below 1180 (G8) | same |

---

## Component: FriendsSection

### Section (`<section aria-labelledby>`)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `section`, `aria-labelledby` the heading id | same |
| Layout | flex, column | flex, column |
| Gap (between head, row, line, link line, button) | 12px | 11px |
| Width | 358px | 316px |
| Background | transparent | transparent |
| Border / radius / shadow | — | — |
| Base font-family | `--font-sans` | `--font-sans` |
| Base color | `--fg-body` | `--fg-body` |
| Conditional | Rendered only with `SOCIAL_FRIENDS_ENABLED`; with it off, no section and no space kept | same |
| Dismiss ✕ | — (permanent) | — (permanent) |

### Head row (label line)
| Property | Mobile | Desktop |
|---|---|---|
| Layout | flex, `align-items: center`, `justify-content: space-between` | same |
| Gap | 12px | 12px |
| min-height | 24px | 14px |

### Heading (mono label, `h2`)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `h2` with id | same |
| Copy element | `FRIENDS` (literal uppercase) | same |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 10px | 10px |
| font-weight | 400 | 400 |
| letter-spacing | .14em | .14em |
| text-transform | — (uppercase in the literal) | — |
| color | `--fg-faint` | `--fg-faint` |
| margin | 0 | 0 |

### Count (inside the heading)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `span` inside the `h2`, copy element ` · N` (the friend total) | same |
| letter-spacing | .08em | .08em |
| Other type | inherits heading (mono 10px, 400, `--fg-faint`) | same |
| Conditional | Only with one or more friends | same |

### "All friends ›" link
| Property | Mobile | Desktop |
|---|---|---|
| Element | `a` to /friends | same |
| Layout | flex, `align-items: center` | same |
| Gap (text to chevron) | 4px | 4px |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 12.5px | 12.5px |
| color | `--fg-muted` | `--fg-muted` |
| text-decoration | none | none |
| min-height (hit) | 44px | — |
| margin | -10px 0 (absorbs the 44 hit into the 24 head) | — |
| padding | 0 2px 0 12px | — |
| Position | Right end of the head row | same |
| Conditional | Only with one or more friends | same |
| Hover / focus | — | — |

### Chevron (`›`)
| Property | Mobile | Desktop |
|---|---|---|
| aria-hidden | true | true |
| font-size | 15px | 15px |
| line-height | 1 | 1 |
| color | `--fg-faint` | `--fg-faint` |

### Seat row (`ul`)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `ul`, `list-style: none` | same |
| margin / padding | 0 / 0 | 0 / 0 |
| Layout | flex, `justify-content: space-between`, `align-items: flex-start` | same |
| Slot count | Always 5, flush to both edges | same |
| Wrap / scroll | — (never grows, wraps or scrolls) | same |
| Fill rule | ≤5 friends: every face, then empty seats to 5. ≥6: 4 faces then `+N`. No friends: your seat, then 4 empty seats | same |
| Order | /friends' order (`listFriends`, by name) | same |

### Slot (`li`)
| Property | Mobile | Desktop |
|---|---|---|
| flex | none | none |
| width | 56px | 52px |
| Layout | flex, column, `align-items: center` | same |
| Gap (square to caption) | 6px | 6px |
| Drawn size (face slot) | 56 × 64 | 52 × 57 |

### Face seat (link)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `a` to `/friends/[publicId]`, `aria-label` the friend's page label | same |
| width | 100% of slot | 100% of slot |
| min-height | 64px | — |
| Layout | flex, column, `align-items: center` | same |
| Gap | 6px | 6px |
| text-decoration | none | none |
| Hover / focus | — | — |

### Face image (shipped `Face` at 40)
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 40 × 40px | 40 × 40px |
| box-sizing | border-box | border-box |
| border-radius | 10px | 10px |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| background | `--surface-raised` | `--surface-raised` |
| object-fit | cover | cover |
| display | block | block |
| alt | "" | "" |
| Content | Friend's signature commander; their initials when they have none (shipped `Face`) | same |

### Face name
| Property | Mobile | Desktop |
|---|---|---|
| Copy element | Friend's name | same |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 11.5px | 11.5px |
| color | `--fg-body` | `--fg-body` |
| max-width | 50px (slot − 6) | 46px (slot − 6) |
| overflow / text-overflow / white-space | hidden / ellipsis / nowrap | same |

### "+N" overflow seat
| Property | Mobile | Desktop |
|---|---|---|
| Element | `li`, `aria-hidden="true"`; a count, not a press | same |
| Conditional | Total > 5 | same |
| N | total − 4 (seven friends: `+3`) | same |
| Square: width × height | 40 × 40px | 40 × 40px |
| Square layout | flex, centered both axes | same |
| Square border / background | — | — |
| `+N` font-family | `--font-mono` | `--font-mono` |
| `+N` font-size | 12.5px | 12.5px |
| `+N` color | `--fg-muted` | `--fg-muted` |

### "+N" subline
| Property | Mobile | Desktop |
|---|---|---|
| Copy element | `more` | same |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 11.5px | 11.5px |
| color | `--fg-faint` | `--fg-faint` |

### Empty dashed seat
| Property | Mobile | Desktop |
|---|---|---|
| Element | `li`, `aria-hidden="true"` (picture, not a control) | same |
| Conditional | Fills slots after faces (or after your seat) up to 5; none when overflowing | same |
| width × height | 40 × 40px | 40 × 40px |
| box-sizing | border-box | border-box |
| border-radius | 10px | 10px |
| border | 1.5px dashed `--border-dashed` | 1.5px dashed `--border-dashed` |
| Caption | — | — |

### Held seat (the first empty seat while a link is open)
| Property | Mobile | Desktop |
|---|---|---|
| Conditional | A friend link open; applies to the first empty seat only | same |
| width × height | 40 × 40px | 40 × 40px |
| box-sizing | border-box | border-box |
| border-radius | 10px | 10px |
| border | 1.5px dashed `--accent` at 70% (`rgba(accent, .7)`) | same |
| Layout | flex, centered both axes | same |

### Held-seat diamond
| Property | Mobile | Desktop |
|---|---|---|
| width × height | 6 × 6px | 6 × 6px |
| background | `--accent` | `--accent` |
| transform | rotate(45deg) | rotate(45deg) |
| Conditional | Held seat only; `display: none` otherwise | same |

### Your seat (no friends)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `li`, `aria-hidden="true"` | same |
| Conditional | Zero friends; first slot | same |
| Image | Same as Face image (40 × 40, radius 10, 1px `--border-strong`, `--surface-raised`, cover); your signature commander, your initials with none | same |
| Caption copy element | `You` | same |
| Caption font-size | 11.5px | 11.5px |
| Caption color | `--fg-faint` | `--fg-faint` |
| Link | — (not a press) | — |

### Invite line (`p`)
| Property | Mobile | Desktop |
|---|---|---|
| Conditional | Zero friends only | same |
| Copy element | The no-friends invite line (shorter clause when games/spares are off for the reader, G5) | same |
| margin | 0 | 0 |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 13px | 12.5px |
| line-height | 1.5 | 1.5 |
| color | `--fg-body` | `--fg-body` |

### Open-link line (`p`)
| Property | Mobile | Desktop |
|---|---|---|
| Conditional | One friend link open (unused). Under the invite line with no friends; under the faces with friends | same |
| Copy elements | Link-open label with time left, a separator dot, `Show` | same |
| margin | 0 | 0 |
| Layout | flex, `align-items: center`, `flex-wrap: wrap` | same |
| Gap | 6px | 6px |
| font-family | `--font-mono` | `--font-mono` |
| font-size | 11px | 11px |
| color (a day or more left) | `--fg-muted` | `--fg-muted` |
| color (under a day) | `--warning` (time-left copy switches to the under-a-day string) | same |

### Separator dot
| Property | Mobile | Desktop |
|---|---|---|
| aria-hidden | true | true |
| color | `--fg-faint` | `--fg-faint` |

### Show (`button`)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `button type="button"` with an `aria-label` naming the link | same |
| Action | Opens the shipped sheet on that link | Opens the shipped dialog on that link |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 12.5px | 12.5px |
| font-weight | 500 | 500 |
| color | `--fg` (not tinted by the under-a-day warning) | same |
| text-decoration | underline, color `--accent` at 55%, `text-underline-offset: 3px` | same |
| border / background | 0 / transparent | 0 / transparent |
| min-height (hit) | 44px | — |
| margin | -14px 0 | — |
| padding | 0 8px | 0 2px |
| Hover / focus | — | — |

### Two or more links open (described, not drawn)
| Property | Mobile | Desktop |
|---|---|---|
| Conditional | Two or more friend links open | same |
| Copy elements | Count of open links, separator, `See them ›` | same |
| Target | /friends | same |
| Styling | Not drawn; the source gives no values beyond "the same line" | same |

### Add a friend (`button`)
| Property | Mobile | Desktop |
|---|---|---|
| Element | `button type="button"`, ghost press | same |
| Action | Makes a link and opens the shipped sheet | Makes a link and opens the shipped dialog |
| align-self | stretch (full width) | flex-start (left-aligned) |
| height | 44px | 32px |
| padding | 0 16px | 0 14px |
| border-radius | 10px | 8px |
| border | 1px solid `--border-strong` | 1px solid `--border-strong` |
| background | transparent | transparent |
| font-family | `--font-sans` | `--font-sans` |
| font-size | 14px | 12.5px |
| color | `--fg` | `--fg` |
| Fill / accent | — (Home's one fill is New deck) | — |
| Making a link | Reads the making-a-link string, `aria-disabled` | same |
| Ten links open | Shipped too-many toast; press stays | same |
| Conditional | Always (every state) | same |
| Hover / focus | — | — |

---

## State Coverage

| State | Drawn | Triggering condition |
|---|---|---|
| Switch off | — | `SOCIAL_FRIENDS_ENABLED` off: no section, no space kept |
| No friends | H1, P1 | Friend total 0: `FRIENDS` (no count), your seat + 4 dashed seats, invite line, Add a friend, no All friends link |
| One friend | H2, P2 | Total 1: count, All friends ›, one face + 4 empty seats, Add a friend |
| Two to five friends | rule | Total 2–5: every face by name order, then empty seats to 5 |
| Six or more (overflow) | H3, P3 | Total ≥ 6: 4 faces then `+N` (N = total − 4), no empty seats |
| Phone placement | P1–P4 | Below 1180: after Ready to build, before Pick up where you left off; Commitments last |
| A friend link open, no friends | H4, P4 | One unused link open and total 0: link line under the invite line; first empty seat held with the diamond |
| A link open, under a day | rule | Open link with < 1 day left: link line in `--warning`, under-a-day copy |
| Two or more links open | rule | ≥ 2 open links: count line with See them › to /friends |
| Friends and a link open | rule | Total ≥ 1 and a link open: the same line under the faces |
| Making a link | rule | Add a friend pressed, link pending: making-a-link copy, `aria-disabled` |
| Ten links open | rule | Ten-link hold reached: shipped toast, press stays |
| Link accepted while its dialog is open | rule | Watched invite accepted on Home: face lands in the row, shipped toast |
| A friend with no commander | rule | Friend has no signature commander: shipped `Face` initials |
| Your own face, with no commander | rule | No-friends state and viewer has no signature commander: your initials |
| Banner up | H2, P2 | Arrivals banner showing: banner above both columns (desktop) / under header buttons (phone), Friends unchanged |
| Commitments absent (read failed) | rule | Commitments read fails: right column renders for Friends alone (G7) |
| Zero decks / decks and no cards | rule | Dashboard in those shapes: section still shows; left column as shipped |
