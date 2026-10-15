# Design Property Table — Deck Versioning Surface 1

Source: `design/design_handoff_the99_deck_versioning/` — `README.md` (Component notes + §Errata),
`STATES-pending.md` (table A), `OVERLAPS.md`, `READINESS.md`,
`deck-versioning · copy strings.ts`, and the canvas `The 99 - Deck Versioning.dc.html`
(§Surfaces 1 frame, lines 62–205; "The other states" frame, lines 713–755; Discard frame,
lines 469–498; Contract frame, lines 795–826).

Scope: the pending-changes banner on the deck page, the discard confirm that replaces its body,
the `Commit as v1` offer, and the decklist marks that map pending state onto the card list
(per-row `+`/`−` marks, pending-add rule, group headings, toolbar note, mix-cell strip).

Governing-value rule from the handoff: **§Errata at the foot of `README.md` wins over every other
sentence in the bundle, and where the canvas and R1-era prose disagree the canvas wins on chrome.**
Every row below records the canvas value and names the contradiction where one exists.

**Breakpoint:** the design draws two fixed frames — desktop at 1180px content width and phone at
390px (drawn in a 392px device shell). It never names a Tailwind breakpoint token; the Component
notes and READINESS refer to "phone" as **390px** and card-rows metrics as `md:`. Record `Mobile`
= the 390px frame, `Desktop` = the 1180px frame.

## Token ↔ hex correspondence used below

The canvas is inline-styled hex; the Component notes name tokens. This is the correspondence the
two documents jointly assert (banner = `--surface-rail` on `1px --border-strong`; diff row =
`--surface` on `1px --border`; brand `brand/README.md` names the four-step ramp and the state trio).

| Token | Hex on canvas | Asserted by |
|---|---|---|
| `--base` | `#14110E` | brand README (base) |
| `--surface-rail` | `#1A160F` | banner spec + canvas banner background |
| `--surface` | `#1A1713` | diff-row spec + canvas row background |
| `--elevated` | `#2A241D` | brand README (elevated) |
| `--border` | `#26211B` | diff-row spec `1px --border` + canvas row border |
| `--border-strong` | `#3A3229` | banner spec `1px --border-strong` + brand `line` |
| `--fg` | `#EDE6D8` | brand README (primary) |
| `--fg-body` | `#C6B79A` | brand README (secondary) |
| `--fg-muted` | `#A89B84` | brand README (muted) |
| `--fg-faint` | `#8E8269` | brand README (faint) |
| `--fg-locked` | `#6A6152` | stamp spec "`—` in `--fg-locked`" + canvas |
| `--accent` | `#C9A24B` | brand README (accent) |
| `--accent-hover` | `#D8B25E` | brand README |
| `--accent-shadow` | `#4A3A1C` | buy-tag spec `1px --accent-shadow` + canvas tile border |
| `--success` | `#6FA368` | brand README |
| `--warning` | `#E0913C` | brand README |
| `--danger` | `#C6533F` | brand README |
| danger button border | `#4A2F28` | Component notes "shipped danger button (`--danger` ink, `1px #4A2F28`)" |
| cream primary fill | `#E8E4D6` | README R1.2 chrome table; brand WUBRG `W` |
| cream primary ink | `#14110E` | README R1.2 chrome table |
| group-heading rule (plum) | `#574463` | Contract frame: traced, **not in the brand ramp**, flagged to confirm |
| `--fg-dim` (row `×`, art caption) | `#5C5346` | canvas only, unnamed in the notes |

Fonts: `var(--font-cinzel)` = Cinzel (group headings, deck name) · `var(--font-sans)` = IBM Plex
Sans (UI + reading copy, and the default — every rule below with no family named inherits it) ·
`var(--font-mono)` = IBM Plex Mono (all numbers, labels, tabular columns).

---

## Component: PendingBanner — counts density (7+ changes)

Rendered when `changeCount > INLINE_CHANGE_MAX` (`INLINE_CHANGE_MAX = 6`, one exported constant,
read only by the banner). Position: **under the hero, above the mix strip.** Not dismissible; not
a live region.

### Container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A160F` (`--surface-rail`) | `#1A160F` (`--surface-rail`) |
| border-width / style / color | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| border-left | `3px solid #C9A24B` (`--accent`) | `3px solid #C9A24B` (`--accent`) |
| border-radius | `10px` | `10px` |
| padding | `13px 14px` | `15px 17px` (Component notes say `14px 16px` — see Contradictions) |
| margin-bottom | `14px` | — (outer wrapper supplies `padding: 18px 26px 0`) |
| outer wrapper padding | `14px` (phone body padding) | `18px 26px 0` |
| display | block | block |
| max-width | — | — |
| dismissible | no | no |
| `aria-live` | none | none |

### Header row (label · counts · since)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `9px` | `14px` |
| flex-wrap | — (single line) | `wrap` |
| margin-bottom | `8px` (counts row) / `9px` (label) | `10px` |
| structure | label is its own block above the counts row | label, counts and since on one wrapping row |

### Header — label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.14em` | `0.16em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#C9A24B` (`--accent`) | `#C9A24B` (`--accent`) |
| margin-bottom | `9px` | — (row gap supplies it) |
| text | canvas draws `Pending changes`; copy `pending.label` is `Pending changes: not yet a version` | `Pending changes: not yet a version` |

### Header — counts group (`+19 / −17`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `9px` | `8px` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `15px` | `13px` |
| adds figure color | `#6FA368` (`--success`) | `#6FA368` (`--success`) |
| separator `/` color | `#3A3229` (`--border-strong`) | `#3A3229` (`--border-strong`) |
| removes figure color | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| removes glyph | `−` U+2212 minus sign, never a hyphen | `−` U+2212 |
| zero suppression | `−0` / `+0` never drawn; the absent side **and the `/`** are omitted | same |

### Header — "since" line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10.5px` |
| color | `#6A6152` (`--fg-locked`) | `#6A6152` (`--fg-locked`) |
| placement | inside the counts flex row, after the removes figure | third item of the header row |
| text | canvas `36 since v2`; copy `pending.since` is `36 changes since v2` | `36 changes since v2` |

### Money sentence

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | inherited sans | inherited sans |
| font-size | `12.5px` | `13px` |
| color | `#C6B79A` (`--fg-body`) | `#C6B79A` (`--fg-body`) |
| line-height | `1.5` | `1.55` |
| max-width | — | `700px` |
| margin-bottom | `12px` | `14px` |
| inline money run — font-family | `var(--font-mono)` | `var(--font-mono)` |
| inline money run — font-size | `12px` | `12.5px` |
| inline money run — color | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| inline money run — content | `$254.10` (phone drops the count) | `8 to buy · $254.10` |
| grammar | **bare** figure, never signed; must be accompanied by the words `this commit will ask for` (OVERLAPS check 2) | same |
| no-pulls variant | `pending.moneyPulls` sentence omitted | same |
| nothing-to-buy variant | `pending.moneyNone` — `Every card coming in has a free copy, so this commit asks for nothing.` | same |

### Controls row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `row` |
| gap | `8px` (outer column), `8px` (inner secondary row) | `10px` |
| align-items | stretch (default) | `center` |
| flex-wrap | — | `wrap` |
| order | primary full-width on its own row; `Commit as v3` + `Discard` on a second row | primary, Commit, Discard in one row |

### Control — primary `Review {n} changes`

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `600` | `600` |
| font-size | `14px` | `13.5px` |
| color | `#14110E` | `#14110E` |
| background | `#E8E4D6` (cream primary) | `#E8E4D6` (cream primary) |
| border | — (no border) | — (no border) |
| border-radius | `8px` | `8px` |
| padding | — (centred by flex) | `10px 18px` |
| min-height | `44px` (Contract frame allows `48px` for the two primaries) | — |
| width | full width of the banner body | intrinsic |
| display / align / justify | `flex` · `center` · `center` | inline-block |
| text | `Review 36 changes` (`pending.reviewCta`) | `Review 36 changes` |

### Control — secondary `Commit as v{n}`

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `500` | `500` |
| font-size | `13.5px` | `13.5px` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| background | none | none |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` |
| border-radius | `8px` | `8px` |
| padding | — (centred) | `10px 18px` |
| min-height | `44px` | — |
| flex | `1` (shares its row with Discard) | none |
| display / align / justify | `flex` · `center` · `center` | inline-block |

### Control — ghost `Discard`

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-weight | `500` | `500` |
| font-size | `13.5px` | `13.5px` |
| color | `#A89B84` (`--fg-muted`) | `#A89B84` (`--fg-muted`) |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` |
| border-radius | `8px` | `8px` |
| padding | — (centred) | `10px 16px` |
| min-height | `44px` | — |
| width | `92px` fixed, `flex: none` (Component notes say `96px` — see Contradictions) | intrinsic |
| display / align / justify | `flex` · `center` · `center` | inline-block |

### Hover / focus / active

| Property | Mobile | Desktop |
|----------|--------|---------|
| specified in the design | — (no hover, focus or active style is drawn or named for any banner control) | — |
| global link hover (canvas `<style>`) | `a { color: #C9A24B } a:hover { color: #D8B25E }` | same |
| accent hover token | `--accent-hover` `#D8B25E` (brand README: "hover/active on accent") | same |

### Transitions / transforms

| Property | Mobile | Desktop |
|----------|--------|---------|
| transition | — (Contract frame: "Motion — the commit sheet's open and close, **and nothing else**") | — |
| count-up animation on any figure | forbidden | forbidden |

---

## Component: PendingBanner — names density (1–6 changes)

Rendered when `changeCount <= INLINE_CHANGE_MAX`. Same box, same label, same counts; the money
sentence is replaced by the name lines, and the button hierarchy inverts.

### Container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A160F` (`--surface-rail`) | `#1A160F` |
| border | `1px solid #3A3229` | `1px solid #3A3229` |
| border-left | `3px solid #C9A24B` | `3px solid #C9A24B` |
| border-radius | `10px` | `10px` |
| padding | (no phone frame drawn — "same rule") | `15px 17px` |

### Header row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items / flex-wrap | (same rule) | `flex` · `center` · `wrap` |
| gap | (same rule) | `12px` |
| margin-bottom | (same rule) | `11px` |
| label | (same rule) | mono `10px`, `letter-spacing 0.16em`, uppercase, `#C9A24B` |
| counts group gap | (same rule) | `7px` |
| counts font-size | (same rule) | `13px` mono; `+1` `#6FA368` · `/` `#3A3229` · `−1` `#E0913C` |
| "since" line | (same rule) | **not drawn at ≤6** in the canvas frame |

### Name-line list

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | (same rule) | `flex` |
| flex-direction | (same rule) | `column` |
| gap | (same rule) | `5px` |
| margin-bottom | (same rule) | `14px` |
| ordering | (same rule) | adds first, then removes (canvas draws `+ Cyclonic Rift` then `− Hermit Druid`) |

### Name line — add variant

| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items | (same rule) | `flex` · `center` |
| gap | (same rule) | `9px` |
| min-height | (same rule) | `34px` (Component notes say `32px` — see Contradictions) |
| sign gutter — font-family | (same rule) | `var(--font-mono)` |
| sign gutter — font-size | (same rule) | `12px` |
| sign gutter — color | (same rule) | `#6FA368` (`--success`) |
| sign gutter — width | (same rule) | `13px`, `flex: none` |
| sign glyph | (same rule) | `+` |
| name — font-size | (same rule) | `13px` (Component notes say `13.5px` — see Contradictions) |
| name — color | (same rule) | `#EDE6D8` (`--fg`) |
| name — flex | (same rule) | `1` |
| holding deck — font-family / size / color | (same rule) | `var(--font-mono)` · `10px` · `#8E8269` (`--fg-faint`) |
| holding-deck text | (same rule) | canvas draws the bare deck name `Kess Storm`; copy `pending.addPullHint` is `or pull from {deck}` |
| price tag — font-family / size | (same rule) | `var(--font-mono)` · `10px` |
| price tag — color | (same rule) | `#E0913C` (`--warning`) |
| price tag — border | (same rule) | `1px solid #4A3A1C` (`--accent-shadow`) |
| price tag — border-radius | (same rule) | `4px` |
| price tag — padding | (same rule) | `1px 5px` |
| price tag — content | (same rule) | `$28.40` — the banner's inline names **keep the price** (not the collapsed `$`) |
| cost track slot — display / align / justify | (same rule) | `flex` · `center` · `flex-end` |
| cost track slot — gap | (same rule) | `3px` |
| cost track slot — width | (same rule) | `COST_TRACK` (72px), `flex: none` — **amended 2026-09-14, see below** |
| cost track — generic disc | (same rule) | `18px × 18px`, `border-radius 999px`, background `#2A241D`, border `1px solid #3A3229`, mono `10px`, color `#C6B79A`, centred; **absent when the cost has no generic component** |
| cost track — coloured pip | (same rule) | `11px × 11px`, `border-radius 999px`, background = WUBRG hex (`U #4A7FB5`, `B #5B5566`, `G #6B9E63`, `W #E8E4D6`, `R #C05A48`), `flex: none` |
| `CostPips` props | (same rule) | pass `track` and `cap` **explicitly** — the component defaults neither (§Errata); mount the shipped constants `COST_TRACK` (72px) and `COST_PIP_CAP` (5), never a literal |

> **Amendment, 2026-09-14 (PR #621), taken on Hugh's instruction and not through a design
> round.** The pips overlapped. The track — `COST_TRACK` in the code, `PIP_TRACK` in this
> table's own §Errata — was 40px, which cannot hold three 12px pips at the
> 3px gap this table also specifies — so every pip past the second stepped 5px into its
> neighbour, and two black pips overlapping read as one, which on these rows is the difference
> between a two-drop and a four-drop. The track is the cap's five slots at their real gap now:
> `5 × 12 + 4 × 3 = 72`. The gap, the cap, the disc and the pip sizes are all unchanged; only
> the slot they sit in is wider, and this banner's 56px slot would have overflowed into the
> name beside it the moment the pips stopped overlapping. `pnpm probe:pip-gap` holds every
> surface that draws a cost to that 3px floor.

### Name line — remove variant

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | (same rule) | `34px` |
| sign gutter — color | (same rule) | `#E0913C` (`--warning`) |
| sign glyph | (same rule) | `−` U+2212, width `13px`, `flex: none`, mono `12px` |
| name | (same rule) | `13px`, `#EDE6D8`, `flex: 1` |
| hint — font-family / size / color | (same rule) | `var(--font-mono)` · `10px` · `#6A6152` (`--fg-locked`) |
| hint text | (same rule) | `back in the pool on commit` (`pending.removeHint`) |
| price / buy tag | (same rule) | **absent** on a remove |
| cost track slot | (same rule) | identical to the add variant — `COST_TRACK` (72px, amended above), gap `3px`, disc + pips |

### Controls row (inverted hierarchy)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items / flex-wrap | (same rule) | `flex` · `center` · `wrap` |
| gap | (same rule) | `10px` |
| order | (same rule) | `Commit as v3` (cream primary) · `Discard` (ghost) · `review changes` (mono link) |

### Control — primary `Commit as v{n}` at ≤6

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family / weight / size | (same rule) | `var(--font-sans)` · `600` · `13.5px` |
| color | (same rule) | `#14110E` |
| background | (same rule) | `#E8E4D6` (cream primary) |
| border-radius | (same rule) | `8px` |
| padding | (same rule) | `10px 18px` |
| min-height at 390px | `44px` minimum (48px allowed for primaries) | — |

### Control — `Discard` at ≤6

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family / weight / size | (same rule) | `var(--font-sans)` · `500` · `13.5px` |
| color | (same rule) | `#A89B84` (`--fg-muted`) |
| border | (same rule) | `1px solid #3A3229` |
| border-radius | (same rule) | `8px` |
| padding | (same rule) | `10px 16px` |

### Control — demoted `review changes` link

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | (same rule) | `<a>` |
| font-family | (same rule) | `var(--font-mono)` |
| font-size | (same rule) | `11px` |
| color | (same rule) | `#C9A24B` (`--accent`, from the canvas `a` rule) |
| text-decoration | (same rule) | none |
| hover color | (same rule) | `#D8B25E` (`--accent-hover`) |
| text | (same rule) | `review changes` (`pending.reviewLink`, lowercase) |
| target | (same rule) | `/decks/[id]/changes` |

---

## Component: DiscardConfirm (in the banner's own box)

State 31. The banner's **body is replaced in place** — no dialog, no modal, no focus trap; the
product owns no confirm dialog.

### Container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A160F` (`--surface-rail`) | `#1A160F` |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` |
| border-left | `3px solid #C6533F` (`--danger`) | `3px solid #C6533F` |
| border-radius | `10px` | `10px` |
| padding | `13px 14px` | `15px 17px` |

### Question line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.14em` | `0.16em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#C6533F` (`--danger`) | `#C6533F` (`--danger`) |
| margin-bottom | `9px` | `9px` |
| text | `Discard 36 changes?` (`discard.question`) | `Discard 36 changes?` |

### Consequence line

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `12.5px` | `13px` |
| color | `#C6B79A` (`--fg-body`) | `#C6B79A` |
| line-height | `1.55` | `1.55` |
| max-width | — | `520px` |
| margin-bottom | `13px` | `14px` |
| emphasis run | `v2, committed 14 Mar` in `#EDE6D8`, `font-weight 600` | `v2 as committed on 14 Mar` in `#EDE6D8`, `font-weight 600` |
| must name | the version, **its date** and **its card count** | same |
| text | canvas: `Back to v2, committed 14 Mar — 99 cards. Nothing about the changes is stored, so this can’t be undone.` | canvas: `The deck goes back to v2 as committed on 14 Mar — 99 cards. The nineteen you added and the seventeen you cut are not stored anywhere, so this can’t be undone.` (production string is `discard.consequence`) |

### Button row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `row` |
| gap | `8px` | `10px` |
| align-items | stretch | `center` |
| flex-wrap | — | `wrap` |
| **order** | `Keep editing` **first (on top)**, `Discard {n} changes` second | `Discard {n} changes` first, `Keep editing` second |

### Button — `Keep editing`

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family / weight | `var(--font-sans)` · `600` | `var(--font-sans)` · `600` |
| font-size | `14px` | `13.5px` |
| color | `#14110E` | `#14110E` |
| background | `#E8E4D6` (cream primary) | `#E8E4D6` |
| border-radius | `8px` | `8px` |
| padding | — (centred) | `10px 18px` |
| min-height | `48px` | — |
| display / align / justify | `flex` · `center` · `center` | inline-block |

### Button — `Discard {n} changes` (shipped danger button)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family / weight | `var(--font-sans)` · `600` | `var(--font-sans)` · `600` |
| font-size | `13.5px` | `13.5px` |
| color | `#C6533F` (`--danger`) | `#C6533F` |
| background | none | none |
| border | `1px solid #4A2F28` | `1px solid #4A2F28` |
| border-radius | `8px` | `8px` |
| padding | — (centred) | `10px 18px` |
| min-height | `44px` | — |
| label | carries the number: `Discard 36 changes` | same |

### In-flight / refused

| Property | Mobile | Desktop |
|----------|--------|---------|
| in-flight label | `Discarding…` (`discard.pending`) | same |
| in-flight disabled | both controls disabled, **banner stays in place**, nothing unmounts | same |
| refusal | shipped `MutationError` inside the banner; the confirm stays open; the changes untouched | same |
| announcement | `36 changes discarded. Back to v2.` — one message on the existing live region | same |
| focus after discard | the deck name | same |

---

## Component: FirstCommitOffer (`Commit as v1`, versionless deck at a full body)

State 2. Placement: **in the spine, after `Export` and before the deck's ⋯**, which is the row's last control at both widths — not in a banner. **Since 2026-10-15 (Hugh) it is the header's one primary while offered**: desktop `Export` steps down to the ghost style beside it, and returns to primary once no commit is offered.

| Property | Mobile | Desktop |
|----------|--------|---------|
| wrapper | **RETIRED 2026-09-15**, with the note it was arranging — `flex` · `center` · `12px` · `wrap` described a row holding the control and the note, and the offer is now the control alone. A flex container around a single item decides only how much of the row that item claims, which is the property that zeroed the deck's title column. Do not restore it. |
| button font-family / weight / size | (same rule) | `var(--font-sans)` · `600` (`PrimaryButton`) · `13px` |
| button color | (same rule) | `--bg` on the bone fill (`PrimaryButton`) |
| button background | (same rule) | `--fg`, the bone primary (`PrimaryButton`; Hugh, 2026-10-15, superseding the outline) |
| button border | (same rule) | none |
| button border-radius | (same rule) | `8px` |
| button padding | (same rule) | `9px 16px` |
| button text | (same rule) | `Commit as v1` (`pending.firstCommitCta`) |
| note | **RETIRED 2026-09-15** — the mono note beside the control is CUT, and `pending.firstCommitNote` is deleted from `deck-versioning.ts`. It answered "what does this do to my deck" in two lines of 10px mono, which the control's own words raise and the review page it links to answers in full before anything is locked; on the desktop spine those lines were the widest thing in the band's narrowest row. Do not implement against it. |
| gate | `deckBodySize(hasPartner)` — 99, or **98 with a partner** (§Errata); read exactly once, the only place this UI knows the number | same |

---

## Component: Pending-list caption / toolbar note

The Component notes specify a caption **above the decklist**; the canvas draws the sentence in the
**list toolbar's right slot** instead. Both strings exist in the copy module. Record both; see
Contradictions.

### Toolbar note (as drawn on the canvas)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | (no phone toolbar drawn) | `var(--font-mono)` |
| font-size | — | `11.5px` |
| color | — | `#6A6152` (`--fg-locked`) |
| placement | — | list toolbar, right of the spacer, left of `By type`/`By role` |
| text | — | `19 of these are not in v2 yet` (`pending.toolbarNote`) |
| replaces | — | the shipped "n cards are yours now" note while changes exist |

### Caption above the list (as specified in the Component notes)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| placement | one line above the decklist | one line above the decklist |
| text | `the brass rule marks the {n} rows you have added` (`pending.addListCaption`) | same |
| purpose | the sighted reader's key — said **once**, never per row | same |

---

## Component: DecklistRow — pending-add mark

The mark is a border, **not a slot occupant**. No row's grid template changes and no row grows in
height. `pending add` goes in the row's **accessible name only** and is never rendered visually.

### Marked row (pending add)

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | `44px` | `38px` |
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| **border-left** | `2px solid #C9A24B` (`--accent`) | `2px solid #C9A24B` (`--accent`) |
| border-radius | `7px` | `7px` |
| padding | `0 8px 0 6px` | `0 9px 0 7px` |
| display / align-items | `flex` · `center` | `flex` · `center` |
| gap | `9px` | `9px` |
| accessible name | carries `pending add` (`pending.addMarkA11y`) | same |
| visual text for the mark | — (never rendered) | — |

### Unmarked row (in the version already)

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | `44px` | `38px` |
| background | `#1A1713` | `#1A1713` |
| border | `1px solid #26211B` | `1px solid #26211B` |
| border-left | — (no accent rule) | — |
| border-radius | `7px` | `7px` |
| padding | `0 8px` | `0 9px` |
| gap | `9px` | `9px` |

### Row slots (unchanged by the feature)

| Property | Mobile | Desktop |
|----------|--------|---------|
| ownership dot — width / height | `7px` / `7px` | `7px` / `7px` |
| ownership dot — border-radius | `999px` | `999px` |
| ownership dot — flex | `none` | `none` |
| dot, free | `background #6FA368` (`--success`) | same |
| dot, sleeved elsewhere | `background #C9A24B` (`--accent`; the Component notes name `--avail-hard-fg` drawn as `--accent`) | same |
| dot, unowned | `border: 1px dashed #6A6152` (`--fg-locked`), no fill | same |
| dot ARIA | `aria-hidden`; the **row's own accessible name** carries the availability word (§Errata) | same |
| name — font-size | `12.5px` | `13px` |
| name — color | `#EDE6D8` (`--fg`) | `#EDE6D8` |
| name — flex / min-width | `1` / `0` | `1` / `0` |
| name — overflow / text-overflow / white-space | `hidden` / `ellipsis` / `nowrap` | same |
| quantity move | `{name} {from} → {to}` via `recountedItem`, rendered when `from > 0 && to > 0` — never a bare name | same |
| availability marker (collapsed) | mono `10px`, color `#E0913C` (`--warning`), glyph `◆`, `flex: none` | same |
| buy tag (collapsed `$` tile) — width/height | `22px × 22px` | `22px × 22px` |
| buy tag — background | `rgba(224,145,60,0.13)` (`rgba(warning,.13)`) | same |
| buy tag — border | `1px solid #4A3A1C` (`--accent-shadow`) | same |
| buy tag — border-radius | `6px` | `6px` |
| buy tag — font / size / color | `var(--font-mono)` · `12px` · `#E0913C` | same |
| buy tag — content | `$` only, **no figure** | `$` only, no figure |
| cost track slot — width | `76px` | `90px` |
| cost track slot — display / align / justify / gap | `flex` · `center` · `flex-end` · `3px` | `flex` · `center` · `flex-end` · `3px` |
| cost track — generic disc | `17px × 17px`, radius `999px`, background `#2A241D`, border `1px solid #3A3229`, mono `9.5px`, color `#C6B79A` | `18px × 18px`, radius `999px`, background `#2A241D`, border `1px solid #3A3229`, mono `10px`, color `#C6B79A` |
| cost track — coloured pip | `10px × 10px`, radius `999px`, WUBRG hex fill | `11px × 11px`, radius `999px`, WUBRG hex fill |
| cost track governing geometry | **shipped `COST_TRACK = 72`, `PIP_CAP = 5`** (§Errata) — the 90/76px above is the canvas drawing, and `COST-TRACK.md`'s 110/76 proposal governs nothing here | same — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1** |
| remove `×` control — width / color / size / text-align | not drawn at 390px | `14px` · `#5C5346` · `13px` · `right`, `flex: none` |
| row hover | `--elevated-hover` with `open card →` in the meta slot | same |
| row click target | the whole row opens the card | same |

### Decklist layout

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `grid` |
| flex-direction | `column` | — |
| grid-template-columns | — | `1fr 1fr` |
| gap | `5px` | `5px 20px` |
| removes drawn in the list | **never** — a removed card is not among the changes | never |

---

## Component: Type group heading (with the changes note)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display / align-items | `flex` · `baseline` | `flex` · `baseline` |
| gap | `9px` | `11px` |
| border-bottom | `1px solid #574463` (plum rule, traced — flagged to confirm) | `1px solid #574463` |
| padding-bottom | `7px` | `8px` |
| margin-bottom | `10px` | `12px` |
| heading font-family | `var(--font-cinzel)` | `var(--font-cinzel)` |
| heading font-weight | `700` | `700` |
| heading font-size | `14px` | `16px` (Component notes say `14px`; `13px` in a version diff — see Contradictions) |
| heading letter-spacing | `0.04em` | `0.04em` |
| heading text-transform | `uppercase` | `uppercase` |
| heading color | `#EDE6D8` (`--fg`) | `#EDE6D8` |
| count font-family / size / color | `var(--font-mono)` · `11px` · `#8E8269` (`--fg-faint`) | `var(--font-mono)` · `11.5px` · `#8E8269` |
| spacer | — (no changes note drawn at 390px) | `<span style="flex:1">` between count and note |
| changes note font-family / size / color | not drawn | `var(--font-mono)` · `10.5px` · `#C9A24B` (`--accent`) |
| changes note text | not drawn | `12 added, not yet committed` (`pending.groupAddNote`) |
| ordering inside a group | alphabetical, never `bucketAdds`' oracle-UUID order | same |
| grouping source | the shipped `DecklistGroup` / `DecklistGroupHeader` / `GroupToggle` modules — **no extraction prerequisite** (§Errata) | same |
| `By role` grouping | carries the same per-group added note | same |

---

## Component: Mix strip (RECOMMENDED MIX) while changes exist

Five cells, the shipped `ROLE_ORDER`: ramp, draw, removal, wipes, land. The only change is the
bottom-left slot.

### Strip header

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | (no phone frame drawn) | `var(--font-mono)` |
| font-size | — | `11.5px` |
| letter-spacing | — | `0.14em` |
| text-transform | — | `uppercase` |
| color | — | `#8E8269` (`--fg-faint`) |
| margin-bottom | — | `12px` |
| sub-run 1 | — | `EDHREC averages` — `#6A6152`, `letter-spacing 0.06em`, `text-transform none` |
| sub-run 2 (new, pending changes only) | — | `· reading pending changes` — `#C9A24B` (`--accent`), `letter-spacing 0.06em`, `text-transform none` |
| wrapper padding | — | `22px 26px 0` |

### Cell row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display / gap | — | `flex` · `12px` |
| cell flex | — | `1` |
| cell background | — | `#1A1713` (`--surface`) |
| cell border | — | `1px solid #26211B` (`--border`) |
| cell border-radius | — | `9px` |
| cell padding | — | `12px 14px` |

### Cell internals

| Property | Mobile | Desktop |
|----------|--------|---------|
| role label — font / size / letter-spacing / transform / color | — | `var(--font-mono)` · `10px` · `0.14em` · `uppercase` · `#8E8269` |
| role label — margin-bottom | — | `6px` |
| figure row — display / align-items / gap | — | `flex` · `baseline` · `6px` |
| figure — font / size | — | `var(--font-mono)` · `19px` |
| figure color, below rec | — | `#E0913C` (`--warning`) |
| figure color, at/over rec | — | `#6FA368` (`--success`) |
| denominator — font / size / color | — | `var(--font-mono)` · `12px` · `#6A6152` (`--fg-locked`) |
| bar — height / border-radius / background | — | `4px` · `999px` · `#26211B` |
| bar — margin | — | `8px 0 7px` |
| bar fill — height / border-radius | — | `4px` · `999px` |
| bar fill — width | — | percentage of rec, capped at `100%` |
| bar fill — background | — | `#E0913C` below rec, `#6FA368` at/over rec |
| footer row — display / justify-content | — | `flex` · `space-between` |
| bottom-left slot — font / size / color | — | `var(--font-mono)` · `10px` · `#6A6152` |
| bottom-left slot, figure **moved** | — | `was {n}` (`pending.mixCellWas`) |
| bottom-left slot, figure **unmoved** | — | `rec {n}` unchanged — `was 7` on a 7 is a delta claiming to be one |
| bottom-right slot, actionable | — | `<a>` mono `10px`, `consider →`, color `#C9A24B` |
| bottom-right slot, not actionable | — | mono `10px` `#6A6152` en dash `–` |
| `Why these numbers?` link | — | sans `13px`, `display inline-block`, `margin-top 13px`, `border-bottom 1px solid #C9A24B` |
| fold | must be the **same fold** the deck page's mix strip already uses | same |

---

## Component: Tab row (the `Versions` tab)

| Property | Mobile | Desktop |
|----------|--------|---------|
| row display / align-items | `flex` · `center` | `flex` · `center` |
| row gap | `18px` | `26px` |
| row border-bottom | `1px solid #26211B` (`--border`) | `1px solid #26211B` |
| row overflow | `hidden` | — |
| row margin-bottom | `13px` | — |
| wrapper padding | `14px` (body) | `24px 26px 0` |
| tab display / align-items / gap | `flex` · `baseline` · `6px` | `flex` · `baseline` · `7px` |
| tab padding-bottom | `11px` | `13px` |
| active tab border-bottom | `2px solid #C9A24B` (`--accent`) | `2px solid #C9A24B` |
| active tab margin-bottom | `-1px` | `-1px` |
| active label font-family / weight / size / color | `var(--font-sans)` · `600` · `14px` · `#EDE6D8` | `var(--font-sans)` · `600` · `16px` · `#EDE6D8` |
| active count font-family / size / color | `var(--font-mono)` · `11px` · `#C9A24B` | `var(--font-mono)` · `12px` · `#C9A24B` |
| inactive label font-family / weight / size / color | `var(--font-sans)` · `500` · `14px` · `#8E8269` | `var(--font-sans)` · `500` · `16px` · `#8E8269` |
| inactive count font-family / size / color | `var(--font-mono)` · `11px` · `#6A6152` | `var(--font-mono)` · `12px` · `#6A6152` |
| tab order | `Your deck` · `Consider` · `Games` · `Versions` | same |
| `Versions` count | phone frame draws the label with **no count**; desktop draws `3` | `3` |
| count at zero versions | the **whole tab is absent**, not empty and not disabled | same |
| route | `/decks/[id]/versions` | same |

---

## Component: List toolbar (pending variant)

| Property | Mobile | Desktop |
|----------|--------|---------|
| wrapper padding | (not drawn at 390px) | `16px 26px 0` |
| display / align-items / gap / flex-wrap | — | `flex` · `center` · `10px` · `wrap` |
| `All n` pill — font / weight / size / color | — | `var(--font-sans)` · `600` · `13px` · `#EDE6D8` |
| `All n` pill — background / radius / padding | — | `#2A241D` (`--elevated`) · `999px` · `7px 16px` |
| `Shopping n` pill — font / weight / size / color | — | `var(--font-sans)` · `500` · `13px` · `#C9A24B` |
| `Shopping n` pill — border / radius / padding | — | `1px solid #C9A24B` · `999px` · `6px 16px` |
| spacer | — | `<span style="flex:1">` |
| pending note | — | see Toolbar note above |
| `By type` (active) | — | sans `600` `13px` `#EDE6D8`, background `#2A241D`, radius `999px`, padding `7px 15px` |
| `By role` (inactive) | — | sans `500` `13px` `#8E8269`, border `1px solid #3A3229`, radius `999px`, padding `6px 15px` |
| toggle group gap | — | `7px` |
| view-mode buttons | — | `32px × 30px`, radius `7px`, `flex` centred, font-size `13px`; active border `1px solid #3A3229` + color `#EDE6D8`, inactive border `1px solid #26211B` + color `#6A6152` |
| view-mode group gap | — | `4px` |

---

## Component: Hero (over-cap treatment while changes exist)

Reused unchanged; recorded because the banner's states depend on it and **nothing is blocked**.

| Property | Mobile | Desktop |
|----------|--------|---------|
| art plate — width / height | full width × `120px` | `230px × 158px` (README names a `230px` art plate) |
| art plate — background | `#241F1A` | `#241F1A` |
| art plate — borders | — | `border-right 1px solid #2A241D`, `border-bottom 1px solid #2A241D` |
| `⛶ Card details` pill — font / size / color | `var(--font-mono)` · `10px` · `#EDE6D8` | `var(--font-mono)` · `11px` · `#EDE6D8` |
| pill background / radius / padding | `rgba(20,17,14,0.78)` · `999px` · `5px 11px` | `rgba(20,17,14,0.78)` · `999px` · `5px 12px` |
| pill position | `absolute; left 12px; bottom 10px` | `absolute; left 12px; bottom 12px` |
| deck name — family / weight / size / letter-spacing / transform | `var(--font-cinzel)` · `700` · `18px` · `0.02em` · `uppercase` | `var(--font-cinzel)` · `700` · `26px` · `0.01em` · small-caps drawn as `21px` inner runs |
| identity squares — size / radius / gap | `10px` · `2px` · `3px` | `11px` · `2px` · `3px` |
| commander line — family / size / color | `var(--font-mono)` · `11px` · `#C6B79A` | `var(--font-mono)` · `12.5px` · `#C6B79A` |
| `2 over` pill — family / size / color | `var(--font-mono)` · `10.5px` · `#E0913C` (`--warning`) | `var(--font-mono)` · `11.5px` · `#E0913C` |
| `2 over` pill — background / radius / padding | `rgba(224,145,60,0.12)` · `5px` · `3px 8px` | `rgba(224,145,60,0.12)` · `6px` · `4px 11px` |
| body count — family / size / color | `var(--font-mono)` · `23px` · `#E0913C` | `var(--font-mono)` · `27px` · `#E0913C` |
| `/ 99` — family / size / color | `var(--font-mono)` · `13px` · `#6A6152` | `var(--font-mono)` · `15px` · `#6A6152` |
| bar — height / radius / background | `5px` · `999px` · `#26211B` | `5px` · `999px` · `#26211B` |
| bar — max-width / margin | — / `8px 0 7px` | `380px` / `9px 0 8px` |
| bar segments | `flex: 99` `#6FA368` then `flex: 2` `#E0913C` — a **second segment**, never a clip or a recolour | same |
| owned line — family / size / color | `var(--font-mono)` · `11px` · `#8E8269`, money run `#E0913C` | `var(--font-mono)` · `11.5px` · `#8E8269`, money run `#E0913C` |
| `Complete` pill (clean state) | — | mono `11.5px` `#6FA368` on `rgba(111,163,104,0.12)`, radius `6px`, padding `4px 11px` |
| under-cap variant | `94 / 99` in `--warning` as shipped; commit not disabled | same |

---

## State Coverage — PendingBanner and the decklist marks

State numbers are **section-scoped** to `STATES-pending.md` table A (plus table D for the discard
states, which live in this banner's box). Diff source: `deck_cards` against the newest version's
`deck_version_cards`, via `draft-diff.ts` — **derived, never a flag**.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| A1 — Draft, below a full body | `versionCount === 0 && bodySize < deckBodySize(hasPartner)` | Nothing: no banner, no Commit, no Discard, **no Versions tab**; decklist unchanged | `versionCount`, `bodySize`, `hasPartner` |
| A2 — Draft, at a full body | `versionCount === 0 && bodySize === deckBodySize(hasPartner)` | `FirstCommitOffer` in the spine after `Export` and before the ⋯ — the bone **primary**, with desktop `Export` as a ghost; the control alone (the mono note is retired, see above). No banner, no Versions tab | `versionCount`, `bodySize`, `hasPartner`, `firstCommitCta` |
| A3 — Committed, clean | `versionCount > 0 && changeCount === 0` | `Versions · {n}` tab only. **No banner, no Commit, no Discard, no empty diff panel, no "no pending changes" reassurance** | `versionCount`, `currentVersion`, `versionLine(version, date)` |
| A4 — Committed, 1–6 changes | `versionCount > 0 && 1 <= changeCount <= INLINE_CHANGE_MAX` | `PendingBanner` **names density** + marked decklist | `adds[]` (name, cost, bucket, holdingDeck, price), `removes[]` (name, cost), `currentVersion`, `nextVersion`, `INLINE_CHANGE_MAX` |
| A5 — Committed, 7+ changes | `versionCount > 0 && changeCount > INLINE_CHANGE_MAX` | `PendingBanner` **counts density** + marked decklist. Names not shown at all | `addCount`, `removeCount`, `changeCount`, `currentVersion`, `nextVersion`, `unfreeCount`, `buyTotal`, `pullableCount` |
| A6 — Committed, over the cap | `bodySize > deckBodySize(hasPartner)` with pending changes | Banner unchanged (says nothing extra) + hero `101 / 99 · 2 over` in `--warning` + second bar segment. **Nothing blocked** | `bodySize`, `cap`, `overBy` |
| A7 — Committed, under the cap | `bodySize < deckBodySize(hasPartner)` with pending changes | Banner unchanged + hero `94 / 99` in `--warning`. Commit **not** disabled | `bodySize`, `cap` |
| A8 — Adds only | `addCount > 0 && removeCount === 0` (and the mirror) | Banner counts render `+19` alone — the `−` figure **and the `/`** absent, never `−0` | `addCount`, `removeCount` |
| A9 — Changes with no type moved | a type's before/after count is equal | (Review page's type block renders only moved types; no Surface 1 element changes) | per-type before/after counts |
| A10 — Changes that move no mix figure | `roleCount.after === roleCount.before` for a role | That mix cell keeps `rec {n}`; `was {n}` is **not** substituted | per-role `before`, `after`, `rec` |
| A11 — A quantity changed only | one `draftDiff` entry with `from > 0 && to > 0` | Banner counts `+1 / −1`; the row is ruled; the line reads `{name} {from} → {to}` via `recountedItem` | `from`, `to`, `recountedItem` |
| A12 — Changes bring it back to the version | `changeCount === 0` after an edit | Returns to A3 with **no announcement** — the banner is derived, so it simply is not there | `changeCount` |
| D30 — Discard at rest | changes exist, no confirm open | Neutral ghost `Discard`, third of three banner controls | `discardCta` |
| D31 — Confirming | confirm opened from the banner | `DiscardConfirm` replaces the banner's body: `--danger` left rule, question, consequence naming **v{n}, its date and its card count**, two buttons. **Phone: `Keep editing` on top** | `changeCount`, `currentVersion`, `versionDate`, `versionCardCount`, `addCount`, `removeCount` |
| D32 — Confirming, from the review page | confirm opened on `/decks/[id]/changes` | The same two lines and two buttons, **in the apply bar**. No second wording | same as D31 |
| D33 — Discarding | mutation in flight | `Discarding…`, both controls disabled, **banner in place**, nothing unmounts | `isPending` |
| D34 — Discarded | mutation resolved | Deck page in state A3; announced `{n} changes discarded. Back to v{v}.`; focus moves to the deck name. **No undo offer** | `changeCount`, `currentVersion` |
| D35 — Refused | mutation rejected | Shipped `MutationError` in the banner; changes untouched; the confirm **stays open** | `error` |

### Cross-surface conditions that change Surface 1

| Condition | Effect on Surface 1 | Source |
|---|---|---|
| Deck has a version and an update/paste is applied | The update flow's **arrival strip is suppressed** (`deckImportCopy.update.arrival.delta` not set); the pending banner says the truer thing | OVERLAPS call 2; check 2 |
| Deck has a version and the import preview renders | One added line above the preview's groups: `draftPasteNotice(version)` | copy strings; OVERLAPS call 2 |
| Top-off adds land on a committed deck | Top-off's figures become **signed** (`+3 to buy · +$42.80`); the banner's total stays **bare**; no link-out on either | OVERLAPS call 1 |
| Mana Pool link-out | **Exactly one instance in the whole feature** — the commit sheet. Never in the banner | OVERLAPS check 1 |
| Money figures | The banner total, the review chip and the sheet sum are **one query** (`loadDeckBuyRows`, left-joined) rendered three times | README eng notes; OVERLAPS check 4 |
| Revalidation after commit / discard / pull | `revalidateClaims(deckId, userId)` — **not** `deckSurfaces()` | §Errata |
| Announcements | One message per settle on the **existing** live region; the banner itself is **not** a live region | STATES-pending §Announcements |

---

## Absences the design states explicitly (write `—`, do not add)

| Element | Status |
|---|---|
| Removes ghosted into the decklist | **Never** — a removed card is not among the changes |
| A `pending add` chip on the row | Rejected (displaces ~86px of name on 19 rows) |
| A ring or fourth state on the ownership dot | Rejected |
| A fill tint (`--elevated-hover` + `--accent-shadow`) on a pending row | Rejected — already means "opted out" on the re-import kept row |
| A chip on desktop and a rule on phone | Rejected — a marker that changes shape by width is a second IA |
| A signed delta in the Decklist pill (`Decklist · 101 · +19`) | Rejected |
| Banner as toast / badge / dismissible / live region | Rejected |
| A second banner | Does not exist — one construct, two densities |
| `−0` / `+0`, an empty column, a "no pending changes" panel | Never drawn |
| A toast after commit or discard | None — the deck page is the receipt |
| An undo window after discard | Rejected |
| A type-the-deck-name discard confirm | Rejected |
| A confirm dialog / modal / tray / tooltip | None exists in the product |
| Count-up animation on any figure | Forbidden |
| Motion anywhere in Surface 1 | None — only the commit sheet's open/close |
| Hover, focus or active styling for banner controls | Not specified anywhere in the bundle |
| Mana value on a card row | **None** — rows draw `CostPips`' output only; mana value lives in the what-changed strip alone (§Errata) |
| A per-row type label | Deleted — the group heading carries type |
| Windowing / virtualisation / pagination | None |
| New tokens, hexes, motion classes | None |

---

## Contradictions inside the bundle, and the value recorded above

| Subject | Recorded value | Loser, and why |
|---|---|---|
| Pending-add rule width | **2px** | §Errata governs over the `3px` in §Surfaces, `STATES-pending.md`'s copy table and the copy module's own comment |
| Padding absorption for the mark | §Errata: **no absorption** — `DecklistRow` draws marks as inset box shadows, which displace nothing | the canvas's `0 9px 0 7px` / `0 8px 0 6px` and the READINESS "9px → 7px / 8px → 6px" absorb instruction. **Both are recorded above; the errata row governs the implementation** |
| Banner padding | canvas `15px 17px` desktop / `13px 14px` phone | Component notes' `14px 16px` |
| Banner primary fill | **cream** `#E8E4D6` on `#14110E` | Component notes' "brass solid"; README's R1.2 chrome table and the canvas both say brass is never a fill |
| `Keep editing` fill | **cream** `#E8E4D6` (canvas + the Discard frame's own caption) | Component notes' "brass-solid `Keep editing`" |
| `Discard` phone width | canvas `92px` | Component notes' "Discard fixed 96px" |
| Change-name row height | canvas `min-height 34px` | Component notes' `32px` |
| Change-name name size | canvas `13px` | Component notes' `13.5px` |
| Group heading size | canvas `16px` desktop / `14px` phone | Component notes' `14px` (and `13px` in a version diff) |
| Cost-track geometry | **shipped `COST_TRACK = 72`, `PIP_CAP = 5`** (§Errata) | the canvas's `90px` / `76px` slots, `COST-TRACK.md`'s `110px` / `76px`, and §Surfaces' `90px` / `76px` — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1** |
| Row min-height desktop | canvas `38px`; Contract frame says "rows 38–44px desktop, 44–52px phone"; READINESS says "diff rows 40–46px desktop" | ranges disagree; the canvas figure is recorded |
| Pending sentence placement | **both recorded** — toolbar right slot (canvas, mono `11.5px` `#6A6152`) and caption above the list (Component notes, mono `10px` `--fg-faint`) | unresolved: the copy module ships `addListCaption` **and** `toolbarNote` as separate strings |
| Ownership dot a11y | the **row's own accessible name** carries the availability word | Component notes' "the bucket heading is the accessible statement" (buckets withdrawn) |
| Grouping component extraction | **no prerequisite** — `DecklistGroup`, `DecklistGroupHeader`, `GroupToggle` already ship as modules (§Errata) | README eng note and READINESS item 27, which both demand an extraction task |
| Full-body test | `deckBodySize(hasPartner)` — 98 with a partner (§Errata) | a hard-coded 99 and the bare `deckBodySize()` in §Surfaces 1 |

## Ambiguous or missing in the design (no value to verify against)

1. **No phone frame for the ≤6 names density**, the discard-from-review apply bar, the toolbar, the
   mix strip or the group-heading changes note. The frames table marks these "— (same rule)"; every
   Mobile cell above that reads `(same rule)` or `—` has no drawn source.
2. **No hover, focus-visible or active state** is drawn or described for any banner control, the
   `review changes` link, the `Commit as v1` offer, or a pending-marked row (only the generic row
   hover `--elevated-hover` + `open card →`, and the canvas's global `a:hover`).
3. **The phone banner's label and "since" text are truncated on the canvas** (`Pending changes`,
   `36 since v2`) while the copy module ships only the full strings — no responsive copy variant is
   specified.
4. **`Versions` tab count at 390px** is drawn with no count; the count rule ("absent at zero, the
   tab never is") does not say whether the phone tab drops it deliberately.
5. **The plum group-heading rule `#574463` and the black pip `#5B5566`** are traced values the
   handoff explicitly flags as the shipped page's to settle, not brand tokens.
6. **No `disabled` styling** is given for any Surface 1 control (only the words `Discarding…` and
   "both controls disabled").
7. **No focus-order or `aria` markup** beyond three named accessible names (`pending add`, the row's
   availability word) and "focus the deck name after a discard".
