# Design Property Table — Spare asks outside Shopping (handoff 20, Spares.dc.html S1–S4, N1–N3, D1–D2)

Copy is recorded as KEYS; wording goes to `/copy-review`. Everything below needs `SPARE_REQUESTS_ENABLED`; off, the tab is as shipped.

## Spares tab

| Property | Mobile | Desktop |
|---|---|---|
| line | shipped `friendPage.spares.line` + the new press-to-ask key, 11px mono var(--fg-faint), mt 12 | same |
| grid | 2 columns, gap 8 × 12 | 6 columns, gap 20 |
| tile press | opens `SparesSheet` for that card (not card details) | same |
| tile ring (sheet open, and on focus return) | outline 2px solid var(--accent), offset 3px | same |
| count line | flex, center, gap 5px, nowrap: `{count} · ` + mark; never a second line | same |
| Requested mark | inline-flex, gap 6px, var(--accent-text); 7px round dot var(--accent); "Requested" | same |
| Accepted mark | var(--success), "✓ Accepted" | same |
| mark source | THIS friend's ask only | same |
| wishlist line | shipped: 11px bookmark svg + onWishlist, var(--accent-text), gap 4 | same |

## SparesSheet from a friend page

| Property | Mobile | Desktop |
|---|---|---|
| order | the page's friend first, then the shipped order | same |
| kicker | onWishlist when the card is on the reader's wishlist, else none (Shopping: "replacing") — 9.5px mono uppercase .12em var(--fg-faint) | same |
| name | shipped CardDetailTrigger (card details stay one press away) | same |
| buy tag | the card's price, as Shopping draws it | same |
| ✕ | returns focus to the tile | same |
| Shopping / cart callers | unchanged | unchanged |

## Deep link

| Property | Mobile | Desktop |
|---|---|---|
| `?spare={oracleId}` offered | the card's sheet opens on landing, its tile ringed | same |
| `?spare=` gone | no sheet; SocialToast "{friend} no longer has a spare {card}." | same |
| address | `spare` stripped with `mirrorUrl` | same |
| sources | single-card trade-match push, its Home feed item, its Waiting row; multi-card pushes keep their links | same |

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| S1 tab | switch on | line + captions |
| S2 pressed | tile press | sheet, friend first, kicker |
| S3 asked | an ask to this friend open | count line Requested |
| S4 accepted | ask accepted | count line ✓ Accepted |
| N1/N2 landing | `?spare=` of an offered card | sheet open on landing |
| N3 gone | `?spare=` of a card not offered | toast, no sheet |
| off | switch off | tab as shipped, `?spare=` ignored |
