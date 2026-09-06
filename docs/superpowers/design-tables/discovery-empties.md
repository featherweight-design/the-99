# Design Property Table — Discovery empties and windowing

Source of truth (design only — no `src/` was read):

- `design/design_handoff_the99_discovery/STATES-price-and-empties.md` (Part 2 — the three empty sentences)
- `design/design_handoff_the99_discovery/README.md` (component notes, states-delivered table, decisions 7 and 8)
- `design/design_handoff_the99_discovery/CONTROLS-four-above-one-list.md` (the count row, both widths)
- `design/design_handoff_the99_discovery/commander-discovery · copy strings.ts` (keys only, never wording)
- `design/design_handoff_the99_discovery/The 99 - Commander Discovery.dc.html` (the canvas — frames D1/D2/D3, E1, and the phone frame in B1; consulted for drawn geometry, since the prose files carry no pixel values for these surfaces)
- `design/design_handoff_the99_discovery/brand/README.md` (token → hex ramp)

**Scope:** (a) the three empty states, (b) the reveal band, (c) the count line. The row, price slot, scope control, sort menu and availability toggle are out of scope and enumerated in earlier phases.

**Breakpoint:** 640px. Mobile artboard 390px, desktop 1280px.

## Token → hex key used below

Hexes live only in `globals.css`; the canvas renders its own approximations. Token names are the design's claim, the canvas hex is recorded in parentheses.

| Token | Canvas hex | Brand-sheet hex |
|---|---|---|
| `--fg` | `#EDE6D8` | `#EDE6D8` |
| `--fg-body` | `#C0B8A6` | `#C6B79A` (secondary) |
| `--fg-muted` | `#A59C89` | `#A89B84` |
| `--fg-faint` | `#8B8270` | `#8E8269` |
| `--fg-locked` | `#6E6654` | — |
| `--accent` | `#CF8745` | `#C9A24B` |
| `--bg` | `#100D0A` (artboard ground) | `#14110E` |
| `--surface` | `#1E1A15` | `#1E1A15` |
| `--surface-sunken` | `#18140F` | — |
| `--surface-rail` | `#1A1611` | — |
| `--elevated` | `#29241F` | `#2A241D` |
| `--elevated-hover` | `#201C17` | — |
| `--border` | `#2B241B` | — |
| `--border-strong` | `#3A3229` | `#3A3229` (line) |
| `--success` | `#6FA368` | `#6FA368` |

Font stacks: `'Cinzel', serif` (headings) · `'IBM Plex Sans', sans-serif` (body, inherited — never declared inline on the canvas) · `'IBM Plex Mono', monospace` (every figure and label).

---

## Component: Count line (`WindowCount`) above the list

### Count line — container (desktop: inline in the filter bar / mobile: its own row)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | — (inline `<span>` inside the shipped filter-bar flex row) |
| align-items | `center` | `center` (from the filter bar) |
| justify-content | `space-between` | — |
| gap | `10px` | `8px` (filter-bar gap) |
| margin | `10px 0 0 0` | `0 0 0 auto` (`margin-left:auto` pushes it right) |
| padding | — | — |
| background | — | — |
| border | — | — |
| Shares its row with | the sort trigger (right) | the sort control (left of it) and `Showing N of M` (right of it) |

### Count line — "N shown · M more below" label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `10.5px` | `11px` |
| font-weight | `400` | `400` |
| letter-spacing | — (none drawn) | `0.12em` |
| text-transform | — (none drawn) | `uppercase` |
| line-height | — | — |
| color | `var(--fg-faint)` (`#8B8270`) | `var(--fg-faint)` (`#8B8270`) |
| Drawn string shape | `25 shown · 3,309 below` | `25 shown · 3,309 more below` |
| Separator | `·` in the same `--fg-faint` | `·` in the same `--fg-faint` |

### Count line — emphasised figures (the two `<b>` spans)

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `var(--fg-body)` (`#C0B8A6`) | `var(--fg-body)` (`#C0B8A6`) |
| font-weight | `600` | `600` |
| font-size | inherits `10.5px` | inherits `11px` |
| Which figures | shown-count and remaining-count | shown-count and remaining-count |
| Formatting | `toLocaleString` (already shipped) | `toLocaleString` (already shipped) |

### Count line — `Showing N of M` sibling label

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | **not drawn on the 390px frame** — open item M-1 | yes, far right of the filter bar |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11px` |
| font-weight | — | `400` |
| letter-spacing | — | — (explicitly absent; the sibling label beside it carries `0.12em`) |
| text-transform | — | — (explicitly absent) |
| color | — | `var(--fg-faint)` (`#8B8270`) |
| padding / margin / border | — | — |
| Change asked for | — | both figures gain `toLocaleString` — "the one shipped string this handoff asks to change" |

### Count line — E1 specimen chrome (frame-only)

Frame E1 draws the count line inside a box the filter bar does not have. Recorded as drawn, flagged as open item M-2.

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `var(--surface-sunken)` (`#18140F`) |
| border-width / style / color | — | `1px` `solid` `var(--border)` (`#2B241B`) |
| border-radius | — | `8px` |
| padding | — | `12px 14px` |

---

## Component: Reveal band ("Show 25 more") at the foot of the list

### Reveal control — button container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` (assumed same; not drawn at 390px — open item M-3) | `flex` |
| flex-direction | — | `column` |
| align-items | — | `center` |
| justify-content | — | `center` (single-line variant in frame C1) |
| gap | — | `4px` (column gap, between the row and the band line) |
| min-height | — | `52px` **in frame C1 only**; absent in frame E1 — open item M-4 |
| width | full width of the list column | full width of the list column |
| padding | — | `15px 20px` |
| margin | — | — |
| background | — | `var(--surface)` (`#1E1A15`) |
| border-width / style / color | — | `1px` `solid` `var(--border-strong)` (`#3A3229`) |
| border-radius | — | `8px` |
| Geometry claim | "shipped geometry unchanged, plus one line" | "shipped geometry unchanged, plus one line" |

### Reveal control — inner row (line 1)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| gap | — | `12px` |

### Reveal control — primary label ("Show 25 more")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — (inherits `'IBM Plex Sans'`) | — (inherits `'IBM Plex Sans'`) |
| font-size | — | `14px` |
| font-weight | — | `600` |
| letter-spacing | — | — |
| text-transform | — | — |
| color | — | `var(--fg)` (`#EDE6D8`) |

### Reveal control — remaining count ("3,309 remaining")

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `11.5px` |
| font-weight | — | `400` |
| color | — | `var(--fg-faint)` (`#8B8270`) |
| Formatting | — | `toLocaleString` (already shipped) |

### Reveal control — trailing arrow glyph

| Property | Mobile | Desktop |
|----------|--------|---------|
| Glyph | — | `↓` (`&darr;`) — a text glyph, **not an SVG**; no `viewBox`, no `path d`, no `stroke-width` |
| font-size | — | `13px` |
| color | — | `var(--fg-faint)` (`#8B8270`) |
| width / height | — | — (text metrics) |

### Reveal control — band line (line 2, the one new element)

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | not drawn at 390px — open item M-3 | yes |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | `10.5px` |
| font-weight | — | `400` |
| letter-spacing | — | — |
| text-transform | — | — |
| color | — | `var(--fg-locked)` (`#6E6654`) |
| margin / padding | — | — (spacing comes from the container's `gap: 4px`) |
| Content shape | — | rank band + colour-filter hint, one line, both figures `toLocaleString`'d |
| Contrast rationale | — | `--fg-locked` is permitted here because the line "repeats information available elsewhere" |

### Reveal control — hover / focus / motion

| Property | Mobile | Desktop |
|----------|--------|---------|
| hover | — (no hover style drawn) | — (no hover style drawn) |
| focus-visible | global `2px` brass ring at `+2px` offset, unoverridden | same |
| transition | `none` — "Motion: none" | `none` |
| transform | — | — |
| Focus behaviour | shipped `preventScroll` focus move, unchanged | same |

---

## Component: Empty state 1 — no decks yet (`GuidedBanner` shape)

### Context row above the banner (sort label + trigger + unavailable note) — drawn in frame D1

The sort control itself is out of this phase's scope; the inline `Something new — unavailable` note is drawn only in this frame, so it is recorded here.

| Property | Mobile | Desktop |
|----------|--------|---------|
| Row display / align-items / gap | not drawn — open item M-5 | `flex` / `center` / `10px` |
| Row margin-bottom | — | `16px` |
| Note font-family | — | `'IBM Plex Mono', monospace` |
| Note font-size | — | `11px` |
| Note color | — | `var(--fg-locked)` (`#6E6654`) |
| Note letter-spacing / text-transform | — | — |

### Banner — container

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | yes — README states-delivered says "banner reflows"; no phone frame drawn — open item M-5 | yes |
| display | block | block |
| background | `var(--surface)` (`#1E1A15`) | `var(--surface)` (`#1E1A15`) |
| border-width / style / color | `1px` `solid` `var(--border)` (`#2B241B`) | `1px` `solid` `var(--border)` (`#2B241B`) |
| border-left | `3px solid var(--accent)` (`#CF8745`) | `3px solid var(--accent)` (`#CF8745`) |
| border-radius | `10px` | `10px` |
| padding | `16px 18px` | `16px 18px` |
| margin | — | — |
| width / max-width | full width of the list column | full width of the list column |
| Position | above the list, first-run only | above the list, first-run only |
| Dismissible | no | no |

### Banner — heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-size | `16px` | `16px` |
| font-weight | `600` | `600` |
| letter-spacing | — | — |
| text-transform | — | — |
| line-height | — | — |
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` (`#EDE6D8`) |
| margin-bottom | `6px` | `6px` |

### Banner — body

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | inherits `'IBM Plex Sans'` | inherits `'IBM Plex Sans'` |
| font-size | `13.5px` | `13.5px` |
| font-weight | `400` | `400` |
| line-height | `1.6` | `1.6` |
| color | `var(--fg-body)` (`#C0B8A6`) | `var(--fg-body)` (`#C0B8A6`) |
| margin / padding | — | — |

### Banner — emphasis span inside the body

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` (`#EDE6D8`) |
| font-weight | `600` | `600` |
| font-size | inherits `13.5px` | inherits `13.5px` |
| Which clause | the "works from day one" clause (one emphasis only) | same |

### Banner — the list underneath

| Property | Mobile | Desktop |
|----------|--------|---------|
| List state | **full** — every candidate, ranked by fit | **full** |
| Rows suppressed | none | none |

---

## Component: Empty state 2 — the novelty floor excludes everything

Built from `EndOfRanking`'s furniture, not a new component. Replaces the rows in the list region; the sort control is **not** flipped for the player.

### Floor empty — container

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | yes, but **no phone frame drawn** — open item M-6 | yes |
| text-align | `center` (assumed same) | `center` |
| padding | not drawn | `34px 24px` (as drawn inside the artboard's page ground) |
| background | — (the list region's own ground) | — (the list region's own ground) |
| border / border-radius | — | — |
| max-width | — | — (the region's width) |
| display | block | block |

### Floor empty — hairline + diamond rule

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `center` |
| justify-content | — | `center` |
| gap | — | `12px` |
| margin-bottom | — | `16px` |
| Rule segments (2) — flex | — | `1` each |
| Rule segments — height | — | `1px` |
| Rule segments — background | — | `var(--border)` (`#2B241B`) |
| Diamond — width / height | — | `6px` / `6px` |
| Diamond — transform | — | `rotate(45deg)` |
| Diamond — background | — | `var(--border-strong)` (`#3A3229`) |
| Diamond — border | — | — (solid fill, no border) |
| Diamond — element type | — | CSS box, **not an SVG** (no `viewBox`, no `path d`) |
| Diamond count | — | **one**, centred (shipped `EndOfRanking` uses two flanking a label) |

### Floor empty — heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-size | `18px` | `18px` |
| font-weight | `600` | `600` |
| letter-spacing / text-transform | — | — |
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` (`#EDE6D8`) |
| margin-bottom | `10px` | `10px` |

### Floor empty — body

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | inherits `'IBM Plex Sans'` | inherits `'IBM Plex Sans'` |
| font-size | `13.5px` | `13.5px` |
| font-weight | `400` | `400` |
| line-height | `1.65` | `1.65` |
| color | `var(--fg-body)` (`#C0B8A6`) | `var(--fg-body)` (`#C0B8A6`) |
| max-width | `430px` (would exceed the 390px viewport — open item M-6) | `430px` |
| margin | `0 auto 16px` | `0 auto 16px` |
| text-align | `center` (inherited) | `center` (inherited) |

### Floor empty — body emphasis span

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` (`#EDE6D8`) |
| font-weight | `600` | `600` |
| Which clause | the floor percentage clause, only | same |

### Floor empty — affordance group

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `inline-flex` (assumed; may need to wrap at 390px — open item M-6) | `inline-flex` |
| align-items | `center` | `center` |
| gap | — | `10px` |
| flex-wrap | not drawn | — (not set) |

### Floor empty — ghost CTA

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `inline-flex` | `inline-flex` |
| align-items | `center` | `center` |
| height | `40px` | `40px` |
| padding | `0 18px` | `0 18px` |
| border-radius | `8px` | `8px` |
| border-width / style / color | `1px` `solid` `var(--accent)` (`#CF8745`) | `1px` `solid` `var(--accent)` (`#CF8745`) |
| background | — (transparent; ghost) | — (transparent; ghost) |
| font-family | inherits `'IBM Plex Sans'` | inherits `'IBM Plex Sans'` |
| font-size | `13.5px` | `13.5px` |
| font-weight | `600` | `600` |
| color | `var(--accent)` (`#CF8745`) | `var(--accent)` (`#CF8745`) |
| letter-spacing / text-transform | — | — |
| hover | — (no hover style drawn) — open item M-7 | — (no hover style drawn) |
| focus-visible | global `2px` brass at `+2px` | same |
| transition / transform | `none` | `none` |
| Count | exactly one primary action; a "show me anyway" / looser-floor control is forbidden | same |

### Floor empty — aside note beside the CTA

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11.5px` | `11.5px` |
| font-weight | `400` | `400` |
| letter-spacing / text-transform | — | — |
| color | `var(--fg-faint)` (`#8B8270`) | `var(--fg-faint)` (`#8B8270`) |

---

## Component: Empty state 3 — filtered to zero inside discovery (shipped `FilteredEmpty` + one clause)

### Filtered empty — container

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | yes, but **no phone frame drawn** — open item M-6 | yes |
| text-align | `left` | `left` (unlike state 2, which is centred) |
| padding | not drawn | `30px 24px` (as drawn inside the artboard's page ground) |
| background / border | — | — |
| display | block | block |

### Filtered empty — active colour chip row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| gap | — | `6px` |
| margin-bottom | — | `14px` |
| flex-wrap | — | — (not set) |

### Filtered empty — colour chip

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `inline-flex` |
| align-items | — | `center` |
| gap | — | `7px` |
| padding | — | `5px 8px 5px 11px` |
| background | — | `var(--elevated)` (`#29241F`) |
| border-width / style / color | — | `1px` `solid` `var(--border-strong)` (`#3A3229`) |
| border-radius | — | `999px` |
| font-size | — | `12.5px` |
| font-weight | — | `400` |
| color | — | `var(--fg)` (`#EDE6D8`) |

### Filtered empty — chip colour pip

| Property | Mobile | Desktop |
|----------|--------|---------|
| width / height | — | `9px` / `9px` |
| border-radius | — | `999px` |
| background (W) | — | `#F4E9C4` (canvas) — brand sheet says W = `#E8E4D6`; open item M-8 |
| background (B) | — | `#1E1B1A` (canvas) — brand sheet says B = `#5B5566`; open item M-8 |
| border | — | — |
| Element type | — | CSS box, not an SVG |

### Filtered empty — chip dismiss glyph

| Property | Mobile | Desktop |
|----------|--------|---------|
| Glyph | — | `✕` (`&#10005;`) — text glyph, not an SVG |
| color | — | `var(--fg-faint)` (`#8B8270`) |
| font-size | — | inherits `12.5px` |
| width / height / stroke-width | — | — |

### Filtered empty — heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'Cinzel', serif` | `'Cinzel', serif` |
| font-size | `18px` | `18px` |
| font-weight | `600` | `600` |
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` (`#EDE6D8`) |
| margin-bottom | `10px` | `10px` |
| letter-spacing / text-transform | — | — |

### Filtered empty — body (base sentence + built clause)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | inherits `'IBM Plex Sans'` | inherits `'IBM Plex Sans'` |
| font-size | `13.5px` | `13.5px` |
| font-weight | `400` | `400` |
| line-height | `1.65` | `1.65` |
| color | `var(--fg-body)` (`#C0B8A6`) | `var(--fg-body)` (`#C0B8A6`) |
| margin | `0 0 16px` | `0 0 16px` |
| max-width | — (explicitly absent; state 2 sets `430px`) | — (explicitly absent) |
| text-align | `left` | `left` |

### Filtered empty — built clause emphasis span

| Property | Mobile | Desktop |
|----------|--------|---------|
| color | `var(--fg)` (`#EDE6D8`) | `var(--fg)` (`#EDE6D8`) |
| font-weight | `600` | `600` |
| Conditional | renders only when ≥1 built deck matches the filtered identity | same |

### Filtered empty — affordance group

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `inline-flex` | `inline-flex` |
| align-items | `center` | `center` |
| gap | not drawn | `12px` (state 2's equivalent group uses `10px` — open item M-9) |
| flex-wrap | not drawn | — |

### Filtered empty — ghost CTA

| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items | `inline-flex` / `center` | `inline-flex` / `center` |
| height | `40px` | `40px` |
| padding | `0 18px` | `0 18px` |
| border-radius | `8px` | `8px` |
| border-width / style / color | `1px` `solid` `var(--accent)` (`#CF8745`) | `1px` `solid` `var(--accent)` (`#CF8745`) |
| background | — (transparent) | — (transparent) |
| font-size / font-weight | `13.5px` / `600` | `13.5px` / `600` |
| color | `var(--accent)` (`#CF8745`) | `var(--accent)` (`#CF8745`) |
| hover | — (none drawn) — open item M-7 | — (none drawn) |
| focus-visible | global `2px` brass at `+2px` | same |
| Count | exactly one button — "one primary action per state" | same |

### Filtered empty — scope text link (second affordance)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | `11.5px` | `11.5px` |
| font-weight | `400` | `400` |
| color | `var(--fg-faint)` (`#8B8270`) | `var(--fg-faint)` (`#8B8270`) |
| text-decoration | — (explicitly absent on the canvas) — open item M-10 | — (explicitly absent) |
| hover | — (none drawn) — open item M-10 | — (none drawn) |
| Semantics | a text link, not a second button; targets the scope control | same |

---

## State Coverage

| # | State | Exact triggering condition | What renders | Props required |
|---|---|---|---|---|
| 1 | **Empty · no decks** (`GuidedBanner`) | Scope = discovery **and** the player has built **zero** decks of any kind. `decks` carries `filled`, not a completion flag — the trigger is *any* deck row existing, not a finished one. | Two signals at once: the sort menu's `Something new` option becomes `aria-disabled` with its short reason, **and** a non-dismissible first-run banner sits above the list. **The list underneath is full** — every indexed candidate, ranked by fit, since nothing is built to exclude. No third sentence. | `cards` (collection size, for the body); deck count = 0 as the gate |
| 2 | **Empty · floor** (`EndOfRanking` furniture) | Scope = discovery, sort = `new`, at least one deck exists, and **no** candidate clears the novelty floor (`≥ 30%` of `edhrec_total` owned). Computed server-side. | The list region's rows are replaced. Sort **stays** on `Something new` — the control is not flipped for the player. Hairline + single 6px diamond, Cinzel heading, body naming the floor percentage and the nearest miss, one ghost CTA to the other sort, one mono aside. No looser-floor / "show anyway" control, ever. | `floorPct` (the fixed constant), `candidates` (population evaluated), `cards` (collection size), `bestPct` (nearest miss); CTA note takes `candidates` |
| 3 | **Empty · filtered** (`FilteredEmpty` + one clause) | Scope = discovery **and** the colour filter yields zero rows from the unbuilt population. | Shipped `FilteredEmpty` with the active colour chips, heading, base sentence, one ghost CTA and one text link to scope. | `colors` (the filtered identity, in words), `candidates` (unbuilt population) |
| 3a | **Empty · filtered — built clause** | State 3 **and** at least one built deck matches the filtered colour identity. | One extra emphasised clause appended to the body, naming how many of the player's decks are that identity. This is the only genuinely new reason the state has under discovery. | `matching` (decks of that identity), `total` (all decks), `identity` (the guild/shard name); singular/plural switches on `matching === 1` |
| 3b | **Empty · filtered — clause absent** | State 3 **and** zero built decks match the filtered identity. | The shipped sentence stands alone, unchanged. | `colors`, `candidates` |
| 3c | **Empty · filtered — owned scope** | Scope = owned (any filter state yielding zero). | Renders **byte-identically to today** — no new clause, no scope link. | shipped props only |
| 4 | **Count line — windowed** | Rows exist and `shown < filtered.length`. | `N shown · M more below` in the filter bar (desktop) / count row (mobile), plus the `Showing N of M` sibling on desktop. Every figure `toLocaleString`'d. | `shown`, `remaining`, `filtered.length`, `active.length` |
| 5 | **Count line — fully revealed** | `shown >= filtered.length`. | Not drawn in this handoff — shipped `WindowCount` behaviour is unchanged; only the `toLocaleString` on `Showing N of M` is asked for. | as shipped |
| 6 | **Reveal band — present** | `shown < filtered.length`. | Two-line control: primary label + remaining count + `↓` on line 1, rank-band/filter hint on line 2 in `--fg-locked`. | `from`, `to`, `total` for the band line; shipped `remaining` for line 1 |
| 7 | **Reveal band — absent** | `shown >= filtered.length`; the shipped `EndOfRanking` rule takes its place. | `EndOfRanking` unchanged: two hairlines, two 6px diamonds, uppercase mono label. Under discovery this is what a **narrowed** list ends on, not the bottom of the full list. | as shipped |
| 8 | **Window reset** | Any scope or sort flip. | `shown` resets to the reveal step, exactly as a filter change does; the count line and reveal band recompute against the new result set. | — |
| 9 | **Live region** | Reveal activation. | The reveal keeps its **shipped** range message. Scope and sort own the other two messages (out of this phase's scope). One region, debounced to one per settle. | — |
| 10 | **Motion, all states** | always | `none`. No transition, no dimmed list, no skeleton — the list re-renders in place. | — |
| 11 | **Focus, all states** | keyboard | Global `:focus-visible`, `2px` brass at `+2px` offset, unoverridden. The reveal's `preventScroll` focus move is unchanged. | — |

---

## Copy key map

All keys live in `discoveryCopy` in `src/lib/copy/commander-discovery.ts`. Every count is locale-formatted inside the module via the private `n()` helper — callers pass raw numbers.

| Element | Copy key | Arguments |
|---|---|---|
| Empty 1 — banner heading | `empty.noDecksHeading` | — (static) |
| Empty 1 — banner body | `empty.noDecksBody` | `(cards: number)` |
| Empty 1 — sort menu short reason | `sort.newDisabled` | — (static) |
| Empty 1 — sort menu reason, a11y | `sort.newDisabledAria` | — (static) |
| Empty 2 — heading | `empty.floorHeading` | — (static) |
| Empty 2 — body | `empty.floorBody` | `(floorPct: number, candidates: number, cards: number, bestPct: number)` |
| Empty 2 — ghost CTA label | `empty.floorCta` | — (static) |
| Empty 2 — aside beside the CTA | `empty.floorCtaNote` | `(candidates: number)` |
| Empty 3 — heading | `empty.filteredHeading` | — (static) |
| Empty 3 — body, base sentence | `empty.filteredBody` | `(colors: string, candidates: number)` |
| Empty 3 — body, built clause (conditional) | `empty.filteredBuiltClause` | `(matching: number, total: number, identity: string)` |
| Empty 3 — ghost CTA label | `empty.filteredCta` | — (static) |
| Empty 3 — scope text link | `empty.filteredScopeLink` | — (static) |
| Reveal band — line 2 | `window.revealBand` | `(from: number, to: number, total: number)` |
| Reveal band — line 1 label, remaining count, aria-label | **no key** — shipped strings, unchanged | — |
| Count line — `N shown · M more below` | **no key** — shipped `WindowCount` strings, unchanged | — |
| Count line — `Showing N of M` | **no key** — shipped string; the only change is `toLocaleString`, "which is not copy" | — |
| Empty 1 — the list beneath | no copy; the list renders normally | — |
| Empty 4 (price absent) | **no key exists, deliberately** — "so a future edit cannot accidentally give absence a label" | — |

Notes carried from the copy module's header comments, applicable to this phase:

- Every figure prints its denominator; no string renders N without M.
- The `buy` verb is banned on this surface.
- The two marked expressive moments in scope here are `empty.noDecksHeading` and the closing clause of `empty.floorBody`.

---

## Open items

| # | Item | Detail |
|---|---|---|
| M-1 | `Showing N of M` has no mobile placement | The desktop filter bar draws both the `N shown · M more below` label and the `Showing N of M` sibling. The 390px frame draws only the former, on the count row shared with the sort trigger. Design does not say whether the sibling is dropped at 390px or wraps. The one string this handoff asks to change is the one with no drawn mobile home. |
| M-2 | E1's count-line box chrome vs. the filter-bar rendering | Frame E1 draws the count line inside `--surface-sunken` / `1px --border` / `8px` radius / `12px 14px` padding. The B1 filter-bar frame draws the same label as a bare inline span with no box. Recorded both; presumed E1 chrome is specimen framing, not a component change — needs confirming. |
| M-3 | Reveal band not drawn at 390px | README's states-delivered table marks E1 as desktop-only for the reveal, with "✓ (count row in B1)" covering only the count. The added second line at `10.5px` in `--fg-locked` on a 390px viewport is undrawn — wrapping behaviour and whether the hint clause survives is unspecified. |
| M-4 | Reveal band drawn twice, inconsistently | Frame C1 draws it as one centred row with `min-height: 52px`, `justify-content: center`, and **no band line**. Frame E1 draws it as a `column` with `gap: 4px`, **with** the band line, and no `min-height`. Both recorded above. Design's prose ("shipped geometry unchanged, plus one line") favours E1; C1 appears to predate the added line. |
| M-5 | Empty 1 has no phone frame | README says the banner "reflows", which is a claim, not a drawing. The context row above it (sort label + trigger + `Something new — unavailable` note, `gap: 10px`, `margin-bottom: 16px`) has no 390px equivalent, and at 390px the sort trigger already shares its row with the count. Where the unavailable note goes on mobile is unspecified. |
| M-6 | Empties 2 and 3 have no phone frames at all | README's states-delivered table marks D2 and D3 phone as `—`. Two concrete consequences: Empty 2's body sets `max-width: 430px` against a 390px viewport, and both affordance groups are `inline-flex` with no `flex-wrap`, so a `40px` CTA plus an `11.5px` mono note may overflow at 390px. |
| M-7 | No hover states drawn for either ghost CTA | Both empties' CTAs are `1px --accent` outline with `--accent` label and a transparent fill. No hover fill, border or colour change is specified, and the brand sheet's accent-hover token exists. |
| M-8 | Canvas WUBRG pips disagree with the brand sheet | The filtered-empty chips draw W as `#F4E9C4` and B as `#1E1B1A`; the brand sheet's identity table gives W `#E8E4D6` and B `#5B5566`. Since these chips are shipped `FilteredEmpty` furniture, the shipped token presumably wins — but the canvas is the drawing of record. |
| M-9 | Affordance-group gap differs between empties 2 and 3 | Empty 2 uses `gap: 10px`, Empty 3 uses `gap: 12px`, for a visually identical CTA + note pairing. Both recorded; likely drafting drift rather than intent. |
| M-10 | The scope "text link" is not drawn as a link | Design calls the second affordance "a text link, not a second button", but the canvas draws it as `--fg-faint` mono `11.5px` with no underline, no accent, and no hover — visually identical to the inert aside beside Empty 2's CTA. Either it is a link and needs an affordance, or it is a label and the prose is wrong. |
| M-11 | The canvas palette is not the brand palette | The canvas renders `--accent` as `#CF8745`, `--fg-body` as `#C0B8A6`, `--fg-faint` as `#8B8270`, `--bg` as `#100D0A`; the brand sheet gives `#C9A24B`, `#C6B79A`, `#8E8269`, `#14110E`. The handoff states "hexes live only in `globals.css`" and "no new hex", so the token names above are the design's claim and the canvas hexes are approximations. Verify against tokens, never against canvas hexes. |
| M-12 | Empty 2's diamond count differs from `EndOfRanking` | Design says Empty 2 is "built from `EndOfRanking`'s furniture — hairline, 6px diamond, centred". The shipped `EndOfRanking` (drawn in frame E1) uses **two** diamonds flanking a label; Empty 2 draws **one**, centred, with no label. Drawn as one; recorded as such. |
| M-13 | Empty 1's population figure is stated inconsistently | Both the README and STATES say the list beneath Empty 1 is "3,342 candidates" (the full index), while the R1 correction sets the discovery population to 3,334 everywhere else. Both are internally consistent — with zero decks built, nothing is excluded, so 3,342 is right for this state specifically — but Empty 2's body also cites "None of the 3,342", and Empty 2 requires ≥1 deck to trigger, which would make it 3,334. Copy takes `candidates` as an argument either way, so this is a fixture/figure question, not a string one. |

## 6. Triage of the open items

Every item above resolves against shipped code or against the handoff's own
rules. None of them is a design call that engineering can only guess at, so none
goes back to Design. Where a resolution reads a drawing as one thing rather than
another, it is called out for ratification in the PR body.

| # | Resolution |
|---|------------|
| M-1 | Not undrawn. The `Showing N of M` sibling already has a mobile home in the shipped bar: `filter-bar.tsx:373-378` renders it as the compact `N/M` form inside the mobile pip row. The 390px frame simply does not redraw shipped furniture. Build unchanged. |
| M-2 | Specimen framing. The count line is rendered by the filter bar, which draws it as a bare inline span; E1's `--surface-sunken` box is the frame around the specimen, not chrome the component grows. Build as the bar draws it. |
| M-3 | The reveal band's mobile geometry is already shipped (`reveal-control.tsx`: `min-h-[52px]`, column, `gap-[3px]`, `sm:flex-row`). The added line goes beneath that block at both widths, so no new mobile drawing is needed. |
| M-4 | Not a contradiction — the two frames draw the same component at different widths. C1's `min-height: 52px` centred row is the shipped *mobile* geometry; E1's column is *desktop* with the new line added. Both are satisfied by keeping the shipped row and adding one line under it, which is also what the prose asks for. |
| M-5 | The banner reflows through the shipped responsive stack. The `Something new — unavailable` note is the sort menu's own disabled sub-line (`sort-menu.tsx`), which already renders at both widths, so it needs no separate mobile placement. |
| M-6 | Standard responsive handling, no new intent: the `430px` body becomes a `max-width` capped by the viewport, and the affordance groups wrap. Neither changes the desktop drawing. |
| M-7 | Not undrawn — owned elsewhere. Both CTAs are `GhostButton`, and that primitive owns hover (`border-color` to `--accent`, colour to `--accent-hover`) precisely so surfaces cannot each invent one. Using the primitive is also what the handoff's must-not on new components requires. Note for ratification: the canvas draws the ghost outline in `--accent`, where the shipped primitive uses `--border-strong` until hover. |
| M-8 | Tokens win, as M-11 already establishes for the rest of the palette. The pips are shipped `FilteredEmpty` furniture and read their fill from `WUBRG_COLOR`, so the canvas hexes are approximations of that map. |
| M-9 | Drafting drift. Both groups are the same pairing, so both use `10px`. |
| M-10 | It is a link, and the prose is the stronger statement — a canvas can omit an affordance, but it cannot mean "looks exactly like the inert label beside it". It ships with the accent colour and hover the rest of the surface's links carry, which is also what distinguishes it from that aside. |
| M-11 | Already the rule this table is verified under: tokens are the target, canvas hexes are never asserted against. |
| M-12 | Built as drawn — one centred diamond, no label. Empty 2 is not an end-of-ranking rule and has no total to name, so the two flanking diamonds would be furniture with nothing between them. |
| M-13 | Both figures are right for their own state, and the copy takes the population as an argument, so neither string changes. Empty 1 passes the full index (nothing is excluded with zero decks built); Empty 2 passes the discovery population, which its own trigger condition guarantees. |
