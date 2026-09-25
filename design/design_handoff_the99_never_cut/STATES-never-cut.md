# STATES — Locked cards (R2, canonical)

"Absent" means no pixels. Lock glyph: 11×13, arch + filled body + keyhole; **closed** = both legs
meet the body; **open** = the arch is raised and only the left leg runs into the body.

## Decklist row (`decklist-row.tsx`)

**Hugh, 2026-09-25 (staging walk), overruling R2 decision 2.** The desktop hover shortcut and the 22px slot it
reserved on every row are retired: Lock cards mode is the only way to set or clear a lock, and an unlocked row
reserves nothing at either width. A locked row keeps its mark, now the 390 treatment at both widths. The rows
below are amended to match; R2 decision 2 in `README.md` is superseded by this note.

| State | 1300 | 390 | Spoken |
|---|---|---|---|
| Unlocked, at rest | Shipped row, unchanged | Shipped row, unchanged | Shipped |
| Unlocked, hovered | Shipped row, unchanged | n/a | Shipped |
| Locked, at rest | Closed lock mark `--fg-body`, 14px wide, left of the ✕; not a control | same | `mark.a11y` on `describedBy` |
| Lock cards · unlocked | ✕ replaced by a 26×22 toggle: open lock `--fg-muted`, `1px --border-strong` | ✕ replaced by a 36px box in a 44px hit area, same skin | `aria-pressed="false"`, `toggleAria` |
| Lock cards · locked | Closed lock `--accent`, `1px --accent`, 14% accent fill | same | `aria-pressed="true"` |
| Pending / refused | Optimistic; refused reverts + `MutationError` under the row | same | `refused` |
| Removed with ✕ | Lock goes with the card; `Put back` restores both | same | Shipped |
| Shopping, locked, over | Over marks stay; ⇄ absent (slot kept empty) | no ⇄ box | Shipped + mark |

## Card tile (`deck-card-tile.tsx`)

| State | 1300 | 390 |
|---|---|---|
| Unlocked, at rest | Shipped | Shipped |
| Locked, at rest | Closed lock on the meta line after dot + slot, before fact marks | same |
| Hovered | Shipped (✕ column appears); no lock shortcut | n/a |
| Lock cards | ✕ column becomes the toggle, always drawn: 32px column / 26×24 box; phone 44px column / 36px box. Skins as the row. Meta-line lock hidden. | same |

## Toolbar

| State | Draw |
|---|---|
| At rest | `Lock cards` ghost (`--fg-muted`, `--border-strong`), closed-lock icon; key `locked` only when the view holds a locked card |
| Mode | `Done` in `--accent`; line *Locked cards are never suggested as cuts.* + mono count; key hidden |

## Card modal

Unchanged. From Shopping, a locked card has no *See cheaper stand-ins →*.

## Suggested changes

| State | Draw |
|---|---|
| Ready / generating / results | Shipped. Locked-cut drops are not counted in the lead. |
| Open card whose cut gets locked | `no longer applies` + closed lock + *You locked {card}.* |
| That card unlocked | Returns open in its slot |
| Every card but the commander locked | `allLocked` lead, primary disabled, *No credit is used.* |

## Climb sheet 3b

A locked candidate sorts last with its lock and still counts (`listedLast`); if the locked candidates exceed the allowance, `unreachable`.
