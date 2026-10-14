# Basic lands stepper — states matrix (R1)

One control on basic rows (`isBasicLand`) in list view and Card view. Fixture: an Island row at 6 (the staging
median), the 35-Island deck for typing, and a hand-built row at 1.

## A · The row and the tile

| # | State | List view | Card view |
|---|---|---|---|
| S1 | **Idle** | `− 6 +` in the ✕'s place; no `×N`. Desktop: glyphs in `--border-dashed`, count in `--fg`. | Band on the art's foot; caption has no `×N` and no ✕ column. |
| S1b | **Hover (desktop)** | Glyphs lift to `--fg-body`. The rest of the row still opens card details. | Same, on tile hover. |
| S2 | **Pending save** | Count shows the new figure (8). `from 6` after the name, 2px accent edge. Nothing disabled, no spinner. | Count 8 in the band; `from 6` in the caption meta, `--accent`. |
| S3 | **Refused save** | Count back to the saved 6; marker and edge gone. Shipped `MutationError` under the row. | Same, under the tile. |
| S4 | **At 1** | The − slot draws the shipped ✕ (`Remove {name}`). + is live. | Same, in the band. |
| S5 | **Removed** (✕ at 1, or a typed 0) | #185's receipt, `{name} removed · Undo`. No row at 0. | The shipped undo tile. |
| S6 | **Typing** | Field focused; box border `--accent`. Enter / blur commits, Escape restores. 0 removes; above 99 restores. | Same, in the band. |
| S7 | **Focus** | Each button rings itself (2px `--accent`). Desktop: focus lifts glyphs as hover does. | Same. |
| S8 | **At 99, then +1** | + is live at 99. One press over: the shipped `100 / 99 +1` and `One over the ninety-nine. Cut one and it is legal.` | Same header; the tile is as S2. |
| S9 | **Back to the committed count** | Marker and edge go; the row reads as S1. | Same. |
| S10 | **Basic new to the deck** (committed 0) | Stepper as S1; the shipped add mark (edge) only, no `from`. | Shipped add treatment. |

## B · What does NOT change

| Surface | Ruling |
|---|---|
| Non-basic rows and tiles | Untouched: ✕, `×N` logic, reveal. |
| Commander rows | No stepper, no ✕ (H28), as shipped. |
| Shopping, money, ownership | Untouched (lock). A basic moves only the deck's card count. |
| #185 receipt and undo tile | Untouched; reached at 1 as today. |
| Over-99 figure and trim line | Untouched; no cap (lock). |
| Commit, review page, draft diff | Untouched; the stepper writes the draft like any edit. |

## Rules the matrix comes from

1. **The count is the control.** Wherever a basic's count was printed, the stepper prints it.
2. **A count of nought is never drawn.** Reaching 0 removes the row into the shipped receipt.
3. **The press that removes looks like removal:** at 1, the − is the ✕.
4. **One save per settle,** carrying the final figure (lock).
5. **Pending is not a state the player waits on.** Nothing disables, nothing spins.
6. **A refusal returns the saved figure** and says so in the shipped shape (lock).
7. **No figure is printed twice:** the pair keeps its left half, `from N`.
8. **No row grows and no tile grows,** at either width.
9. **No cap** (lock). The over figure is the shipped one.

## Copy, per state

| State | String |
|---|---|
| − label | `Take one {name} out, {n} left` |
| ✕ at 1 label | `Remove {name}` (shipped) |
| Field label | `{name}s in deck` |
| + label | `Add one {name}, {n} in deck` |
| Marker | `from {n}` (visual only) |
| Settle announcement | `{name}, {n} in the deck.` |
| Refused | `We couldn’t change that. The deck is unchanged.` |
| Removed | #185's, shipped |
| Over | `overCopy`, shipped |
