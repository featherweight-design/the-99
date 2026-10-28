# Design table: small items, item 1 (Proposed cuts, over + 3) and item 2 (draft note on a phone)

Agent 1 (Enumerate). Sources, read as text only:
`design/design_handoff_the99_small_items/` README.md §1 and §2, READINESS.md, `Cuts-Alternatives.dc.html`, `Draft-Note-Phone.dc.html`.

Conventions:
- Mobile = the 390 frame (`.ph`). Desktop = the 1300 frame (`.dk` / `.dkm` overrides). "same" = no desktop override in the design.
- Font families are literal in the design, never a CSS var: Sans = `'IBM Plex Sans'`, Mono = `'IBM Plex Mono'`, Display = `'Cinzel'`. Map to the app's family tokens (sans / mono / display).
- `.new` (dashed accent outline on the head) and `.pinx` (numbered pins) are board annotations, not shipped properties.
- Copy is recorded as structure only.
- Unset = the design does not set it; omitted rows are unset.

---

## Part A. Proposed cuts: Look deeper result block (`Cuts-Alternatives`)

Container chain (shipped, unchanged): `.at` > `section.hub` > `section.pcf` (CutsFrame) > `p.pld` (lead) > `div.prb` (ResultBlock) > `ul` > `li` > `article.pcr` (CutRow) or `div.pca` (answered row) > `p.prf` (foot). Then `div.pcn` (the free count), unchanged.

### A1. CutsFrame `.pcf`

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.pcf` | display / direction | flex, column | same |
| `.pcf` | padding | 16px 14px | 18px 20px |
| `.pcf` | radius | 11px | 12px |
| `.pcf` | background | `var(--surface-sunken)` | same |
| `.pcf` | border | 1px solid `var(--border)` | same |
| `.pcf .ph1` (title row) | display / direction | flex, column | flex, row |
| `.pcf .ph1` | gap | 3px | 12px |
| `.pcf .ph1` | align-items | unset | baseline |
| `.ph1 h3` (tool title) | font | 600, 17px, Display | 600, 19px, Display |
| `.ph1 h3` | color | `var(--fg)` | same |
| `.ph1 h3` | margin | 0 | same |
| `.ph1 span` (cost line) | font | 10.5px, Mono (weight unset = 400) | same |
| `.ph1 span` | color | `var(--fg-faint)` | same |

### A2. Lead `p.pld` (with its bold half)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.pld` | margin-top | 8px | same |
| `.pld` | font-size | 13px (Sans, inherited) | same |
| `.pld` | line-height | 1.5 | same |
| `.pld` | color | `var(--fg-body)` | same |
| `.pld b` (bold half, first sentence) | font-weight | 600 | same |
| `.pld b` | color | `var(--fg)` | same |
| `.pld` structure, open state | | `<b>`over-count sentence`</b>` + named-count / cut-any-N sentence + "Cut writes" sentence | same |
| `.pld` structure, enough-cut state | | `<b>`N-cut sentence`</b>` + back-at-99 sentence + "the other N stay, Undo one" sentence | same |

### A3. ResultBlock `.prb`

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.prb` | margin-top | 14px | same |
| `.prb` | padding | 14px 12px | 14px (all sides) |
| `.prb` | radius | 10px | same |
| `.prb` | background | `var(--surface)` | same |
| `.prb` | border | 1px solid `var(--border)` | same |
| `.prb .prh` (head) | display / direction | flex, column | flex, row |
| `.prb .prh` | gap | 3px | 10px |
| `.prb .prh` | align-items | unset | baseline |
| `.prh b` (head: count-to-choose string, the NEW string) | font | 600, 14px, Sans | same |
| `.prh b` | color | inherited `var(--fg)` | same |
| `.prh span` (head sub: provenance string) | font | 10.5px, Mono | same |
| `.prh span` | color | `var(--fg-faint)` | same |
| `.prb ul` (rows list) | list-style | none | same |
| `.prb ul` | margin | 10px 0 0 | same |
| `.prb ul` | padding | 0 | same |
| `.prb ul` | display / direction / gap | flex, column, 8px | same |
| `.prb .prf` (foot) | margin-top | 12px | same |
| `.prb .prf` | font | 10.5px / 1.5, Mono | same |
| `.prb .prf` | color | `var(--fg-faint)` | same |
| `.prf` structure, open | | "N named for M cuts" · figures-checked clause · credits-left clause | same |
| `.prf` structure, enough cut | | "M of M cut" · "N more named" · credits-left clause | same |

### A4. CutRow `article.pcr` (open row, shipped, unchanged)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.pcr` | display / direction | flex, column | same |
| `.pcr` | gap | 9px | same |
| `.pcr` | padding | 11px 12px | same |
| `.pcr` | radius | 9px | same |
| `.pcr` | background | `var(--surface-sunken)` | same |
| `.pcr` | border | 1px solid `var(--border)` | same |
| `.pcr .ptop` | display / direction | flex, column | flex, row |
| `.pcr .ptop` | gap | 9px | 12px |
| `.pcr .ptop` | align / justify | unset | align-items center, justify-content space-between |
| `.pcr .pid` | display / align / gap | flex, center, 10px | same |
| `.pcr .pid` | min-width | 0 | same |
| `.psug` (Suggestion tag) | width | 86px, flex none | same |
| `.psug` | radius | 999px | same |
| `.psug` | padding | 2px 8px | same |
| `.psug` | text-align | center | same |
| `.psug` | font | 9px, Mono | same |
| `.psug` | letter-spacing | .1em | same |
| `.psug` | text-transform | uppercase | same |
| `.psug` | color | `var(--accent-text)` | same |
| `.psug` | border | 1px solid `color-mix(in oklab, var(--accent) 55%, transparent)` | same |
| `.ptb` (thumb) | size | 22px x 31px, flex none | same |
| `.ptb` | radius | 3px | same |
| `.ptb` | border | 1px solid `var(--border-strong)` | same |
| `.ptb` | overflow | hidden | same |
| `.ptb img` | fit | 100% x 100%, object-fit cover, block | same |
| `.pnm` (card name) | font | 600, 13px, Sans | same |
| `.pnm` | color | `var(--fg)` | same |
| `.pnm` | border-bottom | 1px dotted `var(--accent)` | same |
| `.pnm` | white-space | nowrap | same |
| `.pbt` (Cut / Keep pair) | display / gap | flex, 8px | flex, 7px, flex none |
| `.pbt span` | height | 44px | auto |
| `.pbt span` | flex | 1 | none |
| `.pbt span` | radius | 8px | 7px |
| `.pbt span` | padding | unset | 6px 13px (Cut); 6px 12px (Keep) |
| `.pbt span` | font-size | 13px | 12.5px |
| `.pbt span` | display / align / justify | flex, center, center | same |
| `.pbt .c` (Cut) | color | `var(--accent-text)` | same |
| `.pbt .c` | border | 1px solid `var(--accent)` | same |
| `.pbt .c` | font-weight | 600 | same |
| `.pbt .k` (Keep) | color | `var(--fg-muted)` | same |
| `.pbt .k` | border | 1px solid `var(--border-strong)` | same |
| `.pbt .k` | font-weight | 500 | same |
| `.pcw` (reason) | font | 12.5px / 1.5, Sans | same |
| `.pcw` | color | `var(--fg-body)` | same |
| `.pcw` | margin-left | unset | 96px |
| `.pchips` (cite chips) | display / wrap / gap | flex, wrap, 6px | flex, wrap, 5px |
| `.pchips` | margin-left | unset | 96px |
| `.pchips span` | display / align / gap | flex, baseline, 5px | same |
| `.pchips span` | radius | 5px | same |
| `.pchips span` | padding | 3px 7px | same |
| `.pchips span` | font | 9.5px, Mono | same |
| `.pchips span` | background | `var(--surface-sunken)` | same |
| `.pchips span` | border | 1px solid `var(--border)` | same |
| `.pchips span i` (chip label) | style / transform / spacing | normal, uppercase, .1em | same |
| `.pchips span i` | color | `var(--fg-locked)` | same |
| `.pchips span em` (chip value) | style | normal | same |
| `.pchips span em` | color | `var(--fg-muted)` | same |
| row count, open state | | six `li`, run order, strongest first | same |
| chips per row | | 2 or 3, per row's checked figures | same |

### A5. Answered (cut) row `div.pca` (shipped, unchanged)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.pca` | display / wrap / align / gap | flex, wrap, center, 9px | same |
| `.pca` | radius | 9px | same |
| `.pca` | padding | 9px 12px | same |
| `.pca` | background | `var(--surface)` | same |
| `.pca` | border | 1px solid `var(--success)` | same |
| `.pck` (check box) | size | 15px x 15px | same |
| `.pck` | radius | 4px | same |
| `.pck` | border | 1px solid `var(--success)` | same |
| `.pck` | color | `var(--success)` | same |
| `.pck` | font-size | 9px | same |
| `.pck` | display / align / justify | flex, center, center | same |
| `.pal` (verb label) | font | 9.5px, Mono | same |
| `.pal` | letter-spacing / transform | .1em, uppercase | same |
| `.pal` | color | `var(--success)` | same |
| `.pan` (struck name) | font-size | 13px | same |
| `.pan` | color | `var(--fg-body)` | same |
| `.pan` | text-decoration | line-through, color `var(--fg-locked)` | same |
| `.pan` | border-bottom | 1px dotted `var(--border-strong)` | same |
| `.pub` (Undo) | margin-left | auto | same |
| `.pub` | min-height | 32px | same |
| `.pub` | radius | 7px | same |
| `.pub` | padding | 6px 11px | same |
| `.pub` | font | 500, 12px | same |
| `.pub` | color | `var(--fg-muted)` | same |
| `.pub` | border | 1px solid `var(--border-strong)` | same |
| `.pub` | display / align | flex, center | same |

### A6. The free count `.pcn` (shipped, unchanged; drawn in the open state only)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.pcn` | margin-top | 18px | same |
| `.pcn .pdv` (divider label) | display / align / gap | flex, center, 10px | same |
| `.pcn .pdv` | margin-bottom | 10px | same |
| `.pcn .pdv` | font | 10px, Mono, letter-spacing .14em, uppercase | same |
| `.pcn .pdv` | color | `var(--fg-faint)` | same |
| `.pcn .pdv i` (rule) | flex 1, height 1px, background `var(--border)` | | same |
| `.pcn .ch` | display / direction / gap | flex, column, 3px | flex, row, baseline, 10px |
| `.pcn .ch b` | font | 600, 13.5px | same |
| `.pcn .ch span` | font / color | 10.5px Mono, `var(--fg-faint)` | same |
| `.pcn ul` | margin / padding / border-top | 8px 0 0, 0, 1px solid `var(--border)` | same |
| `.pcn li` | grid-template-columns | 64px 1fr auto | 84px 1fr auto 220px |
| `.pcn li` | gap | 0 12px | 0 16px |
| `.pcn li` | align-items / padding / border-bottom | baseline, 9px 0, 1px solid `var(--border)` | same |
| `.pcn li .s` | font / color | 9.5px Mono, .1em, uppercase, `var(--fg-locked)` | same |
| `.pcn li .l` | font-size / color | 13px, `var(--fg)` | same |
| `.pcn li .l small` | display | block, 11px Mono, `var(--fg-muted)` | none |
| `.pcn li .f` | font / color / align | 600 13px Mono, `var(--fg)`, right | same |
| `.pcn li .n` | display | none | inline, 11px Mono, `var(--fg-muted)` |
| `.pcn .pnv` | margin-top / font / color | 10px, 10.5px/1.5 Mono, `var(--fg-faint)` | same |

### A7. Conditional rendering, result block

| Element | Open (0 cut) | Enough cut (cut count = needed) | Over-cut (cut count > needed) |
|---|---|---|---|
| `.prh b` head | count-to-choose string (total named) | same string, unchanged | same (not drawn) |
| `.pld` lead | bold over-count sentence + "N named; cut any M" | bold "M cut" sentence + back-at-99 + remaining-stay-open sentence | lead says the deck is under, as the count does (described, not drawn) |
| rows | every named row as `article.pcr` with Cut and Keep | cut rows become `div.pca` (✓, cut, struck name, Undo) in place, same order; uncut rows stay `article.pcr`, still with Cut and Keep | a further Cut allowed (no disable, no lock) |
| `.prf` foot | named-for-cuts string | cut-of-needed + more-named string | not drawn |
| `.pcn` free count | drawn | not drawn in the frame (README: "Unchanged") | not drawn |
| `.alt` alternatives strip | NOT rendered (R1 withdrawn; CSS remains on board only) | NOT rendered | NOT rendered |
| row exclusions | never a locked card, a Key card or the commander | same | same |

---

## Part B. Draft note (`Draft-Note-Phone`). Call: no change to ship.

### B1. Toolbar draft note `.dt2 .nt` (group-toggle.tsx)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| toolbar note | rendered | NO (`hidden md:inline` kept) | yes |
| `.dt2 .nt` | font | n/a | 11.5px, Mono |
| `.dt2 .nt` | color | n/a | `var(--fg-locked)` |
| `.dt2 .nt` | position | n/a | after the `.sp` flex:1 spacer, before Lock cards; the slot the kept note uses |
| `.dt2 .nt` structure | | n/a | "N of these differ from vX" string |
| `.dt2` (toolbar) | display / align / gap | n/a (phone uses `.gt`) | flex, center, 10px |
| `.dt2` | padding | n/a | 14px 30px 10px |
| `.dt2` | white-space | n/a | nowrap |
| `.gt` (phone toolbar) | display / direction / gap | flex, column, 7px (three rows: seg; Lock cards + view well; grouping + sort) | n/a |
| `.gt` | padding | 9px 16px | n/a |
| `.gt` | border-bottom | 1px solid `var(--border)` | n/a |
| `.gt .r2`, `.gt .r3` | display / align / gap | flex, center, 7px | n/a |

### B2. List caption `.cap2` (shipped, both widths; where the phone says it instead)

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.cap2` | rendered while a draft exists | yes | yes |
| `.cap2` | font | 10px, Mono | same |
| `.cap2` | color | `var(--fg-faint)` | same |
| `.cap2` | padding | 12px 16px 0 | 6px 30px 0 |
| `.cap2` position | | directly under the toolbar | same |

### B3. Group heading draft note

| Element | Property | Mobile 390 (`.grp h4`) | Desktop 1300 (`.dgrp h4`) |
|---|---|---|---|
| `h4` | display / align / gap | flex, baseline, 8px | same |
| `h4` | font | 600, 14px, Sans | same |
| `h4` | margin | 0 0 4px | 6px 0 2px |
| `h4` | grid-column | n/a | 1 / -1 |
| `h4 em` (count) | font | normal, 11px, Mono | same |
| `h4 em` | color | `var(--fg-faint)` | same |
| draft note span | class | `.gn` | `.m` with inline style |
| draft note | font | normal (400), 10.5px, Mono | 400, 10.5px, Mono |
| draft note | color | `var(--accent)` | same |
| draft note | order | after the count `em` | same |
| draft note structure | | "N changed, not yet committed" string | same |
| draft note | rendered | only on a group holding changed rows while a draft exists | same |
| `.grp` (phone group) | padding | 16px 16px 8px | n/a |
| `.grp` | display / direction / gap | flex, column, 6px | n/a |
| `.dgrp` (desktop group) | padding | n/a | 12px 30px 18px |
| `.dgrp` | grid | n/a | `repeat(3, minmax(0,1fr))`, gap 6px 14px |

### B4. Changed row (brass rule), context

| Element | Property | Mobile 390 | Desktop 1300 |
|---|---|---|---|
| `.row.chg` | box-shadow | inset 2px 0 0 `var(--accent)` | same |
| `.row` | height / padding / radius | 36px, 0 10px, 8px | same |
| `.row` | background | `var(--surface-rail)` | same |

Note: the 36px drawn row predates the shipped one-line 34px row (AGENTS.md); context only, not a change.

---

## State Coverage

| # | State | Trigger | Drawn? | Frames |
|---|---|---|---|---|
| S1 | Open: more named than needed | Look deeper run returns rows; named count = needed + 3 (102 cards: needed 3, named 6); 0 cut | Yes | 390 + 1300 |
| S2 | Enough cut | cut count = needed (3 of 3) | Yes | 390 + 1300 |
| S3 | Over-cut | cut count > needed (a fourth Cut) | No; described: allowed, lead says the deck is under, as the count does | none |
| S4 | Fewer rows | run cannot back needed + 3 with checked figures; named < needed + 3 (never fewer than needed unless the run says why) | No; described | none |
| S5 | One over | needed = 1, named = 4 | No; described in the note | none |
| S6 | Far over (cap) | deck far over; G2 open, suggest at most 20 rows | No; open question | none |
| S7 | Undo after enough cut | Undo on a `.pca` row returns it to `.pcr`; another may then be cut | No; described | none |
| S8 | Draft exists, phone | deck has uncommitted changes, width < md | Yes: no toolbar note; caption + group notes + brass rules carry it | 390 |
| S9 | Draft exists, desktop | deck has uncommitted changes, width >= md | Yes: toolbar note + caption + group notes | 1300 |
| S10 | Group without changes | a group with no changed rows while a draft exists | Not drawn; no group note implied | none |

## Engineering notes carried from the handoff

- G1: same run, same one credit, returns over + 3 rows, each with reason and cite chips under the same validator. Prompt and schema change only; no pick state, no new control.
- G2: open; cap near 20 rows.
- G3: head, lead lines and foot go to /copy-review.
- Item 2: keep `hidden md:inline`; optional test pinning the phone caption and group notes while a draft exists.
