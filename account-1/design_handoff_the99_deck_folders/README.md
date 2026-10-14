# A shelf to put decks on — R1

**§5 IS ANSWERED FIRST, BECAUSE THE CHASSIS BUILD NEEDS IT TODAY:**

> **A folder is a NAV LEVEL, not a filter dimension. Branch (b).**
> The chassis keeps `/decks`' four dimensions and its trailing sort slot exactly as shipped.
> It gains **no slot, no panel, no chip, no clear scope and no density pass**.
> **The only change is one argument at one call site:** the result line's denominator becomes the
> selected shelf's deck count instead of the library's (`decks-view.tsx`). `filter-chassis.tsx`
> itself is untouched.

**Deliverable:** `The 99 - Deck Folders (R1).dc.html` (canvas, six-theme `theme` prop).
**Brief:** `docs/superpowers/design-briefs/2026-09-12-a-shelf-to-put-decks-on.md`, read at `main`
(it is **not** in this project's tree).
**Read at `main` for this round:** `lib/decks/folders.ts`, `folder-name.ts`, `lib/decks/filter.ts`,
`components/decks/decks-view.tsx`, `deck-filter-column.tsx`, `deck-filter-sheet.tsx`,
`deck-sort-menu.tsx`, `decks-zero.tsx`, `deck-card.tsx`, `deck-card-overflow.tsx`,
`components/ui/filter-chassis.tsx`, `filter-panel.tsx`, `colour-pips.tsx`, `lib/copy/refresh.ts`,
`lib/copy/filter-chassis.ts`, `app/decks/page.tsx`, `app/collection/sets/[code]/page.tsx`.

| File | What it is |
|---|---|
| `The 99 - Deck Folders (R1).dc.html` | The deliverable. The §5 ruling and its arithmetic, the nav model with its rejected alternative (`1a` / `1b`), wide and compact frames, the five-kinds-of-nothing ladder with S2 and S3 drawn, move / create / rename / delete, the contract. |
| `STATES-deck-folders.md` | Every state, both widths, including what each must not do. |
| `deck-folders · copy strings.ts` | Production strings, with reuse from `refresh.ts` / `filter-chassis.ts` marked as reuse rather than re-authored. |
| `READINESS.md` | Self-assessment, what is blocking, what I would cut. |
| `brand/` | The brand sheet, carried so the folder opens standalone. Unmodified. |

---

## Four corrections to the brief, read from source

1. **The chassis is shipped, not building.** `src/components/ui/filter-chassis.tsx` exists and
   `decks-view.tsx` mounts it with `ColourPips`, two `FilterPanel` mounts and `DeckSortMenu` in the
   trailing slot. This handoff amends a live component, not a drawing — which is what makes the
   density question measurable rather than projected.
2. **The sidebar is already gone.** §4 says "that sidebar is going"; it went.
   `deck-filter-column.tsx` is now three exported helpers (`toggleIn`, `SearchField`, two label
   maps) and draws no column. The 262px is spent. **Nothing in this round asks for any of it back.**
3. **The breakpoint is 1000px, not 900.** `CHASSIS_WIDE_MIN_PX = 1000`, and the component records
   why: the chassis handoff's 887px total was wrong — `/collection` needs 987. The shelf line takes
   the chassis breakpoint, never a Tailwind stop, which is the trap `deck-filter-sheet.tsx` already
   fixed with `max-[999px]:flex`.
4. **The compact control row is already three controls** — a 44px search icon, then sort and
   `Filters` as a trailing cluster. There is no room in it for a fourth, so the compact half of the
   (a) arithmetic needs no measurement.

---

## Decisions

**1. A folder is a nav level. (a) is rejected on three independent grounds, any one sufficient.**

- **Under (a) a new folder is born disabled.** `listFolders` returns empty folders with
  `deckCount: 0`, and every panel dimension on this route disables a zero-count row
  (`decks-view.tsx`: `disabled: count === 0 && !selected`). So the only surface that names the
  folder you just created refuses to be clicked, and there is no route to file the first deck into
  it. **An empty folder is a legitimate destination and an illegitimate filter option** — that is
  the whole difference between a place and a predicate, and the schema already draws it.
- **The row cannot hold a sixth control.** Measured in §2 of the canvas against the shipped
  literals: 894px of row at the wide form's narrowest (1000px viewport − 62px rail − 44px padding),
  797px occupied with every dimension carrying one value, **97px spare**. A `Folder ▾` trigger at
  rest is 89px + its 8px gap = **97** — it fits by zero. Carrying one value it is ~205px, **108px
  over**, and row 1 may never wrap (chassis decision 18) with search already at its 132px floor.
  The structural ceiling is worse: `filter-panel.tsx` caps a one-value trigger span at
  `max-w-[230px]`, so three triggers at their ceiling plus pips plus search plus sort is **386px
  over** — and folder names cap at `DECK_NAME_MAX`, so the ceiling is reachable by typing.
- **A folder is the only dimension on this route whose values are player-authored, unique-
  constrained and mutable from inside the control.** A panel needing `New folder…`, `Rename` and
  `Delete` rows is not a filter panel. Chassis decision 19 chooses a control type by *the shape of
  the values*; these values have a shape no slot describes.

Consequence accepted and stated: `Clear all filters` never returns the reader to all decks, because
the shelf was never a filter. That is the behaviour §5 asked about, ruled the other way.

**2. The level is one line above the chassis, 34px, on `--bg` — candidate `1a`, ruled.**
Counted segments: `All decks`, then folders by name, then `Unfiled`, with `New folder` at the
trailing edge. Name order is `listFolders`' own `orderBy(asc(name))` and its reason carries: a
creation order moves a shelf the moment one is added. Unfiled is last because it is the residue,
not a shelf anybody chose.

**3. The selected shelf spends no accent.** `--fg` on `--elevated` under a `--border-strong` ring —
verbatim what the active `By type` pill draws and what card-surfaces' reconciliation ruled for
exactly this case. Accent stays reserved for *in use* / *to buy* per refresh R2, and it stays the
chassis's own "this filter is on", which is a second reason the two lines never read as the same
kind of control.

**4. `1b` — the shelf as the page title — is drawn and rejected.** It costs *zero* pixels, which is
the strongest possible answer to the brief's chrome objection, and that is why it was drawn.
It loses on **discoverability**: nothing draws folders today, so the level has to teach that it
exists, and behind a title menu the shelves, their counts and `New folder` are all invisible until
a reader opens a control they have no reason to open. It also *is* a breadcrumb — a faint
`Decks /` above a title is the set pages' pattern, which §3.1 says does not fit. What survives from
it: **folder actions belong to the shelf you are standing on**, never to every segment at once.

**5. Its own pattern, not the set pages' breadcrumb.** That line is a route-to-route trail with a
`<Link>` to a real parent page, sitting above the `h1` where the reader is not choosing anything.
Folders are a level *inside* one route. The set breadcrumb is untouched.

**6. A place you go, and the URL says so — `?folder=<id>`, `?folder=none`, absent for All decks.**
Written by the existing `apply()` with `replaceState`, added to `OWNED_PARAMS`. **Not a route:**
`page.tsx` would refetch an identical list (the folder is already a column on every deck it loads)
and throw the filter state away. Shareable and restorable without being a navigation. An unknown id
falls back to All decks, the same way `readList` already makes a hand-edited value harmless.

**7. The shelf is a third field on `ViewState`, never a fifth on `DeckFilters`.** This is the
code-level form of decision 1, and it is what makes `EMPTY_FILTERS`, `activeFilterCount`, the
`Filters` badge and `Clear all filters` *unable* to touch the shelf — by construction rather than by
care.

**8. The result line's denominator becomes the shelf, and that is the round's one chassis
amendment.** `4 of 7 decks match` where 7 is the shelf's count. With the library's denominator the
line would describe a list the reader is not looking at. No new string: `deckChassisCopy.result`
takes a different `total`. The shelf segment directly above prints the same 7, so the two figures
agree by construction and the pair is auditable by looking up.

**9. Shelf counts are never filter-dependent.** `deckCount` from `listFolders` for named shelves,
the loaded list for All decks and Unfiled. The shelf is above the filters, so its figures are too;
the result line is the route's one filter-dependent figure.

**10. The shelf line may wrap; row 1 may not.** The chassis promises a fixed height so the list
never moves under a reader mid-filter. The shelf line moves the list only when the reader changes
shelf, which moves the list anyway. Ceiling: past two lines it scrolls horizontally rather than
growing a third.

**11. Below 1000px the level is a 44px trigger opening a sheet — the one shape change, and the
one exception to chassis decision 23.** Three player-named shelves at a 44px target are already
past 358px, and a second horizontal scroller directly above the chassis is the defect
`scrollCompactControls` exists to contain, not to duplicate. Four carriers keep it out of the filter
register: it prints a **name** at 15px semibold (a title's register, not a control's), it sits on
`--bg` above the chassis's hairline, it is **single-select with a round mark** (`filter-panel.tsx`'s
own rule — "a square tick on a one-of-many list promises you can have two"), and it carries a `…`,
which no filter control in this app does. Sheet order pins the current shelf first, per
`filter-panel.tsx`'s pin-on-open rule.

**12. §3.2 is five kinds of nothing with one occupant and a strict ladder.**
(1) no decks at all → `DecksZero`, unchanged, **and no shelf line either** — a shelf for nothing is
furniture, so the first folder becomes reachable once the first deck exists. (2) a named shelf holds
no decks → **S2**. (3) Unfiled is empty because everything is filed → **S3**. (4) the shelf holds
decks and the filters emptied it → the shipped filtered empty, unchanged, naming the filter and
never the shelf. The chassis and the shelf line are never replaced by any of them: whatever caused
the emptiness must stay on screen and stay reversible.

**13. §3.2 (i) — "no folders exist at all" — is not an empty state.** Every deck is unfiled, so the
reader is standing everywhere at once. The line draws `All decks · 12` and `New folder`, and **no
Unfiled segment**: a bucket equal to the whole list is a distinction without a difference. Unfiled
appears when the first folder does.

**14. S2 names the shelf, states its zero as a figure, and points at where filing happens.**
`Nothing filed here` / `Draft pile · 0 decks` / `A deck is filed from its own … menu.` / `All decks`.
It is the state a reader lands on immediately after creating a folder, which is the loop: create →
land on the empty shelf → the state says how to fill it.

**15. S3 has no body copy at all.** `Nothing unfiled` over `12 decks across 3 folders`, and the one
route out is the shelf you came from. Nothing is wrong and nothing needs doing, and `refresh.ts`'
voice rule forbids explaining that a state is fine — **a count is the honest form of that
sentence**, in the two denominators the app already counts in.

**16. §3.3 — the move control lives on the deck, in the menu it already has.**
`deck-card-overflow.tsx` is a 186px panel with two modes and a mode switch; filing is a third mode.
One new row, no new component, no new target on the tile, nothing on the art. **Filing and unfiling
are one control**, because `moveDeck` takes `null` for exactly that: `Unfiled` is a row in the list,
never a second affordance. `New folder…` is the last row, so the destination can be made from the
act.

**17. The label is the receipt.** On All decks a move changes nothing on screen, so the panel
returns to its menu with the Move row now reading `Move · Draft pile` — visible, permanent, and
exactly where the act happened. No toast, no new pattern. On a named shelf the tile also leaves the
grid, which is receipt enough by itself.

**18. No drag and drop.** The whole tile is an absolute-inset `<Link>` and a drag would fight it for
every gesture; on the compact form there is no rail to drop onto at all. A shelf line is a
destination for a tap.

**19. Multi-select: requested as slice B, deliberately not drawn.** It needs a selection mode over
a grid of links — the pattern `top-off-list.tsx`' selection head establishes — and it changes no
decision here, which is why it can follow. Filing eleven decks one at a time is the only thing in
this round that is merely tolerable.

**20. §3.6 — the folder does not appear on the tile face.** On a scoped grid it repeats the segment
above it on every tile; on All decks the only row with room is the one carrying commander and
colour, which card-surfaces already ruled must not give. **The fact lives where it is changeable** —
the Move row names the current shelf, and it joins that control's accessible name. Flagged for
Product in READINESS as the one item I would happily be overruled on.

**21. §3.5 — rename is drawn, and it is one function.** Same field, same two buttons, same guard as
the deck rename already shipped: **blur commits, but never an invalid value** — empty or unchanged
reverts. Engineering adds `renameFolder` beside `createFolder`, validating through the same
`validateFolderName` and refused by the same unique index.

**22. Create has exactly two reachable refusals.** Empty **disables** `Create` and needs no
sentence; **duplicate** is the unique index's answer and must be said in words. Length is
unreachable — the field takes `maxLength = FOLDER_NAME_MAX`, and `folder-name.ts` is pure so the
client checks the same rule the server throws on. On success the new shelf is selected, which lands
the reader on S2.

**23. §3.4 — delete confirms, and its second sentence is the whole design.**
`Delete "Commander night"?` / **`Its 4 decks return to Unfiled. No deck is deleted.`** The foreign
key is `on delete set null`, so that is a promise the database keeps however the folder goes; a safe
act reads as destructive only if the copy lets it. The empty case swaps one line:
`Nothing is filed here.` **Confirm either way** — *confirm where there is no undo*, and there is
none here.

**24. The confirming button does take `--danger`** — unlike the keep-all confirm that was amended
away from it. That amendment turned on destroying nothing; this destroys a thing the player named,
with no undo and no restore. What is safe is the decks, and the sentence is what says so.

**25. `deleteFolder` returning false is done, never an error.** The query is written so a double
submit is not a failure; the UI must not invent one. Selection falls back to All decks.

**26. The shelf narrows the list before `filterDecks`, in the same client-side pass.** The panels'
per-option counts are computed within the shelf too, so a status reading 0 means 0 *on this shelf* —
which is what the reader is looking at, and the same reasoning `decks-view.tsx` already applies to
the other active filters.

**27. No motion on the shelf line**, matching the chassis: selection changes instantly and the
compact sheet reuses the existing entry animation. No reduced-motion state, because there is no
motion to reduce.

---

## Out of scope, unchanged from the brief

Nesting (no parent column exists), folders anywhere but `/decks`, and Home's grouping — which
inherits whatever this settles.
