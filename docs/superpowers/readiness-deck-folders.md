# READINESS — deck folders (handoff R1)

**Verdict: 🟢 Green.** Build starts now. Five findings, **all engineering-resolvable** — none sends
the round back to Design, and none touches the ruling the chassis build is waiting on.

- **Handoff:** `design/design_handoff_the99_deck_folders/` (R1, 2026-09-13)
- **Brief:** `docs/superpowers/design-briefs/2026-09-12-a-shelf-to-put-decks-on.md` (PR #532)
- **Audited:** 2026-09-13 against `origin/main` at `19294166`
- **Design self-assessment:** 🟢 green, with one Product call. **Upheld**, and the Product call is
  answered in §3 below rather than left open.
- **Data layer:** merged (PR #525, migration `drizzle/0025_classy_romulus.sql`), proved by
  `pnpm probe:folders`.

## §1 The ruling, and it holds

> **A folder is a NAV LEVEL, not a filter dimension. Branch (b).**

Checked all three of Design's grounds against the shipped tree. **The strongest one does not depend
on pixels and is exact:**

`listFolders` returns empty folders with `deckCount: 0` (`src/lib/decks/folders.ts:58`), and this
route disables a zero-count panel row — `disabled: count === 0 && !state.filters.statuses.includes(status)`
at `decks-view.tsx:191`, and the same shape at `:201`. Under branch (a) the only surface naming a
folder you just created would refuse to be clicked. Filing still has a path — §3.3 puts Move on the
deck's own menu, and that list is not the filter panel — but the shelf itself would be unreachable:
a reader could file a deck into a folder they cannot then go and look at, and the empty state that
teaches the loop (create → land on the shelf → the state says how to fill it) could never be
reached. That is a filter dimension being asked to be a destination, and it fails on the first use
of the feature.

The chassis amendment is exactly as small as Design says. `decks-view.tsx:340` reads
`resultLine={deckChassisCopy.result(shown.length, decks.length)}`; the round changes the second
argument and nothing else. `deckChassisCopy.result` (`src/lib/copy/filter-chassis.ts:133`) takes
`(shown, total)` already, so **no string changes and `filter-chassis.tsx` is untouched.**

**Every other structural claim in the handoff verified exact:**

| Claim | Source | Result |
|---|---|---|
| The chassis is shipped and `/decks` mounts it | `decks-view.tsx:233` | **True** — with `ColourPips`, two `FilterPanel` mounts, `DeckSortMenu` in the trailing slot |
| The sidebar is gone; the file is three helpers | `deck-filter-column.tsx:32,44,53,58` | **True** — `toggleIn`, two label maps, `SearchField`; no column |
| The breakpoint is 1000, not 900 | `filter-chassis.tsx:167` | **Exact.** `CHASSIS_WIDE_MIN_PX = 1000` |
| Compact's persistent row is already three controls | `decks-view.tsx:308-336` | **True**, and the file says so: "Compact's persistent row is `search · sort · Filters`" |
| A one-value trigger span caps at 230px | `filter-panel.tsx:893` | **Exact**, `max-w-[230px]` / `max-w-[170px]` |
| "A square tick on a one-of-many list promises you can have two" | `filter-panel.tsx:519` | **True**, verbatim |
| Pin-on-open, computed once | `filter-panel.tsx:214-221` | **True** |
| `page.tsx` would refetch an identical list | `src/app/decks/page.tsx:32-43` | **True** — it loads the deck list and the shopping roll-up; the folder is already a column on every deck (`read.ts:560-561`, returned at `:666-667`) |
| `OWNED_PARAMS` + `replaceState` is the write path | `decks-view.tsx:61,124` | **True** |
| The result line is `aria-atomic` and debounced at 300ms | `ui/result-line.tsx:22,252-253` | **Exact** |
| Chassis decisions 18, 19, 23 say what is quoted | chassis `README.md:180,192,224` | **True** — and decision 23's exception is declared, not smuggled |
| `deck-card-overflow` is a 186px panel with two modes | `deck-card-overflow.tsx:31,123` | **True** — `"menu" | "rename"`, `w-[186px]` |
| The nav rail is 62px | `shell/nav.tsx:148` | **Exact** |

## §2 Findings — five, all eng-resolvable

### 1. Rename's blur rule is wrong, and the shipped form says why (README decision 21)

Decision 21 specifies folder rename as "**blur commits, but never an invalid value** — empty or
unchanged reverts. Same field, same two buttons, same guard as the deck rename already shipped."

The deck rename in this panel has **no blur commit, deliberately**. `rename-form.tsx:21-23`:

> No `onBlur`. Blur-commit is a ruling about the deck header's title-in-place, not about this form,
> and wiring it here would double-submit: blur lands before the Save button's click.

Blur-commit belongs to a different component. Copying it into a panel form reintroduces the
double-submit that comment exists to prevent.

**Resolution, eng-side:** folder rename follows `RenameForm`'s actual contract — autofocus, Escape
cancels, `Cancel`/`Save`, no blur handler, `maxLength = FOLDER_NAME_MAX`, `readOnly` rather than
`disabled` while pending. **STATES R2 already describes exactly this** (`Cancel` / `Save`, revert on
empty or unchanged); only the README sentence names the wrong precedent, so nothing drawn changes.
Design to ratify the wording at the next round.

### 2. The deck menu is three rows only when the deck has cards (STATES M1/M2, copy header)

`Update from a list` renders under `built > 0` (`deck-card-overflow.tsx:136`), and the file's own
comment notes the separator rule "survives the Update row being absent". So on a brew the shipped
menu is two rows, and `Move` is the third rather than the third of four.

**Resolution, eng-side:** the instruction "reorder the shipped three" reads as "insert `Move`
between `Rename` and `Delete`, whether or not `Update from a list` is present". No drawing changes;
the state table should carry the conditional row.

### 3. The 108px shortfall is directionally right and its inputs are softer than stated (§2 of the canvas)

Design presents the (a) arithmetic as literals from shipped files. Two are not:

- **The 132px search floor is specified, not implemented.** It comes from the chassis handoff
  (`README.md:181`, "search is the only child that shrinks (`min-width: 132`)"). The shipped
  `SearchField` (`deck-filter-column.tsx:58-90`) sets no minimum, and the chassis gives the leading
  group `min-w-0 flex-auto` (`filter-chassis.tsx:267-271`). Search's real floor today is its
  content.
- **The shipped gap is 8px, not the 12px the chassis handoff's own arithmetic used**
  (`filter-chassis.tsx:260`, `gap-[8px]`). Eight gaps at 8px rather than 12px returns roughly 32px
  to the row, so the true spare at rest is nearer 129px than 97px.

**This does not change the answer.** A folder trigger carrying one value still overruns by ~76px
instead of ~108px, row 1 still may never wrap, and the `max-w-[230px]` structural ceiling — the
argument that does not depend on any estimate — is unaffected. Recorded because a build reading §2
as all-literal would trust a margin tighter than the one that exists, and because the same 132px
figure will mislead the next surface that budgets against it.

### 4. Four server actions and a page read are missing from the scope, not just `renameFolder`

READINESS says "`renameFolder` is the only new query", which is true of `src/lib/decks/folders.ts`.
The route needs more than a query:

- `/decks` must load `listFolders(userId)` — `page.tsx:32-43` loads the deck list and the roll-up
  and nothing else, and **no deck row can name a folder that holds no decks**, which is precisely
  the S2 state the round is built around.
- There are **no folder server actions anywhere** in `src/app` — verified by search. Create, move,
  rename and delete each need one, with revalidation, in the shape `src/app/decks/actions.ts`
  already uses.

Eng scope, not a design gap. Named so the plan sizes the round correctly: it is a page read, four
actions, one query and the UI, not "the UI plus one query".

### 5. The compact shelf sheet needs its own live region — §8's "no second live region" is contradicted by this route's own precedent

STATES §8 says the shelf change "is announced by the chassis's existing result-line region … **no
second live region is added to this route**".

That region sits **outside** an `aria-modal` sheet, which this route already discovered:
`deck-filter-sheet.tsx:142-155` carries its own debounced announcement, with the comment "The sheet
is `aria-modal`, so the chassis's result line sits outside it and … a filter changed inside the
sheet is announced nowhere", and `decks-view.tsx:341-344` silences the chassis while that sheet is
open. A shelf changed from inside the compact shelf sheet has the same problem: the chassis is
either silent or speaking from behind the modal.

**Resolution, eng-side:** the shelf sheet mirrors `deck-filter-sheet`'s pattern — its own polite
region, the same debounce, and `silentResult` while it is open. The wide form needs nothing; §8 is
correct there.

## §3 The Product call Design asked for: **§3.6 stands as ruled — no folder on the tile face**

Design ruled the folder off the tile, put the fact on the Move row, and asked to be overruled if
Product wanted it. It is not overruled, for a reason from the tree rather than from taste: the tile's
detail row already holds one figure per status and that figure is conditional — `To buy` prints
copies and money, `Over` prints an overage, `Complete` prints a fixed clause
(`deck-card.tsx:54-89`, six `case` branches). A folder clause would be a second tenant competing with a row that already
branches six ways, on the one shelf (`All decks`) where every other tile is also unlabelled.

The Move row names the current shelf, and it names it where the reader can change it. Ship without,
and revisit if a real library makes the gap felt — which is Design's own recommendation.

## §4 What is not blocking, recorded

- **Many shelves.** Wraps to two lines, then scrolls horizontally. Undesigned past that, which
  Design says outright. A dozen decks is the brief's reader; fifteen shelves is not.
- **A one-frame count disagreement after a move.** Named shelves count from a server read while the
  grid re-filters client-side. Design's own fix — adjust the two affected counts optimistically
  rather than re-read — is the right one and should be built that way from the start, since both
  figures are already in hand at the call site.
- **Multi-select is slice B.** Filing eleven decks one at a time is the round's one merely-tolerable
  act. The pattern exists (`top-off-list.tsx`), and it changes no decision here.
- **Rename is the cut of last resort.** Design offers it; it is cheap enough that cutting it saves
  little, and a folder created with a typo is otherwise deleted and remade.

## §5 Sequencing

**This lands after the chassis's `/decks` slice, and not inside it.** Design is right that mixing
them makes the chassis review about folders. The denominator amendment is one argument at
`decks-view.tsx:340` and rides with this round, not with the chassis.

**The chassis team needs one sentence today:** the chassis gains no slot, no panel, no chip, no
clear scope and no density pass. Whatever else this round does, that is the fact their `/decks`
slice depends on.
