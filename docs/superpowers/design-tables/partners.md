# Design Property Table — Partner Commanders

Source: `design/design_handoff_the99_partners/` (R2) — `README.md`, `INDEX.md`, `READINESS.md`,
`partners · copy strings.ts`, and the canvas (`The 99 - Partner Commanders.dc.html` /
`… (standalone).html`) plus `support.js`.

Decisions **17–23**. Breakpoint is **640px** (Tailwind `sm:`). "Mobile" = the canvas's 390px
frame (`spine-mobile`, rail phone rows); "Desktop" = the canvas's 1180px frame
(`spine-desktop`) and the 334px Home resume card, which is drawn identically at both widths.

Values marked **(#473, unchanged)** are inherited wash geometry the handoff explicitly does not
reopen; they are listed because the pair caption sits inside them and a verifier must not read
their presence as new work.

Copy is enumerated as **structure only** — which key renders and with what arguments. All keys
live on `partnerCopy` in `src/lib/copy/deck-import.ts` under `deckImportCopy.commander` unless
stated otherwise.

---

## Component: Deck header caption — pair name group (decisions 18, 22)

`spine-desktop.tsx:79-84` · `spine-mobile.tsx:63-68`. Renders only when the deck has a partner;
a single-commander caption is unchanged at both widths.

### Wash container (#473 — context for the caption's insets)

> **Errata (2026-09-12), per column — this table's two columns use different strategies.** Mobile is
> `cover`, whose full-bleed art is its only art layer and is untouched. Desktop is `left-portrait`,
> so its `ambient layer` cell IS the removed copy (PR #517, ratified the same day) — struck below.
> The desktop `sharp portrait layer` opacity is **`.92`**, not the `.8` this table predates
> (`PORTRAIT_BANDS[168].sharpOpacity`). The band-72 section further down is the same story, struck
> there. An earlier version of this note called the whole row untouched; it was reading one strategy
> across both columns.

| Property | Mobile | Desktop |
|----------|--------|---------|
| strategy | `cover` | `left-portrait` |
| band | — (177px at a 390px frame, 2.2:1) | `band={168}` (`min-height: 168px`) |
| width drawn | 390 | 1180 |
| overflow | hidden | hidden |
| border | 1px solid var(--border) | 1px solid var(--border) |
| border-radius | 14 | 14 |
| background | color-mix(in srgb, var(--bg) 86%, black) | var(--bg) |
| ambient layer | position absolute; inset 0; `art_crop`; background-size cover; background-position center top; opacity ~~0.58~~ **0.80** — the `cover` strategy's own art layer: not removed, but lifted, `COVER_ART_OPACITY` | ~~position absolute; inset 0; `art_crop`; background-size cover; background-position center top; opacity 0.2~~ — **REMOVED 2026-09-12, see the errata above** |
| sharp portrait layer | — | position absolute; top 0; bottom 0; left 0; width 230; background-size auto 100%; background-position left center; background-repeat no-repeat; opacity ~~0.8~~ **0.92** (the lift; `PORTRAIT_BANDS[168]`); mask-image linear-gradient(90deg,#000 0 58%,transparent 100%) |
| horizontal scrim | — | position absolute; inset 0; linear-gradient(90deg, color-mix(in oklab, var(--bg) 30%, transparent) 0px, color-mix(in oklab, var(--bg) 26%, transparent) 134px, color-mix(in oklab, var(--bg) 78%, transparent) 230px, var(--bg) 240px) |
| vertical scrim | position absolute; inset 0; linear-gradient(180deg, color-mix(in oklab, var(--bg) 66%, transparent) 0%, color-mix(in oklab, var(--bg) 22%, transparent) 26%, color-mix(in oklab, var(--bg) 62%, transparent) 50%, color-mix(in oklab, var(--bg) 90%, transparent) 100%) | position absolute; inset 0; linear-gradient(180deg, color-mix(in oklab, var(--bg) 30%, transparent) 0%, color-mix(in oklab, var(--bg) 10%, transparent) 46%, color-mix(in oklab, var(--bg) 42%, transparent) 100%) |
| type block | position absolute; left 18; right 18; bottom 12; display flex; flex-direction column; align-items center; gap 6 | position relative; display flex; align-items center; min-height 168; padding 0 24px 0 254px; gap 18 |
| type column width available | 354 | 644 |

### Deck title row (#473, unchanged)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — (title is a plain block in the column) |
| align-items | flex-start | — |
| justify-content | center | — |
| gap | 8 | — |
| max-width | 100% | — |
| title font-family | var(--display), serif | var(--display), serif |
| title font-weight | 700 | 700 |
| title font-size | 20 | 21 |
| title line-height | 1.25 | 1.2 |
| title text-align | center | left (default) |
| title color | var(--fg) | var(--fg) |
| title text-shadow | 0 1px 4px rgba(0,0,0,0.85) | — |
| rename affordance | 44×44; flex none; border-radius 8; border 1px solid var(--border-strong); background var(--surface-sunken); color var(--fg); display flex; align-items center; justify-content center; font-size 15 | — (#473's rename field, 352×29, unchanged) |

### Caption row (`metaRow`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-wrap | wrap | wrap |
| align-items | center | center |
| justify-content | center | — (flex-start default) |
| gap | 8 | 10 |
| margin-top | — (parent gap 6) | 3 |
| min-width | 100% max-width; min-width 0 on children | 0 |
| child order | names group, pips, status pill | pips, names group, status pill |
| wrap behaviour | two names occupy their own line (~336 of 354px); pips and pill wrap to the line below | no wrap at 1180 (~547 of 644px used); ordered shrink engages 768–~1085px |

### Union colour pips

| Property | Mobile | Desktop |
|----------|--------|---------|
| wrapper display | flex | flex |
| wrapper gap | 3 | 3 |
| wrapper flex | none | none |
| pip width | 10 | 10 |
| pip height | 10 | 10 |
| pip border-radius | 999px | 999px |
| pip display | block | block |
| pip background | var(--w) / var(--u) / var(--b) / var(--r) / var(--g) per colour in the union | same |
| set membership | union of both commanders' identities (§2 colour rule; eng-carried) | same |

### Pair names group (the ordered shrink)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 4 | 5 |
| font-family | 'IBM Plex Mono', monospace (var(--font-mono)) | 'IBM Plex Mono', monospace (var(--font-mono)) |
| font-size | 10 | 11 |
| color | var(--fg-body) | var(--fg-body) |
| text-shadow | 0 1px 4px rgba(0,0,0,0.85) | — |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| copy structure | `{primary} + {partner}` — data, not a copy key; joiner is a literal ` + ` | `{primary} + {partner} · {colorLabel(union)}` |

#### Primary name span

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 0 1 auto | 0 1 auto |
| flex-shrink | 1 | 1 |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |
| white-space | nowrap | nowrap |
| content | full `commander.name` (never shortened on this surface) | full `commander.name` |
| border-bottom | — | — |
| card trigger | — (its trigger is the band; mobile has `bandTapTarget={false}`) | — (its trigger is the 230px portrait) |

#### Joiner span

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | none | none |
| content | `+` | `+` |
| position | leads the shrinking span, so it can never be the character truncation eats | same |

#### Partner name span (also the partner's card trigger)

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 0 1 auto | 0 1 auto |
| flex-shrink | 1000 | 1000 |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |
| white-space | nowrap | nowrap |
| border-bottom | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| content | full partner name | full partner name |
| role | card trigger — opens the partner's printing | card trigger — opens the partner's printing |
| accessible name | `partnerCopy.partnerCardAria(partner)` | `partnerCopy.partnerCardAria(partner)` |
| accent | never accent-marked | never accent-marked |
| open item | needs a focus style and a hit area clearing 44px (README open item 2) | needs a focus style (README open item 2) |

#### Identity label span

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **no** — drops on pair decks (~390 > 354px) | **yes** — stays on the line |
| flex | — | none |
| content | — | ` · {colorLabel(union)}` |
| separator glyph | — | `·` (never `+`, never `//`, never `&`) |

#### Forbidden implementation (explicit, both widths)

| Property | Mobile | Desktop |
|----------|--------|---------|
| `flex-none` on the primary span | prohibited — overflows the group and draws under the following content | prohibited — same |
| single string for both names | prohibited — must be two spans | prohibited — same |
| "2 commanders" badge | must not render | must not render |
| second portrait / diptych in the band | must not render | must not render |

### Status pill

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| flex | none | none |
| padding | 3px 7px | 3px 8px |
| border-radius | 6 | 6 |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10 | 11 |
| color | var(--fg-body) | var(--fg-body) |
| background | color-mix(in srgb, var(--fg-body) 14%, var(--bg)) | color-mix(in srgb, var(--fg-body) 14%, var(--bg)) |
| border | 1px dashed var(--border-strong) (Building) | 1px dashed var(--border-strong) (Building) |
| source | `statusPillStyle` verbatim — unchanged | `statusPillStyle` verbatim — unchanged |

### Deck count (the `/ 98` denominator, decisions 18 / 21 / 22)

| Property | Mobile | Desktop |
|----------|--------|---------|
| container display | flex | flex |
| container align-items | baseline | baseline |
| container gap | 4 | 4 |
| container margin-top | — (parent gap 8) | 5 |
| numerator font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| numerator font-weight | 600 | 600 |
| numerator font-size | 14 | 20 |
| numerator color | var(--fg) | var(--fg) |
| denominator font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| denominator font-weight | — (400) | — (400) |
| denominator font-size | 14 | 13 |
| denominator color | var(--fg-faint) | var(--fg-faint) |
| denominator value | `/ 98` for a pair, `/ 99` for a single — derived `deckBodySize = 100 − commanderCount`, never a literal | same |

### Progress bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 100% | 170 |
| height | 6 | 6 |
| border-radius | 999px | 999px |
| background | var(--elevated) | var(--elevated) |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.4) | inset 0 0 0 1px rgba(0,0,0,0.4) |
| overflow | hidden | hidden |
| margin-top | — (parent gap 8) | 6 |
| fill height | 100% | 100% |
| fill border-radius | 999px | 999px |
| fill background | var(--fg-body) | var(--fg-body) |
| fill width | numerator ÷ derived body size (drawn 87.8% = 86/98) | same |
| source | `statusBarStyle` verbatim; only the denominator input moves | same |

### Header footer block (mobile only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| flex-direction | column | — |
| align-items | center | — |
| gap | 8 | — |
| border-top | 1px solid var(--border) | — |
| padding | 14px 16px 12px | — |

### Header supporting line (desktop only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | 'IBM Plex Mono', monospace |
| font-size | — | 11 |
| color | — | var(--fg-faint) |
| margin-top | — | 6 |
| content | — | owned · to-buy line, unchanged |

### Header actions (desktop, #473 unchanged)

| Property | Mobile | Desktop |
|----------|--------|---------|
| container flex | — | none |
| container display | — | flex |
| container align-items | — | center |
| container gap | — | 9 |
| secondary height / padding | — | 32 / 0 14px |
| secondary border-radius | — | 8 |
| secondary font-size | — | 12.5 |
| secondary color / border | — | var(--fg) / 1px solid var(--border-strong) |
| primary height / padding | — | 32 / 0 14px |
| primary border-radius | — | 8 |
| primary font-size / weight | — | 12.5 / 600 |
| primary color / background | — | var(--bg) / var(--fg) |
| reserved width | — | ~240 |

---

## Component: Create picker — second commander slot (decisions 17, 20)

`create-picker.tsx`. One slot, drawn once, serving `mode="create"` and `mode="import"`.
**Desktop:** inside the Selected sidebar, under the primary. **Mobile:** in the scrolling flow
beside the name field — never in the dock (dock stays summary + button only).

### Sidebar / slot container

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 100% of the scrolling flow | 300 |
| border-radius | 12 | 12 |
| background | var(--surface-rail) | var(--surface-rail) |
| border | 1px solid var(--border) | 1px solid var(--border) |
| padding | 20 | 20 |
| display | flex | flex |
| flex-direction | column | column |

### "Selected" eyebrow

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10 | 10 |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |
| margin-bottom | 14 | 14 |

### Primary eyebrow (`Commander`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | only when the partner slot renders (never alone) | only when the partner slot renders |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9.5 | 9.5 |
| letter-spacing | 0.12em | 0.12em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |
| margin-bottom | 7 | 7 |
| copy key (create) | `partnerCopy.primaryLabel` | `partnerCopy.primaryLabel` |
| copy key (import) | `partnerCopy.primaryLabelFromSource` | `partnerCopy.primaryLabelFromSource` |

### Primary commander row (unchanged geometry, decision 17 floor)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | flex-start | flex-start |
| gap | 12 | 12 |
| thumb width | 44 | 44 |
| thumb height | 62 | 62 |
| thumb flex | none | none |
| thumb border-radius | 7 | 7 |
| thumb background | card image `center top / cover`, var(--elevated) | same |
| thumb box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| text block min-width | 0 | 0 |
| name font-family | var(--display), serif | var(--display), serif |
| name font-weight | 600 | 600 |
| name font-size | 15 | 15 |
| name line-height | 1.2 | 1.2 |
| name color | var(--fg) | var(--fg) |
| meta font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| meta font-size | 11 | 11 |
| meta color | var(--fg-muted) | var(--fg-muted) |
| meta margin-top | 3 | 3 |
| size rule | the primary never changes size — a single-commander sidebar is pixel-identical to today | same |

### Partner section wrapper

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered when | `partnerAbility(primary.oracleText)` returns non-null | same |
| margin-top | 16 | 16 |
| padding-top | 16 | 16 |
| border-top | 1px solid var(--border) | 1px solid var(--border) |

### Partner eyebrow (`Partner`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 9.5 | 9.5 |
| letter-spacing | 0.12em | 0.12em |
| text-transform | uppercase | uppercase |
| color | var(--fg-faint) | var(--fg-faint) |
| margin-bottom | 7 | 7 |
| copy key | `partnerCopy.partnerLabel` | `partnerCopy.partnerLabel` |

### Partner slot row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 11 | 11 |
| min-height | 44 | 44 |
| plate width | 38 | 38 |
| plate height | 54 | 54 |
| plate flex | none | none |
| plate border-radius | 6 | 6 |
| text block min-width | 0 | 0 |
| text block flex | 1 | 1 |
| title font-family | var(--display), serif | var(--display), serif |
| title font-weight | 600 | 600 |
| title font-size | 13.5 | 13.5 |
| title line-height | 1.25 | 1.25 |
| title color | var(--fg) | var(--fg) |
| caption font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| caption font-size | 10 | 10 |
| caption color | var(--fg-faint) | var(--fg-faint) |
| caption margin-top | 4 | 4 |
| caption line-height | 1.4 | 1.4 |
| accent | never accent-marked, in any state | never accent-marked |

#### Plate — State A (absent)

| Property | Mobile | Desktop |
|----------|--------|---------|
| whole partner section | not rendered (no eyebrows, no plate, no caption) | not rendered |
| disabled variant | must not exist | must not exist |

#### Plate — State B (empty and available)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | transparent | transparent |
| border | 1px dashed var(--border-dashed) | 1px dashed var(--border-dashed) |
| box-shadow | none | none |
| title copy key | `partnerCopy.addPartner` | `partnerCopy.addPartner` |
| caption copy key (n ≥ 1) | `partnerCopy.partnerAvailable(ability, n)` | same |
| caption copy key (n = 0) | `partnerCopy.partnerNoneOwned(ability)` | same |
| `ability` argument | printed verbatim from `partnerAbility(oracleText)` | same |
| `n` argument | `canPair` count over the player's owned legal commanders | same |
| n = 0 behaviour | ability still prints; plate still drawn; never disabled | same |
| accessible name | `partnerCopy.addPartnerAria(primary)` | same |
| actions row | not rendered | not rendered |
| optionality | Create is never blocked on this slot | same |

#### Plate — State C (import proposal)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | partner card image `center top / cover`, var(--elevated) | same |
| border | 1px dashed var(--border-dashed) | 1px dashed var(--border-dashed) |
| box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| title | partner's full name (data) | same |
| caption copy key | `partnerCopy.proposed(line)` | same |
| `line` argument | importer's `sourceLine` | same |
| accessible name | `partnerCopy.proposedAria(partner)` | same |
| actions row | rendered | rendered |
| illegal pairing | renders identically; the note is the importer's, not this slot's | same |

#### Actions row (State C only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| gap | 14 | 14 |
| margin-top | 9 | 9 |
| Change font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| Change font-size | 11 | 11 |
| Change color | var(--fg-body) | var(--fg-body) |
| Change border-bottom | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| Change copy key | `partnerCopy.change` | `partnerCopy.change` |
| Change action | re-opens the filtered list | same |
| Remove font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| Remove font-size | 11 | 11 |
| Remove color | var(--fg-faint) | var(--fg-faint) |
| Remove border-bottom | 1px solid var(--border) | 1px solid var(--border) |
| Remove copy key | `partnerCopy.remove` | `partnerCopy.remove` |
| Remove action | returns to State B | same |

### Deck-name field (unchanged, context)

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-top | 16 | 16 |
| width | 100% | 100% |
| padding | 11px 13px | 11px 13px |
| border-radius | 8 | 8 |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border | 1px solid var(--border-strong) | 1px solid var(--border-strong) |
| font-size | 14 | 14 |
| color | var(--fg) | var(--fg) |

### Submit button (unchanged, context)

| Property | Mobile | Desktop |
|----------|--------|---------|
| margin-top | 16 | 16 |
| display | flex | flex |
| align-items | center | center |
| justify-content | center | center |
| min-height | 44 | 44 |
| padding | 13px 0 | 13px 0 |
| border-radius | 8 | 8 |
| background | var(--fg) | var(--fg) |
| color | var(--bg) | var(--bg) |
| font-size | 15 | 15 |
| font-weight | 600 | 600 |
| dock summary copy | `addPanelCopy.createPicker.dockSummary(name, identity)` — takes the pair as one string, unchanged | same |

---

## Component: Re-headed commander list (while picking a partner, decision 20)

### List container

| Property | Mobile | Desktop |
|----------|--------|---------|
| border | 1px solid var(--border) | 1px solid var(--border) |
| border-radius | 10 | 10 |
| overflow | hidden | hidden |

### Pairing strip (new)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10 | 10 |
| padding | 10px 13px | 10px 13px |
| background | var(--surface-sunken) | var(--surface-sunken) |
| border-bottom | 1px solid var(--border) | 1px solid var(--border) |
| label font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| label font-size | 11 | 11 |
| label color | var(--fg-body) | var(--fg-body) |
| label flex | 1 | 1 |
| label min-width | 0 | 0 |
| label copy key | `partnerCopy.pairingFor(short, n)` | same |
| `short` argument | `shortCommanderName(primary.name)` | same |
| `n` argument | `canPair` count | same |
| Cancel font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| Cancel font-size | 11 | 11 |
| Cancel color | var(--fg-faint) | var(--fg-faint) |
| Cancel border-bottom | 1px solid var(--border) | 1px solid var(--border) |
| Cancel copy key | `partnerCopy.pairingCancel` | `partnerCopy.pairingCancel` |

### Commander row (shipped row, unchanged — must not change)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 14 | 14 |
| padding | 12px 15px | 12px 15px |
| background | var(--surface-rail) | var(--surface-rail) |
| thumb width | 40 | 40 |
| thumb height | 56 | 56 |
| thumb flex | none | none |
| thumb border-radius | 6 | 6 |
| thumb background | card image `center top / cover`, var(--elevated) | same |
| thumb box-shadow | inset 0 0 0 1px rgba(0,0,0,0.35) | inset 0 0 0 1px rgba(0,0,0,0.35) |
| text block flex | 1 | 1 |
| text block min-width | 0 | 0 |
| name font-family | var(--display), serif | var(--display), serif |
| name font-weight | 600 | 600 |
| name font-size | 16 | 16 |
| name line-height | 1.3 | 1.3 |
| name color | var(--fg) | var(--fg) |
| meta display | flex | flex |
| meta align-items | center | center |
| meta gap | 6 | 6 |
| meta margin-top | 5 | 5 |
| meta font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| meta font-size | 11 | 11 |
| meta color | var(--fg-muted) | var(--fg-muted) |
| meta pip width | 11 | 11 |
| meta pip height | 11 | 11 |
| meta pip border-radius | 999px | 999px |
| meta pip flex | none | none |
| meta pip display | block | block |
| meta pip background | var(--w)/--u/--b/--r/--g | same |
| radio width | 22 | 22 |
| radio height | 22 | 22 |
| radio flex | none | none |
| radio border-radius | 999px | 999px |
| radio border | 2px solid var(--border-dashed) | 2px solid var(--border-dashed) |

---

## Component: Deck rail — phone row (decision 21)

`deck-rail.tsx:123`. Primary art only; the pair signal is the denominator.

### Rail container

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 358 (drawn) | — (rail rows on desktop carry no pair signal; see below) |
| border-radius | 14 | — |
| overflow | hidden | — |
| border | 1px solid var(--border) | — |
| background | var(--surface-inset) | — |

### Rail row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | — |
| align-items | center | — |
| gap | 10 | — |
| min-height | 56 | — |
| padding | 12px 13px | — |
| border-left | 3px solid var(--fg-body) (Building) · 3px solid var(--accent) (to-buy) | — |
| border-bottom | 1px solid var(--border) between rows | — |
| art width | 26 | — |
| art height | 36 | — |
| art flex | none | — |
| art border-radius | 4 | — |
| art background | **primary** card image `center / cover`, var(--elevated) | — |
| diptych | must not render (26px spine; half is 12px of card frame) | — |
| text block flex | 1 | — |
| text block min-width | 0 | — |
| text block display | flex | — |
| text block flex-direction | column | — |
| text block gap | 3 | — |
| deck name font-family | var(--display), serif | — |
| deck name font-weight | 600 | — |
| deck name font-size | 14.5 | — |
| deck name color | var(--fg) | — |
| deck name overflow | hidden | — |
| deck name text-overflow | ellipsis | — |
| deck name white-space | nowrap | — |
| status font-family | 'IBM Plex Mono', monospace | — |
| status font-size | 10.5 | — |
| status color | var(--fg-body) (Building) · var(--accent) (to-buy) | — |
| count flex | none | — |
| count font-family | 'IBM Plex Mono', monospace | — |
| count font-size | 12 | — |
| count color | var(--fg) | — |
| count value | `86 / 98` for a pair, `93 / 99` for a single — derived denominator | — |
| accessible name | `partnerCopy.pairAria(primary, partner)` on pair rows | — |

### Desktop rail row

| Property | Mobile | Desktop |
|----------|--------|---------|
| pair signal | — | **none, by ruling.** The row prints the deck name and status word only; no art, no count, no commander, and no pair mark is added |

---

## Component: Home resume row (decisions 19, 23)

`resume-decks.tsx:115-145`. Drawn at 334×72 in Home's two-up column; the same at both widths.

### Row container

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| width | 334 (drawn) | 334 (drawn) |
| height | 72 | 72 |
| flex | none | none |
| border-radius | 12 | 12 |
| overflow | hidden | hidden |
| border | 1px solid var(--border) | 1px solid var(--border) |
| background | var(--surface-inset) | var(--surface-inset) |

### Art layers (`ArtWash` `left-portrait`, band 72 — primary only)

> **Errata (2026-09-12):** the three `ambient` rows below describe a full-bleed copy of the crop that
> `ArtWash` no longer draws — removed in PR #517 and ratified the same day, because past the
> portrait's own width it read as a second, differently-scaled rendering of the same picture. This
> table shares the primitive with `design-tables/art-wash.md`, which carries the same errata. The
> `portrait` and `scrim` rows are untouched; the portrait's opacity is **`.95`**, this table's `.85`
> predating the lift recorded in `design_handoff_the99_art_wash/`.

| Property | Mobile | Desktop |
|----------|--------|---------|
| ~~ambient position~~ | ~~absolute; inset 0~~ | ~~absolute; inset 0~~ |
| ~~ambient background~~ | ~~**primary** `art_crop` `center top / cover`~~ | ~~same~~ |
| ~~ambient opacity~~ | ~~0.14~~ | ~~0.14~~ |
| portrait position | absolute; left 0; top 0; bottom 0 | same |
| portrait width | 99 (= band 72 × 1.37) | 99 |
| portrait background | **primary** `art_crop` `left center / auto 100%` | same |
| portrait opacity | ~~0.85~~ **0.95** (the lift; `PORTRAIT_BANDS[72].sharpOpacity`) | ~~0.85~~ **0.95** |
| portrait mask-image | linear-gradient(90deg,#000 0 62%,transparent 100%) | same |
| scrim position | absolute; inset 0 | absolute; inset 0 |
| scrim background | linear-gradient(90deg, color-mix(in oklab, var(--surface-inset) 22%, transparent) 0px, color-mix(in oklab, var(--surface-inset) 18%, transparent) 58px, color-mix(in oklab, var(--surface-inset) 80%, transparent) 99px, var(--surface-inset) 138px) | same |
| diptych | must not render (halving to 49px invalidates every stop; crop becomes 0.68:1) | must not render |

### Content column

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | relative | relative |
| height | 100% | 100% |
| display | flex | flex |
| flex-direction | column | column |
| justify-content | center | center |
| gap | 4 | 4 |
| padding-left | 116 | 116 |
| padding-right | 18 | 18 |
| available width for the meta line | ~200 | ~200 |

### Deck title

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | var(--display), serif | var(--display), serif |
| font-weight | 600 | 600 |
| font-size | 14.5 | 14.5 |
| line-height | 1.2 | 1.2 |
| color | var(--fg) | var(--fg) |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |
| white-space | nowrap | nowrap |

### Meta line

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 14 | 14 |
| min-width | 0 | 0 |
| child order | status pill, names group, count figure, to-buy clause (single only) | same |

### Status pill

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | none | none |
| display | flex | flex |
| align-items | center | center |
| height | 19 | 19 |
| padding | 0 7px | 0 7px |
| border-radius | 5 | 5 |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10 | 10 |
| color | var(--fg-body) | var(--fg-body) |
| background | color-mix(in srgb, var(--fg-body) 14%, var(--bg)) | color-mix(in srgb, var(--fg-body) 14%, var(--bg)) |
| border | 1px dashed var(--border-strong) (Building) | 1px dashed var(--border-strong) |
| measured width | 62 | 62 |

### Pair names group (pair decks only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| display | flex | flex |
| gap | 4 | 4 |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10.5 | 10.5 |
| color | var(--fg-body) | var(--fg-body) |
| slot width available | ~64 (≈ ten characters) | ~64 |

#### Head span (primary, short name)

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 0 1 auto | 0 1 auto |
| flex-shrink | 1 | 1 |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |
| white-space | nowrap | nowrap |
| content | `shortCommanderName(primary.name)` — substring before the first comma; a comma-less name returns whole | same |

#### Tail span (joiner + partner, short name)

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | 0 1 auto | 0 1 auto |
| flex-shrink | 1000 | 1000 |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| text-overflow | ellipsis | ellipsis |
| white-space | nowrap | nowrap |
| content | `+ {shortCommanderName(partner.name)}` — the joiner leads this span | same |
| border-bottom | — (no card trigger on this surface) | — |

#### Single-commander name span (single decks only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| content | full `deck.commanderName`, unchanged — never shortened | same |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| white-space | nowrap | nowrap |
| text-overflow | ellipsis | ellipsis |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10.5 | 10.5 |
| color | var(--fg-body) | var(--fg-body) |

### Count figure (atomic, decision 23)

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | none | none |
| white-space | nowrap | nowrap |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10.5 | 10.5 |
| color | var(--fg-faint) | var(--fg-faint) |
| content | `{owned} / {derived body size}` — `86 / 98` pair, `93 / 99` single | same |
| measured width | 44 | 44 |
| truncation | never — the figure is atomic and may not ellipsise | never |
| prior behaviour overturned | `flex-1 min-w-0` (was the shrinking child) is replaced by `flex-none` | same |

### To-buy clause (droppable span)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered — pair deck | **never** | **never** |
| rendered — single deck with a roll-up entry | yes | yes |
| rendered — single deck with no roll-up entry | no (count alone, already shipped) | no |
| min-width | 0 | 0 |
| overflow | hidden | hidden |
| white-space | nowrap | nowrap |
| text-overflow | ellipsis | ellipsis |
| font-family | 'IBM Plex Mono', monospace | 'IBM Plex Mono', monospace |
| font-size | 10.5 | 10.5 |
| color | var(--fg-faint) | var(--fg-faint) |
| copy key | `refreshCopy.decks.detailCopies` — unchanged as a string | same |
| shrink role | on single decks this is the **only** shrinking child on the count side | same |
| measured width (long form) | ~113 (count + clause), vs 44 short form | same |
| abbreviation | prohibited — never shortened, abbreviated or ellipsised into a partial figure | prohibited |

### Accessible name (`sr-only`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| pair names | `partnerCopy.pairAria(primary, partner)` — both names in **full**, primary first | same |
| dropped clause | `partnerCopy.pairRowBuyAria(copies)` appended after `pairAria` on pair decks | same |
| rule | truncation is a layout compromise, never an information one | same |

---

## State Coverage

| State | Trigger | Component rendered | Key props / data required |
|---|---|---|---|
| **Picker A · absent** | `partnerAbility(primary.oracleText)` returns `null`, or nothing picked yet | Selected sidebar with **no** partner section and **no** `Commander` eyebrow — pixel-identical to today | `primary.oracleText` |
| **Picker B · empty and available** | `partnerAbility(...)` non-null, no partner chosen | Partner section: `Commander` + `Partner` eyebrows, 38×54 plate at `1px dashed var(--border-dashed)` on transparent, `addPartner` title, ability + `canPair` caption. No actions row | `ability` (verbatim), `n` = `canPair` count, `primary.name` for aria |
| **Picker B · n = 0** | as B, with `canPair === 0` | Same as B; caption uses `partnerNoneOwned(ability)`; plate still drawn, still enabled | `ability` |
| **Picker C · import proposal** | `mode="import"` and the paste yielded a partner on some `sourceLine` | Partner section with the partner's art behind the dashed plate, `proposed(line)` caption, `Change` / `Remove` actions; primary eyebrow becomes `primaryLabelFromSource` | partner card art, `sourceLine`, partner name |
| **Picker C · illegal pairing** | import proposed a pair the rules disallow | Renders **identically** to C; the warning note belongs to the importer, not the slot | same as C |
| **Picker · partner list re-headed** | player activated the empty plate or `Change` | Pairing strip above the shipped commander list; list rows unchanged | `shortCommanderName(primary.name)`, `canPair` count |
| **Header · single commander** | `commanderCount === 1` | Caption unchanged at both widths; denominator `/ 99` | `commander.name`, `colorLabel(identity)` |
| **Header · pair, desktop ≥ ~1085px** | `commanderCount === 2` | Caption `{primary} + {partner} · {colorLabel(union)}` on one line; union pips; `/ 98`; partner name underlined as its card trigger | both names, union identity, derived body size, partner printing id |
| **Header · pair, 768–~1085px** | pair, narrow desktop | Ordered shrink engages: `flex-wrap` spills pips and pill first, then the partner span (`flex-shrink: 1000`) ellipsises before the primary | same |
| **Header · pair, mobile** | pair, < 640px | **Amended 2026-09-13 (PR #577), superseding this row's original arrangement.** One line, left-aligned and non-wrapping: the status pill leads it, the union pips follow, then the names group, which is the only child that shrinks — `Atreus, Impulsive S… + Kratos, S…`. Identity label still **dropped**; `/ 98` still in the footer block. The original ruling gave the names their own wrapped line with pips and pill below it; the drawings this round was corrected against put the pill first on one line with the names beside it, and the pips were asked back after being cut. A wrapping row is also what broke the band's ramp: `labelAtPx` is measured against ONE 22px meta row, and a second line grew the block past it | both names, union identity, derived body size |
| **Rail · pair row (phone)** | pair deck in the phone rail | Primary art only at 26×36; count reads `86 / 98`; aria via `pairAria` | primary art, derived body size, both names for aria |
| **Rail · pair row (desktop)** | pair deck in the desktop rail | No pair signal by ruling — name and status word only | — |
| **Resume · single deck, clause fits** | single commander, roll-up has an entry | Full `deck.commanderName`, `93 / 99` pinned, to-buy clause rendered and is the only shrinking child | `deck.commanderName`, count, copies |
| **Resume · single deck, no roll-up entry** | single commander, no roll-up entry | Count alone (already-shipped state) | count |
| **Resume · pair deck** | `commanderCount === 2` | Two spans of short names joined by `+`, ordered shrink (`Ishai + Br…`), `86 / 98` pinned, **clause dropped**; clause restored in `sr-only` | both short names, both full names for aria, derived body size, copies for `pairRowBuyAria` |

---

## Cross-cutting prohibitions (both widths, every surface)

| Rule | Where it applies |
|---|---|
| No second portrait, thumb or diptych | deck header band, resume row, phone rail spine |
| No "2 commanders" badge and no added row | deck header caption |
| No accent on a proposal or a partner slot | picker states B and C (accent reserved for *in use* / *to buy*) |
| No `flex-none` primary in a name pair | deck header caption, resume row |
| No partially truncated figure | resume row count, header count |
| No disabled second slot | picker |
| Joiner is ` + ` only — never `·`, `//` or `&` | every surface that prints the pair |
| Denominator is derived (`100 − commanderCount`), never a literal | header, phone rail, resume row |
