# Gap report — combos one piece away, UI-1

Design review (property table `docs/superpowers/design-tables/combos-close-ui-1.md`, 251 rows) against the
implementation, 2026-10-22. Contact sheet: inventory `docs/superpowers/inventories/combos-close.json`, 8 of 8
cells reached at 390 and 1300 on local-dev with `NEAR_COMBOS_ENABLED` on.

**Verdict: 0 open gaps.** Every state in the table's coverage is reachable except the two the handoff ties to
the combo detail (a row press, and the last-one-added close triggered from Add), which are UI-2's.

## Accepted, with the reason

| # | Element | Design | Shipped | Why accepted |
|---|---|---|---|---|
| 1 | To-do card foot's version segment | `v2` alone | `v2 · committed {date}` | Pre-existing `TodoFoot` behavior, not this PR's surface. |
| 2 | Sheet scrim | `rgba(8,6,5,.62)` | `ModalChrome`'s scrim | The handoff draws this sheet in the pass sheet's chrome; the shared chrome is reused, not restyled. |
| 3 | Eyebrow color | `--accent` | `--accent-text` | Same shared chrome (`ModalPanel`). |
| 4 | Modal position and shadow at 1300 | `top: 70px`, own shadow | centered, `--modal-shadow` | Same shared chrome. |
| 5 | Turn-again mark glow | oklab mix | the shipped `CardFactMark` glow (srgb) | The shipped mark is reused as-is. |
| 6 | Deck link pressed outline | `.dlk.hit` 2px accent, radius 3 | the global `:focus-visible` ring | The board's `.hit` annotates a press for the canvas; the app's focus ring is the one treatment. |
| 7 | Prices | `$1,150` | `$1,150.00` (`formatCents`) | The shipped buy tag's format, the app's one price format. |
| 8 | 1300 name column | `flex: none` | truncates (`min-w-0`) | Otherwise a long name pushes the where column out of line (seen on HD - Brago's Naru Meha rows). |
| 9 | Deck link hit | 12px padding | 15px (a 44px hit) | The handoff names a 44px hit; 12px reaches about 38. |
| 10 | Unpriced buy | not drawn | "sold out" when stocked before and not now; nothing when never stocked | Exactly what the buy tag draws (`priceState`); the read carries `soldOut` to tell the two apart. |
