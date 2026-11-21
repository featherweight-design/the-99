# Deck flip loading skeleton — R1

Account 2, 2026-11-21. Hugh's ask: "a dedicated loading skeleton when switching between decks using the arrows". Builds on the shipped deck flip strip (`design/design_handoff_the99_deck_flip_order/`, `src/components/decks/deck-flip-strip.tsx`).

Canvas (Design type): https://claude.ai/artifact/CKmXa1L4Jrc4NFZ5D4Z5p3 (boards Main, Today, OptionA, OptionB; files in `canvas/`, frames in `shots/`).

## How frames were made
Shipped shell (NavRail, MobileHeader, TabBar) + shipped SpineMobile / SpineDesktop + shipped DeckFlipStrip, rendered with the shipped CSS (kaldheim) from main 728de56. The body skeleton is drawn in the app's classes with the shipped skeleton tokens (`BAR` from `ui/tile-skeleton.tsx`, `anim-skeleton`). B's header shapes are a scratch CSS skin over the same render. Recipe: copy main, drop the two private `@fwd-stack/*` devDeps, `pnpm install --ignore-scripts`, scratch-gen files into `dz/` + `stubs/`, `node dz/css.mjs`, `npx tsx --tsconfig tsconfig.json dz/render.tsx`, `node dz/shoot.cjs`.

## Today
`src/app/decks/[id]/loading.tsx` draws the shared crown screen ("Shuffling up / counting the 99…"), so a flip drops the strip, header and place in the list until the next deck lands.

## Options
- **A · The header lands at once (recommended).** On a flip, the next deck's art, name, colours + commander line, status chip, count and the (static) actions draw at once; the strip reads the new place (3 of 5) and stays live. Below the header: to-do card shell, five mix cells, the tab row in real words (counts as bars, kept tab underlined), the tab's tools and card rows. Bracket chip / notice tag arrive with the page (no shape held).
- **B · All shapes.** Same, header as shapes too (art band empty, name and meta as bars). No new data, but each press blanks the art.

## Calls (both)
- Only on a flip (‹ ›, ← →). Every other entry keeps the crown screen.
- Shipped 1.4s skeleton pulse; still with reduced motion. Lands in place at the top, no fade; tab kept as today.
- Other tabs: same header + tab row, then plain rows (only Your deck drawn).
- sr-only status line, copy DRAFT: `Opening <deck name>`.

## Open
Q1 A or B. Copy DRAFT.
