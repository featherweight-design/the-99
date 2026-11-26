# Readiness Review — Games tabs redesign

**Verdict:** 🟢 Green (Design-side note; a cold audit may replace it)
**Reviewed:** 2026-11-25
**Related ticket(s):** none (Hugh's ask; approved 2026-11-25 after R6)
**Plan PR target:** TBD

## Summary
Every surface named in the ask is drawn at phone and desktop: Decks › Games, Deck details › Games, filters, Matchups
(all three splits, fuller and small), How it's playing (3, 14 and 24 games), and unlogged seats. The design reuses
shipped parts: SectionPanel, HomeSectionHead type, SegmentedSwitch, the anchored panel and Sheet, and IdentityMark. It
adds no new tokens.

## Notes for the plan
- 🟡 **Matchups tally rule change.** L goes only to the winner, and other opponents in a game you lost get "–". This is
  a behaviour change in `game-matchups.tsx` and needs its tests updated.
- 🟡 **How it's playing needs per-game sequences.** It needs the last 10 marks for each axis, which can be derived
  from `DeckGame` marks.
- ✅ **No migration.** Seat-not-logged counts come from the pod size already stored on each game.
- ✅ **Native selects.** The design replaces them with the anchored panel / Sheet (desktop / phone) and SegmentedSwitch.
- 🟡 **Copy.** All new strings are DRAFT for `/copy-review`.
