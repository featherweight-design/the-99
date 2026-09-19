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

This sub-project builds the object, and proves it with **two** consumers that need no model
and no invented judgement: a **measured deck skeleton** (§4A) and **strict WotC bracket
slotting** (§6).

### 1.1 Analysis of a finished deck is the failure to avoid, not the goal

Every feature in the intake list assumes a deck that already exists. That assumption is
precisely deckcheck's limitation and the reason this app was started: *"I need help actually
building the deck in an informed way, not just help once it's complete. If I start with a bad
foundation, analysis on top of that can be flawed."*

The app today can say which cards go **with a commander**. It has no opinion about what makes
a **deck**. Three places where that shows, all verifiable:

- **The targets are flat and asserted.** `ROLE_TARGETS` (`src/lib/recs/roles.ts:4`) is
  `ramp: 10, draw: 10, removal: 8, wipes: 3`, identical for every deck, with no staples. And
  the app **does** have a land target — `landTarget()` in `src/lib/decks/deck-size.ts` returns
  **37**, or 36 with a partner — which an earlier draft of this spec wrongly claimed did not
  exist. The problem is not that it is missing; it is that **37 is flat where the measured
  spread is 30–47** (§4A.4). Najeela's decks average 34 lands and Aang's 36, and a constant is
  wrong for both in opposite directions.
- **Nothing is conditioned.** Mono-black and five-colour want different ramp and different
  fixing. The targets do not move, so "Arcane Signet is less useful in mono" has no way to be
  expressed.
- **Top-off is purely relative.** `listLastSlotsCandidates` (`src/lib/decks/last-slots.ts:44`)
  ranks `SynergyCard` — EDHREC synergy against that commander. For a commander EDHREC barely
  holds, the pool is thin and noisy **and there is no floor to fall back to**. That is a
  structural consequence, not a tuning problem.

So the profile carries a **skeleton** fact-group beside its bracket one, and both are the same
shape of statement: *here is a standard, here is where this deck sits against it, here are the
cards responsible*. Acting on the skeleton — fill, top-off and the Add panel building against
it — is **sub-project 2**, ahead of combos and the swap tools.

The motivating case is a real one. HD - Gods was built without a foundation, went through
three iterations, cost money, and has two wins against roughly six losses — and its owner is
reluctant to play it. deckcheck's own read of that deck says *Speed 3.5/10*, wins on turn
9–10, *"fast mana is limited to Sol Ring"*. Every one of those is a foundation fact, and all
of them arrived after the money was spent.

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

The slot is computed from the **stated** bracket rules only. Anything the rules leave
unquantified — how fast a deck wins, what "low quantities" of extra turns means — is printed
as an **adjacent fact with no threshold and no effect on the number**.

This is the standing convention here (#215: *"Two numbers shown side by side rather than one
weighted score — combining them means owning and defending a formula tuned blind"*; #218
reports synergy and need separately for the same reason).

**Tutors are the sharpest case, and the reason is stronger than "unquantified".** The
February 2025 beta did say *"Tutors should be sparse"* for Brackets 1–3. The
[October 21, 2025 update](https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025)
**removed tutor restrictions from the brackets entirely**, on the grounds that the original
benchmark was not clear enough and not all tutors are alike, and now relies on the Game
Changers list to catch the efficient ones. There is no tutor limit in any bracket.

So a tutor count beside a bracket verdict is not a fact the rules declined to quantify — it
is a fact the rules **deliberately stopped asking about**, and the surface must not imply
otherwise. deckcheck's payload agrees from the other side: their `bracket_limits` carry
tutors as `{"max": "unlimited", "violated": false}` in every bracket.

The count is still drawn, because it is what Max asked for (§7.2) and because a player having
a Rule 0 conversation may still care. What changes is the sentence around it.

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

### 2.4a Every threshold is measured, and its measurement is reproducible

No target, floor or staple is typed by hand. Each is derived from data already ingested, by a
committed script that can be re-run, and each is justified in the spec **against a named case
rather than an aggregate**.

This is the house method, not a new one. `gap-slot.ts` sets `THEME_FLOOR_RATIO = 0.005` and
defends it by what it does to Kenrith and to Glarb — *"The floor deletes accidents, not
states"* — having rejected 2% because it leaves a commander with 31,481 decks on file with no
theme at all. `measure-gap-line.mts` exists because a state's frequency turned out to be a
property of the account it was measured against.

`ROLE_TARGETS`' four constants and `landTarget()`'s 37 are the standing counter-examples: each
is asserted, and nothing records where any of them came from. The land target is the one this
sub-project can replace with a measurement; the other four it can only label (§4A.5).

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
- A **measured staples floor**, derived from `commander_support_cards` into one new table by
  a committed script. No new upstream.
- A **widened EDHREC parse**: the ten per-commander composition counts and the average curve
  the payload already carries and `parseEdhrecPayload` currently discards, as columns on
  `commander_support`, written by the index build's existing fetch. One run of the existing
  monthly job; no new endpoint and no additional request volume.
- An **oracle-text mass-land-denial classifier**, implementing WotC's published definition as
  a second source beside the Spellbook-derived one — measured at 91.7% recall with zero false
  positives before being specced (§4.2).
- The **Deck Profile**: a pure builder plus a cached loader, defined as a composable set of
  fact-groups.
- **`fitSkeleton`**: where a deck sits against its skeleton, a pure function over the profile.
- **`slotDeck`**: the strict WotC bracket slot, a pure function over the profile.
- **`bracketDelta`**: what a candidate card would do to a deck's slot — the push check.
- **`upgradePath`**: the minimum set of cards to remove to reach a named lower bracket.
- A design brief for the deck-analysis surface, emitted to Design.
- Unit tests, a `probe:bracket` proving the slot against a real fixture deck, and a named
  amendment to the merged #10 plan.

**Out of scope, with reasons:**

- **Any UI.** No handoff exists (`design/` carries no bracket or analysis project). §11
  covers the split: this builds Tier A facts; Tier B reads land after a READINESS verdict.
- **Acting on the skeleton.** The floor is computed here and read here. Driving `fill.ts`,
  `last-slots.ts` and the Add panel from it is **sub-project 2** — it changes shipped
  surfaces and needs a design cycle, and separating the two means the floor can be measured,
  argued with and corrected before anything is built on it. `ROLE_TARGETS` keeps its current
  callers untouched in this sub-project; §4A.6 covers what becomes of it.
- **Any language-model call.** Sub-project 5, and it reads this object.
- **Combo surfacing and near-miss recommendations.** The ingest lands here because the slot
  needs two-card-combo detection; *surfacing* combos and `almostIncluded` is sub-project 2.
- **Deck theme derivation from cards (#724).** Real, measured, and needs an EDHREC theme-page
  ingest that does not exist. §5.3 defines the slot the profile leaves for it, and why the
  profile must not hard-code commander tags as the theme source in the meantime.
- **A measured source for functional role targets** — ramp, draw, removal, wipes. No source
  available here produces them, EDHREC publishing types rather than functions. `ROLE_TARGETS`
  is still surfaced as an explicitly labelled rule of thumb (§4A.5); what is out of scope is
  pretending it was measured, and finding a source is the open question handed forward.
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
adding Farewell and Biorhythm (and explicitly *not* Lutri, the Spellchaser). **It maintains
itself through the weekly catalog refresh.** No list is transcribed into this repository, and
none should be: a transcribed list is a copy that silently goes stale, and the failure mode is
a deck slotted into a bracket it has outgrown.

**Verified rather than assumed:** `GET /cards/search?q=is:gamechanger` returns
`total_cards: 53` — exactly the official count as of the February 2026 update. Scryfall's
field is current and authoritative, so nothing here needs a second source. `pnpm
check:scryfall` gains an assertion that the field is still present on a card object; the count
itself is deliberately **not** pinned, because the list is meant to change and a test that
fails when WotC updates it would be a test that punishes the ingest for working.

EDHREC's payload also carries a per-commander `Game Changers` cardlist (present on 337 of 342
cached payloads). It is **not** used: it is EDHREC's recommendation of which Game Changers suit
that commander, not the list itself, and a bracket rule needs the authoritative membership.

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
  `last-modified` within hours. **Every field §4.3 projects was verified present on a real
  bulk record**, not inferred from the OpenAPI schema: `id`, `bracketTag`, `identity`,
  `popularity` (nullable, and null on that record), `variantCount`, `uses[].card.oracleId`,
  `requires`, `produces[].feature.name`, and `legalities.commander` as a boolean — the last of
  which is how the ingest filters to commander-legal variants rather than storing all of
  them.

**Decision: resolve everything at ingest time, never during a page render.**

A page render must not depend on a third party's uptime or a shared 80 req/min budget, and the
per-deck response is enormous — every card carries six image URLs. Both halves below therefore
run in a scheduled job and write local tables, so slotting is a SQL question. This matches how
the repo already treats Scryfall and ManaPool. Note the sweep in §4.2 *does* call their API —
at ingest, 54 times a week, not once per reader.

**The template gap, and the better path found in the second pass.** `/templates/` exposes
`scryfallQuery` for most templates but **`Mass Land Denial` (id 89) returns `null`** — the
membership is server-side and not downloadable. The first draft therefore inferred card-level
flags from the variants bulk, by finding cards in variants that `require` that template. That
is fragile and, measured, unnecessary.

**`/estimate-bracket` returns the server-side classification directly, and it batches.**
`DeckRequest.main` accepts **600 cards**, and the response carries `massLandDenial`,
`extraTurn`, `gameChanger` and `banned` per card. Measured on 2026-09-19: **600 cards in
1,146 ms**, a 161 KB response. The catalog is 31,830 commander-legal cards, so **54 requests
sweep all of it in about a minute** — comfortably inside the documented 80 req/min, and
lighter on their infrastructure than the bulk download we are already taking.

So the ingest harvests card-level flags by a **batched sweep**, and uses the bulk for what
only the bulk can answer: which combos a decklist assembles, as a local join (§4.3). Each
source is used for the thing it is actually authoritative about.

**Spellbook only knows about a quarter of the catalog, and that is what the oracle rule is
for.** Measured across a random 590-card sample plus 10 known mass-land-denial cards: **171 of
600 resolved (28.5%)**. Spellbook's card database holds cards that appear in its index, not
every card in Magic — so a sweep alone would leave roughly seven cards in ten unclassified.

**The two sources are complementary, with named cases on both sides** — which is the argument
for keeping both rather than a hedge:

| card | Spellbook sweep | oracle rule |
|---|---|---|
| `Armageddon`, `Winter Orb`, `Blood Moon`, `Stasis`, `Ruination`, `Static Orb`, `Global Ruin` | ✓ | ✓ |
| **`Cataclysm`** | ✓ | ✗ (sacrifice-clause wording) |
| **`Back to Basics`** | ✗ (not in their database) | ✓ |
| `Wave of Vitriol` | ✗ | ✗ |

**Union: 23 of 24.** Only `Wave of Vitriol` falls through both, and it is named here rather
than chased. Neither source alone reaches that: the sweep misses 2, the oracle rule misses 2,
and they are not the same 2.

**The oracle rule, and why it is not an invented threshold.** WotC publishes a definition of
mass land denial (§6.2) — *"effects that destroy, exile, or bounce other players' lands, keep
lands tapped, or change what mana they produce, affecting four or more lands per player,
without replacing them"*. That is encodable against `cards.oracle_text`, in the same shape as
`classifyRoles` and `classifyEngine`, and *"four or more lands per player"* is **WotC's
number**, quoted rather than chosen. §2.4a is satisfied here by citation rather than by
measurement, and it is the only place in this document where that is true.

**Measured before it was believed** (`scripts/measure-mld.mts`, committed, read-only): against
24 cards that unambiguously qualify, **recall 22/24 (91.7%)** with **zero false positives** on
a curated negative set (`Strip Mine`, `Path to Exile`, `Beast Within`, `Scapeshift` and eight
more), flagging **51 of 31,830** commander-legal cards.

Its first version scored 66.7%, and the difference is a trap worth recording: every miss was a
*wording variant of a clause already in the definition* — the Orb/Stasis family says "keep
lands tapped" three different ways. The fix was to implement the remaining clauses, **not** to
add patterns until the fixture passed. Tuning a classifier against its own test set produces a
number that means nothing.

**Every flag carries its source** (`spellbook_sweep` | `oracle_rule`), so a reader disputing a
verdict is owed which classifier made the claim, and a later third source slots in without any
reader changing.

**And 23/24 is what makes §6.5's warning writable.** A verdict whose detection is 40% complete
needs a prominent caution; one at 23/24 with two independent sources needs a quiet footnote.
Design cannot choose between those without the number, which is why it was measured before the
plan rather than during the build.

**Where the honest answer is "unknown".** Even unioned, a deck may hold a mass-land-denial
card neither source knows — `Wave of Vitriol` is the measured example. The slot therefore
reports, beside its verdict, that detection is **sourced and partial**, not a silent claim of
completeness (§6.5). At a measured union of 23/24 that is a footnote rather than a caution.

**EDHREC cannot substitute for Spellbook here, and this was checked.** The payload carries
`panels.combocounts`, which looked like a free combo source. Measured across all 342 cached
payloads: present on 334, **average length 4.0, maximum 4**. It is a fixed four-item teaser
for the commander's page, not a decklist-aware combo set, and it names combos by string rather
than by oracle id. It is unusable for a bracket rule.

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
  source            text not null           -- 'spellbook_sweep' | 'oracle_rule' (§4.2)
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

`pnpm db:seed:combos` does two things, for the two questions §4.2 separates.

**The sweep** — 54 batched `POST /estimate-bracket` calls of 600 cards each, harvesting
card-level `massLandDenial` / `extraTurn` / `banned` into `card_bracket_flags`. About a minute,
well inside 80 req/min, and it runs **before** the bulk so a bulk failure does not cost the
card flags too.

**The bulk** — streamed the way `streamBulkEntries` already streams Scryfall's. Projected to the fields above — the 656 MB is almost entirely image URLs we
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

Five assertions, and the last two are the ones that earn it:

1. The bulk index is reachable and `last-modified` is within 8 days.
2. The first bulk entry carries every field §4.3 projects.
3. **The sweep's response shape holds**: a small `POST /estimate-bracket` still returns a
   `cards` array whose entries carry `massLandDenial`, `extraTurn`, `gameChanger` and `banned`.
   The sweep is now a first-class source (§4.2) and an upstream rename there would silently
   zero every card flag — the same class of failure as a missing bulk field, and it needs the
   same daily canary.
4. `BracketTagEnum` still has the seven members the check constraint encodes — an added tag
   would otherwise fail every insert after the next upstream release.
5. **The named anchors still classify** — `Armageddon`, `Ravages of War`, `Jokulhaups`,
   `Time Warp`, `Temporal Manipulation`, asserted through a live sweep call. This catches a
   drift that keeps the counts healthy while the classification quietly changes meaning.

   **The other half of the ruling lives in the ingest, not here.** A *derived floor* — the run
   classifies at least N cards as mass land denial and M as extra-turn, N and M taken from the
   first clean run and committed — catches a collapse the anchors cannot: an upstream
   restructure that leaves the classifier matching almost nothing while the five anchors happen
   to survive. That check reads the run's own output, so it belongs to the job and **refuses to
   publish** below the floor, exactly as the printings ingest refuses to publish denominators
   from a run that skipped orphans. It cannot live in this contract check, which touches no
   database.

   **The tension with §4.1 is real and the distinction is deliberate.** §4.1 forbids
   transcribing the Game Changers list because it is consumed as *data*, and a transcribed
   copy of live data goes stale silently. These five cards are a **test fixture**: they are
   asserted, never read. One of them ceasing to classify is a signal to investigate rather
   than a stale copy to refresh — and if a card legitimately leaves the index, the check
   failing is the correct outcome, not a false alarm.

Per `run the guard's failure path before trusting it`, each of the five is run against a
mutated fixture before the check is believed.

---

## 4A. The measured skeleton

Everything in this section is measured. `scripts/measure-staples.mts` (read-only, committed)
produced every figure below against the catalog, and can be re-run.

### 4A.1 What a staple is, measured rather than asserted

`commander_support_cards.inclusion` is a card's inclusion rate **under one commander**, on a
0–100 scale. Held across 3,279 commanders and 859,794 support rows covering 25,763 distinct
cards, it answers a second question the app has never asked.

The spec's first draft said: *a card with high inclusion across nearly every commander is a
format staple.* The measurement says that is **half right, and the missing half is what makes
the cut defensible.**

**Breadth separates cleanly.** Of 25,763 cards, only **14** are recommended for 2,000+
commanders, 48 for 1,000–1,999 and 160 for 500–999 — then it balloons to 7,485 at 10–49 and
10,976 at 2–9. There is a real knee and the head is tiny.

**But average inclusion is flat across every breadth band** (19–33%), so breadth alone admits
cards nobody actually plays:

| card | commanders (of 3,279) | avg inclusion |
|---|---|---|
| Sol Ring | 3,266 | **77.0%** |
| Arcane Signet | 3,247 | 62.1% |
| Command Tower | 2,299 | 64.3% |
| **Temple of the False God** | **2,296** | **12.2%** |
| Ancient Tomb | 1,747 | 11.3% |

**Temple of the False God is the named case this cut is defended against.** It is recommended
for 2,296 commanders and played in 12.2% of their decks. A breadth-only floor puts it beside
Sol Ring and tells a new player to run it. A staple is therefore **breadth AND inclusion** —
recommended almost everywhere *and* actually played when it is.

**The cut, ratified 2026-09-19 against the derivation's own output:**

> A card is in the floor for a condition when it is recommended for **at least 50% of that
> condition's commanders** and played, on average, in **at least 25% of their decks**. Basic
> lands are excluded outright. A condition needs **at least 100 commanders** to carry a floor
> of its own.

What that admits for a mono-coloured commander — 11 cards, and the shape of the list is the
argument for the line:

```
Sol Ring 75.6% · Arcane Signet 53.4% · Swiftfoot Boots 31.9% · Mind Stone 31.1%
Rogue's Passage 29.9% · Solemn Simulacrum 29.6% · Reliquary Tower 29.6%
Myriad Landscape 26.9% · Lightning Greaves 25.3% · Thought Vessel 25.3% · War Room 25.1%
```

**Command Tower is correctly absent from that list** (10.4% in mono, §4A.3), which is the
conditioning doing exactly the job it was added for. `Temple of the False God` sits at 12.2%
and is excluded with room to spare. Sizes elsewhere: two-colour 7, three-colour 22,
five-colour 28.

**The 100-commander floor exists because two conditions produce garbage without it.**
Colourless has 46 commanders and four-colour has 16, and at those sample sizes "recommended
for half of them" is a meaningless bar — they yield **105 and 51 cards** respectively, longer
than the mono floor by an order of magnitude. Both fall back to the nearest populated
condition and the fit reports that it did (§6A's `basis`). Sixty-two commanders are affected
in total.

**Two design findings the curve exposed, both of which change the table rather than tune it:**

1. **There is no `all` condition, and there must not be.** Computed across every commander,
   `Swords to Plowshares` reads **35.8%** breadth and looks marginal. It is not — it is a
   60.8% staple that only appears for white commanders. A global floor systematically demotes
   every colour-specific staple, so the floor is computed **per condition only**.
2. **Basic lands are excluded by type, not by threshold.** `Plains` and `Mountain` top the
   inclusion ranking at **95%**, which is an artifact of appearing only for their own colour.
   They would be nonsense in a staples list, and §4A.4's `basic` / `nonbasic` counts already
   answer the question they appear to answer.

The floor is derived from the **corpus**, never from the commander's own page, which is why it
still serves a commander with 40 decks on EDHREC. Those thin-data commanders are the
population it serves most, and `commander_support.deck_count` identifies them.

**The honest limit:** EDHREC inclusion is what people *play*, not what is optimal. For a floor
that is the right signal — it is the format's own consensus, and consensus is what a player
building a first deck lacks. It is **not** a licence to blend it into a score; §2.2 stands.

### 4A.2 Weighting is not a complication; it changes the answer

The floor is weighted by `commander_support.deck_count`, so a commander with 31,481 decks on
file outvotes one with 40. That was specced as a precaution. Measured, it **moves 17 of the
top 25 by three or more places**, and in the direction that argues for it:

- promoted: **Command Tower 11 → 6**, **Exotic Orchard 18 → 9**, Fellwar Stone 9 → 7
- demoted: **War Room 20 → 113**, **Nykthos 23 → 143**, Wayfarer's Bauble 15 → 40

Unweighted, the long tail of barely-played commanders outvotes the format.

### 4A.3 Colour count is a real conditioning axis

*"Most decks want an Arcane Signet, but it is less helpful in mono-coloured decks"* is a
number, not an opinion. The effects are large and they are not all the same shape:

| card | 1 colour | 2 | 3 | 5 |
|---|---|---|---|---|
| **Command Tower** | **10.4%** | **80.6%** | 88.6% | 87.2% |
| Arcane Signet | 53.4% | 69.2% | 75.2% | 73.7% |
| Exotic Orchard | 16.1% | 25.2% | 53.1% | 63.5% |
| Chromatic Lantern | 12.4% | 8.4% | 11.4% | 50.1% |
| Swiftfoot Boots | 31.9% | 27.8% | 26.2% | **13.6%** |
| Sol Ring | 75.6% | 76.8% | 81.2% | 75.0% |

Command Tower's **70-point cliff** between one colour and two is the case that justifies the
axis. Swiftfoot Boots runs the *other* way, so the conditioning is a gradient per card and not
a single "multicolour bonus". Sol Ring is flat at 75–90% everywhere and is genuinely
unconditional — which is what a floor entry should look like.

**Conditioning is not polish here; the floor is wrong without it.** §4A.1's first finding is
the proof: a colour-specific staple is invisible to a global computation. So there is no
unconditioned floor to fall back to, and the condition is always part of the answer.

The derivation prints the gap per condition so the cut is made against figures, and this spec
records the line it produced — the same way `gap-slot.ts` records that 2% and 1% were tried
before 0.5%.

### 4A.4 Role targets do NOT come from this table — they come from a parse we already discard

The first draft claimed ramp/draw/removal/wipes **and the land count** could be sourced from
`commander_support_cards`. **That is false and the measurement killed it.**

There are no decklists in that table. A target could only emerge as an expected count —
Σ(inclusion)/100 per bucket — and measured, that yields:

```
creature 16.2 · nonbasic land 10.7 · artifact 9.1 · instant 7.7
sorcery 5.8 · enchantment 5.2 · basic land 1.6 · other 0.6
TOTAL 56.9          (a real deck is 99 + commander)
```

It accounts for **57 of 99 cards**, and is worst exactly where the land count lives: **1.6
expected basic lands**, from only 6 distinct basics in the entire table, against a real deck's
8–25. The average support list is 262 cards — a recommendation set, not a deck.

**The data is already on disk.** `edhrec_cache.payload` — the raw response the app already
fetches and stores — carries, at top level, per commander:

```
land  basic  nonbasic  creature  instant  sorcery  artifact  enchantment  planeswalker  battle
```

plus `panels.mana_curve` (counts per mana value) and `panels.piechart`. `parseEdhrecPayload`
(`src/lib/edhrec/parse.ts:55`) reads `cardlists`, `taglinks`, `bracket_counts`,
`budget_counts`, `similar` and three `card.*` fields, and **discards every one of these.**

Measured over all 342 cached payloads:

- every field present on **342 / 342**; `panels.mana_curve` on **342 / 342**
- the type counts sum to **exactly 99 on every row** — min 99, max 99, no exceptions
- land averages **35.3**, range **30–47**

That last invariant is the reason to trust it: EDHREC is publishing a real average deck, not a
loose statistic.

**The sample was tested for bias rather than assumed representative.** `edhrec_cache` holds
whatever commanders someone has viewed, which is not random. Measured: the 302 cached
commanders that are also indexed average **3,853** decks on file against **2,687** for the
2,977 uncached — about 43% more popular. But both groups span effectively the whole range
(cached 2–50,337, uncached 1–52,883), so the sums-to-99 invariant is not an artifact of
looking only at well-played commanders. It is a mild skew, stated rather than glossed, and the
index re-run removes it entirely by covering all 3,279.

And it is **per commander**, which is strictly better than the colour-bucket conditioning
§4A.3 describes. Najeela (5 colours) runs 34 lands as **9 basic / 25 nonbasic**; Aang
(mono-white) runs 36 as **29 / 7**. That is the mana-base difference measured directly.
Colour-count conditioning becomes the **fallback** for a commander with no payload.

**The cost, stated plainly.** `edhrec_cache` holds **342 of 3,279** commanders, because it is a
demand cache with a 30-day TTL populated when someone views a commander — not by the index
build. `db:build:index` already fetches all 3,279 of these pages monthly and parses them; it
simply does not keep these fields. So the work is: widen `parseEdhrecPayload`, carry the
fields through `SupportHeader` (`src/lib/edhrec/index-build.ts:9`), add columns, and **run the
existing monthly job once**. No new upstream, no new endpoint, and **no additional request
volume** — which matters, because that job is already `max-parallel: 1` under a workflow-wide
concurrency group precisely so EDHREC never sees a second request stream from us.

This is what #215's own note anticipated as "EDHREC parser widening".

### 4A.5 What is still unsourced, and is not pretended otherwise

EDHREC publishes **types**, not **functions**. So `land`, `creature`, `instant` and the curve
are measured, and **ramp / draw / removal / wipes are not** — nothing in any source available
here says how many ramp pieces an average deck runs.

**They are still surfaced, as an explicitly labelled rule of thumb** — ruled 2026-09-19. A
player building a first deck is badly served by silence on removal, and the alternative to a
labelled heuristic is not a better number, it is no signal at all.

The label is load-bearing and is not a footnote. A functional target must be **visibly a
different kind of claim** from the land count wherever both appear: one is *what decks for
this commander actually run*, the other is *a community rule of thumb this app did not
measure*. `fitSkeleton` enforces that structurally by carrying **no functional roles at all**
(§6A) — a surface that wants them reads `ROLE_TARGETS` directly and must say where they came
from, rather than receiving them in the same shape as a measured figure.

**This is not a CRISPI and the difference is worth stating.** §2.2 forbids a single blended
number presented as a verdict. A rule of thumb makes no claim to precision, resolves to no
score, and nobody carries it to a table as a ruling — the failure mode CRISPI had was that a
figure *looked* authoritative. The rule here is the same one §2.2 actually encodes: say where
a number came from, and never let an unsourced one borrow a sourced one's credibility.

This remains a real gap, named rather than filled, and it is the open question this
sub-project hands forward. It is survivable because **the land count is the number that
mattered most and it is now in hand** — the motivating deck's fault was a mana base, not a
ramp count.

### 4A.6 What the measured targets actually touch

Two drafts got this wrong in opposite directions, so it is settled here by reading the
consumers rather than by inference.

The first draft said sub-project 2 "retires `ROLE_TARGETS`". The second, having counted eight
non-test consumers including `src/lib/recs/score.ts`, said the migration reaches
`commander_scores` and is therefore a rescore. **Both are wrong, and the reason is the same
one §4A.5 already established.**

`ROLE_TARGETS` holds **only the four functional roles** — ramp, draw, removal, wipes — and
`computeFit` (`score.ts:167`) folds exactly those into the commander score. It excludes lands
explicitly (`if (role !== "land")`, `score.ts:329`) and never reads `landTarget`.

**Those four roles are precisely the four this sub-project cannot measure.** So the measured
data — the land count and the type composition — has **no overlap at all** with what the
scoring engine reads. The migration cannot reach `commander_scores`, by construction rather
than by choice.

What the measured land target actually touches, in full:

| file | call sites |
|---|---|
| `src/lib/decks/deck-size.ts` | `landTarget()` itself |
| `src/lib/decks/fill.ts` | 2 — the plan's ceiling and the land ceiling |
| `src/lib/decks/suggest.ts` | 3 — and it re-exports `landTarget` |

Three files, all in the deck-building path. The scoring engine, `role-chips.tsx` and
`coverage-section.tsx` keep flat targets because they read the unmeasurable four, and there is
a principled reason they should anyway: a **ranking** wants one yardstick across commanders,
where a **deck reading** wants accuracy for one.

**This sub-project still retires nothing.** `fitSkeleton` reads the measured targets alone and
touches none of the files above. Sub-project 2 owns the migration, and it is a deck-surface
change of three files rather than the rescore the previous draft feared.

Recorded so it cannot be quietly skipped: a measured target beside an asserted constant is two
sources of truth, and here the line between them is principled — measurable versus not — which
is why both may legitimately stand.

### 4A.7 Tables

```
format_staples
  oracle_id          uuid not null references cards(oracle_id)
  condition          text not null      -- 'colors:1' .. 'colors:5'. There is no 'all'.
  commanders         integer not null   -- how many commanders recommend it, in this condition
  commander_total    integer not null   -- the denominator, never inferred
  avg_inclusion      real not null      -- 0-100, the second axis (§4A.1)
  weighted_rank      integer not null   -- deck_count-weighted (§4A.2)
  primary key (oracle_id, condition)
```

**`condition` is the one vocabulary**, and `fitSkeleton`'s `basis` (§6A) reports *how* a
condition was arrived at — the commander's own payload, the colour fallback, or nothing. Two
words for two genuinely different things: `condition` names a bucket, `basis` names the
strength of the claim behind it. A row here always carries a `condition`; a fit always carries
both.

Only conditions with **at least 100 commanders** are written (§4A.1). `colors:0` (46
commanders) and `colors:4` (16) are therefore absent from this table by construction rather
than filtered at read time — an empty floor and a floor that was never computed are different
facts, and the reader is owed the second one.

Basic lands never appear: excluded by type at derivation (§4A.1), not by threshold.

Composition targets are columns on `commander_support`, not a new table: they are one row per
commander, written by the job that already writes that row, and a second table would be a join
for no reason.

```
commander_support  (added)
  avg_land, avg_basic, avg_nonbasic, avg_creature, avg_instant,
  avg_sorcery, avg_artifact, avg_enchantment, avg_planeswalker, avg_battle  integer
  avg_curve         jsonb            -- panels.mana_curve, counts per mana value
```

Nullable, every one of them: a commander whose payload predates the widening has no
composition, and **null reads as absent** where a zero would read as "this deck runs no
lands". The reader falls back to the colour condition and reports `basis: "colors"`; where
that condition is also absent (§4A.1's thin cases, after their own fallback) it reports
`basis: "none"` and no target at all.

Every figure carries its denominator, per the presentation rules inherited from #9. A figure
without one is an assertion the reader cannot check, which is §2.2 again.

### 4A.8 `pnpm db:build:staples`

Derives `format_staples` from `commander_support_cards`. Read-only against its inputs, runs
after `Commander index` in the same chain and for the same reason `Commander prose` does: its
inputs are the rows that job writes.

The composition columns need no separate job — they are written by the index build itself,
during the fetch it already performs.

**That has a scheduling consequence worth stating.** `Commander index` is monthly, on the 3rd,
so the composition columns are empty until an index run completes after the widening merges.
The feature does not break in the meantime — `basis` reports `"colors"` and the fit falls back
(§6A) — but the per-commander half is absent until then, and a plan that assumes otherwise
would have the surface reviewed against data that is not there. Dispatch the job manually once
the widening lands rather than waiting for the cron.

It prints its full derivation: the breadth distribution, the two-axis cut and what it includes
and excludes either side of it, the weighted-versus-unweighted delta, and the per-condition
gaps. That output is the argument, and it exists so the numbers can be disputed **before**
sub-project 2 builds anything on them. This is `measure-gap-line.mts`'s role.


## 5. The Deck Profile

### 5.1 Shape

```ts
export type DeckProfile = {
  deckId: string;
  /** Fingerprint of the inputs — decklist, commanders, catalog generation, builder version. */
  fingerprint: string;
  counts: ProfileCounts;       // total, nonland, land, basics
  roles: ProfileRoles;         // classifyRoles tallies, and the cards behind each
  curve: ManaCurve;            // manaCurve(), commanders folded in
  colours: ProfileColours;     // identity, producibleColors, and their disagreement
  skeleton: ProfileSkeleton;   // §4A — measured targets and staples, and what the deck holds
  brackets: ProfileBrackets;   // §5.2 — the fact-group the slot reads
  themes: ProfileThemes | null; // §5.3 — null today, deliberately
};
```

```ts
/**
 * The measured standard this deck is read against — the stored figures only, never a
 * comparison. `fitSkeleton` (§6A) does the comparing, so the same group serves a reader who
 * wants the raw targets and one who wants the gap.
 */
type ProfileSkeleton = {
  /** Per-commander composition, from the widened parse. Null where the payload predates it. */
  composition: CompositionTargets | null;   // §4A.4
  /** panels.mana_curve for this commander, counts per mana value. Null on the same terms. */
  averageCurve: Record<string, number> | null;
  /** The colour-count fallback, always present: `colors:1` … `colors:5`. */
  condition: string;                        // §4A.3
  staples: StapleRef[];                     // the floor for that condition, §4A.7
  commanderDeckCount: number | null;        // the denominator behind all of it
};
```

**Composable fact-groups, from the start.** Ownership, price and play-data groups are added
by later sub-projects as sibling keys. Nothing about the loader, the fingerprint or the cache
key changes when they arrive — that is the point of the shape, and it is why milestone 1
computes only what its own consumers read rather than everything the suite will eventually
want.

**`skeleton` and `roles` are deliberately not merged.** `roles` is what this deck *contains*,
classified by `classifyRoles`; `skeleton` is what the format *does*, measured. One is a fact
about the reader's cards and the other a fact about everyone else's, and a single "roles with
targets" group would put a measured land count and an asserted ramp constant (§4A.5) in the
same shape and make them look equally sourced.

### 5.2 `ProfileBrackets`

```ts
type ProfileBrackets = {
  gameChangers: CardRef[];           // names + oracle ids, for receipts
  massLandDenial: CardRef[];
  extraTurns: CardRef[];
  twoCardCombos: ComboRef[];         // card pairs, with the variant id
  banned: CardRef[];
  tutors: CardRef[];                 // reported, never weighted — §2.1
  population: BracketPopulation | null;  // §6.3a — what other players declared, with its denominator
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

Each `CardRef` on a flagged list carries its **source** (`spellbook_sweep` | `oracle_rule`,
§4.2), because a reader disputing a verdict is owed which classifier made the claim.

**What counts as a two-card infinite combo.** Card count alone is not the test: a two-card
variant producing "two 1/1 tokens" is a synergy, and slotting a deck to Bracket 4 over one
would be a wrong verdict of exactly the kind §2.2 says lands on the table.

The test is `card_count = 2` **and** a `produces` feature that is unbounded or game-ending.
Spellbook's feature names carry that directly — sampled from `/variants/?q=cards=2` on
2026-09-19:

| variant | `bracketTag` | `produces` |
|---|---|---|
| Demonic Consultation + Thassa's Oracle | R | `Exile your library`, **`Win the game`** |
| Sanguine Bond + Exquisite Blood | S | **`Infinite lifegain`**, `Infinite lifeloss` |
| Dramatic Reversal + Isochron Scepter | S | **`Infinite mana …`**, `Infinite storm count` |

So the rule is a **feature-name classifier** over `produces` — the `Infinite …` family plus the
game-ending names — generated from the bulk's own vocabulary and regenerated by each ingest,
the way `tag-kinds.generated.ts` already handles EDHREC's tags. Its size is logged, so a
vocabulary change upstream is visible rather than silent, and the generated list is committed
so a change to it shows up in a diff.

**`bracketTag` is deliberately NOT the rule, and this was the tempting mistake.** Every variant
carries one (`R`/`S`/`P`/`O`/`C`/`E`/`B` — Ruthless, Spicy, Powerful, Oddball, Core,
Exhibition, Banned), and the vocabulary deliberately echoes WotC's bracket names, which makes
it look like the answer. It is not: it is **Spellbook's judgement about which table a combo
suits**, and the WotC rule asks a different question — whether the deck assembles an
intentional two-card infinite combo at all. Sampled, the two disagree freely: of 40 two-card
variants, 26 are `S`, 7 `R`, 2 `P`, 2 `O`, 2 `E`, 1 `C`, while `Sanguine Bond + Exquisite
Blood` is plainly infinite at `S` and plainly infinite at `R` for
`Demonic Consultation + Thassa's Oracle`.

**The decisive case, from the bulk's own first record:** `Gilder Bairn + Agatha's Soul
Cauldron + Bloom Tender` produces `Infinite mana of colors among permanents you control` and
`Infinite proliferate`, and carries **`bracketTag: "E"` — Exhibition**, Spellbook's gentlest
tag. An unambiguously infinite combo rated as belonging at the most casual table. Whatever
`bracketTag` measures it is not whether a combo is infinite, and a rule built on it would have
read that variant as harmless.

**The feature path is `produces[].feature.name`**, verified against the bulk rather than the
API schema — the ingest reads the bulk, so that is what had to be checked.

Letting `bracketTag` decide would import a third party's bracket opinion into a verdict the
reader will take to a table as WotC's — §2.2's failure with someone else's number in it. It is
**stored and reported** beside each combo, because a reader deciding whether a combo is "early
game" (§6.3) is better off knowing Spellbook rates it Ruthless. It never moves the slot.

Every list carries **card references, never counts alone**. A count with no cards is an
assertion the reader cannot check, and the whole lesson of §2.2 is that receipts are what
survive.

`tutors` is classified from oracle text and carries no threshold anywhere in this
sub-project — **and no bracket rule reads it at all**, because WotC removed tutor restrictions
in October 2025 (§2.1). It is in the profile because Max's question — *does one more tutor
move me?* — deserves the honest answer rather than silence, and because a Rule 0 conversation
may still want the count. It is a deck fact that no longer has a rule attached, which is a
thing §7.2 has to say out loud rather than imply by placement.

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

`loadDeckProfile(deckId, userId)` gathers the rows and calls it, behind
`cacheForUser(userId, ["deck-profile", deckId, fingerprint], load)` — the signature verified at
`src/lib/cache/user-lists.ts:64` rather than assumed.

Three of its constraints bear on this payload, and the first corrects an earlier draft:

- **`cacheForUser` already injects the catalog generation into the key itself.** The
  fingerprint must *not* repeat it — that would be an input filed twice, and the mechanism
  #705 established is already doing the work.
- **The entry is stored as JSON under a 2 MB ceiling.** An entry over it is refused with a
  warning and never stored, so the loader runs on every request *and* pays to serialise first
  — slower than not caching. The profile is small by nature, but `ProfileBrackets` carries
  card lists for receipts and `staples` carries a floor, so the plan measures the serialised
  size rather than assuming it.
- **No `Map` and no `Date` survive the round trip** — a `Map` comes back `{}`. Every field in
  §5.1 is already a plain object, array or scalar, and must stay that way.

One consequence worth naming: `revalidateUserLists(userId)` drops **every** cached list
payload for that reader, so a collection change retires deck profiles too. That is correct —
ownership feeds later fact-groups — but it means the profile is invalidated more often than
its own inputs strictly require, and a future sub-project adding an expensive group should
know that before it leans on the cache.

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

### 6.2 The stated rules, verbatim

Transcribed from
[Introducing Commander Brackets Beta](https://magic.wizards.com/en/news/announcements/introducing-commander-brackets-beta)
as amended by the
[October 21, 2025 update](https://magic.wizards.com/en/news/announcements/commander-brackets-beta-update-october-21-2025).
The quoted text is the rule; the table is our reading of it.

> **B1 Exhibition** — "No cards from the Game Changers list. No intentional two-card infinite
> combos, mass land denial, or extra-turn cards."
>
> **B2 Core** — "No cards from the Game Changers list. No intentional two-card infinite combos
> or mass land denial. Extra-turn cards should only appear in low quantities and are not
> intended to be chained in succession or looped."
>
> **B3 Upgraded** — "Up to three cards from the Game Changers list. No intentional early-game
> two-card infinite combos. Extra-turn cards should only appear in low quantities and are not
> intended to be chained in succession or looped. No mass land denial."
>
> **B4 Optimized / B5 cEDH** — "There are no restrictions (other than the banned list)."

Each original definition also carried *"Tutors should be sparse"* at B1–B3. **That clause is
gone** — removed outright in October 2025 (§2.1). It is quoted here only because every
third-party summary written before that date still carries it, and a reader checking our rules
against one of those needs to know which of us is stale.

| | B1 Exhibition | B2 Core | B3 Upgraded | B4 / B5 |
|---|---|---|---|---|
| Game Changers | 0 | 0 | ≤ 3 | unlimited |
| Mass land denial | none | none | none | allowed |
| Extra-turn cards | **none at all** | low quantities; not chained or looped | low quantities; not chained or looped | allowed |
| Two-card infinite combos | none intentional | none intentional | **early-game** none | allowed |
| Tutors | no rule in any bracket | | | |

**Mass land denial has an official definition, and it is encodable:** *"effects that destroy,
exile, or bounce other players' lands, keep lands tapped, or change what mana they produce,
affecting four or more lands per player, without replacing them."* Armageddon qualifies; Strip
Mine does not. §4.2's detection is partial against **that** definition, and the spec says so
rather than leaving the target unstated.

Expected game length (9+ / 8+ / 6+ / 4+ turns) is **not** computed. It is an outcome, not a
deck property, and any estimate would be an invented weight wearing a turn number.

### 6.3 Three judgement calls, made explicit

Places where the rules are looser than an implementation must be. Recorded so a later
disagreement is a decision to revisit rather than a bug to hunt.

**Extra turns at B1 are a count; at B2/B3 they are not.** B1 forbids extra-turn cards outright,
so there the rule is literal and a single `Time Warp` violates it. B2 and B3 say *"low
quantities… not chained in succession or looped"*, which is two conditions and only one of them
is countable. The slot therefore:

- **counts** at B1 — any extra-turn card is a violation, stated as the rule states it;
- at B2/B3 flags **only** a demonstrable chain or loop (an extra-turn card that recurs itself,
  or an untap loop present as a combo), and reports the bare count under `unquantified` with
  no verdict attached.

deckcheck reads *"low quantities"* as **max 3** and enforces it; that is a defensible reading
and it is not ours, because a number WotC did not write is a number we would have to defend.
WotC's own gloss is *"a Time Warp or two is fine"* — which is guidance, not a threshold.

**"Early-game" has an official gloss but is still not computable.** B3 forbids early two-card
infinite combos; WotC's guidance is that **turn-six-or-later closers are acceptable**. Nothing
in a decklist says which turn a combo lands, so the slot treats **any** two-card infinite combo
as permitted at B3 and forbidden at B1/B2, and prints the combo with its pieces so the reader
can judge. The turn-six gloss is quoted to the reader rather than encoded — it is WotC's
number, and applying it would require a turn estimate that is itself invented.

**"Intentional" is not inferable, and is deliberately ignored.** Every combo clause says
*intentional*. Whether a player meant to include a combo is a fact about them, not the deck, so
the slot reads every assembled two-card infinite as present and says which cards form it. The
reader is the only one who can answer the other half, and the verdict must not appear to have.


### 6.3a The population baseline we already hold

`commander_support.bracket_counts` is already ingested and drawn nowhere. It is **EDHREC's
distribution of self-declared brackets for decks with that commander** — present on **3,252 of
3,279** rows:

```
The Ur-Dragon   {"1":144, "2":2929, "3":5055, "4":3542, "5":178}
Edgar Markov    {"1":92,  "2":3524, "3":5371, "4":4004, "5":173}
```

Averaged per commander: B1 15, B2 274, B3 251, B4 117, B5 52 — B2 and B3 dominate, which is
what the format says about itself.

**It costs nothing and it answers the question the slot cannot.** A verdict of "Bracket 3" is
a fact about the deck; *"Bracket 3 — where 5,055 of the 11,848 Ur-Dragon decks that declared
one also sit"* is the Rule 0 conversation. It is added to `ProfileBrackets` as `population`
and reported beside the verdict.

**Three rules on it, because it is easy to misuse.**

- It is **self-declared by other players**, so it is a fact about the population and never an
  input to the slot. Feeding it in would make our verdict a popularity reading — §2.2 with a
  crowd instead of a formula.
- **Only 22.4% of decks declare a bracket**, measured. The counts therefore sum to about a
  fifth of `deck_count`, and the surface carries that denominator explicitly, per the #9 rule.
  A reader shown "5,055 decks" who believes it is out of 50,478 has been misled by us.
- The **27 commanders with no counts** report absent, not zero.

**And a trap found next door, recorded so nothing ever reads it.** `budget_counts`, ingested
alongside, looks like sibling data and is not: `budget` equals `expensive` on **3,138 of 3,252
rows**, and both are `deck_count / 10`. It is a fixed decile split carrying no information
beyond the deck count itself. Any figure derived from it would be noise wearing a label.

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

## 6A. `fitSkeleton(profile): SkeletonFit` — pure

```ts
type SkeletonFit = {
  /** Where each target came from, per §4A.4's fallback chain. */
  basis: "commander" | "colors" | "none";
  types: TypeFit[];                   // land, creature, instant … : have, target, delta
  curve: CurveFit | null;             // the deck's curve against the commander's average
  missingStaples: StapleRef[];        // floor cards absent, with measured rate + denominator
  presentStaples: StapleRef[];
  coverage: { commanderDeckCount: number | null; thin: boolean };
};
```

**`basis` is not decoration.** A composition target is per-commander where the payload exists,
the colour-count condition where it does not, and absent for a commander with neither — three
materially different claims, and a fit that presented them identically would be asserting a
precision it does not have. The surface prints which.

**Functional roles are absent from this type, deliberately.** There is no `roles` field,
because §4A.5 has no measured target to put in one. `ROLE_TARGETS` is not read here; a fit
that mixed measured type targets with asserted functional ones would launder the second
through the credibility of the first.

`coverage.thin` is the other load-bearing field. A commander EDHREC barely holds is the case
where the floor matters most **and** where the synergy pool is least trustworthy, so the fit
says which situation the reader is in rather than presenting both alike.

`missingStaples` carries the measured rate and denominator with each card, never a bare
recommendation. *"Sol Ring — recommended for 3,266 of 3,279 commanders, played in 77% of their
decks"* is checkable. *"You should run Sol Ring"* is not.

`curve` compares the deck's `manaCurve()` against `panels.mana_curve` and reports the
difference per mana value. It is a **comparison, not a verdict** — no bracket rule and no
target is derived from it, and a deck being two cards heavy at three mana is a fact the reader
does something with, not a failure the app names.

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

The answer has **four shapes that must never be blurred**:

```ts
type BracketDelta =
  | { kind: "moves";     from: Bracket; to: Bracket; rule: Violation }
  | { kind: "counts";    rule: "gameChangers"; now: number; limit: number; to: Bracket }
  | { kind: "unquantified"; rule: "extraTurns"; now: number; bracket: Bracket }
  | { kind: "ruleless";  fact: "tutors"; now: number }
  | { kind: "none" };
```

- *Armageddon — mass land denial. This moves you out of Bracket 3.* A **rule**.
- *Your 4th Game Changer. Bracket 3 allows 3, so this moves you to Bracket 4.* A **rule with
  a count**.
- *Your 3rd extra-turn card. Bracket 3 asks for "low quantities" and does not say how many, so
  this does not move your bracket — chaining or looping them would.* A rule that exists but
  **declines to count**. (At Bracket 1 the same card is a `moves`: B1 forbids extra-turn cards
  outright.)
- *Your 8th tutor. No bracket rule counts tutors — Wizards removed tutor restrictions in
  October 2025 and relies on the Game Changers list instead.* A fact with **no rule at all**.

The last two are separate variants rather than one "fact" case because they are different
claims. `unquantified` says *the rules care and will not say how much*; `ruleless` says *the
rules used to ask and stopped*. Collapsing them would reintroduce the stale "few tutors"
reading this spec had in its first draft (§2.1), and a reader acting on it would cut tutors to
move a bracket that was never going to move.

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

**Unit.** `buildDeckProfile`, `fitSkeleton`, `slotDeck`, `bracketDelta` and `upgradePath` are
pure.

For the skeleton: a thin-data commander sets `coverage.thin` and still gets a full floor; a
missing staple carries its rate **and** its denominator; a commander with composition columns
reports `basis: "commander"` and one without falls back to `basis: "colors"` with a
colour-conditioned target; a commander with neither reports `basis: "none"` and **no target at
all** rather than a zero.

For the slot, cases per bracket boundary and per rule, and specifically:

- exactly 3 Game Changers (B3, clean) against 4 (B4, `Underworld Breach` named as the excess —
  the case in the supplied deckcheck payload)
- **one extra-turn card at B1 is a violation; the same card at B2 is not** — §6.3's split, and
  the case that a single shared "extra turns" rule would get wrong at one end or the other
- a two-card infinite combo permitted at B3 and forbidden at B2
- a mass-land-denial card from each source (`spellbook_sweep`, `oracle_rule`), both reported,
  both carrying provenance, with `detection` still `"partial"`
- **a tutor returns `ruleless`, never `unquantified` or `moves`** — three variants that read
  alike in prose and mean different things (§7.2)

For the parse: `parseEdhrecPayload` over a fixture payload yields all ten composition counts
and the curve, and a payload missing them yields nulls rather than zeros.

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
- **The skeleton read joins correctly and picks the right condition.** A mono commander must
  resolve `colors:1` and a Jeskai one `colors:3`, and a staple absent from the deck must
  appear in `missingStaples` with the denominator the table stored — not a recomputed one.
  This is the join the floor rides on and no unit test can reach it.
- **Partial detection is reported, not silently dropped**, on a fixture holding a
  mass-land-denial card the ingest does know.

The probe builds its own fixture deck: a brew with a known card set assembled to sit at a
known bracket, mutated across the boundary within the run. A fixture that happens to hold no
Game Changer proves nothing about the Game Changer rule, so the probe **fails rather than
passes** when its fixture does not reach each rule it claims to test.

**Mutation, before any of it is believed.** At minimum: drop the `game_changer` column read;
make the combo join match on card count without the infinite check; remove the
`detection: partial` report; let `bracketDelta` return `moves` for a tutor; apply the
extra-turn count rule at B2 as well as B1; drop `basis` so a colour-conditioned target
presents as a per-commander one. Each must fail the run. Per `run the guard's failure path
before trusting it` — six checks in one run once reported clean over real drift in this
repository, and the pattern that caught it was running the failure path first.

**One instrument is already written and is itself the evidence for §4A.**
`scripts/measure-staples.mts` is committed, read-only and re-runnable; every figure in that
section came from it. It found a defect in its own first run — a `LEFT JOIN` inflating 3,279
commanders to 859,794 — which is recorded here because a measurement that misreports its own
denominator is precisely the failure this repository keeps finding in its own guards.

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
- **Whether a staple is *good*.** The floor reports what the format plays, at a measured rate
  with its denominator (§4A.1). It does not claim the format is right, and a card the
  consensus has not caught up to will read as missing. Format consensus is the correct signal
  for a floor and a poor one for a ceiling.
- **Anything about how the deck should be built.** The fit is a reading; acting on it is
  sub-project 2. Nothing in this sub-project changes what `fill.ts` or `last-slots.ts` do.
- **Whether other players are right about their brackets.** §6.3a reports what they declared,
  for 22.4% of decks that declared anything. It is context, never corroboration: a verdict and
  a popular opinion agreeing does not make the verdict more true.
- **How much ramp, draw, removal or board-wipe a deck should run.** Measured: EDHREC publishes
  type counts, not functional ones, so those four targets have no source (§4A.5). The land
  count, the type composition and the curve do.
- **Whether a combo in the deck was intentional.** Every WotC combo clause says *intentional*
  and that is a fact about the builder (§6.3). The slot reports what is assembled.
- **Which turn a combo would land.** B3 turns on early-versus-late and WotC glosses the line at
  turn six; nothing in a decklist answers it, so the combo and its pieces are printed and the
  reader judges (§6.3).

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
- **The skeleton fit**: per-type have-against-target, the curve comparison, and missing
  staples carrying a rate and its denominator. Design's call is how this reads as *help*
  rather than as a report card — it is the first thing a player with a half-built deck wants
  and the easiest to make feel like a failing grade.
- **`basis`** (§6A): a target drawn from this commander's own average deck, from a
  colour-count fallback, or absent entirely. Three different strengths of claim in the same
  slot, and the surface has to carry the difference without a footnote per row.
- How a **thin-data commander** is stated (`coverage.thin`, §6A). The reader needs to know
  the floor is doing more work than usual here, without the surface implying their commander
  is a bad choice.
- How `detection: partial` is stated without either alarming or being missed (§6.5). Now
  writable: the classifier measures **91.7%** recall with a second source beside it (§4.2), so
  this is a footnote rather than a caution.
- **The population line** (§6.3a) beside the verdict — *"Bracket 3, where 5,055 of the 11,848
  Ur-Dragon decks that declared one also sit"* — carrying its denominator without turning the
  verdict into a popularity reading. This is the Rule 0 sentence, and it is the one figure on
  the surface that is about other people rather than about this deck.
- **How a rule that declines to count reads next to one that has no rule at all** — the
  `unquantified` / `ruleless` split (§7.2). An extra-turn card at Bracket 3 and an eighth
  tutor are both "does not move your bracket" and they are not the same sentence, and a
  reader who conflates them will cut the wrong cards.
- The upgrade path's presentation: a consequence, not a recommendation.
- The About entry. Per the standing rule, a feature does not launch without one in the same
  round, with the `ABOUT_VERSION` bump named as a task in the plan.

**Which round owes the About entry, stated so it cannot be missed:** **not this one.**
Sub-project 1 ships no UI, so there is nothing for a reader to discover and an entry would
describe a surface that does not exist. The entry and the `ABOUT_VERSION` bump belong to the
round that ships the deck-analysis surface — sub-project 1b, once this brief has a READINESS
verdict — and are a named task in *that* plan. Recorded here because "backend only, so no
entry" is exactly the reasoning that let the post-import summary reach `main` with none.

---

## 12. Sub-projects that follow

Named so the profile's shape accounts for them. None is specced.

| # | Sub-project | Adds to the profile |
|---|---|---|
| 2 | **Informed building**: fill, top-off and the Add panel driven by the skeleton; `ROLE_TARGETS` retired (§4A.5) | — reads §4A |
| 3 | Combos and near-misses (`almostIncluded`) | — reads §4.3 |
| 4 | Small swap tools: cheaper-than-$X, from-my-collection, #218, #217 | ownership, price groups |
| 5 | #10 resumed, games as enrichment | play-data group |
| 6 | Deck synopsis (the one model feature) | — reads the whole object |
| 7 | #215 alternate commander | — |
| 8 | Intake questions → deck | — |

**Sub-project 2 is first on purpose.** It is the one that answers §1.1 — help while the deck
is being built, rather than a verdict after the money is spent — and it is the reason this app
exists rather than a thing it could also do. It is placed second rather than first only
because the floor it acts on must be measured, printed and argued with before anything is
built on it (§4A.4).

**Its size was checked rather than assumed, twice.** §4A.6 walks the consumers: the measured
land target touches three files, all in the deck-building path, and cannot reach
`commander_scores` because the scoring engine reads only the four roles this sub-project
cannot measure. An intermediate draft of this spec claimed otherwise and was wrong.

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
