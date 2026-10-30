# The 99 — Where deck analysis lives (design handoff · R1, Round 0 of 5)

> **Start with `HANDOFF.md`.** It carries the settled decisions, the outstanding punch list and the
> asset index. This file is the long-form component spec and is accurate on everything it was
> written for — but the sections describing the *verdict ladder*, *section F* and the label
> "Bracket — your cards permit" predate the final round and are superseded by `HANDOFF.md` where
> they disagree. The source-grounded component tables (deck tile, deck page header, phone header,
> art wash, status pill, IdentityPips, buttons, card-details control) are current.

**Round 0 draws no component.** It decides where deck analysis sits, how it composes with what the
deck page already carries, and what the synopsis's slot does when there is no sentence to put in it.
Rounds 1–4 are briefed against this frame.

**Source of truth:** `docs/superpowers/design-briefs/2026-09-19-where-deck-analysis-lives.md` on
`spec/deck-analysis-foundation` (PR #746, open), read at `ea00e8c8`. Spec:
`docs/superpowers/specs/2026-09-19-deck-analysis-foundation-design.md`, §11.1 for the round structure.

**File:** `The 99 - Deck Analysis Frame.dc.html` — canvas (pan/zoom), with a **theme prop**:
amonkhet and kamigawa, as asked.

**Grounded in, and re-read on the branch:** `builder-view.ts:14`, `builder-tabs.tsx`,
`role-counter-strip.tsx`, `role-counter-cell.tsx`, `changed-strip.tsx`, `mix.ts` (`ROLE_ORDER`,
`RECOMMENDED_MIX`, `RECOMMENDED_MIX_SOURCE_LINE`), and the September 12 brief. Visual vocabulary is
the tokenised one in `design_handoff_the99_deck_details_wash/` — **every colour on the canvas is a
`var()`**, no literals, so it re-themes.

> **R1 supersedes a withdrawn first attempt.** That draft was drawn on the retired brass palette
> (`#C9A24B` literals, pre-rebrand type) and proposed a single always-visible region above the tab
> row. Both are gone: the palette because it is two systems out of date, the region because it
> spends a screen of vertical on every visit to every deck.

---

## The five calls

| # | Call | Answer |
|---|---|---|
| 1 | Where analysis lives | **A tab — second**, between Your deck and Consider. Not last, not a section, not a route. |
| 2 | How the strips coexist | **The Recommended mix strip moves into the tab.** The art band and the version line do not move. |
| 3 | The synopsis's slot | **First block of the tab, beside the verdict.** Four states, none of which reserve space. |
| 4 | Before there is data | **Print what is known, dash what is not.** No full-tab empty state, ever. |
| 5 | The altitude | **The bracket chip travels** — deck band and deck tile. Nothing else does. Home gets nothing. |

### 1 · A tab, and it is the second one

`deck · analysis · consider · games · versions`.

The tab row is a reading order, not a shelf: the list, what it adds up to, what to add, how it
played, what it was. Analysis belongs where the question is asked — **immediately after reading the
list and before going to Consider** — and putting it fifth would bury the one tab that gives the
other four a reason to be pressed.

**Five tabs is the cost and it is affordable because the strip leaves.** Above the tabs the page
becomes the art band, one version line, and the tabs; the decklist starts about **150px higher** on
desktop and considerably higher on the phone. The page gets shorter by adding a tab.

At 390px the row **scrolls horizontally** rather than shrinking type or abbreviating labels. Analysis
at position two is never the cell that scrolls off; Versions is, and it is the one visited least.

**Rejected:**

- **A section above the tabs** (drawn as `1b` on the canvas, so the cost is visible rather than
  asserted). It reads as the generous option and is the expensive one: a player who came to fix one
  card reads a verdict, a synopsis, five receipts and five mix cells first, on every deck, every
  visit. It also leaves two unlabelled strips stacked above the tab row with no room for the four
  figures still to come.
- **A route of its own.** Ruled out by the user; it would also be the only builder destination that
  takes the deck off screen, which `builder-tabs.tsx` explicitly undid for Versions.
- **A fifth tab in last position.** Same content, worse discovery, and it puts the newest thing
  behind the phone row's scroll.

### 2 · The mix strip moves; the band and the version line stay

`RoleCounterStrip` is analysis — five figures measured against a recommendation — mounted above the
tabs before there was anywhere else to put it. It moves **whole**: same component, same cells, same
`consider →` behaviour, same `Why these numbers?` disclosure, same phone cell. **Only its address
changes**, and no ruling in this handoff amends it.

The **commander art band** and the **`v1 · committed` line** stay exactly where they are.

**The fold is by comparator, not by feature.** Every block in the tab is headed by what it is
measured against:

| Block | Measured against |
|---|---|
| The verdict + receipts | the bracket rules |
| Recommended mix | EDHREC averages |
| The four figures *(reserved)* | nothing — description |

That one line per block is what tells three rows of small numbers apart at a glance. It costs a line
per block rather than a word per cell, so the cells stay as dense as they are today — and a fifth
claim next year costs a block, not a tab.

**The what-changed strip is not in this tab.** It measures a draft against a committed version,
which is Versions' question, and it can vanish (no draft, no comparator). It stays where deck
versioning puts it.

### 2b · The synopsis names cards, and the cards are live

Every card the sentence names is a **`CardDetailTrigger`** wrapped in **`usePreviewRow`** — the
shipped pair. Hovering previews the card (`HoverPreviewProvider`, #351: 252×352, 240ms in / 80ms
out, follows the pointer, flips at the viewport edge, `aria-hidden`, desktop only); clicking opens
the card modal. **No new mechanism, no new component** — the analysis panel mounts one
`HoverPreviewProvider` exactly as the decklist does.

Not too noisy, because of what the surrounding prose already is: the sentence is four lines, it
names four or five cards, and a reader's pointer is not travelling through it the way it travels
down 99 rows. The 240ms open delay does the rest.

**On the phone there is no preview** — the provider is `hidden md:block` and gates on
`(hover: hover)` — so a tapped name goes straight to the modal. That is the shipped behaviour of
every other card name in the app and needs no exception here.

**Ink:** `--fg` with a 1px dotted `--accent` underline. Not a solid underline (that is a link out)
and not accent-coloured text (five accent words in a paragraph is a ransom note).

### 3 · The synopsis

**First block of the tab, prose left, verdict right.** Not under the deck name, not in the version
strip. Tying it to a commit was considered and dropped — on the user's own reasoning, and it is
ratified here as a rule: **analysis reads the live list, not the committed version**, because
reading a pile mid-build is when it is most useful. A deck at 62 cards gets a verdict with `of 62`
as its denominator, not a lockout.

Prose and figure sit **side by side, not stacked**: a reader takes one or the other — the sentence is
for someone who does not know the deck, the verdict for someone who does — and stacking makes one a
preamble to the other.

Four states, plus the not-yet-read case. Full matrix in `STATES-synopsis.md`. The rule that governs
all of them: **the verdict column is identical in four of the five**, because it is counted from the
list and does not depend on a generation. A missing sentence never takes the figures down with it.

### 3b · The verdict was read from — a ladder, not five counts

The receipts were five cells reading `0 of 99`. **The denominator on a limit is the limit**, not
the deck, and nobody has 99 game changers — so `of 99` is gone and each row instead shows **which
brackets its count allows**, as a five-cell ladder in the bracket colours.

That answers the question the old cells could not: *how does "game changers" play into the bracket?*
It plays in by **ruling brackets out**. The verdict is the column where every row still agrees —
drawn as a summary row, **Where they agree**, at the foot of the table. A reader can see the range
being produced rather than being told it.

- **A lit cell is permission, not a score.** Colour-mixed at 18% with a 45% border, in that
  bracket's own colour.
- **Tutors are dashed at every bracket** and tagged `not a gate`: a guide the rules do not cap. A
  solid row would have implied a limit that does not exist.
- **The tone shift happens at the limit**, the way the mix strip's does: a row whose count exceeds
  a bracket's allowance goes unlit there, and that unlit cell is the entire mechanism by which a
  deck is pushed up a bracket.
- **The intersection is the verdict, and the range falls out of it.** 1 and 2 both survive every
  row, so the cards permit either; 3–5 are drawn hollow and labelled *allowed, but above what you
  built* — legal, not descriptive.

### 4 · Before there is data

**No full-tab empty state.** The mix needs no index run, so it is simply true and simply drawn. The
verdict slot takes the **shipped in-flight treatment of the role cell** — em-dash numerator, its
denominator still drawn (`— of 99 read`) — so it reads as not-yet rather than as nought.

### 5 · The altitude

**One chip, one meaning, two altitudes.** `Bracket 1–2` as an outlined accent pill, in the deck
band's badge row beside `Complete`, and in the deck tile's existing meta line on `/decks`. Tapping
either lands on the Analysis tab.

- **The range travels as a range.** Never rounded up for a tidy column — rounding a declaration the
  player has not made is the app making it for them.
- **A deck we have not read draws no chip**, not a dash. At list altitude absence is quieter and says
  the same thing.
- **Home gets nothing.** A bracket does not roll up. The only candidate later is a *violation*, which
  is Round 2's to define; this round reserves no space for it.

**deckcheck was read, not copied.** Its bracket pill is worth taking — a real classification with a
published rule set. Its **Threat Index is refused**: a single index over a deck is the blended score
§2.2 forbids, and a permanent `TBD` slot is a promise a page should not make.

---

## The two §6 locks, and where each is drawn

- **A verdict is sometimes a range.** Four verdict states are drawn at one size in one box
  (section D): undeclared range, declared-within-range, single number, and the reserved violation
  shape. `1 or 2` takes the same display face `4` takes — **no dashed border, no warning ink, no
  *incomplete***. The only thing a range adds is one neutral button, and **that button is
  permanently skippable**: a deck left as a range has been answered.
- **Every figure carries its denominator.** Receipts are cells with the count and its denominator in
  one element and the rule it is measured against on a third line. Nothing hovers, nothing expands to
  reveal a denominator, nothing is a footnote.

---

## Component notes

No new token, no new hex, no new empty state, no modal, no toast. Hexes live in `globals.css`.

| Component | Spec |
|---|---|
| **Tab row** | Unchanged `BuilderTabs`, one cell added at index 1. `Analysis`, **no count** — there is nothing countable, and a count would imply items. 44px min, 2px `--accent` underline when selected. Phone: row scrolls, no abbreviation. |
| **Bracket chip** | The meter chip — see *The bracket mark*. In the band's badge row and the tile's meta line. Absent when unread. |
| **Verdict block** | Always crown + numeral + name — no surface draws a bare numeral. |
| **Verdict block, detail** | `--surface` on `1px --border`, radius 12px, padding `16px 18px`. Mono 9.5px uppercase `--fg-faint` label; figure in `var(--display)` 800 at 38px desktop / 32px phone, `--accent`; 13px `--fg-muted` reading; one neutral outline button (38px desktop, 44px phone). |
| **Verdict ladder** | One table, `1px --border`, radius 11px. Columns `190px / 96px / 1fr / 210px`; header and footer rows on `--surface-sunken`. Cells 26px tall, radius 5px, `color-mix(bracket 18%)` on a 45% border when allowed, `1px dashed --border-dashed` when the row is not a gate, bare `1px --border` when disallowed. Footer cells 30px and carry the numeral. **No `of 99` anywhere.** Phone: the same rows at 13×18px cells, label and rule stacked. |
| **Bracket mark on a deck tile** | Rides the footer’s **chip cell, immediately after `StatusPillBadge`**, at **22px** to match the pill’s height so the row’s baseline does not move. The grid gains one `auto` track, **held at 22px even when empty** — a collapsing track would shift the bar left on unread tiles alone and ripple across the grid, so the reservation keeps bars aligned row to row. Not the identity block (which gave up its pill to carry identity alone) and not the right column (count, and last-played below it on desktop). |
| **Synopsis** | 15.5px `--fg-body` at 1.7 desktop, 13.5px phone, `text-wrap: pretty`. No quote marks, no byline. Mono 10px `--fg-faint` provenance: *written against all 99 · 2 minutes ago*. Phone truncates at three lines with `read the rest`. |
| **Stale tag** | Mono 9.5px uppercase `--warning` on `1px --warning`, radius 999px. Sentence demotes to `--fg-faint`. Verdict is marked **recounted just now**. |
| **Refusal tag** | Mono 9.5px uppercase `--danger` on `1px --danger`, radius 999px. **The only `--danger` on the surface** — not the border, not the button, not the text. |
| **Mix strip** | Shipped `RoleCounterStrip` / `RoleCounterCell`, unmodified, at a new mount point. |
| **Composition study (F)** | Draws the same ladder and the same three-section ledger as the Analysis tab, abbreviated for the study (17px ladder cells, numerals-only header; the ledger’s three ruled sections across one 230 / 1fr / 250 row, 8px tally squares, colours collapsed to Black / Colourless / the four empties). **F is a placement study and never diverges from A in treatment** — only in scale. |
| **What-changed strip** | Shipped `ChangedStrip`, unchanged, staying in Versions. Before figure, arrow and verdict note are `--fg-locked`, as the component draws them. Drawn in section F only so the four claimants can be seen on one deck. |
| **The ledger** | The **Deck Stats R3** block, mounted whole: three ruled sections (*On the table*, *The curve*, *The colours*), Cinzel 12.5px heads with a `--border-strong` rule and the section's denominator at the right. Curve is a unit tally — one 13px square per card, `--accent` on the modal column and `--accent-mid` elsewhere. Colours are six leader rows on one ruler; a colour at 0 dims to 0.4. |

**Ink floors.** `--fg-disabled` appears nowhere in specified content — it is reserved for this canvas's own margin annotations and for the in-flight dash. Anything a reader is meant to read is `--fg-faint` or better; `--fg-locked` is used only where a shipped component already uses it (the mix cell's phone caption, the what-changed before figure, arrow and note).

## The bracket mark

### The names are Wizards', and we say them verbatim

WotC and the Commander Format Panel published the five brackets in February 2025 —
**1 Exhibition · 2 Core · 3 Upgraded · 4 Optimized · 5 cEDH** — expressly so a deck&rsquo;s level reads
the same in a playgroup, a tournament and an app. That shared vocabulary *is* the system. Every app
showing those words is quoting the same source. Not a design decision, and not ours to improve.

### The mark is ours: one diamond, ornamented by rank

The five-rung crown was honest and too wide — a chip has to survive a deck tile, a filter row and a
phone band. **One diamond carrying the numeral**, at a fifth of the width, with the *elaboration*
carrying the rank where the count used to:

| Bracket | The mark |
|---|---|
| 1 Exhibition | hairline outline, numeral in the bracket colour |
| 2 Core | solid fill, numeral knocked out in `--bg` |
| 3 Upgraded | solid + an inset `--bg` ring at 55% |
| 4 Optimized | + four satellite diamonds at the points |
| 5 cEDH | + an outer hairline frame at 40% — the full crown |

**Geometry.** A square rotated 45° occupies `side × √2`, so the largest core that FITS a box of `S`
is `S/√2 ≈ 0.707S` — every ratio below is derived from that ceiling, not chosen:

| | |
|---|---|
| box | `S × S` — identical at every rank |
| core | `0.70S` (`0.60S` at 4–5, to clear the satellites) |
| numeral | `max(10px, 0.40S)` Cinzel 700 |
| satellites | `0.10S` at `0.43S` offset — outer edge lands at `0.48S` |
| tier-5 frame | `0.70S` at 45% |
| inset ring | `0.68 × core` in `--bg` at 50% |

Drawn at **22 / 26 / 36 / 44px** — tile *and band*, chip, verdict, reference. **Those four are the
only sizes the document draws** (383 marks, audited): 22 is the height of `StatusPillBadge`, which the
mark sits beside in both the tile footer and the deck-page meta row, so **22 is the size at both
altitudes** — there is no separate band size. **22px is derived, not chosen:** it
is the height of `StatusPillBadge`, which the mark sits beside in the deck tile’s footer row.

**Two forms, ten files, one folder.** `assets/` holds the full mark and a chip form for each rank —
`bracket-{rank}-{name}.svg` and `-chip.svg`. The full mark is drawn at 26 / 36 / 44; **at 22 the chip
form is drawn instead.** `bracket-5-cedh.svg` is the R6 reissue (rank 4's studs closed into a third
ring); the pre-reissue file is gone. **The chip rule, as amended in R9: one ornament per rank,
chosen to survive 22px** — the chip sheds every ornament below the rank's own, and where that
ornament does not survive 22px it is drawn at the chip's own radius instead of dropped. So 2 is the
ring alone (no core), 3 is four spokes, 4 is studs, 5 is the closed ring. **Both 22px collisions
(1-vs-2 and 3-vs-4) are closed**; full statement in `assets/ASSETS.md`, which is normative on sizes.

**The floor is 20px, and it is a hard one.** A numeral has to fit the inscribed square of a
45°-rotated core — about 0.70 × core — so the mark cannot hold a readable digit below ~20px however
the ratios are tuned. **Below 20px we draw no mark at all:** the bracket is the numeral alone in its
own colour. No ornament, nothing to squint at, and the digit still carries the rank. Any surface
that cannot give the mark 20px gets the numeral, never a shrunken diamond.

**Ornament, not size.** Every rank occupies exactly the same box. A mark that grew with rank would
break every row it sits in, and bracket 5 is not more important than bracket 1 — it is a different
evening. What changes is how worked the surface is, which is a rank language older than software.

**Degradation is designed.** At 22px the satellites read as weight rather than four distinct
diamonds — the correct failure, since the numeral stays legible and 5 still looks heavier than 1.
The numeral lives *inside* the mark wherever one is drawn and *is* the mark below 20px, so colour
and ornament are never the only carriers.

### Two variants of the mark — II · Filigree adopted (A3 on the canvas)

Both on exact SVG geometry — a 40-unit box, vertices on the axes, **stroke included in the fit**, so
the outermost ink of every rank lands inside the box. This **supersedes the CSS-rotated marks
elsewhere on the canvas**; those are regenerated from the selected variant.

**The numeral is specified in rendered pixels, not units.** A fixed unit size scales with the box and
silently breaks the 10px floor at tile size, so the glyph computes
`font-size = max(10px, 0.40S) × 40 / S`. Verified: 40 marks, zero bbox violations, zero numerals
under 10px.

| | I · Filled (current) | II · Filigree |
|---|---|---|
| core | half-diag 14 (11.5 at 4–5); fills from rank 2 | half-diag 11.5 at every rank; never fills |
| 2 | solid | + hairline echo at 14.1, 55% |
| 3 | + inset `--bg` ring at 0.66 × core | + ticks from 15.3 to 15.9 |
| 4 | + filled satellites at 15.5, half-diag 2.2 | + hollow satellites at 17.2, half-diag 1.6 (outer stroke edge 19.35) |
| 5 | + frame at 19.5, 45% | + a cusp outside each edge |
| numeral | 16 units Cinzel 700, `--bg` on fill (bracket colour at 1), dy 0.5 | always the bracket colour — one ink throughout |
| floor | 24px | 24px — the refitted ornament clears tile size |

**ADOPTED: II · Filigree**, and every mark in the document is now drawn from it. Lighter, more engraved, closer to the logo’s own line weight — and one
ink throughout, which is what lets a metal palette work without gradients (below). The numeral
carries a per-digit correction: **`dx="-1.8"` on 4 only**, since Cinzel’s 4 has a wider left
sidebearing and a true centre sits optically right.

### Colour — six progressions studied, 2e adopted

| | Progression | 1 · 2 · 3 · 4 · 5 |
|---|---|---|
| ~~**2a Temperature**~~ | cool → hot, flat pigment | fails: rank 5 3.27:1, rank 3 (accent) 3.95:1 |
| **2b Metal** ✦ | stone · bronze · silver · cooled gold · blued steel | `#8A8A80 #B07B4A #B9BFC6 #D4BC63 #7E8695` |
| ~~**2c Dusk**~~ | bright → dark | fails: 3.00 / 2.15 / **1.68**:1 |
| ~~**2d Tide**~~ | seafoam → deep water | fails: rank 4 4.00:1, rank 5 2.82:1 |

Each is drawn at reference size, as chips, and **on the real deck tile at 22px** — the size the mark
ships at beside a status pill, and where a palette actually fails. (Below **20px** no mark is drawn
at all; the bracket is the numeral alone.) All four sit in a 2×2 grid so they are compared at
equal width. **2d** is the only option that never touches red or amber, so it can never read as
`--warning` / `--danger`; its cost is giving up the accent-at-3 anchor, and 4 vs 5 is the closest pair of any
option. The document is currently drawn in **2a**; kamigawa carries the same progression in neon.

### The requirement is escalation — named late, after four palettes missed it

All four first-pass reactions share one note: **the mark should get hotter as the bracket climbs, and
rank 5 should be the brightest thing on the tile.** 2a is liked *because* 5 burns; 2c and 2d fail
*because* 4–5 fade; 2b fails because nothing escalates. The first four were designed to be
*distinguishable*, which is a weaker goal.

**Why escalation kept failing:** the hot end of the wheel is taken — `--danger` owns red-orange,
`--warning` owns amber, Low Sun's accent owns brass. A five-*hue* ramp ending hot lands on a
semantic or an accent. **The way out is to escalate on brightness inside one family** instead of
travelling the wheel: rank 5 can be the brightest mark on the page without being red.

| | Progression | 1 · 2 · 3 · 4 · 5 |
|---|---|---|
| **2e Ignition** ✦ | one family, warm ash → white heat | `#8A857C #A89A74 #C9AC62 #E6D08A #FBEFC6` |
| **2f Temperature, pinned** | 2a with rank 3 off `--accent`, 5 brightened | `#6E9C8F #7E9FC4 #D08A57 #DE6B3C #EF4F4F` |

**Measured across all twelve grounds, three of the six fail: 2a, 2c and 2d.** This is the
measurable form of the “4 and 5 get lost” note — those ranks sit under the legibility floor, so a
ramp that darkens as it climbs travels the one direction the floor forbids. **The whole descending
family is out.** Survivors: 2b (does not escalate), 2e, 2f.


**Measured worst case, all twelve grounds** (`--surface-inset` + `--surface-sunken` × six themes):

| | per rank 1–5 | worst |
|---|---|---|
| **2e** | 4.68 / 6.16 / 7.81 / 11.24 / 14.92 | **4.68** at rank 1 |
| **2f** | 5.57 / 6.25 / 6.09 / 5.13 / 4.82 | **4.82** at rank 5 |
| **2b** | 4.93 / 4.72 / 9.26 / 9.13 / 4.68 | **4.68** at rank 5 |

2e and 2b are joint-tightest; 2f has the most headroom of the three. All clear the floor.
**DECIDED: 2e Ignition.** The whole document is drawn in it, and `--bracket-1…5` now hold the same
five hexes in every theme — brackets are the format’s vocabulary, so they do not re-theme, on the
`--w/--u/--b/--r/--g` precedent. The status matrix settled the last two candidates: rank 4 beside a
`--danger` pill and rank 5 beside `--warning` is where 2f stops reading as a bracket.

**Why it wins.** It climbs, cEDH is the brightest mark on any
tile in any theme, it is constant across all six so it is learnable, it never touches `--danger` or
`--success` (both present in the same footer row), and ash-brass-lit-gold is Low Sun's own material.
### The contrast floor is a rule of the mark

**The numeral is text, so every rung owes 4.5:1 — in every palette.** It sits inside the mark in the bracket’s own
colour, which puts a **hard floor under rank 1** — it cannot be made quiet by being made darker. The
first cut sat at 3.2:1 on all six themes; rank 1 is now `#8A857C`, the darkest warm ash clearing
4.5:1 on the lightest ground, with the ramp above re-cut so luminance climbs strictly. **All five
clear 4.5:1 on all twelve grounds** (`--surface-inset` and `--surface-sunken` × six themes).

**That improves the idea rather than compromising it.** With the bottom floored, quietness at rank 1
is bought with **chroma, not darkness** — near-neutral ash — so all the escalation happens at the top
where there is headroom: **rank 5 is 3.65× rank 1’s luminance** and carries nearly all the chroma.

**2f is the honest alternative** if the first-pass favourite is preferred, at a real cost: rank 5 sits
near `--danger` and ranks 3–4 sit on Low Sun's brass — on a tile whose detail row can print `4 over`
in `--danger`, a cEDH mark that reads as a warning is the confusion worth avoiding.

### Superseded: 2b Metal — the argument from the six accents

*Kept for the reasoning, not the conclusion. The theme-independence finding below still binds and is
carried into the board; the pick does not, because 2b is the one palette that deliberately does not
climb.*

The themes’ accents are `#CF8745` brass, `#FF4D9A` magenta, `#A3C445` yellow-green, `#52827A` teal,
`#AE88E6` violet, `#5C86C9` blue. **They occupy the whole hue wheel, so no hue ramp is safe** — Tide
lands on phyrexia and kaldheim, Dusk on eldraine and amonkhet, Temperature on amonkhet, and
Temperature also anchors bracket 3 to `--accent`, so its colours change per theme and stop being
learnable.

**The precedent is in the token block:** `--w --u --b --r --g` are identical hexes in every theme,
because mana colours are the format’s vocabulary rather than ours. **Brackets are the same kind of
thing** and should likewise be one constant, theme-independent set.

That makes **2b Metal** the answer — the only option that is not a hue ramp. Stone, bronze, silver,
gold, iron read as *material* at low chroma, so they compete with no accent anywhere on the wheel
and need no per-theme re-tuning.

**Both amendments are now drawn in** (2b and the colour board): cEDH is blued steel `#7E8695`
rather than a jewel, which abandoned the metal story and landed on eldraine’s violet; and the gold
at 4 is cooled to `#D4BC63`, off amonkhet’s brass.

**The colour board** draws all four palettes across all six themes — each cell on that theme’s real
`--bg`/`--surface`/border/text ramp and display face, carrying a decks-list row plus the five ranks at
chip size. It is what shows 2a to be six different palettes rather than one. **On Filigree the gradients largely disappear** — an unfilled mark is stroke and ornament, so
each metal resolves to one line colour, which retires the “gradient is a new idiom” objection. II +
2b is the pairing.

**If a hue ramp is wanted anyway: 2d Tide**, accepting that it must be re-tuned in phyrexia and
kaldheim — which is precisely the theme-independence being given up.

### Looked at, and not taken

A 1–10 power score (the thing the bracket system exists to replace); a gauge or speedometer, which
turns a declared intent into a measurement; a Threat Index, which is a blended score and forbidden
here for the same reason as everywhere else on this tab. **Kept from the wider ecosystem:** printing
the numeral *and* the name together.

## The deck page header, from source

Drawn from `src/components/decks/spine-desktop.tsx` (via `builder-spine.tsx`).

| | |
|---|---|
| header | `minHeight 288`, `border-bottom 1px --border`; the band is the header |
| row | `flex`, **`items-end`** (both columns read up from the band's foot), `pl 364` (592 above a 1200px **row**), `pr 24`, `pb 18`, `gap 18` |
| title column | `flex-1 basis-[280px] min-w-0` — a stated basis, so a wide action column takes the deficit rather than collapsing the title to 0 |
| name | display face **700 / 21px / 1.2**, `--fg`, 2-line clamp; the `✎` rename glyph is a **sibling**, 14px, `margin-left 6`, `--fg-muted` |
| meta row | `gap 10`, `margin-top 3`, `flex-wrap` — `IdentityPips size 10` → `{commander} · {Colour}` in mono 11px `--fg-body` → `StatusPillBadge` (radius 6, `px 8 / py 3`, mono 11px) |
| bar row | `gap 10`, `margin-top 7` — track `flex-1 max-w-[170] h-6` radius 999 on `--elevated` with `inset 0 0 0 1px rgba(0,0,0,.4)`; then `built` mono 600/15px and `/ {bodySize}` mono 13px `--fg-faint` |
| actions | `flex-wrap justify-end gap 9` — **`Update from a list`** (ghost, h32, px14, 12.5px) and **`Export`** (the one filled button, bone: `--fg` plate, `--bg` label) |

**No ink here carries a shadow** — every string starts past the portrait's flat stop, on the row's
own ground. That is what makes `labelAtPx: "flat"` safe.

### The action buttons

From `src/components/ui/button.tsx`. The primitives own **nine properties only** — fill, text
colour, border, font-family, font-weight, radius, hover, transition, cursor — and deliberately leave
padding and font-size to the caller, which is why the spines pass geometry alone.

| | |
|---|---|
| `BASE` | `font-sans font-semibold rounded-lg` (8px) `transition-colors cursor-pointer` |
| `PRIMARY` | `bg --fg`, `text --bg`, hover `bg --fg-body` |
| `GHOST` | transparent, **`text --fg`** at **semibold**, `1px solid --border-strong`, hover `border --accent` / `color --accent-hover` |

**Bone, not accent, and the reason is semantic:** accent means *in use / to buy* everywhere else, so
a filled CTA wearing it would claim a status it does not have. The hover is `--fg-body` because it
is the only token a step off bone in the same family across all six themes.

**The phone's Export is not this primitive** — `spine-mobile.tsx` authors it raw at `rounded-[7px]`
with an `--accent` label and a download glyph, so it keeps radius 7 and weight 400 while the ghost
beside it is radius 8 and semibold. That disagreement is the source's, not a drift.

### IdentityPips

From `src/components/commanders/commander-art.tsx`, not from memory: `size` px square, **`gap 3`**,
`radius 2`, `WUBRG_COLOR[color]` fill, `box-shadow: inset 0 0 0 1px rgba(0,0,0,0.4)`, `shrink-0`,
`aria-hidden`. Squared off deliberately — five squares read as a colour *identity*, where five round
pips would read as a five-mana *cost*. Both spines pass `size={10}`, so five colours measure
**62px**, which is the figure `spine-mobile.tsx` quotes when it argues about that row's width.

**The 390px header is now drawn twice:** a mono-black deck and a **five-colour deck**, because the
second is the case the source calls out as the pressure test. Measured with the mark present, the
`flex-nowrap` row holds at **22px with zero overflow** — 62px of pips, a 22px mark and an 8px gap,
with the commander name ellipsising as the half that gives. `labelAtPx: 115` therefore holds.

### The card-details control

`FullCardTrigger` sits in **both** bands and the mocks now draw it:

| | `deck-desktop` | `deck-mobile` |
|---|---|---|
| corner | `left 16, bottom 14` | `right 16, bottom 14` |
| form | **the one labelled placement** — ⛶ + `Card details`, plate `h26 / px 9 / gap 6` | icon only, 26×26 plate |
| target | 44 high, width auto (vertical inset only) | 44×44, inset 9 on both axes |

The plate is **opaque `--bg`** under one `--border-strong` hairline at radius 7 — that opacity is what
takes the control out of the contrast problem and is the reason the top scrim could be deleted.
**The phone label block's `padding-right: 40` exists to clear this control**, so drawing the inset
without the control (as the mock previously did) left 40px of unexplained dead space.

### Where the bracket mark goes on the deck page

**The meta row, last — after `StatusPillBadge` on desktop, after the pill on phone.** Last is deliberate:
that row is `flex-wrap` on desktop and the band is `labelAtPx: "flat"`, so a second line costs nothing —
and if anything must wrap, identity and status should hold line one while the bracket gives. Below
~1085px of row it takes a second line; above that all four sit on one.

**On phone the row is `flex-nowrap` and cannot wrap**, so the mark is pinned at 22px and the names
absorb it — the row that already carries identity and
status, and the only row in the header with a wrap behaviour that can absorb it. The mark is 22px to
match the pill's height. It is **not** in the title row (which holds the name and its rename glyph),
and **not** in the action column (buttons only).

### The 390px header, from `spine-mobile.tsx`

A different composition, not a narrower one:

| | |
|---|---|
| band | `cover` at **288**, `labelAtPx 115` (12 inset + 22 meta row + 6 gap + three 25px title lines) |
| label block | `left 18 / right 18 / bottom 12`, `padding-right 40` to clear the card-details control, `gap 6` |
| name | display 700 / **20px** / 1.25, **`display: inline` and unclamped** so the `✎` shares its last line, `overflow-wrap: anywhere`, `COVER_INK_SHADOW` |
| meta row | **`flex-nowrap`**, `gap 8` — **the pill LEADS** (h22, `px 7`, mono 10px), then pips, then the names, which ellipsise |
| below the divider | bar row (`padding 14/16/12`, `gap 8`) — full-width track, count mono 600/14px + denominator **14px** |
| actions | their own row, `justify-center`, `padding 4px 16px 14px`, `gap 8` — `Update from a list` (min-h 44, mono 11px) and `Export` (outlined, `--accent` label, 16px download glyph stroked `--fg-faint`) |

**The two headers differ by design, and the document now draws both correctly:** desktop is
`pips → names → pill` with the actions beside the title; phone is `pill → pips → names` with the
actions on their own centred row under the bar. Everything in the phone band carries
`COVER_INK_SHADOW`; nothing in the desktop band carries a shadow at all.

**The mark goes straight after the pill on phone, and must stay 22px.** That row is `flex-nowrap` and
already at capacity — the component's own comment records a wrapping version growing the block to
~120px and stranding the title on a climbing ramp. At 22px the row's height is unchanged, so
`labelAtPx: 115` still holds; the names absorb the 30px, which is the shrink that row is built for.

### One thing the desktop band must not do

`spine-desktop.tsx` states `minHeight: 288` with the row **in flow**, explicitly not
`height + overflow:hidden`: an over-99 deck grows a trim paragraph inside the band, and clipping
would hide copy rather than art. The mocks now match — only the art layers clip.

## The deck page band, from source

Drawn from `src/components/ui/art-wash.tsx`. **There is no full-bleed layer on a `left-portrait` band** —
the ambient `cover` copy was deleted from the product because at any width past the portrait's own it
read as a second, differently-scaled image. This canvas had carried it over from the older in-project
art-wash handoff; it is gone.

| | Deck page header (`left-portrait`) | Phone header (`cover`) |
|---|---|---|
| band | 288 | 208 |
| ground | `var(--bg)` | plate `color-mix(in srgb, var(--bg) 86%, black)` |
| art | one 340px portrait, `opacity .92`, `auto 100%` / `left center`, masked `linear-gradient(90deg,#000 0 58%,transparent)` | one full-bleed layer, `opacity .8`, `cover` / `center top` |
| scrim | horizontal, derived: clear to **197px** (58% of 340), `--bg` at **78%** by 340px, opaque by the **356px** flat stop | bottom ramp from `bottomScrimStops(60, 208)` — 0% to 57%, hold **73%** from 71% |
| vertical ramp | **none** — `labelAtPx: "flat"`, because the header's ink starts past the flat stop | n/a |
| ink | `INK_SHADOW` `0 1px 3px rgba(0,0,0,.6)` | `COVER_INK_SHADOW` `0 1px 4px rgba(0,0,0,0.85)` |

**The title column starts at 372px**, clearing the 356px flat stop, so the header's type stands on
opaque ground rather than on the crop.

## The deck tile, from source

Drawn from `src/components/decks/deck-card.tsx`, not from memory. The board and section E both
render this one structure:

| | |
|---|---|
| shell | `--surface-inset` on `1px --border`, radius 14, overflow hidden |
| art band | 248px; **168px** under a 330px container (both drawn from the component’s own container query) |
| identity block | pinned to the band’s foot, `pl 13 / pr 56 / pb 10` — name in the display face at 15px/1.15 with `INK_SHADOW`, then `{commander} · {colour}` in mono 10.5px/1.25 `--fg-body` |
| footer | `border-top 1px --border`, padding `11/13/13`, grid `auto 1fr auto`, gap-x 8 / gap-y 10, areas `[chip bar count]` + a detail row |
| status pill | h 22, radius 6, px 8, mono 10.5px, tracking 0.06em. **Colour is `status-style.ts`**: fill `color-mix(in srgb, var(--token) 18%, var(--bg))` inside **one `--border-strong` hairline** (never a coloured border), label in the token; `New` 16% with a `--fg-muted` label, `Draft` 14% with a `--fg-body` label and a **dashed** edge; `text-shadow: none`. Tokens: New `--fg-faint`, Draft `--fg-body`, Building `--fg`, Over `--danger`, Unresolved `--warning`, To buy `--accent`, Complete `--success`. |
| bar | h 3px, rounded-full, track `--border`, fill = **the status token itself**, width clamped to 100% (an Over deck is full, not 105%) — omitted entirely at `built === 0` |
| count | mono 12.5px (12 at sm), tabular-nums, `--fg` (`--fg-muted` at 0) |
| detail | mono 11px (10.5 at sm), truncate — `--danger` Over, `--warning` Unresolved, else `--fg-faint` |

**The detail row is derived, never invented.** `statusDetailFor` returns **null** for `Building` and
for `Complete` — the count already has its own cell in the same row group, and a second copy of
`41 / 99` beside the first is what the component’s own comment calls a rendering fault. A `Draft`
resolves through `countStatus()`, so a 41/99 brew answers as `Building` and draws **no detail row**.
Only `Over`, `Unresolved` and `To buy` carry a figure here.

**The whole tile is one `<Link>`**, so the mark must not become a target of its own.

### Status matrix

All seven statuses, each carrying a different bracket so every rank appears beside a pill and a bar,
drawn for both live palettes. **The two rows that decide the palette:**

- **Over** — rank 4 sits beside a `--danger` pill, a `--danger` bar and a `5 over` figure. In 2f that is
  three warm reds in one 22px band; in 2e it is one warning and one gold mark.
- **Unresolved** — rank 5 beside a `--warning` pill. 2f puts a bright red next to amber, two signals
  competing; 2e's near-white rank 5 reads as rank, not as a second alarm.

**Where 2f wins:** the To buy and Draft rows, where a cool mark beside a warm accent pill is livelier
than 2e's deliberately colourless ranks 1–2. That is the real trade.

## Notes for engineering

- **`BuilderView` gains `analysis` at index 1** (`builder-view.ts:14`, `VIEWS`). `readBuilderView`
  accepts it; nothing in the app writes `?tab=`, and that does not change.
- **The mix strip's mount moves** from `builder-shell.tsx:949` into the analysis panel. It is the same
  component with the same props; `onSeeShelf` still switches to Consider and scrolls to the shelf.
- **Analysis reads the live deck**, never `deck_version_cards`. Every denominator is `copies` as
  returned, **never a hard 99**.
- **Generation is manual**, once, per press — no auto-run on load or on tab open, no automatic retry.
- **A refused synopsis stores nothing** (the `commander_support.prose` contract) and renders state 4.
  A truncated sentence is never persisted and never drawn.
- **Staleness is the stored card count vs the live one**, which is why the provenance line prints the
  count it was written against.
- **The analysis panel mounts a `HoverPreviewProvider`**, and each named card is a
  `CardDetailTrigger` + `usePreviewRow(imageUri)`. The synopsis therefore needs the **oracle id and
  image uri per named card**, not just the name — the accept contract should carry the ids it
  matched rather than leaving the client to string-match the prose.
- **`--bracket-1…5` must exist in `globals.css` for all six themes** before the chip ships; `--bracket-3` is `--accent` in every theme, by rule.
- **The mark is one component** (`BracketMark`, props `bracket` / `size` / `dim?`); it renders the numeral alone when `size < 20`, so no call site has to know the rule — the chip, the verdict block and the ladder all draw it; never reimplemented per surface. Everything but the fill is geometry derived from `size`.
- **The bracket names are a constant, not copy** — `deckAnalysisCopy.brackets` is WotC vocabulary and must not be reworded in review.
- **Live region:** one message per settle — `Analysis ready. Your cards permit 1 or 2.`

## Gap report

1. **The bracket rule set is not in this design project.** Receipt rule lines (*3 permitted at
   bracket 3*, *none below bracket 4*) are drawn in the shape the spec implies. Round 2 owns the real
   limits table; if a rule reads differently it is a copy edit here, not a redraw.
2. **The synopsis's length is not settled** and belongs to a later sub-project. Desktop is drawn at
   four sentences, which is the most this block holds before it starts competing with the verdict.
   If it can run longer, this block needs a clamp rather than a bigger box.
3. **`RECOMMENDED_MIX` still says "EDHREC averages" and nothing derives them from EDHREC.** The
   strip moves into a tab that will shortly carry real EDHREC-derived figures, which makes the false
   line more conspicuous, not less. Not this round's to fix; worth flagging that the move raises the
   stakes on it.
4. **No count on the Analysis tab.** Every other cell carries one. Deliberate — nothing here is
   countable — but it makes the row slightly irregular, and a reviewer may read it as an oversight.
5. **The chip's tap target in the band** is a 22px pill. It meets 44px only with padding around it;
   eng should give it a 44px hit area rather than growing the pill.
6. **A player who never presses the tab never learns what their deck is.** The chip is the whole
   mitigation. If discovery proves worse than expected, the fallback is a one-line verdict under the
   version line — not the section from `1b`.

## Files
- `The 99 - Deck Analysis Frame.dc.html` — the canvas (deliverable). Section F is the composition study: the same deck's Analysis tab and Versions tab drawn one above the other, with all four claimants present and a comparator legend.
- `README.md` — this file.
- `FRAME-where-analysis-lives.md` — the placement argument in full, and what it rejects.
- `STATES-synopsis.md` — the five-state matrix and the verdict states.
- `deck-analysis - copy strings.ts` — the copy block.
- `READINESS.md` — self-assessed readiness and what blocks a green.
- `brand/` — the brand sheet, copied in for self-containment. **Not a colour source** — tokens are.
