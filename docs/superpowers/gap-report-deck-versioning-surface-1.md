# Gap Report — Deck Versioning Surface 1

Verified against `docs/superpowers/design-tables/deck-versioning-surface-1.md` on branch
`feat/deck-versioning-pending` (HEAD `b80dd55`).

Token note: this codebase ships six themes and redefines every hex per theme, so every colour row
below is verified at the **token** level (`var(--accent)` etc.), not against the canvas hex. The
table's own token↔hex correspondence makes that the equivalent test. `--bg` = `#14110E` confirmed in
`src/app/globals.css:20`, so `--bg` is the correct name for the table's `--base`/`#14110E` ink.

Architectural finding that drives most of Pass 1: the design draws the pending banner as a **boxed
card** (radius 10px, full `--border-strong` border, 3px `--accent` left rule, a stacked
header/body/controls column). `pending-banner.tsx:180` implements it as a **full-bleed single-row
strip** (`STRIP`) with a bottom rule only. Every container, header-row, name-line and controls-row
row therefore mismatches structurally rather than by a value.

---

## Pass 1 — Visual properties

### PendingBanner — counts density (7+ changes) — `src/components/decks/pending-banner.tsx`

Container (`STRIP`, lines 180–183):

| Property | Result |
|---|---|
| background | ✅ MATCH — `bg-[color:var(--surface-rail)]` |
| border-width / style / color | ❌ MISMATCH — design: `1px solid --border-strong` on all sides / impl: `border-bottom: 1px solid var(--border)` only |
| border-left `3px --accent` | ❌ MISMATCH — design: `3px solid var(--accent)` / impl: absent |
| border-radius `10px` | ❌ MISMATCH — design: `10px` / impl: none (no radius class on `STRIP`) |
| padding | ❌ MISMATCH — design: `13px 14px` mobile, `15px 17px` desktop / impl: `py-[10px] px-[16px]`, `md:py-[12px] md:px-[30px]` |
| margin-bottom `14px` (mobile) | ❌ MISMATCH — design: `14px` / impl: none |
| outer wrapper padding | ❌ MISMATCH — design: `14px` mobile / `18px 26px 0` desktop / impl: no wrapper; the strip is full-bleed and carries its own padding |
| display `block` | ❌ MISMATCH — design: block box with an inner header row / impl: the container **is** the flex row |
| max-width | ✅ MATCH (`—`) |
| dismissible | ✅ MATCH — no dismiss control |
| `aria-live` | ✅ MATCH — none set |

Header row:

| Property | Result |
|---|---|
| display `flex` | ✅ MATCH (incidentally — it is the container, not a header row) |
| align-items `center` | ✅ MATCH |
| gap | ❌ MISMATCH — design: `9px` / `14px` / impl: `gap-[10px] md:gap-[12px]` |
| flex-wrap (desktop `wrap`) | ❌ MISMATCH — design: `wrap` on desktop / impl: `flex-wrap md:flex-nowrap` (wraps on mobile, **nowrap** on desktop) |
| margin-bottom | ❌ MISMATCH — design: `8px`/`9px` mobile, `10px` desktop / impl: none (no header block) |
| structure (mobile label its own block) | ❌ MISMATCH — design: label above the counts row / impl: label inline, first child of the single row |

Header — label (line 104):

| Property | Result |
|---|---|
| font-family `--font-mono` | ✅ MATCH |
| font-size | ❌ MISMATCH — design: `9.5px`/`10px` / impl: `text-[9px] md:text-[10px]` (mobile only) |
| letter-spacing | ❌ MISMATCH — design: `0.14em`/`0.16em` / impl: `tracking-[0.12em]` at both |
| text-transform `uppercase` | ✅ MATCH |
| color `--accent` | ✅ MATCH |
| margin-bottom `9px` (mobile) | ❌ MISMATCH — impl: none |
| copy key | ✅ MATCH — `pending.label` exists, no interpolation, call site matches |

Header — counts group (`+19 / −17`, line 126):

| Property | Result |
|---|---|
| display `flex` | ❌ MISMATCH — design: its own flex row / impl: a text run inside the counts `<p>` |
| align-items `center` | ❌ MISMATCH — n/a, no element |
| gap `9px`/`8px` | ❌ MISMATCH — n/a, no element |
| font-family `--font-mono` | ✅ MATCH — the `<p>` is `font-mono` |
| font-size | ❌ MISMATCH — design: `15px` mobile / `13px` desktop / impl: `text-[12px]` flat |
| adds figure color `--success` | ❌ MISMATCH — design: `--success` / impl: whole run inherits `--fg-body`; no per-figure colour |
| separator `/` color `--border-strong` | ❌ MISMATCH — same, `--fg-body` |
| removes figure color `--warning` | ❌ MISMATCH — same, `--fg-body` |
| removes glyph U+2212 | ✅ MATCH — `deck-versioning.ts:36` uses `−` |
| zero suppression (absent side **and** the `/`) | ✅ MATCH — `counts()` filters then joins |

Header — "since" line (line 128):

| Property | Result |
|---|---|
| font-family `--font-mono` | ✅ MATCH |
| font-size | ❌ MISMATCH — design: `10px`/`10.5px` / impl: `12px` (inherits the counts `<p>`) |
| color `--fg-locked` | ❌ MISMATCH — design: `--fg-locked` / impl: `--fg-body` |
| placement | ❌ MISMATCH — design: third item of the header row (desktop) / after the removes figure (mobile) / impl: concatenated into the counts paragraph with a `·` separator |
| copy key | ✅ MATCH — `pending.since(n, version)`, two slots, call site passes both |

Money sentence (lines 137–142):

| Property | Result |
|---|---|
| font-family (inherited sans) | ✅ MATCH — no `font-mono` on the `<p>` |
| font-size | ❌ MISMATCH — design: `12.5px` mobile / `13px` desktop / impl: `text-[13px]` flat |
| color `--fg-body` | ❌ MISMATCH — design: `--fg-body` / impl: `--fg-faint` |
| line-height `1.5`/`1.55` | ❌ MISMATCH — impl: none set |
| max-width `700px` (desktop) | ❌ MISMATCH — impl: none |
| margin-bottom `12px`/`14px` | ❌ MISMATCH — impl: `m-0` |
| inline money run — family / size / color | ❌ MISMATCH — design: mono `12`/`12.5px` in `--warning` / impl: no inline run; the figure is plain text inside the sentence |
| inline money run — content | ✅ MATCH in substance — `money()` carries `{buy} to buy · {total}` |
| grammar: bare figure + "this commit will ask for" | ✅ MATCH — `deck-versioning.ts:47` |
| no-pulls variant omits `moneyPulls` | ✅ MATCH — gated on `state.pullableCount > 0` (line 140) |
| nothing-to-buy variant `moneyNone` | ✅ MATCH — `moneyLine()` returns it on a real zero with `claimsKnown` |

Controls row:

| Property | Result |
|---|---|
| display `flex` | ✅ MATCH (the container) |
| flex-direction `column` mobile / `row` desktop | ❌ MISMATCH — design: column on mobile / impl: no controls row; the three controls are wrapping children of the one horizontal strip |
| gap | ❌ MISMATCH — design: `8px` mobile / `10px` desktop / impl: `10px` / `12px` |
| align-items | ✅ MATCH desktop (`items-center`); ❌ mobile (design stretch, impl center) |
| flex-wrap | ✅ MATCH mobile; ❌ desktop (`md:flex-nowrap`) |
| order (primary full-width own row, then Commit + Discard) | ❌ MISMATCH — impl: one row, and `Commit as v{n}` is **not rendered at all** in this density (line 166 gates it on `inline`) |

Control — primary `Review {n} changes` (`SOLID_CTA`, lines 186–188):

| Property | Result |
|---|---|
| font-family `--font-sans` | ❌ MISMATCH — impl: `font-mono` |
| font-weight `600` | ❌ MISMATCH — impl: unset (normal) |
| font-size | ❌ MISMATCH — design: `14px` mobile / `13.5px` desktop / impl: `text-[12px]` |
| color `#14110E` | ✅ MATCH — `text-[color:var(--bg)]`, `--bg: #14110E` |
| background cream `#E8E4D6` | ❌ MISMATCH — design: cream primary (Contradictions row explicitly overrules "brass solid") / impl: `bg-[color:var(--accent)]` |
| border (none) | ✅ MATCH — `border-0` |
| border-radius `8px` | ❌ MISMATCH — impl: `rounded-[7px]` |
| padding `10px 18px` (desktop) | ❌ MISMATCH — impl: `px-[14px]`, no vertical padding (height from `min-h`) |
| min-height `44px` (mobile) | ✅ MATCH — `min-h-[44px]` |
| width full-width of banner body (mobile) | ❌ MISMATCH — impl: `flex-none inline-flex` |
| display / align / justify | ✅ MATCH in effect — `inline-flex items-center` |
| copy key | ✅ MATCH — `pending.reviewCta(n)` |

Control — secondary `Commit as v{n}` at 7+:

| Property | Result |
|---|---|
| all rows | ❌ MISMATCH — the control is **absent in the counts density**. `pending-banner.tsx:166` renders `commitCta` only when `inline` is true (≤6 changes) |

Control — ghost `Discard` (`GHOST_CTA`, lines 192–194):

| Property | Result |
|---|---|
| font-family `--font-sans` | ❌ MISMATCH — impl: `font-mono` |
| font-weight `500` | ❌ MISMATCH — impl: unset |
| font-size `13.5px` | ❌ MISMATCH — impl: `text-[12px]` |
| color `--fg-muted` | ❌ MISMATCH — impl: `--fg-body` |
| border `1px solid --border-strong` | ✅ MATCH — `border border-border-strong` |
| border-radius `8px` | ❌ MISMATCH — impl: `rounded-[7px]` |
| min-height `44px` | ✅ MATCH |
| width `92px` fixed, `flex: none` (mobile) | ❌ MISMATCH — impl: `flex-none` only, intrinsic width |
| display / align / justify | ✅ MATCH in effect |
| renders at all | ❌ MISMATCH — gated on the optional `onDiscard` prop (line 171), which **no call site supplies** (see Pass 2, D30) |

Hover / focus / active — ✅ MATCH (`—`): no hover, focus or active style on any banner control.
Transitions — ✅ MATCH: no `transition` on `SOLID_CTA`/`OUTLINE_CTA`/`GHOST_CTA`; no count-up anywhere.

### PendingBanner — names density (1–6 changes)

Container / header row: identical to the counts-density results above, **plus**:

| Property | Result |
|---|---|
| gap `12px` (desktop header row) | ❌ MISMATCH — impl `md:gap-[12px]` ✅ on that one value, but there is no header row |
| margin-bottom `11px` | ❌ MISMATCH — impl: none |
| counts group at ≤6 ("same counts") | ❌ MISMATCH — design: `+1 / −1` mono `13px`, gap `7px`, per-figure colours / impl: **no counts rendered at all** in the inline branch (lines 109–122) |
| "since" line not drawn at ≤6 | ✅ MATCH — inline branch omits it |

Name-line list (lines 110–122):

| Property | Result |
|---|---|
| display `flex` | ✅ MATCH |
| flex-direction `column` | ❌ MISMATCH — impl: `flex-wrap` horizontal run |
| gap `5px` | ❌ MISMATCH — impl: `gap-x-[14px] gap-y-[2px]` |
| margin-bottom `14px` | ❌ MISMATCH — impl: `m-0` |
| ordering adds then removes | ✅ MATCH — `addChanges` mapped before `removes` |

Name line — add variant (lines 111–115):

| Property | Result |
|---|---|
| display / align-items `flex` · `center` | ❌ MISMATCH — impl: `<li>` is a plain text run |
| gap `9px` | ❌ MISMATCH — impl: none (a literal space) |
| min-height `34px` | ❌ MISMATCH — impl: none |
| sign gutter — family / size / color / width / `flex:none` | ❌ MISMATCH — design: mono `12px`, `--success`, `13px` fixed gutter / impl: a `+ ` character inside the line, sans `13px`, `--fg-body` |
| sign glyph `+` | ✅ MATCH |
| name font-size `13px` | ✅ MATCH — `text-[13px]` |
| name color `--fg` | ❌ MISMATCH — impl: `--fg-body` |
| name `flex: 1` | ❌ MISMATCH — impl: no flex child |
| holding deck — family / size / color | ❌ MISMATCH — absent; `pending.addPullHint` has **no call site** |
| price tag — family / size / color / border / radius / padding / content | ❌ MISMATCH — absent entirely |
| cost track slot — display / align / justify / gap / width | ❌ MISMATCH — absent entirely |
| cost track — generic disc / coloured pip | ❌ MISMATCH — absent entirely |
| `CostPips` props `track` + `cap` explicit | ❌ MISMATCH — no `CostPips` mount in the banner (it *is* mounted correctly with explicit `track={PIP_TRACK}` / `cap={PIP_CAP}` on the decklist row, `decklist-row.tsx:360–369`) |

Name line — remove variant (lines 116–121):

| Property | Result |
|---|---|
| min-height `34px` | ❌ MISMATCH — none |
| sign gutter color `--warning` | ❌ MISMATCH — impl: the whole `<li>` is `--fg-faint` |
| sign glyph `−` U+2212, `13px` width, mono `12px` | ⚠️ glyph ✅ (U+2212 literal), gutter geometry/family ❌ |
| name `13px` / `--fg` / `flex:1` | size ✅ · color ❌ (`--fg-faint`) · flex ❌ |
| hint — family / size / color | family ✅ mono · ❌ size `10.5px` vs `10px` · ❌ color (inherits `--fg-faint`, design `--fg-locked`) |
| hint text `pending.removeHint` | ✅ MATCH |
| price / buy tag absent | ✅ MATCH |
| cost track slot | ❌ MISMATCH — absent |

Controls row (inverted hierarchy):

| Property | Result |
|---|---|
| display / align / wrap | ✅ / ✅ / ❌ (`md:flex-nowrap`) |
| gap `10px` | ❌ MISMATCH — impl `md:gap-[12px]` |
| order `Commit as v3` · `Discard` · `review changes` | ❌ MISMATCH — impl order is `review changes` (line 158) → `Commit as v{n}` (167) → `Discard` (172) |

Control — primary `Commit as v{n}` at ≤6 (uses `SOLID_CTA`):

| Property | Result |
|---|---|
| family / weight / size | ❌ MISMATCH — design sans `600` `13.5px` / impl mono, unset weight, `12px` |
| color `#14110E` | ✅ MATCH (`var(--bg)`) |
| background cream `#E8E4D6` | ❌ MISMATCH — impl `var(--accent)` |
| border-radius `8px` | ❌ MISMATCH — `7px` |
| padding `10px 18px` | ❌ MISMATCH — `px-[14px]`, no vertical |
| min-height `44px` at 390px | ✅ MATCH |

Control — `Discard` at ≤6 — identical results to the counts-density `Discard` above (same `GHOST_CTA`).

Control — demoted `review changes` link (`REVIEW_LINK`, line 195):

| Property | Result |
|---|---|
| element `<a>` | ✅ MATCH — `next/link` renders an anchor |
| font-family `--font-mono` | ✅ MATCH |
| font-size `11px` | ❌ MISMATCH — impl `text-[11.5px]` |
| color `--accent` | ✅ MATCH |
| text-decoration none | ❌ MISMATCH — impl `underline` |
| hover color `--accent-hover` | ❌ MISMATCH — no hover rule |
| text `pending.reviewLink` | ✅ MATCH |
| target `/decks/[id]/changes` | ✅ MATCH (line 158) — note the route itself does not exist yet, see Notes |

### Component: DiscardConfirm — **not implemented**

No `discard-confirm` module exists under `src/components/decks/`. Every row of the Container,
Question line, Consequence line, Button row, `Keep editing`, `Discard {n} changes` and
In-flight/refused tables is ❌ MISMATCH (implementation: absent). The copy keys all exist and are
correctly shaped (`discard.question(n)`, `discard.consequence(version, date, cards, adds, removes)`,
`discard.confirm(n)`, `discard.cancel`, `discard.pending`, `discard.announced(n, version)`,
`discard.refused` — `deck-versioning.ts:178–190`), and the server action
`discardDeckDraft(deckId)` exists at `src/app/decks/actions.ts:1376`. Only the UI is missing.

### Component: FirstCommitOffer — `pending-banner.tsx:71–83`

| Property | Result |
|---|---|
| placement (spine, beside `Export`) | ❌ MISMATCH — design: in the spine beside `Export` / impl: inside the banner's own `STRIP`; `spine-desktop.tsx:415`/`spine-mobile.tsx:360` carry no commit offer |
| wrapper display / align / gap / wrap | ✅ / ✅ / ❌ (`10px` mobile vs `12px`) / ✅ |
| button family / weight / size | ❌ MISMATCH — design sans `500` `13px` / impl mono, unset, `12px` |
| button color `--fg` | ❌ MISMATCH — impl `--accent` |
| button background (none / never cream) | ✅ MATCH — `bg-transparent` |
| button border `1px solid --border-strong` | ❌ MISMATCH — impl `border-[color:var(--accent)]` |
| button border-radius `8px` | ❌ MISMATCH — `rounded-[7px]` |
| button padding `9px 16px` | ❌ MISMATCH — `px-[14px]`, no vertical |
| button text `pending.firstCommitCta` | ✅ MATCH |
| note family / size / color | ❌ MISMATCH — design mono `10px` `--fg-locked` / impl sans `13.5px` `--fg-body` |
| note line-height `1.45` | ❌ MISMATCH — unset |
| note text `pending.firstCommitNote` | ✅ MATCH |
| gate `deckBodySize(hasPartner)`, read once | ✅ MATCH — `builder-shell.tsx:228` derives `bodySize` once via `deckBodySize(deck.partner !== null)`; banner compares `total < bodySize` |

### Component: Pending-list caption / toolbar note

Toolbar note (`group-toggle.tsx:141–145`):

| Property | Result |
|---|---|
| font-family `--font-mono` | ✅ MATCH |
| font-size `11.5px` | ❌ MISMATCH — impl `text-[11px]` |
| color `--fg-locked` | ✅ MATCH — `text-fg-locked` |
| placement (right of spacer, left of `By type`/`By role`) | ✅ MATCH — after the `flex-1` spacer (line 131), before the grouping pills |
| text `pending.toolbarNote(n, version)` | ✅ MATCH — two slots, both passed (`decklist.tsx:150`) |
| replaces "n cards are yours now" | ✅ MATCH — `keptCount={draftNote ? 0 : keptCount}` (line 153) |

Caption above the list (`decklist.tsx:609–613`):

| Property | Result |
|---|---|
| font-family `--font-mono` | ✅ MATCH |
| font-size `10px` | ❌ MISMATCH — impl `text-[10.5px]` |
| color `--fg-faint` | ✅ MATCH |
| placement (one line above the decklist) | ✅ MATCH |
| text `pending.addListCaption(n)` | ✅ MATCH |
| said once, never per row | ✅ MATCH — one paragraph for the whole list |

### Component: DecklistRow — pending-add mark — `decklist-row.tsx`

Marked row:

| Property | Result |
|---|---|
| min-height `44px`/`38px` | mobile ✅ (`min-h-[44px]`) · desktop ❌ (`md:min-h-[34px]`, and `52px`/`34px` with a meta line) |
| background `--surface` | ❌ MISMATCH — impl `bg-[color:var(--surface-rail)]` (pre-existing shipped row) |
| border `1px solid --border` | ❌ MISMATCH — impl: no border on the row |
| **border-left `2px solid --accent`** | ✅ MATCH — `inset 2px 0 0 0 var(--accent)` box-shadow (line 214), 2px per the Contradictions row, inset per §Errata, ordered behind the pass mark's 3px |
| border-radius `7px` | ✅ MATCH — `ROW_RADIUS` |
| padding (errata: **no absorption**) | ✅ MATCH on the governing rule — padding is unchanged by the mark (`ROW_PADDING`, line 43). The canvas's `0 9px 0 7px` / `0 8px 0 6px` figures do not match (`pl-[8px] pr-[4px] md:px-[9px] md:py-[7px]`) but the errata row governs |
| display / align-items | ✅ MATCH — `flex items-center` |
| gap `9px` | mobile ✅ · desktop ❌ (`md:gap-[10px]` from `ROW_GAP`) |
| accessible name carries `pending add` | ✅ MATCH — `aria-describedby` → sr-only span (lines 200–206, 461–465), own id so it composes with the pass mark |
| mark never rendered visually | ✅ MATCH — `sr-only` |

Unmarked row: no accent rule ✅; same background/border/radius/gap results as above.

Row slots (table records these as "unchanged by the feature"; all pre-existing shipped chrome):

| Property | Result |
|---|---|
| dot width/height `7px` | mobile ✅ · desktop ❌ (`md:w-[8px] md:h-[8px]`) |
| dot border-radius `999px` / `flex none` | ✅ / ✅ |
| dot free `--success` | ✅ MATCH |
| dot sleeved elsewhere (`--avail-hard-fg`) | ⚠️ the state exists in `OwnershipDot` but `DecklistRow` never passes `committed`, so the decklist draws two states, not three |
| dot ARIA `aria-hidden`, availability word on the **row's** name (§Errata) | ❌ MISMATCH — impl passes `label={card.owned ? "Owned" : "Not owned"}`, so the dot is a labelled node rather than `aria-hidden` |
| name font-size `12.5px`/`13px` | mobile ✅ · desktop ❌ (`md:text-[13.5px]`) |
| name color `--fg` | ✅ MATCH |
| name `flex:1` / `min-width:0` | ❌ `flex-auto` (documented deliberate) / ✅ |
| name overflow / ellipsis / nowrap | ✅ MATCH |
| quantity move `{name} {from} → {to}` via `recountedItem` | ❌ MISMATCH — the banner does this (line 45) but the **row** does not; a recounted row draws the bare name plus the `×N` glyph |
| availability marker mono `10px` `--warning` `◆` `flex:none` | ❌ size (`text-[11px] md:text-[11.5px]`) · other properties owned by `AvailabilityMarker` |
| buy tag 22×22 / bg / border / radius / font / `$`-only | ✅ collapsed `$` density passed (`density={inShopping ? "full" : "collapsed"}`, line 437); geometry owned by the shipped `BuyTag` |
| cost track slot width `76px`/`90px` | n/a — §Errata: shipped `PIP_TRACK`/`PIP_CAP` govern |
| cost track governing geometry `PIP_TRACK = 40`, `PIP_CAP = 5` | ✅ MATCH — `decklist-row.tsx:52,54`, passed explicitly at line 365–366 |
| remove `×` (not drawn at 390px; desktop `14px`/`#5C5346`/`13px`) | ❌ MISMATCH — drawn at both widths (44×44 phone), `13px` ✅, colour `--border-dashed` |
| row hover `--elevated-hover` + `open card →` | hover ✅ · `open card →` ❌ absent |
| row click target = whole row opens the card | ❌ MISMATCH — the name is the modal trigger; the row is the hover-preview trigger |

Decklist layout (`decklist-group.tsx:80–81`): display ✅ (`flex` / `md:grid`) · flex-direction ✅ ·
`grid-template-columns: 1fr 1fr` ✅ · gap ❌ (design `5px` / `5px 20px`; impl `gap-[3px]` /
`md:gap-y-[4px] md:gap-x-[20px]`) · removes never drawn ✅ (the list is `deck_cards`).

### Component: Type group heading — `decklist-group-header.tsx`

| Property | Result |
|---|---|
| display / align-items `flex` · `baseline` | ✅ MATCH |
| gap `9px`/`11px` | ❌ MISMATCH — impl `gap-[6px] md:gap-[10px]` |
| border-bottom `1px solid #574463` | ❌ (impl `md:border-[color:var(--border)]`, and no rule at all on mobile) — but the plum value is flagged unconfirmed; see Notes |
| padding-bottom `7px`/`8px` | mobile ❌ (none) · desktop ❌ (`md:pb-[7px]` vs `8px`) |
| margin-bottom `10px`/`12px` | ❌ MISMATCH — `mb-[6px] md:mb-[8px]` |
| heading font-family `--font-cinzel` | ❌ MISMATCH — `font-sans md:font-display`; mobile is sans |
| heading font-weight `700` | ❌ MISMATCH — `font-semibold` (600) |
| heading font-size `14px`/`16px` | ❌ MISMATCH — `text-[12.5px] md:text-[15px]` |
| heading letter-spacing `0.04em` | ❌ MISMATCH — unset |
| heading text-transform `uppercase` | ❌ MISMATCH — unset |
| heading color `--fg` | ✅ MATCH |
| count family / size / color | family ✅ · size ❌ (`10px`/`11px` vs `11px`/`11.5px`) · color ✅ `--fg-faint` |
| spacer `<span style="flex:1">` | ✅ MATCH in effect — `justify-between` + `marginLeft: auto` |
| draft note family / size / color | family ✅ mono · size ✅ `10.5px` · color ❌ (`--fg-locked`, design `--accent`) |
| draft note text `pending.groupAddNote(n)` | ✅ MATCH — omitted at zero (`decklist.tsx:629`) |
| ordering inside a group alphabetical | ✅ MATCH — `grouping.ts:184` sorts by `name.localeCompare` |
| grouping source = shipped modules, no extraction | ✅ MATCH |
| `By role` carries the same note | ✅ MATCH — `addedInGroup` computed for both groupings |
| draft note desktop-only | ⚠️ `hidden md:block`; design draws no phone note, so consistent with the table's `—` |

### Component: Mix strip while a draft exists — `role-counter-strip.tsx`, `role-counter-cell.tsx`

Strip header:

| Property | Result |
|---|---|
| font-family mono | ✅ MATCH |
| font-size `11.5px` | ❌ MISMATCH — `md:text-[11px]` |
| letter-spacing `0.14em` | ❌ MISMATCH — `md:tracking-[0.12em]` |
| text-transform uppercase | ✅ MATCH |
| color `--fg-faint` | ❌ MISMATCH desktop — `md:text-[color:var(--fg-body)]` |
| margin-bottom `12px` | ✅ MATCH — `md:mb-[12px]` |
| sub-run 1 `EDHREC averages` `#6A6152` | ❌ MISMATCH — `RECOMMENDED_MIX_SOURCE_LINE` at `10.5px` in `--fg-faint`, not `--fg-locked` |
| **sub-run 2 (new, draft only) `· reading the draft` in `--accent`** | ❌ MISMATCH — absent; the strip has no draft-aware header run and no copy key for it |
| wrapper padding `22px 26px 0` | ❌ MISMATCH — `px-[16px] py-[10px] md:px-[30px] md:py-[14px]` |

Cell row: display/gap ❌ (design `flex`·`12px`; impl `gap-[4px] md:gap-[8px]`) · cell flex `1` ✅ ·
cell background ❌ (`bg-surface-sunken`, design `--surface`) · cell border ✅ `1px --border` ·
radius ✅ `md:rounded-[9px]` · padding ❌ (`md:px-[14px] md:py-[11px]` vs `12px 14px`).

Cell internals:

| Property | Result |
|---|---|
| role label family / size / letter-spacing / transform / color | ✅ / ✅ `md:text-[10px]` / ❌ (`md:tracking-[0.1em]`) / ✅ / ✅ |
| role label margin-bottom `6px` | ❌ MISMATCH — spacing carried by the figure's `md:mt-[3px]` |
| figure row display / align / gap | ❌ MISMATCH — design `flex`·`baseline`·`6px` / impl one `<p>` with an inline denominator span |
| figure family / size | family ✅ · size ❌ (`md:text-[16px]` vs `19px`) |
| figure color below / at-or-over rec | ✅ MATCH — `roleCellState` supplies `--warning`/`--success` |
| denominator family / size / color | family ✅ · size ❌ (`11px` vs `12px`) · color ❌ (`--fg-faint` vs `--fg-locked`) |
| bar height / radius / background | ❌ (`h-[5px]` vs `4px`) / ✅ / ❌ (`bg-elevated` vs `--border`) |
| bar margin `8px 0 7px` | ❌ MISMATCH — `mt-[8px]` only |
| bar fill height / radius | ❌ `h-full` of a 5px track / ✅ |
| bar fill width (pct of rec, capped 100%) | ✅ MATCH |
| bar fill background warning/success | ✅ MATCH |
| footer row display / justify | ✅ MATCH — `md:flex md:justify-between` |
| bottom-left slot family / size / color | family ✅ · size ❌ (`text-[8px] md:text-[9px]` vs `10px`) · color ❌ (`md:text-fg-faint` vs `--fg-locked`) |
| bottom-left `was {n}` when the figure **moved** | ✅ MATCH — `pending.mixCellWas(was)` (`role-counter-cell.tsx:155`) |
| bottom-left `rec {n}` when **unmoved** | ✅ MATCH — `was={wasCounts?.[role] !== counts[role] ? wasCounts?.[role] : undefined}` (`role-counter-strip.tsx:105`) |
| bottom-right actionable `<a>` mono `10px` `consider →` `--accent` | element ❌ (a `<span>`; the whole cell is the button) · size ✅ `md:text-[10px]` · colour ✅ |
| bottom-right not actionable: mono `10px` `#6A6152` en dash `–` | ❌ MISMATCH — em dash `—` in `text-border-strong md:text-border-dashed` |
| `Why these numbers?` sans `13px` inline-block `mt 13px` `border-bottom 1px --accent` | ❌ MISMATCH — `StripRationale` draws it mono `11px` with `border-b border-accent-shadow` |
| same fold as the deck page's mix strip | ✅ MATCH — both sides go through `computeRoleCounts` (`page.tsx:87`) |

### Component: Tab row (the `Versions` tab) — **not implemented**

`builder-shell.tsx:840–856` builds three tabs: `deck`, `consider`, `games`. There is no `Versions`
tab, no `/decks/[id]/versions` route (`src/app/decks/[id]/` holds only `import/`, `loading.tsx`,
`page.tsx`, `search-action.ts`), and no `versionCount` threaded to the tab row. Every row of this
table is ❌ MISMATCH (absent). The copy key `history.tab` exists.

Rows that are trivially satisfied by the absence: "count at zero versions — the whole tab is absent"
✅ (it is always absent).

### Component: List toolbar (pending variant) — `group-toggle.tsx`

| Property | Result |
|---|---|
| wrapper padding `16px 26px 0` | ❌ MISMATCH — `px-[16px] py-[9px] md:px-[26px] md:pt-[14px] md:pb-[10px]` |
| display / align / gap / wrap | ✅ / ✅ / ❌ (`gap-[7px] md:gap-[10px]` vs `10px`) / ✅ |
| `All n` pill family / weight / size / color | ✅ / ✅ `font-semibold` / ❌ (`md:text-[13px]` ✅ desktop, `12px` mobile) / ✅ `--fg` |
| `All n` pill background / radius / padding | ✅ `--elevated` / ✅ `rounded-full` / ❌ (`md:px-[14px] md:py-[5px]` vs `7px 16px`) |
| `Shopping n` pill family / weight / size / color | ✅ / ✅ `font-medium` / ✅ desktop / ❌ (`--warning`, design `--accent`) |
| `Shopping n` pill border / radius / padding | ❌ (`color-mix(--accent 30%, --bg)`, design `1px solid --accent`) / ✅ / ❌ (`md:px-[14px] md:py-[5px]` vs `6px 16px`) |
| spacer `flex:1` | ✅ MATCH — line 131 |
| pending note | see "Toolbar note" above |
| `By type` (active) | family ✅ · weight ✅ · size ❌ (`md:text-[12.5px]` vs `13px`) · colour ✅ · bg ✅ · radius ✅ · padding ❌ (`md:px-[13px] md:py-[5px]`) |
| `By role` (inactive) | weight ✅ · size ❌ · colour ❌ (`--fg-faint`, design `--fg-faint`≈`#8E8269` ✅ actually MATCH) · border ❌ (`--border`, design `--border-strong`) · padding ❌ |
| toggle group gap `7px` | ✅ MATCH mobile (`gap-[7px]`) · ❌ desktop (`md:gap-[10px]`) |
| view-mode buttons / group gap | owned by the shipped `ViewToggle`; not re-verified (unchanged by this feature) |

### Component: Hero (over-cap treatment while a draft exists)

Recorded by the table as "reused unchanged; **nothing is blocked**". Verified only against the
feature's two assertions:

- over-cap treatment is reused, not replaced — ✅ MATCH (`spine-desktop.tsx`/`spine-mobile.tsx`
  untouched by `b80dd55`)
- commit not disabled under or over cap — ✅ MATCH — `pending-banner.tsx:150–155` states the figure
  and the CTA stays a live link
- ❌ **Element not in the design**: the banner draws its own `{total} / {bodySize}` figure
  (mono `11px`, `--warning` when over) that the design does not give the banner at all — the
  table's A6 row says the banner "says nothing extra" and puts that figure in the hero.

The remaining hero rows are pre-existing chrome the feature does not touch; not re-enumerated.

---

## Pass 2 — State reachability

| State | Verdict | Detail |
|---|---|---|
| A1 — Brew, below a full body | ✅ REACHABLE | `version` on `DraftState` (`draft-shape.ts:28`), assigned from `newestVersion(deckId)` (`draft-state.ts:109`); `bodySize` from `deckBodySize(deck.partner !== null)` (`builder-shell.tsx:228`); branch `pending-banner.tsx:71–72` returns `null`. No Versions tab exists to suppress. |
| A2 — Brew, at a full body | ⚠️ PARTIALLY REACHABLE | Triggering fields present and computed; branch at `pending-banner.tsx:72–83` renders `firstCommitCta` + `firstCommitNote` correctly. But the design requires the offer **in the spine beside `Export`**, and it renders inside the banner strip instead — the spine is never given the props. |
| A3 — Committed, clean | ✅ REACHABLE | `hasChanges(state)` (`draft-shape.ts:88`) covers basics-only edits; branch at line 90 renders `versionLine(number, formatDeckDate(committedAt))`. No empty diff panel, no reassurance line. `versionCount`/`currentVersion` satisfied by `state.version`. |
| A4 — Committed, 1–6 changes | ⚠️ PARTIALLY REACHABLE | `addChanges`, `removes`, `names`, `version` all present and computed; branch at line 109. **Missing props by type**: the table requires `adds[]` to carry `cost`, `holdingDeck` and `price`. `DraftAdd` (`draft-shape.ts:23`) carries `oracleId`/`needed`/`shortfall`/`bucket`/`heldBy` and **no mana cost, no price, no holder name** — `heldBy` is ids, and `readDraft` never loads `manaCost` or per-add prices in the non-`detailed` path (`draft-state.ts:160,183`). So the cost track, the price tag and the holding-deck hint are not renderable from this state at all. The counts group is also not rendered in this branch. |
| A5 — Committed, 7+ changes | ⚠️ PARTIALLY REACHABLE | `addCount`/`removeCount`/`changeCount` ✅ (`changeCount()`), `unfreeCount` ✅, `buyTotal` ✅ (`total`), `pullableCount` ✅, `currentVersion` ✅, `nextVersion` ✅ (line 67). Branch at line 123. Missing: the `Commit as v{n}` secondary control is not rendered in this density (line 166 gates it on `inline`), so a 7+ draft has **no commit affordance on the deck page** other than navigating to the review page. |
| A6 — Committed, over the cap | ✅ REACHABLE | `total > bodySize` drives `--warning` (line 152); commit path not disabled. `overBy` is not threaded, but the hero computes its own. Note the banner adds a figure the design does not draw. |
| A7 — Committed, under the cap | ✅ REACHABLE | Same fields; the banner is unchanged and the commit is not disabled. (The banner's own figure only warns when *over*, never when under — the hero owns the under-cap warning, as designed.) |
| A8 — Adds only | ⚠️ PARTIALLY REACHABLE | `counts()` (`deck-versioning.ts:35`) correctly drops the absent side **and** the `/`, and never prints `−0`. But counts only render in the 7+ branch, so at 1–6 changes the state has no rendering at all. |
| A9 — Draft with no type changed | ✅ REACHABLE | No Surface 1 element changes; nothing to verify. |
| A10 — Draft that moves no mix figure | ✅ REACHABLE | `wasCounts` computed in `page.tsx:86–88` from `loadVersionShape` through the same `computeRoleCounts`; the per-role equality test at `role-counter-strip.tsx:105` passes `undefined` when unmoved, so the cell keeps `rec {n}`. |
| A11 — A quantity changed only | ⚠️ PARTIALLY REACHABLE | `from`/`to` present on `DraftChange` and preserved in `addChanges`/`removes`; the banner renders `recountedItem` (`pending-banner.tsx:41–47`) and the row is ruled (the oracle id is in `pendingAdd.oracleIds`). Missing: the table also requires the **decklist row's** line to read `{name} {from} → {to}`; `DecklistRow` has no access to the pair (the `PendingAdd` context carries only a `Set<string>` and a label) and draws the bare name. |
| A12 — Draft equals the version again | ✅ REACHABLE | `changeCount === 0` → the clean branch; the banner is derived from `DraftState` with no announcement path anywhere. |
| D30 — Discard at rest | ❌ NOT REACHABLE | `discardCta` key exists and the control is implemented, but it is gated on the optional `onDiscard` prop (`pending-banner.tsx:23,171`) and **no call site passes it** — `builder-shell.tsx:805–810` mounts `PendingBanner` with `state`/`deckId`/`total`/`bodySize` only. The `Discard` control never renders in the product. |
| D31 — Confirming | ❌ NOT REACHABLE | No `DiscardConfirm` component; nothing opens a confirm. Copy keys and `discardDeckDraft` exist. |
| D32 — Confirming, from the review page | ❌ NOT REACHABLE | The `/decks/[id]/changes` route does not exist, so there is no apply bar. |
| D33 — Discarding | ❌ NOT REACHABLE | `discard.pending` key exists with no call site; no in-flight state is held anywhere. |
| D34 — Discarded | ❌ NOT REACHABLE | `discard.announced(n, version)` has no call site; no live-region message and no focus move to the deck name is wired. |
| D35 — Refused | ❌ NOT REACHABLE | `discard.refused` has no call site; no `MutationError` mount for the discard path. |

Cross-surface conditions:

- Arrival strip suppressed on a versioned deck — ✅ `update-entry.tsx:156` pushes the bare
  `/decks/{id}` when `result.versioned`, so `readUpdateArrival` finds no params and `UpdateStrip`
  does not mount.
- `draftPasteNotice(version)` above the import preview's groups — ❌ the key exists
  (`deck-import.ts:479`) with **no call site anywhere in `src`**.
- Top-off figures signed / banner total bare — ✅ the banner's total is bare (`money()` prints
  `{buy} to buy · {total}` unsigned).
- Exactly one Mana Pool link-out, in the commit sheet — ✅ vacuously; no link-out in the banner.
- Money figures = one query rendered three times — ✅ `readDraft` is the single reader; `loadDraftRows`
  reuses the same read.
- `revalidateClaims(deckId, userId)` after commit / discard / pull — not verifiable on Surface 1
  (no commit/discard UI); the helper exists at `src/lib/decks/revalidate-claims.ts`.
- Announcements on the **existing** live region, banner not a live region — ✅ no `aria-live` on the
  banner; no announcement exists to place.

---

## Visual gaps

1. `pending-banner.tsx:180–183` — banner container — **whole box treatment** — design: `10px` radius,
   `1px solid --border-strong` on all sides, `3px solid --accent` left rule, padding `13px 14px` /
   `15px 17px`, `margin-bottom 14px`, inside a wrapper padded `14px` / `18px 26px 0` →
   implementation: full-bleed strip, `border-bottom: 1px solid var(--border)` only, no radius, no
   accent rule, padding `10px 16px` / `12px 30px`, no wrapper.
2. `pending-banner.tsx:102–176` — banner body — **layout** — design: a stacked column (header row →
   money sentence / name list → controls row, each with its own gap and margin-bottom) →
   implementation: one horizontal flex row, `gap-[10px] md:gap-[12px]`, `md:flex-nowrap` where the
   design wraps on desktop.
3. `pending-banner.tsx:104` — banner label — letter-spacing — design: `0.14em` / `0.16em` →
   implementation: `tracking-[0.12em]`; font-size mobile `9px` vs `9.5px`; no `margin-bottom: 9px`.
4. `pending-banner.tsx:126` — counts group — **per-figure colour and size** — design: mono
   `15px`/`13px`, adds in `--success`, `/` in `--border-strong`, removes in `--warning`, its own flex
   row with `9px`/`8px` gap → implementation: one `12px` run in `--fg-body`.
5. `pending-banner.tsx:128` — "since" line — size / colour / placement — design: mono `10px`/`10.5px`
   in `--fg-locked`, its own item in the header row → implementation: `12px` `--fg-body`,
   concatenated into the counts paragraph after a `·`.
6. `pending-banner.tsx:137–142` — money sentence — colour `--fg-faint` vs `--fg-body`; no
   `line-height`, no `max-width: 700px`, no `margin-bottom`; and the money run is plain text where
   the design gives it mono `12`/`12.5px` in `--warning`.
7. `pending-banner.tsx:186–188` — primary CTA (`SOLID_CTA`) — design: sans `600`, `14px`/`13.5px`,
   cream `#E8E4D6` fill, radius `8px`, padding `10px 18px`, full-width on mobile → implementation:
   mono, unset weight, `12px`, `var(--accent)` fill, radius `7px`, `px-[14px]`, `flex-none`.
   The cream-not-brass fill is an explicit Contradictions ruling.
8. `pending-banner.tsx:166` — `Commit as v{n}` — **absent in the counts density** — design: a
   `--border-strong` outline secondary between the primary and `Discard` at 7+ changes →
   implementation: rendered only when `inline` (≤6).
9. `pending-banner.tsx:192–194` — `Discard` (`GHOST_CTA`) — design: sans `500` `13.5px` in
   `--fg-muted`, radius `8px`, `92px` fixed width on mobile → implementation: mono `12px` in
   `--fg-body`, radius `7px`, intrinsic width.
10. `pending-banner.tsx:110–122` — name-line list — design: `flex-direction: column`, `gap 5px`,
    `margin-bottom 14px` → implementation: `flex-wrap` horizontal run, `gap-x-[14px] gap-y-[2px]`,
    `m-0`.
11. `pending-banner.tsx:111–121` — name lines — **row anatomy absent** — design: `min-height 34px`,
    a `13px` mono sign gutter in `--success`/`--warning`, name `13px` `--fg` `flex:1`, and a `56px`
    cost-track slot with disc + pips → implementation: a plain text run; no gutter, no min-height, no
    cost track; name colour `--fg-body`/`--fg-faint` instead of `--fg`.
12. `pending-banner.tsx:112` — add line — **holding-deck hint and price tag absent** — design: mono
    `10px` `--fg-faint` deck name and a mono `10px` `--warning` price tile on `1px --accent-shadow`,
    radius `4px`, padding `1px 5px` → implementation: neither rendered; `pending.addPullHint` has no
    call site.
13. `pending-banner.tsx:109–122` — names density — **counts group absent** — design: "same box, same
    label, same counts" at ≤6 → implementation: no `+n / −n` rendered below `INLINE_CHANGE_MAX`.
14. `pending-banner.tsx:119` — remove hint — size `10.5px` vs `10px`; colour inherits `--fg-faint`
    where the design gives `--fg-locked`.
15. `pending-banner.tsx:157–175` — controls order at ≤6 — design: `Commit as v3` · `Discard` ·
    `review changes` → implementation: `review changes` · `Commit as v{n}` · `Discard`.
16. `pending-banner.tsx:195` — `review changes` link — design: `11px`, no underline, `--accent-hover`
    on hover → implementation: `11.5px`, `underline`, no hover rule.
17. *(component)* — **`DiscardConfirm` not implemented** — design: the banner's body replaced in
    place, `3px --danger` left rule, mono `9.5`/`10px` `--danger` question, `12.5`/`13px` `--fg-body`
    consequence with a `600` `--fg` emphasis run, and two buttons (cream `Keep editing`, `--danger`
    ink on `1px #4A2F28`) whose order inverts on phone → implementation: no such component.
18. `pending-banner.tsx:71–83` — `FirstCommitOffer` — **placement and chrome** — design: in the spine
    beside `Export`; ghost button sans `500` `13px` `--fg` on `1px --border-strong`, radius `8px`,
    padding `9px 16px`; note mono `10px` `--fg-locked`, `line-height 1.45` → implementation: inside
    the banner strip; mono `12px` `--accent` on a `--accent` border, radius `7px`; note sans
    `13.5px` `--fg-body`.
19. `group-toggle.tsx:142` — toolbar note — font-size — design: `11.5px` → implementation: `11px`.
20. `decklist.tsx:610` — add-list caption — font-size — design: `10px` → implementation: `10.5px`.
21. `decklist-row.tsx:45,264–268` — marked/unmarked row — design: `min-height 38px` desktop,
    `--surface` background, `1px solid --border` border, `9px` gap, `7px` ownership dot at both
    widths → implementation: `md:min-h-[34px]` (`52px`/`34px` with a meta line), `--surface-rail`,
    no border, `md:gap-[10px]`, `md:w-[8px]` dot. *(Pre-existing shipped geometry; the table records
    these rows as "unchanged by the feature" and its own Contradictions row notes the ranges
    disagree.)*
22. `decklist-row.tsx:264–268` — ownership dot ARIA — design (§Errata): dot `aria-hidden`, the
    **row's** accessible name carries the availability word → implementation: `label="Owned"` /
    `"Not owned"` makes the dot a labelled node.
23. `decklist-row.tsx:118–125` — recounted row — design: `{name} {from} → {to}` via `recountedItem`
    when `from > 0 && to > 0` → implementation: the bare name plus an `×N` glyph; the row has no
    access to the pair.
24. `decklist-group-header.tsx:46–52` — group heading — design: Cinzel `700`, `14px`/`16px`,
    `0.04em`, uppercase, `9px`/`11px` gap, `padding-bottom 8px`, `margin-bottom 10px`/`12px` →
    implementation: `font-sans md:font-display` `font-semibold`, `12.5px`/`15px`, no tracking, not
    uppercase, `gap-[6px] md:gap-[10px]`, `md:pb-[7px]`, `mb-[6px] md:mb-[8px]`.
25. `decklist-group-header.tsx:96` — group draft note — colour — design: `--accent` →
    implementation: `--fg-locked`.
26. `role-counter-strip.tsx:88–92` — mix strip header — **`· reading the draft` sub-run absent** —
    design: a second header run in `--accent`, `letter-spacing 0.06em`, drawn only while a draft
    exists → implementation: no draft-aware header run, and no copy key for one.
27. `role-counter-strip.tsx:63,78,96` — mix strip chrome — header `11px` vs `11.5px`,
    `tracking-[0.12em]` vs `0.14em`, desktop colour `--fg-body` vs `--fg-faint`, wrapper padding
    `12px 30px` vs `22px 26px 0`, cell gap `8px` vs `12px`.
28. `role-counter-cell.tsx:77–79,105,134` — mix cell — background `--surface-sunken` vs `--surface`,
    padding `11px 14px` vs `12px 14px`, figure `16px` vs `19px`, denominator `11px` `--fg-faint` vs
    `12px` `--fg-locked`, bar `5px` on `--elevated` vs `4px` on `--border`, no `margin-bottom 7px`.
29. `role-counter-cell.tsx:148–176` — mix cell footer — bottom-left `8px`/`9px` `--fg-faint` vs mono
    `10px` `--fg-locked`; not-actionable slot draws an em dash in `--border-strong`/`--border-dashed`
    where the design draws an en dash in `#6A6152`.
30. *(component)* — **`Versions` tab not implemented** — `builder-shell.tsx:840–856` ships three
    tabs; no `Versions · {n}` tab, no `/decks/[id]/versions` route.
31. `pending-banner.tsx:150–155` — **element not in the design** — the banner renders its own
    `{total} / {bodySize}` figure; the table's A6/A7 rows put that figure in the hero and say the
    banner "says nothing extra".
32. `group-toggle.tsx:91,107,121,124,169` — list toolbar (pending variant) — wrapper padding,
    desktop gap `10px` vs the pills' `10px`/toggle group `7px`, pill paddings (`14px/5px` vs
    `16px/7px` and `16px/6px`), `Shopping n` colour `--warning` vs `--accent` and its
    `color-mix(--accent 30%)` border vs `1px solid --accent`, `By type`/`By role` `12.5px` vs `13px`
    and the inactive border `--border` vs `--border-strong`. *(Pre-existing shipped toolbar.)*

## State reachability gaps

1. **D30 — Discard at rest** — the control exists but never mounts: `onDiscard` is optional and no
   call site supplies it — `pending-banner.tsx:23,171` / `builder-shell.tsx:805–810`.
2. **D31 — Confirming** — no `DiscardConfirm` component exists; nothing opens a confirm.
   Copy (`deck-versioning.ts:178–190`) and the server action
   (`src/app/decks/actions.ts:1376` `discardDeckDraft`) are both already in place.
3. **D32 — Confirming from the review page** — the `/decks/[id]/changes` route does not exist, so
   there is no apply bar to host it — `src/app/decks/[id]/`.
4. **D33 — Discarding** — `discard.pending` has no call site; no in-flight state exists —
   `deck-versioning.ts:187`.
5. **D34 — Discarded** — `discard.announced(n, version)` has no call site; no live-region message and
   no focus move to the deck name — `deck-versioning.ts:188`.
6. **D35 — Refused** — `discard.refused` has no call site; no `MutationError` mount on a discard
   path — `deck-versioning.ts:189`.
7. **A4 — 1–6 changes** — the props the table requires are absent from the **type**, not just the
   render: `DraftAdd` carries no mana cost, no per-add price and no holder *name*, and `readDraft`
   loads none of them in the non-`detailed` path — `draft-shape.ts:23`,
   `draft-state.ts:160,177–195`. The cost track, price tag and holding-deck hint are therefore
   unreachable rather than merely unstyled.
8. **A5 — 7+ changes** — the `Commit as v{n}` control is unreachable in this density; the only commit
   route for a 7+ draft is a navigation to a route that does not exist yet —
   `pending-banner.tsx:166`.
9. **A8 — Adds only** — reachable at 7+ only; at 1–6 changes no counts render, so the
   zero-suppression behaviour has no surface — `pending-banner.tsx:109–122`.
10. **A11 — Quantity changed only** — half reachable: the banner prints `recountedItem`, the row does
    not. `PendingAdd` carries `Set<string>` + a label and no `from`/`to`, so `DecklistRow` cannot
    render the pair — `pending-add.tsx:8–13`, `decklist-row.tsx:200–201`.
11. **Cross-surface: import preview on a versioned deck** — `draftPasteNotice(version)` exists in
    copy with no call site anywhere in `src` — `src/lib/copy/deck-import.ts:479`.

## Notes (unconfirmed / out-of-scope / copy-review items)

- **Unconfirmed by Design, not counted as gaps**: the plum group-heading rule `#574463` and the black
  pip `#5B5566` (ambiguity 5 — traced values the handoff flags as the shipped page's to settle). The
  implementation's `var(--border)` heading rule is therefore recorded, not scored.
- **Resolved via §Errata, treated as authoritative over the canvas**: (a) the pending rule is **2px**,
  not the `3px` in §Surfaces — implementation matches; (b) **no padding absorption** — the mark is an
  inset box shadow and the row's padding is untouched, so the canvas's `0 9px 0 7px` /
  `0 8px 0 6px` figures are not scored; (c) cost-track geometry is the shipped `PIP_TRACK = 40` /
  `PIP_CAP = 5`, not the canvas's `90`/`76px` slots — implementation matches and passes both
  explicitly; (d) the grouping modules need no extraction — implementation reuses them; (e) the
  full-body test is `deckBodySize(hasPartner)` — implementation matches, derived once.
- **Ambiguities with no value to verify against** (ambiguities 1–7): no phone frame for the ≤6 names
  density, the toolbar, the mix strip or the group-heading note; no hover/focus-visible/active for
  any banner control; no responsive copy variant for the truncated phone label and "since"; the
  `Versions` count at 390px; no `disabled` styling; no focus order beyond the three named accessible
  names. Nothing scored against these.
- **Unresolved contradiction, both sides implemented**: the pending sentence's placement. The design
  bundle ships `addListCaption` *and* `toolbarNote` as separate strings; the implementation renders
  both (caption above the list, note in the toolbar's right slot), which satisfies the table's "both
  recorded" without choosing.
- **Out of scope (copy review)**: no wording differences are reported. Structurally, every copy key
  the table names exists in `src/lib/copy/deck-versioning.ts` with interpolation slots that match its
  call sites. Keys with **no** call site are reported as reachability gaps, not wording issues:
  `pending.addPullHint`, `discard.pending`, `discard.announced`, `discard.refused`,
  `discard.question`, `discard.consequence`, `discard.confirm`, `discard.cancel`, `history.tab`,
  `deckImportCopy.update.draftPasteNotice`.
- **Hex vs token**: this codebase redefines every colour per theme (six themes in
  `src/app/globals.css`), so colour rows are scored on token identity. `--bg: #14110E` confirms the
  primary-ink value; `--surface-rail` is `#1A1611` in the default theme against the canvas's
  `#1A160F`, a one-digit drift in shipped tokens that is out of this feature's scope.
- **Pre-existing shipped chrome, recorded but not this feature's to fix**: gaps 21, 32 and the
  unfixed halves of 27–29 describe surfaces the table itself marks "unchanged by the feature" (row
  slots, list toolbar, mix-strip chrome, hero). They are listed for completeness because the table
  carries rows for them.

VERDICT: 32 visual gaps, 11 state gaps

---

## Pass 3 — Confirmation (after the Surface 1 build)

Checked only the items above, against the tree this PR ships. No open-ended re-discovery.

**Closed in this PR — visual gaps 1–16, 18, 19, 20, 22, 23, 25, 26, 31; state gaps A4, A5, A8, A11.**

Load-bearing notes:

- Gap 7's cream fill is `bg-[color:var(--fg)]`, not the canvas's literal `#E8E4D6`. This codebase
  redefines every colour per theme, and `--fg` is the token the shipped `button.tsx` PRIMARY already
  uses for a bone fill. Scored on token identity, per the Hex-vs-token note above.
- Gap 18 moved the offer out of the banner entirely: `first-commit-offer.tsx`, mounted beside
  `Export` in **both** spine widths, gated by `offerFirstCommit` threaded from `builder-shell.tsx`.
  The gate reads `counts.total >= bodySize` rather than `===`, so an over-size brew is still offered
  its v1 — an over-cap list is committable, and withholding the offer would strand it.
- Gap 31 retired the banner's `total`/`bodySize` props with the figure they fed. The body count is
  the hero's, and the first-commit gate that also read them now lives in the shell.

**Still open, by design, and each owned by a later PR in this feature:**

| Item | Owner |
|------|-------|
| Visual 17, state D31–D35 (`DiscardConfirm` and its five states) | PR 5 |
| State D30 (`onDiscard` has no call site) | PR 5 |
| State D32, and the `/decks/[id]/changes` route every commit CTA here links to | PR 4 |
| Visual 30 (`Versions · {n}` tab) | PR 6 |
| `deckImportCopy.update.draftPasteNotice` — still no call site | PR 4 |

**Not this feature's to fix:** visual gaps 21, 24, 27, 28, 29, 32 — pre-existing shipped chrome the
table itself marks "unchanged by the feature".

VERDICT: 0 in-scope gaps remain
