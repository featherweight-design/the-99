# STATES — /about, R3 changes

`STATES-about.md` and `STATES-about-r2.md` still govern. This file records what R3 changes,
and **supersedes both wherever they disagree.**

## §E Corrected figures

| # | Figure | Draws | Must not |
|---|---|---|---|
| E1 | Fit, degraded | `27/40 MEASURABLE FIT`, two segments | Print any denominator other than 40 or 100. Rescale a 40 to look like a 100 |
| E2 | Status plate | Badge, bar, **one figure**: `created today`, `87 of 99`, `5 over`, `2 lines unresolved`, `3 to buy · $12.40`, `99 of 99` | Draw a sentence beside a badge. Quote a JSDoc table as UI |
| E3 | Status key | Four lines, grouped: not-legal-yet / something-to-settle / To buy / Complete | Six lines, one per status — that is the dropped column returning |
| E4 | Availability | Four numbered states — free, `1 in a brew`, `none free`, `short N` — plus an un-numbered not-owned row | Teach three. Give the not-owned row a fifth numeral |
| E5 | Any diamond | `--avail-soft` hollow, `--avail-hard-fg` solid, `--avail-over-fg` doubled with `--avail-over-border` | Use `--warning` or `--danger` for an availability mark |
| E6 | Role figures | Ramp 10, Card draw 10, Removal 8, Board wipes 3 | Draw `Lands` as a role. Abbreviate `Card draw` to `Draw` |

## §F The new entries

| # | State | Draws | Must not |
|---|---|---|---|
| F1 | Browse (plate) | Search, chips, grid/rows toggle, result count, set count | Imply the toggle is a filter |
| F2 | Deck page (plate) | Header with badge, curve / colours / cost, tab row with counts | Claim a tab this handoff has not verified — the three drawn are the list, Games, Versions |
| F3 | Deck import (inset) | Three modes, the link field, one `unmatched` row with `Fix` | Show a review gate; there isn't one |
| F4 | Put back (inset) | Struck row, `Put back`, the count after removal | Draw a toast. The undo lives where the removal happened |
| F5 | Export (plate) | Two tabs with the Shopping count, the list, `Copy shopping list`, `.txt`, `Buy these at Mana Pool ↗` | Read as a checkout. Drop the ↗ or the new-tab promise — they are one decision |
| F6 | Reservations (inset) | Two decks, one holding, one `none free` | Suggest the reader chooses which deck wins |
| F7 | Proxies (inset) | `P`, a buy row, the total with `1 proxied` | Imply a proxy moves set completion |
| F8 | Themes (plate) | Six swatches, the picked one outlined | Redraw the whole menu — that is §6 |

## §I Phone reduction, amended

Replaces the matching rows of `STATES-about-r2.md` §C after the screenshot re-cut.

| Figure | At 390px | Must not |
|---|---|---|
| Collection / set grids | six across becomes three | Shrink a cell below the 63/88 ratio, or scroll sideways |
| Decklist rows | full-width rows, unchanged | Drop a column or shrink a mark — the row already *is* the reduction |
| Recommended mix | the five cards stack | Drop `rec N` or the `consider →` action |
| Deck page header | art, title, status, bar stack; tabs scroll as one row | Drop a tab or its count |
| Discover row | art band, then counts below the role chips | Drop `new to you`; it is the entry's subject |
| Log a game | result and pod size, then the two axis columns stack | Drop the sub-labels — they are what distinguishes the two sides |
| Themes | six tiles become two across | Drop the plane subtitle |

## §G The template artboard

| # | State | Draws | Must not |
|---|---|---|---|
| G1 | Blank | Eleven dashed slots, hint text in each | Look fillable — it is a spec sheet, not a form |
| G2 | Worked | The same eleven, filled from the Put back entry | Use an entry with four key lines; the point is that `none` is legitimate |
| G3 | Any new entry | One filled template, its fixture added to `about/fixtures.ts` | Fork a component to serve this page. Edit the canvas |

## §H The mark, amended

| # | State | Draws | Must not |
|---|---|---|---|
| H1 | §4 behind-reader artboard | An illustrative `since: 2`, labelled as illustrative | Imply a real entry is deferred — reservations and proxies are `since: 1` |
| H2 | Everything else | As `STATES-about-r2.md` §D2 | — |
