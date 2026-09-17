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

## Component: CommanderRow — the row shell

`RecCard` and `DiscoveryRow` are DELETED; this
shell is what survived them, and both lanes inherit it.

### Container context — row shell (shipped, unchanged)

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

## Component: CommanderRow (both lanes)

**Supersedes** the `RecCard (discovery arm)` sections and `rec-card.tsx`'s owned arm. One
component, two populations — **nothing on the row may be read off ownership** (handoff D1),
which is what cut `not in your collection`: once both lanes share a row, every `/discover` row
is unowned and every `/commanders` row is owned, so the line never distinguished anything.

**No `"use client"`.** The disclosure trigger retired with the tag list, so the row has no
control on it and nothing to announce.

### The five states

| # | State | Condition | Sentence slot | Gap slot | Figures slot |
|---|---|---|---|---|---|
| 1 | **Full** | `prose` present, `gapSlot.kind === "unplayed"` | the stored sentence | `None of your decks play {a}, {b} or {c}.` | Fit chip · deck count · price |
| 2 | **No sentence** | `prose === null` | **unmounts** — no placeholder, no reserved height, nothing synthesised and nothing truncated into the gap | unchanged | unchanged |
| 3 | **No tags** | `gapSlot.kind === "noMechanics"` | unchanged | `discoveryCopy.untagged` heading + body, in the slot the line would occupy | unchanged |
| 4 | **Nothing new** | `gapSlot.kind === "allPlayed"` | unchanged | `You already play every mechanic this commander leans on.` | unchanged |
| 5 | **Unpriced** | `price.kind === "absent"` **or** `priceOk === false` | unchanged | unchanged | the price figure **unmounts**; the deck count stays; no dash, no zero, no reason given |

**State 5 carries a condition the handoff did not have.** `priceOk` is the payload's record of a
failed price read, added in PR 3b (#700) after review found that a swallowed failure was cached
for up to an hour as `absent` — which this codebase defines as *the feed has never carried this
printing*. Omitting on a lost read rather than drawing `absent` is **ruling D3 applied to the
reading**: a figure with no reading is omitted, never zeroed. It needs no new drawn state, which
is why it folds into state 5 rather than becoming a sixth.

### The slots are independent, so the states multiply — and all of it is drawn

| | Full gap | Nothing new | No tag data |
|---|---|---|---|
| **sentence present** | 1 | 4 | 3 |
| **sentence absent** | 2 | 2 + 4 | 2 + 3 |

× `Unpriced`, which removes one figure from the foot line in all six. **No combination needs a
ruling**, because no slot reads another: the sentence is the commander's, the gap line is the
reader's, the figures are the catalogue's.

### Gap slot — the line

| Property | Mobile (390px) | Desktop (1280px) | Source |
|---|---|---|---|
| Copy, three names | `None of your decks play {a}, {b} or {c}.` | same | `commanderRowCopy.gap.unplayed` |
| Copy, two names | `None of your decks play {a} or {b}.` | same | same |
| Copy, one name | `None of your decks play {a}.` | same | same |
| Copy, nothing new | `You already play every mechanic this commander leans on.` | same | `commanderRowCopy.gap.allPlayed` |
| Copy, no mechanic tags | `discoveryCopy.untagged.heading` + `.body` | same | shipped, unchanged |
| Name cap | 3 | 3 | `GAP_NAME_CAP` |
| Aria | read as written, in all three forms | same | — |

**Three names is the normal form, not the generous one.** Measured over all 3,279 indexed
commanders with the real classifier and the real 0.5% floor: **93.1%** have three or more
eligible mechanic tags; 1.5% have one and 1.8% have two. The handoff's amber B worried about the
opposite case. `GAP_NAME_CAP` binds on nine rows in ten.

**The slot is never empty** (D2) — one of three occupants, always. Row height varies with the
sentence and with nothing else (D9).

**No creature type reaches the reader** (D5). The classifier decides, never `tags.length`: a
commander whose every tag is a creature type draws `noMechanics`, not `allPlayed`, because
`allPlayed` would assert something about a commander with nothing on file.

### Sentence slot

| Property | Mobile (390px) | Desktop (1280px) | Source |
|---|---|---|---|
| Content | `commander_support.prose`, verbatim | same | the database |
| Null | the slot unmounts | same | — |
| Aria | read as written; **not** `aria-hidden` | same | — |

**Measured sentence lengths** (production, 3,341 of 3,342 rows): longest **190**, mean 148,
p95 171. The handoff drew 2 lines at a 760px measure (≈190 characters) and 4 lines at 330px
(≈176). So the desktop budget is met **with zero margin** — the longest sentence in the
catalogue is exactly the budget — and **75 commanders (2.2%) exceed the phone estimate.**

Characters are a proxy for a measure that depends on glyph widths, so the desktop figure is not
proof. The handoff's own instruction governs if either clips: *the measure moves, not the design
— widen to the row's full `1fr` before adding a third line.* To be settled by browser
measurement against the three real 190-character sentences, not by character count.

The clamp stays regardless: a sentence overflowing its block silently is worse than one visibly
cut, and `-webkit-line-clamp` forces an atomic box — so nothing may be placed after the sentence
inside the same element.

### Figures slot — the foot line

| Property | Mobile (390px) | Desktop (1280px) | Source |
|---|---|---|---|
| Fit | `{score}` + `commandersCopy.row.fitDenominator` | same | reused unchanged |
| Fit, unmeasurable synergy | `commandersCopy.row.fitDenominatorMeasurable` | same | reused unchanged — `40/40` needs no new string |
| Deck count | `discoverCopy.row.popularity` | same | reused unchanged |
| Deck count, null | omitted | omitted | D3 |
| Price | `discoveryCopy.price.*` | same | reused unchanged |
| Separator | `·`, `aria-hidden` | same | `commanderRowCopy.figures.separator` |
| Fit chip aria | figure and denominator `aria-hidden`; the link's name carries the reading | same | unchanged |

**The row prints the denominator it was given** (D4) — never a bare `40/100`. And `score` is
normally `0..measurableTotal` but **that is not an invariant**: the synergy ratio is deliberately
unclamped, and `edhrec_total` sits one below the child-row count on 2 of 3,342 commanders, so a
reader owning every support card can read a point or two over. Print it; never assert a bound on
it.

### Fit bar slot — OVERRIDES this spec, on Hugh's ruling of 2026-09-17

The composition above RETIRED the segmented bar: one Fit number was to replace three
segments, under the §6 locked ruling "two sentences, three figures, and no table", and
§D of the plan's index recorded `FitBar` as losing its last caller on these rows.

It is back on both lanes. Read on the shipped row, the trade went the other way — the
information improved and the row got less interesting, with the band's right side empty
where the retired four-column grid had drawn the justification and the figures. This
section is the record of a Product decision overriding a design ruling, not of the
design ruling being wrong when it was made.

| Property | Mobile (390px) | Desktop (≥640px) | Source |
|---|---|---|---|
| Component | `FitBar` | `FitBar` with `legend` | reused unchanged from Commander Details |
| Placement | below the figures slot, `margin-top 10px`, full measure | in the band, right of the name column, `self-center` | — |
| Width | the row's measure | `480px`, `shrink-0` | — |
| Legend (`Pool` · `Roles` · `Synergy`) | hidden — `FitBar` draws it `hidden sm:flex` | drawn | unchanged |
| Segments, synergy measurable | three | three | `fitSegments` |
| Segments, synergy unmeasurable | **two**, not a zero-width third | two | `fitSynergy: null` |
| Aria | `aria-hidden` on both mounts | same | the link's own name carries Fit |

**`self-center`, not the band's own `items-end`.** Bottom-aligning the bar with the
commander's name was tried first and read as a caption under the art rather than a
column beside it; the retired grid drew it centred in the space to the art's right,
which is where it is again.

**Phone draws it under the foot line, not in the band.** At 390px the art fills the
band and there is no right side to use; under the figures also keeps the reading order
sentence, gap, figure, then the figure's parts.

**`fitSynergy` stays a null rather than a zero.** The component is absent, not empty —
the same distinction `measurableTotal` carries at 40, and `fitSegments` draws two
segments for it.

**Payload cost: 28 KB** across 3,085 rows (`1.008` → `1.036 MB` encoded, 51.8% of the
2 MB data-cache ceiling). The three components ride the dictionary+table encoding as
plain numbers; `rankScore` is still left behind, being the list's order and not a
figure any row prints.

### What does NOT change

| Surface | Ruling |
|---|---|
| `ArtWash` / the band | Unchanged. `labelAtPx` drops to **one value** — one row, one block. The figure is browser-measured, not derived; it is not recorded here until a probe has it. |
| The Fit chip | Unchanged, both sizes, both denominator forms |
| `IdentityPips` | Unchanged |
| `PriceSlot` | Unchanged — its dot, its source label, its absent rule |
| Commander Details | **Untouched.** It already prints this sentence and this figure; the row is catching up to it |
| The lane filters, orders and result lines | Unchanged. The row stops printing the floor note; the header still states the floor once |

### Row link aria

`{name} · Fit {score} of {measurableTotal}` — `explainedCopy.score.scoreAria`, unchanged. Both
of the old trailing clauses go: `not in your collection` is cut by D1, and the justification
paraphrase was a spoken restatement of a sentence that is now read aloud as written.

### Retired with this composition

These are KEY NAMES, which `check:copy-drift` does not read — it compares quoted STRINGS, so a
table naming a deleted key passes it. `docs/superpowers/design-tables/commanders-discover.md`
was found still naming two of them by review, not by the tool. All twenty-one have **zero consumers outside the row**, verified by grep; the count itself
comes off the diff.

`discoverCopy.row.notOwned` · `discoverCopy.row.novelty` · `discoverCopy.row.supportOwned` ·
`discoveryCopy.justify.tagList` · `.distanceNear` · `.distanceNone` · `.distanceLabel` ·
`.distanceAria` · `.sharedList` · `.floorNote` · `.floorNoteShort` · `.overlap` ·
`commandersCopy.row.action`

`planeCopy.overflow.*` is **kept**, per the handoff — but recorded as an erratum: the row and its
own copy test were its only consumers, so after this PR it has none. The handoff says the plane
keeps them; the code says the plane never used them.

### Price slot, the untagged note and row-level motion — SUPERSEDED

These sections were carried over verbatim from `RecCard` and specified a row the shipped
component does not draw. Found by the pre-open review, which is the only reason they are not
still here reading as the spec:

| The old rows said | The row draws |
|---|---|
| Price wrapper: `gap 7px`, `margin-top 4px`, `padding-top 9/10px`, `border-top 1px solid var(--border)` — "the hairline belongs to the slot" | `flex items-center gap-[6px]`, no padding, no margin, **no hairline** — the foot line is one row of figures, so a rule above the price would divide it from the deck count beside it |
| Price figure: `11.5px` mobile, `12.5px` desktop | `12.5px` at both widths |
| A `manapool` provenance word at 9.5/10px, `margin-left: auto` | drawn at 10px, `aria-hidden`, immediately after the figure — **not** pushed to the end of a column this row no longer has. The word stays because §C names the source label unchanged; only its placement moved |
| Untagged note: bordered box, `--elevated-hover` ground, 2px left border, radius 7px, 13px `⚠`, heading joined by ` — ` at `--fg-body`/600 | a plain `<p>`, heading at `--fg-muted` joined by a space. It shares the gap slot with two sentences, so a plated box would make one of three states look like a warning |
| `Row hover: —`, `transition: — ("Motion: none")` | `transition-colors hover:bg-[color:var(--elevated-hover)]` on the row shell |
| Row shell: `grid-template-columns 40px 100px 1fr 236px`, radius 11/12px, full `1px solid var(--border)`, `background var(--surface)` | `borderBottom` only, no radius, no grid, no ground — the row is a band and a block, not a card |

**The row shell's own table above is in the same position** and is left as the record of what
the retired card was, not as a specification of this one. A verify pass should read the
component, not these rows.

**MOTION: still none inside the row.** The hover tint is on the shell and was on the retired
one too; nothing in the sentence, gap or figure slots transitions, which is what D10 forbids.

## State Coverage — CommanderRow

Supersedes the `RecCard discovery arm` matrix. Five states, and the price rows below them, which
are unchanged.

| State | Triggering condition | What renders | Key props |
|---|---|---|---|
| **Full** | `prose` present, `gapSlot.kind === "unplayed"` | the stored sentence, the gap line naming up to three mechanics, Fit · deck count · price | `prose`, `gapSlot`, `score`, `measurableTotal`, `deckCount`, `price` |
| **No sentence** | `prose === null` | the sentence slot **unmounts** — no placeholder, no reserved height | `prose` |
| **No tags** | `gapSlot.kind === "noMechanics"` | `discoveryCopy.untagged` heading + body in the gap slot | `gapSlot` |
| **Nothing new** | `gapSlot.kind === "allPlayed"` | `commanderRowCopy.gap.allPlayed` | `gapSlot` |
| **Unpriced** | `price.kind === "absent"` OR `priceOk === false` | the price figure **unmounts**; the deck count stays | `price`, `priceOk` |
| **Unmeasured Fit** | `measurableTotal < 100` | the chip prints `fitDenominatorMeasurable(measurableTotal)` — never a bare `/100` | `measurableTotal` |
| **No deck count** | `deckCount === null` | the figure is omitted, never zeroed | `deckCount` |

**Every state that used to be read off ownership is gone**, and D1 is why: one component serves a
lane of owned commanders and a lane of unowned ones, so `owned` distinguishes nothing. The
ownership pip's two readings, the receipt clause and the free-mode score delta all left with it.
The delta is worth naming because the handoff's cut list does not: a "was 74, now 58" note under
`Free cards only` is a figure read off availability.

## Copy key map

| Element | Copy key | Arguments |
|---|---|---|
| Gap line, 1–3 names | `commanderRowCopy.gap.unplayed` | `(labels: string[])` |
| Gap line, nothing new | `commanderRowCopy.gap.allPlayed` | — |
| Gap line, no mechanic tags | `discoveryCopy.untagged.heading` / `.body` | — |
| Foot-line separator | `commanderRowCopy.figures.separator` | — |
| Fit denominator | `commandersCopy.row.fitDenominator` | — |
| Fit denominator, unmeasured | `commandersCopy.row.fitDenominatorMeasurable` | `(total: number)` |
| Deck count | `discoverCopy.row.popularity` | `(decks: number)` |
| Price figure / dot / provenance | `discoveryCopy.price.*` | unchanged |
| Row link accessible name | `explainedCopy.score.scoreAria` | `(score: number, total: number)` |
| The sentence | `commander_support.prose` | the database |

**Twenty-one keys**, counted off the diff rather than by eye — the handoff's
retirement list named nine, and two attempts to correct it here said eleven and then
seventeen, both wrong in count and in membership. Two whole blocks went
(`discoveryCopy.justify`, fifteen keys, and `discoveryCopy.ownership`, three) plus three
from `discoverCopy.row`:

`justify.overlapLabel` · `.overlap` · `.overlapShort` · `.figureLabelFit` · `.figureUnitFit` ·
`.distanceLabel` · `.tagList` · `.sharedList` · `.distanceNone` · `.distanceNear` ·
`.distanceAria` · `.figureLabelNew` · `.figureUnitNew` · `.floorNote` · `.floorNoteShort` ·
`ownership.unowned` · `.unownedShort` · `.unownedAria` ·
`discoverCopy.row.notOwned` · `.novelty` · `.supportOwned`

`scope.ownedShort` is LIVE and was wrongly listed as deleted twice — it belongs to the lane
header, not the row. `commandersCopy.row.action` was already retired before this PR.

**`planeCopy.overflow.*` is kept** per the handoff, and has no caller after this PR: the row and
its own copy test were the only ones. **`RoleChips` and `FitBar` are both kept** — the handoff's
erratum said only `FitBar` survives, and `src/components/about/figures.tsx` imports both.
`FitBar` has a second caller again as of 2026-09-17: the row itself. See the Fit bar slot above.

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
>
>   **Superseded 2026-09-14 for the labels only.** The control is `Build from`, and its labels live in `commandersCopy.availability` in `lanes.ts` — `availability.ts` never held the shipped ones, and the five dead keys that named it there were deleted. The receipt strings are untouched. The DEGRADED strings were touched, and only for this rename: `degraded.body`, `bodyWithSynergy` and `segmentDisabledAria` named `What's free`, which is the segment's retired label, and now say `Free cards only`. Reuse-by-reference still holds — `discoveryCopy` adds nothing to that module.

Token contract, from the E2 frame:

> **No new token, no new hex, no new motion class, no new component.** … the ownership pip is `RecCard`'s own diamond; the price dot is the availability dot.

> **Stock is never colour alone.** Price reads as *"$18.40, in stock at ManaPool"*, and is
> `aria-hidden` never.
>
> The OWNERSHIP half of this rule retired with the composition: the pip's two readings, the
> receipt clause and the accessible name's *"in your collection"* / *"not in your collection"*
> are all gone under D1, because one component serves an owned lane and an unowned one. The
> row's accessible name is now `explainedCopy.score.scoreAria` — the commander and its Fit.

> **Contrast.** Every figure that carries meaning sits at `--fg` or `--fg-body` on `--surface`. `--fg-locked` is used only for the disabled sort option and the dimmer of the two reveal lines — *(note: the row also uses `--fg-locked` for the hollow pip's border, the hollow price dot's border, and the `manapool` provenance word; the contrast sentence is about text carrying meaning, and none of those three do)*.

> **Motion: none.** Both flips are state changes … no transition, no dimmed list, no skeleton. The list re-renders in place.

---

## Open items for the verify pass

The six items that stood here were every one about a retired surface — the `NEW TAGS`
denominator, `tagList`'s `+2`, M-bolding in the fit sentence, the untagged note's phone
drawing, the ownership diamond drawn twice, and the justification track's 110-vs-120px width.
All six left with the composition. What remains:

1. **`labelAtPx` is 56 and only the inequality is pinned.** `probe:commander-row` asserts the
   scrim reaches full opacity above the tallest marked ink — measured 152px against ink at
   168px desktop and 176px phone — so every value from about 40 up passes. The margin over the
   requirement is a judgement about a name that wraps, not a measurement.
2. **The phone draws the longest sentence in exactly four lines**, at the clamp's limit with
   zero overflow. The next sentence longer than 190 characters clips. Nothing regenerates prose
   per-commander, so this moves only when the generator's prompt does — and the handoff's
   ruling if it ever clips is to widen the measure, never to add a fifth line.
3. **`planeCopy.overflow.*` has no caller.** Kept per the handoff, which says the plane keeps
   them; the code says the row and its own copy test were the only consumers there ever were.
4. **`discoveryCopy.price.source` IS drawn**, and this item used to say it was not. Round 2 of
   review pointed out that §C names `PriceSlot` unchanged — *"its dot, its source label, its
   absent rule"* — so the `manapool` word was restored beside the figure, `aria-hidden`, and
   takes the figure's absence with it. Recorded because the erratum outlived the fix by one
   round: the row dropped the word, this table explained why, and then the row got it back.
