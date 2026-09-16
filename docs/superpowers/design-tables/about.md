# Design Property Table — /about

Enumerated from `design/design_handoff_the99_about/The 99 - About Page (R4).dc.html` §3
(the desktop page) and §5 (phone), **before** any implementation file was opened.

**Method note.** `design-review` dispatches three agents — enumerate, verify, confirm — and this
session's only subagent grant is the §10b pre-open pass. So the two passes were run in sequence by
one reader, with this table written down and committed before any implementation file was read.
That preserves the method's core (the checklist exists before the verification) and loses its
attention-drift protection, which is stated here rather than left to be assumed.

## Page chrome

### h1 — "What The 99 does"
| Property | Phone | Desktop |
|---|---|---|
| font-family | `var(--font-display-face)` (Cinzel on Amonkhet) | same |
| font-weight | 700 | 700 |
| font-size | 24px | **29px** |
| line-height | 1.2 | 1.2 |
| color | `var(--fg)` | `var(--fg)` |
| margin-bottom | 10px | 10px |

### h2 — chapter heading
| Property | Phone | Desktop |
|---|---|---|
| font-family | display face | display face |
| font-weight | 700 | 700 |
| font-size | 19px | 21px |
| color | `var(--fg)` | `var(--fg)` |

### Entry route link
| Property | Phone | Desktop |
|---|---|---|
| font-family | `var(--font-mono)` | same |
| font-size | 11.5px | **11.5px** |
| color | `var(--accent)` | `var(--accent)` |
| position | beside the title | beside the title |

### Key line
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | **10.5px** | **10.5px** |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| line-height | 1.5 | 1.5 |
| leading numeral | 14px `--accent` circle | same |

### Specimen frame
| Property | Phone | Desktop |
|---|---|---|
| background | `var(--surface-sunken)` | same |
| border | 1px solid `var(--border)` | same |
| border-radius | 8px | 8px |
| padding | **14px 16px** | **14px 16px** |

### Contents rail
| Property | Phone | Desktop |
|---|---|---|
| display | none (in-flow list instead) | block |
| position | — | `sticky` |
| top | — | **0** |
| width | — | 220px |
| current row | — | filled, `aria-current` |

## State coverage

| State | Trigger | Rendered |
|---|---|---|
| Version 0 | `seen === 0` | every entry, nothing marked, dismiss present |
| Behind | `0 < seen < ABOUT_VERSION` | eyebrow, `NEW` on entries since, dismiss |
| Current | `seen >= ABOUT_VERSION` | no eyebrow, no marks, no dismiss |
