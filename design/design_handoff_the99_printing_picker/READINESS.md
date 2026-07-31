# READINESS — Collection · Per-printing art selection (#105)

**Verdict: 🟢 Green (R3)** — buildable as drawn. The three rulings R3 asked for are made below, and
R3 wins all three, including the two where it contradicts the R2 audit. One spec amendment follows
from ruling 2 and is applied in the same PR.

Audited 2026-07-31 against the spec's ten locked decisions and against
`card-modal.tsx`, `grid-view.tsx`, `browse.ts`, `globals.css`, `design-tables/collection.md` and
`app/decks/actions.ts`. R1 and R2 are retained as `(R# superseded).dc.html` for the audit trail.

---

## Rulings

**1 · The modal keeps its shipped `820×620 / 85vh`. R3 is right; the R2 audit was wrong.**

R2 grew the modal to `980px/92vh` and I approved it as a property-table update. R3 reverts it, and
the reason is in the source: `card-modal.tsx:136-140` documents the fixed height as a *bug fix* —
the dialog was `h-auto`, and paging Prev/Next between a one-line and a twelve-line oracle "resized
the dialog under the cursor on every step." A picker that grows the modal 360px on expand rebuilds
that bug in a worse form, because it fires on click rather than on navigation. The region belongs in
`.flex-1.overflow-auto`, which already scrolls. R3's gap 2 is closed as moot; no property-table row
changes.

I had that comment on screen when I approved the growth and did not connect it. Design caught it by
reading the file I cited.

**2 · The dormant tile stays. The spec is amended, not the drawing.**

Decision 5 reads "keep the pick, fall back **silently**." A visible dormant tile is a knowing
exception, and R3 is right to refuse to let it pass as drift. The intent behind "silently" was *no
banner, no prompt, no interruption of the import flow* — not *no trace anywhere*. The tile lives
inside a region you have to open, and without it there is no affordance for `Forget that pick`, so a
pin on a card you'll never re-own would be unclearable. Decision 5's text is amended in this PR to
say so.

**3 · No permanent printing caption. The `Set` field is the trigger. R3 is right again.**

Decision 6 says one owned printing "renders the modal **exactly as it does today**." R1 and R2 added
an always-on printing caption to all 2,470 cards, and I confirmed it in the R2 audit without
checking it against decision 6. R3 withdraws it: the shipped `MetaField label="Set"` already carries
`printingCaption(card)` (`card-modal.tsx:259,267`; `browse.ts:214`), which renders `CLB · 298 +10
more` — so the trigger already exists and already names the printing. Wrapping it in a button at
`printings.length > 1` is a smaller change than R1/R2 proposed and satisfies decision 8 (art and
caption can't disagree, because there is only one caption).

---

## Verified against the repo, not taken on trust

- Every token cited resolves in `globals.css` — `--brass`, `--fg-faint`, `--fg-body`, `--fg-muted`,
  `--border-dashed`, `--border-strong`, `--elevated`, `--elevated-hover`, `--surface-rail`. No new
  token, as claimed.
- The global `:focus-visible` (`globals.css:133`) and the `prefers-reduced-motion` block (`:175`) are
  where R3 says, so the picker inherits both rather than restyling focus.
- `grid-view.tsx:41` is `aspectRatio: "63/88"` — the tile really is the collection grid's tile.
- `useDialogA11y` already owns the modal's focus trap and `Esc` (`card-modal.tsx`), so the region
  adding no trap and no second handler is correct.
- `revalidatePath` at `app/decks/actions.ts:193` is the exact write-path precedent cited.
- The mobile art header is real and R3 draws on it: `card-modal.tsx:146-177`, table rows
  `collection.md:761` and `:785`.
- Overflow ceiling confirmed against the real collection: **54** printings of `Forest`, and 102 of
  2,470 unique cards get a picker at all.

## Eng-side notes for the build

1. **The modal has no live region today.** `aria-live` appears only in `filter-bar.tsx`,
   `issue-inspector.tsx` and three deck components. Add the single one the copy file specifies, owned
   by the modal. Don't add a second inside the region.
2. **Two new behaviours need property-table rows** (R3's gap 4): the mobile art header's compact
   variant, and the mobile meta-row reorder while the region is open. Add them to
   `design-tables/collection.md` in the build PR.
3. **Threshold of 12** is a judgement, not a measurement (R3's gap 3). Ship it as a named constant so
   it's cheap to re-look; it sits deliberately below Sol Ring's 13.
4. **`BrowsePrinting` needs `finish`** carried through and aggregated per collector number, and
   `primaryPrinting` (`browse.ts:205`) must honour the stored preference so grid and modal agree.
5. **`chip-row.tsx` is `src/components/collection/`; `text-field.tsx` is `src/components/ui/`.**
   `SearchField` and `ChipRow` are both named exports.

## Risk notes carried forward

- **States 2–4 are drawn scrolled**, which is honest rather than a defect — the content column
  already scrolls for long oracle text. If the region should fit unscrolled, the lever is tile size,
  not modal height.
- **#59 collision** — tile ring weights, badge plate opacity, the Set field's `--elevated` fill, the
  compact art header. Plus R3's gap 6: the picker badge shares a corner with the grid tile's quantity
  badge, harmless until #59 adds one.
- **`reversible_card` holdings** render as state 1 with no explanation. Correct, and someone will ask.
