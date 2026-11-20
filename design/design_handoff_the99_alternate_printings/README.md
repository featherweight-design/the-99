# Alternate printings from search · R1 (#3002)

Account 2, 2026-11-20. Status: **R1 approved by Hugh, 2026-11-20 (LGTM). Search row: R-A, unchanged** (the recommendation; R-B stays on the canvas for the record).
Canvas (Design type): https://claude.ai/artifact/KSnSLykQbb42zUq5XKXCHf (Main, Search, Unowned, Owned, Single).

Reuses `PrintingRegion` (printing picker R3, deck printings R3) inside the shipped card details, fitted to card search R2.
No new surface, no new tokens.

## Calls
1. **Where it sits.** Card details: the shipped Set field disclosure, drawn at 2+ catalog printings (third line
   `22 printings ▾` / `22 printings · you own 2 ▾` / `◆ YOUR PICK · 22 printings ▾`). Search row: **R-A, unchanged
   (approved)**. R-B (a printings press before the +) is drawn for the record and is not built.
2. **Unowned: preview.** Selecting a printing moves the art, Set caption and price tag to it (◇ Shown now); nothing stored,
   forgotten on close or paging. Add to collection opens Edit copies with it preset as the new printing. Wishlist stays
   per card (Q7); deck printings stay owned-only; the Mana Pool link stays a name search.
3. **Owned: one region, yours first.** `IN YOUR COLLECTION · N` = today's picker (✓ Your pick, Use the default again);
   `OTHER PRINTINGS · M` preview only (`not owned`). Picking an owned tile ends a preview. Finish chips step aside when
   other printings are listed; search and set headers past 12 as shipped.
4. **One printing:** plain Set field + `The only printing` (faint mono).
5. **Phone:** the sheet stays put; the tile and the Set row thumb are the preview; drag down for full art.

Scope: card details opened from search only. Gaps: G1 catalog printings for an owned card from search; G2 preview state in
`CardModal` via the `openAtPrinting` path (with art); G3 Edit copies preset by scryfall id; G4 retired with R-B; G5 switch `SEARCH_PRINTINGS_ENABLED`; G6 strings to /copy-review.

## New strings (DRAFT, /copy-review)
- `{n} printings` · `{n} printings · you own {k}` · `· {n} printings` (picked line)
- `{n} printings. Select one to see it here.` (unowned intro)
- `{n} printings. Pick one of yours to represent this card, or select any to see it here.` (owned intro)
- `In your collection · {k}` · `Other printings · {m}` (group heads)
- `not owned` (tile meta, the shipped quick-add word) · `The only printing`
- Live: `Showing {set}, number {n}. Not in your collection.` · R-B aria: `See printings of {card}`

## Files
- `*.dc.html`, `canvas.json`: the canvas boards; `art/*.webp` the frames; `art/sw/` printings cut from Hugh's Scryfall
  capture (2026-11-20); `art/c-*.jpg` row and single-printing art.
- `scratch-gen/`: recipe = move_copy / friends_link SSR (scratch copy of main, drop @fwd-stack, npm install
  --ignore-scripts, stub tsconfig), `patch.py` (= `proposal.diff`), `render.tsx` + `fixtures.ts`, `css.mjs`, `shoot.mjs`
  (over the shipped Kamigawa Collection captures), `gen.py` (boards).
