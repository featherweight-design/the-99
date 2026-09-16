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

Four separate faults, and they have four separate causes.

1. **The tag list names creature types.** `Frogs` says nothing about how a Glarb deck plays,
   and the report names that kind of line explicitly as unhelpful. It is **not** noise,
   though — see Ruling A — so nothing is wrong with the ranking that produced it, and the
   rule that removes it is the classifier in Ruling B.
2. **Two of the three names are statistical accidents.** `Crocodiles` and `Bears` sit at
   EDHREC counts of **2 and 1** out of Glarb's 24,054 tracked decks. They appear because the
   descending list ran out of real themes and continued into a tail holding 48% of the
   commander's tags, and no classifier addresses that — Ruling C does.
3. **The nearest-deck clause argues the wrong way.** `Your closest build, HD - Goblins,
   plays …` was a deliberate ruling — end the sentence on newness rather than on overlap —
   but under a sort whose whole purpose is to surface the unfamiliar, naming the familiar
   deck is the opposite of the point.
4. **The floor note repeats on every row.** `clears the 30% floor: you own 33% of its
   support list` restates a rule the page header has already stated once.

Underneath those is a fifth, which is the reason the first four were worth a redesign
rather than a copy edit: **the row is a data table, and the reader does not want one.** The
figures on it — role counts, a support count over an EDHREC total, a ratio bar, a deck
count, an availability line — are only interesting after the decision to investigate has
already been made, and that decision is made on Commander Details.

Sixth, and reported alongside: **the same commander carries two different headline
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

### But parity is NOT proved, and PR 1 must prove it before the probe can assert it

The arithmetic being free does not make the two surfaces agree, and an earlier revision of
this spec asserted that they would without checking — the structural claim §10b of `pr-review`
exists to stop. **The two `fitSynergy` inputs come from different computations over different
data paths:**

| | `/discover` row | Commander Details |
|---|---|---|
| numerator | `count(distinct csc.oracle_id)` — an **`oracle_id` join** over `commander_support_cards` (`candidates.ts:310`) | `edhrecOverlap(topCards, pool).names.length` — a **name match** over the live EDHREC array, with a front-face fallback for DFCs (`score.ts:252`) |
| denominator | `commander_support.edhrec_total`, a stored column | `args.edhrecTopCards.length`, the fetched array |

**The lanes themselves cannot disagree, because their populations are disjoint** — `/commanders`
scores `collection.filter(isCommanderCandidate)`, the commanders the reader owns, and
`/discover` lists the ones they do not, so no commander appears on both and `commander_scores`
holds no row for a discovery row. **Commander Details is where parity bites**, because
`page.tsx:76` calls `scoreOneCommander` for *every* commander, owned or not — so a `/discover`
row and the detail page it links to would print the same commander's Fit by two different
routes. That is precisely the reported defect, reintroduced by its own fix.

**The denominators are measured and agree:** `edhrec_total` equals the `commander_support_cards`
row count for **3,340 of 3,342** commanders, differing by 1 on two of them. Both sides read the
same underlying EDHREC list, which is what makes agreement plausible.

### Measured 2026-09-15: parity FAILS, and the cause is drift

`pnpm probe:fit-parity` calls the real `loadCandidates` and the real
`scoreOneCommander` for the same commanders and compares. Over 60 candidates with a non-zero
stored overlap:

| | disagree |
|---|---|
| numerator — owned support | **40 / 60** |
| denominator — EDHREC total | **39 / 60** |
| **the resulting `fitSynergy`** | **15 / 60** |

Mostly by one point; `Faceless One` reads **23 stored against 18 live**. **The divergence runs
in both directions** — stored above live and live above stored, on different commanders — so
this is not a resolution failure. It is **drift**: `commander_support` is a monthly snapshot
(the `Commander index` workflow runs on the 3rd) and the live EDHREC payload changes
continuously.

So a row printing a stored-derived Fit would disagree with its own detail page on roughly a
quarter of commanders. That is the reported defect — *"why is the score different across
views"* — reproduced at smaller magnitude by the change meant to remove it.

### Ruling D — one source of truth: every Fit reads the stored index

**Settled 2026-09-15.** `scoreCommander`'s synergy overlap moves from the live EDHREC payload
to the stored index, so `/discover`, `/commanders`, Commander Details and Home's hero all
compute the same figure from the same rows.

Three things make this smaller and better-founded than it first looks:

- **Commander Details already mixes the two sources, and this removes the mix rather than
  creating one.** Its synergy panel reads `commander_support_cards` today
  (`app/commanders/[slug]/synergy-read.ts`) while its Fit reads the live payload — so the page
  currently draws a card list from one source and a score from another. After this they agree.
- **The alternative was rejected for a reason already in the tree.** Teaching the row the live
  name match means a per-row EDHREC read across ~3,085 rows, which is exactly what `rankFree`
  refuses to do and says so (`free-ranking.ts:105–112`).
- **The figures become as fresh as the index and no fresher**, which is the honest cost: a
  commander whose EDHREC list moved last week reads last month's overlap until the 3rd. Every
  surface being wrong together is worth more than one surface being right alone, because the
  reader can only ever compare two surfaces to each other.

`probe:fit-parity` is the acceptance test for this ruling: **it must go green**, and it is
written to exit non-zero while the two disagree, so it cannot pass by measuring nothing.

**This is its own PR and it lands before the row** — see the revised boundaries below. It
changes a figure on shipped surfaces, so it also needs the `commander_scores` writer-version
stamp considered (`probe:writer-version`) and both cache versions bumped.

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
| baseline payload, this collection | 0.93 MB |
| prose added | +488 KB |
| cut fields and trimmed labels recovered | −448 KB |
| **variant payload, this collection** | **0.97 MB** |
| **net change** | **+40 KB** |

**What this measurement establishes is the +40 KB delta, not the absolute.** Its 0.93 MB
baseline is this collection's, and it is not the 1.09 MB recorded in `encode.ts` and
`src/lib/cache/user-lists.ts` — that figure came from a larger collection than any now on
local-dev, and production's `collection_items` is currently empty, so it cannot be
re-measured here. The two are not in conflict and neither is wrong; they are different
collections. **The absolute is therefore the byte guard's job, not this document's** — see
Verification, where the guard encodes a full-catalog payload and fails above a stated budget.
Against the recorded 1.09 MB the same delta lands at ~1.13 MB, still well under the ceiling.

The recovery comes from six fields the row stops printing — `roleCounts`, `colorPoolSize`,
`ownedSupport`, `supportPct`, `tagTotal` and `nearestDeck` — collapsing into one `score`
integer, plus `unplayedLabels` dropping from every unplayed tag to three dictionary indices.

Two reasons to trust the direction of the error. Local prose averages 160 characters against
production's 148, so the measurement is pessimistic. And at 3,085 rows of a local catalog of
**3,279**, the row count is near its ceiling, so a larger collection adds at most ~6%.

**No two-tier payload is needed.** The measurement was taken with a throwaway script that is
deliberately not kept: it answers one question once, and the number belongs in this document
rather than in a guard. What *is* worth a guard is the ceiling itself — see Verification.

### The tag classifier

130 of the 401 distinct tag labels resolve to creature types. The classifier's job is to keep
those out of the gap line and let mechanics through.

**The rule was built and run rather than described, and it took six measured corrections.** The
generator's final classification of the 401-label vocabulary is **260 mechanic · 134 creature ·
7 format**, with every case below asserted inside the generator so it proves its own fixes
instead of claiming them.

**The vocabulary is Scryfall's six subtype catalogs unioned with the card-derived one, because
neither source is sufficient alone.** Deriving it from card type lines — the fix an earlier
revision of this spec stated — fails four separate ways:

- **The creature half of the type line keeps all 10 of the 13 dual-role subtypes.** `Food`
  really is a creature subtype, on `Artifact Creature — Food Golem`; so are `Treasure`,
  `Equipment`, `Clues`, `Sagas`, `Shrines`, `Books`, `Auras`, `Adventures` and `Vehicles` on
  their own creature-bearing cards.
- **Subtracting every subtype that appears on a non-creature line deletes `Dinosaur`**, which
  has **231 creature printings against a single non-creature one**. The exclusion has to be by
  catalog, not by card occurrence.
- **`Servo` is token-only.** `transform.ts:13` drops token layouts, so it is absent from `cards`
  entirely and `Servos` was allowlisted as a mechanic.
- **`Time Lord` is multi-word.** Splitting subtypes on whitespace records `time` and `lord`, so
  `Time Lords` could never match — and no guard on the matcher could have saved it.

Scryfall's catalogs fix all four, and they are **provably usable as an exclusion set**: measured
2026-09-15, `creature-types` (350 entries) has **zero overlap** with the artifact, enchantment,
land, spell and planeswalker catalogs, and all ten dual-role labels sit in one of those five.

**But the authoritative list alone is not sufficient either.** `Cephalid` is a real tribe that
appears in **no** Scryfall subtype catalog, so a catalog-only vocabulary allowlists `Cephalids`
as a mechanic. The card-derived half covers that gap, which is why both are kept.

Two more corrections, both recorded because each was a tribe reaching the reader:

- **`Kindred` bears creature types without being a creature.** `Tribal Enchantment — Faerie
  Aura` sent `Faeries` to the mechanic side of the card-derived half. Faces whose type line says
  `Creature`, `Kindred` **or** `Tribal` all count as creature-bearing.
- **`Eggs`, `Mounts` and `Toys` are creature types**, and an earlier revision of this spec was
  wrong to call them mechanics. All three are real subtypes — Bloomburrow's `Mount`, the `Egg`
  type — whose EDHREC tag is genuinely ambiguous between the tribe and an archetype built around
  it. The safety asymmetry resolves them to the hidden side.

**Reducing EDHREC's plural labels to Scryfall's singular type names is a SECOND, independent
problem, and a hand table of known words is the wrong mechanism for it.** One was written —
five entries — and it was still missing four tribes: `Mice` and `Werewolves`, which review
found, and `Cybermen` and `Pegasi`, which turned up only when the entire mechanic allowlist was
swept against Scryfall's creature types. Every one of the four is a regular instance of an
irregular English pattern, so the pattern is what the code carries now: a table entry fixes one
word, a rule fixes the next set's tribe too.

| ending | becomes | the tribe that paid for it |
|---|---|---|
| `-ves` | `-f`, `-fe` | `wolves`, `elves`, `dwarves`, `werewolves` |
| `-men` | `-man` | `cybermen` |
| `-i` | `-us` | `fungi`, `pegasi` |
| `-ice` | `-ouse` | `mice` |
| `-oes` | *drop 2* | `heroes` |
| `-ies` | `-y` | `allies` |
| `-s` | *drop 1* | `frogs`, `faeries`, `horses`, `humans`, `zombies` |

Over-reduction is safe and deliberate — a form matching no creature type costs nothing — and
the generator's `MUST_BE_MECHANIC` cases catch a rule that pulls a real mechanic across.
`Cycling`, `Surveil`, `Prison` and `Spellslinger` are pinned for exactly that, since each ends
in letters one of these rules fires on.

**One residual gap, stated rather than papered over:** a multi-word subtype that Scryfall omits
would be split into words by the card-derived half and missed. No such case exists in the
current vocabulary.

An **unclassifiable label is excluded** from the gap line. The asymmetry is deliberate: a
mechanic wrongly hidden produces a thinner sentence, while a creature type wrongly shown is
the defect this spec exists to fix.

**That rule forces the classifier to be an allowlist of mechanics, not a denylist of creature
types**, and getting this backwards would reintroduce the defect. A denylist defaults an
unrecognised label to *mechanic*, so the first creature type EDHREC adds after the last
vocabulary refresh reaches the reader — precisely the reported bug, arriving by itself. An
allowlist defaults it to *hidden*, which is the direction the rule above asks for. So the
generated artifact is the set of labels known to be mechanics, and a label absent from it is
excluded until the generator runs again.

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

### The gap slot ships as a tagged union, because `tagTotal` is one of the cut fields

`No tags` and `Nothing new` both leave the label list empty, so a client holding only
`unplayedLabels: []` cannot tell them apart — and `tagTotal`, the field that would have
discriminated, is cut for its bytes. **So the state is decided on the server and shipped as
the slot's own discriminator:**

```ts
type GapSlot =
  | { kind: "unplayed"; labels: string[] }  // 1–3 names, already classified, floored, ordered
  | { kind: "allPlayed" }                   // mechanic set non-empty, every member played
  | { kind: "noMechanics" };                // mechanic set empty after classification
```

Three consequences, all of them wanted. The classifier, the floor and the ordering run once
per row on the server rather than in the component, so the row draws what it is given and has
no rule in it. The redefinition R1 asked for — decide on the classifier's output, not
`tags.length` — has exactly one place it can be implemented. And the payload carries **one
small tag plus at most three dictionary indices** where it used to carry `tagTotal`, every
unplayed label and `nearestDeck`, so the discriminator costs less than the field it replaces.

**One claim in R1's readiness doc does not survive this, and it is a scope correction rather
than an erratum.** `showUntagged` is `fit && item.tagTotal === 0` (`discovery-row.tsx:287`),
so the `No tag data` note renders today under **one sort on one lane** — `rec-card.tsx` has
no such note at all. Calling it "the shipped note with its condition redefined" understates
the work: on the merged row it draws under both sorts and on both lanes, which is new
rendering on three of those four combinations. The note's markup and copy are reused; its
reachability is not.

`Nothing new` is the one with no existing answer. It is reachable: a reader with many decks
across many archetypes can own a commander whose every mechanic they already play, and the
gap line then has nothing to assert. It must not fall back to naming creature types, and it
must not print an empty clause.

## Verification

- **Unit** — the classifier over all 401 labels, asserting the counts it produced
  (269 / 125 / 7), the **ten** dual-role subtypes that must read as mechanics, the five
  irregular plurals, and `Eggs` / `Mounts` / `Toys` on the creature side — plus the
  proportional floor at a null `deck_count` and the three `GapSlot` branches. Fit arithmetic
  is already covered in `score.ts`'s tests, and **so is the row's denominator**:
  `rec-card.test.tsx:226` already asserts a null-synergy commander prints
  `fitDenominatorMeasurable(40)` at both widths and that the rescaled `80` never appears, with
  `scoreAria(32, 40)` at `:246`. The merged row inherits those cases rather than needing new
  ones; what it needs is that they still run against the new component.
- **Payload guard** — a test that encodes a full-catalog payload and fails above a stated
  byte budget. This is also what establishes the payload's **absolute** size, which the
  measurement above deliberately does not: a breach of the ceiling is silent, so the budget
  has to be asserted somewhere that runs, against a catalog-sized row count rather than one
  collection's.
- **Probe** — `/discover` and `/commanders` at both widths: the sentence renders, the gap
  line names no creature type, and the row's height is identical under both `/discover`
  sorts. That last one is the ruling that cannot be read off a diff. **The Fit-parity clause
  is deliberately not listed here**: it cannot be written until PR 1's numerator measurement
  settles whether the two figures agree, and a probe asserting the thing under question would
  report a pass by measuring nothing.
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

**Revised 2026-09-15, from three to five.** The original PR 1 bundled the classifier with the
payload work and assumed Fit was a free addition. It is not: Ruling D changes a figure on every
surface that prints one, and that cannot ride along with a payload reshape. The parity
measurement that forced the split was itself the original PR 1's first task, so the boundary
moved for the reason the task existed.

1. **The classifier and the gap slot.** `tag-kinds.ts` and its generator, the `GapSlot`
   builder, the 0.5% floor, and `probe:fit-parity`. Pure code and one probe; no surface reads
   any of it, no payload changes, no figure moves. **This PR is where the parity answer comes
   from**, which is why it carries the probe rather than the payload.
2. **One source of truth for Fit** — Ruling D. `scoreCommander`'s synergy overlap moves to the
   stored index, `probe:fit-parity` goes green, and `/commanders`, Commander Details and Home
   all shift by the drift they currently carry. Needs the `commander_scores` writer-version
   stamp considered and a reason recorded for whichever way that goes.
3. **The payload and the lane reads.** `prose` into both lane queries, the `GapSlot` on the
   row payload, Fit on discovery rows, the encode shape change and its byte guard. Two things
   easy to miss:
   - **Both cache versions bump**, in different modules and each dropped independently:
     `PAYLOAD_VERSION` in `src/lib/discovery/list.ts:224` (currently 2, feeding `discoveryKey`)
     and `PAYLOAD_VERSION` in `src/lib/commanders/rankings.ts:56` (currently 3). Both payloads
     change what they *say* for unchanged rows, which is exactly the condition those constants
     document, and a warm entry would otherwise serve prose-less rows for up to the hour
     ceiling to any reader who writes nothing.
   - **The owned lane needs two fields it does not have.** `CommanderListItem`
     (`recommend.ts:38–62`) carries no `deckCount` and no price, so the shared row's
     popularity and price figures have no source on `/commanders` today. `deck_count` is a
     column on `commander_support` and the price comes from `loadPrices` — which `/discover`
     already uses and which must be reused rather than re-derived, since a hand-rolled price
     CTE was already replaced wholesale once for getting foil, staleness and stock semantics
     wrong.
4. **The unified row.** `rec-card.tsx` and `discovery-row.tsx` collapse into one component;
   both lanes adopt it; the five states are drawn; retired copy is deleted and the property
   tables quoting it are corrected.
5. **Acceptance.** About entry and version bump, probe extensions, contact sheet.

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
file has no theme at all. **1% costs 115 commanders their three-name form**: commanders left with
fewer than three eligible tags go from 118 + 120 = 238 at 0.5% to 121 + 232 = 353 at 1%. **0.5%
cuts Glarb from 132 eligible mechanic tags to 13 and leaves the zero-tag population exactly where
it was** — 118, the same as with no floor at all — which is the whole test: the floor should
delete accidents, not states.

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
| exactly 0 — every tag a creature type | 9 | 0.3% |
| exactly 1 | 51 | 1.6% |
| exactly 2 | 63 | 1.9% |
| exactly 3 | 70 | 2.1% |
| **4 or more** | **2,977** | **90.8%** |
| tags empty upstream | 109 | 3.3% |

Those six rows are the whole catalog: 9 + 51 + 63 + 70 + 2,977 + 109 = **3,279**. The first
and last rows together are the 118 that Ruling C's table reports as its zero-tag column —
`No tag data`'s population, by the redefinition above.

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

## Erratum 4 — amber C closes benignly, and its figure is not the shipping one

`Nothing new` measured **2.6%** of rows against a 2,733-card collection (`Full` 93.8%,
`No tag data` 3.6%), which closes R1's amber C: the calm treatment is right at that frequency,
and R1 had already argued it is right at any.

**But that measurement predates Ruling C and must not be read as the shipping frequency.** It
was taken with no proportional floor, and the floor moves rows from `Full` to `Nothing new` by
construction — most visibly the reported Glarb row, which is `Full` in that very measurement
and becomes `Nothing new` under the floor. The direction is known and the magnitude is not; the
figure is a floor on the state's frequency in two senses at once.

The fixture compounds it in the same direction: this account plays only **43 distinct tag
slugs** across its decks, so a reader with many decks in many archetypes reaches the state more
often again. R1's ruling stands either way, which is why this is an erratum about a number
rather than a reopened question — but a document or probe that quotes 2.6% as what readers will
see is quoting a pre-floor world.

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
