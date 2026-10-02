# Design Property Table — Recommendations (#130 / #131)

Enumerated from the design handoff only. Sources read in full:

- `design/design_handoff_the99_recommendations/README.md`
- `design/design_handoff_the99_recommendations/ADDENDUM-README.md`
- `design/design_handoff_the99_recommendations/READINESS.md`
- `design/design_handoff_the99_recommendations/DENSITY-long-role.md`
- `design/design_handoff_the99_recommendations/recommendations · copy strings.ts`
- `design/design_handoff_the99_recommendations/The 99 - Recommendations.dc.html` (R1 canvas)
- `design/design_handoff_the99_recommendations/The 99 - Recommendations Addendum.dc.html` (R2/R3 addendum canvas)

`src/` was **not** read. Every value below is transcribed from the canvases' inline styles or
from the prose files; nothing is inferred from the codebase.

## Conventions

- **Desktop** = the `md:` branch (≥768px). **Mobile** = the 390px frames drawn in both canvases.
- `—` means the property is **explicitly absent at that width** in the handoff (drawn without it,
  or the prose says the other width owns it).
- *(unspecified)* means the handoff never states it. Not inferred.
- Hexes are as drawn. Token names in `--foo` form are the CONTRACT panel's own mapping:
  `--brass` #C9A24B, `--brass-shadow` #6E5B33, `--brass-mid` #A9863E, `--fg` #EDE6D8,
  `--fg-body` #C6B79A, `--fg-locked` #6A6152, `--fg-faint` #8E8269, `--elevated` #2A241D,
  `--border` #2A241D, `--border-strong` #3A3229, `--warning` #E0913C, `--success` #6FA368.
- Fonts: `'Cinzel', serif`; `'IBM Plex Mono', monospace` (written **mono** below);
  body/sans is the inherited default and is written **sans**.
- Where the addendum overrides R1, the addendum value is given and the override is noted.
- Mock figures (inclusion percentages) are **fabricated** per README "Mock data"; they are
  recorded because the property table is about the drawing, not about the data.

---

# Part 1 — #131 · Role Coverage (`/commanders/[slug]`)

## 1. Role Coverage section header

| Property | Desktop (≥768px) | Mobile (<768px) |
|---|---|---|
| Title typography | Cinzel 600, 20px, #EDE6D8 | Cinzel 600, 20px, #EDE6D8 |
| Sub-caption typography | mono 12px, #8E8269, `margin-top: 2px` | mono 12px, #8E8269, `margin-top: 2px` |
| Sub-caption copy (figures present) | `Your owned cards by role · figures from EDHREC` (`coverage.subcaption`) | same |
| Sub-caption copy (no figures) | `Your owned cards by role` (`coverage.subcaptionNoFigures`) | same |
| Conditional rendering | Sub-caption branches on figure availability; states 5 and A1 both use `subcaptionNoFigures` | same |
| Landmark | `section[aria-labelledby=role-ramp]` (per-role heading id) | same |
| REPLACES | Replaces hardcoded JSX in `detail.tsx` (`'Your owned cards by role'`); the string must be lifted into a copy module first | same |

## 2. Role panel (container)

| Property | Desktop | Mobile |
|---|---|---|
| Background | `#1A160F` | `#1A160F` |
| Border | `1px solid #2A241D` (`--border`) | `1px solid #2A241D` |
| Border radius | `10px` | `10px` |
| Padding | `15px 18px` | `13px 14px` |
| Header row layout | `display:flex; align-items:baseline; gap:12px; margin-bottom:10px` | header stacks: name+count on line 1, gap clause on its own line |
| Role name | 15px / 600, #EDE6D8 | 15px / 600, #EDE6D8 |
| Owned count | mono 12px, #6FA368 (`--success`), e.g. `14 owned` | mono 11.5px, #6FA368 |
| Gap clause position | `margin-left:auto` (right of header row) | own line below, `margin-bottom:9px` |
| Gap clause typography | mono 12px, #8E8269 | mono 10.5px, #8E8269 |
| Gap clause copy | `recommendationsCopy.coverage.gap(count, target, measured)` (How it works §5.4b). Against the commander's measured target: `{d} short of the {t} its decks run` / `At the {t} its decks run` / `Well past the {t} its decks run`, and `Its decks run none` for a measured 0, which is never short. Against the fallback: `{n} short of baseline` / `At the {n}-source baseline` / `Well past the {n}-source baseline` | same |
| Empty-pool copy | `No {role} cards in your pool`, mono 11px, #6E6353 — no list, no disclosure | same (shipped, unchanged) |
| Chip container | flex wrap of pills | `display:flex; flex-direction:column` list of rows |

## 3. Coverage chip — desktop (shipped `OwnedChip`, now a `<button>`)

| Property | Desktop | Mobile |
|---|---|---|
| Element | `<button>` inside `ul > li` | — (mobile uses the row, §4) |
| Display | `inline-flex; align-items:center` | — |
| Gap | `8px` | — |
| Height | `28px` | — |
| Border radius | `999px` | — |
| Background | `#221D16` (shipped plate, untouched) | — |
| Border | `1px solid #33402F` | — |
| Padding (with figure) | `0 4px 0 10px` | — |
| Padding (no figure) | `0 10px` | — |
| Name typography | mono 11.5px, #C6B79A (`--fg-body`) | — |
| Dot | `6px × 6px`, `border-radius:999px`, `background:#6FA368` | — |
| Figure plate — background | `#2A241D` (`--elevated`) | — |
| Figure plate — radius / padding | `999px` / `3px 7px` | — |
| Figure plate — type | mono 10.5px, #EDE6D8 (`--fg`), `font-variant-numeric: tabular-nums` | — |
| Figure copy | `{pct}%` (`coverage.chipFigure`) | — |
| Absent figure | em dash `—`, mono 10.5px, #6A6152 (`--fg-locked`), **plate removed**, `aria-hidden` | — |
| **Hover** | border → `1px solid #C9A24B` (`--brass`); name → #EDE6D8 | — (no hover) |
| **Focus** | `outline: 2px solid #C9A24B; outline-offset: 2px` (global `:focus-visible`, not bespoke) | — |
| **Active / pressed** | *(unspecified)* | — |
| **Disabled** | never disabled — trigger stays live while fetching (`card-detail-provider.tsx` note) | — |
| Transition | none — CONTRACT: "no tag transition beyond colour", nothing added | — |
| Transform | none | — |
| Accessible name | `View details for {name}. In {pct}% of decks.` / `View details for {name}. No EDHREC figure.` | — |
| Tap target | 28px, **pointer-only by design**; phone row is the accessible equivalent (open gap 2) | — |
| Ordering | `inclusionPct` descending, **absent last** | same rule |
| Per-chip bar | **none** — explicitly rejected (a wrap of bars reads as a meter) | — |
| Per-chip add control | **none** (§8 ruling 7 — pre-deck surface) | none |

## 4. Coverage row — phone

| Property | Desktop | Mobile |
|---|---|---|
| Element | — | `<button>` row inside `ul > li` |
| Display | — | `flex; align-items:center` |
| Gap | — | `9px` |
| Min-height | — | `44px` |
| Background | — | `#1E1A15` |
| Border | — | `1px solid #2A241D` |
| Border radius | — | `8px` |
| Padding | — | `0 12px` |
| Dot | — | `7px × 7px`, `border-radius:999px`, `background:#6FA368` |
| Name | — | `flex:auto; min-width:0`, 13.5px, #EDE6D8, `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` |
| Figure | — | `flex:none`, mono 11.5px, #EDE6D8, tabular, hard right |
| Absent figure | — | `—`, mono 11.5px, #6A6152 |
| Figure plate | — | **none** — the column of right-aligned figures replaces the plate |
| Tap target | — | the whole 44px row |
| Accessible name | — | same two strings as the desktop chip |

## 5. Disclosure control

| Property | Desktop | Mobile |
|---|---|---|
| Shape | pill chip, `display:inline-flex` | full-width row |
| Gap | `6px` | *(unspecified)* |
| Height | `28px` | `min-height: 44px` |
| Background (expandable) | `transparent` | `transparent` |
| Border | `1px dashed #3A3229` (`--border-strong`) | `1px dashed #3A3229` |
| Border radius | `999px` | `8px` |
| Padding | `0 12px` | *(unspecified)* |
| Typography | mono 11px, #8E8269 | mono 12px, #C9A24B |
| Resting copy | `+{n} more` (`coverage.moreChips`) | `Show all {n}` (`coverage.showAll`) — e.g. `Show all 14`, `Show all 9`, `Show all 34` |
| Expanded copy | `Show fewer` (`coverage.showFewer`) | `Show fewer` |
| Long-role variant (state 6) | `background:#2A241D; border:1px solid #3A3229; color:#C9A24B` — solid, brass label, drawn as `+22 more` | same dashed 44px row, `Show all 34` |
| Beyond-cap copy | `+{n} more not shown` (`coverage.beyondCap`) — **inert text, no hit box** | same |
| ARIA | `aria-expanded`, `aria-controls` on the button | same |
| Accessible name | `Show all {n} {role} cards` (`coverage.showAllAria`) | same |
| Focus behaviour on expand | **no focus stealing** — focus stays on the disclosure, which becomes `Show fewer` | same |
| Collapse behaviour | returns to resting height; scroll position discarded, not restored | same |

## 6. Render caps and the expanded container (`DENSITY-long-role.md`)

| Property | Desktop | Mobile |
|---|---|---|
| Resting render per role | **12 chips + 1 disclosure** | **6 rows** |
| Resting height per role | ~76px (two rows) | ~300px |
| Expanded render | up to **40** | up to **40** |
| Expanded container | `max-height: 320px; overflow: hidden` as drawn; spec is `max-height:320px; overflow-y:auto` | same |
| Beyond 40 | `+N more` as an inert **count** | same |
| Virtualisation | **none** — plain overflow (160-node worst case; `commanders-windowing` precedent at 214 rows) | none |
| Cap source | media query (`cap = 12 or 6`), **not** a measured width | same |
| Edge counts | 0 → empty-pool string; 1–6 → all, no disclosure; 7–12 → all, no disclosure; 13–40 → capped + disclosure; 41+ → capped + disclosure, expanded shows 40 + inert `+N more` | 0 → empty-pool string; 1–6 → all, no disclosure; 7+ → 6 + `Show all N` |
| Frame caveat | — | state 6's phone Card Draw frame draws **4** chips under `Show all 14`; that is a clipped 860px frame, **not** a cap change |

## 7. Absent-figure legend (state 4)

| Property | Desktop | Mobile |
|---|---|---|
| Typography | mono 10px, #6A6152, `margin-top: 10px` | mono 10px, #6A6152 |
| Copy | `— = no EDHREC figure for this card` (`coverage.chipNoFigureLegend`) | `— = no EDHREC figure` |
| Conditional rendering | drawn only where neighbouring chips carry figures; never in state 5 or A1 | same |

## 8. Panel-level EDHREC note — **absent** (state 5)

| Property | Desktop | Mobile |
|---|---|---|
| Background | `#211C15` | `#211C15` |
| Border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` |
| Left rule | `border-left: 2px solid #8E8269` (`--fg-faint`) | same |
| Border radius | `8px` | `8px` |
| Padding | `9px 13px` | `9px 12px` |
| Margin | `margin-top: 14px` | `margin-bottom: 14px` |
| Max width | `640px` | — (full width of the frame) |
| Icon | `⚠`, #8E8269, 13px | `⚠`, #8E8269, 12px |
| Body typography | 12.5px, #A89B84; bold lead in #C6B79A | 12px |
| Heading copy | `No EDHREC figures for this commander` (`coverage.absentHeading`) | same |
| Body copy | `the roles below are your collection’s, counted the same way. We just can’t say how often other decks run them.` (`coverage.absentBody`) | `roles still count, we just can’t rank them.` (`coverage.absentBodyMobile`) |
| Retry control | **none** — absent is permanent, no retry | **none** |
| Chip treatment below | figure slot **removed entirely**, padding returns to `0 10px` — byte-for-byte the shipped chip | rows drop the figure column |
| Count | one note per section, never per chip | same |

## 9. Panel-level EDHREC note — **degraded** (addendum A1)

| Property | Desktop | Mobile |
|---|---|---|
| Background | `#181410` | `#181410` |
| Border | `1px solid #2A241D` | `1px solid #2A241D` |
| Left rule | `border-left: 3px solid #E0913C` (`--warning`) — the whole visual delta vs. absent | same |
| Border radius | `9px` | `8px` |
| Padding | `11px 15px` | `10px 12px` |
| Margin | `margin-top: 14px` | *(unspecified)* |
| Max width | `700px` | — |
| Heading copy | `EDHREC figures unavailable` (`coverage.degradedHeading`) | same |
| Body copy | `we couldn’t reach EDHREC, so the percentages are hidden for now.` (`coverage.degradedBody`) | same |
| Retry placement | **inline, right of the sentence**, `flex:none`, on the clause's baseline | **own 44px line**, `min-height:44px; margin-top:2px; padding-left:20px` |
| Retry typography | 12.5px / 600, #C9A24B, `border-bottom: 1px solid #6E5B33` | 13px / 600, #C9A24B, same underline |
| Retry copy | `Try again` (`coverage.degradedRetry`) | same |
| Retry accessible name | `Try loading EDHREC figures again` (`coverage.degradedRetryAria`) | same |
| Retry count | **one retry for the whole section** — four panels read one payload | same |
| Retry **in-flight** | shipped `CardDetailTrigger` disabled treatment: `opacity: 0.55`, `aria-busy`; **label text does not change** | same |
| Retry **second failure** | no escalating copy | same |
| Chip treatment below | figure slot removed (not dashed); padding `0 10px`; chips stay **live controls** (modal is a Scryfall read) | rows drop the figure; **six rows and no disclosure** |
| Ordering fallback | pool order (nothing to sort by) | same |

## 10. Card detail modal opened from a chip (state 7)

| Property | Desktop | Mobile |
|---|---|---|
| Backdrop | `rgba(10,7,4,0.82)` | `rgba(10,7,4,0.82)` |
| Dialog width | `620px` | full-width sheet; frame drawn `620px` tall |
| Background | `#1A160F` | `#1A160F` |
| Border | `1px solid #3A3229` | `1px solid #3A3229` |
| Border radius | `14px` | `14px` |
| Shadow | `0 30px 80px rgba(0,0,0,0.6)` | same |
| Header | `padding: 14px 18px; border-bottom: 1px solid #2A241D` | — (art is the header) |
| Counter copy | `3 of 8 · Removal`, mono 11px, #8E8269 | *(unspecified)* |
| Prev/Next | `‹ Prev` / `Next ›`, mono 12px, #C6B79A, `1px solid #3A3229`, radius `6px`, padding `4px 9px` | `min-width:44px; height:44px; 1px solid #3A3229; border-radius:8px` |
| Close | `✕` 14px, `padding: 3px 9px` | `30 × 30`, `border-radius:999px`, `background: rgba(10,7,4,0.55)`, overlaid on the art |
| Body layout | `display:grid; grid-template-columns: 200px 1fr; gap:20px; padding:20px` | single column; art header `180px` |
| Art | `aspect-ratio: 63/88; border-radius: 10px` | 180px header image |
| Card name | Cinzel 700, 21px | Cinzel 700, 19px |
| Type line | 12.5px, #C6B79A | same |
| EDHREC bar track | `height:4px; border-radius:999px; background:#2A241D` | same |
| EDHREC bar fill | `width: 33%; background: #C9A24B` | drawn at label width `50px` |
| Figure | mono 10.5px, #C6B79A, tabular | same |
| Delta line | `+14 pts vs. all decks`, mono 9.5px, #6E5B33 | *(unspecified)* |
| Meta rows | `Owned` → `1 copy · MM3`; `Role` → `Removal` | same |
| **Add control** | **none on this route** (§8 derived 7 — the modal must not assume a deck) | none |
| Siblings | the role's ordered oracle ids, so Prev/Next walks the role group | same |
| Focus | shipped trap, Escape, first-focusable, focus returned to the originating chip — nothing overridden | same |
| Effect on `auto` | none — inspection is not endorsement (§8 ruling 5) | same |

## 11. "Build this deck" — the promise (#130 entry point)

| Property | Desktop | Mobile |
|---|---|---|
| Container | inline seed note under the desktop CTA | sticky bar: `border-top: 1px solid #3A3229; background:#1A160F; padding: 12px 16px 24px; gap: 12px` |
| Label line | — | `READY TO BUILD` (`build.stickyLabel`), mono 10px, #8E8269 |
| Promise line | `We’ll fill {n} of the 99 — roles and lands. The rest is yours.` (`build.seedNote`) | `We’ll fill {n} of the 99` (`build.stickyPromise`), 12px, #C6B79A |
| Button | *(unspecified in the drawn desktop frame beyond the note beneath it)* | `Build this deck →`, `background:#C9A24B; color:#14110E; 14px/600; border-radius:8px; padding:12px 20px; white-space:nowrap` |
| REPLACES | desktop seed note replaces `'Your owned pool will seed the deck builder'` (hardcoded JSX, `detail.tsx` ~853) | sticky sub-line replaces `'{n} cards in your pool'` (hardcoded JSX, `detail.tsx` ~758) |
| Drawn value of `{n}` | `68` | `68` |

---

# Part 2 — #130 · The filled deck (`/decks/[id]`)

## 12. Deck header

| Property | Desktop | Mobile |
|---|---|---|
| Padding | `16px 30px` | `12px 14px` |
| Border-bottom | `1px solid #2A241D` | `1px solid #2A241D` |
| Background | *(inherited)* | `#14110E` |
| Commander name | Cinzel 700, 22px, #EDE6D8 | Cinzel 700, 17px, #EDE6D8 |
| Sub-line typography | mono 11.5px, #8E8269 | mono 10.5px, #8E8269, `margin-top:2px` |
| Sub-line copy (state 8) | `68 of 99 · 61 owned · 7 to buy` | same |
| Sub-line copy (state 13) | `67 of 99 · 60 owned · 7 to buy` | `67 of 99 · 60 owned · 7 to buy` |
| Sub-line copy (state 9) | `66 of 99 · 58 owned · 8 to buy` | *(not drawn)* |
| Sub-line copy (state 14) | `Filling {n} of 99…` (`fill.filling`) | `Filling 68 of 99…` |
| Status pill — filled | `Building`, mono 11px, #C9A24B, `1px solid #6E5B33`, `border-radius:999px`, `padding:4px 11px` | *(not drawn at phone)* |
| Status pill — in-flight | `Draft`, mono 11px, #6A6152, **`1px dashed #3A3229`**, `border-radius:999px`, `padding:4px 11px` | *(not drawn at phone)* |
| Pill ownership | **no copy key** — the shipped `Draft`/`Building`/`Playable`/`Complete` ladder computes it; the copy file records only a mapping, and if the thresholds disagree the thresholds win | same |

## 13. Recommended-mix strip — caption row

| Property | Desktop | Mobile |
|---|---|---|
| Strip padding | `14px 30px` | `10px 14px` (state 8) / `12px 14px` (state 14) |
| Border-bottom | *(unspecified)* | `1px solid #2A241D` |
| Caption layout | caption + gloss on one row | `display:flex; justify-content:space-between; margin-bottom:8px` |
| Caption copy | `Recommended mix`, mono 11px, `letter-spacing:0.12em`, uppercase, #C6B79A | `Recommended mix`, mono 9px, `letter-spacing:0.1em`, uppercase, #8E8269 |
| Gloss copy | `EDHREC averages`, mono 10.5px, #8E8269 — the `· a guide, not a gate` tail is **retired** | **retired**, no gloss drawn |
| Cell gap | `8px` | `4px` |
| Strip decision | **untouched** (decision 8) — no layout change, no rename, no new construct | same |

## 14. Role counter cell — met (state 8)

| Property | Desktop | Mobile |
|---|---|---|
| Flex | `flex: 1` | `flex: 1` |
| Min-height | `72px` | `62px` |
| Background | `#181410` | `#181410` |
| Border | `1px solid #2A241D` (`--border`) | `1px solid #2A241D` |
| Border radius | `9px` | `7px` |
| Padding | `11px 14px` | `7px 2px 6px` |
| Text align | left | `center` |
| Label | mono 10px, `letter-spacing:0.1em`, uppercase, #8E8269 | mono 8.5px, #8E8269 |
| Numerator | mono 600, 16px, #6FA368, `margin-top:3px` | mono 600, 13px, #6FA368, `margin-top:2px` |
| Denominator | `/ {n}`, mono 400, 11px, #8E8269 | **—** (`hidden md:` in the shipped cell) |
| Track | `height:5px; border-radius:999px; background:#2A241D; margin-top:8px; overflow:hidden` | **—** |
| Fill (met) | `height:100%; width:100%; background:#6FA368; border-radius:999px` | **—** |
| Footer row | `display:flex; justify-content:space-between; margin-top:6px` | stacked, centred |
| `rec` line | `rec {n}`, mono 9px, #8E8269 | `rec {n}`, mono 8px, #6A6152, `margin-top:4px` |
| Caption (met) | `—`, mono 10px, #4A4033 | `—`, mono 9px, #3A3229, `margin-top:3px` |
| Drawn cells (state 8) | Ramp 10/10 rec 10 · Draw 10/10 rec 10 · Removal 8/8 rec 8 · Wipes 3/3 rec 3 · Land 37/37 rec ~37 | same five |

## 15. Role counter cell — short (state 13 / addendum A4)

| Property | Desktop | Mobile |
|---|---|---|
| Border | `1px solid #2A241D` (unchanged) | **`1px solid #3A3229` (`--border-strong`)** — the one addendum-only, phone-only addition |
| Numerator colour | `#C9A24B` (`--brass`), from `roleCellState` | `#C9A24B` |
| Denominator | `/ 3`, mono 400, 11px, #8E8269 | **—** — `rec 3` *is* the phone's denominator |
| Track | `height:5px; background:#2A241D` | **—** |
| Fill | `width: 67%; background: #A9863E` (`--brass-mid`) — 2 of 3 is a real quantity | **—** |
| Caption | `see shelf`, mono 10px, #C9A24B — a live control where met cells draw an inert dash | `see shelf`, mono 9px, #C9A24B |
| Tap target | *(unspecified)* | the 62px cell clears 44px on its own |
| Drawn cells (state 13) | Removal 8/8 rec 8 `—` · **Wipes 2/3 rec 3 `see shelf`** · Land 37/37 rec ~37 `—` | same treatment |
| Signals carrying "short" | figure colour, arithmetic, caption-as-control, bar | figure colour, arithmetic (`2` above `rec 3`), caption-as-control, **hairline border** |

## 16. Role counter cell — in-flight (state 14 / addendum A3)

| Property | Desktop | Mobile |
|---|---|---|
| Label colour | `#6A6152` (`--fg-locked`) — one step down | `#6A6152` |
| Numerator | `—`, mono 600, 16px, `#3A3229` (`--border-strong`) | `—`, mono 600, 13px, `#3A3229` |
| Zero | **never rendered** — `0 / 10` on a deck being built is a lie (null rule) | same |
| Denominator | **kept**: `/ 10`, `/ 10`, `/ 8`, `/ 3`, `/ 37` at `#4A4033` — what makes the dash read *pending* not *broken* | **—** (phone has no denominator) |
| Track | **no track and no fill element**: `height:0; border-top:1px dashed #3A3229; margin-top:10px; margin-bottom:11px` — holds the 5px as margin so the cell does not change height between frames | **—** |
| `rec` line | `rec {n}`, `#4A4033` | `rec {n}`, mono 8px, `#4A4033` |
| Caption | `—`, `#4A4033` | *(not drawn — the phone in-flight cell ends at `rec N`)* |
| Motion | **none** — no shimmer, no pulse, no indeterminate sweep | none |

## 17. Provenance line (state 8/13) and fill-failed banner (state 15)

| Property | Desktop | Mobile |
|---|---|---|
| Background | `#181410` | `#181410` |
| Border | `1px solid #2A241D` | `1px solid #2A241D` |
| Left rule (provenance) | `3px solid #C9A24B` (`--brass`) | `3px solid #C9A24B` |
| Left rule (fill-failed) | `3px solid #E0913C` (`--warning`) | *(not drawn at phone)* |
| Border radius | `9px` | `8px` |
| Padding | `11px 15px` | `9px 12px` |
| Margin-top | `12px` | `10px` |
| Gap | `9px` (provenance) / `11px` (banner) | *(no icon at phone)* |
| Leading badge | `i` disc: `20 × 20`, `border-radius:999px`, `1.5px solid #C9A24B`, Cinzel 700 12px, #C9A24B | **—** — the phone line drops the badge |
| Banner icon | `⚠`, #E0913C, 13px | *(not drawn)* |
| Body typography | 12.5px, #C6B79A, `line-height:1.55`; bold clause #EDE6D8 / 600 | 12px, #C6B79A, `line-height:1.55` |
| Copy — state 8 | `We filled the roles and the mana base — 68 cards, 7 of them from outside your collection. The other 31 are yours: that is where this commander actually happens, and it is where we are worst.` (`fill.provenance`) | `We filled the roles and the mana base — 68 cards, 7 from outside your collection. The other 31 are yours.` (`fill.provenanceMobile`) |
| Copy — all owned | `We filled the roles and the mana base — {filled} cards, all from your collection. The other {open} are yours.` (`fill.provenanceAllOwned`) | same |
| Copy — state 13 | `We filled 67 of 99. Wipes came up short — you own what you own, EDHREC knows what it knows, and that is everything we have. The other 32 are yours.` (`fill.provenanceShort`) | same |
| Copy — state 15 | `The deck is here, the cards aren’t.` + `We made the deck but couldn’t fill it. Nothing is lost — your commander is saved and the slots are empty.` (`fill.failedHeading` / `fill.failedBody`) | *(not drawn)* |
| Retry link (state 15) | `Try filling again`, `display:inline-flex; margin-top:10px`, 12.5px, #C9A24B, `border-bottom:1px solid #6E5B33`; accessible name `Try filling this deck again` | *(not drawn)* |
| Dismissal | **not dismissible**; the provenance line leaves when the last `auto` card does. The failed banner self-dismisses on a successful retry and does not reappear on reload if the deck is no longer empty | same |
| Retry placement rule | a **link in the banner**, never a third empty-state CTA | same |
| Rounding rule | state 13 quotes `67`; never rounded to 68 | same |

## 18. Decklist toolbar — tabs, filter, sweep

| Property | Desktop | Mobile |
|---|---|---|
| Tab row padding | `12px 30px` | `10px 14px` |
| Tab gap | *(unspecified)* | `8px` |
| Active tab | `Your deck` 13.5px/600 #EDE6D8, `border-bottom: 2px solid #C9A24B`, `padding-bottom: 8px`; count mono 11px #C9A24B | same, `padding-bottom: 7px`, `font-size: 13.5px` |
| Inactive tab | `Consider` #8E8269; count mono 11px | same, `padding-bottom: 7px` |
| Drawn counts | `Your deck 68` / `Consider 41` | `Your deck 68` / `Consider 41` |
| Filter row padding | shares the tab row | `10px 14px`, `gap: 7px` |
| Segmented container | `background:#181410; border:1px solid #3A3229; border-radius:8px; padding:2px; gap:2px` | same |
| Segment — active | `color:#14110E; background:#C9A24B; border-radius:6px; padding:4px 10px` (state 8) / `padding:5px 10px` (states 11–12) | `padding: 5px 9px` |
| Segment — inactive | `color:#C6B79A; padding:4px 10px` / `5px 10px` | `padding: 5px 9px` |
| Segment typography | mono 11px (state 8) / mono 11.5px (states 11–12) | mono 11px |
| Segment labels | `All 68` / `Shopping 7`; state 12 draws `Shopping 0` | `All 68` / `Shopping 7` |
| Sweep button | `GhostButton`, §404 secondary contract — **not** a danger button | same |
| Sweep geometry | mono 12px, #C6B79A, `background: transparent`, `1px solid #3A3229`, `border-radius:8px`, `padding:6px 12px` (state 8) / `padding:6px 11px`, mono 11.5px (state 9) | mono 11px, #C6B79A, `1px solid #3A3229`, `border-radius:8px`, `padding:7px 10px`, `margin-left:auto` |
| Sweep copy | `Clear all auto · {n}` (`auto.clearAll`) — drawn `Clear all auto · 68`, `Clear all auto · 58` | `Clear auto · {n}` (`auto.clearAllMobile`) — drawn `Clear auto · 68` |
| Sweep accessible name | `Clear all {n} untouched auto cards` | same |
| Sweep position | right-aligned in the toolbar, beside the All / Shopping filter — not the spine, not floating, not per group | same |
| **Disabled** | **never rendered disabled** — absent entirely at `0 auto` | same |
| Confirmation dialog | **none** — the count in the label is the disclosure, and the act is reversible | none |
| Kept-note | `{n} cards are yours now` (`auto.keptNote`), mono 10.5px, #6A6152, beside the sweep — drawn `8 cards are yours now` | *(not drawn)* |

## 19. Deck row and the `auto` marker

| Property | Desktop | Mobile |
|---|---|---|
| Display | `flex; align-items:center` | `flex; align-items:center` |
| Gap | `10px` | `9px` |
| Min-height | `34px` | `44px` |
| Background | `#1A160F` | `#1A160F` |
| Border | *(none)* | `1px solid #2A241D` (anatomy frame); state 8 rows drawn without |
| Border radius | `7px` | `6px` |
| Padding | `7px 9px` | `0 4px 0 8px` |
| Owned dot | `8 × 8`, `border-radius:999px`, `background:#6FA368`, `flex:none` | `7 × 7`, same |
| Unowned dot | `7 × 7`, `border:1px solid #6E6353`, `border-radius:999px`, no fill | `7 × 7`, same |
| Name | `flex:auto`, 13.5px, #EDE6D8 | `flex:auto; min-width:0`, 12.5px, #EDE6D8 |
| Name overflow | `white-space:nowrap; overflow:hidden; text-overflow:ellipsis` — **`flex-auto`, not `flex-1`** | same |
| Copy-count | `×7` / `×6`, mono 10px, #C9A24B, `flex:none` | *(not drawn)* |
| `buy` tag | mono 9.5px, #E0913C, `background: rgba(224,145,60,0.13)`, `border-radius:4px`, `padding:1px 5px` | mono **9px**, same fill/radius/padding |
| `auto` tag — rest | mono 9.5px, #6A6152 (`--fg-locked`) on `#2A241D` (`--elevated`), `border-radius:4px`, `padding:1px 5px` — `BuyTag` geometry, **deliberately hueless** | same face, inside a `44 × 44` flex-centred box |
| `auto` tag copy | `auto` (`auto.tag`) | `auto` |
| `auto` tag — **hover/focus** | row background `#1A160F` → `#211C15`; tag becomes `keep ✓`, `color:#C9A24B`, `background:#2A241D`, `border:1px solid #6E5B33`, `border-radius:4px`, `padding:0 5px` | — (no hover; focus only) |
| `auto` tag — **active** | activating removes the tag **for good** | same |
| `auto` tag — **pressed** | **no `aria-pressed`** — removed in R2; the control removes itself, so `true` never exists | same |
| `auto` tag accessible name | `Keep {name} in this deck` (`auto.keepAria`) | same |
| `auto` tag hit box | 28–34px row height, pointer-first | `44 × 44` at a 9.5px face |
| `✕` — rest | 13px, `#4A4033`, `flex:none` | 13px, `#4A4033`, in a `44 × 44` flex-centred box |
| `✕` — hover | brightens `#4A4033` → `#C6B79A` | — |
| Reading order | dot → name → `×N` → `buy` → `auto` → `✕` (the card's own fact before its provenance) | same |
| Slot added | one slot in `decklist-row.tsx` between `BuyTag` and the `✕` | same |
| Shrink order | name yields last, carried over from the availability marker | same |
| Basics | one `auto` per **stack**, never per copy; the `+N more` meta row takes no marker and no `✕` — drawn `+6 more`, 13.5px #8E8269 with an `8px` dot spacer | same rule |
| A11y skeleton | `li.deck-row > (button.name + button.auto[aria-label] + button.remove)` | same |
| Modal from the name | touches nothing — inspection is not endorsement | same |

## 20. Decklist body and group headings

| Property | Desktop | Mobile |
|---|---|---|
| Layout | `padding: 14px 30px 22px; display:grid; grid-template-columns: 1fr 1fr; gap: 10px 26px` | `padding: 4px 14px; display:flex; flex-direction:column; gap: 5px` |
| Row gap within a group | `4px` | `5px` |
| Heading row | `display:flex; align-items:baseline; gap:8px; margin-bottom:7px` (later groups `margin:14px 0 7px`) | `margin: 6px 0 4px`, `gap: 8px` |
| Heading typography | mono 10px, `letter-spacing:0.14em`, uppercase, #C9A24B | mono **9.5px**, same tracking/case/colour |
| Count clause | mono 10px, #8E8269 | mono 9.5px, #8E8269 |
| Count clause copy | `{n} · {n} auto` (`auto.groupCount` beside the shipped count) — drawn `9 · 9 auto`, `8 · 8 auto`, `37 · 37 auto`, `7 · 5 auto` | `9 · 9 auto` |
| Drawn groups | Artifacts, Instants, Lands (+ Creatures/Sorceries in the second column) | Artifacts |
| Lands note | basics carry `auto` like anything else and are **never** in Shopping | same |

## 21. Spent slot (single removal, shipped PR #204 — unchanged)

| Property | Desktop | Mobile |
|---|---|---|
| Background | `#181410` | *(not drawn)* |
| Border | `1px dashed #3A3229` | *(not drawn)* |
| Border radius | `7px` | *(not drawn)* |
| Min-height / padding | `34px` / `7px 9px` | *(not drawn)* |
| Leading spacer | `flex:none; width:8px` (no dot) | *(not drawn)* |
| Label | `flex:1; min-width:0`, mono 12px, #6A6152, ellipsised — drawn `Counterspell removed` | *(not drawn)* |
| Undo | 12.5px / 600, #C9A24B, `border-bottom:1px solid #6E5B33` | *(not drawn)* |
| Scope | **row-level**, one receipt per single removal — explicitly unchanged by this pass | same |

## 22. Sweep receipt (list-level, state 10)

| Property | Desktop | Mobile |
|---|---|---|
| Display | `flex; align-items:center; gap:10px` | *(same block, not separately drawn)* |
| Background | `#181410` (`--surface-sunken`) | same |
| Border | `1px dashed #3A3229` (`--border-strong`) | same |
| Border radius | `8px` | same |
| Padding / margin | `10px 13px` / `margin-bottom: 16px` | same |
| Label | `flex:1`, mono 12px, #6A6152 | same |
| Label copy | `{n} auto cards removed` (`auto.swept`) — drawn `58 auto cards removed` | same |
| Undo | 12.5px / 600, #C9A24B, `border-bottom:1px solid #6E5B33`; copy `Undo` (`auto.sweptUndo`) | same |
| Undo accessible name | `Put all {n} auto cards back` (`auto.sweptUndoAria`) | same |
| Count | **one strip, not 58 rows** | same |
| Lifetime | decklist state; survives a tab switch; clears on Undo, on the next mutation, or on leaving the route (PR #204 rules) | same |
| Live region | announced **once**: `{removed} auto cards removed. {total} of 99.` — drawn `58 auto cards removed. 8 of 99.` | same |
| Failure copy | `We couldn’t clear those. The deck is unchanged.` (`auto.sweepFailed`) | same |
| Server calls | one server action, one optimistic list update, one live-region message | same |

## 23. Swept-empty block (state 10) and fill-failed empty (state 15)

| Property | Desktop | Mobile |
|---|---|---|
| Container | `text-align:center; padding: 26px 18px 30px` (state 10) / `22px 14px 24px` (state 15) | *(same block)* |
| Glyph row | `display:flex; justify-content:center; gap:10px; margin-bottom:18px` | same |
| Glyph | `12 × 12`, `background:#3A3229`, `transform: rotate(45deg)`, `display:block` | same |
| Glyph count | **3** in state 10; **2** in state 12 | same |
| Heading (state 10) | Cinzel 600, 18px, #EDE6D8 — `Back to just the commander` (`sweptEmpty.heading`) | same |
| Body (state 10) | 13.5px, #C6B79A, `line-height:1.6`, `margin: 8px auto 0`, `max-width: 330px` — `{name} and 99 empty slots. Everything we suggested is in Consider if you want any of it back, or start typing and build it your way.` (`sweptEmpty.body`) | same |
| CTA (state 10) | `See what we suggested` (`sweptEmpty.cta`), `display:inline-flex; margin-top:18px`, 13px, #C6B79A, `1px solid #3A3229`, `border-radius:8px`, `padding:9px 15px` | same |
| Heading (state 15) | Cinzel 600, 17px, #EDE6D8 — `99 empty slots` | *(not drawn)* |
| Body (state 15) | 13px, #C6B79A, `margin: 7px auto 0`, `max-width: 290px` — `Consider is stocked either way — the suggestions don’t depend on the fill landing.` | *(not drawn)* |
| Quick-add strip | `display:flex; align-items:center; gap:8px; background:#181410; border:1px solid #3A3229; border-radius:8px; padding:10px 12px`; `⚲` #8E8269 13px; placeholder `Add a card by name…` 13px #6A6152 | same |
| Branch | one flag — "was this deck ever filled" — picks between this copy and the shipped first-run copy | same |
| Entrances | the empty deck's two live entrances (quick add, Consider) are unchanged | same |

## 24. Shopping view — intro, groups, footer

| Property | Desktop | Mobile |
|---|---|---|
| Panel | `background:#100D0A; border:1px solid #2A241D; border-radius:16px; padding: 16px 18px` | *(inherits the deck frame)* |
| Intro typography | 13.5px, #C6B79A, `line-height:1.6`, `margin-bottom:14px` | **12.5px** |
| Intro copy | `{n} cards we reached past your collection for, to get each role to its baseline. Nothing here is a wildcard — every one is closing a specific gap.` (`shopping.intro`) — `{n}` renders as `7`, not a spelled-out word | same |
| Group heading | mono 10px, `letter-spacing:0.14em`, uppercase, #C9A24B | mono **9.5px** |
| Gap clause | mono 10px, #8E8269 — `{n} · closes {from}→{to}` (`shopping.groupGap`) | mono 9.5px |
| Drawn groups | `Ramp` `3 · closes 7→10` · `Removal` `2 · closes 6→8` · `Wipes` `2 · closes 1→3` | same |
| Group spacing | first group `margin-bottom:7px`; later groups `margin: 14px 0 7px`; row column `gap:4px`, `margin-bottom:14px` | *(unspecified)* |
| Footer typography | mono 10.5px, #8E8269, `margin-top:14px`, `border-top:1px solid #2A241D`, `padding-top:10px` | mono **10px**, `margin-top:12px`, `padding-top:9px` |
| Footer copy | `{n} cards to buy` (`shopping.footer`) — drawn `7 cards to buy`. The auto clause and `footerMixed` were retired with the Shopping row's auto tag (Hugh, 2026-09-28) | same |
| Prices / vendor links | **none anywhere** — no price data exists and a fabricated one is worse than an omitted one | none |

## 25. Shopping row

| Property | Desktop | Mobile (addendum A2) |
|---|---|---|
| Min-height | `34px` | **`52px`** — the only row in the builder that grows |
| Background | `#1A160F` | `#1A160F` |
| Border radius | `7px` | `6px` |
| Padding | `7px 9px` | `0 4px 0 8px` |
| Gap | `10px` | `9px` |
| Layout | single line | two lines: name + `buy` on line 1 (`gap:6px`), meta on line 2 |
| Dot | `7 × 7`, `1px solid #6E6353` unowned outline | same |
| Name | `flex:auto`, 13.5px, #EDE6D8 | 12.5px, ellipsised, `flex-auto` |
| Figure | inline, `flex:none`, mono 10px, #8E8269, `font-variant-numeric: tabular-nums` — `24%` | meta line, mono 10px, #8E8269, tabular — `edhrec {pct}%` (`shopping.rowFigure`), prefixed because it left the pill |
| Absent figure | `—`, mono 10px, #6A6152, no tabular | **a sentence**: `no EDHREC figure` (`shopping.rowNoFigure`), mono 10px, #6A6152 |
| Meta-line overflow | — | must carry `white-space:nowrap; overflow:hidden; text-overflow:ellipsis`; the mock's strings are short enough to hide the omission |
| `buy` tag | mono 9.5px, #E0913C on `rgba(224,145,60,0.13)`, radius 4px, `1px 5px` | mono **9px**, same |
| `auto` tag | **not drawn in Shopping** since 2026-09-28 (Hugh: it clutters the busiest row); the deck's own list keeps it | — |
| `✕` | 13px, #4A4033 | in a `44 × 44` box |
| Shrink order | *(single line; not enumerated)* | 1 meta line ellipses · 2 name ellipses · 3 nothing else yields (`buy`, dot, `✕` all `flex-none`) · 4 absence stays a sentence |
| All-view parity | the All view row is 34px and prints no figure | the All view keeps its **44px** row and prints **no figure** |
| Drawn rows | Smothering Tithe 24% · Talisman of Creativity 17% · Fellwar Stone 11% · Anguished Unmaking — · Cyclonic Rift 48% · Blasphemous Act 28% · Farewell 19% | Smothering Tithe `edhrec 24%` and siblings |

## 26. Shopping empty because the collection covered it (state 12)

| Property | Desktop | Mobile |
|---|---|---|
| Container | `text-align:center; padding: 24px 14px 28px` | *(not separately drawn)* |
| Glyphs | two `12 × 12` `#3A3229` squares, `transform: rotate(45deg)`, `gap:10px`, `margin-bottom:18px` | same |
| Heading | Cinzel 600, 18px, #EDE6D8 — `Nothing to buy. Your shelf covered it.` (`shopping.emptyCoveredHeading`) | same |
| Body | 13.5px, #C6B79A, `line-height:1.6`, `margin: 8px auto 0`, `max-width: 300px` — `Every role hit its baseline from cards you already own. The {open} slots we left open are the fun part.` (`shopping.emptyCoveredBody`), drawn with `31` | same |
| Segmented state | `Shopping 0` active | same |
| Branch | Shopping empty on a deck that was **never filled** keeps its shipped string; this one is a compliment and says so | same |

## 27. In-flight skeleton decklist (state 14 / addendum A3)

| Property | Desktop | Mobile |
|---|---|---|
| Container | `padding: 14px 30px 22px; display:grid; grid-template-columns: 1fr 1fr; gap: 6px 26px` | `padding: 14px; display:flex; flex-direction:column; gap: 6px` |
| Plate count | **8** | **5** |
| Plate | `height: 34px; border-radius: 7px` | `height: 34px; border-radius: 6px` |
| Plate fills | alternating `#181410, #181410, #1A160F, #1A160F` ×2 | `#181410, #181410, #1A160F, #181410, #1A160F` |
| Caption | `grid-column: 1 / -1`, mono 10.5px, #8E8269, `text-align:center`, `margin-top:8px` | mono 10.5px, #8E8269, `margin-top:6px`, `text-align:center` |
| Caption copy | `Sleeving {n} cards…` (`fill.fillingRows`) — drawn `Sleeving 68 cards…` | same |
| Motion | **none** — no shimmer, no pulse, no stagger, no indeterminate sweep | none |
| Announcement | one on settle: `Deck filled. {filled} of 99, {bought} to buy.` (`fill.filledAnnounce`) — never per row | same |
| Preference | Design prefers this frame **never renders** — the fill belongs in the create transaction | same |

## 28. Cross-cutting contract

| Property | Desktop | Mobile |
|---|---|---|
| New tokens / hexes | **none** — no new token, no new hex, no new empty-state construct, no new modal | none |
| Motion | **none added.** No arrival animation, no per-row stagger, no tag transition beyond colour. Nothing joins the `prefers-reduced-motion` block | none |
| Transforms | only the `rotate(45deg)` empty-state glyphs (static) | same |
| Transitions | colour only, on the chip hover and the `auto` → `keep ✓` swap | focus only |
| Focus ring | inherited global `:focus-visible`, `2px --brass` at `+2px` offset — nothing bespoke, including the A1 retry | same |
| SVG icons | **none.** Every glyph is a text character: `⚠`, `✕`, `⚲`, `‹`/`›`, `→`, `✓`, `—`, `i`, `×N`, and CSS squares for the empty states | same |
| Colour-alone | `auto` is a **word**; degraded vs. absent differ by shape rule + string + presence of a control + colour (four signals) | same |
| Null rule | a dash renders in three places (chip figure, Shopping figure, in-flight cells); **`0%` renders nowhere** | same |
| Celebration | none — and none is possible since #362 removed the completion reveal outright | same |
| Arithmetic | 10 + 10 + 8 + 3 + 37 = 68; state 13 is 67; Shopping is 7; the pruned deck is 66 with 58 auto | same |

---

# State Coverage

| State | Triggering condition | What renders | Key data required |
|---|---|---|---|
| **1** — role at/above target | A role whose owned count meets or exceeds the commander's role target (measured, else `ROLE_TARGETS`), EDHREC figures present | Role panel; owned count in `--success`; the at/past gap clause (`coverage.gap`); chips (desktop) or 44px rows (phone) with figure plates, sorted `inclusionPct` desc | Per-role owned cards with `oracleId`, `name`, `inclusionPct`; the commander's `roleTargets` |
| **2** — role below target | Owned count < target, and the target is not a measured 0 | Same panel; the short gap clause (`coverage.gap`); header stacks at phone | Owned count, the commander's `roleTargets` |
| **3** — role with an empty pool | Zero owned cards in the role | Shipped `No {role} cards in your pool` (mono 11px #6E6353); no list, no disclosure | Owned count = 0 |
| **4** — a chip whose figure is absent | Some cards in a role have no `inclusionPct` while siblings do | Em dash in `--fg-locked`, plate removed, chip padding `0 10px`; absent chips sort last; legend `— = no EDHREC figure for this card` (phone: `— = no EDHREC figure`) | Nullable `inclusionPct` per card |
| **5** — EDHREC absent for the commander | EDHREC does **not** index this commander — permanent | Panel-level note (`#211C15`, 2px `--fg-faint` left rule), `absentHeading` + `absentBody` (phone `absentBodyMobile`); **no retry**; figure slot removed entirely from every chip; sub-caption reverts to `subcaptionNoFigures` | A commander-level "not indexed" signal, distinct from a fetch failure |
| **6** — long role | A role with more owned cards than the cap (drawn: 34 ramp sources) | 12 chips + `+22 more` (desktop) / 6 rows + `Show all 34` (phone); expanded container capped at `max-height:320px`, scrolling; past 40, `+N more` as inert text | Full ordered role list; a count for the disclosure |
| **7** — modal opened from a chip | A coverage chip/row is activated | Shipped card-detail modal: art, name, type, EDHREC bar + figure, `Owned`/`Role` rows, Prev/Next across the role's siblings; **no Add control**; `auto` untouched | Card detail payload; role-ordered sibling `oracleId`s; owned copies + set |
| **8** — freshly filled deck | `Build this deck` committed 68 rows, all flagged `auto`, none touched | Header `68 of 99 · 61 owned · 7 to buy` + `Building` pill; five met mix cells; provenance line; `Your deck 68` / `Consider 41`; `All 68` / `Shopping 7`; `Clear all auto · 68`; grouped rows each carrying `auto` | Row-level `auto` flag; per-role filled/target counts; owned vs. to-buy split |
| **9** — partly pruned | Some `auto` rows kept, some removed, some cards hand-added | `66 of 99 · 58 owned · 8 to buy`; `Clear all auto · 58` + `8 cards are yours now`; group clause `7 · 5 auto`; kept and hand-added rows are **visually identical**; one shipped row-level spent slot with `Undo` | Per-row `auto` flag; a count of untouched auto rows; the PR #204 spent-slot state |
| **10** — all auto cleared | The sweep ran (or every auto row was removed individually) on a deck that **was** filled | List-level receipt strip `58 auto cards removed` + `Undo`; three rotated glyphs; `Back to just the commander` + `sweptEmpty.body`; `See what we suggested`; quick-add strip | A "was this deck ever filled" bit; the swept count for the receipt and the announcement |
| **11** — Shopping populated by the fill | The fill reached outside the collection to hit a baseline | `Shopping 7` active; `shopping.intro`; role groups headed with the gap each closes; seven rows with figure + `buy` + `✕` (no `auto` tag in Shopping since 2026-09-28); footer `7 cards to buy`; no prices | Per-row `role`, `inclusionPct`, owned flag; **per-role remaining gap** (from→to) — needs new engine code, see below |
| **12** — Shopping empty, collection covered it | Every role hit its baseline from owned cards; the deck **was** filled | `Shopping 0`; two rotated glyphs; `Nothing to buy. Your shelf covered it.` + `emptyCoveredBody(31)` | To-buy count = 0 **and** the was-filled bit (an unfilled deck keeps the shipped string) |
| **13** — a baseline the fill could not reach | Too few in-colour EDHREC candidates for a role | `67 of 99 · 60 owned · 7 to buy`; short Wipes cell — brass `2`, `/ 3`, 67% `--brass-mid` fill, `see shelf` caption; phone adds the `--border-strong` hairline and drops the bar and denominator; `provenanceShort` naming the short role | Per-role achieved vs. target; the name of the short role for the copy |
| **14** — optimistic / in-flight first frame | The fill streams instead of completing inside the create transaction (**may never render**) | `Filling 68 of 99…`; dashed `Draft` pill; five cells with `—` numerators, kept denominators, and a `height:0` dashed rule in place of the track; 8 plate rows (desktop) / 5 (phone); `Sleeving 68 cards…`; **no motion**; one announcement on settle | The intended fill size and per-role targets **before** any row exists; no counts may be invented |
| **15** — deck created, fill failed | The deck row was written; the card fill did not land | Warning-ruled banner: `The deck is here, the cards aren’t.` + `failedBody` + `Try filling again` link; `99 empty slots` + `Consider is stocked either way…`; quick-add strip; Consider still populated | A distinguishable "created but unfilled" outcome; retry must be re-runnable |
| **A1** — degraded EDHREC | The EDHREC fetch **failed** (transient), as opposed to state 5's permanent absence | Warning-ruled banner, `degradedHeading` + `degradedBody`, **one** retry — inline right of the sentence on desktop, its own 44px line on phone; figure slot removed (not dashed); chips stay live; ordering falls back to pool order; phone shows six rows and no disclosure | A fetch-failure signal distinct from "not indexed"; a retry action; pool ordering as fallback |
| **A2** — Shopping row at 390px | Shopping viewed below `md:` | 52px two-line row: name + `buy` on line 1, `edhrec 24%` (or `no EDHREC figure`) on line 2; `✕` in a 44×44 box (no `auto` tag in Shopping since 2026-09-28); mono 9.5px group headings; 12.5px intro; mono 10px footer; the All view keeps 44px and prints no figure | Same as state 11, plus the width branch — the figure must be suppressed in the All view |
| **A3** — in-flight at desktop | State 14 viewed at `md:` and above | The desktop cell drops its track entirely for a `height:0; border-top:1px dashed` rule holding 5px of margin; every colour steps down; the denominator stays; the pill goes dashed `Draft` | The role targets (denominators) before any numerator exists |
| **A4** — short role cell at phone | State 13 viewed below `md:` | Brass figure among `--success` siblings; `2` above `rec 3` as the phone's denominator; `see shelf` caption as a control; **`1px --border-strong`** instead of `--border` — the only phone-only addition in the handoff | Per-role achieved vs. target; a "this deck was just filled" bit to scope the hairline |

---

# Blockers, corrections and open calls carried by the handoff

Recorded because they change what a plan can claim, not because they are drawing properties.

1. **§0 blocks the build.** Per-card EDHREC inclusion for an arbitrary commander, served
   offline, does not exist (`feat/rec-foundation` unmerged). Every chip figure and the unowned
   top-up depend on it. No drawing changes when it lands. Verdict is 🟡 Yellow.
2. **Ruling 2 needs new engine code.** `getDeckSuggestions` appends a flat `slice(0, 5)` of
   EDHREC's ranking (the handoff cites `src/app/decks/actions.ts:106`, `:153`), unbounded by
   role; rows *are* classified (`primaryRole(c)`, `:150`) but the role never enters the
   selection. State 11's seven-card Shopping tab is not reachable from what ships.
3. **The three `REPLACES` targets are hardcoded JSX in `detail.tsx`**, not a copy module. The
   lift is part of the work.
4. **`role-counter-cell.tsx` does change** (A3's in-flight treatment, A4's hairline). Decision 8's
   "untouched" covers the **strip** only.
5. **`detail.tsx` refactor:** `OwnedChip` becomes a `CardDetailTrigger`; `RolePanel` takes
   `cards: { oracleId, name, inclusionPct }[]` instead of `string[]`; `CardDetailProvider` must
   mount on `/commanders/[slug]` (today it only wraps the builder).
6. **A new deck-card flag** records "arrived from the fill, untouched". Cleared by the keep
   control and by **nothing** else — not the modal, not a re-sort, not a group change.
7. **A2's shrink rule 1 needs properties that do not exist yet** — the meta span must carry
   `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.
8. **Two open calls for the plan PR:** the keep gesture (tag-as-button vs. implicit keep) and the
   desktop chip target size (28px pointer-first vs. row density at all widths). Neither forces a
   redraw.
9. **The swept-empty branch needs a "was filled" bit.** If it is expensive, the shipped first-run
   string ships in both places and reads slightly wrong in one of them.
10. **`suggestDeck` is not modified** — #130 commits what it already returns.
11. **Mock inclusion percentages are fabricated.** The arithmetic is not.
