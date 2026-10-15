# States · foil mark (R4)

| Holding of the drawn printing | Film | Glint | Key entry | Spoken after the name |
|---|---|---|---|---|
| Every owned copy foil | rainbow | foil (rainbow) | foil | ", foil" |
| Every owned copy etched | silver | foil (same glint, R4) | foil | ", etched foil" |
| Some copies foil, some not (part-foil) | none | none | — | — |
| No copy foil | none | none | — | — |
| Not owned (deck tile, Shopping row) | none | none | — | — |
| Precon tile, box copy foil (`printedFoil`), Collector's Edition included | rainbow | foil | foil (when in view) | ", foil" |
| Precon list row (read-only), box copy foil | — | foil, replaces printed `· foil` | foil (when in view) | ", foil" |
| Forced colours | off | `CanvasText` | as above | as above |
| Reduced transparency | edge | unchanged | as above | as above |

| Surface | Where the glint sits |
|---|---|
| Collection grid tile | first on the meta line, before the in-use chip and facts |
| Collection list row | count column, after `×N` |
| Deck Card view tile | meta line, right after the ownership dot |
| Decklist row, Shopping row (two lines, desktop and phone) | under the ownership dot, head of line 2 (R4) |
| Precon tile, precon list row | right after the dot |

Size 12px on every surface; `flex-none`, never dropped. On an overflowing deck tile meta line the fact marks drop whole
first (audit F8).

R3: All and Shopping rows are two lines at both widths. Facts sit on line 1 after the name; line 2 holds pips, the
figure, in use / short, the other-ways press and the buy tag.
R4: Shopping rows carry no EDHREC figure; foil and etched share one glint and one key entry.
