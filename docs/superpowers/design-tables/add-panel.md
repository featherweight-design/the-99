# Design property table — Decks · Add panel overhaul (#158)

Enumerated **from the handoff only** (`design/design_handoff_the99_add_panel/`), R2. No
implementation source was consulted; nothing here is softened for feasibility. A later agent
verifies built code against these rows.

Sources cited as:

- `README §<heading>` / `README:<line>` — `design_handoff_the99_add_panel/README.md`
- `Canvas <section letter> · <state>` — `The 99 - Decks · Add Panel.dc.html` (section markers
  A–H plus the R2 empty-deck block); line numbers given where a value is drawn inline
- `copy.<key>` — `add-panel · copy strings.ts`
- `READINESS §<heading>` — `READINESS.md`
- `brand/README` — locked brand sheet

**Global rule (README:157):** hexes live only in `globals.css`; every value below is authored as
`var(--*)`. **No new token is introduced.** Hexes in the canvas are Palette A values shown for
theme-independent reference.

## 0. Token → hex resolution key

Used throughout the tables below. Names as the handoff writes them; hexes as the canvas draws
them / the brand sheet names them.

| Token | Hex | Where the handoff evidences it | Source |
|---|---|---|---|
| `--bg` | `#14110E` | quick-add bar container fill; Add-button label colour | brand/README:37 ("base"); Canvas E:545 |
| (device/page ground) | `#100D0A` | the phone/desktop frame background in every drawn state | Canvas C:355 — **not named as a token in the handoff** |
| `--surface` | `#1E1A15` | tile fill, result-row fill | README §Component notes (Tile); Canvas B:298 |
| `--surface-sunken` | `#181410` | quick-add field fill; coverage-strip cells | README §Component notes (Quick-add bar); Canvas:95 |
| `--elevated` | `#2A241D` | sort button fill, clear-✕ circle, evidence-bar track | README §Component notes (Consider toolbar); Canvas B:302 |
| `--elevated-hover` | `#211C15` | tile hover fill | README §Component notes (Tile); Canvas B:308 |
| `--border` | `#2A241D` | tile border, result-row border | README §Component notes; Canvas B:298 |
| `--border-strong` | `#3A3229` | field border, hover tile border, empty-state diamonds | README §Component notes; Canvas B:308 |
| `--brass` | `#C9A24B` | active tab underline, Add fill, active row ring, shelf heading | brand/README:64 ("accent"); Canvas throughout |
| `--brass-hover` | `#D8B25E` | Add hover fill | brand/README:65; Canvas B:313 |
| `--brass-shadow` | `#6E5B33` | evidence bar fill on an in-deck tile | README §Component notes (— in deck); Canvas B:322 |
| `--fg` | `#EDE6D8` | tile name, active tab label | brand/README:45 ("primary"); Canvas B:300 |
| `--fg-body` | `#C6B79A` | inclusion figure, empty-state body | brand/README:46 ("secondary"); Canvas B:302 |
| `--fg-muted` | `#A89B84` | in-deck tile name, toggle label | brand/README:47; Canvas B:320 |
| `--fg-faint` | `#8E8269` | type line, meta rows, idle tab label | brand/README:48; Canvas B:301 |
| (dimmest caption) | `#6A6152` | placeholder text, `no art on file` glyph text, hint text | Canvas:95, 434 — **NOT SPECIFIED as a token name** |
| `--success` | `#6FA368` | ownership dot, `✓ In deck` | README §Component notes; brand/README:72 |
| `--warning` | `#E0913C` | degraded banner left border + ⚠; `not owned` meta | README §Component notes (Degraded banner); brand/README:73; Canvas E:557 |
| `--danger` | `#C6533F` | not used in any shipped state (annotation only) | brand/README:74 |

---

## 1. Tab bar (`Your deck · N` / `Consider · N`)

| Property | Specified value | Source |
|---|---|---|
| Placement | Replaces the panel tab bar **in place, in the main column** (not in a rail) | README §Component notes (Tab bar) |
| Container role | `div[role="tablist"]` | README §Component notes; README §Accessibility contract |
| Item role | `button[role="tab"][aria-selected][aria-controls]` | README §Accessibility contract |
| Tab labels | `Your deck`, `Consider` | copy.tabs.deck, copy.tabs.consider |
| Label separator in prose | `Your deck · 47 | Consider · 99` (README prose uses `·`; the drawn tabs use a space before the count, no middot) | README §Decision 2 vs Canvas C:371–372 — **see Open questions** |
| Idle label type | `500` weight, `14px`, `--fg-faint` | README §Component notes (Tab bar) |
| Active label type | `600` weight, `14px`, `--fg` | README §Component notes (Tab bar) |
| Active indicator | `2px --brass` bottom border | README §Component notes; Canvas C:413 |
| Idle indicator | `2px solid transparent` bottom border (reserves the space) | Canvas:79, 371 |
| Count typography | IBM Plex Mono `12px` | README §Component notes (Tab bar) |
| Count colour, active tab | `--brass` | README §Component notes; Canvas C:413 |
| Count colour, idle tab | `--fg-faint` (drawn `#8E8269`; also drawn with no explicit colour on some idle tabs → inherits `--fg-faint` from the label) | Canvas:78 vs Canvas C:371 |
| Count colour when Consider count is `0` | `--fg-faint`, not brass — even though that tab is active | Canvas D:467 |
| Mobile label size | `13.5px` | README §Component notes (Tab bar) |
| Mobile count size | `11px` | README §Component notes (Tab bar) |
| Tab bar padding, desktop | `12px 30px 0` (first-run empty deck draws `16px 30px 0`) | Canvas C:411; Canvas R2:181 |
| Tab bar padding, mobile | `10px 16px 0` (empty-deck states draw `14px 16px 0` / `12px 16px 0`) | Canvas C:370; Canvas R2:77; Canvas D:465 |
| Gap between tabs, desktop | `22px` | Canvas C:411 |
| Gap between tabs, mobile | `16px` | Canvas C:370 |
| Tab label bottom padding | `10px` desktop / `8px` mobile (i.e. the underline sits that far below the text) | Canvas C:412; Canvas C:371 |
| Bottom rule | `1px solid --border` under the whole bar | Canvas C:411 |
| Tap target | `44px` minimum | README §Accessibility contract (Tap targets) |
| Accessible name, deck tab | `Your deck, {n} cards` | copy.tabs.deckAria |
| Accessible name, consider tab | `Cards to consider, {n} suggestions` | copy.tabs.considerAria |
| Toolbar co-location, desktop | Provenance + Sort sit on the **same row** as the tabs, pushed right (`margin-left:auto`), `gap 12px`, `padding-bottom 8px` | Canvas C:414–417 |
| Toolbar co-location, mobile | Toolbar is a **separate row below** the tab bar, inside the panel body | Canvas C:375–378 |
| Count update on add | Tab count updates **immediately and optimistically** | README §Decision 8 |
| Keyboard (arrow-key roving between tabs) | NOT SPECIFIED | — |

---

## 2. Consider panel — container & toolbar

| Property | Specified value | Source |
|---|---|---|
| Panel role | `section[role="tabpanel"][aria-label="Cards to consider"]` | README §Accessibility contract |
| Panel aria-label string | `Cards to consider` | copy.tabs.panelAria |
| Width | Full width of the main column, at both breakpoints; peer tab of the decklist | README §Decision 2 |
| Not | Not an overlay, not appended below the decklist, not a rail, not a sheet | README §Decision 2 |
| Coverage strip position | Stays **above** the tabs at both widths, visible while Consider is open | README §Decision 2; gap report 5 |
| Body padding, desktop | `16px 30px 0` | Canvas C:419 |
| Body padding, mobile | `12px 16px 0` | Canvas C:374 |
| Toolbar alignment | Right-aligned on desktop; split (sort left / provenance right) on mobile | README §Component notes (Consider toolbar); Canvas C:375–378 |
| Provenance string | `{n} cards you already own` | copy.consider.provenance |
| Provenance string, mobile as drawn | `99 cards you own` (drawn shorter than the copy key) | Canvas C:377 — **conflict, see Open questions** |
| Provenance typography | Plex Mono `10.5px`, `--fg-faint` | README §Component notes; Canvas C:415 |
| Provenance typography, mobile | Plex Mono `10px`, `--fg-faint` | Canvas C:377 |
| Sort control geometry | Shipped filter-button geometry: `--elevated` fill, `1px --border-strong`, radius `8px`, padding `7×12` | README §Component notes (Consider toolbar) |
| Sort control label type | Plex Sans `12.5px`, weight `500`, `--fg` (mobile `12px`, padding `7px 11px`) | Canvas C:416; Canvas C:376 |
| Sort control caret | `▾` appended to the label | Canvas C:416 |
| Sort control label, desktop | `Coverage gaps first ▾` | Canvas C:416; copy.consider.sortGaps |
| Sort control label, mobile | `Gaps first ▾` (abbreviated) | Canvas C:376 — **not in the copy file; see Open questions** |
| Sort options | `Coverage gaps first` · `EDHREC first` · `Cheapest first` | copy.consider.sortGaps / sortEdhrec / sortCheapest; Canvas C:449 |
| Sort accessible name | `Sort suggestions` | copy.consider.sortAria |
| Sort label (bare) | `Sort` | copy.consider.sortLabel |
| Sort persistence | Plain component state; **resets on navigation** (like the decklist grouping toggle) | README §Gap report 6; READINESS §Non-blocking |
| Owned/unowned filter in Consider | **None** as drawn. ⚠️ The stated reason is false: `loadDeckSuggestions()` appends up to `SHELF_CAP` (6) unowned EDHREC staples, and has since #25 (5 until #391). The absence of a filter still holds; the premise behind it does not — see #176 | README §Decision 5; Canvas F:613; `src/lib/decks/suggestions-read.ts` (`unownedAppend`) |
| Virtualisation | None — 99 tiles need no windowing | README §Notes for engineering |
| Live region | The builder's **existing** live region; not a new one per surface | README §Accessibility contract |

---

## 3. Shelves (grouping, headers, ordering)

| Property | Specified value | Source |
|---|---|---|
| Shelf element | `section[aria-labelledby="shelf-<role>"]` containing a `ul > li` | README §Accessibility contract |
| Shelf id example | `shelf-removal` (also the anchor target `href="#shelf-removal"`) | README §Accessibility contract; README §Notes for engineering |
| Shelf ordering rule | Shelves sort by **how far under target the deck is** — the first shelf is what the deck most lacks | README §Decision 2/§Decision 7; Canvas C:447 |
| `Threats & synergy` shelf position | **Sorts last** — it has no target to be short of | README §Decision 7; copy comment |
| Header heading text | Role label, uppercase | README §Component notes (Shelf header) |
| Header typography, desktop | Plex Mono `11px`, `letter-spacing .14em`, uppercase, `--brass` | README §Component notes; Canvas C:420 |
| Header typography, mobile | Plex Mono `10.5px`, same tracking/case/colour | README §Component notes; Canvas C:379 |
| Coverage clause | `you have {have} of {target}` | copy.shelf.coverage |
| Count clause | `{n} to consider` | copy.shelf.count |
| Clause join | ` · ` between coverage and count (`you have 4 of 10 · 22 to consider`) | Canvas C:420 |
| Clause typography, desktop | Plex Mono `11px`, `--fg-faint` | README §Component notes; Canvas C:420 |
| Clause typography, mobile | Plex Mono `10px`, `--fg-faint` | README §Component notes; Canvas C:379 |
| No-target shelf clause | `no target — this is the deck's plan` (replaces the n-of-m) | copy.shelf.noTarget; README §Decision 7 |
| Header alignment | `display:flex; align-items:baseline; gap 10px` desktop / `8px` mobile | Canvas C:420; Canvas C:379 |
| Header bottom margin | `11px` desktop / `9px` mobile | Canvas C:420; Canvas C:379 |
| Gap between shelves | `20px` desktop (grid `margin-bottom`); `16px` mobile (`margin-top` on the next header) | Canvas C:421; Canvas C:386 |
| `Show all` link | Right-aligned in the header (`margin-left:auto`), text `Show all {n} →` | README §Component notes; Canvas C:420 |
| `Show all` copy key | `Show all {n}` | copy.consider.showAll |
| `Show all` accessible name | `Show all {n} {role} suggestions` | copy.consider.showAllAria |
| `Show all` typography | Plex Mono `11px`, brass link colour (`a { color:#C9A24B }`, hover `#D8B25E`) | Canvas C:420; Canvas head:19–20 |
| Collapse copy | `Show fewer` | copy.consider.collapse |
| Shelf cap | **12 tiles** before `Show all` — two desktop rows / six phone rows | README §Decision (Reading the shelves); Canvas C:449; Canvas C:435 |
| Shelf cap status | **Explicitly a guess** — not user-tested, "a one-line change" | README §Gap report 4; READINESS §Non-blocking |
| Overflow affordance drawn | Dashed `1px --border-strong` placeholder spanning 2 grid columns, radius `10px`, centred Plex Mono `11px` `#6A6152`: `shelf holds 12 · show all 5 / then the next shelf begins` (annotation, not a shipped element) | Canvas C:435 |
| Tile ordering **within** a shelf | NOT SPECIFIED explicitly. Implied by the sort control (coverage gaps / EDHREC / cheapest) and drawn descending by inclusion % in the populated state (64, 41, 38, 29 …) — but the drawn Wipes shelf is 22, 31, 14, so **not** monotonic. See Open questions | Canvas C:422–427; C:431–434 |
| Role labels | ramp `Ramp` · draw `Draw` · removal `Removal` · wipes `Wipes` · land `Land` · other `Threats & synergy` | copy.shelf.labels |
| EDHREC shelf label | `Top picks for {commanderShortName}` — used when suggestions are not coverage-driven | copy.shelf.labels.edhrec |
| `role` payload value for "other" | **Unchanged — stays `"other"`.** Label change only (`grouping.ts:65` + shelf header) | README §Decision 7 |
| Coverage-strip → shelf link | Each **under-target** coverage cell becomes a link: `href="#shelf-<role>"` + `onClick` switching to the Consider view. Strip layout otherwise untouched | README §Notes for engineering |
| Strip annotation drawn | `A cell under target links its shelf below` (desktop, Plex Mono `10.5px`, `#6A6152`, right-aligned) | Canvas C:402 |
| Under-target coverage cell styling | Fill `#221D16`, border `1px --brass`, label `--brass` | Canvas C:406–407 |
| At/over-target coverage cell styling | Fill `--surface-sunken`, border `1px --border`, label `--fg-faint` | Canvas C:404 |
| Strip heading | Keeps **"Recommended mix"** — not renamed to "Coverage" | README §Decision 7 |
| Strip sub-caption | `a guide, not a gate` (retained) | Canvas C:402 |
| Shelf `you have N of M` on add | Updates **immediately and optimistically** | README §Decision 8 |

---

## 4. Suggestion tile — shared geometry

| Property | Specified value | Source |
|---|---|---|
| Content order (hierarchy) | art → name+cost → type → evidence → Add | README §Decision 3; Canvas B (Anatomy) |
| Role printed on tile | **Never** — role is the shelf heading | README §Decision 3 |
| Fill | `--surface` | README §Component notes (Tile) |
| Border | `1px --border` | README §Component notes (Tile) |
| Radius | `10px` | README §Component notes (Tile) |
| Padding | `9px 9px 10px` | README §Component notes (Tile) |
| Internal gap | `8px` (flex column) | README §Component notes (Tile) |
| Desktop column width | `168px` in a **6-up** grid at `1000px` content width | README §Decision 3, §Component notes |
| Desktop grid | `grid-template-columns: repeat(6, 1fr)`, `gap 14px` | Canvas C:421 |
| Mobile grid | `grid-template-columns: repeat(2, 1fr)`, `gap 12px` — **2-up**, same tile | README §Decision 3; Canvas C:380 |
| Breakpoint | Desktop is `≥768` (canvas frame labelled "Desktop · ≥768"); the 6-up figure is quoted at `1000px` content | Canvas C:395; README §Component notes |
| Tiles per row at intermediate widths (768–1000) | NOT SPECIFIED | — |
| Clickable regions | Exactly three: art, name, Add. **Nothing else on the tile is a target** | README §Decision 4; Canvas B:340 |
| Art + name behaviour | Both are `CardDetailTrigger` | README §Decision 4 |
| Sibling list passed to modal | The **shelf's ordered oracle-ids**, so modal Prev/Next pages the role group | README §Decision 4; Canvas B:281 |
| Tab order | art → name → Add → next tile (DOM order) | README §Accessibility contract |
| Add behaviour | Optimistic-first via `use-deck-mutation.ts` / `useAddOptimisticCard`; flips to `✓ In deck` in the same frame | README §Notes for engineering; Canvas B:341 |
| Server refusal | Tile reverts; existing `MutationError` renders **beneath the tile** | README §Notes for engineering; Canvas B:341 |
| `inDeck` data source | The **server** `deckOracleIds`, not the optimistic list (deliberate keep — see `builder-shell.tsx:70`) | README §Notes for engineering |
| Motion on add | **None.** Tiles do not animate on add, in either motion mode | README §Notes for engineering; Canvas H:671 |

### 4a. Tile — art

| Property | Specified value | Source |
|---|---|---|
| Aspect ratio | `63/88` (lifted from `rec-card.tsx`) | README §Component notes (— art) |
| Radius | `7px` | README §Component notes (— art) |
| Null-`imageUri` fallback | `commanderGradient()` — same pattern as grid-view, card-modal, builder-spine | README §Decision 3, §Component notes |
| Inner shadow | `inset 0 -26px 30px -22px rgba(0,0,0,.65)` **and** `inset 0 0 0 1px rgba(0,0,0,.3)` — verbatim from `rec-card.tsx:222` | README §Component notes (— art) |
| Trigger surface | The **whole rect** is the `CardDetailTrigger` | Canvas B:281 |
| Trigger disabled while fetching | Never `disabled` while fetching, or focus-return has nothing to return to (`card-detail-provider.tsx`) | README §Gap report 8 |

### 4b. Tile — cost pips

| Property | Specified value | Source |
|---|---|---|
| Size | `14px` × `14px` | README §Component notes (— cost pips) |
| Radius | `999px` | README §Component notes |
| Position | Bottom-left of the art, `left:6px; bottom:6px` | README §Component notes; Canvas B:299 |
| Gap between pips | `3px` | README §Component notes; Canvas B:299 |
| Colour source | The WUBRG swatches **already in `browse.ts`** | README §Decision 3, §Component notes |
| Colour values drawn on canvas | W `#F4E9C4`, U `#3A6AA5`, R `#C05A3E`, generic `#8E8269` (B and G not drawn) | Canvas C:381–384, C:422–427 — **differ from brand/README WUBRG; see Open questions** |
| Pip inner ring | `inset 0 0 0 1px rgba(0,0,0,.45)` | README §Component notes; Canvas B:272 |
| Generic pip | Fill `--fg-faint`; numeral in Plex Mono `9px` / weight `600` / `--bg` | README §Component notes |
| Pip order drawn | Generic numeral first (leftmost), then coloured pips | Canvas C:383 |

### 4c. Tile — ownership dot

| Property | Specified value | Source |
|---|---|---|
| Size | `8px` × `8px`, radius `999px` | README §Component notes (— ownership dot) |
| Colour | `--success` | README §Component notes |
| Halo | `box-shadow: 0 0 0 2px rgba(10,8,6,.7)` — so it clears any art | README §Component notes |
| Position | Top-right of the art, `right:6px; top:6px` | README §Component notes; Canvas B:299 |
| Non-owned variant on a tile | ⚠️ **Undrawn, and reachable.** The table called it not-applicable on the owned-only premise, which is false (see line 109). Up to `SHELF_CAP` (6) unowned staples can appear, and today they signal it only by the *absence* of the dot. The focus-visible sample draws a `#8E8269` dot; unexplained | Canvas B:329 — **see Open questions**; #176 |
| Colour-only signal | Prohibited — ownership is a dot **and** a word (in the search row) | README §Accessibility contract |

### 4d. Tile — name and type line

| Property | Specified value | Source |
|---|---|---|
| Name font | IBM Plex Sans | README §Component notes (— name / type) |
| Name size, desktop | `12.5px` | README §Component notes; Canvas B:300 |
| Name size, mobile | `13px` | README §Component notes; Canvas C:381 |
| Name weight | `600` | README §Component notes |
| Name colour | `--fg` | README §Component notes |
| Name line-height | `1.25` | Canvas B:300 |
| Name wrapping | **Two-line clamp** — wraps to two lines then ellipses. Explicitly never truncated to one line (that was finding 3) | README §Decision 3, §Component notes; Canvas B:284 |
| Type line font | IBM Plex Mono | README §Component notes |
| Type line size, desktop | `9.5px` | README §Component notes; Canvas B:301 |
| Type line size, mobile | `10px` | README §Component notes; Canvas C:381 |
| Type line colour | `--fg-faint` | README §Component notes |
| Type line wrapping | **One line, ellipsed** | README §Component notes; Canvas B:285 |
| Name contrast | `--fg` on `--surface` ≈ **12.4:1** | README §Accessibility contract |
| Type line contrast | `--fg-faint` ≈ **4.6:1** (AA, supplementary to the name) | README §Accessibility contract |

### 4e. Tile — evidence row

| Property | Specified value | Source |
|---|---|---|
| Layout | `display:flex; align-items:center; gap 6px` — bar then figure | Canvas B:302 |
| Bar track | `height 4px`, radius `999px`, fill `--border`, `overflow:hidden`, `flex:1` | README §Component notes (— evidence); Canvas B:302 |
| Bar fill | `--brass`, width = the inclusion percentage | README §Component notes; Canvas B:302 |
| Figure typography | Plex Mono `10px`, `--fg-body`, **tabular** numerals | README §Component notes |
| Figure copy | `{pct}%` | copy.tile.inclusion |
| Figure accessible name | `in {pct}% of {commanderShortName} decks on EDHREC` | copy.tile.inclusionAria |
| Figure contrast | `--fg-body` ≈ **8.1:1**; the bar is decoration for a figure always present as text | README §Accessibility contract |
| Role-sourced pick (no EDHREC %) | The **whole row is replaced** by mono `10px --fg-faint` text: `fills a {role} slot` | README §Component notes, §Decision 6; copy.tile.fillsRole; Canvas D:494 |
| Degraded picks | Same replacement (whole row → mono `10px --fg-faint`) | README §Component notes (— evidence) |
| No EDHREC figure at all | Mono `10px --fg-faint` text `no EDHREC figure` — **never a 0% bar** (would read as a verdict) | copy.tile.noInclusion; README §Decision 6; Canvas C:434 |
| Lift / synergy second line | **Requested, not designed against.** Wanted: `inclusion in this commander's decks − the card's overall inclusion rate`, `+31 pts` style, **shown only where positive**. **No tile in this handoff depends on it.** Falls back to `no EDHREC figure` when absent | README §Decision 6, §Gap report 2; READINESS §Blocker 2 (closed) |
| Lift line geometry | NOT SPECIFIED (size, colour, position beyond "a second evidence line") | — |

### 4f. Tile — Add button

| Property | Specified value | Source |
|---|---|---|
| Visibility | **Always visible, never hover-revealed** (deliberate divergence from EDHREC) | README §Decision 10; Canvas B:287 |
| Width | Full width of the tile | README §Component notes (— Add) |
| Fill | `--brass` | README §Component notes |
| Label colour | `--bg` | README §Component notes |
| Label type, desktop | `12px` / weight `600`, Plex Sans | README §Component notes |
| Label type, mobile | `14px` / weight `600` | README §Component notes; Canvas C:381 |
| Radius, desktop | `7px` | README §Component notes |
| Radius, mobile | `8px` | Canvas C:381 |
| Padding, desktop | `7px 0` | README §Component notes |
| Height, mobile | `44px` fixed, `padding:0` | README §Component notes; §Accessibility contract |
| Hover fill | `--brass-hover` | README §Component notes |
| Border | `none` | Canvas B:303 |
| Copy | `+ Add` | copy.tile.add; Canvas B:303 |
| Accessible name | `Add {name} to deck` | copy.tile.addAria |

### 4g. Tile states (four, per the tile-anatomy panel)

| State | Property | Specified value | Source |
|---|---|---|---|
| **Rest** | Fill / border | `--surface` / `1px --border` | Canvas B:298 |
| Rest | Art shadow | `inset 0 -26px 30px -22px rgba(0,0,0,.65)`, `inset 0 0 0 1px rgba(0,0,0,.3)` | Canvas B:299 |
| Rest | Add | `--brass` fill | Canvas B:303 |
| **Hover** | Fill | `--elevated-hover` (`#211C15`) | README §Component notes; Canvas B:308 |
| Hover | Border | `1px --border-strong` | README §Component notes; Canvas B:308 |
| Hover | Art shadow | Softens + brass inner ring: `inset 0 -26px 30px -22px rgba(0,0,0,.5)`, `inset 0 0 0 1px rgba(201,162,75,.35)` | Canvas B:309 |
| Hover | Detail affordance | `details ↗` over a bottom scrim: `linear-gradient(180deg, transparent, rgba(10,8,6,.85))`, padding `14px 6px 5px`, Plex Mono `9px`, `--brass`, **right-aligned**, pinned to art bottom | copy.tile.detailHint; Canvas B:309 |
| Hover | Add | `--brass-hover` fill | Canvas B:313 |
| Hover | Ownership dot / pips | Unchanged | Canvas B:309 |
| **In deck** | Persistence | Tile **holds its slot for the session** — never removed (removing it reflows the grid under the pointer) | README §Decision 8; Canvas B:339 |
| In deck | Art | `filter: grayscale(.6)` + `opacity .5`; the `-26px` bottom shadow is dropped, keeping only `inset 0 0 0 1px rgba(0,0,0,.3)` | README §Decision 8, §Component notes; Canvas B:319 |
| In deck | Ownership dot | **Removed** | Canvas B:319 |
| In deck | Cost pips | Retained (inherit the art's greyscale/opacity) | Canvas B:319 |
| In deck | Name colour | `--fg-muted` (`#A89B84`) — **lifted, not dimmed**, so the row stays readable | README §Decision 8, §Component notes; Canvas H:669 |
| In deck | Type line colour | `#6A6152` (dimmest caption) | Canvas B:321 |
| In deck | Evidence bar fill | `--brass-shadow` (`#6E5B33`); track unchanged | README §Component notes; Canvas B:322 |
| In deck | Figure colour | `--fg-faint` | Canvas B:322 |
| In deck | Button replacement | Non-interactive `✓ In deck` — `--success`, weight `600`, `12px`, centred, `padding 7px 0`, inside a `1px --border` box, radius `7px`, `aria-disabled` | README §Component notes (— in deck); Canvas B:323 |
| In deck | Copy | `✓ In deck` | copy.tile.inDeck |
| In deck | Accessible name | `{name} is already in this deck` | copy.tile.inDeckAria |
| In deck | Non-colour signals | Greyscale **and** a `✓ In deck` label **and** `aria-disabled` | README §Accessibility contract |
| **Focus-visible** | Ring | Global `:focus-visible`: `outline: 2px solid var(--brass)`, `outline-offset: 2px` — **not overridden anywhere in this flow** | README §Accessibility contract; Canvas B:329 |
| Focus-visible | Art shadow | Bottom scrim dropped; keeps `inset 0 0 0 1px rgba(0,0,0,.3)` | Canvas B:329 |
| Focus-visible | Tile fill/border | Unchanged from Rest | Canvas B:328 |

### 4h. Tile — art-missing (no `imageUri`) variant

| Property | Specified value | Source |
|---|---|---|
| Whole-tile opacity | `.55` | Canvas C:434 |
| Art plate | **Flat plate**, no gradient art: `linear-gradient(158deg, #3A3229 0%, #241F19 62%, #161311 100%)`, `inset 0 0 0 1px rgba(0,0,0,.3)` only, centred content | Canvas C:434 |
| Plate label | `no art on file`, Plex Mono `9px`, `#6A6152`, centred, `line-height 1.4`, broken over two lines (`no art` / `on file`) | copy.tile.noArt; Canvas C:434 |
| Cost pips / ownership dot | **Absent** on the drawn art-missing tile | Canvas C:434 |
| Name / type | Unchanged (`--fg` 12.5/600; mono 9.5 `--fg-faint`) | Canvas C:434 |
| Evidence | `no EDHREC figure` in the drawn instance (the two omissions co-occur but are independent) | Canvas C:434 |
| Add | Unchanged `--brass` `+ Add` | Canvas C:434 |
| Interaction with `commanderGradient()` | README says `commanderGradient()` is the null-`imageUri` fallback; the canvas draws a **flat grey plate + label** for the same case | README §Component notes (— art) vs Canvas C:434 — **see Open questions** |

---

## 5. Consider — empty state (state 2)

| Property | Specified value | Source |
|---|---|---|
| Layout | Centred column, `align-items:center; justify-content:center; text-align:center` filling the panel | Canvas D:469 |
| Padding | `28px 30px` (phone as drawn) | Canvas D:469 |
| Background wash | `radial-gradient(320px 180px at 50% 70%, rgba(201,162,75,0.06), transparent 70%)` | Canvas D:469 |
| Graphic | **Three `--border-strong` diamonds** — a card-fan stand-in; **rebuild as `CardFan`** | README §Component notes (Consider empty) |
| Diamond geometry as drawn | `11px × 11px`, `background #3A3229`, `transform: rotate(45deg)`, `gap 8px`, `margin-bottom 20px` | Canvas D:470 |
| Heading font/size | Cinzel `600` / `18px` / `--fg` | README §Component notes; Canvas D:471 |
| Heading margin-bottom | `10px` | Canvas D:471 |
| Heading copy | `We're out of ideas, and that's a compliment` | copy.considerEmpty.heading |
| Body typography | `13.5px`, `--fg-body`, `line-height 1.6` | README §Component notes; Canvas D:472 |
| Body copy | `Every card in your collection that fits {commanderShortName} is already in this deck. Add more to the pile and we'll have more to say.` | copy.considerEmpty.body |
| CTA style | **Secondary** CTA per the §404 secondary-CTA contract: `1px --border-strong`, transparent fill | README §Component notes (Consider empty) |
| CTA geometry as drawn | `font-size 14px`, weight `600`, `--fg`, radius `8px`, `padding 11px 20px`, `margin-top 22px` | Canvas D:473 |
| CTA copy | `Add to your collection` | copy.considerEmpty.cta |
| CTA destination | The collection — "the only thing that changes the answer" | Canvas D:508 |
| Tab count in this state | `Consider 0`, count rendered `--fg-faint` (not brass) | Canvas D:467 |
| Quick-add bar | Still present and mounted below the empty state | Canvas D:475 |
| Voice | Expressive moment — zero suggestions on a 99-card deck is a win | Canvas D:508; READINESS §What R2 is confident about |
| Desktop delta | Drawn once at phone; layout stated **identical** at desktop | README §States delivered (row 2) |

---

## 6. Degraded / EDHREC-offline state (state 3)

| Property | Specified value | Source |
|---|---|---|
| Banner shape | Reuses the shipped `DegradedBanner` shape at **both** widths | README §States delivered; §Component notes |
| Banner fill | `--surface-sunken` | README §Component notes (Degraded banner) |
| Banner border | `1px --border` | README §Component notes |
| Banner left border | `3px --warning` | README §Component notes; Canvas D:487 |
| Banner radius | `9px` | README §Component notes |
| Banner padding | `11px 15px` | README §Component notes |
| Banner icon | `⚠` in `--warning`, `13px`, `line-height 1.3` | README §Component notes; Canvas D:488 |
| Banner icon/text gap | `11px`, `align-items:flex-start` | Canvas D:487 |
| Banner text | `12.5px` `--fg-body`, `line-height 1.55`; heading clause bolded `600` in `--fg` inline | README §Component notes; Canvas D:489 |
| Banner margin | `14px 30px 0` (desktop as drawn) | Canvas D:487 |
| Heading copy | `EDHREC isn't answering right now.` | copy.degraded.heading |
| Body copy | `These are ranked by what your deck is short of, not by what other {commanderShortName} decks run — so the shelves are honest and the percentages are missing.` | copy.degraded.body |
| Retry copy | `Try again` | copy.degraded.retry |
| Retry style | Underlined brass text button — `--brass`, `12.5px`, no border, `padding 0`, `text-decoration: underline`, **inline at the end of the body** | README §Component notes; Canvas D:489 |
| Voice | **Straight** — a service outage is not a place to be charming | copy comment; Canvas D:509 |
| Tile evidence in degraded | Bar + figure replaced by the coverage reason line (`fills a {role} slot`), mono `10px --fg-faint`. "Degraded tiles drop the bar, not the row" — an empty track would read as 0% | Canvas D:510, D:494; README §Component notes |
| Shelf headers in degraded | Unchanged (`Removal` + `you have 4 of 10 · 22 to consider`) | Canvas D:492 |
| Provenance line in degraded | **Absent** from the toolbar in the drawn state; only Sort remains | Canvas D:485 |
| Consider tab count in degraded | Still shown and brass (`Consider 64`) | Canvas D:484 |
| Quick add in degraded | **Unaffected — it never touched EDHREC.** Annotation drawn: `search is unaffected — it never touched EDHREC` | Canvas D:502 |
| Phone rendering | Not drawn separately; banner shape is stated identical at both widths | README §States delivered (row 3) |

---

## 7. Quick add bar — container and field

| Property | Specified value | Source |
|---|---|---|
| Nature | **Chrome, not a mode.** Pinned to the bottom of the deck column at both widths; always mounted; live in both views | README §Decision 1; §one-line summary |
| Slot on mobile | Replaces the sticky `+ Add cards` footer — same slot, same sticky | README §Notes for engineering |
| Container fill | `--bg` | README §Component notes (Quick-add bar) |
| Container top border | `1px --border` | README §Component notes |
| Container padding, desktop | `11px 30px`, `display:flex; align-items:center; gap 14px` | Canvas C:438 |
| Container padding, mobile | `10px 16px 12px` | Canvas C:388 |
| Field fill | `--surface-sunken` | README §Component notes |
| Field border, idle | `1px --border-strong` | README §Component notes |
| Field border, focus | `1px --brass` | README §Component notes; Canvas E:559 |
| Field radius | `8px` | README §Component notes |
| Field height, desktop | `38px` | README §Component notes |
| Field height, mobile | `44px` | README §Component notes |
| Field text size, desktop | `14px` | README §Component notes |
| Field text size, mobile | **`16px`** — the iOS Safari zoom floor, closed here rather than deferred | README §Component notes; §Accessibility contract; READINESS §Non-blocking |
| Field max width, desktop | `520px`, `flex:1` | Canvas C:439 |
| Field width, mobile | Full width (`flex:1`) | Canvas C:389 |
| Field inner gap / padding | `gap 9px`, `padding 0 12px` | Canvas C:439 |
| Leading icon | `⌕` in `--fg-faint`; `13px` desktop / `14px` mobile. Turns `--brass` on focus | README §Component notes; Canvas C:439, E:537 |
| Placeholder colour | `#6A6152` (dimmest caption) | Canvas C:439 |
| Placeholder copy | `Add a card by name · {identity} only` — **amended**, see §Amendments | copy.quickAdd.placeholder |
| Typed value colour | `--fg` | Canvas E:537 |
| Caret drawn | `1px` wide, `--brass`; `18px` tall mobile / `16px` desktop | Canvas E:537, E:559 |
| Trailing clear control | `✕` in an `--elevated` circle, **only once a query exists** | README §Component notes |
| Clear circle size | `20px` desktop / `22px` mobile, radius `999px`, glyph `10px` / `11px` in `--fg-faint`, `margin-left:auto` | Canvas E:559, E:537 |
| Clear accessible name | `Clear search` | copy.quickAdd.clear |
| Field accessible name | `Add a card to this deck by name, {identity} only` — **amended**, see §Amendments | copy.quickAdd.fieldAria |
| Component reuse | Reuses `SearchField` from `text-field.tsx` | README §Component notes |
| Idle hint | **Not drawn, at either width** — **amended**, see §Amendments. The slot stays in the DOM and empty, because it is the results count's live region | Canvas C:389, R2:95 |
| Owned toggle on mobile idle bar | **Not drawn** on the mobile idle bar; appears in the mobile **results header** when typing | Canvas C:389 vs Canvas E:530 — **see Open questions** |
| Focus ring | Global `:focus-visible`, `2px var(--brass)` at `+2px` | README §Accessibility contract |

---

## 8. Quick add — results panel

| Property | Specified value | Source |
|---|---|---|
| Position | **Rises off the bar** (upward), anchored to it | README §Component notes; Canvas E:548 |
| Backdrop | **None.** No overlay, no dim — the deck stays lit behind it | README §Decision 9; §Component notes; Canvas E:526 |
| Modality | **Not a dialog.** No focus trap, no `aria-modal`, no body-scroll lock, no focus-return | README §Accessibility contract; §Notes for engineering |
| Fill | `--bg` | README §Component notes (Results panel) |
| Top border | `1px --border-strong` | README §Component notes; Canvas E:527 |
| Shadow | `0 -16px 40px rgba(0,0,0,.5)` | README §Component notes |
| Max height, desktop | `400px`, scrolls | README §Component notes; Canvas E:550 |
| Max height, mobile | `290px`, scrolls | README §Component notes; Canvas E:532 |
| List role | `ul#qa-results[role="listbox"]` | README §Accessibility contract |
| List accessible name | `Card search results` | copy.quickAdd.resultsAria |
| Row role | `li[role="option"][aria-selected]` | README §Accessibility contract |
| Row list padding, desktop | `10px 30px 0`, column gap `6px` | Canvas E:553 |
| Row list padding, mobile | `10px 16px 0`, column gap `6px` | Canvas E:532 |
| Results header, desktop | Count + keyboard hint on one row: `padding 11px 30px 0`, `gap 14px` | Canvas E:552 |
| Results header count | Plex Mono `10.5px`, `--fg-faint` — `4 matches` | Canvas E:552 |
| Count copy | `1 match` / `{n} matches` | copy.quickAdd.resultCount |
| Count copy with identity | `{n} matches · {identity} only` | copy.quickAdd.resultCountWithIdentity |
| Keyboard hint copy | `↑↓ to move · ↵ to add · Esc to dismiss` — Plex Mono `10.5px`, `#6A6152` | copy.quickAdd.keyboardHint; Canvas E:552 |
| Results header, mobile | Count (Plex Mono `10px --fg-faint`) left, **owned toggle** right, `padding 10px 16px 0`, `justify-content: space-between`. Keyboard hint **not drawn** on mobile | Canvas E:528–531 |
| Owned-filter-off note | `filter off — {n} results you don't own` (singular: `filter off — 1 result you don't own`) — Plex Mono `10.5px`, `#6A6152`, `margin-left:auto`, in the bar row | copy.quickAdd.ownedFilterOffNote; Canvas E:559 |
| Entrance animation | `.anim-quickadd-in` — **140ms, ease-out, opacity + 6px rise** | README §Notes for engineering; Canvas H:670 |
| Reduced motion | Appears **in place, opaque**; joins the explicit list in the `prefers-reduced-motion` block at `globals.css:237-243`, per that block's explicit-fallback pattern | README §Notes for engineering |
| Dismissal animation | **Instant in both modes** | README §Notes for engineering |
| Motion ledger | Net change: `.anim-quickadd-in` in; `.anim-sheet-in` out (keyframes, class, and its reduced-motion entry removed with `variant="sheet"`) | README §Notes for engineering |
| Live-region announcement for results | `No matches for {query}` / `{n} matches for {query}` | copy.announce.results |

---

## 9. Quick add — result row

| Property | Specified value | Source |
|---|---|---|
| Fill | `--surface` | README §Component notes (Result row) |
| Border, resting | `1px --border` | README §Component notes |
| Border, active row | `1px --brass` (the "brass ring") | README §Component notes; §Decision 9 |
| Radius | `9px` | README §Component notes |
| Min height, desktop | `52px` | README §Component notes |
| Min height, mobile | `56px` (also the stated mobile tap target) | README §Component notes; §Accessibility contract |
| Row padding, desktop | `8px 12px`, `gap 12px` | Canvas E:554 |
| Row padding, mobile | `8px 10px`, `gap 10px` | Canvas E:533 |
| Thumbnail, desktop | `30 × 42`, radius `5px` | README §Component notes; §Decision 9 |
| Thumbnail, mobile | `32 × 45`, radius `5px` | README §Component notes; Canvas E:533 |
| Thumbnail shadow | `inset 0 0 0 1px rgba(0,0,0,.35)` | Canvas E:554 |
| Thumbnail source | One added column on `searchCards`'s select; a deliberate divergence from Archidekt (which loads no images on purpose) | README §Decision 9 |
| Name typography | `14px` / `600` / `--fg` | README §Component notes; Canvas E:554 |
| Matched substring | Rendered in `--brass` inside the name | README §Component notes; Canvas E:554 |
| Name column width, desktop | `210px` fixed (`flex:none`) | Canvas E:554 |
| Name column, mobile | `flex:1; min-width:0`, name over meta in a stacked block | Canvas E:533 |
| Meta typography | Plex Mono `11px` `--fg-faint` (mobile `10px`) | README §Component notes; Canvas E:554, E:533 |
| Meta content, desktop | Type line (`flex:1`), then cost pips (`gap 3px`, `34px` reserved slot when absent), then ownership column | Canvas E:554–555 |
| Meta content, mobile | Single line `{typeLine} · {ownership}` | Canvas E:533 |
| Cost pips in row | `14px`, radius `999px`, same WUBRG swatches; generic pip carries the numeral in Plex Mono `9px/600` `--bg`. **Drawn only on the active row**; other rows reserve a `34px` blank | Canvas E:554–557 — **see Open questions** |
| Ownership column, desktop | `80px` wide, right-aligned, Plex Mono `11px` | Canvas E:554 |
| Owned copy | `×{qty} owned` | copy.quickAdd.rowOwned |
| Not-owned copy | `not owned` — drawn in `--warning` (`#E0913C`) | copy.quickAdd.rowNotOwned; Canvas E:557 |
| Right slot width, desktop | `56px`, right-aligned | Canvas E:554 |
| Right slot — active row | `↵ add`, Plex Mono `11px`, `--brass` (mobile draws bare `↵`, Plex Mono `10px`, `--brass`) | README §Component notes; copy.quickAdd.rowAddActive; Canvas E:554, E:533 |
| Right slot — resting row | `Add` **ghost button**: transparent fill, `1px --border-strong`, radius `7px`, `--brass` label, `12.5px/600`, `padding 6px 0` (mobile: `13px`, `height 36px`, `padding 0 12px`) | README §Component notes; copy.quickAdd.rowAdd; Canvas E:555, E:534 |
| Right slot — in-deck row | `✓ In deck`, Plex Sans `12.5px/600`, `--success`, non-interactive | README §Component notes; copy.quickAdd.rowInDeck; Canvas E:556 |
| In-deck row — thumbnail | `opacity .5` + `filter: grayscale(.6)` | Canvas E:556 |
| In-deck row — name colour | `--fg-muted` | Canvas E:556 |
| In-deck row — type/ownership colour | `#6A6152` (dimmest caption) | Canvas E:556 |
| Row accessible name | `{name}, {typeLine}, {owned ? 'owned' : 'not owned'}` | copy.quickAdd.rowAria |
| Non-colour signal | Ownership is a dot **and** a word in the row | README §Accessibility contract |
| Rows drawn in state 5 | 4 — active, resting owned, in-deck, unowned | README §States delivered (row 5) |
| Row hover state | NOT SPECIFIED | — |

---

## 10. Quick add — no-results state (state 6)

| Property | Specified value | Source |
|---|---|---|
| Container | Same results block (no separate panel); `padding 26px 30px`, `text-align:center` | README §States delivered (row 6); Canvas E:566 |
| Heading font | Cinzel `600` / `17px` / `--fg`, `margin-bottom 8px` | Canvas E:567 |
| Heading copy | `Nothing in the pile by that name` | copy.quickAddEmpty.heading |
| Body typography | `13.5px`, `--fg-muted` (`#A89B84`), `line-height 1.6` | Canvas E:568 |
| Body copy (owned filter **on**) | `No card you own matches “{query}” in {commanderShortName}’s colors.` — the query echo drawn in `--fg-body` | copy.quickAddEmpty.body; Canvas E:568 |
| Body copy (owned filter **off**) | `No {identity} card matches "{query}".` — "then it really is a miss" | copy.quickAddEmpty.bodyAllCards |
| Escape action copy | `Search all cards instead` | copy.quickAddEmpty.dropFilter |
| Escape action style | Inline underlined brass text button — `--brass`, `13.5px`, no border, `padding 0`, `text-decoration: underline` | Canvas E:568 |
| Escape action rationale | Drop the owned filter — **not** "check your spelling" | Canvas E:581 |
| Type size note | Same block at mobile, **16px type** | README §States delivered (row 6) |
| Divider above the bar | `1px solid --border` top border on the bar row in this state | Canvas E:570 |
| Owned toggle | Still visible in the bar (position A) — this is the whole argument for position A | Canvas E:570; Canvas F:596 |

---

## 11. Owned-only toggle

| Property | Specified value | Source |
|---|---|---|
| Scope | **Search only.** Consider is drawn with no owned/unowned axis, though it can contain unowned cards — see line 109 and #176 | README §Decision 5; Canvas F:613 |
| Position (the call) | **Position A** — inline in the quick-add bar, always visible | README §Decision 5; Canvas F:593 |
| Position B (drawn, rejected) | In the results header beside the count — buys tighter resting chrome, loses the control exactly when it is needed | README §Decision 5; Canvas F:600–606 |
| Default | **On** (`true`) — flips the shipped `useState(false)` | README §Decision 5; Canvas F:610 |
| Default status | **The only shipped default this handoff changes**; a Product ruling, still open. If it stays `false`, **nothing else moves** | README §Gap report 1; READINESS §Blocking 1 |
| Track | `30 × 17`, radius `999px` | README §Component notes (Owned toggle) |
| Knob | `13px`, radius `999px` | README §Component notes |
| Track fill, on | `--brass` | README §Component notes; Canvas E:530 |
| Track fill, off | `--elevated` | README §Component notes; Canvas E:559 |
| Knob fill, on | `--bg` (`#14110E`), `top:2px; left:15px` | Canvas E:530 |
| Knob fill, off | `--fg-faint` (`#8E8269`), `top:2px; left:2px` | Canvas E:559 |
| Label | `Owned only` | copy.quickAdd.ownedToggle |
| Label typography | `12px`, `--fg-muted`, `gap 7px` from the track (mobile results header: `11.5px`) | Canvas E:545; Canvas E:530 |
| Accessible name | `Show only cards you own` | copy.quickAdd.ownedToggleAria |
| Component reuse | The shipped `search-pane.tsx` toggle **unchanged**; only relocated | README §Component notes |
| Off-state consequence copy | `filter off — {n} results you don't own` | copy.quickAdd.ownedFilterOffNote |

---

## 12. Empty-deck state (state 9, R2) — first run and returning

| Property | Specified value | Source |
|---|---|---|
| Primary CTA | **Deleted.** `cta: "Open suggestions"` is removed, not repointed — its only job was opening the retired sheet | copy comment; READINESS §R2 delta; Canvas R2:143 |
| Rationale | Two live entrances already: the Consider tab (`40px` above the mark, count on it) and the focusable quick-add bar | Canvas R2:144–145 |
| Layout | Centred column filling the panel: `align-items:center; justify-content:center; text-align:center` | Canvas R2:81 |
| Padding | `34px 16px` phone / `40px 16px` desktop | Canvas R2:81, R2:185 |
| Background wash | `radial-gradient(400px 220px at 50% 80%, rgba(201,162,75,0.07), transparent 70%)` | Canvas R2:81 |
| Graphic pairing | A Crab mark **and** a card-fan mark, `align-items:flex-end`, `gap 16px`, `margin-bottom 20px` phone / `22px` desktop | Canvas R2:82, R2:186 |
| Crab size | `72px` phone / `88px` desktop | Canvas R2:83, R2:187 |
| Card-fan size | `96 × 104` phone / `104 × 112` desktop | Canvas R2:84, R2:188 |
| Card-fan construction (phone, drawn literally) | Three `48 × 68` cards, radius `8px`, `1.5px` borders — back `#221D16`/`#3A3229` at `rotate(-15deg) translateX(-18px)`; middle `#2A241D`/`#4A4033` unrotated; front `#3E3020`/`--brass` at `rotate(15deg) translateX(18px)` carrying `99` in Cinzel `800/18px --brass` | Canvas R2:85–88 |
| Card-fan on desktop | Drawn as a dashed placeholder box (`CardFan 104×112`) — same component, not redrawn | Canvas R2:188 |
| Heading font | Cinzel `700` — `21px` phone / `24px` desktop, `--fg` | Canvas R2:90, R2:190 |
| Heading copy | `A king with no army.` — **locked and verbatim** | copy.builderEmpty.heading; READINESS |
| Caption typography | `13.5px` / `line-height 1.6` / `--fg-body` / `max-width 320px` phone; `14px` / `1.65` / `max-width 440px` desktop; `margin-top 10px` / `12px` | Canvas R2:91, R2:191 |
| Caption copy | `Ninety-nine slots, zero filled. Type a name below, or take the ninety-nine we've already picked out — {commander} eats everything anyway.` | copy.builderEmpty.caption |
| Caption structure change | `captionFor` and `captionForMobile` **collapse into one `caption`**; the breakpoint split is deleted, closing the "flagged for Design ratification" note on `captionForMobile` | copy comment; READINESS §R2 delta; Canvas R2:205 |
| Locked clauses | "A king with no army." and "eats everything anyway" verbatim; only the middle clause changed | copy comment; Canvas R2:207 |
| Role hint typography | Plex Mono `11px`, `--fg-faint`, `margin-top 20px` | Canvas R2:92, R2:192 |
| Role hint copy | `Try filling your ramp, draw, removal, and wipe slots first.` | copy.builderEmpty.roleHint |
| Role hint breakpoints | **Promoted to both widths** (was desktop-only; mobile spent that budget on the CTA) | copy comment; READINESS §R2 delta |
| Tab counts in this state | `Your deck 0` (active, `--fg-faint` count) / `Consider 99` (idle, `--brass` count) | Canvas R2:78–79 |
| Coverage strip in this state | All cells `0/target`, all values in `--fg-faint` (not `--fg`), all cells in the neutral style | Canvas R2:64–68 |
| Quick-add bar in this state | Present, idle, focusable, at the bottom of the same screen | Canvas R2:95; READINESS §R2 delta |
| First-run guided banner — mobile | `--surface`-ish `#1E1A15` fill, `1px --border`, `border-left 3px --brass`, radius `10px`, `padding 12px 14px`, `margin 20px 16px 0` | Canvas R2:71 |
| Guided banner eyebrow | `Step 3 of 3` — Plex Mono `10px`, `letter-spacing .14em`, uppercase, `--brass` | Canvas R2:72 |
| Guided banner progress marks | Three rotated squares (`rotate(45deg)`): two `6px --success`, one `8px --brass` (desktop: `7px` / `9px`) | Canvas R2:73, R2:171 |
| Guided banner heading | Cinzel `600/15px --fg` phone; Cinzel `700/23px` desktop | Canvas R2:74, R2:172 |
| Guided banner heading copy | `Build your first deck` | Canvas R2:74 |
| Guided banner body copy | `Search cards or pick from your suggestions below — every card you add is counted toward your 99.` — **needs no edit**; already names both doors and already says "below" | Canvas R2:75, R2:208 |
| Guided banner, desktop | `linear-gradient(120deg,#221D14,#1A160F 60%)`, `1px --border-strong`, radius `14px`, `padding 22px 26px`, `margin 26px 32px 0`, with a right-hand mark block (`CardFan 52px` placeholder, `0/99` in Plex Mono `600/30px --fg`, `+ {commander}` in Plex Mono `10px --fg-faint`) | Canvas R2:168–179 |
| Returning-user variant | **Identical composition, banner absent.** The mark centres in the taller space; **nothing else moves** | Canvas R2:139 |
| Quick-add bar in the desktop empty state | Field + owned toggle (on). The idle hint that sat to their right is **amended away**; the identity is in the placeholder | Canvas R2:194–198 |

---

## 13. Interaction & keyboard contract

| Property | Specified value | Source |
|---|---|---|
| Quick add — focus | **DOM focus never leaves the input** | README §Accessibility contract |
| Quick add — `↑` / `↓` | Move `aria-activedescendant` between options (focus does not move) | README §Accessibility contract |
| Quick add — `↵` | Adds the **active row**; with no navigation, that is the top match | README §Accessibility contract; §Decision 9 |
| Quick add — `Esc` | **Clears the query and closes the results in one press** (superseded the two-press shape: DECK INPUT UX, Hugh 2026-10-12, "clears on Escape"; `useSearchDismiss`) | priorities.md DECK INPUT UX; was README §Accessibility contract, Canvas E:580 |
| Quick add — press outside | **Clears the query and closes the results** | DECK INPUT UX; `useSearchDismiss` |
| Quick add — after an add | **Clears the query once the add lands** (not on a refusal, nor after the reader has edited the field); focus stays in the field | DECK INPUT UX |
| Quick add — modality | No focus trap, no `aria-modal`, no scroll lock, no focus-return | README §Accessibility contract; §Notes for engineering |
| Quick add — combobox attrs | `input[role="combobox"][aria-expanded][aria-controls="qa-results"][aria-activedescendant]` | README §Accessibility contract |
| Quick add — implementation | `useState` plus key handling; **no new dependency** | README §Notes for engineering |
| Consider — `Tab` order | art → name → Add → next tile (DOM order) | README §Accessibility contract |
| Consider — screen-reader skip | Shelves are labelled sections/landmarks, so a whole shelf can be skipped | README §Accessibility contract; Canvas H:658 |
| Add announcement | `{name} added · {built} of 99 · {role} {have} of {target}` on the builder's **existing** live region — one region, so five fast adds read in order | copy.announce.added; README §Accessibility contract |
| Add announcement, no role | `{name} added · {built} of 99` | copy.announce.addedNoRole |
| Search results announcement | `No matches for {query}` / `{n} matches for {query}` | copy.announce.results |
| Colour-alone prohibition | Ownership = dot **and** word; in-deck = greyscale **and** `✓ In deck` label **and** `aria-disabled` | README §Accessibility contract |
| Tap targets | Mobile Add `44px`; result rows `56px`; tab targets `44px` | README §Accessibility contract |
| iOS zoom | Quick-add field text `16px` on mobile so Safari does not zoom on focus | README §Accessibility contract |
| Focus style | Global `:focus-visible` — `2px var(--brass)` at `+2px`, not overridden anywhere in this flow | README §Accessibility contract |
| Coverage-cell link | Under-target cell: anchor to `#shelf-<role>` **plus** `onClick` switching the view to Consider | README §Notes for engineering |
| Combobox `aria-expanded` on empty query | NOT SPECIFIED | — |
| Behaviour of `↵` when the results list is empty | NOT SPECIFIED | — |
| Debounce / minimum query length | NOT SPECIFIED | — |

---

## 14. Deletions and structural changes (contract for the build)

| Property | Specified value | Source |
|---|---|---|
| `add-panel.tsx` | **Retired**, with its `variant` discriminated union, `SheetWrapper`, and the `useDialogA11y` mount | README §Notes for engineering |
| `builder-shell.tsx` | `<aside width:340>` removed; `sheetOpen` state removed; mobile sticky `+ Add cards` footer becomes the quick-add bar (same slot, same sticky); new `view: "deck" | "consider"` state beside `filter` / `grouping` | README §Notes for engineering |
| New components | `consider-panel.tsx` (shelves + grid), `suggestion-tile.tsx` (replaces `suggestion-card.tsx`), `quick-add-bar.tsx` (replaces `search-pane.tsx` + `search-result-row.tsx`) | README §Notes for engineering |
| Payload change 1 | `suggest.ts` must stop dropping `imageUri` when building `DeckSuggestion` — one field | README §Notes for engineering |
| Payload change 2 | `search-action.ts` needs `imageUri` on the select and on `SearchResult` — one column, one field | README §Notes for engineering |
| `role-counter-strip.tsx` | Gains a link per under-target cell; its own layout untouched | README §Notes for engineering |
| `grouping.ts:65` | One label string (`Other` → `Threats & synergy`) | README §Notes for engineering; §Decision 7 |
| Card-type group "Other" | **Untouched** | README §Decision 7 |
| Motion ledger | `.anim-quickadd-in` in; `.anim-sheet-in` out (keyframes + class + reduced-motion entry) | README §Notes for engineering |
| Copy location | `src/lib/copy/decks-builder.ts`, following `shell.ts`'s shape | README §Notes for engineering |
| Two shipped comments to preserve | `builder-shell.tsx:70` (server list, not optimistic, feeds `inDeck`) and `card-detail-provider.tsx` (trigger never `disabled` while fetching) | README §Gap report 8 |
| Superseded | `add-panel.tsx`, `suggestion-card.tsx`, `search-pane.tsx`, `builder-shell.tsx aside :340`; design-table sections `§Panel`, `§Suggestion Card`, `§Search (within Add Panel)`, `§Bottom sheet`, `§"+ Add cards" sticky footer`, `§2182` | Canvas footer:680; READINESS §Blocker 3 |
| Mock data caveat | Card names, types and colour identities are real (Jeskai / Kykar, Wind's Fury at 47/99). **Inclusion percentages are fabricated** — not EDHREC figures | README §Notes for engineering |

---

## 15. Design-flagged guesses, open questions, and deliberate divergences

Recorded as Design states them — not as engineering judgements.

| Item | What Design says | Source |
|---|---|---|
| Owned-filter default flips `false → true` | **Blocking, with Product.** The only shipped default this handoff changes. Every state is drawn with both switch positions; if it stays `false`, nothing else moves | README §Gap report 1; READINESS §Blocking 1 |
| Synergy / lift figure | **Requested, not designed against.** Wanted as `this commander's inclusion − overall inclusion rate`, `+31 pts` style, positive-only. No state depends on it. R2 closed it eng-side: cached raw payload, one parse line, defensive read falling back to `no EDHREC figure` | README §Decision 6, §Gap report 2; READINESS §Blocker 2 |
| "Suggest cards you don't own" | A **different feature**, out of scope — `suggestDeck()` cannot produce unowned cards | README §Gap report 3 |
| Shelf cap of 12 | **Explicitly a guess.** Fills two desktop rows / six phone rows. Not user-tested; a one-line change | README §Gap report 4; READINESS §Non-blocking |
| Strip → shelf linking | Assumes the coverage strip stays above the tabs at both widths (it does today). If the mobile spine ever collapses the strip, the link needs a new home | README §Gap report 5 |
| Sort persistence | Plain component state; resets on navigation. "Consistent with the surface; not obviously right" | README §Gap report 6; READINESS §Non-blocking |
| iOS zoom floor | Closed here by paying `16px` of vertical budget rather than deferring again. **If Product prefers a global `maximum-scale=1`, the field drops to `14px` and regains 4px of sheet height** | READINESS §Non-blocking |
| Divergence — thumbnails in quick add | Deliberate divergence from Archidekt, which loads no images in quick-add on purpose | README §Decision 9; Canvas E:577 |
| Divergence — Add always visible | Deliberate divergence from EDHREC, which hover-reveals its add affordance | README §Decision 10 |
| Divergence — Consider is a tab, not append-below | Deliberate divergence from Spotify's append-below pattern (works at 30 rows, not 99) | README §Decision 2; Canvas A:255 |
| Precedent followed | Archidekt's pinned quick-add bar + separate visual search; Moxfield's inline autocomplete vs advanced page | README §Decision 1; Canvas A:253 |
| Windowing precedent | 99 tiles need no virtualisation — `commanders-windowing` set the precedent at 214 | README §Notes for engineering |

---

## 16. Open questions / gaps (properties an implementer needs that the handoff does not settle)

1. **Tile ordering within a shelf.** Never stated. The desktop Removal shelf is drawn descending
   by inclusion (64, 41, 38, 29, 47?, 18 — already non-monotonic at position 5) and the Wipes
   shelf is 22, 31, 14. Under `Coverage gaps first`, what orders tiles *inside* a shelf is
   undefined. **NOT SPECIFIED.**
2. **Tab separator.** README §Decision 2 writes `Your deck · 47 | Consider · 99` with a middot;
   every drawn tab renders `Your deck 47` with a plain space. Copy strings supply only the bare
   label. **Conflict — pick one and ratify.**
3. **Mobile provenance string.** Copy key is `{n} cards you already own`; the phone toolbar draws
   `99 cards you own`. **Conflict.**
4. **Mobile sort label.** Desktop draws `Coverage gaps first ▾`, mobile draws `Gaps first ▾`.
   There is no abbreviated key in the copy file. **Missing copy key.**
5. **Art-missing fallback contradiction.** README §Component notes says the null-`imageUri`
   fallback is `commanderGradient()`; the canvas draws a **flat grey plate + `no art on file`**
   for that same case. These are different visuals. Which applies when `imageUri` is null, and
   is `commanderGradient()` reserved for a different absence? **Conflict.**
6. **WUBRG pip hexes.** README sources them from `browse.ts`; the canvas draws W `#F4E9C4`,
   U `#3A6AA5`, R `#C05A3E`; the brand sheet lists W `#E8E4D6`, U `#4A7FB5`, R `#C05A48`,
   B `#5B5566`, G `#6B9E63`. Three sets. B and G are never drawn. **Resolve against `browse.ts`.**
7. **The `#6A6152` value has no token name** anywhere in the handoff, yet it carries placeholder
   text, hint text, the `no art on file` label, and in-deck row meta. Either it is an existing
   token the handoff didn't name, or it is an undeclared value in a "no new token" handoff.
8. **Cost pips in the result row** are drawn only on the *active* row; other rows reserve a `34px`
   blank. Is that a state distinction or a drawing shortcut? **Ambiguous.**
9. **Owned toggle on the mobile idle bar.** Drawn in the mobile *results header* when typing, but
   absent from the mobile idle bar — which contradicts Position A's whole argument ("legible
   *before* you type"). Desktop keeps it in the bar at idle. **Mobile placement unresolved.**
10. **Focus-visible tile sample draws a `#8E8269` ownership dot** rather than `--success`, on a
    surface where every suggestion is owned. Unexplained. **Ambiguous.**
11. **Tiles-per-row between 768px and 1000px.** 6-up is quoted at 1000px content, 2-up at phone.
    The intermediate range is **NOT SPECIFIED.**
12. **Lift line geometry** (size, weight, colour, placement relative to the inclusion row) is
    **NOT SPECIFIED**, only its content and conditionality.
13. **Result-row hover state** is **NOT SPECIFIED** (only active-row and in-deck are drawn).
14. **Search behaviour details** — debounce, minimum query length, `aria-expanded` on an empty
    query, and what `↵` does with zero results — are all **NOT SPECIFIED.**
15. **Tab-bar keyboard pattern.** `role="tablist"` is specified but arrow-key roving / `tabindex`
    management between tabs is **NOT SPECIFIED.**
16. **Degraded state at phone width** is not drawn; only "the banner is the shipped
    `DegradedBanner` shape at both widths" is asserted. Shelf/tile deltas at phone are inferred.
17. **`Show all` expanded behaviour** — whether it expands in place, and whether `Show fewer`
    then appears in the same slot — is implied by `copy.consider.collapse` but never drawn.
18. **The device frame ground `#100D0A`** (distinct from `--bg` `#14110E`) is used for every
    drawn panel body but never named as a token.

---

## 17. Amendments after the handoff

Changes made against a shipped surface, recorded here because the tables above are
the contract and an unrecorded departure is a table that lies.

### A1 · The idle hint is gone; the identity is in the field (2026-09-12)

**Was:** a standing line under the quick-add bar reading `{identity} only` —
`Jeskai only · ↵ adds the top match` on desktop, not drawn on mobile (§7).

**Is:** nothing under the bar until a search lands. The constraint moved into the
field itself, as `Add a card by name · Gruul only`, and into the field's
accessible name.

**Why:** the line said the same thing on every visit whether or not anyone was
searching, in a slot the eye learns to ignore. The constraint belongs where the
player is about to type. Requested by the product owner; not a Design ruling, and
open to reversal.

**What did not change:** the results count still carries `· {identity} only`
(§8). That is the one moment the filter is actually acting on something, and the
placeholder that stated it is gone by then because the player has typed.

**The slot itself stays in the DOM,** empty. It is the results count's
`role="status"`, and a live region that mounts already holding its first value
never announces it.

**Never built:** `copy.quickAdd.enterHint` (`↵ adds the top match`). §7 specified
it as the second half of the idle hint, but no build ever rendered it, so it went
with the half that shipped.
