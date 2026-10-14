# States: Consider tiles and tab (R1)

## Tile: `c1`–`c10`

Caption = `CardTileCaption` (meta line, then name, fixed 50 desktop / 56 phone). Meta line order:
**ownership dot · slot · fact marks · lemniscate.** Body order: secondary line · in-use line ·
evidence row · lift line · card note · Add.

| # | Condition | Drawn |
|---|---|---|
| c1 | Owned, all copies free | Solid `--success` dot, 8px. Slot empty. Type line `--fg-faint`. |
| c2 | Owned, soft claim | Solid dot. `AvailabilityMarker density="chip"` in the slot. |
| c3 | Owned, hard claim, one deck | `OwnershipDot committed`. Chip. `in use: {deck}` under the type line, mono 8.5/600 `--avail-hard-fg`. Several decks: chip alone (shipped). |
| c4 | Owned, over-committed | Committed dot. Over chip. `tileOver(n)` in `--avail-over-fg`. |
| c5 | Not owned, live price | Dashed hollow dot. Slot: BuyTag **figure only** (`$31.05`, `--warning`, no edge). `Add · to buy`. |
| c6 | Not owned, no live price | Dashed dot. Slot: collapsed `$`. |
| c7 | Fact marks | 16px `--fact`, after the slot, `FactTooltip` each. Never wrap. |
| c8 | Completes a combo | `∞` joins the marks, last. Secondary line `+ {partner}` in `--fg-body`, truncates. sr-only `a11y.completes`. |
| c9 | In deck (`applied`) | No dot, no buy tag, chip kept. Fact marks kept; `∞` and partner drop, type line returns `--fg-locked`. Art grayscale .6 / opacity .5. Name `--fg-muted`. `✓ In deck`. |
| c10 | No art | Shipped placeholder, tile opacity .55. Caption unchanged. |

Deleted from the tile: `CostPips`, the hover `details ↗`, the art's bottom shadow (keep the 1px inset edge).

## Lift line: `l1`–`l3`

| # | Condition | Drawn |
|---|---|---|
| l1 | lift > 0 | `+N pts vs. all decks`, mono **10px `--fg-muted`** (was 9.5px `--accent-shadow`). |
| l2 | figure ≤ 0 | Signed (`−8 pts`), same ink and size (was `--fg-faint`). |
| l3 | Synergy shelf, no figure | `noSynergy`, same ink. Elsewhere nothing. |

## Shelf: `s1`–`s5`

Header: full-width 1px `--border-strong` rule above. One `<button aria-expanded aria-controls>`
inside the `h3` (the `h3` keeps `tabIndex -1` as the coverage strip's focus target) holding the
chevron (▸, rotates 90° open), the label (Plex Sans 17/600 desktop, 16/600 phone, `--fg`, sentence
case) and the count clause (mono 11 / 10.5, `--fg-muted`; the unowned shelf's lead clause stays
`--warning`). `Show all N →` is a separate button at the right end, mono 11.5 `--fg-body`.
Desktop: one baseline row, min-height 44. Phone: the clause wraps under the label; the button is
min-height 52; `Show all` keeps a 44px target.

| # | Condition | Drawn |
|---|---|---|
| s1 | Open, ≤ 6 | Header, grid. No `Show all`. |
| s2 | Open, > 6 (capped) | `Show all N →`. Six tiles. |
| s3 | Expanded | `Show fewer`. All tiles. Not persisted. |
| s4 | Collapsed | Header alone (the clause already says `N to consider`). `Show all` hidden. Folding clears the expansion. |
| s5 | Persistence | `localStorage` `the99.consider.folded.{deckId}` → shelf keys. Survives reload and tab change. Default: all open. Unknown keys ignored. |

Grid unchanged: 2-up phone (gap 12), 6-up desktop (gap 14).
