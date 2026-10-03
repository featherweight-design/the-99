# The fill includes the staples (H25)

Plan, 2026-10-02. For Hugh's approval: not merged until he rules.

Hugh's walk note (intake H25): "Auto-build includes the staples (Sol Ring, Arcane Signet) plus
per-color staples (Swords to Plowshares…)".

## 1 · What happens today, measured

**Only the two decks the app filled lack them.** Hugh's staging account (`user_3GkZ…`, 22 decks)
owns 17 Sol Rings and 15 Arcane Signets. 20 of the 22 decks hold a Sol Ring and 18 hold an
Arcane Signet. The two holding neither are exactly the two with `decks.filled = true`:

| Deck | Commander | How it was made | Sol Ring | Arcane Signet | Swords |
|---|---|---|---|---|---|
| Test Landfall | Omnath, Locus of the Roil | Help me choose, $100, bracket 3 | no | no | n/a (no W) |
| HD - Omnath | Omnath, Locus of Creation | Help me choose, no budget | no | no | no |

Read-only on staging (`br-polished-pond-a6e63y0b`), 2026-10-02.

**The real fill, run again, still leaves them out.** `buildFillPlan` was run for Hugh's account on
a scratch branch of staging (`br-floral-cloud-a6gwnw1n`, deleted after). It was run for four
commanders: both Omnaths, and two decks he built by hand with a Sol Ring (Krenko, Mob Boss and
Thorin Oakenshield). All four leave out both cards, though the player owns them and EDHREC's inclusion for them is high:

| Commander | Sol Ring inclusion | Arcane Signet inclusion | Placed |
|---|---|---|---|
| Omnath, Locus of Creation | 64.7% | 48.2% | neither |
| Omnath, Locus of the Roil ($100, b3) | 60.2% | 42.3% | neither |
| Krenko, Mob Boss | 85.2% | 52.6% | neither |
| Thorin Oakenshield | 75.6% | 65.2% | neither |

**The cause is the role pass's tie-break, not the pool.** Both cards are in the pool, owned,
classified `ramp`, and ordered near the top of it (`byPreference`, `fill.ts:331`: owned first, then
inclusion). But the pass does not take the card under the cursor. For each slot it scans up to
`TIE_BREAK_WINDOW` = 200 other candidates (`fill.ts:204`), and any candidate that closes MORE open
role floors wins outright, whatever its inclusion (`closes`, the `gain > 0` branch in `planFill`).
A card that counts as ramp and draw closes two floors. Sol Ring closes one. So every ramp slot went
to a dual-role card, most of them with no EDHREC figure at all. Omnath, Locus of Creation's role
rows, in full:

| Row | Card | Inclusion | Roles |
|---|---|---|---|
| ramp | Biomechan Engineer | none | ramp, draw |
| ramp | Drownyard Lurker | none | ramp, draw |
| ramp | Selvala, Heart of the Wilds | none | ramp, draw |
| ramp | Solemn Simulacrum | none | ramp, draw |
| ramp | Big Score | none | ramp, draw |
| ramp | Deconstruct | none | ramp, removal |
| ramp | Divert Disaster | none | ramp, removal |
| ramp | Konstrari Charm | none | ramp, removal |
| ramp | Abundant Growth | none | ramp, draw |
| draw | Budding Insurgent | none | draw, removal |
| removal | Ancient Hydra | none | removal |

All but Ancient Hydra also credit a second role (§2.5a), so eleven rows close every floor: the draw
floor holds one real draw card, the removal floor one real removal card. Krenko's pass is the same
shape: Solemn, Mind Stone (20.3%), Commander's Sphere (7.4%), Barrels of Blasting Jelly, Cryptex.

**The residual cannot rescue them.** After the floors, the slots left are ordered by
`synergyRank` (`actions.ts`, `readSynergyCards`), and EDHREC synergy measures how much MORE a
commander's decks play a card than decks in general. A card every deck plays scores near zero, so
a staple sorts to the bottom of exactly the pass that would otherwise take it.

**Two defects, then, and one feature.** The tie-break overrides inclusion (a defect: it builds
decks of zero-inclusion cards). The residual ranks staples last by construction (a defect for this
purpose). And nothing in the fill knows what a staple is (the feature Hugh asked for).

## 2 · Which "staple"

"Staple" already means two things (How it works brief, §5 item 3,
`docs/superpowers/design-briefs/2026-09-28-how-it-works.md`):

- **EDHREC's top cards for this commander** (`data.topCards`): what the fill calls "staples you
  don't own" (`unownedStaples`, `suggestions-read.ts:97`). Per commander, live, and it already
  orders the pool through `inclusionPct`.
- **`format_staples`**: breadth at least 50% of an identity bucket's commanders and inclusion at
  least 20% within it (`scripts/build-staples.ts`), rebuilt monthly. **Universal** = a staple in at
  least ¾ of the buckets (`src/lib/staples/universal.ts`).

**This plan uses `format_staples`.** It is the one that answers Hugh's two halves directly, and it
is what "staple" means everywhere a reader sees the word (Find a deck, Change commander, the
overview). Measured on staging today: 16 conditions, 776 rows. Universal (≥ 12 of 16): Sol Ring 16,
Arcane Signet 16, Swiftfoot Boots 16, Rogue's Passage 15, Reliquary Tower 13. The W bucket's first
four by inclusion: Sol Ring, Swords to Plowshares, Path to Exile, Arcane Signet.

The fill's existing use of EDHREC top cards stays as it is, but the code stops calling them
"staples" (`unownedStaples` becomes `unownedTopCards`), which closes §5 item 3 as a side effect. The
About copy already dropped the word in #1143, and `how-it-works.ts` has no fill row, so the rename
is the only change left.

## 3 · "Per-color staples": the options

| | What it is | For | Against |
|---|---|---|---|
| **A · `format_staples` by identity** | The deck's own condition (`W`, `RW`, `count:3`…) via the existing condition chain in `src/lib/staples/condition.ts` | Already built, monthly, measured across every commander in the bucket; Swords is there for every W bucket (54–67%) | Colorless, four- and five-color decks have no condition today: the table holds the 15 mono and two-color identities and `count:3` only (`C`, `count:4` and `count:5` reach `identity_composition` alone, `build-staples.ts:544`), so Omnath, Locus of Creation gets universal staples only. Covered in §4 |
| B · EDHREC top cards above a bar | This commander's own list, e.g. inclusion ≥ 40% | Commander-specific, already fetched | It is what the fill already ranks by; the defect above is why it did not land, not the list. Fixing the tie-break gives most of B for free |
| C · A named list | Sol Ring, Arcane Signet, Swords… | Exactly the cards named | Rots with every set; "derived, never named" is the rule `universal.ts` was written under |

**Recommendation: A, with the tie-break fixed (§4.1) so B's ordering also works.** A guarantees
the staples a reader expects; B (the commander's own list) then fills the rest in the right order.

## 4 · The change

### 4.1 Inclusion bounds the tie-break (the defect)

A swap in the role pass may only choose a card whose inclusion is at least the cursor card's minus
a band (proposed 10 points), and never a card with no figure over one with a figure. The two-floor
gain and the type gap stay, inside that band. The owned tier already bounds it the same way
("WITHIN THE OWNERSHIP TIER", `fill.ts`). Measured effect to report in the PR: role rows per
commander before and after, on the same four decks.

### 4.2 A staples step, before the role pass (the feature)

A new step seeds the deck's staples first, so they are placed before any floor is open and credit
every role they satisfy (§2.5a), exactly as `held` cards do:

1. **Which.** The universal set, plus the deck's own condition's rows above an inclusion bar
   (proposed: the condition's `avg_inclusion` ≥ 50%). For a deck with no condition
   (colorless, 4 and 5 colors today), universal only.
2. **Owned first.** In `pool: "sleeveable"`, only staples with a free copy. In `"all"`, an unowned
   nonland staple is placed and counted in `bought`, like any unowned top card. An unowned land
   staple is not: the land sweep takes owned lands only ("Lands come from the collection alone",
   `fill.ts:545`), so an unowned Command Tower stays out, as it does today.
3. **Through the gate.** Every staple is offered to `gate.admits` and told to `gate.place`. That
   needs the staples IN the gate's candidate list: `loadFillGate` reads prices, ownership and
   Game Changer facts only for the ids it is given (`src/lib/intake/fill-facts.ts:50-59`), so a
   catalog staple passed beside them would read no price (refused under any budget) and no Game
   Changer flag (admitted under any bracket). `buildFillPlan` adds them to `scoped` before the
   gate is built. Six staples are Game Changers today (Cyclonic
   Rift, Demonic Tutor, Jeska's Will, Rhystic Study, Smothering Tithe, Teferi's Protection); a
   bracket 1–2 answer refuses them through the existing gate, and with no answer they are placed
   only if owned. Unowned Game Changers are never bought by the staples step.
4. **Lands.** Land staples (Command Tower, Rogue's Passage, Reliquary Tower, Exotic Orchard) are
   NOT placed by this step. They go to the land sweep, which already has the land ceiling, the
   nonbasic cap and the basics split. The step marks them preferred so the sweep takes them first.
5. **A cap.** At most 10 nonland staples, so a two-color bucket's 59 rows cannot become a
   staples deck. Proposed 10; the PR reports the per-condition count above the bar.
6. **Excluded and selected cards** are skipped, as everywhere in `buildFillPlan`: the staples step
   reads `excludeOracleIds`, which is what keeps a deck's own cards out (the top-off passes its held
   ids there, `actions.ts:2341`; `held` only credits roles).
7. **Bound by the caller.** The step counts against `slots`, so a one-slot bulk fill places at most
   one card, and it honors `onlyOracleIds`: the top-off bulk controls fill only from the rows their
   list draws (`actions.ts:2351`), and a staple with no row there would be a tick with nowhere to
   land, the defect #1141 fixed. Under an allow-list a staple outside it is simply not offered.

### 4.3 Where it lives

- `src/lib/decks/fill.ts`: the band in the tie-break; a `staples?: FillCandidate[]` argument on
  `PlanFillArgs`, placed before the role pass, through `admits`/`place`.
- `src/app/decks/actions.ts` (`buildFillPlan`): reads the deck's staples from `format_staples`
  through the condition chain, joins them to the pool's candidates (owned) or to the catalog
  (unowned), and passes them.
- `src/lib/staples/`: a `loadStaplesFor(identity)` reader beside `loadUniversalStaples`, so the
  overview, the swap tools and the fill share one definition.

Every fill caller inherits it: create, fill and Help me choose in full, and the top-off bulk
controls within their slot count and their allow-list (§4.2 items 6 and 7).

## 5 · Is it a Design question?

**No.** It changes which cards the fill picks and nothing on screen: no new control, state or
string. Per the standing rule, logic changes need no Design round.

**About entry: Hugh decides.** The existing `auto-fill` entry (`about.ts`) says "we add the cards
that commander's decks play most", which stays true. Two choices: no change (it is a correction to
how the fill ranks), or an ordinary edit to that caption naming the staples, at the next version,
with no new entry. A cosmetic-or-correction change owes no new entry under the card captions
precedent.

## 6 · Proof

**Unit (`fill.test.ts`).** A single-role card at 80% beats a dual-role card with no figure for the
same slot; a dual-role card within the band still wins; a staple credits every role it satisfies;
a staple the gate refuses is skipped; a land staple is not placed by the staples step; the cap
holds.

**`probe:fill`, new sections** (real catalog, local-dev or a scratch branch):

- **8 · Inclusion bounds the tie-break.** A fixture of one owned single-role ramp card with a high
  sentinel inclusion and three owned dual-role ramp cards with none: the high one is placed.
- **9 · Universal staples land.** An owned Sol Ring and Arcane Signet in a fixture collection are
  placed in a from-scratch fill for a mono-color commander.
- **10 · The identity condition.** A W commander gets Swords to Plowshares; a four-color one gets
  universal only.
- **11 · The gate.** A bracket 2 answer refuses a Game Changer staple; a $20 budget refuses a
  staple above it.
- **12 · Lands.** Command Tower arrives through the land sweep, once, and the land count is
  unchanged.
- **13 · The caller's bounds.** A `slots: 1` fill places one card, and a fill with an allow-list
  that omits Sol Ring does not place it.

**Mutations, each must fail the probe:** the band removed (8), the staples step removed (9), the
condition ignored so only universal staples seed (10), staples placed outside `admits` (11), land
staples placed by the staples step (12), the slot count or the allow-list ignored (13).

**The measurement, rerun:** the scratch-branch run in §1 on the same four commanders, before and
after, with each deck's role rows and the staples placed. Sol Ring and Arcane Signet must land on
all four. Swords to Plowshares must land on Thorin (R W, owned) and, under recommendation 3's
default, not on Omnath, Locus of Creation (four colors, universal staples only).

## 7 · PR boundaries

One PR: `fill.ts` (band and staples step), `actions.ts`, the `staples` reader, the rename,
`fill.test.ts`, and `probe-fill.ts`. Under ~600 lines.

## 8 · For Hugh

1. Use `format_staples` (universal plus the deck's identity bucket) as "staple"? (Recommended.)
2. The inclusion bar for identity staples (proposed 50%) and the cap (proposed 10 nonland).
3. Colorless, four- and five-color decks: universal staples only (proposed), or also the `count:3`
   bucket?
4. Owned Game Changer staples with no bracket answer: place them (proposed) or leave them out?
5. The About entry: no change, or a caption edit naming the staples.
