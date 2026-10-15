# The 99 — Proposed cuts About entry (design handoff, R1)

`design_handoff_the99_proposed_cuts_about/` · 2026-10-15 · account 2 · **R1, approved by Hugh 2026-10-15.**

A light addendum: one new About entry for Proposed cuts, which already ships with none. Source of truth:
`docs/superpowers/design-briefs/2026-10-15-proposed-cuts-about.md` (branch `brief/proposed-cuts-about`). It follows
the per-entry template (`design_handoff_the99_about/`, R4 §8, `STATES-about-r3.md` §G3) and matches
`suggested-changes` and `mana-balance`.

## Files

- `The 99 - About · Proposed Cuts Entry.dc.html`: the one artboard. The entry drawn on the shipped `/about` at 1300
  and 390 in the Kamigawa theme, R6 sheet mode, entry marked new, plus the template's slots. Open it with
  `support.js` beside it. Reference, not code to ship. The same canvas is live as a Design artifact in account 2.
- `about · proposed cuts.ts`: the entry object as it goes into `src/lib/copy/about.ts`.

## Locked by the brief (no Design call)

`proposed-cuts`, chapter `04` after `suggested-changes`, route `/decks`, `opens a deck’s Analysis tab`, `plate`,
switch `PROPOSED_CUTS_ENABLED` (engineering adds it to `AboutSwitch` and `SWITCHES`), `since: 14`, no bump, content
hash re-pinned, `marksPending: true`.

## The calls

1. **Title: `Cutting back to 99 with Proposed cuts`.** The reader's task, then the tool's name, as
   `Tuning a deck with Suggested changes` does.
2. **Specimen: C1, the free count.** The panel's heading, over lead, Look deeper offer and `What we counted`, before
   any spend. It is computed, free and repeatable, and it is what every reader sees first.
   - Not C3: it would freeze one model-written reason into the page as if every reader got it, and sourcing it costs
     a credit. Not C8: it shows the end of the tool, not the tool.
   - **Component:** the heading, lead, offer and count move out of `cuts-panel.tsx` into one component,
     `CutsFreeCount`, which `CutsPanelView` itself renders and the figure renders inside `Specimen` from
     `fixtures.proposedCuts`, as `SuggestedChangesFigureBody` composes the tuning panel's own parts. One tree, never a
     fork (§G3). Mounting the whole `CutsPanelView` was rejected: it reads asynchronously (the figure would paint
     empty first) and needs the card-detail, review-run and verdict providers.
3. **Caption: three paragraphs.** The reader's question and the free count; Look deeper, Cut and Keep, and the close
   at 99; then the trim line's `Proposed cuts` press and History. The third paragraph is gated whole on
   `TUNING_HUB_ENABLED` through `captionLineSwitches`, since both exist only with the hub on. Placeholder copy, owed to
   /copy-review.
4. **Key lines: four of the brief's five.** Credit (free count, refunded runs), never named, cited figures, Cut and
   Undo. The fifth (it closes at 99) ends the caption's second paragraph instead, where the walk-through finishes.
5. **Phone reduction: nothing dropped.** Caption and keys are the same text; route and `opens` wrap under the title
   as on every entry. The specimen is the same component and takes the panel's own phone layout (it switches on the
   viewport, as `mana-balance`'s table does).

## Fixture

HD - Zombies, deck `3119268e-f824-48ce-8e27-6b8cabe4cb61` (110 cards, 10 over; not its 99-card twin), Zul Ashur,
Lich Lord, no partner, no locked cards, no run, allowance drawn as `5 of 5 left`. Every string in the figure comes
from `copy/deck-cuts.ts`, `overCopy.trim.words` and `creditsCopy.standing` at render time.

## Gaps

- **G1** The count's rows, `total` and EDHREC deck count on the artboard are placeholders. Engineering reads them
  from the real panel's free count on staging and writes them into `lib/about/fixtures.ts`.
- **G2** The `Never named` line assumes zero Key cards on the deck. If it has some, the line names them as the panel
  does.
- **G3** Drawn in sheet mode (`ABOUT_SHEET_ENABLED`): NEW pill before the title, 2px accent rule. With the switch
  off the NEW mark trails the title, as on every entry.
- **G4** Bracket rows appear only against a declared bracket. None is drawn; the caption's bracket clause still holds.
