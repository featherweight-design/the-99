# R3 rulings — the calls left open by PRs #437 and #438

`design/design_handoff_the99_refresh/` · R3 + R3.1 · 2026-09-08

§1–§3 are the original R3 rulings. **§4 and §5 are R3.1**, answering the two items R3 could not
settle: the suggestion tile's second add branch, and a contradiction R3 introduced between its own
two phone geometries.

Ratification only. No surface is redrawn, no closed decision is reopened, and nothing here needs a
new frame. Each item states the rule it follows from, the verdict, and the smallest change that
satisfies it.

---

## 1 · Accent as an action fill — four sites

Rule 2 stands as written: **accent is not available for actions, because accent means
*in use / to buy*.** A player who has learned that gold means *this card is committed elsewhere*
cannot also read gold as *press me*. Three of the four sites are inside that rule. One is outside
it, and that exception is now written down so it does not get "fixed" later.

### `game-log-form.tsx:233` and `:387` — two submits, one screen

**The submit that ends the task is the filled bone primary. The other becomes a 32px hairline
pill.** Both lose accent.

The tie-breaker, stated generally so it survives the next form: **the action that closes the
surface is primary; the action that keeps you on it is not.** Recording the game and leaving is the
commitment; recording and staying to log another is a convenience for the same commitment, and it
is the one that repeats — a repeating action that carries the loudest fill trains the eye to press
the loud thing without reading, which is exactly the failure a single primary exists to prevent.

If the two submits are not "finish" and "finish and continue" but two genuinely different outcomes —
two results, two destinations — then **neither is primary and both are hairline**, and the screen's
single bone fill is spent elsewhere or not at all. A screen with no filled button is legal. A
screen with two is not.

### `suggestion-tile.tsx:350` — accent inside a tile that prints accent figures

**Hairline, and check whether it needs to be a button at all.** *(R3.1 resolves this: the tile is
not clickable, so the button stays — and there is a second add branch R3 did not know about. See
§4.)*

This is the worst of the four, because a suggestion tile is a surface where accent already appears
as *data* — availability and in-use counts. An accent fill and an accent figure inside one 300px
card is the precise collision rule 2 was written to stop. Rule 4 also applies here: on deck tiles
the status carries the message and the tile itself is the target, and if the suggestion tile is
already clickable, the button is a second route to the same place and should go the way the deck
tile's CTA went. **If it is not clickable, hairline pill — never accent.**

### `app/page.tsx:61` — signed-out Home

**Deliberately outside rule 2. It keeps accent. This is now an exception on the record.**

Rule 2 is scoped to the authenticated app, and its whole justification is semantic collision:
accent means *in use / to buy*. Signed out there is no collection, no deck, nothing in use and
nothing to buy — accent carries no meaning there to collide with, so reserving it costs nothing and
buys nothing. The front door is also the one surface whose job is to be attractive rather than
legible-under-load, and the appshell tables already ratify a signed-out hero with its own type
scale for the same reason.

The boundary, so it is testable rather than a matter of taste: **accent may fill an action only on
surfaces reachable without a session.** The moment a screen can show an owned-card figure, rule 2
applies to it.

---

## 2 · Touch targets under the floor

**Both go to 44px. Yes, this changes the drawing, and the drawing was wrong.**

`coverage-sort.tsx:140` at 38px — unowned, eng's to fix, agreed.

`facet-strip.tsx:107` at 32px — the 32px in the PR #435 table is a **desktop** value that reached
the phone because the height was written unprefixed. Ratifying 32px on the phone would mean
ratifying a control that fails the floor everywhere the app is most used. The floor wins.

The exemption that exists (26px `…` on deck-tile art) does not extend here, and the reason is worth
stating because it will come up again: that exemption rests on **a second, larger route to the same
action** — the whole tile. A facet chip is the only route to that filter. A sort control is the only
route to that order. A submit is the only route to the commit. **No control that is the sole route to
its action may sit under the floor.**

Cost, and how to pay it. Taller chips make the strip taller, not wider, and a wrapping strip is what
actually breaks a phone layout. So: **44px chips, one row, horizontal scroll — not wrap.** Side
padding 12px, label 13px, and the first chip flush with the content edge so the row reads as
scrollable rather than clipped. If a scrolling row is unacceptable on that surface, the fallback is
the pattern already ratified for filters on the phone — move the facets into the filter sheet, where
44px rows cost nothing. What is not available is 32px.

`CHROME-rail-and-tabs.md` now carries both rows explicitly, plus the sentence that the phone column
is a floor rather than a starting point.

---

## 3 · Hairline side padding — 14px

**14px is correct. The README was right, the shipped value is right, and the frames were wrong.**

Ship stands as-is; nothing to change in code. The R2 canvases have been corrected from 13px to 14px
(ten call sites in `The 99 - Refresh · Home and Decks.dc.html`), and
`CHROME-rail-and-tabs.md` now states the full pill geometry in one table so the next
implementer reads a constant instead of measuring a drawing:

| Property | Desktop | Phone |
|---|---|---|
| height | 32px | 44px |
| side padding | 14px | 16px |
| border | 1px `--border-strong` | 1px `--border-strong` |
| radius | 8px | 10px |
| label | 12.5px, weight 500 | 14px, weight 500 |

A one-pixel disagreement is not worth a code change in either direction; it is worth removing the
ambiguity that produced it, which is what the table above does. **Where a drawing and a stated
constant disagree, the constant wins and the drawing gets fixed** — for this package, generally.

---

## Summary for the single PR

| Site | Change |
|---|---|
| `game-log-form.tsx:233` / `:387` | Accent off both. Task-ending submit → bone fill; the other → 32px hairline. Two different outcomes → both hairline. |
| `suggestion-tile.tsx:350` | Accent off. Hairline pill, or drop the button if the tile is already the target. |
| `app/page.tsx:61` | **No change.** Ratified exception — accent is permitted on session-less surfaces. |
| `coverage-sort.tsx:140` | 38px → 44px on phone. |
| `facet-strip.tsx:107` | 32px → 44px on phone; one row, horizontal scroll, 12px side padding, 13px label. |
| Hairline side padding | **No change.** 14px confirmed; design frames corrected instead. |

---

## 4 · The suggestion tile's two add branches — R3.1

**Both branches become the same default hairline pill. The owned/unowned distinction stays, and it
moves into the label — never into the button's weight.**

```
owned    → [ Add ]              default hairline pill
unowned  → [ Add · to buy ]     default hairline pill, same geometry
```

### Why not two hairline weights

Because nobody can read them. Two hairline pills differing by border alpha or label colour is a
distinction that survives a side-by-side comparison in a design review and disappears in a panel of
fourteen tiles being skimmed — which is the only context this control lives in. A signal you have to
compare two instances to perceive is not a signal. That is also the failure mode R3 §2 named for the
targets table: a value that looks fine in the drawing and fails at the size it ships.

The shipped comment is right that these are different actions —
*"adding a card you do not own is a real action, just not the deck's default one"* — and the
mistake is only in **where** it says so. Rule 2's ban on accent is not a claim that the two adds are
identical; it is a claim that accent already means *in use / to buy*, so accent cannot also mean
*press me*. And note what accent means here: **the unowned branch is a to-buy action, so accent is
doubly wrong on it** — a gold fill on the one button that creates a to-buy obligation reads as
availability data, on the exact tile that prints availability data three lines above.

### Why the label, and not the tile's data line

R3's instinct was to push the distinction out to the data line, where availability already lives.
That is wrong for this control, and the reason is worth keeping: the data line says what is *true of
the card*; the button says what will *happen if you press*. Adding an unowned card does something
different from adding an owned one — it changes the deck's status to **To buy** and adds a row to the
shopping total on Home. **A consequence that differs belongs in the label of the control that causes
it.** `Add · to buy` is four extra characters that name the consequence in the vocabulary the six
statuses already teach.

So the answer to *does the distinction move out of the button entirely* is **no** — it moves out of
the button's *styling* and into the button's *words*. The data line keeps doing its own job
unchanged.

### What this settles for the panel

One geometry, one weight, two labels. A skim down the panel reads a column of identical pills whose
labels differ, which is scannable at a glance and legible at 390px. `GhostButton` is retired from
this tile: a ghost and a hairline side by side implied a tier difference between two actions that
are peers, and the two adds are peers — same importance, different consequence.

**If a tile ever needs the two adds to differ in weight, that is a product decision that one of them
is discouraged, and it needs to be argued as that** — not implemented as a quiet style difference.

---

## 5 · One control, two phone geometries — R3.1

**Confirmed: your read is correct. 12px/13px on the facet strip, 16px/14px everywhere else.** The
contradiction was mine, and the fix is in the table rather than in the numbers.

`CHROME-rail-and-tabs.md` now states the pill as **two named variants — Default and Dense chip —
and only two.** The dense variant is scoped to the facet strip by name: a horizontally scrolling row
of many chips, where the default's padding costs a visible chip per screen. Everything else,
including sort controls, header buttons and both suggestion-tile adds, is the default.

Two things the table now says out loud, because both were implicit and implicit is what produced
this ticket:

1. **The 44px phone height is identical in both variants.** Only padding and label shrink. The floor
   is the accessibility number from §2 and it does not flex for density.
2. **There is no third variant.** A surface that appears to need one has too many controls; that is a
   layout problem, and inventing a tighter pill hides it.

R3 §2's prescription stands exactly as written — it was a deliberate exception, and its only defect
was living in prose next to a table that claimed to be complete.

---

## 6 · Correction accepted — the log-form premise

Noted and agreed: `game-log-form.tsx` returns early at `if (!open)`, so `:233` and `:387` are
mutually exclusive states, not two submits on one screen. **§1's tie-breaker was ratified on a case
that did not test it.**

The tie-breaker stays — *the action that closes the surface is primary; the action that keeps you on
it is not* — and so does the rule under it: **one filled button per rendered screen**, which
mutually exclusive states satisfy trivially, since only one is ever on screen. Both buttons still
lose accent, as ruled.

Recording the correction rather than quietly keeping the conclusion, because the next form genuinely
will have two live submits, and whoever reads §1 then should know the rule has not yet been tested
against a real case.
