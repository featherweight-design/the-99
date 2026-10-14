# READINESS — Add panel addendum (#183 #177 #179 #185 #184 #176), R3

**Verdict: 🟡 Yellow — one product ruling on #176. Nothing else is open.**

R2 answers the audit. All three items landed: the three strings #184 orphans are now stated as
`REPLACES` entries 7–9, the two copy calls are made, and the undo row's lifetime is defined across a
tab switch. **The build is unblocked on everything except #176**, which is Product's to rule and which
no other section depends on.

### What changed in R2

1. **`strip.hint` is overwritten, not duplicated.** The audit caught a real shipping hazard: the
   addendum declared its own `strip.hint` in a second file while the locked one stayed live, so eng
   could have shipped two contradictory values. It is now stated as one key at a new value, in
   `REPLACES` 7, with an explicit *do not merge and leave both*. Both of the locked clauses were false
   anyway once the cell is the control.
2. **`strip.shelfLink` and `strip.shelfLinkAria` are deleted**, with the reason each is superseded and
   the note that `shelfLinkAria` was the **only consumer of `RECOMMENDED_MIX.land`'s singular label** —
   so that singular becomes dead data and should go with it.
3. **`strip.cellLinkAria` loses its em dash.** In scope for the same rule; an aria-label is copy. Now
   `Ramp, 4 of 10. See ramp cards to consider.` The stray dash in the a11y contract went with it.
4. **`unowned.note` is cut**, per the audit's recommendation rather than its fallback. It restated the
   tag and the shelf heading in a noun the app does not have. **Provenance moved too**, though not
   where R2 first put it — see the R3 note below.
5. **The undo row's lifetime is specified.** It is decklist state, not row state, so it **survives a
   tab switch to Consider and back** and any re-sort; it clears on Undo, on the next removal, or on
   leaving the builder route. **The counts do not wait** — the group count and the 99 count decrement
   immediately, because a spent slot is a receipt and not a pending state. A deck that held its counts
   for the life of the row would be lying about its own size.

The audit's support for **A** on #176 is noted and agreed, for the same reason: dropping the append
removes the only route by which an unowned card reaches Consider, and #42 is what makes a buy list
mean anything.

### What changed in R3 (audit sweep)

6. **`strip.hint` loses its second clause.** `· Why these numbers? explains the targets` put a
   question mark mid-sentence and glossed a trigger sitting inches away in the same strip. The hint
   is now one clause: **`A cell under target opens its shelf below`**. The disclosure explains
   itself.
7. **`provenanceWithUnowned` is not `N to buy`.** The audit caught its own suggestion: the shipped
   phrase means *cards in this deck you don't own* in `builder-spine.tsx:202` and
   `deck-card.tsx:162`, but in Consider it would mean *suggestions you haven't added* — same words,
   different denominator, one tap apart. Now **`59 owned · 5 you don't own`**, which states the axis
   instead of borrowing a phrase that already means something else here.
8. **Four stale sentences swept** — the deleted note and the old provenance quoted back in this
   file's #176 options, `six edits` in the copy file header, and `note line` still listed as a tile
   branch in the README's eng notes.

---

## Blocking — needs a ruling

### 1. #176 — do unowned EDHREC staples keep reaching Consider? — *with Product*
`getDeckSuggestions()` has appended up to five unowned staples since #25. The R2 handoff said
every suggestion is owned; that was wrong, and it was Design's error, not the build's.

- **A — keep them, marked** (drawn, and Design's recommendation). `buy` tag on the tile, a secondary
  Add, and a trailing shelf under the existing `Top picks for {commander}` label. The provenance line
  gains a second clause — `59 owned · 5 you don't own` — used only when the append actually put
  something on the shelves. Rationale: the deck already carries a buy list, #42 ships the import that
  fills it, and #132 is the backlog ticket for exactly this direction.
- **B — drop the append** at `actions.ts:149-163`. The premise becomes true again, the locked
  provenance string is already correct, and none of section 7 ships. One deletion, no design.

**Nothing else in this addendum moves either way.** If B is ruled, sections 1–6 and the copy calls
are unaffected and the verdict flips Green on the spot.

*Needs: Product's ruling. Cheap either way; A is roughly one branch in `suggestion-tile.tsx`, one
filter in `consider-panel.tsx`, one string.*

---

## Non-blocking, but worth a look

- **The undo row's persistence rule** — survives a tab switch, clears on Undo / the next removal /
  leaving the route — is now specified but still a judgement, not a measurement. Deliberately not a
  timer (#185 is *about* things vanishing before they are noticed), but a long-lived spent slot in a
  99-row list has not been tested. Fallback if it reads as clutter: dismiss on the next successful
  *add*.
- **The `Owned only` axis in Consider** was kept out at R1 because the axis had one value. Under
  ruling A it has two. Still the wrong control — five cards in one labelled shelf do not want a
  filter — but the reasoning behind that "no" has changed and should be re-read rather than
  inherited.
- **The reserve is arithmetic, not a token.** Two routes implement it. When a third surface pins a
  CTA low, that is the moment it should become a shared layout component instead of a third
  `calc()`.
- **Rationale copy is quoted, not rewritten.** The disclosure shows all five
  `RECOMMENDED_MIX[role].rationale` strings together for the first time. As a set they may want an
  editing pass; that is a different ticket.
- **#172 stays open.** A failed `searchCards` still has no drawn state. It will have to obey
  decision 1 when it is drawn — a failure line inside the quick-add bar is inside the dock — but it
  is not in this addendum.
- **`/decks/new` desktop is asserted, not redrawn.** No tab bar, no occlusion, Selected sidebar
  keeps the button. Not re-audited in this pass.

## What R2 is confident about

- **#183 and #177 are one rule, and the rule is testable.** Three layers, one dock per route, and a
  reserve of `dock + 80px + 12px`. Both tickets fail it today; both pass it after one padding
  change and one promotion. Every future surface that pins a CTA low now has something to fail
  against instead of a new ticket.
- **Nothing is invented that the app did not already have.** The remove ✕ exists and was hidden.
  The undo row is the "tile stays put, marked ✓ In deck" precedent from #158 decision 8, applied to
  a row. The `buy` tag is the decklist row's, same hex and same word. The unowned shelf uses the
  shipped `edhrec` label. **No toast pattern is introduced after all** — that was the likely answer
  going in, and the bottom-of-viewport rule is what ruled it out.
- **#184 removes controls rather than resizing them.** Ten targets become six, and 44px arrives as
  a consequence rather than as padding bolted onto a text link.
- **Every value is a `var(--*)` that already exists. No new token, no new dependency, no new
  motion** — nothing joins the `prefers-reduced-motion` block, because the undo row appears in place
  as the row that was already there.
- **The two unlabelled figures got a label, not a reword**, as asked: `edhrec` in front of the
  inclusion bar, and `+31 pts vs. all decks` naming the baseline that lived in `inclusionAria`
  only.
- **The copy now speaks the app's own vocabulary.** `N owned · N to buy` exists in two shipped
  components; the addendum uses it rather than a third phrasing for the same fact, and one whole
  line came out of the tile because the tag already said it.
- **Voice:** nothing new here is a win, so nothing new here is expressive. Straight utility copy
  throughout; the two locked lines in the empty caption are verbatim and only the joint between
  clauses moved.

## What would make this green

Item 1 ruled. Either answer is one PR, and there is no redraw waiting behind either. Items 1 and 2
of the audit are text-only and already in; the build can start on #183, #177, #179, #185 and #184
today.
