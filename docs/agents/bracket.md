# Bracket (background)

The full text moved out of `AGENTS.md`, verbatim. `AGENTS.md` keeps each section's rules; this file keeps the history, measurements and derivations behind them.

- `pnpm measure:tutors` prints what `classifyTutor` does to the live catalog — the 22-card
  fixture with a reason per card, the corpus splits, reach against a real combo piece, and the
  first 60 parses for reading. Read-only.

  It exists because a classifier built from a named fixture agrees with that fixture and says
  nothing about the 960 cards nobody listed. Four of its five design decisions contradict what
  the plan assumed, and every one came out of reading the sweep: the hate cards need no
  negation rule (zero of the 960 contain "can't search"); the opponent check is SENTENCE-scoped
  because 65 of the 79 cards mentioning an opponent do so in a different sentence; a graveyard
  destination assembles nothing on its own; and two mana-value phrasings were read inverted
  until they were counted.

  It also splits `alternatives` from `conjunctions` — 81 tutors against 61 on the shipped
  catalog — because collapsing the two is the false positive the classifier was fixed for: a
  tutor for `a legendary creature card` reached any legendary LAND until the and/or structure
  was preserved, and the reach count against one real combo piece fell from 239 to 194.

  Its `unreachable` counter is a structural INVARIANT rather than a live guard, and the
  script says so: `kinds` is either `"any"` or a non-empty list, so an empty one is
  unconstructible and a non-zero figure means `targetWords` started returning an empty array.
  The regression it cannot see is the likelier one — a word DROPPED rather than kept gives
  `words === null` and lands in the `any` bucket, silently widening every such tutor. Watch
  `any` against 129 for that.

- **The bracket system's classifiers are all PARTIAL, and every surface says so.** Mass land
  denial is 22 of 24 on a curated set with both misses named; extra turns have no misses among
  the 56 cards whose text mentions one; combos come from Spellbook's index excluding
  template-gated variants. Those strings live beside the classifiers they describe
  (`oracle-rules.ts`, `combo-features.ts`) and are re-exported by `bracket/rules.ts`, so a
  verdict consumer imports one module while each definition stays where it can be re-measured.

  **The B2/B3 chain-or-loop flag does not exist and is not coming from a reading.** WotC's text
  above bracket 1 is about CHAINING extra turns, which is not a property of a decklist — so the
  count is reported with no verdict attached, and the only thing that violates bracket 3 is a
  measured LOOP: an assembled combo Spellbook records as producing infinite turns. The
  self-recurring single card is NOT detected, and the detection copy says so rather than
  letting the absence read as a clean deck.

- **Bracket reach (2026-10-21).** Help me choose built "HD - Horrors Test" for bracket 3 and the
  analysis read it 1-2. The two already shared every classifier; the defect was that the answer was
  only a ceiling (`bracketGate`, `rank.withinBracket`), so nothing placed a card to reach it, while
  the collection held a free Opposition Agent. Bracket 3 needs a B2 violation B3 allows: 1 to 3 Game
  Changers, or a counted non-loop two-card combo the deck's searchers cannot assemble. `bracketReach`
  proposes raiser sets smallest first and keeps one only when `permitsOf` says the finished list
  permits the target. Mass land denial and turn loops are never raisers (plan review, d9 agreed), and
  lands are excluded because the land sweep's caps could drop them. Hugh's ruling binds the rest:
  owned cards only, and a short collection is reported, never filled by buying, until the player
  chooses on the choice screen.

## From AGENTS.md (moved 2026-10-28)

The rule-form bullets `AGENTS.md` carried for this area until 2026-10-28, verbatim. Where they and the text above differ in wording, both are current.

- `pnpm measure:tutors` prints what `classifyTutor` does to the live catalog (read-only). A classifier built from a fixture agrees with that fixture; watch `any` against 129 for a dropped word, since `unreachable` is only a structural invariant.
- **The bracket system's classifiers are all PARTIAL, and every surface says so.** The partial-detection strings live beside their classifiers (`oracle-rules.ts`, `combo-features.ts`) and are re-exported by `bracket/rules.ts`. There is no B2/B3 chain-or-loop flag: the only thing that violates bracket 3 is a measured LOOP, an assembled combo Spellbook records as producing infinite turns.
- **Help me choose's bracket answer is a TARGET as well as a ceiling** (always on: its own switch, `BRACKET_REACH_ENABLED`, and Help me choose's, `HELP_ME_CHOOSE_ENABLED`, are retired). `bracketReach` (`src/lib/intake/bracket-reach.ts`, pure) finds the smallest set of OWNED, free, nonland cards that brings the deck into the bracket asked for, checked through `permitsOf` (the analysis's arithmetic, in `fill-gate.ts`), and `planFill` places it first (`source: "bracket"`). It places a card to buy only when the player picks *Hit bracket N*, and never a mass land denial card or a turn loop: a collection that cannot reach the answer lands in the highest bracket below it that its own cards reach (a bracket-4 ask over one free Game Changer places it and lands at 3, which is new), and the plan's `bracketReach` comes back `short` for the choice screen (plan `2026-10-21-bracket-reach.md`, PR 3). Proof: `pnpm probe:help-me-choose-fill` section 5.
