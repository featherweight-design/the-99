# Design property table: Strategy focus, the strategy block (Analysis tab)

Source: `design/design_handoff_the99_strategy_focus/` (R2g, approved 2026-10-22). Boards: Main (focus picked, 390 + 1300),
Focus-Flow 1 (no focus) and 5 (after changes), Graph-States (one to four, nothing over the floor, too early, typal, landfall),
Ring-Centre D (larger, on a medallion). All four boards carry an identical `<style>` block (diffed: only `<title>` differs), so
every CSS value below holds on every board. Theme drawn: Low Sun (`.board` custom properties). Mobile = `.ph` frame (390);
desktop = `.dk .dkm` frame (1300, 64px rail). Copy wording is owned by /copy-review; only which string sits where is recorded.

Scope: the block from the heading to the focus line, plus its two empty-state boxes. Suggested changes and About are excluded.

Low Sun values of the tokens used (for reference, `.board`): `--surface` #1E1A15, `--surface-rail` #1A1611, `--border` #2B241B,
`--border-strong` #3A3229, `--border-dashed` #494037, `--fg` #EDE6D8, `--fg-body` #C0B8A6, `--fg-muted` #A59C89,
`--fg-faint` #948B78, `--accent` #CF8745, `--accent-shadow` #6B482A.

---

## 1. Placement in the Analysis tab

| Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|
| Parent `.at` | display / flex-direction | flex / column | flex / column |
| Parent `.at` | gap | 22px | 28px (`.dkm .at`) |
| Parent `.at` | padding | 18px 16px 32px | 24px 30px 40px |
| Block `.fb` | position in reading | after Dependencies (`.dep`), before Tuning (`section.hub`) | same |
| Block `.fb` | width | full `.at` content width (390 − 32 = 358px) | full `.at` content width (1300 − 64 rail − 60 = 1176px) |
| Block `.fb` | display / flex-direction | flex / column | flex / column |
| Block `.fb` | gap | 12px | 12px |
| Block `.fb` | margin | — | — |

## 2. Heading row (`.fbh` › `.lbl`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.fbh` | display | flex | flex |
| `.fbh` | align-items | baseline | baseline |
| `.fbh` | gap | 12px | 12px |
| `.fbh` | flex-wrap | wrap | wrap |
| `.lbl` (heading) | string | "The deck’s strategy" (Hugh's words) | same |
| `.lbl` | font-family | 'IBM Plex Mono', monospace | same |
| `.lbl` | font-size | 10.5px | 10.5px |
| `.lbl` | font-weight | 500 | 500 |
| `.lbl` | letter-spacing | .16em | .16em |
| `.lbl` | text-transform | uppercase | uppercase |
| `.lbl` | color | var(--fg-faint) | var(--fg-faint) |
| `.lbl` | line-height | — (font shorthand: normal) | same |
| `.lbl` | element | `span` | `span` |

## 3. Sub (`.fb .bas`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.bas` | string | "The themes your deck is built around and how many cards support each strategy." (Hugh's words) | same |
| `.bas` | font-family | 'IBM Plex Mono' | same |
| `.bas` | font-size | 10.5px | 10.5px |
| `.bas` | line-height | 1.5 | 1.5 |
| `.bas` | font-weight | — (shorthand: 400) | same |
| `.bas` | color | var(--fg-faint) | var(--fg-faint) |
| `.bas` | text-align | — (left) | — (left) |
| `.bas` | conditional | shown in every ring state; ABSENT in both empty states (§12) | same |

## 4. Box (`.fbx`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.fbx` | border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| `.fbx` | border-radius | 11px (`.ph .fbx`) | 12px |
| `.fbx` | background | var(--surface-rail) | var(--surface-rail) |
| `.fbx` | padding | 14px 12px | 18px 20px |
| `.fbx` | display | — (block) | — (block) |
| `.fbx` | conditional | ring states only; replaced by `.bstate` in empty states | same |

## 5. Ring + legend layout (`.ring`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.ring` | display | grid | grid |
| `.ring` | grid-template-columns | 1fr (`.ph .ring`) | auto minmax(0,380px) |
| `.ring` | gap | 14px | 40px |
| `.ring` | align-items | center | center |
| `.ring` | justify-content | stretch | center (the ring+legend pair centred in the box) |
| `.ring` | justify-items | center | — |
| Arrangement | | ring above, legend below (stacked) | ring left, legend right |
| Pair width (derived) | | — | 230 + 40 + ≤380 = ≤650px, centred |

## 6. Ring container (`.rg`) and SVG

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.rg` | position | relative | relative |
| `.rg` | width × height (inline) | 200px × 200px | 230px × 230px |
| `svg` | width / height | 200 / 200 | 230 / 230 |
| `svg` | viewBox | 0 0 200 200 | 0 0 230 230 |
| `svg` | aria-hidden | true | true |
| Ring centre | cx, cy | 100, 100 | 115, 115 |
| Arc element | | `<path>` with SVG arc command `A r,r 0 large sweep=1 x,y` (clockwise) | same |
| Arc | fill | none | none |
| Arc (non-focus) | radius | 86 | 101 |
| Arc (non-focus) | stroke-width | 20 | 20 |
| Arc (non-focus) | stroke-linecap | — (butt) | — (butt) |
| Arc order | | legend order (score order, not count: World Shaper puts Insects 9 before Landfall 11), clockwise from 12 o'clock | same |
| Arc length | | proportional to count (Aang, 22/17/11/9/6: spans 119.6°, 92.0°, 58.7°, 47.6°, 31.0°) | same angles |
| First arc start | angle | ≈1.1° clockwise of 12 o'clock (gap centred on 12 o'clock) | ≈1.1° |
| Gap between arcs | angle | ≈2.2° (e.g. 120.77° → 122.95°) | ≈2.2° (120.73° → 122.92°) |
| large-arc flag | | 1 when a span exceeds 180° (two-strategy state), else 0 | same |
| Colour by rank 1 | stroke | #6E6352 (hard-coded hex) | same |
| Colour by rank 2 | stroke | #5A5144 | same |
| Colour by rank 3 | stroke | #4A4238 | same |
| Colour by rank 4 | stroke | #3D372F | same |
| Colour by rank 5 | stroke | #332E28 | same |
| Fewer strategies | | only the first N rank colours used (2: #6E6352, #5A5144; 3: + #4A4238; 4: + #3D372F) | same |
| SVG overflow | | — (default; see note in §15) | — |

### 6a. Focus arc (pulled out)

| Property | Mobile | Desktop |
|---|---|---|
| stroke | #CF8745 (= Low Sun var(--accent), hard-coded) | same |
| radius | 90 (86 + 4) | 105 (101 + 4) |
| stroke-width | 24 | 24 |
| Replaces | that rank's neutral colour (Landfall at rank 2 is accent; ranks after it keep their own rank colour) | same |
| Gaps either side | ≈2.2°, same as other arcs | same |
| Conditional | only when a focus is picked; no focus = every arc at its rank colour, r 86/101, width 20 | same |

### 6b. Pending growth arc (after changes, Focus-Flow 5)

| Property | Mobile | Desktop |
|---|---|---|
| stroke | #F0C08E (hard-coded, lighter accent) | same |
| radius | 90 (same as focus arc) | 105 |
| stroke-width | 24 | 24 |
| Position | continues the focus arc clockwise, after it | same |
| Gap from focus arc | ≈1.2° (268.03° → 269.24°), tighter than the 2.2° strategy gap | same |
| Span | +2 cards ≈ 9.1° (269.24° → 278.3°) | same |
| Effect on others | every arc re-proportioned on the grown total (Allies' end moves from 120.8° to ≈117.1°: endpoint 173.9,144.0 → 176.6,139.2) | same |
| Conditional | any pending change since the last commit adds to that strategy; cleared at the next commit | same |
| Cut (−N, arc shrinks) | NOT DRAWN on any board (README call 6 only) | NOT DRAWN |
| Growth on a non-focus arc | NOT DRAWN | NOT DRAWN |

## 7. Centre slot (`.rcx`)

| Property | Mobile | Desktop |
|---|---|---|
| position | absolute | absolute |
| left / top (inline) | 46px / 46px | 46px / 46px |
| width × height (inline) | 108px × 108px | 138px × 138px |
| display | flex | flex |
| flex-direction | column | column |
| align-items / justify-content | center / center | center / center |
| text-align | center | center |
| gap | 4px | 4px |

## 8. Medallion (`.med`, focus picked)

| Property | Mobile | Desktop |
|---|---|---|
| element | `span.med` | same |
| width × height (inline) | 92px × 92px (85% of the slot) | 118px × 118px |
| position | relative | relative |
| display / align / justify | flex / center / center | same |
| border-radius | 50% | 50% |
| background | radial-gradient(circle, color-mix(in oklab,var(--accent) 22%,transparent) 0%, color-mix(in oklab,var(--accent) 6%,transparent) 62%, transparent 72%) | same |
| border | 1.5px solid color-mix(in oklab,var(--accent) 55%,transparent) | same |
| box-shadow (keyline) | inset 0 0 0 5px var(--surface), inset 0 0 0 6px color-mix(in oklab,var(--accent) 30%,transparent) | same |
| Note | `.ph .med` repeats the same declarations; no mobile-only value | |

### 8a. Four diamonds (`.med i` ×4)

| Property | Mobile | Desktop |
|---|---|---|
| count | 4 | 4 |
| position | absolute; left 50%; top 50% | same |
| width × height | 7px × 7px | 7px × 7px |
| margin | -3.5px 0 0 -3.5px | same |
| background | var(--accent) | same |
| transform (inline) | rotate(0/90/180/270deg) translateY(-46px) rotate(45deg) | rotate(0/90/180/270deg) translateY(-59px) rotate(45deg) |
| Placement (derived) | centred on the medallion's edge at 12, 3, 6, 9 o'clock | same |

### 8b. Centre icon (`.med .sic`)

| Property | Mobile | Desktop |
|---|---|---|
| width / height | 60 / 60 (56% of the 108 slot) | 77 / 77 (56% of 138) |
| viewBox | 0 0 24 24 | same |
| fill | none | none |
| stroke | var(--accent) | var(--accent) |
| stroke-width | 1.6 | 1.6 |
| stroke-linecap / linejoin | round / round | round / round |
| filter (glow) | drop-shadow(0 0 6px color-mix(in oklab,var(--accent) 45%,transparent)) | same |
| aria-hidden | true | true |
| glyph | the focus's icon (same path as its legend icon, §11) | same |

## 9. Empty centre (`.rce`, no focus)

| Property | Mobile | Desktop |
|---|---|---|
| element | `span.rce` inside `.rcx` | same |
| width / height | 52% / 52% of the slot = 56.2px | 52% / 52% = 71.8px |
| border-radius | 50% | 50% |
| border | 1.5px dashed var(--border-strong) | same |
| box-sizing | border-box | border-box |
| background | — | — |
| Note | the stylesheet declares `.rce{width:56%;height:56%}` then later a bare `.rce{width:52%;height:52%}` (intended as phone-only, but unscoped), so 52% wins at both widths | |

## 10. Legend wrapper and kicker

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.legw` | display / flex-direction | flex / column | flex / column |
| `.legw` | gap | 6px | 6px |
| `.legw` | width | 100% (of the 1fr column) | 100% (of the ≤380px column) |
| `.lgk` (kicker) | string | "Pick a focus" | same |
| `.lgk` | font-family | 'IBM Plex Mono' | same |
| `.lgk` | font-size | 9.5px | 9.5px |
| `.lgk` | font-weight | — (shorthand: 400) | same |
| `.lgk` | letter-spacing | .14em | .14em |
| `.lgk` | text-transform | uppercase | uppercase |
| `.lgk` | color | var(--fg-faint) | var(--fg-faint) |
| `.lgk` | padding | 0 6px | 0 6px |
| `.lgk` | conditional | shown with or without a focus | same |

## 11. Legend rows (`.leg` › `div`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.leg` | display / flex-direction | flex / column | flex / column |
| `.leg` | width | 100% | 100% |
| `.leg` | max-width | 440px | 440px (column caps it at 380) |
| row `div` | role | the press target: pressing the row picks the focus | same |
| row | display / align-items | flex / center | flex / center |
| row | gap | 10px | 10px |
| row | min-height | 44px (`.ph .leg div`) | 40px |
| row | padding | 0 6px | 0 6px |
| row | border-top | 1px solid var(--border) | same |
| row:first-child | border-top | 0 | 0 |
| row | font-size | 13px | 13px |
| row | font-family | inherited IBM Plex Sans | same |
| row | color (name) | var(--fg) | var(--fg) |
| row | font-weight (name) | — (400) | — (400) |
| Child order | | icon svg · name text · count span · radio `b.rd` | same |
| Row count | | one per strategy that scores, up to 5; not padded | same |

### 11a. Legend icon (`.leg .sic`)

| Property | Mobile | Desktop |
|---|---|---|
| width / height | 16 / 16 | 16 / 16 |
| viewBox | 0 0 24 24 | same |
| fill | none | none |
| stroke | currentColor | currentColor |
| stroke-width | 1.6 | 1.6 |
| stroke-linecap / linejoin | round / round | same |
| flex | none | none |
| color | var(--fg-muted) | var(--fg-muted) |
| replaces | the old 10×10 radius-3 colour square (`.leg i`, still in the CSS, unused in R2g) | same |

Drawn glyphs (24 grid):

| Strategy | Markup |
|---|---|
| Allies (typal) | `<path d="M7 4l-2.5 15M12 3v17M17 4l2.5 15"/>` |
| Spells matter | `<path d="M13.5 2.5L5 13.5h6l-1.5 8 8.5-11h-6z"/>` |
| Tokens | `<circle cx="12" cy="12" r="9"/><path d="M12 6.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z"/>` |
| Evasion | `<path d="M3 15c3-7 9-11 18-11-2 3-4 4.5-7 5 2 .5 3.5.3 5-.5-2 4-5 6-9 6 1 .7 2.3 1 4 1-3 2.5-7 2.5-11-.5z"/>` |
| +1/+1 counters | `<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M7 12h4M9 10v4M15 9v6"/>` |
| Elves, Pump, Insects, Landfall, Creatures costing 6+ | empty `<svg>` (no glyph drawn; the Landfall medallion is likewise empty) |

### 11b. Count (`.leg span`)

| Property | Mobile | Desktop |
|---|---|---|
| string | "N cards" | same |
| margin-left | auto (pushes count + radio right) | auto |
| font-family | 'IBM Plex Mono' | same |
| font-size | 11px | 11px |
| font-weight | — (shorthand: 400, also on the picked row) | same |
| color | var(--fg-muted) (also on the picked row) | same |
| After changes | "11 <em>+2</em> cards": `em` font-style normal, color var(--accent) (inline) | same |
| After a cut | "−N" (README); NOT DRAWN | NOT DRAWN |

### 11c. Radio (`.leg .rd`)

| Property | Mobile | Desktop |
|---|---|---|
| element | `b.rd` (empty) | same |
| width × height | 16px × 16px | 16px × 16px |
| border-radius | 50% | 50% |
| border | 1.5px solid var(--border-strong) | same |
| box-sizing | border-box | border-box |
| flex | none | none |
| margin-left | 12px | 12px |
| display / align / justify | flex / center / center | same |

### 11d. Picked row (`.leg div.on`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| row | background | color-mix(in oklab,var(--accent) 9%,transparent) | same |
| row | border-radius | 7px | 7px |
| row | border-top-color | transparent | transparent |
| next row (`div.on + div`) | border-top-color | transparent | transparent |
| row name | color | var(--accent) | var(--accent) |
| row name | font-weight | 600 | 600 |
| icon | color | var(--accent) | var(--accent) |
| radio | border-color | var(--accent) | var(--accent) |
| radio dot (`.rd:after`) | content / size | '' / 8px × 8px | same |
| radio dot | border-radius | 50% | 50% |
| radio dot | background | var(--accent) | var(--accent) |
| count | | unchanged (fg-muted, 400) | same |
| Count of picked rows | | at most one | same |

### Hover: legend row

— (no hover style specified on any board; `.leg div` has no `:hover` rule and no `cursor` rule).

### Hover: radio

— (not specified).

### Focus-visible: legend row

— (not specified).

## 12. Focus line (`.fb .fbs`)

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| `.fbs` | element | `span`, direct child of `.fb` (below the box, outside it) | same |
| `.fbs` | font-size | 12.5px | 12.5px |
| `.fbs` | line-height | 1.5 | 1.5 |
| `.fbs` | font-family | inherited IBM Plex Sans | same |
| `.fbs` | color | var(--fg-muted) | var(--fg-muted) |
| `.fbs` | text-align | — (left) | center (`.dkm .fb .fbs`) |
| `.fbs b` (strategy name) | color | var(--fg) | var(--fg) |
| `.fbs b` | font-weight | 600 | 600 |
| String, focus picked | | "Focus <b>Tokens</b>: Suggested changes builds toward it." + link | same |
| String, no focus | | "No focus yet. Pick one and Suggested changes will build toward it." (no link) | same |
| `.lk` (Keep it balanced) | string | "Keep it balanced" | same |
| `.lk` | element | `span.lk` inside `.fbs` | same |
| `.lk` | margin-left | 6px | 6px |
| `.lk` | font-family / size | 'IBM Plex Mono' / 11px | same |
| `.lk` | color | var(--accent) | var(--accent) |
| `.lk` | text-decoration | underline | underline |
| `.lk` | text-underline-offset | 4px | 4px |
| `.lk` | text-decoration-color | var(--accent-shadow) | same |
| `.lk` | conditional | only with a focus; pressing it clears the focus | same |
| `.fbs` | conditional | every ring state; ABSENT in both empty states | same |

### Hover: Keep it balanced

— (not specified; `.lk` is a `span`, so the global `a:hover{color:#DE9757}` does not apply on the boards).

## 13. Empty-state box (`.bstate`), both empty states

| Element | Property | Mobile | Desktop |
|---|---|---|---|
| Block structure | | `.fb` › `.fbh` (heading) › `.bstate`; no sub, no `.fbx`, no ring, no legend, no kicker, no focus line, no pick | same |
| `.bstate` | border | 1px dashed var(--border-dashed) | same |
| `.bstate` | border-radius | 10px | 10px |
| `.bstate` | padding | 14px 16px | 14px 16px |
| `.bstate` | background | — | — |
| `.bstate` | font-size | 13px | 13px |
| `.bstate` | line-height | 1.6 | 1.6 |
| `.bstate` | color | var(--fg-body) | var(--fg-body) |
| `.bstate b` (lead) | color / weight | var(--fg) / 600 | same |
| Nothing over the floor | strings | `<b>`"No strategy stands out yet."`</b>` + one explanatory sentence pair (README) | same |
| Too early to read | strings | `<b>`"Too early to read."`</b>` + "The deck’s strategy shows once it has 30 cards besides lands. This one has {N}." | same |

## 14. Responsive summary (only what differs)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| `.fbx` padding / radius | 14px 12px / 11px | 18px 20px / 12px |
| `.ring` columns / gap | 1fr / 14px, items centred | auto minmax(0,380px) / 40px, content centred |
| Ring size, arc radius, focus radius | 200 / 86 / 90 | 230 / 101 / 105 |
| Centre slot / medallion / icon | 108 / 92 / 60 | 138 / 118 / 77 |
| Diamond offset | translateY(-46px) | translateY(-59px) |
| Empty dashed circle | 52% of 108 | 52% of 138 |
| Legend row min-height | 44px | 40px |
| Focus line alignment | left | center |
| `.at` gap / padding | 22px / 18px 16px 32px | 28px / 24px 30px 40px |

## 15. Observations (not properties, flagged for the build)

- Pulled-out arc reach: radius 90 + half stroke 12 = 102 from centre in a 200 box (desktop 105 + 12 = 117 in 230), so the focus
  arc's outer edge passes the SVG edge by 2px wherever it nears 3, 6, 9 or 12 o'clock (Aang's Tokens arc passes 270°). Inline
  SVG clips at its box, so that 2px is cut on the boards.
- Arc neutrals (#6E6352 … #332E28) and the pending arc (#F0C08E) are hard-coded hex drawn for Low Sun; no token or per-theme
  value is given.

---

## State Coverage (from STATES-strategy-focus.md, block states only)

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| No focus | Default (deck has no saved focus) | Heading, sub, box with ring (all arcs at rank colours, r 86/101, width 20), empty dashed centre `.rce`, kicker, legend rows with empty radios, no tint; line "No focus yet…" without link | strategies[] (key, name, count, icon), focus = null |
| Focus picked | Press a legend row | Focus arc in accent, r 90/105, width 24; medallion with four diamonds and the focus's icon; picked row tinted, name + icon accent, radio filled; line "Focus {name}: …" + Keep it balanced | strategies[], focus key, focus icon |
| Focus cleared | Press Keep it balanced | Returns to No focus | focus = null |
| Graph after changes | Any pending change since the last commit, from any source | Lighter arc #F0C08E continuing the affected arc (drawn only on the focus), legend count "N <em>+n</em> cards"; a cut "−N" and a shrinking arc (not drawn) | per-strategy pending delta (working list vs last committed version) |
| One to four strategies | Fewer axes score | Only those arcs (rank colours from the top) and legend rows; not padded to five | strategies[] length 1–4 |
| Nothing over the floor | No axis scores | Heading + one `.bstate` box, lead "No strategy stands out yet."; no pick | strategies[] empty, deck past the size floor |
| Too early to read | Under 30 nonland cards | Heading + one `.bstate` box, lead "Too early to read.", nonland count in the sentence | nonland count (< 30) |
| Typal replaces tribal | Deck reads a creature type | One arc/row named for the type (e.g. "Elves"), typal glyph; never a second "Tribal" row | axis key `typal:<Type>` |
| Landfall as-is | Landfall under-reads (lands not counted) | Landfall ranked by score, can be picked like any other | — |
| Focus outside the top five | Saved focus axis no longer scores in the top five | NOT DRAWN (READINESS eng note 2: eng decides sixth row or line alone) | saved focus key |
