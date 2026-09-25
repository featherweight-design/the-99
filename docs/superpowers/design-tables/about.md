# Design Property Table — /about

Enumerated from `design/design_handoff_the99_about/The 99 - About Page (R4).dc.html`: §3 for the
desktop column, **§5 (`Phone — 390px`, offset 243143) for the phone column**.

## The first version of this table was not trustworthy, and the reason matters

It claimed both columns came from the canvas. The desktop column did. **The phone column was the
shipped code** — 24px where §5 draws 23, 19px where §5 draws 16, 11.5px where §5 draws 11. I never
extracted §5 at all; I filled the column with values I already knew, and a table filled from the
implementation certifies the build instead of the design. That is the precise failure this artifact
exists to prevent, and it passed my own verification because the two sides agreed by construction.

It was caught by the cold-eyes pass, not by me, and only because that pass recomputed every row
against the canvas rather than trusting the table.

**Method.** `design-review` dispatches three agents — enumerate, verify, confirm — and this
session's only subagent grant is the §10b pre-open pass. Both passes were therefore run by one
reader. The back-filled column above is what that costs, stated here rather than left implicit.

## Page chrome

### h1 — "What The 99 does"
| Property | Phone (§5) | Desktop (§3) |
|---|---|---|
| font-family | display face | display face |
| font-weight | 700 | 700 |
| font-size | 23px | 29px |
| line-height | 1.2 | 1.2 |
| color | `var(--fg)` | `var(--fg)` |
| separation from intro | 10px | 10px |

### h2 — chapter heading
| Property | Phone | Desktop |
|---|---|---|
| font-weight | 700 | 700 |
| font-size | 16px | 21px |

### h3 — entry title
| Property | Phone | Desktop |
|---|---|---|
| font-weight | 600 | 600 |
| font-size | 15px | 15.5px |

### Entry route link
| Property | Phone | Desktop |
|---|---|---|
| font-size | 11px | 11.5px |
| color | `var(--accent)` | `var(--accent)` |

### Key line
| Property | Phone | Desktop |
|---|---|---|
| font-size | 10.5px | 10.5px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| line-height | 1.5 | 1.5 |

### Specimen frame — TWO variants, not one
| Property | Plate | Inset |
|---|---|---|
| background | `var(--surface-sunken)` | same |
| border | 1px solid `var(--border)` | same |
| border-radius | 8px | 8px |
| padding | 14px 16px (12 frames in §3) | 12px (17 frames in §3) |

The first table collapsed these into one row, which is why the gap was read as a single padding
axis and one blanket value was applied to both.

### Contents rail
| Property | Phone | Desktop |
|---|---|---|
| display | none | block |
| width | — | 216px |
| position | — | sticky |
| top | — | see note |

**`top` is the one row not taken from the canvas.** §3 draws `position:sticky;top:0` inside a static
frame with `padding:30px 30px 34px`, so the rail is drawn 30px clear of the edge and never sticks at
all in the mock. In the app there is no top chrome at this width, so `top:0` would put the Contents
label against the viewport edge the moment the page scrolls. The drawn CLEARANCE transfers; the
property that produced it does not.

## Entry count

§3's own heading reads **"thirty-three entries, thirty-three figures"**. The code has 42. Three are the launch entries `help-me-choose`, `locked-cards` and
`change-commander`, drawn by the
launch-entries addendum and shown only while their features' switches are on. The six other
extras are `decklist-order`, added after #642 shipped the decklist's sort control;
`commander-availability`, added by #683; `review-and-commit` and `new-deck`, drawn on the §G
template as R5 after a coverage sweep found two routes a reader could reach with nothing on the
page explaining them; `informed-build`, which closes sub-project 2 of the deck-analysis line; and
`combo-awareness`, which closes sub-project 3. All six arrived after the canvas was drawn. The rule in `AGENTS.md`
is that a feature designs and builds its own About entry, so this table's count is expected to trail
the code and the gap is not a finding. `about.test.ts` pins the figure, so it cannot go stale
silently.
