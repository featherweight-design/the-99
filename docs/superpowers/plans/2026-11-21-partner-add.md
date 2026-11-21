# Add a partner to an existing deck (#491): plan and PR split

Handoff: `design/design_handoff_the99_partner_add` (README, `READINESS.md`, `READINESS_cold-audit.md`). Removing a partner is #492, out of scope.

## Rulings

- Ships unflagged (`CHANGE_COMMANDER_ENABLED` was retired in #2502).
- Backgrounds (G1) are their own later PR (6). `isCommanderCandidate` rejects them, `canPair` has nine callers including the EDHREC pair sweep, and no support row exists without widening the sweep.
- A pair with no support row never claims "decks we read" in its copy.
- Undo follows the shipped toasts (`token-refusal-toast`, `quick-add-failed-toast`) for lifetime and refusal, and stays isolated so a lasting undo can replace it later.
- A deck over 100 is not offered the add (G6): the loader returns no section.
- A write-path PR is risky: `/code-review medium`, the risk checklist, `## Copilot off`.

## Decisions

1. **Candidate source** for a single-commander deck: pairs in `commander_pair_support` containing the commander (existing floor), plus a catalog scan by `canPair` over commander-legal cards (Partner, Partner with, restricted Partner, Friends forever, Doctor's companion), plus the shipped `growingPairs` from the 99. The figure is the pair's own list, else the single-list fallback (`growingHits`). A pair without a pair row shows its figure but never says "the pair's decks". Pairs below the floor are listed last, never hidden. To buy shows the first 5.
2. **Shared rule**: `tradeShape` gains `pairAdd` (the old single stays, the partner is outside the 99). The loader and the write both read it through `offerable`.
3. **Write**: `changeCommander(deckId, to, stays, cutOracleId)`. In the transaction, after the deck and `deck_cards` row locks: a body of 99 needs exactly one cut, a body at 98 or under takes none, a body over 99 is refused; the cut must be in the body, not a commander half, and not locked (`liveLockedIds`). Identity may only widen (shipped).
4. **Undo** (PR 4): a separate write, validated against the live columns: the live pair equals the pair the toast wrote, the cut card is not back in the 99, and the deck ends at 100 or under. Refused like `quick-add-failed-toast`. Lifetime is the shipped toast's; Undo is lost on reload or navigation, and any other draft edit dismisses it. On a brew (no version) the toast is the only way back.
5. **Cut suggestions** (PR 2, no model spend): a basic land while the deck's lands exceed `landTarget(true, skeleton)` (`src/lib/decks/deck-size.ts`, `FLAT_LAND` 37 less one for a pair; the app's one land rule, no new constant), then the two cards the pair's decks run least (`growingHits` read). Locked cards are never suggested and "Cut another card" never lists them. The basic named is the most-run basic.
6. **Pick line**: synthesize a cut `LineItem` (`bracketAfter: null`, `evidence: []`, `permits: []`, `aim: null`) for `SuggestedChangesPickLine`.
7. `openSheet(from, section)` gains a section argument; the card-details door registers like `registerReceiptLink`; stacking follows `useSheetHost`.

## PR split (no stacking, each off fresh `main`, each under ~20 files and ~800 lines)

| PR | Scope | Review |
|---|---|---|
| 1 | `pairAdd` in `tradeShape`, `cutAllowed` and the cut in `writeCommanderChange`, `changeCommander` takes `cutOracleId`, tests. No caller. | Risky |
| 2 | `loadChangeCandidates`: outside-partner source, figures, cut suggestions, opened-colors list, in-deck partner partition, G6. Reads only. No caller. | Claude review |
| 4 | Dormant Undo: the undo write, its action, the toast component. No caller. | Risky |
| 3 | The Add a partner section, Replace heading, confirm (Pick line, wider colors, room, brew), the toast wired, copy through `/copy-review`. First visible PR. | Claude review, full UI bar |
| 5 | The Second commander door on card details, `openSheet` section argument. | Claude review, full UI bar |
| 6 | Backgrounds (G1), scheduled separately. | Risky |

Order 1, 2, 4, 3, 5: the app ships unflagged and production builds on every main push, so PR 3 must not put partner-adds live before Undo exists.
