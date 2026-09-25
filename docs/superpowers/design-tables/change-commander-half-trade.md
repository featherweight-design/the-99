# Design Property Table — Change commander: the half-trade (addendum)

Source: `design/design_handoff_the99_change_commander/addendum-half-trade/` (README.md, the canvas,
`Change Commander Sheet.dc.html` variants `confirmHalfTrade` / `halfTradeFailed` / `pairHalf`,
`Deck Page 1300.dc.html` + `Deck Page 390.dc.html` state `afterHalfTrade`, `Review Page.dc.html`
state `halfTrade`). Enumerated from the design files only. `—` = absent / not drawn.

Fixture: Thrasios + Tymna lead (WUBG, body 98). Ishai + Reyhan offered; Reyhan is in the 98.
Font names: "Plex Mono" = `'IBM Plex Mono',monospace`; "Plex Sans" = `'IBM Plex Sans',sans-serif`
(frame default). Only the elements that differ from shipped R3 are enumerated, plus the shipped
elements they sit inside where a value is needed to place them.

---

## A. Confirm sheet — `confirmHalfTrade` (frames 1a desktop, 1b phone)

### A1. Sheet chrome (shipped, values used by the variant)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A1.1 | Sheet title | text | `Change pair` | `Change pair` |
| A1.2 | Sheet aside | text | `HD - Thrasios & Tymna` | `HD - Thrasios & Tymna` |
| A1.3 | Sheet box | position / size | absolute; left 0, right 0, top 52, bottom 0 | relative; width 700; max-height 708 |
| A1.4 | Sheet box | background | `var(--surface-raised)` | `var(--surface-raised)` |
| A1.5 | Sheet box | border | border-top 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |
| A1.6 | Sheet box | radius | 14px 14px 0 0 | 14px |
| A1.7 | Body box | padding / gap | 16px 18px 22px; column; gap 16 | 16px 18px 22px; column; gap 16 |
| A1.8 | Back link `← All candidates` | type / colour | Plex Mono 11px, `var(--fg-faint)`; min-height 32; gap 7 | same |

### A2. Plates row (shipped container)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A2.1 | Plates row | layout | flex; align-items flex-start; justify center | same |
| A2.2 | Plates row | gap / padding | gap 14; padding 4px 0 2px | same |
| A2.3 | Each side column | layout | flex column; align center; gap 8; min-width 0 | same |
| A2.4 | Tile group (per side) | layout | flex row; gap 6 | same |
| A2.5 | Tile box | layout | flex column; gap 6 | same |
| A2.6 | Tile box | width (pair) | 68px | 84px |
| A2.7 | Tile art | size | width 100%; aspect-ratio 63 / 88 | same |
| A2.8 | Tile art | border / radius / bg | 1px solid `var(--border-strong)`; radius 8; bg-color `var(--elevated)`; image `normal`, cover, center | same |
| A2.9 | Tile name | type | Plex Sans 11.5px; line-height 1.3; `var(--fg-body)`; center | same |
| A2.10 | Pips under each side | size / gap | 13px pips; gap 3; `+` sep Plex Mono 11px `var(--fg-faint)`, padding 0 3px | same |
| A2.11 | Out pips (cost) | value | `{G}{U}` + `{1}{W}{B}` | same |
| A2.12 | In pips (cost) | value | `{2}{W}{U}` + `{1}{B}{G}` | same |
| A2.13 | In relative MV line | type / text | Plex Mono 11px; lh 1.4; `var(--fg-muted)`; center; `(2 more than Thrasios & Tymna)` (computed: MV 7 vs 5) | same |
| A2.14 | In pips + rel wrapper | layout | flex column; align center; gap 4 | same |

### A3. Out label (NEW text)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A3.1 | Out label | text | `Leave the command zone` | `Leave the command zone` |
| A3.2 | Out label | family / size | Plex Mono 10px | Plex Mono 10px |
| A3.3 | Out label | letter-spacing / case | 0.12em; uppercase | 0.12em; uppercase |
| A3.4 | Out label | color | `var(--warning)` | `var(--warning)` |
| A3.5 | Out label | weight / line-height | — (inherited) | — |

### A4. Arrow and in label

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A4.1 | Arrow | glyph | `→` (not ⇄) | `→` |
| A4.2 | Arrow | type | Plex Mono 18px; `var(--fg-faint)` | same |
| A4.3 | Arrow | layout | flex none; align-self center; margin-top −30px; aria-hidden | same |
| A4.4 | In label | text | `Lead the deck` | `Lead the deck` |
| A4.5 | In label | type | Plex Mono 10px; 0.12em; uppercase | same |
| A4.6 | In label | color | `var(--success)` | `var(--success)` |

### A5. Per-card fate lines (NEW — `t.sub`, shown when `t.hasSub`)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A5.1 | Fate line | family / size | Plex Mono 10px | Plex Mono 10px |
| A5.2 | Fate line | line-height | 1.35 | 1.35 |
| A5.3 | Fate line | color | `var(--fg-muted)` | `var(--fg-muted)` |
| A5.4 | Fate line | align | center | center |
| A5.5 | Fate line | position | last child of tile box, below name (tile gap 6) | same |
| A5.6 | Fate line | weight / letter-spacing / case | — | — |
| A5.7 | Out tile 1 (Thrasios), stay = Thrasios | text | `into the 98` | `into the 98` |
| A5.8 | Out tile 2 (Tymna), stay = Thrasios | text | `leaves the deck` | `leaves the deck` |
| A5.9 | Out tiles, stay = Tymna | text | Thrasios `leaves the deck`; Tymna `into the 98` | same |
| A5.10 | In tile 1 (Ishai) | text | `free` (= `sheet.free`) | `free` |
| A5.11 | In tile 2 (Reyhan, from body) | text | `from the 98` | `from the 98` |
| A5.12 | In tile that is to buy | content | shipped buy tag, not a word (README; not drawn) | same |
| A5.13 | Fate lines on ordinary swap / trade / pair | render | — (no sub) | — |

### A6. "Which one stays" block (NEW — `halfTrade` only)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A6.1 | Block placement | order | after plates row, before sentence block | same |
| A6.2 | Block wrapper | layout | flex column; align-items center; gap 8; `data-stays="true"` | same |
| A6.3 | Question label | text | `Which one stays in the 98?` (`staysQuestion(body)`) | same |
| A6.4 | Question label | type | Plex Mono 10.5px; `var(--fg-muted)`; no uppercase, no letter-spacing | same |
| A6.5 | Question label | id | `stays-label` | same |
| A6.6 | Radiogroup well | role / labelling | `role="radiogroup"`, `aria-labelledby="stays-label"` | same |
| A6.7 | Radiogroup well | layout | flex; gap 4 | flex; gap 4 |
| A6.8 | Radiogroup well | padding | 3px | 3px |
| A6.9 | Radiogroup well | radius | 10px | 10px |
| A6.10 | Radiogroup well | border | 1px solid `var(--border-strong)` | 1px solid `var(--border-strong)` |
| A6.11 | Radiogroup well | background | `var(--bg)` | `var(--bg)` |
| A6.12 | Radiogroup well | width | 100% | auto |
| A6.13 | Option | role / state | `role="radio"`, `aria-checked`, `tabindex="0"`, onClick picks | same |
| A6.14 | Option | order / text | `Thrasios`, `Tymna` (short names, commander column first) | same |
| A6.15 | Option | layout | flex; align center; justify center; gap 8 | same |
| A6.16 | Option | flex | 1 (equal halves) | none |
| A6.17 | Option | min-height | 44px | 34px |
| A6.18 | Option | padding | 0 14px | 0 14px |
| A6.19 | Option | radius | 7px | 7px |
| A6.20 | Option | font-size | 13px (Plex Sans) | 13px |
| A6.21 | Option | cursor | pointer | pointer |
| A6.22 | Option — selected | weight | 600 | 600 |
| A6.23 | Option — selected | color | `var(--fg)` | `var(--fg)` |
| A6.24 | Option — selected | background | `var(--elevated)` | `var(--elevated)` |
| A6.25 | Option — unselected | weight | 500 | 500 |
| A6.26 | Option — unselected | color | `var(--fg-muted)` | `var(--fg-muted)` |
| A6.27 | Option — unselected | background | transparent | transparent |
| A6.28 | Dot | size / radius | 8×8; 50%; flex none | same |
| A6.29 | Dot — selected | fill / border | `var(--accent)` solid; border none | same |
| A6.30 | Dot — unselected | fill / border | transparent; 1.5px solid `var(--fg-faint)` | same |
| A6.31 | Default selection | value | `departing[0]` = Thrasios (state `stay: 0`) | same |
| A6.32 | Option hover / focus | style | — (not drawn) | — |
| A6.33 | Option label border / letter-spacing | — | — | — |

### A7. Sentence block

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A7.1 | Block | layout | flex column; gap 9; padding-top 12; border-top 1px solid `var(--border)` | same |
| A7.2 | Sentence | type | Plex Sans 14px; lh 1.6; `var(--fg)`; text-wrap pretty; margin 0 | same |
| A7.3 | Sentence (stay Thrasios) | text | `Reyhan leaves the 98 for the command zone, and Ishai joins it there. Thrasios takes Reyhan's slot, and Tymna leaves the deck. The deck stays at 98.` | same |
| A7.4 | Sentence (stay Tymna) | text | `… Tymna takes Reyhan's slot, and Thrasios leaves the deck. The deck stays at 98.` | same |
| A7.5 | Buy line | render | — (fixture owns both; shipped buy line unchanged when present) | — |
| A7.6 | Lands line | text | `Lands in your pending changes, not yet a version. Discard puts all three back where they were.` (`landsHalfTrade`) | same |
| A7.7 | Lands line | type | Plex Mono 10.5px; lh 1.6; `var(--fg-faint)`; text-wrap pretty | same |

### A8. Footer buttons

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| A8.1 | Foot row | layout | flex column; gap 8; margin-top auto | flex row; align center; gap 10; padding-top 4 |
| A8.2 | Primary | text | `Make Ishai and Reyhan commanders` | same |
| A8.3 | Primary | style | min-height 44; padding 0 20px; radius 8; bg `var(--fg)`; color `var(--bg)`; 600; 14px; center | same |
| A8.4 | Secondary | text / style | `Back to the list`; min-height 44; padding 0 18px; radius 8; 1px solid `var(--border-strong)`; 500; 13.5px; `var(--fg-muted)` | same |

## B. Confirm sheet — `halfTradeFailed` (frame 1c, drawn at 390 only)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| B.1 | Everything in A | render | unchanged, incl. fate lines, radiogroup and chosen option (choice kept) | not drawn (same rules apply) |
| B.2 | Primary | text | `Try again` | — |
| B.3 | Failed line | placement | after the foot row (below the buttons) | — |
| B.4 | Failed line | text | `We couldn't change the commanders. Thrasios and Tymna still lead this deck.` (shipped `failedPair`) | — |
| B.5 | Failed line | role | `alert` | — |
| B.6 | Failed line | type | Plex Mono 11px; lh 1.55; margin 0 | — |
| B.7 | Failed line | color | `var(--danger)` | — |

## C. List row — `pairHalf` (frame 2a, drawn at 1300 only)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| C.1 | Group | heading / note | not drawn | `Yours · 3` / `by figure`; then `To buy · 1` / `a half to buy` |
| C.2 | Row position | order | — | first row of `Yours` |
| C.3 | Row figure | text | — | `41 of 58 are in their decks` |
| C.4 | Half 1 | mark | — | `Ishai, Ojutai Dragonspeaker` + shipped `free` (6px `var(--success)` dot, Plex Mono 10.5px `var(--fg-body)`) |
| C.5 | Half 2 | prefix | — | `+` 13px `var(--fg-faint)`, margin-right −4px |
| C.6 | Half 2 | mark | — | `Reyhan, Last of the Abzan` + shipped `in this deck · trades places` |
| C.7 | `in this deck · trades places` | type | — | Plex Mono 10.5px; `var(--fg-muted)`; flex none; middot `var(--border-strong)` padding 0 4px |
| C.8 | Row pips | value | — | `{2}{W}{U}` + `{1}{B}{G}` |
| C.9 | New string | — | — | none (README: no new string) |

## D. Deck page — `afterHalfTrade` (frames 3a 1300, 3b 390; `controls="joined"`)

### D1. Band

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| D1.1 | Commanders | names | `Ishai, Ojutai Dragonspeaker` + `Reyhan, Last of the Abzan` | same |
| D1.2 | Deck name | text | `HD - Thrasios & Tymna` | same |
| D1.3 | Body | value | 98 | 98 |
| D1.4 | Pips | colours | w, u, b, g | w, u, b, g |
| D1.5 | Colour label | text | `Naya` (as drawn) | `Non-red` |
| D1.6 | Status pill | text / colours | `Complete`; `var(--success)` on `color-mix(in srgb, var(--success) 18%, var(--bg))` | same |
| D1.7 | Bracket chip / version line | render | — (after state) | — |

### D2. Pending-changes banner

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| D2.1 | Outer padding | padding | 14px 14px 0 | 18px 26px 0 |
| D2.2 | Banner box | bg / border | `var(--surface-rail)`; 1px solid `var(--border-strong)`; border-left 3px solid `var(--accent)`; radius 10 | same |
| D2.3 | Banner box | padding / margin | 13px 14px; margin-bottom 14 | 15px 17px |
| D2.4 | Eyebrow | text | `Pending changes: not yet a version` | same |
| D2.5 | Eyebrow | type | Plex Mono 9.5px; 0.14em; uppercase; `var(--accent)`; block; margin-bottom 9 | Plex Mono 10px; 0.16em; uppercase; `var(--accent)` |
| D2.6 | Eyebrow row | layout | — (eyebrow is block; count on its own line) | flex; wrap; align center; gap 12; margin-bottom 11 |
| D2.7 | +1 / −1 count | render | shown (trade) | shown (trade) |
| D2.8 | +1 / −1 count | type | Plex Mono 15px; flex; gap 9; margin-bottom 8 | Plex Mono 13px; flex; gap 7 (inline beside eyebrow) |
| D2.9 | +1 / −1 count | colours | `+1` `var(--success)`; `/` `var(--border-strong)`; `−1` `var(--warning)` | same |
| D2.10 | Line list | layout | ul; flex column; gap 5; margin 0 0 14px; no list style | same + max-width 760 |
| D2.11 | Each line | layout | flex; align center; gap 9; min-height 34 | same |
| D2.12 | Glyph slot | size | flex none; width 13; Plex Mono 12px | same |

### D3. Banner lines (order: ⇄, +, −)

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| D3.1 | ⇄ line glyph | glyph / colour | `⇄`; `var(--accent)` | same |
| D3.2 | ⇄ line text | text | `Thrasios & Tymna → Ishai & Reyhan` | same |
| D3.3 | ⇄ line text | type | 13px; lh 1.35; `var(--fg)`; flex 1; min-width 0 | 13px; `var(--fg)`; flex 1; min-width 0 (no lh set) |
| D3.4 | ⇄ line hint | text | `commanders` | `commanders` |
| D3.5 | ⇄ line hint | type | Plex Mono 10px; `var(--fg-locked)`; flex none | same |
| D3.6 | ⇄ line price | render | — | — |
| D3.7 | + line glyph | glyph / colour | `+`; `var(--success)` | same |
| D3.8 | + line text | text | `Thrasios, Triton Hero` (the stayed half) | same |
| D3.9 | + line text | type | 13px; `var(--fg)`; flex 1; min-width 0 | same |
| D3.10 | + line hint | text | `from the command zone` | same |
| D3.11 | + line hint | type | Plex Mono 10px; `var(--fg-locked)`; flex none | same |
| D3.12 | − line glyph | glyph / colour | `−`; `var(--warning)` | same |
| D3.13 | − line text | text | `Reyhan, Last of the Abzan` (the arrived half) | same |
| D3.14 | − line hint | text | `to the command zone` | same |
| D3.15 | − line hint | type | Plex Mono 10px; `var(--fg-locked)`; flex none | same |
| D3.16 | Released half (Tymna) | card line | — (none) | — |

### D4. Banner actions

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| D4.1 | Actions layout | layout | flex column; gap 8; Discard + review in a flex row gap 8 | flex; wrap; align center; gap 10 |
| D4.2 | Commit | text / style | `Commit as v4`; min-height 44; center; radius 8; 600 14px; `var(--bg)` on `var(--fg)` | `Commit as v4`; padding 10px 18px; radius 8; 600 13.5px; `var(--bg)` on `var(--fg)` |
| D4.3 | Discard | style | min-height 44; padding 0 18px; radius 8; 500 13.5px; `var(--fg-muted)`; 1px solid `var(--border-strong)` | padding 10px 18px; radius 8; 500 13.5px; `var(--fg-muted)`; 1px solid `var(--border-strong)` |
| D4.4 | review changes | style | Plex Mono 11px; `var(--accent)`; min-height 44 | Plex Mono 11px; `var(--accent)` |

## E. Review page — `halfTrade` (frames 4a 1300, 4b 390)

### E1. Header and Commanders section

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| E1.1 | Back link | text | `← HD - Thrasios & Tymna` | same |
| E1.2 | Heading | text | `3 changes since v3` | same |
| E1.3 | Heading | type | `var(--display)` 700 18px | `var(--display)` 700 24px |
| E1.4 | Lede | render | — | `The deck page already shows this list: this is what it costs to lock in as v4.` |
| E1.5 | Section heading | text | `Commanders` | `Commanders` |
| E1.6 | Section heading | type | Plex Mono 400 11px; 0.16em; uppercase; `var(--accent)`; flex none | same |
| E1.7 | Heading row | layout | flex; align baseline; justify space-between; gap 10; padding-bottom 10; margin-bottom 10; border-bottom 1px solid `var(--elevated)` | same |
| E1.8 | Note | text | `Thrasios and Reyhan trade places · Tymna goes back in the pool when you commit` (`noteHalfTrade`) | same |
| E1.9 | Note | type | Plex Mono 10px; `var(--fg-locked)`; text-align right | same |
| E1.10 | Note | break | breaks at the middot, never inside a clause (README / canvas); no break element in markup | single line |
| E1.11 | `was` row | name / colour | `Thrasios, Triton Hero + Tymna the Weaver`; 13.5px lh 1.35 `var(--fg-muted)` | same |
| E1.12 | `now` row | name / colour | `Ishai, Ojutai Dragonspeaker + Reyhan, Last of the Abzan`; 13.5px lh 1.35 `var(--fg)` | same |
| E1.13 | Row box | style | flex; align center; gap 11; min-height 48; padding 4px 10px; radius 8; `var(--surface)`; 1px solid `var(--border)` | same |
| E1.14 | Row label | type | width 30; Plex Mono 10px; 0.06em; `var(--fg-faint)` | same |
| E1.15 | Thumb | size | 48×35; radius 5; two halves 24px each, 1px `var(--bg)` divider | same |
| E1.16 | Buy tag on `now` | render | — | — |

### E2. Shape strip

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| E2.1 | Strip note | text | `Thrasios in, Reyhan out: as shipped` | same |
| E2.2 | Strip | style | 1px dashed `var(--border-strong)`; radius 10; padding 14px 16px | same |

### E3. Columns and hint rows

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| E3.1 | Toggle | render | segmented: `Coming in · 1` (selected: `var(--elevated)`, 600 12.5px `var(--fg)`) and `Going out · 1` (1px solid `var(--border-strong)`, 500 12.5px `var(--fg-faint)`); min-height 38; radius 999; flex 1; gap 6 | pills: `1 in` (`1` Plex Mono 13px `var(--success)`) and `1 out` (`1` `var(--warning)`); label Plex Mono 11px `var(--fg-body)`; padding 6px 14px; radius 999; `var(--surface)`; 1px solid `var(--border-strong)`; gap 8 |
| E3.2 | Columns box | layout | flex column; gap 22; only `Coming in` column drawn | flex row; gap 22; two columns flex 1 |
| E3.3 | Column heading | text / colour | — (not drawn at 390) | `Coming in · 1` `var(--success)`; `Going out · 1` `var(--warning)`; Plex Mono 400 11px 0.16em uppercase |
| E3.4 | Column note | text | — | `1 free · 0 sleeved · 0 to buy`; `it moves to the command zone`; Plex Mono 10px `var(--fg-locked)` |
| E3.5 | Group label | text / type | `Creatures · 1`; Plex Mono 10px 0.14em uppercase `var(--fg-faint)`; margin-bottom 6 | same |
| E3.6 | Card row | style | flex; align center; gap 10; min-height 44; padding 0 10px; radius 7; `var(--surface)`; 1px solid `var(--border)`; border-left 2px solid `var(--accent)` | same |
| E3.7 | In row | name / hint | `Thrasios, Triton Hero` / `from the command zone` | same |
| E3.8 | Out row | name / hint | — (Going out tab not selected) | `Reyhan, Last of the Abzan` / `to the command zone` |
| E3.9 | Card name | type | 13px; `var(--fg)`; nowrap; ellipsis | same |
| E3.10 | Hint | type | Plex Mono 10px; `var(--fg-locked)`; flex none | same |

### E4. Footer

| # | Element | Property | Mobile (390) | Desktop (1300) |
|---|---|---|---|---|
| E4.1 | Footer text | text | `98 cards · 0 to buy · 1 back in the pool` | same |
| E4.2 | Footer text | type | Plex Mono 11px; `var(--fg-muted)` | same |
| E4.3 | Footer box | layout | flex column; align stretch; gap 10; padding 12px 14px 16px | flex; align center; justify space-between; gap 16; padding 14px 26px |
| E4.4 | Footer box | bg / border | `var(--surface-rail)`; border-top 1px solid `var(--border)` | same |
| E4.5 | Commit | style | `Commit as v4`; min-height 44; padding 0 20px; radius 8; `var(--fg)` bg; `var(--bg)`; 600 14px | same |

---

## F. Conditional rendering

| # | Condition | Ordinary swap (`confirm`) | Trade (`confirmTrade`) | Pair (`confirmPair`) | Half-trade (`confirmHalfTrade`) |
|---|---|---|---|---|---|
| F.1 | Out label | `Leaves the deck` | `Moves into the 99` | `Leave the deck` | `Leave the command zone` |
| F.2 | In label | `Leads the deck` | `Moves to the command zone` | `Lead the deck` | `Lead the deck` |
| F.3 | Arrow | `→` | `⇄` | `→` | `→` |
| F.4 | Fate lines under tiles | — | — | — | out: `into the {body}` / `leaves the deck`; in: `free` / `from the {body}` / buy tag |
| F.5 | Stays radiogroup | — | — | — | shown |
| F.6 | Sentence | shipped | `The two trade places. …` | shipped | `halfTrade(...)` |
| F.7 | Lands line | shipped | `… Discard puts both back where they were.` | `… Discard puts Thrasios and Tymna back.` | `landsHalfTrade`; on a brew the shipped `brew` line replaces it |
| F.8 | Failed | `We couldn't change the commander. Gishath still leads this deck.` | — | shipped `failedPair` | `failedPair`; choice kept |
| F.9 | Deck banner | ⇄ line, price | ⇄ + two card lines, +1/−1 | ⇄ line | ⇄ (`commanders`) + trade's two card lines, +1/−1 |
| F.10 | Review note | `… goes back in the pool when you commit` | `the two trade places` | `Thrasios and Tymna go back in the pool …` | `noteHalfTrade` |
| F.11 | Review columns | — | shown | — | shown |
| F.12 | Review footer pool count | 1 | 0 | 2 | 1 |
| F.13 | Brew (half-trade) | — | — | — | not drawn; README: only the lands line differs |

---

## State Coverage (README states 28–35)

| # | Surface | State | Trigger | What renders | Drawn |
|---|---|---|---|---|---|
| 28 | List | pair with a half in the 98 | pair candidate where one incoming half is in the body; `offerable()` no longer holds it back | Sorts as any pair (in `Yours` when every other half is owned). The body half carries shipped `in this deck · trades places`; other half its own mark | 2a (1300 only) |
| 29 | Confirm | half-trade | Choose on a state-28 candidate; one arriving half from body, both old halves depart | Out label `Leave the command zone`, `→`, in label `Lead the deck`, fate line under each tile, `Which one stays in the 98?` radiogroup defaulting to commander-column half, sentence below, `landsHalfTrade`, primary `Make {a} and {b} commanders` | 1a, 1b |
| 30 | Confirm | half-trade, other choice | Press the other radio option | Out-tile fate lines swap; sentence's stays/released names swap; nothing else moves | 1a, 1b (interactive) |
| 31 | Confirm | half-trade, failed | Write fails | Primary `Try again`; `role=alert` `failedPair` line below buttons in `var(--danger)`; choice kept | 1c (390 only) |
| 32 | Confirm | half-trade on a brew | Deck has no version | Shipped `brew` line replaces `landsHalfTrade`; nothing else changes | — |
| 33 | Deck page | after a half-trade | Confirm succeeds | Band shows new pair; banner: +1/−1, ⇄ `{old} → {new}` `commanders`, `+ {stays}` `from the command zone`, `− {arrive}` `to the command zone`; no line for released half | 3a, 3b |
| 34 | Review | half-trade | Open review with a pending half-trade | `was`/`now` rows as for a pair; note `noteHalfTrade`, breaking at the middot at 390; columns show the two card lines with hints; footer `98 cards · 0 to buy · 1 back in the pool` | 4a, 4b |
| 35 | Discard | after a half-trade | Discard pressed | Shipped `commanderBackPair` (`Thrasios and Tymna lead it again.`); stayed half leaves the 98, arrived half returns to it | — |

---

## Verification

Checked 2026-09-25 against the working tree of `cc-half-trade-build` (uncommitted changes included).
"shipped" = an R3 element this addendum does not touch, read in place and not re-measured in a browser.
Copy wording differences are not scored (a separate review owns wording); `landsHalfTrade`,
`manaValueRel`'s `and` against `&`, and similar are wording.

### Pass 1: property by property

**A1. Sheet chrome**
- A1.1 ✅ `copy.sheet.title.pair` = `Change pair`
- A1.2 ❌ MISMATCH (pre-existing, deliberate) — design: aside shown at 390 / implementation: `hidden md:inline` (change-commander-sheet.tsx:104), desktop only
- A1.3–A1.7 ✅ shipped (`ModalChrome` width 700; body `px-[18px] pt-[16px] pb-[22px]`, column, gap 16)
- A1.8 ❌ MISMATCH (pre-existing, deliberate) — design: min-height 32 / implementation: `min-h-[44px]` (sheet.tsx:716, touch floor); type/colour/gap 7 match

**A2. Plates row**
- A2.1–A2.5 ✅ (`items-start justify-center gap-[14px] pt-[4px] pb-[2px]`; column `items-center gap-[8px] min-w-0`; tiles `gap-[6px]`)
- A2.6 ✅ `w-[68px] md:w-[84px]`
- A2.7–A2.10 ✅ (aspect 63/88, border-strong, radius 8, `--elevated`, cover/center; name 11.5/1.3 `--fg-body`; 13px pips gap 3, `+` 11px `--fg-faint` px 3)
- A2.11–A2.12 ✅ data-driven (`CostPips` per half)
- A2.13 ✅ `manaValueRel(mv, oldMv, oldShort)` Plex Mono 11/1.4 `--fg-muted` center (now `w-0 min-w-full`, wraps inside tile width)
- A2.14 ✅ `flex flex-col items-center gap-[4px]`

**A3. Out label**
- A3.1 ✅ `outHalfTrade` when `halfTrade`
- A3.2–A3.5 ✅ Plex Mono 10px, `tracking-[0.12em] uppercase`, `--warning` (tone out), no weight/lh set

**A4. Arrow and in label**
- A4.1 ✅ `trade ? "⇄" : "→"`; a half-trade is not `trade`, so `→`
- A4.2–A4.3 ✅ 18px `--fg-faint`, `flex-none self-center mt-[-30px]`, aria-hidden
- A4.4 ✅ `inPair` (`Lead the deck`) — halfTrade falls through `trade` to `pair`
- A4.5–A4.6 ✅ same label span, tone in → `--success`

**A5. Fate lines**
- A5.1–A5.4 ✅ `font-mono text-[10px] leading-[1.35] text-center`, `--fg-muted`
- A5.5 ❌ MISMATCH (structural) — design: last child of each tile box, 6px under that tile's name / implementation: a separate `half-trade-fates` row after the tile group (sheet.tsx:513, `mt-[-2px]` in the 8px column gap = 6px). Identical when both names are one line; when one name wraps and the other does not, both fate lines sit under the taller name instead of each under its own. It also sits outside the card trigger (needed for the buy tag, which cannot nest in a button).
- A5.6 ✅ none set
- A5.7–A5.9 ✅ `c.oracleId === staying.oracleId ? cardStays(body) : cardReleased`, stays defaults to `olds[0]` and follows the choice
- A5.10 ✅ `InFate`: owned with `availability.free > 0` → `sheet.free` (owned but no free copy draws nothing; not drawn by design)
- A5.11 ✅ `inDeck` → `cardFromBody(body)`
- A5.12 ✅ `!owned` → `BuyTag variant="row"`
- A5.13 ✅ `fates` passed only when `halfTrade`

**A6. Which one stays**
- A6.1 ✅ rendered between the plates row and the sentence block
- A6.2 ✅ `data-stays="true" flex flex-col items-center gap-[8px]`
- A6.3 ✅ `staysQuestion(body)`
- A6.4 ✅ `font-mono text-[10.5px]` `--fg-muted`, no case/tracking
- A6.5 ❌ MISMATCH (non-visual) — design: id `stays-label` / implementation: `change-commander-stays` (sheet.tsx:588); the labelling relation holds
- A6.6 ✅ `role="radiogroup" aria-labelledby` the label's id
- A6.7–A6.11 ✅ `flex gap-[4px] p-[3px] rounded-[10px] border-[--border-strong]`, bg `--bg`
- A6.12 ✅ `w-full md:w-auto`
- A6.13 ❌ MISMATCH (non-visual, deliberate) — design: `tabindex="0"` on every option / implementation: roving `tabIndex={on ? 0 : -1}` with arrow keys (sheet.tsx:606); role/aria-checked/onClick match
- A6.14 ✅ `olds` order (commander column first, candidates.ts:189), `shortName`
- A6.15 ✅ `flex items-center justify-center gap-[8px]`
- A6.16 ✅ `flex-1 md:flex-none`
- A6.17 ✅ `min-h-[44px] md:min-h-[34px]`
- A6.18–A6.21 ✅ `px-[14px] rounded-[7px] text-[13px] cursor-pointer` (button inherits Plex Sans)
- A6.22–A6.27 ✅ inline style 600/`--fg`/`--elevated` vs 500/`--fg-muted`/transparent
- A6.28–A6.30 ✅ 8×8 `rounded-full flex-none`; on `--accent` no border; off transparent + `1.5px solid var(--fg-faint)`
- A6.31 ✅ `staysChosen ?? olds[0].oracleId`
- A6.32–A6.33 ✅ none added

**A7. Sentence block**
- A7.1–A7.2 ✅ shipped (`gap-[9px] pt-[12px]` border-top `--border`; 14/1.6 `--fg` pretty)
- A7.3–A7.4 ✅ `halfTrade(arrive, joins, stays, released, body)`, names follow the choice
- A7.5 ✅ shipped buy line, drawn only when `toBuy.length > 0`
- A7.6 ✅ `landsHalfTrade` (wording differs, not scored)
- A7.7 ✅ 10.5/1.6 `--fg-faint` pretty

**A8. Footer buttons**
- A8.1 ✅ `mt-auto flex flex-col gap-[8px] md:mt-0 md:flex-row md:items-center md:gap-[10px] md:pt-[4px]`
- A8.2 ✅ `ctaPair(short a, short b)`
- A8.3–A8.4 ✅ shipped `PrimaryButton` / `GhostButton` classes

**B. Failed**
- B.1 ✅ Confirm keeps rendering everything; the choice lives in the sheet's `staysBy`, untouched by `failed`
- B.2 ✅ `failed ? failedRetry`
- B.3 ✅ after the foot row
- B.4 ✅ `failedPair(oldShort)`
- B.5–B.7 ✅ `role="alert"` 11/1.55 `--danger`

**C. List row**
- C.1–C.3 ✅ shipped grouping (`isYours` = every half `inDeck || owned`); figure shipped
- C.4 ✅ `Mark`: free → 6px `--success` dot, 10.5px `--fg-body`
- C.5 ✅ shipped `+` prefix
- C.6–C.7 ✅ `Mark` for `inDeck`: `sheet.inDeck` split on the middot, 10.5px `--fg-muted` flex-none, middot `--border-strong` px 4
- C.8 ✅ data-driven pips
- C.9 ✅ no new string

**D1. Band** — D1.1–D1.7 ✅ shipped; the write sets both commander columns and keeps the body at 98

**D2. Banner**
- D2.1–D2.9 ✅ shipped (`WRAP`, `CARD`, `CARD_BORDER`, `LABEL`, `HEADER.names`)
- D2.10 ❌ MISMATCH (pre-existing) — design: desktop line list `max-width 760` / implementation: `m-0 p-0 list-none flex flex-col gap-[5px] mb-[14px]`, no max-width (pending-banner.tsx:346)
- D2.11–D2.12 ✅ `flex items-center gap-[9px] min-h-[34px]`; glyph `w-[13px] 12px flex-none`

**D3. Banner lines**
- D3.1–D3.5 ✅ `CommanderNameLine` first: ⇄ `--accent`, `commanderChange(from, to)`, 13/1.35 `--fg flex-1 min-w-0` (lh also at 1300: immaterial), `hintPair` 10px `--fg-locked`
- D3.6 ✅ `buyFigures` empty (Reyhan in the deck, Ishai owned)
- D3.7–D3.11 ✅ add line; `commanderZoneHint(added)` → `fromZone` for Thrasios (in `from`)
- D3.12–D3.15 ✅ remove line; → `toZone` for Reyhan (in `to`)
- D3.16 ✅ Tymna is in neither `deck_cards` nor the version's rows, so no line

**D4. Banner actions** — D4.1–D4.4 ✅ shipped

**E1. Review header and Commanders section**
- E1.1–E1.3 ✅ `changeCount` = 1 add + 1 remove + 1 commander = 3; heading shipped
- E1.4–E1.7 ✅ shipped
- E1.8 ✅ `noteHalfTrade(stayed, arrived, released)` when `pair && arrived && stayed && released`
- E1.9 ✅ `text-right font-mono text-[10px] --fg-locked`
- E1.10 ✅ each clause an `inline-block` span, so a break can fall only at the middot; one line when it fits
- E1.11–E1.16 ✅ shipped `Row` (names joined ` + `, buy tags only on `now` and only for `buy`)

**E2. Shape strip** — E2.1–E2.2 ✅ shipped

**E3. Columns**
- E3.1–E3.3 ✅ shipped
- E3.4 ❌ MISMATCH — design: `Going out` note `it moves to the command zone` / implementation: `copy.outNote(released)` (review-changes.tsx:1017) → `it goes back in the pool when you commit. Put one back and it never left.` That is false here: the only out row is Reyhan, who moves to the command zone; the released copy (Tymna) is in no column. No `it moves to the command zone` key exists. (`Coming in` note `1 free · 0 sleeved · 0 to buy` matches.)
- E3.5–E3.6 ✅ shipped
- E3.7 ✅ `ZoneHint side="in"` `from the command zone`
- E3.8 ✅ `ZoneHint side="out"` `to the command zone`, Put back suppressed
- E3.9–E3.10 ✅ shipped / `ZoneHint` 10px `--fg-locked flex-none`

**E4. Footer**
- E4.1 ✅ `releasedCopies` = 1 cut + 1 leaving (Tymna; Thrasios excluded as added) − 1 arriving from body = 1; 98 cards; 0 to buy
- E4.2–E4.5 ✅ shipped

**F. Conditional rendering**
- F.1–F.3 ✅ label/arrow chains above
- F.4–F.5 ✅ `fates` and `StaysChoice` gated on `halfTrade`
- F.6–F.7 ✅ sentence and lands chains; brew wins via `!hasVersion` first
- F.8 ✅ `pair ? failedPair : failed`
- F.9 ✅ banner as D3
- F.10 ✅ `noteHalfTrade`
- F.11 ✅ columns render when counts > 0
- F.12 ✅ `releasedCopies` 1
- F.13 ✅ only the lands line branches on the version

### Pass 2: state coverage

- 28 ✅ REACHABLE — `loadChangeCandidates` filters with `offerable(k.ids, currentIds, inDeck)`, and `tradeShape` returns `halfTrade` for exactly one new half out of the body with both old halves departing; `Mark` draws `in this deck · trades places`; `isYours` counts the body half as held.
- 29 ✅ REACHABLE — `shapeOf` gives `halfTrade`; every branch above is present; `changeCommander(deckId, to, stays)` passes the choice; the write accepts it only when `stays` is one of the departing halves, and gives it the freed slot.
- 30 ✅ REACHABLE — `onStays` writes `staysBy[key]`; fate lines, sentence and the write's argument all read `staying`.
- 31 ✅ REACHABLE — a non-ok result or a throw sets `failed`; `Try again` and the `failedPair` alert render; the choice survives in the sheet's state.
- 32 ✅ REACHABLE — the loader does not test for a version; `lands` takes `brew` when `!hasVersion`.
- 33 ✅ REACHABLE — the write leaves Thrasios added and Reyhan removed, and the columns moved; the banner draws the ⇄ line with `commanders`, `+ Thrasios` `from the command zone`, `− Reyhan` `to the command zone`, no Tymna line, +1/−1.
- 34 ⚠️ PARTIALLY — `was`/`now`, `noteHalfTrade` with its middot break, both column hints and the footer's `1 back in the pool` all render; the `Going out` column's note says the card goes back in the pool when it goes to the command zone (E3.4).
- 35 ✅ REACHABLE — `restoreDraftFromVersion` rewrites `deck_cards` and both commander columns from the version; `commanderBackClause` gives `commanderBackPair` for a pair.

### Gaps

Visual:
1. src/components/decks/review-changes.tsx:1017 — `Going out` column note — text — `it moves to the command zone` → `outNote(released)`, "it goes back in the pool when you commit…" (false for this row; key missing)
2. src/components/decks/change-commander-sheet.tsx:513 — fate line — position — last child of each tile box → a shared row below the tiles (differs only when names wrap unequally)
3. src/components/decks/change-commander-sheet.tsx:588 — stays label — id — `stays-label` → `change-commander-stays` (non-visual; labelling intact)
4. src/components/decks/change-commander-sheet.tsx:606 — stays option — tabindex — `0` on every option → roving `0`/`-1` (non-visual, deliberate a11y)
5. src/components/decks/change-commander-sheet.tsx:104 — sheet aside — render at 390 — shown → `hidden md:inline` (pre-existing, deliberate)
6. src/components/decks/change-commander-sheet.tsx:716 — back link — min-height — 32 → 44 (pre-existing, deliberate touch floor)
7. src/components/decks/pending-banner.tsx:346 — banner line list — desktop max-width — 760 → none (pre-existing)

State:
1. src/components/decks/review-changes.tsx:1017 — state 34 (review, half-trade) — the `Going out` note — `it moves to the command zone` → pool sentence

VERDICT: 7 visual gaps, 1 state gap (matches: 184)

## Gap report

Verification found 7 visual gaps and 1 state gap against 184 matching rows.

**Fixed (1 visual, 1 state):**

- Visual 1 / state 1: `Going out`'s note for a trade. Its only row is the new commander leaving for the command
  zone, so it reads `outNoteToZone` ("it moves to the command zone") instead of the pool sentence. The same note
  was drawn in R3 for a single's trade and was missed there too, so it applies to both. Beside an ordinary cut,
  the pool sentence stays. Pinned by `review-changes.test.tsx` and by the browser probe.

**Found by the browser probe, fixed:** the old commander moving into the 98 drew a buy tag in `Coming in` when the
collection did not list it. It keeps the copy it led with, so it now takes a basic's treatment in the money: no
buy tag, no claim read (`draft-state.ts`, `returning`). This applied to a single's trade too.

**Deliberate (6):**

- Visual 2: each fate line sits in its own row under the tiles, not inside the tile, because a fate can be a buy
  tag and the tile is a button. It lands 6px under the name, as drawn.
- Visual 3: the question's id is `change-commander-stays`, not `stays-label`. The radiogroup is labelled by it
  either way.
- Visual 4: the options use a roving `tabIndex` (0 on the checked one, -1 on the other) with arrow keys, which is
  the radio group's keyboard pattern. The canvas drew no keyboard behavior (audit A3).
- Visual 5 (shipped, PR 3): the phone header leaves out the deck name.
- Visual 6 (shipped, PR 3): the back link keeps the 44px touch floor.
- Visual 7 (shipped): the banner's change list keeps its shipped width.
