# Find a deck read: model eval

Eval for lock 9 of the brief (`docs/superpowers/design-briefs/2026-10-11-find-a-deck-read.md`). It compares
Sonnet 5.5 and Haiku 5.5, both at effort medium, on Hugh's eleven eval cards against his staging decks. Read-only.
The harness is `scripts/eval/fits-read.mts` (`pnpm eval:fits-read`), with its own ledger
(`ledger-find-a-deck.jsonl`) and a $2 cap.

**Status: skeleton.** The dry run's figures are below. Every other section is filled in after the paid run.

## Method

- **Engine.** `src/lib/swaps/fits-read.ts` (pure: candidates, prompt, schema, validator) and
  `src/lib/swaps/fits-read-load.ts` (inputs). The candidates are `loadFits`' open set, refused for a card that is not
  commander-legal. Each candidate keeps its `need` from `shapeFits`.
- **Plan text.** Each deck's plan is the newest passing Overview of any contract (`readShownSynopsis`): its prose
  and `primer.strategy`, with the marks drawn as names. A deck with no Overview gets its commander and its leading
  themes instead, counted over its own cards' labels. `deck_profiles.profile.themes` is always null, so it can't
  be the source.
- **Prompt.** Decks are keyed `D1…` and cards `C1…`, one key per card across every block. No deck name is sent.
  Each list card carries its label kinds. The two layouts:
  - `per-press`: the system prompt holds the rules; the user message holds the card, each candidate's need and
    inclusion line, and the candidates' blocks.
  - `cached-decks`: the system prompt holds the rules plus every deck's block, byte-stable and cached; the user
    message holds the card and the candidate keys with their lines.
- **Arms.**
  - `haiku`: claude-haiku-5-5, effort medium, per-press.
  - `sonnet`: claude-sonnet-5-5, effort medium, per-press.
  - `sonnet-warm`: claude-sonnet-5-5, effort medium, cached-decks. It runs Ajani Unrelenting, Mind's Eye and Tangle
    Wire back to back, so the second and third read the cache the first wrote.

  Every arm caps output at 8,000 tokens and takes one sample per card.
- **Validator** (`validFitsRead`). Each failure drops that deck and is counted by reason:
  - `unknownDeck`, `notCandidate`, `duplicateDeck`;
  - `cardOutsideDeck`, for a card named by key or outright;
  - `cutCommander`, `cutSelf`, `cutKeyCard`, `cutLocked`, `cutNotInDeck`;
  - `falseQuote`;
  - `noCitation`;
  - `figureOrScore`, `tooLong`, `malformed`;
  - `jobMismatch`;
  - `tooMany`.
- **Scoring** (blind, per deck, lock 9). Each kept pick is scored on five questions:
  1. Does it name a real interaction with the deck's own cards or plan?
  2. Is every citation valid?
  3. Does it leave out the decks where the card doesn't fit?
  4. Is the cut defensible?
  5. Does it say something the free row doesn't?

## Coverage

The newest passing Overview per deck, re-measured at the start of each run.

| Run | v2 (contracts 11, 12) | Older | None |
| --- | --- | --- | --- |
| Brief, 2026-10-11 | 4 | 8 | 9 |
| Dry run, 2026-10-11 | 20 | 1 | 0 |
| Paid run | | | |

## Candidates and input size (dry run)

Input tokens were counted on the free count-tokens endpoint, structured-output schema included.

| Card | Candidates | Plan sources (v2/older/none) | Per-press tokens | Cached-decks tokens |
| --- | --- | --- | --- | --- |
| Ajani Unrelenting | 11 | 10/1/0 | 35,220 | 63,080 |
| Maddening Cacophony | 10 | 9/1/0 | 31,125 | |
| Maddening Hex | 11 | 10/1/0 | 35,095 | |
| Mind's Eye | 21 | 20/1/0 | 63,285 | 63,369 |
| Molten Collapse | 1 | 1/0/0 | 4,574 | |
| Throes of Chaos | 10 | 9/1/0 | 32,095 | |
| Time Stretch | 10 | 9/1/0 | 31,088 | |
| Tangle Wire | 21 | 20/1/0 | 63,261 | 63,340 |
| Kwia Vigorbloom | 4 | 3/1/0 | 14,352 | |
| Future Sight | 10 | 9/1/0 | 31,107 | |
| Barrowgoyf | 6 | 6/0/0 | 19,104 | |

## Per card, side by side

To be filled in after the paid run. Each card gets the free list's first rows, then each arm's kept decks with the
sentence, the cut and the drops.

| Card | Free list (first three) | Haiku | Sonnet | Sonnet warm |
| --- | --- | --- | --- | --- |
| | | | | |

## Cost per press

To be filled in after the paid run.

| Arm | Cold (mean, max) | Warm (mean, max) | Cache read / write tokens |
| --- | --- | --- | --- |
| haiku | | n/a | |
| sonnet | | n/a | |
| sonnet-warm | first press | second and third | |

## Latency

To be filled in after the paid run.

| Arm | Median | Max |
| --- | --- | --- |
| haiku | | |
| sonnet | | |
| sonnet-warm | | |

## Validator drops

To be filled in after the paid run: counts by reason, per arm.

## Stale Overviews

The count of kept picks whose deck's Overview names a card the deck no longer runs, from each call's
`staleOverviewPicks`.

| Arm | Stale picks | Of kept |
| --- | --- | --- |
| | | |

## Recommendation

<!-- Left blank until the paid run is scored. -->
