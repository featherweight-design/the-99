# The 99 — What this deck is, in four figures (design handoff, R1)

`design/design_handoff_the99_deck_stats/` · 2026-09-12 · **new files only**

Canvases: **`The 99 - Deck Stats (R3).dc.html` is the current direction** (six-theme `theme` prop).
`R2` is kept as the reference-derived structure it was, `R1` for its rejected alternatives and its
three-strip argument. **R3 replaces R2's drawing entirely and holds every arithmetic and vocabulary
ruling in this file** — see §R3 at the foot.
Adds one component to the deck page and one to Home. **No new token, no new query, no new column,
no geometry change to anything already mounted.**

**The one-line summary:** *the page already has a strip measured against a target and a strip
measured against the last version; this one is measured against nothing — so no cell in it carries
a second number, and that absence is both the drawing rule and the placement argument.*

---

## 0. Provenance — what was read

`docs/superpowers/design-briefs/2026-09-12-what-this-deck-is.md` **is not in this project's tree**
(`docs/superpowers/` holds only `design-tables/appshell.md`). It was read from
`HartiganHM/the-99@main` together with the source it cites. Read this turn, at `main`:

| File | What was taken from it |
|---|---|
| `src/lib/decks/stats.ts` | all four folds, `CURVE_MAX`, the once-per-colour rule at :97-119, `average: null` at zero copies, `emptyRecord`, `sumPlayRecords`, `sumColourSpreads` |
| `src/lib/decks/stats-query.ts` | `DeckStats`, the commander fold at :143-159, `cost` nullable at :37/:179, `loadOneDeckStats` |
| `src/components/decks/role-counter-strip.tsx` | the strip container (`px-[16] py-[10] md:px-[30] md:py-[14]`, `border-bottom`), the eyebrow's two inks (`--fg-faint` phone / `--fg-body` desktop), the `wasCounts` draft note |
| `src/components/decks/role-counter-cell.tsx` | the em-dash **not-yet** vocabulary, `rec N` as the second-figure slot, the 7/9px radii, the label/figure/caption type ramp |
| `src/components/decks/games-panel.tsx` | the zero-games **replacement** at :148-151, the aggregate box shell (`rounded-[11px] px-[18px] py-[16px] bg-surface-sunken border border-border`), the four headline placements |
| `src/lib/decks/game-headline.ts` | `deriveHeadline`'s four outcomes and which of them colours the record `--accent` |
| `src/components/decks/price-strip.tsx` | that it sums the **filter's** rows, its `showFigure`/`showClause` drops, and that no price is never `$0.00` |
| `src/lib/copy/price.ts` | `strip.pricedClause`, `strip.provenanceUnpriced` — both reused verbatim; the module's *silence is a state* rule |
| `src/components/decks/builder-tabs.tsx` | `BuilderView = deck \| consider \| games`, the count-in-the-tab contract, the zero-count-is-never-accent rule |
| `src/app/globals.css` | the 37-key contract, transcribed into the canvas unchanged |

**Not read, and therefore relayed rather than quoted:** `builder-shell.tsx:863`/`:924` (the mount
points), `shopping-rollup.ts`, `availability-query.ts:463-465`, `commitments-card.tsx:88-91`,
`deck-card.tsx:74-82`, `deck-rail.tsx:51-52`, `versions.ts:246-256`, `mana-value.ts:35`,
`copy/deck-versioning.ts:371-372`, `deck-versioning-surface-2.md`, `game-log.md:33`/`:121`. Every
claim below that rests on one of those is taken from the brief's own `file:line` citations. **If a
line disagrees, the line wins** — and the only ruling that would move is amendment 2.

---

## The five calls the brief left open

### 1. §3.5 Where the block sits → **at the foot of the Deck panel, under the list it describes**

| Placement | Verdict |
|---|---|
| **A fourth tab** (`deck \| consider \| games \| stats`) | **No.** A ~320px block in a room of its own sits in a mostly empty panel, and a tab is a destination a player chooses to visit — the wrong shape for a description of the list they are already looking at. The tab strip also carries counts in its accessible names; *Stats* counts nothing. |
| **A third page-level strip**, above the tablist | **No.** Two page-level strips already compete there, and a third would inherit their register: fixed-height cells, a comparator per cell, a target ink. It is also the position that makes folding look obvious. |
| **Part of the spine** | **No.** The spine is the deck's identity band — commander, name, status, count, bar. Four distributions in it would double its height at both widths and would state figures about the *list* in a band about the *deck*. |
| **Under the decklist, inside the Deck panel** | **Ruled.** The block describes the list, so it is adjacent to the list, unmounts with it, and is the last thing on a panel that already scrolls. Nothing comes out to make room. |

**Consequence, stated:** the block is **not visible from the Consider or Games tabs**. That is
correct and deliberate — Consider is about cards you do not have yet, and Games has its own
altitude for the record. It is also why the record cell can state a figure without contradicting
anything: the two are never on screen together.

### 2. §5 How a reader tells three strips apart → **only the third has no second number**

| Strip | Comparator | Second figure | Ink | Position |
|---|---|---|---|---|
| Recommended mix | a target | `rec N` in every cell | success / warning / danger, accent link | page, above tabs |
| Since version N | the last committed version | `was N` in every moved cell | accent | page, above tabs |
| **What this deck is** | **none** | **never any** | neutral; **accent on `To buy` alone** | panel, under the list |

That is the whole at-a-glance test and it is one sentence: **a cell with a second number is measured
against something; a cell without one is not.** Each eyebrow also names its comparator, so the test
survives a reader who reads the heading instead of the cells.

**They are not folded.** Folding puts a target-measured figure beside an unmeasured one under one
heading, and under one heading a cell with no second figure reads as a cell whose second figure
*failed to load*. It would also drag the mix strip into the Deck panel — and the mix cells route
into Consider, so the control would unmount the panel it points at.

**The accent budget.** Refresh R2 reserves accent for *in use* and *to buy*. The block spends it
exactly once, on the only cell that is a shopping fact. Everything else — the record figure, the
curve bars, the colour counts — is `--fg`, `--fg-body`, `--fg-muted` or a WUBRG token.

### 3. §3.2 A deck with no games → **an em dash and a denominator, and nothing else**

`recordFromCounts([])` always returns, so the cell is never absent. It draws:

- figure **`—`** at `--fg-locked` (the role cell's *not yet known* vocabulary, borrowed not minted);
- caption **`no games logged`** at `--fg-faint`.

**Never `0–0–0`**, which is a figure nobody played, presented as if somebody had. **And never a
pitch** — no *log a game* link, no CTA, no illustration. The Games tab **replaces** its panel at
zero (`games-panel.tsx:148-151`) with a heading, a body, a form and a scope note; a second, weaker
pitch four inches below it is the exact trap the mix strip already named when it deleted its
worked-example callout. One tap away, already better.

This does not contradict `games-panel.tsx`: the panel still replaces itself, and the block still
draws no aggregate of nothing — it draws a stated absence, which is what a four-part description of
a deck owes a reader.

**`To buy` uses the identical treatment** at `cost === null`, so the two absences in the block read
as one rule rather than two decisions.

### 4. §3.3 Chart or counts → **eight vertical bars, with the count printed above each**

**Bars, because a curve's only reading is where the hump is.** Nobody reads `2 7 12 14 11 8 5 4`
and sees a shape. The counts version was drawn (§6 of the canvas): it saves ~34px and costs the
reading the figure exists for.

**Counts printed anyway**, above each bar with copies, so the chart is auditable by addition —
the same pairing the role cell already ships (figure *and* bar).

Five rules the drawing depends on:

1. **Scaled to the tallest bucket, never to `copies`.** Against 63 the tallest bar is 22% of track
   and the shape flattens out of existence.
2. **An empty bucket prints no figure and draws a 1px `--border-strong` baseline.** `stats.ts`
   requires all eight buckets always, in order, because a gap mid-curve is a real shape — and eight
   printed zeroes on a thin deck is noise where the absence is the reading.
3. **Bucket 7 is labelled `7+`.** The ceiling is made visible rather than read as a count of sevens.
4. **Lands are never a ninth column.** They are stated in the caption, as `stats.ts` reports them:
   `63 cast · 37 lands, excluded`.
5. **`curve.copies === 0` → eight baselines and `avg —`.** `average` is `null` there and `avg 0`
   would read as a deck of Moxen.

Track 56px desktop / 44px phone; bar fill `--fg-muted` (6.6:1 on `--surface-sunken`, well clear of
the 3:1 non-text floor in all six themes). Eight columns fit 358px of phone at a 4px gap.

### 5. §3.4 / §6 The roll-up altitude → **record and colours, specified here, placed by the home brief**

**Two of the four, and the library decides which.** `sumPlayRecords` and `sumColourSpreads` exist
and were written for this altitude (`stats.ts:67`, `:136`). There is no `sumManaCurves`, and its
absence is the argument: eight buckets summed over five decks describe no deck anybody owns, and an
average of averages is not a mana value. **Cost already has a home on Home** in the Commitments
card; a second print at one altitude on one page is the defect this brief exists to stop.

**What each is for at that altitude.** The record answers *am I winning* across a shelf. The spread
answers *what do I actually play* — the figure that is genuinely new, and the one a player cannot
get anywhere else in the app.

**Vocabulary, per decision 2.** Every string is the deck page's string with one substitution, the
denominator's scope. `Record`, `Colours`, `wins–losses–draws`, `once per colour`: identical. The
only copy that is new at this altitude is `across N decks` and `every deck's record, added`.
The block headings differ because the *scope* differs, not the figures: `What this deck is` /
`What you play`.

**Sequencing, stated.** The roll-up block is **specified** here — both cells, both widths, the same
names and the same functions — and its **placement is handed to the home handoff**, because Home's
two-column body is being reshaped by a brief that is not written and waits on the commander-image
treatment. Nothing here assumes the Your Decks rail survives, and nothing here needs it to.

---

## Cost: the fourth printing, and why it earns the fourth

`DeckStats.cost` is the roll-up's **deficit** — what this deck still has to buy after seniority hands
it the copies it already holds — not the price strip's total over the decklist's Shopping rows.
Three shipped surfaces read the roll-up; the deck page's strip does not.

**Ruling: the block states cost, it states the deficit, and it says so.** The deck page is the only
surface in the app where **both** cost figures are visible at once — the block near the foot of the
list, the strip inside the Shopping filter — which makes it the only place their difference can be
said out loud instead of averaged away. The line that earns it is six words:
**`after the copies you already own`**.

Four states, and none of them is `$0.00`:

| State | Figure | Second line | Third line |
|---|---|---|---|
| `cost === null` | `—` `--fg-locked` | `nothing to buy` | `basics are never counted, so this is not finished` |
| `copies > 0, cents 0, pricedCopies 0` | `3 copies` `--accent` | `no prices from ManaPool for these` (`priceCopy.strip.provenanceUnpriced`, verbatim) | — |
| `copies > 0`, partly priced | `3 copies` `--accent` | `$18.40` `--fg` | `2 of 3 priced` (`priceCopy.strip.pricedClause`, verbatim) |
| `copies > 0`, all priced | `12 copies` `--accent` | `$74.15` `--fg` | `after the copies you already own` |

**The fraction and the deficit clause share one line slot** — the fraction takes it whenever some
copies are unpriced, the clause otherwise. Two provenance lines under a two-line figure is more
apparatus than figure, and a partial fraction already implies a partial deficit.

**The smaller disagreement is settled too:** the rail prints copies without money, everything else
prints both. **The block prints both.** A copy count with no money is a figure that cannot be acted
on, and the rail was the outlier.

---

## The curve collision: a deliberate split, and each figure names its list

The app already uses *curve* for a one-number average — versioning Surface 2's what-changed strip,
copy ratified (`copy/deck-versioning.ts:371-372`), component unbuilt. **Both figures ship and both
keep the word.** The split is real and legible, but only if each one states the list it read:

|  | Block's eight buckets + average | Strip's one-number average |
|---|---|---|
| Function | `manaCurve` (`stats.ts:190`) | `versionManaValue` (`versions.ts:246`) |
| List | live draft, **both commanders folded in** | `deck_version_cards` alone — **committed, no commander** |
| Rounding | raw; **printed to one decimal** | `averageManaValue` rounds to one decimal |
| Says | what the deck **is** | what **moved** |
| Clause drawn | `live list, both commanders in` | `committed list, no commander` — **amendment 2** |

They agree on what a land is (one `isLandFace`). They can still legitimately disagree by a tenth or
more, and a reader seeing `avg 3.4` above and `was 3.6 → 3.2` below with no clause on either has been
handed a bug that is not a bug. **The block prints its average** — eight buckets without a
centre-of-mass is the one thing a player reads a curve for, and it must not require a trip to a
version strip — **at one decimal, so the two figures at least share a scale.**

---

## Amendment ledger

**1 · `commitments-card.tsx:90` — stop printing `$0.00`.** It calls `formatCents(shopping.total.cents)`
unconditionally, so a player with copies to buy and no price for any of them is shown `$0.00`.
`deck-card.tsx:81-82` already branches to `detailToBuyNoPrice`. **The app follows the tile.** This is
Design's answer to the brief's explicit ask, and it is the only amendment that changes a shipped
pixel. One branch, one existing string.

**2 · `deck-versioning-surface-2.md:183` (cell inventory `:642`) — the mana cell names its list.**
Add `committed list, no commander` in the strip's own caption register. **The ratified copy
(`the curve comes down` / `the curve goes up`) does not change**, the cell keeps its position as the
first of six, and the surface is unstarted — so this costs one string and no rebuild. Without it, two
averages on one page differ for a reason nothing on screen explains.

**3 · `game-log.md` — not amended.** The tab's count stays *games logged, never the record*
(`:121`). All four `deriveHeadline` placements and all three of their inks stand. The block states a
figure in its own neutral register and produces no headline, no pattern sentence, and no relabelling
of the tab. The two are never on screen together (ruling 1).

**4 · `mix.ts` / the role strip — not amended.** No geometry, ink or copy changes. The block borrows
its em dash and its label/figure/caption ramp; borrowing is not amending.

**5 · The price strip — not amended.** It keeps its scope (the filter's rows), its drops and its
link-out. The block adds a clause to *itself*, not to the strip.

**6 · Recorded, not made:** the Your Decks rail's removal is the home redesign's call. It is one of
the four surfaces printing cost today, and nothing in this handoff depends on it either way.

---

## Contrast, measured on `--surface-sunken`

All six themes. Text floor 4.5:1, non-text 3:1.

| Element | Token | Low Sun | Floor | Pass |
|---|---|---|---|---|
| Figures (`3–1–1`, `$18.40`) | `--fg` | 13.1:1 | 4.5 | ✅ |
| Bucket counts, colour counts | `--fg-body` | 8.4:1 | 4.5 | ✅ |
| Labels, captions, WUBRG letters | `--fg-faint` | 4.81:1 | 4.5 | ✅ |
| Em-dash absence figure | `--fg-locked` | 3.04:1 | 3.0 (aria-hidden glyph; the words beside it carry the meaning at `--fg-faint`) | ✅ |
| Curve bars | `--fg-muted` | 6.62:1 | 3.0 | ✅ |
| Colour bars, pips | `--w`…`--g` | 3.21–14.9:1 | 3.0 | ✅ |
| Bar track | `--elevated` | 1.31:1 | — (ground, not a mark) | n/a |
| `To buy` figure | `--accent` | 5.98:1 | 4.5 | ✅ |

**Deliberate divergence from the shipped price strip:** its provenance line runs `--fg-locked` at
9.5px (3.04:1 — under the text floor). The block's captions run **`--fg-faint`** instead. The strip
is shipped and out of scope; the new component does not inherit a value that fails.

**The pips are never dimmed, tinted or tokenised**, per the filter chassis's measured ruling. The
WUBRG letter is not decoration: five bars separated by hue alone is the failure that ruling
measured, and `W U B R G C` carries in greyscale.

---

## Motion

**None.** The block has no animation, no transition and no in-flight treatment in R1. It renders
server-side from `loadOneDeckStats`, arrives with the panel, and changes only when the route
revalidates. There is therefore no reduced-motion state to specify — which is why this handoff ships
no `MOTION-` document.

One consequence worth naming: **a card added through quick-add moves four figures at once** and they
will all move on the same revalidation, with no easing. If review wants that softened it is a new
decision, not a missing one.

---

## Engineering notes

- **One loader call per surface.** Deck page: `loadOneDeckStats(deckId, userId)`. Home:
  `loadDeckStats({ userId })` then `sumPlayRecords` / `sumColourSpreads` over the map's values. A
  fixed number of reads either way; no per-deck fan-out.
- **Never a hard 99.** Every denominator is `copies` as returned. A mid-build deck is the common
  case and its figures must add up to the ones computed.
- **Two denominators, printed separately.** `colours.copies` (lands in) and `curve.copies` (lands
  out, reported as `curve.lands`). They appear on different caption lines in different cells and are
  never the same number seen twice.
- **Shares divide by `copies`, never by the sum of the six colour figures.** No bar can exceed its
  track, because no single colour figure can exceed `copies`.
- **The figure is a `role="figure"` with an `aria-label`**, per the role cell's static branch: one
  explicit label replaces every descendant, so each cell's label states figure, denominator and the
  once-per-colour caveat in one utterance. Strings in `deck-stats · copy strings.ts`.
- **`cost` nullability must survive the prop boundary** — `DeckShopping | null`, not
  `DeckShopping` with a zeroed default. A default would resurrect `$0.00` at the type layer.

---

# R2 — the reference idiom (2026-09-12, later the same day)

Review preferred **deckcheck.co**'s treatment of the same two altitudes. Agreed, and R2 adopts it.
The argument is one line: **R1 drew four figures in one strip-sized row, and two of our four are
distributions — a distribution in a 148px row is a sparkline.** R2 splits the block by *shape*
rather than by figure count.

## What R2 changes

| | R1 | R2 |
|---|---|---|
| Structure | one 4-column row, ~148px desktop | **three bands, ~470px desktop**: summary bar (the two scalars) → curve → colours |
| Curve | 8 bars, 56px track, counts above, no axis | **axis'd chart**: y-scale, dashed gridlines, 190px plot, count **inside** the bar, `Mana value` axis title, `63 cast` caption below |
| Colours | 6 hairline rows, 5px bars | **6 cards**, 30px pip badge, colour name, 22px track with the **share printed**, `N cards` beneath |
| A colour at 0 | a full-strength zero row | **the card dims to `0.44`** — present, countable, unmistakably not this deck |
| Record | `3–1–1` + caption | **ring + won/lost/drew rows**, the reference's checklist register |
| Cost | figure, money, clause | same figures **+ a 6px accent progress track** (priced ÷ copies) |
| Roll-up | a 2-cell block | **a full-width summary strip**: ring counts decks, record zone, top-three colour zone |

## The two amended rulings

**1 · Percentages are printed.** R1 refused them because the six colour figures sum past the deck.
Too broad: each share divides by `copies`, so **each percentage is individually true** — only their
*sum* misleads, and the sum is never drawn. The count stays beside it as the auditable figure and
the caveat caption still prints unconditionally.

**2 · The block is no longer strip-shaped.** It keeps its placement (foot of the Deck panel, under
the list, unmounting with it) but stops competing in the strips' register — which retires R1's
hardest problem for free: at 470px in three bands with an axis'd chart, **it cannot be mistaken for
the two strips above the tabs**, so the "no second number" rule becomes a drawing detail rather than
the whole placement argument.

## What was borrowed, and what was refused

**Borrowed:** the y-axis with dashed gridlines; the count printed inside the bar; the `N spells`
caption under the chart (ours: `63 cast · 37 lands, excluded`); the per-colour card with a
percentage in its own track; the dimming of a colour the deck does not play; the ring-plus-checklist
summary strip for the all-decks altitude.

**Refused, with reasons:**

- **Cost vs Production.** The reference's best idea and **we cannot draw it honestly** — it needs
  *pips per colour* and *mana sources per colour*, and `stats.ts` computes neither: `colourSpread`
  counts **identity**, once per colour, lands included. Drawing the frame without the numbers is how
  a placeholder ships. **Filed as a data request in `READINESS.md`.**
- **The 0–15 axis.** `CURVE_MAX` is 7, so ours ends at `7+`. A 16-column axis would be eight empty
  columns and a ceiling that looks like a gap.
- **The blurred commander-art backdrop.** Our spine already carries the identity wash; a second one
  behind a chart costs contrast the figures need.
- **`AVG COST` / `AVG CRISPI` in the all-decks strip.** There is no `sumManaCurves`, an average of
  averages is not a mana value, and cost already has the Commitments card. **That zone carries the
  colour roll-up's top three instead** — the figure a player cannot get anywhere else.

## New rules R2 needed and R1 did not

- **The percentage never sits on the fill** (except at 100%, where no track remains). `--w` is a
  near-white and `--u` a mid-blue, so one ink cannot clear 4.5:1 on both; on the `--elevated` track
  every percentage gets the same 13.1:1. At 100% the ink is `#14110E` on light fills, `--fg` on dark.
- **A non-zero share keeps a 6px minimum fill**, so one card in a hundred is a visible mark.
- **Every populated bucket takes the same `--fg-muted` fill** (the tallest takes `--fg`), with a
  **20px minimum bar height** so the count always sits inside a visible mark. A short bar is never
  given a lighter fill: `--elevated` is 1.3:1 on `--surface-sunken`, so a 2-copy bucket drawn that
  way reads as the empty-bucket baseline it must stay distinct from — and its count would then
  float above nothing, in register with the axis tick.
- **0% is the only share that centres its figure** — which is what makes the dimmed cards scan as a
  group.
- **The card dims, never the pip.** The pip keeps its full-strength fill inside a dimmed card, so
  the filter chassis's ruling survives.
- **The ring is a count, not a gauge** — dashed, arcless, at both altitudes. An arc needs a
  denominator and *how many decks you have* has none.
- **At zero games the ring prints `0` and the record prints `—`.** The count genuinely is zero;
  it is the *record* that is unknown. That distinction is why they share a zone.
- **The To buy progress track disappears when there is nothing to buy.** A 0%-filled accent track
  reads as *nothing bought yet* — a progress claim the figure does not make.
- **Nothing cast yet → an empty plot with the axis intact**, y-scale collapsed to 0–5 at
  `--fg-locked`. R1's eight baseline rules were a sparkline's answer; at this size the axis carries
  it alone.

## Held from R1, unchanged

Two denominators and never one. No hard 99. Bars scaled to the tallest bucket, never to `copies`.
`7+` as a visible ceiling. Lands reported in the caption, never a ninth column. No `$0.00`, no
`0–0–0`, no `avg 0`. Accent spent once, on `To buy`. Each average names its list (and amendment 2
to versioning Surface 2 still stands). The roll-up carries record and colours. The colour cell has
no empty state by construction. No motion. Same loader, same copy module, same 37 tokens.

---

# R3 — the measured ledger (current)

Review's note on R2 was that it was obviously derived from the reference, and that is a fair
reading: **R2 took the reference's structure and dropped our tokens into it** — ring, checklist,
pill percentages, y-axis chart, dimmed cards. The tokens were ours; none of the devices were.

R3 starts from the other end: **the three devices The 99 already owns**, and lets the figures take
the shape those devices imply.

| Device | Already in the app | What it now draws |
|---|---|---|
| **The unit square** | `IdentityPips`' 2px-radius square | **the curve as a tally** — one square per card, stacked, 7px desktop / 5px phone |
| **The leader dot** | the role cell's em-dash *not-yet* row | **the colour spread** — six leader lines measured against one ruler |
| **The ruled section head** | Cinzel headings + hairline dividers | **each section's own denominator**, set at the end of its rule |

## Why a tally and not a bar chart

- **It is countable.** A player who distrusts a curve counts it; a bar chart makes them read a scale.
- **A unit square is never rescaled**, so two decks' curves are directly comparable — which a
  bar chart scaled to its own tallest bucket never is.
- **It kills four devices at once:** gridlines, y-scale, axis title and the count-inside-the-bar all
  exist to answer *how tall is tall*. A tally answers it by construction.
- **The empty bucket problem disappears.** There is no such thing as an empty square, so an empty
  bucket is simply the mana value with an em dash where its count goes — no baseline rule to invent.
- **One new rule, and it is a tally-sheet rule:** above **18 copies** in the tallest bucket the
  square doubles — *one square, two cards*, stated on the foot line, odd counts rounding up. The
  printed figure is always the true one.

## Why a ruler and not percentages

**No percentage is printed anywhere in R3**, and that retires the entire R2 defect class — where the
figure sits at 1%, at 95%, at 100%, which ink clears which fill, and whether a label clips a 261px
card. The ruler states the proportion; the count on the right states the fact.

- **Ticks are labelled in cards, not per cent** — `0 · 25 · 50 · 75 · 100` on a 100-card deck,
  `0 · 122 · 244 · 365 · 487` on Home. Quarters of the denominator, in the unit the figures are in.
- **Each rule is measured, not segmented**, so nothing in the drawing implies the six should sum to
  the denominator — the arithmetic problem the stacked bar could not survive and the pills could
  only footnote.
- **The dots past the end of a rule are the remainder** — the part of the deck that is not this
  colour — in the same ink as an absent colour's full-width dots. So `White —` and `Colourless 9`
  read as the same kind of statement at two magnitudes.
- **Nothing is dimmed.** A colour the deck does not play draws leader dots to the ruler's end and an
  em dash, at full contrast. No faded text to measure, and the pips keep their fills.
- **The ticks collapse when quarters are not countable** — a 1-card denominator draws `0` and `1`.

## The roll-up is the identical drawing with a wider ruler

Same section heads, same leader dots, same ruler, same right-hand counts. The only differences are
the denominator on the rule and the record's caption. **That is what *one meaning at two altitudes*
looks like when the drawing carries it rather than the copy** — a player who has read one has read
both, and no device appears at one altitude and not the other.

Two changes from R2 at this altitude: **all six colours are drawn, not a top three** (on one ruler a
row costs 26px, and the shape of a whole collection is why a player is on that page), and the
ready/brewing counts sit on the section rule rather than in a checklist beside a ring.

## Held from R1 and R2, unchanged

Placement (foot of the Deck panel, under the list, unmounting with it). Two denominators, never one.
No hard 99. `7+` as a visible ceiling. Lands reported, never a ninth column. No `$0.00`, no
`0–0–0`, no `avg 0`. Accent spent once, on `To buy`. Each average names its list, and amendment 2
to versioning Surface 2 stands. The roll-up carries record and colours. The colour cell has no empty
state by construction. No motion. Same loader, same copy module, same 37 tokens — **R3 mints no
token and adds no query.**

## Copy the ledger adds

Four strings, all in the app's existing register, to be added to `deck-stats · copy strings.ts`:
`section.table` — *On the table* · `section.curve` — *The curve* · `section.colours` — *The colours*
· `curve.unit` — *one square, one card* / *one square, two cards*. The section heads are the only
new naming in R3, and they are naming *sections*, not figures — every figure keeps its R1 wording.
