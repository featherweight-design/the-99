# Design Property Table — Card search (phone)

Source: `design/design_handoff_the99_card_search/` (R2, approved 2026-10-16). Boards read: `R2 - Sheet-Phone.dc.html`
(S1–S7, S4b, H1–H3), `R1 - Header-Phone.dc.html` (HP1–HP3, HP2 zoom), `R1 - Rows.dc.html` (phone row only),
`R2 - Deck-Page.dc.html` (DP1, DP4), `R2 - Options.dc.html` (graphic A), plus `README.md`, `STATES-card-search.md`,
`card-search · copy strings.ts`. Scope: phone (≤ md). Boards are drawn at 390×844, Kamigawa theme; hex values below
are that theme's resolved tokens, the token name is what ships. The dashed pink `.new` outline marks new parts on the
boards and is NOT shipped chrome.

Not drawn on any board (flagged, not invented): a pressed/active state for a phone row, the "previous rows at 50%"
frame, the 20-result foot line frame, and any safe-area inset. Each is noted in its table.

## Header search icon (`MobileHeader` cluster)

### Icon press (`.sic`)

| Property | Mobile |
|---|---|
| Press box | 44×44px, `border-radius: 12px`, flex centred, `flex: none` |
| Background / border | none at rest (no box, no fill) |
| Glyph | inline SVG 20×20, `viewBox 0 0 20 20`, `fill: none`, `stroke: currentColor`, `stroke-width: 1.6`, `stroke-linecap: round`; `<circle cx=8.6 cy=8.6 r=5.6/>` + `<path d="M12.8 12.8 17 17"/>`; `aria-hidden` |
| Color at rest | `var(--fg-muted)` (#959AAD) |
| Open state (`.sic.on`, DP4) | `color: var(--fg)`, `background: var(--elevated)` (#20222A) while the sheet is up |
| Margin | `margin-right: 2px` (the only gap to the account button) |
| Position in cluster | directly LEFT of the account button; order left to right: offline pill, install slot, search, account |
| Account button beside it (shipped) | `.av` 38×38, radius 12, `1px solid var(--accent)`, 500 13px IBM Plex Sans |
| Header (shipped) | 73px, padding 20px 20px 14px, 1px `--border` bottom, `--bg` |
| Accessible name | `aria-label="Search all cards"` (`cardSearchCopy.label`), `aria-haspopup="dialog"` (README §7) |
| Focus return | closing the sheet returns focus to this icon |
| Switch | follows `CARD_SEARCH_ENABLED` (G1) |

### Offline pill + install slot (HP2 / HP3, G5)

| Property | Mobile |
|---|---|
| Offline pill (shipped `.offp`) | min-height 36, padding 0 12, radius 999, `rgba(224,145,60,.14)`, 600 12px IBM Plex Mono, `--fg`, `margin-right: 8px`, 8px `--warning` dot, gap 6 |
| Install slot (shipped `.inst`) | 44×44 button (radius 12, 1px `--border`, `--surface-raised`) + 44×44 dismiss (`--fg-faint`) |
| All three at 390 (HP2) | cluster measures 268px; wordmark keeps 21px of air. Shipped sizes unchanged |
| Under 390 while offline (HP3, drawn at 360) | install slot is NOT rendered (steps aside); cluster = pill, search, account. Returns the moment the pill goes |
| Online at 360 | all fits, 87px left |

## Search sheet (`.ss`)

### Sheet container

| Property | Mobile |
|---|---|
| Coverage | full screen, `position: absolute; inset: 0`, over the header AND tab bar (z above both) |
| Background | `var(--bg)` (#0E0F14) |
| Layout | flex column: field row, optional progress bar, body (`.ssb`, `flex: 1; min-height: 0; overflow: hidden` on the board, scrolls in build) |
| Open | field focused and keyboard up in the same tap (focus in the tap's own handler) |
| Keyboard drawn | 291px system keyboard over the bottom (S1–S5, S7); lowered in S4b, S6, H3 |
| Safe area | not drawn on any board |
| Role | modal dialog; hidden heading = `Search all cards` (copy note) |
| Close | ✕ press, Escape (clears a query first, then closes), Back (one press closes) |

### Field row (`.ssh`)

| Property | Mobile |
|---|---|
| Layout | flex row, `align-items: center`, `gap: 6px` |
| Padding | `14px 8px 12px 14px` |
| Divider | `border-bottom: 1px solid var(--border)` (#181C26) |
| Height (derived) | 14 + 44 + 12 + 1 = 71px |

### Field (`.sfld`)

| Property | Mobile |
|---|---|
| Size | `flex: 1; min-width: 0; height: 44px` |
| Border | `1px solid var(--border-strong)` (#262A35); focused (`.on`) `border-color: var(--accent)` |
| Radius | 10px |
| Background | `var(--surface-sunken)` (#101219) |
| Padding | `0 6px 0 13px` |
| Gap | 10px |
| Font | 16px IBM Plex Sans (16 avoids iOS zoom), `white-space: nowrap` |
| Placeholder | `Search all cards`, `color: var(--fg-placeholder)` (#7D8294) |
| Typed text | `color: var(--fg)` |
| Leading glyph | search SVG 18×18 (same paths, stroke 1.6), `currentColor` |
| Caret (drawn) | 1.5×19px `var(--accent)`, `margin-left: -9px` after text (−2px before placeholder) |
| Clear ✕ (`.clr`) | shows once the field has text; 32×32, `margin-left: auto`, `--fg-faint`, 13px; clears the query |
| Unfocused (S4b, S6, H3) | border back to `--border-strong`, text stays `--fg` |
| Role | combobox owning a listbox (as the deck's Add a card field); ↑ ↓ move, ↵ opens |
| Shortcut text | none on the phone |

### Close control (`.sx`)

| Property | Mobile |
|---|---|
| Size | 44×44, flex centred, `flex: none` |
| Glyph | `✕` text, 16px, `var(--fg-muted)` |
| Accessible name | `Close search` (`cardSearchCopy.closeAria`) |

### Progress bar (`.prog`, S3)

| Property | Mobile |
|---|---|
| Placement | directly under the field row, full width |
| Track | `height: 2px`, `background: var(--border)`, `overflow: hidden` |
| Fill | `var(--accent)`, `width: 38%` from left (drawn static; indeterminate in build) |
| When | a search is in flight (first search AND a later one) |

## Sheet states

### S1 — empty, no recent cards (`.sempty` + graphic A)

| Property | Mobile |
|---|---|
| Block | padding `44px 28px 0`, flex column, centred, `text-align: center`, `gap: 10px` |
| Graphic A box (`.g`) | 200×150px, `position: relative`, `role="img" aria-hidden="true"` |
| Back card (`.bc.back`) | left 31, top 14, 70×100, `rotate(-18deg)`, `#20222A`, `1.5px solid #262A35` |
| Middle card (`.bc.mid`) | left 65, top 14, 70×100, no rotation, `#1B1D25` on the board, which no token resolves to: ships `var(--surface-raised)` (#191B22), with `1.5px solid var(--border-dashed)` (#343843) |
| Front card (`.bc.front`) | left 99, top 14, 70×100, `rotate(18deg)`, `color-mix(in srgb, #FF4D9A 14%, #16181F)`, `1.5px solid #FF4D9A`, text `99` 700 26px Chakra Petch `#FF4D9A`, centred |
| All cards | `border-radius: 8px`, `box-sizing: border-box`, `box-shadow: 0 10px 24px rgba(0,0,0,.5)` |
| Lens (`.lens`) | left 116, top 66, 56×56 circle, `3px solid #FF4D9A`, `background: rgba(14,15,20,.35)`, `box-shadow: 0 0 0 1px rgba(0,0,0,.4), 0 10px 24px rgba(0,0,0,.45)` |
| Handle (`.handle`) | left 164, top 115, 30×5, radius 3, `#FF4D9A`, `rotate(45deg)`, `transform-origin: left center` |
| No card art | none anywhere in the empty state |
| Title | `Look up any card`, 700 19px Chakra Petch, `--fg` |
| Body | `Type part of a card’s name to see what it does, whether you own it, and which of your decks hold it.` 14.5px/1.6 IBM Plex Sans, `--fg-muted`, `max-width: 300px`, `text-wrap: pretty` |

### S2 — empty, recent cards

| Property | Mobile |
|---|---|
| Heading row (`.slab`) | flex, `justify-content: space-between`, padding `14px 16px 6px` |
| Heading | `Recent cards`, `.k` style: IBM Plex Mono 500 10.5px, `letter-spacing: .14em`, uppercase, `--fg-faint` |
| Clear | `Clear`, link, 500 13.5px IBM Plex Sans, `--accent`, `min-height: 36px`, underline offset 3px; empties the list |
| Rows | result rows (below), first has no top border; up to 8, newest first, deduped |
| Offline | the whole recent list is hidden (S7) |

### S3 — typing, first search in flight

| Property | Mobile |
|---|---|
| Starts | ≥2 characters, 150ms after the last key |
| Progress bar | shown (see above) |
| Meta line (`.smeta`) | `Searching…`, padding `12px 16px 4px`, 11.5px IBM Plex Mono, `--fg-faint` |
| Skeleton rows | 3 |
| Skeleton row (`.skel`) | flex, `gap: 12px`, `height: 72px`, padding `0 16px`, `border-top: 1px solid var(--border)` (first: none) |
| Skeleton art | 40×56, radius 4, `var(--surface-raised)` (#191B22) |
| Skeleton lines | 2 bars, 10px tall, radius 5, `--surface-raised`, gap 9px; widths row1 62%/40%, row2 48%/30%, row3 70%/44% |
| A later search | previous rows stay, at 50% opacity, under the same bar (README §1; not drawn) |

### S4 / S4b — results

| Property | Mobile |
|---|---|
| Count line (`.smeta`) | `N cards` / `1 card`, same type as `Searching…`; also the live region's text |
| Order | name starts with query, then a word starts with it, then any match, then by name (G3) |
| Max | 20 |
| Foot line at 20 (`.sfoot`, not drawn as a frame) | `Showing the first 20. Type more of the name to narrow it.` padding 14px 16px, 13px/1.55, `--fg-muted`, `border-top: 1px solid var(--border)` |
| S4b | dragging the list lowers the keyboard; count line scrolls away with the list; field unfocused (grey border), query kept with its ✕ |

### S5 — no results (`.smsg`)

| Property | Mobile |
|---|---|
| Box | margin `18px 16px 0`, padding 18px, `1px solid var(--border-strong)`, radius 12, `--surface-sunken`, flex column gap 8 |
| Title | REUSED `collectionEditCopy.add.noResultsTitle` (`No card is named “zqx”`), 600 15.5px IBM Plex Sans |
| Body | REUSED `noResultsBody`, 14px/1.6, `--fg-muted` |
| Keyboard | stays up |

### S6 — failed

| Property | Mobile |
|---|---|
| Box | same `.smsg` box, `role="alert"` |
| Sentence | REUSED `searchFailed` (`We couldn’t search just now. Check your connection and try again.`), 14px/1.6, `color: var(--fg-body)` |
| Try again (`.obtn`) | `align-self: flex-start`, `margin-top: 6px`, 44px tall, padding 0 18, radius 10, `1px solid var(--border-strong)`, 500 14px IBM Plex Sans, `--fg` |
| Placement | inline in the results area, not a toast; field keeps the query; keyboard down |

### S7 — offline

| Property | Mobile |
|---|---|
| Box | same `.smsg` box |
| Title | `You’re offline`, 600 15.5px, prefixed by an 8×8 `--warning` dot, gap 8 |
| Body | `Search needs a connection. Keep typing if you like: results come in once you’re back online.` 14px/1.6 `--fg-muted` (the handoff's line, TIGHTENED by /copy-review to the shipped "once you’re back online") |
| Field | still focused and types; search runs by itself when back online |
| Recent cards | hidden |

## Result row (`.rr`, phone)

### Row

| Property | Mobile |
|---|---|
| Layout | flex row, `align-items: center`, `gap: 12px` |
| Height | `min-height: 72px` (grows when the name wraps, or with the flavor line) |
| Padding | `8px 10px 8px 16px` |
| Divider | `border-top: 1px solid var(--border)`; first row (`.first`) none |
| Press | the whole row is one press (opens card details); no other control |
| Pressed / active | NOT drawn for phone (desktop keyboard-active is `--elevated` fill) |
| Return focus (H3, `.foc`) | `box-shadow: inset 0 0 0 2px var(--accent)`, radius 8 on the row that opened the card |
| Role | option in the listbox |
| Accessible name | one sentence, `cardSearchCopy.row.aria`: `Ashling, the Limitless, 2 owned, in HD - Elementals and 1 more deck, on your wishlist` |

### Art (`.art`)

| Property | Mobile |
|---|---|
| Size | 40×56 (63:88), `flex: none` |
| Radius | 4px, `overflow: hidden` |
| Background | `var(--surface-sunken)` while loading |
| Shadow | `0 0 0 1px rgba(0,0,0,.35), 0 4px 10px rgba(0,0,0,.35)` |
| Image | `object-fit: cover`, `alt=""` |

### Text column (`.tx`)

| Property | Mobile |
|---|---|
| Layout | `flex: 1; min-width: 0`, column, `gap: 4px` |

### Name (`.nm`)

| Property | Mobile |
|---|---|
| Font | 600 15px/1.3 IBM Plex Sans, `--fg` |
| Wrap | up to 2 lines (`-webkit-line-clamp: 2`), wraps rather than cutting off; the row grows |
| Match highlight | typed letters in `<em>`: `font-style: normal; color: var(--accent)` (every match position as drawn: `In`visible, Zimone, `In`finite, Ashl`in`g) |
| Title for a flavor match | the card's own name (not the flavor name) |

### Flavor line (`.fl`, Secret Lair match only — 3-line variant)

| Property | Mobile |
|---|---|
| Position | line 2, between name and ownership; ownership moves to line 3 |
| Text | REUSED `printed as ` + flavor name, match letters in accent `<em>` |
| Font | 11.5px IBM Plex Mono, `--fg-muted`, one line, ellipsis |

### Ownership line (`.own`)

| Property | Mobile |
|---|---|
| Layout | flex row, `gap: 0`, `white-space: nowrap`, `min-width: 0` |
| Font | 11.5px IBM Plex Mono, base color `--fg-faint` |
| Owned | `×N owned` (REUSED `rowOwned`), the `×N` in `<b>` 500 weight `--fg-body`; ` owned` in `--fg-faint` |
| Not owned | `not owned` (REUSED `rowNotOwned`), `--fg-faint`; always present, a row is never blank |
| Joiner (`.j`) | ` · `, `color: var(--border-dashed)` (#343843), `white-space: pre`, `flex: none` |
| Deck (`.dn`) | `in {deck}` (first of the reader's decks by name), `--fg-body`, ellipsis, `min-width: 0` (gives way first) |
| More decks (`.pl`) | `&nbsp;+N`, `--fg-body`, `flex: none` (never truncated) |
| In a deck, no copy | `not owned · in {deck}` both shown |

### Wishlist marker (`.wl`)

| Property | Mobile |
|---|---|
| Box | 28×28, flex centred, `flex: none`, row's last child |
| Glyph | filled bookmark SVG 16×16, `viewBox 0 0 24 24`, `fill/stroke: currentColor`, stroke 1.8, `linejoin: round`, `path d="M6.5 3.5h11v17l-5.5-4-5.5 4z"` |
| Color | `var(--accent)` |
| Absent | slot kept as `visibility: hidden` (`.sp`) so names line up |
| Accessible name | `on your wishlist`; not a press |
| Option chosen | A (bookmark) approved; B not built |

## Handover (H1–H3)

| Property | Mobile |
|---|---|
| H1 | pressing a row closes the sheet and opens shipped card details on its own (unstacked); counter pill `3 of 10` pages the results; plain ✕ close. No change to card details |
| H2 | `Find a deck for it` stays (card is a first layer) |
| H3 | ✕ / Escape / swipe / Back on the card restores the sheet as it was: query, results, scroll; focus ring on the opening row (`.foc`); keyboard stays down; field unfocused |
| History | one entry for search, replaced by the card's; Back from card → search, Back again → page |

## Deck page (DP1, DP4)

| Property | Mobile |
|---|---|
| DP1 | header icon at rest (as HP1) over the deck page; the dock's `Add a card by name · Red only` field unchanged |
| DP4 | icon in its open state (`.sic.on`: `--fg` on `--elevated`); sheet covers dock and tab bar; results ignore the deck's identity (`1 card`, Giada, not owned, bookmark) |

## Accessibility (README §7)

| Property | Mobile |
|---|---|
| Icon | `Search all cards`, `aria-haspopup="dialog"` |
| Sheet | modal dialog; focus to the field in the tap handler |
| Field | combobox + listbox; ↑ ↓ move, ↵ opens |
| Live region | polite, always mounted; announces the count or the no-results line after typing pauses 500ms |
| Failure | `role="alert"` |
| Escape / Back | Escape clears a query then closes; Back closes in one press |
| Close | returns focus to the icon |
| Row | one-sentence accessible name; bookmark `on your wishlist`; graphic A `aria-hidden` |

## State Coverage

| State | Trigger | What renders |
|---|---|---|
| Icon at rest (HP1) | any phone page, switch on | 20px `--fg-muted` glyph on 44px press left of account |
| Icon + offline pill + install (HP2) | offline, install offered, ≥390 | pill, install slot, search, account; 21px air |
| Icon offline under 390 (HP3) | offline at <390 | install slot hidden; pill, search, account |
| Icon open (DP4) | sheet up | `--fg` glyph on `--elevated` |
| S1 empty, none recent | opened, nothing opened from search yet | field (focused, placeholder), graphic A 200×150, title + body |
| S2 empty, recent | opened, ≥1 recent card | `Recent cards` + `Clear`, up to 8 rows |
| S3 typing | ≥2 chars, 150ms debounce, in flight | 2px accent bar, `Searching…`, 3 skeleton rows |
| S3 later search | new query while rows shown | previous rows at 50% under the bar (not drawn) |
| S4 results | read returned rows | `N cards` count, rows best-match first |
| S4b scrolled | list dragged | keyboard lowered, field unfocused, query kept |
| Limit | read returned 20 | foot line `Showing the first 20…` (not drawn as frame) |
| S5 no results | read returned none | `.smsg` with shipped no-results title/body, keyboard up |
| S6 failed | read threw or `ok: false` | `.smsg role=alert` with shipped failure sentence + `Try again` |
| S7 offline | browser offline | `.smsg` with warning dot `You’re offline` + body; recent hidden; field still types |
| H1/H2 card details | row pressed | sheet closes; shipped card details, `n of N`, Find a deck stays |
| H3 back | card closed | sheet restored (query, results, scroll), focus ring on the opening row |
