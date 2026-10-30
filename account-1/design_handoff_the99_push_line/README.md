# The 99 — The card note and the verdict (design handoff · R1, Round 4 of 5)

> **Start with `HANDOFF.md`.** This file is the long-form argument.

**§4.1's premise is withdrawn.** The brief says the push line "fires at the moment of an add";
Hugh ruled on 2026-09-21 that a deck's standing is determined **only when the player asks for it
or commits a version**. A player edits several cards before wanting a verdict, and that is the
normal case. **§5 stands unchanged.**

**The round is now two features**, not one:

| | The card note | The verdict |
|---|---|---|
| **Claims** | what this card is, and what the rules say about that kind | what this deck's cards permit |
| **Costs** | a list lookup, an oracle-text read, a count over the current list | a pass over all 99 |
| **Fires** | on every add surface, always | on **analyse** or on **commit**, nowhere else |
| **Register** | **likely, never determined** | determined, dated, and able to go stale |

**File:** `The 99 - The Card Note and the Verdict.dc.html` — canvas (pan/zoom), sections 1a–1g.
`The 99 - The Push Line (superseded premise).dc.html` is the R2 work against the withdrawn
premise, kept for the `bracketDelta` copy it corrected (see §7).

---

## 1 · What the split costs and buys

The push line worked because a verdict was a free by-product of every keystroke. **Once standing
is determined only on request, a per-add sentence about the deck is one the app is not entitled to
write** — it would either recompute the thing the ruling says we do not recompute, or quote a
reading from four edits ago as though it were current.

Taking the R2 sentence apart:

> That would be your 4th game changer, and Upgraded allows 3. ~~It moves what your cards permit
> from Upgraded to Optimized or cEDH.~~

**The first clause survives intact.** *This card is a Game Changer* is a list lookup, *Upgraded
allows three* is quoted rules text, and the ordinal is a count over the list the player is looking
at — a count is not a verdict. **The struck clause is the entire cost of the ruling.**

**And the split is a gain.** The old sentence spoke only when `bracketDelta` found a transition,
which is rare. **The note speaks whenever the card carries a fact**, which is far more often, and
it survives the thing that killed the push line: *it is still true four edits later.*

## 2 · The note's register — likely, never determined

**Hedging everything equally is the failure mode.** Of the three detections, one is a list lookup
and two are readings of oracle text. A note that says *we think this might be a Game Changer*
about a card on WotC's published list teaches the player that our hedges are decoration — at which
point the hedge on the two that need it stops working.

**So the uncertainty is spent where it is real, and stated as authorship rather than as doubt.**

| Register | Used for | Form |
|---|---|---|
| **1 — flat** | Game Changers (list membership) | *A game changer, and your 4th. Upgraded allows 3.* |
| **2 — attributed** | mass land denial, extra turns (read off oracle text) | *We read this as mass land denial, which no bracket with limits allows. If that's wrong for how you play it, the reading is ours, not the rules'.* |

**The hedge attaches to the detection and nothing else.** *No bracket with limits allows it* stays
flat, because that clause is rules text and is not in doubt. **The closing clause tells the player
which half to argue with** — the only place the app admits a reading can be wrong without
pretending the rules might be.

Rejected: *this may push your bracket* (the removed claim in softer clothes), a confidence
percentage (invented precision over a boolean), *possibly mass land denial* (doubt with no author
and no remedy), and any `--warning`/`--danger` treatment (the loudest signal on the least certain
claim). **The note is `--fact` ink and body text, always.**

### Which bracket the note cites

**Declared, where there is a declaration.** Round 3 already has the player stating what they are
building. **A declaration cannot go stale from an edit** — it is an intention, not a measurement —
so the note can cite it on every add without recomputing anything, and *your bracket* means the
bracket the player said they were playing. It is also the only reading under which the note is
advice rather than trivia.

**Undeclared: no deck clause at all.** The note prints the card fact and the rules fact and stops.
**It does not fall back to the last determined verdict** — that reading may be four edits old, and
a note silently quoting a stale verdict is worse than the per-add verdict the ruling just removed,
because nothing on the row says how old it is.

**Declared but never analysed is fine, and is the case that justifies the split**: a player who
declared Upgraded and has never opened the Analysis tab is still told, on the row, that this is
their fourth Game Changer.

**For eng:** the note needs the declaration and the card facts. **It does not need
`buildDeckProfile` or `bracketDelta` at all.** Its only deck-derived figure is a count of a kind
in the current list. That is what makes it cheap enough to draw on every row of a 480-card pool.

## 3 · Both add surfaces, both widths

Same slot the push line had, with a lower bar to fill it: below the row's own line, inside its
box, above a `1px --border` rule, label mono 9px `--fg-muted`. **The row never reserves the
height** — a card with no fact draws no note.

- **Quick add / top-off row:** the sentence. At 390 the row becomes the shipped 52px meta variant
  and the note indents to the name column.
- **Consider tile:** **two short sentences now fit where one long one didn't** — a direct dividend
  of the split. Register 2 truncates to *we read this as mass land denial*; the rest opens with the
  card.

## 4 · The analyze trigger

Nothing today says *what's the state of my changes?* The temptation is to answer it everywhere,
and **every one of those re-imports the thing the ruling removed**: a per-edit reminder that the
deck has an unexamined standing is a per-edit verdict with the number left out.

**The control is the verdict block's own, on the Analysis tab** — one control, three weights, one
position:

| State | Weight | Copy |
|---|---|---|
| Never analysed | **filled `--accent`** | *Analyse this deck* + *about two seconds* |
| Determined and current | outlined, secondary | *Analyse again* |
| Determined and stale | **filled `--accent`** | *Analyse again* |

**It never moves position between states.** Filled when pressing it is the point of the tab;
outlined when the answer is the subject and the button is maintenance.

**The dot on the Analysis tab label is the entire cross-page signal.** Present when edits exist
since the last determination, or when none exists. **It carries no number** — a count invites the
reader to decide whether four edits is enough to bother with, a judgement the app cannot help with.
**It is not a warning** (`--accent`, 6px, the app's existing unseen-content dot): unexamined is not
wrong, and most edits move nothing. **It clears on determination, not on visit.**

Rejected: a button on the decklist (the ruling with an extra click), a prompt after N edits (the
app picking the moment the player is supposed to care), a toast on commit (a checkpoint made to
feel like an alarm), and **auto-analyse on tab open** — defensible, but it makes the tab a page
that computes when looked at, and the stale state then never exists. Recorded in READINESS.

## 5 · Asked and committed — one verdict, two provenances

**The verdict reads the same, and it has to.** Two phrasings for one computation would imply the
app knows something different about a committed deck than about the same 99 cards a second
earlier. The function is the same function.

**What legitimately differs is what the answer is about.**

| | Provenance | Staleness |
|---|---|---|
| **Asked** | *determined against all 99 · 2 minutes ago* | goes stale on the next edit |
| **Committed** | *determined for v4 · all 99 · 21 Sept* | **never** — a version cannot change |

Relative time is right for something about to be superseded; a version's verdict is a record, so
it takes the version's name and an absolute date. **Commit is a natural determination point**
because the app is already snapshotting the list, and a verdict is the cheapest thing it can
attach.

## 6 · The stale verdict — the form transfers, the reasoning does not

**Yes, the verdict follows Round 0** — demoted, tagged `out of date`, dated with its own
denominator. But Round 0 could afford that because *the verdict beside the stale sentence was
explicitly marked current*. **Under this ruling nothing recounts, so that sentence cannot be
written: the block that was the anchor is now the thing adrift.**

The argument still lands — a reading computed over 95 of 99 cards is overwhelmingly likely to be
the right one — but it is carried by the tag and the denominator alone. **Three forced changes:**

1. **Past tense.** *Your cards permitted Upgraded.* The cheapest honest signal, and it works before
   the tag is read.
2. **The mark dims with the sentence** (`0.55`). Round 0 kept its verdict bright and demoted only
   the prose; here the figure *is* the stale thing.
3. **The control takes the slot where *recounted just now* used to sit**, back at filled accent.

**The four changed cards are listed**, so the reader can judge the old answer rather than trust a
tag, and *two of the four carry facts the brackets count* — a **card** claim, so it is allowed
here, and it is the most useful line on the block.

**What stays true while the verdict is stale: every card note.** They were never derived from the
verdict. **Under the old design a deck between analyses had no true statements on any surface.**
The mix strip and counts are unaffected and untagged — Round 0's rule that a stale sentence never
takes the figures down with it survives for everything still *counted* rather than *determined*.

Rejected: hiding the stale verdict; guessing whether the four edits mattered (a verdict computed on
the sly to decide whether to admit the verdict is old); grey-out — **stale is not disabled.**

## 7 · §4.2–§4.5, and what transfers from the withdrawn work

**§4.2–§4.4 are unaffected** and their R2 answers stand: the upgrade path reads rather than acts,
`blocked` is stated plainly with the nearest reachable target named, and the two-clause count
sentence leads with the count. All three live on the Analysis tab, which is where a determined
verdict lives.

**§4.5, re-read as a question about the card note: it does not persist, and does not need to.**
The note was about a candidate and there is no candidate any more. Round 1's mark is on the
decklist row, the card is counted in the mix, and the deck consequence is the verdict's job.
**Nothing is lost, because nothing about an add was ever a verdict.**

**`bracketDelta`'s five sentences are now the verdict's vocabulary, not the row's.** The
corrections made in the superseded canvas — the binding bracket, the two `ruleless` and
`unquantified` forms, the three `inert` clauses, the precedence flip — remain the right copy
wherever a determined verdict explains itself, which is why that file is kept beside this one.

## Files
- `The 99 - The Card Note and the Verdict.dc.html` — the canvas, 1a–1g.
- `HANDOFF.md` — settled decisions and build guardrails. Start here.
- `READINESS.md` — self-assessment, what was called, the engineering list.
- `STATES-card-note.md` — note states, verdict states, the trigger matrix.
- `card-note - copy strings.ts` — every string, with reasoning inline.
- `The 99 - The Push Line (superseded premise).dc.html` + `push-line - copy strings.ts` — the
  withdrawn-premise work, kept for the `bracketDelta` copy it corrected.
- `brand/` — brand sheet, for self-containment. Not a colour source; tokens are.
