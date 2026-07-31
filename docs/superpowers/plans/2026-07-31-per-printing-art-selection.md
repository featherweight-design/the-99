# 2026-07-31 — Per-printing art selection (#105) — implementation plan

Builds the design handoff at `design/design_handoff_the99_printing_picker/` (READINESS 🟢 Green, R3)
against the spec `docs/superpowers/specs/2026-07-29-per-printing-art-selection-design.md`.

- **Issue:** [#105](https://github.com/HartiganHM/the-99/issues/105)
- **Branch:** `feat/105-printing-picker`
- **Surface:** `/collection` card detail modal only. No new route.

The user picks which printing of a card they own represents it. The pick persists per user, applies
to every collection surface, and survives a collection re-import.

---

## Phase 1 — `card_art_preferences` table

`src/db/schema.ts`, new table after `collectionItems`:

```ts
export const cardArtPreferences = pgTable("card_art_preferences", {
  userId: text("user_id").notNull(),
  oracleId: uuid("oracle_id").notNull().references(() => cards.oracleId),
  setCode: text("set_code").notNull(),                              // lowercase, per §3.3
  collectorNumber: text("collector_number").notNull().default(""),  // TEXT — "12a", "★", ""
}, (t) => [primaryKey({ columns: [t.userId, t.oracleId] })]);
```

- **PK is `(user_id, oracle_id)`** — one pick per card per user, so re-picking is an upsert on that
  key. `(set_code, collector_number)` is the *value*.
- **No FK to `collection_items`, deliberately.** `replaceCollection` deletes and re-inserts every
  holding on each upload; a FK or `ON DELETE CASCADE` would wipe every pick on every re-import.
  That absence is what implements spec decision 5. Add a code comment saying so — it looks like an
  omission otherwise.
- The FK to `cards.oracle_id` is kept; the catalog is stable and shared.

Generate migration `0009_*` with `pnpm db:generate`. Do not hand-write it.

## Phase 2 — read path (`src/lib/collection/browse.ts`)

### 2.1 `BrowsePrinting` gains four fields

```ts
export type BrowsePrinting = {
  setCode: string;           // uppercased for display; stored lowercase
  setName: string | null;    // from `sets`; null when the catalog has no row
  collectorNumber: string;   // "" for exports that carry no collector number
  releasedAt: string | null; // for the overflow view's newest-first set grouping
  quantity: number;
  /** Per-finish counts, e.g. {nonfoil: 3, foil: 1}. Aggregated across the collapsed rows. */
  finishes: Partial<Record<"nonfoil" | "foil" | "etched", number>>;
  imageUri: string | null;
};
```

`aggregateCollection` already collapses finishes into one entry per `(setCode, collectorNumber)`.
**The finish is not merely dropped in aggregation — it never reaches it.** `RawCollectionRow`
(`browse.ts:74-92`) has no `finish` field and the `loadBrowseCards` select list (`browse.ts:287-302`)
never selects `collectionItems.finish`. So Phase 2.4 must add `finish: collectionItems.finish` to
the select and `finish` to `RawCollectionRow` before this aggregation is possible. The column exists
(`schema.ts:97`) and is part of the primary key (`:100`), so per-finish rows already arrive
separately — nothing else is needed. Then sum into `finishes[r.finish]` on both the create and the
merge path.

`setName` / `releasedAt` come from the new `sets` join and are identical across merged rows.

### 2.2 Tier 0 in `resolveImageUri`

Chain becomes `preferred → exact → representative → catalog → identity gradient`. One new field on
`RawCollectionRow` (`preferredImageUri`) and one new leading `??` arm. The three existing tiers and
their tests are untouched.

The fall-through is on non-null **value**, not on match success — a preferred printing whose
`image_uri` is null must fall to `exact`, exactly as the existing tiers do. This is the property
`browse.test.ts` already asserts for tiers 1–3; extend it, don't restate it.

### 2.3 Preference-aware primary printing

**The preference travels on the row, not as a second parameter.** `RawCollectionRow` gains
`preferredSetCode: string | null` and `preferredCollectorNumber: string | null` alongside
`preferredImageUri`, all three from the joins in §2.4. `aggregateCollection` derives the pick from
the first row of each oracle group — its signature does not change, so no caller moves.

**Case normalisation is load-bearing.** `BrowsePrinting.setCode` is uppercased (`browse.ts:147`)
while `card_art_preferences.set_code` is stored lowercase. Uppercase the preference when comparing,
or the match silently misses — the same class of bug the tier-2 `lower()` callout below guards
against.

```ts
function primaryPrinting(printings, preference): BrowsePrinting
```

Returns the printing matching the preference if it is present in `printings`, otherwise today's
behaviour (`find(p => p.imageUri !== null) ?? printings[0]`). Note the preferred printing is
returned **even when its image is null** — the caption must state the user's intent (spec edge
case 3); only the image falls through, and it does so inside `resolveImageUri`.

`printingCaption(card)` keeps its one-argument signature — it is called from `card-modal.tsx:259`
and `:267`, where no preference is in scope — and reads `card.preferredPrinting` internally. Same
printing as `primaryPrinting`, so grid tile and modal can never disagree.

`BrowseCard` gains:

```ts
/** The stored pick, or null. Present even when the printing is no longer owned (dormant). */
preferredPrinting: { setCode: string; collectorNumber: string } | null;
```

The picker needs this to distinguish "no pick" (nothing checked — decision 10) from "picked", and to
render the dormant tile when the pick is not in `printings`.

### 2.4 `loadBrowseCards`

- Third alias of `printings`, `preferred`, left-joined on
  `(oracle_id, lower(set_code), collector_number)` from `card_art_preferences` — itself left-joined
  on `(user_id, oracle_id)`.
- Left-join `sets` on `lower(collection_items.set_code) = sets.code` for `name` / `released_at`.
- Select `cardArtPreferences.setCode` / `.collectorNumber` onto `RawCollectionRow`, so §2.3 needs no
  second query.
- Select `collectionItems.finish` — see §2.1; without it the finish aggregation cannot be written.
- `sets.code` is the primary key (`schema.ts:13`), so the `sets` join is at most 1:1 and multiplies
  no rows. The `preferred` alias keyed on `(oracle_id, lower(set_code), collector_number)` rides
  `printings_oracle_set_idx` (`schema.ts:59`) as a prefix and yields ≤1 row, because
  `(set_code, collector_number)` is unique in Scryfall even though the table's PK is `scryfall_id`.

**Blast radius is contained, by inspection.** `aggregateCollection` and `printingCaption` have
exactly two production callers (`browse.ts:317`; `card-modal.tsx:259,267`), and `primaryPrinting` is
module-private (`browse.ts:205`). Nothing in `recs/`, `decks/` or `home/summary` imports `browse.ts`,
so the preference cannot leak into the deck builder, recommendations or commander surfaces — which
is what decision 2 requires.

> The printings epic caught a set-code case mismatch that made tier 2 match zero rows while
> type-checking cleanly. Tier 0 inherits that trap — hence `lower()` on both new joins, and an
> integration test that asserts a real join hit.

## Phase 3 — write path

`src/app/collection/actions.ts` (existing `"use server"` module):

```ts
export async function setCardArtPreference(oracleId: string, setCode: string, collectorNumber: string)
export async function clearCardArtPreference(oracleId: string)
```

- `requireUserId()` first, as every action here does.
- `setCode` lowercased on write (§3.3 normalise-on-write).
- Upsert: `.onConflictDoUpdate({ target: [userId, oracleId], set: { setCode, collectorNumber } })`.
- `revalidatePath("/collection")` — `loadBrowseCards` is wrapped in React `cache()`, so the read is
  memoised. Same pattern as `src/app/decks/actions.ts:192-193`.
- **Validate at the boundary:** the action must reject a `(setCode, collectorNumber)` the user does
  not own, since it is reachable outside the picker. One `select 1 from collection_items where …`
  guard; return without writing on miss.
- `collectorNumber` may legitimately be `''` (bare `Name,Qty` imports). Do not coerce it to null,
  do not reject it.

## Phase 4 — copy

Port `design/design_handoff_the99_printing_picker/printing-picker · copy strings.ts` verbatim into
`src/lib/copy/collection.ts` as a sibling export `printingPickerCopy`, following the existing shape
(flat const object, functions for interpolated strings, callers pass pre-formatted numbers). No
string literals in the component.

## Phase 5 — `src/components/collection/printing-region.tsx`

New client component. Props exactly as the handoff's eng notes specify:

```ts
{ printings, preferred, resolvedKey, onPick, onReset, copy }
```

Structure and every measurement come from the handoff README — do not re-derive them:

- Region below the meta row, **inside `.flex-1.overflow-auto`**, separated by `1px var(--border)`.
  It must not change modal height: the fixed `md:h-[620px]` is a bug fix (the class is at `card-modal.tsx:141` and the
  comment explaining it at `:136-140` — `h-auto` resized the dialog under the cursor while paging
  Prev/Next).
- Desktop grid: content column is `820 − 320 = 500px`, less `32px` padding a side = `436px` →
  **three tiles at a 16px gap** (~135px each). Tile frame `aspectRatio: "63/88"`, matching
  `grid-view.tsx:41`.
- **Tile states:** *Your pick* (`outline 2px solid var(--brass)` at `+3px`, filled brass `✓` badge
  `21px` radius `5px`, name weight 600); *Shown now* (`outline 1px dashed var(--fg-faint)`, hollow
  `◇` on `rgba(10,8,6,.72)`) — this is the resolver's choice, **not** rendered as a selection
  (decision 10); *Dormant* (`2px dashed var(--brass)`, `grayscale(.55)`, `opacity .55`, meta `×0`,
  label `Your pick · not owned now`, `aria-disabled`) with the `Forget that pick` control.
- No radio is `aria-checked` when no preference is stored.
- **Overflow past 12 entries** (`const PRINTING_OVERFLOW_THRESHOLD = 12` — a judgement, named so it
  is cheap to re-look; it sits just below Sol Ring's 13, and the ceiling is Forest at 54): a
  `SearchField` from `src/components/ui/text-field.tsx` **unmodified** (matches set name, set code,
  collector number), finish chips in `src/components/collection/chip-row.tsx` geometry (single
  select, no dismiss ✕), and set group headers `Bloomburrow · BLB · 4` ordered by release date
  newest first, ties A→Z, undated last. **No virtualisation** — 54 tiles is the measured ceiling.
- **A11y:** `div#printings[role=radiogroup][aria-label="Printings you own"]` containing
  `button[role=radio][aria-checked]`. Arrow keys move *and* select, Tab leaves, Home/End jump, no
  wrap. `Esc` collapses and returns focus to the Set field; `useDialogA11y` handles the second Esc
  and already owns the focus trap, so add neither here. Focus inherits the global `:focus-visible`
  (`globals.css:133`); the `prefers-reduced-motion` block at `:175` covers the expand transition.
  Tiles ≥ `100×140`; mobile search input 16px.
- Empty `collectorNumber`: omit the field **and its separator**, not a `no number` placeholder.

## Phase 6 — `card-modal.tsx` wiring

- **Trigger:** wrap the shipped `Set` `MetaField` (`:267`) / `MetaCell` (`:259`) in a button when
  `card.printings.length > 1`. `background var(--elevated)`, `1px solid var(--border-dashed)`,
  radius `8px`, padding `8px 12px` with `-8px -12px` margin, plus a third line, mono 11px
  `var(--brass)`: `N printings you own ▾`. `aria-expanded` / `aria-controls="printings"`.
  At exactly one printing the modal renders **exactly as today** (decision 6) — 2,368 of 2,470
  unique cards in the real collection. No always-on caption.
- One new `expanded` boolean of state. No modal modes, no new route.
- **The modal has no live region today** — `aria-live` appears only in `filter-bar.tsx`,
  `issue-inspector.tsx`, `decks/export-dialog.tsx:78` and `decks/degraded-banner.tsx:22`. Add the single one the copy file specifies,
  owned by the modal. Do not add a second inside the region.
- **Mobile:** the shipped 180px art header (`:146-177`) stays. The `Set` cell is promoted out of the
  2×2 grid to a full-width row (`min-height 62px`, thumb `40×56` radius `5px`, radius
  `10px 10px 0 0`); Rarity/Identity move above it while expanded; the art header collapses to a
  72px thumbnail + title/type line (`padding 44px 20px 14px`, `display:flex; align-items:flex-end;
  gap:14px`) **only past the overflow threshold**.
- Commit is immediate — no Save button, no confirmation (decision 7).

## Phase 7 — property table

Add rows to `docs/superpowers/design-tables/collection.md` for every new element, and specifically
the two behaviours the audit flagged as having no row: the **mobile art header's compact variant**
and the **mobile meta-row reorder while the region is open**.

## Phase 8 — tests

**Fixtures first.** The new required fields on `BrowsePrinting` and `BrowseCard` break the literals
at `browse.test.ts:15-17` and `:19-34` **and** at `set-filter.test.ts:11-13` and `:15-29`. No
production code constructs either type by hand, so that is the whole blast radius.

**Unit** (`src/lib/collection/browse.test.ts`, all against pure functions):

- `resolveImageUri` with tier 0 set / unset / set-but-null — confirming the chain still falls
  through on null *value*, not on match success
- `primaryPrinting` returning the preferred printing rather than the sort-order first
- `printingCaption` naming the preferred printing, **including when its image is null**
- finish aggregation, and decision 9's "plain nonfoil shows nothing" rule
- picker suppressed at exactly one printing
- empty `collectorNumber` renders no stray separator

**Integration:**

- a preference survives `replaceCollection` — decision 5's entire point
- the upsert is idempotent on `(user_id, oracle_id)`
- **tier 0 actually joins** — assert a real join hit, not that the code compiles
- the write action rejects an unowned `(setCode, collectorNumber)`

**Gate:** `pnpm typecheck && pnpm lint && pnpm test` plus the stub-DB build, then rebase on
`origin/main`.

## Out of scope

- Per-deck art choice — [#42](https://github.com/HartiganHM/the-99/issues/42); a deck-level override
  needs a deck to attach to.
- Per-finish selection — rejected by decision 3 (foil and nonfoil share one Scryfall image).
- Any change to the collection list, grid, filter bar or replace flow.
- [#59](https://github.com/HartiganHM/the-99/issues/59)'s richness restyle. It will collide with tile
  ring weights, badge plate opacity, the Set field's `--elevated` fill and the compact art header;
  build against the current property table and let #59 reconcile.

## Known consequences

- `reversible_card` holdings have no `printings` row by design (printings plan §3.2.3), so they
  resolve via tier 2 and cannot be picked. They render as a single-printing card with no
  explanation. One such holding exists in the real collection. Correct, and someone will ask.
- The picker's ✓ badge shares a corner with the grid tile's quantity badge. Harmless until #59
  adds one.
