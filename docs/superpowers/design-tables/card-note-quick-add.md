# Design Property Table — Card note on the quick-add result row (PR 8c)

Source package: `design/design_handoff_the99_push_line/`. Abbreviations used in citations:
- **HO** = `HANDOFF.md` (§Locked, §Geometry)
- **SCN** = `STATES-card-note.md` (§A n1–n9, §D)
- **SPL** = `STATES-push-line.md` (§C host matrix, §C2 fact marks, §D)
- **RM** = `README.md` (§2, §3)
- **ER** = `ERRATA-eng.md`; **R3** = `READINESS-r3-audit.md`
- **CS** = `card-note - copy strings.ts`
- **1b / 1c** = canvas `The 99 - The Card Note and the Verdict.dc.html`, section `#1b` (lines 107–162, register specimens) and `#1c` (lines 164–271: "quick add, HD · three rows, two of them silent", and "390 — top-off candidate row")

**The canvas draws NO 390 quick-add artboard.** The only 390 row drawn is the *top-off candidate row* (1c, right column). Every "Mobile" value below that comes from that artboard is marked **[top-off 390 artboard]**; it is the nearest drawn evidence, not a quick-add drawing. The host-matrix sentence for the quick-add row at 390 is SPL §C: "52px meta row, atom unchanged".

---

## Component: CardNote (the "About this card" slot) — row density (sentence)

### Container (the note block inside the row's box)
Cite: HO §Geometry "Note, desktop" / "Note, 390"; 1c quick-add HD row 2 (line 198); 1c top-off 390 (line 262); RM §3.

| Property | Mobile (390) | Desktop |
|---|---|---|
| Position | below the row's own line, inside the row's box (SPL §C "atom unchanged"; HO) | below the row's own line, inside the row's box (HO; SPL §C; 1c) |
| display | flex | flex |
| flex-direction | column | column |
| gap (label → body) | 5px [top-off 390 artboard] | 6px (1c quick-add) — **see CONFLICT C4** |
| border-top | 1px solid `var(--border)` | 1px solid `var(--border)` |
| margin-top | 8px [top-off 390 artboard] — **CONFLICT C1** (HO says 9px) | 9px (HO; 1c quick-add) |
| padding-top | 9px | 9px |
| padding-left | 27px (HO "Note, 390": "note indented to the name column (`padding-left:27px`)"; top-off 390 artboard) — **CONFLICT C2** | — (not indented; 1c quick-add note block carries no padding-left, so it starts at the box's inner edge, left of the name) |
| padding-right / padding-bottom | — | — |
| background | — (inherits row box) | — (inherits row box) |
| border-radius | — | — |
| Reserved height when no fact | — **none**: "No slot, no rule, no reserved height" (SCN n9; RM §3; 1c caption) | — **none** (same) |
| Persistence | does not persist after the add (HO Locked 6; RM §7) | same |
| Tone tokens forbidden | no `--warning`, no `--danger`, no confidence figure (HO Locked 5; CS "WITHDRAWN") | same |

### Label ("About this card")
Cite: HO §Geometry; SPL §A slot-label rule (carried forward); 1c lines 199, 263. Copy key: `cardNote.label`.

| Property | Mobile (390) | Desktop |
|---|---|---|
| font-family | mono — canvas literal `'IBM Plex Mono',monospace` (no CSS var named in source) | same |
| font-size | 9px | 9px |
| font-weight | — (unspecified; default) | — |
| letter-spacing | .14em | .14em |
| text-transform | uppercase | uppercase |
| line-height | — | — |
| color | `var(--fg-muted)` — **never `--fg-disabled`** (fails text floor; SPL §A measures 1.71:1 on `--surface`) | `var(--fg-muted)` |
| Renders | copy key `cardNote.label`, same on every fact and surface (CS) | same |

### Body (the sentence(s))
Cite: HO §Geometry; 1c lines 200, 264; SCN §A "Multiple facts".

| Property | Mobile (390) | Desktop |
|---|---|---|
| font-family | body (sans; no family set on the span) | same |
| font-size | 12.5px ("Identical type", HO) | 12.5px |
| font-weight (running text) | — (default) | — |
| line-height | 1.55 [top-off 390 artboard] — **CONFLICT C3** (HO: 1.6, "Identical type") | 1.6 (HO; 1c quick-add) |
| color | `var(--fg-body)` | `var(--fg-body)` |
| Emphasised spans | `<b>` color `var(--fg)`, font-weight 600 (1c) — **FLAG C8**: the copy module emits plain strings with no emphasis markup | same |
| Card names inside the body | dotted underline, open the card (SCN §D; SPL §D) | same |
| Sentences | one sentence per fact, in §A table order (n1/n2 → n3/n4 → n5/n6 → n7 → n8), **capped at two on a row** (SCN §A) | same |
| Glyph inside the note body | — on the quick-add artboard (1c draws none) — **CONFLICT C6** | — on the quick-add artboard — **CONFLICT C6** |

---

## Component: Quick add result row (host)

### Row box
Cite: 1c quick-add HD rows (lines 176–211); 1c top-off 390 (lines 242–266); SPL §C; HO §Geometry "Note, 390"; RM §3.

| Property | Mobile (390) | Desktop |
|---|---|---|
| Variant | "the shipped 52px meta variant" (HO; RM §3; SPL §C) | the shipped 34px line (1c caption: "keeps the shipped 34px line") |
| background | `var(--surface)` [top-off 390 artboard; the noted top-off row there is additionally drawn in a checked/hover state `var(--elevated-hover)` with `1px var(--accent-shadow)` border, which is a top-off tick state, not a note property] | `var(--surface)` |
| border | 1px solid `var(--border)` | 1px solid `var(--border)` |
| border-radius | 7px | 7px |
| padding | 9px (all sides) [top-off 390 artboard] | 9px 10px |
| Layout without a note | single flex row, align-items center | single flex row, align-items center, gap 10px, min-height 34px |
| Layout with a note | flex column, gap 0: [line] then [note] | flex column, gap 0: [line] then [note] |
| Line min-height | 52px | 34px |
| Line gap | 9px [top-off 390 artboard] | 10px |
| Line contents (order) | [top-off 390: tick 18px · ownership dot 7px · name/meta column] — quick add at 390 not drawn | ownership dot 7px · name group (flex:auto; min-width:0) · pips (gap 3px, 12px discs) · percentage (mono 10px `--fg-faint`, width 64px, right-aligned) · Add button (height 30px, padding 0 13px, 1px `--accent` border, radius 8px, 13px/600 `--accent`) |
| Name | 13px `var(--fg)`, with meta line below (mono 10px `var(--fg-faint)`, gap 2px) [top-off 390 artboard] | 13.5px `var(--fg)`; font-weight 500 on the noted row, unset on the silent rows — **FLAG C7** |
| No-fact row | draws no note, no rule, no reserved height (SCN n9) | same; keeps the shipped 34px line (1c) |

### Note indent relative to the name
| Property | Mobile (390) | Desktop |
|---|---|---|
| Indent | "indented to the name column" (HO; RM §3) = `padding-left:27px` (HO) — **CONFLICT C2** | none drawn (note flush with box inner edge) |

---

## Component: Fact marks (§C2) on a card row (quick add)
Cite: SPL §C2; HO §Geometry "Fact marks" and Locked 13; 1c line 186 (quick-add), line 257 (top-off 390).

### Mark glyph
| Property | Mobile (390) | Desktop |
|---|---|---|
| Glyph set | bolt (game changer), stripped peak (mass land denial), turn again (extra turns), lemniscate (two-card infinite), drawn up (tutor) | same |
| Size (svg width/height, viewBox) | 16×16, viewBox `0 0 16 16` ("Marks 16px", HO Locked 13; "Marks stay 16px inline after the name at both widths", 1c caption) | 16×16 |
| color | `var(--fact)` (via `currentColor`) | `var(--fact)` |
| filter | `drop-shadow(0 0 4px color-mix(in oklab, var(--fact) 45%, transparent))` | same |
| Container | bare — no chip, no background, no border (SPL §C2; HO) | bare |
| display / flex | block; flex:none | block; flex:none |
| Placement | inline after the name, "per Round 1's rule" (SPL §C2) | inline after the name |
| Gap name → mark | 6px [top-off 390 artboard] — **CONFLICT C5** | 7px (1c quick-add: name+mark wrapper `display:flex; align-items:center; gap:7px; flex:auto; min-width:0`) |
| Grouping | name and mark in one flex wrapper (1c) | same; wrapper takes `flex:auto` and `min-width:0`, the name inside does not grow |
| Multiple marks | a card wears every mark true of it (SPL §C2; SCN §A "Marks are unaffected" by the sentence cap) | same |
| Order of multiple marks | not stated for rows. Only evidence: §C2 list order (bolt, stripped peak, turn again, lemniscate, drawn up) and the tile artboard (bolt then lemniscate) | same |
| No fact | wears none (SPL §C2) | wears none |
| a11y | `aria-hidden` (SPL §C2) | `aria-hidden` |

---

## Accessibility / interaction (§D)
Cite: SCN §D; SPL §D; R3 item 7.

| Rule | Mobile | Desktop |
|---|---|---|
| Note interactive | no | no |
| Card names in the note | dotted underline; open the card | same |
| Accessible exposure | part of the row's accessible description; never announced on hover or focus; never a live-region announcement | same |
| Marks | `aria-hidden` (meaning carried by the note text) | same |
| Legend announcing that notes exist | — (accepted as absent; R3 item 7) | — |

---

## State Coverage — CardNote
Cite: SCN §A; CS `cardNote`. All nine apply at row density. Per-density cap: **row = 2 sentences (facts) max; tile = 1** (SCN §A) — see CONFLICT C9 for the tile.

| State | Triggering condition | Rendered | Key props required |
|---|---|---|---|
| n1 | Game Changer, deck has a declared bracket | label + sentence; copy key `cardNote.gameChanger.declared(n, declared, limit)` (branch on `limit === 0` inside the key) | isGameChanger; count ordinal of GCs in current list incl. this card; declared bracket; that bracket's GC limit |
| n2 | Game Changer, undeclared | `cardNote.gameChanger.plain(n)` — no deck clause | isGameChanger; ordinal |
| n3 | Mass land denial (oracle reading), declared | `cardNote.massLandDenial.declared(declared)`; optional `cardNote.massLandDenial.disclaimer` appended "where the row has room" — **FLAG C10** | isMassLandDenial; declared bracket |
| n4 | Mass land denial, undeclared | `cardNote.massLandDenial.plain` (+ disclaimer per C10) | isMassLandDenial |
| n5 | Extra turns, declared bracket with a chaining rule (2–3) | `cardNote.extraTurns.chaining(declared, n)` | isExtraTurn; ordinal; declared bracket |
| n5b (not in SCN table) | Extra turns, declared bracket whose rule forbids them (bracket 1) | `cardNote.extraTurns.forbidden(declared, n)` — **FLAG C11**: key exists in CS, no SCN row | isExtraTurn; ordinal; declared bracket |
| n6 | Extra turns, undeclared — **or declared 4 or 5** (SCN: "takes the n6 form") | `cardNote.extraTurns.plain(n)` | isExtraTurn; ordinal |
| n7 | Tutor, declared or not | `cardNote.tutor(n)` | isTutor; ordinal |
| n8 | Completes a two-card combo whose other half is already in the list, declared or not | `cardNote.completesCombo(a, b)` | combo pair names (A, B) |
| n9 | No fact | **nothing renders** — no slot, no rule, no reserved height (`cardNote.none = null`) | — |
| multi | Card carries ≥2 facts | one sentence per fact in table order, first two only on a row; marks show every fact | ordered fact list |
| declared-never-analysed | Declared, no verdict ever determined | same as the declared forms; note never needs a verdict | declared bracket only |
| fallback forbidden | Undeclared but a verdict exists | undeclared forms; **never** cites the last determined verdict (HO Locked 4) | — |
| stale | Verdict out of date | note unaffected, never tagged stale (HO Locked 12; SCN §C) | — |
| after add | card added to deck | note does not persist (HO Locked 6) | — |

Registers (SCN §A): n1/n2/n7/n8 flat; n3–n6 attributed ("we read this as"); rules clause flat in every row. Inputs: declaration + card facts + a count over the current list; never `buildDeckProfile`, never `bracketDelta` (HO Locked 2).

---

## Conflicts and flags (recorded, not resolved)

- **C1 — margin-top.** HO: `margin-top:9px` ("Identical type" at 390). 1c top-off 390 artboard: `margin-top:8px`. Quick-add desktop artboard: 9px.
- **C2 — 390 indent.** HO "Note, 390": `padding-left:27px`, "indented to the name column". SPL §C host matrix lists "indented to the name column" only for the *top-off* row; for the quick-add row it says "52px meta row, atom unchanged". The 27px is drawn only on the top-off row, where it equals the 18px tick + 9px gap before the ownership dot — the quick-add row has no tick, so 27px and "the name column" may not coincide on this host. The intent sentence ("to the name column") and the figure (27px) are both recorded.
- **C3 — body line-height.** HO: 1.6, and "Identical type" at 390. 1c top-off 390 artboard: 1.55.
- **C4 — label→body gap.** 6px (1c quick-add desktop), 5px (1c top-off 390), 7px (1b specimens). HO does not state a gap.
- **C5 — name→mark gap.** 7px (1c quick-add desktop) vs 6px (1c top-off 390).
- **C6 — glyph inside the note.** 1b register specimens draw the fact glyph *leading* the sentence inside the note (16px, `margin-top:2px`, gap 9px). 1c quick-add draws no glyph in the note (the mark sits after the name). SPL §C2 "Prose" row says marks go *after the name* in prose. Three placements, none reconciled.
- **C7 — name weight.** 1c quick-add: the noted row's name is `font-weight:500`, the silent rows' names carry no weight. Unexplained in any text file.
- **C8 — emphasis.** Canvas bolds clauses (`--fg`, 600) inside the body; CS strings carry no markup.
- **C9 — tile cap (out of scope, noted for consistency).** SCN §A: one sentence on a tile. HO §Geometry "Note, tile": "two sentences max"; RM §3 "two short sentences now fit".
- **C10 — MLD disclaimer.** CS: `massLandDenial.disclaimer` is "appended on the add surfaces where the row has room for it". 1b specimen includes it; 1c quick-add row (n3) omits it. No rule for "room" is given.
- **C11 — `extraTurns.forbidden`.** Present in CS, absent from SCN §A (which has only n5 chaining and n6 plain).
- **ER/R3 copy defects that ride with transcription:** import from `./deck-analysis` not `@/lib/copy/shared` (ER §2); `analyse` → `analyze` in the verdict keys (ER §1, not in the card-note keys used here). Canvas n3 artboard uses an em dash where CS uses a comma; CS is the copy source.
