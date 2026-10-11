# Design property table: evidence benchmarks, the Benchmark Ledger

Source: `design/design_handoff_the99_analysis_tab/addendum_evidence_benchmarks/` (R4, readiness
🟢 Green, 2026-10-10). Read: `README.md`, `STATES-evidence-benchmarks.md`, `READINESS.md`,
`READINESS-audit.md`, `Benchmark Ledger.dc.html`, `benchmark-fixtures.js`,
`Evidence Benchmarks Addendum.dc.html` (§2 "What see the N cards opens", design calls 3 and 6, and
the ledger sections 2a to 2g).

**Scope:** the ledger modal opened from a benchmark tile's or dependency row's opener: chrome,
header (mark / title / aside / close), summary (reading, scale, *Broken by*, note, Stats link),
groups and card rows, win speed's combo sections, the stacked card detail, at 390 and 1300 (760
modal). **Excluded:** the block itself (see `evidence-benchmarks.md`) and the About entry.

Copy is not a property: cells name the copy KEY a slot renders, from
`src/lib/copy/deck-benchmarks.ts` (`deckBenchmarksCopy`, abbreviated `C`). `C.ledger.*` is
abbreviated `L.*`.

Font families: the drawing spells `'IBM Plex Sans'` (sans) and `'IBM Plex Mono'` (mono) as
literals; display type is `var(--display)`. "sans" / "mono" / "display" below mean those.

Mobile = the `phone` layout (390 frame, sheet from 52px). Desktop = the 760 modal over the 1300 tab.

## Build rules from the audit and README that override or replace the drawing

The ledger canvas draws its own chrome and a hand-made row so it can render standalone. The rules
below say which shipped component replaces each drawn part. **Where a rule names a shipped
component, the shipped component's values win over the drawn values in sections 2 to 6**; the drawn
values are recorded so a reviewer can see what the drawing intended, and are marked *(drawn;
replaced by …)* where they are superseded.

| # | Source | Rule | Effect on the drawing |
|---|---|---|---|
| R1 | README call 4; STATES §D; audit "Verified" | Chrome is **`ModalChrome` at 760, unchanged** (`receipt-modal.tsx`). The phone sheet is ModalChrome's own sheet from 52. Strength tag (dependency) or mini meter (graded) goes in ModalChrome's `mark`; the step word (graded) or nothing goes in `aside`; title in `title`. | **Overrides** the drawn header box, close button, sheet radius/shadow/padding: use ModalChrome's. |
| R2 | README R4; STATES §D | Every ledger line is **the shared card row**: `ROW_SHELL` (`ui/row-shell.ts`) with **`DecklistRow`'s padding**: 7px radius, `--surface-rail` ground, `--elevated-hover` on hover, gap 9 (390) / 10 (1300), 34px tall (1300) / 52px with meta line (390). | **Overrides** drawn row padding (`7px 9px` / `6px 8px`) with DecklistRow's, and drawn hover ground `--elevated` with `--elevated-hover`. |
| R3 | README R4; STATES §D | Costs are **`CostTrack` (72px) + `CostPips`** from the card's `mana_cost`. | **Overrides** the drawn pip discs (hand-made colored circles, fetched live from Scryfall). |
| R4 | README R4; STATES §D | The availability marker is **the shipped availability marker** of the card row. | **Overrides** the drawn dot (filled `--success` / dashed `--fg-faint`, fixture assigns every 5th as unowned). |
| R5 | README R4; STATES §D | **Hover is the shipped `HoverPreview`**; the ledger mounts inside **`HoverPreviewProvider`**, as the builder does. | **Overrides** the drawn absolute 200px preview image. |
| R6 | README R4; STATES §D; audit "Verified" | **Press**: each row is a **`CardDetailTrigger`** with `siblings` = the ledger's rows (all groups, in display order), so Prev/Next walks the ledger. The card stacks over the sheet as over the receipt (`← {title}`); depth stays at two; the page behind closes both. | Behaviour the drawing cannot show. |
| R7 | Audit build rule 4; README R4 exception | **Win speed reuses the receipt's combo parts**: export `ComboBody` (or the plate row inside it) from `receipt-modal.tsx` rather than redrawing. Plates stay **`ReceiptTile`**. | **Overrides** the drawn combo section's plate/heading/chip styling where `ComboBody` differs. Drawn values in §6 are reference only. |
| R8 | Audit build rule 6; README "Ledger link" | The Stats link **switches the deck page to Deck stats, closes the sheet, and scrolls to the named Stats card** (Curve or Jobs). Scroll target is new builder-shell wiring. Win speed and Dependencies have no link. | Behaviour. |
| R9 | Audit build rule 3; STATES §C | **Combat Heavy has no ledger** (no opener; zero rule). Combat Light lists its routes. | Matches drawing. |
| R10 | Audit build rule 2; STATES §D | No group, note or line refers to how a card was read (no "label" anywhere). "Read, not counted" = weighed and scored 0 (cost reducers, late ramp), never a text-read bucket. | Matches drawing. |
| R11 | Audit build rule 11; README "Artifacts ledger" | Artifacts ledger lists each card **once, under its first group** (payoffs → with abilities → other). Enchantments follows the same rule. | Matches drawing (`onceNote`). |
| R12 | Audit build rule 7 | Graveyard lands **stay out**; the note `landsLeftOut(names)` names them. If the plan counts them, the note goes; no layout change. | Matches drawing. |
| R13 | Audit "Verified": ModalChrome width union includes 760 | Use the existing 760 width; no new width. | — |
| R14 | Audit copy closing note | Typographic `’` in all strings. | Copy only. |

## 1. Chrome and frame

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Component | `ModalChrome` phone sheet (R1) | `ModalChrome` modal, width 760 (R1) |
| Position | sheet from 52px below top; 52px scrim strip above it; header pinned while the body scrolls (§2 text) | centered over the tab |
| Scrim | `color-mix(in oklab, var(--bg) 72%, transparent)` (shipped 72% scrim) | same |
| Sheet ground | `--surface-raised` *(drawn; ModalChrome's wins)* | `--surface-raised` *(drawn)* |
| Sheet border | top 1px `--border-strong` *(drawn)* | 1px `--border-strong` *(drawn)* |
| Sheet radius | `14px 14px 0 0` *(drawn)* | 14px, `overflow:hidden` *(drawn)* |
| Shadow | none | `0 24px 60px rgba(0,0,0,0.45)` *(drawn)* |
| Bottom padding | 24px *(drawn)* | 12px *(drawn)* |
| Role | `role="dialog" aria-modal="true"` | same |
| Close by | Escape, ×, press on scrim; focus returns to the opener | same |
| Opener (in block) | `aria-haspopup="dialog"`, 44px tall | same control, findings' opener |

## 2. Header

Order left to right: **mark** (graded: mini meter; dependency: strength tag) → **title** →
**aside** (graded only: step word) → **close** (pushed right). R3 (Hugh): the Heavy/Light tag sits
LEFT of the title.

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Box | flex, `align-items:center`, gap 9, height 43, padding `0 16px`, bottom 1px `--border` *(drawn; ModalChrome's)* | flex, center, gap 10, padding `14px 18px`, bottom 1px `--border` *(drawn; ModalChrome's)* |
| Title slot | graded: `C.names[k]`; dependency: `L.ledgerTitle(C.deps.rows[row])` | same |
| Title type | display 700, 15px, lh 1.2, `--fg`, nowrap, ellipsis, `min-width:0`, `margin:0`, `<h2>` | display 700, **16px**, lh 1.2, same |
| Mini meter (graded only, `mark`) | `aria-hidden`, flex none, grid `repeat(5,5px)`, gap 2; each cell 5×9, radius 1.5; cell i filled when i ≤ step with `STEP_INK[i-1]`, else `--elevated` + `inset 0 0 0 1px var(--border-strong)` | same |
| Aside (graded only) | `C.steps[step-1]`; mono 12, `--fg-faint`, nowrap, `min-width:0` | same |
| Strength tag (dependency only, `mark`) | `C.deps.strength[s]`; mono 10, letter-spacing 0.12em, uppercase, nowrap, radius 4, padding `2px 7px` | same |
| Strength tag, Heavy | color `--fg`; border 1px `--fact`; bg `color-mix(in oklab, var(--fact) 14%, transparent)` | same |
| Strength tag, Light | color `--fg-muted`; border 1px `--border-strong`; bg transparent | same |
| Dependency aside | none (no step word, no mini meter) | same |
| Close | `aria-label = L.closeAria(title)`; 44×44, flex none, `margin-left:auto`, `margin-right:-10px`, centered glyph ×, mono 14, `--fg-faint` *(drawn; ModalChrome's)* | same |

## 3. Summary (the reading paragraph and what follows it)

Order top to bottom: reading → scale (graded) → *Broken by* line (dependency) → foot row (note,
then link).

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Box | flex column, gap 12, padding `14px 16px 14px`, bottom 1px `--border`, bg `--surface` | gap 14, padding `16px 20px 16px`, same border/bg |
| Reading | `L.readings[k]` (dependency: `L.readings[row]`); sans 13.5px, lh 1.6, `--fg-body`, `text-wrap:pretty`, `<p>` margin 0 | same |
| Scale (graded only) | `role="img"`, `aria-label = C.stepAria(title, word, step)`; grid `repeat(5, minmax(0,1fr))`, gap 4 | same |
| Scale column | flex column, gap 5, `min-width:0`: bar over word | same |
| Scale bar | height **7**, radius 2; filled when i ≤ step: `STEP_INK[i-1]`; else `--elevated` + `inset 0 0 0 1px var(--border-strong)` | height **8**, same |
| Scale word | `C.steps[i-1]`; mono **8.5**, lh 1.3; current step `--fg` 600, others `--fg-faint` 400 | mono **9.5**, same |
| *Broken by* line (dependency only) | `<p>` sans 12.5, lh 1.55, `--fg-muted`, pretty; label `C.deps.brokenBy` in mono 9, ls 0.14em, uppercase, `--fg-faint`; then a non-breaking space + space, then `C.deps.hate[row]` | same |
| Foot row (when note or link) | flex, wrap, `align-items:center`, `justify-content:space-between`, gap `4px 14px` | gap `8px 18px` |
| Note | mono 10.5, lh 1.55, `--fg-faint`, pretty, `flex:1 1 300px`, `min-width:0` | same |
| Link | inline-flex, center, gap 7, **min-height 44px**, mono 10.5, `--accent`, nowrap; text with `border-bottom:1px dotted var(--accent)`, then `→` | **min-height 24px**, same |
| Link hover | `--accent-hover` (canvas global `a:hover`) | same |

## 4. Per-ledger summary contents (STATES §D)

| Ledger | Mark | Aside | Reading key | Scale | Broken by | Note key | Link key |
|---|---|---|---|---|---|---|---|
| Velocity | mini meter | step word | `L.readings.velocity(lands, ramp, avgMv)` | yes | — | `L.expectedTurn(commander, turn)` (commander's `expectedCastTurn`) | `L.linkCurve` |
| Card flow | mini meter | step word | `L.readings.flow(pts, cards)` | yes | — | — | `L.linkJobs` |
| Interaction | mini meter | step word | `L.readings.interaction(answers, cheapInstant)` | yes | — | — | `L.linkJobs` |
| Win speed | mini meter | step word | `L.readings.win(odds)` | yes | — | `L.readings.winNote` | none |
| Graveyard | strength tag | — | `L.readings.graveyard(n, commander)` | no | yes | `L.landsLeftOut(names)` | none |
| Artifacts | strength tag | — | `L.readings.artifacts(a, p, act)` | no | yes | `L.onceNote` | none |
| Enchantments | strength tag | — | `L.readings.enchantments(e, p)` | no | yes | `L.onceNote` | none |
| Creatures | strength tag | — | `L.readings.creatures(p)` | no | yes | — | none |
| Activated | strength tag | — | `L.readings.activated(n)` | no | yes | — | none |
| Combat (Light only) | strength tag | — | `L.readings.combat(routes)` | no | yes | `L.reachNote` | none |

## 5. Groups and card rows

### Groups per ledger, in order

| Ledger | Groups (head key), in display order | Points column | Row order within group |
|---|---|---|---|
| Velocity | `L.counted`, then `L.readNotCounted` | yes: `+1` / `+0.5` / `+0.25` / `0` | drawn: points descending, then mana value ascending (fixture order; see Ambiguities) |
| Card flow | `L.counted` | yes: `+2` / `+1` | drawn: `+2` before `+1` |
| Interaction | `L.counted` | yes: `+3` / `+2` / `+1` | **sorted by weight** (STATES §D, canvas 2c); drawn ties by mana value ascending |
| Win speed | none (combo sections, §6) | none | — |
| Graveyard | `L.groups.usesGraveyard` | none | drawn: commander first, then fills → fills+returns → returns → keywords (dredge, delve) → grows |
| Artifacts | `L.groups.paysOffArtifacts`, `L.groups.artifactAbilities`, `L.groups.otherArtifacts` | none | commander first in drawn payoffs; each card once, under its first group (R11) |
| Enchantments | `L.groups.paysOffEnchantments`, `L.groups.otherEnchantments` | none | once-under-first-group (R11) |
| Creatures | `L.groups.paysOffCreatures` | none | not drawn |
| Activated | `L.groups.activatedCreatures` | none | not drawn |
| Combat, Light | `L.groups.winsOutsideCombat` | none | not drawn beyond 2 rows |

### Group block

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Wrap | flex column, gap 4 (rows split by a 4px gap), padding `16px 12px 0` | padding `18px 20px 0`, same |
| Head row | flex, baseline, gap 8, padding `2px 2px 4px`, bottom 1px `--border`, margin-bottom 4 ("the decklist's group head") | same |
| Head text | group key; display 700, 15px, lh 1.2, `--fg` | same |
| Head count | row count in that group; mono 11, `--fg-faint` | same |

### Card row (R2 to R6 govern; drawn values in italics where replaced)

Order: availability marker · name · why tag · `CostTrack` 72 · points (graded only). At 390 the
pips and the why move to a meta line under the name.

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Shell | `ROW_SHELL` + DecklistRow padding (R2); `data-card-row`; flex, center; gap **9**; radius 7; min-height **52**; ground `--surface-rail`; cursor pointer *(drawn padding `6px 8px`)* | gap **10**; min-height **34** *(drawn padding `7px 9px`)* |
| Hover | ground `--elevated-hover` (R2; drawn `--elevated`) — no HoverPreview drawn at 390 | `--elevated-hover` + `HoverPreview` (R5) |
| Press | `CardDetailTrigger`, siblings = ledger rows (R6) | same |
| Availability marker | shipped marker (R4) *(drawn 7×7 dot)* | same |
| Name | 14px sans, `--fg`, nowrap, ellipsis | 13.5px sans, `--fg`, nowrap, ellipsis, `flex:0 1 auto` |
| Name + why layout | column, gap 3: name, then meta line (flex, center, gap 8: pips flex-none gap 3, then why) | one line: flex 1, baseline, gap 9, overflow hidden: name then why |
| Why tag | `L.why.*` (and `L.why.commanderPrefix` prepended for the commander); mono 10.5, `--fg-muted`, nowrap, ellipsis | same |
| Cost | `CostPips` from `mana_cost` (R3), in the meta line *(drawn 13px discs)* | `CostTrack` 72px, right-aligned, gap 3 (R3) *(drawn 12px discs)* |
| Points (velocity, flow, interaction only) | flex none, width **40**, mono 12, right-aligned; `0` (or `—`): `--fg-faint` 400; any other: `--fg` 600 | same |
| Points slot keys | literal figures from the reader (`+1`, `+0.5`, …); not copy | same |

### Why-tag keys by ledger

| Ledger | Keys |
|---|---|
| Velocity | `why.speedCost(kind, mv)` (rock / creature), `why.landOut(mv)`, `why.burst(mv)`, `why.costReduction`, `why.tooLate(mv)` |
| Card flow | `why.repeatable`, `why.oneShot` |
| Interaction | `why.speedCost(kind, mv)`, `why.wipe(kind, mv)`, **`why.counterspell(mv)`** for counterspell rows (interaction, never removal) |
| Graveyard | `why.graveyard.fills` / `.returns` / `.grows`, combined with ", "; keyword (dredge, delve, flashback) appended (drawn) |
| Combat | `why.winsOutright` |
| Artifacts, enchantments, creatures, activated | not keyed in the copy module (drawn as free phrases, e.g. "mana ability", "for each artifact"); see Ambiguities |

## 6. Win speed: one section per combo line

R7: reuse `ComboBody` / `ReceiptTile`. Drawn values below are reference.

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Section | flex **column**, gap 12, padding `14px 16px`, bottom 1px `--border` | flex **row**, gap 16, padding `16px 20px`, bottom 1px `--border` |
| Plates | `ReceiptTile` per piece; flex none, gap 6; drawn width **58**, aspect 63/88, radius 6, 1px `--border-strong`, `--elevated` behind art | drawn width **72**, same |
| Content column | flex column, gap 9, flex 1, `min-width:0` | same |
| Pieces heading | `<h3>` display 700, 15px, lh 1.3, `--fg`; names joined by ` + ` in `--fg-faint` weight 400; each name a `CardDetailTrigger` with 1px dotted `--accent` underline | same |
| Produces chips | Spellbook's feature strings (data, not copy); `<ul>` flex wrap gap 6; each mono 9.5, ls 0.1em, uppercase, radius 5, 1px `--border-strong`, padding `4px 9px`, `--fg-body` | same |
| Stats row | flex wrap, gap `8px 22px`, align flex-end | same |
| Odds | label `L.byT8` (mono 9, ls 0.14em, uppercase, `--fg-faint`) over the line's odds (mono 14, 600, `--fg`), gap 4 | same |
| Found by | label `L.foundBy` (same label style) over tutors joined ` · ` (sans 12.5, `--fg-muted`) | same |
| Spellbook link | `L.spellbook`; margin-left auto; inline-flex center; min-height **44px**; mono 10.5, `--accent`, solid 1px `--accent` underline | min-height **24px** |
| Line order | drawn: odds descending (14%, 12%, 6%, 4%) | same |
| Points / groups | none | none |

## 7. Layout widths

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Frame | 390 wide, `overflow:hidden`; 52px strip above sheet (`color-mix(in oklab, var(--bg) 72%, #000)` standalone; transparent over the tab) | 760 modal |
| Content gutters | header 16, summary 16, groups 12, combos 16 | header 18, summary 20, groups 20, combos 20 |

## 8. State coverage

| State | Trigger | What renders |
|---|---|---|
| Velocity ledger [2a] | press velocity tile's `C.open(n)` | header mini meter + `names.velocity` + step word; reading, scale, foot `expectedTurn` + `linkCurve`; groups Counted, Read not counted; points |
| Card flow ledger [2b] | press flow tile's opener | as velocity; no note; `linkJobs`; one group Counted; `+2`/`+1` |
| Interaction ledger [2c] | press interaction tile's opener | as flow; one group Counted sorted by weight; counterspells as `why.counterspell` |
| Win speed ledger [2d] | press win tile's `C.openCombo(n)` (counted combo only) | header mini meter + step word; reading, scale, foot `winNote` (no link); one combo section per line; no groups, no points |
| Win speed, no combo | — | no opener, so no ledger |
| Dependency ledger [2e, 2f, 2g] | press a dependency row's `C.open(n)` | strength tag left of `ledgerTitle(row)`; no scale, no mini meter, no aside; reading, *Broken by* + hate, note (per §4); groups per §5; no points; no link |
| Combat Heavy | — | no opener, no ledger (R9) |
| Enchantments / Creatures / Activated ledgers | press that row's opener | same body as other dependency ledgers; groups per §5 (not drawn) |
| Row hover (1300) | pointer rests on a row | ground `--elevated-hover`; `HoverPreview` of the card |
| Row press | press/tap a row or a combo piece name | `CardDetailTrigger` opens card detail stacked over the ledger, back control `← {title}`; Prev/Next walks the ledger's rows; depth two |
| Close | Escape, ×, scrim press | sheet closes; focus to the opener |
| Stats link | press `linkCurve` / `linkJobs` | sheet closes, deck page switches to Deck stats, scrolls to Curve / Jobs card (R8) |
| Phone sheet scroll | body taller than viewport | header pinned; body scrolls |
| Card unowned | availability state of the card | shipped availability marker (R4) |
| Points zero | velocity "Read, not counted" rows | `0` in `--fg-faint` 400 |

## Ambiguities

1. **Row order within a group** is specified only for interaction ("sorted by weight"). Velocity and
   flow draw points-descending then mana-ascending; dependency groups draw commander first then an
   unexplained category order. Proposed: points desc, then mana value asc, then name, with the
   commander first in dependency groups. Ties within interaction weight are unspecified.
2. **Combo line order** is drawn odds-descending but not stated.
3. **Why tags for artifacts, enchantments, creatures and activated** ("mana ability", "for each
   artifact", "artifact creature", "whenever an artifact enters") have no keys in
   `deck-benchmarks.ts`; the copy module covers velocity, flow, interaction, graveyard and combat
   only. Either they are reader-produced phrases or keys are owed.
4. **Hover ground**: drawing uses `--elevated`; README/STATES say `--elevated-hover`. Rule R2 takes
   `--elevated-hover`.
5. **Mini meter in ModalChrome**: the audit maps the strength tag to `mark` but does not say where
   the graded mini meter goes; it sits in the same leading position, so `mark` is the natural slot.
6. **Combo plate width** (72 / 58 drawn) versus `ReceiptTile`'s shipped size: R7 says reuse, so the
   shipped size wins if it differs.
7. The drawing computes unused `rowStyle` / `nameCell` / `pad` (an older grid row layout,
   `minmax(0,1fr) minmax(0,250px) 48px`); dead code, not a property.
