# Gap report — Commanders / Discover two lanes

> **Historical record, read as of its own date.** This report verifies the tree it was
> written against and is not maintained afterwards. The dead `commandersCopy.row.*` keys it
> names below were **deleted on 2026-09-13** for exactly the reason it gives — a named key
> with no call site — so its "defined in `src/lib/copy/lanes.ts`" is true of the tree it
> read and false of the tree now. The live spec is the design table it verifies against;
> that table carries the RETIRED markers.

Verification of the shipped implementation against
`docs/superpowers/design-tables/commanders-discover.md`, row by row.

Method: PASS 1 walks every property row of every component table and compares it
to the element that implements it. PASS 2 walks the five State Coverage tables
and asks whether a conditional branch reaches the state and renders the right
component with the right props.

Scope rules applied:

- **Copy wording is out of scope.** A key that does not exist, or one called with
  the wrong arguments, IS in scope; different prose is not.
- **The rack breakpoint is 1024px.** `useIsWide()` (`(min-width: 1024px)`) and
  Tailwind `lg:` both implement it; Tailwind `sm:` is 640px and does not. Where
  a file implements a 1024px Mobile/Desktop split with `sm:`, the finding is
  the *mechanism*, not the class.
- Colours are compared by **theme-token identity**, not literal hex: the design
  hexes are the Amonkhet values of tokens defined in `src/app/globals.css`, so
  `--fg` stands for `#EDE6D8`, `--fg-locked` for `#6E6654`, `--fg-faint` for
  `#8E8269`, `--fg-muted` for `#A89B84`, `--elevated` for `#241F18`, and so on.
  Only a token whose *meaning* differs from the drawn colour is reported.

Anything not listed below matched.

---

## PASS 1 — visual properties

### Page header

`src/components/commanders/page-header.tsx`

Title/subtitle sizes, weights, families and the border all match. Two gaps: the
Mobile/Desktop split is written with `sm:` (640px) rather than the 1024px
mechanism, and the desktop container is `sm:flex-row` where the table's Desktop
column says `flex-direction: column`. The table's "Header CTA — none" row
matches: no CTA is rendered.

### Filter rack container

`src/components/commanders/rack/filter-rack.tsx`

Container padding, gap, border, background and the three-row order all match, and
the breakpoint is `useIsWide()` + `lg:` — the correct mechanism, used once at the
top and passed down as `wide` so rack and sheet are never both mounted.

Gaps: control-row gap is 14px against the table's 10px and carries `flex-wrap`
against `nowrap`; the `Filters` button has a fixed `px-[14px]` and 13px text
against 0 13px / 0 11px and 13.5px; the badge is 11px mono in an 18px pill with
5px padding against 10.5px and 1px 6px.

### Search field

`src/components/commanders/rack/search-control.tsx`, `src/components/ui/text-field.tsx`

Heights (34/44), widths (300px/full), radii, borders, brass-on-content border and
the clear disc's presence all match, and every copy key the table names exists
and is called.

Gaps: the leading icon is a text glyph `⌕` in `font-mono`, not the specified SVG
(16px/14px, `viewBox 0 0 20 20`, `<circle cx=9 cy=9 r=5.4>` + `m13.2 13.2 3.3
3.3`); container padding/gap are `px-[10px]`/`gap-[8px]` at both widths where
mobile is drawn at 0 12px / 9px; the desktop input is 12.5px against 13px; and
the mobile clear disc is 24px against 22px.

### Colour pips, divider, colour match

`src/components/commanders/rack/colour-control.tsx`

Pip sizes (22/44), radii (6/11), lit rim, the divider's 1px width, the
radiogroup roles, the greyed treatment (`aria-disabled`, still focusable, value
retained) and the sheet-only hint all match.

Gaps: wrapper gap 8px against 10px and `px-[10px]` against `0 4px 0 10px`;
desktop inter-pip gap 8px against 5px; mobile unlit opacity .34 against .4;
divider 16px tall against 20px; desktop match segment `rounded-[4px]` against
6px; the mobile match segment is `rounded-lg` with no horizontal padding at 13px
where the table draws 999px / 0 16px / 13.5px; the mobile *selected* segment
takes the desktop solid-brass fill instead of the drawn `rgba(accent,.16)` fill
with a 1px accent border and `--fg` label; the mobile unselected segment has a
transparent border where the table specifies 1px `#3A3229`; captions are
`.12em` against `.14em`; and the explainer line is `m-0` against margin-top 8px.

### Score against (availability)

`src/components/commanders/rack/availability-control.tsx`

Owned-lane-only mounting, 32/44 heights, selected fill/border/label colours and
the sheet-only hint match.

Gaps: legend `.12em` against `.14em`; control gap 3px desktop / 6px mobile
against 0 / 8px, no `overflow: hidden`, and mobile `rounded-lg` against 999px;
segment padding 13px / 10px against 0 11px / 0 16px and mobile 13px against
13.5px; the unselected segment's `border-left: 1px solid #2E2822` is absent; the
unselected label is `--fg-body` where the desktop column draws `#A89B84`
(`--fg-muted`).

### Scope trigger and order control

`src/components/commanders/rack/scope-control.tsx`, `order-control.tsx`, `select.tsx`

Discover-only mounting, the 7px leading diamond in `--accent`, the 34px trigger,
the 48px sheet rows, the glosses being sheet-only, and the roving-tabindex menu
all match.

Gaps: trigger 12px text and `px-[12px]` against 12.5px and 0 13px (order) /
0 12px (scope); the caret is `--accent` where the table draws `#8E8269`; the
trigger label is always `--fg` where the table draws `#C6B79A` at the default
value and `#EDE6D8` off it; the desktop menu is 260px with **no box-shadow**
against 280px and `0 16px 40px rgba(0,0,0,.5)`; menu rows are gap 10px /
`px-[12px] py-[9px]` with a 6px marker and **no gloss line** against 9px /
9px 11px / 7px / a mono 10px `#8E8269` gloss; sheet option rows are `rounded-lg`
/ gap 8px / 13.5px regular with a 1.5px 7px diamond against 10px / 11px /
14px 600 / 1px `#4A4033` 8px; sheet order pills are `rounded-lg` `px-[12px]`
with an `--elevated-hover` selected fill against 999px / 0 16px /
`rgba(201,162,75,.16)`.

**The phone order control is missing entirely as drawn.** `filter-rack.tsx:74-87`
passes `wide` as a literal `true`, so the persistent row gets a text pill with a
caret at 44px height rather than the table's icon-only 44×44 button, and the
phone order SVG (17×17, stroke-width 1.6, `M5 5h10M6.5 10h7M8.5 15h3`) exists
nowhere in the tree.

### Chip row

`src/components/commanders/rack/chip-line.tsx`

Reserved height (22/30), control order, the inert-Clear-at-empty rule,
`overflow-hidden` with no wrap and no scroll, and every chip copy key match.

Gaps: row gap 8px/6px against 7px at both widths; the chip has no fixed height
(30/22px), is `font-sans` 12px against IBM Plex Mono 11/10.5px, labels in `--fg`
against `#C6B79A`, borders `--border-strong` against `--border`, and mobile
padding `px-[9px] py-[3px]` against 0 11px; the colour chip renders **one 9px
round dot, and only when exactly one pip is lit**, against one 8/7px square per
hue at radius 2px with a 3px gap; the desktop colour chip collapses to
`filterCopy.colour.collapsed(n)` where the desktop column draws the joined
names; the overflow chip is a non-interactive `<span>` with no `#171310`
background; Clear is `p-0` at 10.5px desktop against 0 6px / 0 4px at 11px.

### Result line

`src/components/commanders/rack/result-line.tsx`

One `aria-live="polite" aria-atomic` region, `rest(total)` when nothing is
filtered (never `148 of 148`), the aside appended to the same sentence and only
when `Exactly` is live and the counts differ — all match.

Gaps: 11px against 11.5px; `--fg-muted` against `#C6B79A`; no `tabular-nums`;
**no 300ms debounce** (the URL/state table requires one); and the aside is plain
text inside the same string with no `#8E8269` colour treatment.

### Filter sheet

`src/components/commanders/rack/filter-sheet.tsx`

Phone-only mounting, `role="dialog"`/`aria-modal`, the focus trap, Esc /
handle-drag / backdrop / primary all being the same non-reverting dismissal,
immediate application with no staging, section order (scope first on discover),
44px option pills, and the greyed colour match with its hint — all match.

Gaps: container radius 16px against 22px; handle 36px against 38px; backdrop 72%
against .74; section stack gap 22px against 14px; **the header shows a brass
`activeControlCount` badge where the table draws the live result count in mono
11px `#8E8269`**; section legends `.12em` against `.14em`; footer Clear at
13.5px with no 48px height against 14px/48px, and it calls
**`filterCopy.chips.clear` where the table names `filterCopy.chips.clearAll`**
(a wrong-key finding, in scope); footer primary 13.5px against 14px with its
height coming from padding.

### Commander row — owned lane

`src/components/commanders/rec-card.tsx`, `commander-art.tsx`, `role-chips.tsx`,
`fit-bar.tsx`, `receipt-line.tsx`

Art bleed width (268/470), the darkening ramp stops, rank diamond, identity pip
presence, the fit figure sizes (20/27 at line-height 1), the three-segment ramp
colours, the hover-revealed row action and the desktop-only split legend all
match.

Gaps: the desktop container is a CSS grid at `p-[24px_26px]` gap 20 against a
flex row at gap 14px and padding 13px 22px, and mobile padding is 12px 13px
against 12px 0; rank is 17px on mobile against 14px, `--fg-faint` on desktop
against `#C6B79A`, with a 7px gap to the diamond against 6px, and neither rank
nor fit figure carries `tabular-nums`; the mobile name is 14.5px against 15px;
the content column is gap 13px against 9px; the synergy row is gap 10px against
11px with a `.12em` legend against `.14em` and a 12px `--fg-body` figure against
11px `#A89B84`; the fit block is gap 10px against 7px with a `.1em` denominator
against `.08em`; the receipt line is 12.5px desktop against 11.5px; the row
action is `rounded-full` against 8px; the split bar is 6/8px against 5/6px with
legend gaps 12px/5px against 11px/4px; the role chip is `rounded-full` with no
22px height, padding 3px 8px / 4px 10px against 0 9px, 11px desktop against
10px, `.05em` against `.08em`, and a `--border-strong` border against `--border`;
the phone art mask reuses the desktop stops (42%/72%) where the phone mask is
drawn 46%/74%; identity pips are 9px circles at both widths with a 3px gap
against 8/9px squares at radius 2px with gaps 4/3px.

**Copy keys that exist but are never called.** `commandersCopy.row.ownOfTop`,
`.receipts`, `.roleCounter`, `.splitLegend`, `.delta` and the `.row.*`
availability keys the table names are all defined in `src/lib/copy/lanes.ts`, but
`rec-card.tsx` builds the "own N of top M" and `receipts:` strings inline,
`role-chips.tsx` and `fit-bar.tsx` hardcode their labels, and `receipt-line.tsx`
and the delta read `availabilityCopy.receipt.*` instead. In scope as
named-key-not-called.

### Commander row — discover lane

`src/components/commanders/discovery-row.tsx`

The 246px right column, the support figure sizes, the single-fill ratio bar, and
the "Absent on this lane" row — no fit score, no delta, no split bar, no
availability receipt — all match.

Gaps: right-column gap 10px against 8px; the mobile support unit is `.1em`
against `.08em`; the ratio bar is 6px on mobile against 5px;
popularity/novelty lines are gap 10px in `--fg-body` against 4px and `#A89B84`;
the desktop not-owned line is 12.5px `--fg-faint` against 11.5px `#A89B84`; the
row action is `rounded-full` against 8px.

### Zero state

`src/components/commanders/filtered-empty.tsx`, `discovery-empty.tsx`

Diamond trio (three 10px rotated squares, 7px apart), Cinzel 19px 600 heading,
13.5px body at `--fg-muted` with a 520px measure, the marked control phrases, and
the primary/secondary pairing all match.

Gaps: the whole file splits at `sm:` rather than 1024px; the mobile buttons are
`rounded-[10px]` at 14px against 8px at 12.5px; the button group's mobile
margin-top is 6px against 4px.

### Five-item nav

`src/components/shell/nav.tsx`, `nav-icons.tsx`

Item set and order (Home · Collection · Commanders · Discover · Decks), the
`/discover` href, both new lanes lockable, the 62px rail, 38px slots at radius
10px with 4px gaps, the 26px brand diamond, the 52px tab items at radius 12px
with 3px gaps and 8px 8px 14px padding, the 9px→8.5px label drop below 360px,
and **all five icon geometries including Discover's `r=6.8` circle around
`M10 6.4 12.8 10 10 13.6 7.2 10z`** — all match exactly.

Gaps: the tab label is `tracking-[0.06em]` against `.04em`; the icons are always
19px where the table calls for 18px at 320px.

### Printing thumbnail, hover/focus, URL plumbing

No printing thumbnail is rendered at rest on either lane, as required (I3 is a
contingency). Hover tints, the greyed-control hover suppression and the focus
rings are all present. URL plumbing matches: `q`/`c`/`m`/`a`/`o` (plus `s` for
scope), defaults serialised as absences, one shared `activeControlCount`, the
1024px `matchMedia` switch, one live region. The single exception is the 300ms
debounce, reported above.

---

## PASS 2 — state reachability

### Filter rack

| State | Verdict |
|---|---|
| 1 · No filters — owned | ✅ REACHABLE — `rest(total)` (never `148 of 148`), pips at .34, match greyed, Clear present and inert, chip line reserved |
| 1 · No filters — discover | ✅ REACHABLE — scope leads, never greyed, no availability control mounted, `rest(3301)` |
| 1 · No filters — phone | ⚠️ PARTIALLY REACHABLE — badge correctly absent at zero and the chip line reserves 30px, but the order slot renders a text pill instead of the icon-only button (`filter-rack.tsx:74-87`) |
| 2 · Colour only — owned | ✅ REACHABLE — un-lighting the last pip re-greys the match control and keeps its value |
| 2 · Colour only — discover | ✅ REACHABLE |
| 2 · Colour only — phone | ⚠️ PARTIALLY REACHABLE — badge `1` is correct, but two or more pips collapse to `collapsed(n)` at *both* widths, not only when the row runs out |
| 3 · Colour + search — owned | ✅ REACHABLE — chips in control order, search narrows in place with no scope of its own |
| 3 · Colour + search — discover | ✅ REACHABLE |
| 3 · Colour + search — phone | ✅ REACHABLE — search excluded from `activeControlCount` |
| 4 · Exact mode — owned | ✅ REACHABLE — aside appended to the same sentence, only when `Exactly` is live and the counts differ |
| 4 · Exact mode — discover | ✅ REACHABLE |
| 4 · Exact mode — phone | ⚠️ PARTIALLY REACHABLE — `CAP.narrow = 1`, so the worst case is one chip + `+4`, where the table draws two chips + `+3` |
| 5 · Sheet open — owned | ✅ REACHABLE — sections in rack order, search excluded, immediate application, primary only dismisses |
| 5 · Sheet open — discover | ⚠️ PARTIALLY REACHABLE — scope first with both glosses, greyed match with its hint, inert Clear, Esc never reverts, never centred, nothing staged; but the header prints the active-control count rather than the live result count the table requires |
| 6 · Filtered to zero — owned | ⚠️ PARTIALLY REACHABLE — gated on `colors.length > 0 && filtered.length === 0`, so a search-only or availability-only zero result renders an empty list with no zero state at all |
| 6 · Filtered to zero — discover | ✅ REACHABLE — rack stays mounted, and the lane has a richer ladder (floor / held / search / filtered / unknown) that subsumes D5 |
| 6 · Filtered to zero — phone | ⚠️ PARTIALLY REACHABLE — buttons stack full-width at 48px and the rack stays the way out, but the chip overflow shows one chip + `+4`, and the state inherits the owned-lane gate above |

### Colour match control

| State | Verdict |
|---|---|
| Live | ✅ REACHABLE |
| Greyed | ✅ REACHABLE — `aria-disabled="true"`, focusable, in the tab order, hover fill suppressed, the selected segment keeps its outline, the control is never removed |
| Greyed, sheet | ✅ REACHABLE — `showHint` is true only in the sheet |

### Chip row

| State | Verdict |
|---|---|
| Empty | ✅ REACHABLE — `chips.none` in `--fg-locked` plus an inert Clear, height reserved at both widths |
| Populated | ✅ REACHABLE — one chip per off-default control in control order, no wrap, no scroll |
| Overflowing | ⚠️ PARTIALLY REACHABLE — the dashed `+N` chip renders and carries no ✕, but it is a `<span>` with no handler, so it does not open the sheet |

### Filters badge (phone)

| State | Verdict |
|---|---|
| Absent | ⚠️ PARTIALLY REACHABLE — no badge is drawn at zero, but the button's padding is fixed at 14px and never becomes the drawn 0 13px |
| Present | ⚠️ PARTIALLY REACHABLE — counts controls not values, ceiling 4/3, border turns brass; the drawn padding change to 0 11px does not happen |

### Lane-level structure

| State | Verdict |
|---|---|
| Owned lane, any state | ✅ REACHABLE — scope control absent, not greyed |
| Discover lane, any state | ✅ REACHABLE — availability absent, not greyed; no 0–100 score and no delta on the row |
| No printing thumbnail at rest | ✅ REACHABLE |
| No header CTA | ✅ REACHABLE |
| Filtered row vs unfiltered row | ✅ REACHABLE — filtering never trims a row's figure set |
| Rack, all twelve cells | ✅ REACHABLE — never collapses, reorders, sticks, or changes height with the results |

### Copy paths with no render site

`commandersCopy.empty.bodyMode` and `.fixMode` ("Switch to `Any of these`") are
defined but never rendered: `filtered-empty.tsx` only ever wires `bodyOneFix` /
`bodyNoSingleFix` with `fixDrop` and `clearAll`, and `nearestFix` in
`commanders-view.tsx` considers colours only. The zero state caused by
`Exactly` therefore cannot offer its specific correction.

---

## Visual gaps

1. `page-header.tsx:20-26` — Header container — breakpoint mechanism — design: 1024px (`useIsWide`/`lg:`) → implementation: `sm:` (640px)
2. `page-header.tsx:25` — Header container — flex-direction (desktop) — design: column → implementation: `sm:flex-row`
3. `rack/filter-rack.tsx:96` — Control row — gap — design: 10px → implementation: 14px
4. `rack/filter-rack.tsx:96` — Control row — flex-wrap — design: nowrap → implementation: `flex-wrap`
5. `rack/filter-rack.tsx:197` — Filters button — padding — design: 0 13px, 0 11px with badge → implementation: `px-[14px]` always
6. `rack/filter-rack.tsx:198` — Filters button — font-size — design: 13.5px → implementation: 13px
7. `rack/filter-rack.tsx:208` — Filters badge — font-size — design: 10.5px → implementation: 11px
8. `rack/filter-rack.tsx:208` — Filters badge — padding — design: 1px 6px → implementation: `h-[18px] min-w-[18px] px-[5px]`
9. `ui/text-field.tsx:105` — Search leading icon — element — design: SVG, `viewBox 0 0 20 20`, `<circle r=5.4>` + `m13.2 13.2 3.3 3.3` → implementation: text glyph `⌕`
10. `rack/search-control.tsx:40` — Search field — padding / gap (mobile) — design: 0 12px / 9px → implementation: `px-[10px]` / `gap-[8px]`
11. `rack/search-control.tsx:48` — Search field — font-size (desktop) — design: 13px → implementation: 12.5px
12. `rack/search-control.tsx:61` — Clear disc — size (mobile) — design: 22px → implementation: 24px
13. `rack/colour-control.tsx:89` — Pip wrapper — gap / padding — design: 10px / 0 4px 0 10px → implementation: 8px / `px-[10px]`
14. `rack/colour-control.tsx:100` — Colour pips — gap (desktop) — design: 5px → implementation: 8px
15. `rack/colour-control.tsx:130` — Colour pip (unlit) — opacity (mobile) — design: .4 → implementation: .34
16. `rack/colour-control.tsx:141` — Divider — height — design: 20px → implementation: 16px
17. `rack/colour-control.tsx:192` — Match segment — border-radius (desktop) — design: 6px → implementation: 4px
18. `rack/colour-control.tsx:193` — Match segment — radius / padding / font-size (mobile) — design: 999px / 0 16px / 13.5px → implementation: `rounded-lg` / none / 13px
19. `rack/colour-control.tsx:180-200` — Selected segment (mobile) — fill / label — design: `rgba(accent,.16)` + 1px accent border + `--fg` label → implementation: solid brass fill + `--bg` label
20. `rack/colour-control.tsx:180-200` — Unselected segment (mobile) — border — design: 1px `#3A3229` → implementation: `border-transparent`
21. `rack/colour-control.tsx:216` — Explainer line — margin-top — design: 8px → implementation: 0 (`m-0`)
22. `rack/colour-control.tsx:228`, `rack/availability-control.tsx:57`, `rack/filter-sheet.tsx:305` — Legends — letter-spacing — design: .14em → implementation: .12em
23. `rack/availability-control.tsx:66` — Control — gap — design: 0 desktop / 8px mobile → implementation: 3px / 6px
24. `rack/availability-control.tsx:66` — Control — radius / overflow (mobile) — design: 999px, `overflow: hidden` → implementation: `rounded-lg`, no clipping
25. `rack/availability-control.tsx:106-107` — Segment — padding — design: 0 11px / 0 16px → implementation: `px-[13px]` / `px-[10px]`
26. `rack/availability-control.tsx:107` — Segment — font-size (mobile) — design: 13.5px → implementation: 13px
27. `rack/availability-control.tsx:100-115` — Unselected segment — border-left — design: 1px `#2E2822` → implementation: absent
28. `rack/availability-control.tsx:100-115` — Unselected segment — colour (desktop) — design: `#A89B84` (`--fg-muted`) → implementation: `--fg-body`
29. `rack/select.tsx:208` — Trigger pill — font-size — design: 12.5px → implementation: 12px
30. `rack/select.tsx:207` — Trigger pill — padding — design: 0 13px (order) / 0 12px (scope) → implementation: `px-[12px]` both
31. `rack/select.tsx:221` — Caret — colour — design: `#8E8269` → implementation: `--accent`
32. `rack/select.tsx:208` — Trigger label — colour — design: `#C6B79A` at default, `#EDE6D8` off default → implementation: always `--fg`
33. `rack/select.tsx:233` — Order menu — width — design: 280px → implementation: 260px
34. `rack/select.tsx:233` — Order menu — box-shadow — design: `0 16px 40px rgba(0,0,0,.5)` → implementation: none
35. `rack/select.tsx:266` — Menu row — gap / padding — design: 9px / 9px 11px → implementation: 10px / 12px 9px
36. `rack/select.tsx:274` — Menu row marker — size — design: 7px → implementation: 6px
37. `rack/select.tsx:266-282` — Menu row — gloss line — design: mono 10px `#8E8269` under the label → implementation: not rendered on desktop
38. `rack/select.tsx:148` — Sheet option row — radius / gap — design: 10px / 11px → implementation: `rounded-lg` / 8px
39. `rack/select.tsx:169` — Sheet option row title — size / weight — design: 14px / 600 → implementation: 13.5px / regular
40. `rack/select.tsx:150-160` — Sheet option diamond (unpicked) — size / border — design: 8px / 1px `#4A4033` → implementation: 7px / 1.5px `--border-strong`
41. `rack/select.tsx:148-175` — Sheet order pills — radius / padding / selected fill — design: 999px / 0 16px / `rgba(201,162,75,.16)` → implementation: `rounded-lg` / `px-[12px]` / `--elevated-hover`
42. `rack/filter-rack.tsx:74-87`, `rack/order-control.tsx` — Order control (phone) — treatment — design: icon-only 44×44 button with a 17×17 SVG (`M5 5h10M6.5 10h7M8.5 15h3`, stroke-width 1.6) → implementation: text pill with caret; the SVG does not exist
43. `rack/chip-line.tsx:67` — Chip row — gap — design: 7px both → implementation: 8px / 6px
44. `rack/chip-line.tsx:202` — Chip — height — design: 30px / 22px → implementation: none (padding-derived)
45. `rack/chip-line.tsx:202` — Chip — font-family / size — design: IBM Plex Mono 11px / 10.5px → implementation: `font-sans` 12px
46. `rack/chip-line.tsx:202` — Chip — label colour / border — design: `#C6B79A` on `--border` → implementation: `--fg` on `--border-strong`
47. `rack/chip-line.tsx:202` — Chip — padding (mobile) — design: 0 11px → implementation: `px-[9px] py-[3px]`
48. `rack/chip-line.tsx:190-215` — Colour chip pip squares — shape / count — design: one 8px (7px mobile) square per hue, radius 2px, 3px gap → implementation: a single 9px round dot, rendered only when exactly one pip is lit
49. `rack/chip-line.tsx:190-215` — Colour chip label (desktop) — design: joined colour names → implementation: `filterCopy.colour.collapsed(n)`
50. `rack/chip-line.tsx:92` — Overflow chip — background — design: `#171310` → implementation: none
51. `rack/chip-line.tsx:108` — Clear — padding / font-size (desktop) — design: 0 6px / 0 4px, 11px → implementation: `p-0`, 10.5px
52. `rack/result-line.tsx:42` — Result line — font-size — design: 11.5px → implementation: 11px
53. `rack/result-line.tsx:42` — Result line — colour — design: `#C6B79A` → implementation: `--fg-muted` (`#A89B84`)
54. `rack/result-line.tsx:42` — Result line — font-variant-numeric — design: tabular figures → implementation: none
55. `rack/result-line.tsx:30-45` — Result-line aside — colour — design: `#8E8269` span → implementation: plain text inside the same string
56. `rack/filter-sheet.tsx:190` — Sheet container — border-radius — design: 22px → implementation: 16px
57. `rack/filter-sheet.tsx:207` — Handle — width — design: 38px → implementation: 36px
58. `rack/filter-sheet.tsx:181` — Backdrop — opacity — design: .74 → implementation: 72%
59. `rack/filter-sheet.tsx:221` — Section stack — gap — design: 14px → implementation: 22px
60. `rack/filter-sheet.tsx:269` — Footer Clear — copy key — design: `filterCopy.chips.clearAll` → implementation: `filterCopy.chips.clear`
61. `rack/filter-sheet.tsx:263` — Footer Clear — font-size / height — design: 14px / 48px → implementation: 13.5px / padding-derived
62. `rack/filter-sheet.tsx:272` — Footer primary — font-size / height — design: 14px / 48px → implementation: 13.5px / padding-derived
63. `filtered-empty.tsx:68-72` — Zero-state buttons — radius / font-size (mobile) — design: 8px / 12.5px → implementation: `rounded-[10px]` / 14px
64. `filtered-empty.tsx:56` — Button group — margin-top (mobile) — design: 4px → implementation: 6px
65. `filtered-empty.tsx` (whole file) — Zero state — breakpoint mechanism — design: 1024px → implementation: `sm:` (640px)
66. `rec-card.tsx:263-266` — Row container (desktop) — layout / gap / padding — design: flex, gap 14px, padding 13px 22px → implementation: CSS grid `24px 1fr 206px 32px`, gap 20, padding 24px 26px
67. `rec-card.tsx:128` — Row container — padding (mobile) — design: 12px 0 → implementation: 12px 13px
68. `rec-card.tsx:139` — Rank — font-size (mobile) — design: 14px → implementation: 17px
69. `rec-card.tsx:276` — Rank — colour (desktop) — design: `#C6B79A` → implementation: `--fg-faint`
70. `rec-card.tsx:272` — Rank column — gap — design: 6px → implementation: 7px
71. `rec-card.tsx:139/276/415` — Rank and fit figure — font-variant-numeric — design: tabular figures → implementation: none
72. `rec-card.tsx:302` — Name — font-size (mobile) — design: 15px → implementation: 14.5px
73. `rec-card.tsx:297` — Content column — gap — design: 9px → implementation: 13px
74. `rec-card.tsx:314` — Synergy row — gap — design: 11px → implementation: 10px
75. `rec-card.tsx:319` — Synergy legend — letter-spacing — design: .14em → implementation: .12em
76. `rec-card.tsx:320-340` — Synergy figure — size / colour — design: 11px `#A89B84` → implementation: 12px `--fg-body` (desktop), `--fg-faint` (mobile)
77. `rec-card.tsx:415` — Fit block — gap — design: 7px → implementation: 10px
78. `rec-card.tsx:415-440` — Fit denominator — letter-spacing (desktop) — design: .08em → implementation: .1em
79. `receipt-line.tsx` (called from `rec-card.tsx`) — Receipts line — font-size (desktop) — design: 11.5px → implementation: 12.5px
80. `rec-card.tsx:463`, `discovery-row.tsx:560+` — Row action — border-radius — design: 8px → implementation: `rounded-full`
81. `fit-bar.tsx:34` — Split bar — height — design: 5px / 6px → implementation: 6px / 8px
82. `fit-bar.tsx:57-59` — Split legend — gap — design: 11px outer / 4px inner → implementation: 12px / 5px
83. `role-chips.tsx:35` — Role chip — radius / height — design: 6px / 22px → implementation: `rounded-full` / padding-derived
84. `role-chips.tsx:35` — Role chip — padding / font-size (desktop) — design: 0 9px / 10px → implementation: 3px 8px, 4px 10px / 11px
85. `role-chips.tsx:45` — Role chip label — letter-spacing — design: .08em → implementation: .05em
86. `role-chips.tsx:35` — Role chip — border — design: `--border` → implementation: `--border-strong`
87. `commander-art.tsx:11` — Art bleed — mask stops (phone) — design: 46% / 74% → implementation: 42% / 72% (desktop stops reused)
88. `commander-art.tsx:76-90` — Identity pips — shape / size / gap — design: 8px (9px desktop) squares, radius 2px, gap 4px / 3px → implementation: 9px circles at both widths, gap 3px
89. `discovery-row.tsx:536` — Right column — gap — design: 8px → implementation: 10px
90. `discovery-row.tsx:375` — Support-count unit — letter-spacing (mobile) — design: .08em → implementation: .1em
91. `discovery-row.tsx:198` — Ratio bar — height (mobile) — design: 5px → implementation: 6px
92. `discovery-row.tsx:479` — Popularity / novelty lines — gap / colour — design: 4px / `#A89B84` → implementation: 10px / `--fg-body`
93. `discovery-row.tsx:490-520` — Not-owned line — font-size / colour (desktop) — design: 11.5px `#A89B84` → implementation: 12.5px `--fg-faint`
94. `rec-card.tsx`, `role-chips.tsx`, `fit-bar.tsx`, `receipt-line.tsx` — Owned row — copy keys — design: `commandersCopy.row.ownOfTop` / `.receipts` / `.roleCounter` / `.splitLegend` / `.delta` and the `.row.*` availability keys → implementation: defined but never called; strings are hardcoded inline or read from `availabilityCopy.receipt.*`
95. `shell/nav.tsx:279` — Tab label — letter-spacing — design: .04em → implementation: .06em
96. `shell/nav-icons.tsx:24-25` — Nav icons — size at 320px — design: 18px → implementation: 19px at every width

## State reachability gaps

1. 6 · Filtered to zero — owned — the zero state is gated on `colors.length > 0`, so a search-only or availability-only zero result renders an empty list and no zero state — `commanders-view.tsx` (zero-state guard)
2. 6 · Filtered to zero — owned — `commandersCopy.empty.bodyMode` / `.fixMode` have no render path, so the `Exactly`-caused zero state cannot offer its specific correction — `filtered-empty.tsx:120-145`, `commanders-view.tsx` (`nearestFix`, colours only)
3. 1 · No filters — phone — the persistent row's order slot is a text pill, not the drawn icon-only 44×44 button — `rack/filter-rack.tsx:74-87`
4. Chip row · Overflowing — the `+N` chip is a non-interactive `<span>`, so it never opens the sheet — `rack/chip-line.tsx:92`
5. 4 · Exact mode — phone / 6 · phone — `CAP.narrow = 1` yields one chip + `+4` where the table draws two chips + `+3` — `rack/chip-line.tsx:20`
6. Filters badge · Absent and Present — the button's padding never changes between 0 13px and 0 11px — `rack/filter-rack.tsx:197`
7. 5 · Sheet open — the header prints `activeControlCount` in a brass badge instead of the live result count — `rack/filter-sheet.tsx:210-220`
8. URL and state plumbing — the result line has no 300ms debounce; it announces on every keystroke — `rack/result-line.tsx:38-45`
9. 2 · Colour only — phone — colours collapse to `collapsed(n)` at both widths, so the desktop chip never shows joined names and the collapse is not width-driven — `rack/chip-line.tsx:190-215`

VERDICT: 96 visual gaps, 9 state gaps

---

## Round 2 — confirmation

Every gap above was triaged into three buckets: fixed, table error, or deferred by
design. The triage and its reasoning are recorded in the commit range on
`feat/two-lanes`; the confirmation pass rechecked only the items marked for repair.

**Fixed.** The chip and segment geometry, the phone order trigger's glyph, the
collapsed `+N` chip's sheet affordance, the discover order glosses, the rack's drawn
magnifier, the owned lane's search-miss zero state, the sheet header's live result
sentence, the 300ms announcement debounce with an immediately drawn line, tabular
figures on the discovery row, and the `Filters` trigger's badge-dependent padding.

**Table error.** The canvas draws five colours the theme does not ratify —
`#C6B79A`, `#2A241D`, `#2E2822`, `#A89B84`, `#4A4033`. Each is an unratified shade
adjacent to a real token, so the nearest ratified token ships instead:
`--fg-body`, `--border`, `--border`, `--fg-muted`, `--border-strong`. The property
table and the canvas also disagree on the sheet header's count colour (`#8E8269`
against `#C6B79A`); the canvas wins, as the drawing of record.

**Deferred by design.** Three items are left unbuilt on purpose and are raised in
the pull request for ratification:

1. `commandersCopy.empty.bodyMode` / `.fixMode` have no render path, so an
   `Exactly`-caused zero result offers the generic correction rather than the
   mode-specific one. `nearestFix` enumerates colours only.
2. `CAP.narrow = 1` yields one chip and a `+4` where the table draws two chips and
   a `+3`. Rendered width is unknowable at render time and is zero under jsdom, so
   the cap is a constant rather than a measurement.
3. Colour chips collapse to a count at both widths, so the collapse is not
   width-driven and the desktop chip never joins the colour names.

State gap 1 is not a gap. An availability-only zero result is unreachable by
construction: the free ranking is a re-score of the same members, not a filter, so
`avail=free` removes no rows. `shown === total === 0` happens only when the reader
owns nothing, which is the honest empty list.

VERDICT: 0 gaps remain
