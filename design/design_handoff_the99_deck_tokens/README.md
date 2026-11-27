# Deck Tokens surfacing (approved 2026-11-27, account 2)

Hugh's ask: the Tokens section of Deck details was skipped in the Deck details refresh, and he forgets it exists. Keep it
at the bottom of Your deck and make people more aware of it.
Canvas: https://claude.ai/artifact/SoJ2qaDdG75zFiW9LaVD8Q. Hugh picked A, and A1 for the phone strip.

Every board is the SHIPPED deck page (BuilderShell with the page's providers), server-rendered with the shipped CSS from
main 6f2c90e, with the proposal applied in source. BEFORE rows are main unchanged. Fixture: Ashen Banner Parade (Ashling,
the Limitless), 99 cards, v2 committed Nov 13, 2026, 2 of 22 in the flip, and four tokens with real Scryfall art
(Treasure SLD 2931, Elemental SLD 2906, Thopter FRA 14, Goblin FRC 9).

## What ships
- **T1-Box.** The Tokens group becomes a deck box: `PANEL` plus the Announced group's folding band, with ◆ Tokens N,
  the note "not in the 99 · from N cards" at the band's end (on phone, under the title) and the chevron last.
  TokenRow and TokenTile are unchanged. The "not read yet" prompt moves to the box's foot band.
- **T2-Folded.** When folded, the band shows up to four token pictures fanned at card shape before the chevron: 26x36
  on desktop, 27x38 on phone, -11px overlap, ±7° tilt. No pictures, no fan.
- **T3-Cards.** The same box around the Card view tiles.
- **A-StatusLine.** `◎ 4 tokens from 7 cards ›` is a TodoFoot segment after combos. Its press calls `landOnDeckTokens`.
  The board shows R1b with the version and flip row in place. That board's three-line phone strip is SUPERSEDED by A1.
- **A2-StripLines, option A1 (approved).** Below `md`, the strip uses short forms so it stays on one line:
  `v2 · Nov 13` (the year is dropped within the current year), `∞ 5 near combos ›` and `◎ 4 tokens ›`. From `md` up, the
  wording is the full shipped wording. Each press keeps the full sentence as its accessible name. A2 (two lines) was
  not picked.

B (a token mark on maker rows) and C (a line in the To buy box) were drawn in R1 and NOT picked. Their boards stay on
the canvas and in `design-assets` only.

Glyph: STRATEGY_GLYPHS.tokens (strategy-icon.tsx), drawn by the proposal's `TokenGlyph`.

## Recipe (scratch-gen/)
- Scratch copy of main (src, public, package.json, lockfile, postcss config), with the @fwd-stack devDeps dropped.
- tsconfig with jsx react-jsx and @clerk/nextjs + next/navigation stubbed (clerk.tsx, nav.ts).
- `pnpm install --ignore-scripts`, then postcss symlinked into node_modules.
- `proposal.diff` is R1 against main and still carries B and C behind `tokConcept()`. Build only the box and A.
- `strip-lines.diff` is the final todo-foot change. `G.__STRIP` picked the option for the render, and the build keeps
  only "one".
- `render-only.diff` holds SSR-only patches (stored view, eager art and the flip strip read from globals).
- Run: `DATABASE_URL=stub npx tsx dz/tok.tsx all`, `node css.mjs`, `node dz/shoot.cjs`. Crops come from out/pos/*.json.
