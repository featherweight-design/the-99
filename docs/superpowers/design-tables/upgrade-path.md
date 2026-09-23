# Upgrade path — design property table (Round 4, §B u1–u8)

Sources: `design/design_handoff_the99_push_line/` — `STATES-push-line.md` §B/§D, `HANDOFF.md`, `README.md`,
`READINESS.md`, `READINESS-r1/r2/r3-audit.md`, `ERRATA-eng.md`, `push-line - copy strings.ts` (`upgradePath`),
canvas `The 99 - The Push Line.dc.html` §1e (lines 508–598), §1f (600–660), §1g (746–797).
Nothing under `src/` was read. Canvas tokens: `--surface`, `--surface-sunken`, `--surface-raised`, `--border`,
`--border-strong`, `--border-dashed`, `--fg`, `--fg-body`, `--fg-muted`, `--fg-faint`, `--fg-locked`, `--accent`,
`--fact`, `--bracket-1..5`. Mono = `'IBM Plex Mono',monospace`; body = `'IBM Plex Sans'` (inherited).

"—" = explicitly absent. "not specified" = no value anywhere in the package. Copy keys are relative to `upgradePath`.

---

## Superseded in part: the Analysis tab's sheet 3b (2026-09-23)

`design_handoff_the99_analysis_tab/HANDOFF.md` §3 redraws the path as a **sheet**, 700px, opened
from the lower rung's `what would have to go →`. Where this table and that handoff disagree, the
handoff wins. What changed:

- **No disclosure.** The rung's control opens a `ModalChrome` sheet, and it carries `aria-haspopup`
  instead of `aria-expanded`.
- **One target, the bracket directly below.** The target chips are gone, and so are `targetLabel`
  and `targetsAria`.
- **The head moves into the sheet's header.** The target's 22px chip mark and the heading sit
  there, 14px at 390, with no eyebrow and no aside.
- **No `open your decklist`**, so `toDecklist` is gone.
- **No nearest-target line in `blocked`**, so `blocked.nearest` is gone. The targets nest upward,
  so with one target, the bracket directly below, nothing between it and the reading exists to
  be reached instead.

The rows below that name the chips, `targetLabel`, `toDecklist` or `blocked.nearest` describe the
retired disclosure. The item, foot, satisfied and blocked bodies stand as drawn.

## 0 · Where it lives

- **Tab:** Analysis tab, inside the **verdict block** ("What the deck's cards permit, the receipts behind it, and the
  upgrade path out" — card-note canvas l.99; README §7: "All three live on the Analysis tab").
- **Block / rung:** it is **not a block of its own**. It opens as a **disclosure from Round 2's climb, on its lower
  rung** — the rung captioned *To downgrade your deck* (`rungLabel`). Canvas §1e: "The upgrade path is that rung's full
  answer, so it opens from it rather than becoming a fifth block on the tab — and the lower rungs become the target
  selector." Rejected alternative (canvas l.594): "A separate block below the findings."
- **Build dependency (R1 + R2 audits):** PR 9 (the path) depends on PR 4 (Round 2's climb). `CoverageDisclosure` must
  move out of `components/commanders/` before the path can host on the rung. `rungLabel` REPLACES Round 2's
  `to drop to here` (R1 audit) — lands in PR 4 or `check:copy-drift` fires on Round 2's tables.
- **Staleness (STATES-card-note §C, card-note canvas l.434):** everything below the verdict head, *including the upgrade
  path*, "is as old as the verdict and demotes with it in v4" — block keeps border and contrast floor; **stale is not
  disabled.** No demotion treatment (opacity etc.) is specified for the path itself; the head uses `opacity .55`.
- Not on any add surface, not on the commit bar, not on `/commanders/[slug]` (§C).

---

## 1 · Element property table

### 1.1 Closed trigger (u1)

| Element | Property | 390 | Desktop | Copy key |
|---|---|---|---|---|
| Lower-rung caption | text | Round 2's rung caption | same | `rungLabel` |
| Disclosure trigger | text | *what would have to go* + `→` | same | `open` (the `→` glyph is not in the string) |
| Trigger | typography, color, size, spacing, hit area | **not specified — u1 is not drawn on the canvas** | not specified | — |
| Trigger | a11y | `aria-expanded`, `aria-controls` (§D) | same | — |

### 1.2 Open panel container (u2–u5)

| Property | 390 (§1g) | Desktop (§1e) |
|---|---|---|
| background | `var(--surface)` | `var(--surface)` |
| border | `1px solid var(--border)` | `1px solid var(--border)` |
| border-radius | 11px | 12px |
| padding | 13px 14px | 16px 18px |
| display / direction | flex / column | flex / column |
| gap | 11px | 13px |
| canvas frame width | 390px | 700px (canvas frame, not a spec) |

### 1.3 Panel head row

| Element | Property | 390 | Desktop |
|---|---|---|---|
| Head row | display / align / gap | flex / center / 10px | flex / center / 12px |
| Bracket mark (target) | size | 24×24 (**not a sanctioned size**, see C4) | 26×26 |
| | construction | diamond + numeral only, stroke 1.8, numeral Cinzel 700 17 | diamond (1.6) + mid ring (0.9, opacity .55) + numeral Cinzel 700 16 — **rank-2 construction drawn for rank 3** (see C4) |
| | color | `var(--bracket-{target})` | `var(--bracket-{target})` |
| | flex | none | none |
| | which bracket | the TARGET (3 in the fixture) | the TARGET |
| Text stack | display / direction / gap | flex / column / 2px | flex / column / 3px |
| | flex | — (not set) | auto |
| Eyebrow | font | mono 9px | mono 9.5px |
| | letter-spacing / transform | .14em / uppercase | .14em / uppercase |
| | color | `var(--fg-faint)` | `var(--fg-faint)` |
| | copy | `rungLabel` | `rungLabel` |
| Heading | font | 13.5px, weight 600 | 14px, weight 600 |
| | color | `var(--fg)` | `var(--fg)` |
| | copy | canvas draws a truncated *Upgraded — four things* — **no key exists** (C2); use `heading(target, n)` | `heading(target, n)` — fixture n=4 (see C3 on what n counts) |

### 1.4 Target selection

| Element | Property | 390 | Desktop |
|---|---|---|---|
| Placement | | own row, below the head row | inside the head row, right end |
| Group | display / align / gap / flex | flex / — / 7px / — ; **flex-wrap: wrap** | flex / center / 7px / none |
| "target" label | font | — (**absent at 390**) | mono 9.5px |
| | letter-spacing / transform | — | .12em / uppercase |
| | color | — | `var(--fg-muted)` |
| | copy | — | `targetLabel` |
| Chip (selected) | display / align / gap | inline-flex / center / 6px | inline-flex / center / 6px |
| | height | **44px** | 30px |
| | padding | 0 13px 0 8px | 0 11px 0 6px |
| | border-radius | 8px | 8px |
| | border | `1px solid var(--accent)` | `1px solid var(--accent)` |
| | background | `var(--surface-raised)` | `var(--surface-raised)` |
| | label | 13px, weight 600, `var(--fg)` | 12.5px, weight 600, `var(--fg)` |
| Chip (unselected) | border | `1px solid var(--border-strong)` | `1px solid var(--border-strong)` |
| | background | — (none) | — (none) |
| | label | 13px, weight 400 (default), `var(--fg-muted)` | 12.5px, weight 400, `var(--fg-muted)` |
| Chip mark | size | 20×20 (unsanctioned; C4) | 18×18 (unsanctioned; C4) |
| | construction | diamond (stroke 2) + numeral Cinzel 700 18, `var(--bracket-N)` | diamond (stroke 2.2) + numeral Cinzel 700 18, `var(--bracket-N)` |
| Chip label copy | | bracket name for N — **no key in `upgradePath`** (bracket-name lookup; C9) | same |
| Chip order | | descending (3, 2, 1) | same |
| Which chips | | brackets below the deck's reading; **never 4 or 5**; at most three | same |
| Default selected chip | | not specified (fixture selects the highest, Upgraded) | same |
| Hover / focus / pressed | | not specified | not specified |
| Role (radio / button / tab) | | not specified | not specified |

### 1.5 Items list

| Property | 390 | Desktop |
|---|---|---|
| wrapper | — (items are direct children of the panel, gap 11px) | flex / column / gap 9px |
| order | as returned by `upgradePath` (u5: "all items as returned") | same |

### 1.6 Item card (count rule and combo)

| Element | Property | 390 | Desktop |
|---|---|---|---|
| Card | background | `var(--surface-sunken)` | `var(--surface-sunken)` |
| | border | `1px solid var(--border)` | `1px solid var(--border)` |
| | border-radius | 9px | 9px |
| | padding | 11px 12px | 12px 13px |
| | layout | flex / column / gap 7px | **grid**: `grid-template-columns:150px minmax(0,1fr)`; gap 4px 18px; align-items baseline |
| Rule label | font | mono 9.5px | mono 9.5px |
| | letter-spacing / transform | .14em / uppercase | .14em / uppercase |
| | color | `var(--fg-faint)` | `var(--fg-faint)` |
| | grid cell | — | column 1, row 1 |
| | copy | *Game changers* / *Mass land denial* / *Two-card combos* — **no key in `upgradePath`** (C9) | same |
| Rule sentence | font | 12.5px, lh 1.6 | 13px, lh 1.6 |
| | color | `var(--fg-body)` | `var(--fg-body)` |
| | grid cell | — | column 2, row 1 |
| | bold tail | `<b>` weight 600 `var(--fg)` around the second sentence | same |
| Spacer | | — | empty `<span>` in column 1, row 2 |

#### Count-rule item (u2, u3)

| Element | Property | 390 | Desktop | Copy key |
|---|---|---|---|---|
| Limit sentence | (rule sentence styles) | | | `countRule.limit(target, limit, have)` |
| Choice sentence (u2, candidates > removeCount) | bold 600 `--fg` | | | `countRule.anyOf(removeCount, candidates.length)` |
| Forced sentence (u3, candidates === removeCount) | bold 600 `--fg`; names inline in the sentence | canvas l.788 | canvas l.560 | `countRule.forced(names)` |
| Forced name | decoration | `border-bottom:1px dotted var(--accent)` | same | card name |
| Forced name's marks | wrapper | inline-flex, center, gap 4px, margin-left 5px, vertical-align -3px | same | — |
| Candidate list (u2 only; u3 has none — names are in the sentence) | layout | flex / column / gap 7px / margin-top 2px; each item `align-self:flex-start` — **one per line, never a wrapped run** | column 2, row 2; flex / wrap / gap 6px 14px / margin-top 5px | — |
| Candidate | layout | inline-flex / center / gap 5px | inline-flex / center / gap 5px | — |
| Candidate name | font / color | 12.5px / `var(--fg)` | 12.5px / `var(--fg)` | card name |
| | decoration | `border-bottom:1px dotted var(--accent)` (opens the card) | same | — |
| Fact mark(s) | size | 16×16, not a prop | 16×16 | — |
| | color | `color: var(--fact)`, fill/stroke `currentColor` | same | — |
| | filter | `drop-shadow(0 0 4px color-mix(in oklab,var(--fact) 45%,transparent))` | same | — |
| | position | inline, after the name; every mark true of the card | same | — |
| | wrapper | every mount wraps it in `FactTooltip` (R1 audit, "fixed figures") | same | — |
| | a11y | `aria-hidden` (§C2) | same | — |

#### Combo item (u4)

| Element | Property | 390 | Desktop | Copy key |
|---|---|---|---|---|
| Rule sentence | (rule sentence styles) | **not drawn at 390** | as above | `comboRule.assembled(target)` in the fixture; `comboRule.forbidden(target)` exists — branch condition not specified (C7) |
| Bold tail | 600 `--fg` | not drawn | | `comboRule.either` |
| Pair row | layout | not drawn | column 2, row 2; flex / wrap / gap 6px 14px / margin-top 5px / align-items center | — |
| Half | layout / name / marks | not drawn | as a candidate (inline-flex, 12.5px `--fg`, dotted `--accent`, 16px marks after) | card name |
| `+` separator | font / color | not drawn | mono 11px / `var(--fg-faint)` | — (literal) |
| Produces tag | font | not drawn | mono 9.5px, letter-spacing .1em, uppercase | **no key** — *wins the game* (C8) |
| | color | not drawn | `var(--fg-locked)` | |
| Never | | | the word *remove*; a tick box; a remove control | |

### 1.7 Foot (u2–u5)

| Element | Property | 390 | Desktop | Copy key |
|---|---|---|---|---|
| Foot | border-top | **not drawn at 390** | `1px solid var(--border)` | |
| | padding-top | | 11px | |
| | layout | | flex / align-items flex-start / gap 16px / wrap | |
| Foot text | font / lh | | 12px / 1.6 | |
| | color | | `var(--fg-faint)` | |
| | flex | | `flex:1; min-width:300px` | |
| Overlap sentence (u5 only) | | | plain `--fg-faint` | `overlap(n)` — n = cards that are in two items |
| Disclaimer | | | `<b>` 600 `var(--fg-body)` | `yours` — rendered in the fixture beside `overlap`; whether it renders without an overlap is not specified |
| Decklist link | font | | mono 11px | `toDecklist` + `→` glyph |
| | color / decoration | | `var(--accent)` / `border-bottom:1px dotted var(--accent)` | |
| | flex | | none | |
| | destination / hover | | not specified | |

### 1.8 Satisfied (u6)

| Element | Property | 390 | Desktop (§1f) | Copy key |
|---|---|---|---|---|
| Container | background / border / radius | **not drawn at 390** | `var(--surface)` / `1px solid var(--border)` / 12px | |
| | padding | | 15px 17px | |
| | layout | | flex / **row** / align-items center / gap 13px | |
| Mark | | | 24×24 (unsanctioned; C4), diamond stroke 1.8, numeral 17, `var(--bracket-{target})` | |
| Sentence | font / lh / color | | 13px / 1.6 / `var(--fg-body)`; first sentence `<b>` 600 `var(--fg)` | `satisfied(target, range)` — `range` = the deck's reading as a phrase (*Exhibition or Core*) |
| Head / eyebrow / chips / items / foot | | | — (none drawn) (C6) | |
| Declaration hand-off | | | only the last clause of the sentence; **no control drawn** | |

### 1.9 Blocked on a count (u7) and on a combo (u8)

| Element | Property | 390 | Desktop (§1f, u7 only) | Copy key |
|---|---|---|---|---|
| Container | | **not drawn at 390** | as open panel, but **gap 12px** | |
| Head row | | | flex / center / gap 12px | |
| Mark | | | 26×26, `var(--bracket-{target})`, mid ring opacity .55 (hand-drawn; C4) | |
| Eyebrow | | | mono 9.5px .14em uppercase `var(--fg-faint)` | **`targetLabel`** (not `rungLabel`; C10) |
| Heading | | | 14px 600 `var(--fg)` | `blocked.heading(target)` |
| Target chips | | | — (**not drawn** in the blocked panel; C6) | |
| Item card | | | as §1.6 grid | |
| Rule sentence | | | 13px `--fg-body` lh 1.6 | `countRule.limit(target, limit, have)` + bold *Two of them can come out.* — **no key** (C11) |
| Candidate list | | | flex / wrap / gap 6px 14px / margin-top 5px / align center; cuttable candidates as §1.6 | |
| Commander chip | display / align / gap | | inline-flex / center / 6px | |
| | border | | `1px dashed var(--border-dashed)` | |
| | radius / padding | | 6px / 2px 8px | |
| | name | | 12.5px `var(--fg-faint)`, **no dotted underline** (C12) | card name |
| | fact mark | | 16×16 as §1.6 | |
| | tag | | mono 9px, .1em, uppercase, `var(--fg-locked)` | `blocked.commanderTag` |
| Shortfall block | border / padding | | `border-left:3px solid var(--border-strong)`; padding-left 13px | |
| | layout | | flex / column / gap 7px | |
| Shortfall sentence | font / lh / color | | 13px / 1.65 / `var(--fg-body)`; two bold 600 `--fg` spans | u7 `blocked.countShortfall(target)`; u8 `blocked.comboShortfall(target)` |
| Nearest-reachable row | layout | | flex / center / gap 9px / wrap | |
| | mark | | 18×18 (unsanctioned; C4), `var(--bracket-{nearest})` | |
| | text | | 12.5px `var(--fg-body)` | `blocked.nearest(nearest, n)` |
| | link span | | `var(--accent)`, `border-bottom:1px dotted var(--accent)` on the *n cards would have to go* half (C13) | |
| | action | | "one tap away": presumably selects that target — not specified in §D | |
| Colour rule | | | **no `--danger`, no warning glyph, never *impossible* or *sorry*** | |
| u8 | everything | **not drawn** | **not drawn** — "same shape as u7" (STATES); no fixture | `blocked.comboShortfall`; heading *Both halves are in your command zone* per STATES has no key of its own — it is the first sentence of `comboShortfall` |

### 1.10 Transitions / motion

Not specified anywhere (no open/close animation, no chip transition).

---

## 2 · State coverage

Types (from the package): `UpgradePath { target: 1|2|3, items: UpgradeItem[], blocked }`; `UpgradeItem` = count rule
`{ rule, removeCount, candidates }` | combo `{ combos: [{ combo, candidates }] }`. `upgradePath(profile, target: 1|2|3)`.
The shape of `blocked` (boolean vs. discriminated reason; where the nearest target comes from) is **not specified** in the
package.

| State | Condition | Renders |
|---|---|---|
| u1 | disclosure closed (local state), any path | rung caption `rungLabel` + trigger `open` `→`. Canvas: not drawn |
| u2 | open, `!blocked`, an item `{rule, removeCount, candidates}` with `candidates.length > removeCount` | head (mark, `rungLabel`, `heading`) + target chips + item card: rule label, `countRule.limit` + **`countRule.anyOf`**, candidate list (390: one per line) + foot |
| u3 | open, `!blocked`, count item with `candidates.length === removeCount` | as u2, but **`countRule.forced(names)`** with names inline in the sentence; **no *any*, no separate candidate list** |
| u4 | open, `!blocked`, an item `{combos:[{combo, candidates}]}` | combo card: *Two-card combos* label, `comboRule.assembled`/`forbidden` + `comboRule.either`, pair `A + B` + produces tag. Never *remove* |
| u5 | several items, a card id present in the `candidates` of ≥2 items | all items **as returned (not de-duplicated)** + `overlap(n)` in the foot, once |
| u6 | `items: []` (e.g. reading `[1,2]`, target 2) | single-row panel: mark + `satisfied(target, range)`. No items, no foot |
| u7 | `blocked` on a count rule (commander carries the excess; commander excluded from `candidates`) | head with `targetLabel` + `blocked.heading`; item with cuttable candidates + commander on a dashed edge with `commanderTag`; left-ruled `countShortfall` + `nearest` line (mark + link) |
| u8 | `blocked` on a combo, every piece a commander | same shape as u7 with `comboShortfall`. Not drawn |
| (stale) | verdict v4 | path demotes with the verdict; not disabled (STATES-card-note) |

**Precedence between states:** not stated for the path (STATES' precedence line is the atom's).

---

## 3 · Interaction (§D)

| Aspect | Rule |
|---|---|
| Pattern | disclosure |
| ARIA | `aria-expanded` on the trigger, `aria-controls` → the panel |
| State | local component state |
| Focus | **no focus move** on open |
| Persistence | **not persisted** |
| Reads, never acts | no tick boxes, no remove control, no checklist (§1e) |
| Card names | dotted `--accent` underline, open the card |
| Target chips | select the target; semantics / keyboard model not specified |
| Scroll | R1/R2 audits: a probe is owed for "the disclosure's scroll reset" (not a design value) |

---

## 4 · Contradictions and gaps

Audit corrections that WIN over the handoff are marked **[audit]**.

- **C1 [audit] copy module.** `push-line - copy strings.ts:19` imports from `@/lib/copy/shared`, which does not exist.
  ERRATA §2: `import { bracketPhrase, nameList, numberWord, ordinal } from "./deck-analysis"`. R2 audit item 5:
  `bracketPhrase` takes an ARRAY, and every call here passes one bracket — "for one bracket the name lookup is the right
  call." R1 audit: `countRule` must template on `BRACKET_NAMES[target]` (the R2 copy already takes `bracket`).
- **C2 [audit] em dashes.** Canvas draws `Upgraded — four things would have to go`, `Core — not reachable…`, `Upgraded is
  reachable — two cards…`, `Which cards go is yours — this is…`. The copy file (post-R1 sweep) uses comma/period and has
  no em dashes. Copy wins. The 390 heading *Upgraded — four things* is a truncation with **no copy key**.
- **C3 `heading` n.** `heading(bracket, n)` — the fixture reads *four things* over three items (Game changers remove 2 +
  MLD 1 + combo 1). So `n` = Σ `removeCount` + 1 per combo, not `items.length`. Not stated anywhere; derived.
- **C4 bracket marks off-spec in this canvas.** README "Corrected after review" / HANDOFF: marks lifted verbatim from
  `bracket-marks.html`, sanctioned sizes only (full 26/36/44, chip 22, numeral alone below 20). This canvas still has the
  hand-drawn marks: a 26px "3" with a mid ring and no cardinal ticks (the rank-2 construction), chip marks at 18 and 20,
  a 24px head mark at 390 and on u6, an 18px mark on the nearest line. **The corrected marks are in the file you told me
  to ignore** (`…-superseded premise-.dc.html`), which differs from this canvas ONLY in its bracket-mark SVGs: 26px full
  marks with ticks for 3, 22px chip marks, `currentColor`. README calls *that* file the kept reference. Build the marks
  from the asset sheet, not from either canvas.
- **C5 `countRule.limit` at 0.** Copy: *Upgraded allows none, and you have 1.* Canvas MLD item: *Upgraded allows none.*
  (drops the count). Copy wins.
- **C6 target chips on u6/u7.** STATES: target selection is chips. Canvas draws chips only on the open (u2–u5) panel;
  u6 and u7 draw no chips (u7 relies on the nearest link). Whether chips persist in those states is not specified.
- **C7 `comboRule.forbidden`** has no drawn state and no stated branch condition (presumably target ≤ 2, where two-card
  combos are disallowed, vs. `assembled` at target 3).
- **C8 combo produces tag** (*wins the game*) has no copy key; source of the text (Spellbook feature) not stated.
- **C9 missing keys:** the item rule labels (*Game changers*, *Mass land denial*, *Two-card combos*) and the chip labels
  (bracket names) have no key in `upgradePath`.
- **C10 blocked eyebrow** uses `targetLabel` ("Target"), while the open panel uses `rungLabel`. Deliberate or not is
  unstated.
- **C11 blocked item sentence** *Two of them can come out.* has no key; `anyOf` / `forced` don't fit.
- **C12 commander name** in the dashed chip has no dotted underline (does it open the card? unstated; §D says card names
  open the card).
- **C13 `blocked.nearest`** is one string; the canvas makes only its second half (*two cards would have to go*) the
  accent link. The key can't express that split.
- **C14 `blocked.countShortfall` wording.** Canvas: *The third is your commander… Removing the other two still leaves one
  game changer in the command zone*. Copy: *The rest is your commander… Removing the others still leaves one*. Copy wins;
  the canvas's two bold spans have no place in a single-string key.
- **C15 `overlap(n)` capitalisation.** `${numberWord(n)} of these…` starts the sentence with a lowercase number word
  unless `numberWord` capitalises. Canvas: *Two of these five are also the combo* — the canvas also has *five*, the copy
  does not.
- **C16 "below the deck's reading".** STATES: chips are "the brackets below the deck's reading". But u6's own example is a
  `[1,2]` deck targeting 2 (inside its reading). The rule has to be read as "below the top of the reading"; not stated.
- **C17 undrawn states:** u1 (the closed trigger), u8 entirely, and at 390 the combo item, foot, u6 and u7. STATES says
  both widths ship together (HANDOFF ruling 13); the 390 values for these must be carried over from desktop.
- **C18 u6 declaration hand-off** is a sentence clause only; no control is drawn.
- **C19 `upgradePath` type shape.** `blocked`'s type and where the nearest reachable target / its count come from are not in
  the package.
- **C20 [audit] `rungLabel`** replaces Round 2's `to drop to here` (R1 audit) — a Round 2 table drift to move in the same PR.
- **C21 R3 audit / ERRATA British spellings** (`analyse`) are card-note strings; none are in `upgradePath`. No effect here.
- **C22 eyebrow contrast.** The atom's label rule rejects `--fg-disabled` at 9px; the path's 9–9.5px eyebrows and rule
  labels use `--fg-faint` (#8B8270 on `--surface-sunken`), which no document measures. Not a contradiction, an unmeasured value.
