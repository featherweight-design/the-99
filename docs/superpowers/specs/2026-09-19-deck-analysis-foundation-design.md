# Deck analysis foundation — bracket, facts and the Deck Profile

**Date:** 2026-09-19
**Branch:** `spec/deck-analysis-foundation`
**Serves:** sub-project 1 of the deck-analysis suite. Foundation for #215, #217, #218, #10, #724.
**Status:** spec — pending review

---

## 1. Why this exists

The app can score **commanders against a collection**. It has no object for *"what is this
deck, characterized"* — so every question a player actually asks about a finished deck has
nowhere to be answered from.

Nine features were raised in intake. Eight of them want the same missing object, and only
one of them is genuinely a language-model feature:

| Feature | What it needs | Model? |
|---|---|---|
| WotC bracket slotting | deck facts | no |
| Game Changer / bracket-push flag | deck facts + one candidate card | no |
| Combo analysis | deck facts | no |
| #218 find-a-deck-for-a-card | deck facts × one card | no |
| #217 swap recommendations | deck facts + support index | no |
| Cheaper-swap recommendations | deck facts + `printing_prices` | no |
| #215 alternate commander | deck facts + support index | no |
| Deck synopsis | deck facts → prompt | **yes** |
| Intake questions → deck | intent parse → target facts | thin |

This sub-project builds the object, and proves it with the one consumer that needs no model
and no invented judgement: **strict WotC bracket slotting**.

Bracket checking is not novel. [EDHcheck](https://edhcheck.com/),
[BrackCheck](https://brackcheck.com/), [manatap.ai](https://www.manatap.ai/mtg-deck-checker)
and [deckcheck.co](https://deckcheck.co/) all do it. It is chosen first because it is
**cheap, grounded, immediately useful on a deck that has never been played, and impossible
to fudge** — a consumer that cannot be satisfied by a vague profile is the right thing to
design a profile against.

### What is actually differentiated

Not the bracket. Three things no competitor can reach, all of which this app already holds
and all of which later sub-projects consume through the same object:

- **The collection, per printing, with the claim model.** Any tool can recommend Blood
  Artist. Only this app knows the copy is sleeved in another committed deck and which deck
  would have to give it up (`loadAvailability`, `card_assignments`).
- **Real prices with stock state.** `printing_prices`, with `as_of` freshness and the
  documented meaning of an absent row.
- **Play data.** `deck_games`. *"You have won 6 games with this deck and cast the commander
  in 2 of them"* is a recorded fact, not an inference, and it is the exact case that
  motivated #215.

---

## 2. Locked rulings

These came out of intake on 2026-09-19 and are not re-opened downstream.

### 2.1 Report, never weight

The slot is computed from the **countable** bracket rules only. Signals the rules mention
without quantifying — "few tutors", how fast the deck wins — are printed as **adjacent facts
with no threshold and no effect on the number**.

This is the standing convention here (#215: *"Two numbers shown side by side rather than one
weighted score — combining them means owning and defending a formula tuned blind"*; #218
reports synergy and need separately for the same reason).

deckcheck's own payload confirms the rules support nothing more: their `bracket_limits` give
tutors `{"max": "unlimited", "violated": false}` in **every** bracket. Even a system willing
to blend cannot make a tutor count move a bracket, because the rules do not say how.

### 2.2 Never a single power number

Not now, and **not as the nuance layer later**.

This is the CRISPI ruling, and it is the most expensive lesson available to us for free.
deckcheck shipped CRISPI, players adopted it, friends adopted it, and its premise —
*"powerful decks look like cEDH decks"* — failed on a case its own author could not see from
inside the model: a Cruelclaw attrition deck scored **5.19** against a precon's **5.13**.
Their write-up: *"According to CRISPI, those two decks belong at the same table but IRL
Cruelclaw would dominate that precon, and it wouldn't be close… CRISPI can't see it, because
Cruelclaw doesn't do the things cEDH decks do. It doesn't need to."*

Note where the replacement lands. DTI is **12 named benchmarks across 5 domains with a Card
Ledger showing exactly which cards support each rating**. The cure for a bad number was
receipts — report-never-weight, arrived at from the other direction, after the number had
already shipped.

**The trust cost here is social, not technical.** A bracket is used to set an expectation
with three other people before a game starts. A wrong verdict is worse than no verdict in a
way it is not for most features, because the cost lands on the table.

### 2.3 When a nuance read does come, it is comparative and local

The honest question is never *"is this deck a 5.88"*. It is *"is this deck stronger than the
other three at **this** table."* This app is built for a fixed group. **Pod comparison needs
no universal scale and therefore cannot have a CRISPI.**

So the model's eventual job in this space is **explaining a named gap with citations**, never
scoring. That constraint is recorded now, while it costs nothing, rather than after friends
have bought into a figure.

**This is a real practice, not a hypothetical.** Hugh's pod compares and tunes decks before
they play, so that no one blows the table out and no one gets flattened. That is the actual
job, and a bracket is only a proxy for it.

Two consequences, both of which this sub-project must not foreclose:

- **A comparative read is a first-class future consumer of the profile**, not a stretch goal.
  Where a rule below offers a choice between "a figure about one deck" and "a fact about one
  deck", prefer the fact — a fact can be compared across four decks, a figure that was
  normalised against nothing cannot.
- **Comparison does not require the app to become social.** It needs four decklists side by
  side, not four accounts. Pasted lists, the existing importer, or a read-only share link all
  reach it; accounts, invites and a shared pod object are a *separate* feature this one does
  not depend on. Keeping them separable is what lets the valuable half ship without
  committing to running a social product.

### 2.4 Constraints are filters, never prompt instructions

A tool asked for *"replace anything over $30"* or *"only cards I already own"* must apply
that as a **filter on the candidate pool before a model sees it**. A model satisfies a
constraint statistically; a query satisfies it absolutely.

This is the ruling behind the decision **not** to build a single combined tuning control.
deckcheck's PowerTune takes target bracket, budget, locked cards and strategy in one pass,
and the reported frustration with it is exactly that the budget and collection constraints
"generally don't succeed". Small tools, each with one job, each enforcing its own constraint
deterministically.

**A tool that cannot enforce its constraint deterministically does not offer it.**

### 2.5 The profile is facts; verdicts are pure functions over it

The stored object holds **what is true about a deck**. Every verdict — the slot, the flags,
the upgrade path — is a pure function reading it. A future nuance read is a *second consumer
sitting beside the strict slot*, never a rewrite of it.

### 2.6 Games are enrichment, never a gate

#10's suggestions are currently gated at `PATTERN_MIN` logged games. That gate is removed
when #10 resumes (§10): the profile alone is enough to suggest against, and a deck built
tonight gets an answer tonight. Game data, when it exists, enters the evidence pack and
sharpens the reasoning.

---

## 3. Scope

**In scope:**

- A `game_changer` column on `cards`, from Scryfall's own card field.
- A combo/classification ingest from Commander Spellbook's daily bulk, projected to three
  new tables, on a weekly cron beside `Catalog refresh` and `Price refresh`.
- A contract check for that upstream (`pnpm check:spellbook`), in the daily
  `Upstream contract checks` workflow.
- The **Deck Profile**: a pure builder plus a cached loader, defined as a composable set of
  fact-groups.
- **`slotDeck`**: the strict WotC bracket slot, a pure function over the profile.
- **`bracketDelta`**: what a candidate card would do to a deck's slot — the push check.
- **`upgradePath`**: the minimum set of cards to remove to reach a named lower bracket.
- A design brief for the deck-analysis surface, emitted to Design.
- Unit tests, a `probe:bracket` proving the slot against a real fixture deck, and a named
  amendment to the merged #10 plan.

**Out of scope, with reasons:**

- **Any UI.** No handoff exists (`design/` carries no bracket or analysis project). §11
  covers the split: this builds Tier A facts; Tier B reads land after a READINESS verdict.
- **Any language-model call.** Sub-project 5, and it reads this object.
- **Combo surfacing and near-miss recommendations.** The ingest lands here because the slot
  needs two-card-combo detection; *surfacing* combos and `almostIncluded` is sub-project 2.
- **Deck theme derivation from cards (#724).** Real, measured, and needs an EDHREC theme-page
  ingest that does not exist. §5.3 defines the slot the profile leaves for it, and why the
  profile must not hard-code commander tags as the theme source in the meantime.
- **Bracket 5.** Not derivable. §6.4.
- **Pod comparison, salt surfacing, rule-0 legality reporting.** Named as future consumers so
  the profile's shape accounts for them; none is built here.

---

## 4. The card-facts ingest

### 4.1 `cards.game_changer`

Scryfall carries `game_changer` as a **boolean on the card object**. Verified live against
`/cards/named?exact=Rhystic Study` on 2026-09-19: `"game_changer": true`.

`toCardRow` (`src/lib/scryfall/transform.ts:15`) gains one field, exactly as it already reads
`legalities.commander`:

```ts
gameChanger: raw.game_changer === true,
```

Column is `boolean not null default false`. **Default false under-claims**, which is the
correct direction: a row written before the re-seed reads as "not a Game Changer", which
loses a mark rather than inventing one. Same reasoning as `cards.layout`.

The 53-card list is maintained by WotC and republished by Scryfall — last changed 2026-02-09,
adding Farewell and Biorhythm. **It maintains itself through the weekly catalog refresh.** No
list is transcribed into this repository, and none should be: a transcribed list is a copy
that silently goes stale, and the failure mode is a deck slotted into a bracket it has
outgrown.

### 4.2 Commander Spellbook

Two facts the bracket rules need are not on a Scryfall card: whether a card is **mass land
denial** or an **extra-turn** effect, and what **two-card infinite combos** a decklist
assembles.

Commander Spellbook holds all three. Verified live on 2026-09-19:

- `POST /estimate-bracket` returns, per card, `gameChanger`, `massLandDenial`, `extraTurn`,
  `banned`; matched `templates`; and every combo the list assembles. It caught `Armageddon`
  through the `Mass Land Denial` **template**, not a card list.
- `POST /find-my-combos` returns `included` **and** `almostIncluded` — one card away.
- `https://json.commanderspellbook.com/variants.json` is the daily bulk: 656 MB,
  `last-modified` within hours.

**Decision: ingest locally, do not call per deck.**

A page render must not depend on a third party's uptime or a shared 80 req/min budget, and
the response is enormous — every card carries six image URLs. Ingesting matches how this repo
already treats Scryfall and ManaPool, and makes slotting a local SQL question.

**The template gap, stated plainly.** `/templates/` exposes `scryfallQuery` for most
templates but **`Mass Land Denial` (id 89) returns `null`** — the membership is server-side
and not downloadable. So card-level `massLandDenial` and `extraTurn` cannot be derived from
the templates endpoint. They are instead harvested from the **variants bulk**: every variant
carries `uses` (cards), `requires` (templates), `bracketTag`, `identity`, `legalities`,
`popularity` and `variantCount`, and a card appearing in a variant that requires the Mass
Land Denial template is how that card's classification is learned.

This is **incomplete by construction** — a mass-land-denial card in no combo is invisible to
it — and the spec does not pretend otherwise. Two consequences, both deliberate:

1. The ingest records **provenance** per flag (`source = 'spellbook_variant'`), so a later
   sub-project can add a second source without the reader guessing.
2. `pnpm check:spellbook` (§4.5) asserts a **known-positive sample** — `Armageddon`,
   `Ravages of War`, `Jokulhaups`, `Time Warp`, `Temporal Manipulation` — and fails when the
   ingest stops recognising them. An incomplete classifier that silently becomes *more*
   incomplete is the failure this guards.

**Where the honest answer is "unknown".** A deck may hold a mass-land-denial card this ingest
does not know. The slot therefore reports, beside its verdict, that mass-land-denial
detection is **sourced and partial** — not a silent claim of completeness. §6.5.

### 4.3 Tables

Three tables, in one migration.

```
spellbook_variants
  variant_id        text primary key        -- e.g. "742-1295"
  bracket_tag       text not null           -- R|S|P|O|C|E|B, checked
  card_count        integer not null        -- length of uses; 2 is the bracket-relevant case
  identity          text not null           -- colour identity string as upstream gives it
  popularity        integer
  produces          text[] not null         -- feature names, e.g. "Infinite mana"
  requires_template_ids integer[] not null
  computed_at       timestamp not null default now()

spellbook_variant_cards
  variant_id        text not null references spellbook_variants on delete cascade
  oracle_id         uuid not null references cards(oracle_id)
  primary key (variant_id, oracle_id)
  index on (oracle_id)                      -- "which combos does this card enable"

card_bracket_flags
  oracle_id         uuid primary key references cards(oracle_id)
  mass_land_denial  boolean not null default false
  extra_turn        boolean not null default false
  source            text not null           -- 'spellbook_variant'
  computed_at       timestamp not null default now()
```

`spellbook_variant_cards` is normalised for the same reason `commander_support_cards` is: the
consuming query is always "intersect this deck's oracle ids with variant membership", which
is a join Postgres does well and array containment does badly.

The `oracle_id` index exists because sub-project 2 traverses the relation in the opposite
direction — one card, which combos it appears in — and the primary key's leading column
cannot serve that.

**Unresolvable names are dropped and counted**, exactly as the EDHREC ingest does, so an
unresolvable card reduces measured coverage rather than silently shrinking a denominator.

### 4.4 The job

`pnpm db:seed:combos`, streaming the bulk the way `streamBulkEntries` already streams
Scryfall's. Projected to the fields above — the 656 MB is almost entirely image URLs we
discard.

Workflow `Combo refresh`, weekly, against **both** `catalog-staging` and
`catalog-production`, through a `plan` job feeding a matrix. **Not** an expression on
`environment`: that bug has now been found three times in this repository (`Catalog refresh`,
`Price refresh`, `Commander index`) and sends every scheduled run to production alone.

It runs **after** `Catalog refresh` in the week, because a variant naming a card the catalog
has not ingested yet is unresolvable, and the catalog moves first.

It stamps `catalog_refreshes` (non-fatally, as the other jobs do), because deck profiles are
cached and a combo the ingest newly learned must retire them.

### 4.5 `pnpm check:spellbook`

A contract check in the daily `Upstream contract checks` workflow, beside `check:scryfall`
and `check:manapool`. No database.

Four assertions, and the last two are the ones that earn it:

1. The bulk index is reachable and `last-modified` is within 8 days.
2. The first entry carries every field §4.3 projects.
3. `BracketTagEnum` still has the seven members the check constraint encodes — an added tag
   would otherwise fail every insert after the next upstream release.
4. **The known-positive sample resolves.** Each of `Armageddon`, `Ravages of War`,
   `Jokulhaups`, `Time Warp`, `Temporal Manipulation` is still classified. §4.2.

Per `run the guard's failure path before trusting it`, each of the four is run against a
mutated fixture before the check is believed.

---

## 5. The Deck Profile

### 5.1 Shape

```ts
export type DeckProfile = {
  deckId: string;
  /** Fingerprint of the inputs — decklist, commanders, catalog generation, builder version. */
  fingerprint: string;
  counts: ProfileCounts;       // total, nonland, land, basics
  roles: ProfileRoles;         // classifyRoles tallies + ROLE_TARGETS gaps
  curve: ManaCurve;            // manaCurve(), commanders folded in
  colours: ProfileColours;     // identity, producibleColors, and their disagreement
  brackets: ProfileBrackets;   // §5.2 — the fact-group the slot reads
  themes: ProfileThemes | null; // §5.3 — null today, deliberately
};
```

**Composable fact-groups, from the start.** Ownership, price and play-data groups are added
by later sub-projects as sibling keys. Nothing about the loader, the fingerprint or the cache
key changes when they arrive — that is the point of the shape, and it is why milestone 1
computes only what its own consumers read rather than everything the suite will eventually
want.

### 5.2 `ProfileBrackets`

```ts
type ProfileBrackets = {
  gameChangers: CardRef[];           // names + oracle ids, for receipts
  massLandDenial: CardRef[];
  extraTurns: CardRef[];
  twoCardCombos: ComboRef[];         // card pairs, with the variant id
  banned: CardRef[];
  tutors: CardRef[];                 // reported, never weighted — §2.1
  detection: DetectionCoverage;      // §4.2, §6.5
};

/**
 * How completely each fact could be determined, per source. A union rather than a literal:
 * mass-land-denial detection is partial today (§4.2), and a later source that makes it
 * complete must be able to say so without every reader changing.
 */
type DetectionCoverage = {
  massLandDenial: "complete" | "partial";
  extraTurn: "complete" | "partial";
};
```

**What counts as a two-card infinite combo.** A variant qualifies when
`card_count = 2` **and** its `produces` names an unbounded or game-ending feature —
Spellbook's own feature vocabulary, matched against a stored allowlist generated from the
bulk rather than typed by hand, the way `tag-kinds.generated.ts` already handles EDHREC's
tags. Card count alone is not the test: a two-card variant producing "two 1/1 tokens" is a
synergy, not a combo, and slotting a deck to Bracket 4 over one would be a wrong verdict of
exactly the kind §2.2 says lands on the table. The allowlist is regenerated by the ingest and
its size is logged, so a vocabulary change upstream is visible rather than silent.

Every list carries **card references, never counts alone**. A count with no cards is an
assertion the reader cannot check, and the whole lesson of §2.2 is that receipts are what
survive.

`tutors` is classified from oracle text and carries no threshold anywhere in this
sub-project. It exists because the reader wants it beside the verdict for a Rule 0
conversation, and because Max's question — *does one more tutor move me?* — deserves the
honest answer rather than silence. See §7.2.

### 5.3 `ProfileThemes` is null, deliberately

#724 measured the problem precisely: `loadPlayedTags` answers "what does this player play"
from each deck's **commander's** EDHREC tag list, so a Kenrith deck carries Group Hug and
Reanimator whether or not a single card supports them. On the reference account, **77.0% of
`/commanders` rows read `allPlayed`** off that inference.

The fix needs a card-to-theme mapping the database does not hold, and that ingest is a
feature, not a field.

So the profile carries the key and leaves it **null** rather than filling it with commander
tags. Filling it would propagate the exact false claim #724 exists to end, into a new object,
on a route that did not previously make it — and would then have to be unpicked from every
consumer. A null reads as absent. A wrong theme list does not.

### 5.4 Building and caching

`buildDeckProfile(input): DeckProfile` is **pure** — no database, fully unit-testable, and
the thing every test asserts against.

`loadDeckProfile(deckId, userId)` gathers the rows and calls it, behind `cacheForUser` keyed
on `(userId, deckId, fingerprint)`. The fingerprint includes the **catalog generation**
(`catalogGeneration()`), so a combo or Game Changer the weekly ingest newly learned retires
every cached profile without the job needing a list of readers — the mechanism #705 already
established.

It reads the deck's **draft** state (`loadDraftState`), not its committed version. The
question is always about the deck as it stands now, and a change staged tonight must move the
slot tonight. This matches `probe:claims`' finding that a draft-staged card counts against
supply the moment it is added.

---

## 6. The bracket slot

### 6.1 `slotDeck(profile): BracketVerdict` — pure

```ts
type BracketVerdict = {
  bracket: 1 | 2 | 3 | 4;
  limits: Record<"bracket1" | "bracket2" | "bracket3", BracketLimitReport>;
  violations: Violation[];          // why it is not one bracket lower
  unquantified: UnquantifiedFacts;  // tutors, and anything else §2.1 refuses to weight
  detection: DetectionCoverage;     // carried through from the profile, §5.2
};
```

**The slot is the highest bracket whose limits the deck does not violate.** Every bracket's
limits are reported, violated or not — the reader's real question is often "what would I have
to cut to sit at 2", which a bare verdict cannot answer and a full table can. deckcheck's
`bracket_limits` / `all_violations` shape is the right shape and is adopted in structure.

### 6.2 The countable rules

| | B1 Exhibition | B2 Core | B3 Upgraded | B4 Optimized |
|---|---|---|---|---|
| Game Changers | 0 | 0 | ≤ 3 | unlimited |
| Mass land denial | none | none | none | allowed |
| Chained extra turns | none | none | none | allowed |
| Two-card infinite combos | none | none | late-game only | allowed |
| Tutors | reported, never weighted | | | |

Expected game length (9+ / 8+ / 6+ / 4+ turns) is **not** computed. It is an outcome, not a
deck property, and any estimate of it would be an invented weight wearing a turn number.

### 6.3 Two judgement calls, made explicit

Both are places where the rules are looser than an implementation must be. Each is recorded
here so a later disagreement is a decision to revisit rather than a bug to hunt.

**Extra turns: "chained", not "present".** WotC's text prohibits *chaining* extra turns, not
owning one. deckcheck counts cards and allows up to 3 in brackets 2 and 3 — their
interpretation, visible in their payload. This spec follows the text: a violation requires
**a card that grants an extra turn and can repeat itself** (`Time Warp` recursion, an
`Aggravated Assault`-style untap loop present as a combo) rather than a bare count. Where the
ingest cannot tell, the card is **reported under `unquantified`, not counted as a violation**
— §2.1 applied at the point it actually bites.

**Two-card combos: "late-game" is not computable.** B3 permits late-game two-card combos and
forbids early ones. Nothing in the data says when a combo lands. The slot therefore treats
**any two-card infinite combo as permitted at B3 and forbidden at B1/B2**, and prints the
combo with its pieces so the reader can judge. Inventing a mana-value threshold for
"late-game" would be exactly the formula §2.1 refuses.

### 6.4 Bracket 5 is not derivable, and is not offered

B5 is about *intent* — playing a tournament-grade list to win — and two decks with identical
contents can sit at 4 and 5. Deriving it from cards would be a claim about a person.

The verdict's ceiling is **4**. Where a deck violates B3's limits the app says so, and says
that 4 and 5 are separated by how you intend to play it. deckcheck's payload does the same
thing structurally: their `bracket_limits` cover only brackets 1–3, and 4 is "violates 3".

### 6.5 The verdict states what it could not see

Mass-land-denial and extra-turn detection are both `"partial"` (§4.2), so the verdict carries
`detection` and the surface must print it. A verdict claiming completeness it does not have
is the §2.2 failure in miniature: a reader takes it to a table, and the cost lands there.

The two-card-combo detection is **not** marked partial, and the distinction matters. Combo
membership is the one thing the bulk is authoritative about — a variant either exists in
Spellbook's index or it does not, and that is the same answer their own `/estimate-bracket`
would give. The card-level flags are partial because they are *inferred* from variant
membership rather than published directly.

---

## 7. The marks and the push check

### 7.1 Card-level marks

`game_changer`, `mass_land_denial` and `extra_turn` are **standing facts about a card**,
true with no deck in scope. They are available wherever a card is drawn — the collection, a
card modal, a decklist row — through the existing card read, at no query cost beyond the
column.

This answers a question worth asking on its own: *which of my cards are Game Changers?*, the
thing a player checks before a Rule 0 conversation.

### 7.2 `bracketDelta(profile, candidate): BracketDelta` — pure

The prospective check. Max's case: *"if I add this mass land denial, or one more tutor, does
it shift me up?"* — his concern being a deck too strong to be fun with friends.

The answer has **two shapes that must never be blurred**:

```ts
type BracketDelta =
  | { kind: "moves";    from: Bracket; to: Bracket; rule: Violation }
  | { kind: "counts";   rule: "gameChangers"; now: number; limit: number; to: Bracket | null }
  | { kind: "reports";  fact: UnquantifiedFact }
  | { kind: "none" };
```

- *Armageddon — mass land denial. This moves you out of Bracket 3.* A **rule**.
- *Your 4th Game Changer. Bracket 3 allows 3, so this moves you to Bracket 4.* A **rule with
  a count**.
- *Your 8th tutor. No bracket rule counts tutors, and this does not move your bracket —
  Bracket 2 asks you to keep them few.* A **fact with no verdict**, and saying so plainly is
  the honest answer, not a hedge.

It is a pure function over an already-built profile plus one card, so it is cheap enough to
run per candidate row. That property is required by later sub-projects too — every
recommendation tool wants "what would this do to the deck" for many candidates at once.

### 7.3 `upgradePath(profile, target): UpgradePath` — pure

*What would I remove to sit at Bracket 2?* The minimum set of cards whose removal clears
every violation of the target bracket's limits, with the rule each one answers.

Not a recommendation and not a ranking — a **consequence**. Every card in it is a card the
deck holds and a rule it violates. There is no judgement in it to defend, which is why it can
ship here rather than waiting for the swap tools.

---

## 8. Proof

Three layers, because each catches what the others cannot.

**Unit.** `buildDeckProfile`, `slotDeck`, `bracketDelta` and `upgradePath` are pure. Cases
per bracket boundary, per rule, and specifically: a deck at exactly 3 Game Changers (B3, no
violation) against one at 4 (B4, with `Underworld Breach` named as the excess — the case
visible in the supplied deckcheck payload); a mass-land-denial card with `detection: partial`
still reported; a tutor that moves nothing.

**`pnpm check:spellbook`.** §4.5. Upstream contract, daily, no database.

**`pnpm probe:bracket`.** A real Postgres, per-run `user_id`, deleted in a `finally`, pointed
at `local-dev` or a scratch branch, **never production** — the discipline `probe:claims`
established.

What only a database can answer here:

- The profile is assembled from the **draft**, so a staged add moves the slot before any
  commit. A unit test receives a profile as input and cannot see which rows produced it.
- A **two-card combo is detected across the join** — the variant's card set intersecting the
  deck's. This is the ingest's whole purpose and it is a query, not a function.
- The **cache key carries the catalog generation**: stamping `catalog_refreshes` retires a
  cached profile. `probe:catalog-stamp` proves the stamp; this proves a profile actually
  moves with it.
- **Partial detection is reported, not silently dropped**, on a fixture holding a
  mass-land-denial card the ingest does know.

The probe builds its own fixture deck: a brew with a known card set assembled to sit at a
known bracket, mutated across the boundary within the run. A fixture that happens to hold no
Game Changer proves nothing about the Game Changer rule, so the probe **fails rather than
passes** when its fixture does not reach each rule it claims to test.

**Mutation, before any of it is believed.** At minimum: drop the `game_changer` column read;
make the combo join match on card count without the infinite check; remove the
`detection: partial` report; let `bracketDelta` return `moves` for a tutor. Each must fail
the run. Per `run the guard's failure path before trusting it` — six checks in one run once
reported clean over real drift in this repository, and the pattern that caught it was running
the failure path first.

---

## 9. What this does not answer

Stated so a reader does not mistake silence for coverage.

- **Whether the bracket is right for your table.** It is a slot against published rules, not
  a judgement. §2.3 is the eventual answer and it is comparative.
- **Two decks in the same bracket that are not close.** This is the Cruelclaw case exactly,
  and the strict slot is blind to it **by design**. It is what a later comparative read is
  for. Building it now would mean inventing the number §2.2 forbids.
- **Every mass-land-denial card.** §4.2, §6.5.
- **What a deck plays.** §5.3, #724.

---

## 10. The #10 amendment

`docs/superpowers/plans/2026-09-07-deck-tuning-suggestions.md` is merged (PR #406, 18 tasks)
and paused on timing alone. Two named amendments, made now while they are cheap:

1. **Task 7's evidence pack is assembled from the Deck Profile**, not built privately.
   The plan describes it as "a pure function turning a deck, its games, and its intent into
   the model's input" — the same object under a different name. Two deck-characterisation
   objects is a reconciliation we can see coming.
2. **The `PATTERN_MIN` game gate is removed** (§2.6). The profile alone is sufficient input;
   games enter the pack when they exist and the panel states which it had.

Both are recorded as an amendment note on the plan in this sub-project's PR. Neither
re-opens a locked #10 ruling — accept-is-apply, anything-legal-with-ownership-as-a-label,
model-proposes-code-verifies, manual generation, and the fingerprint gate all stand
unchanged, and §2.4 is a sharper statement of the same instinct.

---

## 11. The design brief

No handoff covers this surface — `design/` carries no bracket or analysis project, and the
closest neighbour is `design_handoff_the99_deck_tuning`, whose panel is #10's.

**Tier A, built here:** the ingest, the profile, the three pure verdict functions, their
tests and probes. Design cannot change whether Armageddon is mass land denial.

**Tier B, held for a READINESS verdict:** the loader payload, the route, what groups with
what, the phrasing of a verdict, where the card marks are drawn and where the push line
appears.

The brief asks Design for:

- Where a deck's bracket lives on the deck page, and its relationship to the Versions and
  Games tabs.
- How a full limits table reads without becoming a report card — three brackets, each with
  four rules and its violations. Receipts are required (§2.2); density is the risk.
- The standing card mark: Game Changer, mass land denial, extra turn, on a card row and in a
  card modal, at both widths.
- The push line at the moment of an add, and — load-bearing — **how a rule verdict and an
  unquantified fact are visually distinguishable** (§7.2). A reader who cannot tell
  *"this moves your bracket"* from *"this is your 8th tutor"* has been given a number to
  defend that nobody computed.
- How `detection: partial` is stated without either alarming or being missed (§6.5).
- The upgrade path's presentation: a consequence, not a recommendation.
- The About entry. Per the standing rule, a feature does not launch without one in the same
  round, with the `ABOUT_VERSION` bump named as a task in the plan.

---

## 12. Sub-projects that follow

Named so the profile's shape accounts for them. None is specced.

| # | Sub-project | Adds to the profile |
|---|---|---|
| 2 | Combos and near-misses (`almostIncluded`) | — reads §4.3 |
| 3 | Small swap tools: cheaper-than-$X, from-my-collection, #218, #217 | ownership, price groups |
| 4 | #10 resumed, games as enrichment | play-data group |
| 5 | Deck synopsis (the one model feature) | — reads the whole object |
| 6 | #215 alternate commander | — |
| 7 | Intake questions → deck | — |

**Pod comparison** is the strongest of the unplaced candidates and the most likely home for a
comparative read (§2.3). It is what Hugh's pod already does by hand before a session, it is
the question a bracket only approximates, and it needs no universal scale — so it is the one
future feature here that is structurally immune to the CRISPI failure. It reads the profile
and adds nothing to it. **It does not require accounts**, and the spec's position is that the
comparison and any eventual social layer are separate features, built in that order.

Also raised in intake and unplaced: **rule-0 legality reporting** (banned
cards and identity violations — `deck_cards` has no identity constraint, a hazard #215 already
flags), **salt surfacing** (`commander_support.salt_score` is stored and drawn nowhere), and
**play-data grounding** (`deck_games`, the differentiator nothing else in this space can
reach).
