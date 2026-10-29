# States · Wizards announcements

Every state the brief asks for, where it is drawn, and its rule. Phone 390 and desktop (`md`, the 1300 frame) ship
together.

## Surface 1 · the Home row

| # | State | Board | Rule |
|---|---|---|---|
| 1.1 | One row of each kind, unseen | Home-Rows | Shipped `FeedItemRow`: hero in the 46x64 slot, mono kicker with the unseen diamond and age, title, summary (2 lines), action line. |
| 1.2 | Seen | Home-Rows | The shipped seen treatment: no diamond. |
| 1.3 | Long title and summary | Row-States | Title wraps, never clamps; summary clamps at 2 lines. |
| 1.4 | Missing or failed hero | Row-States | Plate in the slot with the post glyph in `--fact`. |
| 1.5 | The post as the lead story | Lead-Story | Secret Lair and Commander decklists only; hero landscape (phone 164px band at −1.5°, desktop 272×153 at −3°). |
| 1.6 | 3 of 5 lists, then all out | Row-States | Mono line under the summary: "3 of 5 lists so far", then "All 5 lists". |
| 1.7 | A kind switched off | Offer | Its rows leave; the quiet line names only the kinds still on (G1). |
| 1.8 | Dismissed with ✕ | Row-States | As shipped. |
| 1.9 | Decklists row presses | Home-Rows | Phone: one action line, "See the lists ›" then muted "Read the post ↗". From `md`: stacked, right-aligned, in-app on top. |
| 1.10 | The offer | Offer | While never chosen: one line at the foot of What's new, Pick ▾ opens the boxes in place, ✕ saves an empty choice. |
| 1.11 | Push | Lead-Story | A push opens the post. |

## Surface 2 · Settings › Notifications (R1b layout)

| # | State | Board | Rule |
|---|---|---|---|
| 2.1 | All on (default) | Settings, R1b-Settings | The three Wizards kinds and Friends asking for your spares ticked in both columns. |
| 2.2 | One off | Settings, R1b-Settings | Each box reads against its column head; Home rows and pushes stop for that kind. |
| 2.3 | Push unavailable | Settings, R1b-Settings | Push column, its head and the foot's push clause leave; In app keeps its head. |
| 2.4 | A failed save | Settings | The box returns to its saved state; the shared toast "We couldn't save that. Try again." |
| 2.5 | Device row | R1b-Settings | Its own sunken band above the column heads; states as shipped (`deviceState`). |

## Surface 3 · Precons

| # | State | Board | Rule |
|---|---|---|---|
| 3.1 | Early list in the set block | Announced | Each posted list is a precon tile: commander's card, "you own N of M", name, dots + "early list" (`--fact`, no box). Opens the early page. |
| 3.2 | Partly published | Announced | Meta "3 of 5 lists so far"; revealed commanders without a list stay revealed tiles; the missing list is the none plate's note "1 more list to come". |
| 3.3 | Early list page | Early-List | Head, eyebrow "Early decklist · view-only", dashed `--fact` band with "Read the post ↗", own band, List or Cards, read-only rows with the owned dot, no SET number. No Start, no Link a deck, no Overview, no power reading. |
| 3.4 | Release list arrives | Release-Arrival | On the MTGJSON list, not the street date: the release list replaces the early one; the set leaves Announced; its precons join their year with "new ·" for 14 days. |
| 3.5 | Released, still waiting | Early-List | Page unchanged but the band's words; set block meta "out Nov 13 · release lists not in yet". |
| 3.6 | Unmatched lines | Early-List | G3. |
| 3.7 | No collection | Early-List | Shipped `EmptyCollectionBand` under the early band; counts read 0. |
| 3.8 | Loading | Early-List | The precon page's skeleton. |
| 3.9 | Decklists kind off | Announced | Precons unaffected. |
| 3.10 | The `new` mark | R1b-New-Mark | "new" leads the mono meta line; group head "1 set · new"; no boxed tag. |
