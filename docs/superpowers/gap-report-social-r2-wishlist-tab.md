# Gap report — Social R2 PR 4, Collection › Wishlist tab

The property table is `design-tables/social-r2-wishlist-tab.md`, enumerated from the R3 boards (W1–W4, WP1–WP4).

The verify pass found 47 visual gaps and 4 state gaps. The confirm pass reports 0 remaining.

## Kept on purpose

| Item | Board | Built | Why |
|---|---|---|---|
| Phone search font | 15px | 16px | iOS zooms on a field under 16px |
| Search field padding, gap, magnifier | 0 14/16, gap 12, an 18px icon on viewBox 24 | Shipped `SearchField` and `SearchIcon` | One search field across the app |
| Desktop grid tracks | `repeat(6, 178px)` | Shipped `CARD_GRID_TRACKS`, `auto-fill minmax(178px, 1fr)` | The collection's own grid: six columns at 1300, filling the width |
| Stepper box | 44 / 34px box with 44 / 34px presses | `WantStepper`: 46px box with 44×44 presses on phone; 34px box with 32×30 presses on desktop | A 1px border cannot hold presses as tall as its box; desktop sizes per the orchestrator's ruling |
| Results panel z-index | 5 | 30 | Sits above the tiles' art layers |
| Stepper glyph ink and size | `--fg` 16px | `WantStepper` (#1874), shared with card details | Merged component, orchestrator's size ruling |
| Receipt ✕ ink | `--fg-muted` | `ArrivalDismiss`, `--fg-faint` | Shipped strip dismiss |
| Failure toast ✕ | 36px ✕ | None (shipped `ToastFrame`; `onHold` wired) | The shipped frame draws none |
| Strip after a want is lowered to what is held | On the strip | Not recorded | G5 as built in #1867 and stated in AGENTS.md: the strip names only what a collection write reached |

## Not drawn on the boards

- Empty phone body: uses the one `page.emptyBody` at both widths.
- Search with no results, or a failed search: the shipped Add cards strings.
