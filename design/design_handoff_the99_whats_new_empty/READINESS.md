# Readiness: What's new, nothing new

**Verdict: Green.** Hugh approved B on 2026-11-03. One small UI PR (S): no migration, no new switch, no loader change.
New player-facing copy (the link and nine tease phrases) is DRAFT for `/copy-review`. Checked against `origin/main` @b1480c2.

## For engineering

- **`src/lib/copy/feed.ts`** (`feedCopy.home`):
  - `choose` becomes *Choose your notifications*.
  - `quietRest` retires. Add `tease` (`Record<FeedKind, string>`, the phrases in the README), `TEASE_ORDER` (or an
    exported order list beside it) and `quietTease(phrases)`: *We'll tell you here when {a} or {b}.* / *…when {a}.*
  - `quietName` stays: the offer line (`offer.rest`) still uses it.
- **`src/components/home/whats-new.tsx` `Quiet`:** with `on` non-empty, draw the fan and the words (README § B); pick the
  two kinds as the first two of `on` in tease order. With `on` empty, the off line as shipped (no fan). The box, the offer
  line and the rows do not change.
- **Glyphs** already shipped: `PostGlyph` (`feed/feed-item.tsx`), `NavIcon` (`shell/nav-icons.tsx`: `/decks`,
  `/friends`, `/collection`), `ComboGlyph` (`cards/combo-glyph.tsx`). Price drop's arrow is a new inline 20px stroke SVG.
- **Tests:** `whats-new.test.tsx` pins the old quiet sentence (`:89-91`, `:113`, `:138`). Pin instead: two phrases from
  the kinds on in tease order; one phrase with one kind on; no fan in the off state; the head link's new words.
- **Both widths** in the same PR (the box is one component; nothing breaks at `md`/`1180`).
- **About:** cosmetic. The `home-feed` captures draw the head link; re-take them (`pnpm capture:about`) when convenient.
  No label.
