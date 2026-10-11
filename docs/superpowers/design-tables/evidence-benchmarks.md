# Design property table: evidence benchmarks, "How it plays" block

Source: `design/design_handoff_the99_analysis_tab/addendum_evidence_benchmarks/` (R4, readiness
🟢 Green, 2026-10-10). Read: `README.md`, `STATES-evidence-benchmarks.md`, `READINESS.md`,
`READINESS-audit.md`, `Benchmarks Block.dc.html`, `Analysis Tab 1300.dc.html`,
`Analysis Tab 390.dc.html`, `Evidence Benchmarks Addendum.dc.html`, `benchmark-fixtures.js`.

**Scope:** the block (head row + caption, four grade tiles/rows incl. meter and the no-combo panel,
the Dependencies box with InfoTip, rows, strength tag, *Broken by*, none state, tiny-list state),
the openers' visual shape, the block's placement in the tab, and the 1300 stale banner (changed by
this drop). **Excluded:** the Benchmark Ledger modal and the About entry (later PRs).

Copy is not a property: cells name the copy KEY a slot renders (keys from the drop's
`COPY` object, proposed module `src/lib/copy/deck-benchmarks.ts`). Every string is a placeholder
owed to `/copy-review`.

Font families: the drawing spells `'IBM Plex Sans'` (sans) and `'IBM Plex Mono'` (mono) as
literals; display type is `var(--display)`. "sans" / "mono" / "display" below mean those.

Mobile = the `phone` layout (drawn at 358 content width inside the 390 frame). Desktop = 1300
(block drawn at 1240 content width).

## Audit overrides and build rules that bear on this scope

| # | Source | Rule | Effect on the drawing |
|---|---|---|---|
| O1 | Audit build rule 9; README "For engineering" | 1300 stale banner stacks its note under its line, left-aligned, button at right. Replaces shipped `analysis-banner.tsx` right-aligned note (`md:text-right`). 390 banner unchanged. | Drawing already shows this; it **overrides the shipped banner**, not the drawing. |
| O2 | Audit build rule 5; README "For engineering" | InfoTip is lifted from `deck-stats-view.tsx` into a shared component and reused. At 390 the 18px ring takes a 44px hit area (a `::before` band). | **Overrides the drawing at 390**: the drawn ring is 18x18 with no hit band. |
| O3 | Audit build rule 10 (E1) | Block takes `layout="rows"` so the phone layout can mount in a 760 column. | Adds a prop the drawing does not have; the rows layout is the 390 drawing. |
| O4 | Audit build rule 3 | Combat **Heavy** row draws no opener (zero rule); Combat Light does. | Matches the drawing (`hasOpen: n > 0`); stated as a rule, not a change. |
| O5 | Audit copy item 1 | `noComboLine` makes a claim not always true; reword or branch on the combat row. | Copy only; slot unchanged. |
| O6 | Audit "Stale fixture field" | `deps.kicker` ("Risks, not scores") is NOT drawn; R3 removed it; the copy file has no `kicker`. | Fixture carries a dead field; ship nothing for it. |
| O7 | Audit build rule 12; README "Floor" | Grade cut points, light/heavy cuts and the tiny-list floor (60 drawn) are plan constants. | `tinyHead(n, min)`'s `min` is the plan constant, not 60. |
| O8 | Audit copy closing note | Ship typographic `’`, not straight apostrophes from the fixtures. | Copy only. |

## 1. Placement in the Analysis tab

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Position | Last child of the tab body, after the *What is in this deck* (findings) section | Same |
| Parent container | `display:flex; flex-direction:column; gap:22px; padding:18px 16px 32px` | `display:flex; flex-direction:column; gap:28px; padding:24px 30px 40px` |
| Order of tab body | stale banner → verdict/overview → climb → findings → **block** | Same |
| Width | Full width of the body column (358 drawn) | Full width (1240 drawn) |
| *Recommended mix* | Above the tabs, under the commander art; not part of the tab | Same |
| Rendered when | `hasBench` (an analyzed reading and `DECK_BENCHMARKS_ENABLED` on) | Same |

## 2. Block root (`section`)

| Property | Mobile | Desktop |
|---|---|---|
| Root wrapper | `width:100%; color:var(--fg); font-family:sans`; attribute `data-benchmarks` | Same |
| display / direction | flex / column | flex / column |
| gap | 9px | 11px |

## 3. Head row: heading + caption

| Property | Mobile | Desktop |
|---|---|---|
| Head container | flex, column, gap 4px | flex, row, `align-items:baseline`, gap 14px, `flex-wrap:wrap` |
| Heading element | `h3`, margin 0 | `h3`, margin 0 |
| Heading copy key | `heading` | `heading` |
| Heading font | mono, weight 400, 9.5px, `letter-spacing:0.14em`, `text-transform:uppercase` | mono, weight 400, 10px, `letter-spacing:0.16em`, uppercase |
| Heading color | `var(--fg-faint)` | `var(--fg-faint)` |
| Caption copy key | `caption`; stale: `captionStale(date)` | Same |
| Caption font | mono, 9.5px, `line-height:1.5`, `text-wrap:pretty` | mono, 10.5px (no line-height set) |
| Caption color | `var(--fg-faint)` | `var(--fg-faint)` |
| Head-row link to About | none (until the About entry ships) | none |

## 4. Grades container

| Property | Mobile | Desktop |
|---|---|---|
| display | flex, column (one box of rows) | grid |
| grid-template-columns | — | `repeat(4, minmax(0,1fr))` |
| gap | — (rows split by border) | 10px |
| align-items | — | stretch |
| background | `var(--surface)` | — (each tile carries its own) |
| border | 1px solid `var(--border)` | — |
| border-radius | 11px | — |
| overflow | hidden | — |
| Tile order | velocity · flow · interaction · win | Same |

## 5. Graded tile / row (velocity, flow, interaction; win speed with a combo)

| Property | Mobile (row) | Desktop (tile) |
|---|---|---|
| Container | flex, column; `padding:12px 13px 0`; `border-bottom:1px solid var(--border)` | flex, column, gap 8px; `background:var(--surface)`; `border:1px solid var(--border-strong)`; `border-radius:9px`; `padding:12px 14px 11px`; `min-width:0` |
| Name + word line | flex, `align-items:baseline`, `justify-content:space-between`, gap 10px (name left, word right) | name and word stacked |
| Name copy key | `names.{velocity,flow,interaction,win}` | Same |
| Name font | sans 12.5px / 600, `var(--fg)` | sans 12px / 600, `var(--fg)` |
| Step word copy key | `steps[step-1]` | Same |
| Step word font | display (`var(--display)`), 700, 15px, `line-height:1.1`, `var(--fg)` | display, 700, 18px, `line-height:1.1`, `var(--fg)` |
| Meter | see §6; `margin-top:9px` | see §6 (tile gap 8px) |
| Figure line | sans 11.5px, `line-height:1.5`, `var(--fg-muted)`, `text-wrap:pretty`; `margin-top:8px` | sans 10.5px, `line-height:1.45`, `var(--fg-muted)`, `text-wrap:pretty`; `flex:1` |
| Figure line decisive run | `<b>` weight 600, `var(--fg)` (fixture fields `pre` · `strong` · `post`) | Same |
| Win-speed figure slot | `figure.win` | Same |
| Opener | see §8; right-aligned (`justify-content:flex-end`), 44px min-height | see §8; left-aligned (`display:flex`) |
| Opener copy key | `open(n)`; win speed `openCombo(n)` | Same |

## 6. The meter

| Property | Mobile | Desktop |
|---|---|---|
| Element | `role="img"`, `aria-label = stepAria` (drawn as `{name}: {stepWord}, stepOf(step)`) | Same |
| display | grid, `repeat(5, minmax(0,1fr))` | Same |
| gap | 3px | 3px |
| Segment display | block | block |
| Segment height | 7px | 6px |
| Segment border-radius | 2px | 2px |
| Filled segment i (1..step) | `background: STEP_INK[i-1]`; `box-shadow:none` | Same |
| Empty segment | `background:var(--elevated)`; `box-shadow: inset 0 0 0 1px var(--border-strong)` | Same |
| `STEP_INK` | `oklch(0.68 0.02 250)`, `oklch(0.69 0.045 250)`, `oklch(0.70 0.07 250)`, `oklch(0.71 0.10 250)`, `oklch(0.72 0.135 250)` | Same |
| Colour rule | one hue (h 250, `--fact` blue); no success / warning ink | Same |

## 7. Win speed, no combo

| Property | Mobile | Desktop |
|---|---|---|
| Attribute | `data-no-combo` | `data-no-combo` |
| Outer | `padding:10px`; `border-bottom:1px solid var(--border)` | — |
| Panel | flex, column, `justify-content:center`, gap 7px; `min-height:104px`; `padding:10px 12px`; `border-radius:8px`; `border:1px dashed var(--border-dashed)`; background transparent | flex, column, gap 8px; `border:1px dashed var(--border-dashed)`; `border-radius:9px`; `padding:12px 14px 11px`; `min-width:0`; background transparent; stretches to grid row height |
| Name + headline line | flex, baseline, space-between, gap 10px | stacked |
| Name | `names.win`, sans 12.5px / 600, `var(--fg)` | `names.win`, sans 12px / 600, `var(--fg)` |
| Headline copy key | `noCombo` | `noCombo` |
| Headline font | sans 13px / 500, `var(--fg-body)` | sans 14px / 500, `line-height:1.3`, `var(--fg-body)` |
| Line copy key | `noComboLine` (O5) | `noComboLine` (O5) |
| Line font | sans 11.5px, `line-height:1.5`, `var(--fg-muted)`, `text-wrap:pretty` | sans 10.5px, `line-height:1.45`, `var(--fg-muted)`, `text-wrap:pretty` |
| Meter | none | none |
| Opener | none | none |

## 8. Opener (tiles and dependency rows)

| Property | Mobile | Desktop |
|---|---|---|
| Role | the findings' own control; `aria-haspopup="dialog"` (canvas §2) | Same |
| Wrapper | `display:inline-flex; align-items:center; min-height:44px` | — |
| Font | mono 10px, `var(--accent)` | mono 9.5px, `var(--accent)` |
| Underline | inner span `border-bottom:1px dotted var(--accent)` | `border-bottom:1px dotted var(--accent)` |
| Trailing arrow | ` →` appended inside the underlined span | none |
| white-space | — | nowrap on dependency rows |
| cursor | — | pointer |
| Hover / focus | not specified in the drop | not specified in the drop |
| Opens | the ledger sheet (excluded from this table) | Same |

## 9. Dependencies box

| Property | Mobile | Desktop |
|---|---|---|
| Attribute | `data-dependencies` | `data-dependencies` |
| Container | flex, column; `border:1px solid var(--border)`; `border-radius:11px`; `background:var(--surface-sunken)` | flex, column; `border:1px solid var(--border)`; `border-radius:9px`; `background:var(--surface-sunken)` |
| Head | flex, `align-items:center`, gap 8px; `min-height:44px`; `padding:0 13px` | flex, `align-items:center`, gap 8px; `padding:12px 16px 10px` |
| Head name copy key | `deps.name` | `deps.name` |
| Head name font | sans 12.5px / 600, `var(--fg)` | sans 12px / 600, `var(--fg)` |
| Chip / sub-line | none (R3: moved into the tooltip; O6) | none |
| Total / row count | none | none |

### 9a. InfoTip ring and tooltip

| Property | Mobile | Desktop |
|---|---|---|
| Ring element | `tabindex=0`, `role="button"`, `aria-label = deps.tipAria`, `aria-describedby` → tooltip id | Same |
| Ring box | `position:relative; flex:none; display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:50%; border:1px solid var(--fg-faint)` | Same |
| Ring glyph | mono 10.5px / 600, `line-height:1`, `var(--fg-muted)`, letter `i` | Same |
| Ring cursor | help | help |
| Hit area | 44px (`::before` band) — **O2, not drawn** | 18px as drawn |
| Opens on | tap | hover or focus |
| Tooltip | `role="tooltip"`; `position:absolute; left:-10px; top:calc(100% + 8px); z-index:5; width:260px; padding:9px 11px; border-radius:8px; background:var(--elevated); border:1px solid var(--border-strong); box-shadow:0 10px 28px rgba(0,0,0,0.45)` | Same |
| Tooltip font | sans 12px / 400, `line-height:1.5`, `var(--fg-body)`, `text-align:left`, `white-space:normal` | Same |
| Tooltip copy key | `deps.tip` (the handoff's `deps.sub`, renamed by /copy-review) | `deps.tip` |
| Component | the Deck stats `InfoTip`, lifted to shared (O2) | Same |

### 9b. Dependency row

| Property | Mobile (stacked) | Desktop (grid) |
|---|---|---|
| Container | flex, column, gap 6px; `padding:11px 13px 0`; `border-top:1px solid var(--border)` | grid; `grid-template-columns: 220px minmax(0,1fr) minmax(0,1.15fr) 120px`; `align-items:center`; gap 18px; `min-height:46px`; `padding:9px 16px`; `border-top:1px solid var(--border)` |
| Cell 1: tag + name | flex, `align-items:center`, gap 9px | flex, `align-items:center`, gap 9px, `min-width:0` |
| Name copy key | `deps.rows.{graveyard,artifacts,enchantments,creatures,activated,combat}` | Same |
| Name font | sans 13px / 600, `var(--fg)` | sans 13px / 600, `var(--fg)` |
| Cell 2: figure | sans 11.5px, `line-height:1.5`, `var(--fg-muted)`, `text-wrap:pretty` | sans 12px, `line-height:1.45`, `var(--fg-muted)`, `text-wrap:pretty` |
| Figure decisive run | `<b>` 600, `var(--fg)` | Same |
| Cell 3: *Broken by* | one inline line: label, `&nbsp; `, then hate; line sans 11.5px, `line-height:1.5`, `var(--fg-body)`, `text-wrap:pretty` | flex, column, gap 2px, `min-width:0`: label over hate |
| *Broken by* label key | `deps.brokenBy` | `deps.brokenBy` |
| *Broken by* label font | mono 8.5px, `letter-spacing:0.12em`, uppercase, `var(--fg-faint)` | Same |
| Hate copy key | `deps.hate[k]` (fixed in code) | Same |
| Hate font | (inherits line: 11.5px / 1.5 / `--fg-body`) | sans 12px, `line-height:1.45`, `var(--fg-body)`, `text-wrap:pretty` |
| Cell 4: opener | own line, `justify-content:flex-end`, 44px (see §8) | `display:flex; justify-content:flex-end` (see §8) |
| No opener (Combat Heavy) | an 11px-high spacer (`height:11px`) replaces the opener line | cell 4 empty |
| Order | heavy first, then `DEP_ORDER`: graveyard · artifacts · enchantments · creatures · activated · combat | Same |
| Rows shown | each dependency at the light cut or above (plan constants, O7) | Same |

### 9c. Strength tag (Heavy / Light)

| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `deps.strength.{heavy,light}` | Same |
| Font | mono 9px, `letter-spacing:0.12em`, uppercase, `white-space:nowrap` | Same |
| Box | `display:inline-block; border-radius:4px; padding:2px 6px; min-width:50px; text-align:center; flex:none` | Same |
| Heavy | `color:var(--fg)`; `border:1px solid var(--fact)`; `background: color-mix(in oklab, var(--fact) 14%, transparent)` | Same |
| Light | `color:var(--fg-muted)`; `border:1px solid var(--border-strong)`; background transparent | Same |
| Position | left of the row name | Same |
| Note | STATES says "50px"; drawing implements it as `min-width:50px` | Same |

### 9d. None state (no dependency rows)

| Property | Mobile | Desktop |
|---|---|---|
| Panel | flex, column, gap 6px; `margin:0 10px 10px`; `padding:12px`; `border-radius:8px`; `border:1px dashed var(--border-dashed)` | flex, column, gap 5px; `margin:0 12px 12px`; `padding:12px 14px`; `border-radius:7px`; `border:1px dashed var(--border-dashed)` |
| Line 1 key | `deps.noneHead` | `deps.noneHead` |
| Line 1 font | `p`, margin 0, sans 12.5px, `line-height:1.5`, `var(--fg-body)` | `p`, margin 0, sans 13px, `line-height:1.5`, `var(--fg-body)` |
| Line 2 key | `deps.noneLine` | `deps.noneLine` |
| Line 2 font | `p`, sans 11.5px, `line-height:1.5`, `var(--fg-muted)`, `text-wrap:pretty` | `p`, sans 12px, `line-height:1.5`, `var(--fg-muted)`, `text-wrap:pretty` |
| Line 3 key | `deps.checked` | `deps.checked` |
| Line 3 font | mono 9.5px, `line-height:1.5`, `var(--fg-faint)` | mono 10px, `var(--fg-faint)` |
| Opener | none | none |

## 10. Tiny-list state (under the floor)

**Not built.** A reading needs a whole deck, so a list under the floor never has benchmarks to draw; /copy-review removed the strings. The rows below are the drawing's, kept for the record.

| Property | Mobile | Desktop |
|---|---|---|
| Replaces | grades and Dependencies box (neither drawn); head row stays | Same |
| Panel | flex, column, gap 8px; `padding:13px 14px`; `border-radius:11px`; `border:1px dashed var(--border-dashed)` | flex, row, `align-items:center`, gap 24px; `padding:14px 16px`; `border-radius:9px`; `border:1px dashed var(--border-dashed)` |
| Text column | (panel itself) | flex, column, gap 4px, `flex:1`, `min-width:0` |
| Head key | `tinyHead(n, floor)` (floor = plan constant, O7) | Same |
| Head font | `p`, sans 13px, `line-height:1.5`, `var(--fg-body)` | `p`, sans 13.5px, `line-height:1.5`, `var(--fg-body)` |
| Line key | `tinyLine` | `tinyLine` |
| Line font | mono 10px, `line-height:1.55`, `var(--fg-faint)` | mono 11px, `line-height:1.55`, `var(--fg-faint)` |
| Names list | flex, wrap, gap `4px 12px`, `margin-top:2px` | flex, wrap, gap `6px 14px`, `max-width:560px`, `justify-content:flex-end` |
| Names | the five names: `names.velocity`, `names.flow`, `names.interaction`, `names.win`, `deps.name` | Same |
| Name font | mono 10px, `var(--fg-faint)` | mono 10.5px, `var(--fg-faint)` |

## 11. Stale banner (1300 change, O1)

| Property | Mobile (390, unchanged) | Desktop (1300, changed) |
|---|---|---|
| Container | `role="status"`; flex, column, `align-items:stretch`, gap 12px; `padding:14px 15px`; `border-radius:11px`; `background:var(--surface-rail)`; `border:1px solid var(--border-strong)` | `role="status"`; flex, row, `align-items:center`, gap 18px; `padding:14px 16px 14px 20px`; `border-radius:11px`; `background:var(--surface-rail)`; `border:1px solid var(--border-strong)` |
| Text column | — (line, button, note are siblings) | flex, column, gap 4px, `flex:1`, `min-width:0` |
| Line | `p`, sans 13px, `line-height:1.5`, `var(--fg-body)` | `p`, sans 13.5px, `line-height:1.5`, `var(--fg-body)`, `text-wrap:pretty` |
| Note | after the button; mono 9.5px, `line-height:1.55`, `var(--fg-faint)`, `text-align:center` | **under the line, inside the text column, left-aligned**; mono 11px, `line-height:1.55`, `var(--fg-faint)`, `text-wrap:pretty` |
| Note rendered when | `bannerNote` non-empty | Same |
| Button (idle) | inline-flex, centered; `min-height:44px`; `padding:0 18px`; `border-radius:8px`; `background:var(--fg)`; `color:var(--bg)`; 600 14px; nowrap | inline-flex, centered; `min-height:36px`; `padding:0 18px`; `border-radius:8px`; `background:var(--fg)`; `color:var(--bg)`; 600 13.5px; `flex:none`; nowrap; at the right |
| Button (busy) | disables in place, as shipped | `aria-disabled="true"`; `min-height:36px`; `padding:0 16px`; `border-radius:8px`; `background:var(--elevated)`; `color:var(--fg-faint)`; 600 13.5px; inner flex gap 9px (pulse + label) |

## 12. Hover / focus

| Element | Mobile | Desktop |
|---|---|---|
| InfoTip ring | tap opens tooltip; focusable (`tabindex=0`) | hover or focus opens tooltip |
| Opener | not specified (44px target) | not specified (`cursor:pointer`) |
| Tiles, rows, panels | no hover state drawn | no hover state drawn |

## 13. Conditional rendering

| Condition | Renders |
|---|---|
| `DECK_BENCHMARKS_ENABLED` off | nothing (not computed, not drawn) |
| no reading (never analyzed, loading, failed, fetching) | no block |
| analyzed reading | full block |
| stale reading / failed re-read over held reading | full block, caption `captionStale(date)`; no tag, no dimming |
| Re-analyze in flight over held reading | full block; never busy on its own |
| card count < floor | tiny panel (§10); no grades, no Dependencies box |
| win speed with no combo | dashed no-combo panel (§7); no meter, no opener |
| win speed with combos | graded tile, `openCombo(n)` |
| dependency row with `n > 0` | opener `open(n)` |
| dependency row with `n === 0` (Combat Heavy) | no opener; 390 draws an 11px spacer |
| no dependency rows | none panel (§9d) |
| `tipOpen` | tooltip bubble |
| 1300 banner `bannerNote` empty | note omitted |

## State Coverage

| State | Trigger | What renders |
|---|---|---|
| Graded, populated (1a Gishath) | analyzed reading, combo present | head + caption, four graded tiles (win `openCombo`), Dependencies with one Light row |
| No combo + heavy deps (1b Elves) | no combo line; three Heavy rows | win no-combo panel; Creatures, Activated, Combat Heavy; Combat has no opener |
| Graveyard heavy (1c Sultai) | one Heavy row | single Heavy row with opener |
| Artifacts heavy (1d Counter Intelligence) | one Heavy row; 17 combo lines | graded win; single Heavy row |
| Four rows max (1e Scrappy) | 3 Heavy + 1 Light | four rows, heavy first; box grows by row, grades row unchanged |
| Creatures heavy (1f Thorin) | Heavy + two Light | Creatures Heavy, Artifacts Light, Combat Light (with opener) |
| Combat heavy (1g Soldiers) | Combat Heavy + Creatures Light | Combat first, no opener; Creatures Light |
| No dependencies (1h Wizards) | zero rows | none panel (`noneHead`, `noneLine`, `checked`) |
| Stale (1i) | reading stale | 1300 banner with stacked left note (O1); block whole, `captionStale` |
| Never analyzed (1j) | no reading | shipped empty state, no block |
| Loading / failed / fetching | first read pending or failed | no block |
| Failed re-read over held | re-read failed | held reading's block, whole, as 1i |
| Re-analyze in flight | re-read running | block whole; banner button busy in place |
| Tiny list (3a) | card count < floor | **not built**: unreachable, a reading needs a whole deck (§10) |
| All lowest (3a) | every grade step 1, no deps | four tiles each with one `STEP_INK[0]` segment; none panel; no warning |
| Tooltip open (2t) | hover/focus (1300), tap (390) on ring | `deps.tip` bubble |
| Switch off | `DECK_BENCHMARKS_ENABLED` unset | nothing |
