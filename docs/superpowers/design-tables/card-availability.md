# Card availability (#43) — pre-implementation property table

Source of truth: the design handoff in `design/design_handoff_the99_availability/` — the R3 `README.md`, `ADDENDUM-README.md` (R2 rulings), `ADDENDUM-2-README.md` (R3 collection + roll-up + self-exclusion), the three `.dc.html` canvases, `availability · copy strings.ts`, and the three READINESS documents.

Citation scheme — `RM:<line>` = `README.md`; `ARM:<line>` = `ADDENDUM-README.md`; `A2RM:<line>` = `ADDENDUM-2-README.md`; `RD2:<line>` = `ADDENDUM-2-READINESS.md`; `CV:<line>` = `The 99 - Card Availability.dc.html`; `ACV:<line>` = `The 99 - Card Availability Addendum.dc.html`; `A2CV:<line>` = `The 99 - Card Availability Addendum 2.dc.html`; `CP:<line>` = `availability · copy strings.ts`. Every non-obvious row carries a line citation.

**Precedence ruling for this table: where a canvas and a README disagree, the README wins.** This is the inverse of the add-panel epic, where the drawing was the arbiter. Here the READMEs and the READINESS documents were written *after* each canvas and carry corrections the canvases were never redrawn to absorb. Where a READINESS document resolves an item, it outranks both (RD2:47–117). Every disagreement is recorded in §16 with its resolution; do not resolve one by looking at the picture.

**Post-implementation note, 2026-09-01.** Two copy strings were changed after the build, and the rows below record the superseded forms: `0 free` now reads `none free` (rows 1.9, 1.10, 1.11) and the over clause is unified on `also in`, replacing `${deckCount} decks want it` (rows 1.15, 1.20, 6.4). The reasoning is in `ADDENDUM-2-READINESS.md` item 8. This table is a frozen pre-implementation artefact and is deliberately **not** rewritten — a future gate run reading these rows should treat the copy file as authoritative on wording and this table as authoritative on everything else.

This table was derived from the design artefacts only. **No application source was read** with a single exception: `src/app/globals.css`, read solely to build the token-name → hex map below. (True of the table's ORIGINAL derivation. The erratum dated 2026-09-16 below is the one part written from implementation evidence, and says so — it exists precisely because a value here had stopped matching what ships.) No component, route, action, query or test file was opened, so nothing here is a description of what the code currently does — it is a description of what the built UI must look like.

**All card names, deck names, quantities, counts, scores, percentages and set codes in the canvases are fabricated mock data** (RM:250–252, A2CV:685–705). `Kykar`, `Lathril`, `Muldrotha`, `Teferi's Protection`, `Smothering Tithe`, `1,418`, `1,186 / 168 / 61 / 3`, `↓21`, `34 of your cards fit` — none of these are fixtures, expected values, or assertions. Reproduce the *shape* of the string, never the value.

## Token map

Read from `src/app/globals.css`. **Bold = the value an implementer will need.**

| Token | Hex | globals.css line |
|---|---|---|
| `--bg` | **#14110E** | 9 |
| `--surface` | **#1E1A15** | 10 |
| `--surface-raised` | #221D16 | 11 |
| `--surface-rail` | #1A160F | 12 |
| `--surface-sunken` | #181410 | 13 |
| `--surface-inset` | #1C1712 | 14 |
| `--elevated` | **#2A241D** | 15 |
| `--elevated-hover` | **#211C15** | 16 |
| `--border` | #2A241D | 19 |
| `--border-strong` | **#3A3229** | 20 |
| `--border-dashed` | **#4A4033** | 21 |
| `--fg` | #EDE6D8 | 24 |
| `--fg-body` | **#C6B79A** | 25 |
| `--fg-muted` | **#A89B84** | 26 |
| `--fg-faint` | #8E8269 | 27 |
| `--fg-locked` | #6A6152 | 28 |
| `--brass` | **#C9A24B** | 31 |
| `--brass-hover` | #D8B25E | 32 |
| `--brass-strong` | #A9863E | 33 |
| `--brass-shadow` | #6E5B33 | 34 |
| `--brass-dim` | #6E5B33 | 36 |
| `--brass-mid` | #A9863E | 37 |
| `--kaiju-body` | **#0B0907** | 41 |
| `--success` | #6FA368 | 46 |
| `--warning` | #E0913C | 47 |
| `--danger` | **#C6533F** | 48 |

Four derived availability tokens (RM:226–231, A2RM:176–178 — Addendum 2 adds **no** new tokens):

| Token | Value | Derivation | Source |
|---|---|---|---|
| `--avail-soft` | #A89B84 | alias of `--fg-muted` | RM:226–228 |
| `--avail-hard` | #C9A24B | alias of `--brass` | RM:226–228 |
| `--avail-hard-fg` | **#E8CE93** | new literal — lifted brass for 8.5px mono over a scrim on card art. Kept for a **size** reason, not a hue one (ARM:38–47) | RM:226–231, ARM:38–47 |
| `--avail-over-fg` | **#E9917A** | shipped `--danger` lifted for text; `--danger` itself is never text | RM:226–231, RM:238–239 |

**Undeclared literals.** Grepping `globals.css` proves none of these exist as tokens today; the canvases use them raw. Declare them or inline them, but do not assume they resolve:
`#E8CE93` · `#E9917A` · **`var(--avail-over-border)`** (over-committed container border tint — see the erratum below; the literal this replaced was `#6B3226`, which is not that token's value in any theme) · `#5A4A28` (Building status-pill border) · `#33502F` (Complete status-pill border).

---

### Erratum 2026-09-16 — the over tint is a token, not a literal

Rows 4.5 and 4.10 specified `#6B3226` for the over-committed container border.
**That value ships nowhere in `src/`,** and it is not any token's value: the
decklist row draws `inset 0 0 0 1px var(--avail-over-border)`
(`decklist-row.tsx:269`), which resolves to `#752619`.

The literal is pre-theme. It was measured against one palette before the
six-theme system replaced fixed darks with tokens, so it is now wrong in all six
rather than right in one.

**Scope, because the first draft of this erratum got it wrong.** Both rows sit
under §4, the DECKLIST row, so both take `var(--avail-over-border)`. The commander
surfaces added in #671/#683 draw their own over border as
`color-mix(in srgb, var(--danger) 40%, var(--bg))` — a different expression on a
different surface — and writing that into these rows, as this erratum first did,
would have told a future decklist implementation to diverge from the token it
already uses.

**Why an erratum rather than a check.** `pnpm check:copy-drift` compares quoted
COPY against shipped strings. A colour value is neither, so it reports clean over
both rows and always would. The readiness audit for commander availability caught
it by reading, and Design's R1 handoff had already cited the stale value in good
faith — which is what a spec someone implements from will do.

No design round: the code made this call when the themes landed, and this is the
table catching up.

## 1 · The four availability states

The four states apply **only when `owned > 0`** (RM:221–225, A2RM:191–193). A card you do not own has no availability; it has an acquisition question, which is a different feature. Teferi's Protection at 0 owned would compute `−1` and must not render a marker at all (RM:221–225).

Severity comes from `statusPill()` (`src/lib/decks/status.ts:15-24`, cited RM:217–220 — cited, not read). **Hard** claims come from decks at 99 cards (`Playable` | `Complete`); **soft** claims from decks under 99 (`Draft` | `Building`). One status vocabulary; `decks.status` stays dead (RM:217–220).

| # | State | Arithmetic | Renders | Source |
|---|---|---|---|---|
| 1.1 | **free** | `owned − hard > 0` and no soft claim | **Nothing.** No glyph, no text, no copy string, no container change, no accessible-name addition | RM:60–84, RM:79–84 |
| 1.2 | **soft** (wanted by a draft) | at least one claim from a deck under 99, supply not exhausted | hollow diamond + count + word | RM:85–96 |
| 1.3 | **hard** (in use) | `owned − hard === 0` | solid brass diamond + `0 free` + optional deck clause | RM:85–96, CP:38–43 |
| 1.4 | **over-committed** | `owned − hard < 0` | doubled `#C6533F` diamonds + `short N` + optional clause; **only** state that tints its container's border | RM:98–118 |

**The `free` state is silent — this is a locked rule, not a default.** Three of the five decklist rows in the canvas carry no marker at all (CV:717–795). An implementer who renders a green tick, a "free" word, an empty span, or a zero-width placeholder for state 1.1 has built the wrong feature.

### 1.1 The two `free` formulae — both are required

**Never recompute `free` from `owned` and `hard` — read it from the map, which knows where you're standing** (R5 §6). The canvas callout's `free = owned − hard` is the **off-decklist** case, not a general rule inherited by every surface; 1.6 is the other half and neither is the default. A formula in a handoff gets copied, so this warning leads rather than follows.

| # | Context | Formula | Source |
|---|---|---|---|
| 1.5 | Default / **off** the deck's own decklist — `/collection`, `/commanders`, commander detail, card detail | `free = owned − hard` | CV:48 callout, qualified RD2:105–110 |
| 1.6 | **On** a deck's own decklist, and in the add panel opened from that deck | `free = (owned − ownClaim) − (hard − ownHardClaim)` | A2RM:141–172, RD2:47–76 |

Self-exclusion (A2RM:141–172, RD2:47–76): on a deck's own decklist the marker scores against **every deck except that one**, excluding the current deck's copies from **supply as well as claims**. Consequence to enumerate as a rule: **the `hard` state is unreachable inside a committed deck.** A genuine conflict there presents as over-committed. It was drawn as `marker.overAlsoIn` — `short 1 — also in Kykar` (CP:49–51) — and on the decklist row itself is now count-only, `marker.over` (see the 4.6 / 4.10 amendment, #354); the surfaces that keep the named form are listed there. RD2:94–103 extends self-exclusion to the **add panel** via a `deckId` parameter on `searchCards`; the canvases never draw this, and it is required anyway.

### 1.2 Copy — exact strings, quoted not paraphrased

| # | Key | String (verbatim) | Source |
|---|---|---|---|
| 1.7 | `marker.soft` | `1 in a draft` / `${softQty} in a draft` | CP:29–31 |
| 1.8 | `marker.softAria` | `1 copy is on a draft` / `${softQty} copies are on drafts` | CP:32–35 |
| 1.9 | `marker.hard` | `0 free` | CP:38 |
| 1.10 | `marker.hardIn` | `0 free — in ${deckName}` | CP:39 |
| 1.11 | `marker.hardMulti` | `0 free — across ${deckCount} decks` | CP:40 |
| 1.12 | `marker.hardAria` | `no free copies; this one is in your ${deckName} deck` | CP:41 |
| 1.13 | `marker.hardMultiAria` | `no free copies; they are on ${deckCount} of your committed decks` | CP:42–43 |
| 1.14 | `marker.over` | `short` at one copy, `short ${shortBy}` above one (**amended 2026-09-26**, Hugh: the figure is drawn only when it is over one; the same rule governs 1.15 and 1.17, and every aria string still speaks the count) | CP:46 |
| 1.15 | `marker.overWithDemand` | `short ${shortBy} — ${deckCount} decks want it` (shipped as `short, also in N decks` at one copy and `short N, also in N decks` above one; **amended 2026-09-26**, see 1.14) | CP:47 |
| 1.16 | `marker.overAria` | `${deckCount} of your committed decks include this card and you own ${shortBy} too few` | CP:48 |
| 1.17 | `marker.overAlsoIn` | `short ${shortBy} — also in ${otherDeck}` (shipped as `short, also in ${otherDeck}` at one copy; **amended 2026-09-26**, see 1.14) | CP:49 |
| 1.18 | `marker.overAlsoInAria` | `your ${otherDeck} deck also includes this card and you don’t own enough for both` | CP:50–51 |
| 1.19 | `marker.tileInUse` | `in use — ${deckName}` | CP:54 |
| 1.20 | `marker.tileOver` | `${deckCount} decks want it` | CP:55 |
| 1.21 | `quantity.joiner` | ` · ` (space, middot, space) | CP:144–146 |

Vocabulary rule (CP:7–11, RM:192–198): "free" and "in use" are load-bearing and must not be swapped for synonyms. **"deck tax" is banned.** Copy must never assert a physical location — the app does not know where the cardboard is.

**Row count: 4 states + 2 formulae + 15 strings = 21 rows.**

---

## 2 · The marker — tile chip density

Absolutely positioned over card art. **Top-left** — top-right is occupied by the shipped brass quantity badge (A2RM:51–60, RM:60–84). No grid change on any surface (A2RM:180–187).

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 2.1 | Chip container | — | scrim `rgba(11,9,7,α)`; 1px solid border | `position:absolute; left:5–6px; top:5–6px; padding:2px 5px; gap:4px; border-radius:4px` | hugs content | α and border vary by state (2.5–2.7) | CV:62–135, A2CV:282–320 |
| 2.2 | Glyph | — | per state (2.5–2.7) | — | `6px × 6px` `<span>`, `transform:rotate(45deg)` | soft hollow / hard solid / over doubled | CV:62–135, RM:85–96 |
| 2.3 | Label | `--font-mono`, `8.5px`, weight `600`, `letter-spacing:0.02em` | per state | — | — | text per §1.2 | CV:62–135 |
| 2.4 | Layout | — | — | `display:flex; align-items:center` | — | never wraps; never a tap target | RM:79–84 |
| 2.5 | — soft | as 2.3 | glyph border `1.5px solid #A89B84`, fill transparent; label `#C6B79A` | scrim `rgba(11,9,7,0.86)`; border `#4A4033` | — | — | CV:62–135 |
| 2.6 | — hard | as 2.3 | glyph fill `#C9A24B`; label `#E8CE93` | scrim `rgba(11,9,7,0.90)`; border `#C9A24B` | — | — | CV:62–135 |
| 2.7 | — over | as 2.3 | two `#C6533F` diamonds, **1px seam in the container's own background colour**; label `#E9917A` | scrim `rgba(11,9,7,0.92)`; border `#C6533F` | — | — | CV:98–135, RM:98–118 |

**The seam is not a fixed colour.** RM:243–245 warns it must be repointed to whatever sits behind the marker. Observed values across the canvases: `#0B0907` (chip scrim), `#100D0A` (page bg / desktop decklist row), `#14110E` (phone decklist meta), `#1E1A15` (deck summary strip, collection rows, phone collection chip), `#211C15` (roll-up red line), `#2A241D` (filter menu row, desktop filter chip). Build it as a prop, not a constant.


**Row count: 7 elements.**

---

## 3 · The marker — row inline density

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 3.1 | Placement | — | — | **Off the decklist:** appended to the shipped `×${qty} owned` string, joined with ` · `. **On the decklist row:** drawn inline in the name cell, between the card name and the buy tag — no `×N owned` host and no shared meta line, because that row has neither. The marker is `flex: none` and the **name** is what truncates; the marker always precedes the buy tag | **takes no column and no row height** — no new grid column, and the 34px / 44px row heights are unchanged | Ratified by Design 2026-09-07 (#242 batch): the decklist placement above is the shipped behaviour and is now the spec. The hard constraints stand unedited | RM:60–84, A2RM:33–49, #182 |
| 3.2 | Joiner | inherits meta line | `#3A3229` (`--border-strong`) | — | — | — | RM:60–84, CP:144–146 |
| 3.3 | Glyph | — | per state | — | `6px`, rotated 45° | — | CV:62–135 |
| 3.4 | Label | inherits the meta line's mono size | soft `#C6B79A` / hard `#E8CE93` / over `#E9917A` | — | — | — | CV:717–795 |
| 3.5 | Row treatment | — | **none** | — | — | The marker is never a background, tint, stripe or opacity change on the row | RM:79–84 |
| 3.6 | Interaction | — | — | — | — | **Never a tap target.** No hover, no focus ring, no title-on-marker | RM:79–84 |
| 3.7 | Motion | — | — | — | — | **Zero net motion.** No transition on appear, on add, on filter, on re-rank | RM:240–242, CV:849–858 |

**Row count: 7 elements.**

---

## 4 · Decklist row (deck detail)

Self-exclusion applies here (§1.1). Three of five rows in the canvas carry no marker (CV:717–795).

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 4.1 | Card name | shipped | shipped | shipped | shipped — **unchanged** | — | RM:60–84 |
| 4.2 | Meta line — phone | shipped mono | shipped | marker appended after `×${qty} owned` | no height change | seam over `#14110E` | CV:717–795 |
| 4.3 | Meta line — desktop | shipped mono | shipped | same append | no height change | seam over `#100D0A` | CV:797–830 |
| 4.4 | free row | — | — | — | — | renders exactly the shipped row, byte-identical | RM:79–84 |
| 4.5 | over row | — | container border tints `var(--avail-over-border)` | — | — | only state that touches the container | RM:98–118, **erratum 2026-09-16** |
| 4.6 | over copy in own deck | — | `#E9917A` | — | — | **count-only** — `marker.over`, a bare `short` (`short N` above one copy since 2026-09-26), in BOTH the All and Shopping views. Superseded by 4.10 (#354) | CP:46, A2RM:141–172, superseded #354 |

### 4.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 4.7 | **Silent (free)** | `(owned − ownClaim) − (hard − ownHardClaim) > 0`, no soft | nothing rendered | RM:79–84 |
| 4.8 | Soft | a sub-99 deck other than this one claims a copy | hollow glyph + `N in a draft` | RM:85–96 |
| 4.9 | Hard | **unreachable inside a committed deck** — self-exclusion removes this deck's own claim | — | A2RM:141–172, RD2:47–76 |
| 4.10 | Over-committed | supply short after exclusion | doubled red glyph + `short N`, container border `var(--avail-over-border)`. Spoken as `marker.overAriaCountOnly` | RM:98–118, CP:46, **amended #354**, **erratum 2026-09-16** |
| 4.11 | Not owned | `owned === 0` | nothing — the guard precedes the states | RM:221–225 |

**Row count: 6 elements + 5 states.**

**4.6 / 4.10 amendment (#354) — not yet ratified by Design.** The decklist row was drawn naming the
other claimant, `short 1 — also in Kykar`. It now names nobody, in both the All and Shopping views.
Two reasons. The prefix is fixed-width and never truncates, but the name after it does: the row also
carries the EDHREC figure, the buy tag and a 44px ✕, so at 390px and inside the desktop 2-up grid
`also in HD Tune - Prism…` teaches nothing. And the name is not withheld, it moved — the card
modal's allocation receipt (14.7, #353) names every claiming deck and links each one, which is a
better answer than one truncated name. `marker.overAlsoIn` / `overAlsoInAria` (1.17 / 1.18) are NOT
dead: three surfaces still pass `selfExcluded` without `nameless` — the add-panel search row, the
resolution expander and the quick-add bar. The suggestion tile is not one of them, despite passing
`selfExcluded`: `density="chip"` forces `nameless` on every chip, which is row 14.1's rule and not
this amendment's.

---

## 5 · Add-panel search row

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 5.1 | Row inline marker | as §3 | as §3 | appended to the owned meta | no height change | four states | CV:797–830 |
| 5.2 | Self-exclusion | — | — | — | — | **Applies.** `searchCards` takes a `deckId`; the panel scores as the decklist does | RD2:94–103 |
| 5.3 | On add | — | — | — | — | **No animation.** The marker may change value; it must not move, fade or pulse | RM:240–242 |
| 5.4 | Quick add (desktop) | shipped | shipped | same append | unchanged | same four states | CV:797–830 |

### 5.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 5.5 | **Silent (free)** | free after exclusion | shipped row unchanged | RM:79–84 |
| 5.6 | Soft / Hard / Over | as §1 | inline marker | CV:797–830 |
| 5.7 | Degraded | availability read down | **fails quiet** — no marker, no banner | RM:291–338, A2RM:188–190 |

**Row count: 4 elements + 3 states.**

**This surface is not drawn.** RD2:94–103 is the only source. Flagged in §17.

---

## 6 · Consider tile

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 6.1 | Chip | §2 | §2 | `left:5–6px; top:5–6px` | hugs | four states | CV:433–536 |
| 6.2 | Quantity badge | shipped | shipped brass | **top-right, untouched** | unchanged | — | A2RM:51–60 |
| 6.3 | Tile copy — hard | mono 8.5/600 | `#E8CE93` | — | — | `marker.tileInUse` → `in use — ${deckName}` | CP:54 |
| 6.4 | Tile copy — over | mono 8.5/600 | `#E9917A` | — | — | `marker.tileOver` → `${deckCount} decks want it` | CP:55 |
| 6.5 | Grid | — | — | — | **no grid change** | — | A2RM:180–187 |

**Row count: 5 elements.**

---

## 7 · `/commanders` — the `Build from` control

> **Errata, 2026-09-14 (ratified divergence).** This section described a control
> named `Score against` with segments `Everything I own` / `What’s free`, drawn
> from `availabilityCopy.ranking`. Two things have happened since it was written.
> The two-lane redesign moved the control's copy to
> `commandersCopy.availability` in `lanes.ts`, so the segment names below were
> already describing keys that reached no screen. And free mode now decides which
> commanders the lane LISTS as well as which cards it scores against, so the
> label was renamed to `Build from`: a commander whose own card is sleeved into a
> committed deck is no longer shown under `Free cards only`. Rows 7.1 to 7.3, 7.5,
> 7.6 and 7.14 carry the shipped segment NAMES. Row 7.14's treatment is a
> separate matter and is marked below: the disabled-and-struck segment it calls
> for has never shipped. The five dead
> `availabilityCopy.ranking` keys that named this control were deleted with the
> rename.

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 7.1 | Group label | shipped | shipped | — | — | `commandersCopy.availability.legend` = `Build from` | CP:66–85, RM:119–141 |
| 7.2 | Segment 1 | shipped segmented control | shipped | — | — | `All my cards` — **default** | CP:66–85, RM:119–141 |
| 7.3 | Segment 2 | shipped | shipped | — | — | `Free cards only`; `Free only` on the 32px rack segment | CP:71 |
| 7.4 | URL state | — | — | — | — | `?avail=free`; absent = default | RM:119–141 |
| 7.5 | Subtitle | — | — | — | — | **retired.** The two-lane split moved every count to the rack's result line; `ranking.subtitleAll` / `subtitleFree` reach no screen | CP:66–85 |
| 7.6 | Note | shipped | shipped | — | — | `ranking.freeNote`, **commander detail only**. The lane's own gloss is `commandersCopy.availability.hint`, in the filter sheet | CP:66–85 |
| 7.7 | Live region | — | — | — | — | `ranking.announce(mode, n)` — see §16 (d) | CP:81–84 |
| 7.8 | Rank numerals | shipped | shipped | — | — | recompute from a **second global rank map**, built before any colour filter, so "filtering never renumbers" survives | ARM:49–62 |
| 7.9 | Window | — | — | — | — | flipping the toggle **resets the window to `REVEAL_STEP`** | ARM:64–70 |
| 7.10 | Desktop grid | — | — | `40 / 100 / 1fr / 236` | unchanged | — | RM:204–212 |
| 7.11 | Motion | — | — | — | — | none | RM:240–242 |
| 7.15 | Hidden-row aside | shipped result line | shipped | — | — | `availability.sleevedAside(n)`, appended to the result sentence in free mode only, and only where it hid something | — |

### 7.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 7.12 | All my cards | no `?avail` | shipped ranking, no receipt clause change | RM:119–141 |
| 7.13 | Free cards only | `?avail=free` | re-ranked against the free pool **and narrowed to it**; deltas visible where the score moved; the aside at 7.15 counts what was hidden | RM:119–141 |
| 7.14 | Degraded | availability read down | **Drawn: the banner alone** (§10), plus a refused flip — `CommandersView` rejects the change and the segment keeps its ordinary treatment. The `disabled and struck through` segment this row called for has never shipped: `AvailabilityControl` has no such state, and `commanders-view.test.tsx` pins its absence. Noted 2026-09-14; the divergence predates this change | RM:291–338 |
| 7.16 | Nothing free | `?avail=free`, no pip lit, no query, every commander sleeved | `emptyFree` zero state: heading, one sentence, and an `All my cards` button. Never drawn with another control lit — the colour state's arithmetic is the more useful answer there | — |

**Row count: 12 elements + 4 states.**

---

## 8 · `/commanders` — receipt line

The receipt line **always renders**; the second clause is a suffix (RM:182–190). RD2:119–133 rules that **the second clause renders in both ranking modes**, not only in free mode.

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 8.1 | Placement | shipped body | shipped | a **new line under** `own N of top M` | — | — | RM:213–216 |
| 8.2 | Verb — default | — | — | — | — | `receipt.fit` — `34 of your cards fit` | CP:90–104, CV:188 |
| 8.3 | Verb — free mode | — | — | — | — | `receipt.fitFree` — verb becomes "are free" | CP:90–104, RM:182–190 |
| 8.4 | Clause — hard | — | `#E8CE93` glyph brass | joined ` · ` | — | `receipt.inUse` / `inUseShort` — `◆ 12 already in use` | CP:90–104, CV:188 |
| 8.5 | Clause — soft | — | `#C6B79A` | joined ` · ` | — | `receipt.wantedByDraft` — `◇ 4 wanted by a draft` | CP:90–104, CV:227 |
| 8.6 | No clause | — | — | — | — | when nothing is claimed the line renders with **no suffix** (Lathril, CV:204–215) | CV:204–215 |

**Row count: 6 elements.**

---

## 9 · `/commanders` — score delta

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 9.1 | Delta | shipped mono | shipped | joins the **Fit column** | — | `receipt.delta(drop)` → `↓${drop}` | CP:90–104, RM:213–216 |
| 9.2 | Visibility | — | — | — | — | **free state only, and only where the score actually moved** | RM:119–141 |
| 9.3 | Desktop long form | — | — | — | — | desktop buys `receipt.deltaFrom` — `↓21 from 82` | RM:119–141, CP:90–104 |
| 9.4 | Aria | — | — | — | — | `receipt.deltaAria`, `receipt.altScore` | CP:90–104 |
| 9.5 | Motion | — | — | — | — | numerals do not tween | RM:240–242 |

**Row count: 5 elements.**

---

## 10 · Degraded banner

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 10.1 | Component | — | — | — | — | reuses the **shipped `DegradedBanner`** — no new component | RM:291–338 |
| 10.2 | Availability down | — | — | — | — | `degraded.body`, one `Retry now` | CP:174–188 |
| 10.3 | **Both reads down** | — | — | — | — | **ONE banner, two sentences, one `Retry now`** — `degraded.bodyWithSynergy` | RM:291–338, CP:174–188 |
| 10.4 | Toggle treatment | — | — | — | — | **not drawn** — see 7.14. The spec asked for the `Free cards only` segment disabled and struck through; the shipped failure state is the banner plus a refused flip | RM:291–338 |
| 10.5 | Builder surfaces | — | — | — | — | **fail quiet** — no banner, no marker | A2RM:188–190 |
| 10.6 | `/collection` | — | — | — | — | **fails quiet.** Filter disabled with `degraded.collectionFilterDisabledAria`; **no banner** | A2RM:188–190, CP:174–188 |

### 10.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 10.7 | Healthy | both reads up | no banner | — |
| 10.8 | Availability down | availability read fails | one banner, one sentence | RM:291–338 |
| 10.9 | Both down | availability + synergy fail | one banner, two sentences, one retry | RM:291–338 |
| 10.10 | Silent degrade | builder / `/collection` | nothing visible except a disabled filter | A2RM:188–190 |

**Row count: 6 elements + 4 states.**

---

## 11 · Commander detail — in-use disclosure

**The one structural parity delta in the whole handoff** (RM:162–180): the disclosure **splits** on desktop and **filters** on phone. Both ship in the same PR.

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 11.1 | Phone behaviour | — | — | — | — | **filters** the list | RM:162–180 |
| 11.2 | Desktop behaviour | — | — | — | — | **splits** into two groups | RM:162–180 |
| 11.3 | Copy | — | — | — | — | `detail.*` | CP:107–124 |
| 11.4 | Status pill | shipped pill | Building border `#5A4A28`; Complete border `#33502F` | — | — | the claiming deck's status pill **rides along in the expanded state** | RM:162–180 |
| 11.5 | Motion | — | — | — | — | none on expand | RM:240–242 |

### 11.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 11.6 | Collapsed | default | summary only | RM:162–180 |
| 11.7 | Expanded — phone | toggled | list filtered to claimed cards | RM:162–180 |
| 11.8 | Expanded — desktop | toggled | two labelled groups | RM:162–180 |
| 11.9 | Nothing claimed | no hard/soft claims | disclosure absent | RM:162–180 |

**Row count: 5 elements + 4 states.**

---

## 12 · Deck detail — commitments roll-up

One region, **max two lines**, **red above muted, always** — the order is fixed and does not vary with counts (A2RM:111–139). Counts are **disjoint** (a card counted in the red line is not counted in the soft line). Soft line renders **pre-99 only**. **No roll-up and no badge on the deck index** (RM:98–118, A2RM:111–139).

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 12.1 | Region | — | — | — | — | `<section>` labelled **`Card commitments`** | CP:237–252, A2RM:195–210 |
| 12.2 | Red line container | — | bg `#211C15`, accent `#C6533F` | — | — | seam colour = `#211C15` | A2CV:496–509, A2CV:552–562 |
| 12.3 | Red heading | shipped heading | `#E9917A` | — | — | `deckRollup.overHeading` | CP:237–252 |
| 12.4 | Soft line container | — | **no tint**; left border `#4A4033` | — | — | muted, unfilled | A2RM:111–139 |
| 12.5 | Soft glyph | — | hollow `#A89B84` | — | 6px | — | A2RM:111–139 |
| 12.6 | Soft heading | shipped heading | `#C6B79A` | — | — | `deckRollup.softHeading`, or **`softHeadingAfterOver`** when the red line is also present | CP:237–252, A2RM:111–139 |
| 12.7 | Soft body — desktop | shipped body | `#C6B79A` | — | — | `deckRollup.softBody` (long form) | A2CV:552–562 |
| 12.8 | Soft body — phone | shipped body | `#C6B79A` | — | — | `deckRollup.softBodyShort` | A2CV:496–509 |
| 12.9 | Deck summary strip copy | shipped | shipped | — | — | `deckSummary.body(cardName, deckCount, ownedQty)` — `… is on ${deckCount} committed decks and you own ${ownedQty === 1 ? 'one' : ownedQty}. Nothing’s broken here — it’s a shopping decision.` | CP:130–138 |
| 12.10 | Deck index | — | — | — | — | **nothing renders** | RM:98–118, A2RM:111–139 |

### 12.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 12.11 | **Silent** | no over-commitments, no soft claims | region absent entirely | A2CV:572–584 |
| 12.12 | Soft only | sub-99 deck with draft claims | one muted line, `softHeading` | A2CV:454–460 |
| 12.13 | Over only | over-committed cards, no soft | one red line | A2RM:111–139 |
| 12.14 | Both | both fire | red line **then** soft line, soft uses `softHeadingAfterOver` | A2RM:111–139, A2CV:496–509 |
| 12.15 | At 99 | deck is complete | soft line suppressed (pre-99 only); red line may still render | A2RM:111–139 |

**Row count: 10 elements + 5 states.**

---

## 13 · `/collection` — row view

"A count cannot annotate a count" (A2RM:33–49) — hence **count-only** here. `/collection` renders `marker.hard` = `0 free` and **never** `hardIn` or `hardMulti`, in the visible label **and** in the accessible name (A2RM:62–75, A2RM:195–210).

**No grid change.** Phone `38px 40px 1fr auto`; desktop `52px 54px 1fr 150px 92px 18px` (A2RM:180–187). The marker lives **inside the existing `1fr` name cell**, inline after the name.

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 13.1 | Name cell | shipped | shipped | `display:flex` inside the existing `1fr` | unchanged | — | A2RM:33–49 |
| 13.2 | Name half | shipped | shipped | `truncate min-w-0` | flexible | full name in `title` **and** in the accessible name | RD2:119–133 |
| 13.3 | Marker chip | mono 8.5/600 (row density; the tile's caption box is 8.5/9) | per state | `flex: none` | hugs | **the deck-name half is the only part allowed to truncate** | A2RM:33–49, RD2:119–133 |
| 13.4 | Chip seam | — | `#1E1A15` | — | 1px | phone collection chip / row | A2CV:87–147 |
| 13.5 | Over row | — | container border tint retained | — | — | **border tint and nothing else** — no bg fill on the row | A2RM:33–49 |
| 13.6 | Label copy | — | — | — | — | `marker.hard` only | A2RM:62–75 |
| 13.7 | Result count | shipped | shipped | — | — | `Showing N of 1,418` — the **shipped denominator (total quantity) stays** | RD2:86–92 |
| 13.8 | Row aria | — | — | — | — | `collection.rowAria` (5-arg) | CP:195–227 |

**Row count: 8 elements.**

---

## 14 · `/collection` — tile view and card detail

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 14.1 | Tile chip | §2 | §2 | ~~**top-left**~~ → **the caption's meta line** | hugs | four states | A2RM:51–60; superseded by card captions (R1) call D |
| 14.2 | Tile caption | ~~shipped~~ → **two lines, fixed height** | shipped | — | ~~unchanged~~ → 52px phone / 46px desktop | `C21 · uncommon` moves onto the meta line, right-aligned | A2RM:51–60; superseded by card captions (R1) call A — see `collection.md` §Grid Tile: Caption Area |
| 14.3 | Desktop tile grid | — | — | ~~`repeat(5, 1fr)`~~ → `repeat(auto-fill, minmax(178px, 1fr))` | unchanged | — | A2CV:371–396; superseded by card captions (R1) ruling 3 |
| 14.4 | Card detail marker | — | per state | — | — | **count-only** — renders whenever the state is not `free`, so `marker.soft`, `marker.hard` or `marker.over`. Never `hardIn`, never `hardMulti`: `nameless` short-circuits both the naming and the deck COUNT, because counting claimants is the receipt’s job below and a marker that also counted them would print the same figure twice. Superseded by 14.7 (#353): the claim list below names every deck, so the marker naming one of them duplicated a link and made "first by name" look like a choice. The row's intent — card detail is where the deck gets named — is carried by 14.7 | A2RM:62–75, superseded #353 |
| 14.5 | Card detail status pill | — | — | — | — | **ships WITHOUT the status pill the canvas draws** — ratified R5 §3; the pill would be inferred from `hard > 0` rather than read. `hardDeckNames` stays names only, never `{ name, pill }[]` | RD2:78–84, R5RM:102–116 |
| 14.6 | Detail copy | shipped | shipped | — | — | `collection.detailHeading`, `detailHardNote`, `detailSoftNote`, `detailOverNote` | CP:195–227 |
| 14.7 | Card detail allocation receipt | eyebrow `font-mono 10px / 0.1em / uppercase`; rows `13px`; figures + split `font-mono 12px` | eyebrow + figures + split `var(--fg-faint)` / `var(--fg-muted)`; rows `var(--fg-body)` | claims eyebrow `mt-[14px]`; list `mt-[6px]`; row `py-[2px]`; split `mt-[8px]`; total line `mt-[8px]`, `gap-[8px]`; row gap `gap-[12px]` (arbitrary px, not the Tailwind scale) | hugs | renders whenever `claims` is non-empty — **including when the state is `free`**, which is the case #353 was filed on. One row per claiming deck: name as a link to `/decks/<id>`, then `holds N` (mature) or `wants N`, and — **only while the card is contested** — the allocation after it: `· gets it`, `· buys it`, or `· gets N of M` where part of the ask was covered. Split line reconciles to the total above: `in use · free`, or the `wanted / owned` comparison when `free < 0` | **NEW — #353/#355, not yet ratified by Design** |
| 14.8 | Allocation on a receipt row | rows `13px`, figure `font-mono 12px` (14.7's) | `var(--fg-muted)` (14.7's) | inline after the figure, ` · ` separated | hugs | **Who actually gets the copy**, drawn on committed rows only and only while some committed list asked for a copy the supply could not give it. `collection.detailClaimGets` / `detailClaimBuys` / `detailClaimGetsPartial`, the pair card assignments R2 vocabulary ruling 4 defined for this axis. `holds` / `wants` stays commit status: that same ruling rejected keying it on allocation, because `wants 1` would then mean "committed but lost the copy" on one row and "not committed at all" on the next | **NEW 2026-09-16 — not yet ratified by Design** |
| 14.9 | Drafts left out of the figures | `12.5px / leading-1.5` | `var(--fg-muted)` | `mt-[6px]`, under the split line | hugs | `collection.detailDraftsUncounted`, drawn when a draft claims the card **and the state is not `soft`**. `short N` and the split line count committed lists only, so a reader seeing four lists want one card cannot tell the figure from a miscount; this names the ones left out and why. Withheld in the soft state, where every claimant is a draft and `detailSoftNote` is already the whole story | **NEW 2026-09-16 — not yet ratified by Design** |

**Row count: 9 elements.**

**14.8 exists because commit status is not possession.** Four committed decks each reading
`holds 1` against a single owned copy told the reader three lists hold a card that is in the
fourth one's box. The figures were right throughout — `short N` counted correctly — but nothing
on the block said which list the copy goes to, which is the question a reader with three decks
wanting the same land is actually asking. The allocation comes from `allocateClaims`, the one
implementation of that arithmetic, shared with the arrivals receipt and the chooser's preview.

**14.4 / 14.7 are one decision.** The card-detail block was the only surface allowed to name a
deck, and 14.4 gave that job to the marker because the marker was the only thing on the line. The
receipt now names every claimant with its own count, so the marker went count-only and 14.7 owns
the naming. Ratifying 14.7 and superseding 14.4 is a single ask, not two.

---

## 15 · `Availability ▾` filter panel

Position: **fourth on desktop, fifth on phone** (A2RM:77–109). Four checkboxes. **Nothing defaults on**; `?avail=` here is **multi-value** (`?avail=inuse,over`) — unlike `/commanders`, where the same param name is single-value ranking mode.

| # | Element | Typography | Colour | Spacing | Size | States | Source |
|---|---|---|---|---|---|---|---|
| 15.1 | Trigger | shipped | shipped | — | **44px** min target | `collection.filterLabel` | A2RM:77–109, A2RM:195–210 |
| 15.2 | Menu row | shipped | shipped | — | **40px** row height | four rows | A2RM:195–210 |
| 15.3 | Options | shipped | shipped | — | — | `Free` / `Wanted by a draft` / `In use` / `Over-committed` | A2RM:77–109 |
| 15.4 | Counts | shipped mono | shipped | — | — | e.g. `1,186 / 168 / 61 / 3` — sums to `1,418` (fabricated) | A2RM:77–109 |
| 15.5 | Menu-row seam | — | `#2A241D` | — | 1px | over-committed glyph in the menu | A2CV:412–419 |
| 15.6 | Chip | shipped chip | shipped | — | — | removable; **the marker glyph is the leading dot** | A2RM:77–109 |
| 15.7 | Chip `✕` | — | — | — | **44px** target | `collection.chipRemoveAria` | A2RM:195–210, CP:195–227 |
| 15.8 | Desktop chip seam | — | `#2A241D` | — | 1px | — | A2CV:412–419 |
| 15.9 | URL | — | — | — | — | `?avail=inuse,over` | A2RM:77–109 |
| 15.10 | Grouping | — | — | — | — | **Multi-select listbox**, not a checkbox group: `role="listbox"` with `aria-multiselectable="true"`, and `aria-selected` on every option. The search field is a `role="combobox"` and WAI-ARIA 1.2 requires a combobox popup be a listbox/tree/grid/dialog, which a checkbox group is not. Counts (15.4) belong in each option's accessible name; a zero-count option stays in the list as `aria-disabled` rather than being removed. The checkbox **visuals** may stay — the drawing was never the contested part. Ratified by Design 2026-09-07, superseding the "checkbox group with a group name" wording | A2RM:195–210, #242 |

### 15.1 Named states

| # | State | Trigger | Visual | Source |
|---|---|---|---|---|
| 15.11 | Closed, nothing selected | default | trigger only, no chips | A2RM:77–109 |
| 15.12 | Open | trigger pressed | four rows with counts | A2RM:77–109 |
| 15.13 | Selected | one or more checked | chips rendered, `?avail=` populated | A2RM:77–109 |
| 15.14 | **No commitments** | player owns cards but claims nothing | counts read `1,418 / 0 / 0 / 0`; the three zero rows are **`aria-disabled`** | A2RM:77–109 |
| 15.15 | Degraded | availability read down | trigger disabled, `degraded.collectionFilterDisabledAria`, **no banner** | A2RM:188–190 |

**Row count: 10 elements + 5 states.**

---

## 16 · Canvas-vs-README disagreements — with resolutions

Precedence: README wins; READINESS outranks both.

| # | Disagreement | Canvas says | README / READINESS says | **Resolution** |
|---|---|---|---|---|
| 16.1 | Light theme | "get a light-theme pair there" (CV:853) | "There is no light theme" — one `:root` (RM:229–231) | **Do not build a light pair.** Known-wrong canvas statement; not a requirement |
| 16.2 | Brass contrast | "brass is not AA as small text" (CV:852) | brass is **AAA** at ~7.0:1 on `--surface` (RM:232–237) | **Known-wrong.** Do not add a compensating treatment |
| 16.3 | Contrast figures | 11.8 / 7.6 / 9.2 / 7.5 (CV:845, ARM:74–78, A2RM:207) | verified on `--surface #1E1A15`: `#E8CE93` **11.1**, `#E9917A` **7.1**, `--fg-body` **8.5**, `--brass` **7.0** | **Use the verified figures.** Handoff figures drift ~5% high; all still pass |
| 16.4 | Card-detail status pill | drawn (A2CV:350) | ships **without** it — `hardDeckNames` is names only (RD2:78–84) | **Omit the pill** |
| 16.5 | `free = owned − hard` | printed unqualified (A2CV:48) | that is the **off-decklist** case; on-decklist is `(owned − ownClaim) − (hard − ownHardClaim)` (RD2:105–110, A2RM:141–172) | **Both formulae ship** (§1.1) |
| 16.6 | `Showing N of 1,418` | denominator questioned (A2CV:82, A2CV:186) | shipped denominator (total quantity) stays (RD2:86–92) | **No change** |
| 16.7 | Live-region string | `Re-ranked by what’s free. Showing 25 of 214 commanders.` (ACV:199) | `ranking.announce(mode, n)` → `Ranked from free cards only · ${n} commanders` (CP:81–84) | **Copy file wins.** Restated 2026-09-14: the string now names the mode with the words the control itself uses, and says "Ranked from" because free mode also narrows the list |
| 16.8 | `deckSummary.body` deck count | drawn as the word "two" (CV:734, CV:807, A2CV:500) | template interpolates `${deckCount}` as a **numeral** (CP:133–134) | **Numeral.** Only `ownedQty === 1` spells out ("one") |
| 16.9 | Add-panel self-exclusion | **undrawn** anywhere | required — `deckId` on `searchCards` (RD2:94–103) | **Build it** |
| 16.10 | `was 1st` annotation | drawn (ACV:195, ACV:209) | Design says it would ship without it | **Optional; omit** unless separately requested |
| 16.11 | Roll-up soft body | phone `softBodyShort` (A2CV:507) vs desktop `softBody` (A2CV:561) | not a conflict — a deliberate responsive copy delta | **Ship both** (§12.7–12.8) |

**Row count: 11 disagreements.**

---

## 17 · Accessibility contract

Every accessible name quoted verbatim from `availability · copy strings.ts`.

| # | Context | Accessible name | Source |
|---|---|---|---|
| 17.1 | Soft marker | `1 copy is on a draft` / `${softQty} copies are on drafts` | CP:32–35 |
| 17.2 | Hard marker, one deck | `no free copies; this one is in your ${deckName} deck` | CP:41 |
| 17.3 | Hard marker, many decks | `no free copies; they are on ${deckCount} of your committed decks` | CP:42–43 |
| 17.4 | Over marker | `${deckCount} of your committed decks include this card and you own ${shortBy} too few` | CP:48 |
| 17.5 | Over, own decklist | `your ${otherDeck} deck also includes this card and you don’t own enough for both` | CP:50–51 |
| 17.6 | Ranking, default | the segment's visible label, `commandersCopy.availability.all`. `ranking.allAria` was deleted with the rename (§7 errata) — the control labels each radio with the word on it rather than a second sentence | CP:66–85 |
| 17.7 | Ranking, free | likewise `commandersCopy.availability.free`, at BOTH widths: the 32px rack segment shortens its visible text to `freeShort`, and the announced name stays the long form | CP:66–85 |
| 17.8 | Ranking announce | `ranking.announce(mode, n)` | CP:81–84 |
| 17.9 | Score delta | `receipt.deltaAria`, `receipt.altScore` | CP:90–104 |
| 17.10 | Deck summary | `deckSummary.ariaLabel` | CP:130–138 |
| 17.11 | Roll-up region | `Card commitments` on a `<section>` | CP:251, A2RM:195–210 |
| 17.12 | Collection filter option | `collection.filterOptionAria(label, n)` → `${label}, ${n === 1 ? '1 card' : \`${n} cards\`}` | CP:195–227 |
| 17.13 | Empty filter option | `collection.filterEmptyOptionAria` | CP:195–227 |
| 17.14 | Chip remove | `collection.chipRemoveAria` | CP:195–227 |
| 17.15 | Collection row | `collection.rowAria` (5-arg) — count-only, `0 free`, never a deck name | CP:195–227, A2RM:195–210 |
| 17.16 | Commanders row | `rowAria` — shipped **3-arg signature plus one optional trailing `availability` argument** | CP:159–166, ARM:72 |
| 17.17 | Degraded filter | `degraded.collectionFilterDisabledAria` | CP:174–188, A2RM:188–190 |

Structural rules:

| # | Rule | Source |
|---|---|---|
| 17.18 | `rowAria` is **extended, not replaced** — a free card must produce a **byte-identical** shipped string | ARM:72, CP:159–166 |
| 17.19 | Every marker is **glyph + number + word** — survives greyscale, passes AA without colour | RM:60–96, CV:838–848 |
| 17.20 | `--danger #C6533F` is glyph-and-border only, **never text**; text uses `#E9917A` | RM:238–239 |
| 17.21 | The marker is never focusable and never a tap target | RM:79–84 |
| 17.22 | Filter menu rows are 40px; the **44px** minimum applies to the trigger and each chip's `✕` | A2RM:195–210 |
| 17.23 | DOM order in the marker: glyph, then count, then word | RM:256–267 |
| 17.24 | `prefers-reduced-motion` needs no branch — there is no motion to reduce | RM:240–242 |
| 17.25 | No new dependency | RM:243–245 |

**Row count: 17 names + 8 rules.**

---

## 18 · States the design does not specify

| # | Gap | Note | Source |
|---|---|---|---|
| 18.1 | Add-panel marker visuals | Required (RD2:94–103) but never drawn. Reuse §3 verbatim | RD2:94–103 |
| 18.2 | Loading / skeleton for the marker | Not drawn. Given "no motion" and "free is silent", **render nothing until the value resolves** | RM:240–242 |
| 18.3 | Over-committed on a tile in `/collection` list-to-tile toggle | Chip form covered; the row's border tint has no tile analogue | A2RM:51–60 |
| 18.4 | Roll-up when a deck exceeds 99 | Undefined interaction between the 99-card gate and the soft-line "pre-99 only" rule | A2RM:111–139 |
| 18.5 | Filter + degraded + existing `?avail=` in the URL | Not drawn. Filter disabled; whether stale chips persist is unspecified | A2RM:188–190 |

**Row count: 5 gaps.**

---

## Row-count summary

| Section | Rows |
|---|---|
| 1 · Four states + copy | 21 |
| 2 · Marker, tile chip | 7 |
| 3 · Marker, row inline | 7 |
| 4 · Decklist row | 11 |
| 5 · Add-panel search row | 7 |
| 6 · Consider tile | 5 |
| 7 · Ranking toggle | 14 |
| 8 · Receipt line | 6 |
| 9 · Score delta | 5 |
| 10 · Degraded banner | 10 |
| 11 · Commander-detail disclosure | 9 |
| 12 · Deck-detail roll-up | 15 |
| 13 · `/collection` row view | 8 |
| 14 · `/collection` tile + detail | 9 |
| 15 · Availability filter panel | 15 |
| 16 · Disagreements | 11 |
| 17 · Accessibility | 25 |
| 18 · Unspecified states | 5 |
| **Total** | **190** |
