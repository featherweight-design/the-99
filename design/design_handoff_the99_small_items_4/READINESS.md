# Readiness: small items 4

**Verdict: Green.** Approved by Hugh on 2026-10-29 ("LGTM"). Item 2 went through R1b after his notes on the Pull UI and the checkbox placement, and then got a spacing fix. Items 1 and 3 take the recommended call. Nothing below blocks the build, and the three items are independent.

## For Hugh

1. **Copy.** These strings are new and need `/copy-review`. All are in item 2:
   - *Also cards in my other decks*
   - *Apply asks whether to pull each one from its deck.*
   - *pulls from {deck}*
   - *Undo*
   - *A card you don't pull stays in its deck too.*
   - *only cards I own, and in my other decks*
2. **About.** Item 2 adds a choice to Suggested changes, which already has an About entry, so that entry gets one line about the new checkbox. Items 1 and 3 change nothing a reader would look up.

## For engineering, by item

1. **Filters on Collection and the cart: the 44px box.**
   - `FiltersTrigger` takes the rack trigger's look, or the two triggers share one component, and its `after:` hit overlay goes.
   - The cart's pinned block keeps its height.
   - Collection's pinned head goes from 108 to 116 (update the arithmetic comment in `filter-bar.tsx` and STATES H1).
   - Collection's Sort drops `compactTriggerHeightPx={36}`.
   - The 900–999 one-row form stays 66.
2. **Suggested changes: cards from my other decks.**
   - **Data:** `limits.otherDecks` is a boolean, stored with the deck's limits and part of the run fingerprint. When it is on:
     - owned candidates include cards with `free ≤ 0` whose copies sit in other decks;
     - `owned` stops requiring `free > 0`;
     - a spare copy goes ahead of a held one when two cards fit as well.
   - **Results:** a card from another deck shows the nameless hard `AvailabilityMarker` ("none free").
   - **Apply's confirmation:** each held card coming in gets Review changes' Pull, with `PullControl`'s look and its source picker (sheet below md, 372px popover from md), held rows at least 52px tall on phone and 44px on desktop.
     - Choosing a deck stages the pull, and the row then reads *pulls from {deck}* with Undo.
     - Pulls run with Apply as the shipped pull does, with the shipped guards for locked and commander rows.
     - Undo all reverses this deck's changes and the pulls.
     - Pulling is optional: a card that isn't pulled stays in both decks.
3. **About phone top dock: the label rides the header.**
   - The top dock's `top` is `calc(var(--header-offset, 0px) + var(--about-back-h, 0px) + 12px)`, on the header's 200 ms in / 160 ms out slide.
   - The top-or-foot choice is still made once, on the tap.
   - The foot dock and desktop are unchanged.

## Files

- Open `Main.dc.html` for the calls, or open a board directly: `Filters`, `Other-Decks`, `Dock-Header`. Each needs `support.js` and `art/` beside it.
- `scratch-gen/` regenerates the boards. It is reference material, never shipped code.
