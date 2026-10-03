# Design Property Table — Deck Versioning, Surfaces 4 and 5 (version history, and the game log's version stamp)

Source: `design/design_handoff_the99_deck_versioning/` — `README.md` (§Decisions 7 and 8,
§Decisions 9's versionless sub-states, the Component notes rows `Type group heading`,
`Version rail row`, `Opened version diff`, `v1 opened` and `Game version slot`, §Notes for
engineering, and §Errata), `STATES-pending.md` (table E rows 36–45, §The rules the matrix is
generated from rules 1 / 8b / 8c, §Copy per state, §Announcements), `READINESS.md` (items 8,
9, 10, 11, 12, 19, 20, 21, and the Not-blocking targets bullet), `OVERLAPS.md` (check 1),
`COST-TRACK.md` (§What versioning must change — "Nothing"), and
`deck-versioning · copy strings.ts` (`history`, `stamp`, and `review.recounted`). Canvas:
`The 99 - Deck Versioning.dc.html` — §Surfaces 4 (desktop frame lines 503–593, phone frame
lines 595–619, annotation card lines 621–632), §Surfaces 5 (the 760px card lines 640–653,
annotation card lines 654–662), the Contract frame (lines 795–826) and the global `<style>`
link rule (lines 19–20).

## Ruling of 2026-09-13 — the rail is a tab panel, not a route

Hugh: *"Deck details > Versions: This is the only tab in the Deck details view that routes to a
new page and removes the commander details. We need to fix this."* The rail now draws inside the
deck page's own `Versions` tab panel, so the deck's head — art, commander line, progress, the
pending banner — stays on screen while history is read.

**Superseded 2026-09-13.** This ruling left `/decks/[id]/versions` alive as a redirect to
`/decks/[id]?tab=versions`, because links to it shipped. Hugh retired the route later the same
day, accepting that those links now reach the not-found page. The route does not exist, and
nothing in the app produces a `?tab=` URL: the tab row is a row of buttons and the parameter
answers a URL written by hand. The handoff README records the redirect as of its own date and is
left as that record.

This supersedes every row below that specifies a route, a link or a heading level for the tab and
the rail, namely:

- **The Versions tab** is a `role="tab"` button in the deck's tablist, selected by
  `aria-selected`, controlling `#panel-versions`. It is **not** a link and carries no `href` or
  `aria-current`. Its count comes from the deck page's own `listVersions` read.
- **The rail owns no tab row.** §Surfaces 4 drew the deck's four-cell row at the head of the
  route; the builder owns that row now, and a second one would draw twice.
- **`history.heading(n)` names the panel as an `sr-only` `h2`**, not an `h1`: the deck's name is
  the page's `h1`. Still never drawn — the resolution under Discrepancy 28 otherwise holds.
- **State 37b** (no versions) is unchanged in effect: the tab is absent entirely, so a URL naming
  `?tab=versions` on a deck with none lands on `Your deck`.

Everything about the rail's rows, the opened diff, the v1 panel and the game stamp is untouched
by that ruling. A second ruling of the same date follows.

## Ruling of 2026-09-13 — the copy pass

Hugh, of the v1 panel: *"There's a lot of superfluous content."* Four strings were cut or
shortened under `/copy-review`, and one link retired outright. Each is recorded at its own row
below; collected here so a verify agent reads them before the canvas values:

- **`history.initialBody`** now reads `the first list, with nothing before it to compare
  against.` It named the feature being built ("when versioning arrived") and then restated its
  own point ("so there is no diff to show").
- **`history.initialBrowse`** is **retired**. Its only target was the deck page, which the rail
  now draws on.
- **`history.diffNote`** is **retired** (H31, 2026-10-03). It read `this is what the deck was, not
  what it needs`; the rows now draw today's ownership and price, and `history.todayNote` says so
  instead. See `design/design_handoff_the99_version_rows/`.
- **`review.outNote`** drops its second sentence, which explained a per-row toggle that does not
  exist. That sentence was also long enough to crush the `GOING OUT · n` heading beside it into
  three stacked lines, so the heading now carries `flex-none`.
- **`review.lede`** drops `this page exists to show you what it costs`, which restated the
  sentence before it.

Scope: exactly five components, across the two surfaces.

1. **The Versions tab** — the fourth tab in the deck page's own tab row, with its count.
2. **The version rail** — the list of committed versions, newest first: current row, ordinary
   row, and the `initial` (v1) row.
3. **The opened version diff** — the panel for a version that has a predecessor: header, the
   two comparison stat blocks, two equal columns of type-grouped name-and-cost-track rows,
   and the closing note. Phone substitutes a segmented In/Out pair for the two columns.
4. **The v1 opened panel** — no columns at all: the shipped provenance shape carrying
   `Initial` and one sentence. The canvas also drew `Browse the {n} cards →`, retired
   2026-09-13 once the rail moved onto the deck page.
5. **The game log version stamp** — one fixed 44px slot in the existing log row, between the
   meta line and the marks, plus its `—` variant.

Governing-value rule from the handoff: **§Errata at the foot of `README.md` wins over every
other sentence in the bundle, and where the canvas and R1-era prose disagree the canvas wins
on chrome.** Two §Errata rows bear directly on these surfaces: the cost track on versioning's
rows is **`COST_TRACK = 72` / `PIP_CAP = 5` as shipped** (so the canvas's 90px/76px track — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1**
governs nothing — Discrepancy 39), and the version history table has **no `ver` header row**
(Discrepancy 45). Every row below records the canvas value and names the contradiction where
one exists.

**Breakpoint:** two fixed frames — desktop at **1180px** content width, phone at **390px**
(drawn in a 392px device shell). **No Tailwind breakpoint token is named anywhere in the
bundle**; the 768px / `md:` boundary these surfaces are built against is an engineering
choice, not a handoff value. `Mobile` = the 390px frame, `Desktop` = the 1180px frame. Where
the phone frame draws no counterpart the cell reads `— (not drawn)`. Note that §Surfaces 5 is
drawn **only** inside a 760px annotation card — there is no page frame and no phone frame for
it at all (Discrepancy 46) — and that the annotation cards themselves (`#181410` on
`1px #3A3229` with a `3px #C9A24B` left rule, radius 14px, padding 20px, a mono 10px `0.16em`
uppercase brass caption) are canvas presentation chrome and are **not** product.

## Token ↔ hex correspondence used below

| Token | Hex on canvas | Asserted by |
|---|---|---|
| `--base` | `#14110E` | the browser-chrome frame's page fill; the phone screen fill |
| `--surface` | `#1A1713` | ordinary rail row; diff card row; stat block; log row |
| `--surface-rail` | `#1A160F` | current rail row; both opened-version panels |
| `--elevated` | `#2A241D` | panel border; direction-header rule; cost disc fill; phone active segment |
| `--border` | `#26211B` | tab-row rule; ordinary rail row and card row borders |
| `--border-strong` | `#3A3229` | current rail row border; cost-disc border; the `/` in the delta |
| `--fg` | `#EDE6D8` | rail note; card name; type-group heading; panel title |
| `--fg-body` | `#C6B79A` | non-current version number; the after-figure; `Held`'s value |
| `--fg-muted` | `#A89B84` | the log row's date · pod meta line |
| `--fg-faint` | `#8E8269` | rail meta line; `no note`; `initial`; the stamp; group count |
| `--fg-locked` | `#6A6152` | the before-figure and arrow; the `—` stamp; elision lines |
| `--accent` | `#C9A24B` | `v3`; the current row's left rule; `current`; the `i` disc; links |
| `--accent-hover` | `#D8B25E` | global `a:hover` only |
| `--accent-shadow` | `#4A3A1C` | the `current` marker's border |
| `--success` | `#6FA368` | `+19`; `In · 8`; the log's `W` mark |
| `--warning` | `#E0913C` | `−17`; `Out · 8` |
| (unnamed) | `#1E1A15` | the browser-chrome title bar — canvas presentation, not product |
| (unnamed) | `#181410` | the provenance box's fill (`--surface-sunken` per Component notes) |
| (unnamed) | `#574463` | the type-group heading's rule — flagged on the canvas itself as a traced value in no brand ramp, "the shipped page's to settle" |
| (unnamed) | `#5B5566` | the black cost pip — flagged on the canvas as reading pinker than this value |
| (unnamed) | `#6B9E63` | the green cost pip |
| (unnamed) | `#0A0806` | the phone device shell — canvas presentation, not product |

Fonts: `var(--font-cinzel)` (Cinzel, the panel title and every type-group heading) ·
`var(--font-sans)` (IBM Plex Sans, the default — anything below with no family named inherits
it) · `var(--font-mono)` (IBM Plex Mono, every number, label, meta line and the stamp).

---

## Component: Versions tab

The fourth tab in the deck page's shipped tab row, routing to `/decks/[id]/versions`
(§Decisions 7). The row itself is shipped chrome — "text tabs and their brass underline"
(Contract) — so only the fourth cell and the row's own measurements are enumerated. Count
rules as shipped: **the count is absent at zero, the tab never is**, except that at zero
versions **the tab does not render at all** (state 37b, §Decisions 7).

### Tab row container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| gap | `18px` | `26px` |
| align-items | `center` | `center` |
| border-bottom | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| margin-bottom | `14px` | `20px` |
| overflow | `hidden` | — (not set) |
| flex-wrap | — (not set; `overflow: hidden` clips instead) | — (not set) |
| tab count drawn | 4 (`Your deck`, `Consider`, `Games`, `Versions`) | 4 (same) |

### Versions tab — active cell

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| align-items | `baseline` | `baseline` |
| gap | `6px` | `7px` |
| padding-bottom | `11px` | `13px` |
| border-bottom | `2px solid #C9A24B` (`--accent`) | `2px solid #C9A24B` (`--accent`) |
| margin-bottom | `-1px` (to sit over the row's 1px rule) | `-1px` |
| element | `span` (drawn); must be a link to `/decks/[id]/versions` | `span` (drawn); must be a link |
| transition | — (not specified) | — (not specified) |

### Versions tab — label (`history.tab` — `Versions`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `'IBM Plex Sans'` (`var(--font-sans)`) | `'IBM Plex Sans'` (`var(--font-sans)`) |
| font-size | `14px` | `16px` |
| font-weight | `600` | `600` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| letter-spacing | — | — |
| text-transform | — | — |

### Versions tab — count

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `11px` | `12px` |
| color | `#C9A24B` (`--accent`) | `#C9A24B` (`--accent`) |
| value drawn | `3` | `3` |
| rendered at 0 versions | **—** (absent; and the whole tab is absent — state 37b) | **—** (same) |
| copy key | none — the bare number. `history.heading(n)` (`{n} versions`) is not drawn **on the tab**; it names the route's document as an `sr-only` `h1`, per the resolution recorded under Discrepancy 28 | same |

**Reachability (corrected 2026-09-12).** This cell is not decoration borrowed from the deck page:
§Surfaces 4 draws the deck's four-cell tab row at the head of `/decks/[id]/versions` at both
widths, with `Versions` active. `BuilderRouteTabs` in `builder-tabs.tsx` renders it there, so the
active treatment above is reachable on the shipped route. The earlier reading — that the route
draws its own `← deck name` header instead, recorded as Gap 4 — was wrong against the canvas and
has been corrected in the gap report.

### Versions tab — inactive siblings (for contrast; shipped chrome)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `14px` | `16px` |
| font-weight | `500` | `500` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| padding-bottom | `11px` | `13px` |
| border-bottom | — | — |
| own count chip | **— (not drawn on phone)** (Discrepancy 30) | mono `12px` `#6A6152` (`--fg-locked`), gap `7px` |
| hover / focus | — (not specified anywhere in the bundle) | — (not specified anywhere in the bundle) |

### Versions tab — conditional rendering

| Condition | Tab | Count | Source |
|---|---|---|---|
| 0 versions (a draft) | **absent entirely** — not empty, not disabled | n/a | state 37b, §Decisions 7, annotation card |
| 1 version | rendered | `1` | state 36 |
| many versions | rendered | `{n}` | state 37 |
| pending changes exist | unchanged — they are **not** a version and gets no row and no count (state, READINESS 11) | unchanged | §Decisions 7 |

---

## Component: Version rail

The list of committed versions, **newest first**, no filter and no search (state 37). Three row
variants are drawn: the current version, an ordinary earlier version, and v1 (which reads
`initial` in place of a delta). Component notes: "48px desktop / 64px phone (three lines),
`--surface` on `1px --border`, radius 9px, `12px 14px`." The pending changes have no row here
(READINESS 11) and there is **no restore, revert or rollback control** anywhere in the rail
(§Decisions 7).

### Rail container

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` | `flex` |
| flex-direction | `column` | `column` |
| gap | `6px` | `6px` |
| margin-bottom | `18px` | `26px` |
| element | `div` (drawn); no list semantics drawn | `div` (drawn); no list semantics drawn |

### Row — current version (v3)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A160F` (`--surface-rail`) | `#1A160F` (`--surface-rail`) |
| border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| border-left | `3px solid #C9A24B` (`--accent`) | `3px solid #C9A24B` (`--accent`) |
| border-radius | `9px` | `9px` |
| padding | `11px 12px` (Component notes say `12px 14px` — Discrepancy 32) | `12px 14px` |
| min-height | `64px` | — (not set; the 12px padding plus two lines computes to ≈48px, the Component notes' figure) |
| display | block — the row is two stacked blocks, not a flex row (Discrepancy 33) | `flex` |
| align-items | n/a | `center` |
| gap | n/a (the inner top line uses `9px`) | `14px` |
| element / interactivity | `div` — no `a`, no `button`, no `role`, no `tabindex` (Discrepancy 34) | `div` — same |
| hover / focus | — (not specified for a rail row anywhere in the bundle) | — (not specified) |
| transition | — (no motion; READINESS 19 allows the commit sheet's open/close and nothing else) | — |

### Row — ordinary earlier version (v2)

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| border-left | — (no accent rule; that is the current row's only marker besides `current`) | — |
| border-radius | `9px` | `9px` |
| padding | `11px 12px` | `12px 14px` |
| min-height | `64px` | — (not set) |
| everything else | as the current row | as the current row |

### Row — v1 (the `initial` row)

| Property | Mobile | Desktop |
|----------|--------|---------|
| container | identical to the ordinary row | identical to the ordinary row |
| note slot | renders `no note` instead of a note (see below) | same |
| delta slot | renders `initial`, never `+99` (state 39, READINESS 8) | same |
| `current` marker | **—** | **—** (the 62px spacer stands in its place) |

### Version number

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `13px` | `13px` |
| color, current | `#C9A24B` (`--accent`) | `#C9A24B` (`--accent`) |
| color, not current | `#C6B79A` (`--fg-body`) | `#C6B79A` (`--fg-body`) |
| width | — (no fixed slot; it sits in the top line beside the marker — Discrepancy 33) | `34px`, `flex: none` |
| value drawn | `v3` / `v2` / `v1` | `v3` / `v2` / `v1` |
| copy key | none — `v{n}` is composed. `history.committed(date, cards)` covers only the meta line | same |

### Note (`{version.note}`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` (inherited) | `var(--font-sans)` (inherited) |
| font-size | `13px` | `13.5px` |
| line-height | `1.45` | — (not set) |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| max-width / truncation | — (wraps; the row grows) | — (`flex: 1; min-width: 0` on the wrapper, no `text-overflow` — it wraps rather than ellipsing) |
| text drawn | `Cut the self-mill package for real interaction.` / `Leaned harder on reanimation after three losses.` | same |

### Note — missing (`history.noNote` — `no note`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-size | `13px` | `13.5px` |
| font-style | `italic` | `italic` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| rendered | always, when the note is null — never an empty line and never a prompt (state 38) | same |

### Meta line (`history.committed(date, cards)` + `history.manaValue(mv)` + `history.gamesHeld(n)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `10px` | `10px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| margin-top | `4px` | `2px` |
| separator | ` · ` | ` · ` |
| text drawn, current | `10 Sep 2026 · 101 cards · mv 2.92` — **no `committed` prefix** (Discrepancy 35) | `committed 10 Sep 2026 · 101 cards · mv 2.92` |
| text drawn, v2 | `14 Mar 2026 · 99 cards · mv 3.10` — **`held 3 games` dropped** (Discrepancy 36) | `committed 14 Mar 2026 · 99 cards · mv 3.10 · held 3 games` |
| text drawn, v1 | `2 Nov 2024 · 99 cards · mv 3.34` | `committed 2 Nov 2024 · 99 cards · mv 3.34 · held 2 games` |
| `held {n} games` on the current version | **—** (not drawn) | **—** (not drawn on v3 either; the current version has held no completed game in the mock) |
| commander, when it changed | — (not drawn in the rail; state 41 puts it in the opened panel's right block, which is not drawn either — Discrepancy 42) | — |

### Delta group (`history.delta(adds, removes)` — `+{adds} / −{removes}`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | inline in the row's top line, after a `flex: 1` spacer | `flex`, `flex: none` |
| align-items | `center` | `center` |
| gap | `9px` (the top line's gap) | `7px` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `11.5px` | `12px` |
| adds colour | `#6FA368` (`--success`) | `#6FA368` (`--success`) |
| removes colour | `#E0913C` (`--warning`) | `#E0913C` (`--warning`) |
| `/` separator | **—** (not drawn — the two figures sit side by side; Discrepancy 37) | drawn, `#3A3229` (`--border-strong`) |
| minus sign | `−` U+2212 (`&minus;`), not a hyphen | `−` U+2212 |
| values drawn | `+19` `−17` / `+8` `−8` | `+19` / `−17` · `+8` / `−8` |
| a zero-sided delta | — (rule 1: a count of nought is never drawn, so `−0` never renders) | — (same) |

### `initial` (`history.initial`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `11.5px` | `12px` |
| color | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| flex | — (sits where the delta sits) | `none` |
| replaces | the whole delta group, including the `/` | the whole delta group |

### `current` marker (`history.current` — `current`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | `9.5px` | `10px` |
| letter-spacing | `0.12em` | `0.12em` |
| text-transform | `uppercase` | `uppercase` |
| color | `#C9A24B` (`--accent`) | `#C9A24B` (`--accent`) |
| border | `1px solid #4A3A1C` (`--accent-shadow`) | `1px solid #4A3A1C` (`--accent-shadow`) |
| border-radius | `4px` | `4px` |
| padding | `1px 6px` | `2px 7px` |
| background | — (none) | — (none) |
| position in the row | **top line, immediately right of the version number** | **row's right end, after the delta** (Discrepancy 38) |
| flex | — | `none` |

### Delta-column spacer (non-current desktop rows only)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn)** | drawn |
| width | — | `62px`, `flex: none` |
| content | — | empty — it reserves the `current` marker's width so every row's delta lands on one vertical |

---

## Component: Opened version diff (a version with a predecessor)

State 40: two equal columns, **grouped by type with the cost track**, like every other card
list in the app — **no ownership dot, no price, no marker, no action**. §Errata and the
Contract's card-row ledger both make the version-diff row the lightest of the three row types:
name plus cost track, nothing to displace. The mono caption above the panel on the canvas
(`v2 opened — against v1`, mono 10px `0.16em` uppercase `#8E8269`, `margin-bottom: 11px`
desktop / 9.5px `0.14em` `margin-bottom: 9px` phone) matches **no copy key and no state** and
reads as a canvas state label rather than product chrome (Discrepancy 40).

### Panel container

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — (the phone frame draws no panel; the diff sits directly on the `#14110E` screen — Discrepancy 41) | `#1A160F` (`--surface-rail`) |
| border | — | `1px solid #2A241D` (`--elevated`) |
| border-radius | — | `12px` |
| padding | — (the screen's own `0 14px`) | `18px` |
| margin-bottom | — | `22px` |
| transition | — (no motion; READINESS 19) | — (no motion) |

### Panel header row

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on phone)** — the phone goes straight from the caption to the segmented pair | drawn |
| display | — | `flex` |
| align-items | — | `baseline` |
| justify-content | — | `space-between` |
| gap | — | `12px` |
| flex-wrap | — | `wrap` |
| margin-bottom | — | `16px` |

### Panel title (`v2 · 14 Mar 2026`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | — (not drawn) | drawn |
| font-family | — | `var(--font-cinzel)` |
| font-size | — | `18px` |
| font-weight | — | `700` |
| color | — | `#EDE6D8` (`--fg`) |
| copy key | — | §Copy per state's `Version line` is `v{n} · committed {date}`; the canvas draws `v2 · 14 Mar 2026` **without `committed`** (Discrepancy 35) |

### Panel title — note beneath

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | — (not drawn) | drawn |
| font-size | — | `13px` |
| color | — | `#C6B79A` (`--fg-body`) |
| margin-top | — | `5px` |
| missing-note variant | — | `no note`, `13px`, `italic`, `#8E8269` (`--fg-faint`) — as drawn on the v1 panel |

### Stat block container (the header's right side)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on phone; the phone diff shows neither mana value nor games held — Discrepancy 41)** | drawn |
| display | — | `flex` |
| gap | — | `10px` |
| blocks drawn | — | 2 (`Mana value`, `Held`) |

### Stat block — box

| Property | Mobile | Desktop |
|----------|--------|---------|
| background | — | `#1A1713` (`--surface`) |
| border | — | `1px solid #26211B` (`--border`) |
| border-radius | — | `8px` |
| padding | — | `9px 13px` |

### Stat block — label (`Mana value` / `Held`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `var(--font-mono)` |
| font-size | — | `9.5px` |
| letter-spacing | — | `0.12em` |
| text-transform | — | `uppercase` |
| color | — | `#8E8269` (`--fg-faint`) |
| margin-bottom | — | `4px` |
| copy key | — | `Mana value` is `changed.manaValue` (a §Surfaces 2 string reused); `Held` matches **no** key — `history.gamesHeld(n)` returns the whole phrase `held {n} games` (Discrepancy 43) |

### Stat block — Mana value figures (`3.34 → 3.10`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex`, `align-items: baseline`, `gap: 5px` |
| before font-size | — | `12px` |
| before colour | — | `#6A6152` (`--fg-locked`) |
| arrow | — | `→` (`&rarr;`), mono `10px`, `#6A6152` (`--fg-locked`) |
| after font-size | — | `15px` |
| after colour | — | `#C6B79A` (`--fg-body`) — **neutral, not `--success`, though 3.34 → 3.10 is the improvement `changed.manaValueDown` names** (Discrepancy 44) |
| font-family (all three) | — | `var(--font-mono)` |
| count-up / animation | — | **—** (READINESS 19: no count-up on any figure) |

### Stat block — Held figure (`3 games`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `var(--font-mono)` |
| font-size | — | `15px` |
| color | — | `#C6B79A` (`--fg-body`) |
| value drawn | — | `3 games` — a count, never a rate (§Decisions 5, READINESS 10) |
| win rate, per-version bucket | — | **—** (explicitly refused) |

### Columns row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex` on the **segmented pair only** (see below) — one column of rows at a time | `flex` |
| gap | n/a | `22px` |
| align-items | n/a | `flex-start` |
| each column | n/a — one at a time | `flex: 1; min-width: 0` (two equal columns) |

### Direction header (`history.diffIn(n)` / `history.diffOut(n)`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered as | a segmented pill pair (see below) | a text header per column |
| font-family | `'IBM Plex Sans'` | `var(--font-mono)` |
| font-size | `12.5px` | `10px` |
| font-weight | `600` active / `500` inactive | — (not set) |
| letter-spacing | — | `0.14em` |
| text-transform | — | `uppercase` |
| colour, In | `#EDE6D8` (`--fg`) when active | `#6FA368` (`--success`) |
| colour, Out | `#8E8269` (`--fg-faint`) when inactive | `#E0913C` (`--warning`) |
| border-bottom | — | `1px solid #2A241D` (`--elevated`) |
| padding-bottom | — | `8px` |
| margin-bottom | — | `11px` |
| values drawn | `In · 8` / `Out · 8` | `In · 8` / `Out · 8` |
| a zero-sided column | **—** (rule 1: an empty column is never drawn) | **—** (same) |

### Phone segmented In/Out pair

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | drawn | **— (not drawn; both columns are visible at once)** |
| container display | `flex`, `gap: 6px`, `margin-bottom: 12px` | — |
| each pill | `flex: 1`, `min-height: 38px`, `border-radius: 999px`, centred both axes | — |
| active fill | `#2A241D` (`--elevated`) | — |
| active border | — (none) | — |
| inactive fill | — (none) | — |
| inactive border | `1px solid #3A3229` (`--border-strong`) | — |
| element | `span` — no `button`, no `role="tab"`, no `aria-selected` (Discrepancy 34) | — |
| target height | `38px` — **below the 44px phone floor the targets bullet sets for interactive controls** (Discrepancy 47) | — |
| hover / focus | — (not specified) | — |
| transition | — (no motion) | — |

### Type group heading (`Creatures` / `Sorceries` + count)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex`, `align-items: baseline`, `gap: 9px` | `flex`, `align-items: baseline`, `gap: 9px` |
| label font-family | `var(--font-cinzel)` | `var(--font-cinzel)` |
| label font-size | `14px` — Component notes say **13px in a version diff** (Discrepancy 48) | `13px` |
| label font-weight | `700` | `700` |
| label letter-spacing | `0.04em` | `0.04em` |
| label text-transform | `uppercase` | `uppercase` |
| label colour | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| count font-family | `var(--font-mono)` | `var(--font-mono)` |
| count font-size | `11px` | `10.5px` — Component notes say `11px` (Discrepancy 48) |
| count colour | `#8E8269` (`--fg-faint`) | `#8E8269` (`--fg-faint`) |
| border-bottom | `1px solid #574463` (unnamed; flagged on the canvas as a traced value) | `1px solid #574463` (same) |
| padding-bottom | `7px` | `6px` |
| margin-bottom | `9px` | `8px` |
| `{n} added, not yet committed` note | **—** (that note belongs to the pending decklist, not a version diff) | **—** |
| bucket / availability heading | **—** (§Errata withdraws the five availability buckets; grouping is card type, rule 8b) | **—** |

### Group body (the rows under one heading)

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | `flex`, `flex-direction: column` | `flex`, `flex-direction: column` |
| gap | `4px` | `4px` |
| padding-bottom | `16px` (last group in the phone frame) | — |
| margin-bottom | — | `13px` (between groups); the last group carries none |
| sort within a group | alphabetical (rule 8b, §Engineering notes) — the canvas draws the mock's order, which is not alphabetical (Discrepancy 49) | same |

### Card row (the version-diff row)

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | `44px` | `38px` |
| background | `#1A1713` (`--surface`) | `#1A1713` (`--surface`) |
| border | `1px solid #26211B` (`--border`) | `1px solid #26211B` (`--border`) |
| border-radius | `7px` | `7px` |
| padding | `0 8px` | `0 9px` |
| display | `flex` | `flex` |
| align-items | `center` | `center` |
| gap | `9px` | `9px` |
| ownership dot | **—** (state 40, §Decisions 7, Contract ledger) | **—** |
| price / buy tag | **—** | **—** |
| availability marker | **—** | **—** |
| action control | **—** | **—** |
| pending-add rule | **—** (a version is committed; nothing in it is pending) | **—** |
| type label | **—** (the 120px type column is the canvas's one deletion; type is read from the group heading) | **—** |
| hover | Contract: `--elevated-hover` with `open card →` in the meta slot — but the version-diff row **has no meta slot** (Discrepancy 50) | same |
| element | `div` — no `a`, no `button` (Discrepancy 34) | `div` — same |
| transition | — (no motion) | — |

### Card row — name

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | `var(--font-sans)` (inherited) | `var(--font-sans)` (inherited) |
| font-size | `12.5px` | `13px` |
| color | `#EDE6D8` (`--fg`) | `#EDE6D8` (`--fg`) |
| flex | `1`, `min-width: 0` | `1`, `min-width: 0` |
| overflow | `hidden` | `hidden` |
| text-overflow | `ellipsis` | `ellipsis` |
| white-space | `nowrap` | `nowrap` |
| quantity move | `{name} {from} → {to}` via `review.recounted` / `recountedItem` (state 40b, rule 8c) — **not drawn on the canvas** (Discrepancy 51) | same |

### Card row — cost track

| Property | Mobile | Desktop |
|----------|--------|---------|
| container display | `flex`, `align-items: center`, `justify-content: flex-end` | same |
| container width | `76px`, `flex: none` | `90px`, `flex: none` |
| container gap | `3px` — the Contract says **2px phone** (Discrepancy 52) | `3px` |
| governing width | **Neither.** §Errata: versioning mounts `CostPips` with the shipped `COST_TRACK = 72` / `PIP_CAP = 5`, so 76px/90px is drawn geometry that governs nothing (Discrepancy 39) | same — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1** |
| generic-cost disc — size | `17px` × `17px` | `18px` × `18px` |
| disc border-radius | `999px` | `999px` |
| disc background | `#2A241D` (`--elevated`) | `#2A241D` (`--elevated`) |
| disc border | `1px solid #3A3229` (`--border-strong`) | `1px solid #3A3229` (`--border-strong`) |
| disc font-family | `var(--font-mono)` | `var(--font-mono)` |
| disc font-size | `9.5px` | `10px` |
| disc colour | `#C6B79A` (`--fg-body`) | `#C6B79A` (`--fg-body`) |
| disc, when the cost has no generic part | **—** (drawn absent on `Llanowar Elves`, which renders one green pip alone) | **—** |
| pip size | `10px` × `10px` | `11px` × `11px` |
| pip border-radius | `999px` | `999px` |
| pip colour, black | `#5B5566` (canvas flags the shipped pip as reading pinker than this) | `#5B5566` |
| pip colour, green | `#6B9E63` | `#6B9E63` |
| pip count rule | one pip per coloured symbol (Contract) | one pip per coloured symbol |
| cap / overflow / negative margin | **—** ("No negative margin, no cap, no overflow rule" — Contract) — contradicted by §Errata's `PIP_CAP = 5` (Discrepancy 39) | **—** |
| mana value on the row | **—** (§Errata: rows draw `CostPips`' output only; mana value lives in the what-changed strip and the stat block) | **—** |
| SVG icons | **—** — every mark here is a CSS disc, not an icon; the bundle draws **no SVG anywhere** on these surfaces | **—** |

### Elision line (`… 1 more, then Enchantments 1` / `… 2 more`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | **— (not drawn on phone)** | drawn, once per column |
| font-family | — | `var(--font-mono)` |
| font-size | — | `10px` |
| color | — | `#6A6152` (`--fg-locked`) |
| padding | — | `4px 9px 0` |
| copy key | — | **none** — canvas shorthand for "the frame is not tall enough", not a product string (Discrepancy 53) |

### Diff note (`history.diffNote`), retired

**Retired 2026-10-03 (H31).** Replaced by `history.todayNote(version)`, drawn above the columns at
both widths, mono 10.5px `--fg-faint`, only when the In column has rows. The version card rows
handoff (`design/design_handoff_the99_version_rows/`) is its spec.

---

## Component: v1 opened (no predecessor)

State 39 / READINESS 8: **no columns at all**, never `+99`. The shipped provenance shape
carrying `Initial` and one sentence. (The canvas also drew a route into the list; retired
2026-09-13, see below.) Preceded on the canvas by the same
mono caption treatment as the v2 panel, reading `v1 opened — there is no predecessor`
(Discrepancy 40).

### Panel container

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | drawn — **errata**: no phone frame draws this panel, which is a canvas absence rather than a stated one (Discrepancy 55). Parity ships in one PR, and a deck's only version is the commonest v1 a phone reader opens. | drawn |
| background | — | `#1A160F` (`--surface-rail`) |
| border | — | `1px solid #2A241D` (`--elevated`) |
| border-radius | — | `12px` |
| padding | — | `18px` |
| margin-bottom | — | — (last block in the frame) |

### Panel header row

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `baseline` |
| justify-content | — | `space-between` |
| gap | — | `12px` |
| flex-wrap | — | `wrap` |
| margin-bottom | — | `14px` (the v2 panel uses `16px`) |

### Panel title (`v1 · 2 Nov 2024`) and note

| Property | Mobile | Desktop |
|----------|--------|---------|
| title font-family | — | `var(--font-cinzel)` |
| title font-size | — | `18px` |
| title font-weight | — | `700` |
| title colour | — | `#EDE6D8` (`--fg`) |
| note font-size | — | `13px` |
| note font-style | — | `italic` |
| note colour | — | `#8E8269` (`--fg-faint`) |
| note margin-top | — | `5px` |
| note text | — | `no note` (`history.noNote`) |

### Header right block (`99 cards · mv 3.34` / `held 2 games`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `var(--font-mono)` |
| font-size | — | `10px` |
| color | — | `#6A6152` (`--fg-locked`) |
| text-align | — | `right` |
| line-height | — | `1.5` |
| line break | — | `<br>` between the two lines |
| line 1 | — | `99 cards · mv 3.34` — Component notes specify `{n} cards · {commander}`; the canvas draws the mana value instead of the commander (Discrepancy 56) |
| line 2 | — | `held 2 games` (`history.gamesHeld(2)`) |
| stat blocks | — | **—** (the v2 panel's two boxes are replaced by this bare mono block) |

### Provenance box

| Property | Mobile | Desktop |
|----------|--------|---------|
| display | — | `flex` |
| align-items | — | `flex-start` |
| gap | — | `11px` |
| background | — | `#181410` (unnamed; Component notes call it `--surface-sunken`) |
| border | — | `1px solid #2A241D` (`--elevated`) |
| border-left | — | `3px solid #C9A24B` (`--accent`) |
| border-radius | — | `9px` |
| padding | — | `12px 15px` |
| max-width | — | `640px` |

### `i` disc

| Property | Mobile | Desktop |
|----------|--------|---------|
| width / height | — | `20px` / `20px` |
| border-radius | — | `999px` |
| border | — | `1.5px solid #C9A24B` (`--accent`) |
| background | — | — (none) |
| color | — | `#C9A24B` (`--accent`) |
| font-family | — | `var(--font-cinzel)` |
| font-size | — | `12px` |
| font-weight | — | `700` |
| display | — | `flex`, centred both axes, `flex: none` |
| glyph | — | the letter `i` — **not an SVG icon** |
| aria | — | — (not specified; it is decorative and should be `aria-hidden`) |

### Body (`history.initialHeading` + `history.initialBody`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| font-family | — | `var(--font-sans)` (inherited) |
| font-size | — | `12.5px` |
| line-height | — | `1.55` |
| color | — | `#C6B79A` (`--fg-body`) |
| `Initial` colour | — | `#EDE6D8` (`--fg`) |
| `Initial` font-weight | — | `600` (drawn as `<b>` with an explicit weight) |
| dash after `Initial` | — | `—` (em dash) |
| text | — | `Initial — the first list, with nothing before it to compare against.` — **amended 2026-09-13** (Hugh's copy ruling); the canvas draws `Initial — the list as it stood when versioning arrived. There is nothing before it to compare against, so there is no diff to show.` |

### `Browse the {n} cards →` (`history.initialBrowse(cards)`) — RETIRED 2026-09-13

The canvas drew this link, and the shipped panel carried it until the rail moved onto the deck
page itself (PR #580). Its only target was `/decks/{id}`, which is now the page the panel is
drawn on, so the link pointed at the page already on screen. The key, the `<Link>`, and every
property below are gone: the v1 arm carries no link at all, which `probe:versions` asserts.
Discrepancies 55 and 57, both about this link's target size and focus ring, are moot with it.

---

## Component: Game log version stamp (§Surfaces 5)

§Decisions 8: one fixed **44px** slot between the meta line and the marks, bare mono 10.5px
`--fg-faint`, `—` in `--fg-locked` when null. **Not a chip** and **not a link**. The log row
itself is shipped; only the new slot and the row's measured context are enumerated. Drawn only
inside a 760px annotation card — no page frame, no phone frame (Discrepancy 46).

### Log row (context — shipped)

| Property | Mobile | Desktop |
|----------|--------|---------|
| min-height | — (not drawn) | `52px` |
| background | — | `#1A1713` (`--surface`) |
| border | — | `1px solid #26211B` (`--border`) |
| border-radius | — | `9px` |
| padding | — | `8px 12px 8px 14px` |
| display | — | `flex`, `align-items: center` |
| gap | — | `14px` |
| row gap (between rows) | — | `5px` in a `column` flex container |
| grid template change | — | **—** ("No row's grid template changes and no row grows in height" — §Engineering notes) |
| mark chip | — | `26px` × `26px`, radius `7px`, mono `12px`/`600`; W: `1px solid #6FA368` + `#6FA368`; L: `1px solid #3A3229` + `#C6B79A` |
| meta cell | — | `140px`, `flex: none`, mono `11px`, `#A89B84` (`--fg-muted`) — `9 Sep 2026 · pod 4` |
| tail cell | — | `flex: 1`, `min-width: 0`, mono `10.5px`, `#8E8269`, ellipsed `nowrap` |
| header row | — | **—** (§Engineering notes and §Errata: the log has no mono column-header row, so `ver` cannot join one — Discrepancy 45) |

### Version slot — value (`stamp.value(version)` — `v{n}`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| rendered | drawn **on the meta line, right of the date** (stated in prose only — Discrepancy 46) | drawn as its own cell |
| width | — (no figure given for the phone treatment) | `44px`, `flex: none` |
| font-family | `var(--font-mono)` | `var(--font-mono)` |
| font-size | — (not specified for phone) | `10.5px` |
| color | — | `#8E8269` (`--fg-faint`) |
| position | after the date, on the meta line | between the meta cell and the tail cell |
| background / border / radius | **—** (not a chip — §Decisions 8, READINESS 12) | **—** |
| element | — | plain `span` — **not a link**, no `href`, no target (§Decisions 8) |
| hover / focus | **—** (it is not interactive) | **—** |
| transition | — | — |
| values drawn | — | `v2` on the two most recent games; `v1` on the 11 Mar game (state 43 — the stamp follows the **play** date, not the logged date) |

### Version slot — absent (`stamp.absent` — `—`)

| Property | Mobile | Desktop |
|----------|--------|---------|
| glyph | `—` (em dash, `&mdash;`) | `—` |
| color | `#6A6152` (`--fg-locked`) | `#6A6152` (`--fg-locked`) |
| font-size | — | `10.5px` |
| width | — | `44px`, `flex: none` — the slot keeps its width; absence, not a gap |
| triggering conditions | a game played before the feature shipped; a deck that has never committed; a version deleted (`on delete set null`, state 45) | same |
| the same row's tail | also `—` in `#6A6152`, matching the log's existing no-marks treatment | same |

### Aggregate panel

| Property | Mobile | Desktop |
|----------|--------|---------|
| reads the stamp | **—** | **—** — no per-version buckets, no "since v2" filter, no split summaries (§Decisions 8, §Decisions 5, §Out of scope) |

---

## State Coverage

`STATES-pending.md` table E. Numbers are **section-scoped** per §Errata — these are E36–E45,
not positions in one flat 1–45 sequence.

| # | State | Triggering condition | Component rendered | Props required |
|---|---|---|---|---|
| 36 | One version | `versions.length === 1` | Versions tab (count `1`), rail with one row reading `initial`, and on open the **v1 panel** — no diff view is reachable | `versions[]` (number, date, cardCount, manaValue, note, gamesHeld) |
| 37 | Many versions | `versions.length > 1` | Versions tab with count, full rail newest-first, current row marked `current` | the same list, plus which id is current; no filter or search props |
| 37b | No versions at all | `versions.length === 0` | **nothing** — the tab does not render; not empty, not disabled | the count alone decides; the route must also refuse |
| 38 | A version with no note | `version.note == null` | `no note`, italic `--fg-faint`, in the rail row and in the opened panel's header | `note: string \| null` |
| 39 | v1 opened | the opened version has no predecessor | v1 panel — **no columns**, `Initial` + one sentence, and **no link** (amended 2026-09-13; the canvas drew `Browse the {n} cards →`); never `+99` | `cardCount` (for the right block), `manaValue`, `gamesHeld` |
| 40 | A later version opened | the opened version has a predecessor | opened version diff — two equal columns, type-grouped, cost track, no dot/price/marker/action | in/out card sets (name, type, mana cost symbols), `manaValue` before and after, `gamesHeld` |
| 40b | A version diff with a quantity change | an entry carrying both `from > 0` and `to > 0` | the same card row, rendering `{name} {from} → {to}` via `recountedItem` | `from`, `to` on the diff entry |
| 41 | A version that changed commander | the version's commander differs from its predecessor's | the opened panel's **right-hand block**, naming both: `The Mimeoplasm → Muldrotha` (`history.commanderChange`) — **not drawn on the canvas** | `commanderBefore`, `commanderAfter` |
| 42 | Game stamped | the game row has a version id | the 44px slot, `v{n}`, bare mono `--fg-faint` | `versionNumber: number \| null` on the game row |
| 43 | Game stamped with an older version | the game's **play** date precedes the newest version's commit date | the same slot, showing the version live at play time — `v1` on a game played 11 Mar, logged later | the game's `playedAt`, resolved server-side |
| 44 | Game with no version | `versionNumber == null` | the slot renders `—` in `--fg-locked` | the same nullable prop |
| 45 | A version is deleted (not in this UI) | `on delete set null` fires | affected games' stamps become `—`; the rows are otherwise unaffected | none — the null does the work; no UI in this feature deletes a version |

### Cross-surface conditions that change Surfaces 4 and 5

| Condition | Effect | Source |
|---|---|---|
| Pending changes exist | **no change to the rail** — they get no row, no count and no `v3 (pending)` phantom | READINESS 11, §Decisions 7 |
| A versionless deck at a full body (`deckBodySize(hasPartner)` — 99, or 98 with a partner) | `Commit as v1` is offered **on the deck page**, not here; the Versions tab stays absent until that commit lands | §Decisions 9, §Errata |
| A commit settles | announcement `Committed v3. 101 cards, 8 to buy.` on the existing live region; focus moves to the version line | §Announcements, READINESS 20 |
| Motion, anywhere on these two surfaces | **none** — the commit sheet's open/close is the feature's only transition, and no figure counts up | READINESS 19, Contract |

---

## Absences the design states explicitly

- **No ownership dot, no price, no buy tag, no pull offer, no action control** on any version
  row (state 40, §Decisions 7, READINESS 9, Contract ledger).
- **No `+99` on v1**, in the rail or the opened view (READINESS 8).
- **No win rate, no per-version bucket, no "since v2" filter, no split summary** (§Decisions 5
  and 8, §Out of scope).
- **No restore, revert or rollback** (§Decisions 7).
- **No row for pending changes** (READINESS 11).
- **No `ver` column header** in the game log (§Engineering notes, §Errata).
- **No chip and no link** on the game stamp (§Decisions 8, READINESS 12).
- **No filter and no search** on the rail (state 37).
- **No bucket or availability heading** on the diff — grouping is card type (§Errata, rule 8b).
- **No Versions tab at all on a versionless deck** (state 37b).
- **No count of nought anywhere** — no `−0`, no empty column, no empty group (rule 1).
- **No motion, no count-up, no new motion class** (READINESS 19, Contract).
- **No new token, no new hex, no modal, no toast, no tray, no confirm dialog** (Component notes).
- **No SVG** — every mark on these two surfaces is a CSS disc, a border or a text glyph.

## Contradictions inside the bundle

- The cost track's width: **90px desktop / 76px phone** on the canvas, **110px / 76px** in
  `COST-TRACK.md`, and **`COST_TRACK = 72` / `PIP_CAP = 5`** in §Errata, which governs and makes — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1**
  the other two dead figures for versioning's rows.
- The type-group heading's size: **13px in a version diff** per Component notes, **13px**
  desktop and **14px** phone on the canvas.
- The game-stamp header row: specified in Component notes, removed by §Engineering notes and
  §Errata, still shipped as `stamp.columnHeader` in the copy module.
- The rail row's padding: **`12px 14px`** per Component notes, `11px 12px` on the phone frame.
- The opened panel's right block: **`{n} cards · {commander}`** per Component notes, `{n} cards
  · mv {mv}` on the canvas — and state 41's commander pair is never drawn.

## Ambiguous or missing in the design

- **How a version is opened.** Every rail row and diff row is a plain `div` with no `a`, no
  `button`, no `role` and no `tabindex`, while the Contract says "rows are the click target,
  everywhere". Nothing names the mechanism (route, query param, or in-place expand) or the
  opened state's URL, and both an opened panel and a collapsed rail are drawn simultaneously
  rather than as two states of one control.
- **Whether more than one version can be open at once.** The canvas draws two panels (v2 and
  v1) below one rail, which is either two states illustrated together or an accordion that
  allows both.
- **What a rail row's hover and focus look like.** Nothing in the bundle specifies either, for
  the rail or the diff rows; the Contract's `--elevated-hover` + `open card →` rule describes a
  row anatomy the version-diff row does not have.
- **Where the opened panel sits relative to the rail** on the phone, and whether the rail stays
  visible when a version is open.
- **Whether the rail paginates or windows.** A deck with forty versions is not drawn, and the
  rail has no cap, no "show more" and no virtualisation note.
- **The phone treatment of the game stamp** is prose only: "on the meta line, right of the
  date", with no size, colour, separator or order given.
- **The `Held` stat block's label.** `history.gamesHeld(n)` returns the whole phrase; nothing
  supplies the bare word `Held` or the bare value `3 games`.

## Discrepancies between design files

(Continuing the numbering in `deck-versioning-surface-3.md`, whose last entry is 27.)

28. **The rail's heading string is never drawn.** `history.heading(n)` (`{n} versions`) and
    §Copy per state's `History heading` both exist; the canvas draws the tab's count and no
    heading anywhere on the route. Either the route has an unnamed heading slot or the string
    is dead. **Resolved as the first arm:** the route draws the sibling `/changes` route's
    header — the deck-name link back, and an `h1` under it — and `history.heading(n)` is the
    string that `h1` carries. A route with no `h1` is the alternative, and that is an
    accessibility regression rather than a design absence.
29. **`Version line` has two forms.** §Copy per state: `v{n} · committed {date}`. The opened
    panel's Cinzel title: `v2 · 14 Mar 2026`, with `committed` absent. The rail's meta line is
    the only place `committed` is drawn, and only on desktop.
30. **The phone tab row drops every inactive tab's count.** Desktop draws `Your deck 99`,
    `Consider 99`, `Games 5`; the phone draws the three labels bare and keeps only the
    `Versions 3` count. No rule says counts are desktop-only, and the tab row is shipped chrome.
31. **The phone tab row relies on `overflow: hidden` with no scroll.** Four labels at 14px with
    an 18px gap plus one count inside 362px of screen; the fourth tab is the active one and is
    drawn intact, but nothing states what happens to a longer tab set or to the clipped edge.
    **Answered as an ENGINEERING CALL on 2026-09-25** (Hugh's staging walk, note d; the
    orchestrator ruled it acceptable, pending Hugh's look): the shipped row now carries FIVE tabs
    (`Your deck`, `Analysis`, `Consider`, `Games`, `Versions`), and at 390 on a deck with versions
    `Your deck 99` broke onto a second line (51px against 44). A tab label never breaks now
    (`white-space: nowrap`, `flex: none`), and where the tabs are wider than the phone the ROW
    scrolls sideways (`overflow-x: auto`, scrollbar hidden) while the page never does. The last
    tab is left partly cut at the edge as the cue that the row scrolls: 22px of it at 390 on the
    staging set. `probe:analysis-load-order` reads both halves.
32. **Rail row padding differs by width without a rule.** `12px 14px` desktop (matching the
    Component notes) against `11px 12px` phone, while the phone row also carries
    `min-height: 64px` — the two adjustments are not related to each other in any stated way.
33. **The rail row's phone layout is a different anatomy, not a reflow.** Desktop is one flex
    row of four cells (number in a fixed 34px slot, note block, delta, marker). Phone is a top
    line (number, marker, spacer, the two delta figures) then the note then the meta line, with
    no fixed number slot at all. The Component notes describe "three lines" on phone but not
    that the marker and the delta move into the first of them.
34. **Nothing on either surface is drawn as an interactive element.** Rail rows, diff rows and
    the phone In/Out segments are all plain `span`/`div` with no `a`, `button`, `role`,
    `aria-selected` or `tabindex`. Opening a version is the surface's whole purpose and the
    segmented pair is a control by definition.
35. **`committed` appears on the desktop rail and nowhere else.** The phone meta line reads
    `10 Sep 2026 · 101 cards · mv 2.92`; `history.committed(date, cards)` interpolates the word.
    No responsive copy variant is specified.
36. **`held {n} games` is dropped from the phone rail.** Desktop v2 and v1 both carry it;
    neither phone row does. READINESS 10 makes the count the honest half of the win-rate
    refusal, so dropping it at 390px removes the one game-related figure the design kept.
37. **The phone delta drops the `/` separator.** `history.delta(adds, removes)` returns
    `+{adds} / −{removes}` as one string; the desktop frame draws the separator in
    `--border-strong`, and the phone draws `+19` and `−17` as two spans with no separator —
    which the single copy function cannot produce.
38. **The `current` marker changes position between widths.** Desktop: the row's right end,
    after the delta, with a 62px spacer reserving its width on every other row. Phone: the top
    line, immediately right of the version number, with no spacer. The Component notes say only
    that it takes "the pending-add marker's shape".
39. **The cost track has three different widths, and the governing one is neither drawn
    figure.** Canvas 90px desktop / 76px phone; `COST-TRACK.md` 110px / 76px; §Errata rules
    versioning mounts `CostPips` with the shipped `COST_TRACK = 72` and `PIP_CAP = 5`. The — **`COST_TRACK` is 72 since 2026-09-14 (PR #621); see the amendment on surface 1**
    Contract's "no cap, no overflow rule" also contradicts `PIP_CAP = 5` directly.
40. **The `v2 opened — against v1` and `v1 opened — there is no predecessor` captions match no
    copy key.** Both are drawn in the same mono `0.16em` uppercase `--fg-faint` treatment as
    every other canvas state label in the bundle, so they read as annotation — but they sit
    inside the page frame, above the panels, where product chrome would sit.
41. **The phone diff drops the entire header.** No panel box, no title, no note, no stat blocks
    (so no mana value and no `held {n} games`), and no closing diff note — the phone goes
    caption → segmented pair → one type group. §Decisions 7 calls the mana-value shift "what
    makes a two-year-old version legible at a glance", and at 390px it is absent.
42. **State 41's commander change is never drawn.** It is specified to appear in "the
    right-hand block", which on the v2 panel is two stat boxes and on the v1 panel is a mono
    text block — neither has a place for `The Mimeoplasm → Muldrotha`, and
    `history.commanderChange` appears on no frame.
43. **`Held` is a string with no copy key.** The stat block's label is the bare word `Held` and
    its value the bare `3 games`; the copy module offers only `history.gamesHeld(n)`, which
    returns `held 3 games` as one phrase — the form the rail uses.
44. **The opened diff's after-figure is neutral where the what-changed strip's is coloured.**
    `3.34 → 3.10` draws the after-figure in `--fg-body`, while §Surfaces 2's equivalent cell
    colours an improving figure `--success` and a short one `--warning`. Both are drawn from the
    same mana-value fold, one scroll apart, and `changed.manaValueDown` exists for this case.
45. **The `ver` column header is specified, removed, and still shipped.** Component notes:
    "Column header `ver` in the log's existing mono 9.5px header row." §Engineering notes: the
    log has no such row and the header "is removed from the canvas". §Errata: **no `ver` header
    row**. `stamp.columnHeader: 'ver'` is still in the copy module.
46. **§Surfaces 5 has no page frame and no phone frame.** It is drawn only inside a 760px
    annotation card, so the log row's real page context is never shown, and the phone treatment
    ("it rides the meta line") is prose with no drawn geometry, no size and no separator.
47. **The phone In/Out segments are 38px tall.** The targets bullet sets a 44px floor for
    interactive controls at 390px, and the diff's own card rows are 44px there. A 38px pill is
    the surface's only control at that width and the shortest thing on the screen.
48. **The type-group heading's size contradicts the Component notes at 390px.** The notes say
    "Cinzel 700 14px (13px in a version diff)" with "a mono 11px `--fg-faint` count". The
    desktop diff draws 13px with a **10.5px** count; the phone diff draws **14px** with an 11px
    count — so the phone version diff uses the deck page's full-size heading.
49. **The drawn row order is not alphabetical.** Rule 8b and §Engineering notes both require
    alphabetical sort within a type group; the In column draws Necrotic Ooze, Lotleth Troll,
    Fauna Shaman, Hermit Druid, and the Out column Farhaven Elf, Wood Elves, Llanowar Elves,
    Scute Swarm, Overgrown Battlement. Neither is sorted.
50. **The Contract's hover rule names a slot the version-diff row does not have.** "Hover is
    `--elevated-hover` with `open card →` in the meta slot" — the version-diff row is name plus
    cost track and carries no meta slot, so either the hover copy has nowhere to go or the row
    gains a slot the ledger says it does not have.
51. **State 40b's quantity row is never drawn in a version diff.** `{name} {from} → {to}` is
    ruled for "every diff and version row" (rule 8c, READINESS 21), and no frame in §Surfaces 4
    draws one — so the row's geometry under a two-number name, inside a 90px-track row that
    already ellipses, is unverified.
52. **The cost track's phone gap is stated as 2px and drawn as 3px.** The Contract's atom card
    says "`gap 3px` (2px phone)"; both phone rows draw `gap: 3px`.
53. **The elision lines are canvas shorthand in product position.** `… 1 more, then
    Enchantments 1` and `… 2 more` sit inside the column flow, styled like a product note, with
    no copy key, no state and no truncation rule anywhere in the bundle. Whether a long diff
    truncates at all is therefore unanswered.
54. **`diffNote` had two first clauses — moot 2026-09-13.** The copy module and the canvas said
    `no ownership dot, no prices, no pull offers`; §Copy per state said `no availability, no
    prices, no pull offers`. The shipped note is now `this is what the deck was, not what it
    needs`, so neither first clause survives to disagree with the other.
55. **The v1 panel is desktop-only, and its route out is retired 2026-09-13.** The phone frame
    draws the rail and the v2 diff and stops. `Browse the {n} cards →` was the one route out of
    a v1 version and the only link on either surface; it is gone, so the target size it was
    never drawn at is moot with it.
56. **The opened panel's right block names the mana value where the Component notes name the
    commander.** Notes: "mono 10px right block (`{n} cards · {commander}` / `held {n} games`)".
    Canvas v1 panel: `99 cards · mv 3.34` / `held 2 games`. The commander appears in no drawn
    version surface at all.
57. **No focus style is specified for anything on either surface.** The canvas's one link
    (`Browse the {n} cards →`, retired 2026-09-13) inherited the global `a` colour and a hover,
    and nothing in the bundle declares a focus ring — for the rail rows or for the segmented
    pair. With the link gone these surfaces carry no link at all.
58. **The tab row's own metrics contradict the shipped row this table declares to be shipped
    chrome.** "Tab row container" above rules `gap: 18px / 26px` with `overflow: hidden` at
    390px, and "Versions tab — active cell" rules `gap: 6px / 7px` with `padding-bottom:
    11px / 13px`. `BuilderTabs` — drawn by the deck page, whose own handoff set these — ships
    `gap: 16px / 22px`, cell `gap: 6px` at both widths, and `padding-bottom: 8px / 10px`.
    **Resolution (engineering, this table's own governing-value rule): the shipped chrome
    wins and this table's four rows are errata.** `/decks/[id]/versions` draws the same
    component instance the deck page draws, so honouring the figures here would make one row
    of chrome measure differently on two routes a single click apart — the defect the rule
    exists to prevent. `overflow: hidden` is additionally wrong as stated: it forces both
    axes, and the global `:focus-visible` outline sits 2px outside each cell with a 2px
    offset, so it clips every keyboard indicator against the row's bottom rule. The row
    clips on one axis with `overflow-x-clip`, which leaves the vertical visible.
