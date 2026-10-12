
# Design Property Table — Deck Tuning Suggestions

**Sources:** `README.md`, `STATES-tuning-panel.md`, `INTENT-where-it-lives.md`, `READINESS.md`, `deck-tuning · copy strings.ts`, `The 99 - Deck Tuning.dc.html` (canvas, authority on pixels), `brand/README.md` (hex→token map). `support.js` is the DC runtime only — no tokens live there.

**Token map resolved from `brand/README.md` + prose↔canvas correlation** (used throughout; hex given where the canvas is the only source):

| Token | Hex |
|---|---|
| `--fg` | `#EDE6D8` |
| `--fg-body` | `#C6B79A` |
| `--fg-muted` | `#A89B84` |
| `--fg-faint` | `#8E8269` |
| `--fg-locked` | `#6A6152` |
| `--surface` | `#1E1A15` |
| `--surface-sunken` | `#181410` |
| base / page | `#14110E` |
| `--elevated` | `#2A241D` |
| `--elevated-hover` | `#211C15` |
| `--border` | `#2A241D` |
| `--border-strong` | `#4A4033` |
| line (dividers, ghost outlines) | `#3A3229` |
| `--accent` | `#C9A24B` |
| accent-hover | `#D8B25E` |
| `--accent-shadow` | `#6E5B33` |
| `--success` | `#6FA368` |
| `--warning` | `#E0913C` |
| `--danger` | `#C6533F` |

Fonts: `Cinzel` (serif, headings), `IBM Plex Sans` (body/buttons), `IBM Plex Mono` (mono). **Breakpoint 768px / `md:`** — amended 2026-09-13 from the 640px / `sm:` this table was drafted with, because `game-log.md` declares `md:` and #9's form and History row, which #10 amends rather than replaces, are built to it. Switching only #10's additions at 640px would have put them in a desktop arrangement the surfaces around them do not adopt until 768px. Desktop frames drawn at 900px, phone frames at 390px content width.

---

## Component: Game Log Form — Note Field (Surface 1, CHANGE)

> **Shipped 2026-09-13.** Measured by `scripts/probe-game-note.mjs`. One
> divergence, below.
>
> **Errata · the explanatory line.** The canvas draws *"Read back to you in the
> history, and read by the tuning panel — quoted, never paraphrased"*. The
> tuning panel does not exist, so the clause naming it is held back and the line
> ships as *"Read back to you in the history: quoted, never paraphrased"*. The
> full sentence is in `deckTuningCopy.note.readBack`'s comment; restore it with
> the panel. Shipping it now would promise a surface nobody can open.

### Container / section rule

| Property | Mobile | Desktop |
|----------|--------|---------|
| position | below both mark columns, above the buttons | below both mark columns, above the buttons |
| margin-top | 16 | 18 |
| padding-top | 14 | 16 |
| border-top | `1px solid var(--accent)` `#C9A24B` | `1px solid var(--accent)` `#C9A24B` |
| border-right / left / bottom | — | — |
| display | block | block |
| effect on elements above | none — nothing above it moves | none — nothing above it moves |

### Label row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 8 | 8 |
| margin-bottom | 8 | 9 |

### Label — "Note"

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10 |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |

### Gloss — "one line, in your words"

| Property | Mobile | Desktop |
|----------|--------|---------|
| text | `optional` (shortened) | `one line, in your words` |
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10 |
| color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| text-transform | none | none |

> **Errata (2026-09-13).** The desktop gloss drops "optional". At `md:` the footer
> under the buttons already says "marks and the note are optional", so the word
> appeared twice on one screen. The PHONE keeps `optional` because that footer is
> `hidden md:block` — there the gloss is the only marker, and without it the field
> reads as required.

### Counter — "78 / 140"

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10 |
| color (normal) | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| color (from 130 chars) | `var(--warning)` `#E0913C` | `var(--warning)` `#E0913C` |
| margin-left | auto | auto |
| font-variant-numeric | not set on phone frame | `tabular-nums` |
| conditional rendering | absent until focus or content | absent until focus or content |
| aria | referenced by the input's `aria-describedby` | referenced by the input's `aria-describedby` |

### Input field

| Property | Mobile | Desktop |
|----------|--------|---------|
| element | `<input>` — never a textarea | `<input>` — never a textarea |
| min-height | 48 | 46 |
| background | `var(--surface-sunken)` `#181410` | `var(--surface-sunken)` `#181410` |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color (rest) | `var(--border-strong)` | `var(--border-strong)` |
| border-color (focus/typing) | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| border-radius | 8 | 8 |
| padding | `11px 13px` | `12px 14px` |
| display | block (text wraps in the frame) | flex |
| align-items | — | center |
| font-size | 13.5 | 13.5 |
| line-height | 1.45 | not set |
| color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |
| maxlength | 140 (hard stop, no error) | 140 (hard stop, no error) |
| placeholder | — (no placeholder; label above) | — |
| required | — never, not even on a loss | — never, not even on a loss |

### Explanatory line under the field (desktop only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional rendering | absent | present |
| font-family | — | `IBM Plex Mono` |
| font-size | — | 10 |
| color | — | `var(--fg-faint)` `#8E8269` |
| margin-top | — | 8 |
| line-height | — | 1.5 |

### Optional-marks line (amended, in the button row)

| Property | Mobile | Desktop |
|----------|--------|---------|
| text | (not drawn in phone frame) | `marks and the note are optional: a result on its own is a game` |
| font-family | — | `IBM Plex Mono` |
| font-size | — | 11 |
| color | — | `var(--fg-faint)` `#8E8269` |
| line count | — | stays one line |

### Save / Cancel row (context, unchanged from #9)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| align-items | — | center |
| gap | 9 | 16 |
| flex-wrap | — | wrap |
| margin-top | 18 | 20 |
| padding-top | 16 | 18 |
| border-top | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| Save height | 48 | padding `11px 20px` |
| Save font-size | 14.5 | 14 |
| Save font-weight | 600 | 600 |
| Save color / background | `#14110E` on `var(--accent)` `#C9A24B` | `#14110E` on `var(--accent)` `#C9A24B` |
| Save border-radius | 8 | 8 |
| Cancel height | 44 | padding `11px 18px` |
| Cancel font-size | 13.5 | 13.5 |
| Cancel font-weight | 500 | 500 |
| Cancel color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| Cancel border | `1px solid #3A3229` | `1px solid #3A3229` |
| Save enabled-ness | never gated by the note | never gated by the note |

### Note field — state: Untouched (1)

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | `var(--border-strong)` (rest) | `var(--border-strong)` (rest) |
| counter | absent | absent |
| value | empty, no placeholder | empty, no placeholder |
| Save | enabled by the result alone | enabled by the result alone |

### Note field — state: Focused, empty (2)

| Property | Mobile | Desktop |
|----------|--------|---------|
| border | `1px solid var(--accent)` `#C9A24B` | `1px solid var(--accent)` `#C9A24B` |
| counter | `0 / 140`, `var(--fg-locked)` | `0 / 140`, `var(--fg-locked)` |
| focus ring | global `:focus-visible`, 2px brass at +2px offset | global `:focus-visible`, 2px brass at +2px offset |

### Note field — state: Typing (3)

| Property | Mobile | Desktop |
|----------|--------|---------|
| border | `1px solid var(--accent)` | `1px solid var(--accent)` |
| counter | `78 / 140`, `var(--fg-locked)` `#6A6152` | `78 / 140`, `var(--fg-locked)` `#6A6152` |

### Note field — state: Near the cap (4) — ≥130 chars

| Property | Mobile | Desktop |
|----------|--------|---------|
| border | `1px solid var(--accent)` | `1px solid var(--accent)` |
| counter color | `var(--warning)` `#E0913C` | `var(--warning)` `#E0913C` |
| counter text | `133 / 140` | `133 / 140` |

### Note field — state: At the cap (5) — 140 chars

| Property | Mobile | Desktop |
|----------|--------|---------|
| input | stops accepting characters | stops accepting characters |
| counter | `140 / 140`, `var(--warning)` | `140 / 140`, `var(--warning)` |
| error message | — (explicitly none) | — (explicitly none) |
| border-color on error | — (never red) | — (never red) |

### Note field — state: Saving (6)

| Property | Mobile | Desktop |
|----------|--------|---------|
| interactivity | non-interactive, in place (nothing unmounts) | non-interactive, in place |
| counter | frozen at its current value | frozen at its current value |
| Save label | `Saving…` | `Saving…` |

### Note field — state: Refused (7)

| Property | Mobile | Desktop |
|----------|--------|---------|
| value | preserved verbatim | preserved verbatim |
| counter | preserved | preserved |
| error | shipped `MutationError` component | shipped `MutationError` component |
| field clearing | — nothing is cleared | — nothing is cleared |

### Note field — state: Reopened (8)

| Property | Mobile | Desktop |
|----------|--------|---------|
| value | empty — never pre-fills from history | empty — never pre-fills from history |
| counter | absent | absent |

---

## Component: Game History Row — Note Line (Surface 2, CHANGE)

> **Shipped 2026-09-13**, ahead of the rest of this table, with
> `deck_games.note` and its 140-character check (migration
> `0029_slow_whiplash`). The form's Note Field above shipped the same day, so
> the app writes notes at log time; a game already in the history has no edit
> path — #9 ships none by design — and takes a note by hand against the
> database.
>
> **The breakpoint** is `md:` / 768px, settled 2026-09-13 for this whole table —
> see the amendment at the top.

### Row container (unchanged from #9)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| border-radius | 9 | 9 |
| padding | `9px 12px` | `8px 12px 8px 14px` |
| gap between rows | 6 | 6 |
| list order | newest first, no pagination, no filter | newest first, no pagination, no filter |
| height when no note | exactly the shipped 52px row | exactly the shipped 52px row |

### First line (unchanged from #9)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10 | 14 |
| min-height | not set | 36 |
| result square width/height | 26 / 26 | 26 / 26 |
| result square border-radius | 7 | 7 |
| result square border | `1px solid` — W: `var(--success)` `#6FA368`; L/D: `#3A3229` (neutral) | same |
| result square color | W: `#6FA368`; L/D: `var(--fg-body)` `#C6B79A` | same |
| result square font | `IBM Plex Mono` 12 / 600 | `IBM Plex Mono` 12 / 600 |
| meta slot width | auto | 132, `flex: none` |
| meta font | `IBM Plex Mono` 11, `var(--fg-faint)` `#8E8269` | `IBM Plex Mono` 11, `var(--fg-faint)`, `tabular-nums` |
| mark chip font | `IBM Plex Mono` 10.5, `var(--fg-body)` `#C6B79A` | `IBM Plex Mono` 10.5, `var(--fg-body)` |
| mark chip background | `var(--elevated)` `#2A241D` | `var(--elevated)` `#2A241D` |
| mark chip border-radius | 999 | 999 |
| mark chip padding | `4px 10px 4px 8px` | `4px 11px 4px 8px` |
| direction dot width/height | 6 / 6 | 6 / 6 |
| direction dot border-radius | 999 | 999 |
| direction dot background | helped `#6FA368` / hurt `#E0913C` | same |
| marks gap | 5 | 6 |
| marks flex-wrap | wrap | wrap |
| em dash (no marks) | `IBM Plex Mono` 11, `var(--fg-locked)` `#6A6152` | `IBM Plex Mono` 11, `var(--fg-locked)` |
| delete width/height | 30 / 30 | 30 / 30 |
| delete border-radius | 7 | 7 |
| delete border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| delete color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| delete glyph | `×` (`&times;`), `IBM Plex Mono` 13 | `×`, `IBM Plex Mono` 13 |
| delete position | `margin-left: auto` | end of the flex row |
| marks row placement | second block, `margin-top: 8` | inline in the first line, `flex: auto` |

### Note line (NEW)

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional rendering | rendered only when the game has a note | rendered only when the game has a note |
| reserved space when absent | — none, no empty second line | — none, no empty second line |
| display | flex | flex |
| gap | 10 | 11 |
| margin | `8px 0 0` | `7px 0 1px` |
| padding-left | 0 (follows the mobile stack) | 40 (indented to the mark column) |
| font-size | 12.5 | 12.5 |
| font-style | italic | italic |
| line-height | 1.5 | 1.5 |
| color | `var(--fg-muted)` `#A89B84` (6.19:1) | `var(--fg-muted)` `#A89B84` (6.19:1) |
| truncation | — none | — none |
| wrap behaviour | 140 chars wraps to 3 lines at 390px | 140 chars wraps to 2 lines at 900px |
| quoting | rendered inside typographic quotes `“…”` | rendered inside typographic quotes `“…”` |
| tooltip / chip form | — explicitly neither | — explicitly neither |

### Note quote rule

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 2 | 2 |
| height | stretches to the text block | stretches to the text block |
| flex | none | none |
| border-radius | 999 | 999 |
| background | `var(--border-strong)` `#4A4033` | `var(--border-strong)` `#4A4033` |

### Accessibility

| Property | Mobile | Desktop |
|----------|--------|---------|
| a11y placement | inside the row's accessible description, after the marks | same |
| description order | `lost, 4-player, 26 Aug, cards in hand, mana, note: mulliganed to five…` | same |
| stops | one row, one stop | one row, one stop |

---

## Component: Deck Intent (Surface 3)

### State 1 — Empty (header)

| Property | Mobile | Desktop |
|----------|--------|---------|
| intent element | — absent entirely | — absent entirely |
| dashed placeholder | — | — |
| `+ add a description` affordance | — | — |
| grey italic prompt | — | — |
| deck name font | `Cinzel` 700, 17 | `Cinzel` 700, 22 |
| deck name color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |
| deck name margin | 0 | 0 |
| status font | `IBM Plex Mono` 10 | `IBM Plex Mono` 11 |
| status color (complete) | `var(--success)` `#6FA368` | `var(--success)` `#6FA368` |
| status color (to find) | `var(--warning)` `#E0913C` | `var(--warning)` `#E0913C` |
| header row display | flex, `align-items: baseline`, `justify-content: space-between` | flex, `align-items: baseline`, `justify-content: space-between` |
| tab pill row margin-top | 11 | 16 |
| tab pill gap | 7 | 10 |
| tab pill font-size | 12 | 13 |
| tab pill padding | `5px 12px` | `5px 14px` |
| tab pill border-radius | 999 | 999 |
| tab pill (inactive) | `1px solid #3A3229`, `var(--fg-muted)` `#A89B84`, weight 500 | same |
| tab pill (active) | `#14110E` on `var(--accent)` `#C9A24B`, weight 600 | same |

### State 2 — The ask (inside the tuning panel body)

| Property | Mobile | Desktop |
|----------|--------|---------|
| container background | `var(--surface-sunken)` `#181410` | `var(--surface-sunken)` `#181410` |
| container border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| container border-radius | 11 | 11 |
| container padding | `16px 18px` | `16px 18px` |
| placement | inside the panel body, immediately above the action row | inside the panel body, immediately above the action row |
| label font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| label font-size | 10 | 10 |
| label letter-spacing | 0.14em | 0.14em |
| label text-transform | uppercase | uppercase |
| label color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| label margin-bottom | 9 | 9 |
| pitch font-size | 13.5 | 13.5 |
| pitch color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| pitch line-height | 1.6 | 1.6 |
| pitch max-width | 600 | 600 |
| field min-height | 46 | 46 |
| field margin-top | 14 | 14 |
| field background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| field border | `1px dashed var(--border-strong)` `#4A4033` | `1px dashed var(--border-strong)` `#4A4033` |
| field border-radius | 8 | 8 |
| field padding | `12px 14px` | `12px 14px` |
| field display / align-items | flex / center | flex / center |
| example text font-size | 13.5 | 13.5 |
| example text color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| maxlength | 120 | 120 |
| action row display | flex, `align-items: center`, `flex-wrap: wrap` | flex, `align-items: center`, `flex-wrap: wrap` |
| action row gap | 14 | 14 |
| action row margin-top | 12 | 12 |
| `Save this` font | `IBM Plex Sans` 600, 13.5 | `IBM Plex Sans` 600, 13.5 |
| `Save this` color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| `Save this` background | transparent (brass outline) | transparent (brass outline) |
| `Save this` border | `1px solid var(--accent)` `#C9A24B` | `1px solid var(--accent)` `#C9A24B` |
| `Save this` border-radius | 8 | 8 |
| `Save this` padding | `10px 18px` | `10px 18px` |
| skip note font | `IBM Plex Mono` 10.5 | `IBM Plex Mono` 10.5 |
| skip note color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| gating | — never blocks generation | — never blocks generation |
| repetition | shown once, in the ask; never as a banner over results | same |

### State 3 — Set (header)

| Property | Mobile | Desktop |
|----------|--------|---------|
| container | header block, `#14110E` bg, `1px solid var(--border)`, radius 11, padding `18px 20px` | same |
| intent row display | inline-block (phone frame) | flex |
| intent row align-items | — | baseline |
| intent row gap | — | 10 |
| intent row margin-top | 5 | 7 |
| intent row flex-wrap | — | wrap |
| sentence font-size | 12.5 | 14 |
| sentence color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| sentence line-height | 1.45 | 1.55 |
| sentence border-bottom | `1px dashed var(--border-strong)` `#4A4033` | `1px dashed var(--border-strong)` `#4A4033` |
| `edit` affordance | not drawn in the phone frame | `IBM Plex Mono` 10, `var(--fg-locked)` `#6A6152` |
| `edit` aria-label | `Edit what this deck is for` | `Edit what this deck is for` |
| visibility scope | every tab (Decklist, Consider, Games) and the deck list | every tab and the deck list |
| provenance disc | — absent | — absent |
| chip | — absent | — absent |
| panel ask | — absent once intent exists | — absent once intent exists |
| citation | appears as an `intent` chip on any suggestion that used it | same |

### State 4 — App-seeded (header)

| Property | Mobile | Desktop |
|----------|--------|---------|
| intent row display | flex | flex |
| intent row align-items | baseline | baseline |
| intent row gap | 10 | 10 |
| intent row margin-top | 7 | 7 |
| intent row flex-wrap | wrap | wrap |
| provenance disc width/height | 18 / 18 | 18 / 18 |
| provenance disc flex | none | none |
| provenance disc border-radius | 999 | 999 |
| provenance disc border | `1.5px solid var(--accent)` `#C9A24B` | `1.5px solid var(--accent)` `#C9A24B` |
| provenance disc color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| provenance disc glyph | `i` | `i` |
| provenance disc font | `Cinzel` 700, 10 | `Cinzel` 700, 10 |
| provenance disc display | flex, center / center | flex, center / center |
| sentence | 14, `var(--fg-body)`, line-height 1.55, `1px dashed #4A4033` underline | same |
| chip text | `from the build` | `from the build` |
| chip font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| chip font-size | 10 | 10 |
| chip letter-spacing | 0.1em | 0.1em |
| chip text-transform | uppercase | uppercase |
| chip color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| chip background | `rgba(201,162,75,0.12)` — `--accent` at 12% | `rgba(201,162,75,0.12)` |
| chip border-radius | 999 | 999 |
| chip padding | `2px 9px` | `2px 9px` |
| chip aria | `This came from the brief The 99 built this deck to` | same |
| `edit` | `IBM Plex Mono` 10, `var(--fg-locked)` `#6A6152` | `IBM Plex Mono` 10, `var(--fg-locked)` `#6A6152` |
| chip removal | permanently, on the first player edit; no return on re-import; no "edited" chip | same |

### Intent shown in the results-frame header (context)

| Property | Mobile | Desktop |
|----------|--------|---------|
| sentence font-size | 12.5 | 13.5 |
| sentence color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| border-bottom | `1px dashed #4A4033` | `1px dashed #4A4033` |
| margin-top | 5 | 6 |
| `edit` | — | `IBM Plex Mono` 10, `#6A6152`, gap 10 |

---

## Component: Tuning Panel (Surface 4)

### Container (all six states)

| Property | Mobile | Desktop |
|----------|--------|---------|
| placement | below the aggregate, above the history — never moves | below the aggregate, above the history — never moves |
| background | `var(--surface-sunken)` `#181410` | `var(--surface-sunken)` `#181410` |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color (states 1, 2, 4, 5, 6) | `var(--border)` `#2A241D` | `var(--border)` `#2A241D` |
| border-color (state 3 only) | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| border-radius | 11 | 12 |
| padding | `15px 16px` | `18px 20px` |
| width | panel's full column width | panel's full column width |
| mount behaviour | renders in all six states; never appears/disappears | renders in all six states |
| growth | body grows downward only; nothing above reflows | body grows downward only |
| semantics | `<section>`, heading is its accessible name, `aria-busy` while generating | same |

### Slot 1 — Heading

| Property | Mobile | Desktop |
|----------|--------|---------|
| text | `Suggested changes` (all six states) | `Suggested changes` (all six states) |
| font-family | `Cinzel` | `Cinzel` |
| font-weight | 600 | 600 |
| font-size | 17 | 19 |
| color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |
| state colour | — never | — never |
| icon | — never | — never |
| count | — never | — never |
| rank change between states | — never | — never |
| focus | receives focus when results land | receives focus when results land |

### Slot 2 — Body (state 1: below threshold)

| Property | Mobile | Desktop |
|----------|--------|---------|
| primary sentence margin-top | 10 | 12 |
| primary sentence font-size | 13 | 13.5 |
| primary sentence color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| primary sentence line-height | 1.6 | 1.65 |
| primary sentence max-width | full | 640 |
| emphasised count (`cards in hand, 2 of 2`) | `var(--fg)` `#EDE6D8`, weight 600 | `var(--fg)` `#EDE6D8`, weight 600 |
| sub-line margin-top | 12 | 12 |
| sub-line font-size | 13 | 13 |
| sub-line color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| sub-line line-height | 1.6 | 1.6 |
| sub-line max-width | full | 640 |
| manifest | — not rendered | — not rendered |
| `--danger` | — nowhere in this state | — nowhere |
| error message | — none | — none |

### Slot 2 — Body (state 2: ready)

| Property | Mobile | Desktop |
|----------|--------|---------|
| briefing margin-top | 10 | 12 |
| briefing font-size | 13 | 13.5 |
| briefing color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| briefing line-height | 1.6 | 1.65 |
| briefing max-width | full | 640 |
| cited Fix axis color | `var(--warning)` `#E0913C`, weight 600 | `var(--warning)` `#E0913C`, weight 600 |
| manifest container display | flex | flex |
| manifest flex-direction | column | column |
| manifest gap | 6 | 6 |
| manifest margin-top | 12 | 14 |
| manifest max-width | full | 640 |
| manifest row count | 4 (5 when deck intent exists) | 4 (5 when deck intent exists) |
| manifest tick state | all unchecked | all unchecked |
| intent ask | rendered above the action row only when intent is absent | same |

### Manifest row — unchecked

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 10 | 11 |
| min-height | 44 | 38 |
| background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| border-radius | 8 | 8 |
| padding | `7px 11px` | `7px 12px` |
| tick box width/height | 18 / 18 | 16 / 16 |
| tick box flex | none | none |
| tick box border-radius | 4 | 4 |
| tick box border | `1px solid #3A3229` | `1px solid #3A3229` |
| tick box background | transparent | transparent |
| tick glyph | — (empty) | — (empty) |
| label font-size | 12.5 | 13 |
| label color | `var(--fg-body)` `#C6B79A` (idle) / `var(--fg-faint)` `#8E8269` (pending, during a run) | same |
| label flex | auto, `min-width: 0` | auto, `min-width: 0` |
| count font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| count font-size | 10.5 | 11 |
| count color | `var(--fg-faint)` `#8E8269` (idle) / `var(--fg-locked)` `#6A6152` (pending) | same |
| count font-variant-numeric | not set | `tabular-nums` |
| count flex | none | none |

### Manifest row — done / ticked

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `var(--elevated-hover)` `#211C15` | `var(--elevated-hover)` `#211C15` |
| border-color | `var(--accent-shadow)` `#6E5B33` | `var(--accent-shadow)` `#6E5B33` |
| tick box border-color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| tick box background | `rgba(201,162,75,0.12)` | `rgba(201,162,75,0.12)` |
| tick glyph | `✓` (U+2713) | `✓` (U+2713) |
| tick glyph color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| tick glyph font | `IBM Plex Mono` 10 | `IBM Plex Mono` 10 |
| label color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |
| count color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| trigger | ticks when that read actually completes — never on a timer | same |
| transition | opacity change only; no scale, no sweep | opacity change only |
| colour redundancy | ✓ glyph accompanies the fill | ✓ glyph accompanies the fill |

### Slot 2 — Body (state 3: generating)

| Property | Mobile | Desktop |
|----------|--------|---------|
| preamble margin-top | 10 | 12 |
| preamble font-size | 13 | 13.5 |
| preamble color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| preamble line-height | 1.6 | 1.65 |
| preamble text | `Reading your deck. A few seconds — this is what we are looking at.` (shortened) | full `generating` string |
| manifest margin-top | 12 | 14 |
| manifest gap | 6 | 6 |
| panel border | `1px solid var(--accent)` `#C9A24B` | `1px solid var(--accent)` `#C9A24B` |
| progress figure | `3 of 4 read` (in the action row) | `3 of 4 read` (in the action row) |
| indeterminate bar | — | — |
| percentage | — | — |
| skeleton / shimmer | — | — |
| unmounting | — nothing unmounts mid-write | — nothing unmounts mid-write |

### Slot 2 — Body (state 4: results)

| Property | Mobile | Desktop |
|----------|--------|---------|
| collapsed manifest line font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| collapsed manifest line font-size | 9.5 | 10.5 |
| collapsed manifest line color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| collapsed manifest line margin-top | 7 | 9 |
| collapsed manifest line line-height | 1.5 | not set |
| collapsed manifest text | `read from 9 games · 1 note · 99 cards · your collection` | same |
| results sentence margin-top | (mobile drops it) | 11 |
| results sentence font-size | — | 13.5 |
| results sentence color | — | `var(--fg-body)` `#C6B79A` |
| results sentence line-height | — | 1.65 |
| results sentence max-width | — | 640 |
| card list display | flex column | flex column |
| card list gap | 7 | 8 |
| card list margin-top | 12 | 14 |
| card count | up to 3; fewer renders fewer cards | up to 3; fewer renders fewer cards |

### Slot 2 — Body (state 5: nothing has changed)

| Property | Mobile | Desktop |
|----------|--------|---------|
| collapsed manifest line | `IBM Plex Mono` 10.5, `var(--fg-faint)`, margin-top 9 | same |
| sentence margin-top | 12 | 12 |
| sentence font-size | 13.5 | 13.5 |
| sentence color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| sentence line-height | 1.65 | 1.65 |
| sentence max-width | 640 | 640 |
| reason list display | flex column | flex column |
| reason list gap | 6 | 6 |
| reason list margin-top | 14 | 14 |
| reason list max-width | 640 | 640 |
| reason line count | exactly 3 | exactly 3 |
| tail line margin-top | 12 | 12 |
| tail line font-size | 13 | 13 |
| tail line color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| tail line line-height | 1.6 | 1.6 |
| `--danger` | — nowhere in this state | — nowhere |
| failure tag | — | — |

### Reason row (state 5)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap | 11 | 11 |
| min-height | 34 | 34 |
| background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| border-radius | 8 | 8 |
| padding | `8px 12px` | `8px 12px` |
| key width | 98 | 98 |
| key flex | none | none |
| key font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| key font-size | 10 | 10 |
| key letter-spacing | 0.1em | 0.1em |
| key text-transform | uppercase | uppercase |
| key color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| value flex | auto, `min-width: 0` | auto, `min-width: 0` |
| value font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| value font-size | 11 | 11 |
| value color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| the three keys | `games` · `weakest axis` · `this deck is for` | same |

### Slot 2 — Body (state 6: failure — four classes drawn)

Design drew four. The merged spec defines five; `interrupted` is undrawn and takes this same shape.


| Property | Mobile | Desktop |
|----------|--------|---------|
| container background | `var(--surface-sunken)` `#181410` | `var(--surface-sunken)` `#181410` |
| container border | `1px solid var(--border)` `#2A241D` — never `--danger` | `1px solid var(--border)` `#2A241D` |
| container border-radius | 12 | 12 |
| container padding | `16px 18px` | `16px 18px` |
| tag+heading row display | flex, `align-items: baseline`, `flex-wrap: wrap` | flex, `align-items: baseline`, `flex-wrap: wrap` |
| tag+heading gap | 10 | 10 |
| heading font | `Cinzel` 600, 17 | `Cinzel` 600, 17 |
| heading color | `var(--fg)` `#EDE6D8` — never `--danger` | `var(--fg)` `#EDE6D8` |
| body sentence margin-top | 11 | 11 |
| body sentence font-size | 13.5 | 13.5 |
| body sentence color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| body sentence line-height | 1.6 | 1.6 |
| body sentence max-width | 660 | 660 |
| "what survived" line font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| "what survived" font-size | 10.5 | 10.5 |
| "what survived" color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| "what survived" margin-top | 9 | 9 |
| error code / stack | — never | — never |
| automatic retry | — never | — never |

### Failure tag

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 9.5 |
| letter-spacing | 0.14em | 0.14em |
| text-transform | uppercase | uppercase |
| color | `var(--danger)` `#C6533F` | `var(--danger)` `#C6533F` |
| background | `rgba(198,83,63,0.12)` — `--danger` at 12% | `rgba(198,83,63,0.12)` |
| border-radius | 999 | 999 |
| padding | `3px 9px` | `3px 9px` |
| position | beside the heading, before it in the flex row | beside the heading, before it |
| scope | the only `--danger` on all five surfaces | the only `--danger` on all five surfaces |

### Slot 3 — Action row (all six states)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| flex-direction | column | row |
| align-items | stretch | center |
| gap | 8 | 16 (14 in the failure frame) |
| flex-wrap | — | wrap |
| margin-top | 15 | 18 (14 in the failure frame) |
| padding-top | 14 | 16 (13 in the failure frame) |
| border-top | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| min-height | fixed band | 56, in all six states |
| primary count | exactly 1 | exactly 1 |
| primary position | first / top | first / same corner in all six states |
| absent in any state | — never | — never |

### Primary button — per state

| State | Label | Mobile | Desktop |
|---|---|---|---|
| 1 · below threshold | `Suggest changes` (disabled) | height 44 floor | font `IBM Plex Sans` 600 13.5; color `var(--fg-locked)` `#6A6152`; background transparent; border `1px solid var(--border)` `#2A241D`; radius 8; padding `10px 18px` |
| 2 · ready | `Suggest changes` | height 48; font 14; `#14110E` on `var(--accent)`; radius 8 | font `IBM Plex Sans` 600 14; `#14110E` on `var(--accent)` `#C9A24B`; radius 8; padding `11px 20px` |
| 3 · generating | `Reading…` (non-interactive) | height 48; font 14; color `var(--fg-faint)` `#8E8269`; border `1px solid #3A3229`; radius 8 | font `IBM Plex Sans` 600 14; color `var(--fg-faint)` `#8E8269`; background transparent; border `1px solid #3A3229`; radius 8; padding `11px 20px` |
| 4 · results | `Suggest again` | height 44; font 13.5; color `var(--accent)`; border `1px solid var(--accent)`; radius 8 | font 600 14; color `var(--accent)` `#C9A24B`; border `1px solid var(--accent)`; radius 8; padding `11px 20px` |
| 5 · nothing changed | `Suggest again anyway` | height 44 floor | font 600 14; color `var(--accent)`; border `1px solid var(--accent)`; radius 8; padding `11px 20px` |
| 6a–6d · failure | `Try again` | height 44 floor | font 600 13.5; color `var(--accent)`; border `1px solid var(--accent)`; radius 8; padding `10px 18px` |

### Secondary button — `Stop` (state 3 only)

> **Removed 2026-10-12** (Hugh): Suggested changes no longer draws Stop. The server finishes every run in `after()` and the panel polls, so a read always runs to its end. The rows below are kept as the record of what shipped.

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 44 | padding `11px 18px` |
| font-family | `IBM Plex Sans` | `IBM Plex Sans` |
| font-weight | 500 | 500 |
| font-size | 13.5 | 13.5 |
| color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| background | transparent (neutral ghost) | transparent (neutral ghost) |
| border | `1px solid #3A3229` | `1px solid #3A3229` |
| border-radius | 8 | 8 |
| display / align / justify | flex / center / center | inline |
| position | below `Reading…` | beside `Reading…` |
| on activation | returns to state 2, manifest unchecked, no error, no tag | same |

### Mono note beside the primary — per state

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5–10.5 | 11 |
| color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| text-align | center | left (inline after the buttons) |
| state 1 text | `one more game — 2 of 3` | `one more game — 2 of 3` |
| state 2 text | `takes a few seconds · nothing changes until you say so` | same |
| state 3 text | `3 of 4 read` | `3 of 4 read` |
| state 4 text | `3 of 3 still open` (shortened) | `3 of 3 still open · these stay until you replace them` |
| state 5 text | `3 of 3 from Tuesday still open` | `3 of 3 from Tuesday still open` |
| state 6a text | `or come back later: the button will be here` (em dash set as a colon, 2026-09-13 sweep) | same |
| state 6b text | `stopped at 3 of 4 read` | same |
| state 6c text | `this one is on us` | same |
| state 6d text | `log another game and there is more to go on` | same |

### Panel — focus behaviour

| Property | Mobile | Desktop |
|----------|--------|---------|
| focus style | global `:focus-visible`, 2px brass, +2px offset, not overridden | same |
| on pressing the primary | focus stays on the button as it becomes `Reading…` in place | same |
| on results landing | focus moves to the panel heading | same |
| live region | the existing one, one message per settle; never one per manifest line or tick | same |
| motion | shipped panel transition; manifest tick is an opacity change | same |

---

## Component: Suggestion Card (Surface 5)

### Card container — open

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| border-width | 1 | 1 |
| border-style | solid | solid |
| border-color | `var(--border)` `#2A241D` | `var(--border)` `#2A241D` |
| border-radius | 9 | 9 |
| padding | `9px 10px` | `9px 12px` |
| gap between cards | 7 | 8 |
| row count | 4 | 4 |
| semantics | `<article>`; citation chips are its `aria-describedby` | same |
| column headings (`Cut` / `Add`) | — removed | — removed |
| rule above the rationale | — removed | — removed |
| type line on the cut | — removed | — removed |

### Pair row — desktop (one line)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex (broken into two lines — see below) | flex |
| align-items | center | center |
| gap | 8 | 9 |
| flex-wrap | — | wrap |
| row height | — | 31 (thumbnail height) |

### Pair row — mobile (two lines)

| Property | Mobile | Desktop |
|----------|--------|---------|
| line 1 content | cut thumbnail + cut name | — (single line) |
| line 1 display / align / gap | flex / center / 8 | — |
| line 2 content | arrow + add thumbnail + add name + ownership + price | — |
| line 2 display / align / gap | flex / center / 8 | — |
| line 2 margin-top | 5 | — |
| reason for the break | so a long name never truncates | — |

### Cut thumbnail

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 20 | 22 |
| height | 28 | 31 |
| flex | none | none |
| border-radius | 3 | 3 |
| border | `1px solid #3A3229` | `1px solid #3A3229` |
| background | `repeating-linear-gradient(135deg,#2A241D,#2A241D 3px,#211C15 3px,#211C15 6px)` | same |

### Add thumbnail

| Property | Mobile | Desktop |
|----------|--------|---------|
| width | 20 | 22 |
| height | 28 | 31 |
| flex | none | none |
| border-radius | 3 | 3 |
| border (open) | `1px solid var(--border-strong)` `#4A4033` | `1px solid var(--border-strong)` `#4A4033` |
| border (applied) | `1px solid var(--success)` `#6FA368` | `1px solid var(--success)` `#6FA368` |
| background | `repeating-linear-gradient(135deg,#33291F,#33291F 3px,#2A241D 3px,#2A241D 6px)` | same |
| card art | — none; these two thumbnails are the only art on the panel | — |

### Arrow

| Property | Mobile | Desktop |
|----------|--------|---------|
| glyph | `→` (`&rarr;`, U+2192) | `→` |
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 12 | 13 |
| color (open) | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| color (applied) | `var(--success)` `#6FA368` | `var(--success)` `#6FA368` |
| width | 20 | auto |
| flex | none | none |
| text-align | center | — |
| SVG | — (text glyph, no `<svg>`) | — |

### Cut card name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5 | 13 |
| font-weight | 400 | 400 |
| color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| text-decoration | line-through | line-through |
| text-decoration-color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| min-width | 0 | not set |
| `--danger` | — never | — never |
| type line | — removed | — removed |

### Add card name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12.5 | 13 |
| font-weight | 600 | 600 |
| color | `var(--fg)` `#EDE6D8` | `var(--fg)` `#EDE6D8` |
| container flex | auto, `min-width: 0` | — |

### Add card type line

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional rendering | — not drawn on phone | present |
| font-family | — | `IBM Plex Mono` |
| font-size | — | 10 |
| color | — | `var(--fg-locked)` `#6A6152` |
| example | — | `Creature — Zombie · 3` |

### Ownership label

| Property | Mobile | Desktop |
|----------|--------|---------|
| source atom | `decksBuilderCopy.rowOwned` / `rowNotOwned`, unchanged | same |
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10.5 |
| color (owned) | `var(--success)` `#6FA368` | `var(--success)` `#6FA368` |
| color (not owned) | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| text | `×{qty} owned` / `not owned` | `×{qty} owned` / `not owned` |
| position | under the add name, in a `gap: 7` sub-row, `margin-top: 2` | `margin-left: auto`, end of the pair row |
| conditional rendering | always — no add renders without one | always |
| behaviour | never filters, ranks, sorts, or suppresses | never filters, ranks, sorts, or suppresses |

### Price

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional rendering | if and only if the label is `not owned` | if and only if the label is `not owned` |
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10.5 |
| color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| font-variant-numeric | not set | `tabular-nums` |
| position | beside ownership, gap 7 | immediately after ownership |
| total across cards | — never | — never |
| formatter | shipped price atom to be substituted; `$1.20` is its drawn shape only | same |

### Rationale

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | 12 | 12.5 |
| color | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| line-height | 1.45 | 1.5 |
| margin-top | 7 | 7 |
| content source | a shorter first clause returned by the model | the full rationale |
| ellipsis / truncation | — never | — never |
| quoted note rendering | in quotation marks with its date, byte-identical | same |
| percentages / nets / signed integers | — never (validator drops the candidate) | — never |
| count form | every count with its denominator in the same element | same |
| typewriter animation | — never | — never |

### Action row — open card

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 7 | 7 |
| flex-wrap | — | wrap |
| margin-top | 9 | 8 |
| chips placement | own line, above the buttons (`margin-top: 7`) | end of the same row, `margin-left: auto` |
| consequence placement | below the buttons (`margin-top: 6`) | inline, after the buttons |

### `Apply` button

| Property | Mobile | Desktop |
|----------|--------|---------|
| label | `Apply this swap` (copy key) / `Apply` (drawn) | `Apply` |
| height | 44 (floor, not a preference) | 32 (via padding `7px 13px`) |
| flex | 1 (half of the row) | none |
| font-family | `IBM Plex Sans` | `IBM Plex Sans` |
| font-weight | 600 | 600 |
| font-size | 13 | 12.5 |
| color | `var(--accent)` `#C9A24B` | `var(--accent)` `#C9A24B` |
| background | transparent — brass outline, never brass solid | transparent — brass outline |
| border | `1px solid var(--accent)` `#C9A24B` | `1px solid var(--accent)` `#C9A24B` |
| border-radius | 8 | 7 |
| padding | — (height + centering) | `7px 13px` |
| display / align / justify | flex / center / center | inline |
| element | `<button>`, never a link | `<button>`, never a link |
| adjacency | never adjacent to a destructive control | never adjacent to a destructive control |

### `Not this one` button (dismiss)

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 44 | 32 (via padding `7px 12px`) |
| flex | 1 (half of the row) | none |
| font-family | `IBM Plex Sans` | `IBM Plex Sans` |
| font-weight | 500 | 500 |
| font-size | 13 | 12.5 |
| color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| background | transparent (neutral ghost) | transparent (neutral ghost) |
| border | `1px solid #3A3229` | `1px solid #3A3229` |
| border-radius | 8 | 7 |
| confirmation prompt | — none | — none |
| reason picker / thumbs | — none | — none |

### Consequence line (prints before the tap)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10 |
| color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| margin-top | 6 | — (inline) |
| position | below the two buttons | beside the buttons |
| text (owned) | `stays 99 / 99 · complete · you own it` | same |
| text (unowned) | `stays 99 / 99 · adds 1 to your shopping list` | same |

### Citation chip

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | baseline | baseline |
| gap (inside chip) | 5 | 5 |
| gap (between chips) | 5 | 5 |
| flex-wrap | wrap | wrap |
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 9.5 |
| background | `var(--surface-sunken)` `#181410` | `var(--surface-sunken)` `#181410` |
| border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| border-radius | 5 | 5 |
| padding | `3px 7px` | `3px 7px` |
| source-name letter-spacing | 0.1em | 0.1em |
| source-name text-transform | uppercase | uppercase |
| source-name color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| value color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| container position | own line, `margin-top: 7`, above the buttons | end of the action row, `margin-left: auto` |
| source vocabulary | `games` · `note` · `decklist` · `intent` (only) | same |
| minimum per card | at least 1 — a card with no citable evidence is not shown | same |
| a11y | source names repeated in the aria description | same |

### Card — state: Applying (2)

| Property | Mobile | Desktop |
|----------|--------|---------|
| border-color | unchanged (`var(--border)`) | unchanged |
| apply button label | `Applying…` | `Applying…` |
| apply button interactivity | non-interactive | non-interactive |
| dismiss button | disabled | disabled |
| unmounting | — nothing unmounts | — nothing unmounts |

### Card — state: Applied (3)

| Property | Mobile | Desktop |
|----------|--------|---------|
| card border | `1px solid var(--success)` `#6FA368` | `1px solid var(--success)` `#6FA368` |
| card background | `var(--surface)` `#1E1A15` | `var(--surface)` `#1E1A15` |
| card border-radius | 9 | 9 |
| card padding | `9px 10px` | `9px 12px` |
| pair row | kept in full (not removed) | kept in full |
| arrow color | `var(--success)` `#6FA368` | `var(--success)` `#6FA368` |
| add thumbnail border | `1px solid var(--success)` `#6FA368` | `1px solid var(--success)` `#6FA368` |
| add column relabelled | `Added` | `Added` |
| rationale row | replaced by the stamp row | replaced by the stamp row |
| stamp row display | flex, `align-items: center` | flex, `align-items: center`, `flex-wrap: wrap` |
| stamp row gap | 8 | 10 |
| stamp row margin-top | 9 | 8 |
| stamp row padding-top | 8 | 8 |
| stamp row border-top | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| removal from the list | — never | — never |
| reorder | — never | — never |
| persistence | survives reload; lasts until the next run replaces the set | same |

### Applied stamp

| Property | Mobile | Desktop |
|----------|--------|---------|
| box width/height | 15 / 15 | 16 / 16 |
| box border-radius | 4 | 4 |
| box border | `1px solid var(--success)` `#6FA368` | `1px solid var(--success)` `#6FA368` |
| glyph | `✓` (`&#10003;`, U+2713) | `✓` |
| glyph font-size | 9 | 9 |
| box display / align / justify | flex / center / center | flex / center / center |
| word | `applied` | `applied` |
| word font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| word font-size | 9.5 | 10 |
| word letter-spacing | 0.1em | 0.1em |
| word text-transform | uppercase | uppercase |
| word color | `var(--success)` `#6FA368` | `var(--success)` `#6FA368` |
| gap (box→word) | 6 | 7 |
| SVG | — (text glyph, no `<svg>`) | — |

### Applied verdict

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 10.5 |
| color (complete) | `var(--fg-body)` `#C6B79A` | `var(--fg-body)` `#C6B79A` |
| color (to find) | `var(--warning)` `#E0913C` | `var(--warning)` `#E0913C` |
| font-variant-numeric | not set | `tabular-nums` |
| text | `99 / 99 · complete` / `99 / 99 · 1 to find` | same |
| wording source | the shipped deck-status wording | the shipped deck-status wording |
| computation | returned by the apply mutation; the client never computes it | same |

### Applied shopping clause

| Property | Mobile | Desktop |
|----------|--------|---------|
| conditional rendering | — not drawn in the phone frame | present |
| font-family | — | `IBM Plex Mono` |
| font-size | — | 10.5 |
| color | — | `var(--fg-faint)` `#8E8269` |
| text (owned) | — | `nothing added to your shopping list — you own it` |
| text (unowned) | — | `Undead Augur is on your shopping list · $1.20` |

### `Undo swap` button

| Property | Mobile | Desktop |
|----------|--------|---------|
| height | 32 | 32 (via padding `7px 13px`) |
| font-family | `IBM Plex Sans` | `IBM Plex Sans` |
| font-weight | 500 | 500 |
| font-size | 12 | 12 |
| color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| background | transparent (neutral ghost) | transparent (neutral ghost) |
| border | `1px solid #3A3229` | `1px solid #3A3229` |
| border-radius | 7 | 7 |
| padding | `0 12px` | `7px 13px` |
| display / align | flex / center | flex / center |
| position | `margin-left: auto` | `margin-left: auto` |
| availability | for as long as the suggestion is on screen — no time limit | same |
| mechanism | a real inverse mutation; restores both cards and the shopping list | same |
| element | `<button>`, never a link | `<button>`, never a link |

### Card — state: Apply refused (4)

| Property | Mobile | Desktop |
|----------|--------|---------|
| card state | returns to open (state 1) | returns to open |
| error component | shipped `MutationError` | shipped `MutationError` |
| error placement | under this card's own action row | under this card's own action row |
| panel-level error | — never | — never |
| other cards | unchanged | unchanged |
| copy | `We couldn’t make that swap. The deck is unchanged.` | same |

### Card — state: Dismissed (5)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | flex | flex |
| align-items | center | center |
| gap | 9 | 10 |
| flex-wrap | — | wrap |
| background | `var(--surface-sunken)` `#181410` | `var(--surface-sunken)` `#181410` |
| border | `1px solid var(--border)` `#2A241D` | `1px solid var(--border)` `#2A241D` |
| border-radius | 9 | 9 |
| padding | `9px 10px` | `8px 12px` |
| line count | 1 | 1 |
| slot | the same slot in the list — no gap, no reorder | the same slot — no gap, no reorder |
| animation out | — none | — none |
| label text | `not this one` | `not this one` |
| label font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| label font-size | 9.5 | 10 |
| label letter-spacing | 0.1em | 0.1em |
| label text-transform | uppercase | uppercase |
| label color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| label flex | none | none |
| pair font-size | 12 | 12.5 |
| pair color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| pair arrow color | `var(--fg-locked)` `#6A6152` | `var(--fg-locked)` `#6A6152` |
| pair min-width | 0 | not set |
| restore button label | `Again` (drawn) / `Show it again` (copy key) | `Show it again` |
| restore button height | 32 | 32 (via padding `7px 13px`) |
| restore button font | `IBM Plex Sans` 500, 12 | `IBM Plex Sans` 500, 12 |
| restore button color | `var(--fg-muted)` `#A89B84` | `var(--fg-muted)` `#A89B84` |
| restore button border | `1px solid #3A3229` | `1px solid #3A3229` |
| restore button border-radius | 7 | 7 |
| restore button padding | `0 11px` | `7px 13px` |
| restore button position | `margin-left: auto`, `flex: none` | `margin-left: auto` |
| feedback prompt | — none, no question asked | — none |
| persistence | survives reload; lasts until the next run | survives reload |

### Card — state: Restored (6)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendering | identical to open (state 1) | identical to open |
| slot | unchanged | unchanged |

### Footer tally

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `IBM Plex Mono` | `IBM Plex Mono` |
| font-size | 9.5 | 11 |
| color | `var(--fg-faint)` `#8E8269` | `var(--fg-faint)` `#8E8269` |
| text | `1 of 3 applied · 1 dismissed` | `1 of 3 applied · 1 dismissed` |
| position | in the panel's action row band | in the panel's action row band |
| counts | always with denominators | always with denominators |

---

## State Coverage

| Surface | State | Triggering condition | What renders | Key data required |
|---------|-------|---------------------|--------------|-------------------|
| Note field (S1) | 1 · Untouched | Form opened, field never focused, no content | Label + gloss at rest, field at rest border, counter absent, Save enabled by the result alone | — |
| Note field (S1) | 2 · Focused, empty | Field has focus, value length 0 | `1px --accent` border, counter `0 / 140` in `--fg-locked` | current length, maxLength 140 |
| Note field (S1) | 3 · Typing | Field has focus or content, length < 130 | `1px --accent` border, counter `{n} / 140` in `--fg-locked` | current length |
| Note field (S1) | 4 · Near the cap | length ≥ `warnAt` (130) and < 140 | `1px --accent` border, counter in `--warning` | current length, warnAt 130 |
| Note field (S1) | 5 · At the cap | length = 140 | Input stops accepting; counter `140 / 140` in `--warning`; no error, no red field | current length, maxLength |
| Note field (S1) | 6 · Saving | Save submitted, mutation in flight | Field non-interactive in place, counter frozen, Save reads `Saving…`; nothing unmounts | — |
| Note field (S1) | 7 · Refused | Save mutation refused | Shipped `MutationError`; value and counter preserved; nothing cleared | error from the mutation |
| Note field (S1) | 8 · Reopened | Form opened again after a save | Field empty, counter absent — never pre-fills from history | — |
| History row (S2) | Note absent | Game row has `note = NULL` | Exactly the shipped 52px single-line row; no reserved space, no empty second line | `deck_games.note` nullability |
| History row (S2) | Note present | Game row has a non-null `note` | Second line inside the same row: 2px `--border-strong` quote rule + italic 12.5px `--fg-muted` quoted text, 40px indent (desktop), no truncation | note text (verbatim), row a11y description |
| Deck intent (S3) | 1 · Empty | `decks.intent` is NULL and the deck was not app-built | Header prints nothing — no line, no dashed placeholder, no prompt. The ask renders in the tuning panel body above the button | `decks.intent` null |
| Deck intent (S3) | 2 · The ask, open | Intent is empty and the tuning panel is rendered | Panel body block: mono `--accent` label, 13.5px pitch naming the gap, 46px dashed field with `--fg-locked` example, brass-outline `Save this`, mono skip note | strongest Fix axis + its count/denominator for the pitch |
| Deck intent (S3) | 3 · Set | `decks.intent` is non-null, player-written | Sentence under the deck name at 14px `--fg-body` with `1px dashed --border-strong` underline + mono 10px `edit`; on every tab. No panel ask. Intent becomes a citable source | intent text (≤120), edit affordance |
| Deck intent (S3) | 4 · App-seeded | Intent is non-null AND The 99 built the deck AND it has never been edited | 18px provenance disc + sentence + brass `from the build` chip + `edit`. Otherwise identical to state 3 | intent text, provenance flag, edited flag |
| Deck intent (S3) | (transition) Chip removed | First player edit of a seeded line | Chip removed permanently; no return on re-import; no "edited" chip | edited flag persisted |
| Tuning panel (S4) | 1 · Below threshold | `games < PATTERN_MIN` | Heading; body = what it needs + what the games already lean toward with denominator (`cards in hand, 2 of 2`) + sub-line; manifest absent; primary `Suggest changes` disabled, no error; note `one more game — 2 of 3` | game count, `PATTERN_MIN`, leading axis + marked count |
| Tuning panel (S4) | 2 · Ready | `games >= PATTERN_MIN`, no run yet (or, before Stop was removed on 2026-10-12, immediately after a `Stop`) | Heading; body = briefing with the strongest Fix in `--warning`, then the manifest with every row unchecked; primary `Suggest changes`; note `takes a few seconds · nothing changes until you say so` | game count, strongest axis + `{marked} of {count}`, manifest row data (games/notes/cards/collection, + intent if set) |
| Tuning panel (S4) | 3 · Generating | A run is in flight | Panel border becomes `1px --accent`; body = preamble + the same manifest rows ticking as each read completes; primary `Reading…` non-interactive (the neutral `Stop` beside it was removed 2026-10-12); note `3 of 4 read` | per-read completion events, done count, total count |
| Tuning panel (S4) | (transition) Stop, removed 2026-10-12 | `Stop` pressed during state 3 | Returns to state 2 with the manifest unchecked; no error, no tag; announcement `Stopped. Nothing was changed.` | — |
| Tuning panel (S4) | 4 · Results | Run returned ≥ 1 usable (validated) suggestion | Heading; collapsed manifest as one mono line; results sentence; the suggestion cards; primary `Suggest again`; note `{open} of {total} still open · these stay until you replace them` | manifest parts for the collapsed line, suggestion list, open/applied/dismissed counts |
| Tuning panel (S4) | 5 · Nothing has changed | Run returned the same set, or nothing new | Ordinary ink, no `--danger` anywhere; collapsed manifest line; sentence; the reason in exactly three countable rows (games / weakest axis / this deck is for); tail line; primary `Suggest again anyway`; note `{open} of {total} from {when} still open` | last-run date, games read + total, weakest axis + `{marked} of {count}`, intent-changed flag, previous suggestion count |
| Tuning panel (S4) | 6a · Unavailable | Provider unreachable | `--danger` tag `unavailable` beside the heading; one plain sentence; mono line stating what survived (games, note, list, nothing charged); primary `Try again`; note `or come back later: the button will be here` (em dash set as a colon, 2026-09-13 sweep) | game count for the kept line |
| Tuning panel (S4) | 6b · Timed out | Run exceeded its budget | Tag `timed out`; sentence; kept line (previous suggestions still below, or `keptNone`); primary `Try again`; note `stopped at {done} of {total} read` | done/total reads, game count, card count, whether prior suggestions exist |
| Tuning panel (S4) | 6c · Unusable answer | Response could not be parsed | Tag `unusable answer`; sentence; kept line; primary `Try again`; note `this one is on us` | — |
| Tuning panel (S4) | 6d · Nothing held up | Every candidate failed post-generation validation | Tag `nothing held up`; sentence naming the classes of failure; kept line `0 of {rejected} suggestions survived checking. …`; primary `Try again`; note `log another game and there is more to go on` | commander name, rejected-candidate count |
| Tuning panel (S4) | 6e · Interrupted (undrawn) | A pending run older than the cutoff, written to `failed` by the read-time reaper | Not drawn by Design — the merged spec's fifth class. Takes the identical failure shape: `--danger` tag, one sentence, one survived-line, one `Try again` | a fifth object in `deckTuningCopy.failure` |
| Suggestion card (S5) | 1 · Open | Suggestion returned and passed validation, not yet acted on | Four rows: pair (cut → add, ownership, price if unowned), rationale, actions + citation chips, consequence in mono before the tap. Phone: pair over two lines, actions as two 44px halves, consequence below | cut name, add name + type line, ownership qty, price if unowned, rationale (long + short), ≥1 citation, consequence string |
| Suggestion card (S5) | 2 · Applying | Apply pressed, mutation in flight | Card border unchanged; apply button reads `Applying…` and is non-interactive; dismiss disabled; nothing unmounts | — |
| Suggestion card (S5) | 3 · Applied | Apply mutation succeeded | `1px --success` border, `--success` arrow and add-thumbnail border, add column relabelled `Added`, `applied` stamp, post-swap verdict in the shipped status wording, shopping clause, `Undo swap` | post-swap count + status + shopping delta, returned by the mutation |
| Suggestion card (S5) | 4 · Apply refused | Apply mutation refused | Card returns to state 1 with the shipped `MutationError` under its own action row; nothing else on the panel changes | error from the mutation |
| Suggestion card (S5) | 5 · Dismissed | `Not this one` pressed | Collapses to a one-line row in the same slot: `not this one` label + pair in `--fg-faint` + `Show it again`. No gap, no reorder, no animation out, no question asked | cut and add names |
| Suggestion card (S5) | 6 · Restored | `Show it again` pressed on a dismissed row | Identical to state 1, in the same slot | the original suggestion payload |
| Suggestion card (S5) | (persistence) | Reload, before the next run | Open / applied / dismissed persist per suggestion per run; the set lasts until the next run replaces it | persisted per-suggestion status |
| Suggestion card (S5) | (candidate not shown) | Candidate has no citable evidence, or fails any of the nine `suggestionRules` | Not rendered at all; counts as a rejected candidate. All rejected → panel state 6d | validator verdict per candidate |

---

## Copy Keys Defined in `deck-tuning · copy strings.ts`

Re-exports (imported from `game-log.ts`, redefined nowhere): `PATTERN_MIN`, `axisCopy`.

### `manifestCopy`

| Key | Interpolation slots |
|---|---|
| `manifestCopy.games.what` | — (static) |
| `manifestCopy.games.count` | `(n: string)` |
| `manifestCopy.games.countOne` | — (static) |
| `manifestCopy.notes.what` | — (static) |
| `manifestCopy.notes.whatMany` | — (static) |
| `manifestCopy.notes.count` | `(n: string)` |
| `manifestCopy.notes.countOne` | — (static) |
| `manifestCopy.decklist.what` | — (static) |
| `manifestCopy.decklist.count` | `(n: string)` |
| `manifestCopy.collection.what` | — (static) |
| `manifestCopy.collection.count` | — (static) |
| `manifestCopy.intent.what` | — (static) |
| `manifestCopy.intent.count` | — (static) |
| `manifestCopy.progress` | `(done: string, total: string)` |
| `manifestCopy.collapsed` | `(parts: string)` — callers join with `' · '` |

### `deckTuningCopy.panel`

| Key | Interpolation slots |
|---|---|
| `heading` | — (static) |
| `belowThreshold` | `(axis: string, marked: string, count: string)` — also reads `PATTERN_MIN` |
| `belowThresholdFlat` | `(count: string)` — also reads `PATTERN_MIN` |
| `belowThresholdSub` | — (static) |
| `belowThresholdNote` | `(have: string)` — also reads `PATTERN_MIN` |
| `ready` | `(count: string, axis: string, marked: string)` |
| `readyCta` | — (static) |
| `readyNote` | — (static) |
| `generating` | — (static) |
| `generatingCta` | — (static) |
| `stop` | — (static); removed 2026-10-12 |
| `results` | `(n: string, total: string)` |
| `resultsOne` | `(total: string)` |
| `again` | — (static) |
| `againNote` | `(open: string, total: string)` |
| `tally` | `(applied: string, total: string)` |
| `tallyWithDismissed` | `(applied: string, total: string, dismissed: string)` |
| `unchanged` | `(when: string)` |
| `unchangedReasonGames` | `(n: string, total: string, when: string)` |
| `unchangedReasonAxis` | `(axis: string, marked: string, count: string, when: string)` |
| `unchangedReasonIntent` | — (static) |
| `unchangedReasonIntentEmpty` | — (static) |
| `unchangedTail` | `(when: string)` |
| `unchangedCta` | — (static) |
| `unchangedNote` | `(open: string, total: string, when: string)` |

### `deckTuningCopy.failure`

| Key | Interpolation slots |
|---|---|
| `retry` | — (static) |
| `unavailable.tag` | — (static) |
| `unavailable.body` | — (static) |
| `unavailable.kept` | `(games: string)` |
| `unavailable.note` | — (static) |
| `timedOut.tag` | — (static) |
| `timedOut.body` | — (static) |
| `timedOut.bodyFor` | `(games: string, cards: string)` |
| `timedOut.kept` | — (static) |
| `timedOut.keptNone` | — (static) |
| `timedOut.note` | `(done: string, total: string)` |
| `unusable.tag` | — (static) |
| `unusable.body` | — (static) |
| `unusable.kept` | — (static) |
| `unusable.note` | — (static) |
| `nothingHeldUp.tag` | — (static) |
| `nothingHeldUp.body` | `(commander: string)` |
| `nothingHeldUp.kept` | `(rejected: string)` |
| `nothingHeldUp.note` | — (static) |

### `deckTuningCopy.card`

| Key | Interpolation slots |
|---|---|
| `cut` | — (static) |
| `add` | — (static) |
| `added` | — (static) |
| `owned` | `(qty: string)` |
| `notOwned` | — (static) |
| `price` | `(amount: string)` — pass-through; substitute the shipped formatter |
| `citeGames` | — (static) |
| `citeNote` | — (static) |
| `citeDecklist` | — (static) |
| `citeIntent` | — (static) |
| `citeGamesValue` | `(axis: string, marked: string, count: string)` |
| `citeNoteValue` | `(date: string)` |
| `consequenceOwned` | `(total: string, status: string)` |
| `consequenceUnowned` | `(total: string)` |
| `apply` | — (static) |
| `applying` | — (static) |
| `dismiss` | — (static) |
| `applied` | — (static) |
| `appliedVerdict` | `(have: string, total: string, status: string)` |
| `appliedOwnedClause` | — (static) |
| `appliedUnownedClause` | `(name: string, amount: string)` |
| `undo` | — (static) |
| `dismissed` | — (static) |
| `dismissedPair` | `(cut: string, add: string)` |
| `restore` | — (static) |
| `applyRefused` | — (static) |
| `undoRefused` | — (static) |

### `deckTuningCopy.intent`

| Key | Interpolation slots |
|---|---|
| `askLabel` | — (static) |
| `ask` | `(axis: string, count: string)` |
| `placeholder` | — (static) |
| `save` | — (static) |
| `skip` | — (static) |
| `edit` | — (static) |
| `editAria` | — (static) |
| `seeded` | — (static) |
| `seededAria` | — (static) |
| `maxLength` | — (numeric constant, `120`) |

### `deckTuningCopy.note`

| Key | Interpolation slots |
|---|---|
| `label` | — (static) |
| `hint` | — (static) |
| `counter` | `(n: string, max: string)` |
| `maxLength` | — (numeric constant, `140`) |
| `warnAt` | — (numeric constant, `130`) |
| `optionalNote` | — (static; amends `gameLogCopy.form.optionalNote`) |
| `ariaDescription` | — (static) |

### `deckTuningCopy.suggestionRules` (validator rule text; all static, no slots)

`noPercentage` · `noNet` · `denominator` · `citation` · `quotedNote` · `colourIdentity` · `cutInDeck` · `onePair` · `ownershipNotRanking`

### `deckTuningCopy.announce`

| Key | Interpolation slots |
|---|---|
| `started` | — (static) |
| `ready` | `(n: string)` |
| `readyOne` | — (static) |
| `unchanged` | — (static) |
| `stopped` | — (static); removed 2026-10-12 |
| `failed` | `(sentence: string)` |
| `applied` | `(name: string, have: string, total: string, status: string)` |
| `undone` | `(name: string, have: string, total: string, status: string)` |
| `dismissed` | `(open: string, total: string)` |
| `intentSaved` | — (static) |

---

### Tap-target floors carried from `READINESS.md`

| Target | Mobile | Desktop |
|---|---|---|
| Note field | 48 | 46 |
| Result and pod squares | 44 | 40 |
| Manifest rows | 44 | 38 |
| Delete control (history row) | 44 | 30 |
| Apply / dismiss on a suggestion card | 44 | 32 |
| Panel action row band | fixed band, all six states | 56, all six states |
| Panel primaries | 44 | per-state padding above |
| Adjacency rule | Apply is never adjacent to a destructive control | same |

### Two internal figure conflicts recorded verbatim (not resolved here)

- The `contract.never` string in the canvas script says "*no card art on the panel other than the two 34×48 thumbnails*", while every drawn thumbnail and the `suggestion card` contract row specify **22×31** (desktop) / **20×28** (phone).
- The drawn phone dismissed row's restore button reads `Again`; the desktop row and `card.restore` read `Show it again`. Likewise the drawn Apply button reads `Apply` on both frames while `card.apply` and the component table specify `Apply this swap` on phone.
