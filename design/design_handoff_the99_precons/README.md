# The 99: Commander precons (design handoff, R1)

`design/design_handoff_the99_precons/` · 2026-10-11 · mirrors `design_handoff_the99_tokens/` and `design_handoff_the99_all_decks_cart/`

**Status: R2, approved (Hugh, 2026-10-11). Build from the R2 files.** R1 is kept for history only. R2 applies Hugh's two R1 notes (2026-10-11) and is in `The 99 - Precons (R2).dc.html` and `Precons R2.dc.html`. R1's files are kept beside them, unchanged. Still open for Hugh: the phone label `Shop all decks` (R2 change 3) and the reading of ruling 3 as a route rather than a tab (G11).

## R2 changes (supersede R1 where they differ)

1. **No cart line (P2).** When the cart's line is absent (cart E4), the precon line keeps its half-width cell at 900, so a single line doesn't read as a banner. At 390 it fills the row as one 52px cell. Nothing else moves.
2. **The phone fold (P1).** In a 390 × 844 viewport calibrated to Hugh's screenshot, today's first tile starts at about 397 and the tab bar at 779. R1 stacked two 56px lines (+123px), which put the tile at about 520: the deck name ended about 38px above the tab bar, and the status pills, the 99 / 99 bar and the figure fell below it. R2 sets both doors as **one 2-up row of 52px cells** between the New deck / Import buttons and the shelf trigger: `Shop all decks · 307 · $843.99` and `Precons · 185 decklists`. That adds 68px and puts the tile at about 465, with the name, the pills and the bar above the fold. P1 draws today, R1 and R2 side by side with the shipped 248px tile art and the tab bar's top marked. 900 is unchanged.
3. **New phone label `Shop all decks`** for the cart's approved line, phone only, so it fits a half cell. `Shopping for all decks` stays at 900. **Hugh to OK.**

*R1 status:* R1, for audit. Source of truth: `docs/superpowers/design-briefs/2026-10-11-commander-precons.md` (main). Hugh's five rulings and engineering's nine locks are taken as closed. This round answers §"What Design owns" and the six open questions. Fixtures are the brief's staging figures (Counter Intelligence 91 of 91, Eldrazi Unbound 74 of 85, Wretched Ranks 18 of 67, Avengers Assemble 30 of 84 and the rest). Group splits, card names, set numbers and commanders written in `‹ ›` are **illustrative** (G1). In every frame the group figures add up to the precon's total.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them. **No new tokens, no new motion, no new dependencies.**

| File | Holds |
|---|---|
| `The 99 - Precons (R2).dc.html` · `Precons R2.dc.html` | **R2**: R1's sections, P1 with three phones (today, R1, R2) and the new P2 (no cart line). The frame takes a `doors` prop: `compact` · `stacked` · `none`. |
| `The 99 - Precons (R1).dc.html` | C0 the calls. P1 /decks. N1 New deck. L1 list, L2 empty collection, L3 no match, L4 feed unavailable. O1 fully owned + built, O2 partial, O3 mostly unowned. S1 start confirm, S2 arrival. V1 Collector's Edition twin, V2 two commanders. AB the About entry and the data credit. Every frame at 900 and 390. |
| `Precons.dc.html` | The frame component (`scene`, `phone`, `theme`). Imported by the canvas. |
| `STATES-precons.md` | Every state, with Must-nots. |
| `design-tables/precons.md` | **Commit to `docs/superpowers/design-tables/precons.md`.** |
| `precons · copy strings.ts` | Proposed `src/lib/copy/precons.ts`. Placeholders; `/copy-review` resolves wording. |
| `about · precons.ts` | The new About entry and the credit line. |
| `READINESS.md` | Self-assessed readiness and the gap report. |
| `brand/` | Locked brand sheet, copied for self-containment. |

## Design's calls (§What Design owns)

1. **/decks: a route, not a tab.** `/decks/precons`, opened from a `Commander precons` line under the Decks header (`185 decklists · newest 2 Oct 2026`). It's the same shape as the cart's `Shopping for all decks` line and sits beside it: two equal cells at 900, stacked at 390, cart first. The precon line has no accent ring, because the cart's ring marks money still to spend. Shelves, chassis and tiles are untouched. Shelves stay navigation, and nothing here is a filter on the decks. When the cart line is absent (cart E4), the precon line keeps its half-width cell at 900. Ruling 3 says "tab". This reads it as a browsable surface on /decks, drawn the way the cart already shares the page (G11).
2. **New deck: a second door.** `Start from a precon` uses `HelpMeChooseDoor`'s exact box, directly under it and above the search, and its CTA is `Browse precons →`. It goes to the list with `?from=new`, which turns the back link into `‹ New deck`. There's no inline pick, because 185 entries need the list's search and order. The desktop sub becomes `Pick a commander from your collection, start from a precon, or let us help.` The phone sub is unchanged.
3. **The list.** Newest first under year heads (`2026 · 20 decklists`). A row has a 34×48 commander thumb, the name in display 16, the commanders in mono, then colour pips with `SET · month`, and `you own N of M` on the right. It's the create picker's row shell (`--surface-rail`, radius 11) with a `›`, and the whole row presses. Search covers name, any commander and set code. The shipped `ColourPips` filters by identity (contains). Order is `Newest` (default) or `Most owned` (by share, then newest), stored per browser like the deck sort. Most owned drops the year heads.
4. **Twins (Q1): one row.** The plain edition's name, with the mono line `also sold as a Collector's Edition · the same 100 cards`. The open page names the twin in one sentence. Search matches either name, and the twin's `fileName` URL redirects to the plain one. That gives 185 rows.
5. **Already built (Q2): yes, as a comparison.** `your deck HD Tune - Counter Intelligence · 88 shared`, with the deck name linked. On the open page: `Your deck … has the same commander and 88 of its cards.` It says shared, never "built from" or "from this", because nothing stores a link (G2).
6. **The figure lives in three places.** On the row, in the open page's own box (count, a neutral `--fg-muted` bar, `15 basic lands not counted`), and per group as each group header's note (`you own 29 of 33`). It's always a count: no verdict word and no success or warning colour on the figure. The bar is neutral even at 100%.
7. **The read-only decklist** is `DecklistGroup` by type with `readOnly`. Rows keep the owned dot (filled `--success` or dashed), the name, card details on press and hover preview on desktop. They lose add, remove, lock, claim, price pick, the buy tag and I got it. The right slot shows the precon's printing (`CMM 312`). There's no By role, no Card view this round, and no sort control: A–Z within each type, as shipped.
8. **Basics (Q4): not counted.** Every figure says so. One dashed line at the foot of Lands, `Wastes ×15 · basic · not counted`. The Lands count includes basics, and its note gives the split (`you own 22 of 26 · 15 basics not counted`).
9. **Printing (Q3).** The precon's printing is shown in the read-only list and its card details. The draft carries none, and deck printings picks from the copies the player holds (S1's third fact says so).
10. **The primary action.** `Start a deck from this`: `--btn` fill in the header at 900, docked above the tab bar at 390 with a summary line, as the create picker's dock is. It opens one confirm with the commander, the name (prefilled with the precon's name), and three facts. `Start the deck` creates the draft and lands on Your deck with the import's arrival strip.
11. **Whole precon (Q6).** All 100 cards, with no subset this round. Shopping already lists what isn't owned, and the draft can be cut from there (G6).

## Open questions, answered
1. **Twin:** the plain edition stands for both; one row, with the twin named.
2. **Already built:** yes, as a `shared` comparison line on the row and in the own box (G2 has the rule).
3. **Printing:** shown in the read-only list, not carried into the draft.
4. **Basics:** excluded, and every figure says so.
5. **Order:** newest by default, with Most owned one choice away and stored per browser.
6. **Part of it:** no, the whole 100 (G6).

## Not done this round
- Unmapped cards (lock 3) are specified in STATES `O4` and not drawn as a frame.
- The Most owned order, the `?from=new` back link, and pending/failed start are in STATES only.
- Frames are in Kaldheim with Metamorphous display type and the `--btn` fill, matched to the cart round. Amonkhet and Kamigawa are available through `theme` but weren't reviewed.
