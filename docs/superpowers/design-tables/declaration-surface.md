# Design property table: the declaration surface (§A, §B, §E)

Source: `design/design_handoff_the99_declaration/` (R7/R8). Canvas `The 99 - The Declaration.dc.html`
sections 1a, 1b, 2a, 3a, 3c, plus 1f's **declared** and **drift** cards as the only 390 drawings of
those two readings. (1f's first card, the ask+lean co-occurrence, and 1e are out of scope; 1f is
cited only for the elements this PR builds.) Authority where files disagree: **STATES-declaration.md and
`declaration - copy strings.ts` win** (READINESS-r4 audit). There is **no skip control**. Every skip
reference in the canvas, README or HANDOFF is ignored.

Out of scope: the lean (§C), the reasoning modal (§D), 1e/1f's ask+lean composition, the mark SVG
set (§3b). Marks are listed below by **size, opacity and ink token only**. Their paths are §3b's.

Font families: body copy has no `font-family` in the canvas, so it inherits the body font. "mono"
= `'IBM Plex Mono',monospace` inline in the canvas; the app equivalent is `var(--font-plex-mono)`.
The canvas never spells it as a var, so map it to whatever the existing verdict block uses.

Widths: **Desktop** = the 320/372px verdict card (1a/1b/2a/3a/3c). **390** = the 390px cards
(3a "390", 2a "390", 1f).

---

## 0 · The card shell the sub-line lives in (context: existing Round 2 verdict block)

Listed so the sub-line's spacing can be checked against it. This PR does not re-specify it.

| Element | Property | Desktop | 390 |
|---|---|---|---|
| Card | background | `var(--surface)` | `var(--surface)` |
| | border | 1px solid `var(--border)` | 1px solid `var(--border)` |
| | border-radius | 12px | 11px |
| | padding | 15px 16px (1a: 16px 18px) | 13px 15px |
| | display / flex-direction | flex / column | flex / column |
| "Your bracket" eyebrow | font / size / tracking / transform / color | mono / 10px / 0.14em / uppercase / `--fg-faint` | mono / 9.5px / 0.14em / uppercase / `--fg-faint` |

---

## A · The face (title + pill), as the declaration changes it

### A-face-1 · Title line

| Property | Desktop | 390 |
|---|---|---|
| font-size | 14px | 13.5px |
| font-weight | 600 | 600 |
| color | `var(--fg)` | `var(--fg)` |
| margin-top | 9px | 8px |
| Content, range + undeclared | `BRACKET_NAMES[lo]` + " or " + `BRACKET_NAMES[hi]` (existing verdict copy, e.g. *Optimized or cEDH*) | same |
| Content, declared inside permits | `BRACKET_NAMES[declared]` alone | same |
| Content, single bracket | `BRACKET_NAMES[n]` | same |

### A-face-2 · Pill wrapper

| Property | Desktop | 390 |
|---|---|---|
| margin-top | 10px | 9px |

### A-face-3 · Split pill (range, not declared on this state)

| Property | Desktop | 390 |
|---|---|---|
| display | inline-flex | inline-flex |
| align-items | center | center |
| gap | 8px | 8px |
| border | 1px solid `color-mix(in oklab, var(--bracket-{lo}) 55%, transparent)` | same |
| border-radius | 999px | 999px |
| padding | 2px 12px 2px 4px | 2px 12px 2px 4px |
| Mark 1 (lo) | 32px (1a live card: 34px), ink `--bracket-{lo}`, opacity 1, `display:block; flex:none` | 30px, same |
| Mark 2 (hi) | 32px (1a: 34px), ink `--bracket-{hi}`, **opacity 0.45** (1a, 3a, 2a card 4) **or 0.5** (1b, 2a card 3). See contradiction C8 | 30px, opacity 0.45 |
| "split" label | mono, 9.5px, letter-spacing 0.12em, uppercase, `--fg-faint` | same |
| Label copy | literal `split`. **No key in the copy file** (see C11) | same |

### A-face-4 · Single chip (declared bracket, or a single-bracket reading)

"Answering resolves the face": the split pill is **replaced** by this chip, and the title becomes that name.

| Property | Desktop | 390 |
|---|---|---|
| display / align-items / gap | inline-flex / center / 8px | same |
| border | 1px solid `color-mix(in oklab, var(--bracket-{n}) 55%, transparent)` | same |
| border-radius | 999px | 999px |
| padding | 2px 13px 2px 4px | 2px 13px 2px 4px |
| Mark | 32px (1a live: 34px), ink `--bracket-{n}`, opacity 1 | 30px |
| Name | mono, 11px, color `var(--bracket-{n})`, no transform | same |
| Name copy | `BRACKET_NAMES[n]` | same |

### A-face-5 · Description line (the range moves here once declared)

| Property | Desktop | 390 |
|---|---|---|
| font-size | 13px | 12.5px |
| color | `var(--fg-muted)` | `var(--fg-muted)` |
| line-height | 1.6 | 1.55 |
| margin-top | 11px (1a live card: 12px) | 10px |
| Copy, declared inside permits | `declarationCopy.declared.permitsBelow(permits)`, which names the pair and picks the top-range sentence (`[4,5]`) or the low one (`[1,2]`) itself | same |
| Copy, every other reading | the existing verdict description (not this PR's copy) | same |

---

## A · The sub-line section box (shared by every declaration reading)

A single section below the description (and below the lean where one draws). Drawn identically as the
container for the declared line, the ask, the A5 line and the version row.

| Property | Desktop | 390 |
|---|---|---|
| border-top | 1px solid `var(--border)` | 1px solid `var(--border)` |
| margin-top | 13px | 12px |
| padding-top | 12px | 11px |
| display / flex-direction | flex / column (the declared-line box has no flex, it holds one span) | same |
| gap | ask alone: 9px · A5 + ask: 10px · A5 alone: 10px · version row: 9px | ask alone: 9px (1f) · A5 + ask: 10px · version row: 9px |

---

## A2 · The answered reading: "Declared X." + inline `change`

Condition: `declared` set **and inside** `permits` (permits a range). Face → A-face-4, description → `permitsBelow`.

| Element | Property | Desktop | 390 |
|---|---|---|---|
| Sentence span | font-size | 13px | 12.5px |
| | color | `var(--fg-body)` | `var(--fg-body)` |
| | line-height | 1.6 | 1.6 |
| | copy | `declarationCopy.declared.line(declared, version)`. `version = null` on a draft ("Declared X."), the viewed version's number once committed ("Declared X for version n.") | same |
| Bracket name (bold run inside the sentence) | font-weight | 600 | 600 |
| | color | `var(--fg)` | `var(--fg)` |
| | note | the copy function returns one string, but the canvas bolds the name. Render the name as its own `<b>` (see C12) | |
| `change` control | position | inline, after the sentence's full stop and one space | same |
| | font | mono, 10.5px | mono, 10.5px |
| | color | `var(--accent)` | `var(--accent)` |
| | border-bottom | 1px dotted `var(--accent)` | same |
| | cursor | pointer (1a live card) | not drawn |
| | copy | `declarationCopy.declared.change` | same |
| | conditional | present **only while the version is current** (STATES §A). Edits this state's answer and returns the reading to the ask | same |
| | hover | — (none specified) | — |
| | focus | — (none specified) | — |
| | transition | — | — |

---

## A4 · The single-bracket reading: no declaration line

Condition: `permits.length === 1` (`[2]`, `[3]`, `[4]`) with no A5 and no version change.

| Element | Desktop | 390 |
|---|---|---|
| Face | A-face-4 with the reading's bracket | same |
| Declaration sub-line section | **— (explicitly absent)**: "a single bracket is not a question" | — |
| Reference drawing | 1c drawOnly card (`[3]`), 3c "this" card | 2a "390 · one mark, one step" (with version row) |

---

## A5 · The draft moved out of its declaration

Condition: **no** version comparison on screen, the state being viewed is the **draft**, `declared` set and **outside** the draft's `permits`.

| Element | Property | Desktop | 390 |
|---|---|---|---|
| Face | | this draft's own reading: split pill (A-face-3) if range, single chip (A-face-4) if single | same |
| Section box | gap | 10px | 10px |
| A5 row | display | flex | flex |
| | align-items | center | center |
| | gap | 9px | 9px |
| Superseded mark | size | **22px** | **22px** (not scaled up at 390) |
| | ink | `var(--bracket-{declared})` (the superseded declaration's bracket) | same |
| | opacity | 0.45 | 0.45 |
| | form | the chip form (§3b), `display:block; flex:none` | same |
| A5 text | font-size | 12.5px | 12px |
| | color | `var(--fg-faint)` | `var(--fg-faint)` |
| | line-height | 1.5 | 1.5 |
| | copy | `declarationCopy.draftMovedOut.line(declared)` | same |
| | control | **— (none)** | — |
| Followed by | range | the ask (§B) as a sibling in the same section box, **no divider** between the line and the ask. The ask wrapper is flex column, gap 9px | same |
| | single | **nothing**. The section ends after the line. Order in the card: face → description → lean → A5 section | same, identical order |

---

## B · The ask

Condition: `permits` is `[1,2]` or `[4,5]` and the viewed state has no declaration inside it (unanswered, A5, or a range version after a version change).

### B1 · Lead line

| Property | Desktop | 390 |
|---|---|---|
| font-size | 11.5px | 11.5px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| line-height | 1.5 | 1.5 |
| position | first child of the ask, above the chips | same |
| copy | `declarationCopy.ask.lead` | same |

### B2 · Chip row

| Property | Desktop | 390 |
|---|---|---|
| display | flex | flex |
| gap | 8px | 8px |
| align-items | center | — (not set) |
| flex-wrap | wrap | — (not set) |
| gap from lead | 9px (parent column gap) | 9px |

### B3 · Chip (one per bracket in `permits`, lo then hi)

| Property | Desktop | 390 |
|---|---|---|
| display | inline-flex | inline-flex |
| align-items | center | center |
| justify-content | — | center |
| flex | — (auto width) | `1` (half width each) |
| gap | 8px | 8px |
| height | **38px** | **44px** |
| padding | 0 13px 0 8px | — (none set; centered) |
| border-radius | 9px | 10px |
| border | 1px solid `color-mix(in oklab, var(--bracket-{n}) 45%, var(--border))` | same |
| background | `var(--surface-raised)` | `var(--surface-raised)` |
| cursor | pointer | not drawn (the 390 cards are static) |
| Mark | **22px**, chip form, ink `--bracket-{n}`, opacity 1, `display:block; flex:none` | **24px**, same |
| Name font-size | 13px | 13.5px |
| Name font-weight | 600 | 600 |
| Name color | `var(--fg)` | `var(--fg)` |
| Name copy | `BRACKET_NAMES[n]` (name alone, no numeral) | same |
| Selected state | **— (explicitly none)**: answering replaces the row with A2 | — |
| Third affordance / skip | **— (explicitly none)** | — |

#### B3-hover · Chip hover (desktop, 1a live card only)

| Property | Value |
|---|---|
| background | `var(--elevated)` |
| border | 1px solid `var(--bracket-{n})` (full-strength bracket ink replaces the 45% mix) |

No hover is specified at 390.

#### B3-focus · Chip focus

— (none specified anywhere in the package).

#### B3-transition

— (none specified).

#### B3-press behavior

Writes `declared = n` to the **draft** (`decks.declaredBracket`), and the reading becomes A2. No in-flight or failed reading is drawn (READINESS-r4: "every in-flight or failed reading for the write" is prose only).

---

## E · The version-comparison row

Condition: the viewed state is a **committed** version whose reading differs from the previous version's (and the previous one carried a declaration, in every drawing). Suppresses A5 (§3c). Order in the card: face → description → lean (single only, never `[2]`) → version section → ask (range only).

### E1 · Section box

| Property | Desktop | 390 |
|---|---|---|
| border-top | 1px solid `var(--border)` | same |
| margin-top | 13px | 12px |
| padding-top | 12px | 11px |
| display / flex-direction / gap | flex / column / 9px | flex / column / 9px |

### E2 · Mark row

| Property | Desktop | 390 |
|---|---|---|
| display | flex | flex |
| align-items | flex-end | flex-end |
| gap | 10px | 10px |
| order | previous → arrow → current. **Never flipped, rotated or recoloured** | same |

### E3 · Mark column (one each side)

| Property | Desktop | 390 |
|---|---|---|
| display | inline-flex | inline-flex |
| flex-direction | column | column |
| align-items | center | center |
| gap (mark to label) | 3px | 3px |

### E4 · Previous-version mark

| Property | Desktop | 390 |
|---|---|---|
| size | 24px | 24px |
| count | always **one** mark | same |
| bracket drawn | the previous version's **declared** bracket (every drawing: declared cEDH → 5, declared Core → 2) | same |
| ink / opacity | `--bracket-{prevDeclared}` / 1 | same |
| form | chip form (§3b), `display:block; flex:none` | same |

### E5 · Current-version mark(s)

| Property | Desktop | 390 |
|---|---|---|
| single reading | one 24px mark, `--bracket-{n}`, opacity 1 | same |
| range reading | an inner wrapper: display flex, align-items center, **gap 2px**, holding two 24px marks: lo at opacity 1, hi at **opacity 0.5** | same |
| split pill / "split" label | **— (none in the row)**. The pill appears on the face only | — |

### E6 · Mark labels

| Property | Desktop | 390 |
|---|---|---|
| font | mono | mono |
| font-size | 8px | 8px |
| letter-spacing | 0.1em | 0.1em |
| text-transform | uppercase | uppercase |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| copy, previous | `declarationCopy.versionChange.markLabelPrevious(prevVersion)` | same |
| copy, current | `declarationCopy.versionChange.markLabelCurrent` | same |

### E7 · Arrow

| Property | Desktop | 390 |
|---|---|---|
| glyph | `→` (U+2192, `&rarr;`) | same |
| font | mono, 13px | mono, 13px |
| color | `var(--fg-faint)` | `var(--fg-faint)` |
| padding-bottom | 13px (seats it level with the marks above the labels) | 13px |
| copy key | — (literal glyph; decorative) | — |

### E8 · Sentence

| Property | Desktop | 390 |
|---|---|---|
| font-size | 12.5px | 12.5px |
| color | `var(--fg-body)` | `var(--fg-body)` |
| line-height | 1.55 | 1.55 |
| bold run | the current reading's phrase: weight 600, `var(--fg)` | same |
| copy | `declarationCopy.versionChange.line({ phrase, isRange }, { version, phrase, declared })`. `isRange` picks *permits* vs *reads as* | same |
| control | **— (none, of any kind)** | — |
| alarm treatment | **— (no `--danger`, no warning glyph, no badge, no toast)** | — |

### E9 · The ask after a range version

| Property | Desktop (2a card 3) | 390 |
|---|---|---|
| placement | nested **inside** the version section, after the sentence | not drawn at 390 (see C2) |
| border-top | 1px solid `var(--border)` | — |
| padding-top | 11px | — |
| margin-top | 2px (plus the parent's 9px gap) | — |
| display / flex-direction / gap | flex / column / 9px | — |
| contents | B1 lead + B2/B3 chips, desktop spec | at 390, B's 390 spec by rule |

### E10 · Date

The HANDOFF and §3c say the row "carries a date". **2a's row draws no date.** Only §3c draws one, as a mono 9.5px, 0.1em, uppercase, `--fg-disabled`, `flex:none` label reading `v1 · 4 Sep` in an `align-items: baseline; gap: 9px` row, and it **replaces** the marks and arrow there. There is no copy key and no stated format. The source is `deck_versions.committed_at` (READINESS-r4). See C3.

---

## State coverage

| # | State | Trigger (permits · declared on viewed state · version facts) | Renders |
|---|---|---|---|
| S1 | Ask, range unanswered | permits `[1,2]` or `[4,5]` · declared null · no version change | Face: range title + split pill · existing description · section: B1 lead + two B3 chips |
| S2 | Answered, draft | permits range · declared ∈ permits · viewing the draft | Face: `BRACKET_NAMES[declared]` + single chip · description = `permitsBelow` · section: `declared.line(d, null)` + `change` |
| S3 | Answered, committed | permits range · version's declared ∈ permits · viewing committed version n (current) | as S2 with `declared.line(d, n)` ("…for version n.") · `change` only while that version is current |
| S4 | Single bracket | permits `[2]`/`[3]`/`[4]` · no A5 · no version change | Face: single chip · description (+ lean on `[3]`/`[4]` when it fires) · **no declaration section** |
| S5 | A5, range | draft · declared ∉ permits · permits range · no version change | Face: split pill · description · section (gap 10): 22px faint mark + `draftMovedOut.line(d)`, then B1 + chips |
| S6 | A5, single | draft · declared ∉ permits · permits single · no version change | Face: single chip · description · lean · section: A5 row alone, **no chips** |
| S7 | Version change, single | committed · reading ≠ previous version's · this version single | Face: single chip · description · lean (not on `[2]`) · E section: marks row + sentence, **no ask** |
| S8 | Version change, range | committed · reading ≠ previous · this version range · this version undeclared | Face: split pill · description · E section: row (current side = two marks, gap 2px, hi at 0.5) + `permits` sentence, then the nested ask (E9) |
| S9 | Version change + draft out of range | both S5/S6 and S7/S8 true | **E wins; A5 suppressed entirely.** Then the ask iff the current reading is a range (§3c) |
| S10 | Version change, range, **declared** on this version | committed · reading ≠ previous · range · declared ∈ permits | **Not drawn.** Precedence gives E's row, and the ask condition is false. Whether A2's line also draws is unspecified. See C13 |
| — | Skip / skipped | — | **Does not exist** |

---

## Contradictions and gaps

- **C1 · The declared description line.** 1b's declared card reads "…four and five have no card limits between them, so which one this is, is how you play it." The copy file's `permitsBelow` and the 1a, 3a and 1f cards read "…the two have no card limits between them." **Follow the copy file.**
- **C2 · The ask after a range version row.** STATES §E says it follows. 2a card 3 draws it, but 1b's "a later version reads differently" card and 1f's "drift, at 390" card both draw a range version row with **no ask**. 1f's card also has **no pill** on the face, and its caption ("in the player's own words") is stale R4 language. **Follow STATES.** The 390 nested-ask geometry is undrawn, so apply B's 390 spec inside E9's wrapper.
- **C3 · Version row date and order.** §3c draws the row as `v1 · 4 Sep` + a sentence with **no marks and no arrow**, and puts the sentence in the reverse order ("Version 1 read… This version reads…"). 2a, 1b and 1f draw marks + arrow + the copy-file order and **no date**. HANDOFF and §3c say the row "carries a date". The copy file has no date key or format, and the audit names `deck_versions.committed_at` as the source with "format undrawn". **The sentence order follows the copy file.** Whether a date draws at all is unresolved.
- **C4 · Mark labels.** 2a's caption says the labels read "*your cards now permit* / *your cards now read*". Every drawing and the copy file use `version 1` / `this version`. **Follow the copy file.**
- **C5 · Canvas sentences that the copy function cannot produce.** "Version 1 read as Core and was declared Core", "…read as Optimized and was declared Optimized" and "…read as Exhibition and was declared Exhibition" each give v1 a single reading **and** a declaration. A declaration needs a range, so `previous.phrase` would be "Exhibition or Core" / "Optimized or cEDH". Treat these as illustration errors. The function is authoritative.
- **C6 · The previous-version mark when `previous.declared` is null.** The copy supports an undeclared previous version ("Version n read as X."), but every drawing shows one mark equal to the previous *declared* bracket. It is undefined which mark or marks draw for an undeclared previous version (its reading, possibly a range?). **Not found.**
- **C7 · Face mark size.** 34px in the 1a live card, 32px in 1b/2a/3a/3c, 30px at 390. README §1 says "the verdict's mark is 36px". The face is Round 2's existing surface, so keep whatever ships there. The canvas itself is inconsistent.
- **C8 · Split pill second-mark opacity.** 0.45 (1a, 3a, 2a card 4, 1f) vs 0.5 (1b, 2a card 3). The version row's split is consistently 0.5.
- **C9 · Description margin-top.** 12px in the 1a live card vs 11px in every other desktop card.
- **C10 · Skip.** The 1a annotation ("The skip sits on the same line at text weight"), the HANDOFF ask row ("a text-weight `skip this`") and build guardrail #2 ("Do not re-ask after a skip"), and README lines 18, 143 and 158 all still describe a skip. Per STATES and the audit, **there is no skip**. Ignored.
- **C11 · `split` label copy.** Drawn on every split pill, but no key exists in `declaration - copy strings.ts`. It may already exist in Round 2's verdict copy. Not found in this package.
- **C12 · Bold name inside `declared.line` / `versionChange.line`.** The canvas bolds the bracket name (A2) and the current phrase (E8), but both copy entries are plain-string functions. Rendering the bold run means splitting the string or adding a rich variant. Not specified.
- **C13 · A range version that is both changed and declared (S10).** Not drawn. The §3c precedence test covers E vs A5 only, not E vs A2.
- **C14 · Hover, focus, transitions.** The only hover anywhere is the desktop chip's (B3-hover). There is no hover for `change`, no focus ring for either control, no transitions, and no in-flight/failed state for the write.
- **C15 · 3a's single-bracket draft card** (out of scope content, relevant to S6 order) carries a lean sentence the lean cannot produce and a `why` control where the copy says `see the reasoning` (audit's new Design item). The **composition** (A5 row after the lean, no chips) holds either way.
