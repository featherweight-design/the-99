# Design Property Table — Home resume row: the bracket chip (addendum §C)

Package: `design/design_handoff_the99_home/addendum-bracket-chip/` (pass 2)
Sources: `README.md` §"The row (C)", §"The chip, marks only (R1)", §"Measurements (F1)", §"Cases drawn (F6)", §"Data and engineering"; `READINESS-audit.md` (F1, F4, F5, F6; Revision 2 N1–N6; rulings R1 = marks only, R2 = C); `The 99 - Home · Bracket Chip Addendum.dc.html` section `#c` and its `frames2` / `pill` / `chip` builders.
Precedence: audit corrections (F1, F4, F5, N2–N6) > README §C > canvas §C. Section B (fallback) and the canvas H1/intro (which describe B, per N2) are NOT enumerated.
Breakpoints: Mobile = 360 / 390 (stacked rows). Desktop = 1180 / 1300 (2×2, rows `basis-[calc(50%-6px)]`, gap 12). `md` = 768 (chip + line-two height step). Inset step at 1000; right-padding step at 1180.
Values quoted as Tailwind classes where the README gives them; px otherwise. Hex values in the canvas are the canvas theme; ship the tokens.

## Component: ResumeRow (`Link`)

### Row container (`Link`)
| Property | Mobile | Desktop |
|---|---|---|
| height | `h-[72px]` (unchanged) | `h-[72px]` (unchanged) |
| padding-top / bottom | `py-[4px]` (was 10) | `py-[4px]` (was 10) |
| padding-right | `pr-[10px]` | `min-[1180px]:pr-[18px]` |
| padding-left | 0 | 0 |
| display | flex | flex |
| align-items | center | center |
| position | relative | relative |
| overflow | `overflow-hidden` | `overflow-hidden` |
| border | 1px solid `--border` | 1px solid `--border` |
| border-radius | 12px | 12px |
| background | `--surface-inset` | `--surface-inset` |
| content box height | 62px (72 − 8 − 2) | 62px |
| row width (measured) | 328 at 360 · 358 at 390 | 359 at 1180 · 419 at 1300 |
| line width (row − 2 − pr − inset) | 208 at 360 · 238 at 390 | 223 at 1180 · 283 at 1300 |

### Art portrait (`ArtWash`)
| Property | Mobile | Desktop |
|---|---|---|
| height | 72 | 72 |
| width | 99px portrait | 99px portrait |
| position | absolute, left 0, top 0, bottom 0 | absolute, left 0, top 0, bottom 0 |
| labelAtPx | `"flat"` | `"flat"` |
| changes | — (unchanged) | — (unchanged) |

### Wash gradient (unchanged, canvas reference)
| Property | Mobile | Desktop |
|---|---|---|
| width | inset + 24 = 132 | inset + 24 = 140 |
| background | `linear-gradient(90deg, transparent 50px, var(--surface-inset) 108px)` | `linear-gradient(90deg, transparent 50px, var(--surface-inset) 116px)` |

### Text column
| Property | Mobile | Desktop |
|---|---|---|
| padding-left | `pl-[108px]` | `min-[1000px]:pl-[116px]` |
| display / direction | flex / column (`flex-col`) | flex / column |
| gap | `gap-[4px]` (already shipped; N6: no change) | `gap-[4px]` |
| flex | 1 | 1 |
| min-width | 0 | 0 |
| position | relative | relative |
| stacked height | 17.4 + 4 + 22 + 4 + 12.6 = 60 in 62 | 17.4 + 4 + 24 + 4 + 12.6 = 62 in 62 |
| lines | 3, on every row (chip or not) | 3, on every row |

### Line 1 — name and stamp (unchanged)
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 8px | 8px |
| min-width | 0 | 0 |
| name · family | Cinzel (display) | Cinzel |
| name · size / weight / line-height | 14.5px / 600 / 1.2 | 14.5px / 600 / 1.2 |
| name · color | `--fg` | `--fg` |
| name · truncation | min-w-0, overflow hidden, ellipsis, nowrap | same |
| stamp · family / size | mono / 10.5px | mono / 10.5px |
| stamp · line-height | inherited (1.5, per N3) | inherited |
| stamp · color | `--fg-locked` | `--fg-locked` |
| stamp · layout | `ml-auto flex-none`, nowrap | `ml-auto flex-none`, nowrap |

### Line 2 — plates and commander
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | `gap-[14px]` | `gap-[14px]` |
| min-width | `min-w-0` | `min-w-0` |
| height | `h-[22px]` (N4: set on the line itself, every row incl. no chip) | `md:h-[24px]` |

### Line 2 · plates group
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | `gap-[8px]` | `gap-[8px]` |
| flex | `flex-none` | `flex-none` |
| children | `StatusPillBadge`, then `BracketChip face={false}` when `deck.bracket` set | same |
| widest content (Unresolved + 8 + range) | 139 | 139 |

### Line 2 · StatusPillBadge (as shipped)
| Property | Mobile | Desktop |
|---|---|---|
| height | 19px | 19px |
| display / align | flex / center, `flex-none` | same |
| padding | 0 7px | 0 7px |
| border | 1px solid `--border-strong` | same |
| border-radius | 5px | 5px |
| family / size | mono / 10px | mono / 10px |
| color | status token (`--accent` To buy · `--warning` Unresolved · `--success` Complete) | same |
| background | `color-mix(in srgb, <status token> 18%, var(--bg))` | same |
| white-space | nowrap | nowrap |
| width incl. border | Complete 64 · To buy 52 · Unresolved 76 | same |
| aria-hidden | `true` when a chip is drawn (F4); a chip-less row keeps the pill spoken, having no sr-only line to replace it | same |

### Line 2 · commander
| Property | Mobile | Desktop |
|---|---|---|
| layout | `min-w-0 flex-1 truncate` (flex 1 1 0; only child on the line that shrinks) | same |
| family / size | mono / 10.5px | mono / 10.5px |
| color | `--fg-body` | `--fg-body` |
| pair row | the pair spans, as shipped, in this slot | same |
| kept width · Unresolved + range | 55 at 360 · 85 at 390 | 70 at 1180 · 130 at 1300 |
| kept width · Complete + range | 67 · 97 | 82 · 142 |
| kept width · To buy + single | 106 · 136 (audit; README's 110/140 is a slip) | 121 · 181 |
| kept width · Unresolved, no chip | 118 · 148 | 133 · 193 |
| kept width · To buy, no chip | 142 · 172 | 157 · 217 |

### Line 3 — bar and count
| Property | Mobile | Desktop |
|---|---|---|
| display | flex | flex |
| align-items | center | center |
| gap | `gap-[10px]` | `gap-[10px]` |
| min-width | `min-w-0` | `min-w-0` |
| line-height | 1.2 (12.6px at 10.5) | 1.2 |

### Line 3 · progress bar track
| Property | Mobile | Desktop |
|---|---|---|
| layout | `flex-1 min-w-0` (flex 1 1 0) | same |
| height | `h-[3px]` | `h-[3px]` |
| border-radius | `rounded-[2px]` | `rounded-[2px]` |
| background | `--border-strong` (N5: not the tile's `--border`) | `--border-strong` |
| overflow | hidden | hidden |
| width (count group 111 + 10) | 87 at 360 · 117 at 390 | 102 at 1180 · 162 at 1300 |

### Line 3 · progress bar fill
| Property | Mobile | Desktop |
|---|---|---|
| style | `statusBarStyle(status, built, bodySize)` | same |
| ink | status token | status token |
| height | 100% of track | 100% |
| width | built / bodySize | built / bodySize |
| built = 0 | fill omitted, empty track drawn (N5, tile's `built > 0` rule) | same |

### Line 3 · count group
| Property | Mobile | Desktop |
|---|---|---|
| layout | `flex-none flex gap-[4px] whitespace-nowrap` | same |
| family / size | mono / 10.5px | mono / 10.5px |
| color | `--fg-faint` | `--fg-faint` |
| shrink / truncation | — (nothing shrinks or truncates) | — |
| child 1 | `{built} / {bodySize}` (e.g. `99 / 99`, 44px) | same |
| child 2 | `· {detailCopies(copies)}` (e.g. `· 12 cards`, 63px) | same |
| child 2 present when | roll-up entry exists AND not a pair (`:110`, unchanged) | same |
| width with clause | 111 | 111 |

## Component: BracketChip `face={false}` (marks only, R1)

### Chip container
| Property | Mobile | Desktop |
|---|---|---|
| new prop | `face?: boolean`, default `true`; row passes `face={false}` | same |
| face span | — (dropped when `face={false}`) | — |
| padding | `pl-[2px] pr-[2px]` | `pl-[2px] pr-[2px]` |
| display / align | inline-flex / center, `flex-none` | same |
| gap | 5px (shipped) | 5px |
| height | 22px (shipped) | 24px from `md` (shipped) |
| border-radius | 6px | 6px |
| background (plate) | `color-mix(in srgb, <lower-rank ink> 12%, var(--bg))` | same |
| border (hairline) | 1px, `color-mix(in oklab, <lower-rank ink> 55%, transparent)` | same |
| ink token | `--bracket-{low}` | same |
| width incl. hairline | 28 single · 55 range | 28 · 55 |
| mount | `BracketChip` directly (not `SpineBracketChip`) | same |
| one mark vs two | decided by `verdictHead` | same |

### Mark(s) (`BracketMark`)
| Property | Mobile | Desktop |
|---|---|---|
| size | 22 × 22px (`CHIP_MARK_PX`) | 22 × 22px |
| display | block | block |
| lower mark opacity | 1 | 1 |
| upper mark (range) opacity | 0.65 (`dim`) | 0.65 |
| decorative | yes (canvas `alt=""`); bracket name goes to the sr-only span | same |
| drawn through | `BracketMark` (not the canvas `*-chip-ink.svg` stand-ins) | same |

### Accessible status (F4)
| Property | Mobile | Desktop |
|---|---|---|
| element | `sr-only` span in the pill's place | same |
| content | `refreshCopy.decks.statusWithBracket(status, verdictHead(...).face)` | same |
| new string | — (none) | — |

## Data wiring
| Property | Mobile | Desktop |
|---|---|---|
| page query | `listDecksWithStats(..., { ..., includeBracket: analysisTabEnabled() })` at `src/app/page.tsx:112-116` | same |
| flag off | every `deck.bracket` null → no chip | same |
| revalidate after Analyze | add `"/"` to the deferred `after()` revalidate beside `"/decks"` (`profile-actions.ts:82`, F5) | same |
| new token / mark / copy | — | — |
| About entry | — (cosmetic) | — |

## State Coverage
| State | Line 2 | Line 3 | Mobile | Desktop |
|---|---|---|---|---|
| No chip (`bracket` null; canvas: `To buy`, `87 / 99 · 12 cards`) | pill only; line still 22/24 tall; commander 142 / 172 | bar + `87 / 99 · 12 cards` | three lines, same shape as chip rows | same; no offset in a mixed pair |
| Single mark (`[3]` Upgraded; `To buy`, `95 / 99 · 4 cards`) | pill + 8 + chip 28; commander 106 / 136 | bar + count + clause | chip 22 tall | chip 24 tall; commander 121 / 181 |
| 4–5 range (unanswered; `Unresolved`, `99 / 99 · 12 cards`, longest name + stamp) | pill + 8 + chip 55, rank-4 plate, rank-5 mark at 0.65; commander 55 / 85 | bar full + whole count | nothing clips at 360 | commander 70 / 130 |
| Range 1–2 | same geometry as 4–5 (55 wide), `--bracket-1` plate | same | same | same |
| Unreachable range (e.g. 3–4) | — (no chip; `tileBracket` returns null) | unchanged | — | — |
| Pair row | pair spans take the commander slot (55 / 85 worst) | clause absent (pair rule, unchanged); count only | `+ …` still fits at 360 | 70 / 130 worst |
| Empty deck (built 0) | unchanged | empty track, no fill (N5); `0 / {bodySize}` | same | same |
| Chip reads | pill `aria-hidden`; sr-only `statusWithBracket(status, face)` | — | same | same |
