# About entry — the Analysis tab

Filled §G template (`design_handoff_the99_about/STATES-about-r3.md`), one slot per line, in
artboard order — as R5's two were. **Not a canvas edit**; the fixture goes in `about/fixtures.ts`.
Batched at launch: `since` is the ABOUT_VERSION the launch batch takes, one bump for the batch.

| Slot | Value |
|---|---|
| **id** | `deck-analysis` |
| **Title** | What bracket this deck is, and why |
| **Route** | `/decks/[id]` (Analysis tab) |
| **Opens** | opens the deck on its Analysis tab |
| **Chapter** | 03 — Building the 99 |
| **Width** | plate |
| **since** | launch batch |

**Caption**

> Press Analyze and we read the whole list against the Commander Format Panel's bracket rules. The
> answer is the bracket your cards permit — sometimes two, when the difference is how you play, and
> then it is yours to say which. Every count opens to the cards behind it, and the lowest rung says
> what would have to go to come down one. The reading is kept with the deck; edit the list and the
> tab says so and offers Re-analyze. Nothing re-reads until you press.

(About-page copy is prose, not a shipping string, so the house em dash is the About module's own
convention; swap for a colon if `/copy-review` applies the repo rule here too.)

**Specimen** — `VerdictBlock` and `BracketClimb` side by side at the plate width, fixture props;
the state is canvas §2f (a range, answered). The findings and the three sheets are named in key
lines, not drawn: a whole-tab figure is what cropped every earlier chapter-03 attempt.

**Fixture props** — `fixtures.deckAnalysis`:

```
verdict.permits        [4, 5]
declaration.declared   4          · version 3 · previous null
population             { of: "commander", declaredTotal: 9730, said: 3884 }   → Yuriko
profile.brackets       gameChangers ×5 · tutors ×7 · everything else empty
climb                  below 3 · yours 4 · above 5 (declares)
lean                   null
```

**Key lines** (3 of 4)

1. a range is two brackets the cards allow; the chips under it are the only question on the page.
2. the climb states, the findings open: every figure with cards behind it is a button, a zero is not.
3. after an edit the tab says the bracket might not be accurate and offers Re-analyze; it never guesses whether the edit mattered.

**Phone reduction** — one column: summary, bracket, climb, findings as rows in one box, mix. The
chips become two 44px halves of one row; the climb keeps the bracket mark on every rung (22 / 26).

**Strings from** — `copy/deck-analysis.ts`, `copy/declaration.ts`, `copy/upgrade-path.ts`, and
this package's `analysis-tab - copy strings.ts`. Nothing retyped.
