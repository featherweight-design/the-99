# Design Property Table — Discovery Row (Phase 10)

**Sources read:** `README.md`, `STATES-price-and-empties.md`, `CONTROLS-four-above-one-list.md`, `commander-discovery · copy strings.ts`, `The 99 - Commander Discovery.dc.html` (frames A1/A2/A3 + C1), `brand/README.md`. `support.js` is a generated canvas runtime (`// GENERATED from dc-runtime/src/*.ts`) with no design content.

**Hex → token map** (derived by cross-referencing the README's token names against the canvas hexes; every pairing below is corroborated by at least one README/canvas match):

| Hex | Token |
|---|---|
| `#CF8745` | `var(--accent)` |
| `#EDE6D8` | `var(--fg)` |
| `#C0B8A6` | `var(--fg-body)` |
| `#A59C89` | `var(--fg-muted)` |
| `#8B8270` | `var(--fg-faint)` |
| `#6E6654` | `var(--fg-locked)` |
| `#3A3229` | `var(--border-strong)` |
| `#2B241B` | `var(--border)` |
| `#1E1A15` | `var(--surface)` |
| `#29241F` | `var(--elevated)` |
| `#201C17` | `var(--elevated-hover)` |
| `#18140F` | `var(--surface-sunken)` |
| `#1A1611` | `var(--surface-rail)` |
| `#6FA368` | `var(--success)` |
| `#D9975C` | `var(--avail-hard-fg)` |
| `#14110E` | `var(--bg)` |

**Frame authority.** Frame A (row anatomy, 1000px panel) is the authoritative full row — it is the only frame drawing role chips, the receipts preview and the justification label. Frame C1 (the list at rest) is a compressed five-row illustration that omits the label, the provenance word and the fit column's track. Where they disagree, A + the README component-notes table win; every C1 divergence is recorded in the rows below as a **[C1 divergence]** note.

**Breakpoint:** 640px (`sm:`). Mobile column = 390px tile; Desktop column = 1280px grid row.

---

## Component: RecCard (discovery arm)

### Container context — row shell (shipped, unchanged; recorded because the slots inherit from it)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | grid |
| grid-template-columns | — | `40px 100px 1fr 236px` |
| flex-direction | column | — |
| gap | 9px | 20px |
| align-items | — | stretch **[C1 divergence: `center`]** |
| padding | `12px 13px` | `24px 26px` **[C1 divergence: `20px 26px`]** |
| background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| border-width / style / color | `1px solid var(--border)` `#2B241B` | `1px solid var(--border)` `#2B241B` |
| border-radius | 11px | 12px |

### Container context — evidence column (grid col 3)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | column |
| gap | 9px (tile gap) | 13px **[C1 divergence: 9px]** |
| min-width | 0 | 0 |

> README decision 1: the justification occupies "the same y and the same 13px leading" as the shipped Synergy line — the 13px is this flex gap.

### Container context — fit column (grid col 4)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex (header-row cluster) | flex |
| flex-direction | column | column |
| justify-content | — | center **[C1 divergence: not set]** |
| align-items | center | stretch (default) |
| gap | — | 10px **[C1 divergence: 8px]** |
| flex | none | — |
| border-left | — | `1px solid var(--border)` `#2B241B` |
| padding-left | — | 20px |

---

### Justification slot — sort = "fit" (wrapper)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block (`<p>`; the track is hoisted out — see next table) | flex |
| align-items | — | center |
| gap | — | 10px |
| margin | 0 | 0 |

### Justification slot (fit) — label

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (not drawn at 390px) | yes |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | 10px |
| font-weight | — | 400 (inherited) |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | `var(--fg-faint)` `#8B8270` |

**[C1 divergence]** the label is not drawn on the five list rows either; only frame A1 draws it. README component-notes specifies it, so it ships.

### Justification slot (fit) — overlap track

| Property | Mobile | Desktop |
|----------|--------|---------|
| Position in row | full-width bar directly under the header row, above the role chips | inline, between label and sentence |
| display | block (`<span>` sized) | block (`<span>` sized), `flex: none` |
| width | 100% | **120px** (frame A1) · **110px** (frame C1). README: "110–120×6px" |
| height | 6px | 6px |
| border-radius | 999px | 999px |
| background | `var(--elevated)` `#29241F` | `var(--elevated)` `#29241F` |
| overflow | hidden | hidden |
| border | — | — |

### Justification slot (fit) — overlap track fill

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | block |
| width | `owned / total` as % (canvas: 48%) | `owned / total` as % (canvas: 48%, 47%, 41%, 40%, 40%) |
| height | 100% | 100% |
| background | `var(--accent)` `#CF8745` | `var(--accent)` `#CF8745` |
| border-radius | — (clipped by parent `overflow:hidden`) | — |

> This bar plus the `Support owned` label are the **only** brass in the row under `sort = "fit"` (README decision 1).

### Justification slot (fit) — sentence

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 10.5px | 12px |
| font-weight | 400 | 400 |
| line-height | 1.55 | normal (unset) |
| color | `var(--fg-body)` `#C0B8A6` | `var(--fg-body)` `#C0B8A6` |
| margin | 0 | 0 |
| N (`owned`) — color / weight | `var(--fg)` `#EDE6D8` / 600 | `var(--fg)` `#EDE6D8` / 600 |
| M (`total`) — color / weight | `var(--fg-body)` `#C0B8A6` / 400 (canvas draws M unemphasised at 390px) | `var(--fg)` `#EDE6D8` / 600 **[C1 divergence: M drawn plain `#C0B8A6`/400]** |

> README component-notes is explicit: "sentence mono 12px `--fg-body`, N **and M** in `--fg` 600". Frame A1 matches; the five C1 rows and the mobile tile bold N only. Implement per README + A1.

---

### Justification slot — sort = "new" (wrapper)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block (`<p>`) | flex |
| align-items | — | **baseline** (differs from the fit wrapper's `center`) |
| gap | — | 10px |
| margin | 0 | 0 |

### Justification slot (novelty) — label

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (not drawn at 390px) | yes |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | 10px |
| letter-spacing | — | 0.12em |
| text-transform | — | uppercase |
| color | — | `var(--fg-faint)` `#8B8270` |
| flex | — | none |

### Justification slot (novelty) — sentence

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans', sans-serif` (no mono override — differs from the fit sentence) | `'IBM Plex Sans', sans-serif` |
| font-size | 12.5px | 13.5px |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-body)` `#C0B8A6` | `var(--fg-body)` `#C0B8A6` |
| margin | 0 | 0 |
| Tag names — color / weight | `var(--accent)` `#CF8745` / 600 | `var(--accent)` `#CF8745` / 600 |
| Tag names — element | single `<b>` wrapping all three names + their `·` separators | single `<b>` wrapping all three names + their `·` separators |
| Overflow / extra-tag form | `+2` appended after the bold run | `— and two more` appended after the bold run |
| Tail sentence — color / weight | inherits `#C0B8A6` / 400 | inherits `#C0B8A6` / 400 |
| Track / bar | — (**none by rule**) | — (**none by rule**) |

> README decision 1: "**Under novelty there is no bar.** A count of unplayed tags is not a proportion, and a track drawn under it would invent a denominator."
> **Finding:** the mobile `+2` form has no copy key — `justify.tagList(tags, extra)` only emits `— and ${extra} more`. Either the mobile tile uses the same long form, or the copy module needs a short variant. Flag for Design/eng ruling; do not invent a string.

---

### Ranking figure (fit) — numerator

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 20px | **34px** (frame A1) · **30px** (frame C1). README: "30–34px" |
| font-weight | 600 | 600 |
| line-height | 1 | 1 |
| color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |

### Ranking figure (fit) — unit / denominator

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 9px | 13px (A1) · 12.5px (C1) |
| letter-spacing | 0.12em | — |
| text-transform | uppercase (canvas prints `OF 264`) | none (canvas prints `of 264`) |
| color | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |

### Ranking figure (fit) — figure row layout

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| align-items | center | baseline |
| gap | 0 | 6px |
| flex | none | — |

### Ranking figure (fit) — column label

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (not drawn at 390px) | yes |
| font-family | — | `'IBM Plex Mono', monospace` |
| font-size | — | 10px |
| letter-spacing | — | 0.16em |
| text-transform | — | uppercase |
| color | — | `var(--accent)` `#CF8745` |

**[C1 divergence]** not drawn on the five list rows; frame A1 + README component-notes carry it.

### Ranking figure (fit) — full-width track

| Property | Mobile | Desktop |
|----------|--------|---------|
| Position | the same single full-width bar under the header row (mobile has one track, not two) | in the fit column, below the `Support owned` label |
| width | 100% | 100% |
| height | 6px | 6px |
| border-radius | 999px | 999px |
| background | `var(--elevated)` `#29241F` | `var(--elevated)` `#29241F` |
| overflow | hidden | hidden |
| fill — width / height / background | 48% / 100% / `var(--accent)` `#CF8745` | 48% / 100% / `var(--accent)` `#CF8745` |

**[C1 divergence]** absent from the five list rows.

---

### Ranking figure (novelty) — numerator

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 20px | 34px |
| font-weight | 600 | 600 |
| line-height | 1 | 1 |
| color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |

### Ranking figure (novelty) — unit

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 9px | 13px |
| letter-spacing | 0.12em | — |
| text-transform | uppercase | none |
| color | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |
| Content shape | canvas prints `NEW TAGS` — **no denominator** | `of 5 tags` — denominator present |

> **Finding (blocking for mobile):** the copy module's header states "EVERY FIGURE PRINTS ITS DENOMINATOR. There is no string below that renders N without M, at any width", and `justify.figureUnitNew(total)` returns `of ${total} tags`. The 390px canvas draws `NEW TAGS`, which drops M and matches no key. The fit tile's `OF 264` keeps M but also matches no key (`figureUnitFit` returns lowercase `of ${total}`, so `text-transform: uppercase` reconciles it). Implement mobile novelty as the uppercased `figureUnitNew`, or get a Design ruling. Do not ship `NEW TAGS` as a literal.

### Ranking figure (novelty) — track

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | — (**none by rule**) | — (**none by rule**) |

### Ranking figure (novelty) — floor note

| Property | Mobile | Desktop |
|----------|--------|---------|
| Rendered | yes (last line of tile) | yes (last line of fit column) |
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 10.5px | 11.5px |
| line-height | normal (unset) | 1.5 |
| color | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |
| margin | 0 | 0 |
| percentage — color / weight | inherits `#8B8270` / 400 (no `<b>` at 390px) | `var(--fg-body)` `#C0B8A6` / 600 |

> Eng note: the note names two percentages, the threshold and the row's own, and **both** take
> `--fg-body`. The drawing predates the threshold being printed at all; marking only the row's own
> figure is not implementable, because a row clearing the floor exactly prints the same string
> twice and the mark cannot tell the two apart.

> README component-notes: "then the floor line: mono 11.5px `--fg-faint`, percentage in `--fg-body`." Canvas note: "the floor is stated as a qualifying fact in `--fg-faint` beneath the figure, **never added to it**. It explains presence, not position."

---

### Ownership pip

| Property | Mobile | Desktop |
|----------|--------|---------|
| Position | title row, **between the rank numeral and the truncated name** | rank column (grid col 1), **under the numeral** |
| width | 6px | 6px |
| height | 6px | 6px |
| transform | `rotate(45deg)` | `rotate(45deg)` |
| border-radius | — (square, rotated — never a circle) | — |
| flex | none | — |
| display | inline block-level span | inline block-level span |
| Owned — background | `var(--accent)` `#CF8745` | `var(--accent)` `#CF8745` |
| Owned — border | — | — |
| Unowned — background | transparent | transparent |
| Unowned — border-width / style / color | `1.5px solid var(--fg-locked)` `#6E6654` | `1.5px solid var(--fg-locked)` `#6E6654` |
| Container gap (numeral ↔ pip) | 6px (title row) | 7px (rank column, `flex-direction: column`) |
| Container align-items / justify-content | center / — | center / center **[C1 divergence: `justify-content` not set]** |
| aria | `aria-hidden` | `aria-hidden` |
| transition | — | — |

Rank numeral it sits with (context, shipped): Cinzel 800, **17px** mobile / **26px** desktop, `var(--fg-faint)` `#8B8270`, `line-height: 1`; mobile adds `min-width: 16px; text-align: center`.

> README §7.3: "Replaces the decorative `--border-strong` diamond." Colour is never the only signal — the clause below says it in words and the accessible name repeats it.

---

### Ownership clause (first clause of the shipped receipt line)

Receipt line container:

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<p>` | `<p>` |
| margin | 0 | 0 |
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 10.5px | 12.5px **[C1 divergence: 12px]** |
| line-height | 1.55 | normal (unset) |
| color (base) | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |
| display | flex | flex |
| align-items | center | center |
| gap | 5px | 6px |
| flex-wrap | wrap | wrap **[C1 divergence: not set]** |

Clause parts:

| Property | Mobile | Desktop |
|----------|--------|---------|
| Leading glyph — size / transform | 6px × 6px / `rotate(45deg)` | 6px × 6px / `rotate(45deg)` |
| Leading glyph — owned | background `var(--accent)` `#CF8745`, `flex: none` | background `var(--accent)` `#CF8745`, `flex: none` |
| Leading glyph — unowned | `border: 1.5px solid var(--fg-locked)` `#6E6654`, background transparent, `flex: none` | same |
| Clause text — owned color | `var(--avail-hard-fg)` `#D9975C` | `var(--avail-hard-fg)` `#D9975C` |
| Clause text — unowned color | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |
| Clause text — font-weight | 400 | 400 |
| Separator `·` — color | `var(--border-strong)` `#3A3229` | `var(--border-strong)` `#3A3229` |
| Conditional rendering | **always rendered**, both branches | **always rendered**, both branches |

Sibling clauses on the same line (shipped, unchanged — recorded because they share the flex container): `N of your cards fit` at base `#8B8270`; the `N already in use` clause keeps its own filled 6px `rotate(45deg)` `#CF8745` diamond and `var(--avail-hard-fg)` `#D9975C` text.

> **Note the doubled glyph.** The canvas draws the ownership diamond twice per row — once in the rank column and once as the receipt line's leading glyph. The README describes the rank-column pip as the glyph and the clause as "a word", but every drawn frame (A1, A2, C1 ×5, both mobile tiles) renders the inline glyph as well. Implement both; it is consistent across all eight drawn rows.

> README §7.3: "**Both clauses always render**, so row height never changes between two rows or two players."

---

### Price slot — wrapper

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 7px | 7px |
| margin-top | — | 4px **[C1 divergence: not set]** |
| padding-top | 9px | 10px **[C1 divergence: not set]** |
| border-top (the hairline) | `1px solid var(--border)` `#2B241B` | `1px solid var(--border)` `#2B241B` **[C1 divergence: not drawn]** |
| Conditional rendering | wrapper **and its `border-top` unmount together** when absent or owned | same |

> STATES doc: "**The hairline belongs to the slot.** The `1px --border` rule above the price is drawn by the price, not by the column, so states 4 and 5 leave no orphaned divider."

### Price slot — dot

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 6px | 6px |
| height | 6px | 6px |
| border-radius | **999px** (a circle — unlike the ownership pip's rotated square) | **999px** |
| transform | — (no rotation) | — |
| flex | none | none |
| Priced — background | `var(--success)` `#6FA368` | `var(--success)` `#6FA368` |
| Priced — border | — | — |
| Not stocked — background | transparent | transparent |
| Not stocked — border-width / style / color | `1.5px solid var(--fg-locked)` `#6E6654` | `1.5px solid var(--fg-locked)` `#6E6654` |

### Price slot — figure

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 11.5px | 12.5px **[C1 divergence: 12px]** |
| font-weight | 400 | 400 |
| color — priced, two figures (`< $100`) | `var(--fg-body)` `#C0B8A6` | `var(--fg-body)` `#C0B8A6` |
| color — priced, three figures (`≥ $100`) | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |
| color — not stocked | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |
| background / border / border-radius | — (no chip, no bar, no brass) | — |

> The three-figure brightness step is the **only** magnitude-driven change. STATES doc: "Same hue family, one step of emphasis, no semantics."

### Price slot — provenance

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Mono', monospace` | `'IBM Plex Mono', monospace` |
| font-size | 9.5px | 10px |
| color | `var(--fg-locked)` `#6E6654` | `var(--fg-locked)` `#6E6654` |
| margin-left | auto (right-aligned in the slot) | auto (right-aligned in the slot) |
| Rendered under `notStocked` | yes (frame A3 draws `manapool` beside `not stocked`) | yes **[C1 divergence: omitted on all five list rows]** |

### Price slot — hover / interactive

| Property | Mobile | Desktop |
|----------|--------|---------|
| hover | — (no hover state drawn; the slot is not interactive and carries no buy link) | — |
| transition | — | — |

---

### Untagged note

| Property | Mobile | Desktop |
|----------|--------|---------|
| Drawn on canvas | — (**not drawn at 390px** — see finding below) | yes (frame C1, row 5) |
| Position | inside the tile, after the receipt line (inferred) | last child of the evidence column, after the receipt line |
| display | flex | flex |
| align-items | center | center |
| gap | 9px | 9px |
| padding | `9px 13px` | `9px 13px` |
| background | `var(--elevated-hover)` `#201C17` | `var(--elevated-hover)` `#201C17` |
| border-width / style / color | `1px solid var(--border-strong)` `#3A3229` | `1px solid var(--border-strong)` `#3A3229` |
| border-left | `2px solid var(--fg-faint)` `#8B8270` | `2px solid var(--fg-faint)` `#8B8270` |
| border-radius | 7px | 7px |
| Retry affordance | — (**none, by rule**) | — (**none, by rule**) |

### Untagged note — icon

| Property | Mobile | Desktop |
|----------|--------|---------|
| glyph | `⚠` (`&#9888;`) | `⚠` (`&#9888;`) |
| font-size | 13px | 13px |
| color | `var(--fg-faint)` `#8B8270` | `var(--fg-faint)` `#8B8270` |
| fill / stroke | — (text glyph, not SVG) | — |

### Untagged note — body

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans', sans-serif` | `'IBM Plex Sans', sans-serif` |
| font-size | 12.5px | 12.5px |
| line-height | 1.45 | 1.45 |
| color | `var(--fg-muted)` `#A59C89` | `var(--fg-muted)` `#A59C89` |
| Heading — element | inline `<b>` lead-in, not a block heading | inline `<b>` lead-in, not a block heading |
| Heading — color / weight | `var(--fg-body)` `#C0B8A6` / 600 | `var(--fg-body)` `#C0B8A6` / 600 |
| Heading ↔ body join | ` — ` (em dash) inside the same text node | ` — ` (em dash) inside the same text node |

> **Finding:** README component-notes calls `No tag data` a "Heading"; the canvas draws it as an inline bold lead-in inside the body paragraph, em-dash-joined. Implement as drawn (inline), which is also what the shipped `absent` variant does.
> **Finding:** the untagged note is absent from both 390px tiles. Its mobile geometry is unspecified; the safe read is the same box at the same values inside the tile. Worth one line to Design rather than a round-trip.

---

### Row-level hover / interactive / motion

| Property | Mobile | Desktop |
|----------|--------|---------|
| Row hover | — (no hover treatment drawn for the discovery row; the shipped `RecCard` stretched-link hover is unchanged) | — |
| Justification / figure / pip / price hover | — | — |
| transition | — (**"Motion: none"** — both flips re-render in place; no transition, no dimmed list, no skeleton) | — |
| transform | only the two `rotate(45deg)` glyphs | only the two `rotate(45deg)` glyphs |
| focus-visible | global, 2px brass at +2px offset, unoverridden | global, 2px brass at +2px offset, unoverridden |

---

## State Coverage — RecCard discovery arm

| State | Triggering condition | What renders | Key props required |
|---|---|---|---|
| **Fit justification** | `sort === "fit"` | Label `Overlap` + 110–120×6px track (fill = `owned/total`) + overlap sentence. Brass = track + `Support owned` label only. | `sort`, `owned`, `edhrecTotal` |
| **Novelty justification** | `sort === "new"` | Label `New to you` + tag sentence, tag names in `--accent` 600. **No track at all.** | `sort`, `tags[]`, `tagTotal`, `nearestDeckName?`, `sharedTag?` |
| **Fit ranking figure** | `sort === "fit"` | `{N}` 30–34px + `of {M}` + `Support owned` label + full-width 6px track | `owned`, `edhrecTotal` |
| **Novelty ranking figure** | `sort === "new"` | `{N}` 34px + `of {M} tags` + `Unplayed tags` label + floor note. **No track.** | `unplayedTags`, `tagTotal`, `floorPct` |
| **Figure suppressed** | `edhrecTotal === null` | **Neither figure prints.** Row falls back to the receipt line alone. | `edhrecTotal` |
| **Novelty tail — none built** | player's built-tag set ∩ commander tags = ∅ | `distanceNone` sentence after the tag list | `sharedTag === null` |
| **Novelty tail — partial** | at least one tag overlaps a built deck | `distanceNear(deckName, shared)` after the tag list | `nearestDeckName`, `sharedTag` |
| **Tag overflow** | `tags.length > 3` | first three names joined by ` · `, then `— and {extra} more` (desktop) | `tags[]`, `extra` |
| **Ownership — owned** | commander in collection (`owned === true`) | Filled `--accent` pip (rank column + receipt-line glyph) · clause `in your collection, never built` in `--avail-hard-fg` | `owned` |
| **Ownership — unowned** | `owned === false` | Hollow `1.5px --fg-locked` pip (both places) · clause `not in your collection` in `--fg-faint` | `owned` |
| **Price 1 — priced** | `price.kind === "priced"` && `price.cents < 10000` && `owned === false` | Hairline + filled `--success` dot + figure `--fg-body` + `manapool` | `price`, `owned` |
| **Price 2 — priced, three figures** | `price.kind === "priced"` && `price.cents >= 10000` && `owned === false` | Identical, figure at `--fg` | `price`, `owned` |
| **Price 3 — notStocked** | row present in `printing_prices` but its `as_of` is behind the newest `as_of` in the table; `owned === false` | Hairline + hollow `1.5px --fg-locked` dot + `not stocked` in `--fg-faint` + `manapool` | `price` |
| **Price 4 — absent** | `price.kind === "absent"` (no `printing_prices` row for any of the commander's `scryfall_id`s) | **Nothing** — no dot, no dash, no hairline, no reserved height | `price` |
| **Price 5 — suppressed by ownership** | `owned === true`, any `price` | **Nothing** — same treatment as state 4, different reason | `owned` |
| **Price 6 — live but priceless** | row is live but `price_cents === null` | **Treated as state 4** (absent) | `price` |
| **Untagged note** | `tagTotal === 0` (equivalently `tags` absent) — only reachable under `sort === "fit"`, since ruling 5 excludes untagged commanders from `sort === "new"` | `⚠` + `No tag data` lead-in + body, no Retry | `tagTotal`/`tags` |
| **Mobile short copy** | viewport `< 640px` | `overlapShort`, `ownedShort`/`unownedShort`, `floorNoteShort` | — |
| **Score delta** | any discovery row | **Never renders** — `ScoreDelta` is null under discovery's first release | `scoreDelta === null` |
| **`score /100 FIT` stack** | any discovery row | **Never renders** under discovery (ruling 3) | `sort` |

---

## Copy key map

Module: `discoveryCopy` in `src/lib/copy/commander-discovery.ts`. Enumerated as structure only — key + arguments. Wording is out of scope.

| Element | Copy key | Arguments |
|---|---|---|
| Justification label (fit) | `justify.overlapLabel` | — |
| Justification sentence (fit, ≥640px) | `justify.overlap` | `(owned: number, total: number)` |
| Justification sentence (fit, 390px) | `justify.overlapShort` | `(owned: number, total: number)` |
| Justification accessible name (fit) | `justify.overlapAria` | `(owned: number, total: number, name: string)` |
| Fit column label | `justify.figureLabelFit` | — |
| Fit column unit | `justify.figureUnitFit` | `(total: number)` |
| Justification label (novelty) | `justify.distanceLabel` | — |
| Tag list (novelty) | `justify.tagList` | `(tags: string[], extra: number)` |
| Novelty tail — nothing shared | `justify.distanceNone` | — |
| Novelty tail — partial overlap | `justify.distanceNear` | `(deckName: string, shared: string)` |
| Justification accessible name (novelty) | `justify.distanceAria` | `(unplayed: number, total: number)` |
| Novelty column label | `justify.figureLabelNew` | — |
| Novelty column unit | `justify.figureUnitNew` | `(total: number)` |
| Floor note (≥640px) | `justify.floorNote` | `(pct: number)` |
| Floor note (390px) | `justify.floorNoteShort` | `(pct: number)` |
| Ownership clause, owned (≥640px) | `ownership.owned` | — |
| Ownership clause, unowned (≥640px) | `ownership.unowned` | — |
| Ownership clause, owned (390px) | `ownership.ownedShort` | — |
| Ownership clause, unowned (390px) | `ownership.unownedShort` | — |
| Ownership accessible name, owned | `ownership.ownedAria` | — (leads the row's accessible name, before any figure) |
| Ownership accessible name, unowned | `ownership.unownedAria` | — |
| Price provenance | `price.source` | — |
| Price, not stocked | `price.notStocked` | — |
| Price accessible name, priced | `price.aria` | `(formatted: string)` |
| Price accessible name, not stocked | `price.notStockedAria` | — |
| Price figure itself | **no key** — caller-formatted currency | — |
| Price absent / owned-suppressed | **no key exists, by design** ("so a future edit cannot accidentally give absence a label") | — |
| Untagged note heading | `untagged.heading` | — |
| Untagged note body | `untagged.body` | — |
| Receipt line's other clauses, degraded strings, `Build from` labels | **not in this module** — reused **by reference**; the receipt and degraded strings from `availability.ts`, the control's own labels from `commandersCopy.availability` in `lanes.ts`. `discoveryCopy` edits neither | — |

**Copy-key gaps found (structure, not wording):**
1. Mobile novelty overflow is drawn as `+2`; `justify.tagList` only emits the long `— and N more` form. No short key exists.
2. Mobile novelty unit is drawn as `NEW TAGS`, dropping M; `justify.figureUnitNew(total)` always prints M, and the module header states no string renders N without M at any width. Uppercasing `figureUnitFit`/`figureUnitNew` via `text-transform` reconciles the fit tile (`OF 264`) but not the novelty tile.
3. All counts on this surface pass through `n = (v) => v.toLocaleString("en-US")` inside the module. The row's own N/M are **not** wrapped (they are sub-1,000 by construction); do not add locale formatting to the row figures.

---

## Numbered rules touching this phase

### The §6 locked rulings (canvas, "Locked in §6 — drawn as written, not re-litigated")

> **2** · the universe is every indexed commander minus the ones you have built, and owning one is a signal on the row

> **3** · no blended score: fit sorts on overlap, novelty on tag distance, buildability is a floor and never a term

> **4** · the novelty floor is proportional at **≥30% of the support list**, admitting 1,704 of 3,342

> **5** · the 116 untagged commanders are absent under Something new, and the two sorts disagreeing on count is not a defect

> **6** · "71 of the 99" is retired; the denominator is the support list and it is shown

> **7** · price is displayed, never ranked on, and the row reads correctly without it

Trailing clause of the same list, which governs the row's absent states:

> Voice is Kitchen Table; missing data is omitted, never zeroed.

### The audit corrections (README, "Audit corrections — read before implementing")

> 2. **#288 has shipped.** Price and stock are live, not in flight. The row still draws complete without them, per-row, which is what makes states 4 and 5 correct rather than a fallback.

> 3. **Price is keyed by printing, and there is no `stocked` boolean.** `printing_prices` keys on `scryfall_id` (`src/db/schema.ts:94-112`). A commander's figure is its cheapest live printing, and *live* is defined by that table's own rule — compare the row's `as_of` to the newest `as_of` in the table. This closes gap 7 with **no new state and no redraw**: absent from the table → state 4, the slot and its hairline do not render; present but behind the mark → **state 3, `not stocked`**; at the mark → states 1/2. No stale figure is ever printed, so the slot needs no as-of word.

> 4. **There is no "finished" deck.** `decks` carries `filled`, not a completion flag (`src/db/schema.ts:165-177`), and ruling 8 turns on having built anything at all. Every "finished deck" in the copy and on the canvas means **a deck** — the novelty sort unlocks on the first one of any kind.

### The §7.4 price matrix (STATES-price-and-empties.md, Part 1)

> `live` = this printing's row sits at the newest `as_of` in `printing_prices`.
>
> | # | `price` | `live` | Commander owned | Drawn |
> |---|---|---|---|---|
> | 1 | `4.12`–`99.99` | yes | no | filled `--success` dot · figure `--fg-body` · `manapool` `--fg-locked` |
> | 2 | `≥100` | yes | no | same, figure `--fg` |
> | 3 | any | no | no | hollow `1.5px --fg-locked` dot · `not stocked` `--fg-faint` · `manapool` |
> | 4 | `null` | — | no | **slot absent** — no dot, no dash, no hairline, no reserved height |
> | 5 | any | any | **yes** | **slot absent** — same treatment as 4, different reason |
> | 6 | `null` | yes | no | treated as 4. A live row with no figure is not a fact worth a line. |

### Gap report items touching the row (README)

> 3. **The floor's 30% is invisible on a passing row.** Ruling 4 makes the floor proportional and the novelty row states the percentage — but nothing on the *fit* list tells a player why a commander they just saw is missing from the other sort. Ruling 5 says the differing counts are not a defect; the reason is still unavailable per row.

> 4. **`≈260` is an average, and the row prints the real M.** Nothing here breaks at M = 40 or M = 600, but the sentence *"you own 12 of the 40 cards EDHREC lists"* ranks near the bottom while reading like a strong claim. The floor's proportionality is what saves the novelty sort from this; the fit sort has no equivalent guard, and a short support list is a cheap way to look well-supported.

> 5. **Tag distance is a count, not a distance.** Design draws "unplayed tags, N of M" because it is nameable in a row, per ruling 3's one-sort-key-one-cutoff. A genuine distance metric (weighted by tag `count`, or by how central the tag is to the commander) would rank differently and is not specified here. If engineering implements a weighted score, **the row's figure stops matching the ranking** and this needs redrawing.

> 6. **Two decks sharing an archetype are counted once**, so a player with eight aristocrats decks and one Brago deck sees `blink` treated exactly as `sacrifice`. That is intended — you have played it or you have not — but it means the sort cannot express "you play this a little".

> 7. **Price staleness has no treatment.** #288's ingest cadence is unknown to this brief, and the row prints a figure with no as-of. If the ingest can lag by days, the slot needs a word and this handoff does not draw one.
>
> *(Closed by audit correction 3 and by the STATES doc: "Gap report item 7, now closed: a lagging row is not shown as a figure at all, it is state 3, so the slot never prints a stale price and needs no word for one.")*

> 8. **3,334 rows of role chips and receipts is a lot of server-side preformatting.** The receipts preview and `colorPoolSize` are computed per row today for 242. Nothing in this handoff reduces the per-row payload, and the windowed client only renders 25 of them — worth a look before the first discovery request goes out.

### Engineering notes that constrain the row (README, "Notes for engineering")

> - **`RecCard` takes a `sort` prop, not two components.** The row is one component with one branching slot; forking it into `FitCard` / `NoveltyCard` duplicates the grid, the link, the chips and the receipt line, and guarantees they drift.

> - **`edhrec_total` is the denominator and must be non-null wherever N is printed.** §0 says 3,341 of 3,342 carry a `similar_oracle_ids` list; a row with N and no M prints neither figure and falls back to the receipt line alone rather than inventing 99.

> - **Price is read from #288's `printing_prices`, keyed on `scryfall_id`, left-joined** — a commander's figure is its cheapest live printing — and `null` means the slot does not render. No placeholder row, no zero, no "—". There is no `stocked` boolean: *live* means the row's `as_of` matches the newest `as_of` in the table, and a live-but-priceless row is treated as absent.

> - **Price never enters an `ORDER BY`.** Ruling 7, and worth restating next to the join.

> - **`ScoreDelta` does not apply under discovery.** … It is null under discovery's first release because the free re-rank is not computed over 3,334 candidates.

> - **Copy** lives in `src/lib/copy/` … It adds a `discoveryCopy` block and **edits nothing** in `availability.ts`; the receipt line's clauses, the degraded strings and the `Score against` labels are all reused by reference.

Token contract, from the E2 frame:

> **No new token, no new hex, no new motion class, no new component.** … the ownership pip is `RecCard`'s own diamond; the price dot is the availability dot.

> **Ownership and stock are never colour alone.** Filled vs. hollow is a shape difference, the receipt line says the word, and the row's accessible name carries *"in your collection"* or *"not in your collection"* before the figures. Price reads as *"$18.40, in stock at ManaPool"*, and is `aria-hidden` never.

> **Contrast.** Every figure that carries meaning sits at `--fg` or `--fg-body` on `--surface`. `--fg-locked` is used only for the disabled sort option and the dimmer of the two reveal lines — *(note: the row also uses `--fg-locked` for the hollow pip's border, the hollow price dot's border, and the `manapool` provenance word; the contrast sentence is about text carrying meaning, and none of those three do)*.

> **Motion: none.** Both flips are state changes … no transition, no dimmed list, no skeleton. The list re-renders in place.

---

## Open items for the verify pass

1. **`NEW TAGS` at 390px drops the denominator**, contradicting the copy module's own load-bearing rule and `justify.figureUnitNew`. Needs a Design ruling or an implementation that uppercases the keyed string.
2. **`+2` at 390px** has no copy key; `tagList` emits only `— and N more`.
3. **M bolding in the fit sentence** — README says N and M both `--fg` 600; frame C1 and the mobile tile bold N only. README + frame A1 win.
4. **Untagged note has no 390px drawing.** Same box assumed.
5. **The ownership diamond renders twice per row** (rank column + receipt-line lead glyph) in all eight drawn rows, though the README prose describes only the rank-column instance. Ship both.
6. **Justification track width** is 120px in the anatomy frame and 110px in the list frame; README states the range "110–120×6px" without picking one. Pick one and hold it — the verify pass cannot check a range.