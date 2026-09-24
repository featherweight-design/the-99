# Design Property Table — All brackets sheet

Sources: `design/design_handoff_the99_analysis_tab/addendum-brackets-sheet/` — `README.md` (R3 + "Entry point (1a)" + the unsuperseded R1 "Chrome" lines), `READINESS-audit.md` (Revision 2, Hugh's rulings), `brackets-sheet · copy strings.ts`, `Brackets Sheet.dc.html` (body component), and `The 99 - Brackets Sheet.dc.html` canvas 1a / 2a for the climb. R1's grid, aside and reader marking are superseded by R3 and not enumerated. Mono = `'IBM Plex Mono'`; body face = `'IBM Plex Sans'`; display = `var(--display)`.

## 1. Climb foot link — `see all brackets →` (rest)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Copy | `see all brackets` + `→` (arrow `aria-hidden`) | same |
| Placement | Foot row under the rungs box, right edge (`justify-content:flex-end`), every analyzed climb | same |
| Foot row min-height | 44px | 0 |
| Foot row margin | `-4px -8px -6px 0` | 0 |
| Hit area display | `inline-flex`, align-items center | same |
| Hit area min-height | 44px | 28px |
| Hit area padding | `0 8px` | `0 8px` |
| Hit area radius | 6px | 6px |
| Hit area background | transparent | transparent |
| Font family | mono | mono |
| Font size | 11px | 11px |
| Color | `var(--accent)` | `var(--accent)` |
| Underline | `border-bottom: 1px dotted var(--accent)` | same |
| ARIA | `aria-haspopup="dialog"` | same |
| State | Local, not persisted | same |

## 2. Climb foot link — hover / pressed

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Trigger | Pressed only | Pressed and hover |
| Color | `var(--accent-hover)` | `var(--accent-hover)` |
| Underline | `border-bottom: 1px solid var(--accent-hover)` | same |
| Hit area background | `color-mix(in oklab, var(--accent) 12%, transparent)` | same |
| Hit area radius | 6px | 6px |

## 3. Climb foot link — focus

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Focus-visible | The climb's 2px `var(--accent)` ring | same |
| On sheet close | Focus returns to the link | same |

## 4. Sheet chrome (`ModalChrome`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Component | `ModalChrome`, unchanged, no new props | same |
| Width | 390 (sheet) | `width={700}` |
| Position | Sheet from 52px top | Centered modal |
| Background | `var(--surface-raised)` | `var(--surface-raised)` |
| Border | `border-top: 1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| Radius | `14px 14px 0 0` | 14px |
| Shadow | — | `0 24px 60px rgba(0,0,0,0.45)` |
| Header height | 43px (pinned) | auto |
| Header padding | `0 6px 0 16px` | `14px 18px` |
| Header gap | 9px | 10px |
| Header border | `border-bottom: 1px solid var(--border)` | same |
| Title copy | `All brackets` | same |
| Title family / weight | `var(--display)` / 700 | same |
| Title size / line-height | 15px / 1.2 | 16px / 1.2 |
| Title color | `var(--fg)` | same |
| Title white-space | nowrap | nowrap |
| Aside | None (removed in R3) | None |
| Mark | None (`mark` optional) | None |
| Close label | `aria-label="Close all brackets"` | same |
| Close box | 44×44, `margin-right:-10px` | same |
| Close glyph | `×`, mono 14px, `var(--fg-faint)` | same |

## 5. Body container

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Padding | `14px 16px 24px` | `16px 18px 18px` |
| Layout | flex column | flex column |
| Gap | 12px | 14px |
| Overflow | `overflow-y: auto` | same |

## 6. Lead paragraph

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Copy | `What each bracket allows in a deck, then how we read each rule, with one line of Wizards' own under it.` | same |
| Family | body (Plex Sans) | same |
| Size / line-height | 12.5px / 1.6 | 12.5px / 1.6 |
| Color | `var(--fg-body)` | same |
| Margin | 0 | 0 |
| Text-wrap | pretty | pretty |

## 7. Wide table (desktop only) — container and rows

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Drawn | No (transposed table, §8) | Yes |
| Role / label | — | `role="table"`, `aria-label="Cards allowed by bracket"` |
| Border | — | `1px solid var(--border)` |
| Radius | — | 10px, overflow hidden |
| Row grid | — | `168px repeat(5, minmax(0,1fr))` (~98px per column) |
| Row separator | — | `border-top: 1px solid var(--border)` on each rule row |
| Row order | — | Game changers, Mass land denial, Extra turns, Two-card infinites |

### 7a. Corner cell

| Property | Mobile | Desktop |
|---|---|---|
| Copy | — | `cards allowed` |
| Padding | — | `10px 10px 11px 12px` |
| Align-self | — | end |
| Family / size | — | mono / 9px |
| Letter-spacing | — | 0.14em |
| Text-transform | — | uppercase |
| Color | — | `var(--fg-faint)` |

### 7b. Column header (bracket)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | — | flex column, align flex-start |
| Gap | — | 6px |
| Padding | — | `11px 8px` |
| Mark | — | Chip mark 22px, color `var(--bracket-N)` |
| Name size / weight / lh | — | 12px / 600 / 1.2 |
| Name color | — | `var(--fg-body)` |
| Name white-space | — | nowrap |
| Names | — | Exhibition, Core, Upgraded, Optimized, cEDH |

### 7c. Row header (rule)

| Property | Mobile | Desktop |
|---|---|---|
| Layout | — | flex row, align center |
| Gap | — | 8px |
| Padding | — | `11px 10px 11px 12px` |
| Mark | — | Fact mark 16px, `var(--fact)` |
| Name size / weight / lh | — | 12.5px / 600 / 1.3 |
| Name color | — | `var(--fg)` |
| Name white-space | — | nowrap |

### 7d. Cells

| Property | Mobile | Desktop |
|---|---|---|
| Cell padding | — | `11px 8px`, flex align center |
| Figure (0 etc.) family / size / weight | — | mono / 12px / 400 |
| Figure color | — | `var(--fg-body)` |
| The `3` size / weight | — | 12px / 600 |
| The `3` color | — | `var(--fg)` (only `--fg`/600 figure) |
| No cap copy | — | `no cap` (`climb.noCap`) |
| No cap family / size / weight | — | mono / 10.5px / 400 |
| No cap color | — | `var(--fg-faint)` |
| No cap underline | — | `border-bottom: 1px dashed var(--border-dashed)` |
| White-space | — | nowrap |
| Values (brackets 1–5) | — | GC `0 0 3 cap cap`; MLD `0 0 0 cap cap`; ET `0 cap cap cap cap`; 2CI `0 0 cap cap cap` |

## 8. Phone transposed table (mobile only)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Drawn | Yes | No |
| Role / label | `role="table"`, `aria-label="Cards allowed by bracket"` | — |
| Border / radius | `1px solid var(--border)` / 10px, overflow hidden | — |
| Row grid | `116px repeat(4, minmax(0,1fr))` (~60px per column) | — |
| Row separator | `border-top: 1px solid var(--border)` on each bracket row | — |
| Corner copy | `cards allowed` | — |
| Corner padding | `10px 6px 10px 11px`, align-self end | — |
| Corner type | mono 8.5px, 0.1em, uppercase, `var(--fg-faint)` | — |
| Column header (rule) layout | flex column, align flex-start, gap 6px, padding `10px 4px` | — |
| Column header mark | Fact mark 16px, `var(--fact)` | — |
| Column header label | mono 8.5px, lh 1.3, 0.04em, uppercase, `var(--fg-body)`, wraps | — |
| Row header (bracket) layout | flex, align center, gap 7px, padding `9px 6px 9px 11px` | — |
| Row header mark | Chip mark 22px, `var(--bracket-N)` | — |
| Row header name | 11.5px / 600, `var(--fg-body)`, nowrap | — |
| Cell padding | `9px 4px`, flex align center | — |
| Figure | mono 11.5px / 400, `var(--fg-body)`, nowrap | — |
| The `3` | mono 11.5px / 600, `var(--fg)` | — |
| No cap | mono 10px / 400, `var(--fg-faint)`, `border-bottom: 1px dashed var(--border-dashed)`, nowrap | — |

## 9. Notes list

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container | flex column | same |
| Entries (order) | Game changers, Mass land denial, Extra turns, Two-card infinites, Tutors, Optimized and cEDH | same |
| Row grid | `40px 1fr` | `48px 1fr` |
| Row gap | 8px | 10px |
| Row padding | `12px 0` | `12px 0` |
| Row border | `border-top: 1px solid var(--border)`; none on first | same |
| Mark column | flex, gap 4px, padding-top 1px | same |
| Mark (rules, tutors) | Fact mark 16px, `var(--fact)` | same |
| Mark (Optimized and cEDH) | Two chip marks 20px, `var(--bracket-4)` and `var(--bracket-5)` | same |
| Text column | flex column, gap 5px, min-width 0 | same |
| Name line | flex wrap, align center, gap `6px 10px` | same |
| Name | 12.5px / 600 / 1.3, `var(--fg)` | same |
| Chip (Tutors only) | `no limit`, mono 8.5px, 0.1em, uppercase, `var(--fg-faint)`, `1px solid var(--border-strong)`, radius 999px, padding `2px 6px`, nowrap | same |
| Reading (if any; none for Mass land denial) | 12px / 1.55, `var(--fg-muted)`, margin 0, text-wrap pretty | same |
| Quote | Plex Sans italic 400, 11.5px / 1.5, `var(--fg-body)`, margin 0, text-wrap pretty, curly quotes `“…”`, 5px under reading (column gap) | Plex Sans italic 400, 12px / 1.5, same otherwise |
| Tag | Same line as quote; `margin-left: 8px`, font-style normal, mono 9px, 0.04em, `var(--fg-faint)`, nowrap | mono 9.5px, otherwise same |
| Tag copy | `Wizards · Feb 2025` (Tutors: `Wizards · Oct 2025`) | same |

## 10. Foot

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Container | flex column, gap 4px, `border-top: 1px solid var(--border)`, padding-top 12px | same |
| Title line copy | `Commander Brackets beta update, February 9, 2026` (`BRACKET_RULES_SOURCE.title`) | same |
| Title line | 12px / 1.5, `var(--fg-muted)` | same |
| Row 2 layout | flex wrap, align center, gap `6px 14px` | same |
| Source link copy | `Wizards of the Coast ↗` | same |
| Source link | inline-flex, align center, mono 10.5px, `var(--accent)`, underline `border-bottom: 1px solid var(--accent)` on the text span, new tab | same |
| Source link min-height | 44px | 0 |
| Checked line | `Rules as published, checked 22 Sep 2026.` mono 10.5px, `var(--fg-faint)` | same |
| Row 3 layout | flex wrap, align center, gap `0 14px` | same |
| `Quoted from` | mono 10.5px, `var(--fg-faint)` | same |
| Quote links | `Feb 2025 ↗` (introducing-commander-brackets-beta), `Oct 2025 ↗` (…-update-october-21-2025); same style as source link | same |
| Quote link min-height | 44px | 0 |

## 11. Climb yours rung — text colours (R2 2a)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Rung border | `1px solid var(--bracket-N)` (unchanged) | same |
| Rung background | `color-mix(in oklab, var(--bracket-N) 12%, var(--surface))` (unchanged) | same |
| Rung radius / padding | 8px / `11px 12px` | 8px / `11px 12px` |
| Mark | `var(--bracket-N)` ink (unchanged) | same |
| Bracket name color | `var(--fg)` | `var(--fg)` |
| Role label copy | `your cards` | `where your cards are` |
| Role label type | mono 8.5px, 0.1em, uppercase, nowrap, `margin-left:auto` | mono 9px, 0.1em, uppercase, nowrap |
| Role label color | `var(--fg)` | `var(--fg)` |
| Allowances rule name | mono 10.5px, `var(--fg)` | same |
| Allowances count | mono 13px / 600, `var(--fg)` | same |
| `N allowed` label | mono 9.5px, `var(--fg-faint)` (unchanged) | same |
