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
