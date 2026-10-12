# The 99: Stats on /decks (design handoff, R2; was Lineup)

`design/design_handoff_the99_lineup/` · 2026-10-11

**Status: R2, approved (LGTM, Hugh, 2026-10-12). Build from the R2 files.** R2 applies all of Hugh's R1 and R2 notes. It supersedes R1 where they differ, and every R1 call not named below stands. R1's files are kept for history only. Hugh's open questions are closed: both former proposals ship, a folder never scopes Stats, and the code name stays `LINEUP_ENABLED` / `lineup` with no `ABOUT_VERSION` bump. The design table is at R2.

| File | Holds |
|---|---|
| `The 99 - Decks Stats (R2).dc.html` | **Build from this.** C2: the R2 changes. 2a: color-identity marks. TH: six themes. P1, S1 (first visit), L2 (all open), F2, T1–T5, P0. Each is drawn at 900 and 390, and the frames are live (fold/unfold). |
| `Decks Stats.dc.html` | The R2 frame component (`scene`, `phone`, `theme`, `statsEnabled`, `mark` = cluster · pips · symbols · stripes). |
| `assets/brackets/`, `assets/mana/` | Copies of `public/brackets/bracket-{1..5}-*.svg` and `public/mana/{W,U,B,R,G,C}.svg`, for the canvas only. The build reads the shipped files and adds no new art. |
| `STATES-lineup.md` · `design-tables/lineup.md` · `READINESS.md` | States with must-nots (R2 deltas on top). The design table (**commit to `docs/superpowers/design-tables/lineup.md`**). Readiness. |
| `brand/` · `support.js` | The locked brand sheet, and the canvas runtime. |
| `decks-stats · copy strings.ts` | Proposed `src/lib/copy/decks-stats.ts`. It replaces `lineup · copy strings.ts`. |
| `The 99 - About · Lineup Entry.dc.html` · `about · lineup.ts` | The About entry, retitled **Stats: your decks, side by side** (`id: decks-stats`). |
| R1: `The 99 - Lineup (R1).dc.html`, `Lineup.dc.html`, `lineup · copy strings.ts` | History. |

## R2 changes
0b. **Shipped art and every theme (Hugh).**
   - **Bracket rows:** each row leads with the shipped bracket mark from `public/brackets/` (copied to `assets/brackets/`). It's drawn as `BracketMark` draws it: the file as a mask in `--bracket-N` ink, the file's own numeral masked out, and a Cinzel numeral on top.
   - **Range rows:** these show both marks, with the upper one at `DIM_OPACITY` 0.65.
   - **Decks per color:** the shipped mana symbol (`public/mana/`, in `assets/mana/`) is the row's key only, drawn as an image and never tinted (color-pips decision 7). The value is a segmented bar with one segment per deck in the lineup, lit in the color's ink for each deck that plays it, and reads `10 of 21`. The chosen deck's segment is ringed in accent.
   - **Alignment:** every row's mark, label and count now top-align to the first line of chips, so a wrapped "not analyzed" row reads as one row.
   - **Themes:** the frame takes `theme` (all six, from `globals.css`, with each display face), and section TH draws the brackets and colors card in all six.
0. **Copy sweep (Hugh).** Any line that explains what the UI already shows is cut, and what's left is shortened.
   - **Cut:** the strips' foot (jobs and value provenance), "each counting its own cards", "once per copy", the bracket-span and gap sentences (the rows show both), deck-select hints, and the partner-colors clause.
   - **Shortened:** captions are now mono fragments (`157 cards in 2+ decks · 13 in 5+ · basics not counted`, `Right edge is today.`, `ManaPool prices, 2h ago`). Legends are two or three words (`has a copy` / `no copy left`). Wanted rows read `×2 · HD - Gishath` and `58% of Gishath decks`.
   - **Kept on purpose:** "Right edge is today." The axis has no "today" label, because one collided with the Oct tick at 390.
1. **Lineup → Stats, everywhere a player reads it.**
   - **On /decks:** the switch reads `Tiles · Stats`, and the URL is `?view=stats`.
   - **Elsewhere:** the tile menu reads `See it among your decks`, and the About title is `Stats: your decks, side by side`. The copy file is `decks-stats.ts`.
   - **Code names:** the switch stays `LINEUP_ENABLED`, because ruling 5 named it. If Hugh wants it renamed too, the proposal is `DECKS_STATS_ENABLED`, which sits one letter from `DECK_STATS_ENABLED`. **Hugh to pick.** The folder keeps its R1 path.
2. **Color identity: clustered pips (A, Hugh's R2 note).**
   - **The mark:** mana-colored dots, 7px each, about 8px apart. A 1px `--border-dashed` outline hugs the group. It's drawn as the union of a 5.5px halo per dot, plus a centre halo for 3 or more, filled `--bg`. Each mark sits in a fixed 26px box. The count is a shape: 1 and 2 sit in a row, 3 make a triangle, 4 a diamond (the bracket chip's ◇), and 5 a star.
   - **Color order:** WUBRG, clockwise from the top. Colorless is one grey ring.
   - **Width:** fixed, so names line up whatever the identity.
   - **Alternatives:** A·1 (pips in a row), B (mana symbols) and C (R1 stripes) are drawn in 2a and behind the `mark` prop.
   - **Bracket chart:** now rows, one per slot (`1 · ↕ 1–2 · 2 …`), with a named chip per deck. Boundary rows are short and dashed. The not-analyzed row uses dashed chips.
   - **Color rows:** Decks playing each color keeps one solid square per deck.
3. **Every card folds.**
   - **The head is a button:** title, denominator and chevron, at least 44px tall.
   - **Folded:** one mono summary line (`--fg-muted` 11).
   - **First visit:** only the first card is open (S1).
   - **After that:** state is remembered per device. `Expand all` / `Collapse all` sits at the end of the filter row.
4. **This deck among yours.**
   - **Lines, not dots:** each deck is a 2×12 line, so ties never stack.
   - **The chosen deck:** a 12px accent dot with its figure printed above it.
   - **The scale:** the median is a taller `--fg` line. The lowest and highest values sit at the two ends.
   - **The right column:** a rank (`11th of 21`, most first) over `median …`.
   - **Groups:** The build (mana value, lands, ramp), Jobs (card draw, removal), Value.
   - **On ranks:** a rank is a count, not a verdict. **/copy-review** should confirm "most first".
5. **Curve against lands is cut** (Hugh: hard to parse).
   - **Proposed instead: What each deck is worth.** One bar per deck, sorted most first or by name, from each deck's own value (its Money figure, lock 2). The chosen deck is the accent bar, with a dashed median line.
   - **The head:** the summed figure, `$3,026.04`, alone.
7. **Wanted by your commanders gains a deck select**, the same control as This deck among yours.
   - **Default:** `All decks`.
   - **Choosing a deck:** narrows the list to that commander's cards, and the cut chips recount.
   - **A partner deck:** reads `commander_pair_support_cards`, and the row says so (T5).
   - **Data:** the per-deck counts (4 and 11 for Gods) are illustrative.
6. **Decks that share the most is cut.**
   - **The replacement proposal:** **Jobs, deck by deck**, a 21 × 4 grid of real counts, shaded within each column, sortable, with the chosen deck outlined. Its gap is G3: labels in the cache key.
   - **Two ideas, not drawn:**
     - Last changed against last played, from version dates. The dates exist (`deck_versions.committed_at`), so this is drawable. It's left out because it sits close to ruling 6's excluded version evolution.
     - Where the to-buy money sits, deck by deck: the roll-up as a lineup Buy chart.

---

# R1 (history; superseded by R2 above where they differ)

`design/design_handoff_the99_lineup/` · 2026-10-11 · mirrors `design_handoff_the99_all_decks_cart/` and `design_handoff_the99_added_copy/`

**Status: R1, for audit.** Source of truth: `docs/superpowers/design-briefs/2026-10-11-all-decks-stats.md` (main). Hugh's six rulings (2026-10-11) are taken as closed. Engineering's seven locks are drawn against. This round answers §"What Design owns" and the six open questions.

**Fixture.** The brief's 21-deck staging account: 15 decks never played, 7 games, 2 wins, pods 2×3, 4×4 and 1×5. 1,344 of 3,924 copies are in a deck. 77 cards are wanted more than owned (Sol Ring 20 wanted, 17 owned). Per-deck figures are the brief's table. **Illustrative:**
- each game's pod (the brief gives only the totals);
- owned counts for Exotic Orchard, Mind Stone, Rogue's Passage and Swords;
- every Finished-only figure except Sol Ring, Arcane Signet and Command Tower, which come from the cart's buy lists;
- one-deck collection figures;
- the wanted-by-commanders card names and shares;
- every number in the proposals.

**Widths.** 900 and 390, as asked for this round and as the /decks handoffs (cart, precons) are drawn. The brief's deliverable says 1300. At 1300 the stack is the same, held to a 900 column, and nothing reflows. **Hugh to confirm.**

**About these files.** The canvases are design references built in HTML. Open them with `support.js` beside them. **No new tokens, no new motion, no new dependencies.** The mana colours (`--w --u --b --r --g`), `--brass` and the bead shapes are Deck stats'. `--c` (`#7E8592`) is Deck stats' colorless constant, named here as a variable.

| File | Holds |
|---|---|
| `The 99 - Lineup (R1).dc.html` | C0: the calls and Q1–Q6. P0 off, P1 /decks Tiles, L1 Lineup (all decks), F1 Finished only, T1–T5 thin states. Every frame is drawn at 900 and 390. |
| `Lineup.dc.html` | The frame component (`scene`, `phone`, `lineupEnabled`). It's imported by the canvas. |
| `STATES-lineup.md` | Every state, with Must-nots. |
| `design-tables/lineup.md` | **Commit to `docs/superpowers/design-tables/lineup.md`.** |
| `lineup · copy strings.ts` | Proposed `src/lib/copy/lineup.ts`. Placeholders, with wording resolved by `/copy-review`. |
| `READINESS.md` | Self-assessed readiness and the gap report. |
| `The 99 - About · Lineup Entry.dc.html` | The About entry on the §G per-entry template, at 760 and 390. |
| `about · lineup.ts` | The new `AboutEntry`, for `src/lib/copy/about.ts`. |
| `brand/` | Locked brand sheet, copied for self-containment. |

## Design's calls (§What Design owns)

1. **Placement: a view of `/decks` (`?view=lineup`).**
   - **What it is:** `Tiles · Lineup` is a segmented switch at the head of the row that already holds the shelves (900) or the shelf trigger (390).
   - **Why:** it has the same shape as Deck stats' `All · Shopping | Stats`, a second view of something already on the page.
   - **The doors row isn't touched:** the cart and precon doors stay the 2-up row precons R2 set, so Hugh's flag is answered by not adding a third door. On a phone the shelf row grows from about 30 to 44px, so the first tile moves about 14px (about 465 → 479). The name, pills and bar stay above the fold (P1).
   - **In Lineup:** the shelves, search and tile filters leave, and the Lineup filter takes their row.
   - **Off:** with `LINEUP_ENABLED` off there's no switch, no read and no `?view` (P0).
2. **One card per figure, with decks as its rows (Q1).** There are seven cards: When each deck last played, Brackets and colors, Cards your decks share, Your collection put to work, This deck among yours, and two proposals.
3. **The filter is one control with two positions: `All decks` (the default, brews included) and `Finished only`.**
   - **The reading:** Hugh's three words (all decks · finished only · include brews) are read as two states, because "include brews" is what "all" already means.
   - **What it changes:** every chart redraws on the narrower set. Owned counts and per-copy totals never narrow, because a copy is owned whether or not a brew wants it (ruling 3).
   - **Remembering it:** this visit only.
   - **Needs Hugh:** if he meant a third state, it's "Brews only".
4. **Recency.**
   - **Lanes:** each played deck gets a lane on one time axis (10 Jul to today), with every game a Results bead (won `--brass`, lost outlined). A line runs from the last game to the right edge, which is today.
   - **Figures:** each lane shows `N days ago` and `won w of n · pod(s) of …`.
   - **Never played:** one dashed group under the lanes, with a hollow square and a linked name per deck (Q2).
5. **Brackets and colors.**
   - **Slots:** nine of them, `1 · 1–2 · 2 · 2–3 · 3 · 3–4 · 4 · 4–5 · 5`. A deck analyzed as a set of two sits on the boundary slot (Q3), and boundary slots are drawn narrower with a dashed rule.
   - **Decks:** one square per deck, striped in its identity. The unanalyzed sit beside the chart as hollow squares, counted.
   - **Opening a slot:** pressing it names its decks, with `declared N` where one exists.
   - **Facts as counts:** `No deck is at bracket 1 or 5 alone.` and `3 decks span 1–2 · 2 span 4–5.`
   - **Colors:** one row per color with one square per deck playing it (W 10, U 10, B 6, R 11, G 8, Colorless 1), then the identity sizes in a mono line.
6. **Shared cards.**
   - **The squares:** one per deck that plays the card. Filled `--fg-muted` is a deck holding a copy you own. Dashed is a deck that wants one with none left.
   - **The gap:** Sol Ring is 17 filled and 3 dashed, a count in the Buy chart's own squares. There's no `--warning` and no verdict word (Q4).
   - **Opening a row:** pressing it names the decks with no copy (the claim model's, lock 3) and links to the cart with its to-buy count. That link is the one `--warning` ink, as Money's Shopping link is.
   - **The chips:** `In the most decks` (default) and `Wanted more than you own · 77`.
   - **Links:** every card name opens its card.
7. **Collection, per copy owned.**
   - **The fields:** copies and value as unit fields, one square per 10 copies or per $10, in a deck (filled) against not in a deck (hollow).
   - **The fact line:** `34% of your copies are in a deck, and they hold 70% of the value.`
   - **Wanted by your commanders:** cuts at **40% by default (67)**, with 20% (144) one chip away. Each row names the deck as a link and the commander's share (Q5). A partner deck reads the pair's own list and says so (T5).
8. **This deck among yours.**
   - **The strips:** one per figure (mana value, lands, ramp, card draw, removal, value). The 21 decks are dots, the median is a tick, and the chosen deck is in accent with its figure and the median beside it.
   - **The figures:** the deck's own, from the same functions its Stats uses (lock 2). Value is per deck, so the foot says a shared card counts in both. Jobs rows say they count the same cards as Jobs, never naming how.
   - **Choosing a deck:** from the card's select, or from a tile's `…` menu (`Among your decks`, appended after the shipped items).
   - **Default:** the deck played most recently.
   - **The deck page:** not touched this round. A `Among your decks ⟶` foot on Stats is a later proposal.
9. **Results are raw (ruling 4).** The card head reads `won 2 of 7 · 7 games · pods of 3–5`, and each lane gives its own (Q6). There's no rate.
10. **Proposals, dashed in brass and marked PROPOSAL.**
    - **Decks that share the most:** pairs by shared nonbasic cards, with the reason they pair (same commander, same colors).
    - **Curve against lands:** one square per deck, with median lines.
    - **Data:** both read data the app already holds. Hugh keeps or cuts them.
11. **Links.** Every deck name in every chart is a link to that deck (dotted `--accent` underline, as the tile's to-buy link is). Every card name opens its card.

## Open questions, answered
1. **Per figure or per deck?** Per figure, with decks as rows.
2. **Never played:** one dashed group, off the time axis, with each deck named.
3. **Two brackets:** on the boundary slot. **Unanalyzed:** beside the chart, hollow and counted.
4. **20 against 17:** filled and dashed squares, and `20 decks · you own 17`.
5. **Commanders' cut:** 40% by default, 20% one chip away. Names the deck and the commander's share.
6. **Results:** the lineup total and each deck's own.

## About entry
- **Placement:** `lineup`, chapter 04 · Playing and tuning, after `deck-stats`.
- **Version and switch:** behind `LINEUP_ENABLED` (a new `AboutSwitch` member). No `ABOUT_VERSION` bump and no `since`: a switched entry is seen by id when its switch turns on (Hugh, 2026-10-12; audit finding 5).
- **Template:** the §G per-entry template, at 760 and 390: `The 99 - About · Lineup Entry.dc.html`, with `about · lineup.ts`.
- **Key lines:** they quote no fixture figure.
- **Specimen:** the shared-cards row for Sol Ring, read-only.

## Gap report
- **G1 · Per-game pod size.** `resultsStats` doesn't read pods (brief). Every `pod of N` needs the pod count from the game row through the same function. The brief's totals (2×3, 4×4, 1×5) exist, so the column does.
- **G2 · Who holds a contested copy.** The shared row's open sentence names the decks with no copy. That's `claimModel`'s placement, and Lineup must not re-derive it (lock 3). Under seniority, brews come last, so with no assignments staging names the three brews.
- **G3 · Cache key.** The `/decks` payload gains Lineup's reads. `LINEUP_ENABLED` joins `switches()`. Jobs (ramp, draw, removal in the strips) read labels, so staging needs a label generation in the key, or a stamp from the label build (lock 5). This is load-bearing for the strip card.
- **G4 · `loadDeckStats` doesn't cover jobs, owned value or pips.** The strip card's ramp, draw and removal need `jobTally` per deck in a fixed number of reads (lock 4). Owned value needs the collection read priced once.
- **G5 · Short names.** Charts draw full deck names, as the cart did (cart G1). The bracket and colour squares carry no name and name their decks on press.
- **G6 · Tile menu.** `Among your decks` is appended to the tile's `…` menu. The shipped items weren't re-read and are drawn as one faint line.
- **G7 · `?view=lineup`.** This is a new search param on `/decks`. It's off and ignored with the switch off. Whether the view is remembered per device, as Stats is, is engineering's call. Drawn: remembered.
- **G8 · Pairs and the scatter (proposals)** need one more aggregate over the decklist read: pairwise overlap, which is 210 pairs. The scatter needs nothing new.

## Not done this round
- The deck page's own entry into Lineup.
- Folders: whether a shelf narrows Lineup. In Lineup the shelves leave. Hugh decides whether a folder should scope it.
- Amonkhet and Kamigawa.
