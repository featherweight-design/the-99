# READINESS audit: Public card and commander pages (R1)

Audited 2026-10-18 against `docs/superpowers/design-briefs/2026-10-17-public-card-and-commander-pages.md` (main, #2031),
the code at `origin/main` (c81e35eab), 9f's merged groundwork (#2046, `src/lib/public/`; #2051, `src/lib/rate/anon.ts`),
and staging read-only (Neon `misty-rain-01681654`, branch `br-polished-pond-a6e63y0b`). Design's own self-check is
`READINESS.md` in this folder. Build from `canvas/` (index `canvas/canvas.json`) with `README.md` and `STATES-public-pages.md`.

## Verdict: GREEN

The brief's seven Locked items and both 2026-10-18 decisions hold on every board. Each of its eight Open questions has
an answer (README §The eight calls). Every state in §Every state to draw is drawn at 1300 and 390, or as a fragment. No
new token is introduced. The findings below are engineering corrections and build notes, and each resolves without a
new drawing, so nothing goes back to Design. One product question carries a default and does not block the build.

## What was checked

- **Locked 1, two pages, search out.** Card and commander only. No search box anywhere. `Find another card on Scryfall ↗`
  (1300) and `Search Scryfall ↗` (390) sit in the top bar, also on the not-found page (C3).
- **Locked 2, catalog only.** Every figure on the boards maps to a field of `PublicCard` or `PublicCommander`
  (`src/lib/public/card.ts`, `commander.ts`). Rank, deck count, themes, bracket counts, the most-played cards ("signature")
  and similar commanders are all read. The board drops engine and budget counts, which the loader carries; they stay
  unrendered. No loading state is drawn, because the page is cached HTML.
- **Locked 3 and 4, signed out, no "Sign up".** One in-flow block (C1), named `About The 99`. It offers `Sign in` and
  explains the invite, with no field and no form. No wall, modal, toast or sticky bar on any board.
- **Locked 5, the same for everyone.** No string reads a session, cookie, locale or time. The degraded copy is
  build-relative ("the last time this page was built").
- **Locked 6, footer.** The A0 stub is on every board, and no credit line is repeated in the body.
- **Locked 7, both widths.** A1 to A4, B1 to B4 and C3 at 1300 and 390. C1 side by side. C2 and C4 are width-free.
- **Decided: no prices.** No price, foil price or Mana Pool link. `Rulings, prices and every printing on Scryfall ↗`
  carries a shopper out.
- **Decided: prose on the commander page.** It leads the right column under `Why this commander` (B1). With no prose,
  the section unmounts (B2).
- **States.** Single-faced (A1), double-faced (A2), many printings (A3, 390 capped at 8 behind `Show all 21`), no image
  and the 40 cap (A4), full (B1), no prose (B2), `absent` (B3), `degraded` (B4), the block (C1), previews (C2), unknown
  address (C3), and fragments for bracket facts, not legal, rank blank and both blank (C4).

## Findings (all engineering)

1. **Both faces' rules text is stored (Design's README asked).** `cards.oracle_text` joins the faces with `\n//\n` for
   `modal_dfc` and `transform` (staging: Valki, God of Lies, and Delver of Secrets). A2's split block is therefore buildable
   as drawn: split on the `//` line and put each face's name in the rule. `mana_cost` carries both halves for a
   `modal_dfc` (`{1}{B} // {5}{B}{R}`) and the front only for a `transform`, so a transform's cost row shows one cost.
2. **Similar commanders already resolve (Design's README asked).** `loadPublicCommander` inner-joins `commander_support`
   on the similar ids, so every link has a page. Nothing to add.
3. **Prose in `degraded` (Design's README asked).** The loader nulls it, and B4 draws none. Build as drawn. Showing the
   stored sentence in `degraded` stays a possible later change and is not taken here.
4. **Printing count.** Build as drawn (A4): `first 40` with `More on Scryfall ↗` when the read hits `PRINTINGS_LIMIT`.
   A `printingsTotal` field is not needed for the boards.
5. **The flip is not a shared component yet.** The turn control and its 320ms `rotateY` live inside `card-modal.tsx`, and
   there is no exported `TurnOverIcon`. F3 extracts the control and both surfaces import it, so the public page and card
   details cannot drift (`check:shared`).
6. **The footer does not exist yet.** The A0 handoff is #2065 (open) and `src/` has no notice component. Locked 6 puts it
   on both pages, so F3 ships the pages only after the footer component lands, or in the same PR that mounts it.
7. **No app shell.** The boards draw their own top bar, with no rail and no tab bar. The routes need a layout outside the
   signed-in shell.
8. **The not-found page is a variant.** C3 is the shipped not-found without `View decks` (it leads behind sign-in), and it
   carries the top bar.
9. **Copy: one em dash.** The `absent` note (`public-pages · copy strings.ts:60`) uses `—`, which the em-dash rule bans in
   UI copy. It is routed through copy review at build time, not back to Design.
10. **Theme.** A visitor has no preference, so the pages render in `DEFAULT_THEME` (Low Sun), the theme the boards use.
11. **Canvas-only.** A2's face images are placeholders, and B1's Zimone sentence is a sample. The build reads real art and
    the stored sentence.

## About

No About entry is drawn, and none is proposed as owed: About is an in-app page, and by Locked 3 a signed-in reader is
never routed to these pages. Hugh (or d9 as his proxy) decides which features owe an entry. The default is none.
