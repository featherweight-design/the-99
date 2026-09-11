# READINESS — Set collections (handoff R3)

**Verdict: 🟢 Green.** Build may start.

- **Handoff:** `design/design_handoff_the99_set_collections/` (R3, 2026-09-11)
- **Spec:** `docs/superpowers/specs/2026-09-10-set-collections-design.md`
- **Audited:** 2026-09-11
- **Design self-assessment:** 🟢 Green with one engineering dependency. Concur.

## What was checked, and against what

Every load-bearing claim in the handoff was checked against the shipped tree at `dffcab4`,
not against the spec's description of it. Several were checked numerically.

| Claim | Source | Result |
|---|---|---|
| `--fg-locked` clears 3:1 on `--surface-sunken` in all six themes at 3.16–3.44:1 | computed from `globals.css` | **Exact.** 3.16 Oil Haze → 3.44 Canopy |
| `--border-dashed` fails that floor at 1.46–1.97:1 | computed from `globals.css` | **Exact.** 1.46 Oil Haze → 1.97 Canopy |
| The pin write path revalidates `/collection` only | `src/app/collection/actions.ts:198,210` | **True**, both `setCardArtPreference` and `clearCardArtPreference` |
| `Set ▾` already exists on the collection toolbar | `filter-bar.tsx:4` | **True** — the collision is real |
| The collection tile captions `TLA · uncommon`, desktop only | `grid-view.tsx:111` | **Exact**, including the `hidden md:inline` that drops it on phone |
| Collection tiles badge `×N` | `grid-view.tsx:70` | **True** — decision 25's divergence is real |
| Collection rows state colour identity and no mana value | `rows-view.tsx:81` | **True** — §1b's parity premise holds |
| `printing_picker` ships `Your pick` as a 7px filled `--accent` diamond | `printing-region.tsx:573` | **True** — decision 13's "unset half of an existing mark" is accurate |
| Every token named in the handoff exists | `globals.css` | **True** |

State coverage: `STATES-set-grid.md` draws all fifteen states the spec enumerates, plus
four edges beyond it (upload-while-open, the wrapping head at 390px, 100% with unowned
extras, the full 390px base grid).

## Findings — four, all engineering-resolvable

None of these went back to Design. They are carried in the spec's "Findings from the
readiness audit" section and restated in the plan's global constraints, which is where an
implementer reads them.

1. **The set icon does not inherit `currentColor`.** Gap 4 records this as unverified; it is
   now verified false. `svgs.scryfall.io/sets/*.svg` is a bare `<path>` with no `fill`, so it
   renders black on every theme, not only inside the `--success` ring at 100%. `mask-image`
   with a token background resolves it, including the `--fg-muted` rest state. Not a
   redesign, and not the fetch-and-recolour the gap report feared.
2. **The colour filter is not a mountable component.** `filter-bar.tsx` builds the desktop
   pip row inline and the mobile Color panel separately. "Mounted, not forked" requires an
   extraction, and decision 15's own rule governs it: parameterised, never `isSetPage`.
3. **Decision 16 names no mechanism.** The stale-page strip needs the page to learn a delta
   exists, and needs its count, while deliberately not re-rendering. Nothing pushes. A count
   fetched on window focus delivers both.
4. **Windowing interacts with the strip.** Gap 7 correctly leaves windowing to engineering,
   but the chosen approach has to hold the sticky head, the `extras ↓` jump and the delta
   strip in one scroll container.

## Findings from the first review round

Copilot's round on the spec produced ten valid findings beyond the four above, all fixed in
the same push. Four are worth recording because each would have shipped a wrong number:

- **`booster` alone files every Commander product under extras.** Cards in a Commander deck
  are not booster-eligible — `c21` and `otc` carry `booster: false` throughout, checked live
  — so the literal rule gives them a `base_set_size` of 0, on a page whose search scope
  deliberately includes `set_type = commander`. The boundary now falls back to non-variant
  printings for a set with no booster cards at all.
- **A pasted list carries no set code.** `parsePasteList` writes `setCode: ""` as well as an
  empty collector number (`paste.ts:49`), so a pasted holding belongs to no set page. The
  spec claimed ruling 4 rescued pasted lists; it rescues set-bearing rows that lack a
  collector number, and nothing more.
- **#330 ships no cart.** Its affordance is a `manapool.com/add-deck` Mass Entry link
  (`src/lib/manapool/links.ts`). "Cart link-out" named a thing that does not exist.
- **A failed refresh can outlive the nullability guard.** `seedPrintings` writes in
  independent batches, so a partial run leaves a rewritten mix of `booster` values beside the
  previous run's denominator. The denominator is now cleared before the ingest and
  repopulated only after it completes.

Also fixed: reuse `priceState`/`priceOf` rather than restating the four price cases, so a
`soldOut` last-known price is never quoted as live; collapse unpinned holdings by
`oracle_id` before placement, since `finish` is in the primary key; order the index
`nulls last`; and point the modal reference at `card-modal.tsx` rather than at its loader.

**One finding was pushed back.** The review read the denominator as a units mismatch — a
cell is a collector number, but `base_set_size` counts printing rows. `(set_code,
collector_number)` is unique across the catalog: zero groups of more than one, checked. The
two counts are the same count, and the spec now records the invariant so it is not raised
again.

## Errata

- `READINESS.md` claims "seven of the nine grid states" are drawn. Ten are. The line is
  R2-era, carried into R3. The drawings are right; the sentence is stale.
- Gap 2 leaves the duplicate-oracle case's copy unsettled. Copy content, so `/copy-review`
  rather than a Design round-trip.

## Rulings this round settled

- **Spec ruling 4 was amended, not reinterpreted.** It originally carried no mark on a cell
  filled by name. Hugh overruled that at design R2 in favour of marking. The spec now
  records the amendment and the reasoning; an implementer reading the spec alone would
  otherwise build the unmarked version.
- **§1b (the Collection row cost track) is in scope but severable.** It changes
  `/collection` and neither new route, and ships on its own PR. Recorded as a spec addendum
  rather than a separate ticket because it was asked for inside this handoff and is drawn in
  this canvas.

## Dependencies before the UI can land

- `printings.booster`, `printings.rarity`, `sets.base_set_size` — the whole page. Nullable,
  which is what makes the not-indexed state a real state rather than a wrong figure.
- The catalog re-seed that populates them.
- `revalidatePath` extended to `/collection/sets/[code]` on both art-preference actions.
- The colour filter extracted from `filter-bar.tsx`.
