# Card search R1 — states

Every state the brief asks for (§Every state to draw), where it is drawn, and its trigger. A state with no real
trigger is not drawn.

## Phone

| State | Trigger | Board · frame |
|---|---|---|
| Header icon at rest | Any phone page | Header-Phone · HP1 |
| … with the offline pill and install slot | Offline, install offered, 390 | Header-Phone · HP2 (+ zoom, measured 21px air) |
| … offline under 390 | Offline at 360 or 375 | Header-Phone · HP3 (install slot steps aside, G5) |
| Header at the top | `scrollY` ≤ header | Header-Phone · Q1 |
| Header away | 8px down past it | Header-Phone · Q2 |
| Header returned mid-page | 12px up | Header-Phone · Q3; Deck-Page · DP2 |
| Header under a sheet | A sheet or modal is up | Header-Phone · Q4 |
| Header with the keyboard up | A page field has focus | Header-Phone · Q5; Deck-Page · DP3 |
| Sheet empty, no recent cards | Opened; nothing opened from search yet | Sheet-Phone · S1 |
| Sheet empty, recent cards | Opened; ≥1 card opened from search | Sheet-Phone · S2 |
| Typing | ≥2 characters, in flight | Sheet-Phone · S3 |
| Results | Read returned rows | Sheet-Phone · S4, S4b |
| No results | Read returned none | Sheet-Phone · S5 |
| Failed | Read threw or `ok: false` | Sheet-Phone · S6 |
| Offline | Browser offline | Sheet-Phone · S7 |
| Card details from a result | Row pressed | Sheet-Phone · H1 (teaser), H2 (full, Find a deck) |
| Back to the sheet | Card closed | Sheet-Phone · H3 |

## Desktop

| State | Trigger | Board · frame |
|---|---|---|
| Rail field at rest | Any page | Rail-Desktop · D1 |
| Hover | Pointer on the well | Rail-Desktop · D1h |
| Focused, recent cards / none | Press or ⌘K | Rail-Desktop · D2, D2n |
| ⌘K from a page with no field focused | ⌘K / Ctrl K | Rail-Desktop · D2 (same open state; keys note) |
| Typing | ≥2 characters, in flight | Rail-Desktop · D3 |
| Results | Read returned rows | Rail-Desktop · D4 |
| No results | Read returned none | Rail-Desktop · D5 |
| Failed | Read failed | Rail-Desktop · D6 |
| Card details from a result | ↵ or click | Rail-Desktop · D7 |
| Back to the field | Card closed | Rail-Desktop · D8 |

## The deck page

| State | Board · frame |
|---|---|
| Search all cards and Add a card on one screen (phone) | Deck-Page · DP1 |
| Header returned over the bottom controls | Deck-Page · DP2 |
| Typing in Add a card, header suspended | Deck-Page · DP3 |
| Search all cards opened from the deck | Deck-Page · DP4 |
| Rail field beside the page's own add field (desktop) | Deck-Page · DD1, DD2 |

## Result rows

| Case | Board |
|---|---|
| Owned N | Rows |
| In a deck | Rows |
| In a deck, no copy | Rows |
| On the wishlist | Rows |
| None of them | Rows |
| All of them | Rows |
| A long name (320, wraps) | Rows |
| A Secret Lair flavor name match | Rows |
| Wishlist signal A / B | Rows |

## Not drawn, on purpose

- A rail field "offline" state on desktop: the rail's own offline pill already says it, and the field behaves as the
  phone's S7. Same words.
- A loading state for card details: it opens exactly as it ships.
- Any filter or sort: lock 2.
