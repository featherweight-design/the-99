# Long-role density — the max-render call (§6 state 6, §11 deliverable)

**Question eng needs answered:** virtualise the coverage chip list, or plain overflow?

**Answer: plain overflow.** No windowing, no measurement pass, no dependency.

## The bound

Chips are bounded twice — once by the collection, once by the drawn cap. The cap is what makes
this safe to answer in the abstract:

| | Phone | Desktop |
|---|---|---|
| Resting render, per role | **6 rows** | **12 chips + 1 disclosure** |
| Resting height, per role | ~300px | ~76px (two rows) |
| Expanded render, per role | up to **40** | up to **40** |
| Expanded panel height | capped **320px**, scrolls in place | capped **320px**, scrolls in place |
| Beyond 40 | `+N more` as a **count**, not an expansion | same |
| Worst case, whole section | 4 roles × 40 = **160 nodes** | **160 nodes** |
| Realistic worst case | one role expanded: **40 + 18** | **40 + 36** |

160 interactive nodes is below every threshold this codebase has already accepted:
`commanders-windowing` rendered 214 rows without windowing, and the add panel's Consider grid
draws 99 art tiles. A chip is a span, a dot and a number — cheaper than either.

## Why the cap exists at all, given that

Not performance. **Legibility.** A 34-chip Ramp panel pushes Card Draw, Removal and Board Wipes
off the screen, and Role Coverage is a four-role comparison — the section's whole job is lost the
moment one role fills the viewport. The cap protects the comparison, and the 320px scroll
protects it again when the player expands one role deliberately.

## Why 40 is where expansion stops

The list is sorted by `inclusionPct` descending, absent last. By chip 40 the figures are in the
noise and the tail is mostly absent-figure cards. A player with 60 ramp sources does not need
chip 57; they need the top of the list and the arithmetic, and they have both — the header already
says `34 owned` and `Well past the 10-source baseline`.

So past 40: `+N more` prints the remainder as a **count with no target**. It is a fact, not a
control, and it takes no hit box.

## What eng should build

- One `slice(0, expanded ? 40 : cap)` where `cap` is 12 or 6 from a media query — **not** from a
  measured width. The two densities are already two different renders (pill wrap vs. row list),
  so the breakpoint is being crossed anyway.
- `max-height: 320px; overflow-y: auto` on the expanded container, at both widths.
- `aria-expanded` / `aria-controls` on the disclosure; the container keeps its
  `aria-labelledby` role heading, so expanding does not re-announce the section.
- **No focus stealing on expand.** Focus stays on the disclosure, which is now `Show fewer`.
- Collapse returns the panel to resting height; scroll position is discarded, not restored.

## Edge counts

| Chips in role | Drawn |
|---|---|
| 0 | `No {role} cards in your pool` — shipped string, no list, no disclosure |
| 1–6 | all, no disclosure at either width |
| 7–12 | all on desktop; phone shows 6 + `Show all N` |
| 13–40 | capped + disclosure; expanded shows all, scrolling past 320px |
| 41+ | capped + disclosure; expanded shows 40 + `+N more` as inert text |

## If this call is wrong

The failure mode is a player with a very deep collection scrolling a 320px box. That is a bad
minute, not a broken page, and it is one constant away from being fixed. Virtualisation, by
contrast, is a dependency, a measurement pass, a keyboard-navigation hazard and a print hazard,
bought against a 160-node ceiling. Not worth it.
