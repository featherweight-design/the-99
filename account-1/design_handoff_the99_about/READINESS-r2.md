# READINESS — about page (R2)

**Self-assessed: 🟢 green on the artifact, with three Product calls and one build cost I want seen
before it is estimated.**

R1's verdict stands as a miss: it answered the five open questions correctly and shipped the wrong
kind of page. R2 changes the unit to a figure with a caption, draws all twenty-four, and keeps every
locked decision. Nothing in it is blocked on a decision I cannot make.

## What is green

- **Twenty-four entries, twenty-four figures**, across the six surfaces the brief named — Home,
  commander detail, Discover, deck detail, Decks, Collection — and each figure drawn from the
  shipped component rather than from memory or a screenshot.
- **The four questions the brief called out by name are now visual:** how a fit score is composed
  (bar, legend, opened key, printed sum); what the decklist marks mean (four tiles, annotated by
  corner); what each Discover order means (all five, with their glosses, and which two change the
  list); what a status badge means (all six, with bar, figure and next action).
- **The specimen grammar**, which is the reusable part: two widths, one annotation object, a rule
  that the figure is never the only carrier, and a rule that a specimen is inert.
- **Every string in every specimen is a real shipped string.** Where a vocabulary was not in the
  files I read, the entry says what it cannot show rather than inventing labels.

## Three Product calls

**1 · Art.** Art-bearing specimens draw `ArtWash`'s colour-identity gradient, not a Scryfall crop.
A real commander in the reference dates the page, ties it to one card, and makes the figure a
recommendation. The cost is that the Ready-to-build figure is the least convincing on the page —
the real card is mostly art. If Product wants a crop, **pick one commander and accept that it will
look stale within two sets**; I would ship the gradient.

**2 · The mark still spends `--accent`.** Carried from R1 and now sitting inches from eleven real
marks, which I read as strengthening the case: the page's mark is a *word* on a title line outside
every specimen hairline, and nothing in the marks family is a word. Fallback unchanged — the same
plate in `--fg`/`--bg`.

**3 · Length.** Four screens at desktop, about eleven at phone. That is what an honest reference
for this app costs, and ruling 1 forbids the usual escapes (tabs, accordion, a tour). **If that is
too long, the lever is the entry count, not the figures** — cut chapter 03 to eight entries before
you cut a single specimen, because the specimens are the reason the page works.

## The build cost, stated plainly

R1 implied a static page. **R2 is a page that mounts a dozen real components with fixture props.**
Concretely: one `about/fixtures.ts` holding a card, a commander, a set cell, a deck, a game log and
an availability set; a small `<Specimen>` wrapper that supplies the hairline, `aria-hidden` and the
inertness; and a rule in review that no component is forked to serve this page. That is bigger than
"a page and a cookie" — **and it is the only version of this page that is correct a year from now**,
because the figures change when the components do.

The one place I would accept a departure: three of the twelve plates are compositions rather than
single components (the marks tiles, the status table, the Discover orders). Those are assembled on
the page from the real primitives. They are the three most likely to drift, so they are the three
that want a test.

## Unverified, and I could not settle it from source

- **The `--avail-*` tokens.** `availability-marker.tsx` reads `--avail-soft`, `--avail-hard`,
  `--avail-hard-fg`, `--avail-over-fg` and `--avail-over-border`; I could not find their
  definitions in the files I reached. **The specimens map soft → `--fg-muted`, hard → `--warning`,
  over → `--danger`**, which matches the behaviour the component's own comments describe. If the
  real tokens differ, the figures are wrong in hue and right in structure — one token swap.
- **`--bg` on `--accent` at 9.5px, six themes.** Unchanged from R1: highest-contrast pair by
  construction, and **Ixalan's `#A3C445` is the one to measure first**.
- **Role names and baselines.** `Ramp / Card draw / Board wipes / Lands` and the baseline figures
  in chapter 03 are plausible fixtures, not strings I read. Before build they come from the scoring
  module, and if the app's role vocabulary differs, that figure is relabelled.

## Copy delta

`about · copy strings.ts` still holds the entry model. R2 needs two fields added per entry, and
they are the round's only copy change:

- `caption` — replaces `body`. Shorter, because the figure now carries the shape.
- `keys?: string[]` — nought to four lines, in numeral order.

Every string *inside* a specimen is imported from the surface's own copy file and must never be
retyped here.

## What I would cut to ship sooner

**The sticky index** — still the only behaviour in the round, and now the only thing on the page a
pointer can touch. Cutting it leaves the phone's in-flow contents list at both widths, which is
complete.

I would **not** cut a figure. A figure-free version of this page already exists; it is R1, and it is
why we are on R2.
