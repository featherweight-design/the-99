# Design Property Table — Commander Explained

Source: `design/design_handoff_the99_commander_explained/` — `README.md` (component notes,
decisions log), `STATES-key-denominator-committed.md`, `PROSE-one-string-two-surfaces.md`,
`READINESS.md`, `commander-explained · copy strings.ts`, and
`The 99 - Commander Explained.dc.html` (rendered canvas).

Breakpoint: **640px** (Tailwind `sm:`). "Mobile" = the handoff's 375px column; "Desktop" = the
handoff's 1000px/660px frames.

**Colour values are token names, not hexes.** The canvas is drawn in a non-default theme, so its
literal hexes (`#CF8745` accent, `#C0B8A6` body) do not match the brand sheet's defaults
(`#C9A24B`, `#14110E`). The handoff is explicit that **no new token and no new hex** is introduced —
every value below is an existing `globals.css` custom property.

`—` means the design explicitly states the value is absent. Properties the design does not specify
are omitted rather than guessed.

Canvas *documentation chrome* (the spec-card wrappers at 1000/660/620/390px, the mono 10px uppercase
frame captions, the `104px 1fr` annotation grids, the R3-correction callouts with `border-left: 3px`)
is scaffolding, not product, and is excluded.

**Copy is out of scope** — `/copy-review` owns wording. Copy appears here only as *structure*: which
`explainedCopy` key an element renders and what arguments it takes.

---

## Component: ProseSection ("Why this commander")

New section on `/commanders/[slug]`, between the Fit Hero and The Pool.

### Section container

| Property | Mobile | Desktop |
|---|---|---|
| Position in stack | between Fit Hero and The Pool | between Fit Hero and The Pool |
| Section gap (above/below) | 16px (shipped section gap) | 32px (shipped section gap) |
| Conditional rendering | unmounts entirely when prose is `null` **and** no per-user figures (state 4) — no heading, no gap | same |
| Loading state | — (stored column, read with the commander; nothing streams, suspends, or skeletons) | same |
| Error state | — (a failed generation is `null` = prose-absent) | same |
| Reserved height when prose absent | — (no note, no skeleton, no reserved height) | same |
| `role` / live region | — (plain `<p>` under an `h2`; not a live region, not `role="note"`, no "AI generated" annotation) | same |

### Heading (`h2`)

| Property | Mobile | Desktop |
|---|---|---|
| Element | `h2` | `h2` |
| font-family | Cinzel | Cinzel |
| font-weight | 600 | 600 |
| font-size | 20px | 20px |
| color | `var(--fg)` | `var(--fg)` |
| margin-bottom | 8px (body sits 8px below the heading) | 8px |
| Copy key | `explainedCopy.prose.heading` | same |

### Body paragraph (`p`)

| Property | Mobile | Desktop |
|---|---|---|
| Element | `p` | `p` |
| font-size | 13.5px | 13.5px |
| line-height | 1.6 | 1.6 |
| max-width | 640px | 640px |
| margin-top | 8px (below heading) | 8px |
| Measured capacity | ~160 chars ≈ two lines at this width | ~160 chars ≈ two lines |
| Sentence-count | up to 3 sentences (1 stored + 2 templated) | same |

### Sentence 1 run (stored prose)

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg-body)` | `var(--fg-body)` |
| font-weight | inherited (not specified as bold) | same |
| Source | stored column on `commander_support`; `string \| null` | same |
| Conditional rendering | omitted when prose is `null` (state 2) | same |

### Sentences 2–3 run (templated clauses)

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| Sentence 2 copy key | `prose.standing(owned, total)` or `prose.standingWithDeck(owned, total, committed, deck)` | same |
| Sentence 3 copy keys | `prose.gap(roleSubject)` + `prose.gapJoin` (`" — "`) + `prose.gapFigures(owned, target)` + `prose.sentenceEnd` (`"."`) | same |
| Terminal period ownership | added by the renderer (`prose.sentenceEnd`), never inside `gap()`/`gapFigures()` | same |
| Conditional rendering | sentence 2/3 omitted when the per-user figures have nothing to say (state 3) | same |

### Figure runs inside the paragraph

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg)` | `var(--fg)` |
| font-weight | 600 | 600 |
| Numeral form | prose figures spell out via `spellOut()` (words for v ≤ 10, else digits) — "twelve of those", "a ten-source baseline" | same |

### Anchor link (sentence 3's figures clause)

| Property | Mobile | Desktop |
|---|---|---|
| Element | `<a href="#{role}">` — ordinary in-page link | same |
| Link text | sentence 3's figures clause only (`prose.gapFigures(...)`), which carries no period | same |
| color | `var(--accent)` | `var(--accent)` |
| border-bottom | `1px solid var(--accent-shadow)` (the shipped Retry ink) | same |
| aria-label | `prose.gapLinkAria(roleLabel)` — "Jump to {role}" | same |
| Scroll behaviour | — (no `scrollIntoView`, no smooth scroll, no focus management beyond the browser's) | same |
| Conditional rendering | present only when at least one role is short of the commander's role target (measured, else the baseline). A measured target of 0 is never short | same |

### Anchor target (role `<section>`)

| Property | Mobile | Desktop |
|---|---|---|
| `id` | on the role `<section>` | same |
| scroll-margin-top | set, to clear the sticky chrome | same |
| `:target` outline | `1px solid var(--accent-dim)`, one-shot | same |
| Outline lifetime | static; clears on the next navigation | same |
| transition / animation | — (static outline, not a flash) | same |

---

## Component: HomeHeroCommander — paragraph

The stored sentence 1 on the home page hero commander card. No new copy string of its own.

| Property | Mobile (375px) | Desktop |
|---|---|---|
| Position | between the commander name and the completeness row | same |
| margin-top | 10px | 10px |
| font-size | 13px | 13px |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| max-width | 420px (the completeness row's cap) | 420px |
| Effective column at 375px | ~183px | n/a |
| Capacity at that width | ~58 chars visible before clamp | ~128 chars |
| display | `-webkit-box` | `-webkit-box` |
| -webkit-line-clamp | 2 | 2 |
| -webkit-box-orient | `vertical` | `vertical` |
| overflow | `hidden` | `hidden` |
| Clamp mechanism | CSS only — the full string stays in the DOM and in the accessible name | same |
| Shortened copy variant | — (deliberately none; one string, two surfaces) | same |
| Conditional rendering | element unmounts when prose is `null`; card is today's card | same |
| Card accessible name | unchanged: `home.cardAria(name)` — paragraph reads in document order after the name, inside the stretched Link's hit area | same |

---

## Component: FitHero

### Label

| Property | Mobile | Desktop |
|---|---|---|
| Copy key | `explainedCopy.score.label` ("Fit for your collection") | same |

### Score figure

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-weight | 600 | 600 |
| font-size | 52px | 52px |
| line-height | 0.9 | 0.9 |
| color | `var(--fg)` | `var(--fg)` |
| Change from shipped | none (figure unchanged) | none |

### Denominator slot

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 16px | 16px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| Value, synergy measured | `/100` (`score.denominator`) | same |
| Value, synergy not measured | `/40 measurable` (`score.denominatorMeasurable(max)`) | same |
| Abbreviation at 375px | — (no `/40 meas.`, nothing shrinks, no dropped word) | n/a |
| Source of the denominator | data (`measurableTotal` travels with the score), not a render-time branch | same |
| Accessible name | figure + denominator are **one** `aria-label`: `score.scoreAria(score, max)` — "32 out of 40 measurable points" | same |

### Score row layout

| Property | Mobile | Desktop |
|---|---|---|
| Measured width of `52px figure + /40 measurable` | 231px of a 347px content box | n/a |
| Rank / best-fit clause | drops to its own line, 6px below the score row (+25px total height) | stays inline on the score row |

### Bar track

| Property | Mobile | Desktop |
|---|---|---|
| Geometry | unchanged from shipped | unchanged |

### Bar fill

| Property | Mobile | Desktop |
|---|---|---|
| Fill, synergy measured (74/100) | 74% of track | 74% |
| Fill, synergy absent/degraded (32/40) | 80% of track | 80% |
| Fill computation | `pct = 100 * score / measurableTotal` (`format.ts:27` changes; without it the bar renders 32%) | same |
| Segment count, synergy measured | three | three |
| Segment count, synergy absent/degraded | two | two |
| aria | decorative — the bar itself carries no name | same |

### Segment legend

| Property | Mobile | Desktop |
|---|---|---|
| Gap between entries | 24px | 24px |
| Geometry | unchanged from shipped | unchanged |
| Deleted element | the `Synergy —` placeholder chip | same |
| Entry count, synergy absent/degraded | 2 (Pool, Roles) | 2 |

### Segment legend entry — swatch

| Property | Mobile | Desktop |
|---|---|---|
| Size | 10px | 10px |
| border-radius | 3px | 3px |
| aria | `aria-hidden` | `aria-hidden` |

### Segment legend entry — label

| Property | Mobile | Desktop |
|---|---|---|
| font-family | sans | sans |
| font-size | 13px | 13px |

### Segment legend entry — figure

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 12px | 12px |
| String form | `{points}/{weight}` — e.g. `12/15` (`legend.segment(points, weight)`) | same |
| `{points}` colour | `var(--fg)` | `var(--fg)` |
| `/{weight}` colour | `var(--fg-faint)` | `var(--fg-faint)` |
| Previous form | percentage (deleted; `segPct` is deleted with no replacement) | same |
| Accessible name | `legend.segmentAria(label, points, weight)` — "Roles, 20 of 25 points" | same |
| Rounding requirement | integer per segment, and `score` = sum of the integers (otherwise the key's closing line is false) | same |

---

## Component: KeyTrigger ("What these mean")

### Closed state

| Property | Mobile | Desktop |
|---|---|---|
| Element | real `<button>` | real `<button>` |
| Placement | full-width row **below** the legend | chip **inside** the legend row |
| height | 44px | 28px |
| width | full width of the legend row | intrinsic (chip) |
| margin-left | — | `auto` (pushes to the row's right edge) |
| border | 1px dashed `var(--border-strong)` | 1px dashed `var(--border-strong)` |
| font-family | mono | mono |
| font-size | 12px | 11px |
| color | `var(--accent)` | `var(--accent)` |
| Effective touch target | 44px outright | 44px via negative-margin padding around the 28px chip |
| Label | `key.open` ("What these mean") — same label at both widths | same |
| aria-expanded | `false` | `false` |
| aria-controls | the panel's id | same |
| aria-label | `key.openAria` ("What Pool, Roles and Synergy mean") | same |
| Hover dependency | — (no hover dependency anywhere; must-not 5) | — |
| transition | — (opens and closes with no transition) | — |

### Open state

| Property | Mobile | Desktop |
|---|---|---|
| Geometry | unchanged from closed (same row) | unchanged from closed (same chip) |
| background | `var(--elevated-hover)` | `var(--elevated-hover)` |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| Label | `key.close` ("Hide") | `key.close` ("Hide") |
| aria-expanded | `true` | `true` |
| Announcement | — (the key does not announce; `aria-controls` names its content) | — |
| State ownership | one boolean in `FitHero` (which becomes a client component); phone and desktop instances hold **independent** state | same |

---

## Component: KeyPanel

The only new *element* in the handoff, built from disclosure furniture already on the page.

### Panel container

| Property | Mobile | Desktop |
|---|---|---|
| Placement | inside the hero, below the legend | inside the hero, below the legend |
| Separator above | `1px solid var(--border)` rule at 14px | `1px solid var(--border)` rule at 14px |
| display | stacked | three equal columns |
| gap | 14px | 18px |
| Column count, synergy absent/degraded | stacked (two definitions) | **two** columns (two definitions) |
| Added height at 375px | ~300px | n/a |
| Empty state | — (cannot be empty; a hero always has at least Pool and Roles) | — |
| transition / animation | — | — |

### Definition — swatch + name row

| Property | Mobile | Desktop |
|---|---|---|
| Swatch | same swatch as the legend entry | same |
| Name font-size | 13.5px | 13.5px |
| Name font-weight | 600 | 600 |
| Name color | `var(--fg)` | `var(--fg)` |
| Copy keys | `key.pool.label` / `key.roles.label` / `key.synergy.label` | same |

### Definition — weight

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10.5px | 10.5px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| Alignment | right | right |
| Copy key | `key.{segment}.weight(w)` → `"{w} pts"` | same |
| Weight source | named constants `POOL_WEIGHT` / `ROLES_WEIGHT` / `SYNERGY_WEIGHT` (15 / 25 / 60), returned by `fitSegments` | same |

### Definition — body

| Property | Mobile | Desktop |
|---|---|---|
| font-size | 12.5px | 12.5px |
| line-height | 1.55 | 1.55 |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| Copy key | `key.{segment}.bodyMobile` | `key.{segment}.body` |

### Closing sum line

| Property | Mobile | Desktop |
|---|---|---|
| font-family | mono | mono |
| font-size | 10.5px | 11px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| Copy key | `key.sum(parts, total)` / `key.sumWithGloss(parts, total)` | same |
| Term count, synergy absent/degraded | two terms | two terms |
| Correctness precondition | the printed integers must sum to the printed score | same |

---

## Component: HeroNote (absent / degraded)

`detail.tsx:186-191` renders **one** note geometry for both non-`ok` hero states.

### Shared geometry

| Property | Mobile | Desktop |
|---|---|---|
| background | `var(--elevated-hover)` | `var(--elevated-hover)` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-left | `2px solid var(--fg-faint)` | `2px solid var(--fg-faint)` |
| border-radius | 8px | 8px |
| Icon | `⚠` in `var(--fg-faint)` | `⚠` in `var(--fg-faint)` |
| Body font-size | 12.5px | 12.5px |
| Body color | `var(--fg-muted)` | `var(--fg-muted)` |
| Retry control | — (`FitHero` has none and gains none; the page's only Retry is `coverage-section.tsx:411`) | — |
| `3px --warning` variant | — (that weight distinction belongs to `coverage-section.tsx` :344/:372 and is not borrowed) | — |

### Absent variant

| Property | Mobile | Desktop |
|---|---|---|
| Heading | `heroNoteEdits.absent.heading` | same |
| Body | `heroNoteEdits.absent.bodyMobile(max)` | `heroNoteEdits.absent.body(max)` |
| Change from shipped | one appended clause naming 40 | same |

### Degraded variant

| Property | Mobile | Desktop |
|---|---|---|
| Geometry | identical to absent | identical to absent |
| Heading | `heroNoteEdits.degraded.heading` | same |
| Body | `heroNoteEdits.degraded.bodyMobile(max)` | `heroNoteEdits.degraded.body(max)` |
| Change from shipped | one appended clause ending "until it returns" | same |

---

## Component: Committed mark — CoverageChip (role panel, desktop)

| Property | Mobile | Desktop |
|---|---|---|
| Dot size | n/a (phone uses `CoverageRow`) | 6px |
| Not-owned dot | — (role lists are owned cards only; not drawn) | — |
| Owned-free fill | n/a | `var(--success)` |
| Owned-free border | n/a | `color-mix(in srgb, var(--success) 40%, var(--bg))` |
| Owned-committed fill | n/a | `var(--avail-hard-fg)` |
| Owned-committed border | n/a | `color-mix(in srgb, var(--avail-hard) 40%, var(--bg))` |
| Everything else on the chip | n/a | unchanged |
| Dot aria | n/a | `aria-hidden` (colour is never the only channel) |

## Component: Committed mark — CoverageRow (role panel, phone)

| Property | Mobile | Desktop |
|---|---|---|
| Dot size | 7px | n/a |
| Not-owned dot | — (not drawn) | — |
| Owned-free fill | `var(--success)` | n/a |
| Owned-free border | `1px solid var(--border)` | n/a |
| Owned-committed fill | `var(--avail-hard-fg)` | n/a |
| Owned-committed border | `1px solid color-mix(in srgb, var(--avail-hard) 40%, var(--bg))` | n/a |

## Component: Committed mark — SynergyRow (synergy panel)

| Property | Mobile | Desktop |
|---|---|---|
| Dot size | 7px | 7px |
| Not-owned dot | hollow, `1px` stroke `var(--fg-locked)` — **shipped, untouched** | same |
| Owned-free fill | `var(--success)` | `var(--success)` |
| Owned-committed fill | `var(--avail-hard-fg)` | `var(--avail-hard-fg)` |
| Not-owned stroke width | 1px (not 1.5px) | 1px |

### Rejected mark treatments (drawn nowhere)

| Rejected | Reason |
|---|---|
| strikethrough | says the card is gone; it is yours and in use |
| dimming | collides with `var(--fg-locked)`, which already means "no figure" |
| deck-name pill on the chip | 60–110px per chip on a twelve-chip row |
| a second glyph beside the dot | makes one property read as two facts |
| excluding committed cards | a committed card is evidence the commander fits |

---

## Component: CommittedLegend

| Property | Mobile | Desktop |
|---|---|---|
| Slot | `chipNoFigureLegend`'s slot, one line per panel | same |
| font-family | mono | mono |
| font-size | 10px | 10px |
| color | `var(--fg-locked)` | `var(--fg-locked)` |
| Render condition | at least one **visible** chip/row carries the mark | same |
| Denominator | visible chips against `COVERAGE_CAP` (6 phone / 12 desktop) — never the role total | same |
| Copy key, normal | `committed.legendMobile(marked, visible)` | `committed.legend(marked, visible)` |
| Copy key, all visible marked (2) | `committed.legendAllTwoMobile` | `committed.legendAllTwo` |
| Copy key, all visible marked (>2) | `committed.legendAllMobile` | `committed.legendAll` |
| Copy key, synergy panel | `committed.legendSynergy` (names all three dot states) | same |
| "No cards committed" variant | — (the absence of amber dots is the information) | — |

### Chip accessible name

| Property | Mobile | Desktop |
|---|---|---|
| Change form | **suffix** appended to whichever of the three shipped names the chip computed — never a replacement | same |
| Copy key | `committed.ariaSuffix(deck)` → `" Already in {deck.name}."` | same |
| Deck named | the **first** deck, not a list (severity, not inventory) | same |

---

## Component: CoverageSortTrigger

| Property | Mobile | Desktop |
|---|---|---|
| Placement | own row under the sub-caption | heading row, right-aligned |
| height | 38px | 30px |
| width | full width | intrinsic |
| background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | 8px | 8px |
| padding | `0 12px` | `0 12px` |
| font-family | mono | mono |
| font-size | 12px | 12px |
| color | `var(--fg)` | `var(--fg)` |
| Caret glyph | `▾` | `▾` |
| Caret colour | `var(--accent)` | `var(--accent)` |
| Caret placement | right | after the label |
| Role | menu button | menu button |
| aria-expanded | `false` closed / `true` open | same |
| Ships in | slice B (slice A's menu would hold one option) | same |
| transition | — (the sort does not animate the chips) | — |

## Component: CoverageSortMenu

The discovery handoff's sort menu, verbatim.

### Menu container

| Property | Mobile | Desktop |
|---|---|---|
| background | `var(--surface-rail)` | `var(--surface-rail)` |
| border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| border-radius | 10px | 10px |
| padding | 6px | 6px |
| width | 340px | 340px |
| Option count | 2 | 2 |
| Disabled row | — (no disabled row; both options always selectable) | — |

### Option row

| Property | Mobile | Desktop |
|---|---|---|
| Role | `menuitemradio` | `menuitemradio` |
| padding | 11px 12px | 11px 12px |
| border-radius | 7px | 7px |
| Label font-size | 13.5px | 13.5px |
| Label font-weight | 600 | 600 |
| Sub-line font-family | mono | mono |
| Sub-line font-size | 10.5px | 10.5px |
| Sub-line color | `var(--fg-faint)` | `var(--fg-faint)` |

### Option diamond

| Property | Mobile | Desktop |
|---|---|---|
| Size | 6px | 6px |
| Selected | filled `var(--accent)` | filled `var(--accent)` |
| Unselected | `1.5px` stroke `var(--border-strong)` | `1.5px` stroke `var(--border-strong)` |

### Selected row

| Property | Mobile | Desktop |
|---|---|---|
| background | `var(--elevated-hover)` | `var(--elevated-hover)` |

### Announcement

| Property | Mobile | Desktop |
|---|---|---|
| Live region | `CoverageSection`'s **own** `aria-live="polite"` node (no shared page region) | same |
| Message | `coverageSort.announce(label)` — "Role coverage sorted by availability" | same |
| Frequency | once per sort | once per sort |

---

## Transitions / Motion — whole feature

| Property | Mobile | Desktop |
|---|---|---|
| Key open/close transition | — | — |
| Sort chip reorder animation | — | — |
| Anchor smooth-scroll | — | — |
| `:target` ring | static outline, clears on next navigation — not a flash | same |
| New motion class | — (no new motion class introduced) | — |

## New primitives introduced

| Kind | Introduced |
|---|---|
| Token | — |
| Hex | — |
| Motion class | — |
| Modal | — |
| Empty state | — |
| Component | — |
| Element | **one** — the key panel |

---

## State Coverage — FitHero × synergy state

Inputs: `c.synergyState` and `fitSynergy`. Scope-independent — a commander reached from discovery
and one reached from the owned list draw identically.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| 1 — measured | `synergyState === "ok"` | score `74`, denominator `/100`, three legend entries (Pool 12/15 · Roles 20/25 · Synergy 42/60), three bar segments at 74% of track, no note | `score`, `measurableTotal = 100`, `fitSegments` with weights |
| 2 — absent | `synergyState === "absent"` (`fitSynergy == null`) | score `32`, denominator `/40 measurable`, **two** legend entries, two segments at 80% of track, `HeroNote` absent variant + appended clause naming 40 | `measurableTotal = 40` |
| 3 — degraded | `synergyState === "degraded"` | identical figures and identical note geometry to state 2; clause ends "until it returns"; **no Retry** | `measurableTotal = 40` |
| 4 — recovered | retry succeeds at `coverage-section.tsx:411` | re-renders as state 1; score rises 32 → 74; note unmounts | — |
| Phone delta (all states) | viewport < 640px | rank / best-fit clause drops to its own line at 6px (+25px); key trigger becomes a full-width 44px dashed row | — |
| Deleted in states 2 and 3 | `synergyState !== "ok"` | the `Synergy —` placeholder chip is **not** rendered | — |

## State Coverage — KeyPanel

One boolean in `FitHero`; phone and desktop instances hold independent state, only one visible.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| 1 — closed | boolean `false` (default) | trigger only: 28px dashed chip desktop / 44px full-width dashed row phone, label "What these mean", `aria-expanded="false"` | — |
| 2 — open | boolean `true`, `synergyState === "ok"` | trigger fills `--elevated-hover`, label "Hide", `--fg-faint`; panel below a `1px --border` rule at 14px; **three** equal columns 18px gap desktop / stacked 14px gap phone | the three segment weights |
| 3 — open, synergy absent/degraded | boolean `true` and `synergyState !== "ok"` | **two** definitions in two columns desktop / stacked phone — the key defines only what was measured | `synergyState` |
| 4 — closing line | whenever the panel is open | `12 + 20 + 42 = 74.` mono 11px `--fg-faint` desktop / 10.5px phone; two terms in state 3 | integer segment points + score |
| Empty | — | not possible; a hero always has at least Pool and Roles | — |

## State Coverage — ProseSection

Two independent inputs: the stored prose (`string | null`) and whether the per-user clauses have
anything to say.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| 1 — full | prose present, per-user figures present | detail: heading + sentence 1 `--fg-body` + sentences 2–3 `--fg-muted`. Home card: sentence 1, clamped to 2 lines | prose string, `edhrecOwnedCount`, `edhrecTotal`, committed count + first deck, weakest role |
| 2 — prose absent | prose `null`, figures present | detail: heading + sentences 2–3 only, **no note, no skeleton, no reserved height**. Home card: **no paragraph element** | figures only |
| 3 — figures absent | prose present, no per-user figures | detail: heading + sentence 1 only. Home card: sentence 1, clamped | prose string |
| 4 — nothing to say | prose `null` **and** no figures | **section unmounts** — no heading, no gap; The Pool follows the Fit Hero at the shipped 32px/16px gap | — |
| Loading | — | not a state (stored column, read with the commander) | — |
| Error | — | not a state (a failed generation is `null` = state 2) | — |

### State Coverage — sentence 3 and the anchor

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Gap named | at least one role short of its target | sentence 3 names the weakest role and its figures (`gapFigures(owned, target, measured)`: "… against the two its decks run", or "… against a three-source baseline" on the fallback); anchor links to that role's `<section>` | weakest role = largest **proportional** shortfall `(target − have) / target` over the commander's `roleTargets`, rounded with `wholeTarget`; a target of 0 is skipped; ties by `ROLE_ORDER` |
| All at target | all four roles at or past their targets | sentence 3 **omitted**; no anchor; paragraph is two sentences | `roleCounts`, `roleTargets` |
| No role data | role data missing | sentence 3 omitted; no anchor | — |
| Prose absent × anchor | prose `null` but figures present | sentences 2–3 still render, so **the anchor still exists** (it lives in the templated sentence) | — |

## State Coverage — committed mark

Input: owned **and** present in any deck. Five panels (four role + synergy) × two widths = ten
rendered surfaces.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Role chip, not owned | — | not drawn; role lists are owned cards only | — |
| Role chip, owned free | `availabilityState` reads `free` — a spare copy remains, whatever else claims one. `owned 4 · hard 3 · free 1` is this row, not the next | desktop `CoverageChip` 6px dot: `--success` fill, `color-mix(--success 40%, --bg)` border. Phone `CoverageRow` 7px dot: `--success` fill, `1px --border`. **No marker** | `availability` reading `free`, or null |
| Role chip, soft or hard | a draft wants a copy, or no copy is free | dot **unchanged** — `--success` at every reading, because severity moved to the marker. Count-only `AvailabilityMarker density="row" nameless`, joined to the name at 6px: mono 10.5/600/0.02em on the chip, 11.5 on the phone row. Borders unchanged | `availability` reading `soft` or `hard` |
| Role chip, over | committed decks want more copies than exist | as above, plus the **only** border tint: `color-mix(--danger 40%, --bg)` on both geometries | `availability` reading `over` |
| Synergy row, not owned | not in the collection | hollow 7px dot, `1px` stroke `--fg-locked` — shipped, untouched | `owned: false` |
| Synergy row, owned free | owned, not in a deck | 7px dot `--success` fill | `owned: true`, `committed: false` |
| Synergy row, owned committed | owned and in ≥1 deck | 7px dot `--avail-hard-fg` fill | `committed: true` |
| Legend rendered | ≥1 **visible** chip/row carries the mark | one line, mono 10px `--fg-locked`, in `chipNoFigureLegend`'s slot, count against visible chips | marked count, visible count |
| Legend, all visible marked (2) | marked === visible === 2 | "Both of them." variant | — |
| Legend, all visible marked (>2) | marked === visible > 2 | "All of them." variant | — |
| Legend not rendered | no **visible** marked chip (even if a hidden one is marked) | — | — |
| Legend not rendered | panel is empty | — | — |
| Synergy legend | synergy panel, mark present | names all three dot states in one line | — |
| aria branch 1 | `showFigures` and a figure exists | shipped name + `" {markerAria(a)}."` | `availability` |
| aria branch 2 | `showFigures`, no figure | shipped "No EDHREC figure." name + the same clause | `availability` |
| aria branch 3 | `showFigures === false` | `cardDetailCopy.triggerAria(name)` + the same clause | `availability` |
| aria, free | `markerAria` returns `null` | the shipped name, **byte-identical** — no clause, no trailing space | — |
| aria, count-only vs spoken | always | the DRAWN label is `nameless`; the accessible name is `markerAria` **name-bearing**. Two calls, two argument sets — which is not what the count-only contract forbids: it rules out one call drawing a count and speaking a name | — |
| Data prerequisite | — | one `loadAvailability(userId, {oracleIds})` on the route, off-decklist vantage, never cached, narrowed to the cards the page draws. `RoleCard.availability` — **null means NO ROW, never "unowned"** | new read on the route |

## State Coverage — Role Coverage sort

Section-level, one value for four panels, local state, not URL-mirrored.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Most played (default) | initial mount | selected; order is the incoming order (inclusion desc, nulls last, then name — `score.ts:144`); sub-line "Highest EDHREC inclusion first. The order that ships." | — |
| Most played, no figures | `showFigures === false` on the commander | same selection, sub-line swaps to "No EDHREC figures on this commander. The list is in collection order."; **not disabled** | `showFigures` |
| Availability, selectable | always — the option has shipped since #131 | option present; order ranks **four** buckets, free → soft → hard → over, stable within each; sub-line "Free to use first, then wanted by a draft, then in use, then over-committed." | `availability` per card |
| Availability, a card with no claim row | `availability` is null | ranks as `free`. Null is NO ROW — an unowned card, a basic, or a read that could not reach — and on a panel built from the owned pool that is nothing to report | — |
| Sorted | an option is chosen | chip/row order inside each of the four panels changes; which cards fall inside `COVERAGE_CAP` (12 desktop / 6 phone) changes; expanded list re-orders; one live-region message | sort value |
| Untouched by a sort | any sort | panel order, `roleCounts`, baseline clauses, sub-caption, expansion state, the score, the legend, the paragraph, the synergy panel | — |
| Persistence | — | not a state — fresh on every arrival, never in the URL | — |

## State Coverage — cross-state interactions

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| Synergy absent × key open | `synergyState !== "ok"` and key open | two definitions, **not** three with one greyed | `synergyState` |
| Synergy absent × sort | `showFigures === false` | *Most played* keeps its selection and swaps its sub-line to name pool order; no option disabled | `showFigures` |
| Prose absent × anchor | prose `null`, roles short | sentences 2–3 render, anchor still exists | — |
| Prose present × all roles at baseline | no role short | sentence 3 omitted, so **no anchor**; section is shorter | `roleCounts` |
