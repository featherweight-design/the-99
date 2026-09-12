# Readiness — set collections addendum R3

**🟢 Green, with one decision to confirm and one open item that cannot block a start.**

Every ruling here is against source read at `main` this round, not against screenshots: the grid, the
cell, the index view, the filter module, the copy module, the shared colour row, the button and field
primitives, and `browser.tsx`'s owned-params list. The five findings touch four components and one
copy file, and none of them touches a token, the sticky head's contents, the cost strip, the delta
strip or the card modal.

## What is ready to build now

| Finding | State | Notes |
|---|---|---|
| 1 + 2 · the grid | **Ready** | One declaration and one constant (146) in `set-grid-view.tsx`, all size literals out of `set-cell.tsx`. `auto-fill`, never `auto-fit`. |
| 3 · the rack | **Ready, one PR** | Mana-symbol pips, `Rarity ▾` + panel, chip line, three fixed rows. **Mounts the chassis's pip and `filter-panel.tsx` — must not fork either.** |
| 4 · name search | **Ready, sequenced with or after 3** | `SearchField` + a fourth field on `SetGridFilters`. Must go through `applyFilters`, which now has four readers. |
| 6 · the phone head | **Ready** | `set-grid-view.tsx` (the head is inline there — there is no `set-head.tsx`) + `cost-strip.tsx`. Phone-only forms beside the shipped strings; threshold collapse with hysteresis; no desktop change. **Same file as finding 3.** |
| 5 · the extras figure | **Ready** | One block moves in `set-index-view.tsx`; two tokens change; the aria clause is mandatory, not optional. |

## The one decision I want confirmed

**The scroll, at both widths now: desktop ≈10,300 → ≈16,500px and phone ≈29,000 → ≈64,000px.** That
is the arithmetic consequence of "bigger enough to read the art", and size here is bought in whole
columns — at 1100px the options are 8×116, 7×149 or 6×175, and at 390px they are 3×112.67 or 2×174.
Nothing in between exists. I have ruled 146 (7 columns desktop, 2 phone) and charged the scroll
against the sticky head, the `extras ↓` jump, missing-only and the new name search. **If the scroll
is too much, the lever is the constant** — 116 → 8 columns and the R1 page length, 160 → 6 columns and
21,500px.

## Open, not blocking

1. **Upscale** peaks at 1.21× (736px of content) and 1.19× on a phone — now stated by the constant
   rather than discovered per width. The fix, if needed, is a phone-only source change and severable.
2. **B, R and G's pip colours are assumed**, not quoted in the chassis brief. Confirm on first fetch;
   the 9.51:1 floor has 6.5 points of headroom.
3. **Chip skin** is specified here because the chassis names the line but not its pixels. If the
   chassis package specs them, it wins.
4. **Three amendments to the chassis** — Clear covering the search, the toggle as a fifth control
   type, and a trigger's value taking the caption's register. All three should be ruled in that
   package, not only here.

## What I would cut if the round has to shrink

**Findings 3 and 6 touch the same file and the same sticky container**, so they want the same PR or
adjacent ones — the chip line and the collapsed bar are both about that container’s height.
**Finding 6’s content moves before its collapse** — the four moves are 177px on their own and need no
scroll machinery, while the sticky bar is the part with a threshold, a hysteresis band and a
cross-fade to get right. Then **finding 5** — it is one line moving and it improves the row, but nothing downstream depends
on it. Then the chip line's **phone** half, keeping the desktop chip line: the phone row already
carries a badge, so the chips are the most redundant 34px in the package. **I would not cut the pip
change to save time** — it is the one item here that fixes a measured accessibility failure (1.38:1)
rather than a consistency one. **I would not cut the
`no filters on` line** even though it looks like the cheapest thing here — it is what makes the
sticky head's height a constant, which is the finding behind the finding.

## Tests worth writing with this

- `auto-fill` not `auto-fit`: filter to three cells and assert the track width is unchanged. This is
  the brief's own constraint and it is one keyword from breaking silently.
- Owned and missing cells return identical `getBoundingClientRect` widths and heights at both
  minimums.
- `applyFilters` with a query: the result line's count, the `Send N` label, the cost strip's
  denominator and the rarity panel's per-row counts are the same computation in every case, zero
  included.
- The collapsed head overlays rather than reflows: the grid’s computed track count is identical at
  scroll 0 and scroll 400.
- The unlit pip has no `opacity` and no ring; the lit pip has a ring and full opacity. Asserting the
  absence is the point — the shipped dimming is what regressed.
- The index row's `aria-label` contains the extras clause whenever the extras line renders, and never
  when it does not.
