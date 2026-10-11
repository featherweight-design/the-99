# The 99: Where an added copy goes (design handoff, R1)

`design/design_handoff_the99_added_copy/` · 2026-10-11 · mirrors `design_handoff_the99_tuning_hub/` (R3 shape)

**Status: R1, approved (LGTM, Hugh, 2026-10-11).** Build from the R1 files. The three Needs-Hugh items in `READINESS.md` were approved as drawn (`can use it`, one summary row per card, a lone brew named). Source of truth: `docs/superpowers/design-briefs/2026-10-11-where-an-added-copy-goes.md` (main). Hugh's four rulings are taken as closed. The seven engineering proposals are drawn against as leans, not as final. This round answers §"What Design owns" and the five open questions.

**Fixtures.** Hugh's staging Sol Ring: 17 owned, 17 committed decks asking for one each, three brews (`HD - Kratos`, `HD - Gishath`, `HD -Thorin`, the last with no space, as on staging), and no `card_assignments` rows. Frames that need a committed deck short are marked **hypothetical**. They use `HD - Brago`, `HD - Eldrazi` and `HD - Avatar Aang` as the junior committed decks, with 16 Sol Ring owned before the add. Versions and dates are illustrative.

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them. **No new tokens, no new motion, no new dependencies.**

| File | Holds |
|---|---|
| `The 99 - Added Copy (R1).dc.html` | Calls and Q1–Q5 (C0), every form of the line (L0). AC1–AC7 Add Cards, IG1–IG5 I got it, US1–US6 the upload summary, KF1–KF4 Keep it free. Each is drawn at 900 and 390. |
| `Added Copy.dc.html` | The frame component (`scene`, `phone`). It's imported by the canvas. |
| `Copy Chooser.dc.html` | ContestedCardRow as extended (`variant`, `phone`). It's imported by the frames. |
| `STATES-added-copy.md` | Every state, with Must-nots. |
| `design-tables/added-copy.md` | **Commit to `docs/superpowers/design-tables/added-copy.md`.** |
| `added-copy · copy strings.ts` | Proposed `src/lib/copy/added-copy.ts` and the `card-assignments.ts` / `i-got-it.ts` deltas. Placeholders, with wording resolved by `/copy-review`. |
| `READINESS.md` | Self-assessed readiness and the gap report. |
| `brand/` | Locked brand sheet, copied for self-containment. |
| `The 99 - About · Added Copy Entry.dc.html` | The About entry on the About handoff's per-entry template (§G), then at 760 and 390. |
| `about · added copy.ts` | The new `AboutEntry`, for `src/lib/copy/about.ts`. |

## Design's calls (§What Design owns)

1. **The line sits where each surface already reports the add.**
   - **Add Cards:** a `Where it went` / `Where they went` block in the saved state, after the count line. It has one row per card a deck needed.
   - **I got it:** the receipt body. It replaces `claimed` / `claimedMany`, which were already the line for the "went elsewhere" case.
   - **Upload summary:** the `No longer to buy` rows, whose deck column now carries the sentence in short form.

   There's no new banner and no new section.
2. **Two verbs, and the verb is the claim.**
   - `goes to` is used only when a deck holds the copy: a committed deck by seniority, or any deck the player picked (`granted`).
   - `is free for` is used when the copy is loose and brews read it as theirs. It names the brew when exactly one asks, and says `the 3 brews that need it` otherwise (Q1).

   That means the line never has to invent an owner for a soft share.
3. **No single answer.**
   - **Several decks:** one row per card, with `2 copies of Sol Ring go to HD - Brago and HD - Eldrazi, one each`.
   - **Picked earlier:** `which you picked earlier`, so a default never reads as a pick.
   - **Covered nothing:** this includes the case where every deck that asks already holds a copy. On Add Cards it gets one faint foot line, `No deck needed Lightning Greaves, so it's free.` On I got it it gets one body sentence. In the summary it gets nothing (the shipped empty receipt).
   - **Brews only:** see call 2.
4. **Change.**
   - **Where it opens:** inline under its row on Add Cards and in the summary, because both have room and the row is the context. On I got it it opens the app's modal (520) or bottom sheet, because a toast can't hold a list. The toast is held while the chooser is open.
   - **The chooser:** the shipped chooser, with picks optimistic on tap. Change becomes `Done` while it's open.
   - **What it lists:** every deck that needs the card, brews included. Senior committed decks that already hold theirs fold into one dashed `Show` row, so 17 decks don't bury the four the choice moves.
   - **Only one deck needs it:** the chooser still opens, because `Keep it free` is a real second option (KF1).
5. **Keep it free.**
   - **In the chooser:** the last option, under a rule. It's a select at one copy. With two or more copies it's a select plus a `− n +` stepper (Q2). The cap reads `1 given · 1 kept free`.
   - **In the summary:** the row stays where the player acted and reads `kept free, so HD - Brago still bills it`.
   - **On a deck:** `1 kept free · Change` takes the row's availability-marker slot.
   - **On Shopping:** the row and its buy tag stay. The owned fact gains `· 1 kept free`.
   - **Taking it back:** open the same chooser and deselect Keep it free, or pick a deck. There's no second control.
6. **Constraints held.**
   - There's no verdict word or warning colour on a copy set aside. Every kept-free fact is `--fg-faint` mono, and `kept free` in the chooser is `--fg-body`.
   - Keep it free is a count.
   - Copy says select/deselect, never tick.
   - Deck outcomes (`gets it` / `buys it`) stay as shipped, since they're facts about the deck, not the kept copy.
7. **One new outcome word:** `can use it` (`--fg-muted`, hollow mark), for a brew's soft share in the chooser. `gets it` on three brews for one copy would claim three copies, and `buys it` would be false. This breaks card-assignments' "three forms and no more" rule on purpose, so `/copy-review` should rule on it.

## Open questions, answered

1. **A spare copy and several brews:** name none. `Sol Ring is free for the 3 brews that need it · Change.` In the chooser all three read `can use it`, and one note says why. Picking one grants it, so that brew `gets it` and the others `buy it`. With exactly one brew asking, it's named, but still with `is free for` (AC4).
2. **One copy or all:** a count, one control per card (KF2). Its maximum is what you own, less commander copies.
3. **Across a re-upload:** it persists, capped. A capped count is said once on the summary row in plain counts, with Change (US6). A removal that lowers `owned` below the count gets the same sentence without the upload clause (brief edge 7, in the copy file).
4. **On the deck that needed it:** yes. It shows as owned but set aside, `1 kept free`, and the card still reads missing (KF3, KF4).
5. **I got it vs `tookCopy`:** one sentence. The shipped `claimed` sentence is the line, so it stays and gains Change. **Change belongs on the receipt**, because Undo takes the copy out of the collection, and Change keeps it and moves it.

## The About entry
- **Placement:** `added-copy`, chapter 01, after `all-decks-cart`.
- **Version:** `since: 15`, batched into the all-decks cart line's bump (14 → 15). If another round has taken 15, it batches into that one. If v15 has already shipped to readers, it needs its own bump (16).
- **Template:** a filled §G template (`design_handoff_the99_about/STATES-about-r3.md` §G), under R6 rules. Nothing in the About handoff changes.
- **Key lines** quote no figure, limit or price. Line 1 states the seniority rule the chooser already shows as its order.
- **Specimen:** CopyLine plus ContestedCardRow's keep row, read-only.
- **Switch:** `KEEP_FREE_ENABLED` (G8).

## Gap report

- **G1 · One helper, three surfaces.** Proposal 1 (`receiptFacts`' diff) has to return **soft brews** as well as `tookCopy`. That's the brews whose soft share went from 0 to covered, kept apart so the line can say `is free for` without naming them as holders. It also needs `picked` (a granted reservation that this add filled) for `which you picked earlier`.
- **G2 · The summary's frozen payload.** `cleared` holds (deck, card) pairs, so a brew's soft cover isn't one today, and three brews on one copy would be three rows. The payload needs a per-card destination (`went: {kind: 'held'|'soft'|'none', decks}`). Rows group by card. After a Change the row redraws live, as contested rows do.
- **G3 · `isContested` gates the chooser's only door.** A card one deck needs isn't contested, so it has no row. Change needs `loadContestedCard` (or a sibling) to load any card with a claimant, contested or not.
- **G4 · Keep it free in the chooser's write.** `assignCopyFor` moves the one authored reservation. Keep it free is a separate write (proposal 4's table), and selecting a deck after Keep it free has to lower the count by one in the same transaction, or the pick fails `no-supply-left`.
- **G5 · `previewAllocation`** needs the kept count, so the marks can move on the tap when Keep it free is pressed.
- **G6 · Marker precedence on a deck.** With a copy kept free, `none free` would contradict the noun. The marker slot shows `keptFree` instead. This needs a fifth marker state, and availability's comment block names four.
- **G7 · Senior holders fold.** The chooser's `Show` row is new. Its count is the committed claimants with `allocated ≥ quantity` that sit ahead of the first one this pick could move.
- **G8 · Switch.** `KEEP_FREE_ENABLED`, plus an `AboutSwitch` member. The line can ship ahead of Keep it free behind the same files, because the chooser just omits the last row.
- **G9 · `pulled from` vs the removal warning.** These are different mechanisms with the same words (brief). Nothing here changes either. Hugh's trigger quote is answered by the line, not by rewording the warning.

## Not done this round
- Card detail's `In your collection` block. It reads `17 in use · 1 kept free` per the copy file, but isn't drawn.
- The cart line's owned fact with `· 1 kept free` is specified in the copy file and not redrawn.
- Frames are drawn in Kaldheim only.
