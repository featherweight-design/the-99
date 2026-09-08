# R3 rulings — three calls left open by PRs #437 and #438

`design/design_handoff_the99_refresh/` · R3 · 2026-09-08

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

**Hairline, and check whether it needs to be a button at all.**

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
