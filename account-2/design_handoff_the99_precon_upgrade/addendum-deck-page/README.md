# Upgrade this precon · addendum A2: Upgrade precon on the deck page

`design_handoff_the99_precon_upgrade/addendum-deck-page/` · 2026-11-12 · account 2

**Status: A2 drawn, awaiting Hugh's review.** Canvas: https://claude.ai/artifact/BGMmU2uhRMixjsKrrSkN4F (the A2 row, under R2d's boards).

**Brief (Hugh, 2026-11-11).** Make "Upgrade precon" available from the deck page for a deck that was started from the precon, or linked to it as v0. Once the deck has a v1 on top of v0, the button doesn't show, because the deck has already changed from the precon. The flow stays the same; only the button needs surfacing. Phone and desktop.

**What doesn't change.** R2d as approved (handoff PR #2794): the intro, Commander › Bracket › Strategy, the confirm, the wait, the results, Try another strategy, and History. They use the same sheet and dialog, the same copy and the same credit rules.

Drawn over the shipped deck header (`spine-desktop.tsx`, `spine-mobile.tsx`), the deck messages to-do card, the tab strip and the list rows, in Low Sun tokens, plus a board in all six themes. The fixture is the same as R2d's: Prismari Artistry, Rootha, with the alternate Muddle. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `A2-Calls.dc.html` | The calls, the gaps, D1 at 1300 |
| `A2-Deck-Page.dc.html` | D1 live (pulse), D1p at the pulse's peak, D0 has a v1 (390); D1p at 1300 |
| `A2-When-It-Shows.dc.html` | The desktop header in each state: started at v0, linked v0, changes since v0, has a v1, not from a precon |
| `A2-Flow.dc.html` | I1 the intro with its new last line, R1 results with Apply, H2 a past upgrade from History (390); R1 at 1300 |
| `A2-After-Apply.dc.html` | A1 after Apply: the toast with Undo, the to-do card's commit step, brass-ruled rows (390, 1300) |
| `A2-Themes.dc.html` | The desktop header and the phone action row in Low Sun, Neon Rain, Canopy, Oil Haze, Witching Hour and First Frost |
| `STATES-deck-page.md` | Every state, with Must-nots |
| `READINESS.md` | Readiness and gaps G16 to G18 |
| `copy strings.ts` | DRAFT strings for `src/lib/copy/precon-upgrade.ts` |

## Design's calls

1. **It goes with the deck header's actions.** That's the one place on the deck page for actions on the whole deck, and it's above the fold at both widths.
   - **Phone:** it joins the action row under the bar: `Update`, Export's icon, `Upgrade precon`, `⋯`. The row still fits on one line at 390, as it does with Commit as v1.
   - **Desktop:** it sits on its own line just above the row, right-aligned. Four buttons in the row beside the title column would wrap it onto two lines (the column has `basis-[280px]` and the actions `shrink-[4]`).
2. **It's the precon page's button (R2c) at the row's size.** The label is `Upgrade precon`, with an accent outline on a 10% accent tint and no icon or line beside it. It's 32px tall on desktop and 44px on a phone, in the row's mono 11px. Export stays the row's one filled button.
3. **It has the same eye-catch.** The shipped `line-pulse` plays twice the first time the deck page opens with the button on it, then rests. It doesn't play under reduced motion.
4. **When it shows.** The deck has a precon's v0 and nothing committed after it. That covers two kinds of deck:
   - a deck started from the precon, whose v0 is its own first version (`startVersionId`)
   - a deck linked to the precon, whose v0 is drawn apart in Versions

   **Design's addition:** the button also hides while the deck holds uncommitted changes since v0, because the swaps are worked out from the box's own list. Discarding the changes in Review, or undoing an Apply, brings it back. This is Hugh's call to confirm.
5. **The flow is R2d's, unchanged.** Runs belong to the precon, so a run made on the precon page shows in History here, and the other way round.
6. **Two lines change, because the deck already exists.**
   - The intro's last line reads `Nothing changes until you apply the swaps. They land as changes since v0, and you commit them as v1.`
   - The results button reads `Apply these 14 swaps` instead of `Start the deck with these 14 swaps`. A past upgrade opened from History uses the same button.
7. **Apply is one button with one Undo.** There's no second confirm, because the results are already the review.
   - The flow closes, and the shared toast reads `Applied 14 swaps. Muddle leads.` with Undo. For a Rootha-led run it reads `Applied 14 swaps.`
   - The swaps land as ordinary changes since v0, marked with the brass rule.
   - The to-do card's next step is the shipped `30 changes since v0 +15 / −15 · Commit them as v1 in Review.`
   - The button is gone, because the deck has moved off the box.
8. **The commander comes with it.** For a run led by the alternate, Apply makes Muddle the commander and moves Rootha into the 99. The 99 then changes by 15 in and 15 out: the 14 swaps plus Rootha for Muddle. Undo puts both back.

## Not drawn
- The Commander, Bracket, Strategy and Wait steps over the deck page. They are R2d's boards 3 to 6 unchanged, just over this page.
- The `/decks` list tiles. Nothing changes there.
