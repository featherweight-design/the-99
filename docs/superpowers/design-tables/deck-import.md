# Design property table — Decks · Deck import (Moxfield) (#42)

Enumerated **from the handoff only** (`design/design_handoff_the99_deck_import/`), R2. No
implementation source, plan or existing component was consulted; nothing here is softened for
feasibility. A later agent verifies built code against these rows.

Sources cited as:

- `README §<heading>` / `README:<line>` — `design_handoff_the99_deck_import/README.md`
- `Canvas:<line>` — `The 99 - Decks · Deck Import.dc.html` (inline styles; line numbers are where
  the value is drawn)
- `copy.<key>` — `deck-import · copy strings.ts`
- `READINESS §<heading>` — `READINESS.md`

**Global rule (README:300):** hexes live only in `globals.css`; every value below is authored as
`var(--*)`. **No new token is introduced.** Hexes in the canvas are shown for theme-independent
reference. Breakpoint: phone frames are drawn at **392px**, desktop frames at **1060px**
(README:6). Repo breakpoint is 640px / `sm:`.

## 0. Token → hex resolution key

| Token | Hex | Where the handoff evidences it |
|---|---|---|
| `--bg` | `#14110E` | frame fill on entry/commander surfaces; brass-button label colour — Canvas:197, 205 |
| (page ground) | `#100D0A` | deck-page frame background in states 13–19 — Canvas:597. **Not named as a token in this handoff** |
| `--surface` | `#1E1A15` | resolution result-row fill — README:317; Canvas:815 |
| `--surface-sunken` | `#181410` | field fill, coverage cells, resolution expander fill — README:306, 315; Canvas:210, 801 |
| `--surface-rail` | `#1A160F` | decklist row plate, arrival strip, live note, commander idle row — README:310, 311, 320; Canvas:605, 615 |
| `--elevated` | `#2A241D` | idle chip fill, progress-bar track — README:304; Canvas:206, 304 |
| `--elevated-hover` | `#211C15` | warning/failure banner fill, commander selected row, row pressed — README:309; Canvas:380, 448, 787 |
| `--border` | `#2A241D` | decklist section rules, live-note border, result-row idle border — Canvas:198, 945 |
| `--border-strong` | `#3A3229` | field border, banner border, frame border — Canvas:210, 380 |
| `--border-dashed` | `#8E8269` / `#4A4033` | unowned dot dashed ring `#8E8269` (Canvas:114); hollow radio + no-results circle `#4A4033` (Canvas:466, 922) — **two hexes under one named token; see Open questions** |
| `--brass` | `#C9A24B` | active chip fill, primary button, focus ring, `Fix`, `Undo` — Canvas throughout |
| `--brass-hover` | `#D8B25E` | primary-button hover, ghost-button hover label — Canvas:215 (`style-hover`) |
| `--fg` | `#EDE6D8` | headings, card names, active tab label — Canvas:200 |
| `--fg-body` | `#C6B79A` | body copy, unresolved raw name, live-note sentence — Canvas:120, 277 |
| `--fg-muted` | `#A89B84` | desktop sub-heading, commander row meta, toggle label — Canvas:226, 452 |
| `--fg-faint` | `#8E8269` | hints, meta, mono captions, dismiss ✕ — Canvas:201, 214 |
| (dimmest caption) | `#6A6152` | filter caption, keyboard hint, `unresolved lines not counted` note — Canvas:682, 813, 868. **Not named as a token** |
| (group-note grey) | `#6E6353` | desktop unresolved group right-note; `line N of the import` — README:313; Canvas:762, 899 |
| (remove ✕ grey) | `#4A4033` | decklist remove ✕; hollow radio ring; no-results dashed circle — Canvas:650, 466, 922 |
| `--success` | `#6FA368` | ownership dot, arrival ✓, resolve ✓, complete progress fill — Canvas:110, 606, 946 |
| `--warning` | `#E0913C` | banner left rule + ⚠, `?` glyph, `unmatched` tag, unresolved count, `Building` pill, dashed card in state 12 — Canvas throughout |
| `--warning` tint | `rgba(224,145,60,0.13)` | `buy` / `unmatched` tag fill, `Building` pill fill — Canvas:116, 121, 139 |
| `--danger` | `#C6533F` | **explicitly not used anywhere in this flow** — README:48–50, 200–201; Canvas:361 |
| brass focus glow | `0 0 0 3px rgba(201,162,75,.16)` | field `focus-within` — README:164, 305; Canvas:236, 805, 862 |

---

## State coverage — Deck import (19 states)

| # | State | Triggering condition | Surface rendered | Key data required |
|---|---|---|---|---|
| — | Anatomy | (documentation frame, not shipped) | — | — |
| 1 | Entry · empty | `/decks/import` first render | `ImportEntry` — chip row + mode input | none |
| 2 | URL fetching | URL submitted, Moxfield round-trip in flight | Waiting block (indeterminate) replaces the field block **in place** | submitted URL string |
| 3 | Parsing & matching | source retrieved, local parse+match running | Waiting block (determinate) | `done`, `total`, optional detected commander name |
| 4 | Invalid / non-Moxfield URL | **client-side** URL shape check fails before any request | Failure banner under the URL field | the entered value |
| 5 | Private deck | Moxfield `403` | Failure banner | the entered URL |
| 6 | Not found or deleted | Moxfield `404` | Failure banner; link **kept in field, selected** | the entered URL |
| 7 | Unreachable / rate-limited | `5xx` / `429` / timeout | Failure banner **+ `Try again`** (the only retry in the family) | the entered URL |
| 8 | File rejected | **client-side** file type ≠ `.csv`/`.txt` **or** size > 2 MB | Failure banner | file extension + formatted size (both interpolated) |
| 9 | Nothing matched | rows parsed > 0 **and** matched = 0 | Failure banner; paste **not** cleared | parsed line count |
| 10 | Parsed but empty | zero rows after parse | Failure banner | — |
| 11 | Commander picker | source declares **no** commander and ≥1 legendary creature is in the import | `ImportCommander` (variant of `CreatePicker`) | legendary rows with identity + source line; pre-filled deck name |
| — | Commander declared | source declares a commander | **nothing renders** — used silently, no confirm | — |
| 12 | No legendary creature | source declares no commander **and** zero legendary creatures | Dead-end state; **no deck is created** | total line count |
| 13 | Arrival · clean | deck page first render after an import, unresolved = 0 | Arrival strip below the spine | imported count, source, dismissed flag |
| 14 | Arrival · with unresolved rows | first render after import, unresolved > 0 | Unresolved banner + `Couldn't identify` group | unresolved count |
| 15 | Unresolved row at rest | unresolved row rendered, collapsed (rest / pressed / focus-visible / quantity>1) | `UnresolvedRow` | `raw_name`, `quantity`, `source_line` |
| 16 | Search & pick | row expanded (`expandedRowId === row.id`) | Resolution expander (row-scoped combobox) | seeded raw string, result set, result count |
| 17 | Nothing found | expander open, query returns 0 results | In-panel no-results block (**not** the crab `NoResults`) | query string |
| 18 | Resolved | a result is picked / `↵` on the active row | Row leaves the group, joins its type group; live note | resolved name, new built count, remaining unresolved, optional role clause |
| 19 | Deleted | `Delete this line` pressed | Row removed from group **and from deck total**; live note | raw name, new total |

Conditional-render rules that cut across states:

| Rule | Value | Source |
|---|---|---|
| Unresolved group under the **Shopping** filter | hidden entirely | README:55–56 |
| Unresolved group placement | own group, **pinned last**, label `Couldn't identify` | README:52–54 |
| Unresolved group sort key | `source_line` ascending (import order, not alphabetical) | README:342–344 |
| Unresolved banner at zero | disappears | README:67; copy comment |
| Unresolved group at zero | group **and** banner both go, "quietly, no fanfare" | Canvas:965 |
| Global quick-add bar on **phone** while an expander is open | unmounted | README:107–110, 316; Canvas:841 |
| Simultaneously expanded rows | exactly one | README:238; Canvas:907 |
| Desktop group grid while a row is expanded | drops from 2 columns to 1 | README:237–238; Canvas:907 |
| Arrival strip | dismissible; dismissal persists per deck; gone on next visit either way | README:311 |
| `shouldCelebrate` on a clean 99-line import | ~~**suppressed** when the first render follows an import (ruled 2026-08-04)~~ — **moot**: the completion reveal and `shouldCelebrate` were removed in #362, so there is nothing left to suppress | READINESS §Closed at the audit 1 |
| Deck with unresolved rows on `/decks` | carries a count **badge on its `DeckCard`**; no new `statusPill` value | READINESS §Two product calls |
| `/decks/import` reachability | gated by **absence of a link** (PR 4 unlinked, PR 6 linked) | READINESS §Build order |

---

## 1. Route & page shell

| Property | Mobile (392) | Desktop (1060) | Source |
|---|---|---|---|
| Route | `/decks/import` | same | README:326; Canvas:32 |
| Frame border | `1px solid --border-strong` | `1px solid --border-strong` | Canvas:197, 223 |
| Frame radius | `22px` (device frame) | `14px` | Canvas:197, 223 |
| Frame background | `--bg` `#14110E` | `--bg` `#14110E` | Canvas:197, 223 |
| Back affordance | `← Decks`, mono `11px`, `--brass` | — (app rail, unchanged) | Canvas:199, 222 |
| Header padding | `34px 18px 12px` | `34px 40px 26px` | Canvas:198, 224 |
| Header bottom rule | `1px solid --border` | `1px solid --border` | Canvas:198, 224 |
| Content column | full width, padding `16px 18px 24px` | `max-width: 760px`, padding `44px 48px` | README:162; Canvas:203, 228 |

### Heading `h2`

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | `Bring a deck over` | `Bring a deck over` | copy.entry.headingMobile / .heading |
| font-family | `Cinzel`, serif | `Cinzel`, serif | Canvas:200, 225 |
| font-weight | 700 | 700 | Canvas:200, 225 |
| font-size | 20px | 28px | Canvas:200, 225 |
| color | `--fg` | `--fg` | Canvas:200, 225 |
| margin | 0 | 0 | Canvas:200, 225 |

### Sub-heading `p`

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | `Paste it, drop a file, or hand us a link.` | `You built it somewhere else. Point us at it and we'll set it up here.` | copy.entry.subMobile / .sub |
| font-family | `IBM Plex Mono` | `IBM Plex Sans` (default) | Canvas:201, 226 |
| font-size | 10px | 14px | Canvas:201, 226 |
| color | `--fg-faint` | `--fg-muted` | Canvas:201, 226 |
| margin | `3px 0 0` | `4px 0 0` | Canvas:201, 226 |

---

## 2. Mode chip row (state 1)

Geometry taken from `src/components/collection/chip-row.tsx`; **single-select, view switch, no
dismiss ✕** (README:154–157, 304).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display / gap | `flex`, gap `8px` | `flex`, gap `9px` | Canvas:204, 229 |
| margin-bottom | 16px | 22px | Canvas:204, 229 |
| chip count / order | 3 — `Moxfield link` · `Paste` · `File` | 3 — `Moxfield link` · `Paste a list` · `Upload a file` | copy.entry.mode*; Canvas:205–207, 230–232 |
| chip border-radius | `999px` | `999px` | README:304; Canvas:205 |
| chip padding | `8px 14px` (README:304 states `7px 13px`; failure frames draw `7px 13px`) | `9px 16px` | README:304; Canvas:205, 230, 372 |
| chip font-family | `IBM Plex Sans` | `IBM Plex Sans` | Canvas:205 |
| chip font-size | 12.5px (README:304 says 12px; failure frames draw 12px) | 13px | README:304; Canvas:205, 230, 372 |
| active chip: background | `--brass` | `--brass` | Canvas:205, 230 |
| active chip: color | `--bg` `#14110E` | `--bg` | Canvas:205, 230 |
| active chip: border | `1px solid --brass` | `1px solid --brass` | Canvas:205, 230 |
| active chip: font-weight | 600 | 600 | Canvas:205, 230 |
| idle chip: background | `--elevated` `#2A241D` | `--elevated` | Canvas:206, 231 |
| idle chip: color | `--fg-body` | `--fg-body` | Canvas:206, 231 |
| idle chip: border | `1px solid --border-strong` | `1px solid --border-strong` | Canvas:206, 231 |
| idle chip: font-weight | (unset / 400) | (unset / 400) | Canvas:206, 231 |
| idle chip hover | — (not drawn) | `border-color: --brass`; `color: --brass-hover` | Canvas:231 |
| dismiss ✕ | none | none | README:157, 304 |

---

## 3. URL mode (state 1)

### Field label

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | `Moxfield deck link` | `Moxfield deck link` | copy.entry.urlLabel |
| display | block | block | Canvas:209, 234 |
| font-size | 13px | 13px | Canvas:209, 234 |
| font-weight | 600 | 600 | Canvas:209, 234 |
| color | `--fg` | `--fg` | Canvas:209, 234 |
| margin-bottom | 8px | 8px | Canvas:209, 234 |

### `SearchField` chrome (unmodified — README:305)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display / align / gap | `flex`, `center`, gap `10px` | `flex`, `center`, gap `10px` | Canvas:210, 236 |
| background | `--surface-sunken` `#181410` | `--surface-sunken` | Canvas:210, 236 |
| border (rest) | `1px solid --border-strong` | `1px solid --border-strong` | Canvas:210 |
| border (`focus-within`) | `1px solid --brass` | `1px solid --brass` | README:164, 305; Canvas:236 |
| box-shadow (`focus-within`) | `0 0 0 3px rgba(201,162,75,.16)` | same | README:164; Canvas:236 |
| border-radius | 8px | 8px | Canvas:210, 236 |
| padding | `12px 13px` | `12px 14px` | Canvas:210, 236 |
| leading glyph | `⌕`, mono 15px, `--fg-faint` | `⌕`, mono 15px, `--fg-faint` | Canvas:211, 237 |
| input font-size | **16px** (iOS no-zoom rule) | 14.5px | README:290; Canvas:212, 238 |
| placeholder | `moxfield.com/decks/…`, `--fg-faint` | same | copy.entry.urlPlaceholder |
| filled value color | `--fg` | `--fg` | Canvas:238 |
| row layout with submit | submit **full width below** the field | field + submit **on one row**, `gap:10px`, `align-items:stretch` | README:305; Canvas:215, 235 |

### Submit (`PrimaryButton`)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | `Import deck →` | `Import deck →` | copy.entry.submit |
| width | 100% | `flex:none`, padding `0 24px` | Canvas:215, 240 |
| margin-top | 16px | — (inline in row) | Canvas:215 |
| font-family / weight | `IBM Plex Sans` / 600 | `IBM Plex Sans` / 600 | Canvas:215, 240 |
| font-size | 15px | 14px | Canvas:215, 240 |
| color | `--bg` `#14110E` | `--bg` | Canvas:215, 240 |
| background | `--brass` | `--brass` | Canvas:215, 240 |
| border | none | none | Canvas:215, 240 |
| border-radius | 8px | 8px | Canvas:215, 240 |
| padding | `13px 0` | `0 24px` | Canvas:215, 240 |
| white-space | — | `nowrap` | Canvas:240 |
| hover | `background: --brass-hover` | `background: --brass-hover` | Canvas:215, 240 |
| paste-mode label variant | `Import {n} cards` | same | copy.entry.submitPasteCount |
| file-mode label variant | `Choose file` | same | copy.entry.submitFile |

### URL hint

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | `Public or unlisted decks only` | `Public or unlisted decks only · we don't need your Moxfield account` | copy.entry.urlHintMobile / .urlHint |
| font-family | `IBM Plex Mono` | `IBM Plex Mono` | Canvas:214, 242 |
| font-size | 10px | 11px | Canvas:214, 242 |
| color | `--fg-faint` | `--fg-faint` | Canvas:214, 242 |
| letter-spacing | `0.04em` | `0.04em` | Canvas:214, 242 |
| margin-top | 8px | 9px | Canvas:214, 242 |

### Footnote / about block

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| construct | single sentence | two-column grid under a top rule | Canvas:216, 243 |
| mobile text | `We'll leave the sideboard behind: Commander doesn't have one.` | — | copy.entry.footnoteMobile |
| mobile type | 12.5px, line-height 1.55, `--fg-faint`, margin `16px 0 0` | — | Canvas:216 |
| container | — | `border-top: 1px solid --border`, `margin-top:26px`, `padding-top:20px`, `grid-template-columns: 1fr 1fr`, `gap:24px` | Canvas:243 |
| column heading type | — | mono 10px, `letter-spacing:0.16em`, `text-transform:uppercase`, `--fg-faint`, `margin-bottom:7px` | Canvas:245, 249 |
| column headings | — | `What comes over` · `If a line won't match` | copy.entry.aboutWhatComesHeading / .aboutFailureHeading |
| column body type | — | 13px, line-height 1.6, `--fg-body` | Canvas:246, 250 |
| column bodies | — | copy.entry.aboutWhatComes · copy.entry.aboutFailure | copy |

---

## 4. Paste mode & File mode (specified, **not drawn as their own frames**)

| Property | Value | Source |
|---|---|---|
| Paste box | `UploadEntry`'s textarea **verbatim** | README:306 |
| Paste box background | `--surface-sunken` | README:306 |
| Paste box border | `1px --border-strong` | README:306 |
| Paste box font | mono 13px | README:306 |
| Paste box height | `h-[300px]` | README:306 |
| Paste box `maxLength` | `100_000` | README:306 |
| Paste label / placeholder | `Your list` / `1 Sol Ring\n1 Cultivate\n1 Rhystic Study` | copy.entry.pasteLabel, .pastePlaceholder |
| Paste leading glyph (failure frames) | `¶` | Canvas:1071 |
| Dropzone | `UploadEntry`'s dropzone **verbatim** | README:307 |
| Dropzone border | `1.5px dashed --border-dashed` | README:307 |
| Dropzone radius | `12px` | README:307 |
| Dropzone background | `--surface-sunken` | README:307 |
| Dropzone hover/drag | brass | README:307 |
| File label / hint | `Deck file` / `A .csv or .txt, under 2 MB` | copy.entry.fileLabel, .fileHint |
| File leading glyph (failure frames) | `⎘` | Canvas:1063 |
| Review gate | **none** — `previewPaste`/`previewUpload` shape minus the preview return | README:326–329 |

---

## 5. Waiting state 2 — URL fetching

Replaces the field block **in place** in the same 760px column; the page never navigates
(README:176–177; Canvas:350).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Retained field | shown above, `opacity:0.55`, border `1px --border`, mono 12px, ellipsised | URL shown as mono 11px `--fg-faint` line under the body | Canvas:266–268, 326 |
| Container padding | `16px 18px 24px` | `34px 48px`, `max-width:760px` | Canvas:265, 316 |
| Layout | centered column, `text-align:center`, `margin-top:28px`, `padding:0 10px` | `flex`, `align-items:center`, `gap:18px` | Canvas:270, 317 |
| Dots — count | 3 | 3 | Canvas:271–275, 318–322 |
| Dots — size | `7px × 7px` | `8px × 8px` | Canvas:272, 319 |
| Dots — radius / fill | `999px` / `--brass` | `999px` / `--brass` | Canvas:272, 319 |
| Dots — gap | 6px | 6px | Canvas:271, 318 |
| Dots — animation | `.anim-dots`, `dots 1.2s ease-in-out infinite`, delays `0 / .2s / .4s` | same | README:308; Canvas:272–274 |
| Dots — margin-bottom | 18px | — (inline) | Canvas:271 |
| Heading text | `Asking Moxfield for it` | `Asking Moxfield for it` | copy.fetching.heading |
| Heading type | Cinzel 700, 17px, `--fg` | Cinzel 700, 19px, `--fg` | Canvas:276, 324 |
| Body text | `Their servers, their pace. Usually a second or two.` | same | copy.fetching.body |
| Body type | 13px, line-height 1.55, `--fg-body`, margin-top 8px | 13.5px, `--fg-body`, margin-top 4px | Canvas:277, 325 |
| Cancel — present? | **yes** | **yes** | README:173 |
| Cancel text | `Cancel` | `Cancel` | copy.fetching.cancel |
| Cancel style | width 100%, margin-top 26px, 600/14px, `--fg`, `background:transparent`, `1px solid --border-strong`, radius 8px, padding `12px 0` | `flex:none`, 600/13px, transparent, `1px --border-strong`, radius 8px, padding `11px 20px` | Canvas:279, 328 |
| Cancel hover | `border-color: --brass`, `color: --brass-hover` | same | Canvas:279, 328 |
| Live region | `aria-live="polite"`, announced once — `Fetching the deck from Moxfield.` | same | copy.fetching.live; Canvas:282 |
| Progress figure | **none** (indeterminate) | none | README:173 |

---

## 6. Waiting state 3 — Parsing & matching

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| Retained header line | `✓` `--success` 13px + commander name mono 11.5px `--fg-body` in a `--surface-sunken` field, `1px --border`, radius 8px, padding `12px 13px`, gap 9px | commander named inline in the body sentence, bolded `--fg` 600 | Canvas:292–294, 342 |
| Dots | identical to state 2 (7px mobile / 8px desktop) | identical | Canvas:297–300, 335–338 |
| Heading text | `Reading the list` | `Reading the list` | copy.parsing.heading |
| Heading type | Cinzel 700, 17px, `--fg` | Cinzel 700, 19px, `--fg` | Canvas:302, 341 |
| Body | `Putting a card to each of the {total} lines.` | `Putting a card to each of the {total} lines. Found the commander: {commander}.` | copy.parsing.body / .bodyWithCommander |
| Body type | 13px, line-height 1.55, `--fg-body`, margin-top 8px | 13.5px, `--fg-body`, margin-top 4px | Canvas:303, 342 |
| Progress bar — present? | **yes**, determinate | **yes**, determinate | README:174 |
| Progress track height | 5px | 6px | Canvas:304, 343 |
| Progress track radius | `999px` | `999px` | Canvas:304, 343 |
| Progress track fill | `--elevated` `#2A241D` | `--elevated` | Canvas:304, 343 |
| Progress fill colour | `--brass` | `--brass` | Canvas:304, 343 |
| Progress width | 100% of column | 100% of the flex-1 body column | Canvas:304, 343 |
| Progress margin-top | 18px | 12px | Canvas:304, 343 |
| Progress figure | `64 / 100` mono 10.5px `--fg-faint`, margin-top 7px, below the bar | `64 / 100` mono 12px `--fg-faint`, `flex:none`, right of the body column | copy.parsing.progress; Canvas:305, 345 |
| Cancel | **none** | **none** | README:174 |
| Live region | `Reading the list.` | same | copy.parsing.live |
| Reduced motion | `.anim-dots` is already reduced-motion-scoped | same | README:294 |

---

## 7. Failure banner — the one container for states 4–10

Sits **directly under the input it belongs to**, `aria-describedby` + `role="alert"`, announced
once. No `--danger` anywhere (README:181–184, 200–201, 360–361).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display | `flex`, `align-items:flex-start` | `flex`, `align-items:flex-start` | Canvas:380, 408 |
| gap | 10px | 12px | README:309; Canvas:380, 408 |
| background | `--elevated-hover` `#211C15` | `--elevated-hover` | README:309; Canvas:380, 408 |
| border | `1px solid --border-strong` | `1px solid --border-strong` | README:309 |
| border-left | `3px solid --warning` | `3px solid --warning` | README:309 |
| border-radius | 8px | 10px | README:309; Canvas:380, 408 |
| padding | `12px 14px` | `16px 18px` | README:309; Canvas:380, 408 |
| margin-top (from field) | 12px | 14px | Canvas:380, 408 |
| icon | `⚠` `--warning` | `⚠` `--warning` | README:309 |
| icon font-size | 15px | 17px | README:309; Canvas:381, 409 |
| icon line-height | 1.3 | 1.2 | Canvas:381, 409 |
| heading font-size | 14px | 15px | README:309; Canvas:383, 411 |
| heading font-weight | 600 | 600 | README:309 |
| heading color | `--fg` | `--fg` | README:309 |
| heading line-height | 1.4 | 1.4 | Canvas:383, 411 |
| body font-size | 12.5px | 14px | README:309; Canvas:384, 412 |
| body color | `--fg-body` | `--fg-body` | README:309 |
| body line-height | 1.55 | 1.6 | Canvas:384, 412 |
| body margin-top | 5px | 6px | Canvas:384, 412 |
| action buttons — placement | stacked below the whole card, `flex-direction:column`, gap 9px, margin-top 14px | **inside** the banner body, `flex`, gap 10px, margin-top 14px | Canvas:387, 413 |
| `Try again` (state 7 only) | width 100%, 600/15px, `--bg` on `--brass`, no border, radius 8px, padding `13px 0` | 600/13px, `--bg` on `--brass`, radius 8px, padding `10px 20px` | Canvas:389, 415 |
| `Try again` hover | `background: --brass-hover` | `background: --brass-hover` | Canvas:389, 415 |
| secondary action | width 100%, 600/14px, `--fg`, transparent, `1px --border-strong`, radius 8px, padding `12px 0` | 600/13px, `--fg`, transparent, `1px --border-strong`, radius 8px, padding `10px 20px` | Canvas:391, 417 |
| secondary hover | `border-color:--brass`, `color:--brass-hover` | same | Canvas:391, 417 |
| desktop note line | — | mono 10.5px `--fg-faint`, line-height 1.6, margin-top 14px | Canvas:421 |
| retained field/input above | shown with its value, mono, ellipsised (`overflow:hidden; white-space:nowrap; text-overflow:ellipsis`) | same, mono 13px `--fg-body` | Canvas:378, 404 |
| field font-size in failure frames | mono 11.5px | mono 13px | Canvas:378, 404 |

### Per-failure content (states 4–10)

| # | Mode chip active | Field label | Submit label | Glyph | Drawn value | Heading | Mobile body | Desktop body | Action | Retry |
|---|---|---|---|---|---|---|---|---|---|---|
| 4 | `Moxfield link` | `Moxfield deck link` | `Import deck →` | `⌕` | `archidekt.com/decks/7213884` | `That's not a Moxfield deck link` | copy.failures.notMoxfield.bodyMobile | copy.failures.notMoxfield.body | `Paste the list instead` | false |
| 5 | `Moxfield link` | `Moxfield deck link` | `Import deck →` | `⌕` | `moxfield.com/decks/7Qk2vN1pE` | `That deck is set to private` | copy…private.bodyMobile | copy…private.body | `Paste the list instead` | false |
| 6 | `Moxfield link` | `Moxfield deck link` | `Import deck →` | `⌕` | `moxfield.com/decks/7Qk2vN1pF` | `There's no deck at that link` | copy…notFound.bodyMobile | copy…notFound.body | `Edit the link` (link kept in field, **selected**) | false |
| 7 | `Moxfield link` | `Moxfield deck link` | `Import deck →` | `⌕` | `moxfield.com/decks/7Qk2vN1pE` | `Moxfield isn't answering` | copy…unreachable.bodyMobile | copy…unreachable.body | `Try again` (primary) **+** `Paste the list instead` | **true** |
| 8 | `File` | `Deck file` | `Choose file` | `⎘` | `commander-deck.xlsx · 4.1 MB` | `We can't open that file` | copy…fileRejected.bodyMobile(ext,size) | copy…fileRejected.body(ext,size) | `Choose another file` | false |
| 9 | `Paste` | `Your list` | `Import 0 cards` | `¶` | `Commander (1) · Deck (99) · Maybeboard (14)` | `We couldn't find any of these cards` | copy…noneMatched.bodyMobile(lines) | copy…noneMatched.body(lines) | `Clear and start over` (textarea **not** cleared) | false |
| 10 | `Moxfield link` | `Moxfield deck link` | `Import deck →` | `⌕` | `moxfield.com/decks/2Bn9xQ4rT` | `That deck is empty` | copy…empty.bodyMobile | copy…empty.body | `Try a different deck` | false |

Alt chips per failure: state 4/5/6/7/10 → `Paste`, `File`; state 8 → `Moxfield link`, `Paste`;
state 9 → `Moxfield link`, `File` (Canvas:1032–1084).

---

## 8. Commander picker (state 11)

`create-picker.tsx` row **verbatim**; reads from the import, not the collection (README:216–226,
310).

### Header

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| padding | `30px 18px 14px` | `32px 40px 24px` | Canvas:441, 492 |
| bottom rule | `1px solid --border` | `1px solid --border` | Canvas:441, 492 |
| heading text | `Which one's the commander?` | same | copy.commander.heading |
| heading type | Cinzel 700, 20px, `--fg` | Cinzel 700, 28px, `--fg` | Canvas:442, 493 |
| sub text | `The list doesn't say, so you tell us.` | `This list doesn't say. Pick the one you're building around: it sets the colors and anchors everything we suggest.` | copy.commander.subMobile / .sub |
| sub type | mono 10px, `--fg-faint`, margin `4px 0 0` | 14px, `--fg-muted`, margin `4px 0 0` | Canvas:443, 494 |
| intro / count line | `{n} legendary creatures came over. Pick the one you're building around — …` — 13px, line-height 1.55, `--fg-body`, margin-bottom 14px | `{n} legendary creatures in this import` — mono 11px `--fg-faint`, margin-bottom 14px | copy.commander.introMobile / .count; Canvas:446, 498 |
| body padding | `16px 18px 12px` | `24px 40px` (left column, `flex:1`) | Canvas:445, 497 |

### Picker row

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display / align / gap | `flex`, `center`, gap 11px | `flex`, `center`, gap 14px | Canvas:448, 500 |
| list gap | 10px | 11px | Canvas:447, 499 |
| padding | `10px 12px` | `12px 15px` | Canvas:448, 500 |
| border-radius | 10px | 11px | Canvas:448, 500 |
| min-height | **44px** | — | Canvas:448 |
| selected: background | `--elevated-hover` `#211C15` | `--elevated-hover` | README:310; Canvas:448 |
| selected: border | `1px solid --brass` | `1px solid --brass` | README:310 |
| idle: background | `--surface-rail` `#1A160F` | `--surface-rail` | README:310; Canvas:458 |
| idle: border | `1px solid --border` | `1px solid --border` | README:310 |
| idle hover | — (not drawn) | `border-color:--border-strong`; `background:--elevated-hover` | Canvas:510 |
| thumb width × height | `34 × 48` | `40 × 56` | README:217, 435; Canvas:449, 501 |
| thumb radius | 6px | 6px | Canvas:449, 501 |
| thumb fill | colour-identity gradient placeholder `linear-gradient(150deg,#7fae74,#4B7A46 58%,#2b4a2a)` | same | README:361; Canvas:449 |
| thumb inner shadow | `inset 0 0 0 1px rgba(0,0,0,0.35)` | same | Canvas:449 |
| name type | Cinzel 600, 14px, `--fg`, line-height 1.3, margin 0 | Cinzel 600, 16px, `--fg`, line-height 1.3 | Canvas:451, 503 |
| meta type | mono 10px, `--fg-muted`, margin-top 4px, gap 5px | mono 11px, `--fg-muted`, margin-top 5px, gap 6px | Canvas:452, 504 |
| identity dot | `9 × 9`, radius 999px, identity colour | `11 × 11`, radius 999px | Canvas:453, 505 |
| meta text | `{identity} · line {n}` | `{identity} · line {n} · you own it` / `· not in your collection` | copy.commander.rowMetaMobile / .rowMetaOwned / .rowMetaUnowned |
| radio size | `20 × 20` | `22 × 22` | README:310; Canvas:456, 508 |
| radio radius | `999px` | `999px` | Canvas:456 |
| radio selected | `2px solid --brass`, filled `--brass` | same | README:310; Canvas:456, 508 |
| radio hollow | `2px solid #4A4033` (README calls it `2px --border-dashed`) | same | README:310; Canvas:466, 518 |

### Footnote

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | — (not drawn) | copy.commander.footnote | Canvas:531 |
| type | — | 12.5px, `--fg-faint`, line-height 1.6, margin-top 16px | Canvas:531 |

### Selected sidebar (desktop) / sticky footer (mobile)

| Property | Mobile (sticky footer) | Desktop (sidebar) | Source |
|---|---|---|---|
| container | `padding:14px 16px 20px`, `border-top:1px solid --border`, `background:--surface-rail` | `width:300px`, `flex:none`, `--surface-rail`, `1px solid --border`, radius 12px, `padding:20px`, `margin:24px 40px 24px 0` | Canvas:480, 533 |
| `Selected` label | — | mono 10px, `letter-spacing:0.14em`, uppercase, `--fg-faint`, margin `0 0 14px` | copy.commander.selectedLabel; Canvas:534 |
| selected thumb | — | `44 × 62`, radius 7px | Canvas:536 |
| selected name | — | Cinzel 600, 15px, `--fg`, line-height 1.2 | Canvas:538 |
| selected meta | — | mono 11px, `--fg-muted`, margin `3px 0 0` — `Mono-Green · 99 cards` | Canvas:539 |
| name-field label | `Deck name — from Moxfield`, mono 10px `--fg-faint`, margin-bottom 9px | `Deck name`, mono 10px `--fg-faint`, margin-bottom 7px | copy.commander.nameLabelFromSource / .nameLabel; Canvas:481, 542 |
| name field | `--surface-sunken`, `1px --border-strong`, radius 8px, padding `11px 13px`, 14px, `--fg`, margin-bottom 10px | same, margin-bottom 16px | Canvas:482, 543 |
| name value | pre-filled from source, **editable** | same | README:224–226 |
| submit | `Make the deck →`, width 100%, 600/15px, `--bg` on `--brass`, radius 8px, padding `13px 0` | identical | copy.commander.submit; Canvas:483, 544 |
| submit hover | `background:--brass-hover` | same | Canvas:483, 544 |

---

## 9. State 12 — No legendary creature (dead end)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| container padding | `44px 24px 32px` | `64px 40px` | Canvas:554, 572 |
| text-align | center | center | Canvas:554, 572 |
| background-image | `radial-gradient(400px 220px at 50% 80%, rgba(201,162,75,0.07), transparent 70%)` | `radial-gradient(440px 260px at 50% 78%, rgba(201,162,75,0.07), transparent 70%)` | Canvas:554, 572 |
| mark container | `96 × 104`, margin `0 auto 20px`, `position:relative` | `112 × 120`, margin `0 auto 22px` | Canvas:555, 573 |
| card 1 (back-left) | `48 × 68`, radius 8px, `#221D16`, `1.5px solid --border-strong`, `rotate(-15deg) translateX(-18px)` | `56 × 78`, radius 8px, `#221D16`, `1.5px solid --border-strong`, `rotate(-15deg) translateX(-21px)` | Canvas:556, 574 |
| card 2 (centre) | `48 × 68`, radius 8px, `#2A241D`, `1.5px solid #4A4033` | `56 × 78`, `#2A241D`, `1.5px solid #4A4033` | Canvas:557, 575 |
| card 3 (front) | `48 × 68`, radius 8px, `#241B12`, **`1.5px dashed --warning`**, `rotate(15deg) translateX(18px)` | `56 × 78`, `#241B12`, `1.5px dashed --warning`, `rotate(15deg) translateX(21px)` | README:230–232; Canvas:558, 576 |
| front-card glyph | `?`, Cinzel 800, 20px, `--warning` | `?`, Cinzel 800, 24px, `--warning` | Canvas:558, 576 |
| heading | `There's no commander in here` — Cinzel 700, 21px, `--fg`, margin 0 | Cinzel 700, 26px, `--fg` | copy.commander.noneHeading; Canvas:560, 578 |
| body | copy.commander.noneBody(total) — 13.5px, line-height 1.6, `--fg-body`, margin `10px 0 0` | copy.commander.noneBodyDesktop(total) — 15px, line-height 1.6, `--fg-body`, `max-width:420px`, margin `12px auto 0` | Canvas:561, 579 |
| actions layout | column, gap 10px, margin-top 24px, full-width buttons | row, gap 12px, centred, margin-top 26px | Canvas:562, 580 |
| primary | `Start from a commander instead →` — 600/15px, `--bg` on `--brass`, radius 8px, padding `13px 0` | 600/14px, padding `12px 22px` | copy.commander.noneCta; Canvas:563, 581 |
| secondary | `Back to the list` — 600/14px, `--fg`, transparent, `1px --border-strong`, radius 8px, padding `12px 0` | 600/14px, padding `12px 22px` | copy.commander.noneBack; Canvas:564, 582 |
| reassurance line | — (not drawn on phone) | `Nothing was created · your list is still in the box` — mono 11px, `--fg-faint`, margin-top 24px | copy.commander.noneReassurance; Canvas:584 |
| deck created? | **no** | **no** | README:228–229 |

---

## 10. Arrival strip (state 13)

Full-width band **below the spine** (README:311).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display / align / gap | `flex`, `center`, gap 9px | `flex`, `center`, gap 11px | Canvas:605, 639 |
| background | `--surface-rail` `#1A160F` | `--surface-rail` | README:311; Canvas:605, 639 |
| border-bottom | `1px solid --border` | `1px solid --border` | README:311 |
| padding | `10px 16px` | `12px 30px` | Canvas:605, 639 |
| leading `✓` | `--success`, 12px | `--success`, 14px | README:311; Canvas:606, 640 |
| text | `All {n} came over · from Moxfield, just now` | `All {n} lines came over clean. Imported from Moxfield a moment ago — nothing needs your attention.` | copy.arrival.cleanMobile / .clean |
| text type | mono 10.5px, `--fg-body`, `flex:1` | 13.5px (sans), `--fg-body`, `flex:1` | Canvas:607, 641 |
| dismiss | `✕`, mono 10px, `--fg-faint` | `Dismiss ✕`, mono 11px, `--fg-faint` | README:311; copy.arrival.dismiss; Canvas:608, 642 |
| dismiss hover | — | `color: --brass` | Canvas:642 |
| persistence | dismissal persists **per deck**; strip gone on the next visit either way | same | README:311 |
| modal / "import complete" screen | **none** — the deck is the confirmation | same | Canvas:622 |

### Spine on a clean import (13)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| figure | `99` mono 600 14px `--fg` + `/ 99` mono 14px `--fg-faint` | `99` mono 600 20px + `/ 99` mono 13px | Canvas:602, 633 |
| progress bar | width 100%, height 5px, radius 999px, track `--elevated`, fill **`--success`** at 100% | width 170px, height 6px, fill `--success` | Canvas:603, 634 |
| owned/buy line | — | mono 10px `--fg-faint` — `73 owned · 26 to buy` | Canvas:635 |
| kaiju completion reveal | **removed in #362** — it no longer renders after any import, so the suppression rule is moot | same | READINESS §Closed 1 |

---

## 11. Unresolved banner (state 14)

Identical geometry to the failure banner (README:312).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| placement | below the spine, above the coverage strip and the tabs | same | README:64–66, 139–141 |
| container padding (outer) | `12px 16px 0` | `14px 30px 0` | Canvas:672, 728 |
| background | `--elevated-hover` | `--elevated-hover` | README:312 |
| border | `1px solid --border-strong` | `1px solid --border-strong` | README:312 |
| border-left | `3px solid --warning` | `3px solid --warning` | README:312 |
| border-radius | 8px | 10px | Canvas:673, 729 |
| padding | `12px 14px` | `16px 18px` | Canvas:673, 729 |
| gap | 10px | 12px | Canvas:673, 729 |
| `⚠` | `--warning`, 15px, line-height 1.3 | `--warning`, 17px, line-height 1.2 | Canvas:674, 730 |
| sentence | copy.unresolved.bannerMobile(n) | copy.unresolved.banner(n) (with `Complete` bolded `--fg` 600) | copy; Canvas:676, 732 |
| sentence type | 12.5px, line-height 1.55, `--fg-body` | 14px, line-height 1.6, `--fg-body` | Canvas:676, 732 |
| action | `Take a look →` as a **brass text link under the sentence** — 12.5px, 600, `--brass`, margin-top 7px | `Take a look →` as a **`GhostButton` on the right** — 600/13px, `--fg`, transparent, `1px --border-strong`, radius 8px, padding `10px 18px` | README:312; copy.unresolved.bannerAction; Canvas:677, 734 |
| ghost hover (desktop) | — | `border-color:--brass`, `color:--brass-hover` | Canvas:734 |
| at zero | disappears | disappears | README:67 |
| new pill variant | **none** — `statusPill` keeps returning `Building` | same | README:58–63 |
| spine changes | **none** — no extra figure, no second bar, no "97 + 2" | same | README:67–69 |

### Spine with unresolved rows (14)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| figure | `97` / `99` | `97` / `99` | Canvas:669, 722 |
| progress fill | `--warning` at 98% | `--warning` at 98% | Canvas:670, 723 |
| status pill | — (not drawn) | `Building` — mono 10px, `letter-spacing:0.06em`, radius 999px, padding `5px 10px`, `--warning` on `rgba(224,145,60,.13)` | Canvas:720 |
| owned/buy line | — | mono 10px `--fg-faint` — `71 owned · 26 to buy` | Canvas:724 |

---

## 12. Coverage strip & tabs with unresolved rows

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| cells | 5 (`Ramp`, `Draw`, `Rem`, `Wipe`, `Land` — abbreviated on phone) | 5 (`Ramp`, `Draw`, `Removal`, `Wipes`, `Land`) | Canvas:684–688, 740–744 |
| extra cell for unresolved | **none** | **none** | README:137 |
| asterisk / footnote on cells | **none** | **none** | README:137 |
| strip heading | `Recommended mix` mono 9px, `letter-spacing:0.1em`, uppercase, `--fg-body` | mono 11px, `letter-spacing:0.12em`, uppercase, `--fg-body` | Canvas:682, 738 |
| strip right note | `unresolved lines not counted` mono 9px `#6A6152` | `a guide, not a gate` mono 10.5px `--fg-faint` | Canvas:682, 738 |
| cell background / border / radius | `--surface-sunken`, `1px --border`, 7px | `--surface-sunken`, `1px --border`, 8px | Canvas:684, 740 |
| cell padding | `6px 2px`, `text-align:center` | `9px 10px` | Canvas:684, 740 |
| cell label type | mono 8.5px, `letter-spacing:0.06em`, uppercase, `--fg-faint` | mono 10px, `letter-spacing:0.1em`, uppercase, `--fg-faint` | Canvas:684, 740 |
| cell figure type | mono 600 12px `--fg-body`; denominator 9px `--fg-faint` | mono 600 16px `--fg-body`, margin-top 3px; denominator 11px `--fg-faint` | Canvas:684, 740 |
| cell gap | 4px | 8px | Canvas:683, 739 |
| `Your deck` tab count | `97` (built, not rows on screen) | `97` | README:136; Canvas:692, 748 |
| `Consider` tab count | `99` — **unchanged** by unresolved rows | `99` | README:135; Canvas:693, 749 |
| active tab | 600, 13.5px, `--fg`, `border-bottom:2px solid --brass`, padding-bottom 8px | 600, 14px, `--fg`, `2px --brass`, padding-bottom 10px | Canvas:692, 748 |
| idle tab | 500, 13.5px, `--fg-faint`, `border-bottom:2px solid transparent` | 500, 14px, `--fg-faint` | Canvas:693, 749 |
| tab counts type | mono 11px — `--fg-faint` on `Your deck`, `--brass` on `Consider` | mono 12px, same colours | Canvas:692, 749 |
| tab-row right note | — | `both figures exclude the 2 unresolved lines — see the banner above`, mono 10px `#6A6152`, `margin-left:auto`, padding-bottom 10px | Canvas:750 |
| tab-row gap / padding | gap 18px, `4px 16px 0`, `border-bottom:1px solid --border` | gap 22px, `4px 30px 0`, `border-bottom:1px solid --border` | Canvas:691, 747 |

---

## 13. `Couldn't identify` group header

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| construct | shipped `DecklistGroup` header | shipped `DecklistGroup` header | README:313 |
| label | `Couldn't identify` | `Couldn't identify` | copy.unresolved.groupLabel |
| label type | 12.5px, 600, `--fg` (sans) | Cinzel 600, 15px, `--fg` | Canvas:701, 761 |
| count colour | **`--warning`** (the one colour difference vs `--fg-faint`) | **`--warning`** | README:313; Canvas:701, 761 |
| count type | mono 10px | mono 11px | Canvas:701, 761 |
| header gap | 8px | 10px | Canvas:701, 760 |
| header rule | — (none drawn) | `border-bottom:1px solid --border`, `padding-bottom:7px`, `margin-bottom:8px` | Canvas:760 |
| right note | — | `counted in the 99, not in what's built` — mono 10.5px `#6E6353`, `margin-left:auto` | README:313; copy.unresolved.groupNote; Canvas:762 |
| a11y | `section[aria-labelledby=unresolved-h]` → `h3#unresolved-h` `"Couldn't identify · 2"` | same | README:271–273 |
| group position | pinned **last** | pinned last | README:52 |
| grid | single column, gap 3px | `grid-template-columns:1fr 1fr`, `gap:4px 20px` | Canvas:702, 764 |

### Group footnote

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| text | copy.unresolved.footnoteMobile | copy.unresolved.footnote | copy |
| type | 12px, line-height 1.55, `--fg-faint`, margin-top 10px | 12.5px, line-height 1.6, `--fg-faint`, margin-top 12px | Canvas:706, 768 |

---

## 14. Unresolved row (state 15)

`DecklistRow` plate + radius + padding, plus three redundant signals (README:41–46, 314).

### Rest

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display / align / gap | `flex`, `center`, gap 9px | `flex`, `center`, gap 10px | Canvas:703, 765 |
| background | `--surface-rail` `#1A160F` | `--surface-rail` | README:314; Canvas:703, 765 |
| border-radius | 6px | 7px | README:107; Canvas:703, 765 |
| padding | `6px 8px` | `7px 9px` | Canvas:703, 765 |
| **border-left** | `2px solid --warning` | `2px solid --warning` | README:45, 314 |
| **min-height** | **44px** | 44px (README:314 states it unconditionally) | README:289, 314; Canvas:703 |
| cursor | — | `pointer` | Canvas:765 |
| ownership-dot slot | replaced by `?` — width 7px, `--warning`, 11px, `text-align:center`, `flex:none` | `?` — width 8px, `--warning`, 12px | README:44, 314; Canvas:703, 765 |
| name font-family | `IBM Plex Mono` | `IBM Plex Mono` | README:43, 314 |
| name font-size | 11.5px | 12.5px | README:314; Canvas:703, 765 |
| name color | `--fg-body` | `--fg-body` | README:43, 314 |
| name flex | `1` | `1` | Canvas:703 |
| quantity (>1) | `×4`, mono 10px, `--fg-faint`, before the tag | (not drawn) | Canvas:789 |
| `unmatched` tag font-family | mono | mono | README:314 |
| `unmatched` tag font-size | 9px | 9.5px | README:314; Canvas:703, 765 |
| tag border-radius | 4px | 4px | README:314 |
| tag padding | `1px 5px` | `1px 5px` | README:314 |
| tag color | `--warning` | `--warning` | README:314 |
| tag background | `rgba(224,145,60,.13)` | `rgba(224,145,60,.13)` | README:314 |
| tag slot | the `buy` tag's exact geometry and position | same | README:46, 314 |
| `Fix` affordance | — (row itself is the target) | `Fix`, 12px, 600, `--brass`, in the slot where the remove ✕ sits | README:314; copy.unresolved.rowFix; Canvas:765 |
| deliberately absent | `--danger`, strike-through, reduced opacity, separate "problems" tray | same | README:48–50 |

### Pressed

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| background | `--elevated-hover` `#221D16` (annotated `--surface-raised`) | hover `background:#221D16` | Canvas:787, 791, 765 |

### Focus-visible

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| outline | `2px solid --brass` | `2px solid --brass` | README:291; Canvas:788 |
| outline-offset | `2px` | `2px` | README:291; Canvas:788 |
| overridden anywhere in this flow? | **no** — global `:focus-visible` from `globals.css` | no | README:291 |

### A11y

| Property | Value | Source |
|---|---|---|
| control | `button[aria-expanded][aria-controls=fix-N]` | README:273–274 |
| sr-only text | `unmatched line` | README:274 |
| accessible name | copy.unresolved.rowAria(raw, quantity) — raw string in curly quotes | copy |

---

## 15. Resolution expander (state 16)

One construct at both widths; a **disclosure, not a dialog**; no new focus trap; `Esc` collapses
and returns focus to the row (README:236–240).

### Container

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| background | `--surface-sunken` `#181410` | `--surface-sunken` | README:315–316; Canvas:801, 853 |
| border | `1px solid --border-strong` | `1px solid --border-strong` | README:315 |
| border-left | `2px solid --warning` | `2px solid --warning` | README:315 |
| border-radius | 9px | 9px | README:315 |
| padding | `13px 14px 16px` | `14px 16px` | README:315–316; Canvas:801, 853 |
| width | full width in the deck column, margin `0 16px 16px` | full width of the group (group drops to 1 column) | README:316; Canvas:801, 907 |
| inner layout | single column | `flex`, gap 20px, `align-items:flex-start` — combobox column `flex:1` + **220px rail** | README:315; Canvas:860 |
| sheet / grabber / `.anim-sheet-*` | **none** — retired with #158 | none | README:316 |
| animation | height + fade, **160ms**, behind `prefers-reduced-motion` | same | README:293–294 |
| one expanded row at a time | yes | yes | README:238 |
| global quick-add bar | **unmounts** while open | stays | README:107–110, 316 |

### Expander header row

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| layout | `flex`, `center`, gap 9px, margin-bottom 10px | `flex`, `center`, gap 10px, margin-bottom 12px | Canvas:802, 854 |
| `?` glyph | `--warning`, 11px | `--warning`, 12px | Canvas:802, 855 |
| raw string | mono 12px, `--fg` | mono 13px, `--fg` | Canvas:802, 856 |
| prompt | separate Cinzel 600 16px `--fg` line below: `What was this meant to be?` | inline `— what was this meant to be?`, 13px, `--fg-muted` | copy.resolve.headingMobile / .prompt; Canvas:803, 857 |
| secondary prompt line | `The list said {raw}. Pick the card you meant.` — 12.5px, line-height 1.55, `--fg-body`, margin-top 5px; `{raw}` in mono `--fg` | — | copy.resolve.promptMobile; Canvas:804 |
| collapse control | `Collapse ▴`, mono 10.5px, `--fg-faint` | `Collapse ▴`, mono 11px, `--fg-faint`, `margin-left:auto` | copy.resolve.collapse; Canvas:802, 858 |
| collapse hover | — | `color:--brass` | Canvas:858 |

### Seeded combobox field

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| background | `--bg` `#14110E` | `--bg` | Canvas:805, 862 |
| border | `1px solid --brass` | `1px solid --brass` | Canvas:805, 862 |
| box-shadow | `0 0 0 3px rgba(201,162,75,.16)` | same | Canvas:805, 862 |
| border-radius | 8px | 8px | Canvas:805, 862 |
| padding | `11px 13px` | `11px 13px` | Canvas:805, 862 |
| gap | 10px | 10px | Canvas:805, 862 |
| margin-top | 14px | — | Canvas:805 |
| leading `⌕` | mono 15px, `--fg-faint` | mono 15px, `--fg-faint` | Canvas:806, 863 |
| value font-size | **16px** (iOS no-zoom) | 14.5px | README:290; Canvas:807, 864 |
| value seeded | raw string, **selected** — `color:--bg` on `background:--brass`, radius 2px, padding `0 2px` | same | README:103, 243; Canvas:807, 864 |
| a11y | `input[role=combobox][aria-expanded][aria-controls=fix-N-list][aria-activedescendant][aria-describedby=fix-N-hint]` | same | README:275–277 |
| accessible name | copy.resolve.searchAria(raw) | same | copy |
| keyboard | `↑↓` via `aria-activedescendant`, `Esc` dismisses, `↵` **resolves this row** (never adds) | same | README:97–105 |

### Result count / owned toggle / caption

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| row layout | `flex`, `space-between`, gap 10px, margin-top 11px | `flex`, `center`, gap 14px, margin-top 11px | Canvas:809, 866 |
| count text | `{n} result{s}` | same | copy.resolve.resultsCount |
| count type | mono 10.5px, `--fg-faint` | mono 10.5px, `--fg-faint` | Canvas:810, 867 |
| keyboard hint | — (not drawn on phone) | `↑↓ to move · ↵ to use the top match · Esc to collapse` — mono 10.5px `#6A6152` | copy.resolve.keyboardHint; Canvas:868 |
| toggle track | `30 × 17`, radius 999px, `--elevated` `#2A241D` | same, `margin-left:auto` | README:318; Canvas:811, 869 |
| toggle knob | `13 × 13`, radius 999px, `#8E8269`, `top:2px; left:2px` (**off** position) | same | Canvas:811, 869 |
| toggle label | `Owned only`, 11.5px, `--fg-muted`, gap 7px | `Owned only`, 12px, `--fg-muted`, gap 7px | copy.resolve.ownedToggleLabel; Canvas:811, 869 |
| toggle default | **off** — overrides the global on-by-default; scoped to this row; resets on collapse | same | README:113–129, 400 |
| colour-identity filter | **off** in this scope | off | README:246–248 |
| caption text | copy.resolve.filterCaptionMobile | copy.resolve.filterCaption | copy |
| caption type | mono 10px, `#6A6152`, line-height 1.5, margin-top 5px | mono 10.5px, `#6A6152`, margin-top 6px | Canvas:813, 871 |

### Result row (`quick-add-bar`'s row verbatim — README:317)

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| list gap | 6px | 6px | Canvas:814, 872 |
| list margin-top | 10px | 10px | Canvas:814, 872 |
| background | `--surface` `#1E1A15` | `--surface` `#1E1A15` | README:317 |
| border (idle) | `1px solid --border` | `1px solid --border` | README:317 |
| border (active) | `1px solid --brass` | `1px solid --brass` | README:317 |
| hover (idle) | — | `border-color:--border-strong` | Canvas:880 |
| border-radius | 9px | 9px | README:317 |
| min-height | **56px** | **52px** | README:317; Canvas:815, 873 |
| padding | `8px 10px` | `8px 12px` | Canvas:815, 873 |
| gap | 10px | 12px | Canvas:815, 873 |
| thumb | `32 × 45`, radius 5px | `30 × 42`, radius 5px | README:317; Canvas:816, 874 |
| thumb inner shadow | `inset 0 0 0 1px rgba(0,0,0,.35)` | same | Canvas:816, 874 |
| name type | 14px, 600, `--fg` | 14px, 600, `--fg`, fixed `width:230px`, `flex:none` | README:317; Canvas:817, 875 |
| matched substring | `--brass` | `--brass` | README:317; Canvas:817, 875 |
| meta | mono 10px, `--fg-faint`, margin-top 1px — type line **and** ownership in one string (`Instant · ×1 owned`) | **two cells**: type line mono 11px `--fg-faint` `flex:1`; ownership mono 11px, `width:80px`, right-aligned | README:317; Canvas:817, 876–877 |
| unowned meta colour | `--warning` (`not owned`) | `--warning` | Canvas:827, 891 |
| active-row right slot | `↵`, mono 10px, `--brass` | `↵ use this`, mono 11px, `--brass`, `width:96px`, right-aligned | copy.resolve.activeRowHint; Canvas:818, 878 |
| idle-row right slot | `Use this` ghost button — 13px 600, `--brass`, transparent, `1px --border-strong`, radius 7px, padding `0 12px`, height **40px** | `Use this card` ghost button — 12.5px 600, `--brass`, transparent, `1px --border-strong`, radius 7px, padding `6px 0`, `width:96px` | copy.resolve.use / .useShort; Canvas:823, 885 |
| ghost hover | — | `border-color:--brass` | Canvas:885 |
| a11y | `ul#fix-N-list[role=listbox] > li[role=option]` | same | README:277 |
| action semantics | resolves the row; **never adds a card** | same | README:104–105 |

### Raw-line rail

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| placement | single line under the results | 220px right rail, `flex:none` | README:315; Canvas:831, 897 |
| rail label | — | `The line as it came` — mono 10px, `letter-spacing:0.14em`, uppercase, `--fg-faint`, margin-bottom 8px | copy.resolve.rawLabel; Canvas:898 |
| raw line text | `1 Lighting Bolt · line 41 of the import` (one mono line) | `1 Lighting Bolt` + `line 41 of the import` on a second line | copy.resolve.rawLine / .rawLineNumber; Canvas:831, 899 |
| raw line type | mono 10px, `#6A6152`, line-height 1.5, margin-top 9px | box: `--bg` `#14110E`, `1px --border`, radius 8px, padding `11px 13px`, mono 12px `--fg-body`, line-height 1.6 | Canvas:831, 899 |
| line-number type | (inline in the same string) | mono 10.5px, `#6E6353`, margin-top 5px | Canvas:899 |
| Delete button | `Delete this line` — `flex:1`, 600/13px, `--fg`, transparent, `1px --border-strong`, radius 8px, padding `12px 0`, **min-height 44px** | width 100%, 600/13px, transparent, `1px --border-strong`, radius 8px, padding `10px 0`, margin-top 12px | copy.resolve.delete; Canvas:833, 900 |
| Delete hover | `border-color:--brass`, `color:--brass-hover` | same | Canvas:833, 900 |
| Delete note | — | `Deleting drops it from the deck's total too: 100 becomes 99.` — 11.5px, line-height 1.55, `--fg-faint`, margin-top 10px | copy.resolve.deleteNote; Canvas:901 |
| Dismiss button | `Leave it for now` — `flex:1`, same chrome as Delete, min-height 44px, row gap 9px, margin-top 14px | — (not drawn in state 16 desktop) | copy.resolve.dismiss; Canvas:834 |
| Editing the raw text | **not offered** at either width | not offered | README:250–252 |

### Phone-only note

| Property | Value | Source |
|---|---|---|
| bar-hidden caption | `the global quick-add bar is hidden while a row is open — one search field on screen, and it means one thing` — mono 9.5px `#6A6152`, line-height 1.5, `border-top:1px dashed --border`, padding `11px 16px 14px` | Canvas:840–841 |

---

## 16. State 17 — Nothing found

Inside the expander panel; **not** the `NoResults` crab state (README:319).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| container | same expander chrome (`--surface-sunken`, `1px --border-strong`, `2px --warning` left, radius 9px, padding `13px 14px 16px`) | same, padding `14px 16px` | Canvas:916, 975 |
| query field | `--bg`, `1px --brass`, radius 8px, padding `11px 13px`; value 16px `--fg` (**no** brass box-shadow drawn) | same; value 14.5px `--fg` | Canvas:917, 978 |
| block padding | `30px 8px 8px`, `text-align:center` | `26px 0 6px`, `text-align:center` | Canvas:921, 982 |
| mark | `34 × 34` circle, `border-radius:999px`, `1px dashed #4A4033`, glyph `?` 15px `--fg-faint`, `margin:0 auto 14px` | identical, `margin:0 auto 12px` | README:319; Canvas:922, 983 |
| heading | `Nothing by that name` — Cinzel 700, **17px**, `--fg` | Cinzel 700, **18px**, `--fg` | README:319; copy.resolve.noResultsHeading; Canvas:923, 984 |
| body | copy.resolve.noResultsBody — 13px, line-height 1.55, `--fg-body`, margin-top 8px | 13.5px, line-height 1.6, `--fg-body`, `max-width:400px`, centred, margin-top 8px | Canvas:924, 985 |
| actions | `Delete this line` + `Leave it for now` stacked, gap 9px, margin-top 16px, full width, 600/14px, `1px --border-strong`, radius 8px, padding `12px 0`, min-height 44px | `Delete this line` only, in the 220px rail | copy.resolve.delete, .dismiss; Canvas:927–928, 991 |
| "drop the owned filter" escape | **absent by design** — that filter is already off here | absent | README:120–124; copy comment; Canvas:932 |
| result count / toggle / caption | not drawn in this state | not drawn | Canvas:916–930, 975–994 |

---

## 17. State 18 — Resolved

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| row destination | leaves the group, joins its **real type group**, **carrying focus with it** | same | README:257–259 |
| resolved row focus ring | `outline:2px solid --brass`, `outline-offset:2px` | same | Canvas:940, 1000 |
| resolved row chrome | standard `DecklistRow` — `--surface-rail`, radius 6px, padding `6px 8px`, `--success` dot 7×7 | radius 7px, padding `7px 9px`, dot 8×8, remove `✕` `#4A4033` 13px | Canvas:940, 1000 |
| built count | 97 → **98** in the same optimistic frame | same | README:143–145 |
| `Your deck` tab | moves with built | moves with built | README:143 |
| group count | 2 → **1** | 2 → 1 | README:143 |
| role cell | e.g. Removal 6 → **7** (the line now has a role) | same | README:144 |
| Consider tile for that card | flips to `✓ In deck` if it was on a shelf | same | README:144–145 |

---

## 18. State 19 — Deleted

| Property | Value | Source |
|---|---|---|
| effect | line drops from the deck's **total**, not just from the group | README:259–260 |
| total | 100 → 99 | copy.resolve.deleted; Canvas:961, 1017 |
| Undo | restores **both** the row and the total | README:260 |
| last row removed | group **and** banner both disappear, "quietly, no fanfare" | Canvas:965 |
| empty-note (drawn annotation) | `border:1px dashed --border`, radius 10px, padding `18px 14px`, centred, 13px `--fg-body`, line-height 1.55, margin-top 26px | Canvas:964–965 |

---

## 19. Live note (one polite live region, under the group)

Shared by resolve and delete; replaces its own text; never stacks; never a floating toast
(README:255–260, 320).

| Property | Mobile | Desktop | Source |
|---|---|---|---|
| display / align / gap | `flex`, `center`, gap 9px | `flex`, `center`, gap 11px | Canvas:945, 1005 |
| background | `--surface-rail` `#1A160F` | `--surface-rail` | README:320 |
| border | `1px solid --border` | `1px solid --border` | README:320 |
| border-radius | 8px | 9px | README:320 |
| padding | `10px 12px` | `12px 14px` | README:320 |
| margin-top | 16px | 16px | Canvas:945, 1005 |
| resolve glyph | `✓` `--success`, 12px | `✓` `--success`, 14px | README:320; Canvas:946, 1006 |
| delete glyph | `−` `--fg-faint`, mono 12px | `−` `--fg-faint`, mono 13px | README:320; Canvas:960, 1016 |
| sentence type | 12.5px, `--fg-body`, `flex:1` | 13.5px, `--fg-body`, `flex:1` | Canvas:947, 1007 |
| resolve copy | copy.resolve.resolvedMobile(name, built) — card name bolded `--fg` 600 | copy.resolve.resolved(name, built, remaining, role?) with copy.resolve.roleClause | copy; Canvas:947, 1007 |
| delete copy | copy.resolve.deletedMobile(raw, total) — raw name in mono `--fg` | copy.resolve.deleted(raw, total) | copy; Canvas:961, 1017 |
| `Undo` | 12px, 600, `--brass`, right-aligned, **inside the note** | 13px, 600, `--brass`, `cursor:pointer` | copy.resolve.undo; README:256; Canvas:948, 1008 |
| Undo window | persists **until the next action on the group** (drawn; unspecified in the brief) | same | README gap 4; READINESS §Still open |
| region count across the flow | exactly **two** — one on the entry surface (waiting phases), one under the unresolved group. Do not add a third. | same | README:286–287 |
| a11y | `p[aria-live=polite]` | same | README:280 |

---

## 20. Data, counts and mechanics the design asserts

| Property | Value | Source |
|---|---|---|
| Unresolved row record | `(deck_id, raw_name, quantity, source_line)` | README:342 |
| `source_line` rendering | `line {n} of the import` | copy.resolve.rawLineNumber |
| `source_line` role | the group's **sort key** (import order) | README:343–344 |
| `deckCounts()` | unresolved rows **included** in `total`; **excluded** from `built`, `ownedCount`, `toBuyCount` and the role counter | README:348–349 |
| `statusPill` | `Complete` blocked while any unresolved row exists (belt-and-braces guard) | README:61–63, 350 |
| Component split | `DecklistGroup` gains an `unresolved` variant **or** a sibling `UnresolvedGroup`; `DecklistRow` must **not** grow a variant flag (it carries `oracleId` throughout) | README:345–347 |
| Resolution combobox | a **second, row-scoped instance** of `quick-add-bar`'s combobox — not a `variant` flag on the mounted bar | README:335–338 |
| Extra props vs the bar | `seed`, `ownedOnly={false}`, `identityFilter={false}`, `onPick` that resolves rather than adds | README:337–338 |
| Oracle-id source list | must take the **server** `deckOracleIds` list (same as the bar) | README:110–111 |
| Optimism | resolve + delete go through `use-deck-mutation` and `useOptimisticDeckCards` | README:351–353 |
| Parse note (the only non-fatal note) | copy.notes.quantityClamped(n) | copy |
| Silently dropped | tokens, emblems, sideboard, maybeboard, a commander duplicated into the 99, dedupe, re-import | copy header comment; Canvas:46 |
| New dependencies / tokens / dialogs / focus traps / virtualisation | **none** | README:357; READINESS §Settled |
| Mock data | mono-green Bristly Bill deck; failures are `Lighting Bolt` (typo) and `Beast Whisperer (foil)` (finish annotation) | README:359–361 |

---

## Open questions / gaps in the handoff

Recorded so the build subagents don't invent a value. Each is a **real absence or conflict in the
handoff**, not a preference.

1. **Chip-row type conflict.** README:304 specifies mobile chips at `12px` / padding `7px 13px`;
   the state-1 phone frame draws `12.5px` / `8px 14px` (Canvas:205), while the seven failure
   frames draw `12px` / `7px 13px` (Canvas:372). Two different mobile chip metrics in the same
   canvas.
2. **`--border-dashed` resolves to two hexes.** README:307 and 310 both name `--border-dashed`,
   but the canvas draws the unowned-dot ring at `#8E8269` (Canvas:114) and the hollow radio /
   no-results circle at `#4A4033` (Canvas:466, 922).
3. **Two hexes are used repeatedly but never named as tokens** — `#6A6152` (filter caption,
   keyboard hint, placeholder) and `#6E6353` (group right-note, `line N of the import`). README:300
   says no new token is introduced, so these have no authoring name.
4. **Paste mode and File mode are never drawn as their own frames.** Only the URL mode of state 1
   exists. Everything for those two modes is prose reference to `UploadEntry` (README:306–307). The
   paste-mode submit-count affordance (`Import {n} cards`) is specified only in copy.
5. **`min-height: 44px` on the unresolved row.** README:314 states it unconditionally; the desktop
   frames omit it (Canvas:765, 905, 1004). Unclear whether it is phone-only.
6. **State 17's query field lacks the brass focus glow** the same field carries in state 16
   (Canvas:917 vs 805). Probably a drawing omission, but the glow is a specified property elsewhere.
7. **`Leave it for now` has no desktop home.** It appears on phone in states 16 and 17, and in
   state 17's phone frame; the desktop 220px rail draws only `Delete this line`. copy.resolve.dismiss
   exists with no desktop placement.
8. **Result-row meta differs structurally between widths**, not just in size: mobile is one string
   (`Instant · ×1 owned`), desktop is two fixed cells (`flex:1` type line + `width:80px` ownership).
   README:317 calls the row "verbatim" from `quick-add-bar`, so which is the shipped shape is
   ambiguous.
9. **Owned/to-buy figures disagree across frames** for the same deck: `73 owned · 26 to buy` on
   state 13 desktop (Canvas:635) vs `71 owned · 26 to buy` on state 14 (Canvas:724) and the anatomy
   header (Canvas:142). Only two lines became unresolved, so 73 → 71 does not reconcile.
10. **State 14's role cells disagree between mobile and the anatomy diagram.** Mobile abbreviates
    to `Rem` / `Wipe` (Canvas:686–687); desktop and the §C diagram use `Removal` / `Wipes`. No copy
    key exists for either set.
11. **State 18's live note names two different type groups.** The desktop sentence reads "it's in
    with the instants now" (Canvas:1007) while copy.resolve.resolved says "it's in with the rest
    now"; the desktop sentence is also hard-coded to a `Removal` role clause for a card the frame
    files under Instants.
12. **`copy.resolve.deleted` computes `Number(total) + 1`** on a string parameter documented as
    pre-formatted (thousands-separated). That arithmetic breaks on any separated value.
13. **Undo window unspecified** (README gap 4, READINESS §Still open) — drawn as persisting until
    the next action on the group, but not ruled.
14. **Owned-toggle override scope unspecified** (README gap 10) — drawn per row, resetting on
    collapse, but explicitly flagged as an open eng call.
15. **State 12's reassurance line is desktop-only** in the canvas (Canvas:584) though
    copy.commander.noneReassurance carries no breakpoint variant.
16. **Arrival strip dismissal persistence** is stated ("persists per deck") without a mechanism or
    scope (session, local, server) — README:311.
17. **The `Take a look →` jump target** is named but never defined: no anchor, no scroll behaviour,
    no focus destination is specified.
18. **Consider double-count** (README gap 9) is accepted with **no mitigation** — `Consider` can
    suggest the card an unresolved row was meant to be, giving 100 wanted cards with one duplicate.
    Ratified at the audit; listed here so it isn't "fixed" by mistake.
19. **`Complete` guard may be unreachable** (README gap 2 / READINESS §Still open) — implement it
    anyway and document why both the arithmetic and the guard exist.
