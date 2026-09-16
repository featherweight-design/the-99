# The commander row says how a deck plays

2026-09-15 · design spec

## The problem

`/discover` ranks commanders under `Something new` and justifies each row with a list of
EDHREC archetype tags the player has never built, followed by the nearest deck that shares
some of them. Reported against two real rows:

- **Kenrith, the Returned King** — `Voting · Curses · Zirda Companion, and 32 more. Your
  closest build, HD - Goblins, plays -1/-1 Counters, +1/+1 Counters and 120 more. The rest
  are new.`
- **Glarb, Calamity's Augur** — `Frogs · Crocodiles · Bears, and 10 more.` Expanded, it
  reaches `Dinosaurs · Explore · Mice · Miracles · Paradox · Reach · Saprolings · Tyranids ·
  Umori Companion · Wurms`.

Three separate faults, and they have three separate causes.

1. **The tag list names creature types.** The novelty sort ranks tags by how *unplayed* they
   are, so low-signal tribal labels rise to the top of the list precisely because nobody
   builds them. `Frogs`, `Crocodiles` and `Bears` say nothing about how a Glarb deck plays,
   and two of the three have no relationship to the card at all.
2. **The nearest-deck clause argues the wrong way.** `Your closest build, HD - Goblins,
   plays …` was a deliberate ruling — end the sentence on newness rather than on overlap —
   but under a sort whose whole purpose is to surface the unfamiliar, naming the familiar
   deck is the opposite of the point.
3. **The floor note repeats on every row.** `clears the 30% floor: you own 33% of its
   support list` restates a rule the page header has already stated once.

Underneath those is a fourth, which is the reason the first three were worth a redesign
rather than a copy edit: **the row is a data table, and the reader does not want one.** The
figures on it — role counts, a support count over an EDHREC total, a ratio bar, a deck
count, an availability line — are only interesting after the decision to investigate has
already been made, and that decision is made on Commander Details.

Fifth, and reported alongside: **the same commander carries two different headline
numbers.** `/discover` prints `86 OF TOP 262 OWNED`; Commander Details prints
`FIT FOR YOUR COLLECTION 60/100`. Both are honest and they measure different things, which
is exactly why showing one on one route and the other on another is a defect rather than a
feature.

## What the row becomes

```
┌────────────────────────────────────────┐
│ [art]  Glarb, Calamity's Augur  ● ● ●  │
│                                        │
│ Glarb decks tend to grind value from   │
│ the graveyard, usually looping small   │
│ creatures for incremental advantage.   │
│                                        │
│ None of your decks play Proliferate,   │
│ Infect or Landfall.                    │
│                                        │
│ FIT 60/100   24,012 decks    $3.40     │
└────────────────────────────────────────┘
```

Two sentences and three figures. The first sentence is what the commander does; the second
is what the reader's collection has never done. Everything else waits for Commander Details.

**Cut:** role chips (`RAMP 158/10` and its three siblings), the support count and its ratio
bar, `clears the 30% floor`, `not in your collection`, the nearest-deck clause, the tag-name
list and the `show fewer` disclosure that expanded it.

**Added:** the stored play-style sentence, the mechanic gap line, Fit.

**Kept:** art wash, name, identity pips, rank, deck count, price.

### Decisions, and why

| Decision | Ruling |
|---|---|
| Scope | A recomposition, not a copy swap. The copy was a symptom. |
| Headline figure | **Fit 0–100**, matching Commander Details and `/commanders`. Three surfaces, one number. |
| Reach | **Both lanes share one row component.** `rec-card.tsx` and `discovery-row.tsx` collapse. |
| Player-specific claim | **A templated gap line**, not per-player generation. |
| When the gap line shows | **Always** — both `/discover` sorts and `/commanders`. Row height never changes between two rows or two sorts. |
| Other figures | **Popularity survives, role chips do not.** Deck count is the only thing on the row the sentence cannot tell you; role counts are collection arithmetic, which is what Fit summarizes. |
| `not in your collection` | **Cut.** Once both lanes share a row, every `/discover` row is unowned and every `/commanders` row is owned, so the line never distinguishes anything. |

Two options were considered and rejected for the player-specific claim:

- **Per-player generation.** The reported ideal — *"You don't have a deck that leverages
  poison counters and proliferation to kill enemies. This does it with poisonous frogs"* —
  is one claim about the commander and one about the reader. Generating the pair costs one
  model call per commander per collection, so ~3,300 calls on every collection change.
  Rejected on cost.
- **A second stored sentence per commander.** A `how it wins` clause alongside the existing
  `how it plays` one would be player-independent and hash-skipped, so ~3,300 one-off calls
  and nothing thereafter. Deferred rather than rejected: reassess once the row has been
  lived with, since the existing sentence may already carry it.

## Where the data comes from

| Piece | Source | Cost |
|---|---|---|
| Play-style sentence | `commander_support.prose` | one column added to two existing queries |
| Fit 0–100 | pure function of `ownedSupport`, `edhrecTotal`, `colorPoolSize`, `roleCounts` | zero — all four are already in the payload |
| Gap line | `unplayedTags`, creature types removed | the classifier below |
| Popularity | `commander_support.deck_count` | zero |

No new queries and no model calls.

### The sentence already exists

`pnpm db:build:prose` writes one sentence per commander into `commander_support.prose`, from
a prompt that reads *"Write one sentence about how {name} decks tend to play"* over the
commander's top eight EDHREC themes by deck count. It is player-independent, which is why no
collection change invalidates it, and it is already generated: **production holds 3,341 of
3,342**, mean length 148 characters.

Two consequences. The `Black Waltz No. 3` row — the one commander that has never had a
sentence accepted on either database — renders with no sentence, which is the state the
existing design already draws on Commander Details. And **local-dev is only at 1,070 of
3,279**, a fixture gap rather than a feature gap; run `pnpm db:copy:prose` before any local
walk of this surface, or two thirds of the rows will read as broken when they are not.

The prose prompt draws on the *most common* themes, not the *unplayed* ones. That is what
makes it immune to the fault reported here: Glarb's sentence is built from what Glarb decks
actually do, so no amount of tribal noise in the novelty ranking can reach it.

### Fit is free

`scoreCommander` computes Fit as three integers over fixed weights:

- `fitPool = round(min(poolSize / 200, 1) × 15)` — from `colorPoolSize`
- `fitRoles = round(roleCoverage × 25)` — from `roleCounts` against `ROLE_TARGETS`
- `fitSynergy = round((ownedSupport / edhrecTotal) × 60)` — from both, already present

Every input is in the `/discover` payload today. The row can print Fit with no additional
read, which is what makes the three-surfaces-one-number ruling affordable.

`fitSynergy` is `null` where `edhrecTotal` is, and the score is **not** rescaled to fill the
gap — a commander with no synergy read tops out at 40, and `measurableTotal` is 40 rather
than 100. The row must print the denominator it was given, never a bare `40/100`.

### The payload fits — measured, not estimated

`/discover` ships every ranked row rather than only the visible window, and `encode.ts`
records the payload at 1.09 MB against a **2 MB data-cache ceiling** whose breach silently
disables the per-reader cache. Prose is dictionary-hostile: every sentence is unique, so
none of it compresses the way the 401-label theme vocabulary does.

Measured on 2026-09-15 against local-dev, `fit` sort (the worst case — neither the floor nor
the untagged exclusion applies), 3,085 rows, a 2,733-card collection:

| | |
|---|---|
| baseline payload | 0.93 MB |
| prose added | +488 KB |
| cut fields and trimmed labels recovered | −448 KB |
| **variant payload** | **0.97 MB** (net +40 KB) |
| headroom under the ceiling | 1.03 MB |

The recovery comes from six fields the row stops printing — `roleCounts`, `colorPoolSize`,
`ownedSupport`, `supportPct`, `tagTotal` and `nearestDeck` — collapsing into one `score`
integer, plus `unplayedLabels` dropping from every unplayed tag to three dictionary indices.

Two reasons to trust the direction of the error. Local prose averages 160 characters against
production's 148, so the measurement is pessimistic. And at 3,085 of a possible 3,342 rows
the row count is near its ceiling, so a larger collection adds at most ~8%.

**No two-tier payload is needed.** The measurement was taken with a throwaway script that is
deliberately not kept: it answers one question once, and the number belongs in this document
rather than in a guard. What *is* worth a guard is the ceiling itself — see Verification.

### The tag classifier

130 of the 401 distinct tag labels resolve to creature types. The classifier's job is to keep
those out of the gap line and let mechanics through.

Two failure modes were found in a first attempt and both must be handled:

- **Non-creature subtypes share the type line.** Taking every word after the `—` from any
  line containing `creature` swept in `Equipment`, `Treasure`, `Auras`, `Sagas`, `Food`,
  `Clues`, `Vehicles`, `Shrines`, `Books`, `Adventures`, `Mounts`, `Toys` and `Eggs` — every
  one of them a real mechanic tag. The vocabulary must come from the **creature half** of
  the type line only.
- **Irregular plurals.** `Dwarves`, `Faeries`, `Horses`, `Fungi` and `Heroes` were missed by
  a naive singularizer and reached the mechanic side. An explicit irregular table is
  required; a suffix rule alone is insufficient.

An **unclassifiable label is excluded** from the gap line. The asymmetry is deliberate: a
mechanic wrongly hidden produces a thinner sentence, while a creature type wrongly shown is
the defect this spec exists to fix.

The classifier is pure code with no network access, and it is unit-tested against the whole
401-label vocabulary rather than against a sample — the vocabulary is small, fixed between
index rebuilds, and reading it in full is what turns a spot check into a proof.

## States

Five, each of which needs drawing rather than defaulting:

| State | Condition | Draws |
|---|---|---|
| Full | prose present, gap non-empty | the composition above |
| No sentence | `prose is null` (1 commander in the catalog) | gap line and figures, no sentence — never a truncated or synthesized one |
| No tags | `commander_support.tags` empty | the existing `No tag data` note; no gap line |
| Nothing new | every mechanic tag already played | **new state, no precedent** — needs a ruling |
| Unpriced | `price.kind === "absent"` | the slot unmounts; no dash, no zero, no reason given |

`Nothing new` is the one with no existing answer. It is reachable: a reader with many decks
across many archetypes can own a commander whose every mechanic they already play, and the
gap line then has nothing to assert. It must not fall back to naming creature types, and it
must not print an empty clause.

## Verification

- **Unit** — the classifier over all 401 labels, including the twelve mis-sorted mechanic
  tags and the five irregular plurals named above as explicit cases. Fit arithmetic is
  already covered in `score.ts`'s tests; the row's use of `measurableTotal` is not and needs
  a case that a null-synergy commander prints `40/40` and never `40/100`.
- **Payload guard** — a test that encodes a full-catalog payload and fails above a stated
  byte budget. The ceiling's breach is silent, and 1.03 MB of headroom today is not a reason
  to leave the next 500 KB unmeasured.
- **Probe** — `/discover` and `/commanders` at both widths: the sentence renders, the gap
  line names no creature type, the Fit figure equals the one Commander Details prints for
  the same commander, and the row's height is identical under both `/discover` sorts. The
  last of those is the ruling that cannot be read off a diff.
- **Contact sheet** — both lanes at both widths, per `feature-acceptance`. The row appears
  on two routes and the point of the change is that they stop differing.
- **Fixture** — `pnpm db:copy:prose` against local-dev before any browser walk.

## Gates before implementation

- **This needs a design handoff with a READINESS verdict.** `AGENTS.md` gates UI on one, and
  this is a recomposition of the primary row on two routes with a new empty state. It is not
  an engineering decision to make unilaterally.
- **An About entry and an `ABOUT_VERSION` bump ship in the same round**, per the
  design-pipeline rule. A new entry is always a bump.
- **`check:copy-drift`** will fail on the property tables that quote the retired strings.
  Every table quoting the tag sentence, the floor note or `not in your collection` is in
  scope for the same round.

## PR boundaries

Named here rather than discovered during implementation, per the ~20-file / ~800-line split
rule. No stacking — each merges to `main` before the next opens.

1. **Data and arithmetic, no UI.** The tag classifier and its tests, `prose` added to both
   lane queries, Fit computed for discovery rows, the payload shape change and its byte
   guard. Nothing user-visible moves.
2. **The unified row.** `rec-card.tsx` and `discovery-row.tsx` collapse into one component;
   both lanes adopt it; the five states are drawn; retired copy is deleted and the property
   tables quoting it are corrected.
3. **Acceptance.** About entry and version bump, probe extensions, contact sheet.

---

# R1 handoff, and the errata this spec now carries

`design/design_handoff_the99_commander_row/` (R1) landed 2026-09-15 and was audited the same
day. **Verdict: Green, with errata.** Design self-assessed green on the call and amber on three
figures; the audit measured all three, and two of them came back differently from how they were
drawn. Nothing here needs a second canvas round.

The handoff's own documents win over this spec's §What the row becomes wherever they are more
specific — its `STATES-commander-row.md` is the states matrix of record and its
`commander-row · copy strings.ts` is the string list of record. The rulings below win over both.

## The `Nothing new` ruling, accepted

`Nothing new` is a copy swap in the gap line's own slot, asserting the overlap rather than a
gap: **`You already play every mechanic this commander leans on.`** Same slot, ink, measure and
line count, so the locked "row height never varies" decision survives a fifth state.

Design also found a flaw in this spec's condition and fixed it. `every mechanic tag already
played` is silently true of a commander with **no mechanic tags at all**, so the state is
decided on the **classifier's output** rather than on `tags.length`:

- mechanic set empty → the shipped `No tag data` note, whose condition is **redefined** from
  `tags` empty to *mechanic* tags empty
- mechanic set non-empty and fully played → the new line

Measured: **9 commanders** in the catalog have every tag resolve to a creature type, so the
redefined branch is real and reachable.

## Ruling A — the ordering is already right, and was never the defect

**`unplayedTags` already sorts by `b.count - a.count` (`src/lib/discovery/novelty.ts:44–48`), so
the shipped order is EDHREC deck count descending and needs no change.** It also already matches
how the sentence beside it is built — `buildProsePrompt` takes the top eight themes by deck count
— so both halves of the row describe the same deck.

This is recorded as a ruling because the ordering is the obvious suspect and it is innocent.
Reading `Frogs · Crocodiles · Bears` invites the conclusion that something ranked obscurity
first. Nothing did. Glarb's actual tag counts, against 24,054 tracked decks:

| tag | decks |
|---|---|
| Lands Matter | 897 |
| Reanimator | 761 |
| **Frogs** | **598** |
| cEDH | 513 |
| Crocodiles | 2 |
| Bears | 1 |

`Frogs` is Glarb's **third-largest theme**, and it led the reported row because the reader
already plays Lands Matter, Reanimator and cEDH. `Crocodiles` and `Bears` followed at counts of
2 and 1 because the descending list had run out of real themes and continued into the tail.

**So the report has two causes, and they need two different rules.** 48% of Glarb's 172 tags sit
at a count of 3 or fewer out of 24,054 decks:

- **`Frogs` is not noise** — it is a genuine Glarb archetype that the reader does not find useful,
  which is why the creature-type classifier (Ruling B) is the rule that removes it. Named
  explicitly in the report: *"You don't have a frog tribal"* as the example of an unhelpful line.
- **`Crocodiles` and `Bears` are noise** — statistical accidents that no classifier is needed to
  remove and that would recur among mechanics the moment a reader plays a commander's real
  themes. That is Ruling C.

**Repetition under this ordering was checked and is not a problem:** 2,586 distinct triples
across 3,076 rows, worst collision 11 rows. No overflow count is added; the cap stays at three
names silently, because the row just deleted four such counts.

## Ruling C — a theme must be one deck in 200

**A tag is eligible for the gap line only if its count is at least 0.5% of the commander's own
`deck_count`.** Without it, every reader who plays a commander's substantial themes falls into
the tail, and the classifier does nothing to stop them — the mechanic tail is as long as the
tribal one.

Measured across the catalog, mechanic tags surviving each candidate floor:

| floor | median tags | mean | zero-tag commanders | 1–2 tags |
|---|---|---|---|---|
| none | 33 | 38 | 118 | 114 |
| 0.25% | 14 | 14 | 118 | 114 |
| **0.50%** | **9** | **9** | **118** | **120** |
| 1.00% | 5 | 6 | 121 | 232 |
| 2.00% | 3 | 3 | 173 | 1,012 |

**2% is disqualified by a case, not by the aggregate.** Kenrith's largest theme — `Group Hug` at
614 — is under 2% of its 31,481 tracked decks, so at that floor a commander with 31,481 decks on
file has no theme at all. **1% costs 118 commanders their three-name form** for no gain in tail
removal. **0.5% cuts Glarb from 132 eligible mechanic tags to 13 and leaves the zero-tag
population exactly where it was**, which is the whole test: the floor should delete accidents,
not states.

A median of 9 is comfortably clear of the 3 names the line needs, so the cap in Ruling A stays
the binding constraint for almost every row rather than the floor.

**Where `deck_count` is null the floor does not apply** and the classifier alone governs. A floor
is a proportion, and there is nothing to take a proportion of; inventing an absolute minimum for
those rows would be a second rule with no evidence behind it.

One consequence worth stating, because it makes a state honest rather than merely reachable: with
the floor in place, the reader who reported this sees `Nothing new` on Glarb — and *"You already
play every mechanic this commander leans on"* is then **true**, which it would not have been
while `Crocodiles` counted as a mechanic they had never played.

## Ruling B — the classifier excludes formats as well as creature types

Creature-type removal alone leaves `cEDH` in Glarb's line, and *"None of your decks play cEDH"*
is a category error rather than a claim. **Seven labels are excluded as formats or non-card
contexts:**

`cEDH` · `European Highlander` · `Premodern` · `Old School` · `Planechase` · `Value Vintage` ·
`Custom Cards`

**Broad strategy labels are deliberately kept** — `Aggro`, `Midrange`, `Control`, `Combo`,
`Good Stuff`, `Legends`, `Tokens` — as are the Legacy/Modern archetype names EDHREC's vocabulary
carries (`Blue Moon`, `Stoneblade`, `Delver`, `Tron`, `Rock`, `Turbo`, `Paradigm`, `Opus`,
`Repartee`, `Glass Cannon`, `Rube Goldberg`). Excluding those was considered and rejected: it
needs a ~20-label judgment list with genuine borderline cases (`Aristocrats`, `Voltron`, `Stax`)
where the format list needs seven obvious ones.

**The asymmetry in maintenance is the reason the two lists are different in kind.** Creature
types are *derived* from the catalog's own type lines, so a new creature type arrives in the
weekly refresh and is caught for free. No catalog knows that `cEDH` is a power level and
`Proliferate` is a mechanic, so the format list is hand-maintained and will drift as EDHREC's
vocabulary grows. A computed substitute was tested and does not exist: excluding labels by how
many commanders carry them cannot separate these two classes, because `cEDH` sits on 1,504
commanders and `Reanimator` on 1,519.

## Erratum 1 — the handoff's worked commander is the wrong one

INDEX §D states that Glarb's *"every one of its tags is a creature type, so the mechanic set is
empty."* Measured: **172 tags → 133 mechanic, 39 creature-type**, the mechanic set including
`Lands Matter`, `Reanimator`, `Combo`, `Graveyard`, `Mill`, `Landfall` and `Self-Mill`.

**Glarb is a `Full`-state commander**, and `STATES-commander-row.md` names it as the commander
throughout. The ruling is unaffected — the redefined branch has 9 real members — but any
document illustrating `No tags` must draw one of those 9 rather than Glarb.

Why Glarb's shipped row led with `Frogs · Crocodiles · Bears` despite 133 mechanic tags is
Ruling A, and it is not what it looks like: the order was already deck count descending, the
reader already played every Glarb theme above `Frogs`, and the two names after it were tail
accidents at counts of 2 and 1.

## Erratum 2 — amber B is inverted

R1 drew the gap line at one, two and three names against a worry that commanders might commonly
land on **one** mechanic tag. The distribution over 3,279 commanders:

| mechanic tags after classification | commanders | share |
|---|---|---|
| exactly 1 | 51 | 1.6% |
| exactly 2 | 63 | 1.9% |
| exactly 3 | 70 | 2.1% |
| **4 or more** | **2,977** | **90.8%** |
| tags empty upstream | 109 | — |

The three-name form is the near-universal case and the one-name form is the rarity. No geometry
moves, exactly as R1 predicted. What changes is that the three-name cap is **load-bearing rather
than a ceiling rarely reached**, which is why the tail has to be cut by Ruling C: with 33 median
eligible tags and no floor, three names are drawn from a pool that is mostly accidents. Under
Ruling C the median falls to 9 and the cap binds against real themes.

## Erratum 3 — amber A is green on desktop and amber on the phone

Production, 3,341 stored sentences: mean **148**, p95 **171**, max **190**.

- **0** exceed R1's desktop two-line allowance of ~190 characters at a 760px measure.
- **75 (2.2%)** exceed the phone's four-line allowance of ~176 at 330px.

R1's stated remedy stands unchanged: widen to the row's full `1fr` before adding a line. Not
blocking.

## Erratum 4 — amber C closes benignly, with a caveat about the fixture

`Nothing new` is **2.6%** of rows against a 2,733-card collection (`Full` 93.8%, `No tag data`
3.6%). The calm treatment is right at any frequency, which R1 had already argued. The caveat is
that this account plays only **43 distinct tag slugs** across its decks, so a reader with many
decks in many archetypes will see the state considerably more often; the figure is a floor, not
an estimate.

## Erratum 5 — `FitBar` is not dead code

INDEX's *"`FitBar`, `RoleChips`, `ReceiptLine`, `OverlapTrack`, `TagSentence` and the `show
fewer` trigger lose their last caller on these rows"* is precise, but it reads as a delete list.
**`src/components/about/figures.tsx` renders `FitBar`** and must keep it. `RoleChips` does lose
every caller and can go.

## Verified against the tree

- All seven reuse-manifest strings exist at the paths named; `commandersCopy.row.action` is
  retired as stated; `explainedCopy.score.scoreAria` and `home.cardAria` are both real.
- `labelAtPx → 56` is correctly derived. The owned band's 63 measured a type line, and cutting
  that type line is right: `rec-card.tsx` draws it at both widths (`:205`, `:295`) and
  `discovery-row.tsx` draws none, so one lane loses nothing. **This is an addition to this
  spec's cut list** and is accepted.
- The `"use client"` claim holds for the file — `rec-card.tsx` carries no directive and no
  hooks, and `discovery-row.tsx`'s only client need is the retired disclosure. Immaterial to the
  bundle, since `commanders-view.tsx` is `"use client"` and the row ships to the client either
  way.

## Still open

- Whether a second stored sentence (`how it wins`) earns its ~3,300 one-off calls. Revisit after
  the row has shipped. R1 records that the composition has room for it in the sentence block
  without a height change.
- The format exclusion list will drift as EDHREC's vocabulary grows, and nothing detects that.
  Worth a line in the commander-index runbook rather than a check.
