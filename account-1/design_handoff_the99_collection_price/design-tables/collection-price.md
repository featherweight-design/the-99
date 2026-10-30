# Design table: /collection sort by price (R1)

Mobile = 390. Desktop = 900, from `md` up. Tokens only; no new tokens. Mono = `--font-mono`.

| Property | Mobile | Desktop |
|---|---|---|
| When it draws | `sort === "price"` only | same |
| Row: figure | leads the type line; mono 11 / 500, `tabular-nums`, `--accent`, `flex:none`; gap 6 to the type text; line-height 16 (= the shipped type line) | leads the 150 type column; mono 11.5 / 500; gap 8; line-height 18 |
| Row: suffix | `foil` / `etched` / `max`, 400 `--fg-muted`, NBSP before it, inside the figure span | same |
| Row: no stock | the words `no stock`, mono 11 / 500, `--fg-muted`, same slot | mono 11.5 |
| Row: silent | nothing; the type text starts the line | same |
| Row: grid, height | `38 1fr 76 auto` unchanged; height unchanged | `52 1fr 90 150 92 18` unchanged; height unchanged |
| Row: type text | 11.5 `--fg-faint`, truncates first | 12.5 `--fg-muted`, truncates first; a `$38.50 foil` figure leaves ~70px of type |
| Tile: figure | leads the sub-line; mono 9 / 600 `--accent` `tabular-nums`; then `· SET` (rarity hidden) | mono 9.5 / 600; then `· SET · rarity` |
| Tile: suffix, no stock, silent | as the row, at the sub-line's size | same |
| Tile: caption | 70 unchanged (8+17+3+20+3+11+8) | 65 unchanged (6+18+3+17+3+12+6) |
| Tile: truncation | figure `flex:none`; the SET text truncates | same |
| Sort panel | sheet row h48; Price is the 6th row; hint mono 11.5 `--fg-faint` on the selected row only | popover row h36; hint mono 11 |
| Trigger | `Price · Highest first` (no `Sort:` prefix under 480) | `Sort: Price · Highest first` |
| Sort key | max over owned copies of `priceOf` for that copy's printing + finish; unpriced = null | same |
| Order | priced by key (desc \| asc), tiebreak name A–Z; then all nulls, A–Z | same |
| Spoken | the row/tile accessible name gains the price clause last, only when sort=price | same |
