# Consider tiles and tab — readiness (R1, H30)

| Part | Readiness | Note |
|---|---|---|
| Tile → `CardTileCaption` | **Ready** | Meta: `OwnershipDot`, the slot, `CardFactMark`s, then `ComboGlyph`. Deletes `CostPips`, the hover hint, and the art's bottom shadow from `suggestion-tile.tsx`. |
| `$` slot, figure-only | **Ready, one prop** | `BuyTag` needs a figure-only tile form (no `buy` word). It falls back to the existing collapsed `$`. |
| Combo partner line | **Ready** | `+ {partner}` replaces `ComboClause` on this host only. Keep its sr-only sentence. One new string. |
| Lift ink | **Ready** | Token and size swap at `suggestion-tile.tsx:99–117`, all three branches. |
| Shelf header + fold | **Ready** | `consider-panel.tsx` `ShelfSection`. A disclosure button inside the `h3`, which keeps `tabIndex -1`. `localStorage` per deck. |
| Mark key combo sample | **Needs a call** | Ledger 1: the key is shared with top-off, so the sample needs a `size` prop or a 12px sample. |

## Gap report

1. **§C2 versus the `ComboClause` host rule.** On Consider, the mark leaves the clause and joins the
   marks line. Top-off and quick-add keep the clause. Record the amendment beside `combo-clause.tsx`'s
   placement comment.
2. **The name clamps to one line, not two.** It follows `CardTileCaption`. Long names truncate where
   today they wrap. The full name stays in the detail trigger's accessible name and in the modal.
3. **Fold storage key is new.** `the99.consider.folded.{deckId}`. Ignore unknown shelf keys, because a
   role can lose its last owned suggestion. SSR renders all shelves open, so a folded shelf flashes
   open once on hydration unless the read happens before paint. A cookie avoids that; not drawn.
4. **Desktop grid stays `md:grid-cols-6`** (ledger 3). This is unchanged and not in this round.
5. **Header inks.** The count clause moves `--fg-faint` → `--fg-muted`, and `Show all` moves `--accent`
   → `--fg-body`. Both are contrast fixes on the same line, beyond the lift line itself.
6. **About entry.** None is drawn. Hugh decides.

## What a green looks like

- No element is positioned over a Consider tile's art: the art box has one child, the `img`, plus the
  inset-edge span.
- At 390 and 1300, every tile's caption measures 56 and 50, whatever its marks, slot or combo.
- On all six themes, the lift node's computed colour is `--fg-muted` at 10px, and its contrast against
  `--surface` and `--elevated-hover` is ≥ 4.5.
- A card with a game changer mark and a combo draws `card-fact-gameChanger` then `combo-glyph` in the
  meta line, and no `combo-glyph` anywhere else on the tile.
- An applied tile draws no `combo-glyph` and shows its type line.
- Folding a shelf, then reloading or switching tabs and back, leaves it folded. Other decks are
  unaffected. A folded shelf renders no `Show all`.
