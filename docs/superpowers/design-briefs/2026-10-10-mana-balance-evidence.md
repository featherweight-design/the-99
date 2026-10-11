# Mana Balance: the evidence screen

Design brief, 2026-10-10. Asks for a Design round on the Mana Balance tool inside the Tuning hub. The
engine is built and merged; no UI exists. The hub handoff already draws Mana Balance, but it draws a
**verdict** (a Status column, a "short" trigger), and Hugh ruled verdicts out on 2026-10-10. This brief
says what the engine now outputs, what is locked, and what Design owns.

## The ruling that changes the drawings

**Mana Balance shows evidence, not verdicts (Hugh, 2026-10-10).** Nothing on the screen says a color is
short, fine, met, covered, balanced or in trouble, and nothing is colored to imply it. Hugh scored five
candidate shortfall rules against his play history on ten decks and none matched; the table is in
`docs/superpowers/plans/2026-10-10-mana-balance-tier-1.md` ("Verdict rules rejected"). The tool instead
lays out counted figures, each beside the published reference where one exists, and lets the player read
them. Help is a separate act the player asks for.

## Rulings 2026-10-11 (Hugh)

These build on the evidence ruling above and do not loosen it: still no verdict word, no verdict color.

1. **A lead line on every deck: `Closest to its limit: <color>`.** It states a fact, not a judgment. The
   color is the one with the lowest ratio of sources to Karsten's requirement, taken over the patterns two
   or more cards share (a pattern only one card carries does not decide the lead). The line never says
   `short`, and it is never drawn in a warning color.

   **Which color, in every state** (engineering's reading of the ruling; Hugh can override):
   - Only a pattern with a published Karsten number counts. A ceiling (`at most N`) and `no published
     figure` give no ratio and are skipped.
   - A color's ratio is its worst one over the patterns two or more cards share. When it has no such
     pattern, its worst single-card pattern stands in, so a color is not ranked best only because its
     tight costs are on one card each.
   - A tie goes to the color with more pips (counted with the commander, as the fixtures are), then to
     the W, U, B, R, G order.
   - `colorless`, and a deck where no color has a published pattern, carry no lead line. A one-color deck
     names its color. Under `noSources` every colored pip has zero sources, so the ratios all read 0 and
     the tie-break names the color.
   - The help door's color order (ruling 3) is this same ranking.
2. **Pattern rows read `You have N · Needs M`**, under a column headed `Needed`. Opening a row (a tap on
   the phone) shows one line: "Frank Karsten's math: sources of this color a 99-card deck needs to cast
   this on curve about 9 times in 10." Karsten is named only in that line and in the citation, nowhere
   else on the screen.
3. **One door: `Improve my mana`.** It opens a color step listing the deck's colors in the lead line's
   order, with nothing preselected; the player picks the color. The engine never picks it, including the
   lead color.

## Calibration (staging, read-only, 2026-10-11)

Why the lead line ranks within a deck instead of flagging a color: no absolute threshold separates the
colors Hugh calls short from the ones he calls fine. Ratio is a color's sources over Karsten's
requirement for its tightest pattern shared by two or more cards. Gishath's green at 1.00 is one of his
short calls, while Counter Intelligence's blue at 0.69 and Brago's white at 0.93 are fine; catching
Gishath needs a cut at 1.00, which also flags five of the six colors he calls fine (all but Tovolar's green). Ranking within each deck does name the right
color on Gishath, Avatar Aang and Blood Rites. Gods is discounted: its "short" red was a call about a
past version, and its list has changed since.

| Deck | Color | Sources | Tightest shared pattern (cards) | Needs | Ratio | Hugh's call |
|---|---|---|---|---|---|---|
| HD - Gishath | W | 26 | `4C` (2) | 15 | 1.73 | none |
| HD - Gishath | R | 27 | `4CC` (2) | 22 | 1.23 | none |
| HD - Gishath | G | 28 | `1CC` (3) | 28 | 1.00 | short (hunch) |
| HD Tune - Blood Rites | W | 24 | `2CC` (3) | 26 | 0.92 | short |
| HD Tune - Blood Rites | B | 30 | `CC` (3) | 30 | 1.00 | fine |
| HD Tune - Scrappy Survivors | W | 20 | `3CC` (4) | 23 | 0.87 | fine |
| HD Tune - Scrappy Survivors | R | 19 | `1C` (3) | 19 | 1.00 | none |
| HD Tune - Scrappy Survivors | G | 21 | `C` (3) | 19 | 1.11 | none |
| HD - Gods (discounted) | W | 22 | `CC` (2) | 30 | 0.73 | none |
| HD - Gods (discounted) | U | 20 | `2CC` (6) | 26 | 0.77 | fine |
| HD - Gods (discounted) | R | 22 | `2CC` (2) | 26 | 0.85 | short (past) |
| HD - Brago | W | 26 | `1CC` (2) | 28 | 0.93 | fine |
| HD - Brago | U | 26 | `2CC` (4) | 26 | 1.00 | none |
| HD Tune - Counter Intelligence | W | 28 | `C` (3) | 19 | 1.47 | none |
| HD Tune - Counter Intelligence | U | 25 | `CCC` (2) | 36 | 0.69 | fine |
| HD Tune - Counter Intelligence | R | 26 | `1C` (2) | 19 | 1.37 | none |
| HD - Tovolar | R | 22 | `2CC` (2) | 26 | 0.85 | none |
| HD - Tovolar | G | 34 | `1CC` (5) | 28 | 1.21 | fine |
| HD - Avatar Aang | W | 22 | `1C` (2) | 19 | 1.16 | none |
| HD - Avatar Aang | U | 21 | `CC` (4) | 30 | 0.70 | short (`UU`) |
| HD - Avatar Aang | R | 21 | `1C` (4) | 19 | 1.11 | none |
| HD - Avatar Aang | G | 22 | `1C` (6) | 19 | 1.16 | none |

Cards are nonland copies behind the pattern, commander excluded; counting the commander's own pattern
changes none of the ten colors Hugh made a call on; the rest were not checked. Omnath is left out (no data) and Yuriko was borderline with no per-color call.

## What is already drawn, and what it changes

The hub handoff is `design/design_handoff_the99_tuning_hub/` (approved: R1, and R2 for Proposed cuts).
Read `README.md`, `STATES-tuning-hub.md` and `design-tables/tuning-hub.md` there. **There are no R2
frames for Mana Balance.** R2 redrew only Proposed cuts and History
(`The 99 - Tuning Hub (R2) · C Proposed cuts and History.dc.html`); Mana Balance exists only as R1 frame
B (`The 99 - Tuning Hub (R1) · B Mana Balance.dc.html`, frames B1 to B9; the same canvas's B10 / B10b draw Suggested changes' two lists, which this brief does not touch).

| R1 frame / piece | Status under the ruling |
|---|---|
| Tool slot, tabs, tool mark, phone `‹ Tuning`, landing tile (A1 to A4) | Stands. Reuse as drawn |
| B1 / B1b ready state: the `Color · Cost · Sources · Status` table | **Superseded.** The Status column is a verdict. `ManaSourceTable` (`design-tables/tuning-hub.md`, "ManaSourceTable") needs a new column set |
| B1 "Additions and Cuts" with `Apply all` | **Superseded** by help on request, below |
| B2 to B6 Look deeper (tier 2), its band, credits, running, refused, failed | **Out of scope for this round.** Tier 2 is a later sub-project; draw no band, no credit line |
| B7 thin EDHREC data | **Does not stand as drawn.** The staple read returns candidates, an empty list, or null (a failed read). An empty list cannot say why: the index may be thin, or every indexed card may already be in the deck or filtered out. Draw one neutral no-staples state that gives no reason. Naming a reason needs metadata engineering has not built (open question 5) |
| B8 tier-1 failed (`We couldn't count this deck's mana`) | Stands |
| B9 counted fact vs hedged claim | Stands as the rule: every figure on this screen is a counted fact |
| Land cell `balance mana →` (hub `README.md` "2 · Shortcuts"; `design-tables/tuning-hub.md` "Land cell — balance mana"), shown "whenever Mana Balance's free count finds a color short" | **The condition no longer exists.** Design decides when the roles strip links here (open question 1) |

## What the engine outputs

All of it is free and deterministic: no model call, no credit. Source: `src/lib/tuning/mana-balance.ts`
(`ManaBalance`), loaded by `loadManaBalance` in `mana-balance-load.ts`. Figures are copies, and a deck's
commander counts as a card where noted.

**Per color** (W, U, B, R, G; the screen draws only a color the deck has a pip or a source of):

| Field | What it is |
|---|---|
| Pips | Colored pips of this color across the deck, **with the commander and without it** (Deckcheck, the comparison tool, leaves the commander out). A hybrid pip counts once for each half. Each also as a share of all colored pips |
| Sources | Lands, other sources, and the total. A dual counts once for every color it makes. This is the Colors card's own count on Deck stats (the Colors card in `src/components/decks/deck-stats-view.tsx`) and the two must show the same numbers |
| Hardest patterns | Up to six, hardest first (most pips, then least other mana). A pattern is Karsten's notation: `1CC` is one other mana and two pips of this color, where another color's pips count as other mana. Each carries the copies, **the card names** (a card with two copies shows `x2`; the commander is marked), and Karsten's 99-card figure |
| Karsten's figure | One of: a number (`28`); a ceiling (`at most 14`, for a cost with more other mana than his table has a row for); or `no published figure` (five or more pips). Never a guess |
| Hardest published figure | The largest published number over **all** the color's patterns, not only the six shown |

Each face of an adventure, split or castable-back card is its own pattern.

**Per deck:**
- Colorless: `{C}` pips and colorless sources, and `unattributedNonland`, the mana sources whose color
  could not be read (R1's `1 not counted ⓘ`).
- Lands: the count; tapped in **three kinds** (enters tapped; enters tapped unless a condition holds;
  fetches a land onto the battlefield tapped); the average mana value (commander counted as a card);
  and Karsten's land-count figure for the deck, unrounded. The ramp term counts mana sources of mana
  value 3 or less and does not count draw spells, which the figure's caption must not hide.
- State: `ok`, `colorless` (no colored pip) or `noSources` (colored pips, no source of any color). Neither
  thin state refuses; each still has lands, tapped counts and an average (ruling 6).

**Help on request** (`helpAddColor`, `mana-help.ts`; read by `loadManaHelp`). The player picks a color
and asks. It returns, for that color: the sources it has now; **rebalance** moves (basics of one color
become basics of the picked one, with the most copies that leave every other color as it is, and the
before and after source counts); **trades** (one basic becomes a staple, with the before and after);
and **staples** the commander's decks run that this deck does not hold, **owned copies first**, each with
how often (`this commander's decks`, `this pairing's decks` for a partner pair, or an identity bucket's
average labelled as the bucket's), the colors it adds, how many copies are free, and a price for one
that is not owned (`priceCents`, null when never stocked: say nothing then). The staple list can be empty with no stated reason, and the whole help read can fail (null). A buy link-out already
exists for a card name (`manapoolCardUrl`, `src/lib/manapool/links.ts`, used in
`src/components/cards/card-modal.tsx`).

## What engineering has locked

1. **No verdicts, anywhere.** No word, color, icon or ordering that says a color is short or fine. A test
   asserts the output carries no such field; the screen must not reconstruct one by comparing a count to
   Karsten's figure in the drawing's own logic. Showing the two figures side by side is the evidence.
   Highlighting the one that is lower is a verdict.
2. **Karsten is cited by name wherever his figures show:** Frank Karsten, "How Many Sources Do You Need to
   Consistently Cast Your Spells? A 2022 Update", TCGplayer. The land-count figure is his Commander
   regression; its constants are as quoted in secondary write-ups and not checked against the article,
   and its ramp term is partial (above). Design draws how the citation appears (open question 4).
3. **Help only on request.** Nothing is suggested when the tool opens. The player picks a color first.
4. **The identity rule.** The picker offers only colors in the commander's identity. A color outside it
   returns `inIdentity: false` and nothing else; the screen never draws a basic or a staple of a color
   the deck cannot play.
5. **Owned first.** In every help list an owned copy comes before one to buy.
6. **The two pip figures both exist.** Which leads, and how the other reads, is Design's (open
   question 2). Deck stats uses the figure with the commander.
7. **A locked card never moves** (a locked basic is never offered). Nothing to draw; stated so no frame
   implies otherwise.

## What Design owns

- **Layout inside the Tuning hub:** the tool body at 900 and 390, within the hub handoff's tool slot.
- **How a pattern row and its card list read.** Six patterns per color, each with a figure and a list of
  names, five colors at most, on a phone. Which patterns collapse, what a long list does, how a ceiling
  and `no published figure` look beside a number.
- **Pips, sources and the commander** side by side: how the player reads pips against sources without a
  verdict, and how the with-commander and without-commander figures sit.
- **Tapped lands:** three kinds, and a tapped count beside the average mana value.
- **The help flow:** the picker, the asked-for result, rebalance rows with before and after, trade rows,
  the staple list with owned and to-buy states and a price, and the "no safe rebalance" and "outside this
  deck's colors" results.
- **Empty and thin states:** `colorless`, `noSources`, the failed read (B8), a color with sources and no
  pips (Gishath's blue and black, below), a one-color deck, an empty staple list, which carries no reason (B7 above), and a failed help read (null), which reads like B8.
- **How the citation appears.**
- **Copy.** Every string goes through `/copy-review`.

## Open questions

1. **The roles strip's land cell** linked to Mana Balance when a color was short. With no verdict, when
   does `balance mana →` appear: always, when the deck has a colored pip, never? (Hub `README.md`
   "2 · Shortcuts"; `design-tables/tuning-hub.md` "Land cell — balance mana".)
2. **Pips with or without the commander** as the lead figure. Deck stats leads with it; Deckcheck does not.
3. **Does a help row apply?** The engine previews moves and does not write to the deck. Applying one would
   go through the deck's existing add and swap actions in a later build. Draw the apply affordance, or
   leave the rows as information?
4. **Where does the citation live:** per figure, per section, once in a footnote? Karsten's figure appears
   in every pattern row and in the land line.

5. **A reason for an empty staple list.** B7 named thin EDHREC data. The read cannot tell thin data from
   "everything is already held or filtered". Engineering can add a reason and a deck count if Design
   wants the state to explain itself; say so and it becomes a build task.

## Fixtures (staging, read-only, figures as of 2026-10-10)

Reproduce with `pnpm eval:mana` (section 2 prints every deck's evidence; section 3 the help). Deck ids:

| Deck | Id | What it exercises |
|---|---|---|
| HD - Gishath | `904fdc61-e190-4ba5-8e34-2b18fa0584f2` | Three colors. Green 56 pips (55 without the commander), 28 sources; patterns `6CCC` (a ceiling, at most 26), `1CC x3` (28), `2CC` (26). Blue and black each show 1 source and no pips (Farseek). 36 lands: 4 tapped, 5 conditional, 4 fetches. Average MV 4.34, Karsten's figure 42.2. Help for green: no safe rebalance; trades and staples are owned cards |
| HD - Avatar Aang | `0f585441-203e-475b-be7c-f11e67e20d79` | Four colors. Blue 28 pips, 21 sources, `CC x4` (30). Black has 9 sources and no pips. Help for blue: owned trades, a staple that makes every color |
| HD - Gods | `13a6dc28-958c-4591-a2bb-c0297bbe5d92` | A partner pair, so staple figures read `this pairing's decks`. Blue 29 pips, 20 sources, `2CC x6` (26). 37 lands: 2 tapped, 9 conditional, 1 fetch |
| HD - Wizards | `7653dec3-bcf4-4045-8242-9000765c7601` | A one-color deck: blue 75 pips, 37 sources, `CCC` (36). 35 lands, none tapped. Asking for any other color returns the outside-the-deck's-colors result |
| HD - Eldrazi | `0b49cb44-8ae2-4c19-b558-633344a2f4ed` | `colorless`: no colored pip. Lands, 4 tapped, average MV 4.76, Karsten's figure 43.8, and nothing per color |
| HD Tune - Blood Rites | `783df427-d0c5-456a-805e-cdc94ecb0952` | Two colors, commander Clavileño, First of the Blessed `{1}{W}{B}`. White 28 pips (with the commander), 24 sources; black 55 pips, 30 sources. Lead line (patterns 2+ cards share): white, `{2}{W}{W}` Kindred Boon, Redemption Choir, Return to Dust, `You have 24 · Needs 26`; black's tightest is `{B}{B}` Bloodghast, Cordial Vampire, Damn, 30 · 30. A single-card white pattern sits tighter than the lead and does not decide it: `{W}{W}` March of the Canonized, 24 · 30. Figures as of 2026-10-11 |

Card names, counts and prices are real and will drift with the decks and the collection; Design may
treat them as illustrative if the arithmetic stays consistent across frames, as the hub handoff did.

## Paths

- Engine: `src/lib/tuning/mana-balance.ts`, `mana-balance-load.ts`, `mana-help.ts`, `mana-help-load.ts`,
  `mana-staples.ts`; Karsten's table and formula: `src/lib/mana/karsten.ts`; tapped lands:
  `src/lib/mana/lands-tapped.ts`; patterns: `src/lib/mana/pattern.ts`.
- The switch: `manaBalanceEnabled` in `src/lib/tuning/flag.ts` (`MANA_BALANCE_ENABLED`, with
  `ANALYSIS_TAB_ENABLED`). Nothing reads it yet.
- Plan and the rejected rules: `docs/superpowers/plans/2026-10-10-mana-balance-tier-1.md`.
- Golden check: `docs/superpowers/eval/mana-balance-golden.json`; script `scripts/eval/mana.mts`.
- The hub brief this extends: `docs/superpowers/design-briefs/2026-10-08-tuning.md`. A neighbouring block on
  the same tab, drawn in a separate round: `docs/superpowers/design-briefs/2026-10-10-evidence-benchmarks.md`
  (its Mana velocity benchmark grades; Mana Balance does not).
- Shipped surfaces to reuse: `src/components/decks/tuning-panel.tsx`, `deck-stats-view.tsx`,
  `role-counter-strip.tsx`, `role-counter-cell.tsx`, `analysis-banner.tsx`, and the pips in
  `src/components/cards/mana-pips.tsx`.

## Deliverable

A handoff in `design/design_handoff_the99_tuning_hub/` (a new round) with the Mana Balance frames at 900
and 390 for: the evidence view on Gishath and on the one-color deck, the pattern rows, the thin
states (colorless, no sources, an empty staple list), and the help flow from pick to result on Gishath and Aang; the `STATES` rows and design-table
sections they change; and the About entry for the tool on the per-entry artboard (batched at the end of
the Tuning line, per `AGENTS.md`).
