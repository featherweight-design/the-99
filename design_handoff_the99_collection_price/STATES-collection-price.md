# STATES: /collection sort by price (R1)

Every frame is drawn at 900 and 390. Copy is placeholder for /copy-review.

| Id | Frame | State | What draws |
|---|---|---|---|
| L1 | list 900 · 390 | Sort: Price · Highest first | the price leads the type line; most valuable first; no-stock and silent cards last, A–Z |
| L2 | list 900 · 390 | Sort: Price · Lowest first | the same, cheapest first; no-stock and silent cards still last |
| G1 | grid 900 · 390 | Sort: Price · Highest first | the price leads the sub-line: `price · SET · rarity` (900), `price · SET` (390) |
| G2 | grid 900 · 390 | Sort: Price · Lowest first | the same caption, reversed |
| N1, N2 | list, grid | any other sort | no price anywhere; rows and tiles as shipped |
| S1 | panel 900, sheet 390 | Sort panel, Price selected | six rows; Price is last; the hint `Highest first` shows on the selected row only |
| S2 | (no frame) | Price selected again | the direction reverses to `Lowest first`; the trigger reads `Sort: Price · Lowest first`; the panel dismisses (shipped) |
| S3 | (no frame) | another key selected | that key in its default direction; the price leaves on the same render |
| S4 | (no frame) | URL | `?sort=price&dir=desc\|asc`; dir absent → desc; reload keeps it |
| C1 | cases | priced | `$5.90` |
| C2 | cases | foil copy | `$9.60 foil` (etched works the same way) |
| C3 | cases | copies in different printings | `$27.00 max`; sorts on the most valuable copy in both directions |
| C4 | cases | different printings, top copy foil | `$6.20 max`; the finish is spoken only |
| C5 | cases | the store said no (never stocked, or sold out) | `no stock` in `--fg-muted`; sorts last |
| C6 | cases | nothing reached us | nothing drawn; sorts last, with C5, A–Z |
| T1 | (no frame) | equal figures | name A–Z tiebreak in both directions |
| T2 | (no frame) | filters on | the order applies inside the filtered set |
| T3 | (no frame) | Show more | the next page continues the order; the unpriced tail arrives only on the last pages |
| F1 | (no frame) | the price read fails for the whole list | Price stays selectable; every card is silent → A–Z; one line under Showing: `Prices didn't load, so this is A–Z.` |
| F2 | (no frame) | the price would arrive after the row | never: the figure ships in the list payload when sort=price |
| Must-not | — | — | another printing's figure; a dash or `$0.00` for no price; the price on a non-price sort; any change to row or tile height; a sum across copies |
