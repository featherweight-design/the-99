# Design Property Table — Analysis tab: the tab with a current reading (PR B)

Sources, in precedence: `READINESS-r1-audit.md` (Hugh's rulings; findings 6, 13, 14, 17, 21; §9 PR B row) > `HANDOFF.md` §2, §6 > `STATES-analysis-tab.md` §A, §B, §C, §E > `analysis-tab - copy strings.ts` > `analysis-fixtures.js` > frames `Analysis Tab 1300.dc.html` (`1300:N`) / `Analysis Tab 390.dc.html` (`390:N`) / canvas `The 99 - Analysis Tab.dc.html`.

Frame tokens map to main (finding 21): `var(--display)` = `font-display` / `--font-display-face`; `'IBM Plex Mono'` = app mono; `'IBM Plex Sans'` = app sans. "bone" = `background: var(--fg); color: var(--bg)`.

Out of scope: banner (2d/2i), stale/committed date forms, header chips, all sheets, Overview paragraph and View full synopsis.

---

## Component: Tab body (`AnalysisPanel` outer)

### Tab body container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Padding-top | 18px (`pt-[18px]`) | 24px (`md:pt-6`) |
| Padding-x | 16px (`px-[16px]`) | 30px (`md:px-[30px]`) |
| Padding-bottom | 32px (`pb-[32px]`) | 40px (`md:pb-10`) |
| Layout | flex column | flex column |
| Gap between blocks | 22px (`390:102`) | 28px (`1300:97`) |
| Gutter rule | the tab row's own (16) | the tab row's own (30), canvas Ruling 2 |

### Block order, with a reading (2e–2h)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Overview section | — (finding 6: dropped entirely; `SynopsisSlot` deleted; no placeholder) | — |
| 1st | Bracket box | Top grid: left column = climb, right column = bracket box |
| 2nd | Climb | Findings, full width |
| 3rd | Findings | Recommended mix, full width under a rule |
| 4th | Recommended mix (last) | — |

### Block order, before a reading (2a–2c)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| 1st | Empty state, full width | Empty state, full width |
| 2nd | Recommended mix (frame draws it outside the `ready` condition, `390:272`) | Recommended mix (`1300:272`) |
| 2fr/1fr grid | — (withheld) | — (withheld: "no empty bracket box beside it", canvas 2a) |
| Bracket box / climb / findings | — | — |
| Skeletons / reserved space | — (HANDOFF §6.2) | — |

---

## Component: Top grid (with a reading)

### Grid container
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Display | no grid; blocks stack in the body column (gap 22px) | grid (`1300:127`) |
| grid-template-columns | — | `minmax(0,2fr) minmax(0,1fr)` |
| Gap | — | 30px |
| align-items | — | start |

### Left column
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | — | flex column, `min-width: 0`, gap 26px (`1300:129`) |
| Contents | — | Climb leads (finding 6; audit §8.1 "as drawn") |

### Right column
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Contents | — | Bracket box |

---

## Component: Empty state (2a / 2b / 2c)

### Section
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column (`390:113`) | flex column (`1300:108`) |
| Gap (label → composition) | 7px | 8px |
| Width | full | full |

### "Overview" label (h3)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Text | `Overview` | `Overview` |
| Family | mono | mono |
| Size | 9.5px | 10px |
| Weight | 400 | 400 |
| Letter-spacing | 0.14em | 0.16em |
| Transform | uppercase | uppercase |
| Color | `var(--fg-faint)` | `var(--fg-faint)` |
| Margin | 0 | 0 |

### Composition row
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, `align-items: center`, `text-align: center` (`390:115`) | flex row, `align-items: flex-start`, `justify-content: center` (`1300:110`) |
| Gap | — (the heading's margin-top 22px does the spacing) | 40px (ring ↔ text) |
| Padding | 22px 4px 8px | 28px 24px 18px |
| Order | ring above the text | ring left, text right |

### Ring (the five marks)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Box | 150 × 150px, `position: relative`, block, `flex: none` | same |
| Margin | `0 auto` | 0 |
| aria-hidden | true (finding 17) | true |
| Radius | 50px | 50px |
| Mark size | 44px, full form (not chip art) | 44px |
| Mark ink | `color: var(--bracket-{n})` | same |
| Order | 1 at twelve o'clock, clockwise | same |
| Mark 1 (left, top) | 53px, 3px | 53px, 3px |
| Mark 2 | 101px, 38px | 101px, 38px |
| Mark 3 | 82px, 93px | 82px, 93px |
| Mark 4 | 24px, 93px | 24px, 93px |
| Mark 5 | 5px, 38px | 5px, 38px |
| Formula | absolute; left = round(75 + 50·cos t − 22), top = round(75 + 50·sin t − 22), t = −π/2 + i·2π/5 (fixtures `:225-236`) | same |
| Opacity, 2a idle | 1 | 1 |
| Opacity, 2b loading | 0.22 base, animated | same |
| Opacity, 2c failed | 0.3, still | same |
| Below DIM_OPACITY 0.65 | exempt, with the exemption recorded in code (finding 17) | same |

### Ring animation (2b)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Name | `at-wave` (to be added to `globals.css`, finding 21) | same |
| Keyframes | `0%, 100% { opacity: 0.22 } 35% { opacity: 1 } 60% { opacity: 1 }` | same |
| Duration | 1.6s | 1.6s |
| Timing | ease-in-out | ease-in-out |
| Stagger | `i × 0.16s`: 0 / 0.16 / 0.32 / 0.48 / 0.64s for marks 1–5 | same |
| Iteration | infinite | infinite |
| Applied to | each mark's positioned wrapper | same |
| Reduced motion | static, full ink (opacity 1); only the heading changes | same |
| Shimmer / skeleton | — | — |

### Text column
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, `align-items: center` | flex column, `flex: 1`, `min-width: 0` |
| Max-width | — | 640px |

### Heading (h2)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Family | `var(--display)` → `font-display` | same |
| Size | 21px | 26px |
| Weight | 700 | 700 |
| Line-height | 1.25 | 1.25 |
| Color | `var(--fg)` | `var(--fg)` |
| text-wrap | balance | balance |
| Margin | 22px 0 0 | 0 |
| Live region | frame: `aria-live="polite"`; the loading heading is the live region | same |
| 2a | `Five brackets. Your cards pick which.` | same |
| 2b | `Working out your bracket…` (U+2026) | same |
| 2c | `We could not finish reading this deck.` | same |

### Body paragraph(s)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Size | 13.5px | 14.5px |
| Line-height | 1.6 | 1.65 |
| Color | `var(--fg-body)` | `var(--fg-body)` |
| Max-width | 540px | 540px |
| text-wrap | pretty | pretty |
| Margin, 1st paragraph | 11px 0 0 | 12px 0 0 |
| Margin, 2nd paragraph | 9px 0 0 | 10px 0 0 |
| 2a, 1st | `One pass over your list against the Commander Format Panel's rules, and we'll tell you which brackets your cards permit, and which cards put it there.` | same |
| 2a, 2nd (`bodyPersist`) | `The reading is kept with the deck. Edit the list and it waits for you to ask again.` | same |
| 2b | `Checking your list against each bracket's rules.`; 2nd: — | same |
| 2c | `The mix below is counted from your list and is true now. Nothing about your deck changed.`; 2nd: — | same |
| "about two seconds" | — (cut; `panel.analyzeCost` retires) | — |

### Actions row
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Margin-top | 20px | 22px |
| Layout | flex column, `align-items: center`, `width: 100%` | flex row, `align-items: center`, wrap |
| Gap | 6px | 20px |
| Arrangement | CTA, with the opener below it | CTA, with the opener beside it |

### Primary CTA (Analyze / Try again)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| 2a label | `Analyze` | `Analyze` |
| 2c label | `Try again` (press only, never automatic) | `Try again` |
| Background / color | `var(--fg)` / `var(--bg)` (bone) | same |
| Min-height | 44px | 44px |
| Padding | 0 22px | 0 22px |
| Radius | 8px | 8px |
| Weight | 600 | 600 |
| Size | 14px | 14.5px |
| Width | `align-self: stretch` | intrinsic |

### Primary CTA, disabled (2b)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Label | `Analyze` (disabled in place) | same |
| aria-disabled | true | true |
| Background | `var(--elevated)` | `var(--elevated)` |
| Color | `var(--fg-faint)` | `var(--fg-faint)` |
| Size / padding / radius / min-height | 14px, 0 22px, 8px, 44px; stretched | 14.5px, 0 22px, 8px, 44px |

### "How we make these decisions →" opener
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Text | `How we make these decisions` + `→` (reuse `deckAnalysisCopy.provenance.toggle`, audit §7) | same |
| Family / size | mono 11px | mono 11px |
| Color | `var(--accent)` | `var(--accent)` |
| Underline | `border-bottom: 1px dotted var(--accent)`, on the words only | same |
| Gap words ↔ arrow | 8px | 8px |
| Min-height | 44px | 44px |
| Present | 2a, 2b, 2c | same |
| Action | opens sheet 3c | same |

---

## Component: Bracket box (`VerdictBlock`, redrawn)

### Box
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Background | `var(--surface)` | `var(--surface)` |
| Border | 1px solid `var(--border)` | 1px solid `var(--border)` |
| Radius | 11px | 12px |
| Padding | 15px 15px | 18px 20px |
| Layout | flex column, `min-width: 0` | same |
| Label | — | — |
| Analyze / Re-analyze control | — | — |
| Provenance sentence | — | — |
| Split pill / `Split` label | — (retired) | — |
| Out-of-date tag / dimming | — | — |

### Head row
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex row, `align-items: center` | same |
| Gap (marks ↔ name block) | 11px | 13px |
| Marks group | flex, center, gap 6px, `flex: none` | same |
| Mark size | 26px, full form | 36px, full form |
| Mark ink | `var(--bracket-{n})` | same |
| Range | both marks; the upper at opacity 0.65 | same |
| Range separator | `/`, mono 12px, opacity 0.7, the lower rank's ink (`390:141`) | same (`1300:184`) |
| Single | one mark | same |

### Bracket name
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Family | `var(--display)` → `font-display` | same |
| Size | 19px | 21px |
| Weight | 700 | 700 |
| Line-height | 1.15 | 1.15 |
| Color | rank ink `var(--bracket-{low})` | same |
| Range text | `{Low} or {High}`, e.g. `Optimized or cEDH` | same |
| 2f | the declared name, one mark | same |
| Name block | flex column, gap 3px, `min-width: 0` | same |

### `analyzed {when}` line
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Family / size | mono 10px | mono 10px |
| Color | `var(--fg-faint)` | `var(--fg-faint)` |
| String | `analyzed {when}`: relative under an hour (`analyzed 2 minutes ago`), then the date | same |
| Date format | `18 Sep`, en-US (finding 14) | same |

### Reason
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Size | 12.5px | 13px |
| Line-height | 1.55 | 1.6 |
| Color | `var(--fg-muted)` | `var(--fg-muted)` |
| text-wrap | pretty | pretty |
| Margin-top | 12px (the 2f block uses 10px) | 14px (the 2f block uses 11px) |
| Hairline above | — | — |

### Section hairlines (every section after the reason)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Border-top | 1px solid `var(--border)` | same |
| Lean: margin-top / padding-top | 13px / 11px | 13px / 11px |
| Ask: margin-top / padding-top | 12px / 11px | 13px / 12px |
| Answer: margin-top / padding-top | 12px / 11px | 13px / 12px |
| Version row: margin-top / padding-top | 12px / 11px | 13px / 12px |
| Population foot: margin-top / padding-top | 12px / 10px | 14px / 11px |

### Section order
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Order | head → reason → lean → declaration section → population foot (STATES §B) | same |
| Declaration section | one of: ask, answer, version row. Shipped code also draws drifted (finding 13) | same |

### Lean (2h)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, gap 5px | same |
| Label | `How we determined this bracket`, mono 9px, 0.14em, uppercase, `var(--fg-disabled)` | same |
| Body | 12.5px, line-height 1.6, `var(--fg-muted)`, pretty | same |
| Card names | `var(--fg)`, dotted `var(--accent)` underline | same |
| Text | `Your commander is one half of a {A} + {B} two-card infinite combo, and your tutors can find the other, …` (`leanConformed`; finding 16 via /copy-review) | same |
| Opener | `see the reasoning →`: mono 10px, `var(--accent)`, dotted accent underline, 44px wrapper | `see the reasoning →`: the 1300 frame draws no arrow, but HANDOFF §2's "Every opener uses →" rules (conflict 5); mono 10px, `var(--accent)`, dotted underline, margin-top 2px |

### Declaration ask (2e)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, gap 9px | same |
| Prompt | `Pick one so pods know what to expect.`: 11.5px, line-height 1.5, `var(--fg-faint)` | same |
| Chip container | grid `1fr 1fr`, gap 8px | flex wrap, gap 8px |
| Chip outer | radius 9px, 1px solid `color-mix(in oklab, var(--bracket-{n}) 45%, var(--border))` | same |
| Chip inner | flex 1, centered, gap 8px, height 44px, radius 10px, `var(--surface-raised)` | gap 8px, height 36px, padding 0 13px 0 8px, radius 9px, `var(--surface-raised)` |
| Chip mark | 26px | 22px (chip art) |
| Chip name | 13.5px, 600, `var(--fg)` | 13px, 600, `var(--fg)` |

### Declaration answer (2f)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Text | `Declared {name} for version {n}.` then ` change` | same |
| Size / line-height / color | 12.5px / 1.6 / `var(--fg-body)` | 13px / 1.6 / `var(--fg-body)` |
| Name | 600, `var(--fg)` | same |
| `change` | mono 10.5px, `var(--accent)`, dotted accent underline | same |
| Reason when answered | `Your cards permit Optimized or cEDH: the two have no card limits between them.` | same |

### Version row (2g)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, gap 9px | same |
| Marks row | flex, `align-items: flex-end`, gap 10px | same |
| Mark size | 24px | 24px |
| Mark captions | mono 8px, 0.1em, uppercase, `var(--fg-faint)`: `version 2` / `this version`, gap 3px | same |
| Arrow | `→`, mono 13px, `var(--fg-faint)`, padding-bottom 13px | same |
| Sentence | 12.5px, line-height 1.55, `var(--fg-body)`; bold span 600 `var(--fg)` | same |

### Population foot
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Layout | flex column, gap 4px | flex column, gap 5px |
| Label | `What other players say`: mono 9px, 0.14em, uppercase, `var(--fg-disabled)` | same |
| Body | 11.5px, line-height 1.55, `var(--fg-faint)` | 12px, line-height 1.6, `var(--fg-faint)` |
| Present form | `Of the {n} {commander} decks that declared a bracket, {m} said {name}.` (figures 600 `var(--fg-body)`) | same |
| Absent form | `EDHREC has no declared brackets for {commander}.` | same |

---

## Component: Climb (placement only; internals shipped)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | after the bracket box, before findings | leads the grid's left column |
| Out-of-date tag | — | — |
| In 2a–2c | — | — |

## Component: Findings (placement only; internals shipped)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | after the climb | full width, below the top grid (spans both columns) |
| `How we make these decisions →` | under the box, 44px | at the right end of the head row |
| In 2a–2c | — | — |

## Component: Recommended mix (`RoleCounterStrip`, inset mode)
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Horizontal padding | 0 (`px-0`; its own 16/30 gutters dropped) | 0 |
| Top rule | `border-top: 1px solid var(--border)` | same |
| Padding-top | 14px | 20px |
| Layout | flex column | flex column |
| Gap (head ↔ cells) | 8px | 12px |
| Position | last | last, full width |
| In | 2a–2c and 2e–2h | same |
| Stale tag / dimming | — | — |
| Internals | shipped | shipped |

---

## Conditional rendering
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Overview section (with a reading) | — | — |
| `View full synopsis →` | — | — |
| `SynopsisSlot` | — (deleted) | — |
| Empty state | 2a–2c only | same |
| Grid, bracket box, climb, findings | with a reading only | same |
| Re-analyze in the tab body | — | — |
| Try again (PR B scope) | 2c only | same |
| Lean | 2h | same |
| Ask chips | 2e | same |
| Answer | 2f | same |
| Version row | 2g (last version read differently) | same |
| Flag off / deck missing | nothing (shipped) | same |

## State coverage
| State | Triggering condition | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| 2a idle | Never analyzed: no stored reading, nothing in flight | Ring at full ink, the idle heading, two body paragraphs, stretched Analyze, the opener below it, the mix | The same, ring left, Analyze and the opener side by side |
| 2b loading, nothing held | Analyze pressed; request in flight; nothing held | Ring animating `at-wave` (still at full ink under reduced motion), `Working out your bracket…` as the live region, one body, Analyze disabled | same |
| 2c failed, nothing held | The read failed and no reading is held | Ring at 0.3 and still, the failure heading and body, Try again in bone, opener kept | same |
| 2e range, asked | Reading permits a range, e.g. `[4,5]`, and nothing is declared | Two marks (the upper at 0.65), `Optimized or cEDH`, `analyzed {when}`, reason, two ask chips (44px, 2-col), population foot | The same in the right third; chips 36px |
| 2f range, answered | Range, and the player has declared | One mark and the declared name, the range reason, `Declared {name} for version {n}. change` | same |
| 2g single + version row | Single bracket; the previous version read differently | One mark and the name, reason, version row, foot | same |
| 2h single + lean | Single bracket, decided by a combo lean | One mark and the name, reason, lean with its opener, foot | same |

## Announcements
| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Settle announcement | once, on settle: `Analysis ready. Your cards permit {range}.` (STATES §E; string owed, audit §7) | same |
| Loading | the heading `Working out your bracket…` is the live region | same |
| Failure (2c) | the heading's own `role="alert"` | same |
| Ring | `aria-hidden` | same |

---

## Conflicts noted
1. **Overview label on the empty state.** Finding 6 drops the analyzed Overview section, but the frames and HANDOFF §2 still draw an `Overview` h3 above 2a–2c. The table records the label as drawn. The string is also missing from the strings file (audit §7).
2. **Phone order.** HANDOFF §2 puts the bracket box third, after the banner and the Overview. With the Overview dropped, the bracket box leads on the phone. The canvas order table says "second".
3. **Range separator.** HANDOFF names only the upper mark at 0.65. Both frames also draw a `/` between the marks: mono 12, opacity 0.7, in the lower rank's ink.
4. **2f draws the reason twice.** `S.rangeAnswered` inherits `hasSubline: true`, so both the `hasSubline` and `answered` blocks render. Treat it as one reason. Its margin-top is then ambiguous: 14/12 (2e/2g/2h) against 11/10 (the 2f block).
5. **Arrow on `see the reasoning`.** The phone draws it with →, the desktop without. HANDOFF §2 says "Every opener uses →".
6. **`aria-live` against `role="alert"`.** The frames put `aria-live="polite"` on the h2 in every state. STATES §E makes the failure heading `role="alert"`.
7. **Date format.** The handoff and fixtures write `18 Sept`. Finding 14 overrides it with `18 Sep` (en-US).
8. **`--display` and `at-wave`.** `--display` maps to `font-display` / `--font-display-face`, and `at-wave` has to be added to `globals.css` (finding 21).
9. **Ring opacities.** 0.22 and 0.3 sit below DIM_OPACITY 0.65. Finding 17 exempts them and wants the exemption recorded in code.
10. **Version-row marks.** They are drawn at 24px. The fixtures sanction 26/36/44 for the full form and 22 for the chip, so 24 renders chip art at an unsanctioned size.
11. **The two provenance openers differ.** The empty state's opener is `--accent` 11px with an accent dotted underline. The findings head-row opener is `--fg-faint` 10px with a `--border-dashed` dotted underline, and it carries the same string.
12. **The fixture's CTA copy.** `S.idle` passes `"Analyze this deck"` and `"about two seconds"`. The frame and `empty.idle.cta` both say `Analyze`, and the strings file wins.
13. **Strings that should not ship:** `stale`, `provenance.asked/committed`, `empty.provenance` and `sheets.provenance` (audit §7).
