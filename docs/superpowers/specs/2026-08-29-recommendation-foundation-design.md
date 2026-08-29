# Recommendation engine foundation — design

**Date:** 2026-08-29
**Branch:** `feat/rec-foundation`
**Serves:** #213, #214, #215, #218 (and, later, #216 / #217)
**Status:** spec — approved in conversation 2026-08-29, revised 2026-08-29 after adversarial review, pending implementation plan

---

## 1. Why this exists

Five features were intaked on 2026-08-29. Scoped individually they look like five projects. They are not:
they are **one shared engine with five entry points**, and every one of them scores cards against
commanders using machinery `src/lib/recs/score.ts` already contains.

| Ticket | Scores what | Against what | Ranks on |
|---|---|---|---|
| **#213** Inverse commander rec | every commander-legal legendary | the whole collection | overlap + price |
| **#214** Novelty engine | every commander-legal legendary | the collection, minus archetypes already played | overlap + distance |
| **#215** Commander audit | every commander-legal legendary | one deck's 99 | overlap + theme + castability |
| **#218** Card → deck fit | one card | my existing decks | synergy + role need |

This spec covers **only the shared foundation** — the data layer all four sit on. It ships no UI, so per
`AGENTS.md` it needs no design handoff and is not blocked on the design pipeline. The four surfaces above
are separately gated; see §9.

### The constraint that shapes everything

`scoreCommander()` already computes the exact number these features need — it takes a commander, pulls that
commander's EDHREC top-cards list, and reports `overlapOwned` / `overlapMissing` against a card pool.

The restriction to *owned* commanders is **not** a one-line change, and an earlier draft of this spec said it
was. `loadCollectionPool()` (`recommend.ts:106-128`) returns a single array that is used twice for two different
purposes: as the **candidate universe** it is filtered down to commanders (`:148`), and as the **scoring pool**
it is the collection every candidate is measured against (`:172`). Inverting the universe means separating those
two roles — the candidate list stops being derived from the collection while the scoring pool must stay exactly
as it is. That separation is the real work, and it belongs to the surfaces, not to this foundation (§4,
"Interaction with the live path").

What is **not** cheap is the candidate universe. Today's ~196 owned candidates already trigger a per-commander
EDHREC fetch before first render, which is why #52 remains open on its server-side half. Inverting the universe
to every commander-legal legendary means thousands of fetches. **This cannot happen at request time.** The
foundation therefore exists mostly to move that work offline into a precomputed index.

---

## 2. Scope

**In scope — five components:**

- **A.** Widen the EDHREC parser to keep the data it currently discards.
- **B.** A precomputed commander support index, plus the job that builds it.
- **C.** A ManaPool price ingest, plus the job that refreshes it.
- **D.** A commander "engine" classifier (how a commander delivers value), and the two front-face helpers it
  and E both depend on.
- **E.** A land colour-production check.

**Out of scope:** all four surfaces (#213, #214, #215, #218); redundancy scoring (#216); 99-level card swaps
(#217); any change to the existing owned-commander recommendation path, which must keep working byte-identically.

---

## 3. Component A — widen the EDHREC parser

### The free lunch

`edhrecCache.payload` is `jsonb` holding the **raw upstream payload**, and `parseEdhrecPayload` is applied at
*read* time (`client.ts:45`, `:73`), not at write time. So widening the parser **retroactively enriches every
commander already cached, with zero refetch**. This is the single cheapest item in the spec.

### Verified payload paths

Probed live against `https://json.edhrec.com/pages/commanders/ghoulcaller-gisa.json` on 2026-08-29
(200 OK, 93,969 bytes). Paths are **not** all where you would guess — `taglinks` is nested under `panels`,
while the counts are top-level:

| Field | Path | Shape | Gisa's values |
|---|---|---|---|
| Archetype tags | `tag_counts` (top level) | `[{count, slug, value}]` | `zombies` 567, `tokens` 326, `aristocrats` 153, `reanimator` 142, `sacrifice` 76 |
| Archetype tags (dup) | `panels.taglinks` | same shape, 63 entries | identical shape; treat `tag_counts` as canonical |
| Power bracket | `bracket_counts` (top level) | `{"1".."5": count}` | `{1:15, 2:607, 3:328, 4:77, 5:5}` |
| Budget split | `budget_counts` (top level) | `{budget, middle, expensive}` | `{433, 3466, 433}` |
| Similar commanders | `similar` (top level) | `string[]` of **names** | 6 entries, incl. Ayara and Braids |
| Commander metadata | `container.json_dict.card` | object | `salt` 0.191, `cmc` 5.0, `num_decks` 4332, `rank` 648 |

`tag_counts` and `panels.taglinks` carry the same records. Read `tag_counts` and fall back to `panels.taglinks`
only if absent — one source, one fallback, no merging.

### Design

Extend `EdhrecData` **additively**. The existing three fields (`topCards`, `inclusionByName`, `synergyByName`)
keep their exact current shapes and semantics; every consumer on `main` must keep compiling and behaving
identically.

```ts
export type EdhrecTag = { slug: string; label: string; count: number };

export type EdhrecData = {
  // — unchanged —
  topCards: string[];
  inclusionByName: Record<string, number>;
  synergyByName: Record<string, number>;
  // — new —
  tags: EdhrecTag[];                       // desc by count; [] when absent
  bracketCounts: Record<string, number>;   // {} when absent
  budgetCounts: Record<string, number>;    // {} when absent
  similarNames: string[];                  // [] when absent
  deckCount: number | null;                // container.json_dict.card.num_decks
  rank: number | null;                     // container.json_dict.card.rank
  saltScore: number | null;                // container.json_dict.card.salt
};
```

**Follow the parser's existing missing-data discipline.** `parse.ts` deliberately omits a card from
`synergyByName` rather than entering `0`, on the stated reasoning that "a 0 draws a real bar for no data," and
it tests `Number.isFinite` rather than `typeof` because `NaN` and `Infinity` are both `"number"`. Every new
numeric read does the same: finite or omitted, never defaulted to zero. `deckCount` / `rank` / `saltScore` are
`null` when absent, not `0` — a rank of 0 would read as the most popular commander in the game.

Malformed input returns the empty-but-present shape, matching the current guard at `parse.ts:15`.

---

## 4. Component B — the commander support index

### Candidate universe

`cards.commanderLegal` (boolean, NOT NULL) already exists, and `isCommanderCandidate()` in `score.ts:54`
already encodes the eligibility rule correctly — including the double-faced-card fix from #79, which matches
against the **front face only** so a Land back face cannot qualify (the Westvale Abbey bug). **Reuse that
function; do not re-derive the rule.**

### Schema

Two tables. The header carries one row per commander; the child table carries the resolved support list.

```
commander_support
  commander_oracle_id  uuid PK → cards.oracle_id
  synergy_state        text NOT NULL   -- 'ok' | 'absent' | 'degraded'
  edhrec_total         integer         -- size of the support list; null unless state = 'ok'
  tags                 jsonb NOT NULL  -- EdhrecTag[], desc by count
  bracket_counts       jsonb NOT NULL
  budget_counts        jsonb NOT NULL
  similar_oracle_ids   uuid[] NOT NULL -- resolved; unresolvable names dropped
  deck_count           integer         -- null when absent
  rank                 integer         -- null when absent
  salt_score           real            -- null when absent
  engine               text            -- component D; null when unclassifiable
  computed_at          timestamp NOT NULL

  CHECK (synergy_state in ('ok','absent','degraded'))
  CHECK ((synergy_state = 'ok') = (edhrec_total is not null))
  CHECK (engine is null or engine in ('etb','static','triggered','activated','tap'))

commander_support_cards
  commander_oracle_id  uuid → commander_support (ON DELETE CASCADE)
  oracle_id            uuid → cards.oracle_id
  inclusion            real            -- null when upstream had none
  synergy              real            -- null when upstream had none
  PRIMARY KEY (commander_oracle_id, oracle_id)
  INDEX ON (oracle_id)                 -- #218 reads card → commanders
```

**Why normalised rather than a `uuid[]` on the header.** Every consuming query is "intersect this support list
with a set of oracle ids the user has" — a join Postgres does well and an array containment check does badly at
this row count. The `(oracle_id)` index exists because #218 traverses the relation in the opposite direction.

**Why `synergy_state` is a column and not an inference from `edhrec_total`.** `src/lib/recs/synergy-state.ts`
exists solely to keep three outcomes distinct — `ok`, `absent` (EDHREC has no page for this commander) and
`degraded` (EDHREC was unreachable) — and `commander_scores` already carries two `check` constraints to stop
the database collapsing them, with a schema comment explaining that the TypeScript union alone would not.
An index that stored only `edhrec_total = 0` would throw away exactly that distinction, so the build calls
`synergyStateFrom()` and persists its result, and the constraints above mirror the ones `commander_scores`
already has. The third constraint is new but follows the same convention: an enum-shaped `text` column gets a
check, because the union only narrows the TypeScript type.

**Why the check constraints are stated here.** `AGENTS.md` routes schema through `pnpm db:generate`; Drizzle
does not emit these from the TypeScript types, so they are hand-written into the generated migration — the same
way `commander_scores`' pair were. Current migrations run 0000–0010, so these land at 0011.

**Expected size — corrected.** An earlier draft guessed "~100 support cards" per commander. The live Gisa
payload carries **253 distinct card names across 13 cardlists**. The index stores the union of all 13, matching
what `parseEdhrecPayload` already puts in `topCards`, so that index and live path never disagree. At ~2,000–3,000
commanders that is **~700–900k rows**, not 200–300k. Still small for Postgres, but three times the original
estimate, and the plan should count `cards WHERE commander_legal` before building rather than trusting either
number.

### Name → oracle_id resolution

EDHREC keys everything by **card name**; every table here is keyed by `oracle_id`. Resolution happens **once,
at index build**, not on every read. `score.ts:96-102` already documents the trap and its fix: EDHREC lists
double-faced cards by front face while Scryfall names them `"Front // Back"`, so the lookup must index **both**
the full lowercased name and the front face. Reuse that normalisation exactly.

Names that resolve to nothing are dropped from `commander_support_cards` but still counted in `edhrec_total`,
so an unresolvable name reduces measured overlap rather than silently inflating the denominator. The build logs
an unresolved-name count per commander — the same "report the orphan count loudly" discipline the printings
ingest already uses.

### The build job

A GitHub Actions workflow, `commander-index.yml`, modelled directly on `catalog-refresh.yml`.

**Why Actions and not a Vercel cron:** `catalog-refresh.yml`'s own header records that the bulk ingests
"outgrew the cron's 300s maxDuration. A runner gives us hours instead of minutes." Thousands of politely-rate-limited
EDHREC fetches is the same class of problem. Copy the established shape: `workflow_dispatch` with a
staging/production target, a `concurrency` group per target with `cancel-in-progress: false`, and a
`COMMANDER_INDEX_ENABLED` repository variable as the kill switch for scheduled runs.

**Cadence and ordering.** Monthly on `'0 9 3 * *'` — two days after `catalog-refresh.yml`'s `'0 9 1 * *'`, so
the index always resolves names against a catalog that has already been refreshed. New commanders from a set
released between the two runs would otherwise be unresolvable for a month. Environments mirror the catalog job:
`commander-index-staging` / `commander-index-production`, each holding the database URL.

**The 30-day TTL must be overridden.** `client.ts` sets `TTL_MS` to 30 days. A monthly index built through the
unmodified client would re-read rows fetched 29 days ago and stamp them `computed_at = now`, making effective
freshness up to 60 days while claiming 30. `resolveEdhrecData` therefore takes an optional max-age parameter,
and the index job passes 0 to force a refetch. The live request path keeps the 30-day default unchanged.

**The index must not write raw payloads to `edhrecCache`.** `client.ts:67-72` writes the full upstream payload
on every successful fetch. That is right for the ~196 owned commanders; across ~3,000 it is ~94 KB × 3,000 ≈
**300–400 MB of jsonb** for commanders nobody owns. The index job uses a fetch path that parses and discards
rather than caching, and persists only derived rows. The cost is real and accepted: widening the parser later
(§3) retroactively enriches *cached* payloads, so it will not retroactively enrich the index — a parser change
that adds a field means re-running the index job. That is a monthly job we already run, and it is a better trade
than a third of a gigabyte of payloads for commanders outside the collection.

**Politeness and resumability.** Serial fetches with a fixed delay, honouring the same 10s `AbortSignal.timeout`
the live client uses. The job writes per commander, so a mid-run failure leaves a partially-built index rather
than a corrupt one, and a re-run skips commanders whose `computed_at` is newer than the run start.

**Reuse `resolveEdhrecData`'s absence/unreachable distinction.** A 4xx means "this commander is not on EDHREC"
(a data-shaped absence → `synergy_state = 'absent'`), whereas a network error or 5xx means unreachable
(→ `degraded`; leave any existing row alone rather than overwriting good data with nothing). Do not reimplement
this rule; it is subtle and already correct.

One caveat the earlier draft got wrong: `resolveEdhrecData` returns **parsed stale cache** on a 4xx when a
cached row exists (`client.ts:60-63`), so "4xx ⇒ absent" holds only for commanders with no cache entry. Since
the index job does not consult `edhrecCache` at all, the caveat does not bite here — but the index must call
`synergyStateFrom()` on the result rather than testing the HTTP status itself, which is what makes it immune.

### Interaction with the live path

The index is **additive**. `recommend.ts` keeps its current live-fetch behaviour on `main` untouched in this
work. Migrating the owned-commander path onto the index would also close #52's server-side half — that is a
genuinely attractive follow-up, but it changes shipped behaviour and belongs in its own PR with its own
verification, not bundled into foundation work.

---

## 5. Component C — ManaPool price ingest

### Source

`GET https://manapool.com/api/v1/prices/singles` — public, unauthenticated. Verified live 2026-08-29,
`meta.as_of` = `2026-08-29T15:01:27.865Z`: 200 OK, 50,873,304 bytes, **102,588 entries**. Every entry carries
`scryfall_id`, so it joins directly against `printings.scryfall_id`, which is that table's primary key. No name
or set-code matching anywhere. (Figures are date-stamped because the feed changes daily; the plan should re-probe
rather than assume these.)

Entries carry `price_cents`, `price_cents_nm`, `price_cents_lp_plus`, foil/etched variants, `price_market`,
`available_quantity`, a direct `url`, and the payload carries `meta.as_of`.

### `scryfall_id` is not unique in the feed

**This breaks a naive `scryfall_id uuid PK` ingest, and an earlier draft of this spec specified exactly that.**
The 102,588 entries contain only **99,709 distinct `scryfall_id`s**: 1,087 ids repeat, for 2,879 surplus rows.

Inspection shows the duplicates are the same printing listed under different product forms — e.g. `Adorned
Pouncer` (THOU #1) at 34c with quantity 57, alongside `Adorned Pouncer // Horse` (THOU #1-10) at 55c with
quantity 2: the single card and a card-plus-token bundle, sharing one `scryfall_id`.

**Rule: deduplicate at ingest, keep `scryfall_id` as the primary key.** Per id, prefer an entry with a non-null
`price_cents`; among those take the **lowest** `price_cents`; break ties on the **highest**
`available_quantity`. On the example above that selects the 34c single rather than the 55c bundle, which is the
answer a "what does this cost to buy" feature wants. The ingest reports the collapsed-duplicate count loudly,
the same way it reports FK orphans — a sharp rise in that number means the feed's shape moved.

**Ruled during intake:** ManaPool only, no Scryfall `prices.usd` fallback. ManaPool is the store actually
shopped, and `url` satisfies the link-out expectation natively.

**Correcting the stock reasoning.** An earlier draft claimed `available_quantity` distinguishes "buy this for $4"
from "technically $4, nobody has it," and read the null-`price_cents` rows as unstocked cards. Both are wrong.
In the live feed `available_quantity` is **never null and never zero** — an out-of-stock card is simply absent
from the response, not listed at zero. The 13,738 rows with a null `price_cents` (88,850 of 102,588 are non-null)
are cards whose only stock is **foil or etched**: the non-foil price is null while `price_cents_foil` is set.
So the real limitation is narrower and more precise than stated: a card absent from `printing_prices` entirely
is not currently stocked at ManaPool, and a row with a null `price_cents` but a set foil price is stocked only
in foil. Both are honest things to render, and for a buy-signal feature the foil-only case is worth surfacing
rather than hiding. Adding Scryfall later is additive, not a rewrite.

### Schema — a separate table, deliberately

```
printing_prices
  scryfall_id        uuid PK → printings.scryfall_id (ON DELETE CASCADE)
  price_cents        integer   -- cheapest non-foil listing; null when stock is foil/etched only
  price_cents_nm     integer
  price_cents_foil   integer
  price_cents_etched integer
  available_quantity integer NOT NULL   -- no DEFAULT: the feed never omits it
  buy_url            text
  as_of              timestamp NOT NULL   -- from meta.as_of, not ingest wall-clock
```

`available_quantity` carries no `DEFAULT 0`. A default would only ever fire for a row the feed did not describe,
and every feed row sets the field; a silent zero would be indistinguishable from real out-of-stock data that the
feed, as established above, never actually sends.

**Not columns on `printings`.** The catalog refresh upserts `printings` wholesale; putting volatile price data
in that table invites a catalog run clobbering prices, or forces the two ingests to lock-step — precisely the
coupling the existing schema comment on `printings.oracle_id` says the design avoids.

`as_of` comes from the payload's `meta.as_of`, not from ingest time. Recording when ManaPool computed the price
rather than when we downloaded it is what makes a staleness claim in the UI truthful.

### Ingest

The fetch/transform logic lives in **`src/lib/manapool/`** — a `parse.ts` mirroring `src/lib/edhrec/parse.ts`
(payload → typed rows, including the dedup rule above) and a `client.ts` for the fetch. `scripts/seed-prices.ts`
is a thin wrapper that wires the transform to the database, matching how the existing seed scripts stay short.
This is not decoration: §8 asks for transform tests over a fixture, and a transform buried in a `scripts/` entry
point cannot be imported by Vitest.

Writes are **upserts** (`onConflictDoUpdate`), following `seed-printings.ts:80` — not a wholesale replace. An
earlier draft said "replace its contents wholesale," which contradicts the ingest convention and would delete
every row in the window between truncate and reload. Rows for printings that vanish from the feed are left in
place and identified by their now-stale `as_of`, which is more informative than deleting them.

FK orphans (a `scryfall_id` ManaPool lists that `printings` does not have) are filtered by pre-loading known ids
and the count reported loudly — the same pattern and the same reasoning as the printings ingest.

Its own workflow, `price-refresh.yml`, **weekly**. Price is the one field that genuinely moves; a monthly
cadence tied to the catalog would make the number wrong more often than right. It is one cheap column write, so
frequency is nearly free.

### Contract canary

`pnpm check:scryfall` exists because the Scryfall catalog refresh is monthly and "an upstream shape change would
otherwise go unnoticed until it failed." ManaPool is an **undocumented-as-stable** public endpoint, so the same
risk applies with more force. Add `pnpm check:manapool` — validate the index shape and the first entry's
required fields without touching a database — and extend `scryfall-contract.yml` (or add a sibling) to run it
daily.

### Open before ship

Skim ManaPool's terms of use. The endpoint is public and not documented as restricted, but this was **not**
confirmed during intake. This is a blocking item for the price component only; the other four components do not
depend on it.

---

## 6. Component D — commander engine classifier

### Why it exists

From #215's intake: overlap ranks Ghoulcaller Gisa near the top of her own deck, and theme fit ranks her
~perfect — she *is* the zombies-by-sacrifice archetype. Both signals say keep her. Neither can see that she
costs `{3}{B}{B}`, must survive a full turn cycle before doing anything, and gets recast at 5 → 7 → 9. Without
this component the audit feature fails on the case that motivated it.

### Prerequisite: two front-face helpers, not one

`frontFace()` at `score.ts:52` splits on `" // "`. That is the separator Scryfall uses in **type lines and
names** — it is *not* the separator this codebase uses for oracle text. `transform.ts` joins faces with
`"\n//\n"`, and `isCommanderCandidate` at `score.ts:54-58` already handles both, splitting the type line on
`" // "` and the oracle text on `"\n//\n"` with a comment saying so.

An earlier draft of this spec told components D and E to "reuse `frontFace()`" for oracle text. That would have
silently returned the whole joined string — the back face's abilities read as the front's — which is precisely
the #79 bug class the section claimed to be avoiding.

So: **two named helpers, exported from one module**, `frontFaceTypeLine()` (`" // "`) and `frontFaceOracle()`
(`"\n//\n"`). The naming is the point; a single `frontFace` is what made the mistake available. The fallback
pattern is currently open-coded in six places across five files (`match.ts:51`, `score.ts:52`, `score.ts:102`,
`suggest.ts:86`, `suggest.ts:89`, `suggest.ts:137`, `slug.ts:3`), so the helpers go somewhere all of them can
reach. **Migrating those existing call sites is out of scope here** — they are correct today, and a
behaviour-preserving sweep across five files is its own PR with its own verification. The helpers are introduced
for D and E; the sweep is a recorded follow-up.

### Design

A pure function in `src/lib/recs/engine.ts`, classifying from `typeLine` and `oracleText`:

```ts
export type CommanderEngine =
  | "etb"        // value on entering the battlefield
  | "static"     // continuous effect; works the turn it lands
  | "triggered"  // "Whenever…" / "At the beginning of…"
  | "activated"  // has a cost but no {T} — usable immediately, repeatable
  | "tap";       // requires {T} — must survive a turn cycle
```

Precedence when a card matches several — **most restrictive wins**, because the axis measures *practical
usability* and a card is gated by its most demanding requirement: `tap` > `activated` > `etb` > `triggered` >
`static`. Gisa classifies `tap`; Yawgmoth, Thran Physician classifies `activated` (a cost, but no `{T}`, so
usable the turn he lands and repeatable within a turn); Ayara, First of Locthwain and Braids, Arisen Nightmare
classify `triggered`.

Returns `null` rather than guessing when nothing matches. Consumers must render an honest absence, in keeping
with the parser's existing rule against defaulting missing data to a value that draws.

Classify against `frontFaceOracle(oracleText)` and `frontFaceTypeLine(typeLine)`, per the prerequisite above.

**This is a heuristic and will be imperfect** — acknowledged at intake. It is testable in isolation, so it gets
a fixture table of hand-classified commanders (including all four named above) and a documented accuracy
expectation. It is stored on `commander_support.engine` at index-build time rather than computed per request.

---

## 7. Component E — land colour-production check

### Why it exists

From #215's intake, using the real deck: the motivating Zombies list runs **34 Swamps** and every nonland card
is mono-black or colourless. So identity-safety barely filters — *every* black-inclusive identity is
legality-safe, including Dimir options. But 34 Swamps cannot cast a blue spell. **Legality and playability
diverge completely**, and an audit that only checks legality would cheerfully recommend a two-colour commander
into a deck with zero fixing.

### Design

A pure function in `src/lib/recs/mana.ts`:

```ts
export function producibleColors(lands: PoolCard[]): Set<string>;   // members are "W"|"U"|"B"|"R"|"G"
```

`Set<string>`, not `Set<Color>`: no `Color` type exists in this codebase, and `cards.colorIdentity` is a plain
`text[]`. Matching the existing representation keeps the subset check against `colorIdentity` free of conversion.

Derived from two sources, unioned:

- **Basic land types in the type line** — Plains → W, Island → U, Swamp → B, Mountain → R, Forest → G. This
  covers typed duals (Overgrown Tomb is a `Swamp Forest`) for free.
- **Mana symbols in the oracle text** — for untyped lands. A land that adds one mana of any colour contributes
  all five.

Two corrections to an earlier draft. **Fetchlands are not covered by the type-line rule**: Polluted Delta has no
basic land type and produces no mana, so it contributes nothing from either source. That is the right answer for
a binary "can these lands make this colour" check — a fetch's colours come from what it fetches, which is
already counted when those lands are in the list. And **modal double-faced lands need both faces considered**,
not the front only: Agadeem's Awakening // Agadeem, the Undercrypt is a black spell whose back is a land, so
unlike the #79 case here the back face is the part that matters. This function is the one place in the spec
where front-face-only would be wrong, and the fixtures in §8 pin that down.

**Ruled during intake: reported, never weighted.** A candidate whose `colorIdentity` is not a subset of
`producibleColors` gets an explicit "requires manabase work" note. It does not receive a ranking penalty —
consistent with the no-invented-weights rule applied across all four features.

**Deliberately excluded:** any judgement about *how much* fixing a deck has. Counting sources and estimating
adequacy is a real deckbuilding model, it would need tuning against decks we do not have, and it is exactly the
kind of confident nonsense the intake declined on redundancy scoring. Binary "can these lands make this colour
at all" is defensible from data; "is this manabase good enough" is not, yet.

---

## 8. Testing

The foundation is unusually testable because four of five components are pure functions or offline jobs.

- **A.** Extend `parse.test.ts` against `__fixtures__`. Add a Gisa payload fixture and assert the documented
  values from §3 verbatim (`zombies` 567; `bracket_counts` `{1:15, 2:607, 3:328, 4:77, 5:5}`; `similar`
  containing Ayara and Braids). **Trim the fixture before committing** — the raw payload is ~94 KB, where the
  existing `muldrotha.json` is 2,541 bytes. Keep every path §3 reads plus enough cardlist entries to exercise
  the union, drop the rest. Add a malformed-payload case asserting the empty-but-present shape, and a regression
  test that the three pre-existing fields are unchanged from `main` for the same input.
- **B.** Unit-test name→oracle_id resolution, especially the DFC front-face case (a `"Front // Back"` card must
  resolve from EDHREC's front-face-only name). Test that the three `synergy_state` values are persisted
  distinctly: a 4xx on an uncached commander → `absent` with a null `edhrec_total`, a network failure →
  `degraded` leaving any existing row untouched, a good fetch → `ok`. Assert the check constraints reject the
  impossible combinations, since that is the only thing proving they were hand-written into the migration.
- **C.** Transform tests over a trimmed fixture, importing from `src/lib/manapool/` — including a
  **duplicate-`scryfall_id` case** built from the real `Adorned Pouncer` pair, asserting the 34c single wins over
  the 55c bundle, and a foil-only case asserting a null `price_cents` with a set `price_cents_foil`. Plus an
  orphan-filtering test. The `check:manapool` canary is itself the live contract test.
- **D.** A fixture table of hand-classified commanders including Gisa (`tap`), Yawgmoth (`activated`), Ayara and
  Braids (`triggered`), plus a DFC whose back face carries a `{T}` ability that must **not** classify the front
  as `tap` (this is the test that would have caught the `frontFace` splitter bug), plus an unclassifiable card
  asserting `null`.
- **E.** Basics, typed duals, an any-colour land, a fetchland asserting it contributes **nothing**, an MDFC land
  back face asserting it **does** contribute, and the real 34-Swamp case asserting `{B}` exactly.

Pre-push gate per `AGENTS.md`, every push: `pnpm typecheck && pnpm lint && pnpm test`, plus the stub-DB build
(`DATABASE_URL="postgres://stub:stub@localhost/stub" pnpm build`), then `git fetch origin && git rebase origin/main`.

---

## 9. Sequencing

Build order within the foundation, cheapest-and-most-unblocking first:

1. **A** — parser widening. No migration, retroactive over cached payloads, unblocks the theme axis for three features.
2. **D** and **E** — pure functions, no schema, independently testable. Can run in parallel with A.
3. **B** — the index. The largest item; depends on A for the fields it stores.
4. **C** — prices. Fully independent of A/B/D/E; gated only on the terms check in §5.

**Then the surfaces**, and note the order is not the order they were intaked:

- **#218 (card → deck fit) can ship first and needs almost none of this.** It scores one card against a handful
  of decks, and `inclusionByName`, `synergyByName`, `edhrecCache`, `fitsIdentity()`, `classifyRoles()` and
  `ROLE_TARGETS` all already exist on `main`. It needs no index, no price data, no parser widening. Two small
  corrections to an earlier draft: `fitsIdentity()` is **not exported** from `score.ts:61` and will need to be,
  and `classifyRoles()` / `ROLE_TARGETS` currently measure role counts over the **collection pool**, not over a
  deck's 99 — so "does this deck need another ramp card" is a new computation over `deckCards`, not an existing
  one to call. Neither is large; both are work #218 owns rather than inherits. It remains the fastest path to a
  usable feature and is gated only on a design handoff.
- **#215 (commander audit) is the only sibling that does not depend on #130**, because it operates on a deck
  that is already full. It needs A, B, D and E.
- **#213 and #214 depend on #130** — both terminate in "start a deck," and an empty deck is the exact failure
  #130 describes. #130 was promoted to design-backlog rank 1 on 2026-08-29 for this reason.

**Design gating.** All four surfaces ship UI and are therefore gated on design handoffs per `AGENTS.md`. They
are labelled `type: feature`, not `type: design`, so they sit in none of the pipeline tracker's states; they are
recorded as **unplaced** in `design-pipeline-status.md` rather than absorbed into the nearest row. Resolving
that — companion `type: design` tickets, or a new legend state — is a call for Hugh. The foundation is not
blocked by it.

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| ManaPool's terms disallow this use | Check before building component C. C is independent; the other four proceed regardless. |
| ManaPool endpoint is undocumented and may change shape | `check:manapool` canary running daily, mirroring the Scryfall canary's rationale. Extend it to assert `scryfall_id` duplication stays within the observed band, since the dedup rule depends on the duplicates being product-form variants rather than something new. |
| EDHREC rate-limits or blocks a multi-thousand-fetch job | Serial fetches with delay; resumable per commander; monthly cadence. If EDHREC blocks it, `similar` (6 names per commander, already cached) is a viable cheaper candidate generator — see below. |
| Engine classifier misclassifies | Fixture table, `null` rather than a guess, and it is one of three separately-reported axes rather than a ranking input. |
| Index build cost is larger than estimated | Candidate count is knowable before building — count `cards WHERE commander_legal` and reuse `isCommanderCandidate()`. The row estimate was already corrected upward 3× during review (§4); the plan should measure both counts before writing the job. |
| A later parser widening silently leaves the index stale | The index stores derived rows, not payloads, so it gains nothing retroactively (§4). Any change to §3's field list is a required index re-run, and the plan should say so at the point the parser changes. |

**Recorded for #214 and #215:** EDHREC's `similar` field is a ready-made commander-adjacency graph, six names
per commander, already sitting in cached payloads. Gisa's returns Ayara, First of Locthwain and Braids, Arisen
Nightmare — two of the three commanders identified by hand during intake as the shape the audit should find.
That is independent corroboration of the feature's premise from a source that did not know the question, and it
means a useful audit may be reachable without a full index. Worth a spike before assuming component B is
required for #215.

---

## 11. Provenance

Every ruling below was made in conversation on 2026-08-29 and is recorded on the issues:

- ManaPool only, no Scryfall fallback (#213)
- Price displayed, not ranked on (#213)
- Identity-safe by default with a deliberate toggle (#215)
- Three axes reported separately, never blended (#215)
- Manabase cost reported, not weighted (#215)
- Redundancy scoring deferred to MVP+ (#216)
- Synergy **and** need, reported separately (#218)

The no-blended-score rule was applied independently four times. It is the spec's single most load-bearing
convention: combining signals means owning and defending a weighting tuned against no data.

### Deliberately deferred, recorded here so they are not lost

- **Sweep the open-coded front-face fallback** out of `match.ts`, `score.ts`, `suggest.ts` and `slug.ts` onto the
  two helpers from §6. Behaviour-preserving, five files, its own PR.
- **Migrate the owned-commander path onto the index**, which would also close #52's server-side half (§4).
- **Separate the candidate universe from the scoring pool** in `recommend.ts` (§1) — owned by whichever surface
  lands first.

### Review record

This spec was reviewed adversarially on 2026-08-29 and revised against the findings. Two were correctness
defects that would have reached implementation: `printing_prices.scryfall_id` as a primary key against a feed
with 1,087 duplicated ids, and a `frontFace()` reuse in §6/§7 that split oracle text on the type-line separator
— the same #79 bug class the section claimed to avoid. The row estimate in §4 was 3× low, and the stock
reasoning in §5 was factually wrong about both `available_quantity` and the null-price rows. All figures quoted
in §5 are re-measured and date-stamped.
