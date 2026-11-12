# Upgrade this precon · addendum A2: Upgrade precon on the deck page

`design_handoff_the99_precon_upgrade/addendum-deck-page/` · 2026-11-12 · account 2

**Status: APPROVED by Hugh 2026-11-12 as A2c (B2).** Canvas: https://claude.ai/artifact/BGMmU2uhRMixjsKrrSkN4F (the A2, A2b and A2c rows, under R2d's boards).

How it got here:
- A2 put the button in the deck header's actions. Hugh rejected that.
- A2b drew three other places: B, a precon band under the header; C, a bare button under the header; D, the v0 row in Versions. Hugh picked B, but it was too tall on a phone. C diverged from the shipped page, and D was too hidden.
- **A2c (B2) is what to build.** It's B, with the phone band on one row.

The A2 boards still hold the gate, the flow, After Apply and the six themes. Where A2 shows the button in the header, read it as the band.

**Brief (Hugh, 2026-11-11).** Make "Upgrade precon" available from the deck page for a deck that was started from the precon, or linked to it as v0. Once the deck has a v1 on top of v0, the button doesn't show, because the deck has already changed from the precon. The flow stays the same; only the button needs surfacing. Phone and desktop.

**What doesn't change.** R2d as approved (handoff PR #2794): the intro, Commander › Bracket › Strategy, the confirm, the wait, the results, Try another strategy, and History. They use the same sheet and dialog, the same copy and the same credit rules.

Drawn over the shipped deck header (`spine-desktop.tsx`, `spine-mobile.tsx`), the deck messages to-do card, the tab strip and the list rows, in Low Sun tokens, plus a board in all six themes. The fixture is the same as R2d's: Prismari Artistry, Rootha, with the alternate Muddle. Copy marked DRAFT goes through `/copy-review`.

| File | Holds |
|---|---|
| `A2c-B-Compact.dc.html` | **The placement to build:** B2 on a phone (live, at the pulse's peak) beside B as first drawn; B at 1300 |
| `A2b-Options-Phone.dc.html`, `A2b-Options-Desktop.dc.html` | The three places Hugh reviewed (B picked) |
| `A2-Calls.dc.html` | A2's calls and gaps (its header placement is superseded) |
| `A2-Deck-Page.dc.html` | D1 live (pulse), D1p at the pulse's peak, D0 has a v1 (390); D1p at 1300 |
| `A2-When-It-Shows.dc.html` | The desktop header in each state: started at v0, linked v0, changes since v0, has a v1, not from a precon |
| `A2-Flow.dc.html` | I1 the intro with its new last line, R1 results with Apply, H2 a past upgrade from History (390); R1 at 1300 |
| `A2-After-Apply.dc.html` | A1 after Apply: the toast with Undo, the to-do card's commit step, brass-ruled rows (390, 1300) |
| `A2-Themes.dc.html` | The desktop header and the phone action row in Low Sun, Neon Rain, Canopy, Oil Haze, Witching Hour and First Frost |
| `STATES-deck-page.md` | Every state, with Must-nots |
| `READINESS.md` | Readiness and gaps G16 to G18 |
| `copy strings.ts` | DRAFT strings for `src/lib/copy/precon-upgrade.ts` |

## Design's calls

1. **The button sits in a precon band under the deck header (A2c, Hugh picked B).** The band is the shipped precon arrival band (`ArrivalBandShell`: `--surface-rail`, a bottom rule, 16px/30px side padding). It stays on the page while the button can show (call 4), between the header and the Recommended mix.
   - **Desktop:** one line. On the left, `Started from the Prismari Artistry precon` (or `Linked to the … precon` for a linked deck) and the mono `You own 41 of its 85`. The button sits at the band's right.
   - **Phone (B2):** one row, about 64px tall. The head shortens to `From the Prismari Artistry precon` and a long name ellipsises. The owned line goes under it, and the button sits at the row's right at 44px.
   - **On the first visit after a start, it's the arrival band itself.** The receipt's body and History link stay, and the button replaces the ✕. After that visit the band stays without a ✕ until the button's gate closes, and then the band leaves with it.
   - The deck header and its action row are as shipped.
2. **It's the precon page's button (R2c) at the band's size.** The label is `Upgrade precon`, with an accent outline on a 10% accent tint and no icon or line beside it. It's 32px tall on desktop and 44px on a phone.
3. **It has the same eye-catch.** The shipped `line-pulse` plays twice the first time the deck page opens with the button on it, then rests. It doesn't play under reduced motion.
4. **When it shows.** The deck has a precon's v0 and nothing committed after it. That covers two kinds of deck:
   - a deck started from the precon, whose v0 is its own first version (`startVersionId`)
   - a deck linked to the precon, whose v0 is drawn apart in Versions

   **Design's addition, approved with the round:** the button (and its band) also hides while the deck holds uncommitted changes since v0, because the swaps are worked out from the box's own list. Discarding the changes in Review, or undoing an Apply, brings it back.
5. **The flow is R2d's, unchanged.** Runs belong to the precon, so a run made on the precon page shows in History here, and the other way round.
6. **Two lines change, because the deck already exists.**
   - The intro's last line reads `Nothing changes until you apply the swaps. They land as changes since v0, and you commit them as v1.`
   - The results button reads `Apply these 14 swaps` instead of `Start the deck with these 14 swaps`. A past upgrade opened from History uses the same button.
7. **Apply is one button with one Undo.** There's no second confirm, because the results are already the review.
   - The flow closes, and the shared toast reads `Applied 14 swaps. Muddle leads.` with Undo. For a Rootha-led run it reads `Applied 14 swaps.`
   - The swaps land as ordinary changes since v0, marked with the brass rule.
   - The to-do card's next step is the shipped `30 changes since v0 +15 / −15 · Commit them as v1 in Review.`
   - The band and its button are gone, because the deck has moved off the box.
8. **The commander comes with it.** For a run led by the alternate, Apply makes Muddle the commander and moves Rootha into the 99. The 99 then changes by 15 in and 15 out: the 14 swaps plus Rootha for Muddle. Undo puts both back.

## Not drawn
- The Commander, Bracket, Strategy and Wait steps over the deck page. They are R2d's boards 3 to 6 unchanged, just over this page.
- The `/decks` list tiles. Nothing changes there.
