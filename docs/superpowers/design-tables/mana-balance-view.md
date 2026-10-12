# Design Property Table — Mana Balance view (R3b)

Enumerated from the design handoff only (`design/design_handoff_the99_tuning_hub/`). Build target: R3b
F3 / F3b (on open), F3c (Hardest costs open, phone), F1 / F1b (everything open; desktop F1 has the
explainer open). Thin states from R3 M6 / M6b (colorless) and M7 / M7b (no sources). The Improve my mana
door, the color step and the help result are out of scope.

Sources:
- **R3b** — `The 99 - Tuning Hub (R3b) · B Mana Balance, full view.dc.html` (template + `renderVals`).
- **R3** — `The 99 - Tuning Hub (R3) · B Mana Balance, evidence.dc.html` (thin states and per-cell
  conditionals R3b draws unconditionally from its one Gishath fixture).
- **DT** — `design-tables/tuning-hub.md` (R3 / R3a / R3b Mana rows). **ST** — `STATES-tuning-hub.md`.
- Copy keys are `manaBalanceCopy.*` in `mana-balance R3 · copy strings.ts`. Wording is not judged here.

Tokens (canvas `:root`): `--bg #121217`, `--surface #1E1F26`, `--surface-sunken #16171D`,
`--border #1A1F2B`, `--border-strong #2E3340`, `--fg #C6D2D3`, `--fg-body #B3C0C2`,
`--fg-muted #95A4A6`, `--fg-faint #7C8A8C`, `--fg-locked #5F6D6E`, `--accent #5C86C9`,
`--accent-dim #34507D`, pip colors `--w --u --b --r --g`. Fonts: sans = IBM Plex Sans, mono = IBM Plex
Mono, display = Metamorphous. The canvas writes the fonts as literal families; the build maps them to
the app's font variables (sans / mono / display). No `--warning`, `--success` or `--danger` appears on
any element in scope (ST "Must not").

Where R3b and R3 disagree, R3b wins unless the row says otherwise; a conflict is marked **[conflict]**.

---

## Component: Frame context (not built here; sets the gutter)

### Frame (canvas device)
| Property | Phone | Desktop |
|---|---|---|
| width | 390 | 900 |
| padding | `10px 16px 20px` | `18px 24px 22px` |
| background | `var(--bg)` | `var(--bg)` |
| display / direction / gap | flex / column / 10 | flex / column / 10 |
| chrome above the panel | `‹ Tuning` row + `2 of 4 tools` (hub, not this PR) | tool tabs row (hub, not this PR) |

---

## Component: ManaBalancePanel (shell)

### Panel
| Property | Phone | Desktop |
|---|---|---|
| background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| border-radius | 12 (R3b; R3 phone was 11) | 12 |
| padding | `16px 14px` | `18px 20px` |
| display | flex | flex |
| flex-direction | column | column |
| gap | 18 (R3b; R3 was 16; DT "Panel gap 18") | 18 |
| child order | heading block → evidence table → Hardest costs section → Lands section → [door, excluded] → citation | same |

---

## Component: Heading block

### Wrapper
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| gap | 6 | 6 |

### Title row
| Property | Phone | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 10 | 10 |
| flex-wrap | wrap | wrap |

### Title (`h3`)
| Property | Phone | Desktop |
|---|---|---|
| element | `h3` | `h3` |
| margin | 0 | 0 |
| font-family | display (Metamorphous) | display (Metamorphous) |
| font-weight | 400 | 400 |
| font-size | 17 | 19 |
| color | `var(--fg)` | `var(--fg)` |
| copy key | `title` | `title` |

### Sub
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10.5 | 10.5 |
| line-height | — (R3b; R3 set 1.5) | — |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy key | `sub(pips, sources)` | `sub(pips, sources)` |

### Lead
| Property | Phone | Desktop |
|---|---|---|
| element | `p` | `p` |
| margin | 0 | 0 |
| font-family | sans | sans |
| font-size | 13 | 13.5 |
| line-height | 1.6 | 1.6 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| max-width | 660 | 660 |
| text-wrap | pretty | pretty |
| copy key | `lead`; no-sources state: deck stats' `colors.noLands` sentence + `thin.noSources` | same |
| conditional | absent in the colorless state (R3 M6 `leadOn: false`) | same |

---

## Component: ManaEvidenceTable

### Table wrapper
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| border-top | `1px solid var(--border)` | `1px solid var(--border)` |

### Head row
| Property | Phone | Desktop |
|---|---|---|
| rendered | — (absent; cells carry mini labels) | yes |
| display | — | grid |
| grid-template-columns | — | `104px minmax(0,1fr) minmax(0,1fr) 172px` (R3b; R3 last col 156px) |
| gap | — | 16 |
| padding | — | `8px 2px` |
| font-family | — | mono |
| font-size | — | 9.5 |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | `var(--fg-locked)` |
| border-bottom | — | `1px solid var(--border)` |
| cells / copy keys | — | `table.head.color` · `.pips` · `.sources` · `.needed` |

### Color row
| Property | Phone | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | `minmax(0,1fr) minmax(0,1fr)` | `104px minmax(0,1fr) minmax(0,1fr) 172px` |
| gap | `8px 14px` | 16 |
| align-items | start | start |
| padding | `11px 2px` | `11px 2px` |
| border-bottom | `1px solid var(--border)` | `1px solid var(--border)` |
| rows rendered | colors with a pip or a source, W U B R G order, never sorted by comparison (DT, ST) | same |
| placement: name | col 1 / row 1 | auto (col 1) |
| placement: Needed | col 2 / row 1 | auto (col 4) |
| placement: Pips | col 1 / row 2 | auto (col 2) |
| placement: Sources | col 2 / row 2 | auto (col 3) |

### Color name cell
| Property | Phone | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 8 | 8 |
| font-family | sans | sans |
| font-size | 13 | 13 |
| color | `var(--fg)` | `var(--fg)` |
| min-height | 18 | 18 |
| copy | color name (White … Green) | same |

### Pip disc (name cell)
| Property | Phone | Desktop |
|---|---|---|
| flex | none | none |
| width × height | 18 × 18 | 18 × 18 |
| border-radius | 50% | 50% |
| background | `var(--w)` / `var(--u)` / `var(--b)` / `var(--r)` / `var(--g)` | same |
| color (ink) | W `#14110E` · U `#F2F4F4` · B `#14110E` · R `#0B0B0E` · G `#F2F4F4` | same |
| display / align / justify | flex / center / center | flex / center / center |
| font-family | mono | mono |
| font-size | 10 | 10 |
| font-weight | 600 | 600 |
| content | letter `W U B R G` | same |

### Pips cell
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| gap | 4 | 4 |
| min-width | 0 | 0 |

### Mini label (Pips / Sources / Needed cells)
| Property | Phone | Desktop |
|---|---|---|
| rendered | yes | — |
| font-family | mono | — |
| font-size | 9 | — |
| letter-spacing | 0.12em | — |
| text-transform | uppercase | — |
| color | `var(--fg-locked)` | — |
| copy | `table.head.pips` / `.sources` / `.needed` (R3b; R3's Needed label read `Karsten`) | — |

### Pips bar line
| Property | Phone | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | 8 | 8 |

### Pips bar
| Property | Phone | Desktop |
|---|---|---|
| rendered | only when the color has pips | same |
| flex | none | none |
| height | 14 | 14 |
| min-width | 8 | 8 |
| width | `share / widestPipShare × 60%` | same |
| border-radius | 3 | 3 |
| background | the color's pip token | same |

### Pips figure
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 11 | 11 |
| white-space | nowrap | nowrap |
| color | `var(--fg-body)`; `var(--fg-locked)` when 0 | same |
| copy key | `table.share(n, pct)`; `0` when none | same |

### Pips "without" line (removed)
Removed 2026-10-11 (Hugh, Tuning line close-out): a figure without the commander does not help the
player, who still pays for the commander. Pips count the commander, and nothing is drawn under them.
Measured before removal: counting the commander's own cost in Needed and in Improve my mana's order
moves nothing on Gishath or Blood Rites (staging), so no headline figure changed with it.

### Sources cell
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| gap | 4 | 4 |
| min-width | 0 | 0 |

### Sources bar (the Colors card's `SourceBar`)
| Property | Phone | Desktop |
|---|---|---|
| rendered | only when sources > 0 (R3 `hasSrc`; R3b's fixture has no zero) | same |
| flex | none | none |
| display | flex | flex |
| gap | 1 | 1 |
| height | 14 | 14 |
| min-width | 8 | 8 |
| width | `sourceShare / widestPipShare × 60%` | same |
| border-radius | 3 | 3 |
| overflow | hidden | hidden |

### Sources bar — lands segment
| Property | Phone | Desktop |
|---|---|---|
| rendered | lands > 0 | same |
| flex | `{lands} 1 0` | same |
| min-width | 4 | 4 |
| background | the color's pip token (solid) | same |

### Sources bar — other segment
| Property | Phone | Desktop |
|---|---|---|
| rendered | other > 0 (R3 `hasO`; R3b unconditional) | same |
| flex | `{other} 1 0` | same |
| min-width | 4 | 4 |
| background-image | `repeating-linear-gradient(135deg, <pip> 0 2px, transparent 2px 5px)` | same |
| box-shadow | `inset 0 0 0 1px <pip>` | same |

### Sources figure
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 11 | 11 |
| white-space | nowrap | nowrap |
| color | `var(--fg-body)`; `var(--fg-locked)` when 0 (R3) | same |
| copy key | `table.share(n, pct)`; `0` when none; shares include colorless sources | same |

### Sources split line
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10 | 10 |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy key | `table.split(lands, other)`; R3: `{l} lands` alone, or `{o} other` alone, when the other part is 0 | same |
| conditional | absent when sources = 0 (R3) | same |

### Needed cell
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| gap | 3 | 3 |
| align-items | flex-end | flex-start |
| text-align | right | left |
| min-width | 0 | 0 |

### Needed figure
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 13 | 13 |
| font-weight | 500 | 500 |
| color | `var(--fg)`; `var(--fg-locked)` when `—` | same |
| content | the color's tightest cost shared by 2+ cards (DT R3a); `—` when the color has no pips | same |

### Needed caption
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10 | 10 |
| line-height | 1.45 | 1.45 |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy key | `table.neededFor(card, more, code)`; `table.noPips` when `—` | same |

### Colorless line
| Property | Phone | Desktop |
|---|---|---|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | center | center |
| gap | `6px 12px` | `6px 12px` |
| padding | `10px 2px` | `10px 2px` |
| border-bottom | `1px solid var(--border)` | `1px solid var(--border)` |
| conditional | rendered when the deck has colorless sources or `{C}` pips; absent in no-sources M7 (R3 `cLineOn: false`) | same |

### Colorless label
| Property | Phone | Desktop |
|---|---|---|
| display / align-items | flex / center | flex / center |
| gap | 8 | 8 |
| font-size | 13 | 13 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| copy | `Colorless` (literal in frame) | same |

### Colorless disc
| Property | Phone | Desktop |
|---|---|---|
| width × height | 18 × 18 | 18 × 18 |
| border-radius | 50% | 50% |
| background | `var(--fg-muted)` | `var(--fg-muted)` |
| color | `#14110E` | `#14110E` |
| display / align / justify | flex / center / center | flex / center / center |
| font-family | mono | mono |
| font-size | 10 | 10 |
| font-weight | 600 | 600 |
| content | `C` | `C` |

### Colorless figure
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 11 | 11 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| copy key | `table.colorless(pips, sources, pct)` (M6's frame draws `21 {C} pips · 17 sources` with no share) | same |

---

## Component: NeedsExplainer ("What Needs means", the `StripRationale` disclosure)

Placement: inside the table wrapper, after the colorless line (R3b F3 note: "moved up to under the color
table"). **[conflict]** DT R3a "place: under the Hardest costs heading" is superseded by R3b.

### Closed — trigger row
| Property | Phone | Desktop |
|---|---|---|
| role | button, `aria-expanded="false"` | same |
| align-self | flex-start | flex-start |
| margin-top | 8 | 8 |
| min-height | 44 | 32 |
| display / align-items | flex / center | flex / center |

### Closed — trigger text
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 11 | 11 |
| color | `var(--accent)` | `var(--accent)` |
| border-bottom | `1px solid var(--accent-dim)` | same |
| padding-bottom | 1 | 1 |
| copy key | `needs.toggle` | same |

### Open — panel
| Property | Phone | Desktop |
|---|---|---|
| drawn | not drawn at 390; same as desktop | F1 |
| margin-top | 10 | 10 |
| background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| border | `1px solid var(--border)` | same |
| border-left | `3px solid var(--accent)` | same |
| border-radius | 9 | 9 |
| padding | `11px 13px` | `11px 13px` |
| display / direction | flex / column | flex / column |
| gap | 7 | 7 |
| behavior | one tree for both states; focus returns to the trigger on Hide (DT) | same |

### Open — header row
| Property | Phone | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | baseline | baseline |
| justify-content | space-between | space-between |
| gap | 10 | 10 |

### Open — trigger
| Property | Phone | Desktop |
|---|---|---|
| role | button, `aria-expanded="true"` | same |
| font-family / size | mono / 11 | mono / 11 |
| color | `var(--accent)` | `var(--accent)` |
| border-bottom | — (no rule when open) | — |
| copy key | `needs.toggle` | same |

### Open — Hide
| Property | Phone | Desktop |
|---|---|---|
| role | button | button |
| font-family / size | mono / 11 | mono / 11 |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy key | `needs.close` | same |

### Open — paragraph (×2: Needs, Source)
| Property | Phone | Desktop |
|---|---|---|
| element | `p` | `p` |
| margin | 0 | 0 |
| font-size | 12 | 12 |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| text-wrap | pretty | pretty |
| lead-in | `b`, weight 600, `var(--fg)` | same |
| copy keys | `needs.needsLabel` + `needs.needsBody`; `needs.sourceLabel` + `needs.sourceBody` + link `needs.sourceLink` + `needs.sourceTail` | same |

### Link-out (TCGplayer) — shared with KarstenCitation
| Property | Phone | Desktop |
|---|---|---|
| element | `a`, `aria-label="TCGplayer, opens in a new tab"` | same |
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 4 | 4 |
| white-space | nowrap | nowrap |
| font-weight | 500 | 500 |
| color | `var(--accent)` | `var(--accent)` |
| text-decoration | none | none |
| hover color | `#6C95D8` (canvas global `a:hover`; no token) | same |

### Link-out glyph (SVG)
| Property | Phone | Desktop |
|---|---|---|
| aria-hidden | true | true |
| viewBox | `0 0 16 16` | `0 0 16 16` |
| width × height | 14 × 14 | 14 × 14 |
| display | block | block |
| flex | none | none |
| path d | `M6 3.5h6.5V10M12.5 3.5 4 12` | same |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.6 | 1.6 |
| stroke-linecap / linejoin | round / round | round / round |

---

## Component: ManaSection (Consider's `ShelfSection` header)

Two instances: Hardest costs, then Lands.

### Section wrapper
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| border-top | `1px solid var(--border-strong)` | same |
| margin-top | Hardest costs: —; Lands: `-6px` (net 12 from the panel's 18 gap) | same |

### Header (trigger)
| Property | Phone | Desktop |
|---|---|---|
| role | button, `aria-expanded` open/closed; `aria-controls` only while body mounted (DT) | same |
| display | flex | flex |
| align-items | center | center |
| gap | 8 | 10 |
| min-height | 52 | 44 |
| cursor | pointer | pointer |

### Chevron
| Property | Phone | Desktop |
|---|---|---|
| glyph | `▸` | `▸` |
| aria-hidden | true | true |
| display | inline-block | inline-block |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| transform | `rotate(0deg)` folded · `rotate(90deg)` open | same |
| transition | transform 150ms (DT) | same |

### Label + clause group
| Property | Phone | Desktop |
|---|---|---|
| display | flex | flex |
| flex-direction | column | row |
| align-items | baseline | baseline |
| column-gap | 10 | 10 |
| row-gap | 2 | 2 |

### Label
| Property | Phone | Desktop |
|---|---|---|
| font-family | sans | sans |
| font-size | 16 | 17 |
| font-weight | 600 | 600 |
| line-height | 1.2 | 1.2 |
| color | `var(--fg)` | `var(--fg)` |
| copy key | `sections.hardest.label` / `sections.lands.label` | same |

### Clause
| Property | Phone | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10.5 | 11 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| copy key | `sections.hardest.clause(colors)` (colors with a pip, W U B R G) / `sections.lands.clause(lands, tapped, count)` | same |
| must not | name, rank or order colors by comparison (DT) | same |

### Body container
| Property | Phone | Desktop |
|---|---|---|
| mounted | only when open | same |
| margin-top | 9 | 11 |
| default | folded; open/folded persisted per deck, restored on return (DT, ST) | same |

---

## Component: Hardest costs body (PatternRows)

### Body
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| gap | 10 | 10 |

### Color chips (radiogroup)
| Property | Phone | Desktop |
|---|---|---|
| role | `radiogroup`, `aria-label="Color"` | same |
| display | flex | flex |
| gap | 6 | 6 |
| flex-wrap | nowrap | wrap |
| overflow-x | — in R3b; R3 phone: `auto` + `scrollbar-width: none` (DT R3 "scroll sideways") **[conflict]** | — |
| conditional | one chip per color with a pip; absent when the deck has one color (R3 M2) | same |
| default selection | color with the most pips | same |

### Chip
| Property | Phone | Desktop |
|---|---|---|
| role | `radio`, `aria-checked` | same |
| flex | none | none |
| min-height | 44 | 30 |
| display / align-items | flex / center | flex / center |
| gap | 7 | 7 |
| padding | `0 12px` | `0 12px` |
| border-radius | 999 | 999 |
| font-size | 12 | 12 |
| font-weight | selected 600 · else 500 | same |
| color | selected `var(--bg)` · else `var(--fg-muted)` | same |
| background | selected `var(--fg-body)` · else transparent | same |
| border | `1px solid` selected `var(--fg-body)` · else `var(--border-strong)` | same |
| copy | color name | same |

### Chip dot
| Property | Phone | Desktop |
|---|---|---|
| width × height | 12 × 12 | 12 × 12 |
| border-radius | 50% | 50% |
| background | the color's pip token | same |

### Pattern table wrapper
| Property | Phone | Desktop |
|---|---|---|
| border-top | `1px solid var(--border)` | same |

### Pattern head row
| Property | Phone | Desktop |
|---|---|---|
| rendered | — | yes |
| display | — | grid |
| grid-template-columns | — | `72px minmax(0,1fr) 200px` |
| gap | — | 14 |
| padding | — | `8px 2px` |
| font-family / size | — | mono / 9.5 |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | `var(--fg-locked)` |
| border-bottom | — | `1px solid var(--border)` |
| cells / copy keys | — | `patterns.head.cost` · `.cards` · `.needed` (right-aligned) |

### Pattern row
| Property | Phone | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | `auto minmax(0,1fr) auto` | `72px minmax(0,1fr) 200px` |
| column-gap | 14 | 14 |
| row-gap | 5 | 5 |
| align-items | baseline | baseline |
| padding | `10px 2px` | `10px 2px` |
| border-bottom | `1px solid var(--border)` | same |
| count | at most 6 per color, most pips first | same |

### Code cell
| Property | Phone | Desktop |
|---|---|---|
| grid | col 1 / row 1 | col 1 / row 1 |
| display / align-items | flex / baseline | flex / baseline |
| gap | 6 | 6 |
| code font | mono 13 / 600 `var(--fg)` | same |
| copies font | mono 10 `var(--fg-faint)`; key `patterns.copies(n)` | same |

### Names cell
| Property | Phone | Desktop |
|---|---|---|
| grid | col `1 / -1` / row 2 | col 2 / row 1 |
| font-family | sans | sans |
| font-size | 12.5 | 12.5 |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| min-width | 0 | 0 |
| text-wrap | pretty | pretty |
| separator | `, ` between names, none after the last | same |

### Card name
| Property | Phone | Desktop |
|---|---|---|
| border-bottom | `1px dotted var(--accent)` | same |
| behavior | opens the card detail (DT) | same |

### Commander tag (R3)
| Property | Phone | Desktop |
|---|---|---|
| rendered | after the commander's name, preceded by a space | same |
| font-family / size | mono / 9 | mono / 9 |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-muted)` | same |
| border | `1px solid var(--border-strong)` | same |
| border-radius | 4 | 4 |
| padding | `0 4px` | `0 4px` |
| copy key | `patterns.commander` | same |

### +N more / show fewer (R3)
| Property | Phone | Desktop |
|---|---|---|
| rendered | when a row holds more than 3 names: 3 shown, then this; expands in place and reads `show fewer` | same |
| font-family / size | mono / 11 | mono / 11 |
| color | `var(--accent)` | `var(--accent)` |
| white-space | nowrap | nowrap |
| hit area | 44 tall (R3 note, DT) | — |
| copy key | `patterns.more(n)` / `patterns.fewer` | same |

### Needed figure (row)
| Property | Phone | Desktop |
|---|---|---|
| grid | col 3 / row 1 | col 3 / row 1 |
| justify-self | end | end |
| text-align | right | right |
| white-space | wraps only at ` · ` (each half nowrap, the dot kept on the first line), 2026-10-11: `You have 28 · Needs at most 26` is about 216px at mono 12 and ran past the 200px column | same |
| font-family / size | mono / 12 | mono / 12 |
| color | `var(--fg)`; `No published figure` in `var(--fg-muted)` (DT R3a) | same |
| copy key | `patterns.haveNeeds` · `patterns.haveNeedsAtMost` · `patterns.none` | same |

### Foot line
| Property | Phone | Desktop |
|---|---|---|
| font-family / size | mono / 10.5 | mono / 10.5 |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy key | `patterns.foot(color)` | same |

---

## Component: Lands body (LandFacts)

### Body
| Property | Phone | Desktop |
|---|---|---|
| display / direction | flex / column | flex / column |
| gap | 8 | 8 |

### Facts wrapper
| Property | Phone | Desktop |
|---|---|---|
| border-top | `1px solid var(--border)` | same |
| rows | six, in order: `lands.count` · `lands.always` · `lands.unless` · `lands.fetch` · `lands.average` · `lands.karsten` | same |

### Fact row
| Property | Phone | Desktop |
|---|---|---|
| display | grid | grid |
| grid-template-columns | `minmax(0,1fr) auto 16px` | `minmax(0,1fr) 64px minmax(0,1.3fr) 16px` |
| column-gap | 12 | 12 |
| row-gap | 2 | 2 |
| align-items | baseline | baseline |
| padding | `9px 2px` | `9px 2px` |
| min-height | 44 | 0 |
| border-bottom | `1px solid var(--border)` (R3b on the grid; R3 on a wrapper that also holds the names line) | same |

### Fact label
| Property | Phone | Desktop |
|---|---|---|
| grid | col 1 / row 1 | col 1 / row 1 |
| font-family / size | sans / 13 | sans / 13 |
| line-height | 1.4 | 1.4 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| min-width | 0 | 0 |

### Fact figure
| Property | Phone | Desktop |
|---|---|---|
| grid | col 2 / row 1 | col 2 / row 1 |
| justify-self | end | end |
| font-family / size / weight | mono / 13 / 500 | mono / 13 / 500 |
| color | `var(--fg)` | `var(--fg)` |
| content | counts; average MV to 2 decimals; land count to 1 decimal, unrounded; none-tapped reads `0`, never a dash | same |

### Fact comparison
| Property | Phone | Desktop |
|---|---|---|
| grid | col `1 / -1` / row 2 | col 3 / row 1 |
| font-family / size | mono / 11 | mono / 11 |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| copy | `of {n} cards` · `always` · kinds list · fetcher note · `lands.averageNote(commander)` · `lands.formula(avg, ramp)`; empty for a tapped row reading 0 (R3 M2) | same |

### Fact chevron (tapped rows)
| Property | Phone | Desktop |
|---|---|---|
| grid | col 3 / row 1 | col 4 / row 1 |
| justify-self | end | end |
| font-family / size | mono / 12 | mono / 12 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| glyph | `›` closed · `⌃` open (R3) | same |
| conditional | the three tapped rows only, and only when they hold names (R3; R3b draws `›` on all three unconditionally) | same |

### Tapped names line (R3, open)
| Property | Phone | Desktop |
|---|---|---|
| element | `p` | `p` |
| margin | 0 | 0 |
| padding | `0 2px 10px` | `0 2px 10px` |
| font-size | 12 | 12 |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| content | land names, comma-separated | same |
| conditional | only while that row is open (R3 M1 desktop: Enter tapped open) | same |

### Caveat
| Property | Phone | Desktop |
|---|---|---|
| font-family / size | sans / 12 | sans / 12 |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| max-width | 660 | 660 |
| text-wrap | pretty | pretty |
| copy key | `lands.caveat(ramp)`; no-sources M7 uses its own zero-ramp sentence | same |
| conditional | always shown, never behind an ⓘ | same |

---

## Component: Thin note (colorless, R3 M6)

### Box
| Property | Phone | Desktop |
|---|---|---|
| background | `var(--surface)` | `var(--surface)` |
| border | `1px solid var(--border-strong)` | same |
| border-radius | 10 | 10 |
| padding | `12px 14px` | `12px 14px` |
| display | flex | flex |
| align-items | flex-start | flex-start |
| gap | 10 | 10 |

### ⓘ disc
| Property | Phone | Desktop |
|---|---|---|
| flex | none | none |
| width × height | 18 × 18 | 18 × 18 |
| border-radius | 50% | 50% |
| border | `1px solid var(--fg-faint)` | same |
| color | `var(--fg-faint)` | same |
| display / align / justify | flex / center / center | same |
| font-family / size / weight | mono / 10.5 / 600 | same |
| content | `i` | `i` |

### Text
| Property | Phone | Desktop |
|---|---|---|
| flex | 1 | 1 |
| min-width | 0 | 0 |
| font-size | 12.5 | 12.5 |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-body)` | `var(--fg-body)` |
| text-wrap | pretty | pretty |
| copy key | `thin.colorless` | same |

---

## Component: KarstenCitation

### Line
| Property | Phone | Desktop |
|---|---|---|
| element | `p`, the panel's last child | same |
| margin | 0 | 0 |
| border-top | `1px solid var(--border)` | same |
| padding-top | 12 | 12 |
| font-size | 12 | 12 |
| line-height | 1.6 | 1.6 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| max-width | 700 | 700 |
| text-wrap | pretty | pretty |
| link | TCGplayer link-out, as NeedsExplainer | same |
| copy key | `cite.full`; colorless: `cite.landOnly` | same |

---

## State Coverage

| State | Trigger | What renders |
|---|---|---|
| On open (default) | tool opened, first visit | heading + sub, lead, table (Needed), colorless line, explainer closed, Hardest costs folded (▸ 0°), Lands folded, [door], citation. No section open by default; no color named or ranked (F3 / F3b) |
| Hardest costs open | header press | ▸ 90°, `aria-expanded="true"`, body mounted: chips (most pips selected), ≤6 pattern rows, foot (F3c, F1) |
| Hardest costs: chip change | chip press | rows and foot for that color; `aria-checked` moves |
| Lands open | header press | ▸ 90°, six fact rows + caveat (F1) |
| Tapped row open | press a tapped row with names | chevron `⌃`, names line under the row (R3 M1) |
| Folded state restored | return to the deck | each section's open/folded state as last left, per deck |
| Explainer closed | default | mono accent link with accent-dim rule, own row under the table |
| Explainer open | link press | accent-ruled panel: header (trigger + Hide), Needs and Source paragraphs with TCGplayer link (F1 desktop) |
| Explainer closed via Hide | Hide press | returns to closed; focus to trigger |
| One color | deck with one colored identity | one table row; Hardest costs has no chips (R3 M2) |
| Color with sources, no pips | e.g. Gishath blue/black | pips `0` in `--fg-locked`, no pip bar; Needed `—` in `--fg-locked` + `no pips to cast` |
| Long name list | pattern row with >3 names | 3 names + `+N more`; expanded shows all + `show fewer` |
| Commander in a row | commander's cost matches a pattern | name + `commander` tag |
| Figure kinds | per pattern | `You have N · Needs N` · `Needs at most N` · `No published figure` (`--fg-muted`) |
| Colorless | no colored pip in the deck (R3 M6 / M6b) | heading + sub; no lead; thin note (ⓘ); colorless line (`{C}` pips + sources); Lands block in full; land-only citation. No colored rows, no Hardest costs, no door. R3's frame still draws the desktop table head over zero rows **[conflict]**: ST forbids "a color table of zeros"; the explainer is not drawn (R3 had its Karsten note off here) |
| No sources | deck with no lands / mana sources (R3 M7 / M7b) | lead replaced by the no-lands sentence; rows for colors with pips; every source cell `0` in `--fg-locked`, no bar, no split line; Needed figures still show; no colorless line; Hardest costs not drawn in M7; Lands block with zeros and zero-ramp caveat; door stays; full citation |
| Failed count | read fails | R1 B8 / B8b, unchanged (out of this table's frames) |
