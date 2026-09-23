# Design Property Table — Analysis tab: the lifecycle surface (PR C2)

Package: `design/design_handoff_the99_analysis_tab/`. Hugh's rulings at the top of
`READINESS-r1-audit.md` (:24-52) override the handoff.

Sources:
- `Analysis Tab 1300.dc.html`: :97-104 (body, banner), :117-119 (CTA busy), :127 (grid), :182-188 (box head).
- `Analysis Tab 390.dc.html`: :102-109, :124-126, :139-145.
- `analysis-fixtures.js`: :197-204, :255-261, :272-345.
- `HANDOFF.md`: :50, 57-61, 91, 96-97, 110.
- `STATES-analysis-tab.md`: :12, 17-20, 47-50.
- `analysis-tab - copy strings.ts`: :51-71.
- `READINESS-r1-audit.md`: :24-52, 69, 87-90, 229-236, 258-259, 289.

`—` = explicitly absent. Omitted = unspecified.

## Component: Tab body column
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Padding | 18 16 32 | 24 30 40 |
| Layout | flex column, gap 22 | flex column, gap 28 |
| Banner position | first child, above everything | first child, above the 2fr/1fr grid, full width |
| Grid when stale | unchanged | unchanged |

## Component: Staleness banner (2i / 2d)
### Container
| Property | Mobile | Desktop |
|---|---|---|
| Condition | a held reading that is stale (2i) or whose re-read failed (2d) | same |
| Role | `role="status"`, not announced on load; 2d `role="alert"` (STATES:49 governs; see C4) | same |
| Layout | flex column, align stretch, gap 12 | flex row, align center, gap 18 |
| Padding | 14 15 | 14 16 14 20 |
| Radius | 11 | 11 |
| Background | `--surface-rail` | `--surface-rail` |
| Border | 1px `--border-strong` | same |
| Icon, glyph, accent stripe, "out of date" tag | — | — |
### Sentence
| Property | Mobile | Desktop |
|---|---|---|
| Element | `p`, margin 0 | `p`, margin 0, flex 1, min-width 0 |
| Type | 13px / 1.5 sans | 13.5px / 1.5 |
| Ink | `--fg-body` | `--fg-body` |
| Key | 2i `banner.stale`, 2d `banner.failedHeld` | same |
### Button
| Property | Mobile | Desktop |
|---|---|---|
| Width | full (stretch) | intrinsic, flex none, nowrap, row end |
| Min height | 44 | 36 |
| Padding / radius | 0 18 / 8 | 0 18 / 8 |
| Enabled | bg `--fg`, ink `--bg`, 600 14px | 600 13.5px |
| Label | 2i `banner.reanalyze`, 2d `banner.tryAgain` | same |
| Loading | undrawn; "disables in place" (STATES:19). Analogue `ctaBusy`: aria-disabled, bg `--elevated`, ink `--fg-faint`, label unchanged | same |

## Component: The held reading (2i, 2d)
| Property | Both widths |
|---|---|
| Composition | overview, box, climb, findings and mix, whole |
| Dimming, tags, provenance line, changed-cards list | — |
| Version row when stale | suppressed (fixtures:314) |
| Existing declaration answer | kept |
| 2d body | identical to 2i |
| Only visible change from fresh | the date line |

## Component: The date line
| Property | Mobile | Desktop |
|---|---|---|
| Type / ink | IBM Plex Mono 10px, `--fg-faint`, under the name | same |
| Asked | `analyzed.asked(when)`: relative under an hour, else the date | same |
| Committed | `analyzed.committed(version, date)`, only when fresh and pinned to version n (audit:87-90) | same |
| Stale | `analyzed.stale(date)`, always a date | same |
| Date format | main's `18 Sep` (audit finding 14), not `18 Sept` | same |

## Component: Declaration ask on a stale range
| Property | Both widths |
|---|---|
| No answer yet | chips withheld until the re-read; nothing drawn in their place (HANDOFF:91; audit:69, 258-259) |
| An answer exists | the answer and its `change` stay |
| Server | `declareBracket` refuses on a dirty profile (plan C2) |

## Component: Header and tile chip when stale
| Property | Both widths |
|---|---|
| 2i, 2d | holds the last bracket (ruling 4, reverses #877) |
| Staleness mark | — |

## Component: Illegal (partial) deck — undrawn, Hugh's ruling
| Property | Both widths |
|---|---|
| Never analyzed | Analyze disabled (`ctaBusy` look) with the line `Analysis needs a full deck: {built} of {size}.` in the empty state's CTA row |
| Held reading | the reading stays; the banner's Re-analyze disabled, the same line in the banner's sentence slot |
| Copy | `deckAnalysisCopy.panel.illegal(built, size)`; no handoff string exists for it, so its wording goes to `/copy-review` |

## State coverage
| State | Trigger | Renders |
|---|---|---|
| 2a / 2b / 2c | no reading / loading / failed, nothing held | the empty state (PR B) |
| 2e–2h | fresh | grid, no banner |
| 2i | stale (dirty, or the list moved) | banner + Re-analyze; reading whole; stale date; chip holds; version row off; unanswered range chips withheld |
| Loading over a held reading | Re-analyze pressed | button disabled in place, reading stays |
| 2d | re-read failed over a held reading | banner + Try again, same body |
| Illegal | built ≠ size | as above |

## Conflicts noted
| # | Conflict | Resolution |
|---|---|---|
| C1 | chip holds vs #877's hide | Hugh: holds |
| C2 | lapses on catalog/age | Hugh: player edits only (C1) |
| C3 | `18 Sept` vs `18 Sep` | `18 Sep` |
| C4 | STATES:49 says a failure is `role="alert"`; frames draw `status` for 2d | STATES prose governs: 2d `alert` |
| C5 | banner loading look undrawn | `ctaBusy` analogue |
| C6 | nothing in place of withheld chips | withhold, keep an existing answer |
| C7 | HANDOFF:97 "a committed reading never goes stale" | the committed line only when fresh and pinned |
| C8 | "We couldn't" vs shipped "We could not" | `/copy-review` |
| C9 | illegal deck absent from the handoff | Hugh's ruling; placement by analogue |
| C10 | superseded `stale.*`, `provenance.*` keys | not shipped |
