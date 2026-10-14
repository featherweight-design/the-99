# STATES — deck folders

Every state of the level, both widths. The wide form is ≥1000px (`CHASSIS_WIDE_MIN_PX`); compact is
below it. "The line" is the shelf line; "the chassis" is the shipped `FilterChassis`, unchanged
except for the denominator it is handed.

Invariants that hold in every state below:

- **The line and the chassis are never replaced by an empty state.** Whatever caused an emptiness
  stays on screen and stays reversible.
- **The line's counts are never filter-dependent.** Named shelves from `listFolders.deckCount`,
  All decks and Unfiled from the loaded list.
- **The result line's denominator is the selected shelf.** It always equals the figure printed on
  the selected segment.
- **The shelf is not a filter.** No chip, no badge count, untouched by `Clear all filters`.
- **No motion.** Selection changes instantly.

---

## §1 The line — wide (≥1000px)

| # | State | Draws | Must not |
|---|---|---|---|
| W1 | No folders, ≥1 deck | `All decks · 12` selected + `New folder`. | Draw `Unfiled`. Draw an empty-state, a hint or an illustration — this is the route at rest. |
| W2 | ≥1 folder, All decks selected | `All decks · 12` selected, folders by name, `Unfiled · 5`, `New folder` trailing. | Put a `…` on an unselected segment. |
| W3 | A named shelf selected | That segment selected, carrying a 22px `…` inside it. | Show the `…` anywhere else. Change the line's height. |
| W4 | Unfiled selected | `Unfiled` selected, **no `…`** — it is not a folder and cannot be renamed or deleted. | Offer folder actions on it. |
| W5 | Segments exceed one line | Wraps to a second line. Past two, the line scrolls horizontally. | Grow a third line. Collapse into a dropdown at some width — that is the compact form's job and it starts at 1000. |
| W6 | No decks at all | **The line is absent**, with `DecksZero` in the grid region. | Offer `New folder` — a shelf for nothing is furniture. |

## §2 The line — compact (<1000px)

| # | State | Draws | Must not |
|---|---|---|---|
| C1 | Any shelf selected | A 44px trigger printing the shelf name at 15px semibold + its count + `▾`, and a 44px `…` beside it. | Read as a filter trigger: not 12.5px medium, not on `--surface-sunken`, not below the chassis's hairline. |
| C2 | Unfiled selected | Same trigger, and the `…` is **absent** rather than disabled. | Draw a dead control. |
| C3 | Sheet open | Handle, `Shelves`, `✕`, 48px rows with a **round** single-select mark, counts on the trailing edge, `New folder…` last, `Done`. | Use a square tick. Offer two selections. Carry filters of any kind. |
| C4 | Sheet order | Current shelf pinned first, then `All decks`, folders by name, `Unfiled`. Pin computed once, on open. | Re-sort while open. |
| C5 | No decks at all | Absent, as W6. | — |

## §3 The grid region — five kinds of nothing, in precedence order

| # | When | Occupant | Must not |
|---|---|---|---|
| N1 | `decks.length === 0` | `DecksZero`, unchanged | Mention folders. |
| N2 | Named shelf, 0 decks | **S2**: `Nothing filed here` / `Draft pile · 0 decks` / `A deck is filed from its own … menu.` / `All decks` | Offer `Clear filters` — no filter caused this. Draw the card-fan mark, which belongs to N1. |
| N3 | Unfiled, 0 decks | **S3**: `Nothing unfiled` / `12 decks across 3 folders` / `All decks` | Carry body copy, a mark, or any suggestion that something is wrong. |
| N4 | Shelf has decks, filters empty it | Shipped filtered empty + `Clear filters`, unchanged | Name the shelf. Offer to leave the shelf. |
| N5 | No folders exist | The grid, full of decks | Anything else — this is not an empty state. |

S2 and S3 both keep the chassis mounted and quiet: its result line reads `0 decks`, and the filters
stay reachable because a reader may want to file into a shelf and then filter it.

## §4 Move — on the deck, in the menu it already has

| # | State | Draws | Must not |
|---|---|---|---|
| M1 | Menu, unfiled deck | `Update from a list` · `Rename` · `Move · Unfiled` · `Delete` | Reorder the shipped three. Put `Move` after `Delete`. |
| M2 | Menu, filed deck | `Move · Commander night`, truncating with the full name in `title` and in the accessible name | Print the id, or an unnamed `Move`. |
| M3 | Move mode | `Move to` eyebrow, `Unfiled` row, folders by name, current destination marked with a filled round mark, `New folder…` last | Offer more than one destination. Use a square tick. Show a folder belonging to another player — every query is user-scoped. |
| M4 | Move mode, no folders exist | `Unfiled` (marked) and `New folder…` | Render an empty list. |
| M5 | After a move | Returns to the menu with `Move · <new shelf>`; on a named shelf the tile also leaves the grid | Show a toast. Close the whole panel with no visible change. |
| M6 | `moveDeck` returns false | The row reverts to the shelf it named before | Announce success. Treat it as a crash — false means "not yours, or gone". |

Filing and unfiling are one control. There is no separate `Unfile` anywhere.

## §5 Create

| # | State | Draws | Must not |
|---|---|---|---|
| CR1 | At rest | `+ New folder` on the line's trailing edge (wide) or the sheet's last row (compact) | Appear before the first deck exists. |
| CR2 | Field empty | `Create` disabled, no message | Explain that a name is required. |
| CR3 | Duplicate name | Field border `--danger`, `A folder named "Cube night" already exists.` | Silently do nothing. Blame the server. |
| CR4 | Success | The new shelf is created and **selected**, landing the reader on S2 | Stay on the shelf they were on. |
| CR5 | Length | Unreachable — `maxLength = FOLDER_NAME_MAX` | Draw a counter or a refusal for it. |

## §6 Rename — the shelf's own `…`, selected shelf only

| # | State | Draws | Must not |
|---|---|---|---|
| R1 | Menu | `Rename` · `Delete` | Appear on Unfiled or on an unselected segment. |
| R2 | Editing | Field seeded with the current name, accent border, `Cancel` / `Save` | Commit an empty or unchanged value on blur — both revert. |
| R3 | Duplicate | Same refusal string as CR3 | Close and lose the typed value. |

## §7 Delete — the shelf's own `…`

| # | State | Draws | Must not |
|---|---|---|---|
| D1 | Folder with decks | `Delete "Commander night"?` / **`Its 4 decks return to Unfiled. No deck is deleted.`** / `Cancel` · `Delete folder` (`--danger`) | Warn about deck loss. Say "permanently". Use the word "ledger", "shelf" or any noun not on screen. |
| D2 | Empty folder | Same, with `Nothing is filed here.` | Skip the confirmation — there is no undo either way. |
| D3 | Confirmed | The segment goes, selection falls back to All decks | Land the reader on a shelf that no longer exists. |
| D4 | `deleteFolder` returns false | Treated as **done** | Show an error. It means already gone. |

## §8 Accessibility

- The line is a single-select group: each segment is a `role="tab"`-free plain button carrying
  `aria-current="true"` when selected — it changes what the list contains, not what page you are on,
  and `aria-selected` outside a tablist is not honoured.
- Every segment's accessible name carries its count: `Commander night, 4 decks`.
- `Unfiled` is one string in all three places it appears, and it always means `folder_id IS NULL`.
- The sheet is `aria-modal` with the app's shared focus trap, Escape dismiss and focus return.
- A move is announced through the deck menu's own region: `Filed under Draft pile` /
  `Unfiled`. The shelf change itself is announced by the chassis's existing result-line region,
  which is already `aria-atomic` and debounced at 300ms — **no second live region is added to this
  route.**
