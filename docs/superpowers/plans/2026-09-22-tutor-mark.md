# Implementation plan: the tutor mark on every card surface

**Status: DRAFT.** Decision 1 is RULED (Hugh, 2026-09-22): land-only searches are not tutors. The
plan as a whole still waits on Hugh's approval before any build.

**Glyph:** `TutorGlyph` (`src/components/cards/tutor-glyph.tsx`, #863), lifted from the verdict
canvas §4a. §C2 of `design/design_handoff_the99_push_line/STATES-push-line.md` lists it as the
fifth fact mark ("drawn up"), and says that if it lands late, *"they appear at call sites that
already exist with no other change."* This plan is that change.

**Asked for by Hugh on 2026-09-22:** the glyph goes on every surface that draws a fact mark,
not only the Consider tile.

---

## Decision 1: what counts as a tutor (RULED 2026-09-22: exclude land-only searches)

`classifyTutor` answers a different question from the one a mark asks. Its own header says
*"This exists for ONE question: can a deck assemble a combo it does not already hold in one
piece?"* That makes it a REACH classifier. It returns a target for any card that searches the
library, land searches included, and marks basic-land ramp `basicOnly` so that it reaches
nothing.

The card note (#854, #859, #869) and the verdict's `tutors` finding (#863) both read it as "is
this card a tutor?". Measured on staging on 2026-09-22:

| | Count |
|---|---|
| Commander-legal cards `classifyTutor` returns a target for | **929** |
| ... of which the only thing found is a land (fetch, ramp, land-type search) | **510** |
| ... which find something that is not a land | **419** |

In the staging decks with at least one "tutor", land searches are most of the count. Each pair
below is *counted / land-only*: `10/9`, `10/8`, `9/6`, `8/6`, `7/3`, `4/3`, `5/3`. So today:
- **Evolving Wilds** gets *"A tutor, and your Nth."*, with N counting every ramp spell in the deck.
- **Cultivate** gets the same sentence.
- The verdict's tutors finding reads 10 on a deck holding one real tutor.

A mark on every card surface would put the tutor glyph on every fetchland and ramp spell in a
collection. That is 929 cards against the 216 commander-legal cards that carry any of the three shipped
marks today, more than four times as many.

**Ruled by Hugh on 2026-09-22: a card is a tutor when it can find something other than a land.** The rule is
one predicate beside `classifyTutor`, named for what it means (for example `isTutor`), and read by
all four consumers so they cannot disagree:
- the note
- its ordinal
- the finding
- the new mark

`classifyTutor` stays as it is for REACH. A land search can still reach a land combo piece
(Dark Depths and Thespian's Stage), and reach is the question the profile asks it.

This moves a count on a surface another lane shipped (the verdict's tutors finding), which is why
it went to Hugh rather than being fixed unilaterally. The other options offered were keeping the
current behavior, and excluding basic-land searches only (about 380 cards). Both were declined.

---

## Decision 2: copy (to `/copy-review`, not Design)

Three strings, each shown with a picture of the surface it lands on:

1. **The modal block heading, "In the bracket rules".** Its own comment says it has to be true of
   every fact it heads. A tutor is the one fact no bracket rule counts: the glyph's own header
   says so, and the note says *"No bracket limits how many you play."* So the heading is false
   once a tutor joins it.
2. **The tutor's key entry, modal line and accessible name.** One string used in all three
   places, as `cardMarkCopy` does for the other three.
3. **The tutor's tooltip sentence.**

The ORDER of the marks follows §C2's list (bolt, peak, turn again, lemniscate, drawn up), so the
tutor goes last. That is transcribed, not decided.

---

## Where the fact comes from

**Stored, not classified at every read.** `/collection` is the largest payload in the app and
does not select oracle text. Classifying there would mean shipping the oracle text of every owned
card to a reader to decide one boolean. The card modal and the decklist would each classify
again.

- `card_bracket_flags` gains `tutor boolean not null default false`. It is written by
  `db:seed:combos`'s rule pass (`src/lib/spellbook/seed.ts` §3), beside `isMassLandDenial` and
  `isExtraTurn`, using Decision 1's predicate.
- It gets a source array and a check constraint, like the other two flags, so that a row can
  never say "true, and nobody claims it".
- It gets a **collapse floor**, measured on the first real run, like every other source.
- `loadBracketFlags` returns it; `factsFor` reads it; `CARD_FACTS` gains `"tutor"`.

**The drift this opens, and why it is accepted.** The deck read and the candidate read classify
LIVE. They need the full `TutorTarget` for reach anyway. The marks read the stored flag. After a
deploy that changes the classifier, the two agree only once the next Monday ingest has run.

The alternative is classifying live everywhere, which costs the payload above on every visit. The
mitigation: the ingest imports the same predicate the live readers call, so the two can only
diverge across a classifier change, never at rest.

**Payload, bounded by the data.** 419 cards can carry the mark (or 929 if Decision 1 goes the
other way). The fact costs 8 bytes on a card that already carries one (`"tutor",` inside its array) and
18 on a card that carries none (`"facts":["tutor"],`). A player who owns every tutor pays at
most about 7.5 KB (or 16.7 KB).

---

## PR boundaries

**Re-cut while building PR A, and why.** The draft put the stored flag and the decklist mark in
PR A and every other surface in PR B. That cut does not survive the code: every mark and every
key iterates `CARD_FACTS`, and `factsFor` feeds the decklist, both `/collection` views and the
card modal. So adding `"tutor"` to the vocabulary lights up every surface at once, and a PR
"for the decklist" would silently ship all of them without their probes or their copy. The
cut is by KIND instead:

**PR A: the rule, with no UI.**
- `isTutor` / `isTutorTarget` / `classifySearches` beside `classifyTutor`
- the note's ordinal (`countNoteKinds`), the candidate read, the quick-add search and the
  profile's `comboReach.tutors` (which the tutors finding and `bracketDelta` count) all read it
- land searches still pair for REACH through a separate `landSearchIds`
- This is Decision 1's fix and stands alone: it corrects a count three surfaces already draw.

**PR B: the mark, stored and drawn.**
- migration, schema, the rule-pass writer and its floor, `loadBracketFlags`
- `factsFor`, `CARD_FACTS` and `CardFactMark` drawing `TutorGlyph`
- every key, the card modal block with Decision 2's heading, and the copy through
  `/copy-review`
- `probe:card-note`, the collection mark probe and a contact sheet over every surface

**Close-out.** The About entry goes into the deck-analysis line's single batched About entry and
`ABOUT_VERSION` bump. That is the rule for a multi-round line, and this lands inside one.

---

## Not in this plan

- Any change to what `classifyTutor` REACHES.
- A tutor LIMIT. §5 of the foundation spec locked "no tutor gate", and the note already says so.
