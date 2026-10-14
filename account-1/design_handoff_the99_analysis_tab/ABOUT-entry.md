# About entries: the Analysis tab launch batch (r2)

Filled §G templates (`design_handoff_the99_about/STATES-about-r3.md`), one slot per line, in
artboard order, as R5's two were. **Not a canvas edit**; fixtures go in `about/fixtures.ts`.
r2 answers `READINESS-r1-audit.md` §6 and finding 18, and nothing else.

**The batch, one bump.** `ABOUT_VERSION` 9 → **10** (`about.ts:34`) covers all three changes below;
both new entries take `since: 10`, `deck-page` keeps `since: 1`. One re-pin of
`about.version.json`'s hash. Entries: 34 → 36.

**Copy.** No em dash in any new line (r1's caption had one; it is gone). Apostrophes are `’`, as in
`about.ts`. Captions and key lines below are **queued for `/copy-review`**, not yet through it.

| # | Entry | Change | Where in `aboutEntries` |
|---|---|---|---|
| 1 | `deck-analysis` | new, covers the whole line | chapter 03, after `deck-page` |
| 2 | `card-marks` | new | chapter 03, after `decklist-marks` |
| 3 | `deck-page` | ordinary edit: "Four tabs" → five, fixture tab row | in place |

---

## 1 · `deck-analysis`

| Slot | Value |
|---|---|
| **id** | `deck-analysis` |
| **Title** | What bracket this deck is, and why |
| **Route** | `/decks` |
| **Opens** | opens a deck |
| **Chapter** | 03 · Building the 99 |
| **Width** | plate |
| **since** | 10 |

Route and opens conform to every deck entry (`about.ts:331-332`). The tab has no address About can
link to (`builder-view.ts:7-12`), so the entry names the tab in its caption instead.

**Caption**

> Press Analyze on a deck’s Analysis tab and we read the whole list against the Commander Format
> Panel’s bracket rules. The answer is the bracket your cards permit, and sometimes two, when
> the difference is how you play; then it is yours to say which. Every count opens to the cards
> behind it, and the lowest rung says what would have to go to come down one. The bracket then
> rides the deck’s header and its tile on your decks page, and the chip in the header opens the
> tab. A committed version that reads differently from the one before it says both, in one
> sentence.

Covers: the verdict, the declaration, the climb, the findings, the upgrade path (r1), **the header
and tile chip**, **the version comparison** (`declarationCopy.versionChange`). Persistence moved
to key 3; the lean is key 4.

**Key lines** (4 of 4)

1. a range is two brackets the cards allow; the chips under it are the only question on the page.
2. the climb states, the findings open: every figure with cards behind it is a button, a zero is not.
3. after an edit the header and the tile keep the last bracket, and the tab says the deck has changed since it was analyzed and offers Re-analyze. It never guesses whether the edit mattered.
4. a single bracket can carry a lean: one sentence naming the two-card infinite that decided it, and why the deck can reach both halves, from its library or its command zone. `see the reasoning` shows where each half is found.

Key 3 is rewritten for Hugh’s 2026-09-23 rulings 3–4 (the chip holds; the banner is the only
place staleness is said). r1’s "Nothing re-reads until you press" is cut: ruling 2 runs an
analysis alongside a commit, so the sentence is no longer true.

**Specimen** (unchanged from r1): `VerdictBlock` and `BracketClimb` side by side at the plate
width, fixture props; the state is canvas §2f (a range, answered). The lean, the chip and the
version sentence are named, not drawn: 2f is a range, and a range never carries a lean
(`slot.ts:180`). A whole-tab figure is what cropped every earlier chapter-03 attempt.

**Fixture props**: `fixtures.deckAnalysis`, unchanged:

```
verdict.permits        [4, 5]
declaration.declared   4          · version 3 · previous null
population             { of: "commander", declaredTotal: 9730, said: 3884 }   → Yuriko
profile.brackets       gameChangers ×5 · tutors ×7 · everything else empty
climb                  below 3 · yours 4 · above 5 (declares)
lean                   null
```

**Phone reduction**: one column: bracket box, climb, findings as rows in one box, mix (the
Overview is absent until sub-project 6, finding 6). The declaration chips become two 44px halves of
one row; the climb keeps the bracket mark on every rung (22 / 26). Must not: drop the population
foot, or draw the findings as five tiles at 390.

**Strings from**: `copy/deck-analysis.ts`, `copy/declaration.ts`, `copy/upgrade-path.ts`, and this
package's `analysis-tab - copy strings.ts`. Nothing retyped.

---

## 2 · `card-marks`

The marks live on two surfaces, and `decklist-marks` is at its four-key cap (`about.ts:371-387`),
so they take their own entry rather than a fifth line there.

| Slot | Value |
|---|---|
| **id** | `card-marks` |
| **Title** | Bracket facts on a card |
| **Route** | `/collection` |
| **Opens** | none: the route lands on the page that draws them |
| **Chapter** | 03 · Building the 99 |
| **Width** | plate |
| **since** | 10 |

Chapter 03, beside `decklist-marks`, because the reader who wants this entry has just met the marks
on a decklist. The route is `/collection` because that is the one surface where every card
carries them without a deck in scope, which is the entry's point.

**Caption**

> Four facts a card carries whatever deck it is in: it is on the Game Changer list, it counts as
> mass land denial, it takes extra turns, or it is a tutor. Each has its own glyph, all four in the
> same ink, and they sit after the card’s name on your collection and on a decklist. The key above
> the cards names them, and a card’s own page spells them out under Bracket facts.

**Key lines** (3 of 4)

1. a tutor is a search that can find something other than a land. A land-only search is ramp, and carries no mark.
2. no mark means nothing to report, not a card we checked and cleared. Only the Game Changer list is complete; the other three are detected, and detection misses some.
3. a mark is about the card and never counts anything. How many a deck holds, and what that does to its bracket, is the Analysis tab’s answer.

**Specimen**: `MarkKey` (the decklist's, all six entries) above two `DecklistRow`s at the plate
width, fixture props. Two rows because the order rule (`CARD_FACTS`) only shows with two marks on
one card. Nothing else drawn: the collection tile and the modal block are named in the caption.

**Fixture props**: `fixtures.cardMarks`:

```
key        MarkKey, facts on              → $ to buy · P proxy · game changer · mass land denial · extra turns · tutor
rows[0]    Demonic Tutor   owned · ×1     facts [gameChanger, tutor]
rows[1]    Time Warp       owned · ×1     facts [extraTurns]
```

**Phone reduction**: the rows are full width and unchanged (§I, "the row already *is* the
reduction"); glyphs stay 14px. The key wraps to a second line between whole entries. Must not:
abbreviate a fact's name, drop a key entry, or add the fact's word to a row.

**Strings from**: `copy/card-mark.ts` (names, and `modalHeading` quoted in the caption) and
`copy/decks-builder.ts` (the row). Nothing retyped.

---

## 3 · `deck-page` (ordinary edit)

Two slots change; the other nine and all three key lines stand.

| Slot | Was | Now |
|---|---|---|
| **Caption**, second sentence | Four tabs sit under the header: the deck, cards worth considering, the games you have played with it, and its committed versions. | Five tabs sit under the header: the deck, what bracket it is and why, cards worth considering, the games you have played with it, and its committed versions. |
| **Fixture** `DECK_TABS` (`about/fixtures.ts:849`) | four tabs | five, Analysis second, no count |

Tab order is `decksBuilderCopy.tabs` (`deck` → `analysis` → `consider`, then Games and Versions);
eng confirms against `builder-tabs.tsx`. Key 2 ("a tab drops its count") already covers an
Analysis tab with no number. Not a material caption change on its own; it rides the batch's bump.

**Phone reduction**: per §I, art, title, status and bar stack; the five tabs scroll as one row. The
header's chips row (status pill, then the bracket chip) sits under the commander line, per
`HANDOFF.md` §1. Must not: drop a tab or its count, or put the bracket chip on the tab row.
