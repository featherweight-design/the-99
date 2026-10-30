# READINESS — help me choose (R1 · approved 2026-09-24)

## Readings Design took (Hugh may overrule)

1. **An empty read is refunded.** A read that returns no valid chips gave the player nothing, so it is treated like
   tuning's `ungrounded` failure: the credit comes back. If Hugh rules it spent, only 3f's line changes, to *That
   read used a credit.*
2. **The control beats the words.** In the form they're independent. At submit, a budget or bracket from the
   words that disagrees with its control goes under Not used.
3. **Stop words aren't listed as not used.** *Built around*, *with*, *I want* and *something* don't raise the offer.
   Eng owns the list. Without it, the Not used line would be noise.
4. **Too narrow means fewer than 3.** It's a threshold for eng to tune. The drawing doesn't depend on the number.
5. **Answers aren't stored on the deck.** They show once, on arrival.

6. **The re-read is offered whenever the submit had words,** not only when words went unused. A literal match can
   still miss the intent. It's offered once per set of words.
7. **"Read it properly" is now "Look deeper"** (Hugh, R1.2 review): framed as more depth, never a fix. The UI never says AI or model.
8. **Best fits need ≥ 4 results.** With 3 or fewer, every result is already "the top", and a too-narrow bar shows instead.
9. **The seeded intent line carries the answers.** `seededBrief` gains an answers variant. It is stored, as every seeded line is, and it's editable. This replaces R1's "answers aren't stored" reading (5): the intent line already exists, so no new store is added.

## Copy that needs widening (owed to /copy-review)

- `creditsCopy.spent`'s tail names *overview and suggestions*. With a third feature it needs *deeper looks*. Drawn:
  *Deeper looks, overviews and suggestions share these credits.*
- `PAUSED_REASON` names *suggestions and overviews*. The drawn line shortens it to *The app has reached its
  monthly limit.* It's one constant; widening it is /copy-review's call.
- The feature noun, *deeper look*, is Design's (R1.2).

## Depends on (brief §6, §7)

- The theme-fit, card-fit and no-theme reads. The card-first index.
- `PlanFillArgs` gaining a budget and a bracket. `createDeck` placing the build-around card.
- The per-row trial fill, run only for rows on screen, returning `owned`, `buyTotal`, `cardUnpriced`.
- The too-narrow counter: pass/fail filters re-run with each answer dropped. It names one answer and two counts.
- A new metered feature entry for the deeper look (eng's naming), plus `FEATURE_CALLS` and the check-constraint migration.
- **New, not in the brief:** `fillDeck` accepting the answers, so the shipped FillFailedBanner's retry keeps the
  budget, bracket and card.
- **New, not in the brief:** `seededBrief`'s answers variant. No arrival flag and no new strip.

## Not verified this round

- The phone deck page's draft actions: the reference shows *Update from a list* and *Export*. Whether *Commit as v1*
  joins them on a phone wasn't checked.
- The frames draw the content area only, without the app rail.

- `addPanelCopy.createPicker.sub` wasn't quoted. The desktop sub drawn on 1a is a placeholder.
- The Discover rack is drawn from the commanders-discover handoff's structure in current tokens, not from
  `discovery-view.tsx`'s markup. Only the result line's new link is specified. Everything else on the rack is
  as it ships.
- Fit and ownership figures in the frames are illustrative, not measured.
