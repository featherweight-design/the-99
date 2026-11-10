# Brief: Upgrade this precon

**For:** Claude Design. **Prompt:** to be written by the orchestrator from this brief.
**Source:** Hugh's rulings of 2026-11-10 on the precon-upgrade research (findings, outputs and measured costs live in the
private boards folder, not the repo).
**Existing handoffs to extend:** `design/design_handoff_the99_precons/` (the open precon page, Start a deck, STATES-precons.md),
`design/design_handoff_the99_suggested_changes_v2/` (Pick toggle, Results, Wait, Short-Run, credit lines),
`design/design_handoff_the99_swap_tools/` (price and owned marks). Where a shipped component and a handoff disagree, the
component wins.

## Hugh's rulings (2026-11-10), which bind every screen here

1. **The player picks a direction.** A new precon owner may not know the deck's strategy, so this is not treated like
   their own decks. The page shows the deck's 2 to 3 detected strategies, each explained in plain words with the deck's
   own cards that support it. **No strategy is pre-selected.** The pick drives the upgrade.
2. **Detection is stored data, no model call** (EDHREC tags plus the Overview's plan and alternate). A strategy the deck
   cannot back with enough of its own cards is not shown.
3. **One model call per upgrade.** Code checks every swap (card in the candidate pool, not already in the deck, no
   duplicates, every cut in the deck) and repairs or retries. The player never sees a rejected line.
4. **12 to 18 swaps**, cuts taken from the other theme(s), added cards may be owned or not, **no added card over $10 to
   $12**, the **bracket named** before and after, aiming at bracket 3 or higher.
5. **2 credits per run.** Trying another strategy is another run at 2 credits.

## What exists today

The open precon page (`O1` to `O6`, `STATES-precons.md`) lists the 99 by group with ownership dots and a **Start the deck**
button; `S1` is its dialog. The precon's Overview (read, key cards, an alternate plan, a bracket reading) is stored and
free to read. Suggested changes v2 owns the Pick toggle, the two-list Results, the Wait and Short-Run states and the credit
lines.

## Design calls to make

- **Entry.** Where "Upgrade this precon" sits on the open precon page, phone and desktop, and what it shows when the
  precon has fewer than two backed strategies (one strategy: shown as a single card, still a pick; none: empty state).
- **The strategy picker.** 2 to 3 cards: strategy name, one plain-words sentence on what the deck does with it, and its
  own cards that back it (art thumbs plus names, "N of its cards"). Nothing selected until pressed; pressing selects
  (select / unselect, never tick). Whether the Overview's own plan is marked as "the Overview's read" is Design's call.
- **The credit confirm.** Same-inputs-ask-once pattern of v2: the chosen strategy, "2 credits", the 12 to 18 range.
- **Results.** In/out pairs, one reason each; the cost of the buys (per card and total); bracket before and after
  (as v2's bar: "bracket 2 → 3"); owned marks on cards the player holds. Pairs are fixed by the model, so no Pick toggle:
  the player takes the set or starts over. Design may argue otherwise.
- **After results.** The natural end is Start the deck with the swaps applied (`S1`'s dialog, facts updated). Design calls
  the button and the dialog.
- **Another strategy.** How the player runs a second strategy from results, and that it costs 2 credits again.
- **States.** Empty (no backed strategy), loading (the Wait pattern, about 6 s, so a short one), failed (refunded whole,
  with a retry), short (under 12 swaps: counted and honest), signed out and out of credits (shipped lines).

## Must-nots

- No pre-selected strategy; no "recommended" default plan.
- No ownership verdict words (`STATES-precons.md` must-nots hold).
- No model, token or pipeline wording in copy; copy goes through `/copy-review`.
