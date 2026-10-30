# About · launch entries addendum (R6 rules)

Five entries batched into one `ABOUT_VERSION` bump (9 → 10). Every entry is `since: 10`. Each one
is a filled §G template (`STATES-about-r3.md` §G, R3 canvas §8) and stays in its chapter (R6 H3).
**Nothing in R6 changes.** The parent folder is untouched.

- Canvas: `The 99 - About · Launch Entries.dc.html`. §0 shows the bump as a reader meets it (sheet N2,
  index O1). A1–A5 each show a filled template, then the entry at the 760 column and at 390. §6 lists
  what the build owes.
- Copy: `about · launch entries.ts`, the five `AboutEntry` objects with their insert positions.
- Repo path: `design/design_handoff_the99_about/addendum-launch-entries/`.

## Where each entry goes

| Entry | Chapter | After | Why |
|---|---|---|---|
| A1 Help me choose | 02 Finding a commander | `discover` | It gets you to a commander when you have none. The deck comes after, through `new-deck`. Discover is its other door |
| A2 Locked cards | 03 Building the 99 | `decklist-marks` | Set and read on decklist rows and tiles (L4). The caption names each tool it binds |
| A3 Find a deck for it | 03 Building the 99 | `add-cards` | Its act is adding a card to a deck. `combo-awareness` is the precedent for a /collection route in 03 |
| A4 Cheaper stand-ins | 03 Building the 99 | `shopping` | It lives inside the Shopping view |
| A5 Change commander | 03 Building the 99 | `new-deck` | A swap is an edit to a deck that exists (brief ruling 7) |

After the bump there are 44 entries: chapter 02 has 1 new and chapter 03 has 4 new.
- **The sheet (N2):** `5 new in About`, then Help me choose, Locked cards and Find a deck for it, then `and 2 more`.
- **The index (O1):** all five, in page order.
- **Search:** the count reads `m of 44`.
- **R6 §R9.1:** the rail measurement is now taken against 44 rows.

## Specimens

| Entry | Specimen | Mounts as shipped? |
|---|---|---|
| A1 | `ChooseRow` ×2 | Yes. It takes props, inside `CardDetailProvider` |
| A2 | `DecklistRow` ×3, at rest and in the mode | Yes. `LockCardsProvider` with a fixture value |
| A3 | The picker's plate and rows | **No (E1).** `FitsPicker` loads on open inside `ModalChrome`. Export `FitsPlate` / `FitsRows` unchanged and let the picker render them |
| A4 | `StandInLimit` + two Shopping `DecklistRow`s | Yes. `SwapToolsProvider` with fixture props. The sheet is not mounted (it loads on open) |
| A5 | `ChangeCommanderDoor` + two candidate rows | **Partly (E2).** Export the sheet's `Row` / `GroupHeading` unchanged as `CandidateRow`. Fallback: door + `CommanderSection` |

E1 and E2 are extractions, not forks. One component serves both the feature and this page (§G3).

## Held to the brief

- **Key lines say what each feature does.** They quote no figure, limit, order or price, because
  Hugh may change the swap and Find-a-deck behaviour after his walk. The fixtures carry figures. The
  key lines do not.
- **Locked cards' key lines are the audit's L1–L4** in the reader's words. The card modal is not
  drawn, because L4 rules that it shows nothing about a lock.
- **Change commander's key line 4** stays true once the half-trade ships (see
  `design_handoff_the99_change_commander/addendum-half-trade/`).
- **No new copy module.** Every string in a figure comes from its surface's own copy file
  (`swap-tools.ts`, `locked-cards.ts`, `change-commander.ts`, `help-me-choose.ts`).

## Revision r2 · 2026-09-25 (ranking rebuild)

A3 and A4 are rewritten to describe the rebuilt swap-tools ranking (see
`design_handoff_the99_swap_tools/addendum_ranking_rebuild/`). The earlier canvas and `.ts` stay as they are.
- **Canvas:** `The 99 - About · Launch Entries r2.dc.html`. Only A3, A4 and §6 differ.
- **Copy:** `about-launch-entries-r2.ts` holds the two replacement objects. Ids, positions and `since` are unchanged.
- **A3 Find a deck for it:** the caption and key lines now say that decks are ordered by synergy and that each gives one reason (a combo, then a theme). The specimen is Basalt Monolith, with a combo row and a theme row. The two chips are now one reason line.
- **A4 Cheaper stand-ins:** the caption and key lines cover the type groups and the land ladder with its mana line. The "free first" and Take/Undo lines are dropped: price is now a tiebreak, and the caption already covers undo. The locked-card rule stays in A2. The specimen adds one sheet group (lands, three rows, Show all). That needs **E3**: export `StandInGroup` unchanged.
- Key lines still quote no figure, limit or price.
- **Open:** if v10 has already shipped to readers, decide whether a rewrite of two entries needs a bump. R6 has no "revised" state, and Design's reading is that a rewrite doesn't need one.

## Open

1. **Chapter 02's sub** says *Two lanes*. Help me choose is a door into those lanes, so the sub
   still holds. If Hugh reads it as a third lane, the sub gains a clause. That is copy, not design.
2. **E1 and E2** are engineering's to accept. If E2 is declined, A5's figure loses the candidate
   figure, which is the entry's subject.
