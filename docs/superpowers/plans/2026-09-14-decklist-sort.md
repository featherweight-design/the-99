# Plan — Ordering the deck list

**Handoff:** `design/design_handoff_the99_decklist_sort/` (R1) · **Verdict:** 🟢 Green,
`docs/superpowers/readiness-decklist-sort.md` · **Brief:**
`docs/superpowers/design-briefs/2026-09-14-ordering-the-deck-list.md` (PR #631)

Both of Design's open calls are settled as drawn: `Curve up` / `Curve down` for mana value, and
direction stays re-pick. Nothing here is waiting on anything.

**One PR.** Roughly 12 files and well under 800 lines, and the slices do not separate: the toolbar
restructure without the trigger is a change nobody can see, and the trigger without the sort is a
control that does nothing. The `filter-panel.tsx` fixes ride along because the verdict rules they
must — this bar's own rule forbids the accent the borrowed branch applies.

---

## Task 1 — The copy block and its three helpers

New `src/lib/copy/deck-sort.ts`, transcribed from the handoff's
`decklist-sort · copy strings.ts` (which is itself shaped against `collectionFilterCopy.sort`).

- `DeckSortKey` = `"name" | "price" | "mana"`, `DeckSortDirection` = `"asc" | "desc"`.
- `DECK_SORT_KEYS_BY_FILTER` — `all: ["name", "mana"]`, `shopping: ["name", "price", "mana"]`.
- `DECK_DIRECTION_LABELS` — `A–Z`/`Z–A`, `Lowest`/`Highest`, `Curve up`/`Curve down`.
- `DECK_DEFAULT_SORT_DIRECTION` — `price: "desc"`, the other two `asc`. **`price` is `desc`
  because that is what #629 already ships**; changing it re-sorts every shopping list on deploy.
- `deckSortDirectionLabel`, `deckSortOrderLabel` (`"Name · A–Z"`), `buildDeckSortOptions(filter,
  key, direction)` — hint on the chosen row only — and `nextDeckSortState(current, picked)`.
- `deckSortCopy: FilterPanelCopy`, with the one departure: `triggerOne: (order) => order`, no
  `Sort:` prefix. The 38px it costs is the difference between the view well staying on the
  arrangement line at 390px and landing alone on a fourth.

**Tests** (`deck-sort.test.ts`): the direction table, `price` defaulting to `desc`, the hint
landing on exactly one row, `price` absent from `all`'s rows and present in `shopping`'s, and
`nextDeckSortState` both ways (new key adopts its default; the chosen key reverses).

## Task 2 — The comparators

`src/lib/decks/sort-cards.ts`. One function, `compareDeckCards(a, b, key, direction, newestAsOf)`,
returning a comparator result the list applies **inside** each group.

- `name` — by code point on `name.toLowerCase()`, then `oracleId`. Never `localeCompare`: this
  list renders on the server and again in the browser (the rule `sortDecks` spells out, and the
  finding #629 took).
- `price` — reuse `comparePriceDesc` from `lib/decks/price.ts` and negate for `asc`. It already
  ranks on the figure the row draws and sends figure-less rows last, and a second price comparator
  is exactly the drift `price.ts`'s own header warns about. **Figure-less rows stay last in both
  directions** — `asc` reverses the priced rows, not the meaning of "we have no price for this".
- `mana` — by `cmc`, then the name/id fallback above, so a curve sort is stable within a cost.

**Tests**: each key both ways, the figure-less-rows-last invariant under `asc`, ties falling to
name then id, and a mutation check per key.

## Task 3 — The toolbar's structural change

`src/components/decks/group-toggle.tsx`.

- Wrap `By type`, `By role`, the new trigger and the view well in ONE `flex-none` child that is
  itself a nowrap flex row — the cluster treatment `clear-auto.tsx:113-119` already applies to the
  bulk pair, for the reason its comment gives.
- **And wrap the draft note into cluster 2.** `clear-auto.tsx` wraps the *kept* note with the bulk
  pair, but the draft note is a separate toolbar child (`group-toggle.tsx:149-153`), so R1's stated
  invariant — the row wraps between clusters, never inside one — is false in that variant, which is
  also the variant nobody measured. Wrapping it makes the invariant true in both note forms and
  returns the 10px gap that variant was spending, which is five times the desktop margin being
  defended. The note keeps its own `hidden md:inline`; the wrapper must not mount an empty box when
  there is no note and no auto cluster.
- The desktop hairline (1px × 22px `--border-strong`, `hidden md:block`) goes **in front of** that
  cluster. It is a separator: it renders nothing when nothing precedes it.
- **The spacer must keep its shipped form** — `<span className="flex-1" aria-hidden />`, `flex-1`
  and no minimum. An 8px floor is 6px more than this row has.
- Mount `FilterPanel` with `selectionMode="single"`, `widthPx={260}`, `desktopRowMinPx={44}`,
  `showCounts={false}`, `searchable={false}`, `footerStatus={false}`, `compact={!wide}` and the
  `key={`sort-${wide ? "wide" : "compact"}`}` the other mounts use — the panel holds its own
  `open` and has no reset, so a sheet left open across a resize would otherwise reappear as a
  desktop popover with no trigger click.

## Task 4 — The state, and its memory

`decklist.tsx` owns `{ key, direction }` **per filter** — one sort for `All`, one for `Shopping`
(brief §2.6). Switching filters swaps which is live; it does not convert one into the other.

Persisted under `the99:deck-sort` through `useStoredView`'s store, one key for every deck, holding
both lanes: the trigger now sits in the view well's cluster, the well persists under
`the99:deck-view` for the same reason, and a single stored order could not restore
`Price · Highest` on returning to `Shopping`. **Not the URL** — a shared deck link carrying
someone else's row order is noise in the link.

`useStoredView` is `<T extends string>`, so the stored value is one string: `all:name:asc|shopping:price:desc`,
parsed through a validator that falls back to the defaults on anything unreadable.

## Task 5 — Applying it

- **`All`**: `grouping.ts`'s `groupByCardType` / `groupByRole` currently sort alphabetically inside
  each group (`:210`, `:227`). Give both an optional comparator; absent, they keep today's
  behaviour, so every other caller (the review screen, the version diff, the what-changed strip)
  is untouched.
- **`Shopping`**: `decklist.tsx:366` already sorts sections through `comparePriceDesc`; it takes
  the comparator from state instead. `rankAsDrawn` stays — the spent slot draws an undo receipt
  with no figure and must not rank on a price it does not show.
- The order applies **within** groups, never across them (Design's one constraint on this task).
- `shoppingOrderedIds` and the `All` view's `orderedIds` continue to be read off the rendered
  sections, so the card modal's Prev/Next walks the list the eye does.

## Task 6 — The two `filter-panel.tsx` fixes

Condition both on `selectionMode === "multi"`:

- `:930-931` — the trigger's `border-[color:var(--accent)]` when `selected.length > 0`. The `open`
  branch's accent border **stays**: it is transient and it means something.
- `:1010-1013` — the sheet title's accent count badge.

Both are live on `/collection` today and both improve it. **Tests**: a single-select mount draws
neither; a multi mount still draws both. Mutation-check both.

## Task 7 — Component tests

`decklist.test.tsx` / a new `group-toggle` case: the trigger renders in both filters and reads the
whole order with no `Sort:` prefix; `All`'s panel has two rows and `Shopping`'s three; picking a
new key adopts its default direction; re-picking reverses; the rendered row order changes with the
key under both groupings; switching filters swaps orders and switching back restores.

## Task 8 — Acceptance (`feature-acceptance`)

- **Inventory** `docs/superpowers/inventories/decklist-sort.json` — the deck page at both widths,
  under `All` and under `Shopping`, trigger closed and open, with a `shares` block naming
  `ui/filter-panel.tsx`'s `FilterPanel` so `pnpm check:shared` proves this route mounts the same
  component `/collection` does rather than a fourth menu.
- **Contact sheet** over that inventory.
- **`pnpm probe:deck-sort`** — the measurements the verdict requires, which no unit test can reach:
  1. the arrangement cluster stays on ONE line at 390px in all four variants, and the row never
     reaches a fourth line;
  2. **the draft-note desktop variant**, which is the state R1 did not measure — the row is one
     line at 1300px with a draft note present, not just with the kept note;
  3. the trigger's accessible name carries the whole order;
  4. no accent border on the resting trigger, and no `1` badge in the sheet;
  5. the phone trigger clears 44px.
  Each check fails on a build with its own fix reverted, and that is verified rather than assumed.

If (2) wraps, spend R1's named fallbacks in its order: `By role`'s idle `px-[6px]` → 0 at phone
(12px), then the desktop `md:` gap 10 → 9 (5px). Both are one token.

## Out of scope

A price order under `All` (the row draws no figure first — its own brief), an ungrouped list, and
any change to what a row draws.
