# STATES — the key, the denominator, the committed mark, the sort

Every state this handoff draws or rules on, at both widths, with the condition that produces it.
Read with `The 99 - Commander Explained.dc.html`; frame ids are the canvas sections.

---

## 1. The Fit Hero × synergy state

`c.synergyState` and `fitSynergy` are the only inputs. **Scope-independent** — a commander reached
from discovery and one reached from the owned list draw identically (§4.3).

| # | `synergyState` | Score | Denominator | Legend | Bar | Note | Frame |
|---|---|---|---|---|---|---|---|
| 1 | `ok` | `74` | `/100` | Pool 12/15 · Roles 20/25 · Synergy 42/60 | three segments, **74% of track** | none | C1, C2 |
| 2 | `absent` | `32` | `/40 measurable` | Pool 12/15 · Roles 20/25 | **two** segments, 80% of track | shipped absent note **+ appended clause naming 40** | D1 |
| 3 | `degraded` | `32` | `/40 measurable` | Pool 12/15 · Roles 20/25 | two segments, 80% of track | **same shipped note geometry as state 2** + appended clause ending *until it returns*. **No Retry — the hero has none** | D2 |
| 4 | `degraded` → retry succeeds | `74` | `/100` | three entries | three segments | note unmounts | — (state 1) |

**The bar in states 2 and 3 looks identical to what ships — and only stays that way if
`format.ts` changes.** `format.ts:27` is `pct = Math.min(s.score, 100)`, which returned the right
proportion *because of* the rescale. Delete the rescale and `score` is a raw 32, so the same bar
renders at **32% of track**. 80% is correct, and it requires `fitSegments` to take the denominator
and compute `pct = 100 * score / measurableTotal`. R1 and R2 both called the bar a no-op; it is not.
See README decision 3b, and 3c for the ranking consequence, which is a product decision.

**The legend figures assume integer segment rounding** (README 1b). Under today's
one-decimal-per-segment arithmetic the three integers need not sum to the printed score, which would
make the key's closing line false.

**Deleted in states 2 and 3:** the `Synergy —` placeholder chip. There is no missing third of a
hundred to explain once the denominator is 40.

**States 2 and 3 share one note geometry.** `detail.tsx:186-191` renders a single note for both
non-`ok` hero states, so the two differ in their clause alone. The `2px --fg-faint` / `3px
--warning` weight distinction belongs to `coverage-section.tsx` (`:344` / `:372`) and is not
borrowed into the hero.

**Neither state has a Retry.** The page's only Retry is `coverage-section.tsx:411`; `FitHero` has
none and gains none. State 4 is reached by retrying *there*.

**State 4 raises the visible score from 32 to 74.** Intended, and the reason both states print
their denominator.

### Phone deltas (375px)

| Element | Change |
|---|---|
| Score row | `52px figure + /40 measurable` is 231px of a 347px content box. The rank / best-fit clause **drops to its own line** at 6px. +25px. |
| Key trigger | Full-width 44px dashed row below the legend, not a chip in it. |
| Notes | Shipped phone geometry and copy, one clause appended. |
| Nothing shrinks | No smaller figure, no `/40 meas.`, no dropped word. |

---

## 2. The key

One boolean in `FitHero`. Two instances exist (phone, desktop); **each holds its own state**, and
only one is visible.

| # | State | Desktop | Phone |
|---|---|---|---|
| 1 | closed | 28px dashed chip, `margin-left:auto` in the legend row, mono 11px `--accent`, label `What these mean` | 44px full-width dashed row below the legend, mono 12px `--accent` |
| 2 | open | same chip, `--elevated-hover` fill, label `Hide`, `--fg-faint`; panel below a `1px --border` rule at 14px, three equal columns, 18px gap | same row; panel stacked, 14px gap |
| 3 | open, synergy absent/degraded | **two** definitions, two columns | two definitions, stacked |
| 4 | closing line | `12 + 20 + 42 = 74.` mono 11px `--fg-faint` | same, 10.5px |

State 3 is the one to get right: the key **defines only what was measured.** A Synergy definition
in a panel whose legend has no Synergy entry teaches the player about points that were never on
offer, and it reopens the "is 40 a partial 100" question the denominator just closed.

The panel adds ~300px at 375px and is the only element in this handoff that does. Opt-in, once,
and it collapses.

### Definitions, verbatim

| Segment | Weight | Body |
|---|---|---|
| Pool | 15 pts | How much of your collection is even legal here — cards inside her colour identity that could go in the 99. Breadth, not quality. |
| Roles | 25 pts | Whether you own enough ramp, draw, removal and board wipes to field a deck at all. Measured against a per-role baseline, not against her. |
| Synergy | 60 pts | How much of EDHREC's most-played list for *this* commander you already own. The largest weight, because it is the only part that is about her rather than about your shelf. |

Phone bodies are the shorter forms in the canvas and in `commander-explained · copy strings.ts`.

---

## 3. The paragraph section

Two independent inputs: the stored prose (`string | null`) and whether the per-user clauses have
anything to say.

| # | Prose | Per-user figures | Detail section | Home card |
|---|---|---|---|---|
| 1 | present | present | heading + sentence 1 `--fg-body` + sentences 2–3 `--fg-muted` | sentence 1, clamped 2 lines |
| 2 | **null** | present | heading + sentences 2–3 only. **No note, no skeleton, no reserved height.** | **no paragraph element** — today's card |
| 3 | present | **none** | heading + sentence 1 only | sentence 1, clamped 2 lines |
| 4 | **null** | **none** | **section unmounts** — no heading, no gap | no paragraph element |

State 2 is the normal state §4.1 guarantees: the window between a set landing and the next index
run always exists.

State 3 is a real collection state — nothing in her colours and no finished deck — and it is why
sentence 1 must stand alone as a paragraph, not as a lead-in.

State 4 is the only case where the page's section stack changes: The Pool follows the Fit Hero at
the shipped 32px / 16px gap, exactly as today.

### Sentence 3 and the anchor

| Condition | Sentence 3 | Anchor |
|---|---|---|
| At least one role short of baseline | names the weakest role and its figures | links to that role's `<section>` |
| All four at or past baseline | **omitted** — there is no gap to name | none |
| No role data | omitted | none |

Weakest role = `argmin(roleCounts[role] - ROLE_TARGETS[role])`, ties broken by `ROLE_ORDER`. See
gap 2: this is *a* weakest-role rule, not a ranked cost of gaps.

Target: `id` on the role `<section>`, `scroll-margin-top` for the sticky chrome, one-shot
`:target` outline `1px --accent-dim`. Ordinary `<a href="#…">`; no `scrollIntoView`, no smooth
scroll.

---

## 4. The committed mark, across five panels

Input: owned **and** present in any deck. The dot's fill is the channel; the words are in the panel
legend and the accessible name.

| Panel | Element | Not owned | Owned, free | Owned, committed |
|---|---|---|---|---|
| Role panel, desktop | `CoverageChip`, 6px dot | *not drawn* — role lists are owned cards only | `--success` fill · border `color-mix(--success 40%, --bg)` | **`--avail-hard-fg` fill · border `color-mix(--avail-hard 40%, --bg)`** |
| Role panel, phone | `CoverageRow`, 7px dot | *not drawn* | `--success` fill · `1px --border` | **`--avail-hard-fg` fill · `1px color-mix(--avail-hard 40%, --bg)`** |
| Synergy panel | `SynergyRow`, 7px dot | `1px --fg-locked` hollow *(shipped, untouched)* | `--success` fill | **`--avail-hard-fg` fill** |

#346 names **five panels** — four role panels and the synergy panel — which at two widths each is
**ten rendered surfaces**. R1 called that "five surfaces", conflating the two counts.

**The swap is the same two declarations on nine of the ten.** The exception is the synergy panel's
unowned dot, which ships at `1px` — R1 drew it at `1.5px` inside a table claiming the declarations
were identical. The unowned dot is not touched by this handoff at all; only the owned fill is.

### The legend line

| Condition | Rendered |
|---|---|
| At least one **visible** chip/row carries the mark | one line, mono 10px `--fg-locked`, in `chipNoFigureLegend`'s slot, carrying the count |
| No visible marked chip (even if a hidden one is marked) | **not rendered** |
| Panel is empty | not rendered |

Same condition `chipNoFigureLegend` already uses: it never explains a dot that is not on screen.

**Both figures count visible chips, not the role's total.** Ramp at 17 owned reads `Amber dot —
owned, and already in one of your decks. 3 of the 12 shown.` on desktop. When every visible card is
marked: `Both of them.` / `All of them.` **When no visible chip is marked the line does not render**
— which under *Availability* is the common and correct outcome, since a healthy panel then shows
only free cards.

R1 mixed the two counts — the copy note said "among visible" and the frames printed the role total
(`3 of 11` beside four visible chips, one marked). Counting past the cap makes the legend explain
dots the cap is hiding, which is the one thing the shipped render condition exists to prevent. The
word **shown** is what makes the denominator unambiguous.

Synergy panel legend names all three states, because that panel is the only one where all three
appear: `Filled green — owned and free. Amber — owned, already in a deck. Hollow — not owned.`

### Accessible name

One clause appended to the existing name:

**A suffix, not a replacement.** The shipped names are `recommendations.ts:32-35`, and there are
**three** branches, not two. R2 misquoted the first and supplied whole-string replacements, dropping
"View details for" — the only words telling a screen-reader user the chip opens something — and
leaving the third branch uncovered.

| Branch | Shipped name | With the mark |
|---|---|---|
| `showFigures` + figure | `View details for Sol Ring. In 94% of decks.` | `… In 94% of decks. Already in Grixis Reanimator.` |
| `showFigures`, no figure | `View details for Sol Ring. No EDHREC figure.` | `… No EDHREC figure. Already in Grixis Reanimator.` |
| `showFigures === false` | `undefined` → `cardDetailCopy.triggerAria(name)` | that name + ` Already in Grixis Reanimator.` |

The deck named is the **first** deck, not a list — severity, not inventory, the rule the
availability receipt already follows. See gap 7 on keeping this consistent with sentence 2's count.

### Not drawn, and why

| Rejected | Reason |
|---|---|
| strikethrough | says the card is gone; it is yours and in use |
| dimming | collides with `--fg-locked`, which already means "no figure" |
| a deck-name pill on the chip | 60–110px per chip on a twelve-chip row |
| a second glyph beside the dot | makes one property read as two facts |
| excluding committed cards | loudest option, wrong answer — a committed card is evidence the commander fits |

---

## 4b. What the mark needs that this page does not have

**The mark has no data path today, and R1 said it was free.** Stated plainly because three of this
handoff's frames, four panel legends, `chipAria` and sentence 2's count all draw a value nothing
computes.

| Claimed in R1 | Actually |
|---|---|
| "resolved in the same pass `page.tsx:36-40` already makes over deck membership" | That pass is over **role lists** — `Object.values(commander.roleCards).flat()`. It supplies the synergy panel's exclusion set, not commitment. |
| the detail route already reads decks | It does not. It imports `resolveCommanderSlug`, `getRankedList`, `scoreOneCommander`, `readSynergyCards`. **No `loadAvailability`.** |
| `scoreOneCommander` carries it | It loads the collection pool and the EDHREC cache. Nothing about decks. |
| the carriers have a slot | `RoleCard` is `{ oracleId, name, inclusionPct }`. The synergy card carries `owned` alone. |
| "nothing added here makes a request" | **False for the mark.** True for the denominator, the key and the sort. |

**What it needs:** one aggregate over this user's deck membership returning a set of oracle ids plus
one deck name each, joined against ids the page already holds. One query, not per chip; it does not
touch `scoreOneCommander`; and the same set answers all ten surfaces **and** sentence 2's committed
count — which is also what keeps those two consistent (gap 7).

**What it costs:** a new read on this route and one field on each of two carrier types. That is why
**the mark cannot ship in the slice that carries the denominator and the key**, which need no data
change at all. Sequencing is READINESS items 1–2.

## 5. The Role Coverage sort

Section-level, one value for four panels, local state, **not URL-mirrored**.

**Two options.** R2 had three; one named a field that does not exist (`RoleCard` carries no rank)
and duplicated another, because `score.ts:144` already sorts every figure-bearing panel by
`byInclusionThenName`. See README decision 7b.

| Option | Order | Sub-line |
|---|---|---|
| **Most played** *(default)* | the incoming order — already inclusion desc, nulls last, then name (`score.ts:144`) | Highest EDHREC inclusion first. The order that ships. |
| — same option, no figures in the panel | pool order, as `:144`'s guard leaves it | No EDHREC figures on this commander — the list is in collection order. |
| **Availability** | free before committed, then the incoming order | Free to use first, then the ones already in a deck. |

**No disabled row.** Both options are always selectable; the default *describes* its fallback rather
than being struck through. **`Availability` is absent, not disabled, until slice B lands** — an
option whose ordering key the page cannot compute is worse than an absent one. Which means slice A's
menu would hold one option, so **the control ships with slice B** (§4b).

### What a sort does and does not touch

| Touched | Untouched |
|---|---|
| chip / row order inside each of the four panels | the four panels' order |
| **which cards fall inside `COVERAGE_CAP` — 12 desktop / 6 phone, `coverage-chip.tsx:24`** | `roleCounts`, the baseline clauses, the sub-caption |
| the expanded list's order, if a panel is open | expansion state — open panels stay open |
| one live-region message on **`CoverageSection`'s own `aria-live="polite"` node**: `Role coverage sorted by availability` | the score, the legend, the paragraph, the synergy panel |

**The cap interaction is the feature, not a side effect.** Under *Most played* the Ramp panel opens
on Sol Ring 94%, Arcane Signet 88% and Mind Stone 38% — all three spent; under *Availability* the
same panel opens on cards the player can use. Same seventeen cards, same count, same baseline.

**The frames are drawn against the real caps.** Ramp is 17 owned, so desktop shows 12 with a
`+5 more` (the desktop label is `total - 12`) and phone shows 6 with `Show all 17`. R2 drew an
11-card panel with five chips and a `+6 more`, which cannot occur: 11 is under both caps, so all 11
render and the desktop overflow count is negative. **Board Wipes at 2 owned is the deliberate
opposite** — under both caps, no disclosure, which is why it can read `Both of them.`

### Widths

| Width | Trigger |
|---|---|
| Desktop | heading row, right-aligned, 30px, `--surface-sunken` on `1px --border-strong`, radius 8, mono 12px `--fg`, caret `▾` `--accent` |
| Phone | own row under the sub-caption, 38px, full width, caret right |

---

## 6. Interaction between states — the four that need calling out

1. **Synergy absent × the key open** → two definitions, not three greyed. §2 state 3.
2. **Synergy absent × the sort** → *Most played* keeps its selection and swaps its sub-line to name
   pool order. The two are the same underlying fact (`showFigures === false`), stated once in each
   place it changes something — and no option is disabled, because the shipped order is still the
   shipped order.
3. **Prose absent × the anchor** → sentences 2–3 still render, so **the anchor still exists.** The
   link lives in sentence 3, which is templated; it does not depend on the generated sentence.
4. **Prose present × all roles at baseline** → sentence 3 omitted, so **no anchor.** The paragraph
   is two sentences and the section is shorter. Nothing else changes; the §7 answer's "way in" is
   only offered when there is somewhere worth going.

---

## 7. Not a state

- **No loading state for the paragraph.** It is a column read with the commander. Nothing streams,
  nothing suspends, nothing has a skeleton.
- **No error state for the paragraph.** A failed generation is `null`, which is state 2.
- **No empty state for the key.** It cannot be empty — a hero always has at least Pool and Roles.
- **No "no cards committed" legend.** The absence of amber dots is the information.
- **No sort persistence and no sort in the URL.** Fresh on every arrival.
- **No shared live region.** `CoverageSection` gets its own; `synergy-selection.tsx:222-243` owns
  its announcement and derives it from pick state.
