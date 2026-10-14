# Synergy panel density — the §7.1 call

**Question eng needs answered:** at ~260 cards, what shape is this panel, and does it virtualise?

**Answer: one column of 44px rows at both widths, plain overflow, no virtualisation.**

## The real scale

Not estimated. §0 queried it:

| | Rows |
|---|---|
| `commander_support` | 3,342 commanders |
| `commander_support_cards` | 879,329 |
| Support cards per commander | **~260** |
| The Chief Warg, specifically | **258** — 66 creatures, 56 lands, synergy 0 → 0.83 |

Every one of the 879,329 rows carries both an inclusion and a synergy figure, so there is no
partial-data density case to design for: the panel either has the commander's list or it has the
absent state.

## Why rows, and not the other two shapes

**Tiles are ruled out by the data contract, not by taste.** §5 lists oracle id, inclusion, synergy,
type line and owned quantity. There is no image. `SuggestionTile` renders a no-art card as a
gradient placeholder at `opacity: 0.55` — correct for the occasional missing image, and a wall of
grey at 258. Adding an image join so that tiles become possible is inventing a data requirement to
justify a layout.

**Two columns are ruled out by the ordering.** The desktop right column is roughly 900px and fits
two 440px lists, halving the scroll. It also makes "is rank 2 to the right of rank 1 or below it?"
a question the player has to answer before they can read the ranking. Column-major and row-major
look identical in a screenshot and read completely differently. A synergy ranking with an ambiguous
reading order is not a ranking.

**Rows win on all three counts:** they hold two figures plus a type plus a control without
compressing anything, they read top-down as a ranking, and they are `CoverageRow`'s shipped
geometry rather than a new primitive.

It also closes an open gap by construction. The recommendations handoff's gap 2 asked whether the
28px desktop coverage chip needed a 44px keyboard-first equivalent. This panel's desktop row **is**
44px, the same as its phone row, so the question does not recur here.

## The bound

| | Phone | Desktop |
|---|---|---|
| Resting render | **6 rows** + 1 disclosure | **10 rows** + 1 disclosure |
| Resting height | ~370px | ~500px |
| Default facet | Creatures (~66) | Creatures (~66) |
| Expanded, a type facet | all of it (26–71) | all of it |
| Expanded, `All` | **all 258** | **all 258** |
| Expanded container | `max-height: 480px; overflow-y: auto` | same |
| Worst case, whole panel | **258 rows** | **258 rows** |

258 rows is above the sibling handoff's 160-node ceiling and still below everything this codebase
has accepted: `commanders-windowing` rendered **214 rows** with no windowing, and the add panel's
Consider grid draws **99 art tiles with images**. A synergy row is a flex container holding a dot,
two text spans, two numbers and a button — no image, no aspect-ratio box, no gradient, no shadow.
258 of those is cheaper than 99 tiles.

## Why there is no expanded cap, unlike the sibling handoff

The recommendations handoff capped expansion at 40 and printed the remainder as an inert count.
**That cap does not transfer, and the reason is in ruling 1.**

There, the cap protected a **four-role comparison**: a 34-chip Ramp panel pushed Card Draw, Removal
and Board Wipes off screen, and the section's whole job was comparing four roles. Here there is
nothing below the list to protect — the panel is the last section on the page — and ruling 1
requires that **the full list is reachable**. `+198 more not shown` breaks that promise in the one
place the ruling made a promise.

So the depth control is the **scroll box**, not a second cap. 480px shows ten rows of a 258-row
list, and the facet strip is how a player narrows before they scroll. Two mechanisms, each doing
one thing.

## Resting cap: 10 desktop, 6 phone

Judgement, not a measurement. 10 rows is roughly 500px — the panel occupies most of a viewport
without owning it, and the top of the ranking is what the panel is for. 6 at phone matches the
shipped coverage cap exactly, and at 52px per row it is ~370px, which leaves the sticky Build bar
and the section above it on screen.

One constant per width, from a media query — not from a measured width. The two densities are
already two different renders (44px six-slot row vs. 52px meta-line row), so the breakpoint is
being crossed regardless.

## What eng should build

- One `slice(0, expanded ? Infinity : cap)` where `cap` is 10 or 6.
- The facet filter runs **before** the slice, and the facet counts come from the server, computed
  post-exclusion. Do not count in the client off a filtered array — the count and the list will
  drift the first time the exclusion changes.
- `max-height: 480px; overflow-y: auto` on the expanded container, both widths.
- `aria-expanded` / `aria-controls` on the disclosure; the container keeps its
  `aria-labelledby`, so expanding does not re-announce the section.
- **No focus stealing on expand.** Focus stays on the disclosure, now reading `Show fewer`.
- Changing facet **collapses** to the resting cap and **preserves selection**. Scroll position is
  discarded.
- Collapse discards scroll position; it is not restored.

## Edge counts

| Rows in facet | Drawn |
|---|---|
| 0 | `No {facet} cards for this commander` — one mono line, no list, no disclosure |
| 1–6 | all, no disclosure at either width |
| 7–10 | all on desktop; phone shows 6 + `Show all N` |
| 11+ | capped + disclosure; expanded scrolls the whole facet |
| 258 (`All`) | capped at 10 / 6 + disclosure; expanded scrolls all 258 |

## If this call is wrong

The failure mode is a player scrolling 258 rows in a 480px box to find one card, because the facet
strip did not narrow enough. That is a bad minute and one constant — or one search field — away
from being fixed; see README gap 6.

Virtualisation, by contrast, buys a dependency, a measurement pass, a keyboard-navigation hazard
and a print hazard against a 258-node ceiling on rows with no images in them. Not worth it, and the
codebase has already declined it twice at a comparable scale.
