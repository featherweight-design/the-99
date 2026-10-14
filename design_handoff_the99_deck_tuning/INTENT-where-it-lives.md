# Deck intent — where it lives (§10, the open call)

The brief left this to Design. The answer is two sentences long and the rest of this file is why.

> **Intent prints under the deck name, on every tab, once it exists. The ask for it lives inside
> the tuning panel, next to the payoff. There is no empty state in the header.**

---

## Why under the deck name

**Intent is a property of the deck, not a setting of the tuning feature.** It answers "what is this
pile trying to do". That is true while you are looking at the Decklist, true while you are looking
at Consider, and true on the deck list page. A fact about a deck that only exists inside one tab
reads as a preference for a feature, and the next person to add a feature will reasonably want
their own.

It is drawn in **`--fg-body` at 14px, under the Cinzel deck name, with the shipped dashed-underline
edit affordance** — the same one `played tonight` uses in the log form. Body ink, not a heading: it
describes the deck, it does not name it.

## Why the empty state is *not* under the deck name

An editable line in the header costs **every deck** a grey *describe this deck* row, forever, to
serve one panel. A header full of unanswered invitations is how a product tells you it has run out
of things to say — and the player who has never opened the Games tab has no idea what the line is
for, so it is a chore with no visible payoff.

**Absent means absent.** No line, no dashed placeholder, no `+ add a description`, no grey italic
prompt. A deck with no stated intent looks like a deck.

## Why the ask lives in the panel

Because that is the one place where the value of answering is visible in the same glance as the
question. The ask names **the actual gap it would close**:

> **What is this deck for?**
> One line, and the suggestions get sharper. Without it we can only read the games — nine of them
> say cards in hand is the problem, and we would guess at whether you want to fix that by drawing
> more or by winning sooner.
>
> `e.g. grind a four-person table out and win late with Gisa`
>
> **Save this** · *or skip it — the suggestions still run*

Two entry points (the panel ask, the header's edit affordance), **one field, one string, one
column**.

**It is skippable and it says so.** An intent gate on a feature the player already waited for is a
paywall made of typing.

## The four states

| # | State | Header | Panel |
|---|---|---|---|
| 1 | **Empty** | nothing | the ask, above the button |
| 2 | **The ask, open** | nothing | 46px dashed field + `Save this` + skip note |
| 3 | **Set** | the sentence, dashed underline, mono `edit` | no ask; intent appears as a citation chip on any suggestion that used it |
| 4 | **App-seeded** | provenance disc + the sentence + `from the build` chip + `edit` | same as 3 |

## The seeded case, and why it is different

When The 99 built the deck, it genuinely knows the brief it built to. So it prints it — and it
**says who wrote it**: the shipped 18px provenance disc, the sentence, and a brass
`from the build` chip.

**The chip is removed permanently the first time the player edits the line.** It is a statement
about authorship, and once they rewrite the sentence, the answer is them. It does not come back on
a later re-import, and there is no second chip for "edited".

This is the whole difference between a **seed** and a **guess**, and it is why seeding from the
decklist is refused below: attribution.

## Rejected

- **An editable line in the header at all times.** Covered above: every deck pays, one panel
  benefits.
- **Intent as a prerequisite for generation.** The suggestions run without one. The panel may say
  they would be sharper with it — **once, in the ask, never as a banner over the results.** A
  feature that withholds until you fill in a field is a form, not a suggestion.
- **A picker: casual / focused / cEDH.** Every one of those labels is a thing the player has to
  translate into their own table, and they will translate it differently from us. It is also the
  precise point at which a product starts telling people what kind of player they are.
- **An archetype select** (aggro / control / midrange / combo). Same problem, plus it is a
  classification the decklist can already imply, so it adds a field and no information.
- **Structured intent** — a power-level slider, a target turn, a pod-size preference. Each is a
  number the model would over-trust. Eleven honest words beat a bucket, and the note field already
  proved a player will type a sentence if the box is one line.
- **Seeding intent from the decklist.** The app can describe a pile; it cannot know what you
  wanted. A guess printed under the deck name as if the player wrote it is a lie with an edit
  button — and unlike the seeded case, there is no honest label for it, because "we inferred this"
  is not an authorship anyone asked for.
- **A textarea, or markdown, or multiple lines.** Cap 120, one line, plain text. Long enough for a
  sentence; short enough that it can never become a second heading under the first one.
- **Intent history / versioning.** Flagged as gap 6 in the README instead: a deck retuned toward a
  different table gets a rewritten sentence and no history, so the suggestions cannot know the last
  four games were played under the old brief. Real, and not worth a second surface at this scale.

## How the panel uses it

- **Quoted verbatim to the model**, exactly like the note. Never summarised, never expanded, never
  turned into tags.
- **Cited by name when it moved a suggestion** — an `intent` chip on that card carrying the clause
  it leaned on (`win late, four-person table`). If intent changed nothing, no chip: a citation that
  appears on every card cites nothing.
- **Listed in the manifest** only when it exists. With no intent the manifest is four rows and the
  fourth reads the collection; the ask sits above the button instead. **The manifest never shows a
  row for something it did not read.**
- **A change to intent is one of the three lines in the nothing-has-changed state** — `this deck is
  for · unchanged since you wrote it` — because editing it is one of exactly two things a player
  can do to make a re-run worth pressing.
