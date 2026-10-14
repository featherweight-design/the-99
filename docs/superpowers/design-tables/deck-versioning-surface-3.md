# Design Property Table — Deck Versioning, Surface 3 (commit sheet, changed strip, discard)

Source: `design/design_handoff_the99_deck_versioning/` — `README.md` (§What R1 got wrong,
§Decisions 3b, 5, 6, the Component notes table, §Notes for engineering, §Gap report 4/8/9,
§Errata), `STATES-pending.md` (table C rows 21–29, table D rows 30–35, table A rows 9–10,
§The rules the matrix is generated from, §Copy per state, §Announcements), `OVERLAPS.md`
(call 1 and mechanical checks 1 and 4), `READINESS.md` (items 3b, 4, 19, 20, 23, 24, 25,
116, 119, and the Not-blocking target floor), `COST-TRACK.md`, and
`deck-versioning · copy strings.ts` (`commit`, `discard`, `changed`). Canvas:
`The 99 - Deck Versioning.dc.html` — §Surfaces 3 frame (desktop lines 398–431, phone
lines 433–452, annotation card lines 454–468), the Discard frame (desktop lines 471–482,
phone lines 485–494), the what-changed strip and shape block inside §Surfaces 2 (desktop
lines 217–239, phone lines 345–358), the Contract frame (lines 795–826) and the global
`<style>` link rule (lines 19–20).

Scope: exactly three components.

1. **The commit sheet** — the block expanded at the foot of the review page: heading, lede,
   the optional note block, the money ("To buy") block with the feature's only Mana Pool
   link-out, the released ("Back in the pool") block, and the commit/cancel apply bar. Not a
   modal.
2. **The what-changed strip** — six cells (mana value plus the five `ROLE_ORDER` roles:
   ramp, draw, removal, wipes, land) and the type-distribution block beneath it.
3. **The discard confirm** — the inline two-click confirm raised by the banner's `Discard`
   control. `--danger` appears here and nowhere else in the feature.

Governing-value rule from the handoff: **§Errata at the foot of `README.md` wins over every
other sentence in the bundle, and where the canvas and R1-era prose disagree the canvas wins
on chrome.** Every row below records the canvas value and names the contradiction where one
exists.

**Breakpoint:** two fixed frames — desktop at **1180px** content width, phone at **390px**
(drawn in a 392px device shell). **No Tailwind breakpoint token is named anywhere in the
bundle**; the 640px / `sm:` boundary is an engineering choice, not a handoff value.
`Mobile` = the 390px frame, `Desktop` = the 1180px frame. Where the phone frame draws no
counterpart the cell reads `— (not drawn)`. Note that the desktop commit sheet and the
desktop discard confirm are drawn inside 760px and 600px annotation cards respectively
rather than inside the 1180px page frame (Discrepancy 1); the annotation cards themselves
(`#1A160F` on `1px #2A241D`, radius 14px, padding 20px, with a mono 10px `0.16em`
uppercase caption) are canvas presentation chrome and are **not** product.

## Token ↔ hex correspondence used below

| Token | Hex on canvas | Asserted by |
|---|---|---|
| `--base` | `#14110E` | Component notes' note-field and money-block fill; page background |
| `--surface` | `#1A1713` | Commit-sheet fill; strip-cell fill; phone note/money/released fill |
| `--surface-rail` | `#1A160F` | Banner spec; the discard confirm's box fill |
| `--elevated` | `#2A241D` | brand README (elevated); phone active segment |
| `--border` | `#26211B` | strip-cell and released-block border |
| `--border-strong` | `#3A3229` | sheet border, note border, button borders, apply-bar rule |
| `--fg` | `#EDE6D8` | heading, note text, the bolded version name in the consequence |
| `--fg-body` | `#C6B79A` | lede, consequence, `No action required`, shape-row type label |
| `--fg-muted` | `#A89B84` | `Cancel` label |
| `--fg-faint` | `#8E8269` | strip label, breakdown, footer note, block prose |
| `--fg-locked` | `#6A6152` | note warning, before-figure, arrow, verdict note, `0` delta |
| `--accent` | `#C9A24B` | the link-out label; the global link colour |
| `--accent-hover` | `#D8B25E` | global `a:hover` only |
| `--accent-shadow` | `#4A3A1C` | money-block border |
| `--success` | `#6FA368` | released label and figure; improving after-figure; positive delta |
| `--warning` | `#E0913C` | money label, count, total; short after-figure; negative delta |
| `--danger` | `#C6533F` | discard question, danger button label, the confirm's left rule |
| (unnamed) | `#4A2F28` | danger-button border — shipped value, in no brand ramp |
| (unnamed) | `#E8E4D6` on `#14110E` | cream primary fill / ink (`Commit v3`, `Keep editing`) |
| (unnamed) | `#4A4033` | the "kept" segment of the shape bar |

Fonts: `var(--font-cinzel)` (Cinzel, headings) · `var(--font-sans)` (IBM Plex Sans, the
default — anything below with no family named inherits it) · `var(--font-mono)` (IBM Plex
Mono, every number, label and meta line).

---

## Component: Commit sheet

`--surface` on `1px --border-strong`, radius 12px, padding 20px — "the game log's inline
form container" (Component notes). It **opens with the shipped panel transition** and that
is the only motion in the feature. §Errata: **totals only, never a list** — no card names
inside the sheet, which overrides both the Component notes' "two lists" and state 25's
"both lists stay in place".

### Sheet container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block (phone frame is the full screen; sheet chrome is the screen) | block |
| background | `#1A1713` (`--surface`) — the phone frame's own `#14110E` screen with `#1A1713` on each block instead (Discrepancy 2) | `#1A1713` (`--surface`) |
| border | — (phone draws no sheet border; the device shell's screen edge is the boundary) | `1px solid #3A3229` (`--border-strong`) |
| border-radius | — | `12px` |
| padding | header `38px 14px 12px`, body `14px`, apply bar `11px 14px 16px` | `20px` |
| max-width | — (full screen width, 390px) | — (not set; drawn at 718px inside the 760px annotation card) |
| transition | the shipped panel transition (open and close) | the shipped panel transition (open and close) |
| section rules | `1px solid #26211B` (`--border`) under the header; `1px solid #3A3229` above the apply bar | `1px solid #3A3229` above the apply bar only |

### Heading (`commit.heading(version)` — `Commit this list as v3`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-cinzel)` | `var(--font-cinzel)` |
| font-size | `19px` | `21px` |
| font-weight | `700` | `700` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| margin | `0` | `0 0 8px` |
| element | `h3` | `h3` |
| letter-spacing | — | — |
| text-transform | — | — |

### Lede (`commit.lede(version, unfree, removed)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` (inherited) | `var(--font-sans)` (inherited) |
| font-size | `12.5px` | `13.5px` |
| line-height | `1.55` | `1.6` |
| color | `#C6B79A` (`--fg-body`) | `#C6B79A` (`--fg-body`) |
| margin | `8px 0 0` | `0 0 18px` |
| max-width | — (not set) | `600px` |
| text as drawn | `v3 becomes the deck's list now. Buy tags stay until you buy; the seventeen you cut are released immediately.` | `v3 becomes the deck's list immediately. The eight cards with no free copy keep their buy tags until you actually buy them, and the seventeen you cut are back in the pool the moment you commit.` |
| numerals | spelled out (`seventeen`) | spelled out (`eight`, `seventeen`) — the copy module interpolates digits (Discrepancy 3) |

### Note block container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block | block |
| margin-bottom | `14px` (on the field itself) | `18px` (on the block) |

### Note label (`commit.noteLabel` — `Why this version exists — optional`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.14em` | `0.14em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| margin-bottom | `7px` | `7px` |

### Note field (the shipped textarea)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A1713` (`--surface`) as drawn; Component notes say `--base` (Discrepancy 4) | `#14110E` (`--base`) |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| border-radius | `8px` | `8px` |
| padding | `11px 12px` | `11px 13px` |
| min-height | `76px` | `70px` |
| font-family | `var(--font-sans)` (inherited) | `var(--font-sans)` (inherited) |
| font-size | `13.5px` | `13.5px` |
| line-height | `1.55` | `1.55` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| margin-bottom | `14px` | — (the block carries it) |
| placeholder | **—** ("no placeholder copy beyond the label") | **—** |
| pre-filled value | **—** (state 21: never pre-filled; state 29: empty again on reopen) | **—** |
| validation, counter, required | **—** (state 24: never validated, never counted, never required) | **—** |
| max-length | — (not specified) | — (not specified) |
| focus style | — (not specified anywhere in the bundle) | — (not specified anywhere in the bundle) |

### Note warning (`commit.noteWarning`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on phone)** (Discrepancy 5) | drawn |
| font-family | — | `var(--font-mono)` |
| font-size | — | `10px` |
| color | — | `#6A6152` (`--fg-locked`) |
| margin-top | — | `7px` |
| text | — | `you can’t add this later: the version is not editable once committed` |

### Blocks row (money + released)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block — the two blocks stack | `flex` |
| gap | `10px` (money block's `margin-bottom`) | `12px` |
| align-items | — | `stretch` |
| flex-wrap | — | — (not set) |
| margin-bottom | — (blocks carry their own) | `18px` |
| order | money block first, released second | money block first, released second |
| each block | full width | `flex: 1` |

### Money block ("To buy") container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A1713` (`--surface`) as drawn; Component notes say `--base` (Discrepancy 4) | `#14110E` (`--base`) |
| border | `1px solid #4A3A1C` (`--accent-shadow`) | `1px solid #4A3A1C` (`--accent-shadow`) |
| border-radius | `10px` | `10px` |
| padding | `13px 14px` | `14px 16px` |
| margin-bottom | `10px` | — (row gap carries it) |
| flex | — (full width) | `1` |

### Money block — label (`commit.buyHeading` — `To buy`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.14em` | `0.14em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| margin-bottom | `7px` | `8px` |
| text | `To buy` — the count is **not** in the label (§Copy per state says `To buy · {n}`; Discrepancy 6) | `To buy` |

### Money block — figures

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `baseline` | `baseline` |
| gap | `8px` | `9px` |
| margin-bottom | `5px` | `5px` |
| count — font-family | `var(--font-mono)` | `var(--font-mono)` |
| count — font-size | `22px` | `24px` |
| count — color | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| total — font-family | `var(--font-mono)` | `var(--font-mono)` |
| total — font-size | `16px` | `17px` |
| total — color | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| drawn values | `8` · `$254.10` | `8` · `$254.10` |
| count-up animation | **—** (forbidden by the Contract frame) | **—** |

### Money block — breakdown and back link (`commit.buyBreakdown`, `commit.buyBackLink`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10.5px` |
| line-height | — (not set) | `1.55` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| margin-bottom | `11px` | `13px` |
| breakdown text | `3 not owned · 5 sleeved elsewhere` — **`still` dropped** (Discrepancy 7) | `3 not owned · 5 still sleeved elsewhere.` |
| back link | **— (not drawn on phone)** (Discrepancy 8) | `the eight rows are on the review page ↑`, `href="#review"` |
| back link — color | — | `#C9A24B` (`--accent`) via the global `a` rule, `text-decoration: none` |
| back link — hover | — | `#D8B25E` (`--accent-hover`) — the global `a:hover` rule |
| back link numeral | — | spelled out (`the eight rows`); `commit.buyBackLink(n)` interpolates a digit (Discrepancy 3) |
| zero suppression | a zero term is filtered out of the join (`buyBreakdown`) | same |

### Money block — Mana Pool link-out (`commit.linkOut` — `Open in Mana Pool`)

**Exactly one instance in the whole feature** (OVERLAPS call 1 and check 1).

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `inline-block` |
| align-items / justify-content | `center` / `center` | — |
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `13px` | `12.5px` — Component notes say 12.5px for both (Discrepancy 9) |
| font-weight | `600` | `600` |
| color | `#C9A24B` (`--accent`) | `#C9A24B` (`--accent`) |
| background | — (ghost) | — (ghost) |
| border | `1px solid #3A3229` (`--border-strong`) — Component notes say `1px --border` (Discrepancy 10) | `1px solid #3A3229` (`--border-strong`) |
| border-radius | `8px` | `7px` |
| padding | — (min-height + centring instead) | `9px 14px` |
| min-height | `44px` | — (not set; `9px 14px` on 12.5px text) |
| width | full width of the money block | intrinsic |
| hover / focus / active | — (not specified) | — (not specified) |
| icon | **—** (no icon, no external-link glyph drawn) | **—** |

### Released block ("Back in the pool") container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A1713` (`--surface`) as drawn; Component notes say `--base` (Discrepancy 4) | `#14110E` (`--base`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| border-radius | `10px` | `10px` |
| padding | `13px 14px` | `14px 16px` |
| flex | — (full width) | `1` |
| link-out, prices, action | **—** (READINESS 4: the two blocks are asymmetrical on purpose; released is a receipt with no action) | **—** |
| card names | **—** (§Errata; Component notes: "No names.") | **—** |

### Released block — label (`commit.pullHeading(n)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.14em` | `0.14em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#6FA368` (`--success`) | `#6FA368` (`--success`) |
| margin-bottom | `7px` | `8px` |
| text | `Back in the pool · 17` — the count lives **in the label** and the big figure is dropped (Discrepancy 11) | `Back in the pool` |

### Released block — figure

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn; the count is in the label)** | drawn |
| font-family | — | `var(--font-mono)` |
| font-size | — | `24px` |
| color | — | `#6FA368` (`--success`) |
| margin-bottom | — | `5px` |
| drawn value | — | `17` |

### Released block — sentence (`commit.pullNote`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10.5px` | `10.5px` |
| line-height | `1.55` | `1.55` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| lead phrase | `No action required` in `#C6B79A` (`--fg-body`), `font-weight: 400` inside a `<b>` | same |
| text as drawn | `No action required — committing releases them.` (shortened, and the dash is the canvas's; see Discrepancy 12) | `No action required: committing is what releases them. Take them out of the box whenever you next open it.` (Discrepancy 12) |

### Apply bar

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `row` (default) |
| align-items | — (stretch) | `center` |
| gap | `8px` | `12px` |
| flex-wrap | — | `wrap` |
| border-top | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| padding | `11px 14px 16px` | `padding-top: 16px` |
| order | footer note, `Commit v3`, `Cancel` | `Commit v3`, `Cancel`, footer note (Discrepancy 13) |

### Apply bar — `Commit v{n}` (`commit.cta`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `14px` | `14px` |
| font-weight | `600` | `600` |
| color | `#14110E` (ink) | `#14110E` (ink) |
| background | `#E8E4D6` (cream primary) | `#E8E4D6` (cream primary) |
| border | — (none) | — (none) |
| border-radius | `8px` | `8px` |
| padding | — (centring instead) | `11px 20px` |
| min-height | `48px` (a primary, per the 48px floor) | — (not set) |
| width | full width | intrinsic |
| display / align / justify | `flex` / `center` / `center` | inline |
| pending label | `Committing…` (`commit.ctaPending`), disabled (state 25) | `Committing…`, disabled |
| disabled fill | — (not specified) | — (not specified) |
| hover / focus / active | — (not specified) | — (not specified) |
| spinner, progress bar | **—** (nothing unmounts, nothing spins) | **—** |

### Apply bar — `Cancel` (`commit.cancel`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `13.5px` | `13.5px` |
| font-weight | `500` | `500` |
| color | `#A89B84` (`--fg-muted`) | `#A89B84` (`--fg-muted`) |
| background | — (ghost) | — (ghost) |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| border-radius | `8px` | `8px` |
| padding | — | `11px 16px` |
| min-height | `44px` (not a primary) | — (not set) |
| width | full width | intrinsic |
| in flight | disabled (state 25) | disabled |
| confirm on cancel | **—** (state 28: the note is discarded with no confirm) | **—** |
| hover / focus / active | — (not specified) | — (not specified) |

### Apply bar — footer note (`commit.footer(cards, buy, released)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `11px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| text | `101 cards · 8 to buy · 17 released` | `101 cards · 8 to buy · 17 released` |
| card count source | the **server's** `cardCount`, never a client recount (§Errata) | same |

### Commit sheet — refusal (state 27)

| Property | Mobile | Desktop |
|----------|--------|---------|
| component | the shipped `MutationError` | the shipped `MutationError` |
| position | under the button | under the button |
| text | `We couldn't commit that version. Your changes are still here.` (`commit.refused`) | same |
| the note | **preserved** (rule 5) | **preserved** |
| own styling | — (the shipped component owns it; no values given here) | — |
| toast | **—** | **—** |

### Commit sheet — conditional rendering

| Condition | Result |
|---|---|
| Nothing to buy (state 22) | **The whole money block is absent, link-out included.** The released block takes the full width |
| Nothing released (state 23) | The released block is absent |
| A zero term in the breakdown | Filtered out of the `·` join (`commit.buyBreakdown`) |
| Note untouched vs typed (states 21, 24) | No difference in chrome; never validated, counted or required; nothing blocks the commit |
| Reopened after cancel (state 29) | The note is **empty again** — the sheet does not remember |
| Committing (state 25) | Both buttons disabled in place; nothing unmounts |
| Committed (state 26) | Route returns to the deck page; banner gone; version line `v3 · committed 10 Sep`; focus on that line; announced `Committed v3. 101 cards, 8 to buy.`; **no toast** |
| Refused (state 27) | `MutationError` under the button, note preserved, button re-enabled |
| Card rows inside the sheet | **Never** (§Errata) — the priced rows and the released names live one screen up |
| A checklist, tick boxes, "mark as bought" | **Never** — the buy tag is already the outstanding state |
| A "prices as of" line | Not drawn (gap 4) |
| Commit as v1 | **RETIRED 2026-09-15** — the note this row recorded (`pending.firstCommitNote`) is cut with the key; the offer draws its control alone. See surface 1's FirstCommitOffer table |

---

## Component: What-changed strip

§Errata: **mana value plus the five `ROLE_ORDER` roles — ramp, draw, removal, wipes,
land**; `body` is not a role. Mana value appears **only** here — no card row carries one.
The strip needs `cmc` in the detail select and the version's cards joined through
`deck_version_cards → cards` (§Errata, READINESS 24). One fold, called twice (READINESS 23).

### Strip container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `grid` | `flex` |
| gap | `7px` | `10px` |
| margin-bottom | `11px` | `10px` |
| rows | three columns, two rows (`grid-cols-3`) | — (single row) |
| cells drawn | **6**, in `ROLE_ORDER` — `Mana value`, `Ramp`, `Draw`, `Removal`, `Wipes`, `Land` | **6**, in `ROLE_ORDER` — `Mana value`, `Ramp`, `Draw`, `Removal`, `Wipes`, `Land` (Discrepancy 14, resolved) |

### Strip cell

| Property | Mobile | Desktop |
|----------|--------|---------|
| flex | — (grid item; `flex-1` is `md:` only) | `1` |
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| border-radius | `8px` | `9px` |
| padding | `9px 11px` | `12px 14px` |
| min-height | — (not set) | — (not set) |

### Strip cell — label

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9px` | `10px` |
| letter-spacing | `0.12em` | `0.14em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| margin-bottom | `5px` | `7px` |
| text | `Mana value` (`changed.manaValue`) · role name, in `ROLE_ORDER` | `Mana value` · `Ramp` · `Draw` · `Removal` · `Wipes` · `Land` |

### Strip cell — figures

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `baseline` | `baseline` |
| gap | `5px` | `7px` |
| before — font-family / size / color | `var(--font-mono)` / `12px` / `#6A6152` (`--fg-locked`) | `var(--font-mono)` / `15px` / `#6A6152` |
| arrow — font-family / size / color / glyph | `var(--font-mono)` / `10px` / `#6A6152` / `→` | `var(--font-mono)` / `12px` / `#6A6152` / `→` |
| after — font-family / size | `var(--font-mono)` / `16px` | `var(--font-mono)` / `19px` |
| after — color, improving or at rec | `#6FA368` (`--success`) | `#6FA368` (`--success`) |
| after — color, still short | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| mana-value format | `3.10 → 2.92` — two decimals | `3.10 → 2.92` |
| role format | bare integers, no sign | bare integers, no sign |
| count-up animation | **—** (forbidden) | **—** |

### Strip cell — verdict note

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on phone)** | drawn |
| font-family | — | `var(--font-mono)` |
| font-size | — | `10px` |
| margin-top | — | `6px` |
| color, default | — | `#6A6152` (`--fg-locked`) |
| color, role crosses its rec | — | `#6FA368` (`--success`) |
| mana value falling | — | `the curve comes down` (`changed.manaValueDown`) |
| mana value rising | — | `the curve goes up` (`changed.manaValueUp`) |
| role at or over rec | — | `clears rec 8` (`changed.clears(rec)`) |
| role under rec | — | `still under rec 10` (`changed.under(rec)`) |
| unmoved land cell | — | canvas `holds at rec ~37` — **no copy-module string exists** (Discrepancy 15) |

### Strip cell — a figure that did not move

| Property | Mobile | Desktop |
|----------|--------|---------|
| cell rendered | yes — the cell always draws | yes |
| figures | `before → after` with equal values (`1 → 1`, `37 → 37`) | same |
| after colour | canvas colours the unmoved wipes cell `#E0913C` and the unmoved land cell `#6FA368` — the rule is rec-relative, not movement-relative (Discrepancy 16) | same |
| mix-cell copy on the deck page | state A10: a draft that moves no mix figure keeps `rec n` rather than `was n` | same |
| nothing to average (no cards) | — (no state defined; see Ambiguous 1) | — |

### Type-distribution block ("how the shape moves") — container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| border-radius | `8px` | `9px` |
| padding | `11px 12px` | `14px 16px` |
| margin-bottom | `13px` | `20px` |

### Type block — header

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | block (heading only) | `flex`, `align-items: baseline`, `justify-content: space-between` |
| heading font | `var(--font-mono)` `9px` `0.12em` uppercase `#8E8269` | `var(--font-mono)` `10px` `0.14em` uppercase `#8E8269` |
| heading margin-bottom | `9px` | — (header row carries `margin-bottom: 11px`) |
| heading text | `How the shape moves` | `How the deck's shape moves` (`changed.shapeHeading`) (Discrepancy 17) |
| right-hand note | **— (not drawn)** | `var(--font-mono)` `10px` `#6A6152` — `the interaction came from the self-mill package`; **no copy-module string** (Discrepancy 18) |

### Type block — rows container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |
| gap | `6px` | `7px` |
| rows drawn | **4** — Instants, Creatures, Sorceries, `Enchant.` (abbreviated) | **6** — Instants, Creatures, Sorceries, Enchantments, Artifacts, Lands |

### Type block — row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `8px` | `12px` |
| type label — width / flex | `74px` / `none` | `110px` / `none` |
| type label — font-size / color | `12px` / `#C6B79A` (`--fg-body`) | `12.5px` / `#C6B79A` (`--fg-body`) |
| type label — font-family | `var(--font-sans)` (inherited) | `var(--font-sans)` (inherited) |
| before→after — width / flex | — / `1` | `96px` / `none` |
| before→after — font | `var(--font-mono)` `11px` `#8E8269` (`--fg-faint`) | `var(--font-mono)` `11.5px` `#8E8269` |
| after figure inside it | `color: #EDE6D8` (`--fg`) | `color: #EDE6D8` (`--fg`) |
| format | `8 → 20` (`changed.shapeRow`) | `8 → 20` |
| delta — width / text-align | — (intrinsic, at the row's end) | `44px` / `right` |
| delta — font | `var(--font-mono)` `11px` | `var(--font-mono)` `11.5px` |
| delta — colour, positive | `#6FA368` (`--success`), `+12` | `#6FA368`, `+12` |
| delta — colour, negative | `#E0913C` (`--warning`), `−5` (U+2212) | `#E0913C`, `−5` |
| delta — colour, zero | — (no zero row drawn on phone) | `#6A6152` (`--fg-locked`), `0` (`changed.delta`) |

### Type block — the bar (desktop only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on phone)** | drawn |
| display | — | `flex`, `overflow: hidden` |
| flex | — | `1` |
| height | — | `7px` |
| border-radius | — | `999px` |
| track background | — | `#26211B` (`--border`) |
| max-width | — | `520px` |
| kept segment | — | `background: #4A4033` (unnamed), `flex: {min(before, after)}` |
| gained segment | — | `background: #6FA368` (`--success`), `flex: {delta}` |
| lost segment | — | `background: #E0913C` (`--warning`), `flex: {delta}` |
| headroom segment | — | `background: transparent`, `flex: {remainder}` |
| unmoved row | — | one `#4A4033` segment plus transparent headroom; no coloured segment |
| flex denominators as drawn | — | Instants `8/12/12`, Creatures `25/5/2`, Sorceries `7/4/21`, Enchantments `5/1/26`, Artifacts `7/25`, Lands `37` (Discrepancy 19) |

### What-changed strip — conditional rendering

| Condition | Result |
|---|---|
| A type whose count did not move (state A9) | The type block **renders only the types whose count moved** — "a row of zeroes is a table explaining it has nothing in it". The canvas nonetheless draws `Artifacts 0` and `Lands 0` (Discrepancy 20) |
| A role figure that did not move (state A10) | The cell still draws; the deck page's mix cell keeps `rec n` rather than `was n` |
| A count of nought | Never drawn as `−0`, an empty cell or an empty row |
| `body` as a cell | **Never** — not a role, though `changed.body` and `changed.bodyOver` still ship for the hero's over-cap line |
| A curve histogram or per-role breakdown | Not drawn (gap 9) |
| Motion on this surface | **—** (only the commit sheet opens and closes) |
| Hover / focus / active on a cell or row | — (not specified; nothing here is interactive) |

---

## Component: Discard confirm

The banner's own box with a `--danger` left rule, raised in place by the banner's `Discard`
control (state D31) or in the review page's apply bar (state D32, "the same two lines and
the same two buttons … no second wording"). **`--danger` appears here and nowhere else in
the feature.** The product owns no confirm dialog, modal, focus trap or toast.

### Confirm box

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A160F` (`--surface-rail`) | `#1A160F` (`--surface-rail`) |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| border-left | `3px solid #C6533F` (`--danger`) | `3px solid #C6533F` (`--danger`) |
| border-radius | `10px` | `10px` |
| padding | `13px 14px` | `15px 17px` |
| margin-bottom | — (last thing in the screen body) | `14px` (before the annotation prose) |
| width | full width inside the screen's `14px` padding | drawn at 558px inside the 600px annotation card |
| replaces | the banner's body (state D31) | the banner's body |
| modal, overlay, focus trap | **—** | **—** |

### Confirm — question (`discard.question(n)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.14em` | `0.16em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#C6533F` (`--danger`) | `#C6533F` (`--danger`) |
| margin-bottom | `9px` | `9px` |
| text | `Discard 36 changes?` | `Discard 36 changes?` |

### Confirm — consequence (`discard.consequence(version, date, cards, adds, removes)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` (inherited) | `var(--font-sans)` (inherited) |
| font-size | `12.5px` | `13px` |
| line-height | `1.55` | `1.55` |
| color | `#C6B79A` (`--fg-body`) | `#C6B79A` (`--fg-body`) |
| max-width | — (not set) | `520px` |
| margin-bottom | `13px` | `14px` |
| bolded version phrase | `v2, committed 14 Mar` — `#EDE6D8` (`--fg`), `font-weight: 600` | `v2 as committed on 14 Mar` — `#EDE6D8`, `font-weight: 600` |
| text as drawn | `Back to v2, committed 14 Mar — 99 cards. Nothing about the draft is stored, so this cannot be undone.` | `The deck goes back to v2 as committed on 14 Mar — 99 cards. The nineteen you added and the seventeen you cut are not stored anywhere, so this cannot be undone.` (Discrepancy 21) |
| facts it must name | version, its date, its card count | version, its date, its card count, the add count, the remove count |

### Confirm — button row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `row` (default) |
| align-items | — (stretch) | `center` |
| gap | `8px` | `10px` |
| flex-wrap | — | `wrap` |
| **order** | `Keep editing` **first**, `Discard 36 changes` second | `Discard 36 changes` first, `Keep editing` second |
| why | "the thumb reaches the bottom row first, and the bottom row is the unrecoverable one" | Discard is never the reachable-first control by tab order either (READINESS 119) |

### Confirm — `Discard {n} changes` (the shipped danger button)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `13.5px` | `13.5px` |
| font-weight | `600` | `600` |
| color | `#C6533F` (`--danger`) | `#C6533F` (`--danger`) |
| background | — (ghost) | — (ghost) |
| border | `1px solid #4A2F28` (unnamed, shipped) | `1px solid #4A2F28` |
| border-radius | `8px` | `8px` |
| padding | — (centring instead) | `10px 18px` |
| min-height | `44px` | — (not set) |
| display / align / justify | `flex` / `center` / `center` | inline |
| width | full width | intrinsic |
| pending label | `Discarding…` (`discard.pending`), disabled (state D33) | `Discarding…`, disabled |
| hover / focus / active | — (not specified) | — (not specified) |

### Confirm — `Keep editing` (`discard.cancel`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` | `var(--font-sans)` |
| font-size | `14px` | `13.5px` (Discrepancy 22) |
| font-weight | `600` | `600` |
| color | `#14110E` (ink) | `#14110E` (ink) |
| background | `#E8E4D6` (cream primary) | `#E8E4D6` (cream primary) |
| border | — (none) | — (none) |
| border-radius | `8px` | `8px` |
| padding | — (centring instead) | `10px 18px` |
| min-height | `48px` (it is the primary here) | — (not set) |
| width | full width | intrinsic |
| in flight | disabled (state D33) | disabled |
| hover / focus / active | — (not specified) | — (not specified) |

### Confirm — discard refusal (state D35)

| Property | Mobile | Desktop |
|----------|--------|---------|
| component | the shipped `MutationError`, in the banner | the shipped `MutationError`, in the banner |
| text | `We couldn't discard those changes. Nothing has changed.` (`discard.refused`) | same |
| the confirm | stays open; the draft is untouched | stays open |
| undo offer | **—** | **—** |

### Discard — conditional rendering

| Condition | Result |
|---|---|
| At rest (state D30) | A neutral ghost `Discard` in the banner, third of three controls — no confirm drawn |
| Confirming from the review page (state D32) | The same two lines and the same two buttons **in the apply bar**, no second wording |
| Discarding (state D33) | `Discarding…`, both controls disabled, the banner in place, nothing unmounts |
| Discarded (state D34) | Deck page in state 3; announced `36 changes discarded. Back to v2.`; focus on the deck name (READINESS 20); **no undo offer, no toast** |
| Refused (state D35) | `MutationError` in the banner, confirm stays open |
| `--danger` anywhere else in the feature | **Never** (Contract frame: "`--danger` only Discard") |
| A modal or a browser `confirm()` | **—** — the product owns no confirm dialog |

---

## State Coverage

State numbers are **section-scoped** to `STATES-pending.md` (§Errata), so a number needs its
table letter. Table C is the commit sheet, table D is discard, and table A rows 9–10 are the
two the strip owns.

| State | Triggering condition | Component rendered | Key props required |
|---|---|---|---|
| C21 — Opened | the reader presses `Commit as v{n}` in the banner or the apply bar | The sheet: heading, lede, empty note, one money block (`8` · `$254.10`, `3 not owned · 5 still sleeved elsewhere`, the link-out), one released block (`17`, *no action required*), the apply bar. **No card rows** | `version`, `cardCount` (server), `buyCount`, `buyTotal`, `unownedCount`, `sleevedCount`, `releasedCount`, `manaPoolUrl` |
| C22 — Nothing to buy | every add has a free copy | **The whole money block absent, link-out included**; the released block takes the full width | `buyCount === 0` |
| C23 — Nothing released | `removes.length === 0` | The released block absent | `releasedCount === 0` |
| C24 — Note typed | any keystroke in the note | Nothing changes — never validated, never counted, never required; nothing blocks the commit | `note` (client state only) |
| C25 — Committing | the commit mutation is in flight | `Committing…`, disabled; `Cancel` disabled; the sheet stays in place and legible (§Errata deletes "both lists stay in place" — there are no lists) | `isPending` |
| C26 — Committed | mutation resolved | Route returns to the deck page; banner gone; version line `v3 · committed 10 Sep`; focus on that line; announced `Committed v3. 101 cards, 8 to buy.`; **no toast** | server `version`, `cardCount`, `buyCount`, announcement |
| C27 — Refused | mutation rejected | Shipped `MutationError` under the button; **the note is preserved** | `error`, `note` |
| C28 — Cancelled | `Cancel` pressed | The sheet collapses (the shipped panel transition); the note is discarded with **no confirm** | — |
| C29 — Reopened after cancel | the sheet is opened again in the same visit | The note is **empty again** | — (no persistence) |
| D30 — At rest | a draft exists | Neutral ghost `Discard` in the banner, third of three controls | `changeCount` |
| D31 — Confirming | `Discard` pressed in the banner | The banner's body replaced by the confirm box: `--danger` question, consequence naming v2 / its date / its card count, then `Discard 36 changes` (danger) and `Keep editing` (cream primary). **Phone: `Keep editing` on top** | `changeCount`, `currentVersion`, `versionDate`, `versionCardCount`, `addCount`, `removeCount` |
| D32 — Confirming from the review page | `Discard` pressed in the apply bar | The same two lines and the same two buttons, in the apply bar. No second wording | as D31 |
| D33 — Discarding | the discard mutation is in flight | `Discarding…`, both controls disabled, the banner in place | `isPending` |
| D34 — Discarded | mutation resolved | Deck page in state 3; announced `36 changes discarded. Back to v2.`; focus on the deck name; **no undo offer** | `changeCount`, `currentVersion`, announcement |
| D35 — Refused | mutation rejected | `MutationError` in the banner; the draft untouched; the confirm stays open | `error` |
| A9 — Draft with no type changed | a type's before and after are equal | The type block renders **only** the types whose count moved | per-type before/after |
| A10 — Draft that moves no mix figure | a role's before and after are equal | The strip cell still draws; the deck page's mix cell keeps `rec n` instead of `was n` | per-role before/after, `rec` |

### Cross-surface conditions that change Surface 3

| Condition | Effect | Source |
|---|---|---|
| Money figures | The banner total, the review page's to-buy chip and **the sheet's sum** are **one query** (`loadDeckBuyRows`, left-joined) rendered three times | OVERLAPS check 4 |
| Mana Pool link-out | **Exactly one instance in the whole feature, and it is in the commit sheet** — never on the review page, never on the deck page | OVERLAPS call 1, check 1 |
| Purchase claims | Top-off and commit are the two surfaces that make one; `+` prefix means a contribution, a bare figure means the deck's position. The sheet's figures are bare | README §1 of the overlap table |
| Stale money | The buy list is computed on load and can be stale by the time the sheet is read; no "prices as of" line is drawn | gap 4 |
| Commit's card count | The **server's** `cardCount`, never a client recount | §Errata |
| Revalidation after a commit or a discard | `revalidateClaims(deckId, userId)`, **not** `deckSurfaces()` | §Errata (Discrepancy 23) |
| The strip's inputs | `cmc` joins the detail select, and the version's cards come through `deck_version_cards → cards` — contradicting the eng note's "no new column, and no new query" | §Errata, READINESS 24 |
| Mana value and the histogram | Derived on read, never stored; `draft-diff` has no figures of its own | §Notes for engineering |
| Motion | **The commit sheet's open and close, and nothing else.** No count-up on any figure, including the strip | Contract frame, READINESS 19 |
| Targets | 44px minimum for every banner and apply-bar control at 390px, **48px for the two primaries** (`Commit v3`, `Keep editing`) | Contract frame, READINESS 282–283 |
| Announcements | One live-region message per settle, on the **existing** region | STATES §Announcements |

---

## Absences the design states explicitly (write `—`, do not add)

| Element | Status |
|---|---|
| Card rows, names or prices inside the commit sheet | **Withdrawn** (§Errata) — "a confirmation step that re-lists what you just read is not a confirmation, it is a second copy" |
| An eight-row priced buy list and a seventeen-name pull list in the sheet | **Deleted** — they are the review page, one screen up |
| A checklist, tick boxes, or a "mark as bought" control | **Never** — the buy tag is already the outstanding state everywhere in the app |
| A "prices as of" / staleness line in the sheet | Not drawn (gap 4) |
| A placeholder in the note field beyond its label | **—** |
| A pre-filled, remembered or carried-over note | **—** (states 21 and 29) |
| Note validation, a character counter, a required marker | **—** (state 24) |
| A confirm on `Cancel` | **—** (state 28) |
| An action, a link-out or prices in the released block | **—** (READINESS 4 — it is a receipt) |
| Names in the released block | **—** |
| A toast on commit or on discard | **—** — the deck page is the receipt |
| An undo offer after a discard | **—** — there is nothing to undo with |
| A modal, sheet-as-modal, focus trap, tray, tooltip or confirm dialog | **None exists in the product** |
| `--danger` anywhere but Discard | **—** |
| Discard as the primary, or as the reachable-first control | **—** (READINESS 116, 119) |
| A second wording for the confirm on the review page | **—** (state D32) |
| Count-up animation on any figure | **Forbidden** |
| Motion anywhere but the sheet's open and close | **—** |
| `body` as a strip cell | **Not a role** — the six cells are mana value + `ramp, draw, removal, wipes, land` |
| Mana value on a card row | **—** — it lives in the strip alone |
| A curve histogram or per-role breakdown in the strip | Not drawn (gap 9) |
| A count of nought — `−0`, an empty cell, an empty row, an empty block | Never drawn |
| A row of zeroes in the type block | **—** (state A9) |
| A bar in the phone shape block | **—** |
| Verdict notes in the phone strip | **—** |
| An icon or external-link glyph on `Open in Mana Pool` | **—** |
| Hover, focus-visible or active styling for `Commit v{n}`, `Cancel`, `Open in Mana Pool`, `Discard {n} changes` or `Keep editing` | **Not specified anywhere in the bundle** |
| A disabled fill or a spinner for any in-flight control | Not specified — the label changes and the control disables in place |
| New tokens, hexes or motion classes | None |

---

## Contradictions inside the bundle, and the value recorded above

| Subject | Recorded value | Loser, and why |
|---|---|---|
| Commit sheet contents | **Totals only — no card rows** (§Errata) | the Component notes' "note block, two lists, apply bar" and state 25's "both lists stay in place" |
| Strip cell inventory and order | **mana value, ramp, draw, removal, wipes, land** (`changed.cells`, §Errata) | README §3b's "mana value, removal, draw, ramp, **body**" and the canvas's drawn order (removal, draw, ramp, wipes, land) |
| Commit's card count | **the server's `cardCount`** | any client-side recount |
| Revalidation | **`revalidateClaims(deckId, userId)`** (§Errata) | "Revalidation goes through `deckSurfaces()`" in the same eng notes |
| The strip's inputs | **`cmc` in the detail select, plus `deck_version_cards → cards`** (§Errata) | the eng notes' "no new column, and no new query" |
| Money-block / released-block / note-field fill | canvas desktop `#14110E` (`--base`), canvas phone `#1A1713` (`--surface`) — both recorded per column | the Component notes, which say `--base` for both widths |
| Link-out border | canvas `1px #3A3229` (`--border-strong`) | the Component notes' `1px --border` (`#26211B`) |
| Link-out label size | canvas desktop `12.5px`, phone `13px` | the Component notes' flat `12.5px` |
| `To buy` label | canvas `To buy` with the count in the figure row | §Copy per state's `To buy · {n}`, and `commit.buyHeading` is the bare `To buy` |
| Released count's position | desktop big figure, phone in the label | no rule reconciles them; both drawn values recorded |
| Note warning on phone | **absent as drawn** | the Component notes' unconditional "mono 10px `--fg-locked` warning beneath" |
| State numbering | **section-scoped** | any flat reading — table B's 21–25 and table C's 21–25 are different states |

## Ambiguous or missing in the design (no value to verify against)

1. **Nothing to average for mana value.** No state covers an empty deck or a version with no
   non-land cards, so there is no drawn value for the mana-value cell when the denominator is
   nought. Rule 1 ("a count of nought is never drawn") suggests absence, but the strip's cells
   are otherwise unconditional.
2. **The commit sheet's open and close transition is named, never specified.** "The shipped
   panel transition" / "Opens with the shipped panel transition" — no duration, easing or
   property is given anywhere in the bundle.
3. **`MutationError`'s own geometry.** Both refusal states name the shipped component and give
   no values; its spacing inside the sheet and inside the banner is unspecified.
4. **No hover, focus-visible or active state is specified for any Surface 3 control** — five
   interactive elements (`Open in Mana Pool`, `Commit v{n}`, `Cancel`, `Discard {n} changes`,
   `Keep editing`) plus the money block's back link, whose only state comes from the canvas's
   global `a:hover` rule.
5. **Disabled appearance.** States C25 and D33 disable controls and change labels; no disabled
   fill, opacity or border value is given.
6. **The note field is drawn as a filled `div`, never as a `textarea`.** Its resting (empty)
   appearance, its caret, its resize behaviour and its scroll past `min-height` are undrawn.
7. **Focus on opening the sheet.** States 26 and 34 name focus destinations after a write;
   nothing says where focus goes when the sheet opens, or when the confirm replaces the
   banner's body.
8. **The desktop confirm's tab order.** READINESS 119 rules that Discard is "never the
   reachable-first control", and the desktop frame draws it first in the DOM. No
   reconciliation (`order`, an explicit `tabindex`, or a DOM inversion) is given.
9. **`Open in Mana Pool`'s target.** No URL shape, `target`, `rel` or link-versus-button
   decision appears in this bundle.
10. **The type block's `max-width: 520px` bar** has no rule for a narrower desktop column, and
    the sheet and the strip are drawn at three different widths across the canvas (718px,
    1180px, 558px).

---

## Discrepancies between design files

1. **The desktop frames are not page-width.** The commit sheet is drawn 718px wide inside a
   760px annotation card and the discard confirm 558px inside a 600px card, while the review
   page it lives at the foot of is a 1180px frame. No value reconciles the sheet's width to
   the page's.
2. **The sheet's own fill only exists on desktop.** The desktop sheet is `#1A1713` on
   `1px #3A3229` radius 12px; the phone frame has no sheet container at all — the screen is
   `#14110E` and each block inside is `#1A1713`. The phone commit sheet is therefore drawn as
   a route, not as an expanded block.
3. **Numerals are spelled out on the canvas and interpolated in the copy module.** The lede
   draws `the eight cards` / `the seventeen you cut`, the back link `the eight rows`, the
   consequence `The nineteen you added and the seventeen you cut`; `commit.lede`,
   `commit.buyBackLink` and `discard.consequence` all interpolate digits.
4. **Note field, money block and released block fills disagree across widths.** Desktop draws
   `#14110E` (`--base`, matching the Component notes); phone draws `#1A1713` (`--surface`) for
   all three. No responsive rule is stated.
5. **The phone sheet drops `commit.noteWarning` entirely.** The Component notes specify the
   `mono 10px --fg-locked` warning beneath the field unconditionally; the phone frame draws
   only the field, with `margin-bottom: 14px` where the warning would be.
6. **`To buy` versus `To buy · {n}`.** §Copy per state lists the heading as `To buy · {n}`;
   `commit.buyHeading` is the bare string `To buy`, and both canvas frames draw the bare
   label with the count as the 24px/22px figure beneath.
7. **The word `still` is dropped on the phone breakdown.** Phone: `3 not owned · 5 sleeved
   elsewhere`. The annotation card in the same section argues the opposite in bold — "**The
   word is _still_**: five pulls are on the table and you have not taken them" — and
   `commit.buyBreakdown` ships `still sleeved elsewhere`.
8. **The phone money block has no back link.** `commit.buyBackLink` exists and §Errata makes
   it the sheet's one gesture toward the rows ("`commit.buyBackLink` points back up at the
   rows"); the phone frame draws no link, so on the phone nothing points back at them.
9. **Link-out label size.** Component notes: `--accent` label 12.5px. Canvas: 12.5px desktop,
   **13px** phone.
10. **Link-out border.** Component notes: `1px --border` ghost (`#26211B`). Canvas, both
    widths: `1px solid #3A3229` (`--border-strong`). Its radius also differs by width — 7px
    desktop, 8px phone.
11. **The released count moves between the label and the figure.** Desktop: label `Back in the
    pool`, figure `17` at 24px `--success`. Phone: label `Back in the pool · 17`, **no
    figure**. `commit.pullHeading(n)` returns `Back in the pool · {n}`, which matches the
    phone, so the desktop label is not a copy-module string.
12. **`commit.pullNote` is shortened on the phone.** Phone draws `No action required —
    committing releases them.`; the copy module and the desktop frame both carry `No action
    required: committing is what releases them. Take them out of the box whenever you next
    open it.` No responsive copy variant is specified. (**Amended 2026-09-13**: both strings
    were drawn with an em dash; the copy module now ships a colon. The canvas quote above is
    left as the drawing's own record.)
13. **The apply bar's footer note changes position by width.** Desktop: `Commit v3`, `Cancel`,
    then the note, in a `center`-aligned wrapping row. Phone: the note **first**, above both
    buttons. The bundle states no ordering rule for it, unlike the discard pair.
14. **The phone strip drops three of the six cells and substitutes one.** Desktop draws Mana
    value, Removal, Draw, Ramp, Wipes, Land; phone draws Mana value, Removal, **Ramp**. No
    rule says which three survive at 390px, or that Ramp outranks Draw.
    **Resolved 2026-09-13 (Hugh):** "We need to render all of these cards on mobile, we can't
    just selectively remove three." The phone draws all six, three across in two rows, so the
    reader is held to the same list of recommendations at either width. There is no ranking to
    settle because nothing is dropped. The per-cell verdict line stays desktop-only.
15. **`holds at rec ~37` matches no copy string.** `changed.clears(rec)` and
    `changed.under(rec)` are the only two verdict strings, and neither produces a `~`.
16. **The unmoved cells' colours contradict each other.** `Wipes 1 → 1` draws `#E0913C`
    (still under rec 3) and `Land 37 → 37` draws `#6FA368` (holds at rec ~37) — so the
    after-figure's colour is rec-relative, not movement-relative, which no stated rule says.
17. **The shape block's heading has two forms.** `changed.shapeHeading` and the desktop frame
    say `How the deck's shape moves`; the phone frame says `How the shape moves`.
18. **The desktop shape block carries a right-hand note with no copy string.** `the
    interaction came from the self-mill package` is drawn in mono 10px `#6A6152` and appears
    in no copy module, no state and no component note. It reads as generated prose about a
    specific diff.
19. **The shape bar's segments are arithmetically loose.** Instants `8 → 20` draws kept 8,
    gained 12, headroom 12 (total 32); Creatures `30 → 25` draws kept 25, lost 5, headroom 2
    (total 32); Sorceries totals 32, Enchantments 32, Artifacts 32, Lands 37. Five rows share
    a 32 denominator and the land row uses 37, so the bars are not on one scale.
20. **The canvas draws zero rows the states forbid.** `Artifacts 7 → 7` and `Lands 37 → 37`
    both draw with a `0` delta, while state A9 rules the type block renders only the types
    whose count moved.
21. **The phone consequence is a different sentence, and drops two facts.** Desktop:
    `The deck goes back to v2 as committed on 14 Mar — 99 cards. The nineteen you added and
    the seventeen you cut are not stored anywhere…`. Phone: `Back to v2, committed 14 Mar —
    99 cards. Nothing about the draft is stored…`, which names neither the add count nor the
    remove count. §Copy per state and `discard.consequence` both ship only the desktop form.
22. **`Keep editing`'s type size inverts between widths.** Phone 14px / desktop 13.5px, while
    the sheet's `Commit v3` is 14px in both. The Component notes call `Keep editing`
    "brass-solid" and the annotation card calls it "the cream primary" — the drawn fill is
    `#E8E4D6` cream, not brass (`#C9A24B`).
23. **The discard phone frame's header draws `101 / 99` in `--warning`.** That is the deck's
    over-cap hero figure (`changed.bodyOver`'s territory), rendered while the confirm asks to
    go back to 99 cards. No state covers the header during a confirm, and `body` is ruled out
    as a strip cell while this figure still ships.
24. **Revalidation is named twice, differently.** The eng notes say `revalidateClaims(deckId,
    userId)` in one bullet and "Revalidation goes through `deckSurfaces()`" in another;
    §Errata picks `revalidateClaims`.
25. **`changed.body` and `changed.bodyOver` still ship** though §Errata rules `body` is not a
    role and the copy module's own comment says `bodyOver` is "the hero's over-cap line, NOT a
    strip cell".
26. **`commit.footer` says `released` where every other string says `back in the pool`.**
    `101 cards · 8 to buy · 17 released`, against `commit.pullHeading`'s `Back in the pool`
    and the lede's `back in the pool the moment you commit`.
27. **`Cancel` is 44px and `Commit v3` is 48px on the phone, while the discard pair is 48px
    for `Keep editing` and 44px for `Discard`.** Both follow the "48px for the two primaries"
    floor, which means the primary swaps side between the two surfaces — deliberate per
    README §6, but it leaves `Cancel` and `Discard` at the same 44px height with opposite
    meanings in adjacent flows.
