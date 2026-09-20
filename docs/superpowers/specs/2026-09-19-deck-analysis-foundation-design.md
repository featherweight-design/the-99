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

- **The targets are flat, asserted, duplicated — and already labelled with a source they do not
  have.** Three constants carry the same five numbers: `ROLE_TARGETS` (`src/lib/recs/roles.ts:4`)
  at `ramp 10, draw 10, removal 8, wipes 3`; `landTarget()` (`src/lib/decks/deck-size.ts:14`) at
  **37**, or 36 with a partner; and **`RECOMMENDED_MIX` (`src/lib/decks/mix.ts:50`)**, which
  restates all five — `ramp 10, draw 10, removal 8, wipes 3, land 37` — with a label and an
  `advisory` flag per role.

  **`RECOMMENDED_MIX` is the one players actually see**, drawn by eight components including
  `RoleCounterStrip` on the deck page and the review page's what-changed strip. And
  `RECOMMENDED_MIX_SOURCE_LINE` (`mix.ts:89`) tells them where the numbers come from:
  **`"EDHREC averages"`**.

  **Nothing derives them from EDHREC.** That line is an unsourced claim the app makes to its
  reader today. So §4A is not adding a new claim to the deck page — it is **making an existing
  claim true**, and the measured figures disagree with the asserted ones: the corpus mean is
  35.3 lands against a flat 37, ranging 30–47 by commander. The problem is not that it is missing; it is that **37 is flat where the measured
  spread is 30–47** (§4A.4). Najeela's decks average 34 lands and Aang's 36 — the flat target
  errs high for both, and the corpus mean is 35.3, so 37 is above the average deck rather than
  at it.
- **Nothing is conditioned.** Mono-black and five-colour want different ramp and different
  fixing. The targets do not move, so "Arcane Signet is less useful in mono" has no way to be
  expressed.
- **Top-off is purely relative.** `listLastSlotsCandidates` (`src/lib/decks/last-slots.ts:44`)
  filters an already-ranked `SynergyCard` list — EDHREC synergy against that commander, ranked
  upstream. For a commander EDHREC barely
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

**The skeleton was run against that deck before this spec was approved, and it reproduces the
diagnosis.** Its composition against the Kratos/Atreus pair average (§4A.4a):

| | HD - Gods | pair average | delta |
|---|---|---|---|
| Land | 37 | 37 | — |
| Creature | 26 | 26 | — |
| Instant | 11 | 11 | — |
| Sorcery | 5 | 5 | — |
| **Artifact** | **8** | **13** | **−5** |
| Enchantment | 10 | 6 | +4 |

Four types exact, and the one real gap is **five artifacts light** — which in this archetype is
mana rocks. That is deckcheck's *"fast mana is limited to Sol Ring"*, reached from data this
app already holds, with no model and no invented weight.

Note what the **flat** target could not have said — and note that it is not even the right
constant here. HD - Gods is a **pair**, so `landTarget(true)` returns **36** against the deck's
37 and the pair page's 37. The flat figure is off by one in the one place it is checked, while
the measured pair composition lands on the nose. And the deck's lands were never the problem:
only a per-commander composition could point at the artifacts instead.

**One honest limit on this validation, because it breaks a rule stated later in this document.**
`fitSkeleton` emits `artifact: have 8, target 13, delta −5`. The step from there to *"mana
rocks"* is a **functional** reading of a **type** figure — exactly what §6A structurally forbids
by carrying no functional roles at all. Those five artifacts could be equipment. So the honest
claim is that the skeleton finds a type gap **consistent with** deckcheck's diagnosis; it does
not reproduce the diagnosis, and no code in this spec can. (The table also omits the deck's one
Battle, so it accounts for 97 of 98.)

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
- **Play data.** `deck_games` records a result, a pod size, the version played and a free-text
  note, and `deck_game_axes` records a polarity against eight fixed axes. *"You have won 2 of
  8 games with this deck, and the games you lost were logged as losing on `card_flow`"* is a
  recorded fact no competitor holds.

  **What it does not record, stated because an earlier draft claimed otherwise:** whether the
  commander was cast. #215's *"the last game was won without ever deploying her"* is Hugh's
  observation in an issue, not a column — and a draft of this spec turned that anecdote into a
  claimed database capability and then used it as the headline proof. The differentiator is
  real; that example was invented.

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

`ROLE_TARGETS`, `landTarget()` and `RECOMMENDED_MIX` are the standing counter-examples: three
constants carrying five numbers between them, none derived — and `RECOMMENDED_MIX` goes further
and **tells the reader they are "EDHREC averages"**, which is a sourcing claim with no
derivation behind it. The land target is the one this
sub-project can replace with a measurement; the other four it can only label (§4A.5).

### 2.5 The profile is facts; verdicts are pure functions over it

The stored object holds **what is true about a deck**. Every verdict — the slot, the flags,
the upgrade path — is a pure function reading it. A future nuance read is a *second consumer
sitting beside the strict slot*, never a rewrite of it.

### 2.6 Games are enrichment, never a gate

#10's suggestions are gated at `PATTERN_MIN` logged games **in its merged plan** — the feature
is unbuilt, so nothing ships gated today. That gate is removed
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
- A **measured staples floor**, conditioned on **exact colour identity** (§4A.3), derived from
  `commander_support_cards` into one new table by a committed script. No new upstream.
- A **widened EDHREC parse**: the ten per-commander composition counts and the average curve
  the payload already carries and `parseEdhrecPayload` currently discards, as columns on
  `commander_support`, written by the index build's existing fetch. One run of the existing
  monthly job; no new endpoint and no additional request volume.
- **Two oracle-text classifiers** as a second source beside the Spellbook sweep, each measured
  before being specced (§4.2): **mass land denial** at 91.7% recall, zero false positives
  **against its curated negative set** (union with the sweep 23/24), and **extra turns** at
  100% recall / zero false positives, with no misses among the 56 cards whose oracle text
  mentions an extra turn. The scope on that first figure is load-bearing and an earlier draft
  omitted it — see §4.2a.
- **Legality as its own fact-group**, read from `cards.commander_legal` rather than the sweep —
  complete and local, where the sweep knows 28.5% of cards (§4.3a).
- **Pair pages for partner commanders** (§4A.4a): pairs present in `decks` fetched by the
  monthly index, any other pair covered by the existing demand cache. Both mechanisms exist.
- The **Deck Profile**: a pure builder plus a cached loader, defined as a composable set of
  fact-groups.
- **`fitSkeleton`**: where a deck sits against its skeleton, a pure function over the profile.
- **`slotDeck`**: the permitted bracket range, a pure function over the profile (§6.1a), plus
  the combo lean where the range is `[3,4]` (§6.1b) and a `declared_bracket` column on `decks`.
- A **tutor-target classifier** — what a tutor can search for — measured before it is believed,
  as the other two were (§5.2a).
- An **identity-conditioned composition** derived alongside the staples floor (§4A.6b), so a
  commander with no page of its own still has a target.
- A **`commander_pair_support` pair of tables** (§4A.4a) carrying a pair's own composition and
  its own support list, and the re-keying `edhrec_cache` needs to cache a pair payload.
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
  needs two-card-combo detection; *surfacing* combos and `almostIncluded` is sub-project 3
  (§14).
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
sweep all of it in about a minute** — comfortably inside the documented 80 req/min. It is
roughly 8.7 MB of responses **in addition to** the bulk (§4.4 runs both), not a substitution
for it.

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
24 cards that unambiguously qualify, **recall 22/24 (91.7%)** with **zero false positives
against its curated negative set**, flagging **40 of 31,830** commander-legal cards.

### 4.2a The precision claim had the wrong scope, and eleven cards were paying for it

Recorded in full because the failure is this document's own method turned on itself.

"Zero false positives" was true of a **12-card curated negative set** and was written as
though it were a fact about the catalog. It was not. The classifier flagged **51** cards; a
read of all 51 finds **eleven** that do not meet the quoted definition:

| flagged card | why it is not mass land denial |
|---|---|
| `Choke`, `Curse of Marit Lage` | `Islands don't untap` — matched INSIDE the word `Islands`; a colour hoser, not four lands per player |
| `Reduce // Rubble` | `up to three **target** lands … **next** untap step` — bounded and temporary |
| `Lorthos, the Tidemaker` | eight **targeted** permanents for one untap step — same shape |
| `Embargo` | `**Nonland** permanents don't untap` — the exact opposite of this rule |
| `Freyalise's Radiance` | `**Snow** permanents` — a snow hoser, on the `Choke` pattern |
| `Mungha Wurm` | `**You** can't untap more than one land` — a drawback on its own card |
| `Scourglass` | `destroy all permanents **except for artifacts and lands**` |
| `Wirefly Hive`, `Celestial Kirin`, `Season of Gathering` | `destroy all permanents` + a qualifier naming a subset that need not contain lands |

Every one was **already being printed** by the script, in a section headed *"everything else
it flagged (eyeball for precision)"* — truncated at 40 rows, and never read. The instrument
was working; the reading was not, and the figure quoted beside it implied a sweep nobody had
done.

**The fix was clauses, never a suppression list** — the trap named below in this same
section. `\b` on `lands don't untap`; `target` excluded there and on the permanents clause;
narrowing adjectives (`nonland`, `snow`, `those`) and land-naming exception clauses excluded on
`destroy all permanents`; `you` excluded on `can't untap more than`. Recall is **unchanged at
22/24** and the flag count falls **51 → 40**. `Worldslayer` is the case that shaped the last
of those: `destroy all permanents other than this Equipment` kills every land and IS mass land
denial, so the guard tests whether the exception NAMES LANDS rather than whether an exception
exists — a blunter guard loses it.

All eleven are now in the negative fixture (22 cards), and the script's sweep section prints
**every** flagged card with no truncation. **A precision claim about the catalog costs a human
reading that list**, and the script now says so instead of printing a number nobody derived.

Its first version scored 66.7%, and the difference is a trap worth recording: every miss was a
*wording variant of a clause already in the definition* — the Orb/Stasis family says "keep
lands tapped" three different ways. The fix was to implement the remaining clauses, **not** to
add patterns until the fixture passed. Tuning a classifier against its own test set produces a
number that means nothing.

**Extra turns get the same treatment, and score better.** The sweep's 28.5% coverage is worse
here than for mass land denial, because Bracket 1 forbids extra-turn cards **outright** — the
only hard *count* rule in the system — and the list is reported as a fact on every verdict, not
only at B1. Under-detection therefore under-reports everywhere, in the direction that tells a
player their deck is gentler than it is.

Measured (`scripts/measure-extra-turns.mts`, committed, read-only): **recall 21/21 (100%)**
against unambiguous grants, **zero false positives** against cards that mention an extra turn
and grant none.

The reading that earns it is the third one, which a curated set cannot give. Sweeping the whole
catalog for any card whose text **mentions** an extra turn: **56 cards, 52 claimed, 4
unclaimed** — `Stranglehold`, `Trouble in Pairs`, `Gerrard's Hourglass Pendant` and
`Ugin's Nexus`, none of them wrongly missed.

**Two corrections to an earlier draft of that sentence, which said "all four are genuine
prevention effects, each caught by the negation clause".** Neither half held. The first three
match **no grant pattern at all** — *"if a player would begin an extra turn, that player skips
that turn instead"* contains no *"takes an extra turn"* — so they are excluded by matching
nothing and would read the same with the negation array deleted. And `Ugin's Nexus` is not
purely a prevention effect: its death trigger reads *"instead exile it and **take an extra
turn after this one**"*, which is exactly why it is the **one** fixture the negation clause
actually earns. The run now prints, per fixture, which mechanism excluded it, and warns when
that count reaches zero — a precision set that exercises nothing is the vacuous-test class
this repository keeps paying for, and here it was three rows in four.

**The denominator is 56, not 31,830, and an earlier draft said otherwise.** A card granting an
extra turn in wording the search phrase does not match is invisible to the instrument, exactly
as it is for mass land denial. What this shows is that among cards the phrase reaches, nothing
is missed — a stronger result than the MLD fixture gives, and not a completeness claim over the
catalog.

The negation clause is why a naive `/extra turn/` match is wrong: **a card can both prevent
and grant**, and it must read as prevention. `Ugin's Nexus` is that card — it skips everyone
else's extra turns and takes one itself when it dies — so a rule without the clause flags it,
and at Bracket 1 that moves a deck out over a card whose whole purpose is stopping extra
turns. (An earlier draft generalised this to *"every prevention effect also matches a grant
pattern"*, which is false: the other three preventions match no grant pattern at all. One card
earns the clause, and one is enough.)

**Every flag carries its sources** (`spellbook_sweep` | `oracle_rule`), **per flag and as a
set** (§4.3), so a reader disputing a verdict is owed which classifier made the claim — and
whether both agreed. *"Both Spellbook and our own rule say `Armageddon` is mass land denial"* is
a stronger answer than *"only our rule says `Back to Basics` is"*, and `Back to Basics` is
exactly the card someone argues about.

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
  variant_id          text not null references spellbook_variants on delete cascade
  oracle_id           uuid not null references cards(oracle_id)
  must_be_commander   boolean not null default false   -- from uses[].mustBeCommander (§4.3b)
  primary key (variant_id, oracle_id)
  index on (oracle_id)                      -- "which combos does this card enable"

card_bracket_flags
  oracle_id                uuid primary key references cards(oracle_id)
  mass_land_denial         boolean not null default false
  mass_land_denial_sources text[] not null default '{}'   -- 'spellbook_sweep' | 'oracle_rule'
  extra_turn               boolean not null default false
  extra_turn_sources       text[] not null default '{}'
  computed_at              timestamp not null default now()
```

**Sources are per flag and are arrays, not one shared column.** A card can be mass land denial
by the oracle rule and extra-turn by the sweep, and a single `source` string cannot describe
that row honestly — which would make §5.2's promise of provenance unkeepable for exactly the
cards most likely to be disputed. The array also records **agreement**: both classifiers
catching a card is stronger evidence than one, and it costs nothing to keep.

`banned` is deliberately **not** in this table — §4.3a.

### 4.3a `banned` is local, complete, and not a bracket fact

The first draft took `banned` from the Spellbook sweep. Two reasons that is wrong.

**It is not a bracket rule.** WotC's own text gives B4 and B5 *"no restrictions (other than the
banned list)"* — the banned list sits **under all five brackets** as a legality floor, not
inside the bracket system. A banned card does not move a deck's bracket; it makes the deck
illegal.

**And `cards.commander_legal` is complete, local and free**, where the sweep's coverage of the
banned list was never measured at all. Telling a player their deck is fine when it is illegal
is the worst failure this surface has, and it should not rest on an unmeasured upstream when a
complete local answer exists.

*(An earlier draft argued this from the sweep's 28.5% resolve rate. That figure is a
**random-sample** rate and says nothing about a targeted subpopulation — the same table in §4.2
shows the sweep resolving 22 of 24 mass-land-denial cards. The conclusion holds; the argument
was the wrong one.)*

We already hold the complete answer: **`cards.commander_legal`**, from Scryfall's `legalities`,
refreshed weekly. Measured 2026-09-19: **3,738 commander-illegal cards** in the catalog and
**zero** in any deck in the database — the add path already gates, so an import is how one
would arrive.

So legality is a **separate fact-group on the profile**, not a field in `ProfileBrackets`, and
the sweep's `banned` flag is ignored entirely. That also gives rule-0 legality reporting
(§14, currently unplaced) a place to land without reshaping anything later.

```ts
type ProfileLegality = {
  banned: CardRef[];              // cards.commander_legal = false
  identityViolations: CardRef[];  // outside the commander's colour identity
};
```

`identityViolations` is included because the check is free once the group exists — `deckCards`
has no colour-identity constraint, a hazard #215 already flags, and a commander swap can
silently render cards in the 99 illegal.

`spellbook_variant_cards` is normalised for the same reason `commander_support_cards` is: the
consuming query is always "intersect this deck's oracle ids with variant membership", which
is a join Postgres does well and array containment does badly.

The `oracle_id` index exists because sub-project 3 traverses the relation in the opposite
direction — one card, which combos it appears in — and the primary key's leading column
cannot serve that.

**Unresolvable names are dropped and counted**, exactly as the EDHREC ingest does, so an
unresolvable card reduces measured coverage rather than silently shrinking a denominator.

### 4.3b Three rules the combo join needs, or it reports wrong verdicts

A false positive here is the expensive kind: the app says a deck assembles
`Thassa's Oracle + Demonic Consultation`, slots it to Bracket 4, and the player cuts cards over
a combo they do not have. All three rules were verified against real bulk records.

**1 · A variant with template prerequisites is not a two-card combo.** `card_count` counts
`uses` only. A variant with 2 `uses` **and** a non-empty `requires` is a three-piece combo —
the deck also needs a card matching the template, which we cannot verify. Counting it as a
two-card infinite over-slots the deck. Excluded from the two-card test; the `requires` array is
stored so sub-project 3 can surface it as a near-miss.

**2 · `mustBeCommander` must match the deck's actual commander.** Some pieces only work from
the command zone — the Najeela family is the obvious case. A deck holding the card in its 99
does not assemble that combo. Requires the column above, taken from `uses[].mustBeCommander`.

**3 · The commander is not in `deck_cards`.** It lives on `decks.commander_oracle_id` and
`partner_oracle_id`. A join over `deck_cards` alone silently misses **every combo the commander
is part of** — a false *negative*, and commander-piece combos are the common case in this
format, which makes this the most consequential of the three.

Rules 1 and 2 prevent over-slotting; rule 3 prevents under-slotting. Each gets a probe case
(§8), because all three are reachable only against a database.

### 4.4 The job

`pnpm db:seed:combos` does two things, for the two questions §4.2 separates.

**The sweep** — 54 batched `POST /estimate-bracket` calls of 600 cards each, harvesting
card-level `massLandDenial` and `extraTurn` into `card_bracket_flags` — **not `banned`, which
comes from `cards.commander_legal` instead (§4.3a)**. About a minute,
well inside 80 req/min, and it runs **before** the bulk so a bulk failure does not cost the
card flags too.

**The bulk** — projected to the fields above; the 656 MB is almost entirely image URLs we
discard.

**It cannot reuse `streamBulkEntries` as-is.** Scryfall's bulk is JSONL — one object per line,
which is what that helper consumes. Spellbook's `variants.json` is **one JSON document** with a
`variants` array, so it needs an incremental array parser rather than a line reader. A plan
that assumes the existing helper applies will find this out at implementation time; it is
recorded here instead.

Workflow `Combo refresh`, weekly, against **both** `catalog-staging` and
`catalog-production`, through a `plan` job feeding a matrix. **Not** an expression on
`environment`: that bug has now been found three times in this repository (`Catalog refresh`,
`Price refresh`, `Commander index`) and sends every scheduled run to production alone.

It runs **after** `Catalog refresh` in the week, because a variant naming a card the catalog
has not ingested yet is unresolvable, and the catalog moves first.

It stamps `catalog_refreshes` (non-fatally, as the other jobs do), because deck profiles are
cached and a combo the ingest newly learned must retire them.

### 4.5 `pnpm check:spellbook`

A contract check in the daily `Upstream contract checks` workflow — the file is
`.github/workflows/scryfall-contract.yml`, whose `name:` is that phrase — beside
`check:scryfall` and `check:manapool`. No database.

Five assertions, and the last two are the ones that earn it:

1. The bulk index is reachable and `last-modified` is within **2 days**. The file is rebuilt
   daily (§4.2 measured it "within hours") and this check runs daily, so an 8-day window — the
   first draft's figure — could only fire after the weekly ingest had already consumed a
   week-stale file. Two days tolerates one missed upstream build and no more.
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
> condition's commanders** and played, on average, in **at least 20% of their decks**. Basic
> lands are excluded outright. A condition needs **at least 100 commanders** to carry a floor
> of its own.

**Both the condition and the inclusion bar were corrected after the first ratification**, and
the honest record of that matters more than the numbers. §4A.3 replaced colour count with exact
colour identity, having found the count axis structurally incapable of admitting a coloured
card. And the inclusion bar moved from 25% to 20% because the case it was defended against did
not discriminate — see §4A.1a. Re-ratified 2026-09-19 against the identity-axis output.

What that admits for a **mono-white** commander — 27 cards, and the shape of the list is the
argument for the line:

```
Sol Ring 75.7% · Swords to Plowshares 67.2% · Path to Exile 61.0% · Arcane Signet 54.0%
Pearl Medallion 52.6% · Generous Gift 39.5% · Emeria, the Sky Ruin 37.0% · War Room 34.1%
Welcoming Vampire 32.5% · Mentor of the Meek 32.4% · Loran of the Third Path 32.3%
Swiftfoot Boots 32.3% · Knight of the White Orchid 32.2% · Esper Sentinel 31.5%
Mind Stone 29.9% · Sun Titan 29.8% · Oketra's Monument 29.7% · Austere Command 28.9%
Solemn Simulacrum 28.5% · Mangara, the Diplomat 28.4% · Rogue's Passage 28.3%
Myriad Landscape 28.2% · Land Tax 28.0% · Nykthos 27.7% · Keeper of the Accord 27.1%
Mother of Runes 26.4% · Stroke of Midnight 25.7%
```

That is the floor at the retired 25% bar. **At the ratified 20% it holds 46 cards**, adding
`Akroma's Will` (21.0%), `Teferi's Protection` (20.3%), `Lightning Greaves` (23.0%) and
`Smothering Tithe` (23.1%) among others — §4A.1a explains why those belong.

Either way the mix is the point of §4A.3's correction: the colour-count floor this replaced held
**11 cards, every one of them colourless**.

### 4A.1a Why the inclusion bar is 20%, defended against the cards either side of it

§2.4a requires a threshold to be justified against a **named case that discriminates**. The
first ratification failed that test and it is worth recording how, because two of the three
numbers had the same defect.

**Breadth at 0.50 passes.** The cards immediately refused are `Enduring Innocence` (0.479),
`Soul Warden` (0.44 at 33.5% inclusion) and `Ephemerate` (0.393 at 32.6%) — heavily played
*when they appear*, but lifegain and blink cards rather than universal ones. The bar separates
"every white deck" from "white decks doing a thing", which is what a floor is for.

**Inclusion at 25% failed.** Its named case was Temple of the False God at 12.2% — excluded by
any bar above ~13%, so it justifies *having* the axis and says nothing about 25. What 25
actually did, at the boundary:

```
refused:  Reprieve 24.9% · Archaeomancer's Map 24.5% · Minas Tirith 24.4%
          Smothering Tithe 23.1% · Lightning Greaves 23.0%
```

**It admitted `Swiftfoot Boots` at 32.3% and refused `Lightning Greaves` at 23.0%** — the same
card under two names — and dropped a Game Changer from the floor of the identity that plays it
most. The bar was cutting through a natural group.

**At 20% the boundary discriminates in both directions:**

```
admitted, lowest:  Akroma's Will 21.0% · Teferi's Protection 20.3% · Witch Enchanter 20.0%
refused, highest:  Flowering of the White Tree 19.9% · Cut a Deal 19.7%
                   Abandoned Air Temple 19.2% · Path of Ancestry 19.2%
```

`Teferi's Protection` and `Akroma's Will` are unambiguous white staples — the first is a Game
Changer — and `Cut a Deal` and `Flowering of the White Tree` are marginal. That is a named case
on each side, which 25% never had.

**The 100-commander bar has cases for its existence and none for its value.** At 46 commanders
the colourless bucket yields 105 cards and at 16 the four-colour buckets yield 51 — both longer
than any real floor, so a bar is needed. Nothing measured distinguishes 100 from 50 or 200, and
this spec says so rather than implying otherwise.

**What 20% costs.** Floors grow from 506 cards across the 15 buckets to **757**, averaging 50.5
each; mono-white goes 27 → 46. That is fine as data — `missingStaples` only ever shows what a
deck *lacks*, so a well-built deck sees a short list and a new one sees a long list, which is
correct. It sharpens §11's warning to Design: the surface must rank and truncate rather than
print 46 rows, and `weighted_rank` (§4A.2) is what orders them.

**Command Tower is correctly absent** — 11.1% among mono-white commanders. It is colourless
and would pass any identity test; what excludes it is inclusion, which is the second axis
earning its place. `Temple of the False God` is excluded at 12.2% with room to spare.

Floor sizes across the 15 identity buckets that clear the sample bar, **at the ratified
(0.50, 20) cut** — re-derived 2026-09-19 and summing to the 757 quoted above:

| identity | commanders | cards | coloured | lands |
|---|---|---|---|---|
| W · R · B · U · G | 336 · 330 · 304 · 288 · 268 | 46 · 43 · 59 · 52 · 54 | 27 · 27 · 36 · 33 · 38 | 9 · 6 · 11 · 8 · 11 |
| RW · BR · GW · UW · BU | 139 · 133 · 130 · 130 · 123 | 46 · 48 · 48 · 43 · 46 | 15 · 21 · 24 · 18 · 17 | 23 · 20 · 21 · 18 · 21 |
| GU · RU · GR · BW · BG | 115 · 114 · 112 · 107 · 106 | 46 · 68 · 48 · 56 · 54 | 24 · 40 · 25 · 25 · 24 | 18 · 20 · 20 · 23 · 25 |

**An earlier draft of this table carried the RETIRED 25% figures** — 27 cards for mono-white,
506 in total — printed ten lines after the text ratifying 20% and quoting 757. The cause was
not a transcription slip: `measure-staples.mts` itself still applied the 25% bar, so the table
was an accurate record of what the committed instrument produced and the instrument disagreed
with the document it was the evidence for. Both are corrected, and the bar now lives in one
named constant in that script rather than in three literals.

Two-colour floors carry **18–25 lands each** — the identity's dual lands. A mana base is the
thing the motivating deck lacked, and the colour-count floor could not name a single one of
them.

**The 100-commander bar now bites differently, and better.** Fifteen of the 32 exact
identities clear it — **every mono and every two-colour identity, covering 2,735 of 3,279
commanders (83%)**. The 17 thin buckets are colourless (46 commanders) and every three-plus
identity, together 544 commanders. Those fall back to **colour count**, which is sound there
precisely because the ceiling that broke it at mono and two colours has stopped binding: white
is 6 of the 10 three-colour identities, so `Swords to Plowshares` clears the three-colour
fallback at **0.616** share. The fit reports which it used (§6A's `basis`).

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

### 4A.2 Weighting governs ORDER, never membership

Weighting by `commander_support.deck_count` makes a commander with 31,481 decks on file
outvote one with 40. Measured, it **moves 17 of the top 25 by three or more places**, in the
direction that argues for it:

- promoted: **Command Tower 11 → 6**, **Exotic Orchard 18 → 9**, Fellwar Stone 9 → 7
- demoted: **War Room 20 → 113**, **Nykthos 23 → 143**, Wayfarer's Bauble 15 → 40

**But the cut in §4A.1 is unweighted, and that is deliberate rather than an oversight.** An
earlier draft asserted the floor was weighted while the ratified 11-card list had been computed
on raw share and raw average inclusion — the spec claimed a basis its own output had not used.
Settled 2026-09-19: **the ratified list is the list**, so membership is unweighted and
`weighted_rank` governs only the order staples are presented in.

The distinction is real, not bookkeeping. Unweighted membership asks *"is this recommended for
most commanders in this condition"* — one commander, one vote. Weighted asks *"is it in most
decks"*, which is dominated by a handful of mega-popular commanders and is the more volatile
question. A floor wants the stable one; a presentation order is free to use the other.

### 4A.3 The conditioning axis is colour IDENTITY, not colour count

This section was wrong for three review passes, and the way it was wrong is worth more than
the correction.

**What the count axis got right.** *"Most decks want an Arcane Signet, but it is less helpful
in mono"* is a number, and the numbers are large:

| card | 1 colour | 2 | 3 | 5 |
|---|---|---|---|---|
| **Command Tower** | **10.4%** | **80.6%** | 88.6% | 87.2% |
| Arcane Signet | 53.4% | 69.2% | 75.2% | 73.7% |
| Exotic Orchard | 16.1% | 25.2% | 53.1% | 63.5% |
| Swiftfoot Boots | 31.9% | 27.8% | 26.2% | **13.6%** |
| Sol Ring | 75.6% | 76.8% | 81.2% | 75.0% |

Command Tower's **70-point cliff** is real, Swiftfoot Boots runs the other way, and Sol Ring is
flat. All of that still holds and none of it is discarded.

**What it got wrong, structurally.** A coloured card can never clear a 50% breadth bar under
colour count. White is **1 of 5** mono identities — a **20% ceiling** — and **4 of 10**
two-colour ones, a **40% ceiling**. Both sit under the cut permanently. Measured:

| card / axis | share | inclusion | in floor? |
|---|---|---|---|
| Swords to Plowshares · `count:1` | 0.218 | 67.2% | **no** |
| Swords to Plowshares · `identity:W` | **0.991** | 67.2% | **yes** |
| Path to Exile · `count:1` | 0.219 | 61.0% | **no** |
| Path to Exile · `identity:W` | **0.994** | 61.0% | **yes** |
| Command Tower · `identity:W` | 0.482 | 11.1% | no |
| Sol Ring · `identity:W` | 0.994 | 75.7% | yes |

So the count floor could hold **only colourless cards**, and did: all 11 entries of the
ratified mono floor were colourless. It would have told a player building their first
mono-white deck about Mind Stone and never about **Swords to Plowshares**.

**How the error survived two corrections, which is the part to remember.** §4A.1's first
finding was that a *global* computation demotes colour-specific staples, and the card used to
prove it was Swords to Plowshares. The fix was colour-count conditioning. Nobody checked
whether the fix helped the card the argument was built on — it does not, because Command Tower
is a colour-**count** effect and Swords to Plowshares is a colour-**identity** one. A correct
finding, a plausible fix, and no test that the fix addressed the finding's own example.

**The axis is the commander's exact colour identity.** A card is measured among commanders
whose identity is exactly the deck's. That admits coloured staples with no ceiling, and it
keeps the count axis's win: Command Tower is colourless, would pass any identity test, and is
excluded by **inclusion** at 11.1% — which is the second axis doing the work §4A.1 gave it.

**Conditioning is not polish; the floor is wrong without it, twice over.** Globally, a
colour-specific staple is invisible. By count, it is unreachable. Only identity admits it, and
only the inclusion axis keeps the wrong colourless cards out.

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
(`src/lib/edhrec/parse.ts:55`) reads `cardlists`, tags (preferring top-level `tag_counts` and
falling back to `panels.taglinks`, never merging), `bracket_counts`, `budget_counts`, `similar`
and three `card.*` fields — and **discards every one of the composition counts and the
curve.**

Measured over all 342 cached payloads:

- every field present on **342 / 342**; `panels.mana_curve` on **342 / 342**
- the type counts sum to **exactly 99 on every row** — min 99, max 99, no exceptions. That is
  the SINGLE-commander body size; a pair's page sums to 98, and the invariant is
  `deckBodySize(hasPartner)` rather than a literal 99 (§4A.4a)
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

### 4A.4a Partner pairs get a real composition, not a fallback

The motivating deck is a **pair** — `Kratos, Stoic Father` and `Atreus, Impulsive Son`,
`Partner—Father & son`. `commander_support` is keyed per oracle id and neither commander's page
describes the pair, so an earlier draft gave pairs the colour-count fallback. That would have
given the weakest reading in the whole skeleton to the one deck this suite exists for. Ruled
2026-09-19: **pairs get real pair pages.**

**EDHREC has them, and discovery is cheap.** The slug is the two commanders in **alphabetical**
order; the wrong order returns a **67-byte** `{"redirect": "/commanders/…"}` stub naming the
canonical one, so a miss costs almost nothing and corrects itself. Verified live:
`atreus-impulsive-son-kratos-stoic-father` returns a full 99,794-byte page carrying
`land 37, basic 17, nonbasic 20, creature 26, instant 11, sorcery 5, artifact 13,
enchantment 6`, its own `panels.mana_curve`, `deck_count: 13,332` and its own `bracket_counts`.

**Which pairs are fetched, and why not all of them.** There are roughly **2,847** possible
combinations — 58 open-`Partner` commanders alone make 1,653, and 32 Background-carrying
commanders against 30 Backgrounds make another 960. Sweeping them would roughly double a job
kept at `max-parallel: 1` under one concurrency group precisely so EDHREC never sees a second
request stream from us, and most of those pages describe pairs nobody has built.

**A pair needs its own table, and an earlier draft was wrong to say otherwise.** It claimed
*"neither is new machinery"*. Both stores are single-commander by construction:
`commander_support.commanderOracleId` is `.primaryKey()` (`schema.ts:800`) and so is
`edhrec_cache.commanderOracleId` (`:557`), which also carries an FK to `cards` that forbids a
synthetic id. A pair row cannot exist in either without a migration.

```
commander_pair_support
  commander_oracle_id  uuid not null references cards(oracle_id)
  partner_oracle_id    uuid not null references cards(oracle_id)
  -- canonical ordering: the lexicographically smaller oracle id is always first,
  -- so (A,B) and (B,A) are one row. Nothing in the repo normalises this today.
  avg_land … avg_battle, avg_curve        -- as §4A.7, the pair's own composition
  deck_count, rank, bracket_counts        -- the pair's OWN figures, see below
  synergy_state, edhrec_total, computed_at
  primary key (commander_oracle_id, partner_oracle_id)

commander_pair_support_cards
  (commander_oracle_id, partner_oracle_id) -> commander_pair_support, on delete cascade
  oracle_id            uuid not null references cards(oracle_id)
  inclusion, synergy   real
  primary key (commander_oracle_id, partner_oracle_id, oracle_id)
```

**The support list is taken too, and the reason an earlier draft gave for skipping it was
wrong.** That draft held that support lists feed `commander_scores`, making this a rescore.
They do not, for pairs: `mergeEdhrecData`'s only consumer is
`src/lib/decks/suggestions-read.ts:149` — the deck suggestion path — and `score.ts` and
`recommend.ts` contain **no partner handling at all**. The scoring engine never sees a pair.

So a pair gets its real support list, and `suggestions-read.ts` prefers it over the merge where
one exists. That replaces an approximation — `mergeEdhrecData` takes the union of two single
lists scored by the better of the two — with the cards people actually play with **that pair**.
The merge stays as the fallback for a pair EDHREC has no page for; deleting it would silently
regress a feature those decks have today.

**And it corrects a false premise in the merge itself.** `merge.ts` reads *"The primary's
commander-level facts survive: a pair has no joint rank."* The pair page carries
`num_decks: 13332` and `rank: 159`. A pair **does** have a joint rank and a joint deck count —
and that deck count is the correct denominator for a pair's bracket population (§6.3a), where
the merge would have used one commander's.

**Which pairs are fetched.** The monthly index fetches a pair page for every distinct
`(commander_oracle_id, partner_oracle_id)` present in `decks` — dozens, growing with what the
group plays. A pair nobody has built is covered by the `edhrec_cache` demand path, which needs
the same re-keying; the redirect stub is a **200 with a JSON body**, so `resolveEdhrecData`
must follow `{"redirect": …}` rather than caching it as a payload.

**A pair's composition sums to 98, not 99**, because the deck body is 100 − 2 commanders. The
invariant is `deckBodySize(hasPartner)` (`src/lib/decks/deck-size.ts:7`), which already exists
and is what every check must use. An earlier draft said "exactly 99 on every row" — true of
singles, and wrong for exactly the decks this section is about.

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

**The `advisory` flag is the precedent for how to label them.** `RECOMMENDED_MIX` already marks
land `advisory: true` and the four functional roles `false` — the app distinguishes a soft target
from a firm one today. After §4A that distinction inverts on its evidence: **land becomes the
measured one** and the four functional roles become the rules of thumb. Sub-project 2 owns the
flip, and it is a one-word change per role in a constant the surface already reads.

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
`computeFit` (`score.ts:164`) folds exactly those into the commander score. The scoring path
excludes lands explicitly (`if (role !== "land")` at `score.ts:329`, inside `scoreCommander`
rather than `computeFit`) and **nothing in `score.ts` reads `landTarget`** — `grep` returns
nothing.

**Those four roles are precisely the four this sub-project cannot measure.** So the measured
data — the land count and the type composition — has **no overlap at all** with what the
scoring engine reads. The migration cannot reach `commander_scores`, by construction rather
than by choice.

What the measured land target actually touches, in full — and a **third** draft got this wrong
by missing an entire constant:

| file | what it holds |
|---|---|
| `src/lib/decks/deck-size.ts` | `landTarget()` itself |
| `src/lib/decks/fill.ts` | 2 invocations — the plan's ceiling and the land ceiling |
| `src/lib/decks/suggest.ts` | 2 invocations (`:119`, `:154`), an import and a re-export |
| **`src/lib/decks/mix.ts:50`** | **`RECOMMENDED_MIX` — a second copy of all five numbers, read by eight components** |

`RECOMMENDED_MIX`'s consumers: `role-counter-strip.tsx`, `consider-panel.tsx`,
`unresolved-group.tsx`, `changed-strip.tsx`, `strip-rationale.tsx`, `builder-shell.tsx`, and two
copy modules. **This is the drawn surface**, so a measured land target that updated
`deck-size.ts` and not `mix.ts` would change what the fill does while the strip on the same page
kept saying 37.

Still all in the deck-building path, and still nowhere near the scoring engine. Every other consumer of `ROLE_TARGETS` —
`score.ts`, `weakest-role.ts`, `role-chips.tsx`, `coverage-section.tsx` — keeps flat targets
because each reads the unmeasurable four, and there is
a principled reason they should anyway: a **ranking** wants one yardstick across commanders,
where a **deck reading** wants accuracy for one.

**This sub-project still retires nothing.** `fitSkeleton` reads the measured targets alone and
touches none of the files above. Sub-project 2 owns the migration, and it is a deck-surface
change of three files rather than the rescore the previous draft feared.

Recorded so it cannot be quietly skipped: a measured target beside an asserted constant is two
sources of truth, and here the line between them is principled — measurable versus not — which
is why both may legitimately stand.

### 4A.6a The reconciliation sub-project 2 inherits

Named here rather than discovered in `fill.ts`, because it is that sub-project's central
design problem and it is visible from this one.

EDHREC gives a **complete** measured skeleton by type — Najeela's decks average
`land 34, creature 28, instant 14, artifact 9, enchantment 7, sorcery 7`, summing to exactly
99. `fill.ts` fills by **function**: it walks `ramp / draw / removal / wipes` against
`ROLE_TARGETS`, takes lands against `landTarget`, and leaves the remainder to synergy.

**Type and function are orthogonal.** Solemn Simulacrum is a creature *and* ramp. So the two
skeletons do not compose by addition:

- filling to the measured **type** composition produces a deck shaped like real decks for that
  commander, which may hold three removal spells
- filling to the asserted **role** targets produces the right functional mix over an arbitrary
  type spread, and covers only 68 of 99 slots

The good answer satisfies both at once, which is a constraint problem rather than two
sequential passes — and it is made harder by the asymmetry that one skeleton is measured and
complete while the other is asserted and partial.

**This spec deliberately does not solve it.** The right rule depends on how the fill actually
behaves against real compositions, which cannot be measured until the composition columns are
populated (§4A.8's scheduling note) — and a rule invented at a desk about a path nobody has
measured is exactly how the four unsourced constants arrived in the first place.

What sub-project 1 owes it is the full measured composition and the curve rather than the land
count alone, which §4A.7 stores and §6A reports. What sub-project 2 owes is a measurement
before a rule.

### 4A.6b The composition fallback, derived rather than assumed

Ruled 2026-09-19. A deck's composition target comes from the first of these that exists:

| `basis` | source | claim |
|---|---|---|
| `"pair"` | that pair's own EDHREC page (§4A.4a) | strongest — this exact pairing's decks |
| `"commander"` | that commander's own page | this commander's decks |
| `"identity"` | **aggregated across commanders of the same exact identity** | decks in your colours |
| `"none"` | nothing | no target is shown, and the surface says so |

The `"identity"` row is new and is what makes the chain real. It is a `GROUP BY` over the same
`avg_*` columns — the mean of each count across an identity's commanders, weighted by
`deck_count` so a commander with 31,481 decks outweighs one with 40 — written to a small
`identity_composition` table beside `format_staples`, under the **same `condition` vocabulary**
(§4A.7), so one bucket serves the floor and the composition.

It matters for two populations. **105 of 3,384 commander-eligible cards are not in the index at
all** (3.1%), measured — overwhelmingly newly printed commanders, which is exactly when someone
is most eager to build and least able to be told anything. And it covers every deck during the
window before the first widened index run.

**It is an average of averages, and is labelled the weaker claim it is.** A commander's own page
describes decks actually built with that commander; an identity aggregate describes decks in
those colours generally. `basis` carries the difference to the surface so a reader is never
shown the second while believing the first.

### 4A.7 Tables

```
format_staples
  oracle_id          uuid not null references cards(oracle_id)
  condition          text not null      -- exact identity: 'C','W','U','B','R','G','WU',…
                                        -- or 'count:3'..'count:5' for thin buckets (§4A.3).
                                        -- There is no 'all' condition.
  commanders         integer not null   -- how many commanders recommend it, in this condition
  commander_total    integer not null   -- the denominator, never inferred
  avg_inclusion      real not null      -- 0-100, the second axis (§4A.1)
  weighted_rank      integer not null   -- deck_count-weighted DISPLAY ORDER only (§4A.2);
                                        -- never a membership test
  primary key (oracle_id, condition)
```

**`condition` is the one vocabulary**, and `fitSkeleton`'s `basis` (§6A) reports *how* a
condition was arrived at — the commander's own payload, the colour fallback, or nothing. Two
words for two genuinely different things: `condition` names a bucket, `basis` names the
strength of the claim behind it. A row here always carries a `condition`; a fit always carries
both.

Only conditions with **at least 100 commanders** are written (§4A.1) — the 15 exact identities
that clear it, plus the `count:` fallbacks for the 17 thin ones. A bucket that was never
computed is absent by construction rather than filtered at read time: an empty floor and a
floor nobody derived are different facts, and the reader is owed the second one.

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
lands". The reader falls back to the identity condition and reports `basis: "identity"`, or to
the count fallback as `basis: "count"` where the identity bucket is too thin to derive
(§4A.3); with neither it reports `basis: "none"` and no target at all.

Every figure carries its denominator, per the presentation rules inherited from #9. A figure
without one is an assertion the reader cannot check, which is §2.2 again.

### 4A.8 `pnpm db:build:staples`

Derives `format_staples` from `commander_support_cards`. Read-only against its inputs, runs
after `Commander index` in the same chain and for the same reason `Commander prose` does: its
inputs are the rows that job writes.

The composition columns need no separate job — they are written by the index build itself,
during the fetch it already performs.

**That has a scheduling consequence, and an earlier draft got its severity wrong.** The draft
said the composition columns are empty until an index run completes but *"the feature does not
break in the meantime — `basis` reports `\"colors\"` and the fit falls back."* **There was no
fallback to fall back to.** No section derived a colour-conditioned *composition* —
`format_staples` is a staples floor, and the `avg_*` columns are per commander — so with those
columns empty, every deck would have reported `basis: "none"` and no type targets at all. The
feature would have shipped dark and lit up weeks later.

§4A.6b derives the fallback that sentence assumed. Dispatch the index manually once the
widening lands rather than waiting for the cron, but the fit is functional either way.

It prints its full derivation: the breadth distribution, the two-axis cut and what it includes
and excludes either side of it, the weighted-versus-unweighted delta, and the per-condition
gaps. That output is the argument, and it exists so the numbers can be disputed **before**
sub-project 2 builds anything on them. This is `measure-gap-line.mts`'s role.


## 5. The Deck Profile

### 5.1 Shape

```ts
export type DeckProfile = {
  deckId: string;
  /** Fingerprint of the deck's OWN inputs — decklist rows, commander and partner ids, and a
   *  builder version. Deliberately NOT the catalog generation: `cacheForUser` injects that
   *  into the key itself (§5.4), and repeating it would file one input twice. */
  fingerprint: string;
  counts: ProfileCounts;       // total, nonland, land, basics
  roles: ProfileRoles;         // classifyRoles tallies, and the cards behind each
  curve: ManaCurve;            // manaCurve(), commanders folded in
  colours: ProfileColours;     // identity, producibleColors, and their disagreement
  skeleton: ProfileSkeleton;   // §4A — measured targets and staples, and what the deck holds
  brackets: ProfileBrackets;   // §5.2 — the fact-group the slot reads
  legality: ProfileLegality;   // §4.3a — a floor under all five brackets, not a bracket rule
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
  /** Whether `composition` describes this commander or this PAIR (§4A.4a). */
  compositionOf: "commander" | "pair";
  /** The floor's bucket: this deck's exact identity where one was derived, else a
   *  `count:` fallback. Always present. */
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
  comboReach: ComboReach;            // §5.2a — tutors, and which reach a combo piece
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

### 5.2a `ComboReach` — tutors, and what they can find

```ts
type ComboReach = {
  tutors: CardRef[];        // every tutor the deck holds, classified from oracle text
  /** Tutors that can search out a piece of a combo this deck assembles. */
  reaches: { tutor: CardRef; combo: ComboRef; piece: CardRef }[];
};
```

**Why this sits in `ProfileBrackets` when `banned` was evicted from it.** §4.3a moved legality
out on the grounds that *"it is not a bracket rule"*, and an earlier draft left `tutors` inside
while admitting *"no bracket rule reads it at all"* — two facts of identical status on opposite
sides of one boundary.

They are no longer of identical status. **The combo lean reads this** (§6.1b): where the cards
permit `[3, 4]`, whether the deck can *find* its combo is the evidence the lean is built on. So
it is an input to the bracket verdict — to its lean, not to its strict rules — and belongs with
them.

**A flat count would not do, and that is the point of `reaches`.** *"More than N tutors"* is the
invented threshold §2.4a forbids, and the one WotC deleted for being unclear. `Three Visits` is
a tutor and finds no combo piece; `Demonic Tutor` finds any. The lean needs reach, not a tally.

**`tutors` is still drawn, and §7.2 still says plainly that no bracket RULE counts them** —
removed outright in October 2025 (§2.1). Max's question deserves an answer, and a Rule 0
conversation may want the number. What must never be implied is a limit.

Needs a **tutor-target classifier**, measured before it is believed, as the other two were.

### 5.3 `ProfileThemes` is null, deliberately

#724 measured the problem precisely: `loadPlayedTags` answers "what does this player play"
from each deck's **commander's** EDHREC tag list, so a Kenrith deck carries Group Hug and
Reanimator whether or not a single card supports them. On the reference account the
`/commanders` lane reads `allPlayed` on **76.3%** of rows
(`docs/superpowers/design-tables/discovery-rows.md:180`; issue #724 quotes 77.0% from an
earlier run — the table is the figure in the repo and is the one cited here).

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
  /** What the CARDS permit. One value where the rules decide it, two where they cannot. */
  permits: Bracket[];               // [1,2] | [2] | [3] | [3,4] | [4,5]
  /** What the player told us, if they have. Not inferred, ever. */
  declared: Bracket | null;         // decks.declared_bracket
  /** Where `permits` holds two values, the app's reasoned lean and its receipts. */
  lean: BracketLean | null;         // §6.1a
  limits: Record<"bracket1" | "bracket2" | "bracket3", BracketLimitReport>;
  violations: Violation[];
  unquantified: UnquantifiedFacts;
  detection: DetectionCoverage;     // §5.2
};
```

**The slot is the LOWEST-numbered bracket whose limits the deck satisfies.** An earlier draft
said "highest", which returns 4 for every deck — B4 and B5 have no restrictions, so every deck
satisfies them. Equivalently: `1 + the number of brackets whose limits are violated`.

Every bracket's limits are reported, violated or not — the reader's real question is often
"what would I have to cut to sit at 2", which a bare verdict cannot answer and a full table
can. deckcheck's `bracket_limits` / `all_violations` shape is adopted in structure.

### 6.1a Two brackets are declared, not derived — and so is one boundary

**Bracket 1 and Bracket 5 are intent claims.** WotC describes Exhibition as decks that
*"prioritize a theme, idea, or creative goal over winning"* — Squirrel tribal where every card
has a squirrel in the art — and cEDH as tournament intent. Two decks with identical contents
can sit at 1 and 2, or at 4 and 5. Deriving either from cards would be a claim about a person.

An earlier draft concluded from this that the slot should simply floor at 2 and ceiling at 4.
**That was wrong, and the reason is worth keeping:** a system that presents five brackets and
can only ever emit three is telling the reader its own model is broken. Ruled 2026-09-19 —
*"we can't just outright omit these brackets"*.

So the cards produce a **permitted range** and the player answers within it:

| the deck's cards | `permits` | the question |
|---|---|---|
| violate nothing | `[1, 2]` | is this built to show something off, or to play? |
| extra turns only | `[2]` | — |
| ≤3 Game Changers, a late two-card combo | `[3]` | — |
| a two-card infinite, nothing else at B3 | `[3, 4]` | does this combo land before turn six? (§6.3) |
| violate B3's limits | `[4, 5]` | are you playing this competitively? |

**The ask is the feature, not a fallback.** This app's distinguishing asset is what it records
from a player over time — results, versions, notes — and a declared bracket joins that set.
*"Your cards permit 1 or 2 — which is this?"* is a better interaction than a number handed
down, and the answer is durable: it is what the player told their pod, so **drift between
`declared` and `permits` is its own finding** — *"this deck has moved past what you said it
was."* Pod comparison (§2.3) then has four declarations and four permitted ranges rather than
four computed figures.

`declared` is **never inferred and never defaulted.** A null means the player has not answered,
and the surface shows the range. A `declared` value outside `permits` is itself reportable —
the deck has changed since they answered.

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

**"Early-game" has an official gloss but is still not computable, so it WIDENS THE RANGE rather
than moving the number.** B3 forbids early two-card infinite combos; WotC's guidance is that
**turn-six-or-later closers are acceptable**. Nothing in a decklist says which turn a combo
lands.

An earlier draft resolved this by treating any two-card infinite as permitted at B3. That
silently decided an unquantifiable question **in the permissive direction and let it move the
verdict** — breaking §2.1, and erring the way §4.2 names as dangerous: telling a player their
deck is gentler than it is. The conservative reading is no better; it over-slots a turn-nine
wincon to Bracket 4 and makes someone cut a card they did not need to.

So a deck whose only B3 issue is a two-card infinite **permits `[3, 4]`** (§6.1a), with the
combo and its pieces named and the turn-six gloss quoted. This is the same mechanism the 1-vs-2
and 4-vs-5 boundaries use, for the same reason: the rules leave a question only the player can
answer.

**But the app does not simply hand the question over.** Ruled 2026-09-19: leaning entirely on
the reader *"starts to erode the convenience of the ranking"*. §6.1b is the lean.

### 6.1b The combo lean: can this deck FIND the combo?

Where `permits` is `[3, 4]`, the app states a likely bracket and shows its whole reasoning:

> *"You hold `Thassa's Oracle + Demonic Consultation`, and `Demonic Tutor` and `Vampiric Tutor`
> each find either piece. **Likely Bracket 4** — a combo you can search for turns up early."*

> *"You hold the combo and nothing that searches for a piece. **Likely Bracket 3** — you have
> to draw it."*

**The signal is reach, not a count**, and that distinction is the whole reason this is
admissible under §2.4a. *"More than N tutors"* would be an invented threshold — and it is
precisely the threshold **WotC deleted**, having found that *"not all tutors are created
equal"*. *"Does anything in this deck search out a piece of this combo"* is a capability,
derived per deck, with no number chosen by us.

It needs a **tutor-target classifier** — what a given tutor can search for — which is a third
oracle-text rule and is **measured before it is believed**, exactly as mass land denial and
extra turns were (§4.2).

**The lean is a lean.** It is labelled as reasoned rather than measured, it only ever
disambiguates a two-value range the countable rules already produced, and the player can
correct it — at which point their correction is stored as `declared` (§6.1a). This is not §2.2's
forbidden power number: it resolves no continuous score, spans no decks, and shows every card
behind it.

**And it becomes measurable.** Today there is no join from "decks that declared Bracket 4" to
"what those decks ran" — `bracket_counts` is aggregated per commander, without lists. Once
declarations accumulate alongside decklists (§6.1a), that join exists and the lean can be
replaced by a measurement rather than a rationale.

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

### 6.4 Why the limits table covers only brackets 1–3

B4 and B5 have no limits to report — *"no restrictions (other than the banned list)"* — so
`limits` carries three entries and a deck violating all three permits `[4, 5]` (§6.1a).
deckcheck's payload has the same shape for the same reason: `bracket_limits` covers 1–3, and 4
is "violates 3".

What differs here is the bottom of the range. deckcheck emits a single `bracket_level`; this
spec emits a range wherever the rules genuinely cannot decide, which is at both ends and at the
B3 combo boundary.

### 6.5 The verdict states what it could not see

**All three detections are partial, including combos** — so a binary flag would have one
possible value, and a field that always says the same thing trains readers to skip it.

An earlier draft exempted combos on the grounds that *"a variant either exists in Spellbook's
index or it does not."* That argument fails three ways, all from inside this document. Authority
over what is in an index is not completeness over what exists — applied to mass land denial the
identical sentence would read "a card is in Spellbook's flags or it is not", which §4.2
correctly rejects. §4.3b **deliberately drops** every template-gated variant, a designed and
known source of missed combos (and §4.3b's own summary is wrong to say rules 1 and 2 prevent
over-slotting while rule 3 prevents under-slotting — **rule 1 causes under-slotting**). And the
infinite test is a generated feature-name heuristic with unmeasured recall, which would be
reported as complete while a heuristic with 23/24 *measured* recall is reported as partial.

So `detection` states, per fact, **what was actually checked**:

```ts
type DetectionCoverage = {
  massLandDenial: { sources: 2; basis: "23 of 24 on a curated set"; knownMiss: "Wave of Vitriol" };
  extraTurn:      { sources: 2; basis: "no misses among the 56 cards whose text mentions one" };
  twoCardCombos:  { sources: 1; basis: "Spellbook's index, excluding template-gated variants" };
};
```

That is provenance rather than a badge, it matches the receipts philosophy everywhere else in
this document, and it lets the surface answer *which* fact was uncertain at the moment someone
disputes a verdict. Each string is re-measured when its classifier changes; §8's mutation run
covers that.

---

## 6A. `fitSkeleton(profile): SkeletonFit` — pure

```ts
type SkeletonFit = {
  /** Where each target came from, per §4A.4's fallback chain. */
  basis: "commander" | "pair" | "identity" | "count" | "none";
  types: TypeFit[];                   // land, creature, instant … : have, target, delta
  curve: CurveFit | null;             // the deck's curve against the commander's average
  missingStaples: StapleRef[];        // floor cards absent, with measured rate + denominator
  presentStaples: StapleRef[];
  coverage: { commanderDeckCount: number | null; thin: boolean };
};
```

**`basis` is not decoration.** A target comes from this pair's own page, this commander's, its
exact colour identity, a colour-count fallback, or nowhere — **five** materially different
claims,
and a fit that presented them identically would be asserting a precision it does not have. The
surface prints which. `"pair"` is separate from `"commander"` because a pair's average deck is
a different population, and it sums to 98 rather than 99 (§4A.4a). `"identity"` and `"count"`
are separate because the second is the fallback for a bucket too thin to derive (§4A.3), and a
reader is owed the difference between "decks in your colours run this" and "decks with your
number of colours do".

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
difference per mana value.

**The two bucket the tail differently and must be aligned.** `manaCurve()` caps at
`CURVE_MAX = 7` (`src/lib/decks/stats.ts:153`), folding everything above into the top bucket;
EDHREC's curve carries literal keys past it — the Kratos/Atreus page has a `"9"`. `CurveFit`
folds EDHREC's tail into the same 7+ bucket before comparing. Comparing them unaligned would
report a phantom gap at the top of every curve. It is a **comparison, not a verdict** — no bracket rule and no
target is derived from it, and a deck being two cards heavy at three mana is a fact the reader
does something with, not a failure the app names.

## 7. The marks and the push check

### 7.1 Card-level marks

`game_changer`, `mass_land_denial` and `extra_turn` are **standing facts about a card**, true
with no deck in scope, and should be available wherever a card is drawn — the collection, a
card modal, a decklist row.

Only `game_changer` is a column on `cards` (§4.1) and therefore free. The other two live in
`card_bracket_flags` (§4.3) and **cost a join the existing card read does not perform** — so
widening that read is a named task rather than an assumed freebie. This sub-project widens the
read layer and carries the flags through the card types; **where they are drawn is Design's**
(§11), and no surface changes here.

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
  Where the deck holds a combo, the same card may also appear in the lean's receipts (§6.1b) —
  *"and this one finds `Thassa's Oracle`"* — which is evidence for a range, still not a rule.

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
reports `basis: "commander"` and one without falls back to `basis: "identity"` with an
identity-conditioned target; a commander in a thin identity bucket falls further to
`basis: "count"`; one with neither reports `basis: "none"` and **no target at all** rather
than a zero.

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
- **The skeleton read joins correctly and picks the right condition.** A mono-white commander
  must resolve the `W` bucket and receive `Swords to Plowshares`; a Jeskai one must fall back
  to `count:3` and report `basis: "count"`; and a staple absent from the deck must
  appear in `missingStaples` with the denominator the table stored — not a recomputed one.
  This is the join the floor rides on and no unit test can reach it.
- **Partial detection is reported, not silently dropped**, on a fixture holding a
  mass-land-denial card the ingest does know.
- **The three combo-join rules** (§4.3b), one case each: a template-gated variant whose two
  named cards are both in the deck must **not** slot it; a `mustBeCommander` variant whose
  piece sits in the 99 rather than the command zone must **not**; and a combo using the
  commander **must** be found, which a join over `deck_cards` alone cannot do.

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

### 11.1 The brief is five rounds, not one ask

§11's first draft was a single list of about fifteen distinct design problems. Ruled
2026-09-19: *"as complexity grows, details get lost"* — so the brief is **one document with
bounded rounds**, giving Design the whole shape while only ever asking for one piece.

The seams are drawn where the *question* changes, not where the content does.

**Round 0 — the frame.** What a player meets when they open deck analysis: the shape of the
surface as a whole, where a narrative **deck synopsis** sits relative to the verdict and the
skeleton, and what that slot reads as when the summary is absent, stale or refused.

This round exists because the other four would otherwise be drawn as separate panels and
discovered not to compose. The synopsis is the natural opener — *"you've finished the deck;
here is what it does"* — and it is worth noting to Design that it is **a narration of the
profile, not free prose**: deckcheck's example cites a Toralf/Blasphemous Act combo, a
Locust God/Purphoros line, extra-combat spells and draw doublers, and every one of those is a
fact §5 computes. The model supplies sentences; the code supplies facts (§2.4).

The synopsis's **content** design — what it may claim, its length, its accept contract — is
deliberately **not** in this round. Those depend on cost and validation rulings that belong
with sub-project 6. `commander_support.prose` is the precedent for the null state.

**Round 1 — the card mark.** Game Changer, mass land denial and extra turn, on a card row and
in a card modal, at both widths.

The only round that **fits into existing surfaces** — the collection, decklist rows, the card
modal — rather than designing new real estate, which is a different problem. Small, and it
unblocks rounds 2 and 4, which both reference it. Note for Design: only `game_changer` is a
column on `cards`; the other two cost a join (§7.1).

**Round 2 — the verdict.** The permitted range (§6.1a), the limits table — three brackets,
four rules each — violations with their receipts, the population line with its denominator
(§6.3a), and the three detection-coverage statements (§6.5).

The Rule 0 conversation as a **reading**. Receipts are required (§2.2); density is the risk;
it must not become a report card. Design's hardest call here is a full limits table that
informs without grading.

**Round 3 — the declaration.** *"Your cards permit 1 or 2 — which is this?"*; the combo lean
with its receipts (§6.1b); correcting the lean; and drift between `declared` and `permits`.

Split from round 2 deliberately: that one is a report, this is an **interaction with stored
state**. Round 2 can ship showing a range in its unanswered state. The load-bearing
distinction for Design is the one §7.2 already names — a reader who cannot tell *"this moves
your bracket"* from *"this is your 8th tutor"* has been handed a number to defend that nobody
computed, and the `unquantified` / `ruleless` split is exactly that difference.

**Round 4 — acting on it.** The push line at the moment of an add, drawing `bracketDelta`'s
four shapes distinguishably, and the upgrade path presented as a **consequence rather than a
recommendation** (§7.3).

**Held back: the skeleton fit.** It answers a different question — *"is this deck well built"*
rather than *"how strong is it"* — and carries its own hard problems: per-type targets, the
curve comparison, **five** strengths of `basis` (§6A), thin-data commanders, and a
`missingStaples` list averaging **50 cards** per identity (§4A.1a), which must be ranked and
truncated rather than printed. Its data also lands last (§4A.8). It gets its own brief once
an index run has produced real output to draw against.

**Which round owes the About entry, stated so it cannot be missed:** **not this one.**
Sub-project 1 ships no UI, so there is nothing for a reader to discover and an entry would
describe a surface that does not exist. The entry and the `ABOUT_VERSION` bump belong to the
round that ships the deck-analysis surface — sub-project 1b, once this brief has a READINESS
verdict — and are a named task in *that* plan. Recorded here because "backend only, so no
entry" is exactly the reasoning that let the post-import summary reach `main` with none.

---

## 13. Open for the plan

Found by the 2026-09-19 cold-eyes review and **deliberately not resolved here** — each is
plan-shaped: a task either can be written against it or it cannot, and that is the test the
plan performs on this spec. Recorded because otherwise they live only in a conversation.

### 13.1 Types named but never defined

The signatures above reference these without shape. Some are reconstructable from prose, some
are not; all need declaring before a task can be written.

`CardRef` · `ComboRef` · `StapleRef` · `TypeFit` · `CurveFit` · `RoleFit` · `Violation` ·
`BracketLimitReport` · `UnquantifiedFacts` · `BracketPopulation` · `CompositionTargets` ·
`ProfileCounts` · `ProfileRoles` · `ProfileColours` · `ProfileThemes` · `Bracket` ·
`UpgradePath` · `BracketLean` · `ComboReach`

Two need decisions rather than transcription. **`Violation`** is used as both
`violations: Violation[]` on the verdict and `rule: Violation` on a single `BracketDelta` —
one type doing two jobs. **`ProfileColours`** is described as "identity, producibleColors, and
their disagreement", and `producibleColors` has no stated derivation.

### 13.2 Algorithms named but not specified

- **`upgradePath`'s minimisation.** "The minimum set" is determined in *cardinality* and
  undetermined in *identity*: with 4 Game Changers against B3's limit of 3, the minimum set is
  size 1 and there are 4 candidates. Choosing one is a recommendation — the judgement §7.3 says
  it avoids. Likely resolution: return the violation with its full candidate set. Also note
  that no individual card "violates" a count rule, so §7.3's *"a card the deck holds and a rule
  it violates"* is not true of what it returns.
- **The B2/B3 chain-or-loop predicate** (§6.3). "An extra-turn card that recurs itself, or an
  untap loop present as a combo" is not defined over anything the profile holds, and — unlike
  the other two oracle rules — was never measured. Either specify and measure it, or state that
  the B2/B3 extra-turn flag is always absent in this sub-project.
- **The `produces` game-ending vocabulary** (§5.2). "The `Infinite …` family plus the
  game-ending names" enumerates only `Win the game`. The generated list must also resolve a
  contradiction: it cannot be both "regenerated by each ingest" and "committed so a change
  shows up in a diff" — a cron cannot commit. `tag-kinds.generated.ts` is a **developer-run**
  regeneration, so the analogy in §5.2 is wrong.
- **The sweep's name→`oracle_id` mapping** (§4.4). `/estimate-bracket` takes names and returns
  entries; nothing states how an entry is keyed back to a `cards` row, what happens when it
  resolves to none or two, and how double-faced naming is handled. `index-build.ts` already
  solves this for EDHREC and is the precedent.
- **The `fingerprint`** (§5.1). No hash function, no canonical row ordering, no statement of
  whether `auto` or `deck_proxies` participate, no rule for where the builder version lives.
- **`requires` → `requires_template_ids`** (§4.3). The shape of `requires` on a bulk record is
  not written down, and §4.3b's rule 1 is load-bearing on reading it correctly.

### 13.3 Homes and cadences not assigned

- **The three oracle-text classifiers** — mass land denial, extra turns, tutor targets — have
  measurement scripts but no production home and no job that runs them. §4.4's
  `db:seed:combos` describes only the sweep and the bulk. The measure scripts keep their
  patterns as module-local consts, so the shipped rule and the measured rule would be two
  copies unless the scripts import the production classifier.
- **Cache invalidation covers one of three writers.** §4.4 has the combo job stamp
  `catalog_refreshes`; neither `db:build:staples` nor the widened `Commander index` is specced
  to, and both write the profile's headline inputs. Only `src/lib/scryfall/seed*.ts` stamps
  today.
- **Job chaining is asserted, not mechanised.** "Runs after `Catalog refresh`" has no
  `workflow_run` trigger, and `db:build:staples` is said to chain like `Commander prose` — but
  that chain is pinned to production because `workflow_run` cannot tell which matrix leg it
  heard, and staging is served by `db:copy:prose`. There is no `db:copy:staples`.
- **The derived floor has no first value.** §4.5's ingest guard refuses to publish below N and
  M "taken from the first clean run" — the first run has no floor to check.

### 13.4 Edge and failure cases with no stated behaviour

A partial sweep (30 of 54 batches — `card_bracket_flags` defaults to `false`, so a partial
publish silently un-flags); concurrent runs of either new job; an empty deck; a deck over 100
cards from an import; a commander whose `synergy_state` is `degraded` rather than `absent`; a
`declared` bracket that falls outside `permits` after an edit; and `compositionOf` when
`composition` is null.

### 13.5 Two testability gaps

`probe:bracket` is specced as database-only but §8 asks it to prove that stamping
`catalog_refreshes` retires a cached profile — `cacheForUser` wraps `unstable_cache`, a Next
runtime primitive, so that needs a server. And §8's parse test names
`src/lib/edhrec/__fixtures__/gisa.json`, which carries none of the composition fields or
`mana_curve`; the fixture must be widened first.


---

## 14. Sub-projects that follow

Named so the profile's shape accounts for them. None is specced.

| # | Sub-project | Adds to the profile |
|---|---|---|
| 2 | **Informed building**: fill, top-off and the Add panel driven by the skeleton. Owns the `landTarget()` migration — three files, all in the deck path, and it cannot reach the scoring engine (§4A.6) | — reads §4A |
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

**Rule-0 legality reporting is no longer unplaced** — §4.3a gives it `ProfileLegality`, with
banned cards and identity violations both computed here. What remains is a surface for it,
which is Design's to place. Also raised in intake and still unplaced: **salt surfacing** (`commander_support.salt_score` is stored and drawn nowhere), and
**play-data grounding** (`deck_games`, the differentiator nothing else in this space can
reach).
