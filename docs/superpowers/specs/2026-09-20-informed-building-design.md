# Sub-project 2 — Informed building

**Status:** design, awaiting review
**Branch:** `spec/informed-building`
**Predecessor:** `2026-09-19-deck-analysis-foundation-design.md` (sub-project 1, shipped as
#749 · #752 · #754 · #755 · #756 · #757 · #758)

Sub-project 1 built the Deck Profile and the measured skeleton, and deliberately read them
nowhere. This sub-project is the reading: the fill, the top-off list and the Add panel stop
building against asserted constants and start building against what real decks for this
commander actually look like.

Everything below was measured against the **staging** branch (`br-polished-pond-a6e63y0b`,
Neon project `misty-rain-01681654`) on 2026-09-20, read-only, after the Commander index run
35521086746 completed. local-dev's decks are fixtures and were not used for any frequency
claim. Where a figure comes from Hugh's own 20 decks the sample size is stated, because
n=20 is thin and pretending otherwise is the failure this project keeps writing rules about.

---

## 1. The case

### 1.1 The flat land target is right for 9% of commanders

`landTarget()` (`src/lib/decks/deck-size.ts`) returns 37, or 36 for a pair. Against the
3,380 commanders now carrying a measured composition:

| | |
|---|---|
| mean `avg_land` | 35.47 |
| median | 35 |
| range | 25 to 83 |
| **exactly 37** | **306 (9.0%)** |
| fewer than 36 | 1,895 (56.1%) |
| 36 to 38 | 1,374 (40.6%) |
| more than 38 | 111 (3.3%) |

For 56% of commanders the flat target is too many lands, and a land the deck did not need is
a slot the deck did not get.

### 1.2 The measured skeleton already describes how Hugh builds

Across his twenty staging decks (nineteen of them full), mean absolute error in land count:

| against | mean absolute error |
|---|---|
| the commander's own measured average | **1.6** |
| the flat 37 | 2.3 |

Fourteen of the twenty sit within one land of their measured target. The tail is where it
matters: Yuriko is 11 lands from 37 and 5 from its measured 31; Elves is 8 from 37 and 2 from
its measured 31. Creature deltas are mostly within ±3, and Goblins, Blood Rites and Yuriko are
exactly 0.

**The skeleton is not imposing a foreign standard.** It reproduces what a careful builder
already does by hand.

### 1.3 The only deck badly off the skeleton is the one the app built

`Test` is the single unedited `planFill` output on staging: 68 auto rows, `filled: true`, no
versions, commander Inspirit, Flagship Vessel (Jeskai, **not** colourless).

| | Test | that commander's measured target | delta |
|---|---|---|---|
| Land | 37 | 36 | +1 |
| Artifact | 25 | 22 | +3 |
| **Creature** | **5** | **24** | **−19** |

Every other deck on staging is within ±8 on the creature axis. And this is not a collection
limit: the account holds 2,805 distinct cards, of which 1,620 are legal for that commander and
**764 are creatures**. The fill had 764 creatures available and took five.

68 is a ceiling this project wrote (31 asserted role targets plus a flat 37), not a limit the
collection imposed.

### 1.4 The role floors and the type composition collide, on ramp

Roles and types are different axes, so they do not contradict each other directly. They
collide through the cards that satisfy both.

In a large collection, ten ramp is ten mana rocks, because rocks rank highest on inclusion.
But:

| | |
|---|---|
| median `avg_artifact` | **11** |
| p10 | 6 |
| p90 | 19 |
| commanders wanting fewer than 10 artifacts | **1,282 (38%)** |

For 38% of commanders the ramp slot alone can spend the entire artifact budget. Meanwhile the
creature median is 26 and 1,955 commanders (58%) want 25 or more.

**An overshoot is permanent.** A residual pass can add a missing creature; it cannot remove a
surplus artifact. This is why the fix has to be in the selection rule and not in a later pass.

---

## 2. Decisions

Nine, all settled with Hugh on 2026-09-20. Each carries the reasoning, because a decision
whose reasoning is not recorded gets re-litigated in review.

### 2.1 Build fills the whole skeleton, not 68

Build reaches for the measured composition on all ten type axes and stops where the collection
stops. Role floors are still met. Slots past the floors and the land count are ranked on
**`synergyPts`, not `inclusionPct`**.

That last clause is the substantive half. `planFill`'s `byPreference` ranks owned-first then
inclusion descending, which is "what most decks for this commander run". The top-off list
ranks on synergy, which is "what this commander wants above baseline". Extending inclusion to
99 would hand the player the generic good-stuff deck; the slots past the skeleton floors are
exactly the ones synergy is the right ranking for.

**Why 68 had no defence left.** It was 31 asserted role targets plus a flat 37. Both halves
are now measured or measurable, and the type composition sums to exactly 99.0 on every indexed
commander, so for the first time the app can defend every slot rather than only the 68 it had
numbers for.

**The top-off list survives untouched.** It contains no literal `31` anywhere: it reads
`openSlots` and is gated on `openSlots > 0` (`src/app/decks/[id]/page.tsx`). A fresh build on a
big collection simply does not draw it; a thin collection, a narrow identity, or a deck the
player has cut from draws it exactly as today.

**The shipped About copy already promises this**, word for word: *"we assemble as much of the
99 as your collection supports, which is usually most of it. The rest is yours to fill."* The
68 on the commander page is the line that disagrees with the rest of the app.

### 2.2 The choice lives after the fill, not before it

There is no build-time "how much should I fill" control, and the reason is not implementation
cost. At the moment of pressing build the player has a commander name and nothing else: no
deck, no list, no sense of what the fill would even pick. **You cannot answer "how much help do
you want" before you have seen the help.** And "66 or 99" is a question about this project's
internals rather than about the player's intent.

Instead the deck page's existing clear control becomes **layered**:

| action | keeps |
|---|---|
| Clear the suggestions | lands and the role floors |
| Clear everything but the lands | the mana base |
| Clear everything | the commander only |

**Why layered rather than the single button that ships today.** `clearAutoCards`
(`src/app/decks/actions.ts:642`) is all-or-nothing and takes the **lands** with it. The mana
base is the part nobody wants to hand-build, the part the measured skeleton is best at, and
pure bookkeeping. A player who wants to choose the interesting cards themselves should not have
to rebuild 35 lands to do it.

**The machinery is already there, and it already models the fill as an operation rather than a
one-shot.** `fillDeck` fills an existing empty deck and refuses one holding cards.
`clearAutoCards` returns the swept rows and `restoreAutoCards` puts them back, so it is
undoable. `keepAutoCard` (`actions.ts:573`) already claims a single row as the player's. And
`fill_passes.kind in ('seed', 'top_off')` (`src/db/schema.ts:499`) already records which kind
of pass a set of rows came from.

The three layers map onto genuinely different authority:

| layer | source | authority | who wants to own it |
|---|---|---|---|
| Lands (~35) | measured, per commander | high | nobody, it is bookkeeping |
| Role floors (31) | asserted, or measured after §2.5 | rule of thumb | sometimes |
| Residual to 99 | synergy ranked | suggestion | the builder |

### 2.3 Types decide which card closes each role; floors never yield

Among the cards that can close a role, the fill prefers one whose type the deck is furthest
below. Ten ramp is always ten ramp. Once artifacts reach target, ramp reaches for a mana
creature rather than the next rock.

This keeps §4A.5 of the predecessor spec intact: asserted floors keep their authority as
floors, measured numbers keep theirs as composition, and neither launders into the other. A
reader shown both can still tell which is which, because they are doing different jobs rather
than sitting in one table.

**Rejected: type target as a hard ceiling with the role going short.** That lets a measured
average silently overrule an asserted floor, and hands the player a deck light on ramp with a
warning attached rather than a deck that ramps.

**Rejected: floors first, types shape the residual only.** This is the status quo with a
longer tail. Once 25 artifacts are placed no residual can bring them back to 11, because an
overshoot is permanent.

### 2.4 Close the basis gap; label the true fallback

`identity_composition` holds 16 conditions: five mono, ten two-colour, and `count:3`. There is
**no row for colourless, four-colour or five-colour**, and no `count:0`, `count:4` or
`count:5`, because those groups sit below the ratified 100-commander sample bar (58, 16 and 60
commanders respectively).

Add those three conditions **below the bar**, marked thin the way `THIN_DECK_COUNT`
(`src/lib/profile/fit.ts`) already marks a thin commander. That takes the no-fallback
population from 134 to zero.

**Mechanism, refined while writing the plan.** An earlier draft of this section said the basis
chain gains a fifth `group` rung. It does not need one. The condition vocabulary already has a
key for every one of these buckets: `identityCondition([])` returns `'C'` for colourless and
`countCondition(n)` returns `count:4` and `count:5`. Those keys are not missing, they are
merely *unpopulated*, because `compositionQuery`'s `having count(*) >= 100` refuses them. So
the change is a `thin boolean` column on `identity_composition`, a second branch in the build
that emits the refused buckets with `thin = true`, and the **existing** two rungs finding them.
One fewer rung, one fewer basis value, and `SkeletonFit` gains a thin flag it already has a
vocabulary for rather than a new discriminant.

**A single global row was rejected on measurement.** The three orphan groups are nothing like
the average:

| | colourless (58) | 4-colour (16) | 5-colour (60) | all others (3,246) |
|---|---|---|---|---|
| Artifact | **28.8** | 9.3 | 8.7 | 11.7 |
| Instant | 4.2 | 11.3 | 8.7 | 10.4 |
| Enchantment | 1.3 | 7.9 | 8.1 | 7.2 |
| Basic | 13.2 | **12.8** | **11.7** | 23.9 |
| Nonbasic | 22.6 | **22.7** | **24.2** | 11.6 |

A global row would tell a colourless deck to run 12 artifacts when it wants 29, and tell a
five-colour deck to run 24 basics when it wants 12.

**Where there is still nothing at all, the fill uses the flat rule-of-thumb numbers and the
deck says so.** Never silently. Three states reach this:

- **production today**, which is dark: every deck reads basis `none` until the index is
  dispatched there
- a **new commander** between the weekly catalog refresh and the monthly index on the 3rd, up
  to about 25 days
- permanently, for any new commander in the 134-group, until §2.4's rows exist

### 2.5 Per-commander role targets, deck surfaces only

Four new columns on `commander_support` — `avg_ramp`, `avg_draw`, `avg_removal`, `avg_wipes` —
derived and written by the same index build that writes `avg_land`, under the same
floor-and-refuse discipline, resolved through the same basis chain.

**The derivation.** Expected count for role *r* and commander *c* is
`Σ over commander_support_cards(c) of (inclusion / 100) where classifyRoles(card) includes r`,
using the app's own `classifyRoles` patterns (`src/lib/recs/roles.ts`) rather than a second
copy of them.

**Why the predecessor spec's objection does not defeat it.** §4A.4 of that spec rejected this
source because summed inclusion reaches only 56.9 of 99 cards. That figure reproduces exactly,
but the split matters: EDHREC's list covers the **nonbasic lands almost exactly** (11.7 covered
against a 12.1 target). The ~42 missing cards are overwhelmingly **basics**, which carry no
functional role at all. Non-land coverage is 45.2 of 63.5, a ratio of **0.711** with a standard
deviation of 0.106.

**Validation against Hugh's 19 human-built decks**, mean absolute error. Re-measured
2026-09-20 after pre-open review found two defects in the first pass — see the note below.

| role | flat target | derived | scaled | flat | derived vs flat |
|---|---|---|---|---|---|
| ramp | 10 | **1.99** | 2.26 | 2.79 | 29% better |
| draw | 10 | **2.62** | 2.82 | 3.32 | 21% |
| removal | 8 | 3.06 | **2.95** | 3.68 | 17% |
| **wipes** | **3** | **0.85** | 1.04 | **2.42** | **65%** |

Derived means and ranges: ramp 7.8 (1.0 to 25.3), draw 8.3 (1.4 to 43.8), removal 5.1 (0.7 to
22.3), wipes 0.7 (0.0 to 8.8).

**Two defects in the first measurement, both found by the pre-open pass and both corrected
above.** The table mixed conventions — ramp quoted an unscaled figure while the other three
quoted scaled ones, under one column heading. And the deck population included `Test`, the
unedited `planFill` output §1.3 identifies as the one deck badly off skeleton: validating these
targets against the deck they exist to stop the app producing is marking our own homework. The
figures above exclude it and report both conventions in their own columns.

**Two caveats that belong in the open rather than in a footnote.** The sample is 19 decks and
one collection. And the 0.711 coverage ratio is **not an earned correction**: derived beats
scaled on three roles of four, and removal is the lone exception by 0.11, which is inside the
noise of a 19-deck sample. **Ship unscaled and say so.** The defensible claim is that a
per-commander figure beats a constant; the exact scaling is not.

**Who takes the measured targets and who keeps flat ones:**

| takes per-commander | keeps flat |
|---|---|
| `src/lib/decks/deck-size.ts` | `src/lib/recs/score.ts` |
| `src/lib/decks/fill.ts` | `src/lib/recs/weakest-role.ts` |
| `src/lib/decks/suggest.ts` | `src/components/commanders/role-chips.tsx` |
| `src/lib/decks/mix.ts` and its 6 components | `src/components/commanders/coverage-section.tsx` |

**No `commander_scores` rescore.** §4A.6 of the predecessor spec dismissed that risk because
the four roles were unmeasurable; making them measurable revives the question, and it was
measured rather than argued.

Against Hugh's collection, feeding per-commander targets into `computeFit`'s `roleCoverage`
denominator (`score.ts:164`) would give:

| | flat targets | per-commander |
|---|---|---|
| mean `fitRoles` (of 25) | 24.97 | 25.00 |
| commanders scoring a perfect 25 | 3,322 | **3,379 of 3,380** |
| commanders whose score moves at all | — | 59 |
| largest move | — | **2 points of 100** |
| commanders short on ramp | 0 | **0** |

Four reasons it is out. It buys nothing visible: 59 commanders move, by at most 2 points of
100, in exchange for a full rescore plus `probe:score-lock` and `probe:writer-version`
re-runs. It moves the wrong way: derived targets are mostly *lower* than flat, so they saturate
more easily and saturation goes from 98.3% to 99.97%, making a quarter of the commander score
an almost literal constant. It forces an invented number into a score: **390 commanders have a
derived wipes target of 0**, and `min(n, t) / t` is undefined at zero, so somebody would have
to decide what 0/0 means and bury that decision inside a score, which is the CRISPI failure
mode exactly. And §4A.6's yardstick argument survives independently: a ranking wants one
yardstick across commanders, where a deck reading wants accuracy for one.

### 2.5a Two corrections the derivation needs, both found in plan review

**`cards.oracle_text` holds BOTH FACES**, joined `"front\n//\nback"` by
`src/lib/scryfall/transform.ts:19`. `isLandFace` reads the front face only, so for a land-backed
MDFC it returns false and `classifyRoles` then sees the land back's `{T}: Add {R}` and classifies
the card as **ramp**. 82 commander-legal cards carry a land on the back face alone.

Two consequences, and neither was visible in the figures:

- The derived `avg_ramp` is inflated by every land-backed MDFC in every support list.
- Under §2.8 the same card would be **spent on the ramp floor and counted against the land
  target** — one card taking two slots' worth of credit.

**The fix is local, not a change to `classifyRoles`.** The derivation and the fill pass the FRONT
FACE's text, because that is the text of the spell you cast. The classifier keeps its current
behaviour everywhere else, since changing it app-wide would move figures on surfaces this
sub-project does not touch.

**It covers `transform` as well as `modal_dfc`, and that was a defect in an earlier draft of
this section.** Both layouts are cast as their front face; the back arrives later or never.
Scoping the fix to `modal_dfc` alone would have left **32 of the 82** land-backed cards still
feeding `{T}: Add …` into `RAMP_PATTERNS` — including `Growing Rites of Itlimoc`, `Treasure Map`
and both Ojers, which §2.8 names in its own table. `split`, `adventure` and `prepare` are
excluded deliberately: both halves are castable, so dropping the second would lose a real mode.

**Measured, so the inflation is not hypothetical:** the mean ramp target reads **8.5 on whole
text against 7.8 on the front face**, and the count of commanders measuring exactly zero wipes
rises from 369 to **390** once the back faces stop contributing.

**The role targets DESCRIBE decks; the fill PLANS one, and the two must count alike.** The
derivation adds a card to every role it satisfies — an instant that destroys and draws counts
toward both — because that is what the deck contains. `planFill` spends a card on the FIRST role
it can close. Feeding a double-counted description into a single-spend floor makes the fill
place two cards where the description counted one.

**`planFill` therefore counts a placed card toward every role it satisfies, while still spending
its slot once.** The alternative — deriving the targets under the fill's own ordering — would
make a measured figure depend on an implementation detail of the consumer, which is the
laundering §4A.5 forbids.

This is benign at today's numbers (7.8 + 8.3 + 5.1 + 0.7 = 21.9, under the flat 31) which is why
it is a correctness fix rather than an outage. **The §2.5 validation table is unaffected**: both
sides of it were computed with the same every-role-per-card convention, so it compares like with
like.

**A separate finding, recorded but not acted on here.** The role component of the commander
score is *already* nearly inert for a collection this size: 98.3% of commanders saturate all
four flat targets, and ramp, draw and removal saturate for all 3,380 — only wipes falls short,
for 58. That is worth knowing and possibly worth fixing, but not by this change and not in this
sub-project. Measured against one collection of 2,805 cards; a small collection would saturate
far less and was not measured.

### 2.6 The top-off bulk control keeps its place and loses its selection rule

**The reported failure, in Hugh's words.** Short on creatures, pressed *"Tick the N I can
sleeve"*, it ticked non-creatures and left the deck worse with no slots left to fix it.

**The root cause is a category error.** `canSeed` (`src/lib/decks/last-slots.ts`) narrows to
cards owned with a free copy, and then `top-off-list.tsx:285` takes the top N by **synergy**
within that. So the control optimises *what can I sleeve* instead of *what does this deck
need*. Availability is a constraint being used as an objective, which contradicts this suite's
own ruling that constraints are filters on the candidate pool and never the thing being
optimised.

**The architecture already says these are one operation.** `fill_passes.kind` is
`('seed', 'top_off')`; both are recorded, both are undoable, and `fill-passes.ts` orders and
names them ("top-off 3"). Only the selection rule diverges: the seed uses `planFill`, the bulk
tick is bespoke.

**Two bulk actions, each labelled with its concession**, both running the real `planFill` over
the open slots and differing only in the pool:

```
[ Fill from my collection — 12 cards ]   2 creatures short of the skeleton
[ Fill with the best — 12 cards      ]   4 to buy · $18.40
```

Both figures are visible **before** either is pressed.

**Hugh's correction, and it was right.** An earlier draft of this had the collection-only fill
stop short and report the gap. That is not a deck builder's answer. He wants the full 99 *and*
to know the concession: either off-recommendation cards from his own collection, or buying the
recommended ones. Offering only the zero-cost route hides half the decision.

**Most of this is already built and must not be rebuilt.** The list has no facet filter, so
every row is already shown. It already draws `BuyTag` and a price on unowned rows. It already
computes `buyCount` and `buyMoney` for ticked unowned rows. And **the seed fill already buys**:
`planFill` takes unowned staples and returns `bought`. Lands are the only thing never bought.
The sleeve-able restriction on the bulk control is not a principle, just a narrower pool than
the seed uses.

### 2.7 The Add panel orders within a shelf by type gap

`consider-panel.tsx` already builds role shelves carrying `have / target` and already sorts
most-short-of first (`gap = target − have`), so it inherits per-commander targets for free once
`mix.ts` becomes per-deck.

What it gains is §2.3 applied to its own ordering: among the cards that close a role, offer the
one whose type the deck is furthest below first. Same shelf, same cards, better first pick. No
new shelf, no new ink, so this is an eng call with no Design round.

**Rejected: type shelves.** New layout on a shipped surface, and a panel with nine type shelves
beside five role shelves is a different panel from the one that ships.

**Rejected: leaving it alone.** The fill and both bulk controls would pick type-aware and the
panel would pick type-blind, which is §2.6's bug moved one surface over.

### 2.8 Modal lands key on `layout`, and the fill counts them as lands

**The handoff's figure was wrong, and a `type_line` test is why.** It recorded "11 such cards
across 8 decks, Gishath has 3". The correct figures are **7 `modal_dfc` cards across 5 decks**,
and Gishath has 2.

`cards.layout` separates the two cleanly — 50 `modal_dfc` against 32 `transform` in the
catalog, all commander-legal:

| layout | plays as a land from hand | examples |
|---|---|---|
| `modal_dfc` | **yes**, chosen on cast | Shatterskull Smashing, Turntimber Symbiosis, Bala Ged Recovery, Sink into Stupor, Valakut Awakening, Glasspool Mimic |
| `transform` | **no**, cast the front and it flips later | Growing Rites of Itlimoc, Ojer Axonil, Ojer Pakpatiq, Treasure Map |

Four of the eleven the handoff counted are `transform`. Ojer Axonil cannot be a turn-one land
drop; it is a creature that becomes a land after it dies. Counting it as a land option would
have shipped.

**The fill builds to `true lands + modal_dfc land-capable >= target`.** Gishath holds 34 true
lands plus 2 `modal_dfc` against a target of 36, so build adds no lands and spends those two
slots on spells.

**Why, and the reason is asymmetry.** An MDFC can be cast as a spell on a turn the player does
not need the land. A real land cannot be un-drawn. Over-landing costs a slot every game;
under-landing by an MDFC costs nothing on the turns the mode is not needed.

**Rejected: half credit at 0.5 per card.** It is a community rule of thumb nobody in this
project measured, sitting inside the single number the fill builds to.

**The objection to full credit, recorded rather than dismissed.** Plan review made the fair point
that full credit is *also* unmeasured, and is the more aggressive of the two: a Zendikar-style
MDFC land back enters tapped or costs life, and the back is unavailable on any turn the front was
cast. Hugh chose full credit on 2026-09-20 on the asymmetry argument, with that trade stated. It
is recorded here because the next person to measure this should know which way the thumb was on
the scale, and because §2.5a's double-count fix removes the worst version of the risk: a card can
no longer take a ramp slot AND a land slot.

The profile still stores counts **exclusively** so totals add up, per Hugh's 2026-09-20 ruling,
and still carries the list of cards that can be a land. This decision governs only what the
fill targets.

### 2.9 The build promise

`recommendationsCopy.build` currently reads *"We'll fill 68 of the 99 — roles and lands. The
rest is yours."* After this work that sentence is wrong in all three clauses.

Replaced with a confident but hedged line carrying no number and needing no new query:

> We'll build the whole 99, as far as your collection reaches.

Four call sites, all reading `fillBaselineTotal(false)`: `detail.tsx:542`, `detail.tsx:657`,
`synergy-selection.tsx:109`, `synergy-selection.tsx:228`.

**Rejected: a flat "We'll build the 99".** It breaks silently on a thin collection, which is a
new player's first deck and the worst possible moment to have been over-sold.

**Rejected: a computed per-commander number.** It needs a pool-and-basics query on a hot route,
and reach is not just pool size — lands come from the collection alone, so basics bind
separately from card count.

---

## 3. What changes

### 3.1 Data and derivation

- **`commander_support`** gains `avg_ramp`, `avg_draw`, `avg_removal`, `avg_wipes`.
- **`identity_composition`** gains rows for colourless, `count:4` and `count:5`, written below
  the 100-commander bar and flagged thin.
- **`db:build:staples`** (or a sibling step in the same matrix leg) derives the four role
  columns, prints its whole derivation the way the staples build does, and **refuses rather
  than publishing a partial set**, leaving the previous values standing and exiting non-zero.
- The basis chain is unchanged in shape: `pair → commander → identity → count → flat`. What
  changes is that the identity and count rungs now resolve for every commander, some of them to
  a row flagged thin.

### 3.2 Profile

- `ProfileSkeleton` gains `roleTargets` beside `composition`, carrying the same
  discriminated-provenance shape so a target never exists without its basis.
- `identity_composition` gains `thin boolean not null default false`; `SkeletonFit` surfaces it
  as `coverage.thinCondition`. **No new `basis` value** (§2.4).
- `fitSkeleton` may now carry functional roles. **Its "no functional roles here" rule exists
  because they were asserted**, and that reason ends when they are measured. The module comment
  must be rewritten to say so rather than quietly deleted, because the next reader will
  otherwise think the rule was abandoned rather than satisfied.

### 3.3 Fill

- `planFill` takes a skeleton rather than `hasPartner` alone.
- Role selection breaks ties on type deficit (§2.3).
- The land ceiling comes from the skeleton, and counts `modal_dfc` land-capable cards toward it
  (§2.8).
- The residual to the body size is filled from the synergy ranking (§2.1).
- `NONBASIC_LAND_CAP` is reconsidered against the measured `avg_nonbasic`, which ranges from
  ~7 mono to ~24 five-colour against a hard-coded 12.
- `fillBaselineTotal` becomes redundant: if the fill reaches the body size then
  `fillBaselineTotal(hasPartner) === deckBodySize(hasPartner)`, so the function should be
  deleted rather than left returning a constant its name no longer describes. Two of its four
  call sites are copy (§2.9); the other two are the selection announcer in
  `synergy-selection.tsx`, where `filled` collapses to `99 − picked` and `total` to the body
  size, so the announcement becomes a statement about the deck rather than about the fill.
- `planFill` gains a partial-pool, partial-slots mode for §2.6.

### 3.4 Surfaces

- `mix.ts`'s `RECOMMENDED_MIX` becomes a per-deck value threaded to the **six** components that
  import it: `role-counter-strip.tsx`, `consider-panel.tsx`, `unresolved-group.tsx`,
  `changed-strip.tsx`, `strip-rationale.tsx`, `builder-shell.tsx`. This is the bulk of the work
  and it is mechanical.

  **Six, not eight.** §4A.6 of the predecessor spec lists those six "and two copy modules", and
  an earlier draft of this section compressed that to "eight components". The two copy modules
  (`recommendations.ts`, `decks-builder.ts`) only NAME the constant in comments — `decks-builder`
  carries the rationale bodies while the heading is composed from the target at its call site in
  `strip-rationale.tsx`, which is already one of the six. Neither copy module changes.
- `RECOMMENDED_MIX_SOURCE_LINE` becomes **true**: once all five cells derive from EDHREC data,
  "EDHREC averages" stops being a claim about four numbers nobody measured. **This is the fix
  for the credibility bug rather than a rewording of it.**
- The top-off list's single bulk control becomes two (§2.6).
- The deck page's clear control becomes layered (§2.2).
- `consider-panel.tsx` orders within a shelf by type gap (§2.7).

---

## 3A. The About entry

**`CLAUDE.md` makes this a hard rule and the spec omitted it**, which plan review caught: "No
FEATURE launches without an About entry, in the same round that ships it."

This sub-project ships at least three things a reader could discover:

| feature | entry |
|---|---|
| Build fills the whole 99 rather than 68 | edits the existing build entry; the capability changed |
| The two bulk controls on the top-off list | edits the existing top-off entry |
| The layered clear | **new entry** |

`ABOUT_VERSION` is bumped once, in the PR that lands the layered clear, since a new entry always
forces a bump. The earlier two are ordinary edits to entries that already exist.

`src/lib/copy/about.test.ts` pins a content hash against `ABOUT_VERSION`, so any About copy edit
forces either a deliberate bump or a deliberate re-pin. **Design draws the entries; Hugh decides
which features owe one**, and he may rule that the first two are covered by the entries they
edit.

---

## 4. Out of scope

- **The analysis tab.** Design owns it: Round 0 merged as #753, Round 1 as #761, Round 2 is
  queued. Nothing here takes real estate there. If an item in this spec starts wanting it, stop
  and ask.
- **The scoring engine.** §2.5, measured and rejected.
- **Type shelves in the Add panel.** §2.7.
- **Swap tools.** Sub-project 4.
- **Fixing the inert role component of the commander score.** §2.5, recorded as a finding.
- **Dispatching production.** Hugh's call, in the order catalog → combos → index.

---

## 5. Design handoff

Two changes are layout on shipped surfaces and therefore Design's call, not eng's. Both are on
surfaces this sub-project owns (the deck page and the top-off list), **not** the analysis tab,
so they do not collide with Rounds 1 and 2:

1. **The layered clear** (§2.2). One button becomes a choice of three.
2. **The second bulk control** on the top-off list (§2.6), and the two concession labels.

**§2.6 splits along that line, and the split matters.** Replacing what the *existing* bulk
button picks is a logic change behind an unchanged control, so it is an eng call and ships
without waiting. Adding a *second* button is layout. Splitting them means the reported failure
(a bulk control that optimises what can be sleeved instead of what the deck needs) is fixed in
the same round as the fill, rather than sitting broken beside a fixed fill until Design returns.

Everything else here is logic, ordering or copy, and proceeds without a Design round.

---

## 6. Owed work folded in

Two PRs decided on 2026-09-20 land as part of this, and both are inputs rather than neighbours:

1. **Modal lands as their own fact** (§2.8), corrected to key on `layout`.
2. **`readSynergyCards` reads the stored pair row.** Today it merges two single-commander
   lists, so once pair data exists the commander detail panel, Role Coverage and the top-off
   list would rank a card differently from the deck suggestions panel. It is an aggregating
   query on a hot route: **own PR, and walk both widths.** One partner deck exists on staging
   (HD - Gods, Kratos + Atreus) and `commander_pair_support` holds exactly one row, which is
   the fixture.

---

## 7. Proof

Unit tests are the default; these are the things a unit test cannot reach.

- **`probe:fill`** (new). The fill is pure, but the skeleton it reads is assembled from a
  four-rung basis chain, a staples join and a collection read. Cover: a fill reaching the
  measured land count rather than 37; the ramp tie-break taking a creature once artifacts are
  at target; a `modal_dfc` counting toward the land target and a `transform` card not; the
  residual ranked on synergy rather than inclusion; and a `basis: "none"` deck filling on flat
  targets with the label present.
- **`probe:top-off`** (extend `probe:last-slots`). Press both bulk controls against a real
  claim and assert the concession figures are drawn before the press, that the collection-only
  fill takes fewer than the open slots when it must, and that the best-cards fill reaches the
  body size and marks its buys.
- **`probe:bracket`** re-run. The profile shape changes; its 45 checks must still pass.
- **`check:copy-drift`** and **`check:tokens`** on every copy and token touched.
- **A mutation run per probe assertion**, recorded in the PR body. A probe whose green survives
  reverting the fix it exists for has measured nothing, which this repository has now paid for
  several times.

---

## 8. Risks

- **n=20 for the role derivation.** Mitigated by shipping it as a *target* rather than a
  *score*: nothing ranks on it, no commander is ordered by it, and a wrong figure costs a
  suggestion rather than a verdict. Re-measure when the deck corpus grows.
- **`RECOMMENDED_MIX` threading touches six components.** Mechanical but wide. It is a PR of
  its own, and the boundary belongs in the plan rather than discovered during implementation.
- **The fill now writes 99 rows instead of 68.** `clearAutoCards` and `restoreAutoCards` carry
  more rows; the transaction and the `fill_passes` ledger should be checked against the larger
  set rather than assumed to scale.
- **Production is dark.** Every deck there reads basis `none` and will fill on flat targets
  with the label showing until the index is dispatched. That is correct behaviour and it will
  still look like a regression to anyone who has not read §2.4.
