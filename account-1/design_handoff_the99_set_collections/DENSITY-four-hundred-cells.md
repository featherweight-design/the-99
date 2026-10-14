# Density — 399 cells on one page

Edge of Eternities is 276 base + 123 extras. That is the page, at one scroll, by ruling 1.

## The arithmetic

| | Recommended (116px) | Rejected (88px) |
|---|---|---|
| Art | 116 × 162 | 88 × 123 |
| Cell incl. caption | 116 × 196 | 88 × 153 |
| Gap (col / row) | 10 / 18 | 8 / 14 |
| Columns at 1180 | **8** | 11 |
| Columns at 1280 | 9 | 12 |
| Columns at 390 | 3 (at 108px) | 3 (at 108px) |
| Base run | 35 rows · 6,860px | 26 rows · 3,978px |
| Extras | 16 rows · 3,136px | 12 rows · 1,836px |
| **Whole page** | **≈10,300px ≈ 11 screens** | ≈5,700px |
| Name | reads to ~20 chars | truncates at ~13 |

At 390px both densities land on the same 108px cell, so the phone is not the reason to pick either.

## The call: one density, the larger one, no toggle

Compact saves 4,600px and costs the card name. In a dimmed cell the art is at 28% and the collector
number means nothing to anyone who has not memorised a checklist — **the name is the only thing a
reader can match against memory**, and it is also what they search a shop with.

No toggle either. That is a second view control on a page whose sibling route already has one, and it
buys a scroll nobody performs end to end: readers jump to a region, they do not travel 276 cells
looking for one card.

## What pays for the scroll instead

**1 · The head sticks.** Ratio, cost strip and the three filters pin at **108px desktop / 96px phone**.
The figure the page exists for is never scrolled away from, and the controls that change it are always
in reach. This is the single most important structural decision on the page — at 10,300px a
non-sticky ratio is a number you see once.

**2 · Two sections, one jump.** `extras ↓` in the sticky result line is the page's only in-page
navigation. **No A–Z rail and no number scrubber:** the grid is already in collector-number order,
which is the reader's index, and a scrubber over a sequence that missing-only makes discontinuous
would be lying half the time.

**3 · Missing-only is the real density control.** It removes 62 cells here, and far more on a
well-collected set — and unlike a toggle that shrinks everything, it removes the cells the reader is
*done with*. It is listed third here and first in importance for anyone past 50%.

## Section structure

Two grids, never one. Each section has its own Cinzel heading, its own `N / M`, and its own note; the
extras ratio is one type-step down so the two figures can never be misread for each other from across
a scroll. A section boundary is also the only place the grid's column count is allowed to be
re-measured.

## Left to engineering

**Windowing.** The design does not depend on it. 399 `image_uri_small` requests want `loading="lazy"`
at minimum; virtualisation is fine. Two constraints:

- it must not break the sticky head, and
- it must not break the `extras ↓` jump (a virtualiser that has not mounted the extras heading cannot
  scroll to it — an anchor offset or a scroll-to-index is needed).

**Image sizing.** `image_uri_small` is 146×204; at 116×162 it is downscaled, which is correct. Do not
substitute `normal` for the grid — 399 of those is the payload problem the read-path section of the
spec exists to avoid.
