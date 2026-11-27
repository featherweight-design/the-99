# Readiness Review — Deck Tokens surfacing

**Verdict:** 🟢 Green (Design-side note; a cold audit may replace it)
**Reviewed:** 2026-11-27
**Related ticket(s):** none (Hugh's ask; canvas approved 2026-11-27: box + A, phone strip A1)
**Plan PR target:** TBD

## Summary
The Tokens group at the foot of Your deck becomes a deck box with a folding ◆ band, and the folded band fans up to four
token pictures. A status-line segment, "◎ 4 tokens from 7 cards ›", lands on the box. On phone the whole strip
(version · combos · tokens) stays on one line by using short forms below `md`. No new tokens and no new marks: the
glyph is STRATEGY_GLYPHS.tokens.

## Notes for the plan
- 🟡 **Box.** `tokens-group.tsx` uses `PANEL` and the `precons/announced-group.tsx` band (one button inside
  `h3#deck-tokens-heading`, keeping the id and `tabIndex={-1}` for `landOnDeckTokens`). Fold state, landing and the
  failed read are unchanged.
- 🟡 **Fan.** Folded only, from `picture.imageUriSmall` through `HydratedImg`, `aria-hidden`.
- 🟡 **Status segment.** It goes after combos, drawn as `NearCombosSegment`, and only when the deck tokens read is ok
  with at least one token. `footHasSegments` must count it. The shell passes the facts in (`TodoFootFacts.tokens`).
- 🟡 **Phone strip (A1).** Below `md`: `v{n} · {Mon D}` (the year shows only outside the current year),
  `{n} near combos`, `{n} tokens`. Full forms from `md` up, and each press keeps the full sentence as its accessible
  name. This also shortens the shipped strip on phone (2 lines → 1).
- ✅ **No migration, no new data.** Every figure drawn is already on the page.
- 🟡 **Copy.** New strings (`group.segment`, the short forms) are DRAFT for `/copy-review`.
