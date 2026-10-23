# Design Property Table — Combos one piece away, UI-3 (card details block + the combo over a card)

Sources (design only): `design/design_handoff_the99_combos_close/` README (call 5), STATES (S10–S15), READINESS
(Green, R1b; errata E1–E5); Card-Details board (extracted `Card-Details.txt`, `cd.css`); How-It-Works board
(`How-It-Works.txt`, `hiw.css`) for the combo body, since Card-Details draws no combo over a card; `ui3-spec.md`, whose
"Recommend" lines are ratified design calls (cited as OPEN-n).

Conventions: values are the board's CSS unless a column says "ratified" (an OPEN item overrides the board). Fonts are
the board's literal families: **Mono** = IBM Plex Mono, **Sans** = IBM Plex Sans (body default), **Display** = Cinzel.
`—` = the design explicitly sets none / the element is absent. Blank properties the design does not set are omitted.
Copy is recorded as STRUCTURE, not wording.

Board fixture: Polyraptor (×0) opened in HD - Gishath; six partners (2 in deck, 1 spare, 1 in HD - Tovolar, 2 to buy).

---

## 1. Block chrome (`.blk2.cbk`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Host | inside full card sheet `.cdf .in` (padding 6px 20px 0, flex column) | inside desktop card modal right column `.cmx .rc3` (padding 30px 30px 22px, flex column) |
| Order in column | after rules text block / Bracket facts, before "In this deck" / availability block | same |
| margin-top | 16px | board 20px (`.cmx .blk2`); **ratified 22px** (shipped, OPEN-12) |
| padding | 14px 16px | 18px 20px |
| border-radius | 10px | 10px |
| background | `var(--bg)` | `var(--bg)` |
| border | 1px solid `var(--border)` | same |
| Absent | no lines → no block, no heading, nothing reserved | same |

## 2. Header row (`.cbk .hr`)

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Element | whole row is the disclosure button (inside a heading, shipped) | same |
| display | flex, align-items center | same |
| gap | 10px | 10px |
| min-height | board 40px; **ratified 52px** (shipped, OPEN-12/spec 1.2) | board 40px; **ratified 52px** |
| Text column | flex column, gap 3px, flex 1, min-width 0 (label over summary/scope) | board: same column; **ratified: label and summary/scope on one line from `sm`** (shipped, OPEN-12) |

### 2a. Glyph (lemniscate `.lem`, header)

| Property | Mobile | Desktop |
|---|---|---|
| SVG | width 16, height 16, viewBox `0 0 16 16`, `aria-hidden` | same |
| Path | fill none, stroke currentColor, stroke-width 1.8, stroke-linecap round | same |
| color | `var(--fact)` | same |
| filter | `drop-shadow(0 0 3px color-mix(in oklab, var(--fact) 45%, transparent))` | same |
| display / flex | block, flex none | same |

### 2b. Label (`.blk2 .h`) — static block label ("two-card combos")

| Property | Mobile | Desktop |
|---|---|---|
| font | Mono 10px | same |
| letter-spacing | .1em | same |
| text-transform | uppercase | same |
| color | `var(--fg-faint)` | same |

### 2c. Summary (`.cbk .sum`) — CLOSED only; counts joined by ` · `

| Property | Mobile | Desktop |
|---|---|---|
| font | Mono 10.5px (spec: 10px, 10.5 from `sm`, shipped) | Mono 10.5px |
| color | `var(--fg-muted)` | same |
| layout | flex 1, min-width 0, nowrap, overflow hidden, ellipsis | same |
| "N in this deck" segment | color `var(--success)` | same |
| "N you own" / "N you don't" | summary ink (`--fg-muted`) | same |
| Structure | counts in order inDeck, owned (spare+elsewhere), notOwned; zero count omitted; interpolates each count | same |
| Desktop frame | — (1300 closed not drawn; shipped) | — |

### 2d. Scope line (`.cbk .hr .sc`) — OPEN only, deck in scope; replaces summary

| Property | Mobile | Desktop |
|---|---|---|
| font | Mono 10px (spec: 10.5 from `sm`) | Mono 10px |
| color | `var(--fg-locked)` | same |
| layout | flex 1, min-width 0, nowrap, overflow hidden, ellipsis | same |
| Structure | "against {deckName}", interpolates the OPENING deck's name (OPEN-12) | same |
| Deck-less | — (nothing takes the summary's place) | — |

### 2e. Qualifier marker (`.cbk .hr .st`) — OPEN only

| Property | Mobile | Desktop |
|---|---|---|
| glyph | `*` | same |
| font | Mono 11px | same |
| color | board `var(--accent)`; spec/shipped `--accent-text` | same |
| width | board 28px, text-align center; ratified hit 44×52 (sibling button) | same |
| Press | toggles shipped qualifier (Mono 11px, `--fg-muted`, line-height 1.45, mt 8px), unchanged | same |
| Closed | — | — |

### 2f. Chevron (`.cbk .hr .ch`)

| Property | Mobile | Desktop |
|---|---|---|
| glyph | ▾ closed / ▴ open (board text glyph; shipped `Chevron kind="disclosure"`) | same |
| color | `var(--fg-faint)` | same |
| font-size | 12px | same |

## 3. Open list (`.cbk ul`)

| Property | Mobile | Desktop |
|---|---|---|
| list-style | none | same |
| margin | 6px 0 0 | same |
| padding | 0 | same |
| display | flex column, gap 0 | same |
| Semantics | preferred: two `ul`s each preceded by an `h4` (same pixels) | same |

### 3a. Group heading (`li.gh`) — deck in scope AND opened card in scope only

| Property | Mobile | Desktop |
|---|---|---|
| font | Mono 9px | same |
| letter-spacing | .12em | same |
| text-transform | uppercase | same |
| color | `var(--fg-faint)` | same |
| padding | 10px 0 4px | same |
| min-height | 0 (inline override of `li` 44px) | same |
| border-top | 1px solid `var(--border)` (inline) | same |
| count after heading | — | — |
| Structure | group 1 static "whole in this deck"; group 2 static "one piece away · you hold the rest" (U+00B7) | same |
| Empty group | heading not drawn | same |
| Next line | `.gh + li { border-top: 0 }` | same |

### 3b. Combo line (`.cbk li`) — identical at both widths (no 1300 override)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex, align-items center | same |
| gap | 10px | same |
| min-height | 44px | same |
| border-top | 1px solid `var(--border)` | same |
| Element | plain container (holds a link), not a button; click outside `a, button` opens the combo | same |
| Pressed (`.press`) / focus-visible of the `›` button | outline 2px solid `var(--accent)`, outline-offset 2px, border-radius 6px | same |
| transition | — | — |

### 3c. Line glyph (`.lem`) + marks

| Property | Mobile | Desktop |
|---|---|---|
| Lemniscate | as 2a (16×16, viewBox 0 0 16 16, stroke 1.8, `--fact`, glow) | same |
| Turn-again mark | when combo produces infinite turns: extra-turns fact mark with loop tooltip, BESIDE the glyph (line stays 44px) — OPEN-13, not drawn on board | same |

### 3d. Text column (`.cbk li .t`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex 1, min-width 0, flex column, gap 2px | same (two lines at 1300 too) |

### 3e. Line 1 (`.p1`) — "with {partner}"

| Property | Mobile | Desktop |
|---|---|---|
| font | Sans 13px | same |
| color | `var(--fg-body)` | same |
| overflow | nowrap, hidden, ellipsis | same |
| Lead | static lead word, interpolates partner name after it | same |
| Partner name `b` | weight 600, `var(--fg)`; NOT underlined, NOT a button (switch on) | same |
| Commander tag | after name when partner is a scope commander: Mono 10px `--fg-faint`, ml 4px (OPEN-13, not drawn) | same |

### 3f. Line 2 — where-line (`.p2`)

| Property | Mobile | Desktop |
|---|---|---|
| display | flex, align-items center | same |
| gap | 7px | same |
| font | Mono 10px | same |
| color | `var(--fg-body)` | same |

Where-line variants (shared with list sheet, `on="row"`):

| Variant | Dot | Text | Mobile | Desktop |
|---|---|---|---|---|
| inDeck | `.od` 8×8, radius 50%, bg `var(--success)`, flex none, inline-block | static "in this deck" in `.ok` color `var(--success)` | ✓ | same |
| spare | `.od` (green) | static "spare in your collection", `--fg-body` | ✓ | same |
| elsewhere | `.od` (green) | "in {deck}", deck name `.dlk` link to `/decks/{id}`; first committed deck; further decks `+N` in `--fg-faint` | ✓ | same |
| notOwned, priced | `.od.no`: bg transparent, border 1.5px dashed `var(--fg-locked)`, 8×8 | buy tag `.btag` (price, interpolates cents; finish qualifier after) | ✓ | same |
| notOwned, sold out | `.od.no` | sold-out word, `--fg-muted` (spec) | ✓ | same |
| notOwned, never stocked | `.od.no` | — | ✓ | same |

### 3g. Deck link (`.dlk`)

| Property | Mobile | Desktop |
|---|---|---|
| color | `var(--fg-body)` | same |
| text-decoration | underline, color `var(--border-strong)`, underline-offset 2px | same |
| hit area | padding 12px 0; margin -12px 0 (44px tall); UI-1 uses 15px | same |
| Pressed (`.hit`) | outline 2px solid `var(--accent)`, offset 2px, radius 3px, padding 0, margin 0 | same |
| Press | navigates to deck; does NOT open the combo | same |

### 3h. Buy tag (`.btag`)

| Property | Mobile | Desktop |
|---|---|---|
| font | Mono 10px | same |
| color | `var(--warning)` | same |
| border | 1px solid `var(--accent-shadow)` | same |
| border-radius | 4px | same |
| padding | 0 5px | same |
| line-height | 15px | same |

### 3i. Open chevron (`.cbk li .cv`)

| Property | Mobile | Desktop |
|---|---|---|
| glyph | `›` | same |
| color | `var(--fg-faint)` | same |
| width | 20px, text-align center | same |
| Element | the line's real button; aria-label interpolates "{card} + {partner}" (placeholder copy) | same |
| Stacked card (OPEN-9) | — (column absent, line not pressable) | — |

## 4. Order and grouping

| Case | Mobile | Desktop |
|---|---|---|
| Deck in scope, opened card in scope | G1 = inDeck partners, read order; G2 = spare, then elsewhere, then to buy cheapest first, unpriced last (OPEN-7; board draws $34.20 above $3.10 as fixture order) | same |
| Deck in scope, opened card NOT in scope (OPEN-6) | flat list, no headings; scope line kept; inDeck partners first, then spare, elsewhere, to buy | same |
| Deck-less | flat list, no headings, no scope line; spare, elsewhere, to buy (cheapest first, unpriced last) | same |
| Deck-scoped non-addable partner (OPEN-5) | omitted from both groups and the closed counts | same |
| Closed counts | computed from the same deduped list as the open list (OPEN-1) | same |

## 5. Combo over a card (S10/S11 shape, opened from a line) — not drawn on Card-Details; body from How-It-Works, header per OPEN-8

### 5a. Container

| Property | Mobile (390) | Desktop (1300) |
|---|---|---|
| Shell | sheet `.bs`: absolute, left/right/bottom 0, bg `var(--surface)`, border-top 1px `var(--border-strong)`, radius 18px 18px 0 0, flex column, shadow `0 -14px 40px rgba(0,0,0,.6)`; spec: covers the card full height | modal `.md`: absolute, left 50%, translateX(-50%), top 70px (spec: "40px down"), width **760px**, bg `var(--surface)`, border 1px `var(--border-strong)`, radius 14px, shadow `0 24px 60px rgba(0,0,0,.6)`, flex column |
| Grabber `.gr` | 40×4, radius 9px, `var(--border-strong)`, margin 8px auto 2px | — |
| Scrim | `.scrim` rgba(8,6,5,.62) on list frames; over a card spec says the card is held `covered` | spec: "a lighter scrim" than the card modal's `.scrimd` rgba(8,6,5,.86) |
| Card underneath | kept mounted (scroll, block open), drawn covered | same |

### 5b. Back bar (`.bk2`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, align-items center, gap 8px | same |
| min-height | 52px | same |
| padding | 0 8px 0 16px | same |
| border-bottom | 1px solid `var(--border)` | same |
| font | Sans 500 13.5px, `var(--fg)` | same |
| Arrow `.ar` | `←`, 16px, `var(--fg-muted)` | same |
| Label | interpolates the opened CARD's name (`← {card}`); aria "Back to {card}" (OPEN-8; board's list version reads "← N combos") | same |
| Close `.x` | ✕, margin-left auto, 44×44, flex center, `var(--fg-muted)` | same |

### 5c. Body (`.cbd`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex column, gap 14px, padding 14px 16px | flex ROW, gap 18px, padding 16px 18px |
| Plates row `.pls` | flex, gap 7px | flex none, align-self flex-start |
| Plate `.pl` | width 96px, flex column, gap 5px | same |
| Plate art | 96×134, radius 6px, border 1px `var(--border-strong)`, object-fit cover | same |
| Missing plate `.pl.miss` art | outline 1.5px dashed `var(--accent)`, offset 2px | same |
| Plate name `.pn` | 11px, line-height 1.3, `var(--fg-body)` | same |
| Plate where-line `.ps` | flex, center, gap 6px, Mono 10px, `--fg-body`, wrap; same variants as 3f (inDeck text in `--success`) | same |
| Plate order | opened card first, then partner (OPEN-10) | same |
| Opened card plate | not a press; where-line from the card's own state (OPEN-10) | same |
| Partner plate | press opens shipped card details stacked (S12) | same |
| Words column `.bd` | flex column, gap 11px, min-width 0, flex 1 | same |
| Title `h3` | Display 700 16px/1.25, `var(--fg)`, flex, center, gap 8px, wrap; leading lemniscate 16×16 (viewBox 0 0 16 16, stroke 1.8); interpolates "{A} + {B}", ` + ` in `.pl2` `--fg-faint` weight 400 | same |
| Chips `.chp li` | Mono 9.5px, ls .1em, uppercase, radius 5px, border 1px `--border-strong`, padding 4px 9px, `--fg-body`; ul flex wrap gap 6px | same |
| Field `.fld` | flex column gap 5px; label Mono 9px ls .14em uppercase `--fg-faint`; order Mana needed, Steps, Needs | same |
| Mana value `.mv` | Mono 12px `--fg-body`; S13: "no mana" / "Spellbook doesn't say" (shipped) | same |
| Steps `ol` | margin 0, padding-left 17px, flex column gap 5px; li 12.5px/1.5 `--fg-muted` | same |
| Needs `p` | 12.5px/1.5 `--fg-muted` | same |

### 5d. Foot (`.cft`)

| Property | Mobile | Desktop |
|---|---|---|
| layout | flex, center, gap 12px | same |
| border-top | 1px solid `var(--border)` | same |
| padding | 12px 16px 18px | same |
| Spellbook link `.sb` (bottom left) | inline-flex, min-height 44px, Mono 10.5px, `var(--accent)`, underline `var(--accent)` offset 3px; static link label + ↗ | same |
| Add `.addb` (bottom right) | margin-left auto, 44px tall, padding 0 18px, radius 9px, border 1px `--border-strong`, `--fg`, Sans 600 13.5px; interpolates partner name | same |
| Add shown when | deck in scope AND opened on that deck's page AND line in group 2 AND partner addable (OPEN-11); else link alone | same |
| After Add | sheet closes back to the card; card re-reads; line moves to group 1 | same |

### 5e. Partner card stacked (S12, `.cs`)

| Property | Mobile | Desktop |
|---|---|---|
| Container | absolute inset 0, z 40, bg `var(--surface)`, flex column | shipped card modal (third layer), over the combo |
| Back `.bk` | flex center gap 8px, height 52px, padding 0 16px, border-bottom 1px `--border`, Sans 500 13.5px `--fg`; arrow 16px `--fg-muted`; label interpolates "{A} + {B}" | same label |
| Depth | card → combo → card max; its combo lines are not pressable (OPEN-9) | same |

## 6. Hover / focus / transitions

| Element | Mobile | Desktop |
|---|---|---|
| Line | pressed/focus-visible outline (3b) | same; no hover state drawn |
| Deck link | `.hit` outline (3g) | same; no hover drawn |
| Board `a:hover` | — (board-global `#DE9757`, not a component state) | — |
| Transitions | — none drawn | — |

## 7. Responsive differences (summary)

| Item | 390 | 1300 |
|---|---|---|
| Block padding / margin | 14/16, mt 16 | 18/20, mt 22 (ratified) |
| Header | label over summary/scope | one line from `sm` (ratified) |
| Lines | two-line (name over where-line) | two-line too (unlike shipped single row) |
| Combo container | bottom sheet with grabber | 760px modal |
| Combo body | column | row (plates left, words right) |

## State Coverage

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| S14 Closed | default (unless `initiallyExpanded`) | block chrome + header with summary counts + ▾ | per-state counts (inDeck, owned, notOwned) from the deduped combo list |
| S15 Open, deck in scope, card in scope | header pressed; `comboDeckOracleIds` includes the card | header with scope line, `*`, ▴; group 1 + group 2 headings and lines | deckName, card combos with `others[0].state`, where data (decks[0] id/name, +N, cents/soldOut/qualifier), produces (turn mark), commander flag |
| S15 group 1 empty / group 2 empty | no inDeck partners / no other partners | that group's heading and lines omitted | grouped list |
| Open, deck in scope, card NOT in scope (OPEN-6) | opened from Consider/Add/plate | scope line + flat list, no headings, inDeck first | deckName, combos |
| Open, deck-less | no deck scope (`/collection`, Home, Discover) | flat list, no headings, no scope line | combos |
| Stacked card, no press (OPEN-9) | card is stacked (`sheetsBelow > 0` or third layer) | lines without `›`, not pressable; deck link stays | stacked flag |
| Empty | no combos | nothing (block absent) | — |
| Switch off | `NEAR_COMBOS_ENABLED` off / no `cardCombos` | shipped block unchanged (partner name button) | `comboPartners` |
| Line pressed | `li` or `›` pressed | combo sheet over the card (5) | opened card, partner, steps, mana, prerequisites, produces/chips, art for both plates (OPEN-4) |
| Deck link pressed | elsewhere deck name | navigation to `/decks/{id}` | deck id |
| S10 To buy (over card) | pressed line partner notOwned | plates (partner dashed, buy tag), title, chips, fields, foot (+Add if OPEN-11) | price fields, deckId |
| S11 Owned (over card) | partner spare / elsewhere | same; only plate where-line changes | where data |
| S11 Whole (over card) | partner inDeck | same; foot link only | — |
| S12 Plate pressed | partner plate | shipped card details stacked, back "{A} + {B}" | backLabel |
| S13 No mana / unknown | `mana_needed` empty / missing | Mana needed value shipped fallback strings | manaNeeded |
| Add succeeded | Add pressed in foot | combo closes to card; card re-read; line in group 1 | evict + re-fetch |

## Design ambiguities

1. Closed frame counts read `2 in this deck · 2 you own · 2 you don't`; the board subtitle says shipped reads `2 · 1 · 7`. Resolved by OPEN-1 (counts from the new list).
2. 1300 frame's scope line says "against HD - Gishath" over an HD - Avatar Aang page; header 40px and margin 20 vs shipped 52/22. Resolved by OPEN-12.
3. Group 2 drawn $34.20 above $3.10 (not cheapest first). Resolved by OPEN-7 (cheapest first).
4. `*` drawn `--accent`, width 28 vs shipped `--accent-text`, 44×52 hit.
5. `.dlk` hit padding 12px (board) vs UI-1's 15px.
6. Combo over a card is not drawn anywhere (only "a line pressed"); header, width and scrim come from OPEN-8; board `.md` top is 70px vs spec "40px down"; 390 board sheet is bottom-anchored vs spec "covers full height".
7. Turn-again mark, commander tag, deck-less list, stacked no-press and empty states are not drawn (OPEN-13, OPEN-9, spec 1.3).
