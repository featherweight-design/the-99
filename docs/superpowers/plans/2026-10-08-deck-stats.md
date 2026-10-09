# Deck Stats, round 1 — implementation plan

Plan, 2026-10-08. Hugh ruled 2026-10-08: "Deck stats is ready to be built and should proceed."
Sources: the design brief (`docs/superpowers/design-briefs/2026-10-03-deck-stats.md`), the
handoff (`design/design_handoff_the99_deck_stats_view/`: `README.md`, `STATES-deck-stats.md`,
`READINESS.md`, `ABOUT-entry.md`), and Hugh's 2026-10-08 addition — a mana cost vs. mana
production chart sharing one computation with the upcoming Mana Balance tool. This plan does not
implement; it sequences the handoff into PRs for Hugh's review.

## What's already decided (recap, not re-litigated here)

- **Placement.** R2's final call: one segmented control, `All · Shopping | Stats`, replaces the
  two existing pills on the deck's Your deck panel. No sixth tab. Off: no segment, no fetch.
  Switch: `DECK_STATS_ENABLED`, read server-side the same way `analysisTabEnabled()` reads
  `ANALYSIS_TAB_ENABLED` (`src/lib/decks/analysis-flag.ts`).
- **Six cards, seven views.** (a) curve + types, (b) colors asked-for vs. made, (c) money and
  ownership, (d) you vs. the commander average, (e) jobs from card labels, (f)+(g) results
  overall and by version. Facts only — no success/warning/danger tokens; `--warning` is reserved
  for "to buy" / Shopping, as it already is.
- **Readiness: 🟡 amber, green with eng resolutions** (recorded in `READINESS.md`): the
  starting-mix fallback draws lands/roles only, no curve/types; the About anchor moves to "end
  of chapter 04" since the cited anchor id doesn't exist; thin states for (c) and (e) reuse the
  (a)/(b)/(d) treatment.

## New in this plan: the mana cost vs. production chart

Hugh, 2026-10-08: he also wants a Deckcheck-style chart — pips demanded per color against
sources that produce each color, so a player can see where the mana base is short — and it must
share **one computation** with the upcoming Mana Balance tool, counting every source (basics,
duals/utility lands, rocks, dorks, land search), with pips weighted by curve.

**Does the handoff draw this? Partly.** Card (b), "Colors, asked for and made," is exactly this
chart's shape — a butterfly per color, pips left, sources right, counts printed — and R2 already
locked its layout. But its computation is narrower than what Hugh is now asking for:

- **Land-side is close.** `READINESS.md` Q1 already specifies a real counting policy (dual =
  each color it can add, fetch = the basic types it fetches, any-color land = each of the deck's
  colors), replacing the `colorIdentity` heuristic. This is buildable and matches Hugh's "duals/
  utility lands" bucket.
- **Non-land sources are explicitly NOT attributed by color in the handoff.** `READINESS.md` Q1
  and the About entry's own key line ("Mana sources that aren't lands are counted, but their
  colors aren't") both say rocks and dorks are drawn as a hollow, uncolored count. `STATES
  §B` (1d1) confirms: "hollow squares for non-land sources." Hugh's 2026-10-08 ask — counting
  rocks, dorks, and land-search as real per-color supply — is a bigger computation than what's
  drawn, not a restatement of it.
- **"Pips weighted by curve" is not in the brief or the handoff at all.** Today's only pip
  reader, `manaNeeds()` (`src/lib/profile/build.ts`), returns one entry per pip with no weighting
  concept; `colours()` reduces pips to a yes/no producible set, never a count. Card (b) as drawn
  prints a raw pip-share butterfly (R1 ruling 3), not a curve-weighted one. What "weighted by
  curve" should mean numerically (every copy's pips counted at full weight regardless of mana
  value, versus downweighting pips that show up later in the curve) is not specified anywhere
  Design or Eng has recorded, and this plan does not invent it.

**This needs a small Design addendum before its PR**, specifically to confirm:

1. Whether attributing rocks/dorks/land-search to real colors changes card (b)'s right-hand
   side from hollow squares to colored ones (a visual change to 1d1/1d2/1d3, not just a data
   change), and whether the butterfly's proportions still read at the same sizes once non-land
   supply is colored in.
2. What "pips weighted by curve" means as a number — e.g., does every pip count once per copy in
   the deck (today's behavior) regardless of when it's cast, or does a pip's weight fall as its
   card's mana value rises? Hugh's phrasing implies the latter; nobody has specified a formula.
3. Whether Mana Balance's prescriptive read (what to add/cut) needs anything from this module
   that the descriptive chart doesn't — if so, name it now so the shared module's shape doesn't
   get redesigned when Mana Balance's own brief lands.

Until that addendum exists, this plan ships card (b) in round 1 at the **handoff's own
spec** (land-side real counting per Q1, non-land as a hollow count, no curve weighting) in PR 4
below. The richer, Deckcheck-style, curve-weighted, fully-attributed version — and the module
shared with Mana Balance — is a separate PR (PR 4b), blocked on that addendum, sequenced after
round 1's other six cards so it never blocks the rest of the line.

### The shared module

`src/lib/mana/supply.ts` (new). One pure function, read-only over data the deck page already
loads — no new fetch beyond what card (b) needs anyway:

```ts
function manaSupply(cards: ManaSupplyCardRow[]): {
  demand: Record<Color, number>;       // pips demanded, per color
  supply: Record<Color, { lands: number; nonland: number }>; // sources, per color
  unattributedNonland: number;          // ramp/dorks counted but not colorable (PR 4 only)
};
```

- **PR 4 (round 1, card b as drawn):** `supply[color].lands` from the real land-counting policy
  (Q1). `supply[color].nonland` stays 0; non-land ramp/dorks go into `unattributedNonland` only.
  `demand` is the raw per-color pip count (`manaNeeds()` summed), unweighted.
- **PR 4b (blocked on the addendum):** extends the same function — never a second one — to
  resolve `supply[color].nonland` from oracle text (extending `classifyRoles`'s `ramp` pattern
  with a color-producing-text parse) and to apply whatever curve-weighting the addendum
  specifies to `demand`. Mana Balance (a later, separate feature) is this function's second
  caller; this plan does not design Mana Balance's own UI, only names where its shared
  computation will live and which PR introduces each half.

**A measurement taken for this plan, read-only, staging** (`misty-rain-01681654`,
`br-polished-pond-a6e63y0b`, 2026-10-08): of 34,296 non-land cards in the catalog, 755 match a
`{T}: Add ` pattern (today's `classifyRoles` ramp signature), of which 310 name a single WUBRG
pip directly (`{T}: Add {R}`-shaped — trivially attributable to one color with no further text
work) and 187 match the land-search ramp pattern. This says PR 4b's non-land attribution is
buildable for a real fraction of ramp cards with simple pattern extraction, not that every ramp
card resolves cleanly — cards like "add one mana of any color" or multi-mana-ability rocks need
more parsing than a single-pip regex, and that harder tail is PR 4b's to size once the addendum
exists.

## PR boundaries

No stacked PRs; each lands on `main` independently once reviewed. Target ~20 files / ~800 lines
each; most of these are well under that, since each adds one card to an existing page rather than
a new route.

| # | PR | Scope | Depends on | Design addendum needed? |
|---|---|---|---|---|
| 1 | Switch + placement shell | `deckStatsEnabled()`; `All · Shopping \| Stats` segmented control replacing the two pills (desktop + phone, `STATES §C/§E`); six card shells (title + rule, empty body); no data wired up yet. Off: no segment, no fetch (`READINESS` check-before-merge item 1). | none | no |
| 2 | Curve + types (a) | `typeBreakdown()` in `stats.ts` parallel to `manaCurve()`; card UI, type-chip tap-to-light interaction, thin state (`STATES` 1c1-1c3). | 1 | no |
| 3 | Jobs (e) | `readLabels()` tally by `Job.kind`; unlabeled-card count; card UI with tap-to-expand row (`STATES` 1e1-1e2). | 1 | no |
| 4 | Colors (b), as drawn (ruling 9) | `src/lib/mana/supply.ts` (land-only supply, raw demand); card UI, butterfly, thin/no-lands/one-color states (`STATES` 1d1-1d3). | 1 | no (ships to handoff spec) |
| 4b | Colors (b), richer + Mana Balance module | Extends `manaSupply()` with non-land color attribution and curve weighting per whatever the addendum settles; updates card (b)'s right-hand side if the addendum calls for colored (not hollow) non-land squares. | 4, the addendum | **yes — blocked** |
| 5 | Against the average (d) | Lighter read into the basis chain (`loadSkeletonForCommanders`, via the `deck-mix.ts` pattern — not the full `loadDeckProfile`); diverging-bar card; starting-mix fallback draws lands/roles only per the eng resolution (`STATES` 1f1-1f3). | 1 | no |
| 6 | Money and ownership (c) | Per-card price join against the decklist (new derivation joining `loadPrices()` / `priceOf()` directly, parallel to `loadShoppingRollup`'s aggregate) for deck value and the priciest-five list; reuses the existing `DeckShopping` aggregate for the buy figure; card UI, owned/unpriced/all-owned states (`STATES` 1g1-1g3). | 1 | no |
| 7 | Results (f + g) | Trend from `listDeckGames()`'s ordered read (new pure function, no new query); new `group by (versionId, result)` query for by-version; "Version not recorded" bucket last, never dropped (`STATES` 1h1-1h3). | 1 | no |
| 8 | `finding ⟶` links | Wires the Analysis-finding link (ruling 2) onto whichever figures in (a)-(g) have a matching finding once (d), (c) and the rest exist to link from. Small; could fold into PR 5-7 instead of standing alone — call at PR-review time once the earlier cards' shapes are visible. | 2-7 | no |
| 9 | About entry + `ABOUT_VERSION` bump (batched, last) | New `deck-stats` entry, chapter 04, appended at the end (not after `suggested-changes` — that anchor doesn't exist, per the eng resolution). Bump `ABOUT_VERSION` (currently 11 on `main`) by one. Ships last in the line, after every card above, per the batching rule in `AGENTS.md`. | 1-8 | no |

PR 4b is explicitly **not** numbered into the main sequence — it can land anytime after the
addendum returns, including after PR 9, without blocking the About entry (the About entry
describes card (b) as drawn in PR 4; if 4b changes the drawing materially, that's an ordinary
edit to the existing entry, not a new one — see `AGENTS.md`'s cosmetic-vs-feature rule, applied
the other direction: a real computation change to a card already described is the kind of thing
that DOES warrant revisiting the entry's key lines, at whatever version comes next).

## Route × viewport inventory (feature-acceptance)

One route, two widths, both already covered by the existing deck page:

| Surface | 390 | 1300 |
|---|---|---|
| `/decks/[id]` — Your deck panel, Stats segment selected | yes | yes |
| `/decks/[id]` — Your deck panel, All/Shopping segments (unchanged, verify no regression) | yes | yes |
| `/decks/[id]` — each of the 6 cards' states from `STATES-deck-stats.md` §A/§B (populated, loading, not-analyzed, thin, empty, one-color, all-owned, unpriced, 1-5 games, 6+ games, brew/no-versions, version-with-no-games) | yes | yes |
| `/about` — new `deck-stats` entry, chapter 04 | yes | yes |
| Switch off (`DECK_STATS_ENABLED` unset) — no segment, no fetch, panel unchanged | yes | yes |

A contact sheet (per PR, and again at close-out per `feature-acceptance`) should walk every row
above at both widths — this is the inventory that skill's contact-sheet step reads from. The
`finding ⟶` link (PR 8) additionally needs an "Analysis has a finding on this figure" case and a
"no finding" case at both widths, since its absence is a drawing rule (`READINESS` check-before-
merge), not just a missing feature.

## Data reads

The brief already ran read-only `COUNT`s against staging (`THE_99_NEON_STAGING_DIRECT`, branch
confirmed `br-polished-pond-a6e63y0b`, 2026-10-03) for every round-1 item except the new mana
module:

| table | rows | populated | covers |
|---|---|---|---|
| `commander_support` | 3,468 | 3,467 carry `avg_land`/`avg_ramp`/`avg_curve` | PR 5 |
| `identity_composition` | 19 | all 19 carry role figures | PR 5 fallback |
| `card_labels` | 32,099 | one row per distinct oracle id | PR 3 |
| `deck_games` | 6 | 5 with `version_id`, 1 null | PR 7 |
| `deck_versions` | 26 | across the account's decks (thin dataset) | PR 7 |

This plan added one more read-only staging query (2026-10-08, same project/branch) for PR 4b's
sizing, cited above under "The shared module": 755 of 34,296 non-land catalog cards match the
`{T}: Add` ramp pattern, 310 of those name a single color directly, 187 match the land-search
pattern. No write, no production access.

Nothing else in this plan needs a new staging read before implementation — PRs 1-7 all build on
loaders and tables the brief already verified populated. If PR 4b's addendum settles on a
specific non-land parsing rule, re-measure its exact hit rate on staging before committing to a
floor (the pattern every classifier in this repo with a measured floor already follows —
`classifierCollapse`, `measure:tutors`).

## Tests

- `stats.ts` additions (`typeBreakdown`, trend, `manaSupply`): pure-function unit tests, one
  case per bucket boundary (the `7+` ceiling, the null-version bucket, the hollow-vs-colored
  non-land split in PR 4 vs. 4b), following the existing `manaCurve()` / `playRecord()` test
  shape.
- The by-version query (PR 7): a `.toSQL()` assertion if it's a correlated subquery over a
  single table (`deck_games` grouped against itself) — see `AGENTS.md`'s qualified-column
  convention — plus a fixture test against a known game count, the same two-sided proof
  `probe:versions` already uses for tab-row figures.
- Switch off (PR 1): a test asserting no segment renders and no stats loader is called when
  `DECK_STATS_ENABLED` is unset, mirroring `analysisTabEnabled()`'s own test.
- Thin/empty states (every PR 2-7): one test per state in `STATES-deck-stats.md` §B that
  actually can render with a fixture that thin (zero games, zero lands, a starting-mix fallback
  deck) — not just a snapshot of the populated case.
- `finding ⟶` (PR 8): a test that the link is absent when no finding exists for a figure, since
  `READINESS`'s check-before-merge explicitly calls out "never a prompt to analyze" as a failure
  mode, not just a cosmetic miss.

## Proposed curve weighting (engineering's proposal, for the Design addendum)

Question 2 above asked what "pips weighted by curve" means as a number. Engineering proposes:

**weight(mv) = min(1, 2 / (mv + 1))**, applied per pip, times copies in the deck.

| mana value | 1 | 2 | 3 | 4 | 5 | 6 | 7+ |
|---|---|---|---|---|---|---|---|
| weight | 1.00 | 0.67 | 0.50 | 0.40 | 0.33 | 0.29 | 0.25 (7 = 0.25, 10 = 0.18) |

- **Why this shape.** A pip on a cheap card must be payable early, so it constrains the mana base
  most; a pip on a six-drop has many turns of land drops to be found. The weight falls steeply
  at first and flattens, so a late bomb never rounds to zero. Commander is a deck of 99 plus one
  and casts from the command zone, so the commander counts once at its own mana value.
- **Rules.** Lands carry no pips. Hybrid pips follow `manaNeeds()`: a pip counts toward each color
  every half names, and a pip with a non-color half (`{2/W}`, `{W/P}`) demands nothing. X costs use
  mv with X = 0. A mana value of 0 weighs 1.
- **What it changes (the number the chart prints).** Raw pip counts stay printed; the bars show
  each color's SHARE of weighted demand.

**Worked example: "HD - Yuriko" on staging** (`fc97e49c…`, 2026-10-09, read-only, 94 `deck_cards`
rows, non-land cards with a mana cost, single-color pips only):

| color | raw pips | weighted | raw share | weighted share |
|---|---|---|---|---|
| U | 66 | 36.9 | 71.0% | 69.8% |
| B | 27 | 16.0 | 29.0% | 30.2% |

On this deck the weighting moves each share by about a point, because its blue and black pips sit
at similar mana values. Expect the weighting to matter on a deck whose second color is all cheap
interaction or all expensive finishers, and to be nearly invisible elsewhere. Design should not
draw it as a second chart for that reason; it changes the bars' lengths only.

**The one alternative rejected: weight = 1 / mv.** It is simpler to state but too steep: a
one-pip seven-drop counts 0.14 against a one-drop's 1.0, and on this deck it moves U from 71.0% to
69.6%, no more than the proposal does, while making expensive color-critical bombs read as noise
on decks where they carry the plan. It also reads a mana value of 0 as a special case.

**Second deck: "HD - Gishath" on staging** (`904fdc61…`, 2026-10-09, read-only, 85 `deck_cards` rows
plus the commander, 64 non-land cards with a mana cost, same rules and the same single-color
filter as above):

| color | raw pips | weighted | raw share | weighted share |
|---|---|---|---|---|
| G | 56 | 22.2 | 56.0% | 56.9% |
| R | 26 | 10.3 | 26.0% | 26.3% |
| W | 18 | 6.6 | 18.0% | 16.8% |

The weighting moves a share by at most 1.2 points (white down, green up 0.9), and the order of the
colors is unchanged. On a three-color deck it is as quiet as on Yuriko's two, so the proposal
changes bar lengths by about a point on both decks measured and flips no reading.

## Settled by Hugh

- **Ruling 9 (Hugh, 2026-10-08): card (b), colors, ships as drawn in PR 4 (lands by color).** The
  richer mana chart (non-land attribution, curve weighting) goes to Design as a small addendum
  citing the section above; PR 4b waits for it. The PR 1 to PR 4 sequence does not wait.
- PR 8 (`finding ⟶` wiring) is decided at PR-review time, once cards (a) to (g) exist to link from.
  It is a sequencing call, not a design one, and not a blocker for any earlier PR.

## Open items for Hugh

None blocking PRs 1 to 4. Pending: the Design addendum for PR 4b (non-land color attribution's
effect on the butterfly's drawing, and ratifying or replacing the curve weighting above).
