# READINESS — about page (R1)

**Self-assessed: 🟢 green, with one Product call I want made, one contrast measurement I cannot
take from here, and one sequencing note.**

All five **Open for Design** items are called and drawn, both widths, all three readers, plus the
menu row at both panels. Nothing is blocked on a decision I cannot make. The six rulings are
untouched.

## What is green

- **The entry row**, with the card grid drawn and rejected on three grounds, one of which is that
  the grid collapses into the ruled shape at 390px anyway.
- **The mark**, with the full inventory drawn at real size and three alternatives rejected —
  including the one that would have been cheapest (the proxies dashed box) and the one that would
  have been free (an accent title).
- **The accent argument**, which is the round's load-bearing claim and is falsifiable: it holds
  *because no card, price, copy count or deck appears on `/about`*, and it would stop holding the
  moment this page drew one.
- **One scroll, index right at desktop, index in the flow at phone** — same four strings, one
  source, no jump control at either width.
- **Dismiss at the foot, absent rather than disabled** when there is nothing to acknowledge, with
  the destination named beside it.
- **`About The 99`, first**, with the two rejected names and the reason each loses.
- **Five source findings**, three of which are engineering the spec's "one insertion" does not
  budget: the `% 2` wrap, the two-element ref tuple, and the fact that this is the menu's first
  link rather than its third button.
- **Copy for all twenty-six entries**, in the spec's own shape, with `since`, `route` and the
  optional opens-clause — input to `/copy-review`, not the output of it.

## The Product call I want made

**The `NEW` plate spends `--accent` and I want that ratified rather than assumed.** My argument is
that the proxies audit's finding — every hue is booked — was a finding *about surfaces that carry
cards*, and this surface carries none. I believe that is right, and it is the only reason a filled
accent plate is available to anything in this app.

If Product would rather accent stayed reserved absolutely, **the fallback is the same plate in
`--fg` with `--bg` ink** — the primary button's inversion. It reads almost as well and it costs one
thing: the plate then shares a skin with every primary button on the page, of which there is
exactly one, the dismiss, sitting at the foot. I would ship accent and watch. I would not ship
`2c`, the dashed box, under any circumstances.

## What I could not measure from here

**`--bg` on `--accent` at 9.5px, in all six themes.** It is the darkest ink on the brightest fill,
so it is the palette's highest-contrast pair by construction and I am confident it clears AA
comfortably everywhere. But 9.5px mono at weight 600 is small text, the threshold is 4.5:1, and
**Ixalan's `--accent: #A3C445` against its `--bg: #0E1310` is the pair to check first** — a bright
yellow-green is the one accent where the ink could conceivably be the limiting side rather than the
fill. One measurement per theme in the build, not six variants in the design.

## Sequencing

**This handoff gates PR 2 only.** PR 1 — the `user_prefs` table, `src/lib/copy/about.ts`, the guard
— is data and copy, is not gated on a design verdict, and should start now: the copy is the bulk of
the real work and `about · copy strings.ts` is written to drop into it.

**One ordering consequence worth naming:** every entry's `since` is 1 and `ABOUT_VERSION` is 1, so
the page's *marked* state is unreachable at launch and cannot be exercised in the acceptance pass
except by hand-editing `user_prefs`. That is the spec's rule working correctly, not a gap — but
whoever files the contact sheet needs to know the marked frames are produced with a seeded row.

## Still open, not blocking

### Chapter 3 has eleven entries and chapter 4 has four
Drawn honestly rather than balanced. The imbalance is the app's, and it is the chapter a reader
spends the most time in, so I would not split it — but if it reaches fifteen the chapter wants
sub-headings, and that is a redraw rather than an addition. Worth watching at version 3.

### Scroll-spy at the last chapter
Chapter 4 is short, so at the bottom of the page its heading may never cross the observer's
threshold and the index can stay on 03. The fix is the usual one (treat "scrolled to the end" as
selecting the last chapter), it is three lines, and I have not drawn it because it is behaviour with
no visual state of its own.

### The phone contents list has no active state, and I think that is right
It is a table of contents, not a control, so it does not track scroll and nothing in it is ever
current. A reader who taps `03`, scrolls, and looks back up will find the list exactly as they left
it. The alternative is a sticky control on a document, which is what §3's ruling refused.

### `takes you to /decks/kinnan-ramp` prints a path, not a name
The clause can only print what `next` validated to, and the page has no way to resolve a deck id to
a deck name without a read it does not otherwise need. A path is honest and slightly cold. If
Product wants the name, it costs one query on a page that currently makes none.

### The opens-clause is `--fg-faint`
Below the AA floor on purpose, and permissible only because every clause is repeated in words in
the body directly beneath it — the same split `first-run.tsx` makes for its step numerals. If
review would rather it were `--fg-muted`, that is a one-token change and nothing else moves.

## What I would cut to ship sooner

**The sticky index.** It is the only part of this round with behaviour in it — an
`IntersectionObserver`, a tracked state, an `aria-current`, and the last-chapter edge case above.
Cutting it leaves a plain one-column document at desktop with the phone's in-flow contents list at
both widths, which is *complete*: nothing becomes unreachable and no entry loses a word. It is a
genuine improvement for a twenty-six-entry reference and it is the cheapest thing here to add in a
follow-up, because it adds no strings and changes no entry.

I would **not** cut the `since` mark or the eyebrow. Without them the page is a static document
that only ever gets read once, and ruling 2 — the reason this page exists rather than a welcome
carousel — has nothing to render.
