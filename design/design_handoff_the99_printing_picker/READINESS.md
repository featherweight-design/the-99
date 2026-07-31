# READINESS — Collection · Per-printing art selection (#105)

**Verdict: 🟠 Orange (R2)** — the R1 blocker is genuinely cleared and the desktop composition is
Green as drawn. One blocker remains, and it is **my error, not Design's**: R1's audit told Design
that mobile has no art panel. It does. Every mobile state needs redrawing against the art that
actually ships.

Audited 2026-07-30 against `docs/superpowers/specs/2026-07-29-per-printing-art-selection-design.md`,
`src/components/collection/card-modal.tsx`, and `docs/superpowers/design-tables/collection.md`.
R1's verdict is in git history; R1's canvas is retained as `(R1 superseded).dc.html`.

---

## R1 findings — all six closed

| R1 finding | R2 |
|---|---|
| **Blocker:** second modal view violates locked decision 4 | **Cleared.** Inline region inside the card view, no `view` state, no back link, no `Done`. The reasoning for spanning the modal rather than living in the `320px` art column is right, and the "compare printings *against the card*" argument is exactly what the lock was protecting. |
| Pin dropped on replace | **Corrected**, with a dormant state (6) and `Forget that pick` that the spec didn't ask for and should have. |
| Pin scope promised decks | **Corrected.** `regionSubtitleChosen` now says "wherever this card appears in your collection." |
| Per-finish attributed to decision 5 | **Corrected** to decision 3. |
| Pin identity | **Withdrawn**, key accepted. |
| `no number` nullability | **Corrected** to the empty string. |

---

## Blocker — mobile art. My correction, wrongly given.

R1's audit asserted that `card-modal.tsx:180` being `hidden md:flex` meant mobile has no card art,
that the brief was right and the Collection handoff's drawing stale. Design acted on that in good
faith and removed mobile art from R2 entirely — decision 1 now rests on it ("its `40×56` thumbnail is
the only card art on the phone").

**The opposite is true.** `card-modal.tsx:146-177` is a `md:hidden` **mobile art header**: a
gradient-backed block with a `180px`, `63/88`, `10px`-radius art image and the close button over it.
`hidden md:flex` at line 180 is only the *desktop* art column — mobile has its own. The shipped
property table documents both: `design-tables/collection.md:761` **Mobile: Art Header** and `:785`
**Mobile: Art Image**. The Collection handoff's drawing was correct all along.

So R2's mobile states remove a documented, shipped element, which the handoff itself lists under
"Not in this ticket." Every phone frame needs redrawing with the `180px` art header present, and the
promoted `Set` row's disclosure has to find its room underneath it rather than standing in for the
art. The desktop composition is unaffected.

## Corrections eng applies without a Design round

| # | Handoff says | Correct |
|---|---|---|
| 1 | Picking writes to "the modal's **existing** live region. **No second live region is introduced.**" | `card-modal.tsx` has **no live region** — `aria-live` appears only in `filter-bar.tsx`, `issue-inspector.tsx` and three deck components. Eng adds one to the modal. Design's intent (one region, owned by the modal, not the picker) is right and is what gets built. |
| 2 | The modal "grows to `980px` (capped at `92vh`)" when the region opens | Shipped geometry is `md:h-[620px] md:max-h-[85vh] md:w-[820px]`. Growing it is a real change to a documented row, so `design-tables/collection.md` gets updated in the build PR rather than treated as unchanged. Design's gap 2 assumed the table still holds; for the desktop height it doesn't. |
| 3 | "`chip-row.tsx` / `text-field.tsx` are untouched" | Correct, but they live in different places: `src/components/collection/chip-row.tsx` and `src/components/ui/text-field.tsx`. `SearchField` and `ChipRow` are both exported as named. |
| 4 | Gap 3 — a dormant printing whose set is otherwise absent renders a group header with a count of 1 | Confirmed correct as drawn. The header is generated per set present in the entry list, and a dormant entry is still an entry. |

## Confirmed against code, not taken on trust

- The tile is genuinely the collection grid's tile: `grid-view.tsx:41` is `aspectRatio: "63/88"`, same
  as the modal's own art at `card-modal.tsx:172` and `:187`. No new tile language.
- The caption as a `MetaField` matches the shipped property grammar — `MetaCell` at
  `card-modal.tsx:309`, `MetaField` at `:348`.
- The `320px` / `28px` desktop art column the region docks under is exactly `card-modal.tsx:180-182`.
- Overflow model is right for the real ceiling: **54** printings of `Forest`, and 102 of 2,470 unique
  cards get a picker at all.
- Pin key holds: `(oracle_id, set_code, collector_number)` has zero duplicate groups across all
  100,601 rows of `printings`; `collection_items.scryfall_id` is nullable.
- Copy corrections both applied (`copy strings.ts:35`, and the dormant block at `:74-79`).

## Risk notes carried forward

- **#59 collision** — tile ring weights, badge plate opacity, caption fill `#221D16`, region attach
  border `#4A4033`. Unchanged from R1, plus the region border.
- **Region height budget.** Design's gap 5 is the right thing to defend: two full tile rows is the
  floor, and the collapsed art strip is what buys them.
- `no number` will be logged as a defect at least once. Accepted.
