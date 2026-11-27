# Deck Tokens surfacing · R1 (2026-11-27, account 2)

Hugh's ask: the Tokens section of Deck details was skipped in the Deck details refresh, and he forgets it exists. Keep it at
the bottom of Your deck, make people more aware of it.
Canvas: https://claude.ai/artifact/SoJ2qaDdG75zFiW9LaVD8Q (awaiting review; no handoff PR yet).

Every board is the SHIPPED deck page (BuilderShell with the page's providers) server-rendered with the shipped CSS from
main 6f2c90e, with the proposal applied in source. BEFORE rows are main unchanged. Fixture: Ashen Banner Parade (Ashling,
the Limitless), 99 cards, four tokens with real Scryfall art (Treasure SLD 2931, Elemental SLD 2906, Thopter FRA 14,
Goblin FRC 9).

## Boards (project/, images in art/)
- T1-Box: the Tokens group becomes a deck box (PANEL + the Announced group's folding band): ◆ Tokens N, the note
  "not in the 99 · from N cards" at the band's end (phone: under the title), the chevron last. TokenRow / TokenTile unchanged.
  The "not read yet" prompt moves to the box's foot band.
- T2-Folded: folded, the band shows up to four token pictures fanned at card shape (26x36 desktop, 27x38 phone, -11px
  overlap, ±7° tilt) before the chevron. No pictures, no fan.
- T3-Cards: the same box around the Card view tiles.
- A-StatusLine (PICKED by Hugh 2026-11-27; R1b redrawn with the version segment "v2 · committed Nov 13, 2026" and the deck flip row "‹ All decks · 2 of 22 ‹ ›" in place): `◎ 4 tokens from 7 cards ›` segment in TodoFoot after combos; press = landOnDeckTokens.
- B-RowMarks: the token glyph as a row mark (after bracket facts, fact ink, folds by FoldedMarks), key entry "makes a token".
- C-ToBuy: a foot band in PriceStrip: "N tokens these cards make aren't in your collection · Tokens ›" (tokens read as not
  owned and not joined; nothing before a collection read).

Glyph: STRATEGY_GLYPHS.tokens (strategy-icon.tsx), drawn by the proposal's `TokenGlyph`.

## Recipe (scratch-gen/)
Scratch copy of main (src, public, package.json, lockfile, postcss config), @fwd-stack devDeps dropped, tsconfig with
jsx react-jsx and @clerk/nextjs + next/navigation stubbed (clerk.tsx, nav.ts), `pnpm install --ignore-scripts`, postcss
symlinked into node_modules. `proposal.diff` = the design change against main (G.__TOK picks the concept for the render;
the build drops that switch). `render-only.diff` = SSR-only patches (stored view and eager art read from globals).
Run: `DATABASE_URL=stub npx tsx dz/tok.tsx all`, `node css.mjs`, `node dz/shoot.cjs`; crops from out/pos/*.json.
