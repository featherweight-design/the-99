# Design Brief — What this deck is, in four figures

**Workshop:** 2026-09-11, Hugh + agent. No ticket — one of that workshop's five groups. This brief is
the source of truth the Claude Design handoff prompt points at.

**Verified against `origin/main` at `e4b40752` on 2026-09-12.** Every `file:line` below was read on
that commit, not recalled.

Four figures describe a deck: how it has played, what colours it actually is, what it costs to cast,
and what finishing it costs to buy. The computation for all four is merged and unit-tested
(`src/lib/decks/stats.ts`, PR #524). Nothing draws them. This brief is about where they appear and
what they say — and, more than anything, about the three of them the app **already states somewhere
else**, in a shape a new block must not contradict.

---

## §1 The four figures, as computed

| Figure | Function | Shape returned |
|---|---|---|
| Play record | `stats.ts:35` `playRecord`, `stats.ts:51` `recordFromCounts` | `{ wins, losses, draws, played }` |
| Colour identity spread | `stats.ts:121` `colourSpread` | `{ W, U, B, R, G, colourless, copies }` |
| Mana curve | `stats.ts:190` `manaCurve` | `{ buckets: [0…7], copies, average, lands }` |
| Cost to complete | `shopping-rollup.ts` via `stats-query.ts:37` `DeckStats.cost` | `{ copies, cents, pricedCopies }`, **or `null`** |

`loadDeckStats` (`stats-query.ts:84`) answers for every deck at once and `loadOneDeckStats`
(`stats-query.ts:187`) narrows to one, so Home's roll-up and a deck page cost the same round trips.
`sumPlayRecords` (`stats.ts:67`) and `sumColourSpreads` (`stats.ts:136`) exist for the roll-up
specifically — see decision 2.

**`cost` is nullable, and null is not zero.** A deck with nothing to buy has no roll-up entry at
all and `cost` is `null` (`stats-query.ts:47`, assigned at `:179`) — that is the finished deck.
`{ copies: 3, cents: 0, pricedCopies: 0 }` is a different state entirely: three copies to buy and no
price for any of them, because the feed omits an out-of-stock card rather than pricing it at zero.
Both must draw differently from each other, and neither may draw as `$0.00`.

**Both commanders are in the colour spread and the curve.** They are not `deck_cards` rows, so the
loader reads them separately and folds them in at one copy each (`stats-query.ts:143-159`). A deck's
`copies` is therefore the 99 *plus* its commander — 100 for a single-commander deck, and the pair
already counts as two of its own 99. Any denominator a surface prints must be `copies` as returned,
not a hard 99, or the figures on screen will not add up to the ones computed.

Two further computed properties Design should know before drawing:

- **The colour figures sum to more than the deck.** A multi-colour card counts once per colour, not
  fractionally, so a Golgari deck can report 60 black and 55 green over 100 copies. `copies` is carried
  beside the five for exactly this reason, and any share drawn from these figures divides by
  `copies`, never by their sum. The rule is documented at `stats.ts:97-119`.
- **The curve has eight buckets and bucket 7 is a ceiling** (`stats.ts:153`), lands excluded and
  reported separately as `lands` (`stats.ts:163-188`). A land creature counts as a land
  (`cards/facet.ts:45` `isLandFace`).

---

## §2 Decisions locked in the workshop

1. **All four figures ship.** Not a subset, not a phased two-now-two-later.
2. **The deck page carries the per-deck figures; Home shows roll-ups of the same vocabulary.** One
   meaning at two altitudes, never a third definition. This is a constraint on wording as much as on
   arithmetic: if the deck page calls it *cost to complete*, Home does not call the sum of the same
   figure something else.
3. **Nothing new is captured to produce them.** Every figure is a fold over data the app already
   holds — `deck_games`, `deck_cards` joined to `cards`, and the ManaPool price read.

---

## §3 What Design is being asked to call — open

- **§3.1 The block's shape at both breakpoints.** Four figures of four different shapes — a
  record, a five-way distribution, an eight-bucket series and a money figure — have to sit together
  as one block on a phone and on a desktop. This is the substance of the handoff.
- **§3.2 What a deck with no games shows.** The record is never absent — `recordFromCounts([])`
  returns all zeroes (`stats.ts:51`), so the loader always hands the block a record. The question is
  what the block does with it: `0–0` is a figure nobody played, and an omitted row leaves a hole in
  a four-part block. The Games tab answers the same question at its own altitude by **replacing**
  the panel at zero rather than drawing an aggregate of nothing (`games-panel.tsx:148-151`), so
  whatever the block does should not contradict it.
- **§3.3 Whether the curve is a chart or a row of counts.** Eight buckets is small enough to print
  as numbers and shaped enough to draw as bars. The choice changes how much vertical room the
  block needs and whether the phone frame can carry the same drawing as desktop.
- **§3.4 What the roll-up altitude actually shows.** Decision 2 fixes the vocabulary, not the
  selection. A summed record and a summed colour spread are meaningful across decks; a summed mana
  curve is arguably not, and cost already has a home on Home (§4). Design says which of the four
  appear at the roll-up altitude and what each one is for there.
- **§3.5 Where the block sits on the deck page.** §5 shows the page is already dense with
  measurement, and the four figures could be a fourth tab, a section under the decklist, or part of
  the spine. Design calls it — and says what, if anything, comes out to make room.

**Reference, named not copied:** Hugh's own comparison was **deckcheck's overview bar** — the strip
that states a deck's shape in a row of small figures. It is a useful pointer to the density being
asked for. It is not a target to reproduce, and this app's own vocabulary (§5) outranks it wherever
the two disagree.

---

## §4 Constraint — three of the four figures are already on screen somewhere

This is the part a new stats block can most easily get wrong. Each of these is a shipped, ratified
statement of the same underlying number, and a block that restates it differently makes the app
disagree with itself.

**Play record — the Games tab already states it, and its property table forbids one phrasing.**
`games-panel.tsx:33-43` builds the record line, `game-headline.ts:38` reads
`summary.record`, and `docs/superpowers/design-tables/game-log.md:121` rules that the tab's own
count is *"games logged, never the record"*. The record line is drawn in `--accent`
(`game-log.md:33`). A stats block stating `3–1–1` beside a Games tab labelled with a count is fine;
a stats block that relabels either one is an amendment to that table.

**Mana curve — the deck page already states a mana *value*, as a single number that moves.**
`versions.ts:246` `versionManaValue` feeds `draft-state.ts:343` `manaValueBefore`, and deck
versioning Surface 2's what-changed strip draws it as the first of six cells with the copy
`the curve comes down` / `the curve goes up` (`deck-versioning-surface-2.md:183`, cell inventory at
`:642`). That table also rules twice over that mana value appears **in the strip alone** and never
on a card row (`deck-versioning-surface-1.md:780`, `deck-versioning-surface-2.md:618`).

So the app already uses the word *curve* for a one-number average. Drawing an eight-bucket curve
elsewhere on the same page is either a second reading of one word or a deliberate split — Design
must say which, and if the two coexist, what each is for. Engineering note: both figures come from
one predicate now (`isLandFace`, `cards/facet.ts:45`), so they cannot disagree about which cards are
lands; the question is entirely one of language and placement.

**Cost to complete — four surfaces already print it, and they do NOT all print the same figure.**

| Surface | Draws | Source |
|---|---|---|
| Deck tile on `/decks` | `3 to buy · $18.40` | `deck-card.tsx:80-82`, from `loadShoppingRollup` |
| Home's deck rail | copies only, no money | `deck-rail.tsx:51-52`, from the same roll-up |
| Home's Commitments card | `To buy` copies and money, desktop only | `commitments-card.tsx:88-91`; `:61` is `hidden sm:flex` |
| Deck page's price strip | the deck's own Shopping total and provenance | `price-strip.tsx:15`, mounted at `group-toggle.tsx:203`, summed at `decklist.tsx:181` |

**Three of those four read `loadShoppingRollup`. The deck page's strip does not.** It sums the
decklist's own Shopping rows — `summarisePrices(shoppingCards, newestAsOf)` at `decklist.tsx:181`,
over the rows the `Shopping N` pill counts — while the roll-up returns a **deficit**: what this deck
still has to buy after seniority hands it the copies it already holds
(`availability-query.ts:463-465`). So a deck that owns two of its three copies of a card contributes
one copy to the roll-up and three rows' worth of quantity to the strip. Both are correct answers to
different questions, and the fact that the app already answers "what does this cost" two ways is a
finding this brief hands to Design rather than a discrepancy to be quietly averaged.

`DeckStats.cost` is the roll-up figure, narrowed to one deck (`stats-query.ts:37`) — the deficit,
not the strip's total. Design says whether a stats block states it a **fifth** time and, if so,
which of the two figures it means. The existing surfaces also disagree on a smaller thing worth
settling: the rail prints copies without money, everything else prints both.

**Colour identity spread is the one genuinely new figure.** Nothing draws a deck's colour
distribution today — `IdentityPips` (`commanders/commander-art.tsx:19`) draws a *commander's*
identity as pips, which is a different claim: the commander's colours are the deck's legal bounds,
not how the 99 actually landed inside them. Design should expect this figure to need its own
vocabulary rather than an existing one stretched.

---

## §5 The deck page is already carrying two strips and three tabs

Before adding a block, this is what the page holds. `builder-tabs.tsx:9` defines the three views —
`deck | consider | games`. `builder-shell.tsx:863` mounts the `RoleCounterStrip`, whose five cells
(`role-counter-strip.tsx:46` `ROLE_ORDER`: ramp, draw, removal, wipes, land, against the targets in
`mix.ts` `RECOMMENDED_MIX`) already state a per-deck measurement against a recommended target. `builder-shell.tsx:924` mounts the `GamesPanel`. Deck versioning adds
the six-cell what-changed strip on top of that.

So the four figures are not landing on an empty page; they are landing next to two existing strips
of small figures, one of which (roles) is measured against targets and one of which (what-changed)
is measured against the previous version. **The stats block is a third kind: measured against
nothing.** Design should say how a reader tells the three apart at a glance, or fold them.

---

## §6 Dependency — the home redesign is where the roll-up altitude actually lands

`2026-09-11-one-commander-image.md` §5 records the home redesign as Group D of the same workshop:
*"'Pick up where you left off' reshaped to 3–4 decks, the Your Decks rail removed, a stats block
added on both frames."* That block is this brief's roll-up altitude, and Home's current two-column
body (`dashboard.tsx:109-129`) is what it lands in — beside `ReadyToBuild`, `ResumeDecks`,
`DeckRail` and `CommitmentsCard`.

**The home brief is not written yet and waits on the commander-image treatment** it renders. So
Design has a choice about sequencing, and should say which they are doing rather than leave it
implicit: draw the roll-up here and have the home brief adopt it, or specify the deck-page block
only and hand the roll-up to the home handoff with this brief's vocabulary attached. Decision 2
holds either way — whatever draws the roll-up uses these names and these functions.

One thing that follows from the home redesign either way: **the Your Decks rail is going**
(`deck-rail.tsx`), and it is one of the four surfaces printing cost today. Its removal is not this
brief's to make, but a Design answer to §4's cost question should not assume the rail survives.
